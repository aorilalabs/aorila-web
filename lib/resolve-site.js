/** Host / query / header → "consumer" | "labs" */

const LABS_HOSTS = new Set(['aorilalabs.com', 'www.aorilalabs.com']);
const CONSUMER_HOSTS = new Set(['aorila.com', 'www.aorila.com']);

function normalizeHost(host) {
  return String(host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
}

function normalizeOverride(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'labs' || v === 'consumer') return v;
  return null;
}

function isPreviewHost(host) {
  const h = normalizeHost(host);
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.onrender.com');
}

/**
 * Priority: ?site= → X-Aorila-Site → preview cookie → Host.
 * Query/header/cookie overrides exist so localhost and *.onrender.com can preview either face.
 * Custom domains always follow Host unless a query/header is sent.
 */
function resolveSite({ host, querySite, headerSite, cookieSite, allowPreviewCookie } = {}) {
  const allowCookie =
    allowPreviewCookie === undefined ? isPreviewHost(host) : Boolean(allowPreviewCookie);
  return (
    normalizeOverride(querySite) ||
    normalizeOverride(headerSite) ||
    (allowCookie ? normalizeOverride(cookieSite) : null) ||
    (LABS_HOSTS.has(normalizeHost(host)) ? 'labs' : 'consumer')
  );
}

module.exports = {
  LABS_HOSTS,
  CONSUMER_HOSTS,
  normalizeHost,
  isPreviewHost,
  resolveSite,
};
