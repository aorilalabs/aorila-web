const UPSTREAM = /\b(runpod|vast\.?ai|lambda labs|tensordock|coreweave|shadeform)\b/gi;

function stripUpstream(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value.replace(UPSTREAM, 'Aorila');
  if (Array.isArray(value)) return value.map(stripUpstream);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'adapter' || k === 'providerJobId' || k === 'upstream') continue;
      out[k] = stripUpstream(v);
    }
    return out;
  }
  return value;
}

function publicOffer(offer, { reveal = false } = {}) {
  const priced = {
    sku: offer.sku,
    name: offer.name,
    vramGb: offer.vramGb,
    class: offer.class,
    tier: offer.tier,
    region: offer.region,
    availability: offer.availability,
    interruptible: Boolean(offer.interruptible),
    usdPerHour: offer.usdPerHour,
    computeUsdPerHour: offer.computeUsdPerHour,
    feeUsdPerHour: offer.feeUsdPerHour,
    feeBps: offer.feeBps,
    offerId: offer.offerId,
  };
  if (reveal) priced.source = offer.adapter;
  return priced;
}

function publicJob(job, { reveal = false } = {}) {
  const out = {
    id: job.id,
    sku: job.sku,
    status: job.status,
    tier: job.tier,
    region: job.region,
    image: job.image,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt || null,
    stoppedAt: job.stoppedAt || null,
    usdPerHour: job.usdPerHour,
    connect: job.connect || null,
    error: job.publicError || null,
  };
  if (reveal) {
    out.adapter = job.adapter;
    out.providerJobId = job.providerJobId;
  }
  return stripUpstream(out);
}

module.exports = { stripUpstream, publicOffer, publicJob };
