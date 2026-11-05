/** Fixed-repository release discovery and byte validation. Never executes a downloaded package. */
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

export const PACKAGE_NAME = 'dsh-archived-manager';
export const REPOSITORY = 'chen1pengvincent/dsh-archived-manager';
const API = `https://api.github.com/repos/${REPOSITORY}`;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const MAX_ARCHIVE = 20 * 1024 * 1024;
const MAX_CONTENT = 64 * 1024 * 1024;

export class UpdateError extends Error {
  constructor(code, message) { super(message); this.name = 'UpdateError'; this.code = code; }
}
export function isVersion(value) { return typeof value === 'string' && VERSION.test(value); }
export function compareVersions(a, b) {
  if (!isVersion(a) || !isVersion(b)) throw new UpdateError('version', '无法比较未提供的版本。');
  const left = a.split('.').map(BigInt), right = b.split('.').map(BigInt);
  for (let i = 0; i < 3; i += 1) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
export function stableAssetUrl(version) {
  if (!isVersion(version)) throw new UpdateError('version', '无效的稳定版本号。');
  return `https://github.com/${REPOSITORY}/releases/download/v${version}/${PACKAGE_NAME}-${version}.tgz`;
}
export function validateRelease(raw) {
  const version = typeof raw?.tag_name === 'string' ? raw.tag_name.replace(/^v/, '') : '';
  if (!raw || raw.draft !== false || raw.prerelease !== false || !isVersion(version) || raw.tag_name !== `v${version}` || !Number.isSafeInteger(raw.id) || raw.id <= 0) {
    throw new UpdateError('release', '发布信息不是本插件的正式稳定版本。');
  }
  const htmlUrl = `https://github.com/${REPOSITORY}/releases/tag/v${version}`;
  if (raw.html_url !== htmlUrl) throw new UpdateError('release', '发布信息来自其他仓库。');
  const assets = Array.isArray(raw.assets) ? raw.assets.filter((a) => a.name === `${PACKAGE_NAME}-${version}.tgz`) : [];
  const asset = assets.length === 1 ? assets[0] : undefined;
  if (!asset || !Number.isSafeInteger(asset.id) || asset.id <= 0 || asset.browser_download_url !== stableAssetUrl(version) || !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? '') || !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > MAX_ARCHIVE) {
    throw new UpdateError('asset', '该稳定版缺少可核验的正式安装包，当前安装未改动。');
  }
  return { id: raw.id, version, tag: raw.tag_name, htmlUrl, publishedAt: raw.published_at ?? null, assetId: asset.id, assetUrl: asset.browser_download_url, digest: asset.digest, size: asset.size };
}

async function bytesOf(response, limit) {
  const length = Number(response.headers?.get?.('content-length'));
  if (length > limit) throw new UpdateError('size', '下载内容超过大小限制。');
  const reader = response.body?.getReader?.();
  if (!reader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > limit) throw new UpdateError('size', '下载内容超过大小限制。');
    return bytes;
  }
  let size = 0;
  const parts = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new UpdateError('size', '下载内容超过大小限制。');
      parts.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(parts);
}

