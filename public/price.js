/* Live GPU catalog — marketplace-style GPU cards in the Aorila brutalist system.
 * Marketing surfaces ([data-live-prices]) get one card per GPU model with a
 * "from" price; the console ([data-live-prices="offers"]) gets per-offer
 * cards with direct start links. Pure helpers are exported for node tests. */
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

  // Monochrome GPU chip illustration. Datacenter parts get the wide die.
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

  function catalogHtml(groups) {
    if (!groups.length) return '<p class="price-note">Live catalog is warming up.</p>';
    const filters =
      `<div class="gpu-filters" role="group" aria-label="Filter GPUs">` +
      `<span class="gpu-filters-label">Filter</span>` +
      `<button type="button" data-gf="all" class="on">All</button>` +
      `<button type="button" data-gf="datacenter">Datacenter</button>` +
      `<button type="button" data-gf="workstation">Workstation</button>` +
      `<button type="button" data-gf="consumer">Consumer</button></div>`;
    return filters + `<div class="gpu-grid">${groups.map(gpuCard).join('')}</div>` +
      `<p class="price-note">Aorila price includes the platform fee. Deploy signs you in first if needed, then starts the machine.</p>`;
  }

  function offerCard(o) {
    const price = Number(o.usdPerHour || 0).toFixed(3);
    const sku = encodeURIComponent(String(o.sku || o.name || ''));
    const offerId = encodeURIComponent(String(o.offerId || ''));
    const region = String(o.region || 'Global');
    const tier = tierLabel(o.tier);
    const href = '/console/start?sku=' + sku + (offerId ? '&offerId=' + offerId : '');
    return `<article class="offer-card"><div class="offer-card-top">${chipSvg(o)}` +
      `<div><p class="offer-gpu">${esc(shortName(o))}</p>` +
      `<p class="offer-meta">${esc(tier)} · ${esc(region)}${o.vramGb ? ' · ' + o.vramGb + 'GB' : ''}</p></div></div>` +
      `<p class="offer-price">$${price} <span>/ hr</span></p>` +
      `<a class="cta primary" href="${href}">Deploy</a></article>`;
  }

  function offersHtml(offers) {
    if (!offers.length) return '<p class="price-note">Live catalog is warming up.</p>';
    const sorted = offers.slice().sort((a, b) => Number(a.usdPerHour || 99) - Number(b.usdPerHour || 99));
    return `<div class="offer-grid">${sorted.slice(0, 24).map(offerCard).join('')}</div>` +
      `<p class="price-note">Aorila price includes the platform fee.</p>`;
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

  function render(el, data) {
    const offers = (data && data.offers) || [];
    if (el.getAttribute('data-live-prices') === 'offers') {
      el.innerHTML = offersHtml(offers);
    } else {
      el.innerHTML = catalogHtml(groupOffers(offers));
      bindFilters(el);
    }
    if (typeof window !== 'undefined' && window.AorilaSite && window.AorilaSite.rewriteDynamicAttrs) {
      window.AorilaSite.rewriteDynamicAttrs(el, window.location, document);
    }
  }

  function fail(el) {
    el.innerHTML = '<p class="price-note">Could not load live prices.</p>';
  }

  if (typeof document !== 'undefined') {
    const roots = document.querySelectorAll('[data-live-prices]');
    if (roots.length) {
      const apiUrl =
        typeof window !== 'undefined' && window.AorilaSite && window.AorilaSite.apiUrl
          ? window.AorilaSite.apiUrl('/compute/v1/gpus', window.location, document)
          : '/compute/v1/gpus';
      fetch(apiUrl)
        .then((r) => r.json())
        .then((data) => roots.forEach((el) => render(el, data)))
        .catch(() => roots.forEach(fail));
    }
  }

  const api = { esc, shortName, artLabel, chipSvg, groupOffers, gpuCard, catalogHtml, offerCard, offersHtml, tierLabel, classLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
