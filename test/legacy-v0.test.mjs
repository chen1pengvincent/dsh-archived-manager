import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { zstdCompressSync } from 'node:zlib';
import { createManager } from '../lib/host.js';
import { decodeLog } from '../lib/session-files.js';

const A = 'session-33333333-3333-4333-8333-333333333333';
const HEADER = { type: 'session', version: 0, id: A, createdAt: 1788013105250, cwd: '/Users/fixture/Documents/DSH /日常', delegationDepth: 0, agentPreset: 'standard' };
const frame = (text) => zstdCompressSync(text.endsWith('\n') ? text : text + '\n');
const legacyLog = (header = HEADER, rows = []) => Buffer.concat([frame(JSON.stringify(header)), ...(rows.length ? [frame(rows.map((row) => JSON.stringify(row)).join('\n'))] : [])]);

// A v0 log reserves its sequence numbers for packed delta rows: seq jumps from
// 0 to 1 (packed, covering 1..5) and on to 6, so index equality never holds.
const ROWS = [
  { type: 'session/title', seq: 0, time: 1, data: { title: 'legacy' } },
  { type: 'text-chunks', seq0: 1, time0: 2, data: { turn: 1, step: 1, index: 0, dt: [4, 5, 6], texts: ['a', 'b', 'c', 'd'] } },
  { type: 'assistant/message', seq: 5, time: 7, data: { turn: 1 } },
  { type: 'tool-call-chunks', seq0: 6, time0: 8, data: { turn: 1, step: 1, index: 0, id: 'call-1', name: 'write', args: ['x'], dt: [] } },
  { type: 'session/end', seq: 7, time: 9, data: {} },
];

async function fixture(t) {
  const home = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'am-legacy-')));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const workspace = join(home, 'project');
  await fs.mkdir(workspace);
  const state = { archived: [A], running: false };
  const dir = join(home, 'sessions', '--fixture--', A);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(join(dir, 'session.jsonl.zstd'), legacyLog(HEADER, ROWS));
  await fs.writeFile(join(dir, 'session.lock'), '');
  const services = {
    dshHomePath: () => home,
    workspaceRegistry: {
      get archivedSessionIds() { return state.archived; },
      list: () => [],
      async unarchiveSession(id) { state.archived = state.archived.filter((x) => x !== id); },
    },
    sessionPersistence: { list: async () => [{ header: { id: A, cwd: workspace } }] },
    agents: { get: () => state.running ? { status: 'running' } : undefined },
    fs: { processPathFromHostPath: (path) => path, resolve: async (path) => resolve(path), processPath: (path) => path },
    sessionController: { workspaceDesktop: () => ({ available: true }), async openWorkspacePath() { throw new Error('unused'); } },
  };
  return { home, dir, state, manager: createManager({ get: (name) => services[name] }) };
}

test('legacy v0 logs decode with packed delta rows', () => {
  const log = decodeLog(legacyLog(HEADER, ROWS), 'session.jsonl.zstd', A);
  assert.equal(log.header.version, 0);
  assert.equal(log.events.length, ROWS.length);
  assert.equal(decodeLog(legacyLog(HEADER, ROWS), 'session.v0.jsonl.zstd', A).events.length, ROWS.length);
  const plainBytes = Buffer.from([HEADER, ...ROWS].map((row) => JSON.stringify(row)).join('\n') + '\n');
  const plain = decodeLog(plainBytes, 'session.jsonl', A);
  assert.equal(plain.events.length, ROWS.length);
  assert.equal(decodeLog(plainBytes, 'session.v0.jsonl', A).header.version, 0);
});

test('legacy v0 rejects unknown shapes, regressions and unsupported generations', () => {
  const unknown = [...ROWS.slice(0, 1), { type: 'session/title', seq: 3, time: 3, data: {}, extra: true }];
  assert.throws(() => decodeLog(legacyLog(HEADER, unknown), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const unknownPacked = [...ROWS.slice(0, 1), { type: 'mystery-chunks', seq0: 1, time0: 2, data: {} }];
  assert.throws(() => decodeLog(legacyLog(HEADER, unknownPacked), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const regression = [...ROWS.slice(0, 1), { type: 'session/title', seq: 4, time: 2, data: {} }, { type: 'session/title', seq: 3, time: 3, data: {} }];
  assert.throws(() => decodeLog(legacyLog(HEADER, regression), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const backInTime = [...ROWS.slice(0, 1), { type: 'session/title', seq: 4, time: 9, data: {} }, { type: 'session/title', seq: 5, time: 8, data: {} }];
  assert.throws(() => decodeLog(legacyLog(HEADER, backInTime), 'session.jsonl.zstd', A), { code: 'protected-content' });
  assert.throws(() => decodeLog(legacyLog(HEADER, ROWS), 'session.v5.jsonl.zstd', A), { code: 'protected-content' });
  assert.throws(() => decodeLog(legacyLog(HEADER, ROWS), 'session.v1.jsonl.zstd', A), { code: 'protected-content' });
  assert.throws(() => decodeLog(legacyLog({ ...HEADER, version: 4 }, ROWS), 'session.jsonl.zstd', A), { code: 'protected-content' });
  assert.throws(() => decodeLog(legacyLog(HEADER, ROWS), 'session.jsonl.zstd', 'session-44444444-4444-4444-8444-444444444444'), { code: 'protected-content' });
});

test('legacy v0 rejects a packed row whose covered range does not line up', () => {
  const head = ROWS.slice(0, 1);
  // seq0 + texts - 1 = 4, so the next row must be seq 5.
  const overlap = [...head, ROWS[1], { type: 'assistant/message', seq: 3, time: 7, data: {} }];
  assert.throws(() => decodeLog(legacyLog(HEADER, overlap), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const gap = [...head, ROWS[1], { type: 'assistant/message', seq: 7, time: 7, data: {} }];
  assert.throws(() => decodeLog(legacyLog(HEADER, gap), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const empty = [...head, { type: 'text-chunks', seq0: 1, time0: 2, data: { turn: 1, step: 1, index: 0, dt: [], texts: [] } }];
  assert.throws(() => decodeLog(legacyLog(HEADER, empty), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const noPayload = [...head, { type: 'text-chunks', seq0: 1, time0: 2, data: { turn: 1 } }];
  assert.throws(() => decodeLog(legacyLog(HEADER, noPayload), 'session.jsonl.zstd', A), { code: 'protected-content' });
  const badDt = [...head, { type: 'text-chunks', seq0: 1, time0: 2, data: { turn: 1, step: 1, index: 0, dt: [1, 2], texts: ['a', 'b', 'c', 'd'] } }];
  assert.throws(() => decodeLog(legacyLog(HEADER, badDt), 'session.jsonl.zstd', A), { code: 'protected-content' });
});

test('purge deletes a legacy v0 session that has no isSeeded header field', async (t) => {
  const f = await fixture(t);
  const result = await f.manager.purge([A], 'PURGE');
  assert.equal(result[0].ok, true, JSON.stringify(result[0]));
  await assert.rejects(fs.stat(f.dir), { code: 'ENOENT' });
  assert.deepEqual(f.state.archived, []);
});

test('legacy v0 sessions still refuse directories with extra files', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(join(f.dir, 'notes.txt'), 'user file');
  const result = await f.manager.purge([A], 'PURGE');
  assert.equal(result[0].ok, false);
  assert.equal(result[0].code, 'protected-content');
  assert.equal(await fs.readFile(join(f.dir, 'notes.txt'), 'utf8'), 'user file');
});
