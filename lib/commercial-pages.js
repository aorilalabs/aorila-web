/** Commercial surface — Fluent-adjacent layout. Planned VMs live only here. */
const { consumerNav } = require('./consumer-nav');

const PAGES = {
  '': { title: 'Capacity', heading: 'Plan capacity', lede: 'Reserved machines, planned VMs, and volume terms. File a request; finance sees one Aorila invoice.' },
  vms: { title: 'Planned VMs', heading: 'Plan capacity before it lands', lede: 'Reserve upcoming GPU VMs. File a window request; finance sees one Aorila invoice.' },
  reserved: { title: 'Reserved', heading: 'Hold GPUs on a schedule', lede: 'Commit hours or months. Price is live market plus the Aorila fee, locked at booking.' },
  terms: { title: 'Terms', heading: 'Capacity terms', lede: 'Usage ledger and support hours. Built for teams planning ahead.' },
};

function esc(s) {
  return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function rail(active) {
  const items = [['', 'Overview'], ['vms', 'Planned VMs'], ['reserved', 'Reserved'], ['terms', 'Terms'], ['console', 'Portal']];
  return `<nav class="chips" aria-label="Capacity" style="margin-bottom:26px">` + items.map(([slug, label]) => {
    const href = slug === 'console' ? '/commercial/console' : slug ? `/commercial/${slug}` : '/commercial';
    const cur = slug === active ? ' acid' : '';
    const ink = '#10100f';
    return `<a class="chip${cur}" style="text-decoration:none;color:${ink};padding:8px 14px" href="${href}"${cur ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
  }).join('') + `<a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/contact">Contact sales</a><a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/pricing">Live on-demand</a></nav>`;
}

function vmsTable() {
  return `<div class="table-wrap"><table class="dtable"><thead><tr><th>Machine</th><th>Class</th><th>Window</th><th>Status</th></tr></thead><tbody>
        <tr><td>Aorila H100 80GB ×8</td><td>Training</td><td>30–90 days</td><td>Request in portal</td></tr>
        <tr><td>Aorila H100 80GB ×1</td><td>Fine-tune</td><td>14–60 days</td><td>Request in portal</td></tr>
        <tr><td>Aorila L40S ×4</td><td>Inference</td><td>14–60 days</td><td>Request in portal</td></tr>
        <tr><td>Aorila A100 80GB ×8</td><td>Training</td><td>30–60 days</td><td>Request in portal</td></tr>
      </tbody></table></div>
    <p class="price-note">Planned VMs are commercial-only. They do not appear as Start on the public pods page.</p>
    <div class="btn-row"><a class="btn acid" href="/commercial/console">Open portal</a></div>`;
}

function renderCommercialPage(slug, { user } = {}) {
  const key = slug || '';
  const page = PAGES[key];
  if (!page) return null;
  const path = key ? `/commercial/${key}` : '/commercial';
  let body = '';
  if (key === 'vms') body = vmsTable() + `<p class="price-note">Sign in and file a window in the portal.</p>`;
  else if (key === '') body = `<div class="cards"><a class="card" href="/commercial/vms"><span class="tag">01</span><h3>Planned VMs</h3><p>Book machines that are not live yet.</p></a><a class="card" href="/commercial/reserved"><span class="tag">02</span><h3>Reserved</h3><p>Lock hours on live SKUs.</p></a><a class="card" href="/commercial/console"><span class="tag">03</span><h3>Portal</h3><p>File requests. See status.</p></a><a class="card" href="/console/billing"><span class="tag">04</span><h3>Billing</h3><p>Workspace credits and ledger.</p></a></div>`;
  else if (key === 'reserved') body = `<p class="price-note">Reserved uses the same live SKUs as on-demand.</p><div id="live-prices" data-live-prices></div><div class="btn-row"><a class="btn acid" href="/commercial/console">Book reserved hours</a></div>`;
  else body = `<p class="price-note">Procurement packet and MSA: email api@aorila.com or use Contact sales.</p>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(page.title)} — Aorila</title><meta name="description" content="${esc(page.lede)}" /><link rel="canonical" href="https://aorila.com${esc(path)}" /><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" /><link rel="stylesheet" href="/design.css" /></head>
<body class="ds" data-site="consumer">
  <div class="topline"></div>
  ${consumerNav({ commercialCurrent: true, accountUser: user })}
  <main>
    <section class="hero compact"><div class="wrap">
      <span class="hero-badge">Capacity</span>
      <h1>${esc(page.heading)}</h1>
      <p class="lede">${esc(page.lede)}</p>
    </div></section>
    <section class="section"><div class="wrap">
      ${rail(key)}
      ${body}
    </div></section>
    <div class="love-band"><div class="wrap"><h2>Trust and security is number one.</h2></div></div>
  </main>
  <footer class="site-footer"><div class="wrap"><nav class="footer-links" aria-label="Legal"><a href="/tp">T & P</a><a href="/support">Support</a><a href="/partner">Partners</a><a href="/contact">Contact</a><a href="https://api.aorila.com">Developer</a></nav><div class="footer-meta"><span>Aorila</span></div></div></footer>
  <script src="/site.js"></script><script src="/price.js"></script>
</body></html>`;
}

module.exports = { renderCommercialPage, COMMERCIAL_SLUGS: Object.keys(PAGES) };
