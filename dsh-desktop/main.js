/**
 * dsh-desktop — native shell for the DeepSeek Harness web GUI.
 *
 * Responsibilities:
 *  1. Attach to an already-running `dsh web` server (default 127.0.0.1:3080) if one
 *     is up, otherwise spawn `dsh web --port <freePort>` as a managed child.
 *  2. Open a native Electron window pointed at the harness UI.
 *  3. Provide desktop conveniences: single-instance lock, tray (minimize-to-tray,
 *     show / reload / open-in-browser / quit), persisted window bounds, and an
 *     auto-clean process ledger so a spawned background server is stopped on quit.
 *
 * Code reuse: mirrors the local Codex `process_manager/chat_processes.json` pattern
 * (a small JSON ledger of managed user-processes) so stray servers can be listed and
 * cleaned, and treats the harness UI itself as the single source of truth — the shell
 * only hosts it, it never re-implements the frontend.
 */
const { app, BrowserWindow, Tray, Menu, nativeImage, shell } = require('electron');
const { spawn, execFile } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DEFAULT_PORT = 3080;
const DEFAULT_HOST = '127.0.0.1';
const DESKTOP_DIR = (() => {
  const base = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  return path.join(base, 'desktop');
})();
const PROCESS_LEDGER = path.join(DESKTOP_DIR, 'processes.json');
const WINDOW_STATE_FILE = path.join(DESKTOP_DIR, 'window-state.json');

let mainWindow = null;
let tray = null;
let spawnedServer = null; // { proc, port, url, spawnedAt }
let isQuitting = false;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function ensureDataDir() {
  fs.mkdirSync(DESKTOP_DIR, { recursive: true });
}

function log(entry, level = 'info') {
  try {
    ensureDataDir();
    const line = `${new Date().toISOString()} [${level}] ${entry}\n`;
    fs.appendFileSync(path.join(DESKTOP_DIR, 'desktop.log'), line);
  } catch (_) { /* non-fatal */ }
  if (process.env.DSH_DESKTOP_LOGGING !== '0') console.error(entry);
}

function resolveDshCommand() {
  // Prefer an explicit override, then the PATH shim.
  if (process.env.DSH_DESKTOP_DSH) return process.env.DSH_DESKTOP_DSH;
  if (process.platform === 'win32') return 'dsh.cmd'; // npm global shim on PATH
  return 'dsh';
}

// Resolve the real system `node` executable so we can spawn the dsh server
// directly (no .cmd shell layer). This keeps child.pid pointing at the actual
// server process, so taskkill /T reliably reaps the whole tree.
function findOnPath(name) {
  const pathDirs = (process.env.PATH || '').split(';');
  for (const dir of pathDirs) {
    if (!dir) continue;
    try {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) return full;
    } catch (_) { /* skip */ }
  }
  return null;
}

function findDshEntry() {
  // Heuristic locations of the dsh CLI JS entry. Prefer explicit override.
  const candidates = [
    process.env.DSH_DESKTOP_DSH && process.env.DSH_DESKTOP_DSH.endsWith('.js') ? process.env.DSH_DESKTOP_DSH : null,
    path.join(path.dirname(resolveDshCommand() || ''), '..', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'nodejs', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
  ].filter(Boolean);
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch (_) {} }
  return null;
}

// Returns { file, args, shell } to launch the dsh server.
function resolveDshLauncher() {
  if (process.env.DSH_DESKTOP_DSH) {
    const p = process.env.DSH_DESKTOP_DSH;
    return { file: p, args: [], shell: p.toLowerCase().endsWith('.cmd') || p.toLowerCase().endsWith('.bat') };
  }
  const node = process.env.npm_node_execpath || findOnPath('node.exe') || (process.platform === 'win32' ? 'node.exe' : 'node');
  const entry = findDshEntry();
  if (entry) return { file: node, args: [entry], shell: false };
  const cmd = resolveDshCommand();
  return { file: cmd, args: [], shell: process.platform === 'win32' };
}

function isPortOpen(port, host = DEFAULT_HOST, timeout = 700) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(timeout);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
  });
}

