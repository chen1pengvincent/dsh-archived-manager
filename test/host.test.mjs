import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createManager, ManagerError } from '../lib/host.js';

const A = 'session-11111111-1111-4111-8111-111111111111';
const B = 'session-22222222-2222-4222-8222-222222222222';
const C = 'session-33333333-3333-4333-8333-333333333333';
const LAST_PROMPT = 1700000000123;

async function makeHome(ids) {
  const home = await fs.mkdtemp(join(tmpdir(), 'am-test-'));
  const project = join(home, 'sessions', '--proj--');
  const cache = join(home, 'storages', 'session_projcache', 'sessions');
  await fs.mkdir(project, { recursive: true });
  await fs.mkdir(cache, { recursive: true });
  for (const id of ids) {
    const dir = join(project, id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, 'session.v4.jsonl.zstd'), JSON.stringify({ type: 'session', id, cwd: '/tmp/proj', createdAt: 1700000000000 }) + '\n');
    await fs.writeFile(join(dir, 'session.lock'), '');
    const bare = id.replace(/^session-/, '');
    await fs.writeFile(join(cache, bare + '.json'), JSON.stringify({
      version: 7,
      record: {
        rows: {
          title: { val: '标题-' + id.slice(8, 12) },
          sessionListMetadata: { val: { blank: false, lastPromptAt: LAST_PROMPT } },
        },
      },
    }));
  }
  return home;
}

function fakeCtx(home, archivedIds, options = {}) {
  const calls = { unarchive: [], detach: [], attach: [] };
  const state = { archived: [...archivedIds] };
  const entity = {
    id: 'ws-1',
    path: '/tmp/proj',
    title: '工作',
    sessionIds: [...archivedIds],
    async attachSession(id) {
      calls.attach.push(id);
      entity.sessionIds = [id, ...entity.sessionIds.filter((value) => value !== id)];
    },
    async detachSession(id) {
      calls.detach.push(id);
      entity.sessionIds = entity.sessionIds.filter((value) => value !== id);
    },
  };
  const registry = {
    get archivedSessionIds() { return state.archived; },
    list() { return [entity]; },
    async unarchiveSession(id) {
      calls.unarchive.push(id);
      state.archived = state.archived.filter((value) => value !== id);
    },
  };
  const snapshots = archivedIds.map((id) => ({
    header: { id, cwd: '/tmp/proj', createdAt: 1700000000000 },
    sizeBytes: 42,
  }));
  const ctx = {
    get(name) {
      if (name === 'dshHomePath') return () => home;
      if (name === 'workspaceRegistry') return registry;
      if (name === 'sessionPersistence') return { list: async () => snapshots };
      if (name === 'sessions') return { get: () => (options.resident ? { id: 'x' } : undefined) };
      if (name === 'agents') return { get: () => (options.running ? { status: 'running' } : undefined) };
      if (name === 'schedule') return options.schedule;
      return undefined;
    },
  };
  return { ctx, calls, registry, entity, state };
}

async function timesOf(manager) {
  try {
    return JSON.parse(await fs.readFile(manager.archiveTimesPath, 'utf8')).times;
  } catch {
    return {};
  }
}

test('list reports titles, last-used time, directory size and a null archive time on first run', async () => {
  const home = await makeHome([A, B]);
  const { ctx } = fakeCtx(home, [A, B]);
  const manager = createManager(ctx);
  const report = await manager.list();
  assert.equal(report.items.length, 2);
  const item = report.items.find((entry) => entry.id === A);
  assert.equal(item.title, '标题-1111');
  assert.equal(item.workspace.title, '工作');
  assert.equal(item.lastUsedAt, LAST_PROMPT);
  assert.equal(item.archivedAt, null);
  assert.equal(item.missing, false);
  const expected = (await fs.stat(join(home, 'sessions', '--proj--', A, 'session.v4.jsonl.zstd'))).size
    + (await fs.stat(join(home, 'sessions', '--proj--', A, 'session.lock'))).size;
  assert.equal(item.sizeBytes, expected);
  assert.deepEqual(await timesOf(manager), { [A]: null, [B]: null });
});

