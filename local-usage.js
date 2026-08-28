'use strict';
// Heavy local file scanning (Claude transcripts, Codex rollouts, stats cache).
// Runs inside a worker_thread so the Electron main process never blocks on
// disk I/O + JSON parsing; a blocked main process freezes window painting
// (spinner "卡死" on machines with large session histories).
const fs = require('fs');
const os = require('os');
const path = require('path');

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const CLAUDE_STATS_PATH = path.join(os.homedir(), '.claude', 'stats-cache.json');
const CODEX_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions');
const CODEX_SESSION_BREAKDOWN_LIMIT = 240;
const CLAUDE_SESSION_BREAKDOWN_LIMIT = 240;

// ---------- Codex (OpenAI) usage ----------
// Codex CLI (auth_mode: chatgpt) persists rate-limit snapshots inside its
// session rollout files (~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl) as
// `token_count` events. They provide an offline fallback when the live Codex
// usage endpoint is unavailable.
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

// One full scan of all local usage sources. Called from the worker entry
// below; everything returned must be structured-cloneable.
function scanAll() {
  return {
    claudeLocal: {
      sessions: claudeSessionBreakdown(),
      habits: readClaudeStatsHabits(),
    },
    codexSessions: codexSessionBreakdown(),
    codexSnap: latestCodexRateLimits(), // { rl, ts } | null
  };
}

module.exports = { scanAll };

// ---------- worker entry ----------
// When loaded via `new Worker(...)`, respond to scan requests from main.js.
try {
  const { parentPort } = require('worker_threads');
  if (parentPort) {
    parentPort.on('message', (msg) => {
      let result = null;
      try { result = scanAll(); } catch {}
      parentPort.postMessage({ id: msg && msg.id, result });
    });
  }
} catch {}