// Reserve a free loopback port and return a release() callback. The caller must
// release the reservation before the child server binds the port; holding it
// while spawning only makes the child fail with EADDRINUSE.
// Returns { port, release }.
function probeFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, DEFAULT_HOST, () => {
      const port = srv.address().port;
      const release = () => new Promise((res) => srv.close(() => res()));
      resolve({ port, release });
    });
    srv.on('error', reject);
  });
}

function waitsForServer(url, { timeoutMs = 60000, intervalMs = 400 } = {}) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, { timeout: 1500 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('timeout', () => { req.destroy(); scheduleRetry(); });
      req.on('error', () => { scheduleRetry(); });
    };
    const scheduleRetry = () => {
      if (Date.now() > deadline) return reject(new Error(`timed out waiting for ${url}`));
      setTimeout(attempt, intervalMs);
    };
    attempt();
  });
}

// --- Process ledger (mirrors Codex process_manager/chat_processes.json) -----
function writeLedger() {
  try {
    ensureDataDir();
    fs.writeFileSync(PROCESS_LEDGER, JSON.stringify({ app: 'dsh-desktop', processes: spawnServerProcesses() }, null, 2));
  } catch (_) { /* non-fatal */ }
}

function spawnServerProcesses() {
  const procs = [];
  if (spawnedServer && spawnedServer.proc && spawnedServer.proc.pid) {
    procs.push({
      pid: spawnedServer.proc.pid,
      kind: 'dsh-web',
      port: spawnedServer.port,
      url: spawnedServer.url,
      spawnHint: `${resolveDshCommand()} web --port ${spawnedServer.port}`,
      spawnedAt: spawnedServer.spawnedAt,
    });
  }
  return procs;
}

// ---------------------------------------------------------------------------
// Spawn / attach
// ---------------------------------------------------------------------------
function launchDshServer(port, host) {
  return new Promise((resolve, reject) => {
    const launcher = resolveDshLauncher();
    const args = [...launcher.args, 'web', '--host', host, '--port', String(port)];
    log(`spawning: ${launcher.file} ${args.join(' ')}${launcher.shell ? ' (shell)' : ''}`);
    const child = spawn(launcher.file, args, {
      shell: launcher.shell,
      windowsHide: true,
      env: { ...process.env, DSH_DESKTOP_PARENT_PID: String(process.pid) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => { output += d.toString(); flushTail(d.toString()); });
    child.stderr.on('data', (d) => { flushTail(d.toString()); });
    child.on('error', (err) => reject(err));
    child.on('exit', (code, signal) => {
      if (isQuitting) return;
      log(`dsh web exited unexpectedly code=${code} signal=${signal}`, 'warn');
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.webContents) {
        mainWindow.webContents.send('server-exited', { code, signal, output: output.slice(-4000) });
      }
    });
    const flushTail = (text) => {
      try {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
          mainWindow.webContents.send('server-log', String(text).slice(-1000));
        }
      } catch (_) { /* no-op */ }
    };
    spawnedServer = { proc: child, port, url: `http://${host}:${port}`, spawnedAt: new Date().toISOString() };
    writeLedger();
    resolve(spawnedServer);
  });
}

async function ensureServerUrl(attachMode = process.env.DSH_DESKTOP_ATTACH === '1') {
  // Standalone (default): the desktop app fully owns a dedicated server on a
  // private free port — it never mixes with a separately-launched harness GUI,
  // so the window displays independently with no external web frame.
  if (!attachMode) {
    const res = await probeFreePort();
    const url = `http://${DEFAULT_HOST}:${res.port}`;
    await res.release();
    await launchDshServer(res.port, DEFAULT_HOST);
    await waitsForServer(url);
    log(`standalone server ready at ${url} (managed pid=${spawnedServer.proc.pid})`);
    return { url, managed: true, port: res.port, standalone: true };
  }
  // Attach mode (opt-in via DSH_DESKTOP_ATTACH=1): reuse a running harness on :3080.
  if (await isPortOpen(DEFAULT_PORT, DEFAULT_HOST)) {
    log(`attaching to existing dsh web on ${DEFAULT_HOST}:${DEFAULT_PORT}`);
    const url = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
    await waitsForServer(url, { timeoutMs: 5000 }).catch(() => {});
    return { url, managed: false, port: DEFAULT_PORT, standalone: false };
  }
  // Fallback: no running server while attaching was requested — spawn one.
  const res = await probeFreePort();
  const url = `http://${DEFAULT_HOST}:${res.port}`;
  await res.release();
  await launchDshServer(res.port, DEFAULT_HOST);
  await waitsForServer(url);
  log(`server ready at ${url} (managed pid=${spawnedServer.proc.pid})`);
  return { url, managed: true, port: res.port, standalone: false };
}

