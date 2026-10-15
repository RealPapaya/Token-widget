'use strict';
// 用量分布 and Token 組成 views. Claude rows come from the per-day buckets in
// `claudeLocal.daily` (same calendar-day periods as 使用習慣); Codex rows come
// from its session list. Loaded after habits.js, before renderer.js, and uses
// renderer.js helpers/state at render time.

const TOKEN_PARTS = {
  claude: [
    { name: '快取讀取', desc: '命中提示快取的輸入，單價為一般輸入的 10%' },
    { name: '快取寫入', desc: '首次寫入提示快取的輸入' },
    { name: '未快取輸入', desc: '未命中提示快取的輸入' },
    { name: '輸出', desc: '模型產生的輸出，單價最高' },
  ],
  codex: [
    { name: '快取讀取', desc: '命中提示快取的輸入' },
    { name: '未快取輸入', desc: '未命中提示快取的輸入' },
    { name: '輸出', desc: '模型產生的輸出（含推理）' },
  ],
};

// Cost of one [input, cacheRead, cacheWrite, output] split at a Claude model's rate.
function claudeSplitCost(split, model) {
  const r = rateForClaudeModel(model);
  return ((split[0] * r.input) + (split[1] * r.cacheRead) + (split[2] * r.cacheWrite) + (split[3] * r.output)) / 1000000;
}

function claudePeriodDays(daily) {
  const wanted = habitDayKeys(currentUsagePeriod());
  return Object.keys(daily || {}).sort()
    .filter((key) => !wanted || wanted.has(key))
    .map((key) => ({ key, day: daily[key] }));
}

