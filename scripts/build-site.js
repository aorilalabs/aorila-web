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
  if (!STATIC_API_ORIGIN) return html;
  const meta = `<meta name="${siteRuntime.META_NAME}" content="${STATIC_API_ORIGIN}" />`;
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
  return `<!DOCTYPE html>
<html lang="en">
<head>
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
  const apiOrigin = STATIC_API_ORIGIN || 'https://api.aorila.com';
  for (const route of ['console', 'account', 'dashboard', 'login', 'signin', 'signup', 'register']) {
    writeRoute(targetDir, route, redirectPage(`Redirecting to ${route}`, `${apiOrigin}/${route}`));
  }
  writeRoute(targetDir, 'commercial/console', redirectPage('Redirecting to commercial console', `${apiOrigin}/commercial/console`));
  writeRoute(targetDir, 'models', redirectPage('Redirecting to AI API', '/ai-api'));
  writeRoute(targetDir, 'enterprise', redirectPage('Redirecting to enterprise', '/commercial'));
  writeRoute(targetDir, 'privacy', redirectPage('Redirecting to T & P', '/tp'));
  writeRoute(targetDir, 'terms', redirectPage('Redirecting to support', '/support'));
}

function buildLabs(targetDir) {
  const labsDir = path.join(SITES_DIR, 'labs');
  const dashboardOrigin = STATIC_DASHBOARD_ORIGIN || 'https://dashboard.aorilalabs.com';
  // Render subdomains are disabled: bounce any *.onrender.com visitor to our domain.
  const renderBounce = '<script>if(/(^|\\.)onrender\\.com$/i.test(location.hostname))location.replace("https://aorilalabs.com"+location.pathname+location.search+location.hash);</script>';
  const withBounce = (html) => String(html).replace(/<\/head>/i, `  ${renderBounce}\n</head>`);
  // The Labs home page stays its own page; everything else lives inside the dashboard.
  writeRoute(targetDir, '', withBounce(fs.readFileSync(path.join(labsDir, 'index.html'), 'utf8')));
  // Every Labs content page lives inside the dashboard now — these routes redirect there.
  const dashboardRoutes = {
    'console': '/',
    'compute': '/#compute',
    'api': '/#docs',
    'training': '/#compute',
    'models': '/#compute',
    'gaming': '/#gaming',
    'docs': '/#docs',
    'support': '/#support',
    'trust': '/#support',
    'contact': '/#support',
  };
  for (const [route, target] of Object.entries(dashboardRoutes)) {
    writeRoute(targetDir, route, redirectPage('Redirecting to dashboard', `${dashboardOrigin}${target}`));
  }
  // Legal stays a standalone page — the dashboard has no legal section.
  writeRoute(targetDir, 'tp', withBounce(fs.readFileSync(path.join(labsDir, 'tp.html'), 'utf8')));
}

function buildRobotics(targetDir) {
  const html = fs.readFileSync(path.join(SITES_DIR, 'robotics', 'index.html'), 'utf8');
  writeRoute(targetDir, '', html);
}

const targetDir = path.join(DIST_DIR, SITE);
fs.rmSync(targetDir, { recursive: true, force: true });
ensureDir(targetDir);
copyDir(PUBLIC_DIR, targetDir);

if (SITE === 'consumer') buildConsumer(targetDir);
else if (SITE === 'labs') buildLabs(targetDir);
else buildRobotics(targetDir);

console.log(`Built ${SITE} site into ${path.relative(ROOT, targetDir)}`);
