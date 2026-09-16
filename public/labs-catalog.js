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
      `<a class="btn acid gpu-deploy" href="https://dashboard.aorilalabs.com/compute">Deploy</a>` +
      `</article>`;
  }

  function emptyCatalogHtml() {
    return '<div class="soon-box"><h3>No hosts online yet</h3>' +
      '<p>The catalog opens as hosts list their GPUs. Partner capacity appears here only after agreements are signed — never before.</p>' +
      '<div class="btn-row"><a class="btn acid" href="https://dashboard.aorilalabs.com/earn">Apply to host</a></div></div>';
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

  // Default list prices: observed community-marketplace medians/ranges.
  // GPU: 4090 median ~$0.36/hr (range $0.15–$0.59); full listable range from the
  // GTX 1660 Super (~$0.03) up through datacenter parts; CPU/storage from the same market data.
  var HOURS_PER_MONTH = 730;

  // Customer-facing price guard: host cost + our markup can never exceed
  // this per hour. Simple clamp, not a rule engine.
  var PRICE_CAP = 50;
  var PLATFORM_MARKUP = 0.05; // our cut: 5% on top of the host price

  var RESOURCES = {
    gpu: {
      modelLabel: 'GPU MODEL',
      models: {
        'gtx-1660s': { label: 'GTX 1660 Super', sub: '6GB', rate: 0.03 },
        'rtx-2060':  { label: 'RTX 2060', sub: '6GB', rate: 0.05 },
        'rtx-3060':  { label: 'RTX 3060', sub: '12GB', rate: 0.08 },
        'rtx-4060':  { label: 'RTX 4060', sub: '8GB', rate: 0.08 },
        'rtx-3070':  { label: 'RTX 3070', sub: '8GB', rate: 0.11 },
        'rtx-4070':  { label: 'RTX 4070', sub: '12GB', rate: 0.13 },
        'rtx-3080':  { label: 'RTX 3080', sub: '10GB', rate: 0.16 },
        'rtx-3090':  { label: 'RTX 3090', sub: '24GB', rate: 0.16 },
        'rtx-4090':  { label: 'RTX 4090', sub: '24GB', rate: 0.36 },
        'rtx-5090':  { label: 'RTX 5090', sub: '32GB', rate: 0.46 },
        'l40s':      { label: 'L40S', sub: '48GB', rate: 0.31 },
        'a100-80':   { label: 'A100', sub: '80GB', rate: 0.67 },
        'h100-80':   { label: 'H100', sub: '80GB', rate: 1.55 },
      },
      defaultModel: 'rtx-4090',
      rate: { label: 'YOUR PRICE · $/HR', min: 0.01, max: 50, step: 0.01, fmt: (r) => '$' + r.toFixed(2) + '/hr' },
      count: { label: 'GPU COUNT', min: 1, max: 16, step: 1, unit: ['GPU', 'GPUs'] },
      monthly: (r, u, c) => r * (u / 100) * HOURS_PER_MONTH * c,
      breakdown: (r, u, c, unit) => '$' + r.toFixed(2) + '/hr × ' + u + '% utilization × ' + HOURS_PER_MONTH + ' hrs × ' + c + ' ' + unit,
    },
    cpu: {
      modelLabel: 'INSTANCE SIZE',
      models: {
        'cpu-4':  { label: '4 vCPU', sub: '16GB RAM', rate: 0.024 },
        'cpu-8':  { label: '8 vCPU', sub: '32GB RAM', rate: 0.05 },
        'cpu-16': { label: '16 vCPU', sub: '64GB RAM', rate: 0.10 },
        'cpu-32': { label: '32 vCPU', sub: '128GB RAM', rate: 0.20 },
        'cpu-64': { label: '64 vCPU', sub: '256GB RAM', rate: 0.40 },
      },
      defaultModel: 'cpu-16',
      rate: { label: 'YOUR PRICE · $/HR', min: 0.01, max: 50, step: 0.01, fmt: (r) => '$' + r.toFixed(2) + '/hr' },
      count: { label: 'INSTANCE COUNT', min: 1, max: 32, step: 1, unit: ['instance', 'instances'] },
      monthly: (r, u, c) => r * (u / 100) * HOURS_PER_MONTH * c,
      breakdown: (r, u, c, unit) => '$' + r.toFixed(2) + '/hr × ' + u + '% utilization × ' + HOURS_PER_MONTH + ' hrs × ' + c + ' ' + unit,
    },
    storage: {
      modelLabel: 'VOLUME TYPE',
      models: {
        'vol-net':  { label: 'Network volume', sub: 'replicated', rate: 0.05 },
        'vol-nvme': { label: 'NVMe volume', sub: 'local SSD', rate: 0.10 },
      },
      defaultModel: 'vol-net',
      rate: { label: 'YOUR PRICE · $/GB/MO', min: 0.01, max: 0.25, step: 0.005, fmt: (r) => '$' + String(Number(r.toFixed(3))) + '/GB/mo' },
      count: { label: 'CAPACITY', min: 100, max: 10000, step: 100, unit: ['GB', 'GB'] },
      monthly: (r, u, c) => r * (u / 100) * c,
      breakdown: (r, u, c) => '$' + String(Number(r.toFixed(3))) + '/GB/mo × ' + Number(c).toLocaleString('en-US') + ' GB × ' + u + '% utilized',
    },
  };

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /* The price slider spans $0.01-$50, three orders of magnitude, so it runs
     on a log scale: slider position 0-1000 maps to price exponentially.
     The middle of the track is the geometric mean ($0.71), a real mid-range
     price, instead of $25 on a linear scale. */
  var RATE_POS_MAX = 1000;
  function logPrice(cfg, pos) {
    const lo = cfg.rate.min, hi = cfg.rate.max;
    return lo * Math.pow(hi / lo, Number(pos) / RATE_POS_MAX);
  }
  function pricePos(cfg, price) {
    const lo = cfg.rate.min, hi = cfg.rate.max;
    const p = Math.min(hi, Math.max(lo, Number(price)));
    return Math.round(RATE_POS_MAX * Math.log(p / lo) / Math.log(hi / lo));
  }


  function bindCalculator(root) {
    const tabs = Array.from(root.querySelectorAll('.calc-tab'));
    const modelLabel = root.querySelector('#calc-model-label');
    const model = root.querySelector('#calc-model');
    const rate = root.querySelector('#calc-rate');
    const rateLabel = root.querySelector('#calc-rate-label');
    const util = root.querySelector('#calc-util');
    const count = root.querySelector('#calc-count');
    const countLabel = root.querySelector('#calc-count-label');
    if (!model || !rate || !util || !count || !tabs.length) return;
    const modelVal = root.querySelector('#calc-model-val');
    const rateVal = root.querySelector('#calc-rate-val');
    const utilVal = root.querySelector('#calc-util-val');
    const countVal = root.querySelector('#calc-count-val');
    const monthly = root.querySelector('#calc-monthly');
    const breakdown = root.querySelector('#calc-breakdown');
    let resource = 'gpu';

    function setResource(key) {
      resource = key;
      const cfg = RESOURCES[key];
      tabs.forEach((t) => {
        const on = t.dataset.resource === key;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (modelLabel) modelLabel.textContent = cfg.modelLabel;
      model.innerHTML = '';
      Object.keys(cfg.models).forEach((k) => {
        const m = cfg.models[k];
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = m.label + ' · ' + m.sub;
        model.appendChild(opt);
      });
      model.value = cfg.defaultModel;
      if (rateLabel) rateLabel.textContent = cfg.rate.label;
      rate.min = 0; rate.max = RATE_POS_MAX; rate.step = 1;
      if (countLabel) countLabel.textContent = cfg.count.label;
      count.min = cfg.count.min; count.max = cfg.count.max; count.step = cfg.count.step;
      count.value = cfg.count.min;
      update(true);
    }

    function update(resetRate) {
      const cfg = RESOURCES[resource];
      const def = cfg.models[model.value] || { label: model.value, rate: cfg.rate.min };
      if (resetRate) rate.value = pricePos(cfg, def.rate);
      const hostRate = logPrice(cfg, rate.value);
      rate.setAttribute('aria-valuetext', cfg.rate.fmt(hostRate));
      const custRate = Math.min(hostRate * (1 + PLATFORM_MARKUP), PRICE_CAP);
      const u = Number(util.value);
      const c = Number(count.value);
      const unit = c === 1 ? cfg.count.unit[0] : cfg.count.unit[1];
      if (modelVal) modelVal.textContent = def.label;
      if (rateVal) rateVal.textContent = cfg.rate.fmt(hostRate);
      if (utilVal) utilVal.textContent = u + '%';
      if (countVal) countVal.textContent = Number(c).toLocaleString('en-US') + ' ' + unit;
      if (monthly) monthly.textContent = money(cfg.monthly(hostRate, u, c));
      if (breakdown) breakdown.textContent = cfg.breakdown(hostRate, u, c, unit) + ' · customer pays ' + cfg.rate.fmt(custRate);
    }

    tabs.forEach((t) => t.addEventListener('click', () => setResource(t.dataset.resource)));
    model.addEventListener('change', () => update(true));
    [rate, util, count].forEach((el) => el.addEventListener('input', () => update(false)));
    setResource('gpu');
    rate.value = Math.round(RATE_POS_MAX / 2);
    update(false);
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
    emptyCatalogHtml, tierLabel, classLabel, money,
    RESOURCES, HOURS_PER_MONTH,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
