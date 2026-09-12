/** Vendor registry — file-backed. One job: persist provider records. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { VENDOR_STATUSES, TIERS } = require('./catalog');

const TIER_IDS = new Set(TIERS.map((t) => t.id));
const STATUS_SET = new Set(VENDOR_STATUSES);

const MAX = {
  company: 160,
  contactName: 120,
  email: 254,
  website: 200,
  capacityNote: 2000,
  hardwareNote: 4000,
  notes: 4000,
  region: 40,
};

function defaultVendorsPath() {
  return process.env.VENDORS_PATH || path.join(__dirname, '..', '..', 'data', 'vendors.json');
}

function clip(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function createVendorStore(filePath = defaultVendorsPath()) {
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

  function publicView(v) {
    return {
      id: v.id,
      company: v.company,
      tier: v.tier,
      status: v.status,
      regions: v.regions,
      website: v.website,
      activatedAt: v.activatedAt || null,
    };
  }

  return {
    path: resolved,

    list({ status } = {}) {
      const rows = readAll();
      if (!status) return rows;
      return rows.filter((r) => r.status === status);
    },

    listPublic() {
      return readAll().filter((r) => r.status === 'active').map(publicView);
    },

    get(id) {
      return readAll().find((r) => r.id === id) || null;
    },

    /** Create from a provider application / lead. */
    applyFromLead(lead, extras = {}) {
      const email = clip(lead.email, MAX.email).toLowerCase();
      if (!email) {
        const err = new Error('A valid email is required.');
        err.status = 400;
        throw err;
      }

      const now = new Date().toISOString();
      const vendor = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        status: 'applied',
        tier: TIER_IDS.has(extras.tier) ? extras.tier : 'open',
        company: clip(lead.company || extras.company, MAX.company) || 'Unknown operator',
        contactName: clip(lead.name || extras.contactName, MAX.contactName) || null,
        email,
        website: clip(lead.website || extras.website, MAX.website) || null,
        regions: Array.isArray(extras.regions)
          ? extras.regions.map((r) => clip(r, MAX.region)).filter(Boolean).slice(0, 16)
          : [],
        hardwareNote: clip(lead.notes || extras.hardwareNote, MAX.hardwareNote) || null,
        capacityNote: clip(lead.volume || extras.capacityNote, MAX.capacityNote) || null,
        leadId: lead.id || null,
        notes: null,
        activatedAt: null,
      };

      const rows = readAll();
      rows.push(vendor);
      writeAll(rows);
      return vendor;
    },

    update(id, patch = {}) {
      const rows = readAll();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) {
        const err = new Error('Vendor not found.');
        err.status = 404;
        throw err;
      }

      const current = rows[idx];
      const next = { ...current, updatedAt: new Date().toISOString() };

      if (patch.status != null) {
        const status = clip(patch.status, 40);
        if (!STATUS_SET.has(status)) {
          const err = new Error(`Invalid status. Use: ${VENDOR_STATUSES.join(', ')}`);
          err.status = 400;
          throw err;
        }
        next.status = status;
        if (status === 'active' && !next.activatedAt) {
          next.activatedAt = next.updatedAt;
        }
      }
      if (patch.tier != null) {
        const tier = clip(patch.tier, 40);
        if (!TIER_IDS.has(tier)) {
          const err = new Error('Invalid tier. Use: open, secure');
          err.status = 400;
          throw err;
        }
        next.tier = tier;
      }
      if (patch.notes != null) next.notes = clip(patch.notes, MAX.notes) || null;
      if (patch.company != null) next.company = clip(patch.company, MAX.company) || next.company;
      if (Array.isArray(patch.regions)) {
        next.regions = patch.regions.map((r) => clip(r, MAX.region)).filter(Boolean).slice(0, 16);
      }

      rows[idx] = next;
      writeAll(rows);
      return next;
    },
  };
}

module.exports = {
  createVendorStore,
  defaultVendorsPath,
};
