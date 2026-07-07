'use strict';

// ---------- Claude logo (official mark, Anthropic orange) ----------
// Path from the official Claude glyph (viewBox 0 0 16 16).
const CLAUDE_LOGO_PATH = 'm3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z';
function claudeLogoSvg() {
  return '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">' +
    `<path fill="#D97757" d="${CLAUDE_LOGO_PATH}"/></svg>`;
}
// ---------- Codex logo (official OpenAI logomark) ----------
const OPENAI_LOGO_PATH = 'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.1419.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z';
function codexLogoSvg() {
  return '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    `<path fill="#FAF9F5" d="${OPENAI_LOGO_PATH}"/></svg>`;
}

// ---------- labels for known API keys ----------
const LABELS = {
  five_hour: '目前 Session（5 小時）',
  seven_day: '本週 · 所有模型',
  seven_day_opus: '本週 · Opus',
  seven_day_sonnet: '本週 · Sonnet',
  seven_day_oauth_apps: '本週 · 連線應用程式',
  seven_day_cowork: '本週 · Cowork',
  cinder_cove: 'Claude Code / Cowork 額度',
  amber_ladder: 'Amber Ladder 額度',
  extra_usage: '加購用量額度',
};
// keys where resets_at means "expires" (one-time credits), not a rolling reset
const ONE_TIME = new Set(['cinder_cove']);

function prettifyKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

const USD_TO_TWD = 32;

function currentCurrency() {
  return displayCurrency === 'TWD' ? 'TWD' : 'USD';
}

function convertUsd(n) {
  const value = Number(n) || 0;
  return currentCurrency() === 'TWD' ? value * USD_TO_TWD : value;
}

