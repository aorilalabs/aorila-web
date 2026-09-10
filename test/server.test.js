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
  const re = new RegExp(`href="([^"]+)"[^>]*>\\s*${label}\\s*<`, 'g');
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
    assert.match(res.body, /Aorila builds AI/);
    assert.match(res.body, /Request an API key/);
    assert.match(res.body, /href="https:\/\/aorilalabs\.com"[^>]*>Labs</);
    assert.match(res.body, /<footer/);
    assert.match(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/privacy"/);
    assert.match(res.body, /href="\/terms"/);
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

  it('sends every consumer request-key CTA to the same href as the nav API control', async () => {
    const home = await request(port, { headers: { host: 'aorila.com' } });
    const navApi = hrefs(home.body, 'API');
    assert.deepEqual(navApi, ['https://api.aorila.com']);
    const requestKey = hrefs(home.body, 'Request an API key');
    assert.ok(requestKey.length >= 1);
    for (const href of requestKey) {
      assert.equal(href, 'https://api.aorila.com');
      assert.doesNotMatch(href, /^mailto:/i);
    }
    assert.doesNotMatch(home.body, /href="#waitlist"/);
    assert.doesNotMatch(home.body, /mailto:hello@aorila\.com/);
  });

  it('puts Ally beside API on the consumer nav', async () => {
    const paths = ['/', '/docs', '/about', '/privacy', '/terms'];
    for (const path of paths) {
      const res = await request(port, { path, headers: { host: 'aorila.com' } });
      assert.deepEqual(hrefs(res.body, 'Ally'), ['https://ally.atraly.com']);
      assert.match(res.body, /API<\/a>\s*<a class="nav-link" href="https:\/\/ally\.atraly\.com">Ally<\/a>/);
      assert.deepEqual(hrefs(res.body, 'API'), ['https://api.aorila.com']);
    }
    const apiFace = await request(port, { path: '/', headers: { host: 'api.aorila.com' } });
    assert.deepEqual(hrefs(apiFace.body, 'Ally'), ['https://ally.atraly.com']);
    assert.match(apiFace.body, /API<\/a>\s*<a class="nav-link" href="https:\/\/ally\.atraly\.com">Ally<\/a>/);
    const labs = await request(port, { headers: { host: 'aorilalabs.com' } });
    assert.doesNotMatch(labs.body, />Ally</);
  });

  it('serves Labs as a request-API-access page on aorilalabs.com', async () => {
    const res = await request(port, { headers: { host: 'www.aorilalabs.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /<title>Aorila Labs — Request API access<\/title>/);
    assert.match(res.body, /Aorila Labs/);
    assert.match(res.body, /Request API access/);
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
    assert.match(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/privacy"/);
    assert.match(res.body, /href="\/terms"/);
  });

  it('preview via ?site=labs on localhost', async () => {
    const res = await request(port, { path: '/?site=labs', headers: { host: 'localhost' } });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Request API access/);
    assert.doesNotMatch(res.body, /Atraly/);
    assert.match(String(res.headers['set-cookie'] || ''), /aorila_site=labs/);
  });

  it('keeps Labs preview on later paths via cookie', async () => {
    const res = await request(port, {
      path: '/api',
      headers: { host: 'localhost', cookie: 'aorila_site=labs' },
    });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Request API access/);
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
  });

  it('redirects consumer /api to https://api.aorila.com/ and keeps Labs /api', async () => {
    const consumer = await request(port, { path: '/api', headers: { host: 'aorila.com' } });
    assert.equal(consumer.status, 301);
    assert.equal(consumer.headers.location, 'https://api.aorila.com/');

    const www = await request(port, { path: '/api.html', headers: { host: 'www.aorila.com' } });
    assert.equal(www.status, 301);
    assert.equal(www.headers.location, 'https://api.aorila.com/');

    const apiHost = await request(port, { path: '/api', headers: { host: 'api.aorila.com' } });
    assert.equal(apiHost.status, 301);
    assert.equal(apiHost.headers.location, '/');

    const labs = await request(port, { path: '/api', headers: { host: 'aorilalabs.com' } });
    assert.equal(labs.status, 200);
    assert.match(labs.body, /Request API access/);
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
    assert.match(labs.body, /<title>Aorila Labs — Request API access<\/title>/);
    assert.match(labs.body, /Request API access/);
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
  });

  it('serves a favicon', async () => {
    const res = await request(port, { path: '/favicon.svg' });
    assert.equal(res.status, 200);
    assert.match(res.body, /<svg/);
  });

  it('serves About, Privacy, and Terms on both hosts', async () => {
    const paths = ['/about', '/privacy', '/terms'];
    for (const host of ['aorila.com', 'aorilalabs.com']) {
      for (const path of paths) {
        const res = await request(port, { path, headers: { host } });
        assert.equal(res.status, 200, `${host}${path}`);
        assert.match(res.body, /<h1>/);
        assert.match(res.body, /api@aorila\.com/);
        assert.match(res.body, /href="\/about"/);
        assert.match(res.body, /href="\/privacy"/);
        assert.match(res.body, /href="\/terms"/);
        assert.doesNotMatch(res.body, /lorem ipsum/i);
        assert.doesNotMatch(res.body, /\bTBD\b/);
        assert.doesNotMatch(res.body, /coming soon/i);
        assert.doesNotMatch(res.body, /stripe/i);
        assert.doesNotMatch(res.body, /RunPod/i);
        assert.doesNotMatch(res.body, /Supabase/i);
        assert.doesNotMatch(res.body, /Vertex/i);
        assert.doesNotMatch(res.body, /Ollama/i);
      }
    }

    const consumerAbout = await request(port, { path: '/about', headers: { host: 'aorila.com' } });
    assert.equal(consumerAbout.headers['x-aorila-site'], 'consumer');
    assert.match(consumerAbout.body, /Aorila builds AI/);
    assert.match(consumerAbout.body, /https:\/\/ally\.atraly\.com/);
    assert.doesNotMatch(consumerAbout.body, /How the surfaces relate/);
    assert.deepEqual(hrefs(consumerAbout.body, 'Ally'), ['https://ally.atraly.com']);

    const consumerPrivacy = await request(port, { path: '/privacy', headers: { host: 'aorila.com' } });
    assert.match(consumerPrivacy.body, /What we collect/);
    assert.match(consumerPrivacy.body, /request logs/);

    const consumerTerms = await request(port, { path: '/terms', headers: { host: 'aorila.com' } });
    assert.match(consumerTerms.body, /Access is granted by Aorila/);
    assert.match(consumerTerms.body, /not automatic/);

    const labsAbout = await request(port, { path: '/about', headers: { host: 'aorilalabs.com' } });
    assert.equal(labsAbout.headers['x-aorila-site'], 'labs');
    assert.match(labsAbout.body, /<title>About — Aorila Labs<\/title>/);
    assert.match(labsAbout.body, /commercial request-access/);
    assert.doesNotMatch(labsAbout.body, /Atraly/);
    assert.doesNotMatch(labsAbout.body, />Ally</);

    const labsPrivacy = await request(port, { path: '/privacy', headers: { host: 'aorilalabs.com' } });
    assert.match(labsPrivacy.body, /work email/i);
    assert.match(labsPrivacy.body, /volume estimate/i);
    assert.doesNotMatch(labsPrivacy.body, /Atraly/);

    const labsTerms = await request(port, { path: '/terms', headers: { host: 'aorilalabs.com' } });
    assert.match(labsTerms.body, /Submitting the form is a request/);
    assert.doesNotMatch(labsTerms.body, /Atraly/);
  });

  it('returns a filled 404 with legal links', async () => {
    const res = await request(port, { path: '/missing-page', headers: { host: 'aorila.com' } });
    assert.equal(res.status, 404);
    assert.match(res.body, /Try home, API access, About, Privacy, or Terms/);
    assert.match(res.body, />API access</);
    assert.match(res.body, /href="https:\/\/api\.aorila\.com\/"/);
    assert.doesNotMatch(res.body, /API docs/);
    assert.match(res.body, /href="\/about"/);
    assert.match(res.body, /href="\/privacy"/);
    assert.match(res.body, /href="\/terms"/);
  });
});
