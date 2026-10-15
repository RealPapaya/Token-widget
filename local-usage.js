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
      try {
        const st = fs.statSync(p);
        out.push({ p, mtime: st.mtimeMs, size: st.size });
      } catch {}
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

// A prompt the user actually typed: not tool results, injected meta/system
// text, subagent instructions, or bare slash commands like /clear and /model.
// Slash commands with arguments (skills such as `/note-intake <url>`) count.
function isTypedClaudePrompt(obj) {
  if (obj.type !== 'user' || obj.isMeta || obj.isSidechain || obj.isCompactSummary) return false;
  const content = obj.message && obj.message.content;
  let text = '';
  if (typeof content === 'string') text = content;
  else if (Array.isArray(content)) {
    if (content.some((item) => item && item.type === 'tool_result')) return false;
    text = content.filter((item) => item && item.type === 'text').map((item) => item.text || '').join('\n');
    if (!text.trim()) return content.some((item) => item && item.type === 'image');
  } else return false;
  text = text.trim();
  if (!text) return false;
  if (/^<command-(?:name|message)>/.test(text)) return /<command-args>\s*\S[\s\S]*<\/command-args>/.test(text);
  return !/^(?:<(?:local-command|task-notification|bash-)|\[Request interrupted)/.test(text);
}

// `<command-name>/x</command-name>…<command-args>y</command-args>` → "/x y".
function slashCommandText(text) {
  const name = /<command-name>([^<]*)<\/command-name>/.exec(text || '');
  if (!name) return text;
  const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text);
  return `${name[1].trim()} ${args ? args[1].trim() : ''}`.trim();
}

// One transcript file reduced to what the session list and the habit stats
// need. Assistant replies are written as one line per content block, every
// line repeating the same message.id and usage (the last line has the final
// output_tokens), so turns are keyed by message.id.
function parseClaudeTranscript(file) {
  const text = fs.readFileSync(file, 'utf8');
  let id = path.basename(file).replace(/\.jsonl$/, '');
  let cwd = null;
  let updatedAt = null;
  let startedAt = null;
  let model = null;
  let firstPrompt = '';
  let latestPrompt = '';
  let fallbackPrompt = '';
  const turns = new Map();
  const prompts = [];
  const compacts = [];
  const work = [];
  for (const line of text.split('\n')) {
    if (!line.includes('"message"') && !line.includes('"subtype"')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.sessionId) id = obj.sessionId;
    if (obj.cwd) cwd = obj.cwd;
    if (obj.timestamp) {
      if (!startedAt) startedAt = obj.timestamp;
      updatedAt = obj.timestamp;
    }
    if (obj.type === 'system') {
      if (obj.subtype === 'compact_boundary') {
        const meta = obj.compactMetadata || {};
        compacts.push({ ts: obj.timestamp, trigger: meta.trigger === 'manual' ? 'manual' : 'auto', preTokens: num(meta.preTokens) });
      } else if (obj.subtype === 'turn_duration') {
        work.push({ ts: obj.timestamp, ms: num(obj.durationMs) });
      }
      continue;
    }
    if (obj.type === 'user') {
      const prompt = compactTaskText(slashCommandText(textFromContent(obj.message && obj.message.content)), 140);
      if (isTypedClaudePrompt(obj)) {
        if (obj.timestamp) prompts.push(obj.timestamp);
        if (prompt) {
          if (!firstPrompt) firstPrompt = prompt;
          latestPrompt = prompt;
        }
      } else if (prompt && !fallbackPrompt) {
        fallbackPrompt = prompt;
      }
    }
    if (obj.type !== 'assistant' || !obj.message) continue;
    const message = obj.message;
    if (message.model && message.model !== '<synthetic>') model = message.model;
    const usage = claudeMessageUsage(message);
    if (!usage) continue;
    const key = message.id || obj.uuid;
    const tools = (Array.isArray(message.content) ? message.content : [])
      .filter((item) => item && item.type === 'tool_use' && item.name)
      .map((item) => item.name);
    const prev = turns.get(key);
    turns.set(key, {
      id: key,
      ts: prev ? prev.ts : obj.timestamp,
      model: message.model && message.model !== '<synthetic>' ? message.model : (prev && prev.model) || null,
      sidechain: obj.isSidechain === true,
      usage,
      tools: prev ? prev.tools.concat(tools) : tools,
    });
  }
  return {
    id,
    cwd,
    startedAt,
    updatedAt,
    model,
    firstPrompt: firstPrompt || fallbackPrompt,
    latestPrompt: latestPrompt || fallbackPrompt,
    isSubagent: file.split(path.sep).includes('subagents'),
    turns: [...turns.values()],
    prompts,
    compacts,
    work,
  };
}

