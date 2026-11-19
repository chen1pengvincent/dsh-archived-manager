import { createHash } from 'node:crypto';
import { constants, promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve } from 'node:path';
import { assertDirectory, readRegularFile, verifyInspection } from './session-files.js';

const LOCK_NAME = 'session.lock';

function occupied(cause) {
  return Object.assign(new Error('会话仍被 DSH 占用，请在宿主停止相关活动后重试。', { cause }), { code: 'occupied' });
}

function unavailable(cause) {
  return Object.assign(new Error('当前 DSH 无法确认会话的写入占用。', { cause }), { code: 'occupancy-unavailable' });
}

function persistenceRequire() {
  const entry = process.argv[1];
  const hostRequire = isAbsolute(entry || '') ? createRequire(entry) : createRequire(import.meta.url);
  return createRequire(hostRequire.resolve('@deepseek-ai/dsh-session-persistence-jsonl/package.json'));
}

// Use the same lock primitive as the running DSH JSONL persistence backend.
function windowsLock() {
  const kernel = persistenceRequire()('koffi').load('kernel32.dll');
  const create = kernel.func('__stdcall', 'CreateSemaphoreW', 'intptr', ['void*', 'int', 'int', 'str16']);
  const wait = kernel.func('__stdcall', 'WaitForSingleObject', 'uint', ['intptr', 'uint']);
  const release = kernel.func('__stdcall', 'ReleaseSemaphore', 'int', ['intptr', 'int', 'void*']);
  const close = kernel.func('__stdcall', 'CloseHandle', 'int', ['intptr']);
  return (path) => {
    const hash = createHash('sha256').update(resolve(path).toLowerCase()).digest('hex');
    const handle = create(null, 1, 1, 'Local\\dsh-session-lock-' + hash);
    if (!handle) throw unavailable();
    const result = wait(handle, 0);
    if (result !== 0) {
      close(handle);
      throw result === 0x102 ? occupied() : unavailable();
    }
    return { release: async () => { release(handle, 1, null); close(handle); } };
  };
}

