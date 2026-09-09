const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveSite } = require('../lib/resolve-site');

describe('resolveSite', () => {
  it('maps aorila.com and www to consumer', () => {
    assert.equal(resolveSite({ host: 'aorila.com' }), 'consumer');
    assert.equal(resolveSite({ host: 'www.aorila.com' }), 'consumer');
    assert.equal(resolveSite({ host: 'AORILA.COM:443' }), 'consumer');
  });

  it('maps aorilalabs.com and www to labs', () => {
    assert.equal(resolveSite({ host: 'aorilalabs.com' }), 'labs');
    assert.equal(resolveSite({ host: 'www.aorilalabs.com' }), 'labs');
    assert.equal(resolveSite({ host: 'www.aorilalabs.com:443' }), 'labs');
  });

  it('defaults localhost and Render hosts to consumer', () => {
    assert.equal(resolveSite({ host: 'localhost' }), 'consumer');
    assert.equal(resolveSite({ host: '127.0.0.1' }), 'consumer');
    assert.equal(resolveSite({ host: 'aorila.onrender.com' }), 'consumer');
  });

  it('lets ?site= override host (local / preview)', () => {
    assert.equal(resolveSite({ host: 'localhost', querySite: 'labs' }), 'labs');
    assert.equal(resolveSite({ host: 'aorilalabs.com', querySite: 'consumer' }), 'consumer');
    assert.equal(resolveSite({ host: 'localhost', querySite: 'nope' }), 'consumer');
  });

  it('lets X-Aorila-Site override host when query is absent', () => {
    assert.equal(resolveSite({ host: 'localhost', headerSite: 'labs' }), 'labs');
    assert.equal(resolveSite({ host: 'aorilalabs.com', headerSite: 'consumer' }), 'consumer');
  });

  it('prefers query over header', () => {
    assert.equal(
      resolveSite({ host: 'localhost', querySite: 'consumer', headerSite: 'labs' }),
      'consumer'
    );
  });

  it('honors preview cookie on localhost / onrender, not on custom domains', () => {
    assert.equal(resolveSite({ host: 'localhost', cookieSite: 'labs' }), 'labs');
    assert.equal(resolveSite({ host: 'aorila.onrender.com', cookieSite: 'labs' }), 'labs');
    assert.equal(resolveSite({ host: 'aorila.com', cookieSite: 'labs' }), 'consumer');
    assert.equal(resolveSite({ host: 'aorilalabs.com', cookieSite: 'consumer' }), 'labs');
  });
});
