import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createUpdater } from '../lib/update.js';
import { PACKAGE_NAME, REPOSITORY, compareVersions, stableAssetUrl, validateRelease, verifyPackage } from '../lib/update-release.js';

function tar(files, types = {}) {
  const chunks = [];
  for (const [name, content] of Object.entries(files)) {
    const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
    const header = Buffer.alloc(512);
    header.write(name, 0, 100);
    header.write('0000644\0', 100, 8);
    header.write('0000000\0', 108, 8); header.write('0000000\0', 116, 8);
    header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124, 12);
    header.fill(32, 148, 156); header[156] = (types[name] ?? '0').charCodeAt(0);
    header.write('ustar\0', 257, 6);
    const sum = header.reduce((a, b) => a + b, 0);
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}
function release(version, id, overrides = {}) {
  const bytes = tar({
    'package/package.json': { name: PACKAGE_NAME, version, main: 'lib/index.js', dsh: { bundle: { patch: './cordis.patch.yml' } }, ...overrides },
    'package/lib/index.js': 'export const fixture = true;',
    'package/cordis.patch.yml': '- insert: []',
  });
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  return { bytes, raw: { id, tag_name: `v${version}`, draft: false, prerelease: false, published_at: '2026-11-05T00:00:00Z', html_url: `https://github.com/${REPOSITORY}/releases/tag/v${version}`, assets: [{ id: id + 1000, name: `${PACKAGE_NAME}-${version}.tgz`, browser_download_url: stableAssetUrl(version), digest, size: bytes.length }] } };
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const until = async (read, predicate, timeout = 3000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await read(); if (predicate(value)) return value; await new Promise((done) => setTimeout(done, 10)); }
  throw new Error('fixture state did not settle');
};
async function fixture(t, config = {}) {
  const home = await fs.mkdtemp(join(tmpdir(), 'archive-update-'));
  const old = release('0.2.6', 26), target = config.target ?? release('0.3.0', 30);
  const routes = new Map();
  const server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const route = [...routes.values()].sort((a, b) => b.path.length - a.path.length).find((item) => item.kind === 'exact' ? item.path === path : path === item.path || path.startsWith(`${item.path}/`));
    if (!route) { response.writeHead(404); response.end(); return; }
    Promise.resolve(route.handler(request, response)).catch((error) => { response.writeHead(500); response.end(error.message); });
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const webServer = { getOrigin: () => origin, register: (route) => { assert.equal(routes.has(route.path), false); routes.set(route.path, route); return () => routes.delete(route.path); } };
  let row = { name: PACKAGE_NAME, version: '0.2.6', source: stableAssetUrl('0.2.6'), installed: true, enabled: true, removable: true };
  if (config.link) {
    const dir = join(home, 'my-source');
    await fs.mkdir(dir);
    await fs.writeFile(join(dir, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: config.linkVersion ?? '0.2.6', dsh: { bundle: { patch: 'cordis.patch.yml' } } }));
    await fs.writeFile(join(dir, 'uncommitted.txt'), 'preserve me');
    row = { ...row, version: config.linkVersion ?? '0.2.6', source: `link:${dir}` };
  }
  const operations = [];
  let failInstall = false, removalResult = null, gateCount = 0, blockInstall = null, gateBusy = false;
  const pluginDisposers = [webServer.register({ kind: 'exact', path: '/archive-plugin-alive', handler: (_req, res) => res.end('alive') })];
  const pluginManager = {
    listBundles: async () => row ? [{ ...row }] : [],
    removeBundle: async (name) => {
      assert.equal(name, PACKAGE_NAME); operations.push('remove');
      if (config.removeDisablesThenFails) {
        row.enabled = false;
        for (const dispose of pluginDisposers) dispose();
        updater.detach();
        return { application: 'failed', error: { code: 'network' } };
      }
      if (removalResult) return removalResult;
      row = null;
      for (const dispose of pluginDisposers) dispose();
      updater.detach();
      return { application: 'applied', changed: true };
    },
    installBundle: async (spec, options) => {
      operations.push('install'); assert.equal(options.saveExact, true);
      if (blockInstall) await blockInstall;
      if (failInstall) return { application: 'failed', error: { code: 'network' } };
      let version;
      if (spec.startsWith('link:')) version = JSON.parse(await fs.readFile(join(spec.slice(5), 'package.json'), 'utf8')).version;
      else {
        const bytes = await fs.readFile(spec);
        const match = [old, target].find((entry) => entry.bytes.equals(bytes));
        assert.ok(match, 'only verified fixed release bytes reach installation');
        version = match.raw.tag_name.slice(1);
      }
      row = { name: PACKAGE_NAME, version, source: config.installedSourceOverride ?? spec, installed: true, enabled: options.enabled, removable: true };
      if (!config.restartRequired) createUpdater({ ...updaterOptions, runtimeVersion: config.staleRuntime ? '0.2.6' : version });
      return { application: config.restartRequired ? 'restart-required' : 'applied', bundle: PACKAGE_NAME, version, changed: true };
    },
    setBundleEnabled: async (name, enabled) => {
      assert.equal(name, PACKAGE_NAME); operations.push(enabled ? 'enable' : 'disable');
      row.enabled = enabled;
      createUpdater({ ...updaterOptions, runtimeVersion: enabled ? row.version : null });
      return { application: 'applied', changed: true };
    },
  };
  const fetchImpl = async (url) => {
    const value = String(url);
    const entries = [old, target];
    const found = value.endsWith('/latest') ? target : entries.find((entry) => value.endsWith(`/releases/${entry.raw.id}`) || value.endsWith(`/releases/tags/${entry.raw.tag_name}`) || value === entry.raw.assets[0].browser_download_url);
    if (!found) return json({}, 404);
    if (value === found.raw.assets[0].browser_download_url) return new Response(config.corrupt && found === target ? Buffer.from('bad') : found.bytes);
    return json(found.raw);
  };
  const enterUpdate = async (fn) => {
    if (gateBusy) throw new Error('data operation busy');
    gateBusy = true; gateCount += 1;
    try { return await fn(); } finally { gateBusy = false; }
  };
  const updaterOptions = { home, pluginManager, webServer, runtimeVersion: row.version, enterUpdate, fetchImpl, ...(config.controlTtlMs ? { controlTtlMs: config.controlTtlMs } : {}) };
  let updater = createUpdater(updaterOptions);
  const cleanup = () => { updater.closeControls(); server.closeAllConnections(); return new Promise((done) => server.close(done)); };
  t.after(async () => { await cleanup(); globalThis[Symbol.for('dsh-archived-manager.update-jobs.v1')].delete(`${home}\0${origin}`); await fs.rm(home, { recursive: true, force: true }); });
  const prepare = async () => { const checked = await updater.check(); return updater.prepare({ releaseId: checked.release.id, version: checked.release.version, switchFromLink: config.link === true }); };
  const open = async (job) => { const response = await fetch(job.controlUrl); assert.equal(response.status, 200); return response.text(); };
  const action = async (job, action, headers = {}) => {
    const response = await fetch(`${job.controlUrl}/action`, { method: 'POST', headers: { 'content-type': 'application/json', origin, 'x-archived-manager-update': job.job.id, ...headers }, body: JSON.stringify({ action }) });
    return { status: response.status, body: await response.json() };
  };
  const status = async (job) => (await (await fetch(`${job.controlUrl}/status`)).json()).job;
  return { home, origin, routes, old, target, options: updaterOptions, operations, get updater() { return updater; }, prepare, open, action, status, get row() { return row; }, get gateCount() { return gateCount; }, set failInstall(value) { failInstall = value; }, set removalResult(value) { removalResult = value; }, set blockInstall(value) { blockInstall = value; }, set gateBusy(value) { gateBusy = value; }, set row(value) { row = value; }, async restart(runtimeVersion) { updater.closeControls(); globalThis[Symbol.for('dsh-archived-manager.update-jobs.v1')].delete(`${home}\0${origin}`); updater = createUpdater({ ...updaterOptions, runtimeVersion }); await updater.status(); return updater; } };
}

