/** Shared consumer header: Commercial tab beside wordmark. */

function esc(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function dropdown(label, items) {
  const links = items
    .map(
      ({ href, title, desc }) =>
        `<a class="menu-item" href="${esc(href)}"><span class="menu-item-title">${esc(title)}</span>` +
        (desc ? `<span class="menu-item-desc">${esc(desc)}</span>` : '') +
        `</a>`
    )
    .join('');
  return `<div class="nav-dropdown">
      <button type="button" class="nav-link nav-dropdown-toggle" aria-expanded="false">${esc(label)}</button>
      <div class="nav-dropdown-panel" role="group" aria-label="${esc(label)}">${links}</div>
    </div>`;
}

function consumerNav(opts = {}) {
  const wordmarkHref = opts.wordmarkHref || '/';
  const apiCurrent = opts.apiCurrent ? ' aria-current="page"' : '';
  const commercialCurrent = opts.commercialCurrent ? ' aria-current="page"' : '';

  const product = dropdown('Product', [
    {
      href: 'https://api.aorila.com',
      title: 'APIs',
      desc: 'AI API — not GPU rental',
    },
    { href: '/pods', title: 'Pods', desc: 'On-demand GPUs, live Aorila price' },
    { href: '/serverless', title: 'Serverless', desc: 'GPU endpoints' },
    { href: '/commercial/vms', title: 'Planned VMs', desc: 'Commercial only' },
    { href: '/hub', title: 'Hub', desc: 'Models and templates' },
    {
      href: '/deployments',
      title: 'Deployments / Models',
      desc: 'One control plane',
    },
  ]);
  const productNav = apiCurrent
    ? product.replace(
        'href="https://api.aorila.com"',
        `href="https://api.aorila.com"${apiCurrent}`
      )
    : product;

  const useCases = dropdown('Use Cases', [
    { href: '/inference', title: 'Inference', desc: 'Serve models in real-time' },
    { href: '/agents', title: 'Agents', desc: 'Agents that stay online' },
    { href: '/fine-tuning', title: 'Fine-Tuning', desc: 'Train on scalable GPUs' },
    { href: '/compute-heavy', title: 'Compute-Heavy Tasks', desc: 'Batch and heavy jobs' },
  ]);

  const resources = dropdown('Resources', [
    { href: '/case-studies', title: 'Case Studies' },
    { href: '/articles', title: 'Articles' },
    { href: '/press', title: 'Press' },
    { href: '/blog', title: 'Blog' },
  ]);

  const company = dropdown('Company', [
    { href: '/about', title: 'About' },
    { href: '/providers', title: 'Providers', desc: 'List GPUs' },
    { href: '/partner', title: 'Partner', desc: 'Data centers' },
    { href: '/careers', title: 'Careers' },
  ]);

  return `<header class="nav">
    <a class="wordmark" href="${esc(wordmarkHref)}"${wordmarkHref === 'https://aorila.com' ? ' data-local-site="consumer"' : ''}>Aorila</a>
    <a class="nav-commercial" href="/commercial"${commercialCurrent}>Commercial</a>
    <nav class="nav-links nav-utility" aria-label="Aorila products">
      <a class="nav-link" href="https://ally.atraly.com">Ally</a>
      <a class="nav-link" href="https://aorilalabs.com" data-local-site="labs">Labs</a>
    </nav>
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
      <span class="nav-toggle-bars" aria-hidden="true"></span>
    </button>
  </header>
  <div class="nav-backdrop" hidden data-nav-backdrop></div>
  <aside class="nav-sidebar" id="site-nav" hidden aria-label="Site menu">
    <div class="nav-sidebar-head">
      <button type="button" class="nav-sidebar-close" data-nav-close aria-label="Close menu">Close</button>
    </div>
    <nav class="nav-primary" aria-label="Primary">
      ${productNav}
      ${useCases}
      ${resources}
      ${company}
      <a class="nav-link" href="/docs">Docs</a>
      <a class="nav-link" href="/pricing">Pricing</a>
      <a class="nav-link" href="/enterprise">Enterprise</a>
    </nav>
    <nav class="nav-actions" aria-label="Account">
      <button type="button" class="nav-link nav-search-btn" data-search-open aria-haspopup="dialog">Search</button>
      <a class="nav-link" href="/contact">Contact Sales</a>
      <a class="nav-link" href="https://api.aorila.com">API access</a>
      <a class="nav-cta" href="https://api.aorila.com">Get API access</a>
    </nav>
  </aside>
  <div class="search-overlay" hidden data-search-overlay>
    <div class="search-dialog" role="dialog" aria-modal="true" aria-label="Search">
      <form class="search-form" action="/search" method="get" role="search">
        <label class="sr-only" for="site-search">Search Aorila</label>
        <input id="site-search" name="q" type="search" placeholder="Search products, docs, and more" autocomplete="off" />
        <button type="submit" class="cta primary">Search</button>
        <button type="button" class="cta ghost" data-search-close>Close</button>
      </form>
    </div>
  </div>`;
}

const NAV_RE = /<header class="nav">[\s\S]*?<\/header>/;

function injectConsumerNav(html, opts) {
  if (!NAV_RE.test(html)) return html;
  return html.replace(NAV_RE, consumerNav(opts));
}

module.exports = { consumerNav, injectConsumerNav };
