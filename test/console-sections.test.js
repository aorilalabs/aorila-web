const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.COMPUTE_ORIGIN = 'http://127.0.0.1:1'; // no live provider data in tests
process.env.AORILA_AUTH_MODE = 'local'; // hermetic auth in tests: no live Supabase calls
const { createApp } = require('../server');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aorila-console-'));
process.env.DATA_DIR = dataDir;

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
  const setCookie = res.headers['set-cookie'] || [];
  const m = String(setCookie.join(';')).match(/aorila_sid=([^;]+)/);
  return m ? `aorila_sid=${m[1]}` : '';
};
const email = () => `qa-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

describe('parent console: account + billing only, compute lives on Labs', () => {
  let server;
  let port;
  let sid;

  before(() => new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', async () => {
      port = server.address().port;
      const res = await req(port, {
        method: 'POST',
        path: '/signup',
        headers: formHeaders,
        body: form({ email: email(), password: 'password123', name: 'QA' }),
      });
      assert.equal(res.status, 303);
      sid = sidFrom(res);
      assert.ok(sid);
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  const authed = (opts = {}) => req(port, { ...opts, headers: { ...(opts.headers || {}), cookie: sid } });

  it('serves home, account, and billing', async () => {
    for (const [path, title] of [['/console', 'Welcome back'], ['/console/account', 'Account'], ['/console/billing', 'Billing']]) {
      const res = await authed({ path });
      assert.equal(res.status, 200, path);
      assert.match(res.body, new RegExp(title), path);
    }
  });

  it('redirects removed compute sections back to the console home', async () => {
    for (const path of ['/console/hub', '/console/serverless', '/console/pods', '/console/clusters', '/console/storage', '/console/deployments']) {
      const res = await authed({ path });
      assert.equal(res.status, 302, path);
      assert.equal(res.headers.location, '/console', path);
    }
  });

  it('no longer has compute creation routes', async () => {
    // Single-segment unknowns hit /console/:section and bounce home.
    for (const path of ['/console/new', '/console/pods', '/console/clusters']) {
      const res = await authed({ path });
      assert.equal(res.status, 302, path);
      assert.equal(res.headers.location, '/console', path);
    }
    // Multi-segment compute paths are gone entirely.
    for (const path of ['/console/pods/new', '/console/pods/abc', '/console/serverless/new', '/console/storage/new', '/console/clusters/new', '/console/deployments/new']) {
      const res = await authed({ path });
      assert.equal(res.status, 404, path);
    }
  });

  it('console nav has no compute tabs and points compute at the Labs dashboard', async () => {
    const res = await authed({ path: '/console' });
    assert.equal(res.status, 200);
    assert.doesNotMatch(res.body, /\/console\/pods/);
    assert.doesNotMatch(res.body, /\/console\/clusters/);
    assert.doesNotMatch(res.body, /\/console\/serverless/);
    assert.doesNotMatch(res.body, /\/console\/storage/);
    assert.doesNotMatch(res.body, /\/console\/hub/);
    assert.match(res.body, /https:\/\/dashboard\.aorilalabs\.com\//);
  });

  it('brands the commercial surface as Capacity, not Enterprise', async () => {
    for (const path of ['/commercial', '/commercial/vms', '/commercial/console']) {
      const res = await authed({ path });
      assert.equal(res.status, 200, path);
      assert.doesNotMatch(res.body, /Enterprise/, path);
    }
    const portal = await authed({ path: '/commercial/console' });
    assert.match(portal.body, /Capacity portal/);
  });
});
