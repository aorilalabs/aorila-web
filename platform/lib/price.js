function applyFee(usdPerHour, feeBps) {
  const base = Number(usdPerHour) || 0;
  const bps = Number(feeBps) || 0;
  const fee = base * (bps / 10000);
  const customer = Math.round((base + fee) * 10000) / 10000;
  return {
    computeUsdPerHour: Math.round(base * 10000) / 10000,
    feeUsdPerHour: Math.round(fee * 10000) / 10000,
    usdPerHour: customer,
    feeBps: bps,
  };
}

function feeForTier(tier, feeBps) {
  if (tier === 'open') return Math.min(feeBps, 400);
  if (tier === 'listed') return Math.min(feeBps, 250);
  return feeBps;
}

module.exports = { applyFee, feeForTier };
