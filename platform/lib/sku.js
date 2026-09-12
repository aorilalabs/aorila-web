const SKUS = {
  'rtx-4090-24': { label: 'Aorila RTX 4090', vramGb: 24, class: 'consumer', match: [/rtx 4090/i, /geforce rtx 4090/i] },
  'rtx-a4000-16': { label: 'Aorila RTX A4000', vramGb: 16, class: 'workstation', match: [/rtx a4000/i] },
  'rtx-a5000-24': { label: 'Aorila RTX A5000', vramGb: 24, class: 'workstation', match: [/rtx a5000/i] },
  'rtx-a6000-48': { label: 'Aorila RTX A6000', vramGb: 48, class: 'workstation', match: [/rtx a6000/i, /rtx 6000 ada/i] },
  'l40s-48': { label: 'Aorila L40S', vramGb: 48, class: 'datacenter', match: [/\bl40s\b/i] },
  'a100-80': { label: 'Aorila A100 80GB', vramGb: 80, class: 'datacenter', match: [/a100.*80/i, /a100-sxm4-80/i] },
  'h100-80': { label: 'Aorila H100 80GB', vramGb: 80, class: 'datacenter', match: [/h100(?!.*200)/i] },
};

function resolveSku(rawId, rawName) {
  const hay = `${rawId || ''} ${rawName || ''}`;
  for (const [sku, meta] of Object.entries(SKUS)) {
    if (meta.match.some((re) => re.test(hay))) return sku;
  }
  return null;
}

function skuMeta(sku) {
  return SKUS[sku] || null;
}

module.exports = { SKUS, resolveSku, skuMeta };
