const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const site = require('../public/site.js');

describe('frontend API origin helpers', () => {
  it('uses api.aorila.com on production custom domains', () => {
    assert.equal(
      site.resolveApiOrigin({ hostname: 'aorila.com', origin: 'https://aorila.com', protocol: 'https:' }),
      'https://api.aorila.com'
    );
    assert.equal(
      site.apiUrl('/leads', { hostname: 'aorilalabs.com', origin: 'https://aorilalabs.com', protocol: 'https:' }),
      'https://api.aorila.com/leads'
    );
  });

  it('uses localhost:3000 during local development', () => {
    assert.equal(
      site.resolveApiOrigin({ hostname: 'localhost', origin: 'http://localhost:4173', protocol: 'http:' }),
      'http://localhost:3000'
    );
    assert.equal(
      site.toApiHref('/console?tab=billing', { hostname: 'localhost', origin: 'http://localhost:4173', protocol: 'http:' }),
      'http://localhost:3000/console?tab=billing'
    );
  });

  it('honors a build-time meta override for previews', () => {
    const doc = {
      querySelector(selector) {
        assert.equal(selector, 'meta[name="aorila-api-origin"]');
        return {
          getAttribute(name) {
            assert.equal(name, 'content');
            return 'https://preview-api.example';
          },
        };
      },
    };
    assert.equal(
      site.resolveApiOrigin({ hostname: 'aorila-site.onrender.com', origin: 'https://aorila-site.onrender.com', protocol: 'https:' }, doc),
      'https://preview-api.example'
    );
  });

  it('rewrites only dynamic root-relative paths', () => {
    const loc = { hostname: 'aorila.com', origin: 'https://aorila.com', protocol: 'https:' };
    assert.equal(site.toApiHref('/signup?next=/console', loc), 'https://api.aorila.com/signup?next=/console');
    assert.equal(site.toApiHref('/compute/v1/gpus', loc), 'https://api.aorila.com/compute/v1/gpus');
    assert.equal(site.toApiHref('/tp', loc), '/tp');
    assert.equal(site.toApiHref('https://api.aorila.com', loc), 'https://api.aorila.com');
  });
});
