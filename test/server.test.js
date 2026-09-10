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
    assert.match(res.body, /class="landing"/);
    assert.match(res.body, /Atraly V1 • Early Access/);
    assert.match(res.body, /The Future Of AI Innovation/);
    assert.match(res.body, /Request an API key/);
    assert.doesNotMatch(res.body, /We build the AI/);
    assert.doesNotMatch(res.body, /class="lede"/);
    assert.doesNotMatch(res.body, /form class="waitlist"/);
    assert.doesNotMatch(res.body, /<footer/);
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
    assert.deepEqual(navApi, ['/api']);
    const requestKey = hrefs(home.body, 'Request an API key');
    assert.ok(requestKey.length >= 1);
    for (const href of requestKey) {
      assert.equal(href, '/api');
      assert.doesNotMatch(href, /^mailto:/i);
    }
    assert.doesNotMatch(home.body, /href="#waitlist"/);
    assert.doesNotMatch(home.body, /mailto:hello@aorila\.com/);
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

  it('strips the consumer API page to Atraly + api@aorila.com', async () => {
    const consumer = await request(port, { path: '/api', headers: { host: 'aorila.com' } });
    assert.equal(consumer.status, 200);
    assert.match(consumer.body, /Find Aorila on/);
    assert.match(consumer.body, /https:\/\/atraly\.com/);
    assert.match(consumer.body, />Atraly</);
    assert.match(consumer.body, /<hr class="hairline"/);
    assert.match(consumer.body, /Contact <a href="mailto:api@aorila\.com">api@aorila\.com<\/a> for API inquiries/);
    assert.doesNotMatch(consumer.body, /form class="waitlist"/);
    assert.doesNotMatch(consumer.body, /action="\/leads"/);
    assert.doesNotMatch(consumer.body, /hello@aorila\.com/);
    assert.doesNotMatch(consumer.body, /chat\/completions/);
    assert.doesNotMatch(consumer.body, /api\.aorila\.com/);
    assert.doesNotMatch(consumer.body, /compute cost \+ Aorila fee/);
    assert.doesNotMatch(consumer.body, /Request an API key/);
    assert.doesNotMatch(consumer.body, /\$29/);
    assert.doesNotMatch(consumer.body, /stripe/i);
  });

  it('serves the Labs API page as the same request-access form', async () => {
    const labs = await request(port, { path: '/docs', headers: { host: 'aorilalabs.com' } });
    assert.match(labs.body, /<title>Aorila Labs — Request API access<\/title>/);
    assert.match(labs.body, /Request API access/);
    assert.match(labs.body, /api@aorila\.com/);
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
  });
});
