const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// labs-catalog.js is browser JS with pure helpers exported for node.
const labs = require('../public/labs-catalog.js');

const offers = [
  { sku: 'rtx-4090-24', name: 'Aorila RTX 4090', vramGb: 24, class: 'consumer', tier: 'open', region: 'Sweden, SE', usdPerHour: 0.4835, offerId: 'a' },
  { sku: 'rtx-4090-24', name: 'Aorila RTX 4090', vramGb: 24, class: 'consumer', tier: 'open', region: 'California, US', usdPerHour: 0.9476, offerId: 'b' },
  { sku: 'h100-80', name: 'Aorila H100 80GB', vramGb: 80, class: 'datacenter', tier: 'secure', region: 'us', usdPerHour: 2.6394, offerId: 'c' },
];

describe('labs gpu catalog cards', () => {
  it('groups offers by GPU model with a from-price', () => {
    const groups = labs.groupOffers(offers);
    assert.equal(groups.length, 2);
    const g = groups.find((x) => x.sku === 'rtx-4090-24');
    assert.equal(g.from, 0.4835);
    assert.equal(g.regions, 2);
    assert.equal(g.name, 'RTX 4090');
    assert.ok(Math.abs(g.perMin - 0.4835 / 60) < 1e-9);
  });

  it('renders marketplace-style GPU cards, not bare text rows', () => {
    const html = labs.catalogHtml(labs.groupOffers(offers));
    assert.match(html, /gpu-card/);
    assert.match(html, /gpu-art/);
    assert.match(html, /from<\/span> \$0\.483/);
    assert.match(html, /billed per minute/);
    assert.match(html, /24GB VRAM/);
    assert.match(html, /https:\/\/dashboard\.aorilalabs\.com\/#market/);
    assert.match(html, /data-gf="datacenter"/);
  });

  it('escapes offer text in card HTML', () => {
    const evil = [{ sku: 'x', name: 'Aorila <img src=x>', vramGb: 8, class: 'consumer', tier: 'open', region: 'us', usdPerHour: 0.1, offerId: 'e' }];
    const html = labs.catalogHtml(labs.groupOffers(evil));
    assert.doesNotMatch(html, /<img src=x>/);
    assert.match(html, /&lt;img/);
  });

  it('handles an empty catalog honestly — no staged offers', () => {
    const html = labs.catalogHtml([]);
    assert.match(html, /No hosts online yet/);
    assert.match(html, /catalog opens as hosts list their GPUs/);
    assert.match(html, /only after agreements are signed/);
    assert.doesNotMatch(html, /gpu-card/);
    assert.deepEqual(labs.groupOffers([]), []);
  });

  it('never presents unconfirmed partner capacity as live', () => {
    const html = labs.emptyCatalogHtml();
    assert.doesNotMatch(html, /Hyperstack/i);
    assert.doesNotMatch(html, /live partner/i);
  });
});

describe('labs host earnings calculator', () => {
  it('computes GPU monthly earnings from rate, utilization, and count', () => {
    const m = labs.RESOURCES.gpu.monthly;
    // $0.36/hr × 50% × 730 hrs × 1 GPU = $131.40
    assert.ok(Math.abs(m(0.36, 50, 1) - 131.4) < 1e-9);
    assert.ok(Math.abs(m(1.55, 100, 2) - 1.55 * 730 * 2) < 1e-9);
    assert.equal(m(0.36, 0, 1), 0);
  });

  it('computes CPU monthly earnings per instance', () => {
    const m = labs.RESOURCES.cpu.monthly;
    assert.ok(Math.abs(m(0.10, 50, 1) - 36.5) < 1e-9);
    assert.equal(m(0.10, 0, 4), 0);
  });

  it('computes storage monthly earnings per GB without hourly factor', () => {
    const m = labs.RESOURCES.storage.monthly;
    // $0.05/GB/mo × 100 GB × 50% = $2.50
    assert.ok(Math.abs(m(0.05, 50, 100) - 2.5) < 1e-9);
    assert.ok(Math.abs(m(0.05, 100, 10000) - 500) < 1e-9);
  });

  it('covers GPU, CPU, and storage resources', () => {
    assert.deepEqual(Object.keys(labs.RESOURCES).sort(), ['cpu', 'gpu', 'storage']);
  });

  it('uses honest market-median defaults per GPU model', () => {
    assert.equal(labs.RESOURCES.gpu.models['rtx-4090'].rate, 0.36);
    assert.equal(labs.RESOURCES.gpu.models['rtx-3090'].rate, 0.16);
    assert.equal(labs.RESOURCES.gpu.models['h100-80'].rate, 1.55);
    assert.ok(labs.RESOURCES.gpu.models['rtx-4090'].rate >= 0.15);
    assert.ok(labs.RESOURCES.gpu.models['rtx-4090'].rate <= 0.59);
  });

  it('covers the full listable GPU range down to the GTX 1660 Super', () => {
    assert.equal(labs.RESOURCES.gpu.models['gtx-1660s'].rate, 0.03);
    assert.equal(labs.RESOURCES.gpu.models['rtx-3060'].rate, 0.08);
    assert.ok(labs.RESOURCES.gpu.rate.min <= 0.03, 'price slider must reach the cheapest listable GPU');
  });

  it('offers the 4 vCPU tier at the marketplace floor for bare-minimum hosts', () => {
    assert.equal(labs.RESOURCES.cpu.models['cpu-4'].rate, 0.024);
  });

  it('formats money without decimals', () => {
    assert.equal(labs.money(131.4), '$131');
    assert.equal(labs.money(2263), '$2,263');
  });
});
