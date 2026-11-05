/**
 * dsh-archived-manager — host half.
 *
 * Lists the Workspace registry's archived Sessions and performs the two
 * deletion tiers this plugin owns:
 *
 *   hide   move the Session directory out of <DSH_HOME>/sessions into
 *          <DSH_HOME>/archived-manager/trash/<batch>/ and drop the archive
 *          id. The files are kept and the entry is restorable.
 *   purge  remove the Session directory permanently, then drop the archive id.
 *
 * Safety rules, all enforced here rather than in the browser:
 *   - ids must be UUID shaped and must currently be archived;
 *   - the directory is located by exact readdir match (never by joining a
 *     client-supplied path), and the resolved path must stay under the
 *     sessions root;
 *   - a running Agent refuses the operation;
 *   - operations are serialized so the same id cannot race itself;
 *   - the archive id is only dropped through the registry's public
 *     unarchiveSession()/detachSession(), never by editing workspace.json.
 */
import { promises as fs, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createUpdater } from './update.js';
import { UpdateError } from './update-release.js';
import { assertDirectory, readRegularFile, inspectSession, deleteSession, moveSession, recordedFiles, protectedContent } from './session-files.js';

const ID_RE = /^(?:session-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BATCH_RE = /^[0-9A-Za-z:._-]{1,80}$/;
const MAX_IDS = 200;
const MAX_BODY_BYTES = 64 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = new Set([0, 7, 30, 90]);
const PACKAGE_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

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

async function statSafe(path) {
  try {
    return await fs.stat(path);
  } catch {
    return undefined;
  }
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

async function dirSize(directory) {
  return (await dirStats(directory)).bytes;
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
  let tail = Promise.resolve();
  let updatePending = false;
  let attachmentCache = { at: 0, value: { bytes: 0, files: 0 } };

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
    if (!registry) return undefined;
    const ids = Array.isArray(registry.archivedSessionIds) ? registry.archivedSessionIds : [];
    return new Set(ids);
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
    for (const file of [join(projcacheRoot, bare + '.json'), join(projcacheRoot, id + '.json')]) {
      try {
        const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
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

  /** Drop the derived projection cache for a session that is being permanently removed. */
  async function forgetProjection(id) {
    try {
      await assertDirectory(home, projcacheRoot);
      const bare = id.startsWith('session-') ? id.slice('session-'.length) : id;
      await fs.rm(join(projcacheRoot, bare + '.json'), { force: true });
    } catch {
      /* derived cache */
    }
  }

  /** Newest session log mtime, used as the last-used fallback. */
  async function newestLogMtime(directory) {
    let newest;
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !/^session.*\.jsonl(\.zstd)?$/.test(entry.name)) continue;
        const stat = await fs.stat(join(directory, entry.name)).catch(() => undefined);
        if (stat && (newest === undefined || stat.mtimeMs > newest)) newest = stat.mtimeMs;
      }
    } catch {
      /* missing directory */
    }
    return newest;
  }

  function workspaceOf(cwd) {
    const registry = service(ctx, 'workspaceRegistry');
    if (registry && typeof registry.list === 'function' && typeof cwd === 'string') {
      const wanted = cwd.replace(/[\\/]+$/, '');
      for (const entity of registry.list()) {
        if (entity && typeof entity.path === 'string' && entity.path.replace(/[\\/]+$/, '') === wanted) {
          return { id: entity.id, title: entity.title, path: entity.path };
        }
      }
    }
    return typeof cwd === 'string' ? { id: undefined, title: basename(cwd) || cwd, path: cwd } : undefined;
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

  async function readArchiveTimes() {
    try {
      const parsed = JSON.parse(await fs.readFile(archiveTimesPath, 'utf8'));
      const times = parsed && typeof parsed.times === 'object' && parsed.times !== null ? parsed.times : {};
      return { exists: true, initialized: parsed && parsed.initialized === true, times };
    } catch {
      return { exists: false, initialized: false, times: {} };
    }
  }

  let syncInFlight = null;

  /**
   * Record when each archived id was first observed. On the very first run the
   * current ids are stored as null (unknown) so pre-existing archives are never
   * mislabeled with the install time; later ids get the observation time.
   */
  async function syncArchiveTimes() {
    if (syncInFlight !== null) return syncInFlight;
    syncInFlight = (async () => {
      const ids = archivedSet();
      const current = await readArchiveTimes();
      // The registry is not ready yet: never prune or stamp against an
      // unavailable service, or a boot race would erase every timestamp.
      if (ids === undefined) return current.times;
      const times = { ...current.times };
      const firstRun = !current.exists || current.initialized !== true;
      const now = Date.now();
      let changed = firstRun;
      if (firstRun) {
        // Unknown history: mark what is archived now as "not recorded" rather
        // than pretending the observation time is the archive time.
        for (const id of ids) times[id] = null;
      } else {
        for (const id of ids) {
          if (!(id in times)) {
            times[id] = now;
            changed = true;
          }
        }
      }
      for (const id of Object.keys(times)) {
        if (!ids.has(id)) {
          delete times[id];
          changed = true;
        }
      }
      if (changed) {
        await fs.mkdir(dirname(archiveTimesPath), { recursive: true });
        await assertDirectory(home, dirname(archiveTimesPath));
        await writeJsonAtomic(archiveTimesPath, { version: 2, initialized: true, updatedAt: now, times });
      }
      return times;
    })().finally(() => {
      syncInFlight = null;
    });
    return syncInFlight;
  }

  /** Drop one id's record so a later re-archive gets a fresh timestamp. */
  async function forgetArchiveTime(id) {
    try {
      const current = await readArchiveTimes();
      if (!current.exists || !(id in current.times)) return;
      delete current.times[id];
      await fs.mkdir(dirname(archiveTimesPath), { recursive: true });
      await assertDirectory(home, dirname(archiveTimesPath));
      await writeJsonAtomic(archiveTimesPath, {
        version: 2,
        initialized: current.initialized === true,
        updatedAt: Date.now(),
        times: current.times,
      });
    } catch {
      /* best effort; the periodic sync also removes absent ids */
    }
  }

  /** Best-effort re-attach after a restore, so the session returns to its workspace. */
  async function reattach(id, workspacePath) {
    const registry = service(ctx, 'workspaceRegistry');
    if (typeof workspacePath !== 'string') return { attached: false, warning: '会话已恢复到原位置；没有原工作区记录，请在侧栏检查未分组会话。' };
    if (!registry || typeof registry.list !== 'function') return { attached: false, warning: '会话已恢复到原位置；工作区服务不可用，尚未重新关联原工作区。' };
    try {
      for (const entity of registry.list()) {
        if (entity && entity.path === workspacePath && typeof entity.attachSession === 'function') {
          await entity.attachSession(id);
          return { attached: true };
        }
      }
    } catch {
      return { attached: false, warning: '会话已恢复到原位置；重新关联原工作区失败，请在侧栏检查未分组会话。' };
    }
    return { attached: false, warning: '会话已恢复到原位置；原工作区已不存在，请在侧栏检查未分组会话。' };
  }

  async function clearRegistry(id) {
    const registry = service(ctx, 'workspaceRegistry');
    if (!registry) return;
    // Detach first, then unarchive: doing it the other way round briefly makes
    // the session visible in the sidebar before it is detached again.
    if (typeof registry.list === 'function') {
      try {
        for (const entity of registry.list()) {
          if (entity && typeof entity.detachSession === 'function' && Array.isArray(entity.sessionIds)
            && entity.sessionIds.includes(id)) {
            await entity.detachSession(id);
            break;
          }
        }
      } catch {
        /* best effort */
      }
    }
    if (typeof registry.unarchiveSession === 'function') {
      try {
        await registry.unarchiveSession(id);
      } catch {
        /* files are already gone; the dangling id is filtered by the kernel */
      }
    }
  }

  async function runningAgent(id) {
    const agents = service(ctx, 'agents');
    const agent = agents && typeof agents.get === 'function' ? agents.get(id) : undefined;
    return agent && agent.status === 'running' ? agent : undefined;
  }

  async function residentSession(id) {
    const sessions = service(ctx, 'sessions');
    return Boolean(sessions && typeof sessions.get === 'function' && sessions.get(id));
  }

  /** Stop the reminders bound to a session before its record or files disappear. */
  async function stopReminders(id) {
    const schedule = service(ctx, 'schedule');
    if (!schedule) return { stopped: 0 };
    let stopped = 0;
    try {
      if (typeof schedule.list === 'function') {
        const tasks = await schedule.list({ sessionId: id });
        if (Array.isArray(tasks)) stopped = tasks.length;
      }
    } catch {
      /* the count is best-effort; stopping below is what matters */
    }
    try {
      if (typeof schedule.stopSessionTasks === 'function') await schedule.stopSessionTasks(id);
    } catch (error) {
      return { stopped, warning: error instanceof Error ? error.message : String(error) };
    }
    return { stopped };
  }

  /** Total size/count of the content-addressed attachment store (shared by sessions). */
  async function attachmentStats() {
    const now = Date.now();
    if (now - attachmentCache.at < 60_000) return attachmentCache.value;
    const value = await dirStats(join(home, 'attachments'));
    attachmentCache = { at: now, value };
    return value;
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
    if (manifest.entries.length !== 0) return;
    const names = await fs.readdir(batchDir);
    if (names.length !== 1 || names[0] !== 'manifest.json') return;
    await readRegularFile(manifestPath, 4 * 1024 * 1024);
    await fs.unlink(manifestPath);
    await fs.rmdir(batchDir).catch(() => {}); // new siblings are preserved
  }

  async function discardEntry(batch, id) {
    const { manifest, batchDir, fingerprint } = await readManifest(batch);
    const matches = manifest.entries.filter((entry) => entry && entry.id === id);
    if (matches.length !== 1) throw protectedContent('隔离清单对象不唯一');
    const entry = matches[0];
    const target = join(batchDir, assertEntryDir(entry.dir));
    let stat;
    try { stat = await fs.lstat(target); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    let bytes = 0, reminders = { stopped: 0 };
    if (stat !== undefined) {
      if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
      const checked = await inspectSession(home, target, id);
      bytes = checked.files.reduce((sum, file) => sum + file.size, 0);
      await deleteSession(checked);
      reminders = await stopReminders(id);
      await forgetProjection(id);
    }
    manifest.entries = manifest.entries.filter((value) => value !== entry);
    await saveManifest(batch, manifest, fingerprint);
    return { id, batch, ok: true, action: 'discard', bytes, reminders: reminders.stopped, warning: reminders.warning };
  }

  async function processTrash(eligible) {
    let batches;
    try { await assertDirectory(home, trashRoot); batches = await fs.readdir(trashRoot, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return { removed: 0, bytes: 0, failed: 0, results: [] }; throw error; }
    const results = [];
    for (const batch of batches) {
      if (!BATCH_RE.test(batch.name)) continue;
      try {
        const { manifest } = await readManifest(batch.name);
        for (const entry of manifest.entries) {
          if (!eligible(entry)) continue;
          try { results.push(await discardEntry(batch.name, assertId(entry?.id))); }
          catch (error) { results.push({ id: entry?.id, batch: batch.name, ok: false, code: error.code || 'protected-content', error: error.message }); }
        }
        // Empty legacy batches are left in place if anything else is present.
        if (manifest.entries.length === 0) await saveManifest(batch.name, manifest);
      } catch (error) {
        results.push({ batch: batch.name, ok: false, code: error.code || 'protected-content', error: error.message });
      }
    }
    return { removed: results.filter((r) => r.ok).length, bytes: results.reduce((sum, r) => sum + (r.ok ? r.bytes : 0), 0), failed: results.filter((r) => !r.ok).length, results };
  }

  async function sweepTrashUnlocked(days) {
    if (!Number.isInteger(days) || days <= 0) return { removed: 0, bytes: 0, failed: 0, results: [] };
    const cutoff = Date.now() - days * DAY_MS;
    return processTrash((entry) => entry && typeof entry.movedAt === 'number' && entry.movedAt <= cutoff);
  }

  async function sweepTrash(days) {
    return serial(() => sweepTrashUnlocked(days));
  }

  async function saveSettings(payload) {
    const raw = payload && payload.trashRetentionDays;
    if (raw === undefined || raw === null) {
      throw new ManagerError('invalid', 'trashRetentionDays must be one of 0, 7, 30, 90');
    }
    const days = Number(raw);
    if (!Number.isInteger(days) || !RETENTION_DAYS.has(days)) {
      throw new ManagerError('invalid', 'trashRetentionDays must be one of 0, 7, 30, 90');
    }
    return serial(async () => {
      await fs.mkdir(dirname(settingsPath), { recursive: true });
      await assertDirectory(home, dirname(settingsPath));
      await writeJsonAtomic(settingsPath, { version: 1, trashRetentionDays: days, updatedAt: Date.now() });
      let swept = { removed: 0, bytes: 0 };
      if (days > 0) {
        try {
          swept = await sweepTrashUnlocked(days);
        } catch (error) {
          swept = { removed: 0, bytes: 0, warning: error instanceof Error ? error.message : String(error) };
        }
      }
      return { settings: { trashRetentionDays: days }, swept };
    });
  }

  async function unarchive(ids) {
    const targets = normalizeIds(ids);
    return serial(async () => {
      const archivedIds = archived();
      const dirs = await sessionDirs();
      const registry = service(ctx, 'workspaceRegistry');
      const results = [];
      for (const id of targets) {
        try {
          if (!archivedIds.has(id)) throw new ManagerError('not-archived', 'session is not archived');
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const path = await locate(id, dirs);
          if (path === undefined) throw new ManagerError('files-missing', 'session files are gone; clean the record instead');
          if (!registry || typeof registry.unarchiveSession !== 'function') {
            throw new ManagerError('storage', 'workspace registry is unavailable');
          }
          await registry.unarchiveSession(id);
          await forgetArchiveTime(id);
          results.push({ id, ok: true, action: 'unarchive' });
        } catch (error) {
          results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
      }
      return results;
    });
  }

  async function discard(items, confirm) {
    if (confirm !== 'DISCARD') throw new ManagerError('confirm', 'confirmation missing');
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_IDS) throw new ManagerError('invalid', '1–200 items required');
    return serial(async () => {
      const results = [];
      for (const item of items) {
        try { results.push(await discardEntry(item?.batch, assertId(item?.id))); }
        catch (error) { results.push({ id: item?.id, batch: item?.batch, ok: false, error: error.message, code: error.code }); }
      }
      return results;
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

  function sessionTitle(checked) {
    const latest = checked.logs.reduce((best, log) => !best || log.header.version > best.header.version ? log : best, null);
    return latest?.events.findLast((event) => event.type === 'session/title' && typeof event.data?.title === 'string' && event.data.title.trim())?.data.title;
  }

  /** Size means validated Session containers, never arbitrary sibling outputs. */
  async function sessionLogStats(directory, id) {
    try {
      const checked = await inspectSession(home, directory, id, { allowUnknown: true });
      const title = sessionTitle(checked);
      return { bytes: checked.files.reduce((sum, file) => sum + file.size, 0), warning: checked.warning, title, sizeKnown: true };
    } catch (error) {
      return { bytes: 0, sizeKnown: false, warning: error.code === 'ENOENT' ? '会话日志已不存在' : '无法确认会话日志大小，未计入日志占用' };
    }
  }

  async function list() {
    const ids = [...archived()];
    const [dirs, snap, times] = await Promise.all([sessionDirs(), snapshots(), syncArchiveTimes()]);
    const items = [];
    for (const id of ids) {
      let path, pathError;
      try { path = await locate(id, dirs); } catch (error) { pathError = error; }
      const snapshot = snap.get(id);
      const header = snapshot ? snapshot.header : undefined;
      const meta = await metadataOf(id);
      const logStats = path === undefined ? { bytes: 0, sizeKnown: !pathError } : await sessionLogStats(path, id);
      const sizeBytes = logStats.bytes;
      const logMtime = path === undefined ? undefined : await newestLogMtime(path);
      const lastUsedAt = meta.lastPromptAt !== undefined
        ? meta.lastPromptAt
        : typeof logMtime === 'number' ? logMtime : null;
      const archivedAt = typeof times[id] === 'number' ? times[id] : null;
      items.push({
        id,
        missing: path === undefined && !pathError,
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
        running: Boolean(await runningAgent(id)),
      });
    }
    items.sort((a, b) => (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0) || a.id.localeCompare(b.id));
    const removed = await listRemoved();
    const attachments = await attachmentStats();
    return { items, removed, removedWarnings: removed.warnings || [], attachments };
  }

  async function listRemoved() {
    let batches;
    try { batches = await fs.readdir(trashRoot, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
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
          const stats = await sessionLogStats(join(batchDir, entry.dir), entry.id);
          entries.push({ ...entry, title: entry.title && entry.title !== entry.id ? entry.title : stats.title || entry.id, bytes: stats.bytes, sizeKnown: stats.sizeKnown, ...(stats.warning ? { sizeWarning: stats.warning } : {}), batch: batch.name });
        }
        const known = new Set(['manifest.json', ...manifest.entries.map((entry) => entry?.dir)]);
        if ((await fs.readdir(batchDir)).some((name) => !known.has(name))) warnings.push({ batch: batch.name, reason: '批次内含未列入会话清单的内容，已保留' });
      } catch (error) { warnings.push({ batch: batch.name, reason: error.message || '隔离清单无法读取，已保留' }); }
    }
    entries.sort((a, b) => (b.movedAt || 0) - (a.movedAt || 0));
    Object.defineProperty(entries, 'warnings', { value: warnings });
    return entries;
  }

  async function hide(ids) {
    const targets = normalizeIds(ids);
    return serial(async () => {
      const archivedIds = archived();
      const dirs = await sessionDirs();
      const snap = await snapshots();
      const batch = stamp();
      const batchDir = join(trashRoot, batch);
      const manifestPath = join(batchDir, 'manifest.json');
      const entries = [];
      const results = [];
      for (const id of targets) {
        try {
          if (!archivedIds.has(id)) throw new ManagerError('not-archived', 'session is not archived');
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const path = await locate(id, dirs);
          if (path === undefined) {
            const reminders = await stopReminders(id);
            await clearRegistry(id);
            await forgetArchiveTime(id);
            results.push({ id, ok: true, action: 'forget', bytes: 0, reminders: reminders.stopped, warning: reminders.warning, note: 'no directory on disk; archive record cleared' });
            continue;
          }
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const checked = await inspectSession(home, path, id);
          const size = checked.files.reduce((sum, file) => sum + file.size, 0);
          await fs.mkdir(dirname(trashRoot), { recursive: true });
          await assertDirectory(home, dirname(trashRoot));
          await fs.mkdir(trashRoot, { recursive: true });
          await assertDirectory(home, trashRoot);
          if (entries.length === 0) await fs.mkdir(batchDir).catch((error) => { if (error.code !== 'EEXIST') throw error; });
          await assertDirectory(home, batchDir);
          const destination = join(batchDir, basename(path));
          if (await fs.lstat(destination).catch(() => undefined)) throw new ManagerError('conflict', 'quarantine target already exists');
          const entry = {
            id,
            original: path,
            dir: basename(path),
            bytes: size,
            movedAt: Date.now(),
            title: (await metadataOf(id)).title || sessionTitle(checked) || id,
            workspacePath: snap.get(id)?.header?.cwd,
            resident: await residentSession(id),
          };
          // Commit the recovery coordinates before moving any data. A crash or
          // failed move can leave a stale entry, never an unindexed moved log.
          const next = [...entries, entry];
          await writeJsonAtomic(manifestPath, { version: 1, batch, createdAt: Date.now(), entries: next });
          try {
            await moveSession(checked, home, destination);
          } catch (error) {
            if (await fs.lstat(destination).catch(() => undefined)) entries.push(entry);
            else await saveManifest(batch, { version: 1, batch, entries });
            throw error;
          }
          entries.push(entry);
          const reminders = await stopReminders(id);
          await clearRegistry(id);
          await forgetArchiveTime(id);
          results.push({ id, ok: true, action: 'hide', bytes: size, reminders: reminders.stopped, warning: reminders.warning });
        } catch (error) {
          results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
      }
      return results;
    });
  }

  async function purge(ids, confirm) {
    if (confirm !== 'PURGE') throw new ManagerError('confirm', 'confirmation missing');
    const targets = normalizeIds(ids);
    return serial(async () => {
      const archivedIds = archived();
      const dirs = await sessionDirs();
      const results = [];
      for (const id of targets) {
        try {
          if (!archivedIds.has(id)) throw new ManagerError('not-archived', 'session is not archived');
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const path = await locate(id, dirs);
          if (path === undefined) {
            const reminders = await stopReminders(id);
            await clearRegistry(id);
            await forgetArchiveTime(id);
            results.push({ id, ok: true, action: 'forget', bytes: 0, reminders: reminders.stopped, warning: reminders.warning, note: 'no directory on disk; archive record cleared' });
            continue;
          }
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const checked = await inspectSession(home, path, id);
          const size = checked.files.reduce((sum, file) => sum + file.size, 0);
          await deleteSession(checked);
          const reminders = await stopReminders(id);
          await clearRegistry(id);
          await forgetArchiveTime(id);
          await forgetProjection(id);
          results.push({ id, ok: true, action: 'purge', bytes: size, reminders: reminders.stopped, warning: reminders.warning, resident: await residentSession(id) });
        } catch (error) {
          results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
      }
      return results;
    });
  }

  /**
   * Clear archive records whose session directory is already gone. This is the
   * only record-only operation: a session that still has files is refused so a
   * hide/purge decision is never silently reduced to record cleanup.
   */
  async function forget(ids) {
    const targets = normalizeIds(ids);
    return serial(async () => {
      const archivedIds = archived();
      const dirs = await sessionDirs();
      const results = [];
      for (const id of targets) {
        try {
          if (!archivedIds.has(id)) throw new ManagerError('not-archived', 'session is not archived');
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const path = await locate(id, dirs);
          if (path !== undefined) {
            throw new ManagerError('files-exist', 'session files still exist; use hide or purge instead');
          }
          const reminders = await stopReminders(id);
          await clearRegistry(id);
          await forgetArchiveTime(id);
          await forgetProjection(id);
          results.push({ id, ok: true, action: 'forget', bytes: 0, reminders: reminders.stopped, warning: reminders.warning });
        } catch (error) {
          results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
      }
      return results;
    });
  }

  async function restore(items) {
    if (!Array.isArray(items) || items.length === 0) throw new ManagerError('invalid', 'items required');
    if (items.length > MAX_IDS) throw new ManagerError('invalid', 'too many items');
    return serial(async () => {
      let batches;
      try {
        batches = new Set((await fs.readdir(trashRoot, { withFileTypes: true }))
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name));
      } catch {
        batches = new Set();
      }
      const results = [];
      for (const item of items) {
        const id = item && typeof item.id === 'string' ? item.id : '';
        const batch = item && typeof item.batch === 'string' ? item.batch : '';
        try {
          if (!ID_RE.test(id)) throw new ManagerError('invalid', 'invalid session id');
          if (!BATCH_RE.test(batch) || !batches.has(batch)) throw new ManagerError('invalid', 'unknown quarantine batch');
          const manifestPath = join(trashRoot, batch, 'manifest.json');
          const { manifest, fingerprint } = await readManifest(batch);
          const index = (manifest.entries || []).findIndex((entry) => entry.id === id);
          if (index < 0) throw new ManagerError('not-found', 'entry is not in this batch');
          const entry = manifest.entries[index];
          const dir = assertEntryDir(entry.dir);
          if (typeof entry.original !== 'string') throw protectedContent('原位置无效');
          const original = resolve(entry.original);
          if (![id, id.startsWith('session-') ? id.slice(8) : 'session-' + id].includes(basename(original))) throw protectedContent('原目录与会话不符');
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const root = await physicalRoot();
          if (original === root || !original.startsWith(root + sep) || dirname(dirname(original)) !== root) throw new ManagerError('invalid', 'original path escapes the sessions root');
          if (await statSafe(original)) throw new ManagerError('exists', 'original directory already exists');
          await assertDirectory(home, sessionsRoot);
          await fs.mkdir(dirname(original), { recursive: true });
          await assertDirectory(home, dirname(original));
          const checked = await inspectSession(home, join(trashRoot, batch, dir), id);
          await moveSession(checked, home, original);
          const association = await reattach(id, entry.workspacePath);
          manifest.entries.splice(index, 1);
          await saveManifest(batch, manifest, fingerprint);
          results.push({ id, batch, ok: true, action: 'restore', path: original, workspaceAttached: association.attached, ...(association.warning ? { warning: association.warning } : {}) });
        } catch (error) {
          results.push({ id, batch, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
      }
      return results;
    });
  }

  async function emptyTrash(confirm, expectedItems) {
    if (confirm !== 'EMPTY') throw new ManagerError('confirm', 'confirmation missing');
    if (!Array.isArray(expectedItems)) throw new ManagerError('invalid', '需要清空确认时的完整隔离记录');
    const key = (entry) => {
      if (!entry || !ID_RE.test(entry.id) || typeof entry.batch !== 'string' || !BATCH_RE.test(entry.batch)) throw new ManagerError('invalid', '隔离确认记录无效');
      return entry.batch + ':' + entry.id;
    };
    const expected = expectedItems.map(key).sort();
    return serial(async () => {
      const current = (await listRemoved()).map(key).sort();
      if (JSON.stringify(current) !== JSON.stringify(expected)) throw new ManagerError('state-changed', '隔离区已变化，请刷新后重新确认清空范围');
      return processTrash(() => true);
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
    const checked = await inspectSession(home, directory, id, { allowUnknown: true });
    const latest = checked.logs.sort((a, b) => b.header.version - a.header.version)[0];
    workspacePath = latest.header.cwd || workspacePath;
    return { files: recordedFiles(latest.events), workspacePath, warning: checked.warning };
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

  // Observe archives at their source: a 30s sweep stamps ids the first time
  // they appear in the archive set, without touching the registry itself.
  if (typeof ctx.effect === 'function') {
    try {
      ctx.effect(() => {
        void syncArchiveTimes().catch(() => {});
        const timer = setInterval(() => {
          void syncArchiveTimes().catch(() => {});
        }, 30_000);
        if (timer && typeof timer.unref === 'function') timer.unref();
        return () => clearInterval(timer);
      }, 'archived-manager: archive-time sync');
    } catch {
      /* test contexts without a Cordis effect */
    }
  }

  if (typeof ctx.effect === 'function') {
    try {
      ctx.effect(() => {
        const run = async () => {
          try {
            const settings = await readSettings();
            if (settings.trashRetentionDays > 0) await sweepTrash(settings.trashRetentionDays);
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
    syncArchiveTimes,
    list,
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
  const manager = createManager(ctx, { isUpdating: () => updater?.isUpdating() ?? false });
  const webServer = options.webServer ?? service(ctx, 'webServer');
  updater = createUpdater({
    home: manager.home,
    pluginManager: options.pluginManager ?? service(ctx, 'pluginManager'),
    webServer,
    runtimeVersion: manager.version,
    enterUpdate: manager.enterUpdate,
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
        const results = await manager.hide(payload.ids);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/purge',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.purge(payload.ids, payload.confirm);
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
        const results = await manager.restore(payload.items);
        json(response, 200, { ok: results.every((result) => result.ok), results });
      },
    },
    {
      path: '/archived-manager/discard',
      method: 'POST',
      handler: async (request, response) => {
        const payload = await body(request);
        const results = await manager.discard(payload.items, payload.confirm);
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
        const result = await manager.emptyTrash(payload.confirm, payload.items);
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
        const payload = await body(request);
        const saved = await manager.saveSettings(payload);
        json(response, 200, { ok: true, settings: saved.settings, swept: saved.swept });
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
