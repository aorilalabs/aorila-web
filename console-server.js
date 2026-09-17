'use strict';

/**
 * Aorila parent console — standalone service (console.aorila.com).
 *
 * Serves ONLY the console: home, account, billing, sign-in/up/out.
 * No marketing pages, no dual-site host logic, no leads, no compute proxy.
 * This service exists so the console can never again share a server with the
 * marketing site: a fix on one can no longer break the other.
 */

const path = require('path');
const express = require('express');
const { createAccountStore, parseSid } = require('./lib/accounts');
const { mountAccountRoutes } = require('./lib/account-routes');

const PUBLIC_DIR = path.join(__dirname, 'public');
const CONSOLE_ORIGIN = 'https://console.aorila.com';

function consoleNotFound() {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Not found — Aorila console</title><link rel="stylesheet" href="/design.css" /></head>
<body class="ds"><div class="topline"></div>
<header class="nav"><a class="wordmark" href="/console">Aorila</a></header>
<main><section class="hero compact"><div class="wrap"><span class="hero-badge">404</span>
<h1>This page is not in the console.</h1>
<div class="btn-row"><a class="btn acid" href="/console">Console home</a></div>
</div></section></main></body></html>`;
}

function createConsoleApp(options = {}) {
  const app = express();
  const accountStore = options.accountStore || createAccountStore({
    dataDir: options.dataDir,
    secret: options.sessionSecret,
  });

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Render subdomains are disabled: only our own domain serves the console.
  app.use((req, res, next) => {
    const host = String(req.hostname || '').toLowerCase();
    if ((req.method === 'GET' || req.method === 'HEAD') && host.endsWith('.onrender.com')) {
      return res.redirect(301, CONSOLE_ORIGIN + req.originalUrl);
    }
    next();
  });

  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  app.use((req, res, next) => {
    res.locals.user = accountStore.readSession(parseSid(req));
    next();
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false }));

  mountAccountRoutes(app, accountStore, { consoleSite: true });

  // Console home: / IS the console here — never a marketing page.
  app.get(['/', '/index.html'], (req, res) => res.redirect(302, '/console'));

  app.get('/healthz', (req, res) => res.json({ ok: true, service: 'aorila-console' }));

  // TEMPORARY DIAGNOSTIC — remove after DNS investigation.
  app.get('/diag-dns', async (req, res) => {
    const dns = require('dns').promises;
    const out = {};
    for (const h of ['fvxvvilgvplztbmovmxi.supabase.co', 'google.com', 'aorila.com']) {
      try { out[h] = { lookup: await dns.lookup(h).then(r => r.address).catch(e => 'ERR:' + e.code) }; }
      catch (e) { out[h] = { lookup: 'ERR:' + (e.code || e.message) }; }
    }
    try {
      const r = await fetch('https://fvxvvilgvplztbmovmxi.supabase.co/auth/v1/health', { signal: AbortSignal.timeout(10000) });
      out.fetch_health = r.status;
    } catch (e) { out.fetch_health = 'ERR:' + (e.cause ? e.cause.code || String(e.cause) : e.code || e.message); }
    try {
      const r = await fetch('https://www.google.com/generate_204', { signal: AbortSignal.timeout(10000) });
      out.fetch_google = r.status;
    } catch (e) { out.fetch_google = 'ERR:' + (e.cause ? e.cause.code || String(e.cause) : e.code || e.message); }
    res.json(out);
  });

  app.use((req, res) => res.status(404).type('html').send(consoleNotFound()));
  return app;
}

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET must be set in production. Refusing to start with the fallback secret.');
    process.exit(1);
  }
  createConsoleApp().listen(PORT, '0.0.0.0', () => {
    console.log('aorila-console :' + PORT);
  });
}

module.exports = { createConsoleApp };
