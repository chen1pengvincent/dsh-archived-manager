/**
 * Coordinates the native workspace registry, verified session files and the
 * quarantine manifest. The browser supplies session IDs or batch/ID pairs.
 * A registry action can restore a session to the sidebar without moving files.
 * Moving or deleting logs requires fresh file and occupancy checks. Manifests
 * record intermediate steps so a partial operation can be repaired.
 */
import { promises as fs, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createUpdater } from './update.js';
import { UpdateError } from './update-release.js';
import { observeArchiveTimes } from './archive-times.js';
import { createSessionOccupancy } from './occupancy.js';
import { assertDirectory, readRegularFile, inspectSession, lightSessionStats, verifyInspection, deleteSession, moveSession, protectedContent } from './session-files.js';

const ID_RE = /^(?:session-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BATCH_RE = /^[0-9A-Za-z:._-]{1,80}$/;
const MAX_IDS = 200;
const MAX_BODY_BYTES = 64 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = new Set([0, 7, 30, 90]);
const PREVIEW_ACTIONS = new Set(['hide', 'purge', 'restore', 'discard', 'empty', 'retention']);
const PREVIEW_TTL = 5 * 60 * 1000;
const MAX_PREVIEWS = 8;
const COLD_TITLE_BUDGET = 2 * 1024 * 1024;
const MAX_COLD_TITLE_LOG = 256 * 1024;
const PACKAGE_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const PENDING_MAX = 500;
const RESTART_REASON = '会话仍由当前 DSH 进程加载，需完全退出并重新打开 DSH 后才能彻底删除';
const PENDING_TITLE_MAX = 300;
const PENDING_REASON_MAX = 500;
const execFileAsync = promisify(execFile);

/** A refusal that maps to a specific HTTP status. */
export class ManagerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ManagerError';
    this.code = code;
  }
}

/** Read a service without throwing when the fiber cannot inject it. */
function service(ctx, name) {
  try {
    return ctx.get(name);
  } catch {
    return undefined;
  }
}

/** Resolve the harness home, preferring the dsh-app-boot provider. */
export function resolveHome(ctx) {
  try {
    const provided = service(ctx, 'dshHomePath');
    const value = typeof provided === 'function' ? provided() : provided;
    if (typeof value === 'string' && value.trim() !== '') return resolve(value);
  } catch {
    /* fall through */
  }
  return join(homedir(), '.dsh');
}

function assertId(value) {
  if (typeof value !== 'string' || !ID_RE.test(value)) throw new ManagerError('invalid', 'invalid session id');
  return value;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
}

async function dirStats(directory) {
  let total = 0;
  let files = 0;
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isSymbolicLink()) continue; // never follow links out of the tree
      else {
        try {
          total += (await fs.lstat(path)).size;
          files += 1;
        } catch {
          /* removed mid-walk */
        }
      }
    }
  }
  return { bytes: total, files };
}

async function writeJsonAtomic(path, value) {
  const temporary = path + '.tmp-' + randomUUID();
  try {
    await fs.writeFile(temporary, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, path);
  } finally { await fs.unlink(temporary).catch(() => {}); }
}

