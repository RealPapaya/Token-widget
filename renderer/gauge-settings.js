'use strict';
// Per-gauge show/hide checkboxes under each provider toggle on the settings
// page. Choices live in settings.gaugeVisibility ({ key: bool }); keys without
// an entry fall back to gaugeVisibleByDefault(). main.js mirrors these two
// functions so hidden gauges also skip notifications and the tray tooltip.
// Loaded before renderer.js; reads its `gaugeVisibility` state at call time.

// Antigravity reports one quota per model; by default only its Claude and
// Gemini Pro quotas are shown.
function gaugeVisibleByDefault(key) {
  const m = /^antigravity_(.+)$/.exec(key || '');
  if (!m) return true;
  return /claude|(?:^|-)pro$/i.test(m[1]);
}

function isGaugeVisible(key) {
  return Object.prototype.hasOwnProperty.call(gaugeVisibility, key)
    ? gaugeVisibility[key] !== false
    : gaugeVisibleByDefault(key);
}

// Rebuilds the checkbox list under each provider from the gauges that
// provider currently reports; a provider that is off or has none shows none.
// Skipped when nothing changed, so the 30s re-render can't eat a click.
function renderGaugeSettings(gauges) {
  for (const brand of ['claude', 'codex', 'antigravity']) {
    const box = document.getElementById(`gauges-${brand}`);
    if (!box) continue;
    const rows = gauges.filter((g) => g.brand === brand);
    const signature = rows.map((g) => `${g.key}|${g.label}|${isGaugeVisible(g.key)}`).join('\n');
    if (box.dataset.signature === signature) continue;
    box.dataset.signature = signature;
    box.classList.toggle('hidden', !rows.length);
    box.innerHTML = rows.map((g) =>
      `<label class="set-toggle set-subtoggle"><span>${escapeHtml(g.label)}</span>` +
      `<input type="checkbox" data-gauge-key="${escapeHtml(g.key)}"${isGaugeVisible(g.key) ? ' checked' : ''} /></label>`).join('');
  }
}

document.addEventListener('change', (e) => {
  const key = e.target && e.target.dataset && e.target.dataset.gaugeKey;
  if (!key) return;
  gaugeVisibility = { ...gaugeVisibility, [key]: e.target.checked };
  renderGauges();
  window.widget.setSetting('gaugeVisibility', { key, visible: e.target.checked });
});