test('a session archived after the first run gets an observation timestamp', async () => {
  const home = await makeHome([A, B]);
  const { ctx, state } = fakeCtx(home, [A, B]);
  const manager = createManager(ctx);
  await manager.list();
  state.archived.push(C);
  const times = await manager.syncArchiveTimes();
  assert.equal(times[A], null);
  assert.equal(typeof times[C], 'number');
  assert.ok(times[C] > 0);
});

test('last-used falls back to the newest log mtime when the cache has no timestamp', async () => {
  const home = await makeHome([A]);
  const cache = join(home, 'storages', 'session_projcache', 'sessions', A.replace(/^session-/, '') + '.json');
  await fs.writeFile(cache, JSON.stringify({ version: 7, record: { rows: { title: { val: '无时间' } } } }));
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  const report = await manager.list();
  assert.equal(typeof report.items[0].lastUsedAt, 'number');
  assert.ok(report.items[0].lastUsedAt > 0);
});

test('hide moves the directory into the quarantine, clears the record and drops its archive time', async () => {
  const home = await makeHome([A, B]);
  const { ctx, calls } = fakeCtx(home, [A, B]);
  const manager = createManager(ctx);
  await manager.list();
  const results = await manager.hide([A]);
  assert.equal(results[0].ok, true);
  assert.equal(results[0].action, 'hide');
  assert.equal(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
  const batches = await fs.readdir(join(home, 'archived-manager', 'trash'));
  assert.equal(batches.length, 1);
  const manifest = JSON.parse(await fs.readFile(join(home, 'archived-manager', 'trash', batches[0], 'manifest.json'), 'utf8'));
  assert.equal(manifest.entries.length, 1);
  assert.equal(manifest.entries[0].id, A);
  assert.equal(manifest.entries[0].workspacePath, '/tmp/proj');
  assert.deepEqual(calls.unarchive, [A]);
  assert.deepEqual(calls.detach, [A]);
  const times = await timesOf(manager);
  assert.equal(A in times, false);
  assert.equal(B in times, true);
  const report = await manager.list();
  assert.deepEqual(report.items.map((entry) => entry.id), [B]);
  assert.equal(report.removed.length, 1);
});

test('hide refuses a session that is not archived', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, []);
  const manager = createManager(ctx);
  const results = await manager.hide([A]);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].code, 'not-archived');
});

test('hide refuses a running session', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A], { running: true });
  const manager = createManager(ctx);
  const results = await manager.hide([A]);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].code, 'running');
  assert.notEqual(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
});

test('purge requires the PURGE confirmation and removes the directory and its archive time', async () => {
  const home = await makeHome([A]);
  const { ctx, calls } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await assert.rejects(() => manager.purge([A], 'nope'), (error) => error instanceof ManagerError && error.code === 'confirm');
  const results = await manager.purge([A], 'PURGE');
  assert.equal(results[0].ok, true);
  assert.equal(results[0].action, 'purge');
  assert.equal(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
  assert.deepEqual(calls.unarchive, [A]);
  assert.equal(A in (await timesOf(manager)), false);
});

test('restore moves a hidden directory back to its original path', async () => {
  const home = await makeHome([A]);
  const { ctx, calls } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  const removed = await manager.listRemoved();
  assert.equal(removed.length, 1);
  const results = await manager.restore([{ batch: removed[0].batch, id: A }]);
  assert.equal(results[0].ok, true);
  const stat = await fs.stat(join(home, 'sessions', '--proj--', A));
  assert.equal(stat.isDirectory(), true);
  assert.deepEqual(calls.attach, [A]);
  assert.equal((await manager.listRemoved()).length, 0);
});

test('restore refuses a traversal batch name and an unknown id', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  const removed = await manager.listRemoved();
  const badBatch = await manager.restore([{ batch: '../escape', id: A }]);
  assert.equal(badBatch[0].ok, false);
  const badId = await manager.restore([{ batch: removed[0].batch, id: C }]);
  assert.equal(badId[0].ok, false);
});

