/** Host / query / header → "consumer" | "labs" */

const LABS_HOSTS = new Set(['aorilalabs.com', 'www.aorilalabs.com']);
const CONSUMER_HOSTS = new Set(['aorila.com', 'www.aorila.com']);
/**
 * Entity map (legal separation):
 *  - Aorila (parent, DE C-corp): aorila.com + parent console (donations, emails, updates)
 *  - Aorila Labs (Labs LLC): aorilalabs.com + dashboard.aorilalabs.com + api.aorilalabs.com
 *  - Atraly (Atraly LLC): atraly.com + api.atraly.com (consumer API, Labs-managed)
 * Entities share ONLY login. api.aorila.com does not exist. The API hosts are
 * pure JSON APIs — never pages. Separate Renders + Supabase projects are deferred.
 */
const CONSUMER_API_ORIGIN = 'https://api.aorilalabs.com';
const CONSUMER_API_URL = `${CONSUMER_API_ORIGIN}/`;
/** Canonical home of the parent (Aorila) console. Overridable until its render is split. */
const PARENT_CONSOLE_ORIGIN = String(process.env.CONSOLE_ORIGIN || '').trim().replace(/\/+$/, '') || 'https://console.aorila.com';

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
  CONSUMER_API_ORIGIN,
  CONSUMER_API_URL,
  PARENT_CONSOLE_ORIGIN,
  normalizeHost,
  isPreviewHost,
  resolveSite,
};