// Expose a tiny dev-mode launcher helper (used by `npm run dev`).
module.exports = { launchDshServer, ensureServerUrl, isPortOpen, probeFreePort };

// ---------------------------------------------------------------------------
// Window state persistence
// ---------------------------------------------------------------------------
function readWindowState() {
  try { return JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf8')); }
  catch (_) { return {}; }
}

function persistWindowState(bounds) {
  try {
    ensureDataDir();
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(bounds));
  } catch (_) { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow(url) {
  const prev = readWindowState();
  // Native-app look: no separate window/title frame — content fills the whole
  // window edge-to-edge. On Windows a slim native overlay caption (icon +
  // minimize/maximize/close) is drawn on top so the window still feels like a
  // standalone desktop app, not "a webpage inside a frame".
  const isWin = process.platform === 'win32';
  const windowOpts = {
    width: prev.width || 1400,
    height: prev.height || 900,
    x: prev.x,
    y: prev.y,
    minWidth: 480,
    minHeight: 320,
    icon: appIcon(),
    backgroundColor: '#0b0d10',
    title: 'DeepSeek Harness',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
  if (isWin) {
    Object.assign(windowOpts, {
      frame: false,               // no browser/OS frame
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#0b0d10', symbolColor: '#c7cdd6', height: 40 },
    });
  } else {
    windowOpts.autoHideMenuBar = true;
  }

  mainWindow = new BrowserWindow(windowOpts);
  mainWindow.loadURL(url);

  // Global typography (KaiTi titles / NSimSun body / Times New Roman Latin /
  // sizes -2px) injected on every page load, on every platform.
  if (mainWindow.webContents) {
    mainWindow.webContents.once('dom-ready', () => injectTypographyCss(mainWindow.webContents));
  }

  if (isWin && mainWindow.webContents) {
    // Slim invisible drag strip across the top so the frameless window can be
    // moved by dragging the very top edge; nothing else is added, keeping the
    // page fully independent and frame-free.
    mainWindow.webContents.on('dom-ready', () => {
      mainWindow.webContents.insertCSS(`
        #dsh-desktop-drag-strip{position:fixed;top:0;left:0;right:0;height:12px;z-index:2147483646;-webkit-app-region:drag;pointer-events:auto}
      `).catch(() => {});
      mainWindow.webContents.insertCSS('body::before{content:"";position:fixed;top:0;left:0;right:0;height:12px;z-index:2147483646;-webkit-app-region:drag}').catch(() => {});
    });
  }

  // Automated GUI smoke: when DSH_DESKTOP_SMOKE=1, log success once the page
  // loads and quit — used to verify the windowed path without leaving a window.
  if (process.env.DSH_DESKTOP_SMOKE) {
    mainWindow.webContents.once('did-finish-load', () => {
      log(`gui smoke loaded ${url}`, 'info');
      setTimeout(() => quit(), 500);
    });
    mainWindow.webContents.once('did-fail-load', (_e, code, desc) => {
      log(`gui smoke load failed code=${code} desc=${desc}`, 'error');
      setTimeout(() => app.exit(3), 500);
    });
  }

  mainWindow.on('resize', () => {
    try { if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) persistWindowState(mainWindow.getBounds()); } catch (_) {}
  });
  mainWindow.on('move', () => {
    try { if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) persistWindowState(mainWindow.getBounds()); } catch (_) {}
  });

  // Minimize-to-tray: hide instead of closing, unless user chose Quit.
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // External links in a real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:/i.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, target) => {
    try {
      const current = new URL(mainWindow.webContents.getURL());
      const next = new URL(target);
      if (current.origin !== next.origin) { event.preventDefault(); shell.openExternal(target); }
    } catch (_) {}
  });
}

function iconPath() {
  // Prefer the packaged resource dir, fall back to the source tree.
  const candidates = [
    path.join(__dirname, 'resources', 'icon.png'),
    path.join(process.resourcesPath || '', 'icon.png'),
  ];
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch (_) {} }
  return null;
}

