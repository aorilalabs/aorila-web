const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp, ALLOWED_CORS_ORIGINS } = require('../server');

function request(port, { path = '/', method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('backend CORS allowlist', () => {
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

  it('allows only the documented frontend origins', async () => {
    assert.deepEqual(
      Array.from(ALLOWED_CORS_ORIGINS).sort(),
      [
        'https://aorila.com',
        'https://aorilalabs.com',
        'https://robotics.aorila.com',
        'https://www.aorila.com',
        'https://www.aorilalabs.com',
      ].sort()
    );
  });

  it('answers allowed preflights without wildcard CORS', async () => {
    const res = await request(port, {
      path: '/leads',
      method: 'OPTIONS',
      headers: {
        host: 'api.aorila.com',
        origin: 'https://aorila.com',
        'access-control-request-method': 'POST',
      },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers['access-control-allow-origin'], 'https://aorila.com');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
    assert.match(res.headers['access-control-allow-methods'] || '', /POST/);
    assert.notEqual(res.headers['access-control-allow-origin'], '*');
  });

  it('rejects disallowed preflights', async () => {
    const res = await request(port, {
      path: '/compute/v1/gpus',
      method: 'OPTIONS',
      headers: {
        host: 'api.aorila.com',
        origin: 'https://evil.example',
        'access-control-request-method': 'GET',
      },
    });
    assert.equal(res.status, 403);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });
});
