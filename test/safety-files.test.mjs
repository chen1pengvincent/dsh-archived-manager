import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { zstdCompressSync } from 'node:zlib';
import { createManager } from '../lib/host.js';
import { inspectSession, deleteSession, moveSession, decodeLog } from '../lib/session-files.js';

const A = 'session-11111111-1111-4111-8111-111111111111';
const B = 'session-22222222-2222-4222-8222-222222222222';
const event = (type, data, extra = {}) => ({ type, data, ...extra });

async function fixture(t, ids = [A], events = [], overrides = {}) {
  const home = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'am-safety-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const workspace = join(home, 'project');
  await fs.mkdir(workspace);
  const state = { archived: [...ids], running: false }, opens = [];
  for (const id of ids) {
    const dir = join(home, 'sessions', '--fixture--', id);
    await fs.mkdir(dir, { recursive: true });
    const header = { type: 'session', version: 4, id, createdAt: 1, isSeeded: false, delegationDepth: 0, cwd: workspace };
    const rows = events.map((row, seq) => ({ seq, time: seq + 1, ...row }));
    await fs.writeFile(join(dir, 'session.v4.jsonl.zstd'), Buffer.concat([zstdCompressSync(JSON.stringify(header) + '\n'), ...(rows.length ? [zstdCompressSync(rows.map(JSON.stringify).join('\n') + '\n')] : [])]));
    await fs.writeFile(join(dir, 'session.lock'), '');
  }
  const services = {
    dshHomePath: () => home,
    workspaceRegistry: { get archivedSessionIds() { return state.archived; }, list: () => [], async unarchiveSession(id) { state.archived = state.archived.filter((x) => x !== id); } },
    sessionPersistence: { list: async () => ids.map((id) => ({ header: { id, cwd: workspace } })) },
    agents: { get: () => state.running ? { status: 'running' } : undefined },
    fs: { processPathFromHostPath: (path) => path, resolve: async (path) => resolve(path), processPath: (path) => path },
    sessionController: { workspaceDesktop: () => ({ available: true }), async openWorkspacePath(options, signal) { assert.ok(signal instanceof AbortSignal, 'host desktop API requires a caller signal'); opens.push(options); } },
    ...overrides,
  };
  const manager = createManager({ get: (name) => services[name] });
  return { home, manager, workspace, state, services, opens, dir: (id = A) => join(home, 'sessions', '--fixture--', id) };
}

test('Zstandard session header is an independent frame and complete later event frames remain readable', () => {
  const header = JSON.stringify({ type: 'session', version: 4, id: A, createdAt: 1, isSeeded: false, delegationDepth: 0 }) + '\n';
  const first = JSON.stringify({ seq: 0, time: 1, type: 'session/title', data: { title: 'synthetic' } }) + '\n';
  const second = JSON.stringify({ seq: 1, time: 2, type: 'deliverables/presented', data: { files: [{ path: '/fixture/output.txt' }] } }) + '\n';
  const headerFrame = zstdCompressSync(header);
  assert.equal(decodeLog(headerFrame, 'session.v4.jsonl.zstd', A).events.length, 0);
  const frames = Buffer.concat([headerFrame, zstdCompressSync(first), zstdCompressSync(second)]);
  assert.equal(decodeLog(frames, 'session.v4.jsonl.zstd', A).events.length, 2);
  assert.throws(() => decodeLog(zstdCompressSync(header + first), 'session.v4.jsonl.zstd', A), { code: 'protected-content' });
  assert.throws(() => decodeLog(Buffer.concat([zstdCompressSync(''), zstdCompressSync(header + first)]), 'session.v4.jsonl.zstd', A), { code: 'protected-content' });
  assert.throws(() => decodeLog(frames.subarray(0, -1), 'session.v4.jsonl.zstd', A), { code: 'protected-content' });
  // Generic Zstandard decoders accept skippable frames; DSH's container does not.
  assert.throws(() => decodeLog(Buffer.concat([headerFrame, Buffer.from([0x50, 0x2a, 0x4d, 0x18, 0, 0, 0, 0])]), 'session.v4.jsonl.zstd', A), { code: 'protected-content' });
});