test('invalid ids and path traversal are rejected before touching disk', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await assert.rejects(() => manager.hide(['../../etc/passwd']), (error) => error instanceof ManagerError && error.code === 'invalid');
});

test('a missing directory only clears the archive record and its archive time', async () => {
  const home = await makeHome([]);
  const { ctx, calls } = fakeCtx(home, [C]);
  const manager = createManager(ctx);
  await manager.list();
  const results = await manager.hide([C]);
  assert.equal(results[0].ok, true);
  assert.equal(results[0].action, 'forget');
  assert.deepEqual(calls.unarchive, [C]);
  assert.equal(C in (await timesOf(manager)), false);
});

test('emptyTrash removes every batch and reports bytes', async () => {
  const home = await makeHome([A, B]);
  const { ctx } = fakeCtx(home, [A, B]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  await manager.hide([B]);
  const result = await manager.emptyTrash('EMPTY');
  assert.equal(result.removed, 2);
  assert.ok(result.bytes > 0);
  assert.deepEqual(await fs.readdir(join(home, 'archived-manager', 'trash')), []);
});

test('forget clears a missing record but refuses a session whose files still exist', async () => {
  const home = await makeHome([A]);
  const { ctx, calls } = fakeCtx(home, [A, C]);
  const manager = createManager(ctx);
  await manager.list();
  const ok = await manager.forget([C]);
  assert.equal(ok[0].ok, true);
  assert.equal(ok[0].action, 'forget');
  assert.deepEqual(calls.unarchive, [C]);
  const refused = await manager.forget([A]);
  assert.equal(refused[0].ok, false);
  assert.equal(refused[0].code, 'files-exist');
  assert.notEqual(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
});

test('sync never touches the store while the registry service is unavailable', async () => {
  const home = await makeHome([]);
  const ctx = { get(name) { return name === 'dshHomePath' ? () => home : undefined; } };
  const manager = createManager(ctx);
  const times = await manager.syncArchiveTimes();
  assert.deepEqual(times, {});
  await assert.rejects(() => fs.readFile(manager.archiveTimesPath));
});

test('an uninitialized legacy store is migrated to null archive times', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await fs.mkdir(join(home, 'archived-manager'), { recursive: true });
  await fs.writeFile(manager.archiveTimesPath, JSON.stringify({ version: 1, times: { [A]: 12345 } }));
  const times = await manager.syncArchiveTimes();
  assert.equal(times[A], null);
  const stored = JSON.parse(await fs.readFile(manager.archiveTimesPath, 'utf8'));
  assert.equal(stored.initialized, true);
  assert.equal(stored.times[A], null);
});

test('unarchive uses the native registry action, leaves files in place and forgets the archive time', async () => {
  const home = await makeHome([A]);
  const { ctx, calls, registry } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await manager.list();
  const results = await manager.unarchive([A]);
  assert.equal(results[0].ok, true);
  assert.equal(results[0].action, 'unarchive');
  assert.deepEqual(calls.unarchive, [A]);
  assert.deepEqual(calls.detach, []);
  assert.notEqual(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
  assert.equal(A in (await timesOf(manager)), false);
  assert.equal((await manager.list()).items.length, 0);
  assert.equal(registry.archivedSessionIds.length, 0);
});

test('unarchive refuses a record whose files are gone', async () => {
  const home = await makeHome([]);
  const { ctx, calls } = fakeCtx(home, [C]);
  const manager = createManager(ctx);
  const results = await manager.unarchive([C]);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].code, 'files-missing');
  assert.deepEqual(calls.unarchive, []);
});

