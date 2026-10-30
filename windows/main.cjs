'use strict';

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

app.setName('Novabox');
app.setAppUserModelId('com.novabox.desktop');

const PORT = 8787;
const HOST = '127.0.0.1';

let mainWindow = null;
let serverProcess = null;
let serverLog = null;
let shuttingDown = false;

function appRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app')
    : path.resolve(__dirname, '..', 'app');
}

function nodeBinary() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'node', 'node.exe');
  return process.env.NOVABOX_NODE || path.join(__dirname, 'node', 'node.exe');
}

function userPaths() {
  const root = app.getPath('userData');
  return {
    root,
    data: path.join(root, 'data'),
    tools: path.join(root, 'tools'),
    logs: path.join(root, 'logs')
  };
}

function seedTools(root, toolsDir) {
  const source = path.join(root, 'tools');
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(toolsDir, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const destination = path.join(toolsDir, entry.name);
    if (!fs.existsSync(destination)) {
      fs.cpSync(path.join(source, entry.name), destination, { recursive: true });
    }
  }
  fs.mkdirSync(path.join(toolsDir, 'user'), { recursive: true });
}

function healthCheck(timeout = 800) {
  return new Promise((resolve) => {
    const request = http.get({ host: HOST, port: PORT, path: '/api/health', timeout }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          const payload = JSON.parse(body);
          resolve(response.statusCode === 200 && payload && payload.name === 'Novabox');
        } catch {
          resolve(false);
        }
      });
    });
    request.on('timeout', () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await healthCheck()) return true;
    if (serverProcess && serverProcess.exitCode !== null) return false;
    await sleep(200);
  }
  return false;
}

function appendLog(stream) {
  if (!stream) return;
  stream.on('data', (chunk) => {
    serverLog?.write(chunk);
    process.stdout.write(chunk);
  });
}

function startServer() {
  const root = appRoot();
  const executable = nodeBinary();
  const scripts = path.join(root, 'server.mjs');
  const paths = userPaths();

  if (!fs.existsSync(scripts)) throw new Error(`安装包缺少服务端文件：${scripts}`);
  if (!fs.existsSync(executable)) throw new Error(`安装包缺少 Node 运行时：${executable}`);

  fs.mkdirSync(paths.data, { recursive: true });
  fs.mkdirSync(paths.logs, { recursive: true });
  seedTools(root, paths.tools);

  serverLog = fs.createWriteStream(path.join(paths.logs, 'server.log'), { flags: 'a' });
  serverLog.write(`\n=== Novabox launch ${new Date().toISOString()} ===\n`);

  serverProcess = spawn(executable, [scripts], {
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NOVABOX_DATA_DIR: paths.data,
      NOVABOX_TOOLS_DIR: paths.tools,
      NOVABOX_PORT: String(PORT),
      NOVABOX_HOST: HOST,
      NOVABOX_VERSION: app.getVersion()
    }
  });
  appendLog(serverProcess.stdout);
  appendLog(serverProcess.stderr);
  serverProcess.on('error', (error) => {
    serverLog?.write(`\n[spawn error] ${error.message}\n`);
  });
}

function stopServer() {
  if (!serverProcess) return;
  const processId = serverProcess.pid;
  serverProcess = null;
  if (!processId) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(processId), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      process.kill(processId, 'SIGTERM');
    }
  } catch {
    // The process may already be gone.
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 920,
    minWidth: 380,
    minHeight: 620,
    title: 'Novabox',
    backgroundColor: '#f6f5f1',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadURL(`http://${HOST}:${PORT}/?shell=desktop&platform=win`);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://${HOST}:${PORT}`)) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });
}

async function boot() {
  try {
    if (await healthCheck()) {
      createWindow();
      return;
    }
    startServer();
    if (!await waitForHealth()) {
      const logFile = path.join(userPaths().logs, 'server.log');
      throw new Error(`本地内核启动失败或端口 ${PORT} 被占用。\n日志：${logFile}`);
    }
    createWindow();
  } catch (error) {
    dialog.showErrorBox('Novabox 启动失败', error?.message || String(error));
    app.quit();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(boot);

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });

  app.on('before-quit', () => {
    shuttingDown = true;
    stopServer();
    serverLog?.end();
    serverLog = null;
  });

  app.on('window-all-closed', () => {
    if (!shuttingDown) app.quit();
  });
}