test('a single compressed frame containing header and events is preserved by cleanup', async (t) => {
  const f = await fixture(t);
  const malformedContainer = zstdCompressSync([
    { type: 'session', version: 4, id: A, createdAt: 1, isSeeded: false, delegationDepth: 0 },
    { seq: 0, time: 1, type: 'session/title', data: { title: 'synthetic' } },
  ].map(JSON.stringify).join('\n') + '\n');
  const path = join(f.dir(), 'session.v4.jsonl.zstd'); await fs.writeFile(path, malformedContainer);
  assert.equal((await f.manager.purge([A], 'PURGE'))[0].code, 'protected-content');
  assert.deepEqual(await fs.readFile(path), malformedContainer); assert.deepEqual(f.state.archived, [A]);
});

test('purge deletes only verified chat data; independent outputs, modifications and attachments survive', async (t) => {
  const f = await fixture(t, [A, B], [event('user/message', { text: 'Synthetic text | table | ```code```' }, { surfaceOp: 'append' })]);
  const output = join(f.workspace, 'output.csv'), existing = join(f.workspace, 'existing.js'), attachment = join(f.home, 'attachments', 'shared');
  await fs.writeFile(output, 'a,b\n1,2\n');
  await fs.writeFile(existing, 'user change retained');
  await fs.mkdir(dirname(attachment)); await fs.writeFile(attachment, 'shared');
  await fs.writeFile(join(f.dir(B), 'independent.csv'), 'must survive');
  const result = await f.manager.purge([A, B], 'PURGE');
  assert.equal(result[0].ok, true); assert.equal(result[1].code, 'protected-content');
  assert.deepEqual(f.state.archived, [B]);
  assert.equal(await fs.readFile(output, 'utf8'), 'a,b\n1,2\n');
  assert.equal(await fs.readFile(existing, 'utf8'), 'user change retained');
  assert.equal(await fs.readFile(attachment, 'utf8'), 'shared');
  assert.equal(await fs.readFile(join(f.dir(B), 'independent.csv'), 'utf8'), 'must survive');
});

test('every archive mutation preserves unknown, linked, malformed and mismatched session data', async (t) => {
  const mutations = {
    extra: async (f) => fs.writeFile(join(f.dir(), 'report.xlsx'), 'independent'),
    nested: async (f) => fs.mkdir(join(f.dir(), 'outputs')),
    link: async (f) => fs.symlink(f.workspace, join(f.dir(), 'linked')),
    hardlink: async (f) => fs.link(join(f.dir(), 'session.v4.jsonl.zstd'), join(f.workspace, 'log-copy')),
    lock: async (f) => fs.writeFile(join(f.dir(), 'session.lock'), 'not a host lock'),
    corrupt: async (f) => fs.writeFile(join(f.dir(), 'session.v4.jsonl.zstd'), '{}\n'),
    wrongId: async (f) => fs.writeFile(join(f.dir(), 'session.v4.jsonl.zstd'), zstdCompressSync(JSON.stringify({ type: 'session', version: 4, id: B, createdAt: 1, isSeeded: false, delegationDepth: 0 }) + '\n')),
    future: async (f) => fs.rename(join(f.dir(), 'session.v4.jsonl.zstd'), join(f.dir(), 'session.v5.jsonl.zstd')),
  };
  for (const [name, mutate] of Object.entries(mutations)) await t.test(name, async (t) => {
    const f = await fixture(t); await mutate(f);
    const before = (await fs.readdir(f.dir())).sort();
    assert.equal((await f.manager.hide([A]))[0].ok, false);
    assert.equal((await f.manager.purge([A], 'PURGE'))[0].ok, false);
    assert.deepEqual((await fs.readdir(f.dir())).sort(), before);
    assert.deepEqual(f.state.archived, [A]);
  });
});