test('discard permanently removes one quarantine entry only after confirmation', async () => {
  const home = await makeHome([A, B]);
  const { ctx } = fakeCtx(home, [A, B]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  await manager.hide([B]);
  const removed = await manager.listRemoved();
  const target = removed.find((entry) => entry.id === A);
  await assert.rejects(() => manager.discard([{ batch: target.batch, id: A }], 'nope'), (error) => error instanceof ManagerError && error.code === 'confirm');
  const results = await manager.discard([{ batch: target.batch, id: A }], 'DISCARD');
  assert.equal(results[0].ok, true);
  assert.equal(results[0].action, 'discard');
  assert.ok(results[0].bytes > 0);
  assert.equal(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
  const left = await manager.listRemoved();
  assert.equal(left.length, 1);
  assert.equal(left[0].id, B);
});

test('discard refuses a manifest directory that escapes its batch', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  const removed = await manager.listRemoved();
  const manifestPath = join(home, 'archived-manager', 'trash', removed[0].batch, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.entries[0].dir = '../escape';
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const results = await manager.discard([{ batch: removed[0].batch, id: A }], 'DISCARD');
  assert.equal(results[0].ok, false);
  assert.equal(results[0].code, 'invalid');
});

test('settings default to off and sweep only entries older than the retention window', async () => {
  const home = await makeHome([A, B]);
  const { ctx } = fakeCtx(home, [A, B]);
  const manager = createManager(ctx);
  assert.deepEqual(await manager.readSettings(), { trashRetentionDays: 0 });
  await manager.hide([A]);
  await manager.hide([B]);
  const removed = await manager.listRemoved();
  const old = removed.find((entry) => entry.id === A);
  const manifestPath = join(home, 'archived-manager', 'trash', old.batch, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.entries[0].movedAt = Date.now() - 40 * 86400000;
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const saved = await manager.saveSettings({ trashRetentionDays: 7 });
  assert.equal(saved.settings.trashRetentionDays, 7);
  assert.equal(saved.swept.removed, 1);
  const left = await manager.listRemoved();
  assert.equal(left.length, 1);
  assert.equal(left[0].id, B);
  await assert.rejects(() => manager.saveSettings({ trashRetentionDays: 5 }), (error) => error instanceof ManagerError && error.code === 'invalid');
});

test('removing a session stops its scheduled reminders', async () => {
  const home = await makeHome([A]);
  const stopped = [];
  const schedule = {
    async list(request) { return request.sessionId === A ? [{ id: 'r1' }, { id: 'r2' }] : []; },
    async stopSessionTasks(id) { stopped.push(id); }
  };
  const { ctx } = fakeCtx(home, [A], { schedule });
  const manager = createManager(ctx);
  const results = await manager.hide([A]);
  assert.equal(results[0].reminders, 2);
  assert.deepEqual(stopped, [A]);
});

test('attachmentStats reports the shared attachment store separately', async () => {
  const home = await makeHome([]);
  const { ctx } = fakeCtx(home, []);
  const manager = createManager(ctx);
  const dir = join(home, 'attachments', 'v1', 'objects', 'ab');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, 'abc'), '0123456789');
  const stats = await manager.attachmentStats();
  assert.equal(stats.bytes, 10);
  assert.equal(stats.files, 1);
});

test('restore validates the manifest directory before touching the filesystem', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  const removed = await manager.listRemoved();
  const manifestPath = join(home, 'archived-manager', 'trash', removed[0].batch, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.entries[0].dir = '../escape';
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const results = await manager.restore([{ batch: removed[0].batch, id: A }]);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].code, 'invalid');
  assert.equal(await fs.stat(join(home, 'sessions', '--proj--', A)).catch(() => undefined), undefined);
});

test('discarding a stale manifest entry does not fail or touch a restored session', async () => {
  const home = await makeHome([A]);
  const { ctx } = fakeCtx(home, [A]);
  const manager = createManager(ctx);
  await manager.hide([A]);
  const removed = await manager.listRemoved();
  const target = join(home, 'archived-manager', 'trash', removed[0].batch, removed[0].dir);
  await fs.rm(target, { recursive: true, force: true });
  const results = await manager.discard([{ batch: removed[0].batch, id: A }], 'DISCARD');
  assert.equal(results[0].ok, true);
  assert.equal(results[0].bytes, 0);
  assert.deepEqual(await manager.listRemoved(), []);
});
