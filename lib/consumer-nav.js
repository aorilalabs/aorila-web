/** Shared consumer header: Ally visible; marketing menu in right sidebar. */

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

function chip(href, label, black, attrs) {
  const cls = black ? 'nav-commercial' : 'nav-link';
  return `<a class="${cls}" href="${esc(href)}"${attrs || ''}>${esc(label)}</a>`;
}

function consumerNav(opts = {}) {
  const wordmarkHref = opts.wordmarkHref || '/';
  const onCommercial = Boolean(opts.commercialCurrent);
  const onAlly = Boolean(opts.allyCurrent);

  const product = dropdown('Product', [
    { href: '/models', title: 'AI Models', desc: 'Models you can deploy on Aorila GPUs' },
    { href: '/pods', title: 'Pods', desc: 'On-demand GPUs, deployed across 31 global regions' },
    { href: '/serverless', title: 'Serverless', desc: 'Run API-based AI workloads with serverless GPU endpoints' },
    { href: '/clusters', title: 'Clusters', desc: 'Run multi-node GPU clusters for distributed AI workloads' },
    { href: '/hub', title: 'Hub', desc: 'Deploy open-source AI models and templates on Aorila' },
    {
      href: '/deployments',
      title: 'Deployments / Models',
      desc: 'Manage your or our compute from one unified control plane (Hybrid Cloud)',
    },
  ]);

  const useCases = dropdown('Use Cases', [
    { href: '/inference', title: 'Inference', desc: 'Serve models in real-time with low-latency GPUs' },
    { href: '/agents', title: 'Agents', desc: 'Deploy AI agents that run, react, and scale instantly' },
    { href: '/fine-tuning', title: 'Fine-Tuning', desc: 'Train models faster with efficient, scalable compute' },
    {
      href: '/compute-heavy',
      title: 'Compute-Heavy Tasks',
      desc: 'Process massive workloads with zero bottlenecks',
    },
  ]);

  const resources = dropdown('Resources', [
    { href: '/case-studies', title: 'Case Studies' },
    { href: '/articles', title: 'Articles' },
    { href: '/press', title: 'Press' },
    { href: '/blog', title: 'Blog' },
  ]);

  const company = dropdown('Company', [
    { href: '/about', title: 'About' },
    { href: '/providers', title: 'Providers', desc: 'List GPUs on the Aorila network' },
    { href: '/partner', title: 'Partner', desc: 'Data centers and go-to-market partners' },
    { href: '/careers', title: 'Careers' },
  ]);

  const aorilaAttrs = wordmarkHref === 'https://aorila.com' ? ' data-local-site="consumer"' : '';

  return `<header class="nav">
    ${chip(wordmarkHref, 'Aorila', onCommercial, aorilaAttrs)}
    ${chip('/commercial', 'Commercial', !onCommercial)}
    <nav class="nav-links nav-utility" aria-label="Aorila products">
      ${chip('https://ally.atraly.com', 'Ally', !onAlly)}
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
      ${product}
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