export async function fetchReleaseJson(path, fetchImpl = fetch) {
  if (!/^\/(?:latest|\d+|tags\/v\d+\.\d+\.\d+)$/.test(path)) throw new UpdateError('release', '无效的发布目标。');
  let response;
  try {
    response = await fetchImpl(`${API}/releases${path}`, { headers: { accept: 'application/vnd.github+json', 'user-agent': PACKAGE_NAME }, redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new UpdateError('network', `无法读取稳定发布（HTTP ${response.status}）。`);
    return JSON.parse((await bytesOf(response, 1024 * 1024)).toString('utf8'));
  } catch (error) {
    if (error instanceof UpdateError) throw error;
    throw new UpdateError('network', '无法读取稳定发布，请检查网络后重试。');
  }
}
export async function latestRelease(fetchImpl) { return validateRelease(await fetchReleaseJson('/latest', fetchImpl)); }
export async function releaseById(id, fetchImpl) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new UpdateError('release', '无效的发布目标。');
  const release = validateRelease(await fetchReleaseJson(`/${id}`, fetchImpl));
  if (release.id !== id) throw new UpdateError('release', '发布目标已发生变化，请重新检查。');
  return release;
}
export async function releaseByVersion(version, fetchImpl) {
  if (!isVersion(version)) throw new UpdateError('version', '无法核验原来的稳定版本。');
  const release = validateRelease(await fetchReleaseJson(`/tags/v${version}`, fetchImpl));
  if (release.version !== version) throw new UpdateError('release', '原来的发布目标发生变化。');
  return release;
}

function tarString(bytes) { return bytes.toString('utf8').split('\0')[0]; }
function tarNumber(bytes) {
  const text = tarString(bytes).trim();
  if (!/^[0-7]*$/.test(text)) throw new UpdateError('archive', '安装包目录格式无效。');
  const number = parseInt(text || '0', 8);
  if (!Number.isSafeInteger(number)) throw new UpdateError('archive', '安装包目录格式无效。');
  return number;
}
function safeTarPath(name, directory = false) {
  const canonical = directory && name.endsWith('/') ? name.slice(0, -1) : name;
  if (!(canonical.startsWith('package/') || directory && canonical === 'package') || canonical.includes('\\') || canonical.split('/').some((part) => part === '' || part === '..' || part === '.') || /[\u0000-\u001f]/.test(canonical)) throw new UpdateError('archive', '安装包包含不安全的文件路径。');
  return canonical;
}
function paxFields(data) {
  const fields = {};
  for (let at = 0; at < data.length;) {
    const blank = data.indexOf(32, at);
    if (blank < at || blank > at + 12) throw new UpdateError('archive', '安装包扩展目录格式无效。');
    const length = Number(data.subarray(at, blank).toString());
    if (!Number.isSafeInteger(length) || length <= blank - at + 1 || at + length > data.length) throw new UpdateError('archive', '安装包扩展目录格式无效。');
    const entry = data.subarray(blank + 1, at + length).toString('utf8');
    if (!entry.endsWith('\n') || !entry.includes('=')) throw new UpdateError('archive', '安装包扩展目录格式无效。');
    const key = entry.slice(0, entry.indexOf('='));
    if (!['path', 'mtime', 'atime', 'ctime', 'uid', 'gid', 'uname', 'gname'].includes(key) || Object.hasOwn(fields, key)) throw new UpdateError('archive', '安装包包含不支持的扩展目录字段。');
    fields[key] = entry.slice(entry.indexOf('=') + 1, -1);
    at += length;
  }
  return fields;
}
export function verifyPackage(bytes, release) {
  if (bytes.length !== release.size || `sha256:${createHash('sha256').update(bytes).digest('hex')}` !== release.digest) throw new UpdateError('digest', '安装包校验失败，当前安装未改动。');
  let archive;
  try { archive = gunzipSync(bytes, { maxOutputLength: MAX_CONTENT }); }
  catch { throw new UpdateError('archive', '安装包无法安全解压核验。'); }
  if (archive.length % 512 !== 0) throw new UpdateError('archive', '安装包目录块不完整。');
  const entries = new Set(), aliases = new Set();
  let manifest, pax = {}, count = 0;
  for (let at = 0; at + 512 <= archive.length;) {
    const header = archive.subarray(at, at + 512);
    if (header.every((byte) => byte === 0)) {
      if (!archive.subarray(at).every((byte) => byte === 0)) throw new UpdateError('archive', '安装包结束标记后仍有文件内容。');
      break;
    }
    if (++count > 20_000) throw new UpdateError('archive', '安装包文件数量过多。');
    const sum = header.reduce((total, value, i) => total + (i >= 148 && i < 156 ? 32 : value), 0);
    if (sum !== tarNumber(header.subarray(148, 156))) throw new UpdateError('archive', '安装包目录校验失败。');
    const size = tarNumber(header.subarray(124, 136));
    const content = archive.subarray(at + 512, at + 512 + size);
    if (content.length !== size) throw new UpdateError('archive', '安装包不完整。');
    const type = String.fromCharCode(header[156]);
    const prefix = tarString(header.subarray(345, 500));
    let name = pax.path ?? `${prefix ? `${prefix}/` : ''}${tarString(header.subarray(0, 100))}`;
    at += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') { pax = paxFields(content); continue; }
    if (!['0', '\0', '5'].includes(type) || pax.linkpath) throw new UpdateError('archive', '安装包包含不支持的链接或目录类型。');
    name = safeTarPath(name, type === '5');
    const alias = name.normalize('NFC').toLowerCase();
    if (aliases.has(alias)) throw new UpdateError('archive', '安装包包含重复文件。');
    aliases.add(alias);
    entries.add(name);
    if (name === 'package/package.json') {
      if (type === '5' || size > 64 * 1024) throw new UpdateError('archive', '安装包清单无效。');
      try { manifest = JSON.parse(content.toString('utf8')); } catch { throw new UpdateError('archive', '安装包清单无效。'); }
    }
    pax = {};
  }
  if (manifest?.name !== PACKAGE_NAME || manifest?.version !== release.version || typeof manifest?.dsh?.bundle?.patch !== 'string') throw new UpdateError('package-mismatch', '安装包名称、版本或插件声明不匹配，当前安装未改动。');
  for (const file of [manifest.main, manifest.dsh.bundle.patch]) {
    if (typeof file !== 'string' || !entries.has(safeTarPath(`package/${file.replace(/^\.\//, '')}`))) throw new UpdateError('package-mismatch', '安装包缺少入口文件。');
  }
  return manifest;
}

async function downloadAsset(release, fetchImpl) {
  let url = release.assetUrl;
  const allowed = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com']);
  const signal = AbortSignal.timeout(120_000);
  for (let hop = 0; hop < 5; hop += 1) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || !allowed.has(parsed.hostname)) throw new UpdateError('asset', '安装包下载地址不在允许范围。');
    const response = await fetchImpl(url, { redirect: 'manual', signal, headers: { 'user-agent': PACKAGE_NAME } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new UpdateError('network', '安装包下载跳转无效。');
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok) throw new UpdateError('network', `安装包下载失败（HTTP ${response.status}）。`);
    return bytesOf(response, MAX_ARCHIVE);
  }
  throw new UpdateError('network', '安装包下载跳转过多。');
}
export function packageCachePath(home, release) {
  if (!Number.isSafeInteger(release.id) || !Number.isSafeInteger(release.assetId) || !/^sha256:[a-f0-9]{64}$/.test(release.digest ?? '')) throw new UpdateError('state', '保存的更新记录无效。');
  return join(resolve(home), 'archived-manager', 'update-cache', `${release.id}-${release.assetId}-${release.digest.slice(7)}.tgz`);
}
export async function cacheRelease(home, release, fetchImpl = fetch) {
  const destination = packageCachePath(home, release);
  try { verifyPackage(await fs.readFile(destination), release); return destination; }
  catch (error) { if (error?.code !== 'ENOENT' && !(error instanceof UpdateError)) throw error; }
  let bytes;
  try { bytes = await downloadAsset(release, fetchImpl); }
  catch (error) { if (error instanceof UpdateError) throw error; throw new UpdateError('network', '安装包下载失败，请检查网络后重试。'); }
  verifyPackage(bytes, release);
  await fs.mkdir(join(resolve(home), 'archived-manager', 'update-cache'), { recursive: true, mode: 0o700 });
  const temporary = `${destination}.${process.pid}.tmp`;
  await fs.writeFile(temporary, bytes, { mode: 0o600 });
  await fs.rename(temporary, destination);
  return destination;
}
export async function verifyCachedRelease(home, release) {
  const path = packageCachePath(home, release);
  verifyPackage(await fs.readFile(path), release);
  return path;
}
