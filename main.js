'use strict';
const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage,
  powerMonitor, Notification, screen,
} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { Worker } = require('worker_threads');

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const CRED_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const CODEX_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions');
const ANTHROPIC_STATUS_URL = 'https://status.claude.com/api/v2/status.json';
const STATUS_CHECK_MIN_INTERVAL_MS = 5 * 60 * 1000;
const CODEX_AUTH_PATH = path.join(os.homedir(), '.codex', 'auth.json');
const CODEX_USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const WIDTH_EXPANDED = 340;
const WIDTH_COLLAPSED = 240;
const APP_DISPLAY_NAME = 'usage widget';
const LOGIN_ITEM_NAME = 'Claude Usage Widget';
const LOGIN_ITEM_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const LEGACY_LOGIN_ITEM_NAMES = ['electron.app.Claude Usage Widget', 'electron.app.Electron'];
const TRAY_GUID = '6f20d750-2f3f-4d4e-8a47-f3b40d4c6f27';

let win = null;
let tray = null;
let pollTimer = null;
let lastUsage = null;          // last successful payload sent to renderer
let lastSeverity = {};         // gauge key -> 'normal' | 'warn' | 'crit' (for notifications)
let suppressResizePersistence = false;
let suppressMovePersistence = false;
let resizePersistenceTimer = null;
let movePersistenceTimer = null;
let preferredPos = null;
const isSmokeTest = process.argv.includes('--screenshot');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

// Transparent frameless windows can render corrupted on some Windows GPU/driver combinations.
if (isWindows) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-compositing');
}

