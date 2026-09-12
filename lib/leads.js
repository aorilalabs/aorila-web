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
};

const KINDS = new Set(['contact', 'waitlist', 'key', 'provider']);
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
  const kind = clip(input.kind || extras.kind, MAX.kind);
  const useCase = clip(input.notes || input.use_case || input.message, MAX.notes);
  const volume = clip(input.volume, MAX.volume);
  const notes = [useCase, volume ? `Volume: ${volume}` : '']
    .filter(Boolean)
    .join('\n\n') || null;

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    site: SITES.has(site) ? site : extras.site || 'unknown',
    kind: KINDS.has(kind) ? kind : extras.kind || 'contact',
    email,
    name: clip(input.name, MAX.name) || null,
    company: clip(input.company, MAX.company) || null,
    plan: clip(input.plan, MAX.plan) || null,
    volume: volume || null,
    website: clip(input.website, MAX.website) || null,
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
