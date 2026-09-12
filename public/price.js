(function () {
  const roots = document.querySelectorAll('[data-live-prices]');
  if (!roots.length) return;
  fetch('/compute/v1/gpus')
    .then((r) => r.json())
    .then((data) => {
      const offers = (data && data.offers) || [];
      const html = !offers.length
        ? '<p class="price-note">Live catalog is warming up.</p>'
        : `<div class="offer-grid">${offers
            .slice(0, 24)
            .map((o) => {
              const price = Number(o.usdPerHour || 0).toFixed(3);
              const sku = encodeURIComponent(String(o.sku || o.name || ''));
              const name = String(o.name || o.sku || 'GPU');
              const region = String(o.region || 'Global');
              const tier = String(o.tier || 'on-demand');
              const href = '/console/start?sku=' + sku;
              return `<article class="offer-card">
                <p class="offer-gpu">${name}</p>
                <p class="offer-meta">${tier} · ${region}</p>
                <p class="offer-price">$${price} <span>/ hr</span></p>
                <a class="cta primary" href="${href}">Deploy</a>
              </article>`;
            })
            .join('')}</div><p class="price-note">Aorila price includes the platform fee. Deploy signs you in first if needed, then starts the machine.</p>`;
      roots.forEach((el) => {
        el.innerHTML = html;
      });
    })
    .catch(() => {
      roots.forEach((el) => {
        el.innerHTML = '<p class="price-note">Could not load live prices.</p>';
      });
    });
})();