function fmtCurrencyValue(value, minDigits, maxDigits) {
  const currency = currentCurrency();
  return new Intl.NumberFormat(currency === 'TWD' ? 'zh-TW' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

function fmtMoney(n) {
  const value = convertUsd(n);
  if (currentCurrency() === 'TWD') {
    return fmtCurrencyValue(value, value >= 10 ? 0 : 1, value >= 10 ? 0 : 2);
  }
  return fmtCurrencyValue(value, Number(n) % 1 ? 2 : 0, 2);
}

function fmtResetAbs(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hm = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (sameDay) return `今天 ${hm}`;
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${md}（${wd}）${hm}`;
}

function fmtCountdown(iso) {
  let ms = new Date(iso) - Date.now();
  if (ms <= 0) return '即將重置';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d} 天 ${h} 小時`;
  if (h > 0) return `${h} 小時 ${mm} 分`;
  return `${mm} 分`;
}

function severityOf(pct) {
  if (pct >= 95) return 'crit';
  if (pct >= 80) return 'warn';
  return 'normal';
}

function fillClassForGauge(g) {
  const sev = severityOf(g.pct);
  if (sev !== 'normal') return sev;
  return g.brand === 'codex' ? 'codex' : '';
}

function pctClassForGauge(g) {
  const sev = severityOf(g.pct);
  return sev === 'normal' ? '' : sev;
}

// ---------- normalize API payload into gauge list ----------
function normalize(data) {
  const skip = new Set(['limits', 'spend', 'extra_usage', 'member_dashboard_available']);
  if (!showAmberLadder) skip.add('amber_ladder');
  const gauges = [];
  const order = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet'];
  for (const [key, val] of Object.entries(data)) {
    if (skip.has(key) || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    if (typeof val.utilization !== 'number') continue;
    gauges.push({
      key,
      label: LABELS[key] || prettifyKey(key),
      pct: Math.min(100, val.utilization),
      resetsAt: val.resets_at || null,
      oneTime: ONE_TIME.has(key),
      brand: 'claude',
      dollars: val.limit_dollars != null
        ? { used: val.used_dollars || 0, limit: val.limit_dollars }
        : null,
    });
  }
  gauges.sort((a, b) => {
    const ia = order.indexOf(a.key), ib = order.indexOf(b.key);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const eu = data.extra_usage;
  if (eu && eu.is_enabled && eu.monthly_limit > 0) {
    const div = Math.pow(10, eu.decimal_places || 2);
    gauges.push({
      key: 'extra_usage',
      label: LABELS.extra_usage,
      pct: Math.min(100, eu.utilization || 0),
      resetsAt: null,
      oneTime: false,
      brand: 'claude',
      dollars: { used: eu.used_credits / div, limit: eu.monthly_limit / div },
      subtext: '每月額度',
    });
  }
  return gauges;
}

// ---------- rendering ----------
let currentGauges = [];
let lastFetchedAt = null;
let lastError = null;
let collapsed = false;
let showClaude = true;
let showAmberLadder = false;
let showCodex = true;
let displayCurrency = 'USD';
let pollMinutes = 3;
let settingsOpen = false;
let usageViewOpen = false;
let usageAnalysisSheet = 'sessions';
let usagePeriodKey = 'week';
let usageSessionMode = 'project';
let lastData = null;   // raw Anthropic payload, kept so a settings change can re-normalize
let lastClaudeLocal = null;
let lastCodex = null;  // latest Codex snapshot from main

// Build gauge rows for Codex (OpenAI) usage. Same shape as normalize()'s rows,
// tagged brand:'codex' so they render with the OpenAI logo and a blue bar.
function codexGauges(codex) {
  if (!codex) return [];
  const out = [];
  const add = (d, label, key) => {
    if (!d || typeof d.pct !== 'number') return;
    out.push({
      key, label,
      pct: Math.min(100, d.pct),
      resetsAt: d.resetsAt || null,
      oneTime: false,
      dollars: null,
      brand: 'codex',
    });
  };
  add(codex.fiveHour, '目前 Session（5 小時）', 'codex_five_hour');
  add(codex.sevenDay, '本週用量', 'codex_seven_day');
  return out;
}

// Combined list actually shown. Each brand can be toggled independently;
// the per-row logo (Claude / OpenAI) tells them apart.
function displayGauges() {
  return (showClaude ? currentGauges : []).concat(showCodex ? codexGauges(lastCodex) : []);
}

const $ = (id) => document.getElementById(id);

let previousGaugeWidths = new Map();
let previousCapsuleWidths = new Map();
let activeMainView = 'gauges';
const motionTimers = new WeakMap();

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clampPct(pct) {
  return Math.max(0, Math.min(100, Number(pct) || 0));
}

function pctWidth(pct) {
  return `${clampPct(pct)}%`;
}

function gaugeMotionKey(g) {
  return `${g.brand}:${g.key}`;
}

function animateWidth(el, fromPct, toPct) {
  if (!el) return;
  const to = pctWidth(toPct);
  if (prefersReducedMotion()) {
    el.style.width = to;
    return;
  }
  el.style.transition = 'none';
  el.style.width = pctWidth(fromPct);
  void el.offsetWidth;
  el.style.transition = '';
  requestAnimationFrame(() => {
    el.style.width = to;
  });
}

function animateInlineBars(root, selector) {
  if (!root || prefersReducedMotion()) return;
  const bars = [...root.querySelectorAll(selector)].map((bar) => {
    const target = bar.style.width || '0%';
    bar.style.transition = 'none';
    bar.style.width = '0%';
    return { bar, target };
  });
  void root.offsetWidth;
  requestAnimationFrame(() => {
    bars.forEach(({ bar, target }) => {
      bar.style.transition = '';
      bar.style.width = target;
    });
  });
}

function animateEnter(el, className = 'view-enter') {
  if (!el || prefersReducedMotion()) return;
  const oldTimer = motionTimers.get(el);
  if (oldTimer) clearTimeout(oldTimer);
  el.classList.remove(className, `${className}-active`);
  void el.offsetWidth;
  el.classList.add(className);
  requestAnimationFrame(() => {
    el.classList.add(`${className}-active`);
  });
  motionTimers.set(el, setTimeout(() => {
    el.classList.remove(className, `${className}-active`);
    motionTimers.delete(el);
  }, 380));
}

let tooltipEl = null;
let tooltipTarget = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'theme-tooltip';
  tooltipEl.className = 'theme-tooltip';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.classList.remove('visible');
  tooltipTarget = null;
}

function positionTooltip(target = tooltipTarget) {
  if (!tooltipEl || !target || !tooltipEl.classList.contains('visible')) return;
  const gap = 8;
  const rect = target.getBoundingClientRect();
  const tip = tooltipEl.getBoundingClientRect();
  
  let placement = target.dataset.placement || 'top';
  
  if (!target.dataset.placement) {
    let top = rect.top - gap;
    if (top - tip.height < gap) {
      placement = 'bottom';
    }
  }

  let top, left;

  if (placement === 'left') {
    left = rect.left - gap;
    top = rect.top + rect.height / 2;
    if (left - tip.width < gap) {
      placement = 'right';
      left = rect.right + gap;
    }
  } else if (placement === 'right') {
    left = rect.right + gap;
    top = rect.top + rect.height / 2;
    if (left + tip.width > window.innerWidth - gap) {
      placement = 'left';
      left = rect.left - gap;
    }
  } else if (placement === 'bottom') {
    left = rect.left + rect.width / 2;
    top = rect.bottom + gap;
  } else {
    // top
    left = rect.left + rect.width / 2;
    top = rect.top - gap;
  }

  if (placement === 'top' || placement === 'bottom') {
    const half = tip.width / 2;
    left = Math.max(gap + half, Math.min(window.innerWidth - gap - half, left));
    if (placement === 'top') {
      top = Math.max(gap + tip.height, top);
    } else {
      top = Math.min(window.innerHeight - gap - tip.height, top);
    }
  } else {
    // left 或 right
    const halfH = tip.height / 2;
    top = Math.max(gap + halfH, Math.min(window.innerHeight - gap - halfH, top));
  }

  tooltipEl.dataset.placement = placement;
  tooltipEl.style.left = `${Math.round(left)}px`;
  tooltipEl.style.top = `${Math.round(top)}px`;
}

function showTooltip(target) {
  const text = target && target.dataset ? target.dataset.tooltip : '';
  if (!text) return;
  ensureTooltip().textContent = text;
  tooltipTarget = target;
  tooltipEl.classList.add('visible');
  requestAnimationFrame(() => positionTooltip(target));
}

function setTooltip(el, text) {
  if (!el) return;
  el.removeAttribute('title');
  const value = String(text || '').trim();
  if (!value) {
    el.removeAttribute('data-tooltip');
    el.removeAttribute('aria-label');
    if (tooltipTarget === el) hideTooltip();
    return;
  }
  el.dataset.tooltip = value;
  el.setAttribute('aria-label', value);
}

function hydrateTooltips(root = document) {
  root.querySelectorAll('[title]').forEach((el) => setTooltip(el, el.getAttribute('title')));
}

hydrateTooltips();

document.addEventListener('pointerover', (e) => {
  const target = e.target.closest('[data-tooltip], [title]');
  if (!target) return;
  if (target.hasAttribute('title')) setTooltip(target, target.getAttribute('title'));
  showTooltip(target);
});
document.addEventListener('pointermove', () => positionTooltip());
document.addEventListener('pointerout', (e) => {
  if (tooltipTarget && !tooltipTarget.contains(e.relatedTarget)) hideTooltip();
});
document.addEventListener('focusin', (e) => {
  const target = e.target.closest('[data-tooltip], [title]');
  if (!target) return;
  if (target.hasAttribute('title')) setTooltip(target, target.getAttribute('title'));
  showTooltip(target);
});
document.addEventListener('focusout', () => hideTooltip());
window.addEventListener('resize', () => hideTooltip());

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]));
}
function fmtTokens(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
  return n.toLocaleString('en-US');
}

function fmtCost(n) {
  const value = convertUsd(n);
  if (currentCurrency() === 'TWD') {
    if (value >= 10) return fmtCurrencyValue(value, 0, 0);
    if (value >= 1) return fmtCurrencyValue(value, 1, 1);
    return fmtCurrencyValue(value, 2, 2);
  }
  n = Number(n) || 0;
  if (n >= 10) return fmtCurrencyValue(n, 1, 1);
  if (n >= 1) return fmtCurrencyValue(n, 2, 2);
  if (n >= 0.01) return fmtCurrencyValue(n, 3, 3);
  return fmtCurrencyValue(n, 4, 4);
}

