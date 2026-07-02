'use strict';
const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage,
  powerMonitor, Notification, screen,
} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const CRED_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const WIDTH_EXPANDED = 340;
const WIDTH_COLLAPSED = 240;

let win = null;
let tray = null;
let pollTimer = null;
let lastUsage = null;          // last successful payload sent to renderer
let lastSeverity = {};         // gauge key -> 'normal' | 'warn' | 'crit' (for notifications)
const isSmokeTest = process.argv.includes('--screenshot');

// ---------- settings ----------
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const DEFAULTS = {
  collapsed: false,
  alwaysOnTop: true,
  openAtLogin: true,
  notify: true,
  pollMinutes: 3,
  pos: null, // {x, y}
};
let settings = { ...DEFAULTS };

function loadSettings() {
  try {
    settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) };
  } catch { settings = { ...DEFAULTS }; }
  if (process.argv.includes('--collapsed')) settings.collapsed = true;
}
let saveTimer = null;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2)); } catch {}
  }, 300);
}

// ---------- usage fetching ----------
function readAccessToken() {
  const raw = JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'));
  const oauth = raw.claudeAiOauth || raw;
  return {
    token: oauth.accessToken,
    expiresAt: oauth.expiresAt || 0,
    subscriptionType: oauth.subscriptionType || null,
  };
}

async function fetchUsage() {
  let cred;
  try {
    cred = readAccessToken();
  } catch (e) {
    return { ok: false, error: 'no-credentials' };
  }
  if (!cred.token) return { ok: false, error: 'no-credentials' };
  try {
    const res = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${cred.token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'auth', tokenExpired: cred.expiresAt < Date.now() };
    }
    if (!res.ok) return { ok: false, error: `http-${res.status}` };
    const data = await res.json();
    return { ok: true, data, fetchedAt: Date.now(), subscriptionType: cred.subscriptionType };
  } catch (e) {
    return { ok: false, error: 'network' };
  }
}

async function pollNow() {
  const result = await fetchUsage();
  if (result.ok) {
    lastUsage = result;
    maybeNotify(result.data);
  }
  const payload = result.ok ? result : { ...result, stale: lastUsage };
  if (win && !win.isDestroyed()) win.webContents.send('usage', payload);
  updateTrayTooltip(result.ok ? result.data : (lastUsage && lastUsage.data));
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(pollNow, Math.max(1, settings.pollMinutes) * 60 * 1000);
  pollNow();
}

// ---------- gauge extraction (shared logic with renderer, kept minimal here) ----------
function extractGauges(data) {
  if (!data) return [];
  const skip = new Set(['limits', 'spend', 'extra_usage', 'member_dashboard_available']);
  const out = [];
  for (const [key, val] of Object.entries(data)) {
    if (skip.has(key) || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    if (typeof val.utilization !== 'number') continue;
    const meaningful = val.limit_dollars != null || val.resets_at || val.utilization > 0;
    if (!meaningful) continue;
    out.push({ key, utilization: val.utilization });
  }
  if (data.extra_usage && data.extra_usage.is_enabled) {
    out.push({ key: 'extra_usage', utilization: data.extra_usage.utilization || 0 });
  }
  return out;
}

function severityOf(pct) {
  if (pct >= 95) return 'crit';
  if (pct >= 80) return 'warn';
  return 'normal';
}

function maybeNotify(data) {
  if (!settings.notify) { lastSeverity = {}; return; }
  for (const g of extractGauges(data)) {
    const sev = severityOf(g.utilization);
    const prev = lastSeverity[g.key] || 'normal';
    const rank = { normal: 0, warn: 1, crit: 2 };
    if (rank[sev] > rank[prev] && Notification.isSupported()) {
      new Notification({
        title: 'Claude 用量警示',
        body: `${g.key} 已使用 ${g.utilization.toFixed(1)}%${sev === 'crit' ? '，即將達到上限！' : ''}`,
        icon: trayIconPath(),
      }).show();
    }
    lastSeverity[g.key] = sev;
  }
}

// ---------- window ----------
function trayIconPath() {
  return path.join(__dirname, 'assets', 'tray.png');
}

function validatePos(pos) {
  if (!pos) return null;
  const displays = screen.getAllDisplays();
  const onScreen = displays.some((d) => {
    const b = d.workArea;
    return pos.x >= b.x - 50 && pos.x < b.x + b.width - 50 &&
           pos.y >= b.y - 20 && pos.y < b.y + b.height - 50;
  });
  return onScreen ? pos : null;
}

function createWindow() {
  const pos = validatePos(settings.pos);
  win = new BrowserWindow({
    width: settings.collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED,
    height: settings.collapsed ? 52 : 300,
    x: pos ? pos.x : undefined,
    y: pos ? pos.y : undefined,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: settings.alwaysOnTop,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (settings.alwaysOnTop) win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('moved', () => {
    const [x, y] = win.getPosition();
    settings.pos = { x, y };
    saveSettings();
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('init', { collapsed: settings.collapsed });
    pollNow();
  });

  if (isSmokeTest) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const img = await win.webContents.capturePage();
          const out = process.argv[process.argv.indexOf('--screenshot') + 1] ||
            path.join(os.tmpdir(), 'widget-screenshot.png');
          fs.writeFileSync(out, img.toPNG());
          console.log('screenshot:', out);
        } catch (e) { console.error('screenshot failed:', e.message); }
        app.quit();
      }, 5000);
    });
  }
}

