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
    assert.match(res.body, /We build the AI/);
    assert.match(res.body, /Atraly v1/);
    assert.match(res.body, /Atraly v1\.5/);
    assert.match(res.body, /Atraly v2\.0/);
    assert.match(res.body, /Powered by Aorila/);
    assert.match(res.body, /https:\/\/atraly\.com/);
    assert.match(res.body, /\$29/);
    assert.match(res.body, /Builder/);
    assert.match(res.body, /Early access — may change/);
    assert.match(res.body, /hello@aorila\.com/);
    assert.match(res.body, /form class="waitlist"/);
    assert.match(res.body, /data-mailto="hello@aorila\.com"/);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.doesNotMatch(res.body, /Higher-quality AI for businesses/);
  });

  it('serves Labs commercial copy on aorilalabs.com', async () => {
    const res = await request(port, { headers: { host: 'www.aorilalabs.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Aorila Labs/);
    assert.match(res.body, /Higher-quality AI for businesses/);
    assert.match(res.body, /Atraly v1\.5/);
    assert.match(res.body, /\$199/);
    assert.match(res.body, /Shared/);
    assert.match(res.body, /1\.5×/);
    assert.match(res.body, /RunPod/);
    assert.match(res.body, /sales@aorilalabs\.com/);
    assert.match(res.body, /Early access — may change/);
    assert.match(res.body, /form class="waitlist"/);
    assert.match(res.body, /data-mailto="sales@aorilalabs\.com"/);
    assert.match(res.body, /Atraly-partner internal/);
    assert.doesNotMatch(res.body, /stripe/i);
    assert.doesNotMatch(res.body, /We build the AI/);
    const publicPrice = res.body.replace(/<p class="partner-note">[\s\S]*?<\/p>/, '');
    assert.doesNotMatch(publicPrice, /\$99 \/ month/);
  });

  it('preview via ?site=labs on localhost', async () => {
    const res = await request(port, { path: '/?site=labs', headers: { host: 'localhost' } });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Atraly v1\.5/);
    assert.match(String(res.headers['set-cookie'] || ''), /aorila_site=labs/);
  });

  it('keeps Labs preview on later paths via cookie', async () => {
    const res = await request(port, {
      path: '/api',
      headers: { host: 'localhost', cookie: 'aorila_site=labs' },
    });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /atraly-v1\.5/);
  });

  it('preview via X-Aorila-Site header', async () => {
    const res = await request(port, {
      headers: { host: 'aorila.onrender.com', 'x-aorila-site': 'labs' },
    });
    assert.equal(res.headers['x-aorila-site'], 'labs');
    assert.match(res.body, /Request access/);
  });

  it('serves site-specific API docs with SKU ids', async () => {
    const consumer = await request(port, { path: '/api', headers: { host: 'aorila.com' } });
    assert.match(consumer.body, /atraly-v1/);
    assert.match(consumer.body, /Atraly v1/);
    assert.match(consumer.body, /api\.aorila\.com/);
    assert.match(consumer.body, /\$29\/mo/);
    assert.match(consumer.body, /hello@aorila\.com/);
    assert.match(consumer.body, /form class="waitlist"/);
    assert.doesNotMatch(consumer.body, /stripe/i);

    const labs = await request(port, { path: '/docs', headers: { host: 'aorilalabs.com' } });
    assert.match(labs.body, /atraly-v1\.5/);
    assert.match(labs.body, /Atraly v1\.5/);
    assert.match(labs.body, /api\.aorilalabs\.com/);
    assert.match(labs.body, /\$199\/mo/);
    assert.match(labs.body, /sales@aorilalabs\.com/);
    assert.match(labs.body, /form class="waitlist"/);
    assert.match(labs.body, /Atraly-partner internal/);
    assert.doesNotMatch(labs.body, /shared \(\$99/i);
    assert.doesNotMatch(labs.body, /stripe/i);
  });

  it('shares one stylesheet', async () => {
    const css = await request(port, { path: '/styles.css' });
    assert.equal(css.status, 200);
    assert.match(css.body, /--font-display/);
    assert.match(css.body, /data-site="labs"/);
    assert.match(css.body, /\.waitlist/);
  });
});