// Parsed transcripts keyed by path; reused while mtime + size are unchanged
// (transcripts are append-only), so only the active session is re-parsed.
const claudeTranscriptCache = new Map();

function readClaudeTranscripts() {
  const files = [];
  collectClaudeTranscriptFiles(CLAUDE_PROJECTS_DIR, files);
  const seen = new Set();
  const parsed = [];
  for (const f of files) {
    seen.add(f.p);
    let entry = claudeTranscriptCache.get(f.p);
    if (!entry || entry.mtime !== f.mtime || entry.size !== f.size) {
      let data = null;
      try { data = parseClaudeTranscript(f.p); } catch {}
      entry = { mtime: f.mtime, size: f.size, data };
      claudeTranscriptCache.set(f.p, entry);
    }
    if (entry.data) parsed.push({ ...entry.data, mtime: f.mtime });
  }
  for (const p of claudeTranscriptCache.keys()) {
    if (!seen.has(p)) claudeTranscriptCache.delete(p);
  }
  // Resumed/forked sessions copy earlier history into a new file; the file
  // that started first owns each message.id so those turns are counted once.
  // (Start time, not mtime: appending to the original later must not move
  // ownership to the fork.)
  const startOf = (t) => Date.parse(t.startedAt) || t.mtime;
  parsed.sort((a, b) => startOf(a) - startOf(b));
  const owned = new Set();
  for (const t of parsed) {
    t.turns = t.turns.filter((turn) => {
      if (owned.has(turn.id)) return false;
      owned.add(turn.id);
      return true;
    });
  }
  return parsed;
}

function emptyClaudeUsage() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheCreationInputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

function addClaudeUsage(target, u) {
  target.inputTokens += u.inputTokens;
  target.cachedInputTokens += u.cachedInputTokens;
  target.cacheCreationInputTokens += u.cacheCreationInputTokens;
  target.outputTokens += u.outputTokens;
  target.totalTokens += u.totalTokens;
}

