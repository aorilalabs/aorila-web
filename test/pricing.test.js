const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Point at a dead origin so fetchOffers() sees no live provider catalog.
process.env.COMPUTE_ORIGIN = 'http://127.0.0.1:1';
process.env.AORILA_AUTH_MODE = 'local';
const { createApp } = require('../server');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aorila-pricing-'));

function req(port, { method = 'GET', path = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

const form = (obj) => new URLSearchParams(obj).toString();
const formHeaders = { 'content-type': 'application/x-www-form-urlencoded' };
const sidFrom = (res) => {
  const m = String((res.headers['set-cookie'] || []).join(';')).match(/aorila_sid=([^;]+)/);
  return m ? `aorila_sid=${m[1]}` : '';
};

describe('pricing integrity: no fake prices reach the console', () => {
  let server;
  let port;
  let cookie;

  before(() => new Promise((resolve) => {
    server = createApp({ dataDir }).listen(0, '127.0.0.1', async () => {
      port = server.address().port;
      const signup = await req(port, {
        method: 'POST', path: '/signup', headers: formHeaders,
        body: form({ name: 'QA', email: `price-${Date.now()}@example.com`, password: 'correct-horse-8' }),
      });
      cookie = sidFrom(signup);
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  it('has no pod-start route: the parent console cannot provision compute', async () => {
    // Pods are launched from the Aorila Labs dashboard, never the parent console.
    const post = await req(port, {
      method: 'POST', path: '/console/start', headers: { ...formHeaders, cookie },
      body: form({ sku: 'rtx4090', offerId: 'not-a-real-offer' }),
    });
    assert.equal(post.status, 404, 'POST /console/start');
    const get = await req(port, { path: '/account/start', headers: { cookie } });
    assert.equal(get.status, 404, 'GET /account/start');
  });

  it('ignores attacker-supplied prices: there is no route left to attack', async () => {
    const res = await req(port, {
      method: 'POST', path: '/console/start', headers: { ...formHeaders, cookie },
      body: form({ sku: 'rtx4090', usdPerHour: '0.01', price: '0.01' }),
    });
    assert.equal(res.status, 404);
  });

  it('shows no fabricated prices: the console pods page is gone', async () => {
    const res = await req(port, { path: '/console/pods', headers: { cookie } });
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/console');
    const home = await req(port, { path: '/console', headers: { cookie } });
    assert.equal(home.status, 200);
    // Fakes we removed: never let them reappear.
    assert.doesNotMatch(home.body, /\$0\.29/);
    assert.doesNotMatch(home.body, /\$0\.45/);
    assert.doesNotMatch(home.body, /\$2\.49/);
  });

  it('shows no fabricated prices on the public pricing page', async () => {
    const res = await req(port, { path: '/pricing', headers: { host: 'aorila.com' } });
    assert.equal(res.status, 200);
    assert.match(res.body, /Early-access GPU pricing/);
    assert.match(res.body, /One \$\/hour number per GPU/i);
    assert.match(res.body, /workloads stop at \$0/i);
    assert.doesNotMatch(res.body, /\$0\.29/);
    assert.doesNotMatch(res.body, /\$0\.45/);
    assert.doesNotMatch(res.body, /\$2\.49/);
  });
});
