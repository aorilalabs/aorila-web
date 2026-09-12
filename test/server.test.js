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
    assert.match(res.body, /<title>Aorila<\/title>/);
    assert.match(res.body, /class="landing"/);
    assert.match(res.body, /<h1>The Future of AI Innovation<\/h1>/);
    assert.doesNotMatch(res.body, /Aorila builds AI/);
    assert.match(res.body, /Request an API key/);
    assert.match(res.body, /href="https:\/\/aorilalabs\.com"[^>]*>Labs</);
    assert.match(res.body, /<footer/);
    assert.match(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="\/support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
    assert.match(res.body, />Product</);
    assert.match(res.body, />Use Cases</);
    assert.match(res.body, />Resources</);
    assert.match(res.body, />Company</);
    assert.match(res.body, /href="\/docs"/);
    assert.match(res.body, /href="\/pricing"/);
    assert.match(res.body, /href="\/enterprise"/);
    assert.match(res.body, /href="\/contact"/);
    assert.match(res.body, />Sign in</);
    assert.match(res.body, />Sign Up</);
    assert.match(res.body, /data-search-open/);
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
    assert.doesNotMatch(res.body, /form class="waitlist"/);
    assert.doesNotMatch(res.body, /mailto:hello@aorila\.com/);
    assert.doesNotMatch(res.body, /\$29/);
    assert.doesNotMatch(res.body, /\$199/);
    assert.doesNotMatch(res.body, /\$0\.\d+ *\/ *tok/i);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.doesNotMatch(res.body, /Higher-quality AI for businesses/);
  });

  it('sends every consumer request-key CTA to the same href as Product → APIs', async () => {
    const home = await request(port, { headers: { host: 'aorila.com' } });
    const navApis = hrefs(home.body, 'APIs');
    assert.deepEqual(navApis, ['https://api.aorila.com']);
    assert.match(home.body, /id="site-nav"[\s\S]*menu-item-title">APIs</);
    assert.doesNotMatch(home.body, /nav-utility[\s\S]*>API</);
    const requestKey = hrefs(home.body, 'Request an API key');
    assert.ok(requestKey.length >= 1);
    for (const href of requestKey) {
      assert.equal(href, 'https://api.aorila.com');
      assert.doesNotMatch(href, /^mailto:/i);
    }
    assert.doesNotMatch(home.body, /href="#waitlist"/);
    assert.doesNotMatch(home.body, /mailto:hello@aorila\.com/);
  });

  it('puts Ally beside Labs on the consumer nav (API lives under Product)', async () => {
    const paths = ['/', '/api', '/docs', '/tp', '/support', '/about', '/pricing'];
    for (const path of paths) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.deepEqual(hrefs(res.body, 'Ally'), ['https://ally.atraly.com']);
      assert.match(
        res.body,
        /Ally<\/a>\s*<a class="nav-link" href="https:\/\/aorilalabs\.com"[^>]*>Labs<\/a>/
      );
      assert.deepEqual(hrefs(res.body, 'APIs'), ['https://api.aorila.com']);
      assert.doesNotMatch(res.body, /nav-utility[\s\S]*>API</);
    }
    const apiFace = await request(port, { path: '/', headers: { host: 'api.aorila.com' } });
    assert.deepEqual(hrefs(apiFace.body, 'Ally'), ['https://ally.atraly.com']);
    assert.match(
      apiFace.body,
      /Ally<\/a>\s*<a class="nav-link" href="https:\/\/aorilalabs\.com"[^>]*>Labs<\/a>/
    );
    assert.match(apiFace.body, /href="https:\/\/api\.aorila\.com"[^>]*aria-current="page"[\s\S]*?>[\s\S]*?APIs</);
    const labs = await request(port, { headers: { host: 'aorilalabs.com' } });
    assert.doesNotMatch(labs.body, />Ally</);
  });

  it('keeps marketing links in a far-right sidebar menu', async () => {
    const res = await request(port, { headers: { host: 'aorila.com' } });
    assert.match(res.body, /class="nav-toggle"/);
    assert.match(res.body, /class="nav-sidebar"[^>]*id="site-nav" hidden/);
    assert.match(res.body, /class="nav-backdrop"/);
    assert.doesNotMatch(res.body, /nav-sidebar-title/);
    assert.doesNotMatch(res.body, />Menu</);
    assert.match(
      res.body,
      /nav-utility[\s\S]*nav-toggle[\s\S]*id="site-nav"[\s\S]*>Product</
    );
    assert.match(res.body, /id="site-nav"[\s\S]*menu-item-title">APIs</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Use Cases</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Resources</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Company</);
    assert.match(res.body, /id="site-nav"[\s\S]*href="\/providers"[\s\S]*>Providers</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Docs</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Pricing</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Enterprise</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Search</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Contact Sales</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Sign in</);
    assert.match(res.body, /id="site-nav"[\s\S]*>Sign Up</);
    assert.doesNotMatch(res.body, /nav-utility[\s\S]*>API</);
    assert.match(res.body, /nav-utility[\s\S]*>Ally</);
    assert.match(res.body, /nav-utility[\s\S]*>Labs</);
  });

  it('serves consumer marketing pages from the header menu', async () => {
    const checks = [
      ['/pods', /On-demand GPUs across 31 regions/],
      ['/serverless', /Serverless GPU endpoints/],
      ['/clusters', /Multi-node GPU clusters/],
      ['/hub', /Open-source models and templates/],
      ['/deployments', /One control plane for your compute/],
      ['/inference', /Real-time inference/],
      ['/agents', /Agents that run, react, and scale/],
      ['/fine-tuning', /Fine-tune faster/],
      ['/compute-heavy', /Heavy workloads without the bottleneck/],
      ['/case-studies', /How teams ship with Aorila/],
      ['/articles', /Guides and deep dives/],
      ['/press', /Press and media/],
      ['/blog', /Product news and notes/],
      ['/about', /The Future of AI Innovation/],
      ['/providers', /Put your GPUs to work on Aorila/],
      ['/partner', /Partner with Aorila/],
      ['/careers', /Build with us/],
      ['/pricing', /Compute cost plus an Aorila fee/],
      ['/enterprise', /Enterprise AI compute and access/],
      ['/contact', /Talk to sales/],
      ['/search?q=pods', /Results for/],
    ];
    for (const [path, pattern] of checks) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(res.status, 200, path);
      assert.equal(res.headers['x-aorila-site'], 'consumer');
      assert.match(res.body, pattern);
      assert.match(res.body, />Product</);
      assert.doesNotMatch(res.body, /RunPod/i);
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

  it('serves Labs as a request-API-access page on aorilalabs.com', async () => {
    const res = await request(port, { headers: { host: 'www.aorilalabs.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /<title>Aorila Labs — Commercial API access<\/title>/);
    assert.match(res.body, /Aorila Labs/);
    assert.match(res.body, /<h1>Commercial API access<\/h1>/);
    assert.match(res.body, /class="labs-split"/);
    assert.doesNotMatch(res.body, /hero-badge/);
    assert.doesNotMatch(res.body, /nav-link"[^>]*>\s*(?:<span[^>]*>)?(?:Commercial API access|Access)\b/);
    assert.match(res.body, /class="nav-link" href="https:\/\/aorila\.com"[^>]*>Aorila<\/a>/);
    assert.doesNotMatch(res.body, /class="nav-link" href="\/"/);
    assert.match(res.body, /Request access/);
    assert.match(res.body, /api@aorila\.com/);
    assert.match(res.body, /form class="waitlist"/);
    assert.match(res.body, /action="\/leads"/);
    assert.match(res.body, /id="contact"/);
    assert.match(res.body, /name="company"/);
    assert.match(res.body, /name="name"/);
    assert.match(res.body, /name="email"/);
    assert.match(res.body, /name="use_case"/);
    assert.match(res.body, /name="volume"/);
    assert.match(res.body, /name="website"/);
    assert.match(res.body, /name="fax"/);
    assert.doesNotMatch(res.body, /Powered/i);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.doesNotMatch(res.body, /RunPod/i);
    assert.doesNotMatch(res.body, /1\.5\s*[×x]/);
    assert.doesNotMatch(res.body, /Higher-quality AI for businesses/);
    assert.doesNotMatch(res.body, /Aorila builds the AI/);
    assert.doesNotMatch(res.body, /sales@aorilalabs\.com/);
    assert.doesNotMatch(res.body, /\$99/);
    assert.doesNotMatch(res.body, /\$199/);
    assert.doesNotMatch(res.body, /\$29/);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.doesNotMatch(res.body, /We build the AI/);
    assert.doesNotMatch(res.body, /API access for builders and companies/);
    assert.doesNotMatch(res.body, /Who it's for/);
    assert.doesNotMatch(res.body, /After you request/);
    assert.doesNotMatch(res.body, /Powered by/i);
    assert.doesNotMatch(res.body, /partnership/i);
    assert.doesNotMatch(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="\/support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
    assert.match(res.body, />T &amp; P</);
    assert.match(res.body, />Support</);
    assert.doesNotMatch(res.body, /<span>Aorila<\/span>/);
    assert.match(res.body, /href="https:\/\/aorilalabs\.com"[^>]*>Aorila Labs</);
  });

  it('preview via ?site=labs on localhost', async () => {
    const res = await request(port, { path: '/?site=labs', headers: { host: 'localhost' } });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Commercial API access/);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.match(String(res.headers['set-cookie'] || ''), /aorila_site=labs/);
  });

  it('keeps Labs preview on later paths via cookie', async () => {
    const res = await request(port, {
      path: '/api',
      headers: { host: 'localhost', cookie: 'aorila_site=labs' },
    });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Commercial API access/);
    assert.doesNotMatch(res.body, /Atraly/);
  });

  it('preview via X-Aorila-Site header', async () => {
    const res = await request(port, {
      headers: { host: 'aorila.onrender.com', 'x-aorila-site': 'labs' },
    });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Request access/);
  });

  it('serves the slim consumer API page at / on api.aorila.com', async () => {
    const consumer = await request(port, { path: '/', headers: { host: 'api.aorila.com' } });
    assert.equal(consumer.status, 200);
    assert.equal(consumer.headers['x-aorila-site'], 'consumer');
    assert.match(consumer.body, /<title>Aorila API<\/title>/);
    assert.match(consumer.body, /Find Aorila on/);
    assert.match(consumer.body, /https:\/\/atraly\.com/);
    assert.match(consumer.body, />Atraly</);
    assert.match(consumer.body, /<hr class="hairline"/);
    assert.match(consumer.body, /Contact <a href="mailto:api@aorila\.com">api@aorila\.com<\/a> for Commercial API inquiries/);
    assert.match(consumer.body, /canonical" href="https:\/\/api\.aorila\.com\/"/);
    assert.doesNotMatch(consumer.body, /form class="waitlist"/);
    assert.doesNotMatch(consumer.body, /action="\/leads"/);
    assert.doesNotMatch(consumer.body, /hello@aorila\.com/);
    assert.doesNotMatch(consumer.body, /chat\/completions/);
    assert.doesNotMatch(consumer.body, /compute cost \+ Aorila fee/);
    assert.doesNotMatch(consumer.body, /Request an API key/);
    assert.doesNotMatch(consumer.body, /\$29/);
    assert.doesNotMatch(consumer.body, /stripe/i);
    assert.doesNotMatch(consumer.body, /What you are requesting/);
    assert.doesNotMatch(consumer.body, /Request API access/);
    assert.doesNotMatch(consumer.body, /Where to start/);
    assert.doesNotMatch(consumer.body, /This page is the inquire path/);
    assert.match(consumer.body, /class="api-lock"/);
    assert.match(consumer.body, /class="landing"/);
    assert.match(consumer.body, /href="\/tp"/);
    assert.match(consumer.body, /href="\/support"/);
    assert.doesNotMatch(consumer.body, /<span>Aorila<\/span>/);
    assert.match(consumer.body, /href="https:\/\/aorilalabs\.com"[^>]*>Aorila Labs</);
  });

  it('serves consumer /api on aorila.com and only redirects /api on the API host', async () => {
    for (const path of ['/api', '/api/', '/api.html']) {
      const consumer = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.equal(consumer.status, 200, path);
      assert.equal(consumer.headers['x-aorila-site'], 'consumer');
      assert.match(consumer.body, /class="api-lock"/);
      assert.match(consumer.body, /Find Aorila on/);
      assert.match(consumer.body, /Contact <a href="mailto:api@aorila\.com">api@aorila\.com<\/a> for Commercial API inquiries/);
      assert.doesNotMatch(String(consumer.headers.location || ''), /api\.aorila\.com/);
    }

    const www = await request(port, { path: '/api.html', headers: { host: 'www.aorila.com' } });
    assert.equal(www.status, 200);
    assert.match(www.body, /class="api-lock"/);

    const apiHost = await request(port, { path: '/api', headers: { host: 'api.aorila.com' } });
    assert.equal(apiHost.status, 301);
    assert.equal(apiHost.headers.location, '/');

    const labs = await request(port, { path: '/api', headers: { host: 'aorilalabs.com' } });
    assert.equal(labs.status, 200);
    assert.match(labs.body, /Commercial API access/);
    assert.doesNotMatch(String(labs.headers.location || ''), /api\.aorila\.com/);

    const preview = await request(port, { path: '/api', headers: { host: 'localhost' } });
    assert.equal(preview.status, 200);
    assert.match(preview.body, /class="api-lock"/);
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

  it('serves the Labs API page as the request-access form', async () => {
    const labs = await request(port, { path: '/api', headers: { host: 'aorilalabs.com' } });
    assert.match(labs.body, /<title>Aorila Labs — Commercial API access<\/title>/);
    assert.match(labs.body, /Commercial API access/);
    assert.match(labs.body, /class="labs-split"/);
    assert.match(labs.body, /api@aorila\.com/);
    assert.match(labs.body, /og:url" content="https:\/\/aorilalabs.com\/api"/);
    assert.doesNotMatch(labs.body, /Powered/i);
    assert.doesNotMatch(labs.body, /Atraly/);
    assert.doesNotMatch(labs.body, /RunPod/i);
    assert.doesNotMatch(labs.body, /Higher-quality AI for businesses/);
    assert.doesNotMatch(labs.body, /Aorila builds the AI/);
    assert.doesNotMatch(labs.body, /sales@aorilalabs\.com/);
    assert.match(labs.body, /form class="waitlist"/);
    assert.match(labs.body, /action="\/leads"/);
    assert.match(labs.body, /name="company"/);
    assert.match(labs.body, /name="name"/);
    assert.match(labs.body, /name="email"/);
    assert.match(labs.body, /name="use_case"/);
    assert.match(labs.body, /name="volume"/);
    assert.match(labs.body, /name="website"/);
    assert.match(labs.body, /Request access/);
    assert.doesNotMatch(labs.body, /chat\/completions/);
    assert.doesNotMatch(labs.body, /\$99/);
    assert.doesNotMatch(labs.body, /\$199/);
    assert.doesNotMatch(labs.body, /stripe/i);
  });

  it('serves an honest Labs docs outline that is not the form', async () => {
    const labs = await request(port, { path: '/docs', headers: { host: 'aorilalabs.com' } });
    assert.equal(labs.status, 200);
    assert.match(labs.body, /<title>API documentation — Aorila Labs<\/title>/);
    assert.match(labs.body, /og:url" content="https:\/\/aorilalabs.com\/docs"/);
    assert.match(labs.body, /canonical" href="https:\/\/aorilalabs.com\/docs"/);
    assert.match(labs.body, /Documentation ships with access/);
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
    assert.match(consumer.body, /Documentation ships with access/);
    assert.doesNotMatch(consumer.body, /chat\/completions/);
    assert.doesNotMatch(consumer.body, /form class="waitlist"/);
  });

  it('shares one Apple black-and-white stylesheet', async () => {
    const css = await request(port, { path: '/styles.css' });
    assert.equal(css.status, 200);
    assert.match(css.body, /--ink: #000000/);
    assert.match(css.body, /--paper: #ffffff/);
    assert.match(css.body, /Inter/);
    assert.match(css.body, /--radius-pill/);
    assert.match(css.body, /body\.landing/);
    assert.match(css.body, /\.waitlist/);
    assert.match(css.body, /\.api-lock/);
    assert.doesNotMatch(css.body, /#1f6bff/);
    assert.doesNotMatch(css.body, /Syne/);
    assert.match(css.body, /\.footer-links/);
    assert.match(css.body, /footer \{[\s\S]*max-width: none/);
    assert.match(css.body, /\.labs-split/);
  });

  it('serves a favicon', async () => {
    const res = await request(port, { path: '/favicon.svg' });
    assert.equal(res.status, 200);
    assert.match(res.body, /<svg/);
  });

  it('serves T & P and Support on both hosts with matching footers', async () => {
    const consumerTp = await request(port, { path: '/tp', headers: { host: 'aorila.com' } });
    assert.equal(consumerTp.status, 200);
    assert.match(consumerTp.body, /class="landing"/);
    assert.match(consumerTp.body, /<h1>T &amp; P<\/h1>/);
    assert.match(consumerTp.body, /What we collect/);
    assert.match(consumerTp.body, /Emails you send to/);
    assert.match(consumerTp.body, /api@aorila\.com/);
    assert.match(consumerTp.body, /href="\/about"/);
    assert.match(consumerTp.body, /href="\/tp"/);
    assert.match(consumerTp.body, /href="\/support"/);
    assert.doesNotMatch(consumerTp.body, /href="\/privacy"/);
    assert.doesNotMatch(consumerTp.body, /href="\/terms"/);
    assert.doesNotMatch(consumerTp.body, /This page covers aorila\.com/);
    assert.doesNotMatch(consumerTp.body, /Effective/);
    assert.doesNotMatch(consumerTp.body, /request logs/);
    assert.doesNotMatch(consumerTp.body, /We do not sell it/);
    assert.doesNotMatch(consumerTp.body, /have their own pages/);

    const privacyRedirect = await request(port, { path: '/privacy', headers: { host: 'aorila.com' } });
    assert.equal(privacyRedirect.status, 301);
    assert.match(String(privacyRedirect.headers.location || ''), /\/tp/);

    const consumerSupport = await request(port, { path: '/support', headers: { host: 'aorila.com' } });
    assert.equal(consumerSupport.status, 200);
    assert.match(consumerSupport.body, /class="landing"/);
    assert.doesNotMatch(consumerSupport.body, /<h1>Support<\/h1>/);
    assert.match(consumerSupport.body, /Questions:/);
    assert.match(consumerSupport.body, /api@aorila\.com/);
    assert.doesNotMatch(consumerSupport.body, /Effective/);
    assert.doesNotMatch(consumerSupport.body, /hero-badge/);
    assert.doesNotMatch(consumerSupport.body, /These terms cover/);
    assert.doesNotMatch(consumerSupport.body, /There is no checkout/);
    assert.doesNotMatch(consumerSupport.body, /Access is granted by Aorila/);
    assert.doesNotMatch(consumerSupport.body, /have their own terms/);
    assert.match(consumerSupport.body, /href="\/support"/);
    assert.match(consumerSupport.body, /href="\/tp"/);

    const termsRedirect = await request(port, { path: '/terms', headers: { host: 'aorila.com' } });
    assert.equal(termsRedirect.status, 301);
    assert.match(String(termsRedirect.headers.location || ''), /\/support/);

    for (const path of ['/tp', '/support']) {
      const res = await request(port, { path, headers: { host: 'aorilalabs.com' } });
      assert.equal(res.status, 200, `aorilalabs.com${path}`);
      assert.match(res.body, /<h1>/);
      assert.match(res.body, /api@aorila\.com/);
      assert.doesNotMatch(res.body, /href="\/about"/);
      assert.match(res.body, /href="\/tp"/);
      assert.match(res.body, /href="\/support"/);
      assert.doesNotMatch(res.body, /href="\/privacy"/);
      assert.doesNotMatch(res.body, /href="\/terms"/);
      assert.doesNotMatch(res.body, /<span>Aorila<\/span>/);
      assert.match(res.body, /href="https:\/\/aorilalabs\.com"[^>]*>Aorila Labs</);
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
    assert.match(aboutPage.body, /The Future of AI Innovation/);
    const labsAboutGone = await request(port, { path: '/about', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsAboutGone.status, 404);

    const labsTp = await request(port, { path: '/tp', headers: { host: 'aorilalabs.com' } });
    assert.match(labsTp.body, /work email/i);
    assert.match(labsTp.body, /volume estimate/i);
    assert.doesNotMatch(labsTp.body, /Atraly/);

    const labsSupport = await request(port, { path: '/support', headers: { host: 'aorilalabs.com' } });
    assert.match(labsSupport.body, /Submitting the form is a request/);
    assert.doesNotMatch(labsSupport.body, /Atraly/);

    const labsPrivacyRedirect = await request(port, { path: '/privacy', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsPrivacyRedirect.status, 301);
    assert.match(String(labsPrivacyRedirect.headers.location || ''), /\/tp/);
    const labsTermsRedirect = await request(port, { path: '/terms', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsTermsRedirect.status, 301);
    assert.match(String(labsTermsRedirect.headers.location || ''), /\/support/);
  });

  it('returns a filled 404 with legal links', async () => {
    const res = await request(port, { path: '/missing-page', headers: { host: 'aorila.com' } });
    assert.equal(res.status, 404);
    assert.match(res.body, /Try home, API access, T &amp; P, or Support/);
    assert.match(res.body, />API access</);
    assert.match(res.body, /href="https:\/\/api\.aorila\.com\/"/);
    assert.doesNotMatch(res.body, /API docs/);
    assert.doesNotMatch(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/tp"/);
    assert.match(res.body, /href="\/support"/);
    assert.doesNotMatch(res.body, /href="\/privacy"/);
    assert.doesNotMatch(res.body, /href="\/terms"/);
  });
});
