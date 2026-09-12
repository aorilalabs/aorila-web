/** Commercial surface — Fluent-adjacent layout. Planned VMs live only here. */
const { consumerNav } = require('./consumer-nav');

const PAGES = {
  '': { title: 'Commercial', heading: 'Aorila for organizations', lede: 'Reserved machines, planned VMs, and volume terms. On-demand pods stay on the public catalog.' },
  vms: { title: 'Planned VMs', heading: 'Plan capacity before it lands', lede: 'Reserve upcoming GPU VMs. Not self-serve start/stop. Sales books the window; finance sees one Aorila invoice.' },
  reserved: { title: 'Reserved', heading: 'Hold GPUs on a schedule', lede: 'Commit hours or months. Price is live market plus the Aorila fee, locked at booking.' },
  terms: { title: 'Terms', heading: 'Commercial terms', lede: 'MSA, usage ledger, and support hours. Built for procurement, not a hobby key.' },
};

function esc(s) {
  return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function rail(active) {
  const items = [['', 'Overview'], ['vms', 'Planned VMs'], ['reserved', 'Reserved'], ['terms', 'Terms'], ['console', 'Portal']];
  return `<nav class="ms-rail" aria-label="Commercial">` + items.map(([slug, label]) => {
    const href = slug === 'console' ? '/commercial/console' : slug ? `/commercial/${slug}` : '/commercial';
    const cur = slug === active ? ' aria-current="page"' : '';
    return `<a href="${href}"${cur}>${esc(label)}</a>`;
  }).join('') + `<a href="/contact">Contact sales</a><a href="/pricing">Live on-demand</a></nav>`;
}

function vmsTable() {
  return `<div class="ms-table-wrap"><table class="ms-table"><thead><tr><th>Machine</th><th>Class</th><th>Window</th><th>Status</th></tr></thead><tbody>
        <tr><td>Aorila H100 80GB ×8</td><td>Training</td><td>30–90 days</td><td>Request in portal</td></tr>
        <tr><td>Aorila H100 80GB ×1</td><td>Fine-tune</td><td>14–60 days</td><td>Request in portal</td></tr>
        <tr><td>Aorila L40S ×4</td><td>Inference</td><td>14–60 days</td><td>Request in portal</td></tr>
        <tr><td>Aorila A100 80GB ×8</td><td>Training</td><td>30–90 days</td><td>Request in portal</td></tr>
      </tbody></table>
    <p class="ms-note">Planned VMs are commercial-only. They do not appear as Start on the public pods page.</p>
    <div class="cta-row"><a class="cta primary" href="/commercial/console">Open portal</a></div></div>`;
}

function renderCommercialPage(slug, { user } = {}) {
  const key = slug || '';
  const page = PAGES[key];
  if (!page) return null;
  const path = key ? `/commercial/${key}` : '/commercial';
  let body = '';
  if (key === 'vms') body = vmsTable() + `<p class="ms-note">Sign in and file a window in the portal.</p>`;
  else if (key === '') body = `<div class="ms-cards"><a class="ms-card" href="/commercial/vms"><h2>Planned VMs</h2><p>Book machines that are not live yet.</p></a><a class="ms-card" href="/commercial/reserved"><h2>Reserved</h2><p>Lock hours on live SKUs.</p></a><a class="ms-card" href="/commercial/console"><h2>Portal</h2><p>File requests. See status.</p></a><a class="ms-card" href="/console/billing"><h2>Billing</h2><p>Workspace credits and ledger.</p></a></div>`;
  else if (key === 'reserved') body = `<p class="ms-note">Reserved uses the same live SKUs as on-demand.</p><div id="live-prices" data-live-prices></div><div class="cta-row"><a class="cta primary" href="/commercial/console">Book reserved hours</a></div>`;
  else body = `<p class="ms-note">Procurement packet and MSA: email api@aorila.com or use Contact sales.</p>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(page.title)} — Aorila</title><meta name="description" content="${esc(page.lede)}" /><link rel="canonical" href="https://aorila.com${esc(path)}" /><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/styles.css" /></head>
<body data-site="consumer" class="commercial">
  ${consumerNav({ commercialCurrent: true, accountUser: user })}
  <div class="ms-shell">${rail(key)}<main class="ms-main"><p class="ms-kicker">Commercial</p><h1>${esc(page.heading)}</h1><p class="lede">${esc(page.lede)}</p>${body}</main></div>
  <footer><nav class="footer-links" aria-label="Legal"><a href="/tp">T & P</a><a href="/support">Support</a><a href="https://api.aorila.com">Developer</a></nav></footer>
  <script src="/site.js"></script><script src="/price.js"></script>
</body></html>`;
}

module.exports = { renderCommercialPage, COMMERCIAL_SLUGS: Object.keys(PAGES) };
