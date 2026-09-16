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

function sendConsole(res, store, user, req, section) {
  res.type('html').send(
    consolePage({
      user,
      balanceCents: store.balance(user.id),
      bookings: store.bookingsFor(user.id),
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

  app.post('/signup', async (req, res) => {
    try {
      const user = await store.signup(req.body || {});
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(req.body && req.body.next));
    } catch (err) {
      res.status(err.status || 400).type('html').send(authForm({ mode: 'signup', error: err.message, next: safeNext(req.body && req.body.next) }));
    }
  });

  app.post('/login', async (req, res) => {
    try {
      const user = await store.login(req.body || {});
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

  app.get(['/console', '/account', '/dashboard'], (req, res) => {
    const user = requireUser(store, req, res);
    if (!user) return;
    sendConsole(res, store, user, req, 'home');
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
