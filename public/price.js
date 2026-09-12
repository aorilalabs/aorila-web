(function () {
  const roots = document.querySelectorAll('[data-live-prices]');
  if (!roots.length) return;
  fetch('/compute/v1/gpus')
    .then((r) => r.json())
    .then((data) => {
      const offers = (data && data.offers) || [];
      const html = !offers.length
        ? '<p class="ms-note">Live catalog is warming up.</p>'
        : `<div class="table-wrap"><table class="sku-table"><thead><tr><th>GPU</th><th>Tier</th><th>Region</th><th>$ / hour</th></tr></thead><tbody>${offers
            .slice(0, 24)
            .map((o) => {
              const price = Number(o.usdPerHour || 0).toFixed(3);
              return `<tr><td>${o.name || o.sku}</td><td>${o.tier || ''}</td><td>${o.region || ''}</td><td>$${price}</td></tr>`;
            })
            .join('')}</tbody></table></div><p class="price-note">Aorila price includes the platform fee. Refreshed from live capacity.</p>`;
      roots.forEach((el) => {
        el.innerHTML = html;
      });
    })
    .catch(() => {
      roots.forEach((el) => {
        el.innerHTML = '<p class="ms-note">Could not load live prices.</p>';
      });
    });
})();
