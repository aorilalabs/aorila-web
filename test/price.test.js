const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// price.js is browser JS with pure helpers exported for node.
const price = require('../public/price.js');

const offers = [
  { sku: 'rtx-4090-24', name: 'Aorila RTX 4090', vramGb: 24, class: 'consumer', tier: 'open', region: 'Sweden, SE', usdPerHour: 0.4835, offerId: 'a' },
  { sku: 'rtx-4090-24', name: 'Aorila RTX 4090', vramGb: 24, class: 'consumer', tier: 'open', region: 'California, US', usdPerHour: 0.9476, offerId: 'b' },
  { sku: 'h100-80', name: 'Aorila H100 80GB', vramGb: 80, class: 'datacenter', tier: 'secure', region: 'us', usdPerHour: 2.6394, offerId: 'c' },
];

describe('gpu catalog cards', () => {
  it('groups offers by GPU model with a from-price', () => {
    const groups = price.groupOffers(offers);
    assert.equal(groups.length, 2);
    const g = groups.find((x) => x.sku === 'rtx-4090-24');
    assert.equal(g.from, 0.4835);
    assert.equal(g.regions, 2);
    assert.equal(g.name, 'RTX 4090');
    assert.ok(Math.abs(g.perMin - 0.4835 / 60) < 1e-9);
  });

  it('renders marketplace-style GPU cards, not bare text rows', () => {
    const html = price.catalogHtml(price.groupOffers(offers));
    assert.match(html, /gpu-card/);
    assert.match(html, /gpu-art/);
    assert.match(html, /from<\/span> \$0\.483/);
    assert.match(html, /billed per minute/);
    assert.match(html, /24GB VRAM/);
    assert.match(html, /\/console\/pods\/new\?sku=rtx-4090-24/);
    assert.match(html, /data-gf="datacenter"/);
  });

  it('renders per-offer console cards with direct start links', () => {
    const html = price.offersHtml(offers);
    assert.match(html, /\/console\/start\?sku=rtx-4090-24&offerId=a/);
    assert.match(html, /gpu-art/);
  });

  it('escapes offer text in card HTML', () => {
    const evil = [{ sku: 'x', name: 'Aorila <img src=x>', vramGb: 8, class: 'consumer', tier: 'open', region: 'us', usdPerHour: 0.1, offerId: 'e' }];
    const html = price.catalogHtml(price.groupOffers(evil));
    assert.doesNotMatch(html, /<img src=x>/);
    assert.match(html, /&lt;img/);
  });

  it('handles an empty catalog honestly', () => {
    assert.match(price.catalogHtml([]), /No hosts online yet/);
    assert.match(price.catalogHtml([]), /catalog opens as hosts list their GPUs/);
    assert.match(price.offersHtml([]), /No hosts online yet/);
    assert.deepEqual(price.groupOffers([]), []);
  });
});