test('discard, empty, save retention, scheduled sweep and restore all preserve quarantined unknown files', async (t) => {
  for (const action of ['discard', 'empty', 'settings', 'sweep', 'restore']) await t.test(action, async (t) => {
    const f = await fixture(t); await f.manager.hide([A]);
    const entry = (await f.manager.listRemoved())[0];
    const batch = join(f.manager.trashRoot, entry.batch), target = join(batch, entry.dir);
    await fs.writeFile(join(target, 'independent.txt'), 'keep');
    const manifestPath = join(batch, 'manifest.json'), manifest = JSON.parse(await fs.readFile(manifestPath));
    manifest.entries[0].movedAt = Date.now() - 100 * 86400000;
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    let result;
    if (action === 'discard') result = (await f.manager.discard([entry], 'DISCARD'))[0];
    if (action === 'empty') result = (await f.manager.emptyTrash('EMPTY', await f.manager.listRemoved())).results[0];
    if (action === 'settings') result = (await f.manager.saveSettings({ trashRetentionDays: 7 })).swept.results[0];
    if (action === 'sweep') result = (await f.manager.sweepTrash(7)).results[0];
    if (action === 'restore') result = (await f.manager.restore([entry]))[0];
    assert.equal(result.ok, false); assert.equal(result.code, 'protected-content');
    assert.equal(await fs.readFile(join(target, 'independent.txt'), 'utf8'), 'keep');
    assert.equal((await f.manager.listRemoved()).length, 1);
    assert.equal(JSON.parse(await fs.readFile(manifestPath)).entries.length, 1);
  });
});

test('empty never recursively removes batch siblings or unreadable manifests', async (t) => {
  const f = await fixture(t, [A, B]); await f.manager.hide([A, B]);
  const entries = await f.manager.listRemoved(), batch = join(f.manager.trashRoot, entries[0].batch);
  await fs.writeFile(join(batch, 'independent.bin'), 'retain root sibling');
  const unknownBatch = join(f.manager.trashRoot, 'old-invalid');
  await fs.mkdir(unknownBatch); await fs.writeFile(join(unknownBatch, 'manifest.json'), 'invalid');
  await fs.writeFile(join(unknownBatch, 'report.txt'), 'retain invalid batch');
  const result = await f.manager.emptyTrash('EMPTY', await f.manager.listRemoved());
  assert.equal(result.removed, 2); assert.equal(result.failed, 1);
  assert.equal(await fs.readFile(join(batch, 'independent.bin'), 'utf8'), 'retain root sibling');
  assert.equal(await fs.readFile(join(unknownBatch, 'report.txt'), 'utf8'), 'retain invalid batch');
  assert.deepEqual(JSON.parse(await fs.readFile(join(batch, 'manifest.json'))).entries, []);
});

test('symlinked session, quarantine entry and manifest cannot redirect operations', async (t) => {
  const f = await fixture(t, [A, B]);
  const moved = join(f.workspace, 'outside'); await fs.rename(f.dir(A), moved); await fs.symlink(moved, f.dir(A));
  assert.equal((await f.manager.purge([A], 'PURGE'))[0].ok, false);
  assert.equal((await f.manager.forget([A]))[0].ok, false);
  assert.deepEqual(f.state.archived, [A, B]);
  assert.equal((await f.manager.list()).items.find((item) => item.id === A).missing, false);
  await f.manager.hide([B]);
  const entry = (await f.manager.listRemoved())[0], target = join(f.manager.trashRoot, entry.batch, entry.dir);
  await fs.rm(target, { recursive: true }); await fs.symlink(moved, target);
  assert.equal((await f.manager.discard([entry], 'DISCARD'))[0].ok, false);
  assert.equal((await f.manager.emptyTrash('EMPTY', await f.manager.listRemoved())).removed, 0);
  assert.equal((await fs.lstat(target)).isSymbolicLink(), true);
  assert.ok(await fs.stat(join(moved, 'session.v4.jsonl.zstd')));
});