// Session-shaped rows for the period, built by summing each session's
// per-day usage; titles/paths come from the (capped) session list.
function claudePeriodSessions(daily, meta) {
  const byId = new Map((Array.isArray(meta) ? meta : []).map((s) => [s.id, s]));
  const rows = new Map();
  for (const { day } of claudePeriodDays(daily)) {
    for (const [id, models] of Object.entries(day.sessionUsage || {})) {
      let row = rows.get(id);
      if (!row) {
        const m = byId.get(id) || {};
        row = {
          ...m,
          id,
          shortId: id.slice(0, 8),
          label: m.label || id.slice(0, 8),
          modelUsage: {},
          inputTokens: 0, cachedInputTokens: 0, cacheCreationInputTokens: 0, outputTokens: 0, totalTokens: 0,
        };
        rows.set(id, row);
      }
      for (const [model, split] of Object.entries(models)) {
        const u = row.modelUsage[model] || (row.modelUsage[model] = {
          inputTokens: 0, cachedInputTokens: 0, cacheCreationInputTokens: 0, outputTokens: 0,
        });
        u.inputTokens += split[0];
        u.cachedInputTokens += split[1];
        u.cacheCreationInputTokens += split[2];
        u.outputTokens += split[3];
        row.inputTokens += split[0];
        row.cachedInputTokens += split[1];
        row.cacheCreationInputTokens += split[2];
        row.outputTokens += split[3];
        row.totalTokens += split[0] + split[1] + split[2] + split[3];
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.totalTokens - a.totalTokens);
}

function claudeDailyBars(daily) {
  return claudePeriodDays(daily).map(({ key, day }) => ({
    key,
    tokens: day.tokens,
    cost: Object.values(day.sessionUsage || {})
      .reduce((sum, models) => sum + Object.entries(models).reduce((s, [m, split]) => s + claudeSplitCost(split, m), 0), 0),
  }));
}

function codexDailyBars(sessions) {
  const days = new Map();
  for (const s of sessions) {
    const key = localDateKey(new Date(sessionDateValue(s)));
    const d = days.get(key) || { key, tokens: 0, cost: 0 };
    d.tokens += Number(s.totalTokens) || 0;
    d.cost += estimateSessionCost(s, 'codex');
    days.set(key, d);
  }
  return [...days.values()];
}

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// One bar per calendar day of the period (gaps filled with 0). 全部 starts
// at the first day with data, capped to the last 90 days.
function appendDailyChart(box, bars, brand) {
  const period = currentUsagePeriod();
  if (period.days === 1) return;
  const byKey = new Map(bars.map((b) => [b.key, b]));
  const keys = [];
  const first = bars.length ? bars.map((b) => b.key).sort()[0] : null;
  const span = period.days || Math.min(90, first ? Math.round((Date.now() - new Date(`${first}T00:00:00`)) / 86400000) + 1 : 0);
  const d = new Date();
  for (let i = 0; i < span; i++) {
    keys.unshift(localDateKey(d));
    d.setDate(d.getDate() - 1);
  }
  if (!keys.length) return;
  const rows = keys.map((key) => byKey.get(key) || { key, tokens: 0, cost: 0 });
  const max = Math.max(...rows.map((r) => r.cost), 0);
  const active = rows.filter((r) => r.tokens > 0).length;
  appendHabitTitle(box, '每日成本', `活躍 ${active} / ${rows.length} 天`);
  const chart = document.createElement('div');
  chart.className = `habit-hours usage-days brand-${brand}`;
  chart.style.gridTemplateColumns = `repeat(${rows.length}, minmax(0, 1fr))`;
  chart.innerHTML = rows.map((r) => {
    const [, mm, dd] = r.key.split('-');
    const tip = `${Number(mm)}/${Number(dd)} · ${fmtCost(r.cost)} · ${fmtTokens(r.tokens)} Token`;
    return `<div data-tooltip="${escapeHtml(tip)}"><i style="height:${r.cost > 0 && max > 0 ? Math.max(6, (r.cost / max) * 100) : 0}%"></i></div>`;
  }).join('');
  box.appendChild(chart);
  const fmtDay = (key) => { const [, mm, dd] = key.split('-'); return `${Number(mm)}/${Number(dd)}`; };
  const axis = document.createElement('div');
  axis.className = 'habit-axis';
  axis.innerHTML = `<span>${fmtDay(keys[0])}</span><span>${fmtDay(keys[keys.length - 1])}</span>`;
  box.appendChild(axis);
}

function appendUsageRows(box, rows, brand, mode) {
  const isProject = mode === 'project';
  const total = rows.reduce((sum, r) => sum + (Number(r.totalTokens) || 0), 0);
  appendHabitTitle(box, isProject ? '各專案用量' : '各工作階段用量', `${rows.length} 個${isProject ? '專案' : '工作階段'}`);
  // Different folders can share a name (two "…_Proxy" checkouts); show the
  // parent folder too when that happens.
  const names = rows.map((s) => sessionNameForRow(s, isProject));
  const seen = names.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());
  const list = document.createElement('div');
  list.className = 'session-list';
  rows.forEach((s, i) => {
    let name = names[i];
    if (isProject && seen.get(name) > 1 && s.cwd) {
      const parts = String(s.cwd).split(/[\\/]+/).filter(Boolean);
      if (parts.length > 1) name = `${parts[parts.length - 2]} / ${name}`;
    }
    const pct = total > 0 ? ((Number(s.totalTokens) || 0) / total) * 100 : 0;
    const row = document.createElement('div');
    row.className = `session-row brand-${brand} mode-${mode}`;
    const task = taskLabelForSession(s, mode);
    const tooltip = [isProject ? s.cwd : (s.projectLabel || s.cwd), task].filter(Boolean).join('\n');
    if (tooltip) setTooltip(row, tooltip);
    const count = isProject && s.sessionCount > 1 ? `${s.sessionCount} 個工作階段 · ` : '';
    row.innerHTML =
      `<div class="session-top"><span class="session-name">${escapeHtml(name)}</span>` +
      `<span class="session-pct">${fmtCost(estimateSessionCost(s, brand))}</span></div>` +
      `<div class="session-bar"><div style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>` +
      `<div class="session-meta"><span>${escapeHtml(`${count}${fmtTokens(s.totalTokens)} Token · ${pct.toFixed(1)}%`)}</span>` +
      `<span>${s.updatedAt ? `最後 ${fmtSessionTime(s.updatedAt)}` : ''}</span></div>`;
    list.appendChild(row);
  });
  box.appendChild(list);
}

function renderUsageBrand(box, brand, sessions, bars) {
  const title = brand === 'claude' ? 'Claude' : 'Codex';
  appendBrandHeader(box, brand, title);
  if (!sessions.length) {
    appendEmpty(box, `這個期間沒有 ${title} 用量紀錄。`, 'session-empty');
    return;
  }
  const tokens = sessions.reduce((sum, s) => sum + (Number(s.totalTokens) || 0), 0);
  const cost = sessions.reduce((sum, s) => sum + estimateSessionCost(s, brand), 0);
  const activeDays = bars.filter((b) => b.tokens > 0).length || 1;
  appendStatTiles(box, [
    ['總用量', fmtTokens(tokens), 'Token'],
    ['預估成本', fmtCost(cost), 'API 牌價估算'],
    ['日均成本', fmtCost(cost / activeDays), `活躍 ${activeDays} 天`],
  ], brand);
  appendDailyChart(box, bars, brand);
  const rows = usageSessionMode === 'project' ? aggregateProjectSessions(sessions, brand) : sessions;
  appendUsageRows(box, rows, brand, usageSessionMode);
}

function renderUsageDistribution(box) {
  appendSessionModeControls(box);
  const claudeMeta = lastClaudeLocal && lastClaudeLocal.sessions && lastClaudeLocal.sessions.sessions;
  const daily = lastClaudeLocal && lastClaudeLocal.daily;
  if (daily) renderUsageBrand(box, 'claude', claudePeriodSessions(daily, claudeMeta), claudeDailyBars(daily));
  else renderUsageBrand(box, 'claude', filterSessionsByPeriod(claudeMeta || []), []);
  const codexAll = lastCodex && lastCodex.sessions && Array.isArray(lastCodex.sessions.sessions) ? lastCodex.sessions.sessions : [];
  const codexSessions = filterSessionsByPeriod(codexAll).sort((a, b) => b.totalTokens - a.totalTokens);
  renderUsageBrand(box, 'codex', codexSessions, codexDailyBars(codexSessions));
}

// Token / cost split by category. Codex reports cached ⊂ input and
// reasoning ⊂ output, so its parts are derived accordingly.
function tokenParts(sessions, brand) {
  if (brand === 'claude') {
    const tokens = [0, 0, 0, 0];
    const cost = [0, 0, 0, 0];
    const models = {};
    for (const s of sessions) {
      for (const [m, u] of Object.entries(s.modelUsage || {})) {
        const split = [u.inputTokens, u.cachedInputTokens, u.cacheCreationInputTokens, u.outputTokens].map((v) => Number(v) || 0);
        const r = rateForClaudeModel(m);
        const parts = [split[1] * r.cacheRead, split[2] * r.cacheWrite, split[0] * r.input, split[3] * r.output].map((v) => v / 1000000);
        [split[1], split[2], split[0], split[3]].forEach((v, i) => { tokens[i] += v; });
        parts.forEach((v, i) => { cost[i] += v; });
        models[m] = (models[m] || 0) + parts.reduce((a, b) => a + b, 0);
      }
    }
    return { tokens, cost, models, reasoning: 0 };
  }
  const r = CODEX_RATE_PER_MTOK;
  const input = sessionTotal(sessions, 'inputTokens');
  const cached = Math.min(input, sessionTotal(sessions, 'cachedInputTokens'));
  const output = sessionTotal(sessions, 'outputTokens');
  const tokens = [cached, input - cached, output];
  const cost = [cached * r.cacheRead, (input - cached) * r.input, output * r.output].map((v) => v / 1000000);
  return { tokens, cost, models: {}, reasoning: sessionTotal(sessions, 'reasoningOutputTokens') };
}

function appendTokenComposition(box, brand, sessions) {
  const title = brand === 'claude' ? 'Claude' : 'Codex';
  appendBrandHeader(box, brand, title);
  const p = tokenParts(sessions, brand);
  const tokenTotal = p.tokens.reduce((a, b) => a + b, 0);
  const costTotal = p.cost.reduce((a, b) => a + b, 0);
  if (!tokenTotal) {
    appendEmpty(box, `這個期間沒有 ${title} 用量紀錄。`);
    return;
  }
  const parts = TOKEN_PARTS[brand];
  const outIdx = parts.length - 1;
  const inputTotal = tokenTotal - p.tokens[outIdx];
  const hitRate = inputTotal > 0 ? (p.tokens[0] / inputTotal) * 100 : 0;
  appendStatTiles(box, [
    ['快取命中率', `${Math.round(hitRate)}%`, '佔總輸入'],
    ['預估成本', fmtCost(costTotal), 'API 牌價估算'],
    ['輸出', fmtTokens(p.tokens[outIdx]), costTotal ? `佔成本 ${Math.round((p.cost[outIdx] / costTotal) * 100)}%` : ''],
  ], brand);

  const pct = (v, total) => (total > 0 ? (v / total) * 100 : 0);
  for (const [label, values, total] of [['Token 組成', p.tokens, tokenTotal], ['成本組成', p.cost, costTotal]]) {
    appendHabitTitle(box, label, label.startsWith('Token') ? `${fmtTokens(total)} Token` : fmtCost(total));
    const bar = document.createElement('div');
    bar.className = `habit-stack brand-${brand}`;
    bar.innerHTML = values.map((v, i) => `<div class="habit-seg t${i}" style="width:${pct(v, total)}%"></div>`).join('');
    box.appendChild(bar);
  }
  const legend = document.createElement('div');
  legend.className = `habit-legend token-legend brand-${brand}`;
  // Codex reasoning share rides on the output row's tooltip.
  const descOf = (part, i) => (i === outIdx && p.reasoning
    ? `${part.desc}，推理佔 ${Math.round(pct(p.reasoning, p.tokens[outIdx]))}%` : part.desc);
  legend.innerHTML = '<div class="head"><i></i><span></span><strong>Token</strong><em>成本</em></div>' +
    parts.map((part, i) =>
      `<div data-tooltip="${escapeHtml(descOf(part, i))}"><i class="t${i}"></i><span>${escapeHtml(part.name)}</span>` +
      `<strong>${pct(p.tokens[i], tokenTotal).toFixed(1)}%</strong><em>${pct(p.cost[i], costTotal).toFixed(0)}%</em></div>`).join('');
  box.appendChild(legend);

  const models = Object.entries(p.models).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (models.length > 1) {
    appendHabitTitle(box, '模型成本');
    const list = document.createElement('div');
    list.className = 'insight-list habit-tools';
    for (const [i, [m, v]] of models.slice(0, 5).entries()) {
      const row = document.createElement('div');
      row.className = `insight-row brand-${brand}`;
      row.innerHTML =
        `<div class="insight-top"><span class="insight-name">${escapeHtml(formatModelName(m) || '未知模型')}</span>` +
        `<span class="insight-pct" style="color:var(--model-${i})">${fmtCost(v)}</span></div>` +
        `<div class="insight-bar"><div style="width:${pct(v, costTotal)}%;background:var(--model-${i})"></div></div>`;
      list.appendChild(row);
    }
    box.appendChild(list);
  }
}

function renderTokenCompositionView(box) {
  const claudeMeta = lastClaudeLocal && lastClaudeLocal.sessions && lastClaudeLocal.sessions.sessions;
  const daily = lastClaudeLocal && lastClaudeLocal.daily;
  appendTokenComposition(box, 'claude', daily ? claudePeriodSessions(daily, claudeMeta) : filterSessionsByPeriod(claudeMeta || []));
  const codexAll = lastCodex && lastCodex.sessions && Array.isArray(lastCodex.sessions.sessions) ? lastCodex.sessions.sessions : [];
  appendTokenComposition(box, 'codex', filterSessionsByPeriod(codexAll));
}
