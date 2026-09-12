const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('node:http');
const { createLeadStore } = require('../lib/leads');
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

describe('lead store', () => {
  it('persists a valid Labs contact', () => {
    const file = path.join(os.tmpdir(), `aorila-leads-${process.pid}-${Date.now()}.json`);
    const store = createLeadStore(file);
    const result = store.add(
      {
        email: 'ops@acme.com',
        name: 'Pat Ops',
        company: 'Acme',
        plan: 'dedicated',
        notes: 'Need an L40S',
        volume: '4 GPUs',
      },
      { site: 'labs', kind: 'contact', host: 'aorilalabs.com' }
    );
    assert.equal(result.ok, true);
    assert.ok(result.id);
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'ops@acme.com');
    assert.equal(rows[0].company, 'Acme');
    assert.equal(rows[0].site, 'labs');
    fs.unlinkSync(file);
  });

  it('rejects a missing email', () => {
    const file = path.join(os.tmpdir(), `aorila-leads-bad-${process.pid}.json`);
    const store = createLeadStore(file);
    assert.throws(() => store.add({ company: 'Acme' }, { site: 'labs' }), /email/i);
  });

  it('rejects Labs contact missing required fields', () => {
    const file = path.join(os.tmpdir(), `aorila-leads-fields-${process.pid}.json`);
    const store = createLeadStore(file);
    assert.throws(
      () => store.add({ email: 'ops@acme.com' }, { site: 'labs', kind: 'contact' }),
      /company/i
    );
    assert.throws(
      () =>
        store.add(
          { email: 'ops@acme.com', company: 'Acme' },
          { site: 'labs', kind: 'contact' }
        ),
      /name/i
    );
    assert.throws(
      () =>
        store.add(
          { email: 'ops@acme.com', company: 'Acme', name: 'Pat' },
          { site: 'labs', kind: 'contact' }
        ),
      /use case/i
    );
    assert.throws(
      () =>
        store.add(
          { email: 'ops@acme.com', company: 'Acme', name: 'Pat', use_case: 'Agents' },
          { site: 'labs', kind: 'contact' }
        ),
      /volume/i
    );
  });

  it('rejects provider application missing required fields', () => {
    const file = path.join(os.tmpdir(), `aorila-leads-provider-fields-${process.pid}.json`);
    const store = createLeadStore(file);
    assert.throws(
      () =>
        store.add(
          { email: 'host@example.com', kind: 'provider' },
          { site: 'consumer', kind: 'provider' }
        ),
      /company/i
    );
  });

  it('ignores honeypot spam', () => {
    const file = path.join(os.tmpdir(), `aorila-leads-spam-${process.pid}.json`);
    const store = createLeadStore(file);
    const result = store.add({ email: 'bot@spam.test', fax: 'https://spam.test' }, { site: 'labs' });
    assert.equal(result.ignored, true);
    assert.equal(store.list().length, 0);
  });

  it('stores optional website and volume on a Labs contact', () => {
    const file = path.join(os.tmpdir(), `aorila-leads-web-${process.pid}-${Date.now()}.json`);
    const store = createLeadStore(file);
    const result = store.add(
      {
        email: 'ops@acme.com',
        name: 'Pat',
        company: 'Acme',
        use_case: 'Internal agents',
        volume: '10M tokens / month',
        website: 'https://acme.com',
      },
      { site: 'labs', kind: 'contact', host: 'aorilalabs.com' }
    );
    assert.equal(result.ok, true);
    const row = store.list()[0];
    assert.equal(row.website, 'https://acme.com');
    assert.equal(row.volume, '10M tokens / month');
    assert.match(row.notes, /Internal agents/);
    assert.match(row.notes, /10M tokens \/ month/);
    fs.unlinkSync(file);
  });
});

