const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../server');

function request(port, { path = '/', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    http
      .get({ hostname: '127.0.0.1', port, path, headers }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      })
      .on('error', reject);
  });
}

function hrefs(body, label) {
  // Allow an optional wrapper tag (e.g. menu-item-title span) between the anchor and label.
  const re = new RegExp(
    `href="([^"]+)"[^>]*>(?:\\s*<span[^>]*>)?\\s*${label}\\s*<`,
    'g'
  );
  return [...body.matchAll(re)].map((m) => m[1]);
}

describe('host-based pages', () => {
  let server;
  let port;

  before(() => new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  it('serves consumer copy on aorila.com', async () => {
    const res = await request(port, { headers: { host: 'aorila.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-aorila-site'], 'consumer');
    assert.match(res.body, /<title>Aorila \u2014 Aorila<\/title>/);
    // Replica face: four nav tabs, three with dropdown panels.
    assert.match(res.body, /class="header__nav"/);
    assert.match(res.body, /href="divisions\/">Divisions/);
    assert.match(res.body, /data-drop="drop-compute"[^>]*>Compute</);
    assert.match(res.body, /data-drop="drop-ai"[^>]*>AI</);
    assert.match(res.body, /data-drop="drop-robots"[^>]*>Robots</);
    assert.match(res.body, /id="drop-compute"/);
    assert.match(res.body, />GPU Pods</);
    assert.match(res.body, />Credit Packs</);
    assert.match(res.body, /id="drop-ai"/);
    assert.match(res.body, />Atraly Chat</);
    assert.match(res.body, /id="drop-robots"/);
    assert.match(res.body, />Home Robot</);
    assert.match(res.body, />Presale</);
    // Header tools: search, account, bag.
    assert.match(res.body, /data-search-open/);
    assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/signin">Account/);
    assert.match(res.body, /id="bag-open"/);
    assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/credits"/);
    // Hero scroll-stack with the pinned wordmark.
    assert.match(res.body, /id="stack"/);
    assert.match(res.body, /stack__word/);
    // Footer: Policies / Support / Divisions.
    assert.match(res.body, /<footer/);
    assert.match(res.body, /policies\/terms\.html/);
    assert.match(res.body, /policies\/privacy\.html/);
    assert.match(res.body, /policies\/accessibility\.html/);
    assert.match(res.body, /href="contact\/"/);
    // Strictly monochrome: no playbook accent colors.
    assert.doesNotMatch(res.body, /d8ff36|ff5b22|1647ff/);
    // Brand rules: no Ally, no retired API host.
    assert.doesNotMatch(res.body, />Ally</);
    assert.doesNotMatch(res.body, /ally\.atraly\.com/);
    assert.doesNotMatch(res.body, /api\.aorila\.com/);
  });

  it('routes replica CTAs to real pages', async () => {
    const home = await request(port, { headers: { host: 'aorila.com' } });
    // The robot presale lives on robotics.aorila.com; the face only links out.
    assert.match(home.body, /href="https:\/\/robotics\.aorila\.com"/);
    assert.doesNotMatch(home.body, /data-kind="waitlist"/);
    assert.doesNotMatch(home.body, /<form[^>]*waitlist/i);
    assert.doesNotMatch(home.body, /api\.aorila\.com/);
    // Every replica collection and product page serves on the consumer host.
    for (const p of ['/divisions/', '/compute/', '/compute/gpu-pods/', '/compute/cpu-pods/', '/ai/', '/ai/atraly-chat/', '/ai/api/', '/ai/atraly-plus/', '/ai/atraly-pro/', '/robots/', '/robots/brain/', '/blog/', '/contact/', '/policies/terms.html']) {
      const r = await request(port, { path: p, headers: { host: 'aorila.com' } });
      assert.equal(r.status, 200, p);
      assert.equal(r.headers['x-aorila-site'], 'consumer', p);
    }
    // Extensionless directory URLs redirect with a trailing slash.
    const noslash = await request(port, { path: '/compute', headers: { host: 'aorila.com' } });
    assert.equal(noslash.status, 301, '/compute redirect');
    assert.match(String(noslash.headers.location || ''), /\/compute\/$/);
  });

  it('keeps Ally out of the consumer nav', async () => {
    for (const p of ['/', '/divisions/', '/robots/']) {
      const res = await request(port, { path: p, headers: { host: 'aorila.com' } });
      assert.equal(res.headers['x-aorila-site'], 'consumer', p);
      assert.doesNotMatch(res.body, />Ally</, p);
      assert.doesNotMatch(res.body, /ally\.atraly\.com/, p);
      assert.match(res.body, /class="header__wordmark"/, p);
    }
    const labs = await request(port, { headers: { host: 'aorilalabs.com' } });
    assert.doesNotMatch(labs.body, />Ally</);
  });


  it('serves the replica nav on every consumer page', async () => {
    const home = await request(port, { headers: { host: 'aorila.com' } });
    assert.match(home.body, /class="header__nav"/);
    assert.match(home.body, /href="divisions\/">Divisions/);
    for (const tab of ['Compute', 'AI', 'Robots']) {
      assert.match(home.body, new RegExp('data-drop="drop-' + tab.toLowerCase() + '"[^>]*>' + tab), tab);
    }
    // Search overlay + mobile menu ship on every page.
    assert.match(home.body, /id="search"/);
    assert.match(home.body, /id="search-index"/);
    assert.match(home.body, /id="mnav"/);
    const sub = await request(port, { path: '/robots/brain/', headers: { host: 'aorila.com' } });
    assert.match(sub.body, /class="header__nav"/);
    assert.match(sub.body, /class="header__wordmark" href="\.\.\/\.\.\/"/);
    assert.match(sub.body, /id="search"/);
    assert.match(sub.body, /id="mnav"/);
  });
  it('serves consumer marketing pages from the header menu', async () => {
    // Legacy product URL: /models is now /ai-api.
    {
      const res = await request(port, { path: '/models', headers: { host: 'aorila.com' } });
      assert.equal(res.status, 301, '/models');
      assert.equal(res.headers.location, '/ai-api');
    }
    const checks = [
      ['/ai-api', /AI API/],
      ['/pods', /On-demand GPUs from live pools/],
      ['/serverless', /Serverless GPU endpoints/],
      ['/clusters', /Multi-node GPU clusters/],
      ['/hub', /Models and templates/],
      ['/deployments', /One control plane/],
      ['/inference', /Real-time inference/],
      ['/agents', /Agents that stay online/],
      ['/fine-tuning', /Fine-tune faster/],
      ['/compute-heavy', /Heavy jobs/],
      ['/case-studies', /Case studies\./],
      ['/articles', /Guides\./],
      ['/press', /Press\./],
      ['/blog', /Notes\./],
      ['/about', /Aorila is the parent company\./],
      ['/providers', /Put your GPUs to work/],
      ['/partner', /Partner with Aorila/],
      ['/careers', /Careers\./],
      ['/pricing', /Early-access GPU pricing/],
      ['/search?q=pods', /Browse Aorila/],
    ];
    // /enterprise merged into /commercial.
    {
      const res = await request(port, { path: '/enterprise', headers: { host: 'aorila.com' } });
      assert.equal(res.status, 301, '/enterprise');
      assert.equal(res.headers.location, '/commercial');
    }
    for (const [path, pattern] of checks) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(res.status, 200, path);
      assert.equal(res.headers['x-aorila-site'], 'consumer');
      assert.match(res.body, pattern);
      assert.match(res.body, />Product</);
      assert.match(res.body, /class="ds"/);
      assert.match(res.body, /href="\/design\.css"/);
      assert.match(res.body, /Trust and security is number one/);
    }
    // Upstream vendors are never named in user copy: "verified partner pools"
    // (or "compute marketplace" on the homepage) only.
    for (const p of ['/', '/about', '/pods']) {
      const r = await request(port, { path: p, headers: { host: 'aorila.com' } });
      assert.equal(r.status, 200, p);
      assert.doesNotMatch(r.body, /RunPod/, p);
      assert.doesNotMatch(r.body, /Vast\.ai/, p);
      assert.doesNotMatch(r.body, /TensorDock/, p);
      assert.doesNotMatch(r.body, /Voltage Park/, p);
    }
    for (const p of ['/about', '/pods']) {
      const r = await request(port, { path: p, headers: { host: 'aorila.com' } });
      assert.match(r.body, /verified partner pools|compute marketplace|peer-powered/, p);
    }
    const providers = await request(port, { path: '/providers', headers: { host: 'aorila.com' } });
    assert.equal(providers.status, 200);
    assert.match(providers.body, /kind" value="provider"/);
    assert.match(providers.body, /action="\/leads"/);
    assert.match(providers.body, /id="apply"/);
    assert.match(providers.body, /Submit application/);
    assert.match(providers.body, /href="\/providers"/);
    assert.doesNotMatch(providers.body, /stripe/i);
    assert.doesNotMatch(providers.body, /coming soon/i);
    const labsAbout = await request(port, { path: '/about', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsAbout.status, 200);
    assert.match(labsAbout.body, /Talk to us/);
  });
  it('serves the Aorila Compute marketplace homepage on aorilalabs.com', async () => {
    const res = await request(port, { headers: { host: 'www.aorilalabs.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /<title>Aorila Compute/);
    assert.match(res.body, /Aorila Labs/);
    assert.match(res.body, /Aorila Compute — Compute marketplace/);
    assert.match(res.body, /class="ds"/);
    assert.match(res.body, /href="\/labs\.css\?v=4"/);
    assert.match(res.body, /hero-badge/);
    assert.doesNotMatch(res.body, /labs-split/);
    assert.match(res.body, /Now Onboarding/);
    assert.match(res.body, /Rent GPU pods by the minute/);
    assert.match(res.body, /list your own hardware and earn per minute/);
    assert.match(res.body, />Dashboard</);
    assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/signin"/);
    assert.match(res.body, /href="\/learn"/);
    assert.match(res.body, /href="\/pricing"/);
    assert.match(res.body, /href="\/about"/);
    assert.match(res.body, /COMING SOON/);
    assert.match(res.body, /info@aorila\.com/);
    assert.match(res.body, /\(803\) 386-1704/);
    assert.match(res.body, /meta name="aorila-api-origin" content="https:\/\/dashboard\.aorilalabs\.com"/);
    assert.match(res.body, /company-line/);
    assert.match(res.body, /og:image" content="https:\/\/aorilalabs\.com\/logo-aorila\.png"/);
    assert.doesNotMatch(res.body, />Trust<\/a>/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
    assert.doesNotMatch(res.body, /Powered by/i);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.doesNotMatch(res.body, /RunPod/i);
    assert.doesNotMatch(res.body, /\$99/);
    assert.doesNotMatch(res.body, /\$199/);
    assert.doesNotMatch(res.body, /\$29/);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.match(res.body, /href="\/about"/);
  });
  it('render subdomains redirect to our domain', async () => {
    const res = await request(port, {
      path: '/api',
      headers: { host: 'aorila.onrender.com', 'x-aorila-site': 'labs' },
    });
    assert.equal(res.status, 301);
    assert.match(res.headers.location || '', /^https:\/\/aorila\.com\/api/);
  });

  it('keeps Labs preview on later paths via cookie', async () => {
    const res = await request(port, {
      path: '/api',
      headers: { host: 'localhost', cookie: 'aorila_site=labs' },
    });
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, 'https://dashboard.aorilalabs.com/docs');
  });

  it('preview via ?site=labs on localhost', async () => {
    const res = await request(port, { path: '/?site=labs', headers: { host: 'localhost' } });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Aorila Compute — Compute marketplace/);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.match(String(res.headers['set-cookie'] || ''), /aorila_site=labs/);
  });

  it('serves the normal consumer homepage on the retired api.aorila.com host (no API-face special case)', async () => {
    const consumer = await request(port, { path: '/', headers: { host: 'api.aorila.com' } });
    assert.equal(consumer.status, 200);
    assert.equal(consumer.headers['x-aorila-site'], 'consumer');
    assert.doesNotMatch(consumer.body, /<title>Aorila Developer<\/title>/);
    assert.doesNotMatch(consumer.body, /api\.aorila\.com/);
  });
  it('serves consumer /api on aorila.com and redirects /api on labs', async () => {
    for (const path of ['/api', '/api/', '/api.html']) {
      const consumer = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(consumer.status, 200, path);
      assert.equal(consumer.headers['x-aorila-site'], 'consumer');
      assert.match(consumer.body, /Find Aorila on/);
      assert.match(consumer.body, /for developer access/);
      assert.match(consumer.body, /class="ds"/);
      assert.doesNotMatch(String(consumer.headers.location || ''), /api\.aorila\.com/);
    }

    const www = await request(port, { path: '/api.html', headers: { host: 'www.aorila.com' } });
    assert.equal(www.status, 200);
    assert.match(www.body, /Find Aorila on/);

    const labs = await request(port, { path: '/api', headers: { host: 'aorilalabs.com' } });
    assert.equal(labs.status, 301);
    assert.equal(labs.headers.location, 'https://dashboard.aorilalabs.com/docs');

    const preview = await request(port, { path: '/api', headers: { host: 'localhost' } });
    assert.equal(preview.status, 200);
    assert.match(preview.body, /Find Aorila on/);
  });
  it('keeps /healthz answering', async () => {
    const res = await request(port, { path: '/healthz', headers: { host: 'aorila.com' } });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'] || '', /json/);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.site, 'consumer');
  });

  it('redirects Labs content pages into the dashboard', async () => {
    const routes = {
      '/api': 'https://dashboard.aorilalabs.com/docs',
      '/compute': 'https://dashboard.aorilalabs.com/compute',
      '/training': 'https://dashboard.aorilalabs.com/compute',
      '/models': 'https://dashboard.aorilalabs.com/compute',
      '/gaming': 'https://dashboard.aorilalabs.com/gaming',
      '/docs': 'https://dashboard.aorilalabs.com/docs',
      '/support': 'https://dashboard.aorilalabs.com/support',
      '/trust': 'https://dashboard.aorilalabs.com/support',
      '/contact': 'https://dashboard.aorilalabs.com/support',
      '/console': 'https://dashboard.aorilalabs.com/',
    };
    for (const [path, location] of Object.entries(routes)) {
      const res = await request(port, { path, headers: { host: 'aorilalabs.com' } });
      assert.equal(res.status, 301, path);
      assert.equal(res.headers.location, location, path);
    }
    // Homepage, T&P, Learn, Pricing, About, and Terms stay standalone pages on labs.
    for (const path of ['/', '/tp', '/learn', '/pricing', '/about', '/terms']) {
      const res = await request(port, { path, headers: { host: 'aorilalabs.com' } });
      assert.equal(res.status, 200, path);
      assert.match(res.body, /class="ds"/, path);
    }
    // Learn is labs-only: 404 on the consumer host. (/pricing exists on both hosts.)
    {
      const res = await request(port, { path: '/learn', headers: { host: 'aorila.com' } });
      assert.equal(res.status, 404, '/learn on consumer host');
    }
  });
  it('serves an honest consumer docs outline', async () => {
    const consumer = await request(port, { path: '/docs', headers: { host: 'aorila.com' } });
    assert.equal(consumer.status, 200);
    assert.match(consumer.body, /og:url" content="https:\/\/aorila.com\/docs"/);
    assert.match(consumer.body, /Two products\. Do not mix them/);
    assert.match(consumer.body, /\/compute\/v1\/gpus/);
    assert.match(consumer.body, /class="ds"/);
    assert.doesNotMatch(consumer.body, /chat\/completions/);
    assert.doesNotMatch(consumer.body, /form class="waitlist"/);
  });
  it('serves the replica stylesheet (monochrome, border-box)', async () => {
    const css = await request(port, { path: '/assets/css/style.css', headers: { host: 'aorila.com' } });
    assert.equal(css.status, 200);
    assert.match(css.headers['content-type'] || '', /css/);
    assert.match(css.body, /\*\s*\{\s*box-sizing:\s*border-box/, 'replica must use border-box sizing');
    assert.doesNotMatch(css.body, /#d8ff36|#ff5b22|#1647ff/, 'replica is monochrome: no playbook accents');
  });
  it('search overlay cannot trap open: hidden by default, class-gated', async () => {
    // The replica toggles .search--on; the base rule must keep the overlay inert.
    const css = await request(port, { path: '/assets/css/style.css', headers: { host: 'aorila.com' } });
    assert.equal(css.status, 200);
    assert.match(css.body, /\.search\{[^}]*opacity:\s*0[^}]*pointer-events:\s*none/, 'search base must be hidden and inert');
    assert.match(css.body, /\.search--on\{[^}]*opacity:\s*1[^}]*pointer-events:\s*auto/, 'search--on must re-enable the overlay');
    const home = await request(port, { path: '/', headers: { host: 'aorila.com' } });
    assert.doesNotMatch(home.body, /search--on/, 'search overlay must start closed');
  });
  it('nav dropdowns are class-gated, never stuck open', async () => {
    const css = await request(port, { path: '/assets/css/style.css', headers: { host: 'aorila.com' } });
    assert.equal(css.status, 200);
    assert.match(css.body, /\.navdrop\{[^}]*opacity:\s*0[^}]*pointer-events:\s*none/, 'dropdown base must be hidden and inert');
    assert.match(css.body, /\.navdrop--on\{[^}]*opacity:\s*1[^}]*pointer-events:\s*auto/, 'navdrop--on must re-enable the panel');
  });
  it('serves a favicon', async () => {
    const res = await request(port, { path: '/favicon.svg', headers: { host: 'aorila.com' } });
    assert.equal(res.status, 200);
    assert.match(res.body, /<svg/);
  });
  it('contrast: no invisible text on dark surfaces', async () => {
    // The replica is monochrome: every dark surface must declare light text.
    const css = await request(port, { path: '/assets/css/style.css', headers: { host: 'aorila.com' } });
    assert.equal(css.status, 200);
    assert.match(css.body, /\.btn\{[^}]*background:\s*var\(--ink\)[^}]*color:\s*#fff/, 'primary buttons must be white on ink');
    assert.match(css.body, /\.card__qv\{[^}]*background:\s*#000[^}]*color:\s*#fff/, 'quick-view bar must be white on black');
  });

  it('serves T & P and Support on both hosts with matching footers', async () => {
    const consumerTp = await request(port, { path: '/tp', headers: { host: 'aorila.com' } });
    assert.equal(consumerTp.status, 200);
    assert.match(consumerTp.body, /class="ds"/);
    assert.match(consumerTp.body, /<h1>What we collect\.<\/h1>/);
    assert.match(consumerTp.body, /What we collect/);
    assert.match(consumerTp.body, /Emails you send to/);
    assert.match(consumerTp.body, /provider applications/);
    assert.match(consumerTp.body, /We do not sell it/);
    assert.match(consumerTp.body, /api@aorila\.com/);
    assert.match(consumerTp.body, /href="\/tp"/);
    assert.match(consumerTp.body, /href="\/support"/);
    assert.doesNotMatch(consumerTp.body, /href="\/privacy"/);
    assert.doesNotMatch(consumerTp.body, /href="\/terms"/);
    assert.doesNotMatch(consumerTp.body, /class="landing"/);

    const privacyRedirect = await request(port, { path: '/privacy', headers: { host: 'aorila.com' } });
    assert.equal(privacyRedirect.status, 301);
    assert.match(String(privacyRedirect.headers.location || ''), /\/tp/);

    const consumerSupport = await request(port, { path: '/support', headers: { host: 'aorila.com' } });
    assert.equal(consumerSupport.status, 200);
    assert.match(consumerSupport.body, /class="ds"/);
    assert.match(consumerSupport.body, /<h1>Talk to a human\.<\/h1>/);
    assert.match(consumerSupport.body, /hero-badge/);
    assert.match(consumerSupport.body, /Questions:/);
    assert.match(consumerSupport.body, /api@aorila\.com/);
    assert.match(consumerSupport.body, /href="\/support"/);
    assert.match(consumerSupport.body, /href="\/tp"/);

    const termsRedirect = await request(port, { path: '/terms', headers: { host: 'aorila.com' } });
    assert.equal(termsRedirect.status, 301);
    assert.match(String(termsRedirect.headers.location || ''), /\/support/);

    for (const path of ['/tp']) {
      const res = await request(port, { path, headers: { host: 'aorilalabs.com' } });
      assert.equal(res.status, 200, `aorilalabs.com${path}`);
      assert.equal(res.status, 200, `aorilalabs.com${path}`);
      assert.match(res.body, /<h1>/);
      assert.match(res.body, /class="ds"/);
      assert.match(res.body, /info@aorila\.com/);
      assert.match(res.body, /href="\/about"/);
      assert.match(res.body, /href="\/tp"/);
      assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/support"/);
      assert.doesNotMatch(res.body, /href="\/privacy"/);
      assert.doesNotMatch(res.body, /href="\/terms"/);
      assert.match(res.body, /href="https:\/\/aorilalabs\.com"[^>]*aria-label="Aorila Labs home"/);
      assert.doesNotMatch(res.body, /lorem ipsum/i);
      assert.doesNotMatch(res.body, /\bTBD\b/);
      assert.doesNotMatch(res.body, /coming soon/i);
      // The real privacy policy names the actual payment processors (Stripe).
      assert.match(res.body, /Stripe/);
      assert.doesNotMatch(res.body, /RunPod/i);
      assert.doesNotMatch(res.body, /Supabase/i);
      assert.doesNotMatch(res.body, /Vertex/i);
      assert.doesNotMatch(res.body, /Ollama/i);
    }

    const aboutPage = await request(port, { path: '/about', headers: { host: 'aorila.com' } });
    assert.equal(aboutPage.status, 200);
    assert.match(aboutPage.body, /Aorila is the parent company\./);
    const labsAboutGone = await request(port, { path: '/about', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsAboutGone.status, 200);
    assert.match(labsAboutGone.body, /Talk to us/);
    assert.match(labsAboutGone.body, /info@aorila\.com/);
    assert.match(labsAboutGone.body, /\(803\) 386-1704/);
    assert.match(labsAboutGone.body, /Columbia, South Carolina/);

    const labsTp = await request(port, { path: '/tp', headers: { host: 'aorilalabs.com' } });
    assert.match(labsTp.body, /What we collect/);
    assert.match(labsTp.body, /We do not sell your personal information/);
    assert.match(labsTp.body, /G-68Z6SM8C4B/);
    assert.match(labsTp.body, /Stripe/);
    assert.doesNotMatch(labsTp.body, /Atraly/);

    const labsSupport = await request(port, { path: '/support', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsSupport.status, 301);
    assert.equal(labsSupport.headers.location, 'https://dashboard.aorilalabs.com/support');

    const labsPrivacyRedirect = await request(port, { path: '/privacy', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsPrivacyRedirect.status, 301);
    assert.match(String(labsPrivacyRedirect.headers.location || ''), /\/tp/);
    // /terms serves the actual terms on labs (no longer a redirect to support).
    const labsTerms = await request(port, { path: '/terms', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsTerms.status, 200);
    assert.match(labsTerms.body, /Terms of Service/);
    assert.match(labsTerms.body, /https:\/\/aorilalabs\.com\/terms/);

    // /pricing is labs-only and renders from the real catalog shape.
    const labsPricing = await request(port, { path: '/pricing', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsPricing.status, 200);
    assert.match(labsPricing.body, /Live GPU prices/);
    assert.match(labsPricing.body, /pricing-grid/);

    // robots.txt + sitemap.xml exist on labs.
    const robots = await request(port, { path: '/robots.txt', headers: { host: 'aorilalabs.com' } });
    assert.equal(robots.status, 200);
    assert.match(robots.body, /Sitemap: https:\/\/aorilalabs\.com\/sitemap\.xml/);
    const sitemap = await request(port, { path: '/sitemap.xml', headers: { host: 'aorilalabs.com' } });
    assert.equal(sitemap.status, 200);
    assert.match(sitemap.body, /https:\/\/aorilalabs\.com\/pricing/);
    assert.match(sitemap.body, /https:\/\/aorilalabs\.com\/about/);
  });
  it('carries the policy footer on replica pages', async () => {
    for (const path of ['/', '/compute/', '/ai/', '/robots/']) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(res.status, 200, path);
      assert.match(res.body, /policies\/terms\.html/, path);
      assert.match(res.body, /policies\/privacy\.html/, path);
      assert.match(res.body, /policies\/accessibility\.html/, path);
    }
  });
  it('keeps the replica off aorilalabs.com', async () => {
    for (const path of ['/divisions/', '/robots/brain/', '/blog/']) {
      const res = await request(port, { path, headers: { host: 'aorilalabs.com' } });
      assert.equal(res.status, 404, path);
    }
  });

  it('returns a filled 404 with legal links', async () => {
    const res = await request(port, { path: '/missing-page', headers: { host: 'aorila.com' } });
    assert.equal(res.status, 404);
    assert.match(res.body, /Try home, console, T & P, or Support/);
    assert.match(res.body, /href="\/console"/);
    assert.match(res.body, /href="\/design\.css"/);
    assert.match(res.body, /class="ds"/);
    assert.match(res.body, /src="\/site\.js"/);
    assert.doesNotMatch(res.body, /API docs/);
    assert.doesNotMatch(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="\/support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
  });

});
