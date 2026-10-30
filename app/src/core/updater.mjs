import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { APP_ROOT, DATA_DIR } from './paths.mjs';

const execFileAsync = promisify(execFile);
const CONFIG_PATH = path.join(DATA_DIR, 'update.json');
const RELEASE_API = 'https://api.github.com/repos';
// 默认发布源；可用 NOVABOX_UPDATE_REPO 或 update.json 覆盖。
const DEFAULT_UPDATE_REPO = 'Cc-kris/novabox';

export class UpdaterError extends Error {
  constructor(message, code = 'UPDATE_ERROR') {
    super(message);
    this.code = code;
  }
}

let state = {
  active: false,
  status: 'idle',
  progress: 0,
  message: '尚未检查更新',
  version: '',
  error: '',
  updatedAt: new Date().toISOString()
};

function snapshot() {
  return { ...state };
}

function patch(next) {
  state = { ...state, ...next, updatedAt: new Date().toISOString() };
}

function readPlistVersion(file) {
  try {
    const xml = fs.readFileSync(file, 'utf8');
    const match = xml.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
    return match?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

export function currentVersion() {
  const bundle = appBundlePath();
  const candidates = [
    process.env.NOVABOX_VERSION,
    bundle ? path.join(bundle, 'Contents/Info.plist') : '',
    path.join(path.dirname(process.execPath), '../../Info.plist'),
    path.join(APP_ROOT, '../desktop/Resources/Info.plist')
  ].filter(Boolean);
  for (const file of candidates) {
    const version = readPlistVersion(file);
    if (version) return version;
  }
  return '1.1.0';
}

export function appBundlePath() {
  let dir = path.dirname(process.execPath);
  while (dir && dir !== path.dirname(dir)) {
    if (dir.endsWith('.app')) return dir;
    dir = path.dirname(dir);
  }
  return '';
}

async function readConfig() {
  try {
    const raw = await fsp.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.repo === 'string' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeConfig(repo) {
  await fsp.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fsp.writeFile(CONFIG_PATH, `${JSON.stringify({ repo }, null, 2)}\n`, { mode: 0o600 });
}

export async function getRepo() {
  const envRepo = String(process.env.NOVABOX_UPDATE_REPO || '').trim();
  if (envRepo) return envRepo;
  const config = await readConfig();
  return String(config.repo || '').trim() || DEFAULT_UPDATE_REPO;
}

export async function configureRepo(repo) {
  const clean = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(clean)) {
    throw new UpdaterError('仓库格式应为 owner/repo', 'BAD_REPO');
  }
  await writeConfig(clean);
  return clean;
}

export async function status() {
  const repo = await getRepo();
  const appPath = appBundlePath();
  return {
    currentVersion: currentVersion(),
    repo,
    platform: process.platform,
    configured: Boolean(repo),
    canInstall: Boolean(appPath) && fs.existsSync(appPath),
    appPath,
    state: snapshot()
  };
}

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function compareVersions(a, b) {
  const left = normalizeVersion(a).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(b).split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] || 0) - (right[index] || 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

async function githubJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Novabox-Updater',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 404) throw new UpdaterError('找不到该 GitHub 仓库或 Release', 'NOT_FOUND');
    if (response.status === 403) throw new UpdaterError('GitHub API 访问受限，请稍后再试', 'RATE_LIMIT');
    throw new UpdaterError(`GitHub 返回 ${response.status}${body ? `：${body.slice(0, 120)}` : ''}`, 'GITHUB_ERROR');
  }
  return response.json();
}

export async function checkUpdate(repoOverride = '') {
  const repo = String(repoOverride || '').trim() || await getRepo();
  if (!repo) throw new UpdaterError('还没有配置更新仓库', 'NOT_CONFIGURED');
  const release = await githubJson(`${RELEASE_API}/${repo}/releases/latest`);
  const latest = normalizeVersion(release.tag_name || release.name);
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const asset = process.platform === 'win32'
    ? assets.find((item) => /^novabox.*windows.*\.exe$/i.test(item.name)) || assets.find((item) => /\.exe$/i.test(item.name))
    : assets.find((item) => /^novabox.*\.zip$/i.test(item.name)) || assets.find((item) => /\.zip$/i.test(item.name));
  const info = {
    repo,
    currentVersion: currentVersion(),
    latestVersion: latest,
    hasUpdate: compareVersions(latest, currentVersion()) > 0,
    releaseUrl: release.html_url || `https://github.com/${repo}/releases`,
    notes: String(release.body || '').slice(0, 4000),
    publishedAt: release.published_at || '',
    asset: asset ? { name: asset.name, size: asset.size, url: asset.browser_download_url } : null,
    canInstall: Boolean(appBundlePath())
  };
  if (!info.hasUpdate) {
    patch({ status: 'current', progress: 100, message: `已是最新版本 v${info.currentVersion}`, version: latest, error: '' });
  } else {
    patch({ status: 'available', progress: 0, message: `发现新版本 v${latest}`, version: latest, error: '' });
  }
  return info;
}

async function download(url, destination, onProgress) {
  const response = await fetch(url, {
    headers: { Accept: 'application/octet-stream', 'User-Agent': 'Novabox-Updater' },
    redirect: 'follow'
  });
  if (!response.ok || !response.body) throw new UpdaterError(`下载安装包失败：HTTP ${response.status}`, 'DOWNLOAD_FAILED');
  const total = Number(response.headers.get('content-length') || 0);
  const handle = fs.createWriteStream(destination, { mode: 0o600 });
  let received = 0;
  try {
    for await (const chunk of response.body) {
      received += chunk.length;
      if (!handle.write(chunk)) await new Promise((resolve) => handle.once('drain', resolve));
      if (total > 0) onProgress(received / total);
    }
  } finally {
    await new Promise((resolve, reject) => {
      handle.end((error) => error ? reject(error) : resolve());
    });
  }
  return received;
}

async function findApp(root) {
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'Novabox.app' && entry.isDirectory()) return path.join(current, entry.name);
      if (entry.isDirectory() && current.split(path.sep).length - root.split(path.sep).length < 3) {
        queue.push(path.join(current, entry.name));
      }
    }
  }
  return '';
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function performInstall(info) {
  if (!info.asset) throw new UpdaterError('Release 中没有 Novabox zip 安装包', 'NO_ASSET');
  const target = appBundlePath();
  if (!target) throw new UpdaterError('只有安装版 App 支持自动更新', 'NOT_BUNDLED');

  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), 'novabox-update-'));
  const archive = path.join(temp, info.asset.name || 'Novabox.zip');
  const stage = path.join(temp, 'stage');
  await fsp.mkdir(stage, { recursive: true });

  patch({ active: true, status: 'downloading', progress: 2, message: '正在下载更新…', error: '', version: info.latestVersion });
  await download(info.asset.url, archive, (ratio) => {
    patch({ progress: Math.min(74, Math.round(2 + ratio * 72)), message: `正在下载更新 ${Math.round(ratio * 100)}%` });
  });

  patch({ status: 'verifying', progress: 78, message: '正在解压并校验安装包…' });
  await execFileAsync('/usr/bin/ditto', ['-x', '-k', archive, stage]);
  const stagedApp = await findApp(stage);
  if (!stagedApp) throw new UpdaterError('安装包中没有找到 Novabox.app', 'BAD_ARCHIVE');
  await execFileAsync('/usr/bin/codesign', ['--verify', '--deep', '--strict', stagedApp]).catch(() => {
    throw new UpdaterError('安装包签名校验失败', 'BAD_SIGNATURE');
  });

  patch({ status: 'installing', progress: 92, message: '正在安装，应用即将重启…' });
  const logDir = path.join(os.homedir(), 'Library/Logs/Novabox');
  await fsp.mkdir(logDir, { recursive: true });
  const script = path.join(temp, 'install.zsh');
  const body = `#!/bin/zsh
set -e
exec >> ${shellQuote(path.join(logDir, 'update.log'))} 2>&1
echo "=== update $(date) ==="
APP_PID=${process.ppid}
TARGET=${shellQuote(target)}
STAGED=${shellQuote(stagedApp)}
TEMP=${shellQuote(temp)}
sleep 1
kill -TERM "$APP_PID" 2>/dev/null || true
for i in {1..80}; do
  kill -0 "$APP_PID" 2>/dev/null || break
  sleep 0.25
done
rm -rf "$TARGET"
/usr/bin/ditto "$STAGED" "$TARGET"
/usr/bin/xattr -dr com.apple.quarantine "$TARGET" 2>/dev/null || true
rm -rf "$TEMP"
/usr/bin/open "$TARGET"
`;
  await fsp.writeFile(script, body, { mode: 0o700 });
  const child = spawn('/bin/zsh', [script], { detached: true, stdio: 'ignore' });
  child.unref();
  patch({ status: 'restarting', progress: 100, message: '安装完成，正在重启…' });
}

export async function installUpdate(repoOverride = '') {
  if (state.active) throw new UpdaterError('已有更新正在进行', 'BUSY');
  const info = await checkUpdate(repoOverride);
  if (!info.hasUpdate) throw new UpdaterError(`当前已是最新版本 v${info.currentVersion}`, 'NO_UPDATE');
  if (!appBundlePath()) throw new UpdaterError('只有安装版 App 支持自动更新', 'NOT_BUNDLED');
  if (!info.asset) throw new UpdaterError('Release 中没有 Novabox zip 安装包', 'NO_ASSET');

  void performInstall(info).catch((error) => {
    patch({ active: false, status: 'error', progress: 0, message: '更新失败', error: error.message });
  });
  return snapshot();
}
