/** Dual-site Aorila — consumer (aorila.com) + Labs (aorilalabs.com) via Host */
const path = require('path');
const fs = require('fs');
const express = require('express');
const { resolveSite, isPreviewHost, isApiHost, CONSUMER_API_URL } = require('./lib/resolve-site');
const { createLeadStore } = require('./lib/leads');
const { injectConsumerNav } = require('./lib/consumer-nav');
const { MARKETING_SLUGS, renderMarketingPage } = require('./lib/marketing-pages');
const { renderCommercialPage } = require('./lib/commercial-pages');
const { proxyGpus } = require('./lib/compute-proxy');
const { createAccountStore, parseSid } = require('./lib/accounts');
const { mountAccountRoutes } = require('./lib/account-routes');

const ALLOWED_CORS_ORIGINS = new Set([
  'https://aorila.com',
  'https://www.aorila.com',
  'https://aorilalabs.com',
  'https://www.aorilalabs.com',
  'https://robotics.aorila.com',
]);

function cookieSite(req) {
  const raw = req.get('cookie') || '';
  const match = raw.match(/(?:^|;\s*)aorila_site=(labs|consumer)(?:;|$)/i);
  return match ? match[1] : null;
}

const SITES_DIR = path.join(__dirname, 'sites');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PAGES = new Set(['index.html', 'api.html', 'docs.html', 'support.html', 'tp.html', 'status.html', 'trust.html', 'compute.html', 'training.html', 'models.html', 'contact.html']);

function siteFromRequest(req) {
  return resolveSite({
    host: req.hostname || req.get('host'),
    querySite: req.query.site,
    headerSite: req.get('x-aorila-site'),
    cookieSite: cookieSite(req),
  });
}

function sendPage(res, site, file, opts = {}) {
  if (!PAGES.has(file)) return false;
  res.set('X-Aorila-Site', site);
  const filePath = path.join(SITES_DIR, site, file);
  if (site === 'consumer') {
    let html = fs.readFileSync(filePath, 'utf8');
    html = injectConsumerNav(html, {
      wordmarkHref: opts.wordmarkHref,
      apiCurrent: Boolean(opts.apiCurrent),
      accountUser: opts.user || null,
    });
    res.type('html').send(html);
    return true;
  }
  res.sendFile(filePath);
  return true;
}

function sendMarketing(res, slug, query, user) {
  const html = renderMarketingPage(slug, { query, user });
  if (!html) return false;
  res.set('X-Aorila-Site', 'consumer');
  res.type('html').send(html);
  return true;
}

function wantsJson(req) {
  const accept = String(req.get('accept') || '');
  const type = String(req.get('content-type') || '');
  return type.includes('application/json') || accept.includes('application/json');
}

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

const LEAD_ORIGIN_HOSTS = new Set([
  'aorila.com', 'www.aorila.com', 'api.aorila.com',
  'aorilalabs.com', 'www.aorilalabs.com', 'robotics.aorila.com', 'localhost', '127.0.0.1',
]);

function leadOriginAllowed(req) {
  const origin = req.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return LEAD_ORIGIN_HOSTS.has(host) || host.endsWith('.onrender.com');
  } catch {
    return false;
  }
}

function corsOriginAllowed(origin) {
  return ALLOWED_CORS_ORIGINS.has(String(origin || '').trim().toLowerCase());
}

const leadHits = new Map();
function leadRateOk(ip) {
  const key = String(ip || 'unknown');
  const now = Date.now();
  const recent = (leadHits.get(key) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 30) { leadHits.set(key, recent); return false; }
  recent.push(now);
  leadHits.set(key, recent);
  return true;
}