function setCollapsed(collapsed) {
  settings.collapsed = collapsed;
  saveSettings();
  if (win && !win.isDestroyed()) win.webContents.send('collapsed-changed', collapsed);
  rebuildTrayMenu();
}

// ---------- tray ----------
function rebuildTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: settings.collapsed ? '展開面板' : '縮小成膠囊',
      click: () => setCollapsed(!settings.collapsed),
    },
    { label: '顯示 / 隱藏', click: () => (win.isVisible() ? win.hide() : win.show()) },
    { label: '立即更新', click: () => pollNow() },
    { type: 'separator' },
    {
      label: '永遠置頂',
      type: 'checkbox',
      checked: settings.alwaysOnTop,
      click: (item) => {
        settings.alwaysOnTop = item.checked;
        saveSettings();
        win.setAlwaysOnTop(item.checked, 'screen-saver');
      },
    },
    {
      label: '開機自動啟動',
      type: 'checkbox',
      checked: settings.openAtLogin,
      click: (item) => {
        settings.openAtLogin = item.checked;
        saveSettings();
        applyLoginItem();
      },
    },
    {
      label: '用量警示通知',
      type: 'checkbox',
      checked: settings.notify,
      click: (item) => {
        settings.notify = item.checked;
        saveSettings();
      },
    },
    { type: 'separator' },
    { label: '結束', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  return menu;
}

function createTray() {
  const icon = nativeImage.createFromPath(trayIconPath());
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('Claude Usage Widget');
  rebuildTrayMenu();
  tray.on('click', () => (win.isVisible() ? win.hide() : win.show()));
}

function updateTrayTooltip(data) {
  if (!tray) return;
  const gauges = extractGauges(data);
  if (!gauges.length) { tray.setToolTip('Claude Usage Widget'); return; }
  const top = gauges.reduce((a, b) => (b.utilization > a.utilization ? b : a));
  tray.setToolTip(`Claude Usage — 最高用量 ${top.utilization.toFixed(1)}% (${top.key})`);
}

// ---------- login item ----------
function applyLoginItem() {
  if (!app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: settings.openAtLogin,
      path: process.execPath,
      args: [path.resolve(__dirname)],
    });
  } else {
    app.setLoginItemSettings({ openAtLogin: settings.openAtLogin });
  }
}

// ---------- IPC ----------
ipcMain.on('resize', (_e, { width, height }) => {
  if (!win || win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  win.setBounds({ x, y, width: Math.round(width), height: Math.round(height) });
});
ipcMain.on('toggle-collapse', () => setCollapsed(!settings.collapsed));
ipcMain.on('refresh', () => pollNow());
ipcMain.on('open-menu', () => {
  const menu = rebuildTrayMenu();
  if (menu) menu.popup({ window: win });
});
ipcMain.on('hide-window', () => win && win.hide());

// ---------- app lifecycle ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { win.show(); win.focus(); }
  });

  app.whenReady().then(() => {
    loadSettings();
    createWindow();
    createTray();
    applyLoginItem();
    startPolling();
    powerMonitor.on('resume', () => setTimeout(pollNow, 3000));
  });

  app.on('window-all-closed', (e) => {
    // stay in tray; quit only via menu
    if (!app.isQuitting && !isSmokeTest) return;
    app.quit();
  });
}
