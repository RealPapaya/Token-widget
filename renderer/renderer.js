'use strict';

// ---------- Claude logo (official mark, Anthropic orange) ----------
// Path from the official Claude glyph (viewBox 0 0 16 16).
const CLAUDE_LOGO_PATH = 'm3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z';
function claudeLogoSvg() {
  return '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">' +
    `<path fill="#D97757" d="${CLAUDE_LOGO_PATH}"/></svg>`;
}
document.getElementById('logo-expanded').innerHTML = claudeLogoSvg();
document.getElementById('logo-capsule').innerHTML = claudeLogoSvg();

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

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
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

// ---------- normalize API payload into gauge list ----------
function normalize(data) {
  const skip = new Set(['limits', 'spend', 'extra_usage', 'member_dashboard_available']);
  if (!showAmberLadder) skip.add('amber_ladder');
  const gauges = [];
  const order = ['five_hour', 'seven_day', 'seven_day_opus', 'seven_day_sonnet'];
  for (const [key, val] of Object.entries(data)) {
    if (skip.has(key) || !val || typeof val !== 'object' || Array.isArray(val)) continue;
    if (typeof val.utilization !== 'number') continue;
    if (val.limit_dollars == null && !val.resets_at && val.utilization <= 0) continue;
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
let pollMinutes = 3;
let settingsOpen = false;
let lastData = null;   // raw Anthropic payload, kept so a settings change can re-normalize
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

function renderGauges() {
  const box = $('gauges');
  const gauges = displayGauges();
  box.innerHTML = '';
  if (!gauges.length) {
    box.innerHTML = '<div class="gauge"><span class="dim" style="font-size:12px">目前沒有可顯示的用量限制</span></div>';
  }
  for (const g of gauges) {
    const sev = severityOf(g.pct);
    const isCodex = g.brand === 'codex';
    const row = document.createElement('div');
    row.className = 'gauge';

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

    // Codex bar stays blue regardless of severity; the % text still colours by severity.
    const fillClass = isCodex ? 'codex' : (sev !== 'normal' ? sev : '');
    const logo = `<span class="row-logo">${isCodex ? codexLogoSvg() : claudeLogoSvg()}</span>`;

    row.innerHTML =
      `<div class="gauge-top">` +
      `<span class="gauge-label">${logo}${g.label}</span>` +
      `<span class="gauge-pct ${sev !== 'normal' ? sev : ''}">${g.pct.toFixed(1)}%</span>` +
      `</div>` +
      `<div class="bar"><div class="fill ${fillClass}" style="width:${g.pct}%"></div></div>` +
      ((subLeft || subRight)
        ? `<div class="gauge-sub"><span>${subLeft}</span><span>${subRight}</span></div>`
        : '');
    box.appendChild(row);
  }
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

function renderCapsule(gauges) {
  gauges = gauges || displayGauges();
  if (!gauges.length) return;
  const top = gauges.reduce((a, b) => (b.pct > a.pct ? b : a));
  const sev = severityOf(top.pct);
  const fill = $('capsule-fill');
  fill.style.width = `${top.pct}%`;
  fill.className = 'fill' + (top.brand === 'codex' ? ' codex' : (sev !== 'normal' ? ' ' + sev : ''));
  $('capsule-pct').textContent = `${top.pct.toFixed(0)}%`;
  $('capsule').title = `${top.label}：${top.pct.toFixed(1)}%`;
  const soonest = gauges
    .filter((g) => g.resetsAt && !g.oneTime)
    .sort((a, b) => new Date(a.resetsAt) - new Date(b.resetsAt))[0];
  $('capsule-reset').textContent = soonest ? `重置 ${fmtCountdown(soonest.resetsAt)}` : '';
}

function requestResize() {
  requestAnimationFrame(() => {
    if (collapsed) {
      const rect = $('capsule').getBoundingClientRect();
      window.widget.resize(Math.ceil(rect.width) + 4, Math.ceil(rect.height) + 4);
    } else {
      // Width is user-controlled (drag edges); only fit height to content.
      const rect = $('panel').getBoundingClientRect();
      window.widget.resizeHeight(Math.ceil(rect.height) + 4);
    }
  });
}

function applyCollapsed(c) {
  collapsed = c;
  $('panel').classList.toggle('hidden', c);
  $('capsule').classList.toggle('hidden', !c);
  requestResize();
}

// ---------- wiring ----------
window.widget.onInit(({ collapsed: c }) => applyCollapsed(c));
window.widget.onCollapsedChanged((c) => applyCollapsed(c));

window.widget.onSettings((s) => {
  showClaude = s.showClaude !== false;
  showAmberLadder = s.showAmberLadder === true;
  showCodex = s.showCodex !== false;
  if (typeof s.pollMinutes === 'number') pollMinutes = s.pollMinutes;
  syncSettingsControls(s);
  if (lastData) currentGauges = normalize(lastData);
  renderGauges();
});

// ---------- settings page ----------
function syncSettingsControls(s) {
  const slider = $('poll-slider');
  if (slider && typeof s.pollMinutes === 'number') {
    slider.value = String(s.pollMinutes);
    $('poll-value').textContent = `${s.pollMinutes} 分鐘`;
  }
  const toggles = {
    'set-showClaude': s.showClaude !== false,
    'set-showAmberLadder': s.showAmberLadder === true,
    'set-showCodex': s.showCodex !== false,
    'set-notify': s.notify !== false,
    'set-alwaysOnTop': s.alwaysOnTop !== false,
  };
  for (const [id, val] of Object.entries(toggles)) {
    const el = $(id);
    if (el) el.checked = val;
  }
}

function applySettingsView(open) {
  settingsOpen = open;
  $('gauges').classList.toggle('hidden', open);
  $('settings-view').classList.toggle('hidden', !open);
  $('btn-refresh').classList.toggle('hidden', open);
  $('btn-settings').title = open ? '返回' : '設定';
  requestResize();
}

$('btn-settings').addEventListener('click', () => applySettingsView(!settingsOpen));

// Live-update the label as the user drags; persist the value on release.
$('poll-slider').addEventListener('input', (e) => {
  $('poll-value').textContent = `${e.target.value} 分鐘`;
});
$('poll-slider').addEventListener('change', (e) => {
  const m = Number(e.target.value);
  pollMinutes = m;
  window.widget.setSetting('pollMinutes', m);
});

const TOGGLE_KEYS = {
  'set-showClaude': 'showClaude',
  'set-showAmberLadder': 'showAmberLadder',
  'set-showCodex': 'showCodex',
  'set-notify': 'notify',
  'set-alwaysOnTop': 'alwaysOnTop',
};
for (const [id, key] of Object.entries(TOGGLE_KEYS)) {
  $(id).addEventListener('change', (e) => window.widget.setSetting(key, e.target.checked));
}

window.widget.onUsage((payload) => {
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
  requestResize();
});

// tick countdowns locally between polls
setInterval(() => { if (displayGauges().length) renderGauges(); }, 30000);