function notFoundHtml(site) {
  const wordmark = site === 'labs' ? 'Aorila <span class="soft">Labs</span>' : 'Aorila';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Not found — Aorila</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" /><link rel="stylesheet" href="/design.css" /></head>
<body class="ds" data-site="${site}">
<div class="topline"></div>
<header class="nav"><a class="wordmark" href="/">${wordmark}</a></header>
<main><section class="hero compact"><div class="wrap"><span class="hero-badge">404</span><h1>This page is not on this site.</h1>
<p class="lede">Try home, console, T & P, or Support.</p>
<div class="btn-row"><a class="btn acid" href="/">Home</a><a class="btn" href="/console">Console</a></div>
</div></section></main>
<footer class="site-footer"><div class="wrap">
<nav class="footer-links" aria-label="Legal">
<a href="/tp">T & P</a>
<a href="/support">Support</a>
<a href="https://api.aorila.com">Developer</a>
</nav>
</div></footer>
<script src="/site.js"></script>
</body></html>`;
}

function createApp(options = {}) {
  const app = express();
  const leadStore = options.leadStore || createLeadStore(options.leadsPath);
  const accountStore = options.accountStore || createAccountStore({
    dataDir: options.dataDir,
    secret: options.sessionSecret,
  });

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (!origin) return next();
    if (!corsOriginAllowed(origin)) {
      if (req.method === 'OPTIONS') return res.status(403).end();
      return next();
    }
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
    res.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    res.set('Vary', 'Origin');
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next();
  });

  app.use((req, res, next) => {
    res.locals.site = siteFromRequest(req);
    res.locals.user = accountStore.readSession(parseSid(req));
    const host = req.hostname || req.get('host');
    if (isPreviewHost(host) && (req.query.site === 'labs' || req.query.site === 'consumer')) {
      res.cookie('aorila_site', req.query.site, { path: '/', sameSite: 'lax' });
    }
    next();
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ['html'], index: false }));
  mountAccountRoutes(app, accountStore);
  app.get('/compute/v1/gpus', proxyGpus);

  app.get(['/', '/index.html'], (req, res) => {
    const host = req.hostname || req.get('host');
    if (isApiHost(host)) {
      return sendPage(res, 'consumer', 'api.html', { wordmarkHref: 'https://aorila.com', apiCurrent: true, user: res.locals.user });
    }
    sendPage(res, res.locals.site, 'index.html', { user: res.locals.user });
  });

  app.get(['/api', '/api/', '/api.html'], (req, res) => {
    const host = req.hostname || req.get('host');
    if (isApiHost(host)) return res.redirect(301, '/');
    if (res.locals.site === 'consumer') return sendPage(res, 'consumer', 'api.html', { apiCurrent: true, user: res.locals.user });
    sendPage(res, res.locals.site, 'api.html');
  });

  app.get(['/docs', '/docs.html'], (req, res) => {
    sendPage(res, res.locals.site, 'docs.html', { user: res.locals.user });
  });

  app.get(['/commercial', '/commercial/'], (req, res) => {
    if (res.locals.site !== 'consumer') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    res.set('X-Aorila-Site', 'consumer').type('html').send(renderCommercialPage('', { user: res.locals.user }));
  });

  app.get(['/commercial/:slug', '/commercial/:slug/'], (req, res) => {
    if (res.locals.site !== 'consumer') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    if (req.params.slug === 'console') return res.redirect(302, '/commercial/console');
    const html = renderCommercialPage(req.params.slug, { user: res.locals.user });
    if (!html) return res.status(404).type('html').send(notFoundHtml('consumer'));
    res.set('X-Aorila-Site', 'consumer').type('html').send(html);
  });

  // Legacy product URL: AI Models is now AI API.
  app.get(['/models', '/models/'], (req, res) => res.redirect(301, '/ai-api'));

  // Enterprise and Commercial are one path now.
  app.get(['/enterprise', '/enterprise/'], (req, res) => res.redirect(301, '/commercial'));

  for (const slug of MARKETING_SLUGS) {
    app.get([`/${slug}`, `/${slug}/`], (req, res) => {
      if (res.locals.site !== 'consumer') {
        return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
      }
      return sendMarketing(res, slug, req.query, res.locals.user);
    });
  }

  app.get(['/tp', '/tp.html'], (req, res) => sendPage(res, res.locals.site, 'tp.html', { user: res.locals.user }));
  app.get(['/privacy', '/privacy.html'], (req, res) => res.redirect(301, '/tp'));
  app.get(['/support', '/support.html'], (req, res) => sendPage(res, res.locals.site, 'support.html', { user: res.locals.user }));
  app.get(['/trust', '/trust.html'], (req, res) => {
    if (res.locals.site !== 'labs') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    sendPage(res, 'labs', 'trust.html', { user: res.locals.user });
  });
  app.get(['/compute', '/compute.html'], (req, res) => {
    if (res.locals.site !== 'labs') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    sendPage(res, 'labs', 'compute.html', { user: res.locals.user });
  });
  app.get(['/training', '/training.html'], (req, res) => {
    if (res.locals.site !== 'labs') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    sendPage(res, 'labs', 'training.html', { user: res.locals.user });
  });
  app.get(['/models', '/models.html'], (req, res) => {
    if (res.locals.site !== 'labs') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    sendPage(res, 'labs', 'models.html', { user: res.locals.user });
  });
  app.get(['/contact', '/contact.html'], (req, res) => {
    if (res.locals.site !== 'labs') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    sendPage(res, 'labs', 'contact.html', { user: res.locals.user });
  });
  app.get(['/status', '/status.html'], (req, res) => {
    if (res.locals.site !== 'consumer') {
      return res.status(404).set('X-Aorila-Site', res.locals.site).type('html').send(notFoundHtml(res.locals.site));
    }
    sendPage(res, 'consumer', 'status.html', { user: res.locals.user });
  });
  app.get(['/terms', '/terms.html'], (req, res) => res.redirect(301, '/support'));

  app.post('/leads', (req, res) => {
    const fail = (status, message) => {
      if (wantsJson(req)) return res.status(status).json({ ok: false, error: message });
      return res.status(status).type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Could not send — Aorila</title><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" /><link rel="stylesheet" href="/design.css" /></head>
<body class="ds" data-site="${escHtml(res.locals.site)}">
<div class="topline"></div>
<header class="nav"><a class="wordmark" href="/">Aorila</a></header>
<main><section class="hero compact"><div class="wrap"><span class="hero-badge">Error</span><h1>Could not send that.</h1><p class="lede">${escHtml(message)}</p><div class="btn-row"><a class="btn acid" href="/">Home</a></div></div></section></main>
<script src="/site.js"></script></body></html>`);
    };
    if (!leadOriginAllowed(req)) return fail(403, 'This form can only be submitted from Aorila sites.');
    if (!leadRateOk(req.ip || req.socket && req.socket.remoteAddress)) return fail(429, 'Too many requests.');
    try {
      const result = leadStore.add(req.body || {}, {
        site: (req.body && req.body.site) || res.locals.site,
        kind: req.body && req.body.kind,
        host: req.hostname || req.get('host') || null,
      });
      if (wantsJson(req)) return res.status(201).json({ ok: true, id: result.id || null, ignored: Boolean(result.ignored) });
      const kind = String((req.body && req.body.kind) || '').trim();
      let dest = CONSUMER_API_URL;
      if (res.locals.site === 'labs') dest = kind === 'contact' ? '/contact?sent=1' : '/?sent=1';
      else if (kind === 'provider') dest = '/providers?sent=1#apply';
      else dest = '/contact?sent=1';
      return res.redirect(303, dest);
    } catch (err) {
      return fail(err.status || 500, err.message || 'Could not store lead.');
    }
  });

  app.get('/healthz', (req, res) => res.json({ ok: true, site: res.locals.site }));
  app.use((req, res) => {
    res.status(404).set('X-Aorila-Site', res.locals.site);
    res.type('html').send(notFoundHtml(res.locals.site));
  });
  return app;
}

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET must be set in production. Refusing to start with the fallback secret.');
    process.exit(1);
  }
  createApp().listen(PORT, '0.0.0.0', () => {
    console.log('aorila-web :' + PORT);
  });
}
module.exports = { createApp, siteFromRequest, ALLOWED_CORS_ORIGINS };
