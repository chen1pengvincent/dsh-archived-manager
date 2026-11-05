/**
 * Read-only recognition of the released DSH v2–v4 JSONL container. The exact
 * header and event envelopes come from dsh-session-persistence-jsonl and the
 * released session-format codecs. Unknown generations are deliberately kept.
 * No path found in message text, arguments, or shell commands is an output.
 */
import { promises as fs, constants } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import * as zlib from 'node:zlib';
import { createHash } from 'node:crypto';

const LOG = /^session\.v([234])\.jsonl(\.zstd)?$/;
const LIMIT = 256 * 1024 * 1024;
const HEADER_KEYS = new Set(['type', 'version', 'id', 'createdAt', 'isSeeded', 'delegationDepth', 'cwd', 'parentSession', 'origin', 'agentPreset']);
const EVENT_KEYS = new Set(['type', 'seq', 'time', 'data', 'ignorable', 'sourceEventSeqs', 'surfaceOp']);
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const count = (v) => Number.isSafeInteger(v) && v >= 0;
const sameId = (a, b) => a.replace(/^session-/, '') === b.replace(/^session-/, '');
const identity = (s) => [s.dev, s.ino, s.size, s.mtimeMs, s.ctimeMs, s.mode, s.nlink].join(':');

export function protectedContent(detail = '') {
  const error = new Error('含非会话文件或无法确认的内容，未处理' + (detail ? '：' + detail : ''));
  error.code = 'protected-content';
  return error;
}

/** Reject symlinks at every component, including a replaced root or parent. */
export async function assertDirectory(root, directory) {
  const base = resolve(root), target = resolve(directory), suffix = relative(base, target);
  if (suffix === '..' || suffix.startsWith('..' + sep) || isAbsolute(suffix)) throw protectedContent('路径超出范围');
  const rootStat = await fs.lstat(base);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw protectedContent('目录含链接或异常路径');
  const parts = suffix.split(sep).filter(Boolean);
  let current = base;
  for (const part of parts) {
    current = resolve(current, part);
    const stat = await fs.lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw protectedContent('目录含链接或异常路径');
  }
  return fs.lstat(target);
}

export async function readRegularFile(path, maxBytes = LIMIT, expectedLinks = 1) {
  const before = await fs.lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== expectedLinks || before.size > maxBytes) throw protectedContent(basename(path));
  const handle = await fs.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const opened = await handle.stat();
    if (identity(opened) !== identity(before)) throw protectedContent('读取期间文件发生变化');
    const bytes = await handle.readFile();
    if (identity(await handle.stat()) !== identity(before) || identity(await fs.lstat(path)) !== identity(before)) throw protectedContent('读取期间文件发生变化');
    return { bytes, fingerprint: identity(before), size: before.size, dev: before.dev, ino: before.ino, digest: createHash('sha256').update(bytes).digest('hex') };
  } finally { await handle.close(); }
}

/**
 * DSH appends complete standard Zstandard frames: an independently compressed
 * header, followed by event batches. Locate those boundaries before decoding;
 * a generic concatenated-stream decoder alone loses the header-frame contract.
 * This follows the host's scanZstdFrames layout, refusing torn tails instead of
 * attempting its write-time recovery because cleanup must preserve uncertainty.
 */
function zstdFrames(bytes) {
  const frames = [];
  let offset = 0;
  const requireBytes = (length) => {
    if (bytes.length - offset < length) throw protectedContent('日志压缩帧不完整');
  };
  while (offset < bytes.length) {
    const start = offset;
    requireBytes(5);
    if (bytes.readUInt32LE(offset) !== 0xFD2FB528) throw protectedContent('日志包含非宿主压缩帧');
    offset += 4;
    const descriptor = bytes[offset++];
    if ((descriptor & 0x18) !== 0) throw protectedContent('日志压缩帧头无效');
    const singleSegment = (descriptor & 0x20) !== 0;
    const checksum = (descriptor & 4) !== 0;
    const contentSizeFlag = descriptor >>> 6;
    const dictionaryFlag = descriptor & 3;
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
    const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
    const headerBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
    requireBytes(headerBytes);
    offset += headerBytes;
    for (;;) {
      requireBytes(3);
      const block = bytes.readUIntLE(offset, 3);
      offset += 3;
      const type = (block >>> 1) & 3;
      if (type === 3) throw protectedContent('日志压缩块类型无效');
      const size = type === 1 ? 1 : block >>> 3;
      requireBytes(size);
      offset += size;
      if (block & 1) break;
    }
    if (checksum) { requireBytes(4); offset += 4; }
    frames.push({ start, end: offset });
  }
  if (frames.length === 0) throw protectedContent('没有完整的日志头帧');
  return frames;
}

