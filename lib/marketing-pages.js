/** Marketing page catalog + HTML renderer for consumer routes. */

const { consumerNav } = require('./consumer-nav');

const FOOTER = `<footer class="site-footer">
    <div class="wrap">
      <nav class="footer-links" aria-label="Legal">
        <a href="/tp">T & P</a>
        <a href="/support">Support</a>
        <a href="https://api.aorila.com">Developer</a>
      </nav>
      <div class="footer-meta"><span>Aorila — to help people.</span><span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span></div>
    </div>
  </footer>`;

const LIVE_SLUGS = new Set(['pricing']);

const ATRALY_MODELS = [
  { name: 'Atraly v1', href: 'https://atraly.com', note: 'First Atraly generation' },
  { name: 'Atraly 1.5', href: 'https://atraly.com', note: 'Mid-cycle Atraly release' },
  { name: 'Atraly 2.0', href: 'https://atraly.com', note: 'Current Atraly generation' },
  { name: 'Aorila 5', href: 'https://atraly.com', note: 'Aorila model on Atraly' },
];

const PAGES = {
  models: { title: 'AI Models', badge: 'Product', heading: 'AI Models.', lede: 'Atraly and Aorila models live on atraly.com.' },
  pods: { title: 'Pods', badge: 'Product', heading: 'On-demand GPUs from live pools.', lede: 'Sign in to open the console and deploy.' },
  serverless: { title: 'Serverless', badge: 'Product', heading: 'Serverless GPU endpoints.', lede: 'Sign in to open the console and deploy.' },
  clusters: { title: 'Clusters', badge: 'Product', heading: 'Multi-node GPU clusters.', lede: 'Sign in to open the console and deploy.' },
  hub: { title: 'Hub', badge: 'Product', heading: 'Models and templates.', lede: 'Sign in to open the console and deploy.' },
  deployments: { title: 'Deployments / Models', badge: 'Product', heading: 'One control plane.', lede: 'Sign in to open the console and deploy.' },
  inference: { title: 'Inference', badge: 'Use Cases', heading: 'Real-time inference.', lede: 'Low-latency GPUs for serving.' },
  agents: { title: 'Agents', badge: 'Use Cases', heading: 'Agents that stay online.', lede: 'Run, react, and scale.' },
  'fine-tuning': { title: 'Fine-Tuning', badge: 'Use Cases', heading: 'Fine-tune faster.', lede: 'Scalable GPUs for training jobs.' },
  'compute-heavy': { title: 'Compute-Heavy Tasks', badge: 'Use Cases', heading: 'Heavy jobs.', lede: 'Batch, render, and long runs.' },
  'case-studies': { title: 'Case Studies', badge: 'Resources', heading: 'How teams ship.', lede: 'Production notes.' },
  articles: { title: 'Articles', badge: 'Resources', heading: 'Guides.', lede: 'Inference, agents, GPUs.' },
  press: { title: 'Press', badge: 'Resources', heading: 'Press.', lede: 'Media inquiries via Contact Sales.' },
  blog: { title: 'Blog', badge: 'Resources', heading: 'Notes.', lede: 'Product updates.' },
  about: { title: 'About', badge: 'Company', heading: 'The Future of AI Innovation.', lede: 'Capacity from many providers. One Aorila bill.' },
  providers: { title: 'Providers', badge: 'Company', heading: 'Put your GPUs to work.', lede: 'List verified capacity. Get paid for hours run.' },
  partner: { title: 'Partner', badge: 'Company', heading: 'Partner with Aorila.', lede: 'Data centers and channel partners.' },
  careers: { title: 'Careers', badge: 'Company', heading: 'Build with us.', lede: 'Reliable infrastructure, quiet product.' },
  pricing: { title: 'Pricing', badge: 'Pricing', heading: 'Live Aorila price.', lede: 'Compute cost plus the Aorila fee. Refreshed from live pools.' },
  enterprise: { title: 'Enterprise', badge: 'Enterprise', heading: 'Enterprise compute.', lede: 'Dedicated capacity and commercial terms.' },
  contact: { title: 'Contact Sales', badge: 'Sales', heading: 'Talk to sales.', lede: 'Commercial VMs, reserved hours, MSA.' },
  search: { title: 'Search', badge: 'Search', heading: 'Browse Aorila.', lede: 'Jump from the menu. Not a full-text index.' },
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function renderMarketingPage(slug, { query, user } = {}) {
  const page = PAGES[slug];
  if (!page) return null;
  const path = slug === 'search' ? '/search' : `/${slug}`;
  const title = `${page.title} — Aorila`;
  let lede = page.lede;
  let extra = '';
  let below = '';
  const live = `<div id="live-prices" data-live-prices data-start="1"></div>`;

  if (slug === 'contact') {
    extra = `<div class="btn-row"><a class="btn acid" href="/commercial">Commercial</a><a class="btn ink" href="mailto:api@aorila.com">api@aorila.com</a></div>`;
  } else if (slug === 'providers') {
    extra = `<div class="btn-row"><a class="btn acid" href="#apply">Apply to provide</a><a class="btn" href="/partner">Data center partners</a></div>`;
  } else if (slug === 'partner') {
    extra = `<div class="btn-row"><a class="btn acid" href="/providers">Provider application</a><a class="btn" href="/contact">Contact Sales</a></div>`;
  } else if (slug === 'search') {
    const q = query && query.q ? String(query.q).trim() : '';
    if (q) lede = `Looking for “${esc(q)}”. Browse the menu.`;
    extra = `<form class="search-form inline" action="/search" method="get" role="search"><label class="sr-only" for="page-search">Search</label><input id="page-search" name="q" type="search" value="${esc(q)}" placeholder="Search Aorila" /><button type="submit" class="btn acid small">Search</button></form>`;
  } else if (slug === 'models') {
    extra = `<div class="btn-row"><a class="btn acid" href="https://atraly.com">Open Atraly</a><a class="btn" href="https://api.aorila.com">Developer</a></div>`;
    below =
      '<section class="section"><div class="wrap"><div class="section-head"><span class="snum">MODELS</span><div><h2>Models on atraly.com</h2></div></div><div class="cards">' +
      ATRALY_MODELS.map(
        (m) =>
          `<a class="card" href="${esc(m.href)}"><span class="tag">${esc(m.note)}</span><h3>${esc(m.name)}</h3><p>atraly.com</p></a>`
      ).join('') +
      '</div></div></section>';
  } else if (LIVE_SLUGS.has(slug)) {
    extra = `<div class="btn-row"><a class="btn acid" href="/console">Open console</a><a class="btn" href="/signup?next=/console">Create account</a></div>`;
    below = `<section class="section alt"><div class="wrap"><div class="section-head"><span class="snum">LIVE</span><div><h2>Live catalog</h2><p class="lede">Pulled from real pools right now.</p></div></div><div id="live-prices" data-live-prices data-start="1"></div></div></section>`;
  } else if (slug === 'enterprise') {
    extra = `<div class="btn-row"><a class="btn acid" href="/commercial">Commercial</a><a class="btn" href="/contact">Contact Sales</a></div>`;
  } else {
    extra = `<div class="btn-row"><a class="btn acid" href="/console">Console</a><a class="btn" href="/docs">Docs</a></div>`;
  }

  if (slug === 'providers') {
    below = `<section class="section alt" id="apply"><div class="wrap"><div class="section-head"><span class="snum">APPLY</span><div><h2>Provider application</h2><p class="lede">List verified capacity. Get paid for hours run.</p></div></div>
      <form class="waitlist" action="/leads" method="post" data-kind="provider">
        <input type="hidden" name="site" value="consumer" /><input type="hidden" name="kind" value="provider" />
        <label class="hp" aria-hidden="true">Fax<input type="text" name="fax" tabindex="-1" autocomplete="off" /></label>
        <label>OPERATOR / COMPANY<input type="text" name="company" required /></label>
        <label>CONTACT NAME<input type="text" name="name" required /></label>
        <label>EMAIL<input type="email" name="email" required /></label>
        <label>HARDWARE<textarea name="use_case" rows="4" required></textarea></label>
        <label>CAPACITY NOTE<input type="text" name="volume" required /></label>
        <button class="btn acid" type="submit">Submit application</button>
        <p class="form-status" role="status"></p>
      </form></div></section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(page.lede)}" />
  <link rel="canonical" href="https://aorila.com${esc(path)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/design.css" />
</head>
<body class="ds" data-site="consumer">
  <div class="topline"></div>
  ${consumerNav({ accountUser: user })}
  <main>
    <section class="hero compact">
      <div class="wrap">
        <span class="hero-badge">${esc(page.badge)}</span>
        <h1>${esc(page.heading)}</h1>
        <p class="lede">${esc(lede)}</p>
        ${extra}
      </div>
    </section>
    ${below}
    <div class="love-band"><div class="wrap"><h2>The goal is to love.</h2></div></div>
  </main>
  ${FOOTER}
  <script src="/site.js"></script>
  <script src="/price.js"></script>
</body>
</html>`;
}

module.exports = { PAGES, MARKETING_SLUGS: Object.keys(PAGES), renderMarketingPage };
