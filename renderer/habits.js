'use strict';
// 使用習慣 (usage habits) for Claude, built from the per-day buckets that
// local-usage.js returns as `claudeLocal.daily`. Loaded before renderer.js and
// calls its helpers (escapeHtml, fmtTokens, currentUsagePeriod) at render time.

// "claude-opus-5-5" → "Opus 5.5", "claude-3-5-sonnet-20241022" → "Sonnet 3.5",
// "gpt-5.4-mini" → "GPT-5.4 mini".
function formatModelName(id) {
  const s = String(id || '').trim().toLowerCase()
    .replace(/\[[^\]]*\]$/, '')
    .replace(/^(?:anthropic\/|us\.anthropic\.)/, '')
    .replace(/^claude-/, '')
    .replace(/-\d{8}$/, '');
  if (!s) return '';
  if (s.startsWith('gpt-')) return `GPT-${s.slice(4).replace(/-/g, ' ')}`;
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  let m = /^([a-z]+)-(\d+)(?:-(\d+))?(?:-(.+))?$/.exec(s);
  if (m) return [`${cap(m[1])} ${m[2]}${m[3] ? `.${m[3]}` : ''}`, m[4]].filter(Boolean).join(' ');
  m = /^(\d+)(?:-(\d+))?-([a-z]+)$/.exec(s);
  if (m) return `${cap(m[3])} ${m[1]}${m[2] ? `.${m[2]}` : ''}`;
  return s.split(/[-\s]+/).map(cap).join(' ');
}

const HABIT_TOOL_NAMES = {
  Bash: '終端機指令',
  PowerShell: 'PowerShell',
  Read: '讀取檔案',
  Edit: '修改檔案',
  MultiEdit: '修改檔案',
  Write: '建立檔案',
  Grep: '搜尋內容',
  Glob: '尋找檔案',
  Agent: '派子代理',
  Task: '派子代理',
  WebSearch: '網路搜尋',
  WebFetch: '讀取網頁',
  TodoWrite: '待辦清單',
  AskUserQuestion: '詢問你',
  Skill: '技能',
  NotebookEdit: '編輯筆記本',
};
const HABIT_CONTEXT_BUCKETS = ['< 50K', '50–100K', '100–200K', '200–400K', '≥ 400K'];

function habitToolLabel(name) {
  const mcp = /^mcp__(.+?)__/.exec(name);
  if (mcp) return `MCP · ${mcp[1].replace(/^claude_ai_/, '').replace(/[-_]/g, ' ')}`;
  return HABIT_TOOL_NAMES[name] || name;
}

function fmtHours(ms) {
  const h = (Number(ms) || 0) / 3600000;
  if (h >= 10) return `${Math.round(h)} 小時`;
  if (h >= 1) return `${h.toFixed(1)} 小時`;
  return `${Math.round(h * 60)} 分鐘`;
}

