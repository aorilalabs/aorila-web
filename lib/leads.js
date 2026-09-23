/** File-backed lead store for Labs contact + consumer waitlist. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = {
  email: 254,
  name: 120,
  company: 160,
  plan: 80,
  volume: 200,
  website: 200,
  notes: 4000,
  use_case: 4000,
  kind: 40,
  site: 20,
  fax: 200,
  gpu_model: 80,
  gpu_count: 8,
  cpu_model: 80,
  ram_gb: 16,
  storage_gb: 16,
  network_mbps: 16,
  region: 80,
  asking_price_hr: 16,
  availability: 40,
  payout_method: 40,
};

const KINDS = new Set(['contact', 'waitlist', 'key', 'provider', 'seller', 'security-audit']);
const SITES = new Set(['labs', 'consumer']);

function defaultLeadsPath() {
  return process.env.LEADS_PATH || path.join(__dirname, '..', 'data', 'leads.json');
}

function clip(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function normalizeLead(input, extras = {}) {
  // Honeypot is `fax` (hidden). `website` is a real optional Labs field.
  if (clip(input.fax, MAX.fax)) {
    return { spam: true };
  }

  const email = clip(input.email, MAX.email).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    const err = new Error('A valid email is required.');
    err.status = 400;
    throw err;
  }

  const site = clip(input.site || extras.site, MAX.site);
  const kindRaw = clip(input.kind || extras.kind, MAX.kind);
  const kind = KINDS.has(kindRaw) ? kindRaw : extras.kind || 'contact';
  const name = clip(input.name, MAX.name);
  const company = clip(input.company, MAX.company);
  const useCase = clip(input.notes || input.use_case || input.message, MAX.notes);
  const volume = clip(input.volume, MAX.volume);
  const resolvedSite = SITES.has(site) ? site : extras.site || 'unknown';

  // Seller applications (host onboarding) require contact + hardware + price info.
  if (resolvedSite === 'labs' && kind === 'seller') {
    if (!name) {
      const err = new Error('Contact name is required.');
      err.status = 400;
      throw err;
    }
    const cpuModel = clip(input.cpu_model, MAX.cpu_model);
    const gpuModel = clip(input.gpu_model, MAX.gpu_model);
    if (!cpuModel && !gpuModel) {
      const err = new Error('Hardware details are required — tell us about your CPU or GPU.');
      err.status = 400;
      throw err;
    }
    const askingPrice = clip(input.asking_price_hr, MAX.asking_price_hr);
    if (!askingPrice) {
      const err = new Error('Your asking price per hour is required.');
      err.status = 400;
      throw err;
    }
    if (!clip(input.region, MAX.region)) {
      const err = new Error('Region is required.');
      err.status = 400;
      throw err;
    }
    if (!clip(input.availability, MAX.availability)) {
      const err = new Error('Availability is required.');
      err.status = 400;
      throw err;
    }
    if (!clip(input.payout_method, MAX.payout_method)) {
      const err = new Error('Payout method is required.');
      err.status = 400;
      throw err;
    }
  }

  // Labs contact + provider applications require the same fields the HTML forms mark required.
  if ((resolvedSite === 'labs' && kind === 'contact') || kind === 'provider') {
    if (!company) {
      const err = new Error('Company is required.');
      err.status = 400;
      throw err;
    }
    if (!name) {
      const err = new Error('Contact name is required.');
      err.status = 400;
      throw err;
    }
    if (!useCase) {
      const err = new Error(kind === 'provider' ? 'Hardware details are required.' : 'Use case is required.');
      err.status = 400;
      throw err;
    }
    if (!volume) {
      const err = new Error(kind === 'provider' ? 'Capacity note is required.' : 'Volume estimate is required.');
      err.status = 400;
      throw err;
    }
  }

  const notes = [useCase, volume ? `Volume: ${volume}` : '']
    .filter(Boolean)
    .join('\n\n') || null;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    site: resolvedSite,
    kind: KINDS.has(kind) ? kind : 'contact',
    email,
    name: name || null,
    company: company || null,
    plan: clip(input.plan, MAX.plan) || null,
    volume: volume || null,
    website: clip(input.website, MAX.website) || null,
    gpu_model: clip(input.gpu_model, MAX.gpu_model) || null,
    gpu_count: clip(input.gpu_count, MAX.gpu_count) || null,
    cpu_model: clip(input.cpu_model, MAX.cpu_model) || null,
    ram_gb: clip(input.ram_gb, MAX.ram_gb) || null,
    storage_gb: clip(input.storage_gb, MAX.storage_gb) || null,
    network_mbps: clip(input.network_mbps, MAX.network_mbps) || null,
    region: clip(input.region, MAX.region) || null,
    asking_price_hr: clip(input.asking_price_hr, MAX.asking_price_hr) || null,
    availability: clip(input.availability, MAX.availability) || null,
    payout_method: clip(input.payout_method, MAX.payout_method) || null,
    notes,
    host: extras.host || null,
  };
}

function createLeadStore(filePath = defaultLeadsPath()) {
  const resolved = path.resolve(filePath);

  function readAll() {
    try {
      const raw = fs.readFileSync(resolved, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  function writeAll(rows) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    const tmp = `${resolved}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(rows, null, 2)}\n`);
    fs.renameSync(tmp, resolved);
  }

  return {
    path: resolved,
    list() {
      return readAll();
    },
    add(input, extras = {}) {
      const lead = normalizeLead(input, extras);
      if (lead.spam) {
        return { ok: true, ignored: true };
      }
      const rows = readAll();
      rows.push(lead);
      writeAll(rows);
      return { ok: true, id: lead.id, lead };
    },
  };
}

module.exports = {
  createLeadStore,
  defaultLeadsPath,
  normalizeLead,
};
