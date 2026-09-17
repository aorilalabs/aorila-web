#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { MARKETING_SLUGS, renderMarketingPage } = require('../lib/marketing-pages');
const { COMMERCIAL_SLUGS, renderCommercialPage } = require('../lib/commercial-pages');
const siteRuntime = require('../public/site.js');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SITES_DIR = path.join(ROOT, 'sites');
const DIST_DIR = path.join(ROOT, 'dist');
const SITE = String(process.argv[2] || '').trim().toLowerCase();
const VALID_SITES = new Set(['consumer', 'labs', 'robotics']);
const STATIC_API_ORIGIN = String(process.env.STATIC_API_ORIGIN || '').trim();
const STATIC_DASHBOARD_ORIGIN = String(process.env.STATIC_DASHBOARD_ORIGIN || '').trim();
// Parent (Aorila) console home. Entities share only login; the console is never
// on an API host. api.aorila.com does not exist.
const STATIC_CONSOLE_ORIGIN = String(process.env.STATIC_CONSOLE_ORIGIN || '').trim().replace(/\/+$/, '') || 'https://console.aorila.com';
// Per-site API origins. Never api.aorila.com (does not exist); API hosts are JSON-only.
const SITE_API_ORIGIN = {
  consumer: STATIC_API_ORIGIN || 'https://api.aorilalabs.com',
  labs: STATIC_API_ORIGIN || 'https://dashboard.aorilalabs.com',
  robotics: STATIC_API_ORIGIN || 'https://api.aorilalabs.com',
};

// GA4 measurement ID per site: consumer = aorila.com, labs = aorilalabs.com.
// robotics has no property; redirectPage() then emits no tag.
const SITE_GA_ID = {
  consumer: 'G-064VLFE5ZY',
  labs: 'G-68Z6SM8C4B',
  robotics: '',
};

function gaSnippet(measurementId) {
  if (!measurementId) return '';
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${measurementId}');
</script>`;
}

if (!VALID_SITES.has(SITE)) {
  console.error('Usage: node scripts/build-site.js <consumer|labs|robotics>');
  process.exit(1);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function withApiMeta(html) {
  const apiOrigin = SITE_API_ORIGIN[SITE] || STATIC_API_ORIGIN;
  if (!apiOrigin) return html;
  const meta = `<meta name="${siteRuntime.META_NAME}" content="${apiOrigin}" />`;
  if (html.includes(`name="${siteRuntime.META_NAME}"`)) return html;
  return html.replace(/<head>/i, `<head>\n  ${meta}`);
}

function writeHtml(root, relativePath, html) {
  const normalized = relativePath.replace(/^\/+/, '');
  const full = path.join(root, normalized);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, withApiMeta(html));
}

function writeRoute(root, route, html) {
  const clean = String(route || '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) {
    writeHtml(root, 'index.html', html);
    return;
  }
  writeHtml(root, `${clean}.html`, html);
  writeHtml(root, path.join(clean, 'index.html'), html);
}

function redirectPage(title, target) {
  const gaTag = gaSnippet(SITE_GA_ID[SITE] || '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
${gaTag}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0; url=${target}" />
  <title>${title}</title>
  <link rel="canonical" href="${target}" />
</head>
<body>
  <p>Redirecting to <a href="${target}">${target}</a>…</p>
  <script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>`;
}

function buildConsumer(targetDir) {
  const consumerDir = path.join(SITES_DIR, 'consumer');
  for (const file of fs.readdirSync(consumerDir)) {
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(consumerDir, file), 'utf8');
    const route = file === 'index.html' ? '' : file.replace(/\.html$/, '');
    writeRoute(targetDir, route, html);
  }
  for (const slug of MARKETING_SLUGS) {
    writeRoute(targetDir, slug === 'search' ? 'search' : slug, renderMarketingPage(slug, {}));
  }
  writeRoute(targetDir, 'commercial', renderCommercialPage('', {}));
  for (const slug of COMMERCIAL_SLUGS) {
    if (!slug) continue;
    writeRoute(targetDir, `commercial/${slug}`, renderCommercialPage(slug, {}));
  }
  const apiOrigin = STATIC_CONSOLE_ORIGIN;
  for (const route of ['console', 'account', 'dashboard', 'login', 'signin', 'signup', 'register']) {
    writeRoute(targetDir, route, redirectPage(`Redirecting to ${route}`, `${apiOrigin}/${route}`));
  }
  writeRoute(targetDir, 'models', redirectPage('Redirecting to AI API', '/ai-api'));
  writeRoute(targetDir, 'enterprise', redirectPage('Redirecting to enterprise', '/commercial'));
  writeRoute(targetDir, 'privacy', redirectPage('Redirecting to T & P', '/tp'));
  writeRoute(targetDir, 'terms', redirectPage('Redirecting to support', '/support'));
}

/* Live GPU catalog for the /pricing page. Fetched at build time so the static
   page ships with real, timestamped numbers. Never throws: returns null when
   the API is unreachable, and the page then shows an honest "unavailable"
   state instead of invented prices. */
