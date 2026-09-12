/** Commercial surface — Fluent-adjacent layout. Planned VMs live only here. */
const { consumerNav } = require('./consumer-nav');

const PAGES = {
  '': {
    title: 'Commercial',
    heading: 'Aorila for organizations',
    lede: 'Reserved machines, planned VMs, and volume terms. On-demand pods stay on the public catalog.',
  },
  vms: {
    title: 'Planned VMs',
    heading: 'Plan capacity before it lands',
    lede: 'Reserve upcoming GPU VMs. Not self-serve start/stop. Sales books the window; finance sees one Aorila invoice.',
  },
  reserved: {
    title: 'Reserved',
    heading: 'Hold GPUs on a schedule',
    lede: 'Commit hours or months. Price is live market plus the Aorila fee, locked at booking.',
  },
  terms: {
    title: 'Terms',
    heading: 'Commercial terms',
    lede: 'MSA, usage ledger, and support hours. Built for procurement, not a hobby key.',
  },
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rail(active) {
  const items = [
    ['', 'Overview'],
    ['vms', 'Planned VMs'],
    ['reserved', 'Reserved'],
    ['terms', 'Terms'],
  ];
  return `<nav class="ms-rail" aria-label="Commercial">
    ${items.map(([slug, label]) => {
      const href = slug ? `/commercial/${slug}` : '/commercial';
      const cur = slug === active ? ' aria-current="page"' : '';
      return `<a href="${href}"${cur}>${esc(label)}</a>`;
    }).join('')}
    <a href="/contact">Contact sales</a>
    <a href="/pricing">Live on-demand</a>
  </nav>`;
}

function vmsTable() {
  return `<div class="ms-table-wrap">
    <table class="ms-table">
      <thead><tr><th>Machine</th><th>Class</th><th>Window</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Aorila H100 80GB ×8</td><td>Training</td><td>30–90 days</td><td>Quote</td></tr>
        <tr><td>Aorila H100 80GB ×1</td><td>Fine-tune</td><td>14–60 days</td><td>Quote</td></tr>
        <tr><td>Aorila L40S ×4</td><td>Inference</td><td>14–60 days</td><td>Quote</td></tr>
        <tr><td>Aorila A100 80GB ×8</td><td>Training</td><td>30–90 days</td><td>Quote</td></tr>
      </tbody>
    </table>
    <p class="ms-note">Planned VMs are commercial-only. They do not appear as Start on the public pods page.</p>
  </div>`;
}

function renderCommercialPage(slug) {
  const key = slug || '';
  const page = PAGES[key];
  if (!page) return null;
  const path = key ? `/commercial/${key}` : '/commercial';
  let body = '';
  if (key === 'vms') {
    body = vmsTable() + `<p class="ms-note">Request a window through Contact sales. We place the box on Aorila capacity when the date hits.</p>`;
  } else if (key === '') {
    body = `<div class="ms-cards">
      <a class="ms-card" href="/commercial/vms"><h2>Planned VMs</h2><p>Book machines that are not live yet.</p></a>
      <a class="ms-card" href="/commercial/reserved"><h2>Reserved</h2><p>Lock hours on live SKUs.</p></a>
      <a class="ms-card" href="/pricing"><h2>Live on-demand</h2><p>Public catalog, Aorila price.</p></a>
      <a class="ms-card" href="/contact"><h2>Sales</h2><p>MSA and volume.</p></a>
    </div>`;
  } else if (key === 'reserved') {
    body = `<p class="ms-note">Reserved uses the same live SKUs as on-demand. Price is the live Aorila rate at booking.</p>
      <div id="live-prices" data-live-prices></div>`;
  } else {
    body = `<p class="ms-note">Procurement packet and MSA: email api@aorila.com or use Contact sales.</p>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(page.title)} — Aorila</title>
  <meta name="description" content="${esc(page.lede)}" />
  <link rel="canonical" href="https://aorila.com${esc(path)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body data-site="consumer" class="commercial">
  ${consumerNav({ commercialCurrent: true })}
  <div class="ms-shell">
    ${rail(key)}
    <main class="ms-main">
      <p class="ms-kicker">Commercial</p>
      <h1>${esc(page.heading)}</h1>
      <p class="lede">${esc(page.lede)}</p>
      ${body}
    </main>
  </div>
  <footer>
    <nav class="footer-links" aria-label="Legal">
      <a href="/tp">T &amp; P</a>
      <a href="/support">Support</a>
    </nav>
    <span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span>
  </footer>
  <script src="/site.js"></script>
  <script src="/price.js"></script>
</body>
</html>`;
}

module.exports = { renderCommercialPage, COMMERCIAL_SLUGS: Object.keys(PAGES) };
