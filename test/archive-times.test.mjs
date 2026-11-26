import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { createManager } from '../lib/host.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

async function fixture(t, initial, { events = true } = {}) {
  const home = await fs.mkdtemp(join(tmpdir(), 'am-archive-observer-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  let ids = initial;
  let listener, dispose;
  const registry = {
    get archivedSessionIds() { return ids; },
    list() { return []; },
    async unarchiveSession(id) { commit(ids.filter((entry) => entry !== id)); },
  };
  const ctx = {
    get(name) {
      if (name === 'dshHomePath') return home;
      if (name === 'workspaceRegistry') return registry;
    },
    effect(callback, label) {
      if (label === 'archived-manager: archive-time sync') dispose = callback();
    },
  };
  if (events) {
    ctx.on = (name, callback) => {
      assert.equal(name, 'domain/changed');
      listener = callback;
      return () => { listener = undefined; };
    };
  }
  function commit(next, beforeRegistryUpdate) {
    // The Host domain notifies before workspaceRegistry updates its own cached state.
    listener?.({ domain: 'workspace', table: '', operation: 'put', value: { archivedSessionIds: next } });
    const duringCommit = beforeRegistryUpdate?.();
    ids = next;
    return duringCommit;
  }
  const manager = createManager(ctx);
  t.after(() => dispose?.());
  return { manager, commit, replaceSilently: (next) => { ids = next; }, publish: (change) => listener?.(change), dispose: () => dispose?.() };
}

test('committed workspace changes preserve rapid undo/rearchive order with no idle archive polling', async (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const intervals = t.mock.method(globalThis, 'setInterval');
  const { manager, commit, replaceSilently, publish, dispose } = await fixture(t, [A]);
  assert.deepEqual(await manager.syncArchiveTimes(), { [A]: null });
  assert.equal(intervals.mock.callCount(), 0);

  now = 2000;
  const duringCommit = commit([A, B], () => manager.syncArchiveTimes());
  assert.deepEqual(await duringCommit, { [A]: null, [B]: 2000 });
  now = 3000;
  commit([A]);
  now = 4000;
  commit([A, B]);
  publish({ domain: 'other', table: '', operation: 'put', value: { archivedSessionIds: [] } });
  publish({ domain: 'workspace', table: 'workspaces', operation: 'put', value: { archivedSessionIds: [] } });
  assert.deepEqual(await manager.syncArchiveTimes(), { [A]: null, [B]: 4000 });

  // A second profile/process may store a known date between list requests.
  await fs.writeFile(manager.archiveTimesPath, JSON.stringify({ version: 2, initialized: true, times: { [A]: 500, [B]: 4000 } }));
  assert.deepEqual(await manager.syncArchiveTimes(), { [A]: 500, [B]: 4000 });
  replaceSilently([B]);
  assert.deepEqual(await manager.syncArchiveTimes(), { [B]: 4000 });
  dispose();
  publish({ domain: 'workspace', table: '', operation: 'put', value: { archivedSessionIds: [] } });
  assert.deepEqual(await manager.syncArchiveTimes(), { [B]: 4000 });
});

test('a read or write failure keeps original observation times across subsequent refreshes', async (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const { manager, commit } = await fixture(t, [A]);
  await manager.syncArchiveTimes();
  const originalRead = fs.readFile;
  let failRead = true;
  t.mock.method(fs, 'readFile', function (path, ...args) {
    if (path === manager.archiveTimesPath && failRead) {
      failRead = false;
      throw Object.assign(new Error('read unavailable'), { code: 'EACCES' });
    }
    return originalRead.call(this, path, ...args);
  });
  const originalRename = fs.rename;
  let failWrite = true;
  t.mock.method(fs, 'rename', function (path, dest) {
    if (dest === manager.archiveTimesPath && failWrite) {
      failWrite = false;
      throw new Error('write unavailable');
    }
    return originalRename.call(this, path, dest);
  });
  now = 2000;
  commit([A, B]);
  now = 3000;
  assert.deepEqual(await manager.syncArchiveTimes(), {});
  assert.deepEqual(JSON.parse(await fs.readFile(manager.archiveTimesPath)).times, { [A]: null });
  now = 4000;
  assert.deepEqual(await manager.syncArchiveTimes(), { [A]: null, [B]: 2000 });
});

test('a host without domain notifications still observes the registry and waits for a valid archive set', async (t) => {
  const intervals = t.mock.method(globalThis, 'setInterval');
  const { manager, commit } = await fixture(t, undefined, { events: false });
  assert.deepEqual(await manager.syncArchiveTimes(), {});
  await assert.rejects(fs.access(manager.archiveTimesPath), { code: 'ENOENT' });
  assert.equal(intervals.mock.callCount(), 1);
  const [tick, interval] = intervals.mock.calls[0].arguments;
  assert.equal(interval, 30_000);
  commit([A]);
  tick();
  assert.deepEqual(await manager.syncArchiveTimes(), { [A]: null });
  commit([]);
  tick();
  commit([A]);
  assert.equal(typeof (await manager.syncArchiveTimes())[A], 'number');
});

test('a reloaded plugin waits for the old ledger write before recording newer archive dates', async (t) => {
  const { observeArchiveTimes } = await import('../lib/archive-times.js');
  const reloaded = await import('../lib/archive-times.js?reloaded');
  const ledgerPath = join(tmpdir(), 'archive-time-reload-' + process.pid);
  const entered = Promise.withResolvers(), release = Promise.withResolvers();
  t.after(() => release.resolve());
  let now = 1000, ids = [A], disk = { version: 2, initialized: true, times: { [A]: 123 } };
  t.mock.method(Date, 'now', () => now);
  function attach(observe, read, write) {
    let listener, dispose;
    const scope = { effect(fn) { dispose = fn(); }, on(_event, fn) { listener = fn; return () => { listener = undefined; }; } };
    const sync = observe(scope, { ledgerPath, archivedSet: () => new Set(ids), read, write });
    return { sync, dispose, commit(next) {
      ids = next;
      listener({ domain: 'workspace', table: '', operation: 'put', value: { archivedSessionIds: next } });
    } };
  }
  const old = attach(observeArchiveTimes, () => JSON.stringify(disk), async (record) => {
    entered.resolve();
    await release.promise;
    disk = record;
  });
  await old.sync();
  now = 2000;
  old.commit([A, B]);
  await entered.promise;
  old.dispose();

  const read = t.mock.fn(() => JSON.stringify(disk));
  const fresh = attach(reloaded.observeArchiveTimes, read, (record) => { disk = record; });
  const C = '33333333-3333-4333-8333-333333333333';
  now = 3000;
  fresh.commit([A, B, C]);
  const flushed = fresh.sync();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(read.mock.callCount(), 0);
  now = 5000;
  release.resolve();
  await flushed;
  assert.deepEqual(disk.times, { [A]: 123, [B]: 2000, [C]: 3000 });
  assert.equal(globalThis[Symbol.for('dsh-archived-manager.archive-time-queues.v1')].has(ledgerPath), false);
  fresh.dispose();
});

test('damaged ledgers are preserved byte for byte before recording new archives', async (t) => {
  for (const damage of [Buffer.from([0x7b, 0x01, 0xff]), Buffer.from('{"version":2,"times":[]}')]) {
    await t.test(damage.length === 3 ? 'malformed JSON' : 'invalid known format', async (t) => {
      let now = 1000;
      t.mock.method(Date, 'now', () => now);
      const { manager, commit } = await fixture(t, [A]);
      await manager.syncArchiveTimes();
      await fs.writeFile(manager.archiveTimesPath, damage);
      assert.deepEqual(await manager.syncArchiveTimes(), { [A]: null });
      const directory = dirname(manager.archiveTimesPath);
      const backups = (await fs.readdir(directory)).filter((file) => file.startsWith('archive-times.json.corrupt-'));
      assert.equal(backups.length, 1);
      assert.deepEqual(await fs.readFile(join(directory, backups[0])), damage);
      now = 2000;
      commit([A, B]);
      now = 5000;
      assert.deepEqual(await manager.syncArchiveTimes(), { [A]: null, [B]: 2000 });
    });
  }
});

test('newer ledger formats survive refreshes and do not schedule endless retries', async (t) => {
  const { manager, commit } = await fixture(t, []);
  await manager.syncArchiveTimes();
  const timers = t.mock.method(globalThis, 'setTimeout');
  const future = JSON.stringify({ version: 3, times: { [A]: 123 }, futureField: 'preserve' });
  await fs.writeFile(manager.archiveTimesPath, future);
  commit([A]);
  assert.deepEqual(await manager.syncArchiveTimes(), {});
  assert.equal(await fs.readFile(manager.archiveTimesPath, 'utf8'), future);
  assert.equal(timers.mock.callCount(), 0);
  assert.deepEqual(await fs.readdir(dirname(manager.archiveTimesPath)), ['archive-times.json']);
});