export function decodeLog(bytes, filename, expectedId) {
  const match = LOG.exec(filename);
  if (!match) throw protectedContent('不支持的会话日志格式');
  if (match[2]) {
    if (typeof zlib.zstdDecompressSync !== 'function') throw protectedContent('宿主不支持 Zstandard 解码');
    const frames = zstdFrames(bytes);
    try {
      const decoded = [];
      let total = 0;
      for (const [index, frame] of frames.entries()) {
        // Public one-shot decoders may stop at the first frame. Decode each
        // known boundary explicitly so cold logs retain later event batches.
        const chunk = zlib.zstdDecompressSync(bytes.subarray(frame.start, frame.end), { maxOutputLength: Math.max(1, LIMIT - total) });
        if (index === 0 && (chunk.length === 0 || chunk.indexOf(10) !== chunk.length - 1)) throw protectedContent('第一压缩帧必须只包含一行会话头');
        total += chunk.length;
        if (total > LIMIT) throw protectedContent('解码后的日志过大');
        decoded.push(chunk);
      }
      bytes = Buffer.concat(decoded, total);
    }
    catch (error) { if (error.code === 'protected-content') throw error; throw protectedContent('日志压缩数据无法确认'); }
  }
  if (bytes.length > LIMIT || bytes.length === 0 || bytes[bytes.length - 1] !== 10) throw protectedContent('日志不完整或过大');
  let rows;
  try { rows = new TextDecoder('utf-8', { fatal: true }).decode(bytes).trimEnd().split('\n').map((line) => JSON.parse(line)); }
  catch { throw protectedContent('日志不是完整 JSONL'); }
  const header = rows.shift();
  if (!object(header) || Object.keys(header).some((key) => !HEADER_KEYS.has(key)) || header.type !== 'session'
    || header.version !== Number(match[1]) || typeof header.id !== 'string' || !sameId(header.id, expectedId)
    || !count(header.createdAt) || !count(header.delegationDepth) || typeof header.isSeeded !== 'boolean'
    || (header.cwd !== undefined && (typeof header.cwd !== 'string' || !isAbsolute(header.cwd)))
    || (header.parentSession !== undefined && typeof header.parentSession !== 'string')
    || (header.agentPreset !== undefined && typeof header.agentPreset !== 'string')
    || (header.origin !== undefined && header.origin !== 'subagent')) throw protectedContent('会话头与目标不符');
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!object(row) || Object.keys(row).some((key) => !EVENT_KEYS.has(key)) || row.seq !== index
      || !Number.isSafeInteger(row.time) || typeof row.type !== 'string' || !/^[^\s/]+\/[^\s]+$/.test(row.type)
      || !Object.hasOwn(row, 'data') || (row.ignorable !== undefined && row.ignorable !== true)
      || (row.sourceEventSeqs !== undefined && !Array.isArray(row.sourceEventSeqs))
      || (row.surfaceOp !== undefined && row.surfaceOp !== 'append' && !object(row.surfaceOp))) throw protectedContent('存在无法确认的日志记录');
  }
  if (header.isSeeded && !rows.some((row) => row.type === 'session/end-seed' && row.data?.inherited === true)) throw protectedContent('会话继承记录不完整');
  return { header, events: rows };
}

export async function inspectSession(root, directory, id, { allowUnknown = false } = {}) {
  const dirStat = await assertDirectory(root, directory);
  const names = (await fs.readdir(directory)).sort();
  const files = [], logs = [];
  let warning;
  for (const name of names) {
    if (!LOG.test(name) && name !== 'session.lock') {
      if (allowUnknown) { warning = '存在未读取的非会话文件或不支持的日志格式'; continue; }
      throw protectedContent(name);
    }
    const path = resolve(directory, name);
    const file = await readRegularFile(path);
    if (name === 'session.lock') {
      if (file.size !== 0) throw protectedContent('锁文件内容无法确认');
    } else {
      const log = decodeLog(file.bytes, name, id);
      logs.push({ ...log, name });
    }
    files.push({ name, fingerprint: file.fingerprint, size: file.size, dev: file.dev, ino: file.ino, digest: file.digest });
  }
  if (!logs.length) throw protectedContent('没有可确认的会话日志');
  if (new Set(logs.map((log) => log.header.version)).size !== logs.length) throw protectedContent('同一日志版本存在多个编码，无法确认当前日志');
  const inspection = { root, directory, id, dev: dirStat.dev, ino: dirStat.ino, files, logs, warning };
  await verifyInspection(inspection, { allowUnknown });
  return inspection;
}

export async function verifyInspection(inspection, { allowUnknown = false, names = inspection.files.map((f) => f.name) } = {}) {
  const stat = await assertDirectory(inspection.root, inspection.directory);
  if (stat.dev !== inspection.dev || stat.ino !== inspection.ino) throw protectedContent('操作期间目录发生变化');
  const current = (await fs.readdir(inspection.directory)).sort();
  if (!allowUnknown && current.join('\0') !== [...names].sort().join('\0')) throw protectedContent('操作期间目录内容发生变化');
  for (const file of inspection.files.filter((file) => names.includes(file.name))) {
    const value = await fs.lstat(resolve(inspection.directory, file.name));
    if (identity(value) !== file.fingerprint) throw protectedContent('操作期间文件发生变化');
  }
}