// ---------- settings ----------
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
const usageCachePath = () => path.join(app.getPath('userData'), 'usage-cache.json');
const DEFAULTS = {
  collapsed: false,
  alwaysOnTop: true,
  openAtLogin: true,
  notify: true,
  showClaude: true,
  showAmberLadder: false,
  showCodex: true,
  displayCurrency: 'USD',
  pollMinutes: 3,
  pos: null,             // {x, y}
  panelWidth: WIDTH_EXPANDED, // user-adjustable expanded width
};
const ONE_TIME = new Set(['cinder_cove']);
function isSpecialCategoryKey(key) {
  const normalized = String(key || '').toLowerCase().replace(/[-\s]+/g, '_');
  return !ONE_TIME.has(normalized) && !/^(?:five_hour|seven_day)(?:_|$)/.test(normalized);
}

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
function loadUsageCache() {
  try {
    const cached = JSON.parse(fs.readFileSync(usageCachePath(), 'utf8'));
    if (cached && cached.data && cached.fetchedAt) {
      lastUsage = {
        ok: true,
        data: cached.data,
        fetchedAt: cached.fetchedAt,
        subscriptionType: cached.subscriptionType || null,
      };
    }
  } catch {}
}
function saveUsageCache(result) {
  if (!result || !result.ok || !result.data || !result.fetchedAt) return;
  try {
    fs.writeFileSync(usageCachePath(), JSON.stringify({
      data: result.data,
      fetchedAt: result.fetchedAt,
      subscriptionType: result.subscriptionType || null,
    }));
  } catch {}
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

// ---------- local usage scanning (worker thread) ----------
// Scanning ~/.claude/projects and ~/.codex/sessions parses hundreds of large
// JSONL files. Doing that synchronously on the main process blocks window
// painting (the refresh spinner appears frozen on machines with big session
// histories), so the scan runs in a worker_thread and is awaited instead.
const LOCAL_USAGE_MODULE = path.join(__dirname, 'local-usage.js');
let scanWorker = null;
let scanSeq = 0;
let scanInFlight = null;
const scanPending = new Map(); // id -> resolve

function failPendingScans() {
  for (const resolve of scanPending.values()) resolve(null);
  scanPending.clear();
}

function ensureScanWorker() {
  if (scanWorker) return scanWorker;
  scanWorker = new Worker(LOCAL_USAGE_MODULE);
  scanWorker.on('message', (msg) => {
    const resolve = msg && scanPending.get(msg.id);
    if (resolve) {
      scanPending.delete(msg.id);
      resolve(msg.result || null);
    }
  });
  scanWorker.on('error', () => {
    failPendingScans();
    try { scanWorker.terminate(); } catch {}
    scanWorker = null;
  });
  scanWorker.on('exit', () => {
    failPendingScans();
    scanWorker = null;
  });
  return scanWorker;
}

// Resolves with { claudeLocal, codexSessions, codexSnap } or null on failure.
// Concurrent callers share one in-flight scan.
function scanLocalUsage() {
  if (scanInFlight) return scanInFlight;
  const id = ++scanSeq;
  scanInFlight = new Promise((resolve) => {
    scanPending.set(id, resolve);
    try {
      ensureScanWorker().postMessage({ id });
    } catch {
      scanPending.delete(id);
      resolve(null);
      return;
    }
    setTimeout(() => {
      if (scanPending.has(id)) {
        scanPending.delete(id);
        resolve(null);
      }
    }, 30000);
  }).finally(() => { scanInFlight = null; });
  return scanInFlight;
}

// ---------- Anthropic service status (status.claude.com) ----------
// Checked only when the usage API errors, so an API failure can be labeled as
// a global Anthropic incident instead of a local problem. Statuspage format:
// { status: { indicator: 'none'|'minor'|'major'|'critical', description } }.
let lastStatusCheckAt = 0;
let lastServiceStatus = null; // { indicator, description, checkedAt }

async function fetchServiceStatus() {
  const now = Date.now();
  if (now - lastStatusCheckAt < STATUS_CHECK_MIN_INTERVAL_MS) return lastServiceStatus;
  lastStatusCheckAt = now;
  try {
    const res = await fetch(ANTHROPIC_STATUS_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return lastServiceStatus;
    const data = await res.json();
    const status = data && data.status;
    lastServiceStatus = {
      indicator: (status && status.indicator) || 'none',
      description: (status && status.description) || '',
      checkedAt: now,
    };
  } catch {}
  return lastServiceStatus;
}

function codexUsageFromRateLimits(rl, updatedAt, sessions) {
  const nowSec = Date.now() / 1000;
  // A snapshot is only rewritten when Codex is actually used, so after a window
  // rolls over the newest snapshot still shows the pre-reset percentage. If its
  // resets_at is already in the past, the window has reset: usage is 0 now and
  // the next reset is one window length later. Advance until it's in the future
  // so a manual refresh reflects the reset even without new Codex activity.
  const mk = (w) => {
    if (!w || typeof w.used_percent !== 'number') return null;
    let pct = w.used_percent;
    let resetsSec = w.resets_at || null;
    if (resetsSec && resetsSec <= nowSec) {
      pct = 0;
      if (w.window_minutes > 0) {
        const span = w.window_minutes * 60;
        while (resetsSec <= nowSec) resetsSec += span;
      } else {
        resetsSec = null;
      }
    }
    return { pct, resetsAt: resetsSec ? new Date(resetsSec * 1000).toISOString() : null };
  };
  // Codex reports windows in `primary`/`secondary`, but which is which is not
  // fixed: as of 2026-07 Codex temporarily dropped the 5h window, leaving only
  // the weekly window (window_minutes 10080) in `primary`. Classify by window
  // length instead of slot position so a lone weekly window is never mislabeled
  // as the 5-hour gauge. window_minutes ≈ 300 → 5h; ≈ 10080 → weekly.
  let five = null;
  let week = null;
  for (const w of [rl.primary, rl.secondary]) {
    if (!w || typeof w.used_percent !== 'number') continue;
    const g = mk(w);
    if (!g) continue;
    const wm = w.window_minutes || 0;
    if (wm > 0 && wm <= 1440) { if (!five) five = g; } // ≤ 1 day → short (5h) window
    else if (!week) week = g;                          // weekly (or unknown long window)
  }
  if (!five && !week) return null;
  return {
    fiveHour: five,
    sevenDay: week,
    planType: rl.plan_type || null,
    updatedAt: updatedAt || null,
    sessions: sessions || null,
  };
}

// Build Codex usage from the worker's offline snapshot (rollout files).
function codexUsageFromScan(local) {
  const snap = local && local.codexSnap;
  if (!snap) return null;
  return codexUsageFromRateLimits(snap.rl, snap.ts, local.codexSessions);
}

async function fetchCodexUsage(local) {
  const fallback = () => codexUsageFromScan(local);
  let auth;
  try { auth = JSON.parse(fs.readFileSync(CODEX_AUTH_PATH, 'utf8')); } catch { return fallback(); }
  const token = auth && auth.tokens && auth.tokens.access_token;
  const accountId = auth && auth.tokens && auth.tokens.account_id;
  if (!token || !accountId || auth.auth_mode !== 'chatgpt') return fallback();
  try {
    const res = await fetch(CODEX_USAGE_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'ChatGPT-Account-Id': accountId,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return fallback();
    const data = await res.json();
    const rateLimit = data && data.rate_limit;
    if (!rateLimit) return fallback();
    const mapWindow = (w) => w && ({
      used_percent: w.used_percent,
      window_minutes: w.limit_window_seconds / 60,
      resets_at: w.reset_at || (w.reset_after_seconds
        ? Math.floor(Date.now() / 1000) + w.reset_after_seconds
        : null),
    });
    return codexUsageFromRateLimits({
      primary: mapWindow(rateLimit.primary_window),
      secondary: mapWindow(rateLimit.secondary_window),
      plan_type: data.plan_type || null,
    }, Date.now(), local ? local.codexSessions : null);
  } catch {
    return fallback();
  }
}

function codexGauges(codex) {
  if (!codex) return [];
  const out = [];
  if (codex.fiveHour) out.push({ key: 'codex_five_hour', utilization: codex.fiveHour.pct, resetsAt: codex.fiveHour.resetsAt });
  if (codex.sevenDay) out.push({ key: 'codex_seven_day', utilization: codex.sevenDay.pct, resetsAt: codex.sevenDay.resetsAt });
  return out;
}

async function pollNow() {
  const [result, local] = await Promise.all([fetchUsage(), scanLocalUsage()]);
  const codex = await fetchCodexUsage(local);
  // On API failure (other than missing local credentials), check whether
  // Anthropic is having a global incident so the footer can say so.
  let serviceStatus = null;
  if (!result.ok && result.error !== 'no-credentials') {
    serviceStatus = await fetchServiceStatus();
  }
  if (result.ok) {
    lastUsage = result;
    saveUsageCache(result);
  }
  maybeNotify(result.ok ? result.data : null, codex);
  const payload = result.ok ? { ...result } : { ...result, stale: lastUsage };
  // Omit claudeLocal when the scan failed so the renderer keeps its last data.
  if (local) payload.claudeLocal = local.claudeLocal;
  payload.codex = codex;
  payload.serviceStatus = serviceStatus;
  if (win && !win.isDestroyed()) win.webContents.send('usage', payload);
  updateTrayTooltip(result.ok ? result.data : (lastUsage && lastUsage.data), codex);
}

function startPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(pollNow, Math.max(1, settings.pollMinutes) * 60 * 1000);
  pollNow();
}
function cachedUsagePayload() {
  if (!lastUsage || !lastUsage.data) return null;
  // claudeLocal / codex are intentionally omitted: the renderer only updates
  // them when the keys are present, and the pollNow() that immediately follows
  // supplies them from the async worker scan without blocking first paint.
  return { ...lastUsage, cached: true };
}
function showWindowAfterInitialPaint(createdWindow) {
  setTimeout(() => {
    if (createdWindow.isDestroyed()) return;
    createdWindow.setSkipTaskbar(true);
    createdWindow.show();
    scheduleWidgetPin(createdWindow);
  }, 80);
}

// ---------- gauge extraction (shared logic with renderer, kept minimal here) ----------
function extractGauges(data) {
  if (!data) return [];
  const skip = new Set(['limits', 'spend', 'extra_usage', 'member_dashboard_available']);
  const out = [];
  for (const [key, val] of Object.entries(data)) {
    if (skip.has(key) || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    if (!settings.showAmberLadder && isSpecialCategoryKey(key)) continue;
    if (typeof val.utilization !== 'number') continue;
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

function maybeNotify(data, codex) {
  if (!settings.notify) { lastSeverity = {}; return; }
  const gauges = settings.showClaude ? extractGauges(data) : [];
  if (settings.showCodex) gauges.push(...codexGauges(codex));
  for (const g of gauges) {
    const sev = severityOf(g.utilization);
    const prev = lastSeverity[g.key] || 'normal';
    const rank = { normal: 0, warn: 1, crit: 2 };
    if (rank[sev] > rank[prev] && Notification.isSupported()) {
      const brand = g.key.startsWith('codex_') ? 'Codex' : 'Claude';
      new Notification({
        title: `${brand} 用量警示`,
        body: `${g.key} 已使用 ${g.utilization.toFixed(1)}%${sev === 'crit' ? '，即將達到上限！' : ''}`,
        icon: trayIconPath(),
      }).show();
    }
    lastSeverity[g.key] = sev;
  }
}

// ---------- window ----------
function appIconPath() {
  return path.join(__dirname, 'assets', isMac ? 'app.icns' : 'app.ico');
}

function trayIconPath() {
  if (isWindows) return appIconPath();
  if (isMac) return path.join(__dirname, 'assets', 'trayTemplate.png');
  return path.join(__dirname, 'assets', 'tray.png');
}

function trayIconImage() {
  const icon = nativeImage.createFromPath(trayIconPath());
  if (isMac && !icon.isEmpty()) icon.setTemplateImage(true);
  return icon;
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

function expandedWidth() {
  return Math.max(WIDTH_COLLAPSED, Math.round(settings.panelWidth || WIDTH_EXPANDED));
}

function modeWidth() {
  return settings.collapsed ? WIDTH_COLLAPSED : expandedWidth();
}

function markProgrammaticResize() {
  suppressResizePersistence = true;
  suppressMovePersistence = true;
  clearTimeout(resizePersistenceTimer);
  clearTimeout(movePersistenceTimer);
  resizePersistenceTimer = setTimeout(() => {
    suppressResizePersistence = false;
  }, 100);
  movePersistenceTimer = setTimeout(() => {
    suppressMovePersistence = false;
  }, 150);
}

function clampBoundsToDisplay(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = display.workArea;
  const width = Math.min(Math.max(1, Math.round(bounds.width)), area.width);
  const height = Math.min(Math.max(1, Math.round(bounds.height)), area.height);
  const maxX = area.x + area.width - width;
  const maxY = area.y + area.height - height;
  return {
    x: Math.min(Math.max(Math.round(bounds.x), area.x), maxX),
    y: Math.min(Math.max(Math.round(bounds.y), area.y), maxY),
    width,
    height,
  };
}

function applyWidgetBounds({ width = modeWidth(), height }) {
  if (!win || win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  const [currentWidth, currentHeight] = win.getSize();
  if (!preferredPos) preferredPos = settings.pos || { x, y };
  const next = clampBoundsToDisplay({
    x: preferredPos.x,
    y: preferredPos.y,
    width: width == null ? currentWidth : width,
    height: height == null ? currentHeight : height,
  });
  if (
    next.x === x && next.y === y &&
    next.width === currentWidth && next.height === currentHeight
  ) return;
  markProgrammaticResize();
  win.setBounds(next);
}

function createWindow() {
  const pos = validatePos(settings.pos);
  preferredPos = pos || null;
  win = new BrowserWindow({
    width: modeWidth(),
    height: settings.collapsed ? 52 : 300,
    show: false,
    icon: appIconPath(),
    x: pos ? pos.x : undefined,
    y: pos ? pos.y : undefined,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    minWidth: 200,
    minHeight: 52,
    skipTaskbar: true,
    alwaysOnTop: settings.alwaysOnTop,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const createdWindow = win;
  createdWindow.on('closed', () => {
    if (win === createdWindow) win = null;
  });
  createdWindow.setSkipTaskbar(true);
  createdWindow.once('ready-to-show', () => {
    if (createdWindow.isDestroyed()) return;
    createdWindow.setSkipTaskbar(true);
  });
  applyAlwaysOnTop(win);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  createdWindow.on('show', () => scheduleWidgetPin(createdWindow, 0));
  createdWindow.on('focus', () => scheduleWidgetPin(createdWindow, 0));
  createdWindow.on('blur', () => scheduleWidgetPin(createdWindow, 80));

  win.on('moved', () => {
    if (suppressMovePersistence) return;
    const [x, y] = win.getPosition();
    preferredPos = { x, y };
    settings.pos = { x, y };
    saveSettings();
  });

  // Persist only user-adjusted width. Programmatic height fitting and mode
  // switches must not rewrite panelWidth.
  win.on('resize', () => {
    if (win.isDestroyed() || settings.collapsed || suppressResizePersistence) return;
    const bounds = win.getBounds();
    preferredPos = { x: bounds.x, y: bounds.y };
    settings.pos = preferredPos;
    settings.panelWidth = bounds.width;
    saveSettings();
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('init', { collapsed: settings.collapsed });
    win.webContents.send('settings', publicSettings());
    const cached = cachedUsagePayload();
    if (cached) win.webContents.send('usage', cached);
    showWindowAfterInitialPaint(createdWindow);
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

function liveWindow() {
  return win && !win.isDestroyed() ? win : null;
}

function setMacWorkspacePinned(target, pinned) {
  if (!isMac || !target || target.isDestroyed()) return;
  target.setVisibleOnAllWorkspaces(pinned, {
    visibleOnFullScreen: pinned,
    skipTransformProcessType: true,
  });
  if (typeof target.setHiddenInMissionControl === 'function') {
    target.setHiddenInMissionControl(pinned);
  }
}

function applyAlwaysOnTop(target = liveWindow()) {
  if (!target || target.isDestroyed() || !settings.alwaysOnTop) return;
  target.setSkipTaskbar(true);
  setMacWorkspacePinned(target, true);
  target.setAlwaysOnTop(true, 'screen-saver');
}

function clearAlwaysOnTop(target = liveWindow()) {
  if (!target || target.isDestroyed()) return;
  setMacWorkspacePinned(target, false);
  target.setAlwaysOnTop(false);
  target.setSkipTaskbar(true);
}

function keepWidgetPinned(target = liveWindow()) {
  applyAlwaysOnTop(target);
  if (!target || target.isDestroyed() || !target.isVisible()) return;
  if (typeof target.moveTop === 'function') target.moveTop();
}

function scheduleWidgetPin(target = liveWindow(), delay = 80) {
  if (!target || target.isDestroyed()) return;
  setTimeout(() => {
    if (!target.isDestroyed()) keepWidgetPinned(target);
  }, delay);
}

function showExistingOrCreateWindow() {
  const current = liveWindow();
  if (current) {
    current.setSkipTaskbar(true);
    current.show();
    current.focus();
    scheduleWidgetPin(current, 0);
    return;
  }
  if (app.isReady()) createWindow();
}

function toggleWindowVisibility() {
  const current = liveWindow();
  if (!current) {
    if (app.isReady()) createWindow();
    return;
  }
  if (current.isVisible()) {
    current.hide();
  } else {
    current.setSkipTaskbar(true);
    current.show();
    scheduleWidgetPin(current, 0);
  }
}

// Whether each CLI is present locally. Claude = its OAuth credentials file
// exists; Codex = at least one session rollout file exists. Used to disable the
// matching "顯示 …" toggle when the CLI can't be detected.
function hasCodexSessions(dir = CODEX_SESSIONS_DIR) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return false; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (hasCodexSessions(path.join(dir, e.name))) return true;
    } else if (e.isFile() && e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) {
      return true;
    }
  }
  return false;
}
function detectAvailability() {
  return {
    claudeAvailable: fs.existsSync(CRED_PATH),
    codexAvailable: hasCodexSessions(),
  };
}

function publicSettings() {
  return {
    showClaude: settings.showClaude,
    showAmberLadder: settings.showAmberLadder,
    showCodex: settings.showCodex,
    displayCurrency: settings.displayCurrency === 'TWD' ? 'TWD' : 'USD',
    notify: settings.notify,
    alwaysOnTop: settings.alwaysOnTop,
    openAtLogin: settings.openAtLogin,
    pollMinutes: settings.pollMinutes,
    ...detectAvailability(),
  };
}

function pushSettings() {
  if (win && !win.isDestroyed()) win.webContents.send('settings', publicSettings());
}

function setCollapsed(collapsed) {
  settings.collapsed = collapsed;
  saveSettings();
  if (win && !win.isDestroyed()) {
    const [, h] = win.getSize();
    applyWidgetBounds({ width: modeWidth(), height: h });
    win.webContents.send('collapsed-changed', collapsed);
  }
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
    { label: '顯示 / 隱藏', click: () => toggleWindowVisibility() },
    { label: '立即更新', click: () => pollNow() },
    { type: 'separator' },
    {
      label: '永遠置頂',
      type: 'checkbox',
      checked: settings.alwaysOnTop,
      click: (item) => {
        settings.alwaysOnTop = item.checked;
        saveSettings();
        if (item.checked) applyAlwaysOnTop(win);
        else clearAlwaysOnTop(win);
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
        pushSettings();
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
    {
      label: '顯示 Claude 用量',
      type: 'checkbox',
      checked: settings.showClaude,
      click: (item) => {
        settings.showClaude = item.checked;
        saveSettings();
        pushSettings();
      },
    },
    {
      label: '顯示特殊分類',
      type: 'checkbox',
      checked: settings.showAmberLadder,
      click: (item) => {
        settings.showAmberLadder = item.checked;
        saveSettings();
        pushSettings();
      },
    },
    {
      label: '顯示 Codex 用量',
      type: 'checkbox',
      checked: settings.showCodex,
      click: (item) => {
        settings.showCodex = item.checked;
        saveSettings();
        pushSettings();
        pollNow();
      },
    },
    {
      label: '金額幣值',
      submenu: [
        {
          label: 'USD',
          type: 'radio',
          checked: settings.displayCurrency !== 'TWD',
          click: () => {
            settings.displayCurrency = 'USD';
            saveSettings();
            pushSettings();
            rebuildTrayMenu();
          },
        },
        {
          label: 'TWD',
          type: 'radio',
          checked: settings.displayCurrency === 'TWD',
          click: () => {
            settings.displayCurrency = 'TWD';
            saveSettings();
            pushSettings();
            rebuildTrayMenu();
          },
        },
      ],
    },
    { type: 'separator' },
    { label: '結束', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  if (!isMac) tray.setContextMenu(menu);
  return menu;
}

function createTray() {
  const icon = trayIconImage();
  const trayImage = icon.isEmpty() ? nativeImage.createEmpty() : icon;
  tray = isMac ? new Tray(trayImage, TRAY_GUID) : new Tray(trayImage);
  tray.setToolTip(APP_DISPLAY_NAME);
  rebuildTrayMenu();
  tray.on('click', () => toggleWindowVisibility());
  if (isMac) {
    tray.on('right-click', () => {
      const menu = rebuildTrayMenu();
      if (menu) tray.popUpContextMenu(menu);
    });
  }
}

function updateTrayTooltip(data, codex) {
  if (!tray) return;
  const gauges = settings.showClaude ? extractGauges(data) : [];
  if (settings.showCodex) gauges.push(...codexGauges(codex));
  if (!gauges.length) { tray.setToolTip(APP_DISPLAY_NAME); return; }
  const top = gauges.reduce((a, b) => (b.utilization > a.utilization ? b : a));
  tray.setToolTip(`${APP_DISPLAY_NAME} - 最高用量 ${top.utilization.toFixed(1)}% (${top.key})`);
}

function configureMacApp() {
  if (!isMac) return;
  Menu.setApplicationMenu(null);
  if (typeof app.setActivationPolicy === 'function') app.setActivationPolicy('accessory');
  if (app.dock && typeof app.dock.hide === 'function') app.dock.hide();
}

// ---------- login item ----------
function portableLoginItemPath() {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const candidates = [
    process.env.PORTABLE_EXECUTABLE_FILE,
    portableDir ? path.join(portableDir, 'usage widget.exe') : null,
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

function packagedLoginItemPath() {
  const candidates = [
    portableLoginItemPath(),
    path.join(process.cwd(), 'usage widget.exe'),
    process.execPath,
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || process.execPath;
}

function clearLegacyLoginItems() {
  if (!isWindows) return;
  for (const name of LEGACY_LOGIN_ITEM_NAMES) {
    try { app.setLoginItemSettings({ openAtLogin: false, name }); } catch {}
  }
}

function setRunLoginItem(exePath, openAtLogin) {
  if (openAtLogin) {
    execFileSync('reg.exe', [
      'add', LOGIN_ITEM_RUN_KEY,
      '/v', LOGIN_ITEM_NAME,
      '/t', 'REG_SZ',
      '/d', '"' + exePath + '"',
      '/f',
    ], { windowsHide: true, stdio: 'ignore' });
    return;
  }
  try {
    execFileSync('reg.exe', [
      'delete', LOGIN_ITEM_RUN_KEY,
      '/v', LOGIN_ITEM_NAME,
      '/f',
    ], { windowsHide: true, stdio: 'ignore' });
  } catch {}
}

function applyLoginItem() {
  if (isMac) {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: settings.openAtLogin });
    return;
  }

  if (!app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: settings.openAtLogin,
      name: LOGIN_ITEM_NAME,
      path: process.execPath,
      args: [path.resolve(__dirname)],
    });
    return;
  }

  clearLegacyLoginItems();
  const portablePath = isWindows ? portableLoginItemPath() : null;
  if (portablePath) {
    setRunLoginItem(portablePath, settings.openAtLogin);
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: settings.openAtLogin,
    name: LOGIN_ITEM_NAME,
    path: packagedLoginItemPath(),
    args: [],
  });
}

// ---------- IPC ----------
ipcMain.on('resize', (_e, { width, height }) => {
  applyWidgetBounds({ width: modeWidth(), height });
});
// Renderer may request height fitting only; width is owned by the main process.
ipcMain.on('resize-height', (_e, { height }) => {
  applyWidgetBounds({ width: modeWidth(), height });
});
ipcMain.on('toggle-collapse', () => setCollapsed(!settings.collapsed));
ipcMain.on('refresh', async () => {
  if (win && !win.isDestroyed()) win.webContents.send('refresh-state', { active: true });
  try {
    await pollNow();
  } finally {
    if (win && !win.isDestroyed()) win.webContents.send('refresh-state', { active: false });
  }
});
ipcMain.on('open-menu', () => {
  const menu = rebuildTrayMenu();
  if (menu) menu.popup({ window: win });
});
ipcMain.on('hide-window', () => win && win.hide());

// In-app settings page writes back through here. Each key applies the same
// side effects as its tray-menu counterpart, then re-syncs the renderer and
// tray so both surfaces stay consistent.
ipcMain.on('set-setting', (_e, { key, value }) => {
  switch (key) {
    case 'pollMinutes': {
      const m = Math.min(60, Math.max(1, Math.round(Number(value) || 0)));
      if (m === settings.pollMinutes) return;
      settings.pollMinutes = m;
      startPolling(); // restart interval at the new frequency (also polls now)
      break;
    }
    case 'alwaysOnTop':
      settings.alwaysOnTop = !!value;
      if (win && !win.isDestroyed()) {
        if (settings.alwaysOnTop) applyAlwaysOnTop(win);
        else clearAlwaysOnTop(win);
      }
      break;
    case 'openAtLogin':
      settings.openAtLogin = !!value;
      applyLoginItem();
      break;
    case 'notify':
      settings.notify = !!value;
      break;
    case 'showClaude':
      settings.showClaude = !!value;
      break;
    case 'showAmberLadder':
      settings.showAmberLadder = !!value;
      break;
    case 'showCodex':
      settings.showCodex = !!value;
      pollNow();
      break;
    case 'displayCurrency':
      settings.displayCurrency = value === 'TWD' ? 'TWD' : 'USD';
      break;
    default:
      return;
  }
  saveSettings();
  pushSettings();
  rebuildTrayMenu();
});

// ---------- app lifecycle ----------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showExistingOrCreateWindow();
  });

  app.on('activate', () => {
    showExistingOrCreateWindow();
  });

  app.whenReady().then(() => {
    configureMacApp();
    loadSettings();
    loadUsageCache();
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