/** Create the manager bound to one host context. */
export function createManager(ctx, options = {}) {
  const configuredHome = resolveHome(ctx);
  // Resolve the explicitly selected home once (macOS /var itself is a link).
  // Links introduced inside that trusted boundary are always refused.
  let home;
  try { home = realpathSync(configuredHome); } catch { home = configuredHome; }
  const sessionsRoot = join(home, 'sessions');
  const trashRoot = join(home, 'archived-manager', 'trash');
  const projcacheRoot = join(home, 'storages', 'session_projcache', 'sessions');
  const archiveTimesPath = join(home, 'archived-manager', 'archive-times.json');
  const settingsPath = join(home, 'archived-manager', 'settings.json');
  const pendingPath = join(home, 'archived-manager', 'pending-purges.json');
  let pendingTail = Promise.resolve();
  let pendingNotice;
  const withPendingLock = (run) => {
    const next = pendingTail.then(run, run);
    pendingTail = next.then(() => {}, () => {});
    return next;
  };
  let tail = Promise.resolve();
  let updatePending = false;
  const previews = new Map();
  const occupancy = createSessionOccupancy(ctx, { lockFile: options.lockFile });
  let attachmentCache, attachmentScan;

  /** Serialize mutating operations; reads stay concurrent. */
  function serial(fn) {
    if (updatePending || options.isUpdating?.()) return Promise.reject(new ManagerError('updating', '插件更新期间暂不可修改会话数据'));
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** Reserve the mutation queue before an updater can uninstall this plugin. */
  function enterUpdate(fn) {
    if (updatePending) return Promise.reject(new ManagerError('updating', '插件正在更新'));
    updatePending = true;
    const run = tail.then(fn, fn);
    tail = run.then(() => undefined, () => undefined);
    return run.finally(() => { updatePending = false; });
  }

  /** The archive set, or undefined while the registry service is not ready. */
  function archivedSet() {
    const registry = service(ctx, 'workspaceRegistry');
    try {
      const ids = registry?.archivedSessionIds;
      return Array.isArray(ids) ? new Set(ids) : undefined;
    } catch {
      return undefined; // The service exists but has not finished opening its domain.
    }
  }

  function archived() {
    return archivedSet() ?? new Set();
  }

  /** name -> absolute directory under sessions/. */
  async function sessionDirs() {
    const map = new Map();
    let projects;
    try {
      await assertDirectory(home, sessionsRoot);
      projects = await fs.readdir(sessionsRoot, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return map;
      throw error;
    }
    for (const project of projects) {
      if (!project.isDirectory() && !project.isSymbolicLink()) continue;
      const projectPath = join(sessionsRoot, project.name);
      let entries;
      try {
        await assertDirectory(home, projectPath);
        entries = await fs.readdir(projectPath, { withFileTypes: true });
      } catch (error) {
        // An unreadable project may contain the requested id. Never call it
        // missing and clear its registry record on incomplete enumeration.
        throw error;
      }
      for (const entry of entries) {
        if (map.has(entry.name)) map.set(entry.name, null);
        else map.set(entry.name, join(projectPath, entry.name));
      }
    }
    return map;
  }

  async function physicalRoot() {
    return await fs.realpath(sessionsRoot).catch(() => resolve(sessionsRoot));
  }

  async function locate(id, dirs) {
    const map = dirs || (await sessionDirs());
    const candidates = [id];
    if (id.startsWith('session-')) candidates.push(id.slice('session-'.length));
    else candidates.push('session-' + id);
    if (candidates.filter((candidate) => map.has(candidate)).length > 1) throw protectedContent('存在重复会话目录');
    for (const candidate of candidates) {
      const found = map.get(candidate);
      if (found !== undefined) {
        if (found === null) throw protectedContent('存在重复会话目录');
        await assertDirectory(home, found);
        return found;
      }
    }
    return undefined;
  }

  /** Title and last user prompt time from the projection cache. */
  async function metadataOf(id) {
    const bare = id.startsWith('session-') ? id.slice('session-'.length) : id;
    const result = {};
    for (const candidate of bare === id ? [id] : [bare, id]) {
      try {
        const parsed = JSON.parse(await fs.readFile(join(projcacheRoot, candidate + '.json'), 'utf8'));
        const rows = parsed && parsed.record && parsed.record.rows ? parsed.record.rows : {};
        const title = rows.title ? rows.title.val : undefined;
        const lastPromptAt = rows.sessionListMetadata && rows.sessionListMetadata.val
          ? rows.sessionListMetadata.val.lastPromptAt
          : undefined;
        if (result.title === undefined && typeof title === 'string' && title.trim() !== '') result.title = title;
        if (result.lastPromptAt === undefined && typeof lastPromptAt === 'number' && isFinite(lastPromptAt)) {
          result.lastPromptAt = lastPromptAt;
        }
        if (result.title !== undefined && result.lastPromptAt !== undefined) return result;
      } catch {
        /* next candidate */
      }
    }
    return result;
  }

  function createWorkspaceLookup() {
    let byPath;
    const key = (path) => path.replace(/[\\/]+$/, '');
    return (cwd) => {
      if (typeof cwd !== 'string') return undefined;
      if (!byPath) {
        const registry = service(ctx, 'workspaceRegistry');
        const entries = new Map();
        for (const entity of typeof registry?.list === 'function' ? registry.list() : []) {
          if (typeof entity?.path !== 'string') continue;
          const path = key(entity.path);
          if (!entries.has(path)) entries.set(path, { id: entity.id, title: entity.title, path: entity.path });
        }
        byPath = entries;
      }
      return byPath.get(key(cwd)) ?? { id: undefined, title: basename(cwd) || cwd, path: cwd };
    };
  }

  async function snapshots() {
    const persistence = service(ctx, 'sessionPersistence');
    if (!persistence || typeof persistence.list !== 'function') return new Map();
    try {
      const list = await persistence.list();
      return new Map(list.map((snapshot) => [snapshot.header.id, snapshot]));
    } catch {
      return new Map();
    }
  }

  const syncArchiveTimes = observeArchiveTimes(ctx, {
    archivedSet,
    read: async () => JSON.parse(await fs.readFile(archiveTimesPath, 'utf8')),
    async write(record) {
      await fs.mkdir(dirname(archiveTimesPath), { recursive: true });
      await assertDirectory(home, dirname(archiveTimesPath));
      await writeJsonAtomic(archiveTimesPath, record);
    },
  });

  /** Best-effort re-attach after a restore, so the session returns to its workspace. */
  async function reattach(id, workspacePath) {
    const registry = service(ctx, 'workspaceRegistry');
    if (typeof workspacePath !== 'string') return { attached: false, warning: '会话已恢复到原位置；没有原工作区记录，请在侧栏检查未分组会话。' };
    if (!registry || typeof registry.list !== 'function') return { attached: false, warning: '会话已恢复到原位置；工作区服务不可用，尚未重新关联原工作区。' };
    try {
      const entity = typeof registry.resolveByPath === 'function'
        ? await registry.resolveByPath(workspacePath)
        : registry.list().find((item) => item?.path === workspacePath);
      if (typeof entity?.attachSession === 'function') {
        await entity.attachSession(id);
        if (Array.isArray(entity.sessionIds) && !entity.sessionIds.includes(id)) throw new Error('workspace membership was not restored');
        return { attached: true };
      }
    } catch {
      return { attached: false, warning: '会话已恢复到原位置；重新关联原工作区失败，请在侧栏检查未分组会话。' };
    }
    return { attached: false, warning: '会话已恢复到原位置；原工作区已不存在，请在侧栏检查未分组会话。' };
  }

  async function clearRegistry(id) {
    const registry = service(ctx, 'workspaceRegistry');
    if (typeof registry?.list !== 'function' || typeof registry.unarchiveSession !== 'function') {
      throw new ManagerError('registry-pending', '会话登记服务暂不可用');
    }
    // Keep the host admission gate in place until the workspace slots are gone.
    for (const entity of registry.list()) {
      if (!entity?.sessionIds?.includes(id)) continue;
      if (typeof entity.detachSession !== 'function') throw new ManagerError('registry-pending', '无法解除会话的工作区登记');
      await entity.detachSession(id);
    }
    if (registry.list().some((entity) => entity?.sessionIds?.includes(id))) {
      throw new ManagerError('registry-pending', '工作区登记尚未清除');
    }
    if (archivedSet()?.has(id)) await registry.unarchiveSession(id);
    const remaining = archivedSet();
    if (remaining === undefined || remaining.has(id)) throw new ManagerError('registry-pending', '归档登记尚未清除');
  }

  function agentOf(id) {
    const agents = service(ctx, 'agents');
    if (!agents || typeof agents.get !== 'function') return undefined;
    const candidates = id.startsWith('session-') ? [id, id.slice('session-'.length)] : [id, 'session-' + id];
    for (const candidate of candidates) {
      const agent = agents.get(candidate);
      if (agent) return agent;
    }
    return undefined;
  }

  async function runningAgent(id) {
    const agent = agentOf(id);
    return agent && agent.status === 'running' ? agent : undefined;
  }

  async function residentSession(id) {
    const sessions = service(ctx, 'sessions');
    return Boolean(sessions && typeof sessions.get === 'function' && sessions.get(id));
  }

  /** Total size/count of the content-addressed attachment store (shared by sessions). */
  async function attachmentStats() {
    if (attachmentCache && Date.now() - attachmentCache.at < 60_000) return attachmentCache.value;
    return attachmentScan ??= dirStats(join(home, 'attachments')).then((value) => {
      attachmentCache = { at: Date.now(), value };
      return value;
    }).finally(() => { attachmentScan = undefined; });
  }

  async function readSettings() {
    try {
      const parsed = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
      const days = parsed && Number(parsed.trashRetentionDays);
      if (Number.isInteger(days) && RETENTION_DAYS.has(days)) return { trashRetentionDays: days };
    } catch {
      /* first run or a corrupt optional setting */
    }
    return { trashRetentionDays: 0 };
  }

  /**
   * Pending permanent deletions are deliberately minimal: enough to find the
   * Session again and explain why it is still here, never conversation text.
   * They survive DSH restarts until the deletion succeeds or the user clears
   * them.
   */
  function pendingKey(entry) {
    return entry.scope === 'removed' ? `removed:${entry.batch}:${entry.id}` : `archived:${entry.id}`;
  }

  function sanitizePending(value) {
    if (!value || typeof value !== 'object') return undefined;
    let id;
    try { id = assertId(value.id); } catch { return undefined; }
    const scope = value.scope === 'removed' ? 'removed' : 'archived';
    let batch;
    if (scope === 'removed') {
      if (typeof value.batch !== 'string' || !BATCH_RE.test(value.batch)) return undefined;
      batch = value.batch;
    }
    const title = typeof value.title === 'string' && value.title.trim()
      ? value.title.trim().slice(0, PENDING_TITLE_MAX)
      : id;
    const at = Number.isFinite(value.at) ? value.at : Date.now();
    const lastCode = typeof value.lastCode === 'string' ? value.lastCode.slice(0, 64) : undefined;
    const lastReason = typeof value.lastReason === 'string' ? value.lastReason.slice(0, PENDING_REASON_MAX) : undefined;
    return { id, scope, ...(batch ? { batch } : {}), title, at, ...(lastCode ? { lastCode } : {}), ...(lastReason ? { lastReason } : {}) };
  }

  async function quarantinePending(error) {
    const destination = `${pendingPath}.corrupt-${Date.now()}`;
    try { await fs.rename(pendingPath, destination); } catch (renameError) {
      if (renameError.code !== 'ENOENT') throw renameError;
    }
    pendingNotice = `待删记录文件无法解析（${error.message}），已另存为 ${destination}`;
  }

  async function readPendingEntries() {
    let parsed;
    try {
      parsed = JSON.parse(await fs.readFile(pendingPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      await quarantinePending(error).catch(() => {});
      return [];
    }
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      await quarantinePending(new Error('unexpected pending file schema')).catch(() => {});
      return [];
    }
    const seen = new Set();
    const entries = [];
    for (const value of parsed.entries) {
      const entry = sanitizePending(value);
      if (!entry) continue;
      const key = pendingKey(entry);
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
    if (entries.length > PENDING_MAX) pendingNotice = `待删记录超过 ${PENDING_MAX} 条，较早的记录已省略；请先完成或手动清除一部分`;
    return entries.slice(-PENDING_MAX);
  }

  async function writePendingEntries(entries) {
    if (entries.length === 0) {
      await fs.unlink(pendingPath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
      pendingNotice = undefined;
      return;
    }
    await fs.mkdir(dirname(pendingPath), { recursive: true, mode: 0o700 });
    await assertDirectory(home, dirname(pendingPath));
    await writeJsonAtomic(pendingPath, { version: 1, entries });
    pendingNotice = undefined;
  }

  async function addPendingEntries(items, reason = {}) {
    if (!Array.isArray(items)) throw new ManagerError('invalid', 'items required');
    return withPendingLock(() => addPendingEntriesUnlocked(items, reason));
  }

  async function addPendingEntriesUnlocked(items, reason) {
    const current = await readPendingEntries();
    const byKey = new Map(current.map((entry) => [pendingKey(entry), entry]));
    const now = Date.now();
    for (const item of items || []) {
      const candidate = sanitizePending({
        ...item,
        at: now,
        lastCode: item?.lastCode ?? reason.code,
        lastReason: item?.lastReason ?? reason.message,
      });
      if (!candidate) continue;
      const key = pendingKey(candidate);
      const existing = byKey.get(key);
      byKey.set(key, existing ? {
        ...existing,
        title: candidate.title || existing.title,
        ...(candidate.lastCode ? { lastCode: candidate.lastCode } : {}),
        ...(candidate.lastReason ? { lastReason: candidate.lastReason } : {}),
      } : candidate);
    }
    const entries = [...byKey.values()].sort((a, b) => a.at - b.at).slice(-PENDING_MAX);
    await writePendingEntries(entries);
    return entries;
  }

  async function removePendingEntries(items) {
    if (!Array.isArray(items)) throw new ManagerError('invalid', 'items required');
    return withPendingLock(() => removePendingEntriesUnlocked(items));
  }

  async function removePendingEntriesUnlocked(items) {
    const keys = new Set(items.map((item) => pendingKey(item)));
    if (keys.size === 0) return readPendingEntries();
    const current = await readPendingEntries();
    const entries = current.filter((entry) => !keys.has(pendingKey(entry)));
    if (entries.length !== current.length) await writePendingEntries(entries);
    return entries;
  }

  async function clearPendingEntries() {
    return withPendingLock(async () => {
      await writePendingEntries([]);
      pendingNotice = undefined;
      return [];
    });
  }

  async function convertPendingToRemoved(id, batch, title) {
    return withPendingLock(async () => {
      const current = await readPendingEntries();
      const existing = current.find((entry) => entry.id === id && entry.scope === 'archived');
      if (!existing) return current;
      const entries = current.filter((entry) => entry !== existing);
      entries.push({ ...existing, scope: 'removed', batch, title: existing.title || title || id });
      await writePendingEntries(entries);
      return entries;
    });
  }

  async function pendingView() {
    return { items: await readPendingEntries(), ...(pendingNotice ? { warning: pendingNotice } : {}) };
  }

  async function readManifest(batch) {
    if (typeof batch !== 'string' || !BATCH_RE.test(batch)) throw new ManagerError('invalid', 'invalid quarantine batch');
    const batchDir = join(trashRoot, batch);
    await assertDirectory(home, batchDir);
    const manifestPath = join(batchDir, 'manifest.json');
    const source = await readRegularFile(manifestPath, 4 * 1024 * 1024);
    let manifest;
    try { manifest = JSON.parse(source.bytes.toString('utf8')); }
    catch { throw protectedContent('隔离清单无法读取'); }
    if (!manifest || manifest.version !== 1 || (manifest.batch !== undefined && manifest.batch !== batch) || !Array.isArray(manifest.entries)) throw protectedContent('隔离清单无效');
    return { manifest, manifestPath, batchDir, fingerprint: source.fingerprint };
  }

  /** Never recursively remove a batch; unrelated siblings must survive. */
  async function saveManifest(batch, manifest, expectedFingerprint) {
    const { manifestPath, batchDir, fingerprint } = await readManifest(batch);
    if (expectedFingerprint !== undefined && fingerprint !== expectedFingerprint) throw protectedContent('操作期间隔离清单发生变化');
    await writeJsonAtomic(manifestPath, manifest);
    if (manifest.entries.length !== 0) return (await readRegularFile(manifestPath, 4 * 1024 * 1024)).fingerprint;
    const names = await fs.readdir(batchDir);
    if (names.length !== 1 || names[0] !== 'manifest.json') return;
    await readRegularFile(manifestPath, 4 * 1024 * 1024);
    await fs.unlink(manifestPath);
    await fs.rmdir(batchDir).catch(() => {}); // new siblings are preserved
  }

  function trashResult(results) {
    return {
      removed: results.filter((result) => result.ok).length,
      bytes: results.reduce((sum, result) => sum + (result.bytes || 0), 0),
      failed: results.filter((result) => !result.ok).length,
      results,
    };
  }

  async function discardEntry(target, revisions) {
    const { batch } = target;
    const { checked, entry, manifest, fingerprint } = await planTarget('discard', target);
    confirmRevision(revisions, target, checked, entry);
    const bytes = checked.files.reduce((sum, file) => sum + file.size, 0);
    let started = false, deleted = false;
    try {
      await withOccupancy(checked, async (held) => {
        entry.phase = 'deleting';
        entry.moveFiles = inventory(checked);
        entry.logDirectory = { dev: checked.dev, ino: checked.ino };
        const stagedFingerprint = await saveManifest(batch, manifest, fingerprint);
        started = true;
        await deleteSession(held.inspection);
        deleted = true;
        manifest.entries.splice(manifest.entries.indexOf(entry), 1);
        await saveManifest(batch, manifest, stagedFingerprint);
      });
      await removePendingEntries([{ id: target.id, scope: 'removed', batch }]).catch(() => {});
      return { ...target, ok: true, action: 'discard', bytes };
    } catch (error) {
      const result = resultError(error, 'discard', target, deleted ? {
        partial: true, bytes, logsDeleted: true, code: 'manifest-pending', error: '会话日志已永久删除，隔离登记尚待核对'
      } : started ? { partial: true } : {});
      if (!result.partial && ['occupied', 'occupancy-unavailable', 'running', 'restart-required'].includes(result.code)) {
        await addPendingEntries([{
          id: target.id, scope: 'removed', batch, title: entry.title || target.id,
        }], { code: result.code, message: result.error }).catch(() => {});
      }
      return result;
    }
  }

  async function discardTargets(targets, revisions) {
    const results = [];
    for (const target of targets) {
      try { results.push(await discardEntry(target, revisions)); }
      catch (error) {
        const result = resultError(error, 'discard', target);
        if (!result.partial && ['occupied', 'occupancy-unavailable', 'running', 'restart-required'].includes(result.code)) {
          await addPendingEntries([{
            id: target.id, scope: 'removed', batch: target.batch, title: target.title || target.id,
          }], { code: result.code, message: result.error }).catch(() => {});
        }
        results.push(result);
      }
    }
    return trashResult(results);
  }

  async function sweepTrash() {
    return serial(async () => {
      const { trashRetentionDays: days } = await readSettings();
      if (days === 0) return trashResult([]);
      const cutoff = Date.now() - days * DAY_MS;
      const { entries, warnings } = await readTrashEntries();
      const targets = trashCohort(entries, 'retention', cutoff).filter((entry) => !unfinished(entry));
      const report = await discardTargets(targets.map(({ id, batch }) => ({ id, batch })));
      for (const warning of warnings) {
        report.results.push({ batch: warning.batch, ok: false, code: 'protected-content', error: warning.reason });
        report.failed++;
      }
      return report;
    });
  }

  function retentionDays(raw) {
    const days = Number(raw);
    if (raw === undefined || raw === null || !Number.isInteger(days) || !RETENTION_DAYS.has(days)) {
      throw new ManagerError('invalid', 'trashRetentionDays must be one of 0, 7, 30, 90');
    }
    return days;
  }

  async function saveSettings(payload) {
    const days = retentionDays(payload?.trashRetentionDays);
    return serial(async () => {
      let targets = [], revisions;
      if (days !== 0) {
        if (!payload.previewToken || !Array.isArray(payload.items)) throw new ManagerError('confirm', '请先核对现有隔离会话');
        targets = payload.items.length ? entriesFrom(payload.items, Number.MAX_SAFE_INTEGER) : [];
        revisions = await confirmPreview(payload.previewToken, 'retention', targets, days);
      }
      await fs.mkdir(dirname(settingsPath), { recursive: true });
      await assertDirectory(home, dirname(settingsPath));
      await writeJsonAtomic(settingsPath, { version: 1, trashRetentionDays: days, updatedAt: Date.now() });
      return { settings: { trashRetentionDays: days }, swept: await discardTargets(targets, revisions) };
    });
  }

  async function unarchive(ids) {
    const targets = normalizeIds(ids);
    return serial(async () => {
      const dirs = await sessionDirs();
      const registry = service(ctx, 'workspaceRegistry');
      const pending = await unfinishedTrashIds();
      const results = [];
      for (const id of targets) {
        try {
          if (pending.has(id)) throw new ManagerError('repair-required', '已有未完成操作，请在隔离区处理');
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          if (await archivePath(id, dirs) === undefined) throw new ManagerError('files-missing', '会话日志已缺失，请单独清理失效记录');
          if (typeof registry?.unarchiveSession !== 'function') throw new ManagerError('storage', '归档登记暂不可用');
          await registry.unarchiveSession(id);
          const remaining = archivedSet();
          if (!remaining || remaining.has(id)) throw new ManagerError('registry-pending', '宿主未确认取消归档');
          await syncArchiveTimes();
          results.push({ id, ok: true, action: 'unarchive' });
        } catch (error) { results.push(resultError(error, 'unarchive', { id })); }
      }
      return results;
    });
  }

  async function discard(items, confirm, previewToken) {
    if (confirm !== 'DISCARD') throw new ManagerError('confirm', 'confirmation missing');
    const targets = entriesFrom(items);
    return serial(async () => {
      const revisions = await confirmPreview(previewToken, 'discard', targets);
      return (await discardTargets(targets, revisions)).results;
    });
  }

  function assertEntryDir(value) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 120) {
      throw new ManagerError('invalid', 'invalid quarantine directory');
    }
    if (basename(value) !== value || value === '.' || value === '..' || value.indexOf('\\') >= 0) {
      throw new ManagerError('invalid', 'invalid quarantine directory');
    }
    return value;
  }

  function latestLog(checked) {
    return checked.logs.reduce((best, log) => !best || log.header.version > best.header.version ? log : best, null);
  }

  async function sessionLogStats(directory, id, coldTitle) {
    try {
      const stats = await lightSessionStats(home, directory);
      let title;
      const budget = Math.min(MAX_COLD_TITLE_LOG, coldTitle?.remaining ?? 0);
      if (stats.sizeKnown && stats.bytes > 0 && stats.bytes <= budget) {
        coldTitle.remaining -= budget;
        try {
          const checked = await inspectSession(home, directory, id, { allowUnknown: true, maxDecodedBytes: budget });
          title = latestLog(checked)?.title;
        } catch { /* large or unreadable cold log; keep the native metadata or ID */ }
      }
      return { ...stats, title };
    } catch (error) {
      return { bytes: 0, sizeKnown: false, missing: error.code === 'ENOENT', warning: error.code === 'ENOENT' ? '会话日志已不存在' : '无法核对会话日志' };
    }
  }

  const blocked = (code, reason) => ({ code, reason });
  const unfinished = (entry) => entry.phase !== undefined;

  async function activityOf(id) {
    try { await occupancy.check(id); return true; }
    catch (error) { return blocked(error.code || 'protected-content', error.message); }
  }

  /** Structured activity labels, used only for the restart guidance. */
  async function activitiesOf(id) {
    if (typeof ctx.waterfall !== 'function') return [];
    const bare = id.replace(/^session-/, '');
    const candidates = bare === id ? [id] : [id, bare];
    const kinds = new Map();
    for (const sessionId of candidates) {
      let activities;
      try {
        activities = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]));
      } catch {
        continue;
      }
      if (!Array.isArray(activities)) continue;
      for (const activity of activities) {
        if (!activity || typeof activity.kind !== 'string') continue;
        const current = kinds.get(activity.kind) || { kind: activity.kind, items: [] };
        if (Array.isArray(activity.items)) {
          for (const item of activity.items.slice(0, 50)) {
            const label = typeof item?.label === 'string' && item.label.trim()
              ? item.label.trim().slice(0, 200)
              : typeof item?.id === 'string' ? item.id.slice(0, 200) : undefined;
            if (label && !current.items.includes(label)) current.items.push(label);
          }
        }
        kinds.set(activity.kind, current);
      }
    }
    return [...kinds.values()];
  }

  /**
   * Best-effort identification of the process holding the lock. On macOS
   * `lsof` is available in the base system; on platforms without it we simply
   * omit the holder instead of guessing.
   */
  async function lockHolder(path) {
    if (process.platform === 'win32') return undefined;
    for (const command of ['/usr/sbin/lsof', '/usr/bin/lsof', 'lsof']) {
      try {
        const { stdout } = await execFileAsync(command, ['-nP', '-w', '-Fpcn', '--', path], { timeout: 1500, maxBuffer: 64 * 1024 });
        let pid, name;
        for (const line of stdout.split('\n')) {
          if (line.startsWith('p')) pid = Number(line.slice(1));
          else if (line.startsWith('c')) name = line.slice(1);
          if (Number.isInteger(pid) && pid > 0 && name) break;
        }
        if (!Number.isInteger(pid) || pid <= 0) return undefined;
        return { pid, ...(name ? { name: name.slice(0, 120) } : {}), self: pid === process.pid };
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Explain exactly which blocker applies before the user reaches a
   * destructive preview. `state` is the first actionable reason; the detailed
   * flags remain available so the client can list every blocker.
   */
  async function diagnose(input) {
    const targets = normalizeDiagnose(input);
    let dirs, dirsError;
    if (targets.some((target) => !target.batch)) {
      try { dirs = await sessionDirs(); }
      catch (error) { dirsError = error; }
    }
    const items = [];
    let holderBudget = 8;
    for (const target of targets) {
      const id = target.id;
      const agent = agentOf(id);
      const running = agent?.status === 'running';
      const loaded = Boolean(agent);
      const activities = await activitiesOf(id);
      let path, pathError;
      if (target.batch) {
        try { path = (await getEntry(target)).directory; } catch (error) { pathError = error; }
      } else if (dirsError) {
        pathError = dirsError;
      } else {
        try { path = await locate(id, dirs); } catch (error) { pathError = error; }
      }
      let lock, holder;
      if (path !== undefined) {
        try { lock = await occupancy.lockStatus(home, path); }
        catch (error) { lock = { state: 'unknown', reason: error.message }; }
        if (lock?.state === 'busy' && holderBudget > 0) {
          holderBudget -= 1;
          holder = await lockHolder(lock.path);
        }
      }
      const state = pathError ? 'unavailable'
        : path === undefined ? 'missing'
        : running ? 'running'
        : activities.length > 0 ? 'activity'
        : loaded ? 'loaded'
        : lock?.state === 'busy' ? 'external'
        : lock?.state === 'unknown' ? 'unknown'
        : 'free';
      items.push({
        id,
        state,
        loaded,
        running,
        activities,
        ...(lock ? { lock: { state: lock.state, ...(lock.reason ? { reason: lock.reason } : {}) } } : {}),
        ...(holder ? { holder } : {}),
        ...(pathError ? { code: pathError.code || 'protected-content', reason: pathError.message } : {}),
      });
    }
    return { items };
  }

  function diskCapability(stats) {
    return stats.warning ? blocked('protected-content', stats.warning) : true;
  }

  async function existsOnDisk(path) {
    try { await fs.lstat(path); return true; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  }

  function inventory(checked) {
    return checked.files.filter((file) => file.name !== 'session.lock').map((file) => [file.name, file.digest]);
  }

  function inspectionRevision(checked, entry) {
    const identity = [checked.directory, checked.dev, checked.ino, checked.files.map((file) => [file.name, file.fingerprint, file.digest])];
    return createHash('sha256').update(JSON.stringify([identity, entry?.original, entry?.movedAt])).digest('hex');
  }

  function trashCohort(entries, action, cutoff) {
    return entries.filter((entry) => action === 'empty' || (typeof entry.movedAt === 'number' && entry.movedAt <= cutoff));
  }

  function resultError(error, action, target, extra = {}) {
    const partial = extra.partial === true || error.bytesDeleted > 0 || error.deletedFiles?.length > 0;
    return {
      ...target, ok: false, action, error: error.message || String(error), code: error.code,
      ...(partial ? { partial: true } : {}),
      ...(error.bytesDeleted === undefined ? {} : { bytes: error.bytesDeleted }),
      ...extra,
    };
  }

  async function withOccupancy(checked, run) {
    const held = await occupancy.hold(checked);
    try { return await run(held); }
    finally { await held.release(); }
  }

  async function list() {
    const archive = archivedSet();
    if (archive === undefined) throw new ManagerError('storage', '归档登记暂不可用');
    const ids = [...archive];
    const [dirs, snap, times] = await Promise.all([
      ids.length ? sessionDirs() : undefined, ids.length ? snapshots() : undefined, syncArchiveTimes(),
    ]);
    const items = [];
    const coldTitle = { remaining: COLD_TITLE_BUDGET };
    const workspaceOf = createWorkspaceLookup();
    const removed = await listRemoved(coldTitle, workspaceOf);
    const pending = new Set(removed.filter(unfinished).map((entry) => entry.id));
    for (const id of ids) {
      let path, pathError;
      try { path = await locate(id, dirs); } catch (error) { pathError = error; }
      const snapshot = snap.get(id);
      const header = snapshot ? snapshot.header : undefined;
      const meta = await metadataOf(id);
      const logStats = path === undefined ? { bytes: 0, sizeKnown: !pathError } : await sessionLogStats(path, id, meta.title ? undefined : coldTitle);
      const activity = await activityOf(id);
      const agent = agentOf(id);
      const loaded = Boolean(agent);
      const running = agent?.status === 'running';
      const missing = path === undefined && !pathError;
      const unavailable = pathError ? blocked(pathError.code, pathError.message)
        : pending.has(id) ? blocked('repair-required', '已有未完成操作，请在隔离区处理')
        : true;
      const source = unavailable !== true ? unavailable : missing ? blocked('files-missing', '会话日志已缺失') : true;
      const cleanup = unavailable !== true ? unavailable : activity !== true ? activity
        : missing ? true : blocked('files-exist', '会话日志仍在原位置');
      const destructive = source !== true ? source
        : loaded ? blocked('restart-required', '会话仍由当前 DSH 进程加载，需完全退出并重新打开 DSH 后才能彻底删除')
        : activity !== true ? activity
        : diskCapability(logStats);
      const unarchive = source === true && running ? blocked('running', '会话正在运行') : source;
      const sizeBytes = logStats.bytes;
      const logMtime = logStats.lastUsedAt;
      const lastUsedAt = meta.lastPromptAt !== undefined
        ? meta.lastPromptAt
        : typeof logMtime === 'number' ? logMtime : null;
      const archivedAt = typeof times[id] === 'number' ? times[id] : null;
      items.push({
        id,
        missing,
        capabilities: { unarchive, hide: destructive, purge: destructive, forget: cleanup },
        ...(pathError ? { protected: true, protectionReason: pathError.message } : {}),
        path,
        title: meta.title || logStats.title || id,
        workspace: workspaceOf(header ? header.cwd : undefined),
        createdAt: header && typeof header.createdAt === 'number' ? header.createdAt : null,
        lastUsedAt,
        archivedAt,
        sizeBytes,
        sizeKnown: logStats.sizeKnown,
        ...(logStats.warning ? { sizeWarning: logStats.warning } : {}),
        resident: await residentSession(id),
        loaded,
        running,
      });
    }
    items.sort((a, b) => (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0) || a.id.localeCompare(b.id));
    const attachments = await attachmentStats();
    return { items, removed, removedWarnings: removed.warnings || [], attachments };
  }

  async function readTrashEntries(describeEntry) {
    let batches;
    try { batches = await fs.readdir(trashRoot, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return { entries: [], warnings: [] }; throw error; }
    const entries = [], warnings = [];
    for (const batch of batches) {
      if (!batch.isDirectory() || !BATCH_RE.test(batch.name)) {
        warnings.push({ batch: batch.name, reason: '隔离区含无法确认的路径，已保留' });
        continue;
      }
      try {
        const { manifest, batchDir } = await readManifest(batch.name);
        const seen = new Set();
        for (const entry of manifest.entries) {
          try {
            assertId(entry?.id); assertEntryDir(entry?.dir);
            if (seen.has(entry.id)) throw protectedContent('隔离清单对象不唯一');
            seen.add(entry.id);
          } catch (error) { warnings.push({ batch: batch.name, reason: error.message }); continue; }
          const item = describeEntry ? await describeEntry(entry, batchDir) : entry;
          entries.push({ ...item, batch: batch.name });
        }
        const known = new Set(['manifest.json', ...manifest.entries.map((entry) => entry?.dir)]);
        if ((await fs.readdir(batchDir)).some((name) => !known.has(name))) warnings.push({ batch: batch.name, reason: '批次内含未列入会话清单的内容，已保留' });
      } catch (error) { warnings.push({ batch: batch.name, reason: error.message || '隔离清单无法读取，已保留' }); }
    }
    entries.sort((a, b) => (b.movedAt || 0) - (a.movedAt || 0));
    return { entries, warnings };
  }

  async function listRemoved(coldTitle, workspaceOf = createWorkspaceLookup()) {
    const { entries, warnings } = await readTrashEntries(async (entry, batchDir) => {
      const knownTitle = entry.title && entry.title !== entry.id;
      const stats = await sessionLogStats(join(batchDir, entry.dir), entry.id, knownTitle ? undefined : coldTitle);
      const agent = agentOf(entry.id);
      const loaded = Boolean(agent);
      const activity = loaded
        ? blocked('restart-required', '会话仍由当前 DSH 进程加载，需完全退出并重新打开 DSH 后才能彻底删除')
        : await activityOf(entry.id);
      // A loaded session cannot be repaired or discarded until DSH releases
      // its write handle, and an active job/schedule must be stopped first.
      // Surface either blocker before the repair-required state; only after
      // it clears does the repair entry become reachable.
      const blockedActivity = loaded || activity !== true;
      const capability = blockedActivity ? activity
        : unfinished(entry) ? blocked('repair-required', '上次操作尚未完成，请先核对状态')
        : diskCapability(stats);
      const repairable = blockedActivity ? activity
        : unfinished(entry) || stats.missing ? activity : blocked('repair-unneeded', '无需核对');
      const { moveFiles, logDirectory, ...visible } = entry;
      return { ...visible, title: knownTitle ? entry.title : stats.title || entry.id, workspace: workspaceOf(entry.workspacePath), bytes: stats.bytes, sizeKnown: stats.sizeKnown, ...(stats.warning ? { sizeWarning: stats.warning } : {}), capabilities: { restore: capability, discard: capability, repair: repairable }, loaded };
    });
    return Object.defineProperty(entries, 'warnings', { value: warnings });
  }

  async function unfinishedTrashIds() {
    const { entries } = await readTrashEntries();
    return new Set(entries.filter(unfinished).map((entry) => entry.id));
  }

  function entriesFrom(items, limit = MAX_IDS) {
    if (!Array.isArray(items) || items.length === 0 || items.length > limit) throw new ManagerError('invalid', '隔离记录数量无效');
    const entries = items.map((item) => {
      if (typeof item?.batch !== 'string' || !BATCH_RE.test(item.batch)) throw new ManagerError('invalid', '隔离批次无效');
      return { id: assertId(item.id), batch: item.batch };
    });
    if (new Set(entries.map(targetKey)).size !== entries.length) throw new ManagerError('invalid', '隔离记录重复');
    return entries;
  }

  function targetKey(item) { return item.batch ? [item.batch, item.id].join('/') : item.id; }

  async function getEntry(target) {
    const { manifest, batchDir, fingerprint } = await readManifest(target.batch);
    const matches = manifest.entries.filter((entry) => entry?.id === target.id);
    if (matches.length !== 1) throw new ManagerError('not-found', '隔离记录不存在或不唯一');
    const entry = matches[0];
    return { manifest, fingerprint, entry, directory: join(batchDir, assertEntryDir(entry.dir)) };
  }

  async function archivePath(id, dirs) {
    const ids = archivedSet();
    if (!ids) throw new ManagerError('storage', '归档登记暂不可用');
    if (!ids.has(id)) throw new ManagerError('not-archived', '会话已离开归档列表，请刷新');
    return locate(id, dirs);
  }

  async function originalPath(entry) {
    if (typeof entry.original !== 'string') throw protectedContent('原位置无效');
    const original = resolve(entry.original);
    const bare = entry.id.replace(/^session-/, '');
    if (![bare, 'session-' + bare].includes(basename(original))) throw protectedContent('原目录与会话不符');
    const root = await physicalRoot();
    if (dirname(dirname(original)) !== root) throw new ManagerError('invalid', '原位置不属于会话目录');
    await assertDirectory(home, sessionsRoot);
    return original;
  }

  async function inspectTarget(path, id) {
    try {
      return await inspectSession(home, path, id);
    } catch (error) {
      if (error?.code === 'ENOENT') throw new ManagerError('files-missing', '会话日志已缺失，请刷新后单独清理失效记录');
      throw error;
    }
  }

  async function planTarget(action, target, dirs) {
    const { id } = target;
    const agent = agentOf(id);
    if (agent?.status === 'running') throw new ManagerError('occupied', '会话正在运行，请先停止当前回合');
    if (agent) throw new ManagerError('restart-required', RESTART_REASON);
    await occupancy.check(id);
    if (!target.batch) {
      const path = await archivePath(id, dirs);
      if (!path) throw new ManagerError('files-missing', '会话日志已缺失，请刷新后单独清理失效记录');
      return { title: (await metadataOf(id)).title, checked: await inspectTarget(path, id) };
    }
    const current = await getEntry(target);
    if (unfinished(current.entry)) throw new ManagerError('repair-required', '上次操作尚未完成，请先核对状态');
    if (action === 'restore' && await existsOnDisk(await originalPath(current.entry))) throw new ManagerError('exists', '原位置已存在会话目录');
    return { ...current, title: current.entry.title, checked: await inspectTarget(current.directory, id) };
  }

  async function planPreview(action, input, cutoff) {
    const archive = action === 'hide' || action === 'purge';
    const global = action === 'empty' || action === 'retention';
    const removed = global ? await readTrashEntries() : undefined;
    const candidates = archive ? normalizeIds(input.ids).map((id) => ({ id }))
      : global ? trashCohort(removed.entries, action, cutoff)
      : entriesFrom(input.items);
    const dirs = archive ? await sessionDirs() : undefined;
    const pending = archive ? await unfinishedTrashIds() : new Set();
    const targets = [], excluded = [], revisions = new Map();
    for (const candidate of candidates) {
      const { id, batch, title } = candidate;
      const key = batch ? { id, batch } : { id };
      try {
        if (pending.has(id)) throw new ManagerError('repair-required', '已有未完成操作，请在隔离区处理');
        const plan = await planTarget(action, key, dirs);
        await occupancy.probe(plan.checked);
        targets.push({ ...key, title: plan.title || title || latestLog(plan.checked)?.title || id, bytes: plan.checked.files.reduce((sum, file) => sum + file.size, 0) });
        const { logs, ...fileState } = plan.checked;
        revisions.set(targetKey(key), { target: key, fileState, revision: inspectionRevision(plan.checked, plan.entry) });
      } catch (error) { excluded.push({ ...key, title: title || id, code: error.code || 'storage', reason: error.message }); }
    }
    if (removed?.warnings) {
      for (const warning of removed.warnings) excluded.push({ batch: warning.batch, code: 'protected-content', reason: warning.reason });
    }
    return { targets, blocked: excluded, revisions, cohort: global ? candidates.map(targetKey) : undefined };
  }

  async function preview(payload) {
    const action = payload?.action;
    if (!PREVIEW_ACTIONS.has(action)) throw new ManagerError('invalid', '操作类型无效');
    const days = action === 'retention' ? retentionDays(payload.trashRetentionDays) : undefined;
    if (days === 0) throw new ManagerError('invalid', '关闭自动清理无需预览');
    const cutoff = days === undefined ? undefined : Date.now() - days * DAY_MS;
    const { revisions, cohort, ...summary } = await planPreview(action, payload, cutoff);
    while (previews.size >= MAX_PREVIEWS) previews.delete(previews.keys().next().value);
    const previewToken = randomUUID();
    previews.set(previewToken, { action, days, cutoff, revisions, cohort, expires: Date.now() + PREVIEW_TTL });
    return { action, ...summary, previewToken };
  }

  const sameTargets = (before, after) => JSON.stringify([...before].sort()) === JSON.stringify([...after].sort());
  const changedScope = () => new ManagerError('state-changed', '操作范围或会话内容已变化，请重新核对并确认');

  async function confirmPreview(token, action, targets, days) {
    if (token === undefined) {
      if (['purge', 'discard', 'empty', 'retention'].includes(action)) {
        throw new ManagerError('confirm', '请先预览并确认删除范围，再执行此操作');
      }
      return undefined;
    }
    const previous = previews.get(token);
    previews.delete(token);
    const keys = targets.map(targetKey);
    if (!previous || previous.expires < Date.now() || previous.action !== action || previous.days !== days || !sameTargets(previous.revisions.keys(), keys)) {
      throw changedScope();
    }
    try {
      if (previous.cohort) {
        const current = trashCohort((await readTrashEntries()).entries, action, previous.cutoff);
        if (!sameTargets(previous.cohort, current.map(targetKey))) throw changedScope();
      }
      const archivedAction = action === 'hide' || action === 'purge';
      const dirs = archivedAction ? await sessionDirs() : undefined;
      for (const { target, fileState, revision } of previous.revisions.values()) {
        await occupancy.check(target.id);
        if (target.batch) {
          const { entry, directory } = await getEntry(target);
          if (unfinished(entry) || fileState.directory !== directory || revision !== inspectionRevision(fileState, entry)) throw changedScope();
          if (action === 'restore' && await existsOnDisk(await originalPath(entry))) throw changedScope();
        } else if (await archivePath(target.id, dirs) !== fileState.directory) throw changedScope();
        await verifyInspection(fileState);
      }
    } catch { throw changedScope(); }
    return previous.revisions;
  }

  function confirmRevision(revisions, target, checked, entry) {
    if (revisions && revisions.get(targetKey(target))?.revision !== inspectionRevision(checked, entry)) throw changedScope();
  }

  async function hide(ids, previewToken) {
    const targets = normalizeIds(ids).map((id) => ({ id }));
    return serial(async () => {
      const revisions = await confirmPreview(previewToken, 'hide', targets);
      const dirs = await sessionDirs();
      const snap = await snapshots();
      const pending = await unfinishedTrashIds();
      const batch = stamp();
      const batchDir = join(trashRoot, batch);
      const manifestPath = join(batchDir, 'manifest.json');
      const manifest = { version: 1, batch, createdAt: Date.now(), entries: [] };
      let manifestFingerprint;
      const results = [];
      for (const target of targets) {
        const { id } = target;
        let moved = false, entry;
        try {
          if (pending.has(id)) throw new ManagerError('repair-required', '已有未完成操作，请在隔离区处理');
          const { checked, title } = await planTarget('hide', target, dirs);
          confirmRevision(revisions, target, checked);
          const size = checked.files.reduce((sum, file) => sum + file.size, 0);
          await withOccupancy(checked, async (held) => {
            const path = checked.directory;
            if (await archivePath(id, dirs) !== path) throw changedScope();
            await fs.mkdir(trashRoot, { recursive: true });
            await assertDirectory(home, trashRoot);
            if (manifest.entries.length === 0) await fs.mkdir(batchDir);
            await assertDirectory(home, batchDir);
            const destination = join(batchDir, basename(path));
            entry = {
              id, original: path, dir: basename(path), bytes: size, movedAt: Date.now(),
              title: title || latestLog(checked)?.title || id,
              workspacePath: snap.get(id)?.header?.cwd || checked.logs.at(-1)?.header.cwd,
              resident: await residentSession(id),
              phase: 'moving', moveFiles: inventory(checked),
            };
            manifest.entries.push(entry);
            try {
              if (manifestFingerprint === undefined) {
                await writeJsonAtomic(manifestPath, manifest);
                manifestFingerprint = (await readRegularFile(manifestPath, 4 * 1024 * 1024)).fingerprint;
              } else {
                manifestFingerprint = await saveManifest(batch, manifest, manifestFingerprint);
              }
            } catch (error) {
              manifest.entries.pop();
              if (manifest.entries.length === 0) await fs.rmdir(batchDir).catch(() => {});
              throw error;
            }
            try {
              await moveSession(held.inspection, home, destination, { lockDestination: held.lockDestination });
            } catch (error) {
              moved = error.filesMoved === true;
              if (!await existsOnDisk(destination)) {
                manifest.entries.pop();
                manifestFingerprint = await saveManifest(batch, manifest, manifestFingerprint);
                entry = undefined;
              }
              throw error;
            }
            moved = true;
            entry.phase = 'detaching';
            manifestFingerprint = await saveManifest(batch, manifest, manifestFingerprint);
            await clearRegistry(id);
            await syncArchiveTimes();
            delete entry.phase;
            delete entry.moveFiles;
            manifestFingerprint = await saveManifest(batch, manifest, manifestFingerprint);
          });
          await convertPendingToRemoved(id, batch, target.title || id).catch(() => {});
          results.push({ id, ok: true, action: 'hide', bytes: size });
        } catch (error) {
          results.push(resultError(error, 'hide', target, entry ? { partial: true, recoveryBatch: batch, logsMoved: moved } : {}));
        }
      }
      return results;
    });
  }

  async function recordPurge(checked, title) {
    const batch = stamp();
    const batchDir = join(trashRoot, batch);
    await fs.mkdir(trashRoot, { recursive: true });
    await assertDirectory(home, trashRoot);
    await fs.mkdir(batchDir);
    await assertDirectory(home, batchDir);
    const entry = {
      id: checked.id, original: checked.directory, dir: basename(checked.directory),
      title: title || latestLog(checked)?.title || checked.id,
      phase: 'purging', moveFiles: inventory(checked),
      logDirectory: { dev: checked.dev, ino: checked.ino },
    };
    const manifest = { version: 1, batch, createdAt: Date.now(), entries: [entry] };
    const path = join(batchDir, 'manifest.json');
    try {
      await writeJsonAtomic(path, manifest);
      const { fingerprint } = await readManifest(batch);
      return { batch, manifest, fingerprint };
    } catch (error) {
      await fs.rmdir(batchDir).catch(() => {});
      throw error;
    }
  }

  async function purge(ids, confirm, previewToken) {
    if (confirm !== 'PURGE') throw new ManagerError('confirm', 'confirmation missing');
    const targets = normalizeIds(ids).map((id) => ({ id }));
    return serial(async () => {
      const revisions = await confirmPreview(previewToken, 'purge', targets);
      const dirs = await sessionDirs();
      const pending = await unfinishedTrashIds();
      const results = [];
      for (const target of targets) {
        const { id } = target;
        let journal, deleted = false, bytes, title = id;
        try {
          if (pending.has(id)) throw new ManagerError('repair-required', '已有未完成操作，请在隔离区处理');
          const plan = await planTarget('purge', target, dirs);
          const { checked } = plan;
          title = plan.title || id;
          confirmRevision(revisions, target, checked);
          bytes = checked.files.reduce((sum, file) => sum + file.size, 0);
          await withOccupancy(checked, async (held) => {
            if (await archivePath(id, dirs) !== checked.directory) throw changedScope();
            journal = await recordPurge(held.inspection, title);
            await deleteSession(held.inspection);
            deleted = true;
            await clearRegistry(id);
            await syncArchiveTimes();
            journal.manifest.entries = [];
            await saveManifest(journal.batch, journal.manifest, journal.fingerprint);
          });
          await removePendingEntries([{ id }]).catch(() => {});
          results.push({ id, ok: true, action: 'purge', bytes });
        } catch (error) {
          const partial = journal ? {
            partial: true, recoveryBatch: journal.batch,
            code: 'repair-required',
            error: deleted ? '会话日志已永久删除，请在最近删除核对剩余登记'
              : '永久删除尚未完成，请在最近删除核对剩余日志',
            ...(deleted ? { bytes, logsDeleted: true } : {}),
          } : {};
          const result = resultError(error, 'purge', target, partial);
          if (!journal && ['occupied', 'occupancy-unavailable', 'running', 'restart-required'].includes(result.code)) {
            await addPendingEntries([{ id, scope: 'archived', title }], { code: result.code, message: result.error }).catch(() => {});
          }
          results.push(result);
        }
      }
      return results;
    });
  }

  async function forget(ids) {
    const targets = normalizeIds(ids);
    return serial(async () => {
      const dirs = await sessionDirs();
      const pending = await unfinishedTrashIds();
      const results = [];
      for (const id of targets) {
        try {
          if (pending.has(id)) throw new ManagerError('repair-required', '已有未完成操作，请在隔离区处理');
          await occupancy.check(id);
          if (await archivePath(id, dirs) !== undefined) throw new ManagerError('files-exist', '会话日志仍在原位置');
          await clearRegistry(id);
          await syncArchiveTimes();
          results.push({ id, ok: true, action: 'forget', bytes: 0 });
        } catch (error) { results.push(resultError(error, 'forget', { id })); }
      }
      return results;
    });
  }

  async function restore(items, previewToken) {
    const targets = entriesFrom(items);
    return serial(async () => {
      const revisions = await confirmPreview(previewToken, 'restore', targets);
      const results = [];
      for (const target of targets) {
        try {
          const result = await restoreEntry(target, revisions);
          results.push(result);
        } catch (error) { results.push(resultError(error, 'restore', target)); }
      }
      return results;
    });
  }

  async function restoreEntry(target, revisions) {
    const { id, batch } = target;
    const { entry, manifest, fingerprint, checked } = await planTarget('restore', target);
    confirmRevision(revisions, target, checked, entry);
    const original = await originalPath(entry);
    let started = false, moved = false, association;
    try {
      await withOccupancy(checked, async (held) => {
        await fs.mkdir(dirname(original), { recursive: true });
        await assertDirectory(home, dirname(original));
        entry.phase = 'restoring';
        entry.moveFiles = inventory(checked);
        const stagedFingerprint = await saveManifest(batch, manifest, fingerprint);
        started = true;
        await moveSession(held.inspection, home, original, { lockDestination: held.lockDestination });
        moved = true;
        association = await reattach(id, entry.workspacePath);
        manifest.entries.splice(manifest.entries.indexOf(entry), 1);
        await saveManifest(batch, manifest, stagedFingerprint);
      });
      return { ...target, ok: true, action: 'restore', workspaceAttached: association.attached, ...(association.warning ? { warning: association.warning } : {}) };
    } catch (error) {
      moved ||= error.filesMoved === true;
      const partial = started ? { partial: true, logsRestored: moved, recoveryBatch: batch } : {};
      return resultError(error, 'restore', target, moved ? {
        ...partial, code: 'manifest-pending', error: '会话日志已回到原位置，隔离登记尚待核对'
      } : partial);
    }
  }

  async function repair(items) {
    const targets = entriesFrom(items);
    return serial(async () => {
      const results = [];
      for (const target of targets) {
        try { results.push(await repairEntry(target)); }
        catch (error) { results.push(resultError(error, 'repair', target)); }
      }
      return results;
    });
  }

  async function remainingLogNames(directory, entry) {
    const current = await assertDirectory(home, directory);
    if (current.dev !== entry.logDirectory?.dev || current.ino !== entry.logDirectory?.ino || !Array.isArray(entry.moveFiles)) {
      throw new ManagerError('repair-required', '会话目录已变化，已保留现有文件');
    }
    const names = await fs.readdir(directory);
    const logs = names.filter((name) => /^session.*\.jsonl(?:\..*)?$/.test(name) || entry.moveFiles.some((file) => file[0] === name));
    return { logs, residual: names.length > 0 };
  }

  async function repairPurge(target, pending) {
    const { id, batch } = target;
    const { entry, manifest, fingerprint } = pending;
    const original = await originalPath(entry);
    const located = await locate(id);
    if (located && located !== original) throw new ManagerError('repair-required', '会话在其他位置存在，请在宿主核对');
    let residual = false;
    if (located) {
      const observed = await remainingLogNames(original, entry);
      if (observed.logs.length) {
        const checked = await inspectSession(home, original, id);
        if (!inventory(checked).every(([name, digest]) => entry.moveFiles.some((file) => file[0] === name && file[1] === digest))) {
          throw new ManagerError('repair-required', '剩余日志与上次操作记录不一致，已保留现有文件');
        }
        await withOccupancy(checked, () => saveManifest(batch, { ...manifest, entries: [] }, fingerprint));
        return { ...target, ok: true, action: 'repair', warning: '剩余日志仍在已归档，可重新预览删除范围' };
      }
      residual = observed.residual;
    }
    await clearRegistry(id);
    await syncArchiveTimes();
    await saveManifest(batch, { ...manifest, entries: [] }, fingerprint);
    return { ...target, ok: true, action: 'repair', ...(residual ? { warning: '剩余内容已保留在原目录' } : {}) };
  }

  async function repairEntry(target) {
    const { id, batch } = target;
    const agent = agentOf(id);
    if (agent?.status === 'running') throw new ManagerError('occupied', '会话仍在运行，停止后再处理');
    if (agent) throw new ManagerError('restart-required', RESTART_REASON);
    await occupancy.check(id);
    const pending = await getEntry(target);
    const { entry, manifest, fingerprint, directory } = pending;
    if (entry.phase === 'purging') return repairPurge(target, pending);
    if (entry.phase === undefined || entry.phase === 'deleting') {
      if (!await existsOnDisk(directory)) {
        manifest.entries.splice(manifest.entries.indexOf(entry), 1);
        await saveManifest(batch, manifest, fingerprint);
        return { ...target, ok: true, action: 'repair' };
      }
      if (entry.phase === undefined) throw new ManagerError('repair-unneeded', '此会话没有待核对的操作');
      const observed = await remainingLogNames(directory, entry);
      if (observed.logs.length === 0) {
        manifest.entries.splice(manifest.entries.indexOf(entry), 1);
        await saveManifest(batch, manifest, fingerprint);
        return { ...target, ok: true, action: 'repair', ...(observed.residual ? { warning: '隔离目录中的其他内容已保留' } : {}) };
      }
      const checked = await inspectSession(home, directory, id);
      if (!Array.isArray(entry.moveFiles) || !inventory(checked).every(([name, digest]) =>
        entry.moveFiles.some((file) => file[0] === name && file[1] === digest))) {
        throw new ManagerError('repair-required', '剩余日志与上次操作记录不一致，已保留现有文件');
      }
      await withOccupancy(checked, async () => {
        delete entry.phase;
        delete entry.moveFiles;
        delete entry.logDirectory;
        await saveManifest(batch, manifest, fingerprint);
      });
      return { ...target, ok: true, action: 'repair', warning: '已核对剩余日志，可重新预览删除范围' };
    }
    if (!['moving', 'detaching', 'restoring'].includes(entry.phase)) {
      throw new ManagerError('repair-required', '隔离操作状态无法识别，已保留现有文件');
    }
    const original = await originalPath(entry);
    const [sourceExists, trashExists] = await Promise.all([existsOnDisk(original), existsOnDisk(directory)]);
    if (sourceExists === trashExists) throw new ManagerError('repair-required', '无法确认日志完整位置，已保留现有文件');
    const restored = entry.phase === 'restoring' && sourceExists;
    const moved = [ 'moving', 'detaching' ].includes(entry.phase) && trashExists;
    if (!restored && !moved && entry.phase === 'detaching') throw new ManagerError('repair-required', '无法确认隔离结果，已保留现有文件');
    const checked = await inspectSession(home, sourceExists ? original : directory, id);
    if (!Array.isArray(entry.moveFiles) || JSON.stringify(inventory(checked)) !== JSON.stringify(entry.moveFiles)) {
      throw new ManagerError('repair-required', '日志与上次操作的记录不一致，已保留现有文件');
    }
    let association;
    await withOccupancy(checked, async () => {
      if (moved) {
        await clearRegistry(id);
        await syncArchiveTimes();
      }
      if (restored) association = await reattach(id, entry.workspacePath);
      // The file move either completed or fully rolled back; keep an entry only while logs remain here.
      if (trashExists) {
        delete entry.phase;
        delete entry.moveFiles;
      } else {
        manifest.entries.splice(manifest.entries.indexOf(entry), 1);
      }
      await saveManifest(batch, manifest, fingerprint);
    });
    return { ...target, ok: true, action: 'repair', ...(association?.warning ? { warning: association.warning } : {}) };
  }

  async function emptyTrash(confirm, expectedItems, previewToken) {
    if (confirm !== 'EMPTY') throw new ManagerError('confirm', 'confirmation missing');
    if (!Array.isArray(expectedItems)) throw new ManagerError('invalid', '需要清空确认时的完整隔离记录');
    const targets = expectedItems.length ? entriesFrom(expectedItems, Number.MAX_SAFE_INTEGER) : [];
    return serial(async () => {
      const revisions = await confirmPreview(previewToken, 'empty', targets);
      return discardTargets(targets, revisions);
    });
  }

  async function fileRecords(payload) {
    const id = assertId(payload?.id);
    let directory, workspacePath;
    if (payload.batch !== undefined) {
      const { manifest, batchDir } = await readManifest(payload.batch);
      const matching = manifest.entries.filter((entry) => entry?.id === id);
      if (matching.length !== 1) throw new ManagerError('not-found', '隔离记录不存在或不唯一');
      directory = join(batchDir, assertEntryDir(matching[0].dir));
      workspacePath = matching[0].workspacePath;
    } else {
      if (!archived().has(id)) throw new ManagerError('not-archived', 'session is not archived');
      directory = await locate(id);
    }
    if (!directory) throw new ManagerError('files-missing', '会话记录已不存在，无法读取已记录的文件位置');
    // Read from disk without opening/resuming a session; quarantine works too.
    const checked = await inspectSession(home, directory, id, { allowUnknown: true, includeRecordedFiles: true });
    const latest = latestLog(checked);
    workspacePath = latest.header.cwd || workspacePath;
    return { files: latest.recordedFiles, workspacePath, warning: checked.warning };
  }

  async function locationStatus(path, workspace = false) {
    const unavailable = (status, reason) => ({ status, reason, canOpen: false });
    if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0')) return unavailable('unmapped', '路径无法映射到当前主机');
    const adapter = service(ctx, 'fs');
    const controller = service(ctx, 'sessionController');
    if (!adapter || typeof adapter.processPathFromHostPath !== 'function' || typeof adapter.resolve !== 'function' || typeof adapter.processPath !== 'function') return unavailable('unmapped', '当前环境没有可验证的主机路径映射');
    try {
      const mapped = adapter.processPathFromHostPath(path);
      if (mapped === undefined) return unavailable('unmapped', '路径无法映射到当前主机');
      const parent = workspace ? path : dirname(path);
      // A known path may be missing, but no ancestor guess is substituted.
      let target;
      try { target = await fs.lstat(path); }
      catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
      if (target?.isSymbolicLink()) return unavailable('unmapped', '文件位置是链接，无法确认原位置');
      if (target && !(workspace ? target.isDirectory() : target.isFile())) return unavailable('invalid', workspace ? '工作区位置不是目录' : '记录位置不是普通文件');
      let parentStat;
      try { parentStat = await fs.stat(parent); }
      catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return unavailable('directory-missing', '所在文件夹已不存在');
        throw error;
      }
      if (!parentStat.isDirectory()) return unavailable('directory-missing', '所在文件夹已不存在');
      await fs.access(parent, 4);
      const verifiedHostPath = target ? await fs.realpath(path) : join(await fs.realpath(parent), basename(path));
      const roundTrip = adapter.processPath(await adapter.resolve(mapped, {}));
      if (typeof roundTrip !== 'string' || !isAbsolute(roundTrip)) return unavailable('unmapped', '路径无法映射到当前主机');
      const mappedCanonical = target ? await fs.realpath(roundTrip) : join(await fs.realpath(dirname(roundTrip)), basename(roundTrip));
      if (mappedCanonical !== verifiedHostPath) return unavailable('unmapped', '路径无法映射到当前主机');
      if (!controller || typeof controller.openWorkspacePath !== 'function' || typeof controller.workspaceDesktop !== 'function' || !controller.workspaceDesktop().available) return unavailable('desktop-unavailable', '当前主机没有可用的桌面文件管理器');
      return { status: target ? 'available' : 'file-missing', reason: target ? '' : '文件已不存在，可打开已记录的所在文件夹', canOpen: true, verifiedHostPath };
    } catch (error) {
      return unavailable(error.code === 'EACCES' || error.code === 'EPERM' ? 'permission-denied' : 'unavailable', error.code === 'EACCES' || error.code === 'EPERM' ? '没有访问此文件夹的权限' : '无法核对文件位置');
    }
  }

  async function files(payload) {
    const records = await fileRecords(payload);
    const publicLocation = async (path, workspace = false) => { const { verifiedHostPath, ...status } = await locationStatus(path, workspace); return status; };
    const files = await Promise.all(records.files.map(async (file) => ({ ...file, ...await publicLocation(file.path) })));
    const workspace = records.workspacePath ? { path: records.workspacePath, ...await publicLocation(records.workspacePath, true) } : null;
    return { files, workspace, coverage: 'recorded-only', ...(records.warning ? { warning: records.warning } : {}) };
  }

  async function openFolder(payload) {
    const records = await fileRecords(payload);
    const workspace = payload.workspace === true;
    const path = workspace ? records.workspacePath : records.files.find((file) => file.path === payload.path)?.path;
    if (!path) throw new ManagerError('invalid', '请求的位置没有对应的会话结构化记录');
    const status = await locationStatus(path, workspace);
    if (!status.canOpen) throw new ManagerError(status.status, status.reason);
    // Reveal an existing regular file. Only a verified directory uses open.
    const target = workspace ? status.verifiedHostPath : status.status === 'file-missing' ? dirname(status.verifiedHostPath) : status.verifiedHostPath;
    const controller = service(ctx, 'sessionController');
    await controller.openWorkspacePath({ path: target, ...(!workspace && status.status === 'available' ? { action: 'reveal' } : {}) }, AbortSignal.timeout(30_000));
    return { opened: true, directory: workspace ? path : dirname(path), status: status.status };
  }

  function normalizeIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) throw new ManagerError('invalid', 'ids required');
    if (ids.length > MAX_IDS) throw new ManagerError('invalid', 'too many ids');
    return [...new Set(ids.map(assertId))];
  }

  function normalizeDiagnose(input) {
    if (!Array.isArray(input) || input.length === 0) throw new ManagerError('invalid', 'items required');
    if (input.length > MAX_IDS) throw new ManagerError('invalid', 'too many items');
    const seen = new Set();
    const targets = [];
    for (const value of input) {
      const item = typeof value === 'string' ? { id: value } : value;
      if (!item || typeof item !== 'object') throw new ManagerError('invalid', 'invalid session reference');
      const id = assertId(item.id);
      let batch;
      if (item.batch !== undefined) {
        if (typeof item.batch !== 'string' || !BATCH_RE.test(item.batch)) throw new ManagerError('invalid', 'invalid quarantine batch');
        batch = item.batch;
      }
      const key = batch ? `${batch}/${id}` : `archived/${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(batch ? { id, batch } : { id });
    }
    return targets;
  }

  if (typeof ctx.effect === 'function') {
    try {
      ctx.effect(() => {
        const run = async () => {
          try {
            await sweepTrash();
          } catch {
            /* retention is best-effort; never take the host down */
          }
        };
        const initial = setTimeout(run, 15_000);
        if (initial && typeof initial.unref === 'function') initial.unref();
        const timer = setInterval(run, 6 * 60 * 60 * 1000);
        if (timer && typeof timer.unref === 'function') timer.unref();
        return () => {
          clearTimeout(initial);
          clearInterval(timer);
        };
      }, 'archived-manager: trash retention');
    } catch {
      /* test contexts without a Cordis effect */
    }
  }

  return {
    home,
    enterUpdate,
    isUpdating: () => updatePending,
    sessionsRoot,
    trashRoot,
    archiveTimesPath,
    settingsPath,
    pendingPath,
    syncArchiveTimes,
    list,
    diagnose,
    pending: readPendingEntries,
    pendingView,
    addPending: addPendingEntries,
    forgetPending: removePendingEntries,
    clearPending: clearPendingEntries,
    preview,
    repair,
    hide,
    purge,
    forget,
    unarchive,
    discard,
    restore,
    listRemoved,
    emptyTrash,
    files,
    openFolder,
    readSettings,
    saveSettings,
    sweepTrash,
    attachmentStats,
    version: PACKAGE_VERSION,
  };
}

/** The exact-route handler set, shared by the plugin entry and the tests. */
export function createRoutes(ctx, options = {}) {
  let updater;
  const manager = createManager(ctx, { isUpdating: () => updater?.isUpdating() ?? false, lockFile: options.lockFile });
  const webServer = options.webServer ?? service(ctx, 'webServer');
  updater = createUpdater({
    home: manager.home,
    pluginManager: options.pluginManager ?? service(ctx, 'pluginManager'),
    webServer,
    runtimeVersion: manager.version,
    enterUpdate: manager.enterUpdate,
    onBundlesChanged: typeof ctx.on === 'function' ? (listener) => ctx.on('plugin-manager/changed', listener) : undefined,
  });
  if (typeof ctx.effect === 'function') ctx.effect(() => () => updater.detach(), 'archived-manager: update runtime version');
  let hostOrigin;
  try { hostOrigin = new URL(webServer.getOrigin()); } catch { /* older hosts expose no origin */ }
  const json = (response, status, body) => {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(body));
  };
  const loopback = (request) => {
    const address = request.socket && request.socket.remoteAddress;
    return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
  };
  const sameOrigin = (request) => {
    const origin = request.headers.origin;
    if (origin === undefined || origin === '') return true;
    try {
      return new URL(origin).host === request.headers.host;
    } catch {
      return false;
    }
  };
  const guard = (request, response, method) => {
    if (request.method !== method) {
      response.writeHead(405, { allow: method });
      response.end();
      return false;
    }
    if (!loopback(request)) {
      json(response, 403, { ok: false, code: 'origin', error: 'loopback only' });
      return false;
    }
    if (hostOrigin && (request.headers.host !== hostOrigin.host || request.headers.origin && request.headers.origin !== hostOrigin.origin)) {
      json(response, 403, { ok: false, code: 'origin', error: 'unexpected host origin' });
      return false;
    }
    if (!sameOrigin(request)) {
      json(response, 403, { ok: false, code: 'origin', error: 'cross-origin refused' });
      return false;
    }
    if (method === 'POST' && request.headers['x-archived-manager'] !== '1') {
      json(response, 403, { ok: false, code: 'origin', error: 'missing x-archived-manager header' });
      return false;
    }
    return true;
  };
  const body = (request, maximum = MAX_BODY_BYTES) => new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > maximum) {
        reject(new ManagerError('invalid', 'request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (chunks.length === 0) return resolveBody({});
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new ManagerError('invalid', 'invalid JSON body'));
      }
    });
    request.on('error', reject);
  });

  const routes = [
    {
      path: '/archived-manager/preview',
      method: 'POST',
      handler: async (request, response) => {
        json(response, 200, { ok: true, ...await manager.preview(await body(request, 4 * 1024 * 1024)) });
      },
    },
    {
      path: '/archived-manager/repair',
      method: 'POST',
      handler: async (request, response) => {
        const { items } = await body(request);
        const results = await manager.repair(items);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/files',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        json(response, 200, { ok: true, ...await manager.files(payload) });
      },
    },
    {
      path: '/archived-manager/open-folder',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        json(response, 200, { ok: true, ...await manager.openFolder(payload) });
      },
    },
    {
      path: '/archived-manager/list',
      method: 'GET',
      handler: async (request, response) => {
        const report = await manager.list();
        json(response, 200, { ok: true, items: report.items, removed: report.removed, removedWarnings: report.removedWarnings, attachments: report.attachments, version: manager.version });
      },
    },
    {
      path: '/archived-manager/removed',
      method: 'GET',
      handler: async (request, response) => {
        const removed = await manager.listRemoved();
        json(response, 200, { ok: true, removed, removedWarnings: removed.warnings || [] });
      },
    },
    {
      path: '/archived-manager/hide',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.hide(payload.ids, payload.previewToken);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/purge',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.purge(payload.ids, payload.confirm, payload.previewToken);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/unarchive',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.unarchive(payload.ids);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/restore',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.restore(payload.items, payload.previewToken);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/discard',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.discard(payload.items, payload.confirm, payload.previewToken);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/forget',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.forget(payload.ids);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/empty-trash',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request, 4 * 1024 * 1024);
        const result = await manager.emptyTrash(payload.confirm, payload.items, payload.previewToken);
        json(response, 200, { ...result, ok: result.failed === 0 });
      },
    },
    {
      path: '/archived-manager/settings',
      method: 'GET',
      handler: async (request, response) => {
        json(response, 200, { ok: true, settings: await manager.readSettings() });
      },
    },
    {
      path: '/archived-manager/settings/save',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request, 4 * 1024 * 1024);
        const saved = await manager.saveSettings(payload);
        json(response, 200, { ok: true, settings: saved.settings, swept: saved.swept });
      },
    },
    {
      path: '/archived-manager/pending',
      method: 'GET',
      handler: async (request, response) => {
        json(response, 200, { ok: true, ...(await manager.pendingView()) });
      },
    },
    {
      path: '/archived-manager/pending/add',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const items = await manager.addPending(payload.items, payload.reason);
        json(response, 200, { ok: true, items });
      },
    },
    {
      path: '/archived-manager/pending/forget',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const items = await manager.forgetPending(payload.items);
        json(response, 200, { ok: true, items });
      },
    },
    {
      path: '/archived-manager/pending/clear',
      method: 'POST',
      handler: async (request, response) => {
        const items = await manager.clearPending();
        json(response, 200, { ok: true, items });
      },
    },
    {
      path: '/archived-manager/diagnose',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        json(response, 200, { ok: true, ...await manager.diagnose(payload.items ?? payload.ids) });
      },
    },
    {
      path: '/archived-manager/update/status',
      method: 'GET',
      handler: async (request, response) => json(response, 200, { ok: true, ...await updater.status() }),
    },
    {
      path: '/archived-manager/update/check',
      method: 'POST',
      handler: async (request, response) => json(response, 200, { ok: true, ...await updater.check() }),
    },
    {
      path: '/archived-manager/update/prepare',
      method: 'POST',
      handler: async (request, response) => json(response, 200, { ok: true, ...await updater.prepare(await body(request)) }),
    },
    {
      path: '/archived-manager/health',
      method: 'GET',
      handler: async (request, response) => {
        json(response, 200, { ok: true, version: manager.version, home: manager.home });
      },
    },
  ];

  return routes.map((route) => ({
    kind: 'exact',
    path: route.path,
    handler: async (request, response) => {
      if (!guard(request, response, route.method)) return;
      try {
        await route.handler(request, response);
      } catch (error) {
        const code = error instanceof ManagerError || error instanceof UpdateError || error.code === 'protected-content' ? error.code : 'storage';
        const status = code === 'invalid' || code === 'bad-request' ? 400 : code === 'storage' ? 503 : 409;
        json(response, status, { ok: false, code, error: error instanceof Error ? error.message : String(error) });
      }
    },
  }));
}
