'use strict';

const { consumerNav } = require('./consumer-nav');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function money(cents) {
  return '$' + (Number(cents || 0) / 100).toFixed(2);
}

const FOOTER =
  '<footer class="site-footer"><div class="wrap footer-single"><a class="footer-logo" href="/" aria-label="Aorila home"><img src="/logo-aorila.svg" alt="Aorila" /></a><nav class="footer-links" aria-label="Legal"><a href="/tp">T & P</a><a href="/support">Support</a><a href="/partner">Partners</a><a href="/contact">Contact</a><a href="https://aorila.com/api">Developer</a></nav></div></footer>';

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />';

function wrap({ title, body, user, commercial, origin, consoleSite }) {
  // Entity rule: every site declares its own API origin. Without this meta,
  // public/site.js rewrites relative form actions to the Labs API fallback,
  // which breaks console auth. The origin is the site serving the page.
  const apiMeta = origin ? `<meta name="aorila-api-origin" content="${esc(origin)}" />` : '';
  const consoleCss = consoleSite ? '<link rel="stylesheet" href="/console.css" />' : '';
  const bodyClass = consoleSite ? 'ds console' : 'ds';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />${apiMeta}<title>${esc(title)} — Aorila</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" />${FONTS}<link rel="stylesheet" href="/design.css" />${consoleCss}</head><body class="${bodyClass}" data-site="consumer"><div class="topline"></div>${consumerNav({ accountUser: user, commercialCurrent: Boolean(commercial) })}${body}${FOOTER}<script src="/site.js"></script><script src="/price.js"></script></body></html>`;
}

function navItem(href, label, section) {
  const current = href === '/console/' + section || (section === 'home' && href === '/console');
  return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
}

