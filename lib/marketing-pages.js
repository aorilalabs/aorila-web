/** Marketing page catalog + HTML renderer for consumer routes. */

const { consumerNav } = require('./consumer-nav');

const FOOTER = `<footer>
    <nav class="footer-links" aria-label="Legal">
      <a href="/tp">T & P</a>
      <a href="/support">Support</a>
    </nav>
    <span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span>
  </footer>`;

const PAGES = {
  pods: { title: 'Pods', badge: 'Product', heading: 'On-demand GPUs, live Aorila price.', lede: 'Prices below are live from Aorila capacity. Start/stop is the compute control plane.' },
  serverless: { title: 'Serverless', badge: 'Product', heading: 'Serverless GPU endpoints.', lede: 'API workloads without managing the box.' },
  clusters: { title: 'Clusters', badge: 'Commercial', heading: 'Planned multi-node VMs.', lede: 'Clusters are commercial-only planned VMs.' },
  hub: { title: 'Hub', badge: 'Product', heading: 'Models and templates.', lede: 'Deploy open-source stacks on Aorila.' },
  deployments: { title: 'Deployments / Models', badge: 'Product', heading: 'One control plane.', lede: 'Your hardware or ours.' },
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
  return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function renderMarketingPage(slug, { query } = {}) {
  const page = PAGES[slug];
  if (!page) return null;
  const path = slug === 'search' ? '/search' : `/${slug}`;
  const title = `${page.title} — Aorila`;
  let lede = page.lede;
  let extra = '';
  let below = '';
  const live = `<div id="live-prices" data-live-prices></div>`;

  if (slug === 'contact') {
    extra = `<div class="cta-row"><a class="cta primary" href="https://aorilalabs.com" data-local-site="labs">Contact Labs</a><a class="cta ghost" href="mailto:api@aorila.com">api@aorila.com</a></div>`;
  } else if (slug === 'providers') {
    extra = `<div class="cta-row"><a class="cta primary" href="#apply">Apply to provide</a><a class="cta ghost" href="/partner">Data center partners</a></div>`;
  } else if (slug === 'partner') {
    extra = `<div class="cta-row"><a class="cta primary" href="/providers">Provider application</a><a class="cta ghost" href="/contact">Contact Sales</a></div>`;
  } else if (slug === 'search') {
    const q = query && query.q ? String(query.q).trim() : '';
    if (q) lede = `Looking for “${q}”. Browse the menu.`;
    extra = `<form class="search-form inline" action="/search" method="get" role="search"><label class="sr-only" for="page-search">Search</label><input id="page-search" name="q" type="search" value="${esc(q)}" placeholder="Search Aorila" /><button type="submit" class="cta primary">Search</button></form>`;
  } else if (slug === 'pricing' || slug === 'pods') {
    extra = `<div class="cta-row"><a class="cta primary" href="/commercial">Commercial</a><a class="cta ghost" href="/contact">Contact Sales</a></div>`;
    below = `<section class="section undivided"><h2>Live catalog</h2>${live}</section>`;
  } else if (slug === 'enterprise') {
    extra = `<div class="cta-row"><a class="cta primary" href="/commercial">Commercial</a><a class="cta ghost" href="/contact">Contact Sales</a></div>`;
  } else {
    extra = `<div class="cta-row"><a class="cta primary" href="/pods">Live pods</a><a class="cta ghost" href="/docs">Docs</a></div>`;
  }

  if (slug === 'providers') {
    below = `<section class="section labs-request" id="apply"><h2>Provider application</h2>
      <form class="waitlist" action="/leads" method="post" data-kind="provider">
        <input type="hidden" name="site" value="consumer" /><input type="hidden" name="kind" value="provider" />
        <label class="hp" aria-hidden="true">Fax<input type="text" name="fax" tabindex="-1" autocomplete="off" /></label>
        <label>Operator / company<input type="text" name="company" required /></label>
        <label>Contact name<input type="text" name="name" required /></label>
        <label>Email<input type="email" name="email" required /></label>
        <label>Hardware<textarea name="use_case" rows="4" required></textarea></label>
        <label>Capacity note<input type="text" name="volume" required /></label>
        <button class="cta primary" type="submit">Submit application</button>
        <p class="form-status" role="status"></p>
      </form></section>`;
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body data-site="consumer">
  ${consumerNav()}
  <main>
    <section class="hero compact">
      <p class="hero-badge">${esc(page.badge)}</p>
      <h1>${esc(page.heading)}</h1>
      <p class="lede">${esc(lede)}</p>
      ${extra}
    </section>
    ${below}
  </main>
  ${FOOTER}
  <script src="/site.js"></script>
  <script src="/price.js"></script>
</body>
</html>`;
}

module.exports = { PAGES, MARKETING_SLUGS: Object.keys(PAGES), renderMarketingPage };