/** No recursive deletion: unexpected/new files always prevent directory removal. */
export async function deleteSession(inspection) {
  const remaining = inspection.files.map((file) => file.name);
  await verifyInspection(inspection);
  for (const file of inspection.files) {
    await verifyInspection(inspection, { names: remaining });
    await fs.unlink(resolve(inspection.directory, file.name));
    remaining.splice(remaining.indexOf(file.name), 1);
  }
  await verifyInspection(inspection, { names: [] });
  await fs.rmdir(inspection.directory);
}

/** Move only recognized files. A concurrent extra file is never moved along. */
export async function moveSession(inspection, destinationRoot, destination) {
  await verifyInspection(inspection);
  await assertDirectory(destinationRoot, dirname(destination));
  await fs.mkdir(destination); // exclusive: never overwrite an existing directory
  const destinationIdentity = await fs.lstat(destination);
  const remaining = inspection.files.map((file) => file.name), moved = [];
  try {
    for (const file of inspection.files) {
      await verifyInspection(inspection, { names: remaining });
      await assertDirectory(destinationRoot, destination);
      // link/unlink refuses a concurrently created destination, unlike rename.
      await fs.link(resolve(inspection.directory, file.name), resolve(destination, file.name));
      moved.push(file);
      await fs.unlink(resolve(inspection.directory, file.name));
      remaining.splice(remaining.indexOf(file.name), 1);
    }
    await verifyInspection(inspection, { names: [] });
    await fs.rmdir(inspection.directory);
  } catch (error) {
    // Best-effort rollback only our known files, never overwrite user additions.
    let rollbackBlocked = false;
    for (const file of moved.reverse()) {
      try {
        const sourceDirectory = await assertDirectory(inspection.root, inspection.directory);
        const targetDirectory = await assertDirectory(destinationRoot, destination);
        if (sourceDirectory.dev !== inspection.dev || sourceDirectory.ino !== inspection.ino
          || targetDirectory.dev !== destinationIdentity.dev || targetDirectory.ino !== destinationIdentity.ino) throw protectedContent('回滚期间目录发生变化');
        const source = resolve(inspection.directory, file.name), target = resolve(destination, file.name);
        const sourceStat = await fs.lstat(source).catch(() => undefined), targetStat = await fs.lstat(target).catch(() => undefined);
        if (!targetStat || targetStat.dev !== file.dev || targetStat.ino !== file.ino) throw protectedContent('回滚目标已被替换');
        if (sourceStat && (sourceStat.dev !== file.dev || sourceStat.ino !== file.ino)) throw protectedContent('原位置已被其他文件占用');
        const current = await readRegularFile(target, LIMIT, sourceStat ? 2 : 1);
        if (current.dev !== file.dev || current.ino !== file.ino || current.digest !== file.digest) throw protectedContent('回滚目标内容已变化');
        if (!sourceStat) await fs.link(target, source);
        await fs.unlink(target);
      } catch { rollbackBlocked = true; /* retain both locations; the manifest remains */ }
    }
    try {
      const current = await assertDirectory(destinationRoot, destination);
      if (current.dev === destinationIdentity.dev && current.ino === destinationIdentity.ino) await fs.rmdir(destination);
      else rollbackBlocked = true;
    } catch { /* retained recovery files or independently added contents */ }
    if (rollbackBlocked) throw protectedContent('移动未完成且回滚目标发生变化，已保留原位置和隔离位置');
    throw error;
  }
}

export function recordedFiles(events) {
  const calls = new Map(), found = new Map();
  const add = (path, source) => {
    if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) return;
    const previous = found.get(path);
    if (previous) { if (!previous.sources.includes(source)) previous.sources.push(source); }
    else found.set(path, { path, name: basename(path), directory: dirname(path), sources: [source] });
  };
  for (const event of events) {
    const data = event.data;
    if (!object(data)) continue;
    if (event.type === 'tool/call' && (data.name === 'write' || data.name === 'edit') && typeof data.callId === 'string') calls.set(String(data.turn) + ':' + data.callId, data.name);
    if (event.type === 'tool/result' && event.surfaceOp === 'append' && object(data.message)) {
      const key = String(data.turn) + ':' + data.message.source?.callId;
      const tool = calls.get(key);
      calls.delete(key);
      if (tool && data.message.isError !== true) add(data.meta?.path, tool);
    }
    if (event.type === 'deliverables/presented' && Array.isArray(data.files)) for (const file of data.files) add(file?.path, 'presented');
  }
  return [...found.values()];
}