export function createSessionOccupancy(ctx, { lockFile } = {}) {
  let posixLock = lockFile;
  let win32Lock;

  async function check(id) {
    const sessionId = id.replace(/^session-/, '');
    try {
      const agents = ctx.get('agents');
      if (agents?.get?.(sessionId)?.status === 'running' || (sessionId !== id && agents?.get?.(id)?.status === 'running')) throw occupied();
      if (typeof ctx.waterfall !== 'function') {
        if (lockFile) return;
        throw unavailable();
      }
      for (const candidate of id === sessionId ? [id] : [id, sessionId]) {
        const activities = await ctx.waterfall('workspace/session-activity', { sessionId: candidate }, () => Promise.resolve([]));
        if (!Array.isArray(activities)) throw unavailable();
        if (activities.length > 0) throw occupied();
      }
    } catch (error) {
      if (error.code === 'occupied' || error.code === 'occupancy-unavailable') throw error;
      throw unavailable(error);
    }
  }

  async function acquire(root, directory, exists) {
    await assertDirectory(root, directory);
    const path = join(directory, LOCK_NAME);
    let handle;
    try {
      if (process.platform === 'win32' && !lockFile) return (win32Lock ??= windowsLock())(path);
      posixLock ??= persistenceRequire()('@deepseek-ai/node-addon-system/flock').tryLockExclusive;
      const flags = exists ? constants.O_RDONLY : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL;
      handle = await fs.open(path, flags | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
      const before = await handle.stat();
      if (!before.isFile() || before.size !== 0 || before.nlink !== 1) throw unavailable();
      // libuv queues the non-blocking flock. Keep this descriptor open until
      // all mutations on the directory finish.
      await posixLock(handle.fd);
      const current = await fs.lstat(path);
      if (current.dev !== before.dev || current.ino !== before.ino || current.nlink !== 1) throw occupied();
      return {
        path,
        created: !exists,
        async release(removeCreated = false) {
          try {
            if (removeCreated && !exists) {
              const entry = await fs.lstat(path).catch(() => undefined);
              if (entry?.dev === before.dev && entry.ino === before.ino && entry.size === 0 && entry.nlink === 1) await fs.unlink(path);
            }
          } finally { await handle.close(); }
        },
      };
    } catch (error) {
      await handle?.close().catch(() => {});
      if (['occupied', 'occupancy-unavailable'].includes(error.code)) throw error;
      if (['EAGAIN', 'EWOULDBLOCK', 'EBUSY', 'EEXIST'].includes(error.code)) throw occupied(error);
      throw unavailable(error);
    }
  }

  async function hold(inspection) {
    await check(inspection.id);
    await verifyInspection(inspection);
    const lease = await acquire(inspection.root, inspection.directory, inspection.files.some((file) => file.name === LOCK_NAME));
    try {
      let current = inspection;
      if (lease.created) {
        const { fingerprint, size, dev, ino, digest } = await readRegularFile(lease.path);
        current = { ...inspection, files: [...inspection.files, { name: LOCK_NAME, fingerprint, size, dev, ino, digest }] };
      }
      await verifyInspection(current);
      await check(inspection.id);
      return {
        inspection: current,
        release: () => lease.release(),
        lockDestination: (root, directory) => acquire(root, directory, false),
      };
    } catch (error) {
      await lease.release();
      throw error;
    }
  }

  async function probe(inspection) {
    // A preview may acquire an existing lock briefly. Create missing lock files
    // only when committing, so preview leaves legacy session directories alone.
    const exists = inspection.files.some((file) => file.name === LOCK_NAME);
    if (!exists && (process.platform !== 'win32' || lockFile)) return;
    const lease = await acquire(inspection.root, inspection.directory, exists);
    await lease.release();
  }

  /**
   * Read whether the Session directory's write lock is currently held.
   * Unlike check(), this tests the JSONL persistence lock itself, so it also
   * catches an idle Agent that was resumed and still owns the write handle.
   * The probe never creates a missing lock file on POSIX.
   */
  async function lockStatus(root, directory) {
    await assertDirectory(root, directory);
    const path = join(directory, LOCK_NAME);
    let entry;
    try {
      entry = await fs.lstat(path);
    } catch (error) {
      if (error.code === 'ENOENT') {
        /* Windows locks live in a named semaphore, not only in the file. */
        if (process.platform === 'win32' && !lockFile) {
          try {
            const lease = await (win32Lock ??= windowsLock())(path);
            await lease.release();
            return { state: 'free', path };
          } catch (lockError) {
            if (lockError.code === 'occupied') return { state: 'busy', path };
            return { state: 'unknown', path, reason: lockError.message };
          }
        }
        return { state: 'free', path };
      }
      return { state: 'unknown', path, reason: error.message };
    }
    if (!entry.isFile() || entry.size !== 0 || entry.nlink !== 1) {
      return { state: 'unknown', path, reason: '会话锁文件状态异常，已停止自动判断' };
    }
    if (process.platform === 'win32' && !lockFile) {
      try {
        const lease = await (win32Lock ??= windowsLock())(path);
        await lease.release();
        return { state: 'free', path };
      } catch (error) {
        if (error.code === 'occupied') return { state: 'busy', path };
        return { state: 'unknown', path, reason: error.message };
      }
    }
    let handle;
    try {
      posixLock ??= persistenceRequire()('@deepseek-ai/node-addon-system/flock').tryLockExclusive;
      handle = await fs.open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const before = await handle.stat();
      if (!before.isFile() || before.size !== 0 || before.nlink !== 1) {
        return { state: 'unknown', path, reason: '会话锁文件状态异常，已停止自动判断' };
      }
      if (before.dev !== entry.dev || before.ino !== entry.ino) {
        return { state: 'unknown', path, reason: '会话锁文件在检查期间被替换，已停止自动判断' };
      }
      await posixLock(handle.fd);
      let after;
      try { after = await fs.lstat(path); } catch (error) {
        return { state: 'unknown', path, reason: error.message };
      }
      if (after.dev !== entry.dev || after.ino !== entry.ino) {
        return { state: 'unknown', path, reason: '会话锁文件在检查期间被替换，已停止自动判断' };
      }
      return { state: 'free', path };
    } catch (error) {
      if (['EAGAIN', 'EWOULDBLOCK', 'EBUSY', 'EEXIST'].includes(error.code)) return { state: 'busy', path };
      if (error.code === 'ENOENT') return { state: 'free', path };
      return { state: 'unknown', path, reason: error.message };
    } finally {
      await handle?.close().catch(() => {});
    }
  }

  return { check, probe, hold, lockStatus };
}