test('stable release contract and semantic comparison reject prerelease/foreign assets', () => {
  const item = release('0.3.0', 30);
  assert.equal(validateRelease(item.raw).version, '0.3.0');
  assert.equal(compareVersions('0.10.0', '0.9.0'), 1);
  assert.throws(() => validateRelease({ ...item.raw, prerelease: true }), /正式稳定版本/);
  assert.throws(() => validateRelease({ ...item.raw, html_url: 'https://github.com/other/repo/releases/tag/v0.3.0' }), /其他仓库/);
  assert.throws(() => compareVersions('0.3.0-rc.1', '0.3.0'));
});

test('package identity and traversal are rejected before installation', () => {
  const item = release('0.3.0', 30, { name: 'unrelated-package' });
  assert.throws(() => verifyPackage(item.bytes, validateRelease(item.raw)), /不匹配/);
  const bytes = tar({ 'package/../escape': 'x' });
  const metadata = { ...validateRelease(release('0.3.0', 30).raw), size: bytes.length, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` };
  assert.throws(() => verifyPackage(bytes, metadata), /不安全/);
});

test('tar path aliases and PAX size override cannot make unpacking differ from preflight', () => {
  const manifest = { name: PACKAGE_NAME, version: '0.3.0', main: 'lib/index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } };
  const files = { 'package/package.json': manifest, 'package/lib/index.js': 'export {};', 'package/cordis.patch.yml': '- insert: []' };
  const checked = (bytes) => ({ ...validateRelease(release('0.3.0', 30).raw), size: bytes.length, digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}` });
  for (const alias of ['package//package.json', 'package/PACKAGE.JSON']) {
    const bytes = tar({ ...files, [alias]: { ...manifest, name: 'another-package' } });
    assert.throws(() => verifyPackage(bytes, checked(bytes)), /不安全|重复文件/);
  }
  const bytes = tar({ 'package/PaxHeader': '13 size=1234\n', ...files }, { 'package/PaxHeader': 'x' });
  assert.throws(() => verifyPackage(bytes, checked(bytes)), /扩展目录/);
  const concatenated = gzipSync(Buffer.concat([gunzipSync(tar(files)), gunzipSync(tar({ 'package/package.json': { ...manifest, name: 'another-package' } }))]));
  assert.throws(() => verifyPackage(concatenated, checked(concatenated)), /结束标记/);
});

