'use strict';

const { parseSid, setSid, clearSid } = require('./accounts');
const {
  authForm,
  consolePage,
  commercialConsole,
  newChooserPage,
  deployPodPage,
  podDetailPage,
  newEndpointPage,
  newVolumePage,
} = require('./account-pages');

const COMPUTE = process.env.COMPUTE_ORIGIN || 'https://aorila-compute.onrender.com';

// Only allow same-origin redirect targets. Anything else falls back to /console.
function safeNext(value) {
  const v = String(value || '/console');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/console';
  return v;
}
const CONSOLE_SECTIONS = new Set(['home', 'hub', 'serverless', 'pods', 'clusters', 'storage', 'deployments', 'billing', 'account']);
const LEGACY_PRODUCT_REDIRECTS = {
  '/pods': '/compute',
  '/serverless': '/compute',
  '/clusters': '/compute',
  '/hub': '/compute',
  '/deployments': '/compute',
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
      endpoints: store.endpointsFor(user.id),
      volumes: store.volumesFor(user.id),
      credits: store.creditsFor(user.id),
      error: req.query.error,
      notice: req.query.notice,
      section,
    })
  );
}

function mountAccountRoutes(app, store) {
  app.get(['/login', '/signin'], (req, res) => {
    const next = safeNext(req.query.next);
    if (cookieParserUser(store, req)) return res.redirect(302, next);
    res.type('html').send(authForm({ mode: 'login', next, error: req.query.error }));
  });

  app.get(['/signup', '/register'], (req, res) => {
    const next = safeNext(req.query.next);
    if (cookieParserUser(store, req)) return res.redirect(302, next);
    res.type('html').send(authForm({ mode: 'signup', next, error: req.query.error }));
  });

  app.post('/signup', (req, res) => {
    try {
      const user = store.signup(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(req.body && req.body.next));
    } catch (err) {
      res.status(err.status || 400).type('html').send(authForm({ mode: 'signup', error: err.message, next: safeNext(req.body && req.body.next) }));
    }
  });

  app.post('/login', (req, res) => {
    try {
      const user = store.login(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(req.body && req.body.next));
    } catch (err) {
      res.status(err.status || 401).type('html').send(authForm({ mode: 'login', error: err.message, next: safeNext(req.body && req.body.next) }));
    }
  });

  app.post('/logout', (req, res) => {
    store.revokeSession(parseSid(req));
    clearSid(res);
    res.redirect(303, '/');
  });

  app.get('/logout', (req, res) => {
    clearSid(res);
    res.redirect(302, '/');
  });

  Object.keys(LEGACY_PRODUCT_REDIRECTS).forEach((from) => {
    app.get([from, from + '/'], (req, res) => {
      res.redirect(301, LEGACY_PRODUCT_REDIRECTS[from]);
    });
  });

  app.get(['/console', '/account', '/dashboard'], (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    sendConsole(res, store, user, req, 'home');
  });

  app.get('/console/new', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    res.type('html').send(
      newChooserPage({
        user,
        balanceCents: store.balance(user.id),
        error: req.query.error,
        notice: req.query.notice,
      })
    );
  });

  app.get('/console/pods/new', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    res.type('html').send(
      deployPodPage({
        user,
        balanceCents: store.balance(user.id),
        sku: req.query.sku,
        offerId: req.query.offerId,
        error: req.query.error,
        notice: req.query.notice,
      })
    );
  });

  app.get('/console/pods/:id', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    if (req.params.id === 'new') return res.redirect(302, '/console/pods/new');
    const machine = store.machineById(user.id, req.params.id);
    if (!machine) return res.redirect(302, '/console/pods?error=' + encodeURIComponent('Pod not found.'));
    res.type('html').send(
      podDetailPage({
        user,
        balanceCents: store.balance(user.id),
        machine,
        error: req.query.error,
        notice: req.query.notice,
      })
    );
  });

  app.get('/console/serverless/new', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    res.type('html').send(
      newEndpointPage({
        user,
        balanceCents: store.balance(user.id),
        error: req.query.error,
        notice: req.query.notice,
      })
    );
  });

  app.post('/console/serverless', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    try {
      store.createEndpoint(user.id, req.body || {});
      res.redirect(303, '/console/serverless?notice=' + encodeURIComponent('Endpoint recorded.'));
    } catch (err) {
      res.redirect(303, '/console/serverless/new?error=' + encodeURIComponent(err.message));
    }
  });

  app.get('/console/storage/new', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    res.type('html').send(
      newVolumePage({
        user,
        balanceCents: store.balance(user.id),
        error: req.query.error,
        notice: req.query.notice,
      })
    );
  });

  app.post('/console/storage', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    try {
      store.createVolume(user.id, req.body || {});
      res.redirect(303, '/console/storage?notice=' + encodeURIComponent('Volume recorded.'));
    } catch (err) {
      res.redirect(303, '/console/storage/new?error=' + encodeURIComponent(err.message));
    }
  });

  app.all(['/console/start', '/account/start'], async (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    const sku = String((req.body && req.body.sku) || req.query.sku || '').trim();
    const offerId = String((req.body && req.body.offerId) || req.query.offerId || '').trim();
    const name = String((req.body && req.body.name) || req.query.name || '').trim();
    const image = String((req.body && req.body.image) || req.query.image || '').trim();
    const diskGb = Number((req.body && req.body.diskGb) || req.query.diskGb || 20);
    if (!sku && !offerId) return res.redirect(303, '/console/pods/new?error=' + encodeURIComponent('Pick a GPU.'));
    let offers = [];
    try {
      offers = await fetchOffers();
    } catch {
      offers = [];
    }
    try {
      const offer =
        (offerId && offers.find((o) => o.offerId === offerId)) ||
        offers.find((o) => o.sku === sku || o.name === sku);
      // Never invent a price. If the offer isn't in the live catalog, refuse.
      if (!offer || !Number(offer.usdPerHour)) {
        return res.redirect(303, '/console/pods/new?error=' + encodeURIComponent('That GPU is not in the live catalog right now. Pick a live offer below.'));
      }
      const hourCents = Math.max(1, Math.round(Number(offer.usdPerHour || 0) * 100));
      if (store.balance(user.id) < hourCents) {
        return res.redirect(303, '/console/billing?error=' + encodeURIComponent('Add credits before starting a pod.'));
      }
      const machine = store.createMachine(user.id, {
        sku: offer.sku || sku,
        name: name || offer.name || sku,
        usdPerHour: offer.usdPerHour || 0,
        region: offer.region || '',
        image,
        diskGb,
        jupyterOn: true,
        status: 'starting',
      });
      store.addCredits(user.id, { cents: -hourCents, note: 'hold 1h ' + machine.id });
      try {
        const upstream = await fetch(COMPUTE + '/compute/v1/pods', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sku: offer.sku || sku,
            offerId: offer.offerId || offerId || undefined,
            name: machine.name,
            image: image || undefined,
          }),
        });
        const data = await upstream.json().catch(() => ({}));
        const pod = data.pod || {};
        const jupyter = pod.connect && (pod.connect.jupyter || pod.connect.proxy);
        if (!upstream.ok) {
          store.updateMachine(machine.id, { status: 'queued', message: data.error || 'Capacity accepted. Provider drop is pending.' });
        } else {
          store.updateMachine(machine.id, {
            status: pod.status || 'running',
            remoteId: pod.id || null,
            jupyter: jupyter || '',
            message: jupyter ? 'Notebook ready when the pod is running.' : 'Live on Aorila capacity.',
          });
        }
      } catch {
        store.updateMachine(machine.id, { status: 'queued', message: 'Recorded. Control plane will retry the drop.' });
      }
      res.redirect(303, '/console/pods/' + machine.id + '?notice=' + encodeURIComponent('Machine created.'));
    } catch (err) {
      res.redirect(303, '/console/pods/new?error=' + encodeURIComponent(err.message || 'Could not start.'));
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
    // Self-serve credit grants are disabled: credits come only from paid
    // checkout (Lemon Squeezy) or an operator grant. Never mint from a form.
    res.redirect(303, '/console/billing?error=' + encodeURIComponent('Credit checkout is not live yet. Credits are granted after a paid purchase.'));
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
    res.redirect(303, '/console/pods/' + machine.id + '?notice=' + encodeURIComponent('Machine stopped.'));
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