describe('POST /leads', () => {
  let server;
  let port;
  let leadsPath;

  before(() => new Promise((resolve) => {
    leadsPath = path.join(os.tmpdir(), `aorila-leads-http-${process.pid}-${Date.now()}.json`);
    server = createApp({ leadsPath }).listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    server.close((err) => {
      try { fs.unlinkSync(leadsPath); } catch { /* ignore */ }
      err ? reject(err) : resolve();
    });
  }));

  it('stores a Labs contact as JSON', async () => {
    const body = JSON.stringify({
      email: 'sales-lead@example.com',
      name: 'Sam Example',
      company: 'Example Co',
      use_case: 'API for agents',
      volume: '50 seats',
      website: 'https://example.com',
      kind: 'contact',
    });
    const res = await request(port, {
      path: '/leads',
      method: 'POST',
      headers: {
        host: 'aorilalabs.com',
        'content-type': 'application/json',
        accept: 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      body,
    });
    assert.equal(res.status, 201);
    const json = JSON.parse(res.body);
    assert.equal(json.ok, true);
    assert.ok(json.id);
    const rows = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
    assert.equal(rows.at(-1).email, 'sales-lead@example.com');
    assert.equal(rows.at(-1).site, 'labs');
    assert.equal(rows.at(-1).kind, 'contact');
    assert.equal(rows.at(-1).website, 'https://example.com');
    assert.equal(rows.at(-1).volume, '50 seats');
    assert.match(rows.at(-1).notes, /API for agents/);
  });

  it('stores a consumer waitlist lead', async () => {
    const body = JSON.stringify({
      email: 'builder@example.com',
      name: 'Ada',
      use_case: 'Personal agent',
      kind: 'waitlist',
    });
    const res = await request(port, {
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
    assert.equal(res.status, 201);
    const rows = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
    const last = rows.at(-1);
    assert.equal(last.email, 'builder@example.com');
    assert.equal(last.site, 'consumer');
    assert.equal(last.kind, 'waitlist');
    assert.equal(last.notes, 'Personal agent');
  });

  it('stores a provider application lead', async () => {
    const body = JSON.stringify({
      email: 'host@example.com',
      name: 'Alex Rivera',
      company: 'Northwind Colo',
      use_case: '8x H100 Ashburn',
      volume: '64 GPUs',
      kind: 'provider',
      site: 'consumer',
    });
    const res = await request(port, {
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
    assert.equal(res.status, 201);
    const rows = JSON.parse(fs.readFileSync(leadsPath, 'utf8'));
    const last = rows.at(-1);
    assert.equal(last.kind, 'provider');
    assert.equal(last.site, 'consumer');
    assert.equal(last.company, 'Northwind Colo');
    assert.match(last.notes, /8x H100/);
  });

  it('returns 400 for invalid email', async () => {
    const body = JSON.stringify({ email: 'not-an-email', company: 'X' });
    const res = await request(port, {
      path: '/leads',
      method: 'POST',
      headers: {
        host: 'aorilalabs.com',
        'content-type': 'application/json',
        accept: 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      body,
    });
    assert.equal(res.status, 400);
    assert.match(res.body, /email/i);
  });

  it('returns 400 when Labs contact omits use case', async () => {
    const body = JSON.stringify({
      email: 'ops@acme.com',
      name: 'Pat',
      company: 'Acme',
      volume: '10M tokens',
      kind: 'contact',
    });
    const res = await request(port, {
      path: '/leads',
      method: 'POST',
      headers: {
        host: 'aorilalabs.com',
        'content-type': 'application/json',
        accept: 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      body,
    });
    assert.equal(res.status, 400);
    assert.match(res.body, /use case/i);
  });

  it('rejects cross-origin lead posts', async () => {
    const body = JSON.stringify({
      email: 'ops@acme.com',
      name: 'Pat',
      company: 'Acme',
      use_case: 'Agents',
      volume: '10M',
      kind: 'contact',
    });
    const res = await request(port, {
      path: '/leads',
      method: 'POST',
      headers: {
        host: 'aorilalabs.com',
        origin: 'https://evil.example',
        'content-type': 'application/json',
        accept: 'application/json',
        'content-length': Buffer.byteLength(body),
      },
      body,
    });
    assert.equal(res.status, 403);
  });
});