test('checking and preparing do not mutate installation; control page must be reached before start', async (t) => {
  const f = await fixture(t);
  const prepared = await f.prepare();
  assert.deepEqual(f.operations, []);
  assert.match(prepared.controlUrl, new RegExp(`^${f.origin}/archived-manager/update-control/[a-f0-9]{48}$`));
  assert.equal((await f.action(prepared, 'start')).status, 409);
  assert.deepEqual(f.operations, []);
  const html = await f.open(prepared);
  assert.match(html, /更新过程中请保持 DSH 运行/);
  assert.match(html, /原稳定版/);
  assert.deepEqual(f.operations, []);
});

test('control page survives removal of archive plugin and continues complete install', async (t) => {
  const f = await fixture(t);
  let finish;
  f.blockInstall = new Promise((resolve) => { finish = resolve; });
  const prepared = await f.prepare(); await f.open(prepared);
  assert.equal((await f.action(prepared, 'start')).status, 202);
  await until(() => f.status(prepared), (job) => job.phase === 'installing');
  assert.equal((await fetch(`${f.origin}/archive-plugin-alive`)).status, 404, 'the original plugin routes really were disposed');
  assert.equal((await fetch(prepared.controlUrl)).status, 200, 'update document remains host-owned');
  assert.equal((await f.action(prepared, 'start')).status, 409);
  finish();
  const settled = await until(() => f.status(prepared), (job) => job.phase === 'installed' && !job.busy);
  assert.equal(settled.installedVersion, '0.3.0');
  assert.deepEqual(f.operations, ['remove', 'install']);
  assert.equal(f.gateCount, 1);
  assert.equal((await f.updater.status()).sourceKind, 'release');
});

test('failed install retains a reachable control page and target retry never repeats removal', async (t) => {
  const f = await fixture(t); f.failInstall = true;
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  const failed = await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.equal(failed.installed, false); assert.equal(failed.canRetry, true); assert.equal(failed.canRestore, true);
  assert.equal((await fetch(prepared.controlUrl)).status, 200);
  f.failInstall = false; await f.action(prepared, 'retry');
  await until(() => f.status(prepared), (job) => job.phase === 'installed' && !job.busy);
  assert.deepEqual(f.operations, ['remove', 'install', 'install']);
});

test('failed install can restore old stable bytes without pretending automatic rollback', async (t) => {
  const f = await fixture(t); f.failInstall = true;
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  f.failInstall = false; await f.action(prepared, 'restore');
  const restored = await until(() => f.status(prepared), (job) => job.phase === 'restored' && !job.busy);
  assert.equal(restored.installedVersion, '0.2.6'); assert.equal(f.row.version, '0.2.6');
  assert.deepEqual(f.operations, ['remove', 'install', 'install']);
});