const USAGE_PERIODS = [
  { key: 'day', label: '1日', days: 1, icon: 'M12 7v5l3 2' },
  { key: 'week', label: '1週', days: 7, icon: 'M8 2v3M16 2v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
  { key: 'month', label: '1月', days: 30, icon: 'M4 6h16M7 3v6M17 3v6M7 13h3M14 13h3M7 17h3M14 17h3M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
  { key: 'all', label: '全部', days: null, icon: 'M4 6h16M4 12h16M4 18h16' },
];

const CLAUDE_RATES_PER_MTOK = {
  sonnet: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10, label: 'Claude Sonnet 5 估' },
  opus: { input: 5, cacheRead: 0.5, cacheWrite: 6.25, output: 25, label: 'Claude Opus 4.8 估' },
  haiku: { input: 1, cacheRead: 0.1, cacheWrite: 1.25, output: 5, label: 'Claude Haiku 4.5 估' },
  fallback: { input: 2, cacheRead: 0.2, cacheWrite: 2.5, output: 10, label: 'Claude Sonnet 5 估' },
};
const CODEX_RATE_PER_MTOK = { input: 1.75, cacheRead: 0.175, output: 14, label: 'Codex gpt-5.3-codex 估' };

function currentUsagePeriod() {
  return USAGE_PERIODS.find((p) => p.key === usagePeriodKey) || USAGE_PERIODS[1];
}

function periodIcon(pathData) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + pathData + '" /></svg>';
}

function sessionDateValue(session) {
  const t = Date.parse(session && (session.updatedAt || session.startedAt));
  return Number.isFinite(t) ? t : 0;
}

function filterSessionsByPeriod(sessions) {
  const period = currentUsagePeriod();
  const rows = Array.isArray(sessions) ? sessions : [];
  if (!period.days) return rows.slice();
  const cutoff = Date.now() - period.days * 24 * 60 * 60 * 1000;
  return rows.filter((s) => sessionDateValue(s) >= cutoff);
}

function sessionTotal(sessions, key) {
  return sessions.reduce((sum, s) => sum + (Number(s[key]) || 0), 0);
}

function cacheInputDenominator(input, cached, cacheWrite, total) {
  const cacheTokens = Number(cached) || 0;
  const inputTokens = (Number(input) || 0) + cacheTokens + (Number(cacheWrite) || 0);
  if (inputTokens >= cacheTokens) return inputTokens;
  return Math.max(cacheTokens, Number(total) || 0);
}

function rateForClaudeSession(session) {
  const model = String(session && session.model || '').toLowerCase();
  if (model.includes('opus')) return CLAUDE_RATES_PER_MTOK.opus;
  if (model.includes('haiku')) return CLAUDE_RATES_PER_MTOK.haiku;
  if (model.includes('sonnet')) return CLAUDE_RATES_PER_MTOK.sonnet;
  return CLAUDE_RATES_PER_MTOK.fallback;
}

function estimateSessionCost(session, brand) {
  if (typeof session.costUsd === 'number' && Number.isFinite(session.costUsd)) return session.costUsd;
  const input = Number(session.inputTokens) || 0;
  const cached = Number(session.cachedInputTokens) || 0;
  const cacheWrite = Number(session.cacheCreationInputTokens) || 0;
  const output = Number(session.outputTokens) || 0;
  if (brand === 'claude') {
    const rate = rateForClaudeSession(session);
    return ((input * rate.input) + (cached * rate.cacheRead) + (cacheWrite * rate.cacheWrite) + (output * rate.output)) / 1000000;
  }
  return ((input * CODEX_RATE_PER_MTOK.input) + (cached * CODEX_RATE_PER_MTOK.cacheRead) + (output * CODEX_RATE_PER_MTOK.output)) / 1000000;
}

function estimateSessionsCost(sessions, brand) {
  return sessions.reduce((sum, s) => sum + estimateSessionCost(s, brand), 0);
}

function costRateLabel(sessions, brand) {
  if (sessions.some((s) => typeof s.costUsd === 'number' && Number.isFinite(s.costUsd))) {
    return brand === 'codex' ? CODEX_RATE_PER_MTOK.label : 'Claude 依工作階段加總估';
  }
  if (brand === 'codex') return CODEX_RATE_PER_MTOK.label;
  const labels = new Set(sessions.map((s) => rateForClaudeSession(s).label));
  if (!labels.size) return CLAUDE_RATES_PER_MTOK.fallback.label;
  return labels.size === 1 ? [...labels][0] : 'Claude 混合模型估';
}

function renderCostSummary(box, sessions, total, brand) {
  const row = document.createElement('div');
  row.className = `usage-cost brand-${brand}`;
  const cost = estimateSessionsCost(sessions, brand);
  row.innerHTML =
    `<span><strong>${fmtCost(cost)}</strong><em>預估</em></span>` +
    `<span>${fmtTokens(total)} Token · ${escapeHtml(costRateLabel(sessions, brand))}</span>`;
  box.appendChild(row);
}
function fmtSessionTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function appendBrandHeader(box, brand, title) {
  const header = document.createElement('div');
  header.className = `brand-header ${brand}`;
  header.innerHTML = `<span class="brand-dot"></span><span>${escapeHtml(title)}</span>`;
  box.appendChild(header);
}

function appendAnalysisCategory(box, title) {
  const header = document.createElement('div');
  header.className = 'analysis-category';
  header.textContent = title;
  box.appendChild(header);
}

function appendUsageTabs(box) {
  const tabs = document.createElement('div');
  tabs.className = 'usage-tabs';
  const items = [
    ['sessions', '工作階段比例'],
    ['habits', '使用習慣'],
  ];
  for (const [sheet, label] of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = sheet === usageAnalysisSheet ? 'active' : '';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (usageAnalysisSheet === sheet) return;
      usageAnalysisSheet = sheet;
      hideTooltip();
      renderUsageView();
      requestResize();
    });
    tabs.appendChild(btn);
  }
  box.appendChild(tabs);
}

function appendUsagePeriodControls(box) {
  const controls = document.createElement('div');
  controls.className = 'usage-periods';
  for (const period of USAGE_PERIODS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = period.key === usagePeriodKey ? 'active' : '';
    btn.innerHTML = `${periodIcon(period.icon)}<span>${escapeHtml(period.label)}</span>`;
    setTooltip(btn, `${period.label}內紀錄`);
    btn.addEventListener('click', () => {
      if (usagePeriodKey === period.key) return;
      usagePeriodKey = period.key;
      renderUsageView();
      requestResize();
    });
    controls.appendChild(btn);
  }
  box.appendChild(controls);
}
function appendSessionModeControls(box) {
  const controls = document.createElement('div');
  controls.className = 'usage-session-modes';
  const items = [
    ['project', '專案'],
    ['session', '工作階段'],
  ];
  for (const [mode, label] of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = mode === usageSessionMode ? 'active' : '';
    btn.textContent = label;
    setTooltip(btn, mode === 'project' ? '同一個檔案位置合併計算' : '每個工作階段分開計算');
    btn.addEventListener('click', () => {
      if (usageSessionMode === mode) return;
      usageSessionMode = mode;
      hideTooltip();
      renderUsageView();
      requestResize();
    });
    controls.appendChild(btn);
  }
  box.appendChild(controls);
}

