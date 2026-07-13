'use strict';
const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage,
  powerMonitor, Notification, screen,
} = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const CRED_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const CLAUDE_STATS_PATH = path.join(os.homedir(), '.claude', 'stats-cache.json');
const CODEX_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions');
const WIDTH_EXPANDED = 340;
const WIDTH_COLLAPSED = 240;
const CODEX_SESSION_BREAKDOWN_LIMIT = 240;
const CLAUDE_SESSION_BREAKDOWN_LIMIT = 240;
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
function isSpecialCategoryKey(key) {
  const normalized = String(key || '').toLowerCase().replace(/[-\s]+/g, '_');
  return normalized === 'amber_ladder' || normalized === 'omelette_promotional';
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

// ---------- Codex (OpenAI) usage ----------
// Codex CLI (auth_mode: chatgpt) persists rate-limit snapshots inside its
// session rollout files (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) as
// `token_count` events. `primary` = 5h window (window_minutes 300),
// `secondary` = weekly window (10080). We read the newest snapshot; this
// mirrors what Codex's own /status shows and needs no network call.
function collectRolloutFiles(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectRolloutFiles(p, out);
    else if (e.isFile() && e.name.startsWith('rollout-') && e.name.endsWith('.jsonl')) {
      try { out.push({ p, mtime: fs.statSync(p).mtimeMs }); } catch {}
    }
  }
}

function tailRead(file, maxBytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, start);
    return buf.toString('utf8');
  } finally { fs.closeSync(fd); }
}

function headRead(file, maxBytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, maxBytes);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0);
    return buf.toString('utf8');
  } finally { fs.closeSync(fd); }
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function usageFromTokenInfo(info) {
  const u = info && info.total_token_usage;
  if (!u || typeof u !== 'object') return null;
  const totalTokens = num(u.total_tokens);
  if (totalTokens <= 0) return null;
  return {
    inputTokens: num(u.input_tokens),
    cachedInputTokens: num(u.cached_input_tokens),
    outputTokens: num(u.output_tokens),
    reasoningOutputTokens: num(u.reasoning_output_tokens),
    totalTokens,
    contextWindow: num(info && info.model_context_window),
  };
}

function textFromContent(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textFromContent).filter(Boolean).join(' ');
  if (!value || typeof value !== 'object') return '';
  if (typeof value.text === 'string') return value.text;
  if (typeof value.content === 'string' || Array.isArray(value.content)) return textFromContent(value.content);
  if (typeof value.message === 'string' || Array.isArray(value.message)) return textFromContent(value.message);
  return '';
}

