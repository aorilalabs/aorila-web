/** Dual-site Aorila — consumer (aorila.com) + Labs (aorilalabs.com) via Host */
const path = require('path');
const express = require('express');
const { resolveSite, isPreviewHost, isApiHost, CONSUMER_API_URL } = require('./lib/resolve-site');
const { createLeadStore } = require('./lib/leads');

function cookieSite(req) {
  const raw = req.get('cookie') || '';
  const match = raw.match(/(?:^|;\s*)aorila_site=(labs|consumer)(?:;|$)/i);
  return match ? match[1] : null;
}

const SITES_DIR = path.join(__dirname, 'sites');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PAGES = new Set(['index.html', 'api.html', 'docs.html', 'support.html', 'tp.html']);

function siteFromRequest(req) {
  return resolveSite({
    host: req.hostname || req.get('host'),
    querySite: req.query.site,
    headerSite: req.get('x-aorila-site'),
    cookieSite: cookieSite(req),
  });
}

function sendPage(res, site, file) {
  if (!PAGES.has(file)) return false;
  res.set('X-Aorila-Site', site);
  res.sendFile(path.join(SITES_DIR, site, file));
  return true;
}

function wantsJson(req) {
  const accept = String(req.get('accept') || '');
  const type = String(req.get('content-type') || '');
  return type.includes('application/json') || accept.includes('application/json');
}

function createApp(options = {}) {
  const app = express();
  const leadStore = options.leadStore || createLeadStore(options.leadsPath);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  app.use((req, res, next) => {
    res.locals.site = siteFromRequest(req);
    const host = req.hostname || req.get('host');
    if (isPreviewHost(host) && (req.query.site === 'labs' || req.query.site === 'consumer')) {
      res.cookie('aorila_site', req.query.site, { path: '/', sameSite: 'lax' });
    }
    next();
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false }));

  app.get(['/', '/index.html'], (req, res) => {
    const host = req.hostname || req.get('host');
    if (isApiHost(host)) {
      return sendPage(res, 'consumer', 'api.html');
    }
    sendPage(res, res.locals.site, 'index.html');
  });

  app.get(['/api', '/api/', '/api.html'], (req, res) => {
    const host = req.hostname || req.get('host');
    if (isApiHost(host)) {
      return res.redirect(301, '/');
    }
    sendPage(res, res.locals.site, 'api.html');
  });

  app.get(['/docs', '/docs.html'], (req, res) => {
    sendPage(res, res.locals.site, 'docs.html');
  });

  app.get(['/tp', '/tp.html'], (req, res) => {
    sendPage(res, res.locals.site, 'tp.html');
  });

  app.get(['/privacy', '/privacy.html'], (req, res) => {
    return res.redirect(301, '/tp');
  });

  app.get(['/support', '/support.html'], (req, res) => {
    sendPage(res, res.locals.site, 'support.html');
  });

  app.get(['/terms', '/terms.html'], (req, res) => {
    return res.redirect(301, '/support');
  });

  app.post('/leads', (req, res) => {
    try {
      const result = leadStore.add(req.body || {}, {
        site: req.body?.site || res.locals.site,
        kind: req.body?.kind,
        host: req.hostname || req.get('host') || null,
      });
      if (wantsJson(req)) {
        return res.status(201).json({ ok: true, id: result.id || null, ignored: Boolean(result.ignored) });
      }
      const dest = res.locals.site === 'labs' ? '/?sent=1#contact' : CONSUMER_API_URL;
      return res.redirect(303, dest);
    } catch (err) {
      const status = err.status || 500;
      if (wantsJson(req)) {
        return res.status(status).json({ ok: false, error: err.message || 'Could not store lead.' });
      }
      return res.status(status).type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Could not send — Aorila</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/styles.css" /></head>
<body data-site="${res.locals.site}">
<header class="nav"><a class="wordmark" href="/">${res.locals.site === 'labs' ? 'Aorila Labs' : 'Aorila'}</a></header>
<main><section class="hero compact"><p class="eyebrow">Form</p><h1>Could not send that.</h1>
<p class="lede">${err.message || 'Try again, or email us directly.'}</p>
<div class="cta-row"><a class="cta primary" href="/">Home</a><a class="cta ghost" href="mailto:api@aorila.com">api@aorila.com</a></div>
</section></main>
<footer>
<nav class="footer-links" aria-label="Legal">
<a href="/tp">T &amp; P</a>
<a href="/support">Support</a>
</nav>
<span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span>
</footer>
</body></html>`);
    }
  });

  app.get('/healthz', (req, res) => {
    res.json({ ok: true, site: res.locals.site });
  });

  app.use((req, res) => {
    res.status(404).set('X-Aorila-Site', res.locals.site);
    res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Not found — Aorila</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/styles.css" /></head>
<body data-site="${res.locals.site}">
<header class="nav"><a class="wordmark" href="/">${res.locals.site === 'labs' ? 'Aorila Labs' : 'Aorila'}</a></header>
<main><section class="hero compact"><p class="eyebrow">404</p><h1>This page is not on this site.</h1>
<p class="lede">Try home, API access, T &amp; P, or Support.</p>
<div class="cta-row"><a class="cta primary" href="/">Home</a><a class="cta ghost" href="${res.locals.site === 'labs' ? '/api' : CONSUMER_API_URL}">API access</a></div>
</section></main>
<footer>
<nav class="footer-links" aria-label="Legal">
<a href="/tp">T &amp; P</a>
<a href="/support">Support</a>
</nav>
<span><a href="https://aorilalabs.com" data-local-site="labs">Aorila Labs</a></span>
</footer>
</body></html>`);
  });

  return app;
}

const PORT = Number(process.env.PORT || 3000);

if (require.main === module) {
  createApp().listen(PORT, '0.0.0.0', () => {
    console.log(`aorila-web :${PORT} (host → consumer | api.aorila.com → API | aorilalabs.com → labs)`);
  });
}

module.exports = { createApp, siteFromRequest };