test('changed directory or files after validation are retained before mutation', async (t) => {
  const f = await fixture(t);
  let check = await inspectSession(f.home, f.dir(), A);
  await fs.writeFile(join(f.dir(), 'new.txt'), 'new independent file');
  await assert.rejects(() => deleteSession(check), { code: 'protected-content' });
  assert.ok(await fs.stat(join(f.dir(), 'session.v4.jsonl.zstd')));
  await fs.unlink(join(f.dir(), 'new.txt'));
  check = await inspectSession(f.home, f.dir(), A);
  const old = join(f.workspace, 'old'); await fs.rename(f.dir(), old); await fs.symlink(old, f.dir());
  await assert.rejects(() => moveSession(check, f.home, join(f.workspace, 'new')), { code: 'protected-content' });
  assert.ok(await fs.stat(join(old, 'session.v4.jsonl.zstd')));
});

test('failed move never rolls a replaced or modified destination file into the original session', async (t) => {
  for (const replace of [true, false]) await t.test(replace ? 'replaced inode' : 'modified content', async (t) => {
    const f = await fixture(t);
    const link = fs.link;
    let replacement;
    fs.link = async (source, target) => {
      if (source === join(f.dir(), 'session.v4.jsonl.zstd')) {
        replacement = join(dirname(target), 'session.lock');
        if (replace) await fs.unlink(replacement);
        await fs.writeFile(replacement, 'independent replacement: retain this exact location');
        throw Object.assign(new Error('fixture move interruption'), { code: 'EIO' });
      }
      return link(source, target);
    };
    let results;
    try { results = await f.manager.hide([A]); } finally { fs.link = link; }
    assert.equal(results[0].ok, false); assert.equal(results[0].code, 'protected-content');
    assert.equal(await fs.readFile(replacement, 'utf8'), 'independent replacement: retain this exact location');
    await assert.rejects(() => fs.lstat(join(f.dir(), 'session.lock')), { code: 'ENOENT' });
    assert.ok(await fs.stat(join(f.dir(), 'session.v4.jsonl.zstd')));
    const manifest = JSON.parse(await fs.readFile(join(dirname(dirname(replacement)), 'manifest.json')));
    assert.equal(manifest.entries.length, 1); assert.equal(manifest.entries[0].id, A);
    assert.deepEqual(f.state.archived, [A]);
  });
});

test('recorded file list uses successful append-origin structured paths only, for cold and quarantined logs', async (t) => {
  const paths = { presented: '/tmp/fixture-presented.txt', write: '/tmp/fixture-written.txt', edit: '/tmp/fixture-edited.txt', failed: '/tmp/fixture-failed.txt', read: '/tmp/fixture-read.txt', guessed: '/tmp/fixture-mentioned.txt' };
  const rows = [event('deliverables/presented', { files: [{ path: paths.presented }] })];
  for (const [name, path, error] of [['write', paths.write, false], ['edit', paths.edit, false], ['write', paths.failed, true], ['read', paths.read, false]]) {
    rows.push(event('tool/call', { turn: 1, callId: path, name, arguments: JSON.stringify({ path }) }));
    rows.push(event('tool/result', { turn: 1, message: { source: { callId: path }, isError: error }, meta: { path } }, { surfaceOp: 'append' }));
  }
  rows.push(event('user/message', { text: paths.guessed }, { surfaceOp: 'append' }));
  rows.push(event('tool/call', { turn: 1, callId: 'legacy', name: 'write', arguments: JSON.stringify({ path: paths.guessed }) }));
  rows.push(event('tool/result', { turn: 1, message: { source: { callId: 'legacy' }, isError: false } }, { surfaceOp: 'append' }));
  const f = await fixture(t, [A], rows);
  const cold = await f.manager.files({ id: A });
  assert.deepEqual(cold.files.map((file) => file.path), [paths.presented, paths.write, paths.edit]);
  assert.equal(cold.coverage, 'recorded-only'); assert.equal(cold.workspace.path, f.workspace);
  await f.manager.hide([A]); const entry = (await f.manager.listRemoved())[0];
  assert.deepEqual((await f.manager.files(entry)).files.map((file) => file.path), cold.files.map((file) => file.path));
  await f.manager.discard([entry], 'DISCARD');
  await assert.rejects(() => f.manager.files(entry));
});