function basenameFromPath(value) {
  const parts = String(value || '').split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function taskLabelForSession(session, mode) {
  if (mode === 'project') return '';
  const task = String(session && session.task || '').trim();
  const title = String(session && (session.title || session.label) || '').trim();
  if (!task || task === title) return '';
  return task;
}

function sessionNameForRow(session, isProject) {
  if (isProject) {
    return session.projectLabel || basenameFromPath(session.cwd) || session.label || session.shortId || 'Project';
  }
  return session.title || session.label || session.projectLabel || session.shortId || 'Session';
}

function aggregateProjectSessions(sessions, brand) {
  const projects = new Map();
  for (const s of sessions) {
    const cwd = s.cwd || '';
    const key = cwd || `session:${s.id || s.shortId || projects.size}`;
    let row = projects.get(key);
    if (!row) {
      row = {
        id: key,
        cwd: s.cwd || null,
        label: basenameFromPath(cwd) || s.projectLabel || s.label || s.shortId || '未命名專案',
        task: '',
        startedAt: s.startedAt || null,
        updatedAt: s.updatedAt || null,
        inputTokens: 0,
        cachedInputTokens: 0,
        cacheCreationInputTokens: 0,
        outputTokens: 0,
        reasoningOutputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        sessionCount: 0,
      };
      projects.set(key, row);
    }
    row.inputTokens += Number(s.inputTokens) || 0;
    row.cachedInputTokens += Number(s.cachedInputTokens) || 0;
    row.cacheCreationInputTokens += Number(s.cacheCreationInputTokens) || 0;
    row.outputTokens += Number(s.outputTokens) || 0;
    row.reasoningOutputTokens += Number(s.reasoningOutputTokens) || 0;
    row.totalTokens += Number(s.totalTokens) || 0;
    row.costUsd += estimateSessionCost(s, brand);
    row.sessionCount += 1;
    if (!row.startedAt || sessionDateValue(s) < sessionDateValue(row)) row.startedAt = s.startedAt || row.startedAt;
    if (sessionDateValue(s) >= sessionDateValue(row)) {
      row.updatedAt = s.updatedAt || row.updatedAt;
      if (s.task) row.task = s.task;
    }
  }
  return [...projects.values()].sort((a, b) => b.totalTokens - a.totalTokens);
}

function appendEmpty(box, text, className = 'insight-empty') {
  const empty = document.createElement('div');
  empty.className = className;
  empty.textContent = text;
  box.appendChild(empty);
}
function formatPct(pct) {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return '';
  return `${pct.toFixed(1)}%`;
}

function normalizeHabitPct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  if (value <= 1) return value * 100;
  if (value <= 100) return value;
  return null;
}

function textPercent(text) {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? normalizeHabitPct(Number(match[1])) : null;
}

function habitKind(text, key) {
  const s = `${key || ''} ${text || ''}`.toLowerCase();
  if (s.includes('workflow-subagent')) return 'workflow-subagent';
  if (s.includes('subagent')) return '子代理';
  if (s.includes('150k') || s.includes('context')) return '大型上下文';
  if (s.includes('session')) return '工作階段';
  if (s.includes('cached')) return '快取';
  if (s.includes('reasoning')) return '推理';
  return '使用模式';
}

function relevantHabitKey(key) {
  return /habit|insight|pattern|workflow|subagent|context|session|category|breakdown|usage/i.test(key || '');
}

