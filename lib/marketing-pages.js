/** Marketing page catalog + HTML renderer for consumer routes. */

const { consumerNav } = require('./consumer-nav');

const FOOTER = `<footer class="site-footer">
    <div class="wrap">
      <nav class="footer-links" aria-label="Legal">
        <a href="/tp">T & P</a>
        <a href="/support">Support</a>
        <a href="/partner">Partners</a>
        <a href="/contact">Contact</a>
        <a href="https://aorila.com/api">Developer</a>
      </nav>
      <div class="footer-meta"><span>Aorila</span><span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span></div>
    </div>
  </footer>`;

const LIVE_SLUGS = new Set(['pricing']);
const COMPUTE_SLUGS = new Set(['pods', 'serverless', 'clusters', 'hub', 'deployments']);

const ATRALY_MODELS = [
  { name: 'Atraly 1.0', href: 'https://atraly.com', note: 'First Atraly generation' },
  { name: 'Atraly 1.5', href: 'https://atraly.com', note: 'Mid-cycle Atraly release' },
  { name: 'Atraly 2.0', href: 'https://atraly.com', note: 'Current Atraly generation' },
  { name: 'Aorila 5', href: 'https://atraly.com', note: 'Aorila model, exclusive to the Atraly composer' },
];

const PAGES = {
  'ai-api': { title: 'AI API', badge: 'Product', heading: 'AI API.', lede: 'Chat, voice, and agents on atraly.com — Atraly and Aorila models behind one API.' },
  pods: { title: 'Pods', badge: 'Product', heading: 'On-demand GPUs from live pools.', lede: 'Single-GPU machines from verified partner pools. Per-minute billing, one Aorila bill — workloads stop at $0.' },
  serverless: { title: 'Serverless', badge: 'Product', heading: 'Serverless GPU endpoints.', lede: 'Endpoints that scale to zero. Pay only for the time your code runs.' },
  clusters: { title: 'Clusters', badge: 'Product', heading: 'Multi-node GPU clusters.', lede: 'Distributed training and inference across many nodes, from one control plane.' },
  hub: { title: 'Hub', badge: 'Product', heading: 'Models and templates.', lede: 'One-click templates for open-source models. Deploy to pods in minutes.' },
  deployments: { title: 'Deployments', badge: 'Product', heading: 'One control plane.', lede: 'Every workload — pods, serverless, clusters — managed from a single dashboard.' },
  inference: { title: 'Inference', badge: 'Use Cases', heading: 'Real-time inference.', lede: 'Serve models on low-latency GPUs from live pools. Per-minute billing.' },
  agents: { title: 'Agents', badge: 'Use Cases', heading: 'Agents that stay online.', lede: 'Deploy agents that run, react, and scale — on pods or serverless.' },
  'fine-tuning': { title: 'Fine-Tuning', badge: 'Use Cases', heading: 'Fine-tune faster.', lede: 'Multi-GPU clusters for training jobs. Per-minute billing, stop anytime.' },
  'compute-heavy': { title: 'Compute-Heavy Tasks', badge: 'Use Cases', heading: 'Heavy jobs.', lede: 'Batch, render, and long runs on on-demand GPUs.' },
  'case-studies': { title: 'Case Studies', badge: 'Resources', heading: 'Case studies.', lede: "We're early — customer stories coming soon." },
  articles: { title: 'Articles', badge: 'Resources', heading: 'Guides.', lede: 'How Aorila works, written plainly.' },
  press: { title: 'Press', badge: 'Resources', heading: 'Press.', lede: 'Media inquiries via Contact Sales.' },
  blog: { title: 'Blog', badge: 'Resources', heading: 'Notes.', lede: 'Product updates, as they ship.' },
  about: { title: 'About', badge: 'Company', heading: 'Aorila is the parent company.', lede: 'Compute, AI platform, and personal AI — built, run, and hosted with trust and security as the first requirement. Founded by Nicholas Baldwin and Jordan Baldwin in Columbia, South Carolina.' },
  providers: { title: 'Become a provider', badge: 'Company', heading: 'Put your GPUs to work.', lede: 'List verified capacity. Get paid for hours run.' },
  partner: { title: 'Partner', badge: 'Company', heading: 'Partner with Aorila.', lede: 'Data centers and channel partners.' },
  careers: { title: 'Careers', badge: 'Company', heading: 'Careers.', lede: "No open roles right now. We're a small team — check back." },
  pricing: { title: 'Pricing', badge: 'Pricing', heading: 'Early-access GPU pricing.', lede: 'One $/hour number per GPU, billed per minute. 1 credit = $1, and workloads stop at $0. The catalog opens as hosts onboard.' },
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
    extra = `<div class="btn-row"><a class="btn acid" href="/commercial">Capacity</a><a class="btn ink" href="mailto:api@aorila.com">api@aorila.com</a><a class="btn" href="mailto:info@aorila.com">info@aorila.com</a></div>`;
    below = `<section class="section"><div class="wrap"><div class="section-head"><span class="snum">MESSAGE</span><div><h2>Send a message.</h2><p class="lede">Sales, partnerships, press — we reply by email.</p></div></div>
      <form class="waitlist" action="/leads" method="post" data-kind="contact">
        <input type="hidden" name="site" value="consumer" /><input type="hidden" name="kind" value="contact" />
        <label class="hp" aria-hidden="true">Fax<input type="text" name="fax" tabindex="-1" autocomplete="off" /></label>
        <label>NAME<input type="text" name="name" required autocomplete="name" /></label>
        <label>EMAIL<input type="email" name="email" required autocomplete="email" /></label>
        <label>COMPANY<input type="text" name="company" autocomplete="organization" /></label>
        <label>MESSAGE<textarea name="message" rows="4" required></textarea></label>
        <button class="btn acid" type="submit">Send message</button>
        <p class="form-status" role="status"></p>
      </form></div></section>`;
  } else if (slug === 'providers') {
    extra = `<div class="btn-row"><a class="btn acid" href="?section=apply" data-scroll-to="apply">Apply to provide</a><a class="btn" href="/partner">Data center partners</a></div>`;
  } else if (slug === 'partner') {
    extra = `<div class="btn-row"><a class="btn acid" href="/providers">Provider application</a><a class="btn" href="/contact">Contact Sales</a></div>`;
  } else if (slug === 'search') {
    const q = query && query.q ? String(query.q).trim() : '';
    if (q) lede = `Looking for “${esc(q)}”. Browse the menu.`;
    extra = `<form class="search-form inline" action="/search" method="get" role="search"><label class="sr-only" for="page-search">Search</label><input id="page-search" name="q" type="search" value="${esc(q)}" placeholder="Search Aorila" /><button type="submit" class="btn acid small">Search</button></form>`;
  } else if (slug === 'ai-api') {
    extra = `<div class="btn-row"><a class="btn acid" href="https://atraly.com">Open Atraly</a><a class="btn" href="https://aorila.com/api">Developer</a></div>`;
    below =
      '<section class="section"><div class="wrap"><div class="section-head"><span class="snum">MODELS</span><div><h2>Models on atraly.com</h2></div></div><div class="cards">' +
      ATRALY_MODELS.map(
        (m) =>
          `<a class="card" href="${esc(m.href)}"><span class="tag">${esc(m.note)}</span><h3>${esc(m.name)}</h3><p>atraly.com</p></a>`
      ).join('') +
      '</div></div></section>';
  } else if (COMPUTE_SLUGS.has(slug)) {
    extra = `<div class="btn-row"><a class="btn acid" href="/console">Open console</a><a class="btn" href="/signup?next=/console">Create account</a></div>`;
  } else if (LIVE_SLUGS.has(slug)) {
    extra = `<div class="btn-row"><a class="btn acid" href="/providers">Become a host</a><a class="btn" href="/console">Open console</a></div>`;
    below = `<section class="section alt"><div class="wrap"><div class="section-head"><span class="snum">CATALOG</span><div><h2>Early access</h2><p class="lede">The catalog opens as hosts onboard — individuals and businesses listing their own GPUs.</p></div></div><div id="live-prices" data-live-prices data-start="1"></div></div></section>`;
  } else {
    extra = `<div class="btn-row"><a class="btn acid" href="/console">Console</a><a class="btn" href="/docs">Docs</a></div>`;
  }

  if (slug === 'articles') {
    below = `<section class="section"><div class="wrap"><div class="section-head"><span class="snum">GUIDES</span><div><h2>How Aorila works</h2></div></div><div class="cards">
      <div class="card"><span class="tag">BILLING</span><h3>How per-minute GPU billing works</h3><p>1 credit = $1. When you launch a pod, the meter starts; when you stop it, the meter stops. Usage is deducted from your credit balance by the minute, and workloads stop automatically at zero — so a forgotten pod can't become a surprise bill.</p></div>
      <div class="card"><span class="tag">GETTING STARTED</span><h3>From signup to first pod</h3><p>Create an account, open the console, pick a GPU from the live catalog, and deploy. Your pod gets a secure connection through pod.aorila.com — you never touch a provider account or key.</p></div>
      <div class="card"><span class="tag">PRICING</span><h3>One bill for many pools</h3><p>Our GPUs come from verified partner pools. We publish one live $/hour price per GPU in the catalog on this site — the same number you're billed. One Aorila bill, no provider invoices.</p></div>
    </div></div></section>`;
  }

  if (slug === 'blog') {
    below = `<section class="section"><div class="wrap"><div class="section-head"><span class="snum">NOTES</span><div><h2>Latest</h2></div></div><div class="cards">
      <div class="card"><span class="tag">2026-09-15</span><h3>New look, same promise</h3><p>Every page on aorila.com now uses one design system — black and white, brutalist, honest. The product lineup is final: AI API plus Pods, Serverless, Clusters, Hub, and Deployments.</p></div>
      <div class="card"><span class="tag">2026-09-15</span><h3>Live GPU catalog</h3><p>The pricing page now pulls the GPU catalog from live provider pools. The price you see is the price you pay — one $/hour number, refreshed continuously.</p></div>
      <div class="card"><span class="tag">2026-09-15</span><h3>Trust and security is number one</h3><p>Our positioning is now explicit across the site: verified pools, honest pricing, and workloads that stop at zero. No surprises, ever.</p></div>
    </div></div></section>`;
  }

  if (slug === 'about') {
    below = `<section class="section"><div class="wrap"><div class="section-head"><span class="snum">WHAT WE DO</span><div><h2>Plainly</h2></div></div><div class="cards">
      <div class="card"><span class="tag">WE DO</span><h3>Run AI infrastructure</h3><p>On-demand GPUs — pods, serverless, clusters — from verified partner pools, plus AI models on atraly.com. Per-minute billing, one bill.</p></div>
      <div class="card"><span class="tag">WE DO</span><h3>Put trust first</h3><p>Trust and security is our first engineering requirement. Verified capacity, honest live pricing, and workloads that stop at zero.</p></div>
      <div class="card"><span class="tag">WE WON'T</span><h3>Fake it</h3><p>No invented prices, no phantom capacity, no "coming soon" dressed up as live. If something isn't running yet, we say so.</p></div>
    </div></div></section>
    <section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><span class="snum">THE COMPANY</span><div><h2>One company, three divisions</h2><p class="lede">Building toward advanced robotics for everyday life.</p></div></div><div class="cards">
      <div class="card"><span class="tag">DIVISION</span><h3>Aorila Compute</h3><p>On-demand GPUs from live pools — pods, serverless, clusters. Per-minute billing, one bill.</p></div>
      <div class="card"><span class="tag">DIVISION</span><h3>AI Platform</h3><p>Chat, voice, and agents behind one API — Atraly and Aorila models for builders.</p></div>
      <div class="card"><span class="tag">DIVISION</span><h3>Atraly</h3><p>Our personal AI division — private, simple, yours, on atraly.com. 1,000 people use Atraly every day.</p></div>
    </div>
    <div class="cards" style="margin-top:16px">
      <div class="card"><span class="tag">FOUNDED</span><h3>Nicholas &amp; Jordan Baldwin</h3><p>Founded in Columbia, South Carolina.</p></div>
      <div class="card"><span class="tag">CONTACT</span><h3>info@aorila.com</h3><p>General inquiries — <a href="mailto:info@aorila.com">info@aorila.com</a>. For sales, use <a href="/contact">Contact Sales</a>.</p></div>
      <div class="card"><span class="tag">PRINCIPLE</span><h3>Trust and security is number one</h3><p>The first requirement of everything we build — not a feature.</p></div>
    </div></div></section>`;
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
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-064VLFE5ZY"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-064VLFE5ZY');
</script>
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
    <div class="love-band"><div class="wrap"><h2>Trust and security is number one.</h2></div></div>
  </main>
  ${FOOTER}
  <script src="/site.js"></script>
  <script src="/price.js"></script>
</body>
</html>`;
}

module.exports = { PAGES, MARKETING_SLUGS: Object.keys(PAGES), renderMarketingPage };