test('open-folder revalidates recorded identity; only files are revealed and only directories are opened', async (t) => {
  const f = await fixture(t);
  const file = join(f.workspace, 'output.txt'); await fs.writeFile(file, 'data');
  const header = { type: 'session', version: 4, id: A, createdAt: 1, isSeeded: false, delegationDepth: 0, cwd: f.workspace };
  const presented = { seq: 0, time: 1, type: 'deliverables/presented', data: { files: [{ path: file }] } };
  await fs.writeFile(join(f.dir(), 'session.v4.jsonl.zstd'), Buffer.concat([zstdCompressSync(JSON.stringify(header) + '\n'), zstdCompressSync(JSON.stringify(presented) + '\n')]));
  await f.manager.openFolder({ id: A, path: file });
  assert.deepEqual(f.opens.pop(), { path: file, action: 'reveal' });
  await fs.unlink(file);
  assert.equal((await f.manager.files({ id: A })).files[0].status, 'file-missing');
  await f.manager.openFolder({ id: A, path: file });
  assert.deepEqual(f.opens.pop(), { path: f.workspace });
  await f.manager.openFolder({ id: A, workspace: true }); assert.deepEqual(f.opens.pop(), { path: f.workspace });
  await assert.rejects(() => f.manager.openFolder({ id: A, path: '/etc/passwd' }));
  await fs.rmdir(f.workspace);
  assert.equal((await f.manager.files({ id: A })).files[0].canOpen, false);
  await assert.rejects(() => f.manager.openFolder({ id: A, path: file }));
  assert.equal(f.opens.length, 0);
});

test('unmapped and unavailable desktop paths remain copyable but cannot open', async (t) => {
  const f = await fixture(t, [A], [event('deliverables/presented', { files: [{ path: '/remote/project/output.txt' }] })]);
  f.services.fs.processPathFromHostPath = () => undefined;
  const report = await f.manager.files({ id: A });
  assert.equal(report.files[0].path, '/remote/project/output.txt');
  assert.equal(report.files[0].status, 'unmapped'); assert.equal(report.files[0].canOpen, false);
  await assert.rejects(() => f.manager.openFolder({ id: A, path: '/remote/project/output.txt' }));
  assert.equal(f.opens.length, 0);
});

