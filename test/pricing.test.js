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

  it('refuses to start a pod for an offer that is not in the live catalog', async () => {
    const res = await req(port, {
      method: 'POST', path: '/console/start', headers: { ...formHeaders, cookie },
      body: form({ sku: 'rtx4090', offerId: 'not-a-real-offer' }),
    });
    assert.equal(res.status, 303);
    assert.match(decodeURIComponent(res.headers.location), /not in the live catalog/);
  });

  it('ignores an attacker-supplied price in the request body', async () => {
    const res = await req(port, {
      method: 'POST', path: '/console/start', headers: { ...formHeaders, cookie },
      body: form({ sku: 'rtx4090', usdPerHour: '0.01', price: '0.01' }),
    });
    assert.equal(res.status, 303);
    assert.match(decodeURIComponent(res.headers.location), /not in the live catalog/);
  });

  it('shows no fabricated prices on the console pods page', async () => {
    const res = await req(port, { path: '/console/pods', headers: { cookie } });
    assert.equal(res.status, 200);
    // Fakes we removed: never let them reappear.
    assert.doesNotMatch(res.body, /\$0\.29/);
    assert.doesNotMatch(res.body, /\$0\.45/);
    assert.doesNotMatch(res.body, /\$2\.49/);
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
