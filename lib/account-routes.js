'use strict';

const { parseSid, setSid, clearSid } = require('./accounts');
const {
  consolePage,
  commercialConsole,
} = require('./account-pages');

const AORILA_ORIGIN = 'https://aorila.com';
const CONSOLE_ORIGIN = 'https://console.aorila.com';

// Only allow same-origin redirect targets. Anything else falls back to /account.
function safeNext(value) {
  const v = String(value || '/account');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/account';
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
  // Auth pages live on aorila.com now; the console is for signed-in users.
  const nextUrl = encodeURIComponent(req.originalUrl || '/account');
  res.redirect(302, `${AORILA_ORIGIN}/login?next=${nextUrl}`);
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

// Failure on the auth forms bounces back to the aorila.com page with the real
// error message and the typed email, so the user never retypes.
function authFailRedirect(res, mode, err, body) {
  const email = String((body && body.email) || '');
  let q = 'error=' + encodeURIComponent((err && err.message) || 'Something went wrong. Try again.');
  if (email) q += '&email=' + encodeURIComponent(email);
  const next = safeNext(body && body.next);
  if (next && next !== '/account') q += '&next=' + encodeURIComponent(next);
  res.redirect(303, `${AORILA_ORIGIN}/${mode}?${q}`);
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

  // Sign-in and sign-up live on aorila.com. Old console URLs redirect there.
  app.get(['/login', '/signin'], (req, res) => {
    if (cookieParserUser(store, req)) return res.redirect(302, safeNext(req.query.next));
    const q = req.query.next ? `?next=${encodeURIComponent(safeNext(req.query.next))}` : '';
    res.redirect(301, `${AORILA_ORIGIN}/login${q}`);
  });

  app.get(['/signup', '/register'], (req, res) => {
    if (cookieParserUser(store, req)) return res.redirect(302, safeNext(req.query.next));
    const q = req.query.next ? `?next=${encodeURIComponent(safeNext(req.query.next))}` : '';
    res.redirect(301, `${AORILA_ORIGIN}/signup${q}`);
  });

  app.post('/signup', async (req, res) => {
    const body = req.body || {};
    try {
      const user = await store.signup(body);
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(body.next));
    } catch (err) {
      authFailRedirect(res, 'signup', err, body);
    }
  });

  app.post('/login', async (req, res) => {
    const body = req.body || {};
    try {
      const user = await store.login(body);
      setSid(res, store.issueSession(user));
      res.redirect(303, safeNext(body.next));
    } catch (err) {
      authFailRedirect(res, 'login', err, body);
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

module.exports = { mountAccountRoutes, cookieParserUser, AORILA_ORIGIN, CONSOLE_ORIGIN };
