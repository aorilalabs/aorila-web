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

/**
 * Priority: ?site= → X-Aorila-Site → Host.
 * Query/header overrides exist so localhost and *.onrender.com can preview either face.
 */
function resolveSite({ host, querySite, headerSite } = {}) {
  return (
    normalizeOverride(querySite) ||
    normalizeOverride(headerSite) ||
    (LABS_HOSTS.has(normalizeHost(host)) ? 'labs' : 'consumer')
  );
}

module.exports = {
  LABS_HOSTS,
  CONSUMER_HOSTS,
  normalizeHost,
  resolveSite,
};
