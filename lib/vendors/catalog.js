/** Supported vendor menu — SKUs, regions, tiers. Not live inventory. */

const TIERS = Object.freeze([
  {
    id: 'open',
    name: 'Open Cloud',
    description: 'Verified independent hosts and smaller fleets.',
  },
  {
    id: 'secure',
    name: 'Secure Cloud',
    description: 'Certified data centers and colo with SLA / compliance path.',
  },
]);

const REGIONS = Object.freeze([
  { id: 'us-east', name: 'US East', examples: ['Ashburn', 'New York', 'Atlanta'] },
  { id: 'us-central', name: 'US Central', examples: ['Dallas', 'Chicago'] },
  { id: 'us-west', name: 'US West', examples: ['Boardman', 'Los Angeles', 'San Jose'] },
  { id: 'ca-central', name: 'Canada', examples: ['Toronto', 'Montreal'] },
  { id: 'eu-west', name: 'EU West', examples: ['Ireland', 'London', 'Amsterdam'] },
  { id: 'eu-central', name: 'EU Central', examples: ['Frankfurt', 'Warsaw'] },
  { id: 'eu-north', name: 'EU North', examples: ['Stockholm', 'Helsinki'] },
  { id: 'uk', name: 'United Kingdom', examples: ['London', 'Manchester'] },
  { id: 'me-central', name: 'Middle East', examples: ['Bahrain', 'Dubai'] },
  { id: 'af-south', name: 'Africa South', examples: ['Cape Town'] },
  { id: 'ap-south', name: 'Asia South', examples: ['Mumbai', 'Hyderabad'] },
  { id: 'ap-southeast', name: 'Asia Southeast', examples: ['Singapore', 'Jakarta'] },
  { id: 'ap-northeast', name: 'Asia Northeast', examples: ['Tokyo', 'Seoul', 'Osaka'] },
  { id: 'ap-east', name: 'Asia East', examples: ['Hong Kong', 'Taipei'] },
  { id: 'oc-southeast', name: 'Oceania', examples: ['Sydney', 'Melbourne'] },
  { id: 'sa-east', name: 'South America East', examples: ['São Paulo'] },
]);

/** GPU SKUs we onboard vendors for — breadth is the point. */
const GPU_SKUS = Object.freeze([
  { id: 'b200', name: 'NVIDIA B200', class: 'datacenter', vramGb: 192 },
  { id: 'h200', name: 'NVIDIA H200', class: 'datacenter', vramGb: 141 },
  { id: 'h100-sxm', name: 'NVIDIA H100 SXM', class: 'datacenter', vramGb: 80 },
  { id: 'h100-pcie', name: 'NVIDIA H100 PCIe', class: 'datacenter', vramGb: 80 },
  { id: 'h100-nvl', name: 'NVIDIA H100 NVL', class: 'datacenter', vramGb: 94 },
  { id: 'a100-80-sxm', name: 'NVIDIA A100 80GB SXM', class: 'datacenter', vramGb: 80 },
  { id: 'a100-80-pcie', name: 'NVIDIA A100 80GB PCIe', class: 'datacenter', vramGb: 80 },
  { id: 'a100-40', name: 'NVIDIA A100 40GB', class: 'datacenter', vramGb: 40 },
  { id: 'l40s', name: 'NVIDIA L40S', class: 'datacenter', vramGb: 48 },
  { id: 'l40', name: 'NVIDIA L40', class: 'datacenter', vramGb: 48 },
  { id: 'l4', name: 'NVIDIA L4', class: 'datacenter', vramGb: 24 },
  { id: 'a6000', name: 'NVIDIA RTX A6000', class: 'pro', vramGb: 48 },
  { id: '6000-ada', name: 'NVIDIA RTX 6000 Ada', class: 'pro', vramGb: 48 },
  { id: '5000-ada', name: 'NVIDIA RTX 5000 Ada', class: 'pro', vramGb: 32 },
  { id: 'rtx-pro-6000', name: 'NVIDIA RTX PRO 6000', class: 'pro', vramGb: 96 },
  { id: '4090', name: 'NVIDIA GeForce RTX 4090', class: 'consumer', vramGb: 24 },
  { id: '4080', name: 'NVIDIA GeForce RTX 4080', class: 'consumer', vramGb: 16 },
  { id: '3090', name: 'NVIDIA GeForce RTX 3090', class: 'consumer', vramGb: 24 },
  { id: 'mi300x', name: 'AMD Instinct MI300X', class: 'datacenter', vramGb: 192 },
  { id: 'mi250', name: 'AMD Instinct MI250', class: 'datacenter', vramGb: 128 },
]);

const VENDOR_STATUSES = Object.freeze([
  'applied',
  'reviewing',
  'verified',
  'active',
  'paused',
  'rejected',
]);

function getCatalog() {
  return {
    tiers: TIERS,
    regions: REGIONS,
    gpus: GPU_SKUS,
    statuses: VENDOR_STATUSES,
  };
}

module.exports = {
  TIERS,
  REGIONS,
  GPUS: GPU_SKUS,
  GPU_SKUS,
  VENDOR_STATUSES,
  getCatalog,
};
