import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';

import { createRoutes } from '../lib/host.js';

const PACKAGE_VERSION = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

const A = 'session-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

async function makeHome() {
  const home = await fs.mkdtemp(join(tmpdir(), 'am-routes-'));
  const dir = join(home, 'sessions', '--proj--', A);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, 'session.v4.jsonl.zstd'), '{}\n');
  return home;
}

function fakeCtx(home) {
  const state = { archived: [A] };
  const entity = { id: 'ws', path: '/tmp/proj', title: '工作', sessionIds: [A], async detachSession() {} };
  const registry = {
    get archivedSessionIds() { return state.archived; },
    list: () => [entity],
    async unarchiveSession(id) { state.archived = state.archived.filter((value) => value !== id); },
  };
  return {
    get(name) {
      if (name === 'dshHomePath') return () => home;
      if (name === 'workspaceRegistry') return registry;
      if (name === 'sessionPersistence') return { list: async () => [{ header: { id: A, cwd: '/tmp/proj', createdAt: 1 }, sizeBytes: 7 }] };
      if (name === 'sessions') return { get: () => undefined };
      if (name === 'agents') return { get: () => undefined };
      return undefined;
    },
  };
}

function makeReq({ method = 'GET', headers = {}, body, remote = '127.0.0.1' } = {}) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
  stream.method = method;
  stream.headers = headers;
  stream.socket = { remoteAddress: remote };
  return stream;
}

function makeRes() {
  const res = { status: 0, headers: {}, body: '' };
  res.writeHead = (status, headers) => { res.status = status; Object.assign(res.headers, headers || {}); };
  res.end = (body) => { res.body = body || ''; };
  return res;
}

async function call(route, options) {
  const req = makeReq(options);
  const res = makeRes();
  await route.handler(req, res);
  let json;
  try { json = JSON.parse(res.body); } catch { json = undefined; }
  return { status: res.status, json };
}

function route(routes, path) {
  return routes.find((entry) => entry.path === path);
}

test('GET list returns archived items for a loopback same-origin caller', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/list'), { method: 'GET', headers: {} });
  assert.equal(result.status, 200);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.items.length, 1);
  assert.equal(result.json.items[0].id, A);
  assert.equal(result.json.version, PACKAGE_VERSION);
});

test('POST without the custom header is refused', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/hide'), { method: 'POST', body: { ids: [A] } });
  assert.equal(result.status, 403);
});

test('POST hide with header and loopback moves the session', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/hide'), {
    method: 'POST',
    headers: { 'x-archived-manager': '1' },
    body: { ids: [A] },
  });
  assert.equal(result.status, 200);
  assert.equal(result.json.results[0].ok, true);
  assert.equal(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
});

test('a cross-origin POST is refused', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/hide'), {
    method: 'POST',
    headers: { 'x-archived-manager': '1', origin: 'http://evil.example', host: '127.0.0.1:43120' },
    body: { ids: [A] },
  });
  assert.equal(result.status, 403);
});

test('a non-loopback caller is refused', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/list'), { method: 'GET', remote: '10.0.0.9' });
  assert.equal(result.status, 403);
});

test('a wrong method is refused with 405', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/hide'), { method: 'GET', headers: {} });
  assert.equal(result.status, 405);
});

test('purge without the confirmation body is refused', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/purge'), {
    method: 'POST',
    headers: { 'x-archived-manager': '1' },
    body: { ids: [A] },
  });
  assert.equal(result.status, 409);
});

test('health reports the home directory and package version', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/health'), { method: 'GET', headers: {} });
  assert.equal(result.status, 200);
  assert.equal(result.json.home, home);
  assert.equal(result.json.version, PACKAGE_VERSION);
});

test('the settings routes read and save the quarantine retention window', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const read = await call(route(routes, '/archived-manager/settings'), { method: 'GET', headers: {} });
  assert.equal(read.status, 200);
  assert.equal(read.json.settings.trashRetentionDays, 0);
  const saved = await call(route(routes, '/archived-manager/settings/save'), {
    method: 'POST', headers: { 'x-archived-manager': '1' }, body: { trashRetentionDays: 30 },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.json.settings.trashRetentionDays, 30);
});

test('the unarchive route uses the native registry action', async () => {
  const home = await makeHome();
  const routes = createRoutes(fakeCtx(home));
  const result = await call(route(routes, '/archived-manager/unarchive'), {
    method: 'POST', headers: { 'x-archived-manager': '1' }, body: { ids: [A] },
  });
  assert.equal(result.status, 200);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.results[0].action, 'unarchive');
});