function consoleWrap({ title, user, balanceCents, section, main, origin }) {
  const apiMeta = origin ? `<meta name="aorila-api-origin" content="${esc(origin)}" />` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${apiMeta}
  <title>${esc(title)} — Aorila</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  ${FONTS}
  <link rel="stylesheet" href="/design.css" />
  <link rel="stylesheet" href="/console.css" />
</head>
<body class="ds console" data-site="consumer">
  <div class="topline"></div>
  <div class="console-app">
    <header class="console-top">
      <button class="console-menu-btn" type="button" data-console-menu aria-label="Open menu">☰</button>
      <a class="console-brand" href="/console">Aorila</a>
      <div class="console-balance"><span>${money(balanceCents)}</span><a href="/console/billing">+</a></div>
      <form method="post" action="/logout"><button class="console-close" type="submit" aria-label="Close session">×</button></form>
    </header>
    <div class="console-frame">
      <nav class="console-nav" id="console-nav" aria-label="Console">
        ${navItem('/console', 'Home', section)}
        <div class="nav-label">Account</div>
        ${navItem('/console/account', 'Account', section)}
        ${navItem('/console/billing', 'Billing', section)}
        <div class="nav-label">Support</div>
        <a href="/contact">Feedback</a>
        <a href="/support">Support & resources</a>
        <a href="/contact">Talk to Sales</a>
      </nav>
      <main class="console-main">${main}</main>
    </div>
  </div>
  <script src="/site.js"></script>
  <script src="/price.js"></script>
  <script>
    document.querySelector('[data-console-menu]')?.addEventListener('click', function () {
      document.body.classList.toggle('console-nav-open');
    });
  </script>
</body>
</html>`;
}

function authForm({ mode, error, next, origin, consoleSite }) {
  const signup = mode === 'signup';
  return wrap({
    title: signup ? 'Create account' : 'Sign in',
    user: null,
    origin,
    consoleSite,
    body: `<main class="auth-main"><div class="auth-card"><span class="hero-badge">Account</span><h1>${signup ? 'Create an Aorila account.' : 'Sign in to Aorila.'}</h1><p class="lede">Your Aorila account is separate from Atraly and Aorila Labs.</p>${error ? `<p class="form-status err">${esc(error)}</p>` : ''}<form class="waitlist" method="post" action="${signup ? '/signup' : '/login'}"><input type="hidden" name="next" value="${esc(next || '/console')}" />${signup ? '<label>NAME<input name="name" required autocomplete="name" /></label>' : ''}<label>EMAIL<input type="email" name="email" required autocomplete="email" /></label><label>PASSWORD<input type="password" name="password" required minlength="8" /></label><button class="btn acid" type="submit">${signup ? 'Create account' : 'Sign in'}</button></form><p class="price-note" style="margin-top:14px">${signup ? 'Already have an account? <a href="/login">Sign in</a>.' : 'No account? <a href="/signup">Create one</a>.'}</p></div></main>`,
  });
}

function bookingRows(bookings) {
  if (!bookings.length) return '<p class="console-note">No planned VMs or reserved hours yet.</p>';
  return (
    '<div class="table-wrap"><table class="sku-table"><thead><tr><th>Request</th><th>Kind</th><th>Window</th><th>Status</th></tr></thead><tbody>' +
    bookings
      .map((b) => `<tr><td>${esc(b.name || b.sku)}</td><td>${esc(b.kind)}</td><td>${esc(b.window || '—')}</td><td>${esc(b.status)}</td></tr>`)
      .join('') +
    '</tbody></table></div>'
  );
}

function flashBlock(error, notice) {
  return `${error ? `<p class="form-status err">${esc(error)}</p>` : ''}${notice ? `<p class="form-status ok">${esc(notice)}</p>` : ''}`;
}

// Parent-company console (Aorila): account and billing. Never links out to Labs.
function consolePage({ user, balanceCents, bookings, credits, error, notice, section, origin }) {
  const sec = section || 'home';
  const first = String(user.name || 'there').split(' ')[0];
  const flash = flashBlock(error, notice);
  const tabs = `<nav class="console-tabs" aria-label="Console views"><a href="/console"${sec === 'home' ? ' aria-current="page"' : ''}>Home</a><a href="/console/billing"${sec === 'billing' ? ' aria-current="page"' : ''}>Billing</a></nav>`;
  const ledger = credits || [];

  let main = '';
  if (sec === 'billing') {
    const rows = ledger.length
      ? '<div class="table-wrap"><table class="sku-table"><thead><tr><th>When</th><th>Note</th><th>Amount</th></tr></thead><tbody>' +
        ledger
          .map((c) => `<tr><td>${esc(String(c.createdAt || '').slice(0, 16))}</td><td>${esc(c.note)}</td><td>${money(c.cents)}</td></tr>`)
          .join('') +
        '</tbody></table></div>'
      : '<p class="console-note">No movements yet.</p>';
    main = `${flash}<h1>Billing</h1>${tabs}<div class="console-card"><p class="console-note">Balance ${money(balanceCents)}. Workspace credit only. Card checkout opens soon — credits are granted after a paid purchase.</p><form class="waitlist" method="post" action="/console/credits"><label>Amount<select name="dollars"><option value="25">$25</option><option value="100" selected>$100</option><option value="500">$500</option><option value="1000">$1,000</option></select></label><button class="cta primary" type="submit">Add credits — opens soon</button></form></div><div class="console-card"><h2>Usage</h2>${rows}</div>`;
  } else if (sec === 'account') {
    main = `${flash}<h1>Account</h1><div class="console-card"><p class="console-note">${esc(user.name)} · ${esc(user.email || '')}<br />${esc(user.company || 'On-demand')}</p><form method="post" action="/logout"><button class="cta ghost" type="submit">Sign out</button></form></div>`;
  } else {
    main = `${flash}<h1>Welcome back, ${esc(first)}.</h1>${tabs}${bookings && bookings.length ? `<div class="console-card"><h2>Capacity</h2>${bookingRows(bookings)}</div>` : ''}`;
  }

  return consoleWrap({ title: 'Console', user, balanceCents, section: sec, main, origin });
}

function billingPage(opts) {
  return consolePage({ ...opts, section: 'billing' });
}

function commercialConsole({ user, bookings, error, notice, origin, consoleSite }) {
  return wrap({
    title: 'Capacity portal',
    user,
    commercial: true,
    origin,
    consoleSite,
    body: `<main>
      <section class="hero compact"><div class="wrap">
        <span class="hero-badge">Capacity</span>
        <h1>Capacity portal</h1>
        <p class="lede">${esc(user.company || user.name)} — planned VMs and reserved hours.</p>
        ${error ? `<p class="form-status err">${esc(error)}</p>` : ''}${notice ? `<p class="form-status ok">${esc(notice)}</p>` : ''}
      </div></section>
      <section class="section"><div class="wrap">
        <nav class="chips" aria-label="Capacity" style="margin-bottom:26px">
          <a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/commercial">Overview</a>
          <a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/commercial/vms">Planned VMs</a>
          <a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/commercial/reserved">Reserved</a>
          <a class="chip acid" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/commercial/console" aria-current="page">Portal</a>
          <a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/console">On-demand console</a>
          <a class="chip" style="text-decoration:none;color:#10100f;padding:8px 14px" href="/console/billing">Billing</a>
        </nav>
        <div class="console-card" style="margin-top:0">
          <h2>Request capacity</h2>
          <form class="waitlist" method="post" action="/commercial/console/book">
            <label>KIND<select name="kind"><option value="planned-vm">Planned VM</option><option value="reserved">Reserved hours</option></select></label>
            <label>MACHINE / SKU<input name="sku" required placeholder="Aorila H100 80GB" /></label>
            <label>WINDOW<input name="window" required placeholder="14 days starting Oct 1" /></label>
            <label>NOTES<textarea name="notes" rows="3"></textarea></label>
            <button class="btn acid" type="submit">Submit request</button>
          </form>
        </div>
        <div class="console-card"><h2>Open requests</h2>${bookingRows(bookings)}</div>
      </div></section>
    </main>`,
  });
}

module.exports = {
  authForm,
  consolePage,
  billingPage,
  commercialConsole,
  wrap,
};
