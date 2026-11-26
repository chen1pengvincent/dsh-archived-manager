/** Track first-observed archive dates across committed workspace changes and explicit list refreshes. */
export function observeArchiveTimes(ctx, { archivedSet, read, write }) {
  async function readArchiveTimes() {
    try {
      const saved = await read();
      if (!saved?.times || typeof saved.times !== 'object' || Array.isArray(saved.times)) {
        throw new Error('Invalid archive time ledger');
      }
      return saved;
    } catch (error) {
      if (error.code === 'ENOENT') return { initialized: false, times: {} };
      throw error;
    }
  }

  let archiveTimeTail = Promise.resolve({});
  let committedArchiveIds;
  let previousArchiveIds;
  let archiveTimesSaved = false;
  let retryArchiveSync;
  const observedAdditions = new Map();

  // Keep event snapshots in commit order even if the next host change arrives
  // while a write is in flight. Explicit refreshes reread the shared ledger.
  function syncArchiveTimes(ids = committedArchiveIds ?? archivedSet(), fromEvent = false) {
    const observedAt = Date.now();
    archiveTimeTail = archiveTimeTail.then(async () => {
      if (!ids) return (await readArchiveTimes()).times;
      let membershipChanged = previousArchiveIds?.size !== ids.size;
      if (previousArchiveIds) {
        for (const id of ids) {
          if (previousArchiveIds.has(id)) continue;
          observedAdditions.set(id, observedAt);
          membershipChanged = true;
        }
      }
      previousArchiveIds = ids;
      if (fromEvent && !membershipChanged && archiveTimesSaved) return;
      for (const id of observedAdditions.keys()) {
        if (!ids.has(id)) observedAdditions.delete(id);
      }

      const saved = await readArchiveTimes();
      const times = saved.times;
      let changed = saved.initialized !== true;
      for (const id of ids) {
        // Items present before installation have no known archive date.
        // An addition stays pending across I/O failures until its date is durable.
        if (saved.initialized === true && Object.hasOwn(times, id) && !observedAdditions.has(id)) continue;
        const value = observedAdditions.get(id) ?? (saved.initialized === true ? observedAt : null);
        if (times[id] === value) continue;
        times[id] = value;
        changed = true;
      }
      for (const id of Object.keys(times)) {
        if (ids.has(id)) continue;
        delete times[id];
        changed = true;
      }
      if (changed) {
        await write({ version: 2, initialized: true, updatedAt: observedAt, times });
      }
      observedAdditions.clear();
      archiveTimesSaved = true;
      return times;
    }).catch(() => {
      archiveTimesSaved = false;
      retryArchiveSync?.();
      return {}; // Optional dates must not prevent listing or operating on sessions.
    });
    return archiveTimeTail;
  }

  if (typeof ctx.effect === 'function') {
    const start = (scope) => scope.effect(() => {
      const refresh = () => { void syncArchiveTimes(); };
      if (typeof scope.on !== 'function') {
        refresh();
        const timer = setInterval(refresh, 30_000);
        timer.unref?.();
        return () => clearInterval(timer);
      }

      let retry;
      retryArchiveSync = () => {
        if (retry) return;
        retry = setTimeout(() => { retry = undefined; refresh(); }, 30_000);
        retry.unref?.();
      };
      const unsubscribe = scope.on('domain/changed', (change) => {
        if (change.domain !== 'workspace' || change.table !== '' || change.operation !== 'put'
          || !Array.isArray(change.value?.archivedSessionIds)) return;
        // The domain has committed this value before workspaceRegistry updates its getter.
        const ids = new Set(change.value.archivedSessionIds);
        committedArchiveIds = ids;
        void syncArchiveTimes(ids, true).then(() => {
          // Later explicit refreshes reconcile missed notifications from the live registry.
          if (committedArchiveIds === ids) committedArchiveIds = undefined;
        });
      });
      refresh();
      return () => {
        retryArchiveSync = undefined;
        clearTimeout(retry);
        committedArchiveIds = undefined;
        unsubscribe?.();
      };
    }, 'archived-manager: archive-time sync');
    if (typeof ctx.on === 'function' && typeof ctx.inject === 'function') {
      ctx.inject(['workspaceRegistry'], (scope) => { start(scope); });
    } else {
      start(ctx);
    }
  }
  return syncArchiveTimes;
}