// Local YYYY-MM-DD keys of the calendar days in the selected period
// (1日 = today, 1週 = today + previous 6 days); null = all days.
function habitDayKeys(period) {
  if (!period.days) return null;
  const keys = new Set();
  const d = new Date();
  for (let i = 0; i < period.days; i++) {
    keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

function sumClaudeDays(daily, period) {
  const wanted = habitDayKeys(period);
  const out = {
    days: 0, tokens: 0, subagentTokens: 0, prompts: 0, workMs: 0,
    contextSum: 0, contextTurns: 0, contextPeak: 0,
    compactAuto: 0, compactManual: 0, compactPreTokens: 0,
    models: {}, tools: {}, hours: new Array(24).fill(0),
    contextBuckets: new Array(HABIT_CONTEXT_BUCKETS.length).fill(0),
    sessions: new Set(),
  };
  for (const [key, day] of Object.entries(daily || {})) {
    if (wanted && !wanted.has(key)) continue;
    if (day.prompts > 0 || day.contextTurns > 0) out.days += 1;
    out.tokens += day.tokens;
    out.subagentTokens += day.subagentTokens;
    out.prompts += day.prompts;
    out.workMs += day.workMs;
    out.contextSum += day.contextSum;
    out.contextTurns += day.contextTurns;
    out.contextPeak = Math.max(out.contextPeak, day.contextPeak);
    out.compactAuto += day.compactAuto;
    out.compactManual += day.compactManual;
    out.compactPreTokens += day.compactPreTokens;
    for (const [m, v] of Object.entries(day.models || {})) out.models[m] = (out.models[m] || 0) + v;
    for (const [t, v] of Object.entries(day.tools || {})) out.tools[t] = (out.tools[t] || 0) + v;
    (day.hours || []).forEach((v, i) => { out.hours[i] += v; });
    (day.contextBuckets || []).forEach((v, i) => { out.contextBuckets[i] += v; });
    (day.sessions || []).forEach((id) => out.sessions.add(id));
  }
  return out;
}

function appendHabitTitle(box, title, note) {
  const el = document.createElement('div');
  el.className = 'habit-title';
  el.innerHTML = `<span>${escapeHtml(title)}</span>${note ? `<em>${escapeHtml(note)}</em>` : ''}`;
  box.appendChild(el);
}

function appendHabitTiles(box, s) {
  const sessions = s.sessions.size;
  const compactions = s.compactAuto + s.compactManual;
  const period = currentUsagePeriod();
  const tiles = [
    ['工作階段', `${sessions}`, sessions ? `平均 ${(s.prompts / sessions).toFixed(1)} 次提問` : ''],
    ['提問次數', `${s.prompts}`, s.days ? `平均每天 ${Math.round(s.prompts / s.days)} 次` : ''],
    ['活躍天數', `${s.days}`, period.days ? `共 ${period.days} 天` : '有使用的日子'],
    ['Claude 工作', fmtHours(s.workMs), s.days ? `平均每天 ${fmtHours(s.workMs / s.days)}` : ''],
    ['平均上下文', s.contextTurns ? fmtTokens(s.contextSum / s.contextTurns) : '--', s.contextPeak ? `最高 ${fmtTokens(s.contextPeak)}` : ''],
    ['壓縮次數', `${compactions}`, compactions ? `自動 ${s.compactAuto} · 手動 ${s.compactManual}` : '沒有壓縮過'],
  ];
  const grid = document.createElement('div');
  grid.className = 'habit-tiles';
  grid.innerHTML = tiles.map(([label, value, sub]) =>
    `<div class="habit-tile"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(sub)}</em></div>`).join('');
  box.appendChild(grid);
}

function appendHabitModels(box, s) {
  const rows = Object.entries(s.models)
    .filter(([, v]) => v > 0)
    .map(([model, tokens]) => ({ name: formatModelName(model) || '未知模型', tokens }))
    .sort((a, b) => b.tokens - a.tokens);
  if (!rows.length) return;
  appendHabitTitle(box, '模型使用比例', '依 Token');
  const total = rows.reduce((sum, r) => sum + r.tokens, 0);
  const shown = rows.slice(0, 5);
  const rest = rows.slice(5).reduce((sum, r) => sum + r.tokens, 0);
  if (rest > 0) shown.push({ name: '其他', tokens: rest });
  const bar = document.createElement('div');
  bar.className = 'habit-stack';
  bar.innerHTML = shown.map((r, i) =>
    `<div class="habit-seg s${i}" style="width:${(r.tokens / total) * 100}%"></div>`).join('');
  box.appendChild(bar);
  const legend = document.createElement('div');
  legend.className = 'habit-legend';
  legend.innerHTML = shown.map((r, i) =>
    `<div><i class="s${i}"></i><span>${escapeHtml(r.name)}</span>` +
    `<strong>${((r.tokens / total) * 100).toFixed(1)}%</strong><em>${fmtTokens(r.tokens)}</em></div>`).join('');
  box.appendChild(legend);
}

function appendHabitContext(box, s) {
  if (!s.contextTurns) return;
  appendHabitTitle(box, '上下文長度', `每次回覆 · ${s.contextTurns} 次`);
  const total = s.contextBuckets.reduce((sum, v) => sum + v, 0) || 1;
  const bar = document.createElement('div');
  bar.className = 'habit-stack habit-context';
  bar.innerHTML = s.contextBuckets.map((v, i) =>
    `<div class="habit-seg c${i}" style="width:${(v / total) * 100}%"></div>`).join('');
  box.appendChild(bar);
  const legend = document.createElement('div');
  legend.className = 'habit-chips';
  legend.innerHTML = s.contextBuckets.map((v, i) =>
    `<span><i class="c${i}"></i>${HABIT_CONTEXT_BUCKETS[i]} ${Math.round((v / total) * 100)}%</span>`).join('');
  box.appendChild(legend);
  const compactions = s.compactAuto + s.compactManual;
  const note = document.createElement('div');
  note.className = 'habit-note';
  note.textContent = compactions
    ? `壓縮 ${compactions} 次（自動 ${s.compactAuto}、手動 ${s.compactManual}），壓縮前平均 ${fmtTokens(s.compactPreTokens / compactions)}`
    : '這段期間沒有壓縮對話，上下文都還在模型上限內。';
  box.appendChild(note);
}

function appendHabitHours(box, s) {
  const total = s.hours.reduce((sum, v) => sum + v, 0);
  if (!total) return;
  const peak = s.hours.indexOf(Math.max(...s.hours));
  appendHabitTitle(box, '使用時段', `最常在 ${peak}:00–${peak + 1}:00 · ${Math.round((s.hours[peak] / total) * 100)}%`);
  const max = s.hours[peak];
  const chart = document.createElement('div');
  chart.className = 'habit-hours';
  chart.innerHTML = s.hours.map((v, h) =>
    `<div class="${h === peak ? 'peak' : ''}" data-tooltip="${h}:00 · ${v} 次提問"><i style="height:${v ? Math.max(8, (v / max) * 100) : 0}%"></i></div>`).join('');
  box.appendChild(chart);
  const axis = document.createElement('div');
  axis.className = 'habit-axis';
  axis.innerHTML = '<span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>';
  box.appendChild(axis);
}

function appendHabitTools(box, s) {
  const grouped = {};
  for (const [name, n] of Object.entries(s.tools)) {
    const label = habitToolLabel(name);
    grouped[label] = (grouped[label] || 0) + n;
  }
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return;
  const total = rows.reduce((sum, r) => sum + r[1], 0);
  appendHabitTitle(box, '最常用的工具', `共 ${total.toLocaleString('en-US')} 次`);
  const list = document.createElement('div');
  list.className = 'insight-list habit-tools';
  for (const [label, n] of rows.slice(0, 5)) {
    const pct = (n / total) * 100;
    const row = document.createElement('div');
    row.className = 'insight-row brand-claude';
    row.innerHTML =
      `<div class="insight-top"><span class="insight-name">${escapeHtml(label)}</span>` +
      `<span class="insight-pct">${n.toLocaleString('en-US')} 次</span></div>` +
      `<div class="insight-bar"><div style="width:${pct}%"></div></div>`;
    list.appendChild(row);
  }
  box.appendChild(list);
  const agents = (s.tools.Agent || 0) + (s.tools.Task || 0);
  if (agents || s.subagentTokens) {
    const note = document.createElement('div');
    note.className = 'habit-note';
    note.textContent = `派出子代理 ${agents} 次，子代理用掉 ${s.tokens ? Math.round((s.subagentTokens / s.tokens) * 100) : 0}% 的 Token。`;
    box.appendChild(note);
  }
}

// Returns false when there is nothing to show for the period, so the caller
// can print its empty-state text.
function renderClaudeHabits(box, daily) {
  const s = sumClaudeDays(daily, currentUsagePeriod());
  if (!s.tokens && !s.prompts) return false;
  appendHabitTiles(box, s);
  appendHabitModels(box, s);
  appendHabitContext(box, s);
  appendHabitHours(box, s);
  appendHabitTools(box, s);
  return true;
}