function collectClaudeHabits(data) {
  const local = lastClaudeLocal && Array.isArray(lastClaudeLocal.habits) ? lastClaudeLocal.habits : [];
  if (local.length) return local.map((h) => ({ brand: 'claude', ...h }));
  const out = [];
  const seen = new Set();
  const add = (label, pct, kind, detail) => {
    if (!label) return;
    const key = `${label}|${pct ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ brand: 'claude', label, pct, kind, detail: detail || kind });
  };
  const visit = (value, path = []) => {
    if (!value || out.length >= 12) return;
    const pathText = path.join(' ');
    if (typeof value === 'string') {
      if (relevantHabitKey(pathText) || /subagent|context|session|workflow|usage came from|usage was at/i.test(value)) {
        add(value, textPercent(value), habitKind(value, pathText));
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, path.concat(String(i))));
      return;
    }
    if (typeof value !== 'object') return;

    const entries = Object.entries(value);
    const textEntry = entries.find(([k, v]) => typeof v === 'string' && /message|description|text|label|title|name|insight|summary/i.test(k));
    const pctEntry = entries.find(([k, v]) => typeof v === 'number' && /percent|percentage|share|ratio|fraction|utilization/i.test(k));
    const relevant = entries.some(([k]) => relevantHabitKey(k)) || relevantHabitKey(pathText);
    if (relevant && (textEntry || pctEntry)) {
      const label = textEntry ? textEntry[1] : prettifyKey(path[path.length - 1] || 'usage_pattern');
      const pct = pctEntry ? normalizeHabitPct(pctEntry[1]) : textPercent(label);
      add(label, pct, habitKind(label, pathText));
    }
    for (const [k, v] of entries) {
      if (k === 'limits' || k === 'spend' || k === 'extra_usage' || k === 'member_dashboard_available') continue;
      if (typeof v === 'number' && relevantHabitKey(k)) add(prettifyKey(k), normalizeHabitPct(v), habitKind('', k));
      else visit(v, path.concat(k));
    }
  };
  visit(data);
  return out;
}

function pctFromTokenSum(sessions, predicate, total) {
  const used = sessions.filter(predicate).reduce((sum, s) => sum + (Number(s.totalTokens) || 0), 0);
  return total > 0 ? (used / total) * 100 : null;
}

function collectCodexHabits(codex) {
  const data = codex && codex.sessions;
  const sessions = data && Array.isArray(data.sessions) ? data.sessions : [];
  if (!sessions.length) return [];
  const total = Number(data.totalTokens) || sessions.reduce((sum, s) => sum + (Number(s.totalTokens) || 0), 0);
  const input = sessions.reduce((sum, s) => sum + (Number(s.inputTokens) || 0), 0);
  const cached = sessions.reduce((sum, s) => sum + (Number(s.cachedInputTokens) || 0), 0);
  const cacheWrite = sessions.reduce((sum, s) => sum + (Number(s.cacheCreationInputTokens) || 0), 0);
  const totalInput = cacheInputDenominator(input, cached, cacheWrite, total);
  const output = sessions.reduce((sum, s) => sum + (Number(s.outputTokens) || 0), 0);
  const reasoning = sessions.reduce((sum, s) => sum + (Number(s.reasoningOutputTokens) || 0), 0);
  const workflowHits = sessions.reduce((sum, s) => sum + (Number(s.workflowSubagentHits) || 0), 0);
  const subagentHits = sessions.reduce((sum, s) => sum + (Number(s.subagentHits) || 0), 0);
  const habits = [
    {
      brand: 'codex',
      label: '超過 150K Token / 上下文的工作階段',
      pct: pctFromTokenSum(sessions, (s) => Number(s.totalTokens) >= 150000, total),
      kind: '大型上下文',
      detail: `${sessions.filter((s) => Number(s.totalTokens) >= 150000).length} / ${sessions.length} 個工作階段`,
    },
    {
      brand: 'codex',
      label: '快取輸入 Token',
      pct: totalInput > 0 ? (cached / totalInput) * 100 : null,
      kind: '快取',
      detail: `${fmtTokens(cached)} / ${fmtTokens(totalInput)} 輸入 Token`,
    },
    {
      brand: 'codex',
      label: '推理輸出 Token',
      pct: output > 0 ? (reasoning / output) * 100 : null,
      kind: '推理',
      detail: `${fmtTokens(reasoning)} / ${fmtTokens(output)} 輸出 Token`,
    },
  ];
  if (workflowHits > 0) habits.push({
    brand: 'codex',
    label: '提到 workflow-subagent 的工作階段',
    pct: pctFromTokenSum(sessions, (s) => Number(s.workflowSubagentHits) > 0, total),
    kind: 'workflow-subagent',
    detail: `${workflowHits} 次關鍵字命中`,
  });
  if (subagentHits > 0) habits.push({
    brand: 'codex',
    label: '子代理使用較多的工作階段',
    pct: pctFromTokenSum(sessions, (s) => Number(s.subagentHits) >= 5, total),
    kind: '子代理',
    detail: `${subagentHits} 次關鍵字命中`,
  });
  return habits.filter((h) => h.pct == null || h.pct > 0);
}

function collectSessionHabits(sessions, brand) {
  sessions = Array.isArray(sessions) ? sessions : [];
  if (!sessions.length) return [];
  const total = sessionTotal(sessions, 'totalTokens');
  const input = sessionTotal(sessions, 'inputTokens');
  const cached = sessionTotal(sessions, 'cachedInputTokens');
  const cacheWrite = sessionTotal(sessions, 'cacheCreationInputTokens');
  const totalInput = cacheInputDenominator(input, cached, cacheWrite, total);
  const output = sessionTotal(sessions, 'outputTokens');
  const reasoning = sessionTotal(sessions, 'reasoningOutputTokens');
  const workflowHits = sessionTotal(sessions, 'workflowSubagentHits');
  const subagentHits = sessionTotal(sessions, 'subagentHits');
  const expensive = sessions.filter((s) => estimateSessionCost(s, brand) >= 1);
  const habits = [
    {
      brand,
      label: '超過 150K Token / 上下文的工作階段',
      pct: pctFromTokenSum(sessions, (s) => Number(s.totalTokens) >= 150000, total),
      kind: '大型上下文',
      detail: `${sessions.filter((s) => Number(s.totalTokens) >= 150000).length} / ${sessions.length} 個工作階段`,
    },
    {
      brand,
      label: '快取輸入 Token',
      pct: totalInput > 0 ? (cached / totalInput) * 100 : null,
      kind: '快取',
      detail: `${fmtTokens(cached)} / ${fmtTokens(totalInput)} 輸入 Token`,
    },
    {
      brand,
      label: '輸出 Token 佔比',
      pct: total > 0 ? (output / total) * 100 : null,
      kind: '輸出',
      detail: `${fmtTokens(output)} / ${fmtTokens(total)} Token`,
    },
  ];
  if (cacheWrite > 0) habits.push({
    brand,
    label: '快取建立 Token',
    pct: total > 0 ? (cacheWrite / total) * 100 : null,
    kind: '快取',
    detail: `${fmtTokens(cacheWrite)} / ${fmtTokens(total)} Token`,
  });
  if (reasoning > 0) habits.push({
    brand,
    label: '推理輸出 Token',
    pct: output > 0 ? (reasoning / output) * 100 : null,
    kind: '推理',
    detail: `${fmtTokens(reasoning)} / ${fmtTokens(output)} 輸出 Token`,
  });
  if (expensive.length) habits.push({
    brand,
    label: '預估超過 $1 的工作階段',
    pct: pctFromTokenSum(sessions, (s) => estimateSessionCost(s, brand) >= 1, total),
    kind: '成本',
    detail: `${expensive.length} / ${sessions.length} 個工作階段`,
  });
  if (workflowHits > 0) habits.push({
    brand,
    label: '提到 workflow-subagent 的工作階段',
    pct: pctFromTokenSum(sessions, (s) => Number(s.workflowSubagentHits) > 0, total),
    kind: 'workflow-subagent',
    detail: `${workflowHits} 次關鍵字命中`,
  });
  if (subagentHits > 0) habits.push({
    brand,
    label: '子代理使用較多的工作階段',
    pct: pctFromTokenSum(sessions, (s) => Number(s.subagentHits) >= 5, total),
    kind: '子代理',
    detail: `${subagentHits} 次關鍵字命中`,
  });
  return habits.filter((h) => h.pct == null || h.pct > 0);
}
function renderInsightRows(box, habits, brand, emptyText, sessions = []) {
  appendBrandHeader(box, brand, brand === 'claude' ? 'Claude' : 'Codex');
  if (sessions.length) renderCostSummary(box, sessions, sessionTotal(sessions, 'totalTokens'), brand);
  if (!habits.length) {
    appendEmpty(box, emptyText);
    return;
  }
  const list = document.createElement('div');
  list.className = 'insight-list';
  for (const h of habits) {
    const pct = typeof h.pct === 'number' ? Math.max(0, Math.min(100, h.pct)) : null;
    const row = document.createElement('div');
    row.className = `insight-row brand-${brand}`;
    row.innerHTML =
      `<div class="insight-top"><span class="insight-name">${escapeHtml(h.label)}</span>` +
      `<span class="insight-pct">${pct == null ? '--' : formatPct(pct)}</span></div>` +
      `<div class="insight-bar"><div style="width:${pct == null ? 0 : pct}%"></div></div>` +
      `<div class="insight-meta"><span>${escapeHtml(h.kind || '')}</span><span>${escapeHtml(h.detail || '')}</span></div>`;
    list.appendChild(row);
  }
  box.appendChild(list);
}

function renderHabitSections(box) {
  const claudeData = lastClaudeLocal && lastClaudeLocal.sessions;
  const claudeSessions = filterSessionsByPeriod(claudeData && Array.isArray(claudeData.sessions) ? claudeData.sessions : []);
  renderInsightRows(
    box,
    collectSessionHabits(claudeSessions, 'claude'),
    'claude',
    '這個期間沒有 Claude 使用習慣資料。',
    claudeSessions,
  );

  const codexData = lastCodex && lastCodex.sessions;
  const codexSessions = filterSessionsByPeriod(codexData && Array.isArray(codexData.sessions) ? codexData.sessions : []);
  renderInsightRows(
    box,
    collectSessionHabits(codexSessions, 'codex'),
    'codex',
    '這個期間沒有 Codex 使用習慣資料。',
    codexSessions,
  );
}
function renderSessionRows(box, rows, total, brand = 'codex', mode = 'session') {
  const period = currentUsagePeriod();
  const isProject = mode === 'project';
  const head = document.createElement('div');
  head.className = 'session-summary';
  head.innerHTML = `<span>${period.label}內 ${rows.length} 個${isProject ? '專案' : '工作階段'}</span><strong>${fmtTokens(total)} · ${fmtCost(estimateSessionsCost(rows, brand))}</strong>`;
  box.appendChild(head);
  renderCostSummary(box, rows, total, brand);

  const list = document.createElement('div');
  list.className = 'session-list';
  for (const s of rows) {
    const pct = total > 0 ? ((Number(s.totalTokens) || 0) / total) * 100 : 0;
    const row = document.createElement('div');
    row.className = `session-row brand-${brand} mode-${mode}`;
    const task = taskLabelForSession(s, mode);
    const tooltip = [isProject ? s.cwd : (s.projectLabel || s.cwd), task].filter(Boolean).join('\n');
    if (tooltip) setTooltip(row, tooltip);
    const label = escapeHtml(sessionNameForRow(s, isProject));
    const taskHtml = task ? `<div class="session-task">${escapeHtml(task)}</div>` : '';
    const metaLeft = isProject && s.sessionCount > 1
      ? `${s.sessionCount} 個工作階段 · ${fmtTokens(s.totalTokens)} Token · ${fmtCost(estimateSessionCost(s, brand))}`
      : `${fmtTokens(s.totalTokens)} Token · ${fmtCost(estimateSessionCost(s, brand))}`;
    row.innerHTML =
      `<div class="session-top">` +
      `<span class="session-name">${label}</span>` +
      `<span class="session-pct">${pct.toFixed(1)}%</span>` +
      `</div>` +
      taskHtml +
      `<div class="session-bar"><div style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>` +
      `<div class="session-meta"><span>${escapeHtml(metaLeft)}</span><span>${fmtSessionTime(s.updatedAt)}</span></div>`;
    list.appendChild(row);
  }
  box.appendChild(list);
}
function renderSessionSections(box) {
  appendSessionModeControls(box);
  appendBrandHeader(box, 'claude', 'Claude');
  const claudeData = lastClaudeLocal && lastClaudeLocal.sessions;
  const claudeAll = claudeData && Array.isArray(claudeData.sessions) ? claudeData.sessions : [];
  const claudeSessions = filterSessionsByPeriod(claudeAll);
  const claudeRows = usageSessionMode === 'project' ? aggregateProjectSessions(claudeSessions, 'claude') : claudeSessions;
  if (!claudeRows.length) {
    appendEmpty(box, `這個期間沒有 Claude ${usageSessionMode === 'project' ? '專案' : '工作階段'}比例明細。`, 'session-empty');
  } else {
    const total = sessionTotal(claudeRows, 'totalTokens');
    renderSessionRows(box, claudeRows, total, 'claude', usageSessionMode);
  }

  appendBrandHeader(box, 'codex', 'Codex');
  const data = lastCodex && lastCodex.sessions;
  const allSessions = data && Array.isArray(data.sessions) ? data.sessions : [];
  const sessions = filterSessionsByPeriod(allSessions);
  const rows = usageSessionMode === 'project' ? aggregateProjectSessions(sessions, 'codex') : sessions;
  if (!rows.length) {
    appendEmpty(box, `這個期間沒有 Codex ${usageSessionMode === 'project' ? '專案' : '工作階段'}比例明細。`, 'session-empty');
  } else {
    const total = sessionTotal(rows, 'totalTokens');
    renderSessionRows(box, rows, total, 'codex', usageSessionMode);
  }
}
function renderUsageView() {
  const box = $('usage-view');
  if (!box) return;
  box.innerHTML = '';
  appendUsageTabs(box);
  appendUsagePeriodControls(box);
  if (usageAnalysisSheet === 'habits') renderHabitSections(box);
  else renderSessionSections(box);
  if (!box.children.length) box.innerHTML = '<div class="insight-empty">目前沒有可顯示的用量分析。</div>';
  animateInlineBars(box, '.session-bar > div, .insight-bar > div');
}
function setMainViewVisible(id, visible, shouldAnimate) {
  const el = $(id);
  if (!el) return;
  const wasHidden = el.classList.contains('hidden');
  el.classList.toggle('hidden', !visible);
  if (visible && shouldAnimate && wasHidden) animateEnter(el);
}
function syncMainViewVisibility() {
  const nextView = usageViewOpen ? 'usage-view' : (settingsOpen ? 'settings-view' : 'gauges');
  const changed = nextView !== activeMainView;
  setMainViewVisible('gauges', nextView === 'gauges', changed);
  setMainViewVisible('settings-view', nextView === 'settings-view', changed);
  setMainViewVisible('usage-view', nextView === 'usage-view', changed);
  $('btn-settings').classList.toggle('active', settingsOpen);
  $('btn-usage-details').classList.toggle('active', usageViewOpen);
  activeMainView = nextView;
  requestResize({ force: changed });
  if (changed) requestResize({ delay: 260, force: true });
}
function renderGauges() {
  const box = $('gauges');
  const gauges = displayGauges();
  const nextGaugeWidths = new Map();
  box.innerHTML = '';
  if (!gauges.length) {
    box.innerHTML = '<div class="gauge"><span class="dim" style="font-size:12px">目前沒有可顯示的用量限制</span></div>';
    previousGaugeWidths = nextGaugeWidths;
  }
  let prevBrand = null;
  for (const g of gauges) {
    const isCodex = g.brand === 'codex';
    if (prevBrand !== g.brand) {
      if (prevBrand) {
        const div = document.createElement('div');
        div.className = 'gauge-divider';
        box.appendChild(div);
      }
      appendBrandHeader(box, g.brand, `${isCodex ? 'Codex' : 'Claude'} usage limits`);
    }
    prevBrand = g.brand;
    const row = document.createElement('div');
    row.className = `gauge brand-${g.brand}`;

    let subLeft = '';
    if (g.dollars) subLeft = `${fmtMoney(g.dollars.used)} / ${fmtMoney(g.dollars.limit)}`;
    else if (g.subtext) subLeft = g.subtext;

    let subRight = '';
    if (g.resetsAt) {
      subRight = g.oneTime
        ? `到期 ${fmtResetAbs(g.resetsAt)}`
        : `重置 ${fmtCountdown(g.resetsAt)} 後 · ${fmtResetAbs(g.resetsAt)}`;
    } else if (g.subtext && g.dollars) {
      subRight = g.subtext;
    }

    const fillClass = fillClassForGauge(g);
    const pctClass = pctClassForGauge(g);
    const logo = `<span class="row-logo">${isCodex ? codexLogoSvg() : claudeLogoSvg()}</span>`;
    const motionKey = gaugeMotionKey(g);
    const previousPct = previousGaugeWidths.has(motionKey) ? previousGaugeWidths.get(motionKey) : 0;
    const increased = g.pct > previousPct + 0.05;
    if (increased) row.classList.add('gauge-updated');

    row.innerHTML =
      `<div class="gauge-top">` +
      `<span class="gauge-label">${logo}${g.label}</span>` +
      `<span class="gauge-pct ${pctClass}${increased ? ' number-bump' : ''}">${g.pct.toFixed(1)}%</span>` +
      `</div>` +
      `<div class="bar"><div class="fill ${fillClass}" style="width:${pctWidth(previousPct)}"></div></div>` +
      ((subLeft || subRight)
        ? `<div class="gauge-sub"><span>${subLeft}</span><span>${subRight}</span></div>`
        : '');
    box.appendChild(row);
    animateWidth(row.querySelector('.fill'), previousPct, g.pct);
    nextGaugeWidths.set(motionKey, g.pct);
  }
  previousGaugeWidths = nextGaugeWidths;
  renderStatus();
  renderCapsule(gauges);
  requestResize();
}

function renderStatus() {
  const dot = $('status-dot');
  const text = $('status-text');
  if (lastError) {
    dot.classList.add('err');
    const msgs = {
      'no-credentials': '找不到 Claude 憑證（~/.claude/.credentials.json）',
      auth: 'Token 已過期 — 請開啟 Claude Code 讓它自動更新',
      network: '網路連線失敗，將於下次排程重試',
      'http-429': 'Anthropic 暫時限流，稍後自動重試（Codex 不受影響）',
    };
    text.textContent = msgs[lastError] || `更新失敗（${lastError}）`;
  } else if (lastFetchedAt) {
    dot.classList.remove('err');
    const t = new Date(lastFetchedAt).toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    text.textContent = `已更新 ${t} · 每 ${pollMinutes} 分鐘自動更新`;
  }
}

function topGaugeByBrand(gauges) {
  const brands = ['claude', 'codex'];
  return brands.map((brand) => gauges
    .filter((g) => g.brand === brand)
    .reduce((top, g) => (!top || g.pct > top.pct ? g : top), null))
    .filter(Boolean);
}

function renderCapsule(gauges) {
  gauges = gauges || displayGauges();
  const box = $('capsule-items');
  if (!box) return;
  box.innerHTML = '';
  if (!gauges.length) {
    box.innerHTML = '<div class="capsule-empty">--%</div>';
    previousCapsuleWidths = new Map();
    setTooltip($('capsule'), '目前沒有可顯示的用量限制');
    return;
  }

  const rows = topGaugeByBrand(gauges);
  const nextCapsuleWidths = new Map();
  for (const g of rows) {
    const isCodex = g.brand === 'codex';
    const fillClass = fillClassForGauge(g);
    const pctClass = pctClassForGauge(g);
    const previousPct = previousCapsuleWidths.has(g.brand) ? previousCapsuleWidths.get(g.brand) : 0;
    const increased = g.pct > previousPct + 0.05;
    const row = document.createElement('div');
    row.className = `capsule-item brand-${g.brand}`;
    if (increased) row.classList.add('gauge-updated');
    row.innerHTML =
      `<span class="capsule-logo">${isCodex ? codexLogoSvg() : claudeLogoSvg()}</span>` +
      `<span class="capsule-main">` +
      `<span class="capsule-name">${isCodex ? 'Codex' : 'Claude'}</span>` +
      `<span class="capsule-bar"><span class="fill ${fillClass}" style="width:${pctWidth(previousPct)}"></span></span>` +
      `</span>` +
      `<span class="capsule-pct ${pctClass}${increased ? ' number-bump' : ''}">${g.pct.toFixed(0)}%</span>`;
    box.appendChild(row);
    animateWidth(row.querySelector('.fill'), previousPct, g.pct);
    nextCapsuleWidths.set(g.brand, g.pct);
  }
  previousCapsuleWidths = nextCapsuleWidths;

  const summary = rows.map((g) => `${g.brand === 'codex' ? 'Codex' : 'Claude'} ${g.pct.toFixed(1)}%`).join(' / ');
  const soonest = gauges
    .filter((g) => g.resetsAt && !g.oneTime)
    .sort((a, b) => new Date(a.resetsAt) - new Date(b.resetsAt))[0];
  setTooltip($('capsule'), soonest ? `${summary} · 重置 ${fmtCountdown(soonest.resetsAt)}` : summary);
}
let resizeFrame = null;
let resizeTimer = null;
let lastRequestedHeight = 0;
function requestResize(options = {}) {
  const delay = Math.max(0, Number(options.delay) || 0);
  const force = options.force === true;
  clearTimeout(resizeTimer);
  const schedule = () => {
    if (resizeFrame != null) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      const target = collapsed ? $('capsule') : $('panel');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const nextHeight = Math.ceil(rect.height) + 4;
      if (!force && Math.abs(nextHeight - lastRequestedHeight) <= 1) return;
      lastRequestedHeight = nextHeight;
      window.widget.resizeHeight(nextHeight);
    });
  };
  if (delay > 0) resizeTimer = setTimeout(schedule, delay);
  else schedule();
}

function applyCollapsed(c) {
  collapsed = c;
  const panel = $('panel');
  const capsule = $('capsule');
  const nextSurface = c ? capsule : panel;
  const oldSurface = c ? panel : capsule;
  if (oldSurface) oldSurface.classList.add('hidden');
  if (nextSurface) {
    const wasHidden = nextSurface.classList.contains('hidden');
    nextSurface.classList.remove('hidden');
    if (wasHidden) animateEnter(nextSurface, 'surface-enter');
  }
  requestResize({ force: true });
  requestResize({ delay: 260, force: true });
}

// ---------- wiring ----------
window.widget.onInit(({ collapsed: c }) => applyCollapsed(c));
window.widget.onCollapsedChanged((c) => applyCollapsed(c));

window.widget.onSettings((s) => {
  showClaude = s.showClaude !== false;
  showAmberLadder = s.showAmberLadder === true;
  showCodex = s.showCodex !== false;
  displayCurrency = s.displayCurrency === 'TWD' ? 'TWD' : 'USD';
  if (typeof s.pollMinutes === 'number') pollMinutes = s.pollMinutes;
  syncSettingsControls(s);
  if (lastData) currentGauges = normalize(lastData);
  renderGauges();
  if (usageViewOpen) renderUsageView();
});

// ---------- settings page ----------
function syncSettingsControls(s) {
  const slider = $('poll-slider');
  if (slider && typeof s.pollMinutes === 'number') {
    slider.value = String(s.pollMinutes);
    $('poll-value').textContent = `${s.pollMinutes} 分鐘`;
  }
  const currencySelect = $('set-displayCurrency');
  if (currencySelect) currencySelect.value = s.displayCurrency === 'TWD' ? 'TWD' : 'USD';
  const toggles = {
    'set-showClaude': s.showClaude !== false,
    'set-showAmberLadder': s.showAmberLadder === true,
    'set-showCodex': s.showCodex !== false,
    'set-notify': s.notify !== false,
    'set-alwaysOnTop': s.alwaysOnTop !== false,
    'set-openAtLogin': s.openAtLogin !== false,
  };
  for (const [id, val] of Object.entries(toggles)) {
    const el = $(id);
    if (el) el.checked = val;
  }
  // When a CLI isn't detected locally, its "顯示 …" toggle can't be enabled.
  applyAvailability('set-showClaude', 'row-showClaude', s.claudeAvailable !== false);
  applyAvailability('set-showCodex', 'row-showCodex', s.codexAvailable !== false);
}

function applyAvailability(inputId, rowId, available) {
  const input = $(inputId);
  const row = $(rowId);
  if (input) {
    input.disabled = !available;
    if (!available) input.checked = false;
  }
  if (row) {
    row.classList.toggle('disabled', !available);
    setTooltip(row, available ? '' : '未偵測到對應的 CLI');
  }
}

function applySettingsView(open) {
  settingsOpen = open;
  if (open) {
    usageViewOpen = false;
  }
  setTooltip($('btn-settings'), open ? '返回' : '設定');
  syncMainViewVisibility();
}

function applyUsageView(open) {
  usageViewOpen = open;
  if (open) {
    settingsOpen = false;
  }
  renderUsageView();
  syncMainViewVisibility();
}

$('btn-settings').addEventListener('click', () => applySettingsView(!settingsOpen));
$('btn-usage-details').addEventListener('click', () => applyUsageView(!usageViewOpen));

// Live-update the label as the user drags; persist the value on release.
$('poll-slider').addEventListener('input', (e) => {
  $('poll-value').textContent = `${e.target.value} 分鐘`;
});
$('poll-slider').addEventListener('change', (e) => {
  const m = Number(e.target.value);
  pollMinutes = m;
  window.widget.setSetting('pollMinutes', m);
});

$('set-displayCurrency').addEventListener('change', (e) => {
  displayCurrency = e.target.value === 'TWD' ? 'TWD' : 'USD';
  renderGauges();
  if (usageViewOpen) renderUsageView();
  window.widget.setSetting('displayCurrency', displayCurrency);
});

const TOGGLE_KEYS = {
  'set-showClaude': 'showClaude',
  'set-showAmberLadder': 'showAmberLadder',
  'set-showCodex': 'showCodex',
  'set-notify': 'notify',
  'set-alwaysOnTop': 'alwaysOnTop',
  'set-openAtLogin': 'openAtLogin',
};
for (const [id, key] of Object.entries(TOGGLE_KEYS)) {
  $(id).addEventListener('change', (e) => window.widget.setSetting(key, e.target.checked));
}

window.widget.onUsage((payload) => {
  if ('claudeLocal' in payload) lastClaudeLocal = payload.claudeLocal;
  if ('codex' in payload) lastCodex = payload.codex;
  if (payload.ok) {
    lastError = null;
    lastFetchedAt = payload.fetchedAt;
    lastData = payload.data;
    currentGauges = normalize(payload.data);
  } else {
    lastError = payload.error;
    if (payload.stale && payload.stale.data && !currentGauges.length) {
      lastData = payload.stale.data;
      currentGauges = normalize(payload.stale.data);
      lastFetchedAt = payload.stale.fetchedAt;
    }
  }
  renderGauges();
  if (usageViewOpen) renderUsageView();
});

$('btn-collapse').addEventListener('click', () => window.widget.toggleCollapse());
$('btn-expand').addEventListener('click', () => window.widget.toggleCollapse());
$('btn-refresh').addEventListener('click', () => window.widget.refresh());
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.widget.openMenu();
});

// When the user drags the window width, re-fit height to the reflowed content.
// Guard on width so our own height-only resizes don't cause a feedback loop.
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (collapsed) return;
  if (window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  requestResize({ delay: 120 });
});

// tick countdowns locally between polls
setInterval(() => { if (displayGauges().length) renderGauges(); }, 30000);