function typographyCssPath() {
  // Prefer the packaged resources dir, fall back to the source tree.
  const candidates = [
    path.join(__dirname, 'styles', 'typography.css'),
    path.join(process.resourcesPath || '', 'typography.css'),
  ];
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch (_) {} }
  return null;
}

// Inject the global typography stylesheet (KaiTi titles / NSimSun body /
// Times New Roman Latin / uniform -2px) into a webContents once the page is up.
function injectTypographyCss(webContents) {
  if (!webContents || webContents.isDestroyed()) return;
  if (process.env.DSH_DESKTOP_NO_TYPO === '1') return;
  const p = typographyCssPath();
  if (!p) return;
  try {
    const css = fs.readFileSync(p, 'utf8');
    webContents.insertCSS(css).then(() => {
      log(`typography css injected (${path.basename(p)})`, 'info');
    }).catch(() => {});
  } catch (e) {
    log(`failed to inject typography css: ${e.message}`, 'error');
  }
}

function appIcon() {
  const p = iconPath();
  if (p) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) return img;
  }
  return nativeImage.createEmpty();
}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
function createTray() {
  tray = new Tray(appIcon());
  tray.setToolTip('DeepSeek Harness');
  rebuildTrayMenu();
  tray.on('click', () => showWindow());
}

function rebuildTrayMenu() {
  const menu = Menu.buildFromTemplate([
    { label: 'Show Harness', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => { if (mainWindow) mainWindow.reload(); } },
    { label: 'Open in Browser', click: () => shell.openExternal(mainWindow ? mainWindow.webContents.getURL() : `http://${DEFAULT_HOST}:${DEFAULT_PORT}`) },
    { type: 'separator' },
    { label: 'Quit', click: () => quit() },
  ]);
  tray.setContextMenu(menu);
}

function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
}

// ---------------------------------------------------------------------------
// Single instance
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.on('window-all-closed', () => {
    // Keep running in tray; the window only hides on close. On macOS we stay
    // active by convention; on Windows we intentionally keep the tray alive.
    // No-op here: managed server must keep serving until Quit.
  });

  app.whenReady().then(main);
}

function main() {
  ensureDataDir();
  log(`dsh-desktop ${app.getVersion()} starting (electron ${process.versions.electron})`, 'info' );

  if (process.env.DSH_DESKTOP_HEADLESS) {
    // For smoke tests: verify attach/spawn logic, then exit cleanly.
    ensureServerUrl().then((info) => {
      log(`headless ready managed=${info.managed} url=${info.url} port=${info.port}`, 'info');
      // Stop any managed server, then quit so the smoke test terminates.
      stopManagedServer().finally(() => setTimeout(() => app.exit(0), 300));
    }).catch((err) => {
      log(`headless startup failed: ${err.message}`, 'error');
      app.exit(1);
    });
    return;
  }

  ensureServerUrl().then(({ url }) => {
    createWindow(url);
    createTray();
  }).catch((err) => {
    log(`startup failed: ${err.message}`, 'error');
    dialogError(`Could not start the DeepSeek Harness server.\n\n${err.message}`);
    app.quit();
  });
}

function dialogError(message) {
  const { dialog } = require('electron');
  dialog.showErrorBox('dsh-desktop', message);
}

async function stopManagedServer() {
  if (!spawnedServer || !spawnedServer.proc) return;
  const child = spawnedServer.proc;
  // Kill the whole process tree so grandchildren (npm shim, etc.) also die.
  if (process.platform === 'win32' && child.pid) {
    try {
      execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {});
    } catch (_) {}
  } else if (child.pid) {
    child.kill('SIGTERM');
  }
  spawnedServer = null;
  writeLedger();
}

function quit() {
  isQuitting = true;
  try {
    if (mainWindow) { mainWindow.removeAllListeners('close'); mainWindow.destroy(); }
  } catch (_) {}
  stopManagedServer().finally(() => app.quit());
}

app.on('before-quit', () => { isQuitting = true; });

// Expose IPC bits for the renderer (e.g. showing server status) if a preload
// is ever added; kept minimal so no context bridge is needed yet.