test('same-version link switch is explicit and actually replaces the installation source', async (t) => {
  const f = await fixture(t, { link: true, linkVersion: '0.3.0' });
  const checked = await f.updater.check();
  await assert.rejects(f.updater.prepare({ releaseId: checked.release.id, version: checked.release.version }), /明确确认/);
  const originalDirectory = f.row.source.slice(5);
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'installed' && !job.busy);
  assert.deepEqual(f.operations, ['remove', 'install']);
  assert.equal((await f.updater.status()).sourceKind, 'release');
  assert.equal(await fs.readFile(join(originalDirectory, 'uncommitted.txt'), 'utf8'), 'preserve me');
});

test('failed link switch restores original link and leaves source modifications intact', async (t) => {
  const f = await fixture(t, { link: true }); f.failInstall = true;
  const originalSource = f.row.source;
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  f.failInstall = false; await f.action(prepared, 'restore');
  await until(() => f.status(prepared), (job) => job.phase === 'restored' && !job.busy);
  assert.equal(f.row.source, originalSource);
  assert.equal(await fs.readFile(join(originalSource.slice(5), 'uncommitted.txt'), 'utf8'), 'preserve me');
});

test('download corruption and wrong package identity leave original installed', async (t) => {
  for (const config of [{ corrupt: true }, { target: release('0.3.0', 30, { name: 'another-package' }) }]) {
    const f = await fixture(t, config);
    await assert.rejects(f.prepare(), /校验失败|不匹配/);
    assert.deepEqual(f.operations, []); assert.equal(f.row.version, '0.2.6');
  }
});

test('removed release or changed target is refused before removal', async (t) => {
  const f = await fixture(t); const checked = await f.updater.check();
  await assert.rejects(f.updater.prepare({ releaseId: 999, version: checked.release.version }), /先检查/);
  f.target.raw.assets[0].digest = `sha256:${'a'.repeat(64)}`;
  await assert.rejects(f.updater.prepare({ releaseId: checked.release.id, version: checked.release.version }), /已经变化/);
  assert.deepEqual(f.operations, []);
});

test('host stop-profile refusal keeps old install and does not submit install', async (t) => {
  const f = await fixture(t); f.removalResult = { application: 'failed', error: { code: 'stop-profile' } };
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  const job = await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.equal(job.installedVersion, '0.2.6'); assert.equal(job.canRestore, false);
  assert.deepEqual(f.operations, ['remove']);
});

test('remove failure after disabling can restore original selection without reinstall', async (t) => {
  const f = await fixture(t, { removeDisablesThenFails: true });
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  const failed = await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.equal(failed.installedVersion, '0.2.6'); assert.equal(failed.enabled, false); assert.equal(failed.canRestore, true); assert.equal(failed.runtimeVersion, null);
  await f.action(prepared, 'restore');
  const restored = await until(() => f.status(prepared), (job) => job.phase === 'restored' && !job.busy);
  assert.equal(restored.enabled, true); assert.equal(f.row.enabled, true);
  assert.deepEqual(f.operations, ['remove', 'enable']);
});

test('same version from a different installed source is not accepted as the confirmed package', async (t) => {
  const f = await fixture(t, { installedSourceOverride: 'github:someone/other#v0.3.0' });
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  const failed = await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.equal(failed.installedVersion, '0.3.0'); assert.match(failed.error, /来源/);
});

test('release changed after preparation is refused at the final start before removal', async (t) => {
  const f = await fixture(t); const prepared = await f.prepare(); await f.open(prepared);
  f.target.raw.assets[0].digest = `sha256:${'b'.repeat(64)}`;
  await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.deepEqual(f.operations, []); assert.equal(f.row.version, '0.2.6');
});

test('host applied with stale runtime is still pending restart and later converges', async (t) => {
  const f = await fixture(t, { staleRuntime: true });
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  const pending = await until(() => f.status(prepared), (job) => job.phase === 'restart-required' && !job.busy);
  assert.equal(pending.application, 'applied');
  assert.equal(pending.installedVersion, '0.3.0'); assert.equal(pending.runtimeVersion, '0.2.6');
  const loaded = createUpdater({ ...f.options, runtimeVersion: '0.3.0' });
  assert.equal((await loaded.status()).job.phase, 'installed');
  assert.deepEqual(f.operations, ['remove', 'install']);
});