test('update gate waits for current mutation and rejects new operations until it finishes', async (t) => {
  const f = await fixture(t);
  let release, entered = false;
  const pending = f.manager.enterUpdate(async () => { entered = true; await new Promise((resolve) => { release = resolve; }); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(entered, true); assert.equal(f.manager.isUpdating(), true);
  await assert.rejects(() => f.manager.purge([A], 'PURGE'), { code: 'updating' });
  assert.equal((await f.manager.list()).items.length, 1);
  release(); await pending;
  assert.equal(f.manager.isUpdating(), false);
  assert.equal((await f.manager.purge([A], 'PURGE'))[0].ok, true);
});

test('empty rejects a changed confirmation snapshot before deleting any entry', async (t) => {
  const f = await fixture(t, [A, B]);
  await f.manager.hide([A]);
  const confirmed = await f.manager.listRemoved();
  await f.manager.hide([B]);
  await assert.rejects(() => f.manager.emptyTrash('EMPTY', confirmed), { code: 'state-changed' });
  assert.equal((await f.manager.listRemoved()).length, 2);
  await assert.rejects(() => f.manager.emptyTrash('EMPTY'), { code: 'invalid' });
  assert.equal((await f.manager.emptyTrash('EMPTY', await f.manager.listRemoved())).removed, 2);
});

test('listed log sizes exclude independent files and remeasure legacy quarantine byte totals', async (t) => {
  const f = await fixture(t);
  const size = (await f.manager.list()).items[0].sizeBytes;
  assert.ok(size > 0);
  const extra = join(f.dir(), 'report.xlsx'); await fs.writeFile(extra, Buffer.alloc(1024 * 1024));
  assert.equal((await f.manager.list()).items[0].sizeBytes, size);
  await fs.unlink(extra); await f.manager.hide([A]);
  const entry = (await f.manager.listRemoved())[0];
  const manifestPath = join(f.manager.trashRoot, entry.batch, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath)); manifest.entries[0].bytes = 999999999;
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  await fs.writeFile(join(f.manager.trashRoot, entry.batch, entry.dir, 'old-report.txt'), 'independent');
  assert.equal((await f.manager.listRemoved())[0].bytes, size);
});

test('restore reports successful file restoration separately from failed workspace reattachment', async (t) => {
  const f = await fixture(t);
  f.services.workspaceRegistry.list = () => [{ path: f.workspace, async attachSession() { throw new Error('fixture failure'); } }];
  await f.manager.hide([A]);
  const entry = (await f.manager.listRemoved())[0];
  const result = (await f.manager.restore([entry]))[0];
  assert.equal(result.ok, true); assert.equal(result.workspaceAttached, false);
  assert.match(result.warning, /重新关联原工作区失败/);
  assert.ok(await fs.stat(f.dir())); assert.equal((await f.manager.listRemoved()).length, 0);
});

test('update gate runs after an already queued mutation; a reloaded manager observes the shared job', async (t) => {
  const f = await fixture(t);
  let release, active = false, updating = false;
  f.services.workspaceRegistry.unarchiveSession = async () => { active = true; await new Promise((r) => { release = r; }); active = false; };
  const mutation = f.manager.unarchive([A]);
  while (!release) await new Promise((r) => setImmediate(r));
  const update = f.manager.enterUpdate(async () => { assert.equal(active, false); updating = true; });
  assert.equal(updating, false); release(); await mutation; await update;
  assert.equal(updating, true);
  const reloaded = createManager({ get: (name) => f.services[name] }, { isUpdating: () => true });
  await assert.rejects(() => reloaded.hide([A]), { code: 'updating' });
  await assert.rejects(() => reloaded.sweepTrash(7), { code: 'updating' });
  await reloaded.enterUpdate(async () => {}); // the updater itself is not deadlocked by its shared state
});

test('recorded parent aliases resolve to the same host file and missing-file directory', async (t) => {
  const f = await fixture(t);
  const alias = join(f.home, 'project-alias');
  await fs.symlink(f.workspace, alias);
  const file = join(alias, 'output.txt');
  await fs.writeFile(file, 'keep');
  const header = { type: 'session', version: 4, id: A, createdAt: 1, isSeeded: false, delegationDepth: 0 };
  const presented = { seq: 0, time: 1, type: 'deliverables/presented', data: { files: [{ path: file }] } };
  await fs.writeFile(join(f.dir(), 'session.v4.jsonl.zstd'), Buffer.concat([zstdCompressSync(JSON.stringify(header) + '\n'), zstdCompressSync(JSON.stringify(presented) + '\n')]));
  f.services.fs.resolve = async (path) => { try { return await fs.realpath(path); } catch { return join(await fs.realpath(dirname(path)), 'output.txt'); } };
  assert.equal((await f.manager.files({ id: A })).files[0].canOpen, true);
  await f.manager.openFolder({ id: A, path: file });
  assert.deepEqual(f.opens.pop(), { path: join(f.workspace, 'output.txt'), action: 'reveal' });
  await fs.unlink(file);
  assert.equal((await f.manager.files({ id: A })).files[0].status, 'file-missing');
  await f.manager.openFolder({ id: A, path: file });
  assert.deepEqual(f.opens.pop(), { path: f.workspace });
});