// One row per sessionId: subagent transcripts (…/subagents/*.jsonl carry the
// parent's sessionId) fold into their parent session.
function claudeSessionBreakdown(transcripts, limit = CLAUDE_SESSION_BREAKDOWN_LIMIT) {
  const groups = new Map();
  for (const t of transcripts) {
    let g = groups.get(t.id);
    if (!g) {
      g = { id: t.id, main: null, mtime: 0, usage: emptyClaudeUsage(), modelUsage: {}, assistantTurns: 0, fallback: t };
      groups.set(t.id, g);
    }
    if (!t.isSubagent && (!g.main || t.mtime > g.main.mtime)) g.main = t;
    g.mtime = Math.max(g.mtime, t.mtime);
    for (const turn of t.turns) {
      g.assistantTurns += 1;
      addClaudeUsage(g.usage, turn.usage);
      const m = turn.model || t.model || 'unknown';
      if (!g.modelUsage[m]) g.modelUsage[m] = emptyClaudeUsage();
      addClaudeUsage(g.modelUsage[m], turn.usage);
    }
  }
  const sessions = [...groups.values()]
    .filter((g) => g.usage.totalTokens > 0)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((g) => {
      const t = g.main || g.fallback;
      const id = g.id;
      const cwdName = t.cwd ? path.basename(t.cwd) : '';
      const title = titleFromPrompt(t.firstPrompt, t.latestPrompt);
      return {
        id,
        shortId: id.slice(0, 8),
        cwd: t.cwd,
        label: title || cwdName || id.slice(0, 8),
        projectLabel: cwdName,
        title,
        task: taskFromPrompt(t.firstPrompt, t.latestPrompt),
        startedAt: t.startedAt,
        updatedAt: t.updatedAt || new Date(g.mtime).toISOString(),
        model: t.model,
        modelUsage: g.modelUsage,
        assistantTurns: g.assistantTurns,
        ...g.usage,
      };
    });
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

// ---------- Claude daily habit buckets ----------
// Habit stats are bucketed per local calendar day (over every transcript, not
// just the capped session list) so the renderer can sum exactly the days in
// the selected period, even for sessions that span several days.
const CONTEXT_BUCKET_LIMITS = [50000, 100000, 200000, 400000];

function localDayKey(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function claudeDailyHabits(transcripts) {
  const days = {};
  const sessionSets = new Map();
  const dayOf = (ts) => {
    const key = localDayKey(ts);
    if (!key) return null;
    if (!days[key]) {
      days[key] = {
        tokens: 0,
        models: {},
        subagentTokens: 0,
        prompts: 0,
        hours: new Array(24).fill(0),
        workMs: 0,
        contextSum: 0,
        contextTurns: 0,
        contextPeak: 0,
        contextBuckets: new Array(CONTEXT_BUCKET_LIMITS.length + 1).fill(0),
        compactAuto: 0,
        compactManual: 0,
        compactPreTokens: 0,
        tools: {},
        sessions: [],
      };
      sessionSets.set(key, new Set());
    }
    return days[key];
  };
  for (const t of transcripts) {
    for (const turn of t.turns) {
      const day = dayOf(turn.ts);
      if (!day) continue;
      const u = turn.usage;
      day.tokens += u.totalTokens;
      const m = turn.model || t.model || 'unknown';
      day.models[m] = (day.models[m] || 0) + u.totalTokens;
      for (const name of turn.tools) day.tools[name] = (day.tools[name] || 0) + 1;
      if (t.isSubagent || turn.sidechain) {
        day.subagentTokens += u.totalTokens;
        continue;
      }
      sessionSets.get(localDayKey(turn.ts)).add(t.id);
      const context = u.inputTokens + u.cachedInputTokens + u.cacheCreationInputTokens;
      day.contextSum += context;
      day.contextTurns += 1;
      day.contextPeak = Math.max(day.contextPeak, context);
      let bucket = CONTEXT_BUCKET_LIMITS.findIndex((limit) => context < limit);
      if (bucket === -1) bucket = CONTEXT_BUCKET_LIMITS.length;
      day.contextBuckets[bucket] += 1;
    }
    if (t.isSubagent) continue;
    for (const ts of t.prompts) {
      const day = dayOf(ts);
      if (!day) continue;
      day.prompts += 1;
      day.hours[new Date(ts).getHours()] += 1;
    }
    for (const c of t.compacts) {
      const day = dayOf(c.ts);
      if (!day) continue;
      if (c.trigger === 'manual') day.compactManual += 1;
      else day.compactAuto += 1;
      day.compactPreTokens += c.preTokens;
    }
    for (const w of t.work) {
      const day = dayOf(w.ts);
      if (day) day.workMs += w.ms;
    }
  }
  for (const [key, set] of sessionSets) days[key].sessions = [...set];
  return days;
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
  const transcripts = readClaudeTranscripts();
  return {
    claudeLocal: {
      sessions: claudeSessionBreakdown(transcripts),
      daily: claudeDailyHabits(transcripts),
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
