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
import { promises as fs } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';

const ID_RE = /^(?:session-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BATCH_RE = /^[0-9A-Za-z:._-]{1,80}$/;
const MAX_IDS = 200;
const MAX_BODY_BYTES = 64 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_DAYS = new Set([0, 7, 30, 90]);

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
  const temporary = path + '.tmp-' + process.pid + '-' + Date.now();
  await fs.writeFile(temporary, JSON.stringify(value, null, 2));
  await fs.rename(temporary, path);
}

/** Create the manager bound to one host context. */
export function createManager(ctx) {
  const home = resolveHome(ctx);
  const sessionsRoot = join(home, 'sessions');
  const trashRoot = join(home, 'archived-manager', 'trash');
  const projcacheRoot = join(home, 'storages', 'session_projcache', 'sessions');
  const archiveTimesPath = join(home, 'archived-manager', 'archive-times.json');
  const settingsPath = join(home, 'archived-manager', 'settings.json');
  let tail = Promise.resolve();
  let attachmentCache = { at: 0, value: { bytes: 0, files: 0 } };

  /** Serialize mutating operations; reads stay concurrent. */
  function serial(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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
      projects = await fs.readdir(sessionsRoot, { withFileTypes: true });
    } catch {
      return map;
    }
    for (const project of projects) {
      if (!project.isDirectory()) continue;
      const projectPath = join(sessionsRoot, project.name);
      let entries;
      try {
        entries = await fs.readdir(projectPath, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) map.set(entry.name, join(projectPath, entry.name));
      }
    }
    return map;
  }

  async function physicalRoot() {
    return await fs.realpath(sessionsRoot).catch(() => resolve(sessionsRoot));
  }

  async function locate(id, dirs) {
    const map = dirs || (await sessionDirs());
    const root = await physicalRoot();
    const candidates = [id];
    if (id.startsWith('session-')) candidates.push(id.slice('session-'.length));
    else candidates.push('session-' + id);
    for (const candidate of candidates) {
      const found = map.get(candidate);
      if (found !== undefined) {
        const physical = await fs.realpath(found).catch(() => undefined);
        if (physical === undefined) continue;
        if (physical !== root && !physical.startsWith(root + sep)) {
          throw new ManagerError('invalid', 'session path escapes the sessions root');
        }
        return physical;
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
    if (!registry || typeof workspacePath !== 'string' || typeof registry.list !== 'function') return;
    try {
      for (const entity of registry.list()) {
        if (entity && entity.path === workspacePath && typeof entity.attachSession === 'function') {
          await entity.attachSession(id);
          return;
        }
      }
    } catch {
      /* the session still reappears as an ungrouped row */
    }
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

  /** Remove quarantine entries older than the retention window. Caller serializes. */
  async function sweepTrashUnlocked(days) {
    if (!Number.isInteger(days) || days <= 0) return { removed: 0, bytes: 0 };
    const cutoff = Date.now() - days * DAY_MS;
    let batches;
    try {
      batches = await fs.readdir(trashRoot, { withFileTypes: true });
    } catch {
      return { removed: 0, bytes: 0 };
    }
    let removed = 0;
    let bytes = 0;
    for (const batch of batches) {
      if (!batch.isDirectory() || !BATCH_RE.test(batch.name)) continue;
      const manifestPath = join(trashRoot, batch.name, 'manifest.json');
      let manifest;
      try {
        manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      } catch {
        continue;
      }
      if (!manifest || !Array.isArray(manifest.entries)) continue;
      let changed = false;
      const kept = [];
      for (const entry of manifest.entries) {
        const movedAt = entry && typeof entry.movedAt === 'number' ? entry.movedAt : undefined;
        if (movedAt === undefined || movedAt > cutoff) {
          kept.push(entry);
          continue;
        }
        try {
          const id = assertId(entry.id);
          const dir = assertEntryDir(entry.dir);
          const target = join(trashRoot, batch.name, dir);
          const stat = await fs.lstat(target).catch(() => undefined);
          if (stat === undefined) {
            changed = true; // stale manifest entry; never touch a restored session
            continue;
          }
          const size = typeof entry.bytes === 'number' ? entry.bytes : await dirSize(target);
          await stopReminders(id);
          if (stat.isSymbolicLink()) await fs.unlink(target);
          else await fs.rm(target, { recursive: true, force: true });
          await forgetProjection(id);
          removed += 1;
          bytes += size;
          changed = true;
        } catch {
          kept.push(entry);
        }
      }
      if (!changed) continue;
      if (kept.length === 0) await fs.rm(join(trashRoot, batch.name), { recursive: true, force: true });
      else await writeJsonAtomic(manifestPath, { ...manifest, entries: kept });
    }
    return { removed, bytes };
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
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
          const index = (manifest.entries || []).findIndex((entry) => entry.id === id);
          if (index < 0) throw new ManagerError('not-found', 'entry is not in this batch');
          const entry = manifest.entries[index];
          const dir = assertEntryDir(entry.dir);
          const target = join(trashRoot, batch, dir);
          const stat = await fs.lstat(target).catch(() => undefined);
          const size = stat === undefined ? 0 : typeof entry.bytes === 'number' ? entry.bytes : await dirSize(target);
          let reminders = { stopped: 0 };
          if (stat !== undefined) {
            if (stat.isSymbolicLink()) await fs.unlink(target);
            else await fs.rm(target, { recursive: true, force: true });
            reminders = await stopReminders(id);
            await forgetProjection(id);
          }
          manifest.entries.splice(index, 1);
          if (manifest.entries.length === 0) {
            await fs.rm(join(trashRoot, batch), { recursive: true, force: true });
          } else {
            await writeJsonAtomic(manifestPath, manifest);
          }
          results.push({ id, ok: true, action: 'discard', bytes: size, reminders: reminders.stopped, warning: reminders.warning });
        } catch (error) {
          results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
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

  async function list() {
    const ids = [...archived()];
    const [dirs, snap, times] = await Promise.all([sessionDirs(), snapshots(), syncArchiveTimes()]);
    const items = [];
    for (const id of ids) {
      const path = await locate(id, dirs).catch(() => undefined);
      const snapshot = snap.get(id);
      const header = snapshot ? snapshot.header : undefined;
      const meta = await metadataOf(id);
      const sizeBytes = path === undefined ? 0 : await dirSize(path);
      const logMtime = path === undefined ? undefined : await newestLogMtime(path);
      const lastUsedAt = meta.lastPromptAt !== undefined
        ? meta.lastPromptAt
        : typeof logMtime === 'number' ? logMtime : null;
      const archivedAt = typeof times[id] === 'number' ? times[id] : null;
      items.push({
        id,
        missing: path === undefined,
        path,
        title: meta.title || id,
        workspace: workspaceOf(header ? header.cwd : undefined),
        createdAt: header && typeof header.createdAt === 'number' ? header.createdAt : null,
        lastUsedAt,
        archivedAt,
        sizeBytes,
        resident: await residentSession(id),
        running: Boolean(await runningAgent(id)),
      });
    }
    items.sort((a, b) => (b.lastUsedAt || b.createdAt || 0) - (a.lastUsedAt || a.createdAt || 0) || a.id.localeCompare(b.id));
    const removed = await listRemoved();
    const attachments = await attachmentStats();
    return { items, removed, attachments };
  }

  async function listRemoved() {
    let batches;
    try {
      batches = await fs.readdir(trashRoot, { withFileTypes: true });
    } catch {
      return [];
    }
    const entries = [];
    for (const batch of batches) {
      if (!batch.isDirectory() || !BATCH_RE.test(batch.name)) continue;
      try {
        const manifest = JSON.parse(await fs.readFile(join(trashRoot, batch.name, 'manifest.json'), 'utf8'));
        for (const entry of manifest.entries || []) {
          entries.push({ ...entry, batch: batch.name });
        }
      } catch {
        /* incomplete batch */
      }
    }
    entries.sort((a, b) => (b.movedAt || 0) - (a.movedAt || 0));
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
          const path = await locate(id, dirs);
          if (path === undefined) {
            const reminders = await stopReminders(id);
            await clearRegistry(id);
            await forgetArchiveTime(id);
            results.push({ id, ok: true, action: 'forget', bytes: 0, reminders: reminders.stopped, warning: reminders.warning, note: 'no directory on disk; archive record cleared' });
            continue;
          }
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const size = await (async () => (await statSafe(path)) ? dirSize(path) : 0)();
          await fs.mkdir(batchDir, { recursive: true });
          const destination = join(batchDir, basename(path));
          if (await statSafe(destination)) throw new ManagerError('conflict', 'quarantine target already exists');
          await fs.rename(path, destination);
          entries.push({
            id,
            original: path,
            dir: basename(path),
            bytes: size,
            movedAt: Date.now(),
            title: (await metadataOf(id)).title || id,
            workspacePath: snap.get(id) && snap.get(id).header ? snap.get(id).header.cwd : undefined,
            resident: await residentSession(id),
          });
          let merged = entries;
          try {
            const existing = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
            if (existing && Array.isArray(existing.entries)) {
              merged = existing.entries.filter((entry) => !entries.some((next) => next.id === entry.id)).concat(entries);
            }
          } catch {
            /* first write */
          }
          await writeJsonAtomic(manifestPath, {
            version: 1,
            batch,
            createdAt: Date.now(),
            entries: merged,
          });
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
          const path = await locate(id, dirs);
          if (path === undefined) {
            const reminders = await stopReminders(id);
            await clearRegistry(id);
            await forgetArchiveTime(id);
            results.push({ id, ok: true, action: 'forget', bytes: 0, reminders: reminders.stopped, warning: reminders.warning, note: 'no directory on disk; archive record cleared' });
            continue;
          }
          if (await runningAgent(id)) throw new ManagerError('running', 'session is running; stop it first');
          const size = await (async () => (await statSafe(path)) ? dirSize(path) : 0)();
          await fs.rm(path, { recursive: true, force: true });
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
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
          const index = (manifest.entries || []).findIndex((entry) => entry.id === id);
          if (index < 0) throw new ManagerError('not-found', 'entry is not in this batch');
          const entry = manifest.entries[index];
          const dir = assertEntryDir(entry.dir);
          const original = resolve(entry.original);
          const root = await physicalRoot();
          if (original !== root && !original.startsWith(root + sep)) throw new ManagerError('invalid', 'original path escapes the sessions root');
          if (await statSafe(original)) throw new ManagerError('exists', 'original directory already exists');
          await fs.mkdir(dirname(original), { recursive: true });
          await fs.rename(join(trashRoot, batch, dir), original);
          await reattach(id, entry.workspacePath);
          manifest.entries.splice(index, 1);
          if (manifest.entries.length === 0) {
            await fs.rm(join(trashRoot, batch), { recursive: true, force: true });
          } else {
            await writeJsonAtomic(manifestPath, manifest);
          }
          results.push({ id, ok: true, action: 'restore', path: original });
        } catch (error) {
          results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error), code: error.code });
        }
      }
      return results;
    });
  }

  async function emptyTrash(confirm) {
    if (confirm !== 'EMPTY') throw new ManagerError('confirm', 'confirmation missing');
    return serial(async () => {
      let batches;
      try {
        batches = await fs.readdir(trashRoot, { withFileTypes: true });
      } catch {
        return { removed: 0, bytes: 0 };
      }
      let removed = 0;
      let bytes = 0;
      for (const batch of batches) {
        if (!batch.isDirectory() || !BATCH_RE.test(batch.name)) continue;
        try {
          const manifest = JSON.parse(await fs.readFile(join(trashRoot, batch.name, 'manifest.json'), 'utf8'));
          for (const entry of manifest.entries || []) {
            if (entry && typeof entry.id === 'string' && ID_RE.test(entry.id)) {
              try {
                const target = join(trashRoot, batch.name, assertEntryDir(entry.dir));
                if (await fs.lstat(target).catch(() => undefined)) {
                  await stopReminders(entry.id);
                  await forgetProjection(entry.id);
                }
              } catch {
                /* stale or malformed entry; the batch removal below is enough */
              }
            }
          }
        } catch {
          /* an unreadable batch is still removable */
        }
        bytes += await dirSize(join(trashRoot, batch.name));
        removed += 1;
        await fs.rm(join(trashRoot, batch.name), { recursive: true, force: true });
      }
      return { removed, bytes };
    });
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
    readSettings,
    saveSettings,
    sweepTrash,
    attachmentStats,
    version: '0.2.2',
  };
}

/** The exact-route handler set, shared by the plugin entry and the tests. */
export function createRoutes(ctx) {
  const manager = createManager(ctx);
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
  const body = (request) => new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
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
      path: '/archived-manager/list',
      method: 'GET',
      handler: async (request, response) => {
        const report = await manager.list();
        json(response, 200, { ok: true, items: report.items, removed: report.removed, attachments: report.attachments, version: manager.version });
      },
    },
    {
      path: '/archived-manager/removed',
      method: 'GET',
      handler: async (request, response) => {
        const removed = await manager.listRemoved();
        json(response, 200, { ok: true, removed });
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
        const payload = await body(request);
        const result = await manager.emptyTrash(payload.confirm);
        json(response, 200, { ok: true, ...result });
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
        const code = error instanceof ManagerError ? error.code : 'storage';
        const status = code === 'invalid' || code === 'bad-request' ? 400 : code === 'storage' ? 503 : 409;
        json(response, status, { ok: false, code, error: error instanceof Error ? error.message : String(error) });
      }
    },
  }));
}