test('simultaneous starts and retries submit only one installer', async (t) => {
  const f = await fixture(t); f.failInstall = true;
  const prepared = await f.prepare(); await f.open(prepared);
  const starts = await Promise.all([f.action(prepared, 'start'), f.action(prepared, 'start')]);
  assert.deepEqual(starts.map((result) => result.status).sort(), [202, 409]);
  await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  f.failInstall = false;
  const retries = await Promise.all([f.action(prepared, 'retry'), f.action(prepared, 'retry')]);
  assert.deepEqual(retries.map((result) => result.status).sort(), [202, 409]);
  await until(() => f.status(prepared), (job) => job.phase === 'installed' && !job.busy);
  assert.deepEqual(f.operations, ['remove', 'install', 'install']);
});

test('cache tampering after preparation is caught before uninstall', async (t) => {
  const f = await fixture(t); const prepared = await f.prepare(); await f.open(prepared);
  const directory = join(f.home, 'archived-manager', 'update-cache');
  const target = (await fs.readdir(directory)).find((file) => file.startsWith('30-'));
  await fs.writeFile(join(directory, target), 'tampered');
  await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.deepEqual(f.operations, []); assert.equal(f.row.version, '0.2.6');
});

test('mutations gate refuses update before removal and duplicate start remains single', async (t) => {
  const f = await fixture(t); const prepared = await f.prepare(); await f.open(prepared);
  f.gateBusy = true;
  await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'failed' && !job.busy);
  assert.deepEqual(f.operations, []);
});

test('restart required is preserved; later loaded version reconciles interrupted result without reinstallation', async (t) => {
  const f = await fixture(t, { restartRequired: true });
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'restart-required' && !job.busy);
  const statePath = join(f.home, 'archived-manager', 'update-state.json');
  const saved = JSON.parse(await fs.readFile(statePath, 'utf8')); saved.job.phase = 'installing';
  await fs.writeFile(statePath, JSON.stringify(saved));
  const count = f.operations.length;
  const reloaded = await f.restart('0.3.0');
  const state = await reloaded.status();
  assert.equal(state.job.phase, 'installed');
  assert.equal(state.runtimeVersion, '0.3.0');
  assert.equal(f.operations.length, count);
});

test('interrupted installation with no package stays failed/unknown and does not reinstall automatically', async (t) => {
  const f = await fixture(t); const prepared = await f.prepare();
  const statePath = join(f.home, 'archived-manager', 'update-state.json');
  const saved = JSON.parse(await fs.readFile(statePath, 'utf8')); saved.job.phase = 'installing';
  await fs.writeFile(statePath, JSON.stringify(saved)); f.row = null;
  const reloaded = await f.restart(null);
  const status = await reloaded.status();
  assert.equal(status.job.phase, 'failed'); assert.equal(status.job.installed, false);
  assert.deepEqual(f.operations, []);
  assert.equal((await fetch(prepared.controlUrl)).status, 200);
});

test('capability route rejects cross-origin, missing token and arbitrary spec', async (t) => {
  const f = await fixture(t); const prepared = await f.prepare(); await f.open(prepared);
  assert.equal((await f.action(prepared, 'start', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.action(prepared, 'start', { 'x-archived-manager-update': 'wrong' })).status, 403);
  const response = await fetch(`${prepared.controlUrl}/action`, { method: 'POST', headers: { origin: f.origin, 'x-archived-manager-update': prepared.job.id }, body: JSON.stringify({ action: 'start', spec: 'other-package' }) });
  assert.equal(response.status, 409); assert.deepEqual(f.operations, []);
});

test('temporary control routes expire when idle but never expire in the middle of an installation', async (t) => {
  const f = await fixture(t, { controlTtlMs: 100 });
  let finish; f.blockInstall = new Promise((resolve) => { finish = resolve; });
  const prepared = await f.prepare(); await f.open(prepared); await f.action(prepared, 'start');
  await until(() => f.status(prepared), (job) => job.phase === 'installing');
  await new Promise((done) => setTimeout(done, 130));
  assert.equal((await fetch(prepared.controlUrl)).status, 200);
  finish(); await until(() => f.status(prepared), (job) => job.phase === 'installed' && !job.busy);
  await new Promise((done) => setTimeout(done, 130));
  assert.equal((await fetch(prepared.controlUrl)).status, 404);
});
