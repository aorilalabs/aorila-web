'use strict';

const { parseSid, setSid, clearSid } = require('./accounts');
const { authForm, consolePage, billingPage, commercialConsole } = require('./account-pages');

const COMPUTE = process.env.COMPUTE_ORIGIN || 'https://aorila-compute.onrender.com';
const CONSOLE_SECTIONS = new Set(['home', 'hub', 'serverless', 'pods', 'clusters', 'storage', 'deployments', 'billing', 'account']);
const PRODUCT_TO_CONSOLE = {
  '/pods': '/console/pods',
  '/serverless': '/console/serverless',
  '/clusters': '/console/clusters',
  '/hub': '/console/hub',
  '/deployments': '/console/deployments',
};

function cookieParserUser(store, req) {
  return store.readSession(parseSid(req));
}

function requireUser(store, req, res) {
  const user = cookieParserUser(store, req);
  if (user) return user;
  const nextUrl = encodeURIComponent(req.originalUrl || '/console');
  res.redirect(302, `/login?next=${nextUrl}`);
  return null;
}

async function fetchOffers() {
  const res = await fetch(`${COMPUTE}/compute/v1/gpus`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.offers || [];
}

function sendConsole(res, store, user, req, section) {
  res.type('html').send(
    consolePage({
      user,
      balanceCents: store.balance(user.id),
      machines: store.machinesFor(user.id),
      bookings: store.bookingsFor(user.id),
      error: req.query.error,
      notice: req.query.notice,
      section,
    })
  );
}

function mountAccountRoutes(app, store) {
  app.get(['/login', '/signin'], (req, res) => {
    if (cookieParserUser(store, req)) return res.redirect(302, String(req.query.next || '/console'));
    res.type('html').send(authForm({ mode: 'login', next: req.query.next, error: req.query.error }));
  });

  app.get(['/signup', '/register'], (req, res) => {
    if (cookieParserUser(store, req)) return res.redirect(302, String(req.query.next || '/console'));
    res.type('html').send(authForm({ mode: 'signup', next: req.query.next, error: req.query.error }));
  });

  app.post('/signup', (req, res) => {
    try {
      const user = store.signup(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, String((req.body && req.body.next) || '/console'));
    } catch (err) {
      res.status(err.status || 400).type('html').send(authForm({ mode: 'signup', error: err.message, next: req.body && req.body.next }));
    }
  });

  app.post('/login', (req, res) => {
    try {
      const user = store.login(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, String((req.body && req.body.next) || '/console'));
    } catch (err) {
      res.status(err.status || 401).type('html').send(authForm({ mode: 'login', error: err.message, next: req.body && req.body.next }));
    }
  });

  app.post('/logout', (req, res) => {
    clearSid(res);
    res.redirect(303, '/');
  });

  app.get('/logout', (req, res) => {
    clearSid(res);
    res.redirect(302, '/');
  });

  Object.keys(PRODUCT_TO_CONSOLE).forEach((from) => {
    app.get([from, from + '/'], (req, res) => {
      const dest = PRODUCT_TO_CONSOLE[from];
      const user = cookieParserUser(store, req);
      if (!user) return res.redirect(302, `/login?next=${encodeURIComponent(dest)}`);
      res.redirect(302, dest);
    });
  });

  app.get(['/console', '/account', '/dashboard'], (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    sendConsole(res, store, user, req, 'home');
  });

  app.all(['/console/start', '/account/start'], async (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    const sku = String((req.body && req.body.sku) || req.query.sku || '').trim();
    if (!sku) return res.redirect(303, '/console/pods?error=' + encodeURIComponent('Pick a GPU.'));
    try {
      const offers = await fetchOffers();
      const offer = offers.find((o) => o.sku === sku || o.name === sku) || {
        sku,
        name: sku,
        usdPerHour: Number((req.body && req.body.usdPerHour) || req.query.usdPerHour || 0),
        region: (req.body && req.body.region) || req.query.region || '',
        tier: 'on-demand',
      };
      const hourCents = Math.max(1, Math.round(Number(offer.usdPerHour || 0) * 100));
      if (store.balance(user.id) < hourCents) {
        return res.redirect(303, '/console/billing?error=' + encodeURIComponent('Add credits before starting a pod.'));
      }
      const machine = store.createMachine(user.id, {
        sku: offer.sku || sku,
        name: offer.name || sku,
        usdPerHour: offer.usdPerHour || 0,
        region: offer.region || '',
        status: 'starting',
      });
      store.addCredits(user.id, { cents: -hourCents, note: 'hold 1h ' + machine.id });
      try {
        const upstream = await fetch(COMPUTE + '/compute/v1/pods', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ sku: offer.sku || sku, name: offer.name || sku }),
        });
        const data = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
          store.updateMachine(machine.id, { status: 'queued', message: data.error || 'Capacity accepted. Provider drop is pending.' });
        } else {
          store.updateMachine(machine.id, {
            status: (data.pod && data.pod.status) || 'running',
            remoteId: data.pod && data.pod.id,
            message: 'Live on Aorila capacity.',
          });
        }
      } catch {
        store.updateMachine(machine.id, { status: 'queued', message: 'Recorded. Control plane will retry the drop.' });
      }
      res.redirect(303, '/console/pods?notice=' + encodeURIComponent('Machine created.'));
    } catch (err) {
      res.redirect(303, '/console/pods?error=' + encodeURIComponent(err.message || 'Could not start.'));
    }
  });

  app.get('/console/:section', (req, res) => {
    const section = String(req.params.section || '');
    if (!CONSOLE_SECTIONS.has(section)) return res.redirect(302, '/console');
    const user = requireUser(store, req, res);
    if (!user) return;
    sendConsole(res, store, user, req, section);
  });

  app.post('/console/credits', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    try {
      const dollars = Number(req.body.dollars || 0);
      const cents = Math.round(dollars * 100);
      if (![2500, 10000, 50000, 100000].includes(cents)) {
        throw Object.assign(new Error('Pick a listed amount.'), { status: 400 });
      }
      store.addCredits(user.id, { cents, note: 'ledger ' + dollars });
      res.redirect(303, '/console/billing?notice=' + encodeURIComponent('Added $' + dollars.toFixed(0) + ' in workspace credits.'));
    } catch (err) {
      res.redirect(303, '/console/billing?error=' + encodeURIComponent(err.message));
    }
  });

  app.post('/console/stop/:id', async (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    const machine = store.machinesFor(user.id).find((m) => m.id === req.params.id);
    if (!machine) return res.redirect(303, '/console?error=' + encodeURIComponent('Machine not found.'));
    if (machine.remoteId) {
      try {
        await fetch(COMPUTE + '/compute/v1/pods/' + encodeURIComponent(machine.remoteId) + '/stop', { method: 'POST' });
      } catch {}
    }
    store.updateMachine(machine.id, { status: 'stopped', message: 'Stopped from console.' });
    res.redirect(303, '/console/pods?notice=' + encodeURIComponent('Machine stopped.'));
  });

  app.get('/commercial/console', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    res.type('html').send(
      commercialConsole({
        user,
        bookings: store.bookingsFor(user.id),
        error: req.query.error,
        notice: req.query.notice,
      })
    );
  });

  app.post('/commercial/console/book', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    try {
      store.createBooking(user.id, req.body || {});
      res.redirect(303, '/commercial/console?notice=' + encodeURIComponent('Request filed.'));
    } catch (err) {
      res.redirect(303, '/commercial/console?error=' + encodeURIComponent(err.message));
    }
  });
}

module.exports = { mountAccountRoutes, cookieParserUser };
