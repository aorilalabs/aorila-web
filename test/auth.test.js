const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.COMPUTE_ORIGIN = 'http://127.0.0.1:1'; // no live provider data in tests
const { createApp } = require('../server');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aorila-auth-'));

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

describe('auth, sessions, and redirect safety', () => {
  let server;
  let port;

  before(() => new Promise((resolve) => {
    server = createApp({ dataDir }).listen(0, '127.0.0.1', () => {
      port = server.address().port;
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  it('signs up, issues a session cookie, and opens the console', async () => {
    const res = await req(port, {
      method: 'POST', path: '/signup', headers: formHeaders,
      body: form({ name: 'QA', email: email(), password: 'correct-horse-8' }),
    });
    assert.equal(res.status, 303);
    assert.equal(res.headers.location, '/console');
    const cookie = sidFrom(res);
    assert.ok(cookie.startsWith('aorila_sid='), 'session cookie issued');

    const consoleRes = await req(port, { path: '/console', headers: { cookie } });
    assert.equal(consoleRes.status, 200);
  });

  it('logs out, clears the session, and locks the console', async () => {
    const em = email();
    const signup = await req(port, {
      method: 'POST', path: '/signup', headers: formHeaders,
      body: form({ name: 'QA', email: em, password: 'correct-horse-8' }),
    });
    const cookie = sidFrom(signup);
    const logout = await req(port, { method: 'POST', path: '/logout', headers: { cookie } });
    assert.equal(logout.status, 303);

    const afterLogout = await req(port, { path: '/console', headers: { cookie } });
    assert.equal(afterLogout.status, 302);
    assert.match(afterLogout.headers.location, /^\/login\?next=/);

    const anon = await req(port, { path: '/console' });
    assert.equal(anon.status, 302);
    assert.match(anon.headers.location, /^\/login\?next=/);
  });

  it('rejects wrong passwords and accepts the right one', async () => {
    const em = email();
    await req(port, {
      method: 'POST', path: '/signup', headers: formHeaders,
      body: form({ name: 'QA', email: em, password: 'correct-horse-8' }),
    });
    const bad = await req(port, {
      method: 'POST', path: '/login', headers: formHeaders,
      body: form({ email: em, password: 'wrong-password' }),
    });
    assert.equal(bad.status, 401);

    const good = await req(port, {
      method: 'POST', path: '/login', headers: formHeaders,
      body: form({ email: em, password: 'correct-horse-8' }),
    });
    assert.equal(good.status, 303);
    assert.equal(good.headers.location, '/console');
    const cookie = sidFrom(good);
    const consoleRes = await req(port, { path: '/console', headers: { cookie } });
    assert.equal(consoleRes.status, 200);
  });

  it('rejects forged session cookies', async () => {
    const res = await req(port, { path: '/console', headers: { cookie: 'aorila_sid=forged-value' } });
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /^\/login\?next=/);
  });

  it('never redirects login/signup to an external URL', async () => {
    const evil = 'https://evil.example/phish';
    const s1 = await req(port, {
      method: 'POST', path: '/signup', headers: formHeaders,
      body: form({ name: 'QA', email: email(), password: 'correct-horse-8', next: evil }),
    });
    assert.equal(s1.status, 303);
    assert.equal(s1.headers.location, '/console');

    const em = email();
    await req(port, {
      method: 'POST', path: '/signup', headers: formHeaders,
      body: form({ name: 'QA', email: em, password: 'correct-horse-8' }),
    });
    const l1 = await req(port, {
      method: 'POST', path: '/login', headers: formHeaders,
      body: form({ email: em, password: 'correct-horse-8', next: '//evil.example/x' }),
    });
    assert.equal(l1.status, 303);
    assert.equal(l1.headers.location, '/console');

    const cookie = sidFrom(l1);
    const g1 = await req(port, { path: `/login?next=${encodeURIComponent(evil)}`, headers: { cookie } });
    assert.equal(g1.status, 302);
    assert.equal(g1.headers.location, '/console');
  });

  it('keeps safe same-origin next targets working', async () => {
    const em = email();
    const signup = await req(port, {
      method: 'POST', path: '/signup', headers: formHeaders,
      body: form({ name: 'QA', email: em, password: 'correct-horse-8', next: '/console/billing' }),
    });
    assert.equal(signup.status, 303);
    assert.equal(signup.headers.location, '/console/billing');
  });
});
