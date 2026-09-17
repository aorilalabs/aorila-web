'use strict';

const { parseSid, setSid, clearSid } = require('./accounts');
const {
  authForm,
  consolePage,
  commercialConsole,
} = require('./account-pages');

// Only allow same-origin redirect targets. Anything else falls back to /console.
function safeNext(value) {
  const v = String(value || '/console');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/console';
  return v;
}
// Parent console (Aorila): home, billing, account. Compute lives on the Labs dashboard.
const CONSOLE_SECTIONS = new Set(['home', 'billing', 'account']);

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

function sendConsole(res, store, user, req, section, pageOpts) {
  res.type('html').send(
    consolePage({
      user,
      balanceCents: store.balance(user.id),
      bookings: store.bookingsFor(user.id),
      credits: store.creditsFor(user.id),
      error: req.query.error,
      notice: req.query.notice,
      section,
      ...pageOpts(req),
    })
  );
}

function mountAccountRoutes(app, store, options = {}) {
  // The console is served from two services (console.aorila.com standalone and
  // the legacy marketing server). Every page must declare the origin that is
  // actually serving it, otherwise public/site.js rewrites relative form
  // actions to the Labs API fallback and auth breaks.
  const consoleSite = Boolean(options.consoleSite);
  const originOf = (req) => {
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim() || 'https';
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
    return host ? `${proto}://${host}` : null;
  };
  const pageOpts = (req) => ({ origin: originOf(req), consoleSite });

  app.get(['/login', '/signin'], (req, res) => {
    const next = safeNext(req.query.next);
    if (cookieParserUser(store, req)) return res.redirect(302, next);
    res.type('html').send(authForm({ mode: 'login', next, error: req.query.error, ...pageOpts(req) }));
  });

  app.get(['/signup', '/register'], (req, res) => {
    const next = safeNext(req.query.next);
    if (cookieParserUser(store, req)) return res.redirect(302, next);
    res.type('html').send(authForm({ mode: 'signup', next, error: req.query.error, ...pageOpts(req) }));
  });
  app.post('/signup', async (req, res) => {
    try {
      const user = await store.signup(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(req.body && req.body.next));
    } catch (err) {
      res.status(err.status || 400).type('html').send(authForm({ mode: 'signup', error: err.message, next: safeNext(req.body && req.body.next), ...pageOpts(req) }));
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const user = await store.login(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(req.body && req.body.next));
    } catch (err) {
      res.status(err.status || 401).type('html').send(authForm({ mode: 'login', error: err.message, next: safeNext(req.body && req.body.next), ...pageOpts(req) }));
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

  app.get(['/console', '/account', '/dashboard'], (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    sendConsole(res, store, user, req, 'home', pageOpts);
  });

  app.get('/console/:section', (req, res) => {
    const section = String(req.params.section || '');
    if (!CONSOLE_SECTIONS.has(section)) return res.redirect(302, '/console');
    const user = requireUser(store, req, res);
    if (!user) return;
    sendConsole(res, store, user, req, section, pageOpts);
  });

  app.post('/console/credits', (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    // Self-serve credit grants are disabled: credits come only from paid
    // checkout (Lemon Squeezy) or an operator grant. Never mint from a form.
    res.redirect(303, '/console/billing?error=' + encodeURIComponent('Credit checkout is not live yet. Credits are granted after a paid purchase.'));
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
        ...pageOpts(req),
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
