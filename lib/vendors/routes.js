/** HTTP surface for vendors — public catalog + ops registry. */
const express = require('express');
const { getCatalog } = require('./catalog');

function opsAuthorized(req) {
  const token = process.env.VENDOR_OPS_TOKEN;
  if (!token) return false;
  const header = String(req.get('authorization') || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return Boolean(match && match[1] === token);
}

function createVendorRouter(vendorStore) {
  const router = express.Router();

  router.get('/vendors/catalog', (req, res) => {
    res.json({ ok: true, catalog: getCatalog() });
  });

  router.get('/vendors', (req, res) => {
    res.json({ ok: true, vendors: vendorStore.listPublic() });
  });

  router.get('/ops/vendors', (req, res) => {
    if (!opsAuthorized(req)) {
      return res.status(401).json({ ok: false, error: 'Ops token required.' });
    }
    const status = req.query.status ? String(req.query.status) : undefined;
    res.json({ ok: true, vendors: vendorStore.list({ status }) });
  });

  router.get('/ops/vendors/:id', (req, res) => {
    if (!opsAuthorized(req)) {
      return res.status(401).json({ ok: false, error: 'Ops token required.' });
    }
    const vendor = vendorStore.get(req.params.id);
    if (!vendor) return res.status(404).json({ ok: false, error: 'Vendor not found.' });
    res.json({ ok: true, vendor });
  });

  router.patch('/ops/vendors/:id', (req, res) => {
    if (!opsAuthorized(req)) {
      return res.status(401).json({ ok: false, error: 'Ops token required.' });
    }
    try {
      const vendor = vendorStore.update(req.params.id, req.body || {});
      res.json({ ok: true, vendor });
    } catch (err) {
      res.status(err.status || 500).json({ ok: false, error: err.message || 'Update failed.' });
    }
  });

  return router;
}

module.exports = { createVendorRouter, opsAuthorized };
