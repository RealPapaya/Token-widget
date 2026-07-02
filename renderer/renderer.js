'use strict';

// ---------- Claude starburst logo (generated SVG) ----------
function makeStarburst(size) {
  const rays = 12;
  const lengths = [1.0, 0.72, 0.9, 0.68, 1.0, 0.78, 0.92, 0.7, 1.0, 0.74, 0.9, 0.78];
  const c = size / 2;
  const maxR = size / 2 - 0.5;
  let paths = '';
  for (let k = 0; k < rays; k++) {
    const a = (k * 2 * Math.PI) / rays;
    const len = maxR * lengths[k];
    const baseW = size * 0.055;
    const tipW = size * 0.016;
    const px = Math.cos(a + Math.PI / 2), py = Math.sin(a + Math.PI / 2);
    const bx = c + Math.cos(a) * size * 0.06, by = c + Math.sin(a) * size * 0.06;
    const tx = c + Math.cos(a) * len, ty = c + Math.sin(a) * len;
    paths += `<polygon points="${(bx + px * baseW).toFixed(2)},${(by + py * baseW).toFixed(2)} ` +
      `${(tx + px * tipW).toFixed(2)},${(ty + py * tipW).toFixed(2)} ` +
      `${(tx - px * tipW).toFixed(2)},${(ty - py * tipW).toFixed(2)} ` +
      `${(bx - px * baseW).toFixed(2)},${(by - py * baseW).toFixed(2)}" fill="#D97757"/>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="${c}" cy="${c}" r="${size * 0.07}" fill="#D97757"/>${paths}</svg>`;
}
document.getElementById('logo-expanded').innerHTML = makeStarburst(24);
document.getElementById('logo-capsule').innerHTML = makeStarburst(24);

// ---------- labels for known API keys ----------
const LABELS = {
  five_hour: '目前 Session（5 小時）',
  seven_day: '本週 · 所有模型',
  seven_day_opus: '本週 · Opus',
  seven_day_sonnet: '本週 · Sonnet',
  seven_day_oauth_apps: '本週 · 連線應用程式',
  seven_day_cowork: '本週 · Cowork',
  cinder_cove: 'Claude Code / Cowork 額度',
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

const $ = (id) => document.getElementById(id);

function renderGauges() {
  const box = $('gauges');
  box.innerHTML = '';
  if (!currentGauges.length) {
    box.innerHTML = '<div class="gauge"><span class="dim" style="font-size:12px">目前沒有可顯示的用量限制</span></div>';
  }
  for (const g of currentGauges) {
    const sev = severityOf(g.pct);
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

    row.innerHTML =
      `<div class="gauge-top">` +
      `<span class="gauge-label">${g.label}</span>` +
      `<span class="gauge-pct ${sev !== 'normal' ? sev : ''}">${g.pct.toFixed(1)}%</span>` +
      `</div>` +
      `<div class="bar"><div class="fill ${sev !== 'normal' ? sev : ''}" style="width:${g.pct}%"></div></div>` +
      ((subLeft || subRight)
        ? `<div class="gauge-sub"><span>${subLeft}</span><span>${subRight}</span></div>`
        : '');
    box.appendChild(row);
  }
  renderStatus();
  renderCapsule();
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
    };
    text.textContent = msgs[lastError] || `更新失敗（${lastError}）`;
  } else if (lastFetchedAt) {
    dot.classList.remove('err');
    const t = new Date(lastFetchedAt).toLocaleTimeString('zh-TW', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    text.textContent = `已更新 ${t} · 每 3 分鐘自動更新`;
  }
}

function renderCapsule() {
  if (!currentGauges.length) return;
  const top = currentGauges.reduce((a, b) => (b.pct > a.pct ? b : a));
  const sev = severityOf(top.pct);
  const fill = $('capsule-fill');
  fill.style.width = `${top.pct}%`;
  fill.className = 'fill' + (sev !== 'normal' ? ' ' + sev : '');
  $('capsule-pct').textContent = `${top.pct.toFixed(0)}%`;
  $('capsule').title = `${top.label}：${top.pct.toFixed(1)}%`;
  const soonest = currentGauges
    .filter((g) => g.resetsAt && !g.oneTime)
    .sort((a, b) => new Date(a.resetsAt) - new Date(b.resetsAt))[0];
  $('capsule-reset').textContent = soonest ? `重置 ${fmtCountdown(soonest.resetsAt)}` : '';
}

function requestResize() {
  requestAnimationFrame(() => {
    const el = collapsed ? $('capsule') : $('panel');
    const rect = el.getBoundingClientRect();
    window.widget.resize(Math.ceil(rect.width) + (collapsed ? 4 : 4), Math.ceil(rect.height) + 4);
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

window.widget.onUsage((payload) => {
  if (payload.ok) {
    lastError = null;
    lastFetchedAt = payload.fetchedAt;
    currentGauges = normalize(payload.data);
  } else {
    lastError = payload.error;
    if (payload.stale && payload.stale.data && !currentGauges.length) {
      currentGauges = normalize(payload.stale.data);
      lastFetchedAt = payload.stale.fetchedAt;
    }
  }
  renderGauges();
});

$('btn-collapse').addEventListener('click', () => window.widget.toggleCollapse());
$('btn-expand').addEventListener('click', () => window.widget.toggleCollapse());
$('btn-refresh').addEventListener('click', () => window.widget.refresh());
$('btn-menu').addEventListener('click', () => window.widget.openMenu());
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.widget.openMenu();
});

// tick countdowns locally between polls
setInterval(() => { if (currentGauges.length) renderGauges(); }, 30000);
