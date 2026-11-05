/**
 * One-package self update, owned by a job rather than by the replaced Cordis fiber.
 * The existing Host webServer owns temporary routes. Do NOT register their disposal
 * in the archive plugin's effect: removeBundle intentionally unloads that effect.
 * A Host process exit still interrupts the job; persisted state is evidence, never
 * an instruction to repeat removal automatically after restart.
 */
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { PACKAGE_NAME, REPOSITORY, UpdateError, isVersion, compareVersions, stableAssetUrl, latestRelease, releaseById, releaseByVersion, cacheRelease, packageCachePath, verifyCachedRelease } from './update-release.js';
import { controlDocument } from './update-view.js';

const REGISTRY = Symbol.for('dsh-archived-manager.update-jobs.v1');
const ACTIVE = new Set(['removing', 'installing', 'restoring', 'verifying']);
const TOKEN = /^[a-f0-9]{48}$/;
const PHASES = new Set(['prepared', ...ACTIVE, 'installed', 'restart-required', 'restored', 'failed', 'unknown']);
const DEFAULT_TTL = 24 * 60 * 60 * 1000;
const globals = () => globalThis[REGISTRY] ??= new Map();
const copy = (value) => JSON.parse(JSON.stringify(value));
const message = (error) => error instanceof UpdateError ? error.message : '操作未能完成，请核对当前安装状态后重试。';
const unwrap = (value) => {
  if (value && typeof value.ok === 'boolean') {
    if (!value.ok) throw new UpdateError('host', '宿主未能确认操作结果，请先重新核对。');
    return value.value;
  }
  return value;
};
const safeCode = (value) => typeof value === 'string' && /^[a-z-]{1,80}$/.test(value) ? value : 'host';

function checkedStoredRelease(release) {
  if (!release || !Number.isSafeInteger(release.id) || release.id <= 0 || !Number.isSafeInteger(release.assetId) || release.assetId <= 0 || !isVersion(release.version) || release.tag !== `v${release.version}` || release.assetUrl !== stableAssetUrl(release.version) || release.htmlUrl !== `https://github.com/${REPOSITORY}/releases/tag/v${release.version}` || !/^sha256:[a-f0-9]{64}$/.test(release.digest ?? '') || !Number.isSafeInteger(release.size) || release.size <= 0 || release.size > 20 * 1024 * 1024) throw new UpdateError('state', '保存的更新记录无法核验，请使用插件管理器检查安装。');
  return release;
}
function validatePrevious(previous) {
  if (!previous || !isVersion(previous.version) || typeof previous.enabled !== 'boolean' || typeof previous.originalSource !== 'string') throw new UpdateError('state', '保存的原版本记录无效。');
  if (previous.kind === 'release') {
    checkedStoredRelease(previous.release);
    if (previous.release.version !== previous.version) throw new UpdateError('state', '保存的原版本记录不一致。');
  } else if (previous.kind === 'link') {
    if (typeof previous.source !== 'string' || !previous.source.startsWith('link:') || !isAbsolute(previous.source.slice(5)) || previous.source.includes('\0')) throw new UpdateError('state', '保存的源码链接无效。');
  } else throw new UpdateError('state', '保存的安装来源无效。');
  return previous;
}
function validateState(state) {
  if (!state || state.schema !== 1) throw new UpdateError('state', '保存的更新记录无法识别。');
  if (state.receipt) checkedStoredRelease(state.receipt);
  if (state.job) {
    if (!TOKEN.test(state.job.id ?? '') || !PHASES.has(state.job.phase)) throw new UpdateError('state', '保存的更新任务无效。');
    checkedStoredRelease(state.job.target);
    validatePrevious(state.job.previous);
    if (typeof state.job.createdAt !== 'string' || typeof state.job.updatedAt !== 'string') throw new UpdateError('state', '保存的更新时间无效。');
  }
  return state;
}
function sourceKind(row, state, home) {
  if (!row?.installed) return 'missing';
  if (typeof row.source !== 'string') return 'unknown';
  if (row.source.startsWith('link:') && isAbsolute(row.source.slice(5))) return 'link';
  if (!isVersion(row.version)) return 'unknown';
  if ([stableAssetUrl(row.version), `github:${REPOSITORY}#v${row.version}`, `git+https://github.com/${REPOSITORY}.git#v${row.version}`, `https://github.com/${REPOSITORY}.git#v${row.version}`].includes(row.source)) return 'release';
  const candidates = [state.receipt, state.job?.target, state.job?.previous?.release].filter(Boolean);
  if (candidates.some((release) => release.version === row.version && [packageCachePath(home, release), `file:${packageCachePath(home, release)}`].includes(row.source))) return 'release';
  return 'unknown';
}
function resultError(result, step) {
  if (result?.application === 'failed' || result?.application === 'cancelled') {
    const code = safeCode(result.error?.code);
    const detail = code === 'stop-profile' ? '当前宿主不能在线卸载此插件，请保持原安装，并在插件管理器处理。' : code === 'bundle-in-use' ? '插件仍被使用，未继续安装。' : `${step}未完成，请查看当前安装状态。`;
    throw new UpdateError(code, detail);
  }
  if (!result || !['applied', 'restart-required', 'overridden'].includes(result.application)) throw new UpdateError('unknown', '宿主没有返回可确认的结果，请先核对安装状态。');
  if (result.application === 'overridden') throw new UpdateError('overridden', '宿主配置覆盖了这次修改，请在插件管理器核对。');
  return result;
}

