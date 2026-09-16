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
    assert.match(res.body, /<title>Aorila — Compute, AI, and Robotics/);
    assert.doesNotMatch(res.body, /class="landing"/);
    assert.match(res.body, /<h1>Useful technology, from infrastructure to your home\.<\/h1>/);
    assert.doesNotMatch(res.body, /Aorila builds AI/);
    assert.match(res.body, /Meet the home robot/);
    // The robot waitlist lives on robotics.aorila.com; the homepage only links out.
    assert.match(res.body, /href="https:\/\/robotics\.aorila\.com\/#waitlist"[\s\S]{0,300}?>Join the waitlist/);
    assert.doesNotMatch(res.body, /data-kind="waitlist"/);
    assert.match(res.body, /Trust and security is number one/);
    assert.doesNotMatch(res.body, /action="\/leads"/);
    assert.doesNotMatch(res.body, /d8ff36|ff5b22|1647ff/);
    assert.match(res.body, /<footer/);
    assert.match(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="\/support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
    assert.match(res.body, /menu-section-head">Products</);
    assert.match(res.body, /menu-section-head">Use cases</);
    assert.match(res.body, /menu-section-head">Resources</);
    assert.match(res.body, /menu-section-head">Company</);
    assert.match(res.body, /href="\/docs"/);
    assert.match(res.body, /href="\/pricing"/);
    assert.match(res.body, /href="\/commercial"[\s\S]*>Planned capacity/);
    assert.match(res.body, /href="\/contact"/);
    // Search lives in the injected sidebar on non-homepage consumer pages.
    assert.doesNotMatch(res.body, /data-search-open/);
    assert.doesNotMatch(res.body, /Aorila — API access/);
    assert.doesNotMatch(res.body, /What you are requesting/);
    assert.doesNotMatch(res.body, /Workspace, presence/);
    assert.doesNotMatch(res.body, /How access works/);
    assert.doesNotMatch(res.body, /Atraly V1 • Early Access/);
    assert.doesNotMatch(res.body, /The Future Of AI Innovation/);
    assert.doesNotMatch(res.body, /We build the AI/);
    assert.doesNotMatch(res.body, /\bAtraly V1\b/);
    assert.doesNotMatch(res.body, /v2\.0/i);
    assert.doesNotMatch(res.body, /v1\.5/i);
    assert.doesNotMatch(res.body, /mailto:hello@aorila\.com/);
    assert.doesNotMatch(res.body, /\$29/);
    assert.doesNotMatch(res.body, /\$199/);
    assert.doesNotMatch(res.body, /\$0\.\d+ *\/ *tok/i);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.doesNotMatch(res.body, /Higher-quality AI for businesses/);
  });

  it('has no robot waitlist on the homepage; product CTAs route to real pages', async () => {
    const home = await request(port, { headers: { host: 'aorila.com' } });
    // The robot waitlist lives on robotics.aorila.com (presale funnel); the
    // homepage only links out to it — it never hosts a waitlist form itself.
    assert.match(home.body, /href="https:\/\/robotics\.aorila\.com\/#waitlist"[\s\S]{0,300}?>Join the waitlist/);
    assert.doesNotMatch(home.body, /data-kind="waitlist"/);
    assert.doesNotMatch(home.body, /<form[^>]*waitlist/i);
    for (const href of ['/pricing', '/console', '/ai-api', '/pods', '/serverless', '/clusters', '/hub', '/deployments', '/commercial', '/contact']) {
      assert.match(home.body, new RegExp('href="' + href.replace('/', '\\/') + '"'), href);
    }
    assert.doesNotMatch(home.body, /mailto:hello@aorila\.com/);
  });

  it('keeps Ally out of the consumer nav; Product lives in the sidebar menu', async () => {
    // Homepage ships its own mega menu; every other consumer page gets the injected nav.
    const home = await request(port, { path: '/', headers: { host: 'aorila.com' } });
    assert.doesNotMatch(home.body, />Ally</);
    assert.doesNotMatch(home.body, /ally\.atraly\.com/);
    assert.match(home.body, /class="nav-toggle"/);
    assert.match(home.body, /class="nav-sidebar"/);
    assert.match(home.body, /nav-mega/);
    assert.match(home.body, /menu-item-title">AI API/);
    assert.match(home.body, /menu-item-title">Deployments/);
    assert.match(home.body, /href="\/home\.css"/);
    assert.match(home.body, /class="home"/);
    for (const path of ['/api', '/docs', '/tp', '/support', '/about', '/pricing']) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(res.headers['x-aorila-site'], 'consumer');
      assert.doesNotMatch(res.body, />Ally</);
      assert.doesNotMatch(res.body, /ally\.atraly\.com/);
      assert.match(res.body, /class="nav-toggle"/);
      assert.match(res.body, /class="nav-sidebar"[^>]*id="site-nav" hidden/);
      assert.match(res.body, />Product</);
      assert.match(res.body, /menu-item-title">AI API/);
      assert.match(res.body, /menu-item-title">Deployments/);
      // Every non-homepage consumer page ships the Playbook design via design.css.
      assert.match(res.body, /href="\/design\.css"/);
      assert.match(res.body, /class="ds"/);
    }
    const apiFace = await request(port, { path: '/', headers: { host: 'api.aorila.com' } });
    assert.doesNotMatch(apiFace.body, />Ally</);
    const labs = await request(port, { headers: { host: 'aorilalabs.com' } });
    assert.doesNotMatch(labs.body, />Ally</);
  });


  it('keeps marketing links in the nav (homepage mega menu, sidebar elsewhere)', async () => {
    // The homepage ships its own mega menu; every other consumer page gets the
    // injected far-right sidebar. Both must carry the marketing links.
    const home = await request(port, { headers: { host: 'aorila.com' } });
    assert.match(home.body, /nav-mega/);
    for (const tab of ['Compute', 'AI', 'Robotics', 'Atraly', 'Aorila Labs', 'Pricing']) {
      assert.match(home.body, new RegExp('nav-mega-toggle[^>]*>' + tab), tab);
    }
    for (const item of ['AI API', 'Pods', 'Serverless', 'Clusters', 'Hub', 'Deployments', 'Planned capacity', 'Docs', 'GPU pricing', 'AI API pricing', 'About', 'Become a provider', 'Partner', 'Careers', 'Contact']) {
      assert.match(home.body, new RegExp('menu-item-title">' + item.replace(' ', '\\s')), item);
    }
    assert.match(home.body, /class="nav-toggle"/);
    assert.match(home.body, /class="nav-sidebar"/);
    assert.match(home.body, /class="nav-backdrop"/);
    assert.doesNotMatch(home.body, />Ally</);
    assert.doesNotMatch(home.body, /ally\.atraly\.com/);
    assert.match(home.body, /href="\/home\.css"/);
    assert.match(home.body, /class="home"/);

    const res = await request(port, { path: '/about', headers: { host: 'aorila.com' } });
    assert.match(res.body, /class="nav-toggle"/);
    assert.match(res.body, /class="nav-sidebar"[^>]*id="site-nav" hidden/);
    assert.match(res.body, /class="nav-backdrop"/);
    assert.doesNotMatch(res.body, /nav-sidebar-title/);
    assert.doesNotMatch(res.body, />Menu</);
    assert.match(res.body, />Product</);
    assert.match(res.body, /menu-item-title">AI API/);
    assert.match(res.body, /menu-item-title">Pods/);
    assert.match(res.body, /menu-item-title">Serverless/);
    assert.match(res.body, /menu-item-title">Clusters/);
    assert.match(res.body, /menu-item-title">Hub/);
    assert.match(res.body, /menu-item-title">Deployments/);
    assert.match(res.body, />Use Cases</);
    assert.match(res.body, />Resources</);
    assert.match(res.body, />Company</);
    assert.match(res.body, /href="\/providers"[\s\S]*>Become a provider/);
    assert.match(res.body, />Docs</);
    assert.match(res.body, />Pricing</);
    assert.match(res.body, />Capacity</);
    assert.match(res.body, />Search</);
    assert.match(res.body, />Contact Sales</);
    assert.doesNotMatch(res.body, /nav-utility[\s\S]*>Ally</);
    assert.doesNotMatch(res.body, /ally\.atraly\.com/);
    assert.match(res.body, /data-search-open/);
    assert.match(res.body, /href="\/design\.css"/);
    assert.match(res.body, /class="ds"/);
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
      ['/contact', /Talk to sales/],
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
    // (or "peer-powered marketplace" on the homepage) only.
    for (const p of ['/', '/about', '/pods']) {
      const r = await request(port, { path: p, headers: { host: 'aorila.com' } });
      assert.equal(r.status, 200, p);
      assert.doesNotMatch(r.body, /RunPod/, p);
      assert.doesNotMatch(r.body, /Vast\.ai/, p);
      assert.doesNotMatch(r.body, /TensorDock/, p);
      assert.doesNotMatch(r.body, /Voltage Park/, p);
      assert.match(r.body, /verified partner pools|peer-powered marketplace/, p);
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
    assert.equal(labsAbout.status, 404);
  });
  it('serves the Aorila Compute marketplace homepage on aorilalabs.com', async () => {
    const res = await request(port, { headers: { host: 'www.aorilalabs.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /<title>Aorila Compute/);
    assert.match(res.body, /Aorila Labs/);
    assert.match(res.body, /peer-powered compute marketplace/);
    assert.match(res.body, /class="ds"/);
    assert.match(res.body, /href="\/labs\.css"/);
    assert.match(res.body, /hero-badge/);
    assert.doesNotMatch(res.body, /labs-split/);
    assert.match(res.body, /HOST SUPPLY/);
    assert.match(res.body, /Your compute earns/);
    assert.match(res.body, />Dashboard</);
    assert.match(res.body, /href="\/console"/);
    assert.match(res.body, /Trust and security is number one/);
    assert.match(res.body, /og:image" content="https:\/\/aorilalabs\.com\/logo-aorila\.png"/);
    assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/#trust"/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/#support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
    assert.doesNotMatch(res.body, /Powered by/i);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.doesNotMatch(res.body, /RunPod/i);
    assert.doesNotMatch(res.body, /\$99/);
    assert.doesNotMatch(res.body, /\$199/);
    assert.doesNotMatch(res.body, /\$29/);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.doesNotMatch(res.body, /href="\/about"/);
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
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Compute API/);
    assert.doesNotMatch(res.body, /Atraly/);
  });

  it('preview via ?site=labs on localhost', async () => {
    const res = await request(port, { path: '/?site=labs', headers: { host: 'localhost' } });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /peer-powered compute marketplace/);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.match(String(res.headers['set-cookie'] || ''), /aorila_site=labs/);
  });

  it('serves the slim consumer API page at / on api.aorila.com', async () => {
    const consumer = await request(port, { path: '/', headers: { host: 'api.aorila.com' } });
    assert.equal(consumer.status, 200);
    assert.equal(consumer.headers['x-aorila-site'], 'consumer');
    assert.match(consumer.body, /<title>Aorila Developer<\/title>/);
    assert.match(consumer.body, /Find Aorila on/);
    assert.match(consumer.body, /https:\/\/atraly\.com/);
    assert.match(consumer.body, />Atraly</);
    assert.match(consumer.body, /for developer access/);
    assert.match(consumer.body, /canonical" href="https:\/\/api\.aorila\.com\/"/);
    assert.match(consumer.body, /class="ds"/);
    assert.match(consumer.body, /href="\/design\.css"/);
    assert.match(consumer.body, /hero-badge/);
    assert.doesNotMatch(consumer.body, /form class="waitlist"/);
    assert.doesNotMatch(consumer.body, /action="\/leads"/);
    assert.doesNotMatch(consumer.body, /api-lock/);
    assert.doesNotMatch(consumer.body, /class="landing"/);
    assert.doesNotMatch(consumer.body, /chat\/completions/);
    assert.doesNotMatch(consumer.body, /\$29/);
    assert.doesNotMatch(consumer.body, /stripe/i);
    assert.match(consumer.body, /href="\/tp"/);
    assert.match(consumer.body, /href="\/support"/);
    assert.match(consumer.body, /href="https:\/\/aorilalabs\.com"[^>]*>Aorila Labs<\/a>/);
  });
  it('serves consumer /api on aorila.com and only redirects /api on the API host', async () => {
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

    const apiHost = await request(port, { path: '/api', headers: { host: 'api.aorila.com' } });
    assert.equal(apiHost.status, 301);
    assert.equal(apiHost.headers.location, '/');

    const labs = await request(port, { path: '/api', headers: { host: 'aorilalabs.com' } });
    assert.equal(labs.status, 200);
    assert.match(labs.body, /Compute API/);
    assert.doesNotMatch(String(labs.headers.location || ''), /api\.aorila\.com/);

    const preview = await request(port, { path: '/api', headers: { host: 'localhost' } });
    assert.equal(preview.status, 200);
    assert.match(preview.body, /Find Aorila on/);
  });
  it('keeps /healthz on the API host', async () => {
    const res = await request(port, { path: '/healthz', headers: { host: 'api.aorila.com' } });
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'] || '', /json/);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.site, 'consumer');
  });

  it('serves the Labs Compute API page', async () => {
    const labs = await request(port, { path: '/api', headers: { host: 'aorilalabs.com' } });
    assert.match(labs.body, /<title>Compute API/);
    assert.match(labs.body, /One API for the whole marketplace/);
    assert.match(labs.body, /class="ds"/);
    assert.match(labs.body, /href="\/labs\.css"/);
    assert.doesNotMatch(labs.body, /labs-split/);
    assert.match(labs.body, /api@aorila\.com/);
    assert.match(labs.body, /og:url" content="https:\/\/aorilalabs.com\/api"/);
    assert.doesNotMatch(labs.body, /Powered by/i);
    assert.doesNotMatch(labs.body, /Atraly/);
    assert.doesNotMatch(labs.body, /RunPod/i);
    assert.match(labs.body, /href="\/console"/);
    assert.match(labs.body, /hero-badge/);
    assert.match(labs.body, /One catalog, one job API, one bill/);
    assert.match(labs.body, />Dashboard</);
    assert.match(labs.body, /href="\/console"/);
    assert.doesNotMatch(labs.body, /chat\/completions/);
    assert.doesNotMatch(labs.body, /\$99/);
    assert.doesNotMatch(labs.body, /\$199/);
    assert.doesNotMatch(labs.body, /stripe/i);
  });
  it('serves an honest Labs docs outline that is not the form', async () => {
    const labs = await request(port, { path: '/docs', headers: { host: 'aorilalabs.com' } });
    assert.equal(labs.status, 200);
    assert.match(labs.body, /<title>Docs — Aorila Labs<\/title>/);
    assert.match(labs.body, /og:url" content="https:\/\/aorilalabs.com\/docs"/);
    assert.match(labs.body, /canonical" href="https:\/\/aorilalabs.com\/docs"/);
    assert.match(labs.body, /Documentation ships with access/);
    assert.match(labs.body, /class="ds"/);
    assert.match(labs.body, /api@aorila\.com/);
    assert.doesNotMatch(labs.body, /form class="waitlist"/);
    assert.doesNotMatch(labs.body, /Atraly/);
    assert.doesNotMatch(labs.body, /chat\/completions/);
    assert.doesNotMatch(labs.body, /api\.aorila\.com/);
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
  it('serves the shared Playbook design stylesheet', async () => {
    const css = await request(port, { path: '/design.css' });
    assert.equal(css.status, 200);
    assert.match(css.body, /body\.ds/);
    assert.match(css.body, /#ffffff/);
    assert.match(css.body, /#d8ff36/, 'acid accent must be present');
    assert.match(css.body, /#ff5b22/, 'orange accent must be present');
    assert.match(css.body, /#1647ff/, 'blue accent must be present');
    assert.match(css.body, /Archivo/);
    assert.match(css.body, /IBM Plex Mono/);
    assert.match(css.body, /\.topline/);
    assert.match(css.body, /\.hero-badge/);
    assert.match(css.body, /\.btn/);
    assert.match(css.body, /\.love-band/);
    assert.match(css.body, /\.site-footer/);
  });
  it('never traps the search overlay open (hidden attribute must win)', async () => {
    // Regression: .search-overlay sets display:flex, which used to beat the
    // `hidden` attribute, so once opened the overlay could never be closed.
    const css = await request(port, { path: '/design.css' });
    assert.equal(css.status, 200);
    assert.match(
      css.body,
      /\.search-overlay\[hidden\]\s*\{\s*display:\s*none/,
      'design.css must hide .search-overlay[hidden]'
    );
  });
  it('every hidden-toggled nav surface has a CSS rule that respects hidden', async () => {
    // Guards the sidebar/backdrop/overlay trio against future display overrides.
    const css = await request(port, { path: '/design.css' });
    assert.equal(css.status, 200);
    for (const cls of ['search-overlay', 'nav-backdrop', 'nav-sidebar']) {
      const rule = new RegExp(`\\.${cls}\\s*\\{[^}]*display\\s*:`);
      const guard = new RegExp(`\\.${cls}\\[hidden\\][^{]*\\{[^}]*display\\s*:\\s*none`);
      if (rule.test(css.body)) {
        assert.match(css.body, guard, `.${cls} sets display so it needs a [hidden] guard`);
      }
    }
  });
  it('both stylesheets use border-box sizing', async () => {
    // The layout (sidebar widths, dialog padding) is authored for border-box.
    for (const path of ['/design.css', '/home.css']) {
      const css = await request(port, { path });
      assert.equal(css.status, 200, path);
      assert.match(css.body, /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{\s*box-sizing:\s*border-box/, `${path} must set border-box`);
    }
  });
  it('serves a favicon', async () => {
    const res = await request(port, { path: '/favicon.svg' });
    assert.equal(res.status, 200);
    assert.match(res.body, /<svg/);
  });

  it('contrast: no invisible text on dark surfaces', async () => {
    // Guards the black-on-black / blue-link regressions Nicholas flagged:
    // dark-card tags, homepage footer links, bare links in dark heroes,
    // and the active commercial chip (ink on acid).
    const homeCss = await request(port, { path: '/home.css' });
    assert.match(homeCss.body, /\.home \.card\.accent-ink \.tag\s*\{[^}]*color:\s*#fff/i, 'dark-card tags must be white');
    assert.match(homeCss.body, /body\.home \.footer-links a\s*\{[^}]*color:\s*#10100f/, 'homepage footer links must be ink, not browser blue');
    const dsCss = await request(port, { path: '/design.css' });
    assert.match(dsCss.body, /\.ds \.hero a(?::not\([^)]*\))+\s*\{\s*color:\s*#(?:fff|ffffff)/i, 'bare links in dark heroes must be white');
    const commercial = await request(port, { path: '/commercial', headers: { host: 'aorila.com' } });
    assert.equal(commercial.status, 200);
    assert.match(commercial.body, /class="chip acid"[^>]*color:#10100f/, 'active commercial chip must be ink on acid');
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

    for (const path of ['/tp', '/support']) {
      const res = await request(port, { path, headers: { host: 'aorilalabs.com' } });
      assert.equal(res.status, 200, `aorilalabs.com${path}`);
      assert.match(res.body, /<h1>/);
      assert.match(res.body, /class="ds"/);
      assert.match(res.body, /api@aorila\.com/);
      assert.doesNotMatch(res.body, /href="\/about"/);
      assert.match(res.body, /href="\/tp"/);
      assert.match(res.body, /href="https:\/\/dashboard\.aorilalabs\.com\/#support"/);
      assert.doesNotMatch(res.body, /href="\/privacy"/);
      assert.doesNotMatch(res.body, /href="\/terms"/);
      assert.match(res.body, /href="https:\/\/aorilalabs\.com"[^>]*aria-label="Aorila Labs home"/);
      assert.doesNotMatch(res.body, /lorem ipsum/i);
      assert.doesNotMatch(res.body, /\bTBD\b/);
      assert.doesNotMatch(res.body, /coming soon/i);
      assert.doesNotMatch(res.body, /stripe/i);
      assert.doesNotMatch(res.body, /RunPod/i);
      assert.doesNotMatch(res.body, /Supabase/i);
      assert.doesNotMatch(res.body, /Vertex/i);
      assert.doesNotMatch(res.body, /Ollama/i);
    }

    const aboutPage = await request(port, { path: '/about', headers: { host: 'aorila.com' } });
    assert.equal(aboutPage.status, 200);
    assert.match(aboutPage.body, /Aorila is the parent company\./);
    const labsAboutGone = await request(port, { path: '/about', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsAboutGone.status, 404);

    const labsTp = await request(port, { path: '/tp', headers: { host: 'aorilalabs.com' } });
    assert.match(labsTp.body, /What we collect/);
    assert.match(labsTp.body, /We do not sell it/);
    assert.doesNotMatch(labsTp.body, /Atraly/);

    const labsSupport = await request(port, { path: '/support', headers: { host: 'aorilalabs.com' } });
    assert.match(labsSupport.body, /Questions about a bill/);
    assert.doesNotMatch(labsSupport.body, /Atraly/);

    const labsPrivacyRedirect = await request(port, { path: '/privacy', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsPrivacyRedirect.status, 301);
    assert.match(String(labsPrivacyRedirect.headers.location || ''), /\/tp/);
    const labsTermsRedirect = await request(port, { path: '/terms', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsTermsRedirect.status, 301);
    assert.match(String(labsTermsRedirect.headers.location || ''), /\/support/);
  });
  it('footer carries Partners and Contact on consumer pages', async () => {
    for (const path of ['/', '/pods', '/pricing', '/about', '/commercial']) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(res.status, 200, path);
      assert.match(res.body, /href="\/partner">Partners</, path);
      assert.match(res.body, /href="\/contact">Contact</, path);
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
