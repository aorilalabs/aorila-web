(function () {
  const roots = document.querySelectorAll('[data-live-prices]');
  if (!roots.length) return;
  const canStart = Array.from(roots).some((el) => el.getAttribute('data-start') === '1');
  fetch('/compute/v1/gpus')
    .then((r) => r.json())
    .then((data) => {
      const offers = (data && data.offers) || [];
      const html = !offers.length
        ? '<p class="ms-note">Live catalog is warming up.</p>'
        : `<div class="table-wrap"><table class="sku-table"><thead><tr><th>GPU</th><th>Tier</th><th>Region</th><th>$ / hour</th>${canStart ? '<th></th>' : ''}</tr></thead><tbody>${offers
            .slice(0, 24)
            .map((o) => {
              const price = Number(o.usdPerHour || 0).toFixed(3);
              const sku = String(o.sku || o.name || '').replace(/"/g, '&quot;');
              const region = String(o.region || '').replace(/"/g, '&quot;');
              const start = canStart
                ? `<td><form method="post" action="/console/start"><input type="hidden" name="sku" value="${sku}" /><input type="hidden" name="usdPerHour" value="${price}" /><input type="hidden" name="region" value="${region}" /><button class="cta primary" type="submit">Start</button></form></td>`
                : '';
              return `<tr><td>${o.name || o.sku}</td><td>${o.tier || ''}</td><td>${o.region || ''}</td><td>$${price}</td>${start}</tr>`;
            })
            .join('')}</tbody></table></div><p class="price-note">Aorila price includes the platform fee. Start opens the console if you are not signed in.</p>`;
      roots.forEach((el) => { el.innerHTML = html; });
    })
    .catch(() => {
      roots.forEach((el) => { el.innerHTML = '<p class="ms-note">Could not load live prices.</p>'; });
    });
})();
