const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('node:http');
const { createVendorStore, getCatalog } = require('../lib/vendors');
const { createApp } = require('../server');

function request(port, { path: urlPath = '/', method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method, headers },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('vendor catalog', () => {
  it('lists tiers, regions, and GPU SKUs we accept', () => {
    const catalog = getCatalog();
    assert.ok(catalog.tiers.some((t) => t.id === 'open'));
    assert.ok(catalog.tiers.some((t) => t.id === 'secure'));
    assert.ok(catalog.regions.length >= 10);
    assert.ok(catalog.gpus.some((g) => g.id === 'h100-sxm'));
    assert.ok(catalog.gpus.some((g) => g.id === '4090'));
    assert.ok(catalog.statuses.includes('applied'));
    assert.ok(catalog.statuses.includes('active'));
  });
});

describe('vendor store', () => {
  it('creates an applied vendor from a provider lead', () => {
    const file = path.join(os.tmpdir(), `aorila-vendors-${process.pid}-${Date.now()}.json`);
    const store = createVendorStore(file);
    const vendor = store.applyFromLead(
      {
        id: 'lead-1',
        email: 'host@example.com',
        name: 'Sam Host',
        company: 'Northwind GPUs',
        notes: '8x H100',
        volume: '8 live',
        website: 'https://northwind.example',
      },
      { tier: 'open', regions: ['us-east'] }
    );
    assert.equal(vendor.status, 'applied');
    assert.equal(vendor.tier, 'open');
    assert.equal(vendor.company, 'Northwind GPUs');
    assert.deepEqual(vendor.regions, ['us-east']);
    assert.equal(store.listPublic().length, 0);

    const active = store.update(vendor.id, { status: 'active' });
    assert.equal(active.status, 'active');
    assert.ok(active.activatedAt);
    assert.equal(store.listPublic().length, 1);
    fs.unlinkSync(file);
  });
});

describe('vendor HTTP + provider lead wiring', () => {
  let server;
  let port;
  let leadsPath;
  let vendorsPath;
  const prevToken = process.env.VENDOR_OPS_TOKEN;

  before(() => new Promise((resolve) => {
    leadsPath = path.join(os.tmpdir(), `aorila-leads-v-${process.pid}-${Date.now()}.json`);
    vendorsPath = path.join(os.tmpdir(), `aorila-vendors-v-${process.pid}-${Date.now()}.json`);
    process.env.VENDOR_OPS_TOKEN = 'test-ops-token';
    server = createApp({ leadsPath, vendorsPath }).listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    if (prevToken === undefined) delete process.env.VENDOR_OPS_TOKEN;
    else process.env.VENDOR_OPS_TOKEN = prevToken;
    server.close((err) => {
      try { fs.unlinkSync(leadsPath); } catch { /* ignore */ }
      try { fs.unlinkSync(vendorsPath); } catch { /* ignore */ }
      return err ? reject(err) : resolve();
    });
  }));

  it('exposes the public vendor catalog', async () => {
    const res = await request(port, {
      path: '/api/vendors/catalog',
      headers: { host: 'aorila.com', accept: 'application/json' },
    });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);
    assert.ok(json.catalog.gpus.length > 5);
  });

  it('lists no public vendors until activated', async () => {
    const res = await request(port, {
      path: '/api/vendors',
      headers: { host: 'aorila.com', accept: 'application/json' },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.body).vendors, []);
  });

  it('turns a provider lead into a draft vendor and lets ops activate it', async () => {
    const body = JSON.stringify({
      email: 'fleet@example.com',
      name: 'Jordan',
      company: 'Fleet Compute',
      use_case: '16x H200',
      volume: '16 GPUs',
      kind: 'provider',
      site: 'consumer',
      tier: 'secure',
    });
    const create = await request(port, {
      path: '/leads',
      method: 'POST',
      headers: {
        host: 'aorila.com',
        'content-type': 'application/json',
        accept: 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      body,
    });
    assert.equal(create.status, 201);
    const created = JSON.parse(create.body);
    assert.ok(created.vendorId);

    const denied = await request(port, {
      path: '/api/ops/vendors',
      headers: { host: 'aorila.com', accept: 'application/json' },
    });
    assert.equal(denied.status, 401);

    const listed = await request(port, {
      path: '/api/ops/vendors',
      headers: {
        host: 'aorila.com',
        accept: 'application/json',
        authorization: 'Bearer test-ops-token',
      },
    });
    assert.equal(listed.status, 200);
    const rows = JSON.parse(listed.body).vendors;
    assert.ok(rows.some((v) => v.id === created.vendorId && v.status === 'applied'));

    const patchBody = JSON.stringify({ status: 'active' });
    const patched = await request(port, {
      path: `/api/ops/vendors/${created.vendorId}`,
      method: 'PATCH',
      headers: {
        host: 'aorila.com',
        accept: 'application/json',
        authorization: 'Bearer test-ops-token',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(patchBody),
      },
      body: patchBody,
    });
    assert.equal(patched.status, 200);
    assert.equal(JSON.parse(patched.body).vendor.status, 'active');

    const pub = await request(port, {
      path: '/api/vendors',
      headers: { host: 'aorila.com', accept: 'application/json' },
    });
    const vendors = JSON.parse(pub.body).vendors;
    assert.ok(vendors.some((v) => v.id === created.vendorId));
  });

  it('healthz names the subsystems', async () => {
    const res = await request(port, {
      path: '/healthz',
      headers: { host: 'aorila.com', accept: 'application/json' },
    });
    assert.equal(res.status, 200);
    const json = JSON.parse(res.body);
    assert.deepEqual(json.subsystems, ['marketing', 'leads', 'vendors', 'routing']);
  });
});