const GPU_CATALOG_URL = 'https://api.aorilalabs.com/compute/v1/gpus';
async function fetchPricingSnapshot() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let res;
    try {
      res = await fetch(GPU_CATALOG_URL, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    const offers = (data && data.offers) || [];
    if (!offers.length) return null;
    const asOf = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }) + ' ET';
    return {
      asOf,
      offers: offers.map((o) => ({
        name: o.name, sku: o.sku, vramGb: o.vramGb, class: o.class,
        usdPerHour: o.usdPerHour, placeable: o.placeable,
      })),
    };
  } catch {
    return null;
  }
}

async function buildLabs(targetDir) {
  const labsDir = path.join(SITES_DIR, 'labs');
  const dashboardOrigin = STATIC_DASHBOARD_ORIGIN || 'https://dashboard.aorilalabs.com';
  // Render subdomains are disabled: bounce any *.onrender.com visitor to our domain.
  const renderBounce = '<script>if(/(^|\\.)onrender\\.com$/i.test(location.hostname))location.replace("https://aorilalabs.com"+location.pathname+location.search);</script>';
  const withBounce = (html) => String(html).replace(/<\/head>/i, `  ${renderBounce}\n</head>`);
  // The Labs home page stays its own page; everything else lives inside the dashboard.
  writeRoute(targetDir, '', withBounce(fs.readFileSync(path.join(labsDir, 'index.html'), 'utf8')));
  // Every Labs content page lives inside the dashboard now — these routes redirect there.
  const dashboardRoutes = {
    'console': '/',
    'compute': '/compute',
    'api': '/api',
    'training': '/compute',
    'models': '/compute',
    'docs': '/docs',
    'support': '/support',
    'trust': '/support',
    'contact': '/support',
  };
  for (const [route, target] of Object.entries(dashboardRoutes)) {
    writeRoute(targetDir, route, redirectPage('Redirecting to dashboard', `${dashboardOrigin}${target}`));
  }
  // Legal stays a standalone page — the dashboard has no legal section.
  writeRoute(targetDir, 'tp', withBounce(fs.readFileSync(path.join(labsDir, 'tp.html'), 'utf8')));
  // /terms serves the actual terms: same content as /tp, canonicalized to /terms.
  const termsHtml = fs.readFileSync(path.join(labsDir, 'tp.html'), 'utf8')
    .replace(/https:\/\/aorilalabs\.com\/tp/g, 'https://aorilalabs.com/terms');
  writeRoute(targetDir, 'terms', withBounce(termsHtml));
  // Seller onboarding lives in the dashboard's Earn tab now — /sell forwards there.
  writeRoute(targetDir, 'sell', redirectPage('Redirecting to Earn', `${dashboardOrigin}/earn`));
  writeRoute(targetDir, 'learn', withBounce(fs.readFileSync(path.join(labsDir, 'learn.html'), 'utf8')));
  // Pricing: bake the live catalog snapshot into the page. The page tries the
  // live API in the browser first and falls back to this timestamped snapshot.
  const pricingSnapshot = await fetchPricingSnapshot();
  if (!pricingSnapshot) console.warn('labs build: GPU catalog unreachable — /pricing ships with an honest unavailable state');
  const pricingHtml = fs.readFileSync(path.join(labsDir, 'pricing.html'), 'utf8')
    .replace('/*__PRICING_DATA__*/null', '/*__PRICING_DATA__*/' + JSON.stringify(pricingSnapshot));
  writeRoute(targetDir, 'pricing', withBounce(pricingHtml));
  writeRoute(targetDir, 'about', withBounce(fs.readFileSync(path.join(labsDir, 'about.html'), 'utf8')));
  // robots.txt + sitemap.xml for the Labs site.
  fs.writeFileSync(
    path.join(targetDir, 'robots.txt'),
    'User-agent: *\nAllow: /\nSitemap: https://aorilalabs.com/sitemap.xml\n'
  );
  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemapUrls = ['', '/learn', '/pricing', '/about', '/sell', '/tp', '/terms']
    .map((p) => `  <url><loc>https://aorilalabs.com${p || '/'}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n');
  fs.writeFileSync(
    path.join(targetDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
  );
}

function buildRobotics(targetDir) {
  const html = fs.readFileSync(path.join(SITES_DIR, 'robotics', 'index.html'), 'utf8');
  writeRoute(targetDir, '', html);
}

const targetDir = path.join(DIST_DIR, SITE);
fs.rmSync(targetDir, { recursive: true, force: true });
ensureDir(targetDir);
copyDir(PUBLIC_DIR, targetDir);

if (SITE === 'consumer') { buildConsumer(targetDir); done(); }
else if (SITE === 'labs') buildLabs(targetDir).then(done, (err) => { console.error(err); process.exit(1); });
else { buildRobotics(targetDir); done(); }

function done() {
  console.log(`Built ${SITE} site into ${path.relative(ROOT, targetDir)}`);
}
