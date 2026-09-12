function availabilityScore(a) {
  const v = String(a || '').toLowerCase();
  if (v === 'high') return 1;
  if (v === 'medium') return 0.6;
  if (v === 'low') return 0.3;
  return 0.5;
}
function interruptPenalty(offer) {
  return offer.interruptible ? 1.25 : 1;
}
function effectiveCost(offer) {
  return offer.usdPerHour * interruptPenalty(offer) / Math.max(availabilityScore(offer.availability), 0.2);
}
function rankOffers(offers, { sku, tier, region } = {}) {
  let rows = offers.slice();
  if (sku) rows = rows.filter((o) => o.sku === sku);
  if (tier) rows = rows.filter((o) => o.tier === tier);
  if (region) rows = rows.filter((o) => String(o.region).toLowerCase().includes(String(region).toLowerCase()));
  rows.sort((a, b) => effectiveCost(a) - effectiveCost(b));
  return rows;
}
function pickOffer(offers, spec) {
  return rankOffers(offers, spec)[0] || null;
}
module.exports = { rankOffers, pickOffer, effectiveCost };
