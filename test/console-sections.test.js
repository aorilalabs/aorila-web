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

describe('console clusters and deployments (self-serve)', () => {
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

  it('serves real clusters and deployments sections (no enterprise dead-end)', async () => {
    for (const [path, title] of [['/console/clusters', 'Clusters'], ['/console/deployments', 'Deployments']]) {
      const res = await authed({ path });
      assert.equal(res.status, 200, path);
      assert.match(res.body, new RegExp(`<h1>${title}</h1>`), path);
      assert.doesNotMatch(res.body, /Enterprise/i, path);
    }
  });

  it('shows the live-catalog cluster form, honestly empty with no offers', async () => {
    const res = await authed({ path: '/console/clusters/new' });
    assert.equal(res.status, 200);
    assert.match(res.body, /Launch a cluster/);
    // No fabricated offers: with no live catalog the page says so.
    assert.match(res.body, /No hosts online right now/);
    assert.doesNotMatch(res.body, /\$[0-9]+\.[0-9]{2}\/hr/);
  });

  it('refuses a cluster launch that is not in the live catalog', async () => {
    const res = await authed({
      method: 'POST',
      path: '/console/clusters',
      headers: formHeaders,
      body: form({ name: 'qa-cluster', nodes: '2', offer: 'h100-80gb-fake' }),
    });
    assert.equal(res.status, 303);
    assert.match(res.headers.location, /\/console\/clusters\/new\?error=/);
    assert.match(decodeURIComponent(res.headers.location), /live catalog/);
    // Nothing was provisioned.
    const page = await authed({ path: '/console/clusters' });
    assert.doesNotMatch(page.body, /qa-cluster/);
  });

  it('saves deployment specs and refuses to launch them off-catalog', async () => {
    const save = await authed({
      method: 'POST',
      path: '/console/deployments',
      headers: formHeaders,
      body: form({ name: 'qa-dep', nodes: '2', image: 'aorila/pytorch', diskGb: '20', offer: 'rtx-4090-fake' }),
    });
    assert.equal(save.status, 303);
    assert.match(save.headers.location, /\/console\/deployments\?notice=/);

    const list = await authed({ path: '/console/deployments' });
    assert.equal(list.status, 200);
    assert.match(list.body, /qa-dep/);
    const idMatch = list.body.match(/\/console\/deployments\/([a-z0-9_-]+)\/launch/);
    assert.ok(idMatch, 'launch button present');

    // Launching resolves the live catalog at launch time: fake offer refuses.
    const launch = await authed({ method: 'POST', path: `/console/deployments/${idMatch[1]}/launch` });
    assert.equal(launch.status, 303);
    assert.match(decodeURIComponent(launch.headers.location), /live catalog/);

    const del = await authed({ method: 'POST', path: `/console/deployments/${idMatch[1]}/delete` });
    assert.equal(del.status, 303);
    const after = await authed({ path: '/console/deployments' });
    assert.doesNotMatch(after.body, /qa-dep/);
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
