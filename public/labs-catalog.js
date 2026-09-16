/* Aorila Labs catalog + host earnings calculator.
 * Marketplace-style GPU cards (same pattern as aorila.com's price.js) wired to
 * the real catalog endpoint /compute/v1/gpus. Renders an honest empty state
 * when no hosts are online — never staged offers, never unconfirmed partners.
 * Pure helpers are exported for node tests. */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortName(o) {
    return String(o.name || o.sku || 'GPU').replace(/^Aorila\s+/i, '');
  }

  function artLabel(o) {
    const tokens = shortName(o).split(/\s+/);
    if (tokens[0] === 'RTX' && tokens[1]) return tokens[1].replace(/GB$/i, '');
    return tokens[0] || 'GPU';
  }

  // GPU chip illustration. Datacenter parts get the wide die.
  function chipSvg(o) {
    const dc = String(o.class || '') === 'datacenter';
    const label = esc(artLabel(o));
    const pins = dc ? [26, 42, 58, 74, 90] : [32, 52, 72, 92];
    const pinLines = pins
      .map((x) => `<line x1="${x}" y1="6" x2="${x}" y2="20"/><line x1="${x}" y1="76" x2="${x}" y2="90"/>`)
      .join('');
    const dieW = dc ? 64 : 48;
    const dieX = 60 - dieW / 2;
    return `<svg viewBox="0 0 120 96" class="gpu-art" aria-hidden="true" focusable="false">` +
      `<g stroke="currentColor" stroke-width="4">${pinLines}</g>` +
      `<rect x="16" y="20" width="88" height="56" fill="none" stroke="currentColor" stroke-width="4"/>` +
      `<rect x="${dieX}" y="34" width="${dieW}" height="28" fill="currentColor"/>` +
      `<text x="60" y="54" text-anchor="middle" font-size="13" font-family="'IBM Plex Mono',monospace" fill="#ffffff">${label}</text>` +
      `</svg>`;
  }

  function groupOffers(offers) {
    const groups = new Map();
    for (const o of offers || []) {
      const key = String(o.sku || o.name || 'gpu');
      if (!groups.has(key)) groups.set(key, { sku: key, offers: [] });
      groups.get(key).offers.push(o);
    }
    const out = [];
    for (const g of groups.values()) {
      const priced = g.offers.filter((o) => Number(o.usdPerHour) > 0);
      const from = priced.length ? Math.min.apply(null, priced.map((o) => Number(o.usdPerHour))) : 0;
      const regions = new Set(g.offers.map((o) => o.region).filter(Boolean));
      const tiers = new Set(g.offers.map((o) => o.tier).filter(Boolean));
      const first = g.offers[0] || {};
      out.push({
        sku: g.sku,
        name: shortName(first),
        vramGb: first.vramGb || null,
        cls: String(first.class || ''),
        from,
        perMin: from / 60,
        regions: regions.size,
        tiers: Array.from(tiers),
        count: g.offers.length,
      });
    }
    out.sort((a, b) => (a.from || 99) - (b.from || 99));
    return out;
  }

  function tierLabel(t) {
    const s = String(t || '').toLowerCase();
    return s === 'secure' ? 'Secure' : 'Open';
  }

  function classLabel(c) {
    const s = String(c || '').toLowerCase();
    if (s === 'datacenter') return 'Datacenter';
    if (s === 'workstation') return 'Workstation';
    return 'Consumer';
  }

  function gpuCard(g) {
    const price = g.from > 0 ? '$' + g.from.toFixed(3) : '—';
    const perMin = g.from > 0 ? '≈ $' + g.perMin.toFixed(4) + '/min' : '';
    const specs = [g.vramGb ? g.vramGb + 'GB VRAM' : null, classLabel(g.cls)].filter(Boolean).join(' · ');
    const meta = [`${g.regions} region${g.regions === 1 ? '' : 's'}`]
      .concat(g.tiers.map(tierLabel))
      .map((t) => `<span class="gpu-chip">${esc(t)}</span>`)
      .join('');
    return `<article class="gpu-card" data-cls="${esc(String(g.cls).toLowerCase())}">` +
      `<div class="gpu-card-top">${chipSvg({ class: g.cls, name: g.name, sku: g.sku })}` +
      `<div><p class="gpu-kicker">Aorila</p><h3 class="gpu-name">${esc(g.name)}</h3>` +
      `<p class="gpu-specs">${esc(specs)}</p></div></div>` +
      `<div class="gpu-price-row"><p class="gpu-price"><span class="from">from</span> ${price} <span>/hr</span></p>` +
      (perMin ? `<p class="gpu-permin">${perMin} · billed per minute</p>` : '') +
      `</div><div class="gpu-meta">${meta}</div>` +
      `<a class="btn acid gpu-deploy" href="/console/pods/new?sku=${encodeURIComponent(g.sku)}">Deploy</a>` +
      `</article>`;
  }

  function emptyCatalogHtml() {
    return '<div class="soon-box"><h3>No hosts online yet</h3>' +
      '<p>The catalog opens as hosts list their GPUs. Partner capacity appears here only after agreements are signed — never before.</p>' +
      '<div class="btn-row"><a class="btn acid" href="#hosts">Apply to host</a></div></div>';
  }

  function catalogHtml(groups) {
    if (!groups.length) return emptyCatalogHtml();
    const filters =
      `<div class="gpu-filters" role="group" aria-label="Filter GPUs">` +
      `<span class="gpu-filters-label">FILTER</span>` +
      `<button type="button" data-gf="all" class="on">All</button>` +
      `<button type="button" data-gf="datacenter">Datacenter</button>` +
      `<button type="button" data-gf="workstation">Workstation</button>` +
      `<button type="button" data-gf="consumer">Consumer</button></div>`;
    return filters + `<div class="gpu-grid">${groups.map(gpuCard).join('')}</div>` +
      `<p class="price-note">Aorila price includes the platform fee. Deploy signs you in first if needed, then starts the machine.</p>`;
  }

  function bindFilters(root) {
    const btns = root.querySelectorAll('[data-gf]');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
        const f = btn.getAttribute('data-gf');
        root.querySelectorAll('.gpu-card').forEach((card) => {
          card.style.display = f === 'all' || card.getAttribute('data-cls') === f ? '' : 'none';
        });
      });
    });
  }

  function renderCatalog(el, data) {
    const offers = (data && data.offers) || [];
    el.innerHTML = catalogHtml(groupOffers(offers));
    bindFilters(el);
  }

  function failCatalog(el) {
    el.innerHTML = '<div class="soon-box"><h3>Could not load the catalog</h3>' +
      '<p>The catalog endpoint is unreachable right now. This is not a sign of hidden supply.</p></div>';
  }

  /* ---------- host earnings calculator ---------- */

  // Default $/hr per GPU model: observed community-marketplace medians/ranges.
  // 4090 median ~$0.36 (range $0.15–$0.59); others from the same market data.
  var GPU_DEFAULTS = {
    'rtx-3090': { label: 'RTX 3090', rate: 0.16 },
    'rtx-4090': { label: 'RTX 4090', rate: 0.36 },
    'rtx-5090': { label: 'RTX 5090', rate: 0.46 },
    'l40s':     { label: 'L40S', rate: 0.31 },
    'a100-80':  { label: 'A100 80GB', rate: 0.67 },
    'h100-80':  { label: 'H100 80GB', rate: 1.55 },
  };

  var HOURS_PER_MONTH = 730;

  function monthlyEstimate(ratePerHour, utilizationPct, gpuCount) {
    return Number(ratePerHour) * (Number(utilizationPct) / 100) * HOURS_PER_MONTH * Number(gpuCount);
  }

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function bindCalculator(root) {
    const gpu = root.querySelector('#calc-gpu');
    const rate = root.querySelector('#calc-rate');
    const util = root.querySelector('#calc-util');
    const count = root.querySelector('#calc-count');
    if (!gpu || !rate || !util || !count) return;
    const gpuVal = root.querySelector('#calc-gpu-val');
    const rateVal = root.querySelector('#calc-rate-val');
    const utilVal = root.querySelector('#calc-util-val');
    const countVal = root.querySelector('#calc-count-val');
    const monthly = root.querySelector('#calc-monthly');
    const breakdown = root.querySelector('#calc-breakdown');

    function update(resetRate) {
      const key = gpu.value;
      const def = GPU_DEFAULTS[key] || { label: key, rate: 0.36 };
      if (resetRate) rate.value = def.rate;
      const r = Number(rate.value);
      const u = Number(util.value);
      const c = Number(count.value);
      if (gpuVal) gpuVal.textContent = def.label;
      if (rateVal) rateVal.textContent = '$' + r.toFixed(2) + '/hr';
      if (utilVal) utilVal.textContent = u + '%';
      if (countVal) countVal.textContent = c + (c === 1 ? ' GPU' : ' GPUs');
      if (monthly) monthly.textContent = money(monthlyEstimate(r, u, c));
      if (breakdown) {
        breakdown.textContent = '$' + r.toFixed(2) + '/hr × ' + u + '% utilization × ' +
          HOURS_PER_MONTH + ' hrs × ' + c + (c === 1 ? ' GPU' : ' GPUs');
      }
    }

    gpu.addEventListener('change', () => update(true));
    [rate, util, count].forEach((el) => el.addEventListener('input', () => update(false)));
    update(true);
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[data-live-catalog]').forEach((el) => {
        const apiUrl =
          typeof window !== 'undefined' && window.AorilaSite && window.AorilaSite.apiUrl
            ? window.AorilaSite.apiUrl('/compute/v1/gpus', window.location, document)
            : '/compute/v1/gpus';
        fetch(apiUrl)
          .then((r) => r.json())
          .then((data) => renderCatalog(el, data))
          .catch(() => failCatalog(el));
      });
      const calc = document.getElementById('earn-calc');
      if (calc) bindCalculator(calc);
    });
  }

  const api = {
    esc, shortName, artLabel, chipSvg, groupOffers, gpuCard, catalogHtml,
    emptyCatalogHtml, tierLabel, classLabel, monthlyEstimate, money,
    GPU_DEFAULTS, HOURS_PER_MONTH,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
