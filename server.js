/** Dual-site Aorila — consumer (aorila.com) + Labs (aorilalabs.com) via Host */
const path = require('path');
const express = require('express');
const { resolveSite } = require('./lib/resolve-site');

const SITES_DIR = path.join(__dirname, 'sites');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PAGES = new Set(['index.html', 'api.html']);

function siteFromRequest(req) {
  return resolveSite({
    host: req.hostname || req.get('host'),
    querySite: req.query.site,
    headerSite: req.get('x-aorila-site'),
  });
}

function sendPage(res, site, file) {
  if (!PAGES.has(file)) return false;
  res.set('X-Aorila-Site', site);
  res.sendFile(path.join(SITES_DIR, site, file));
  return true;
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.locals.site = siteFromRequest(req);
    next();
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false }));

  app.get(['/', '/index.html'], (req, res) => {
    sendPage(res, res.locals.site, 'index.html');
  });

  app.get(['/api', '/api.html', '/docs', '/docs.html'], (req, res) => {
    sendPage(res, res.locals.site, 'api.html');
  });

  app.get('/healthz', (req, res) => {
    res.json({ ok: true, site: res.locals.site });
  });

  app.use((req, res) => {
    res.status(404).set('X-Aorila-Site', res.locals.site);
    res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Not found — Aorila</title><link rel="stylesheet" href="/styles.css" /></head>
<body data-site="${res.locals.site}">
<header class="nav"><a class="wordmark" href="/">${res.locals.site === 'labs' ? 'Aorila Labs' : 'Aorila'}</a></header>
<main><section class="hero in"><p class="eyebrow">404</p><h1>This page is not on this site.</h1>
<p class="lede">Try the home page or the API docs.</p>
<div class="cta-row"><a class="cta primary" href="/">Home</a><a class="cta ghost" href="/api">API</a></div>
</section></main></body></html>`);
  });

  return app;
}

const PORT = Number(process.env.PORT || 3000);

if (require.main === module) {
  createApp().listen(PORT, '0.0.0.0', () => {
    console.log(`aorila-web :${PORT} (host → consumer | aorilalabs.com → labs)`);
  });
}

module.exports = { createApp, siteFromRequest };