/**
 * @param options Captured Host services, actual loaded version and the archive
 * manager's enterUpdate(async fn) mutation gate. No dependency is obtained from
 * the disposed archive context once a job has started.
 */
export function createUpdater(options) {
  const home = resolve(options.home);
  let origin = null;
  try { origin = options.webServer?.getOrigin?.(); } catch { /* reported as unavailable */ }
  const key = `${home}\0${origin ?? ''}`;
  let shared = globals().get(key);
  if (!shared) {
    shared = { state: { schema: 1, receipt: null, job: null }, loaded: false, loading: null, loadError: null, saving: Promise.resolve(), routes: new Map(), running: null, submitting: false, preparing: false, generation: 0 };
    globals().set(key, shared);
  }
  shared.generation += 1;
  const attachment = { runtimeVersion: options.runtimeVersion ?? null, enterUpdate: options.enterUpdate, readRuntimeVersion: options.readRuntimeVersion };
  shared.attachment = attachment;
  const manager = options.pluginManager;
  const methods = {};
  for (const name of ['listBundles', 'removeBundle', 'installBundle', 'setBundleEnabled']) if (typeof manager?.[name] === 'function') methods[name] = manager[name].bind(manager);
  const register = typeof options.webServer?.register === 'function' ? options.webServer.register.bind(options.webServer) : null;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date().toISOString());
  const statePath = join(home, 'archived-manager', 'update-state.json');
  const ttl = options.controlTtlMs ?? DEFAULT_TTL;
  let checked = null;
  const capabilityReason = !origin || !register || Object.keys(methods).length !== 4 ? '当前宿主未提供完整更新能力。' : typeof shared.attachment.enterUpdate !== 'function' ? '当前宿主无法确认会话操作已经结束。' : null;
  const controlPath = (job) => `/archived-manager/update-control/${job.id}`;
  const controlUrl = (job) => `${origin}${controlPath(job)}`;
  const matchesRelease = (row, release) => row?.installed === true && row.version === release.version && [release.assetUrl, packageCachePath(home, release), `file:${packageCachePath(home, release)}`].includes(row.source);
  const matchesDesired = (row, job, restoring) => {
    if (!restoring) return matchesRelease(row, job.target);
    if (row?.installed !== true || row.version !== job.previous.version) return false;
    if (row.source === job.previous.originalSource) return true;
    return job.previous.kind === 'link' ? row.source === job.previous.source : matchesRelease(row, job.previous.release);
  };

  async function save() {
    const snapshot = JSON.stringify(shared.state, null, 2);
    const next = shared.saving.catch(() => {}).then(async () => {
      await fs.mkdir(join(home, 'archived-manager'), { recursive: true, mode: 0o700 });
      const temporary = `${statePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
      try {
        await fs.writeFile(temporary, snapshot, { mode: 0o600 });
        await fs.rename(temporary, statePath);
      } finally { await fs.rm(temporary, { force: true }).catch(() => {}); }
    });
    shared.saving = next;
    return next;
  }
  async function load() {
    if (shared.loaded) {
      if (shared.loadError) throw shared.loadError;
      return;
    }
    shared.loading ??= (async () => {
      try { shared.state = validateState(JSON.parse(await fs.readFile(statePath, 'utf8'))); }
      catch (error) {
        if (error?.code !== 'ENOENT') shared.loadError = error instanceof UpdateError ? error : new UpdateError('state', '无法读取上次更新记录，请先在插件管理器核对。');
      }
      shared.loaded = true;
      if (shared.loadError) throw shared.loadError;
      const job = shared.state.job;
      if (job && ACTIVE.has(job.phase)) {
        job.phase = 'unknown';
        job.error = '上次更新被 DSH 退出中断；正在重新核对实际安装，不会自动重复卸载。';
        job.updatedAt = now();
        await save();
      }
      if (job && register && origin) ensureControl(job);
    })();
    await shared.loading;
  }
  async function rowNow() {
    if (!methods.listBundles) throw new UpdateError('unavailable', capabilityReason);
    const rows = unwrap(await methods.listBundles());
    if (!Array.isArray(rows)) throw new UpdateError('unknown', '无法确认当前安装状态。');
    return rows.find((row) => row.name === PACKAGE_NAME) ?? null;
  }
  async function runningVersion() {
    const attachment = shared.attachment;
    if (typeof attachment.readRuntimeVersion === 'function') {
      try { return await attachment.readRuntimeVersion(); } catch { return null; }
    }
    return attachment.runtimeVersion;
  }
  function publicJob(job = shared.state.job, ignoreSubmission = false) {
    if (!job) return null;
    const installed = job.observed?.installed === true;
    const known = job.observed?.known === true;
    const active = !!shared.running || (!ignoreSubmission && shared.submitting) || ACTIVE.has(job.phase);
    const selectionMatches = job.observed?.enabled === job.previous.enabled;
    const atTarget = matchesRelease(job.observed, job.target) && selectionMatches;
    const atPrevious = matchesDesired(job.observed, job, true) && selectionMatches;
    return {
      id: job.id, phase: job.phase, busy: active, targetVersion: job.target.version, previousVersion: job.previous.version,
      installedVersion: known ? (installed ? job.observed.version ?? null : null) : null,
      installationKnown: known, installed, enabled: job.observed?.enabled ?? null, runtimeVersion: shared.attachment.runtimeVersion ?? null,
      error: job.error ?? null, application: job.application ?? null,
      canRetry: !active && known && !atTarget && ['failed', 'unknown'].includes(job.phase),
      canRestore: !active && known && !atPrevious && ['failed', 'unknown'].includes(job.phase),
      controlUrl: controlUrl(job), createdAt: job.createdAt, updatedAt: job.updatedAt,
      targetUrl: job.target.assetUrl,
      recoveryUrl: job.previous.kind === 'release' ? job.previous.release.assetUrl : job.previous.source,
      previousKind: job.previous.kind,
    };
  }
  async function observe(job, settleUnknown = false) {
    try {
      const row = await rowNow();
      job.observed = { known: true, installed: row?.installed === true, version: row?.version ?? null, source: row?.source ?? null, enabled: row?.enabled ?? null };
      const restoring = job.intent === 'restore';
      const desiredFound = matchesDesired(row, job, restoring) && row.enabled === job.previous.enabled;
      const runtime = await runningVersion();
      if (settleUnknown && job.phase === 'unknown' || job.phase === 'restart-required' && desiredFound && runtime === row.version) {
        if (desiredFound) {
          job.phase = runtime === row.version || job.previous.enabled === false ? restoring ? 'restored' : 'installed' : 'restart-required';
          job.error = null;
          shared.state.receipt = restoring ? job.previous.kind === 'release' ? job.previous.release : null : job.target;
        } else if (row?.installed && row.version === job.previous.version) {
          job.phase = 'failed';
          job.error = row.enabled === false && job.previous.enabled === true ? '上次更新未完成，原版本仍在但已停用；可恢复原来的安装。' : '上次更新未完成，原版本仍已安装。';
        } else if (!row?.installed) {
          job.phase = 'failed';
          job.error = '当前插件未安装，可重试目标版本或恢复原来的安装。';
        }
      }
    } catch { job.observed = { known: false, installed: false, version: null, source: null, enabled: null }; }
    job.updatedAt = now();
    await save();
  }
  async function status() {
    try { await load(); }
    catch (error) { return { runtimeVersion: await runningVersion(), installedVersion: null, sourceKind: 'unknown', source: null, busy: false, canUpdate: false, capabilityReason: message(error), job: null }; }
    let row = null, issue = capabilityReason;
    try { row = await rowNow(); } catch (error) { issue ??= message(error); }
    const job = shared.state.job;
    if (job && register && origin) ensureControl(job);
    if (job && !shared.running && job.phase !== 'prepared') await observe(job, true);
    const kind = sourceKind(row, shared.state, home);
    return { runtimeVersion: await runningVersion(), installedVersion: row?.version ?? null, sourceKind: kind, source: row?.source ?? null, busy: !!shared.running || shared.preparing, canUpdate: !issue && !!row?.installed && row.removable !== false && ['link', 'release'].includes(kind), capabilityReason: issue ?? (!['link', 'release'].includes(kind) ? '当前安装来源无法核验，请在插件管理器检查。' : null), job: publicJob() };
  }
  async function check() {
    await load();
    const current = await status();
    const release = await latestRelease(fetchImpl);
    checked = release;
    const currentVersion = current.installedVersion ?? current.runtimeVersion;
    const difference = compareVersions(release.version, currentVersion);
    return { ...current, release: copy(release), relation: difference > 0 ? 'newer' : difference < 0 ? 'older' : 'same', checkedAt: now() };
  }
  async function previousFor(row, kind) {
    if (kind === 'link') {
      const previous = { kind, version: row.version, source: row.source, originalSource: row.source, enabled: row.enabled !== false };
      await verifyLink(previous);
      return previous;
    }
    const release = await releaseByVersion(row.version, fetchImpl);
    await cacheRelease(home, release, fetchImpl);
    return { kind: 'release', version: row.version, release, originalSource: row.source, enabled: row.enabled !== false };
  }
  async function verifyLink(previous) {
    validatePrevious(previous);
    const directory = previous.source.slice(5);
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(join(directory, 'package.json'), 'utf8')); }
    catch { throw new UpdateError('link', '原来的源码目录已不可读，请在插件管理器恢复安装。'); }
    if (manifest.name !== PACKAGE_NAME || manifest.version !== previous.version || !manifest.dsh?.bundle) throw new UpdateError('link', '原来的源码名称或版本已变化，不能自动恢复该链接。');
    return previous.source;
  }
  async function prepare(payload) {
    await load();
    if (capabilityReason) throw new UpdateError('unavailable', capabilityReason);
    if (shared.running || shared.submitting || shared.preparing) throw new UpdateError('busy', '已有更新正在处理。');
    if (!checked || payload?.releaseId !== checked.id || payload?.version !== checked.version) throw new UpdateError('target', '请先检查并确认这个稳定版本。');
    shared.preparing = true;
    try {
      const row = await rowNow();
      const kind = sourceKind(row, shared.state, home);
      if (!row?.installed || row.removable === false || !['link', 'release'].includes(kind)) throw new UpdateError('source', '当前安装不能通过此入口更新。');
      if (kind === 'link' && payload.switchFromLink !== true) throw new UpdateError('link-confirmation', '本地源码链接不会自动覆盖，请明确确认切换为发布版。');
      if (compareVersions(checked.version, row.version) < 0) throw new UpdateError('downgrade', '当前版本高于稳定版，不会自动降级。');
      if (checked.version === row.version && kind !== 'link') throw new UpdateError('same-version', '当前已是这个稳定版本。');
      const target = await releaseById(checked.id, fetchImpl);
      if (['version', 'assetId', 'digest', 'size', 'assetUrl'].some((field) => target[field] !== checked[field])) throw new UpdateError('target-changed', '确认后的安装包已经变化，请重新检查。');
      await cacheRelease(home, target, fetchImpl);
      const previous = await previousFor(row, kind);
      const refreshed = await rowNow();
      if (!refreshed?.installed || refreshed.version !== row.version || refreshed.source !== row.source || refreshed.enabled !== row.enabled) throw new UpdateError('installation-changed', '准备期间安装已变化，请重新检查。');
      const stamp = now();
      const job = { id: randomBytes(24).toString('hex'), phase: 'prepared', target, previous, createdAt: stamp, updatedAt: stamp, error: null, observed: { known: true, installed: true, version: row.version, source: row.source, enabled: row.enabled } };
      shared.state.job = job;
      await save();
      ensureControl(job);
      return { controlUrl: controlUrl(job), job: publicJob(job) };
    } finally { shared.preparing = false; }
  }
  async function phase(job, name) { job.phase = name; job.updatedAt = now(); await save(); }
  async function runJob(job, action) {
    const restoring = action === 'restore';
    const desiredVersion = restoring ? job.previous.version : job.target.version;
    job.intent = restoring ? 'restore' : 'update';
    job.error = null;
    let outcome;
    try {
      const enter = shared.attachment.enterUpdate;
      if (typeof enter !== 'function') throw new UpdateError('busy', '当前无法确认会话操作已经结束。');
      await enter(async () => {
        if (!restoring) {
          const available = await releaseById(job.target.id, fetchImpl);
          if (['version', 'assetId', 'digest', 'size', 'assetUrl'].some((field) => available[field] !== job.target[field])) throw new UpdateError('target-changed', '已确认的发布目标已撤回或变化，未开始卸载。请重新检查。');
          if (action === 'retry') await cacheRelease(home, job.target, fetchImpl);
        }
        const current = await rowNow();
        const alreadyDesired = matchesDesired(current, job, restoring);
        // Re-enabling the retained original package needs no downloaded replacement.
        // Every actual package replacement verifies bytes before the first removal.
        const spec = alreadyDesired ? null : restoring && job.previous.kind === 'link' ? await verifyLink(job.previous) : await verifyCachedRelease(home, restoring ? job.previous.release : job.target);
        if (alreadyDesired) {
          if (current.enabled !== job.previous.enabled) {
            await phase(job, restoring ? 'restoring' : 'installing');
            outcome = resultError(unwrap(await methods.setBundleEnabled(PACKAGE_NAME, job.previous.enabled)), '恢复启用状态');
          } else outcome = { application: (await runningVersion()) === desiredVersion || job.previous.enabled === false ? 'applied' : 'restart-required' };
        } else {
          if (current?.installed) {
            const originalUnchanged = current.version === job.previous.version && current.source === job.previous.originalSource;
            if (!originalUnchanged && !(restoring && matchesRelease(current, job.target))) throw new UpdateError('installation-changed', '安装已由其他操作修改，未再次卸载。请先核对。');
            await phase(job, 'removing');
            const generation = shared.generation;
            resultError(unwrap(await methods.removeBundle(PACKAGE_NAME)), '卸载');
            const afterRemoval = await rowNow();
            if (afterRemoval?.installed) throw new UpdateError('remove-unconfirmed', '旧版本仍在安装列表中，未继续安装。');
            if (generation === shared.generation) shared.attachment.runtimeVersion = null;
            await observe(job);
          }
          await phase(job, restoring ? 'restoring' : 'installing');
          const result = unwrap(await methods.installBundle(spec, { enabled: job.previous.enabled, saveExact: true, requestId: `archived-update-${job.id}-${randomBytes(6).toString('hex')}` }));
          outcome = resultError(result, '安装');
          if (result.bundle && result.bundle !== PACKAGE_NAME || result.version && result.version !== desiredVersion) throw new UpdateError('package-mismatch', '宿主返回的安装目标不匹配，必须在插件管理器核对。');
        }
        await phase(job, 'verifying');
        const installed = await rowNow();
        if (!matchesDesired(installed, job, restoring) || installed.enabled !== job.previous.enabled) throw new UpdateError('install-unconfirmed', '尚未确认目标版本、来源和启用状态，请先核对后再重试。');
        job.application = outcome.application;
        if (restoring) shared.state.receipt = job.previous.kind === 'release' ? job.previous.release : null;
        else shared.state.receipt = job.target;
        const runtime = await runningVersion();
        const restartNeeded = outcome.application === 'restart-required' || job.previous.enabled !== false && runtime !== desiredVersion;
        job.phase = restartNeeded ? 'restart-required' : restoring ? 'restored' : 'installed';
        job.error = null;
        await observe(job);
      });
    } catch (error) {
      job.phase = error?.code === 'unknown' ? 'unknown' : 'failed';
      job.error = message(error);
      await observe(job).catch(() => { job.error = '无法保存或确认更新结果，请在插件管理器核对实际安装。'; });
    }
  }
  async function startAction(job, action) {
    if (job !== shared.state.job) throw new UpdateError('expired', '这个更新页面已过期，请重新检查更新。');
    if (shared.running || shared.submitting || shared.preparing) throw new UpdateError('busy', '更新正在进行，请等待结果。');
    if (action === 'reconcile') { await observe(job, true); return publicJob(job); }
    if (!['start', 'retry', 'restore'].includes(action)) throw new UpdateError('invalid', '无效的操作。');
    if (!job.pageSeen) throw new UpdateError('page', '请先打开更新控制页，再开始更新。');
    if (action === 'start' && job.phase !== 'prepared') throw new UpdateError('state', '此更新已经提交，请先核对结果。');
    // Reserve submission before awaiting inventory, including simultaneous retry POSTs.
    shared.submitting = true;
    try {
    if (action !== 'start') {
      await observe(job, true);
      const view = publicJob(job, true);
      if (!(action === 'retry' ? view.canRetry : view.canRestore)) throw new UpdateError('state', '当前状态不允许这个恢复操作，请先核对安装。');
    } else {
      const current = await rowNow();
      if (!current?.installed || current.version !== job.previous.version || current.source !== job.previous.originalSource || current.enabled !== job.previous.enabled) throw new UpdateError('installation-changed', '当前安装已变化，请重新检查更新。');
    }
    // Publish the in-memory lock before yielding: two POSTs cannot start two jobs.
    shared.running = Promise.resolve().then(() => runJob(job, action)).finally(() => { shared.running = null; });
    return publicJob(job);
    } finally { shared.submitting = false; }
  }
  function ensureControl(job) {
    if (shared.routes.has(job.id)) return;
    const path = controlPath(job);
    const expectedHost = new URL(origin).host;
    const send = (response, code, body) => {
      response.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      response.end(JSON.stringify(body));
    };
    const handler = async (request, response) => {
      const address = request.socket?.remoteAddress;
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address) || request.headers.host !== expectedHost || request.headers.origin && request.headers.origin !== origin || request.headers['sec-fetch-site'] === 'cross-site') return send(response, 403, { ok: false, error: '只允许从当前本机页面访问。' });
      let pathname;
      try { pathname = new URL(request.url, origin).pathname; } catch { return send(response, 400, { ok: false, error: '地址无效。' }); }
      if (shared.state.job?.id !== job.id) return send(response, 410, { ok: false, error: '此更新页面已过期，请返回 DSH 重新检查。' });
      try {
        if (pathname === path && request.method === 'GET') {
          const nonce = randomBytes(16).toString('base64');
          const html = controlDocument({ job: publicJob(job), path, nonce });
          response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'` });
          response.end(html, () => { job.pageSeen = true; });
          return;
        }
        if (pathname === `${path}/status` && request.method === 'GET') {
          if (!shared.running && job.phase !== 'prepared') await observe(job, true);
          return send(response, 200, { ok: true, job: publicJob(job) });
        }
        if (pathname === `${path}/action` && request.method === 'POST') {
          if (request.headers['x-archived-manager-update'] !== job.id) return send(response, 403, { ok: false, error: '操作校验失败。' });
          const chunks = [];
          let length = 0;
          for await (const chunk of request) {
            length += chunk.length;
            if (length > 4096) throw new UpdateError('invalid', '请求过大。');
            chunks.push(chunk);
          }
          let payload;
          try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new UpdateError('invalid', '请求格式无效。'); }
          if (Object.keys(payload ?? {}).some((field) => field !== 'action')) throw new UpdateError('invalid', '请求包含不支持的内容。');
          return send(response, 202, { ok: true, job: await startAction(job, payload.action) });
        }
        return send(response, 404, { ok: false, error: '没有这个更新入口。' });
      } catch (error) { return send(response, 409, { ok: false, code: safeCode(error?.code), error: message(error) }); }
    };
    const dispose = register({ kind: 'prefix', path, handler });
    const entry = { dispose, timer: null };
    const expire = () => {
      if (shared.running || shared.submitting || shared.preparing) { entry.timer = setTimeout(expire, ttl); entry.timer.unref?.(); return; }
      dispose();
      shared.routes.delete(job.id);
    };
    entry.timer = setTimeout(expire, ttl);
    entry.timer.unref?.();
    shared.routes.set(job.id, entry);
  }
  return {
    status, check, prepare,
    isUpdating: () => !!shared.running,
    /** Call on this plugin fiber's unload. Job routes and Host operations survive. */
    detach: () => {
      if (shared.attachment === attachment) {
        attachment.runtimeVersion = null;
        attachment.readRuntimeVersion = undefined;
      }
    },
    /** Host-shutdown/test cleanup only. Never call this for archive plugin unload. */
    closeControls: () => { for (const route of shared.routes.values()) { clearTimeout(route.timer); route.dispose(); } shared.routes.clear(); },
  };
}
