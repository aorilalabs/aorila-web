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
    lede: 'Aorila builds AI infrastructure and API access for builders and companies.',
  },
  partner: {
    title: 'Partner',
    badge: 'Company',
    heading: 'Partner with Aorila.',
    lede: 'Work with us on integrations, go-to-market, and joint customer deployments.',
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
    heading: 'Search Aorila.',
    lede: 'Find products, use cases, docs, and company pages.',
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
  } else if (slug === 'search') {
    const q = query && query.q ? String(query.q).trim() : '';
    if (q) {
      lede = `Results for “${q}”. Browse the menu for products, use cases, resources, and company pages.`;
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
  </main>
  ${FOOTER}
  <script src="/site.js"></script>
</body>
</html>`;
}

const MARKETING_SLUGS = Object.keys(PAGES);

module.exports = { PAGES, MARKETING_SLUGS, renderMarketingPage };