function compactTaskText(text, max = 96) {
  const cleaned = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/^["']+|["']+$/g, '')
    .trim();
  if (!cleaned) return '';
  return cleaned.length > max ? cleaned.slice(0, max - 1) + '...' : cleaned;
}

function stripPromptLeadIn(text) {
  return String(text || '')
    .replace(/^(?:please|pls|can you|could you|would you|help me|i need you to|i want you to|let'?s)\b[\s,:-]*/i, '')
    .replace(/^(?:\u8acb|\u5e6b\u6211|\u5e6b\u5fd9|\u9ebb\u7169\u4f60|\u53ef\u4ee5|\u80fd\u4e0d\u80fd|\u6211\u60f3\u8981|\u6211\u8981)[\s,:\uff0c\uff1a-]*/u, '')
    .trim();
}

function titleFromPrompt(first, latest) {
  let text = compactTaskText(first || latest, 160);
  if (!text) return '';
  text = stripPromptLeadIn(text)
    .replace(/^\/[a-z][\w-]*\s+/i, '')
    .replace(/^#+\s*/, '')
    .trim();
  const sentence = text.split(/[.!?\u3002\uff01\uff1f]/u).find((part) => part.trim().length >= 8);
  if (sentence) text = sentence.trim();
  return compactTaskText(text, 56);
}

function taskFromPrompt(first, latest) {
  return compactTaskText(latest || first);
}

function parseRolloutMeta(file) {
  let text;
  try { text = headRead(file, 64 * 1024); } catch { return null; }
  for (const line of text.split('\n').slice(0, 20)) {
    if (!line.includes('"session_meta"')) continue;
    try {
      const obj = JSON.parse(line);
      const payload = obj && obj.payload;
      if (!payload) return null;
      return {
        id: payload.session_id || payload.id || null,
        cwd: payload.cwd || null,
        startedAt: payload.timestamp || obj.timestamp || null,
      };
    } catch { return null; }
  }
  return null;
}

function readRolloutSessionUsage(file, mtime) {
  let text;
  try { text = tailRead(file, 512 * 1024); } catch { return null; }
  const lines = text.split('\n');
  let usage = null;
  let updatedAt = null;
  let firstPrompt = '';
  let latestPrompt = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.includes('"token_count"')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const info = obj && obj.payload && obj.payload.info;
    usage = usageFromTokenInfo(info);
    if (usage) {
      updatedAt = obj.timestamp || null;
      break;
    }
  }
  for (const line of lines) {
    if (!line.includes('\"user\"') && !line.includes('\"message\"')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const payload = obj && obj.payload;
    const role = obj.role || (payload && payload.role) || (payload && payload.type);
    if (role && !String(role).includes('user')) continue;
    const prompt = compactTaskText(
      textFromContent(obj.message) ||
      textFromContent(obj.content) ||
      textFromContent(payload && payload.message) ||
      textFromContent(payload && payload.content),
      140,
    );
    if (!prompt || prompt === 'user') continue;
    if (!firstPrompt) firstPrompt = prompt;
    latestPrompt = prompt;
  }
  if (!usage) return null;
  const subagentHits = (text.match(/subagent/gi) || []).length;
  const workflowSubagentHits = (text.match(/workflow-subagent/gi) || []).length;
  const meta = parseRolloutMeta(file) || {};
  const id = meta.id || path.basename(file).replace(/^rollout-/, '').replace(/\.jsonl$/, '');
  const cwdName = meta.cwd ? path.basename(meta.cwd) : '';
  const title = titleFromPrompt(firstPrompt, latestPrompt);
  return {
    id,
    shortId: id.slice(0, 8),
    cwd: meta.cwd || null,
    label: title || cwdName || id.slice(0, 8),
    projectLabel: cwdName,
    title,
    task: taskFromPrompt(firstPrompt, latestPrompt),
    startedAt: meta.startedAt || null,
    updatedAt: updatedAt || new Date(mtime).toISOString(),
    subagentHits,
    workflowSubagentHits,
    ...usage,
  };
}

function codexSessionBreakdown(limit = CODEX_SESSION_BREAKDOWN_LIMIT) {
  const files = [];
  collectRolloutFiles(CODEX_SESSIONS_DIR, files);
  files.sort((a, b) => b.mtime - a.mtime);
  const sessions = [];
  for (const f of files) {
    const item = readRolloutSessionUsage(f.p, f.mtime);
    if (item) sessions.push(item);
    if (sessions.length >= limit) break;
  }
  sessions.sort((a, b) => b.totalTokens - a.totalTokens);
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  return {
    totalTokens,
    sessionCount: sessions.length,
    limit,
    sessions: sessions.map((s) => ({
      ...s,
      share: totalTokens > 0 ? (s.totalTokens / totalTokens) * 100 : 0,
    })),
  };
}
function collectClaudeTranscriptFiles(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectClaudeTranscriptFiles(p, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) {
      try { out.push({ p, mtime: fs.statSync(p).mtimeMs }); } catch {}
    }
  }
}

function claudeMessageUsage(message) {
  const u = message && message.usage;
  if (!u || typeof u !== 'object') return null;
  const inputTokens = num(u.input_tokens);
  const cachedInputTokens = num(u.cache_read_input_tokens);
  const cacheCreationInputTokens = num(u.cache_creation_input_tokens);
  const outputTokens = num(u.output_tokens);
  const totalTokens = inputTokens + cachedInputTokens + cacheCreationInputTokens + outputTokens;
  if (totalTokens <= 0) return null;
  return { inputTokens, cachedInputTokens, cacheCreationInputTokens, outputTokens, totalTokens };
}

function readClaudeTranscriptSessionUsage(file, mtime) {
  let text;
  try { text = tailRead(file, 2 * 1024 * 1024); } catch { return null; }
  const lines = text.split('\n');
  const usage = {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheCreationInputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
  let id = path.basename(file).replace(/\.jsonl$/, '');
  let cwd = null;
  let updatedAt = null;
  let startedAt = null;
  let model = null;
  let assistantTurns = 0;
  let firstPrompt = '';
  let latestPrompt = '';
  for (const line of lines) {
    if (!line.trim() || !line.includes('"message"')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.sessionId) id = obj.sessionId;
    if (obj.cwd) cwd = obj.cwd;
    if (obj.timestamp) {
      if (!startedAt) startedAt = obj.timestamp;
      updatedAt = obj.timestamp;
    }
    if (obj.type === 'user') {
      const prompt = compactTaskText(textFromContent(obj.message && obj.message.content), 140);
      if (prompt) {
        if (!firstPrompt) firstPrompt = prompt;
        latestPrompt = prompt;
      }
    }
    if (obj.type !== 'assistant') continue;
    if (obj.message && obj.message.model) model = obj.message.model;
    const u = claudeMessageUsage(obj.message);
    if (!u) continue;
    assistantTurns += 1;
    usage.inputTokens += u.inputTokens;
    usage.cachedInputTokens += u.cachedInputTokens;
    usage.cacheCreationInputTokens += u.cacheCreationInputTokens;
    usage.outputTokens += u.outputTokens;
    usage.totalTokens += u.totalTokens;
  }
  if (usage.totalTokens <= 0) return null;
  const cwdName = cwd ? path.basename(cwd) : '';
  const title = titleFromPrompt(firstPrompt, latestPrompt);
  return {
    id,
    shortId: id.slice(0, 8),
    cwd,
    label: title || cwdName || id.slice(0, 8),
    projectLabel: cwdName,
    title,
    task: taskFromPrompt(firstPrompt, latestPrompt),
    startedAt,
    updatedAt: updatedAt || new Date(mtime).toISOString(),
    model,
    assistantTurns,
    ...usage,
  };
}

function claudeSessionBreakdown(limit = CLAUDE_SESSION_BREAKDOWN_LIMIT) {
  const files = [];
  collectClaudeTranscriptFiles(CLAUDE_PROJECTS_DIR, files);
  files.sort((a, b) => b.mtime - a.mtime);
  const sessions = [];
  for (const f of files) {
    const item = readClaudeTranscriptSessionUsage(f.p, f.mtime);
    if (item) sessions.push(item);
    if (sessions.length >= limit) break;
  }
  sessions.sort((a, b) => b.totalTokens - a.totalTokens);
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  return {
    totalTokens,
    sessionCount: sessions.length,
    limit,
    sessions: sessions.map((s) => ({
      ...s,
      share: totalTokens > 0 ? (s.totalTokens / totalTokens) * 100 : 0,
    })),
  };
}

function modelDisplayName(model) {
  return String(model || '').replace(/^claude-/, '').replace(/-/g, ' ');
}

function readClaudeStatsHabits() {
  let stats;
  try { stats = JSON.parse(fs.readFileSync(CLAUDE_STATS_PATH, 'utf8')); } catch { return []; }
  const habits = [];
  const models = stats && stats.modelUsage && typeof stats.modelUsage === 'object' ? stats.modelUsage : {};
  const modelRows = Object.entries(models).map(([model, u]) => {
    const total = num(u.inputTokens) + num(u.cacheReadInputTokens) + num(u.cacheCreationInputTokens) + num(u.outputTokens);
    return { model, total };
  }).filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
  const modelTotal = modelRows.reduce((sum, row) => sum + row.total, 0);
  for (const row of modelRows.slice(0, 3)) {
    habits.push({
      label: `${modelDisplayName(row.model)} 使用比例`,
      pct: modelTotal > 0 ? (row.total / modelTotal) * 100 : null,
      kind: '模型',
      detail: fmtCompactTokens(row.total),
    });
  }
  const tokenTotals = Object.values(models).reduce((sum, u) => ({
    input: sum.input + num(u.inputTokens),
    cached: sum.cached + num(u.cacheReadInputTokens),
    created: sum.created + num(u.cacheCreationInputTokens),
    output: sum.output + num(u.outputTokens),
  }), { input: 0, cached: 0, created: 0, output: 0 });
  const allTokens = tokenTotals.input + tokenTotals.cached + tokenTotals.created + tokenTotals.output;
  if (allTokens > 0) {
    habits.push({
      label: '快取讀取 Token',
      pct: (tokenTotals.cached / allTokens) * 100,
      kind: '快取',
      detail: `${fmtCompactTokens(tokenTotals.cached)} / ${fmtCompactTokens(allTokens)} Token`,
    });
    habits.push({
      label: '輸出 Token',
      pct: (tokenTotals.output / allTokens) * 100,
      kind: '輸出',
      detail: `${fmtCompactTokens(tokenTotals.output)} / ${fmtCompactTokens(allTokens)} Token`,
    });
  }
  const hours = stats && stats.hourCounts && typeof stats.hourCounts === 'object' ? stats.hourCounts : {};
  const hourRows = Object.entries(hours)
    .map(([hour, count]) => ({ hour: Number(hour), count: num(count) }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const hourTotal = hourRows.reduce((sum, row) => sum + row.count, 0);
  if (hourRows.length && hourTotal > 0) {
    const top = hourRows[0];
    habits.push({
      label: `${String(top.hour).padStart(2, '0')}:00 時段最常使用`,
      pct: (top.count / hourTotal) * 100,
      kind: '時段',
      detail: `${top.count} / ${hourTotal} 則訊息`,
    });
  }
  return habits;
}

function fmtCompactTokens(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
  return String(n);
}

function readClaudeLocalUsage() {
  const sessions = claudeSessionBreakdown();
  return {
    sessions,
    habits: readClaudeStatsHabits(),
  };
}

// Scan the newest rollout files for the most recent rate_limits snapshot.
function latestCodexRateLimits() {
  const files = [];
  collectRolloutFiles(CODEX_SESSIONS_DIR, files);
  files.sort((a, b) => b.mtime - a.mtime);
  let best = null; // { rl, ts }
  for (const { p } of files.slice(0, 8)) {
    let text;
    try { text = tailRead(p, 256 * 1024); } catch { continue; }
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.includes('"rate_limits"')) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      const rl = (obj && obj.payload && obj.payload.rate_limits) || (obj && obj.rate_limits);
      if (!rl) continue;
      const ts = Date.parse(obj.timestamp) || 0;
      if (!best || ts > best.ts) best = { rl, ts };
      break; // newest snapshot in this file
    }
  }
  return best;
}

function readCodexUsage() {
  const snap = latestCodexRateLimits();
  if (!snap) return null;
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
  const rl = snap.rl;
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
    updatedAt: snap.ts || null,
    sessions: codexSessionBreakdown(),
  };
}

function codexGauges(codex) {
  if (!codex) return [];
  const out = [];
  if (codex.fiveHour) out.push({ key: 'codex_five_hour', utilization: codex.fiveHour.pct, resetsAt: codex.fiveHour.resetsAt });
  if (codex.sevenDay) out.push({ key: 'codex_seven_day', utilization: codex.sevenDay.pct, resetsAt: codex.sevenDay.resetsAt });
  return out;
}

async function pollNow() {
  const result = await fetchUsage();
  const codex = readCodexUsage();
  const claudeLocal = readClaudeLocalUsage();
  if (result.ok) {
    lastUsage = result;
    saveUsageCache(result);
  }
  maybeNotify(result.ok ? result.data : null, codex);
  const payload = result.ok ? { ...result } : { ...result, stale: lastUsage };
  payload.claudeLocal = claudeLocal;
  payload.codex = codex;
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
  const payload = { ...lastUsage, cached: true };
  payload.claudeLocal = readClaudeLocalUsage();
  payload.codex = readCodexUsage();
  return payload;
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
