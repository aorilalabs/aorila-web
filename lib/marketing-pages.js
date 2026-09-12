/** Marketing page catalog + HTML renderer for consumer routes. */

const { consumerNav } = require('./consumer-nav');

const FOOTER = `<footer>
    <nav class="footer-links" aria-label="Legal">
      <a href="/tp">T &amp; P</a>
      <a href="/support">Support</a>
    </nav>
    <span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span>
  </footer>`;

/** @type {Record<string, { title: string, badge: string, heading: string, lede: string, body?: string[] }>} */
const PAGES = {
  pods: {
    title: 'Pods',
    badge: 'Product',
    heading: 'On-demand GPUs across 31 regions.',
    lede: 'Spin up GPU pods when you need them. Deploy workloads close to your users with global capacity.',
  },
  serverless: {
    title: 'Serverless',
    badge: 'Product',
    heading: 'Serverless GPU endpoints for API workloads.',
    lede: 'Run API-based AI workloads without managing instances. Scale endpoints up and down with demand.',
  },
  clusters: {
    title: 'Clusters',
    badge: 'Product',
    heading: 'Multi-node GPU clusters for distributed AI.',
    lede: 'Train and serve at scale with multi-node clusters built for distributed AI workloads.',
  },
  hub: {
    title: 'Hub',
    badge: 'Product',
    heading: 'Open-source models and templates, ready to deploy.',
    lede: 'Deploy open-source AI models and templates on Aorila without starting from a blank stack.',
  },
  deployments: {
    title: 'Deployments / Models',
    badge: 'Product',
    heading: 'One control plane for your compute.',
    lede: 'Manage your or our compute from one unified control plane — Hybrid Cloud for models and deployments.',
  },
  inference: {
    title: 'Inference',
    badge: 'Use Cases',
    heading: 'Real-time inference on low-latency GPUs.',
    lede: 'Serve models in production with the latency and throughput your users expect.',
  },
  agents: {
    title: 'Agents',
    badge: 'Use Cases',
    heading: 'Agents that run, react, and scale.',
    lede: 'Deploy AI agents that stay online, respond quickly, and scale when traffic spikes.',
  },
  'fine-tuning': {
    title: 'Fine-Tuning',
    badge: 'Use Cases',
    heading: 'Fine-tune faster on scalable compute.',
    lede: 'Train models with efficient, scalable GPU capacity — without waiting on fixed cluster schedules.',
  },
  'compute-heavy': {
    title: 'Compute-Heavy Tasks',
    badge: 'Use Cases',
    heading: 'Heavy workloads without the bottleneck.',
    lede: 'Process massive jobs on GPU capacity sized for batch, rendering, and other compute-heavy tasks.',
  },
  'case-studies': {
    title: 'Case Studies',
    badge: 'Resources',
    heading: 'How teams ship with Aorila.',
    lede: 'Read how builders use Aorila compute and APIs in production.',
  },
  articles: {
    title: 'Articles',
    badge: 'Resources',
    heading: 'Guides and deep dives.',
    lede: 'Practical writing on inference, agents, fine-tuning, and GPU operations.',
  },
  press: {
    title: 'Press',
    badge: 'Resources',
    heading: 'Press and media.',
    lede: 'News and announcements about Aorila. For press inquiries, use Contact Sales.',
  },
  blog: {
    title: 'Blog',
    badge: 'Resources',
    heading: 'Product news and notes.',
    lede: 'Updates from the Aorila team on product, platform, and the AI stack.',
  },
  about: {
    title: 'About',
    badge: 'Company',
    heading: 'The Future of AI Innovation.',
    lede: 'Aorila is the AI compute marketplace — capacity from many providers, one control plane for builders and companies.',
  },
  providers: {
    title: 'Providers',
    badge: 'Company',
    heading: 'Put your GPUs to work on Aorila.',
    lede: 'We keep the provider door open. List verified capacity, earn on demand we bring, and get paid for the hours your hardware runs.',
  },
  partner: {
    title: 'Partner',
    badge: 'Company',
    heading: 'Partner with Aorila.',
    lede: 'Data centers, colo operators, and go-to-market partners — join Secure Cloud supply or ship joint customer deployments.',
  },
  careers: {
    title: 'Careers',
    badge: 'Company',
    heading: 'Build with us.',
    lede: 'We are hiring people who care about reliable AI infrastructure and clear product craft.',
  },
  pricing: {
    title: 'Pricing',
    badge: 'Pricing',
    heading: 'Compute cost plus an Aorila fee.',
    lede: 'Public pricing may change. Request an API key to talk through your workload and quote.',
  },
  enterprise: {
    title: 'Enterprise',
    badge: 'Enterprise',
    heading: 'Enterprise AI compute and access.',
    lede: 'Dedicated capacity, commercial terms, and support for teams that need more than self-serve.',
  },
  contact: {
    title: 'Contact Sales',
    badge: 'Sales',
    heading: 'Talk to sales.',
    lede: 'For commercial API and enterprise compute, reach the Labs team or email api@aorila.com.',
  },
  search: {
    title: 'Search',
    badge: 'Search',
    heading: 'Browse Aorila.',
    lede: 'Use the menu for products, use cases, resources, and company pages. This page is a quick jump — not a full-text index.',
  },
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarketingPage(slug, { query } = {}) {
  const page = PAGES[slug];
  if (!page) return null;

  const path = slug === 'search' ? '/search' : `/${slug}`;
  const title = `${page.title} — Aorila`;
  let lede = page.lede;
  let extra = '';

  if (slug === 'contact') {
    extra = `<div class="cta-row">
        <a class="cta primary" href="https://aorilalabs.com" data-local-site="labs">Contact Labs</a>
        <a class="cta ghost" href="mailto:api@aorila.com">api@aorila.com</a>
      </div>`;
  } else if (slug === 'providers') {
    extra = `<div class="cta-row">
        <a class="cta primary" href="#apply">Apply to provide</a>
        <a class="cta ghost" href="/partner">Data center partners</a>
      </div>`;
  } else if (slug === 'partner') {
    extra = `<div class="cta-row">
        <a class="cta primary" href="/providers">Provider application</a>
        <a class="cta ghost" href="/contact">Contact Sales</a>
      </div>`;
  } else if (slug === 'search') {
    const q = query && query.q ? String(query.q).trim() : '';
    if (q) {
      lede = `Looking for “${q}”. There is no full-text index yet — browse the menu for products, use cases, resources, and company pages.`;
    }
    extra = `<form class="search-form inline" action="/search" method="get" role="search">
        <label class="sr-only" for="page-search">Search</label>
        <input id="page-search" name="q" type="search" value="${esc(q)}" placeholder="Search Aorila" />
        <button type="submit" class="cta primary">Search</button>
      </form>`;
  } else if (slug === 'pricing' || slug === 'enterprise') {
    extra = `<div class="cta-row">
        <a class="cta primary" href="https://api.aorila.com">Request an API key</a>
        <a class="cta ghost" href="/contact">Contact Sales</a>
      </div>`;
  } else {
    extra = `<div class="cta-row">
        <a class="cta primary" href="https://api.aorila.com">Request an API key</a>
        <a class="cta ghost" href="/docs">Docs</a>
      </div>`;
  }

  let below = '';
  if (slug === 'providers') {
    below = `
    <section class="section" id="why-provide">
      <h2>Why providers choose Aorila</h2>
      <p>Customers need GPUs that are actually available. We recruit supply aggressively so the network stays deep — Open Cloud for verified independents, Secure Cloud for certified facilities.</p>
      <ul>
        <li>You set pricing for on-demand, interruptible, and reserved capacity.</li>
        <li>We bring demand, billing, and support so you focus on uptime and hardware.</li>
        <li>Verification rewards reliability, network, and modern CUDA — not who shouted first.</li>
        <li>Marketplace rules stay fair: owned capacity, if any, is labeled and does not bury yours.</li>
      </ul>
    </section>
    <section class="section labs-request" id="apply">
      <h2>Provider application</h2>
      <p>Tell us what you can list. We follow up with onboarding steps for identity, payouts, and host software.</p>
      <form class="waitlist" action="/leads" method="post" data-kind="provider">
        <input type="hidden" name="site" value="consumer" />
        <input type="hidden" name="kind" value="provider" />
        <label class="hp" aria-hidden="true">Fax
          <input type="text" name="fax" tabindex="-1" autocomplete="off" />
        </label>
        <label>
          Operator / company
          <input type="text" name="company" autocomplete="organization" required placeholder="Northwind Colo" />
        </label>
        <label>
          Contact name
          <input type="text" name="name" autocomplete="name" required placeholder="Alex Rivera" />
        </label>
        <label>
          Email
          <input type="email" name="email" autocomplete="email" required placeholder="you@company.com" />
        </label>
        <label>
          Hardware
          <textarea name="use_case" rows="4" required placeholder="GPU models, counts, location, network (e.g. 8× H100 SXM, Ashburn, 10 Gbps)"></textarea>
        </label>
        <label>
          Capacity note
          <input type="text" name="volume" autocomplete="off" required placeholder="e.g. 64 GPUs live now; 128 more in 60 days" />
        </label>
        <label>
          Website <span class="optional">optional</span>
          <input type="text" name="website" autocomplete="url" placeholder="https://" />
        </label>
        <button class="cta primary" type="submit">Submit application</button>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
      <p class="form-alt">Or email <a href="mailto:api@aorila.com">api@aorila.com</a> with subject “Provider”.</p>
    </section>`;
  } else if (slug === 'partner') {
    below = `
    <section class="section">
      <h2>Who this is for</h2>
      <p>Secure Cloud data centers, colo operators with certified facilities, and product or channel partners who want joint deployments on Aorila capacity.</p>
      <p>Independent hosts and smaller fleets should use the <a href="/providers">provider application</a> instead.</p>
    </section>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(page.lede)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(page.lede)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://aorila.com${esc(path)}" />
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
</body>
</html>`;
}

const MARKETING_SLUGS = Object.keys(PAGES);

module.exports = { PAGES, MARKETING_SLUGS, renderMarketingPage };
