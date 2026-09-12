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
  '<footer><nav class="footer-links" aria-label="Legal"><a href="/tp">T & P</a><a href="/support">Support</a><a href="https://api.aorila.com">Developer</a></nav></footer>';

function wrap({ title, body, user, commercial }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)} — Aorila</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" /><link rel="stylesheet" href="/styles.css" /></head><body data-site="consumer"${commercial ? ' class="commercial"' : ''}>${consumerNav({ accountUser: user, commercialCurrent: Boolean(commercial) })}${body}${FOOTER}<script src="/site.js"></script><script src="/price.js"></script></body></html>`;
}

function navItem(href, label, section) {
  const current = href === '/console/' + section || (section === 'home' && href === '/console');
  return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
}

function consoleWrap({ title, user, balanceCents, section, main }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — Aorila</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/console.css" />
</head>
<body class="console" data-site="consumer">
  <div class="console-app">
    <header class="console-top">
      <button class="console-menu-btn" type="button" data-console-menu aria-label="Open menu">☰</button>
      <a class="console-brand" href="/console">Aorila</a>
      <div class="console-balance"><span>${money(balanceCents)}</span><a href="/console/billing">+</a></div>
      <form method="post" action="/logout"><button class="console-close" type="submit" aria-label="Close session">×</button></form>
    </header>
    <div class="console-frame">
      <nav class="console-nav" id="console-nav" aria-label="Console">
        <input class="console-search" type="search" placeholder="Search" aria-label="Search console" />
        ${navItem('/console', 'Home', section)}
        ${navItem('/console/hub', 'Hub', section)}
        <div class="nav-label">Resources</div>
        ${navItem('/console/serverless', 'Serverless', section)}
        ${navItem('/console/pods', 'Pods', section)}
        ${navItem('/console/clusters', 'Clusters', section)}
        ${navItem('/console/storage', 'Storage', section)}
        <div class="nav-label">Account</div>
        ${navItem('/console/account', 'Account', section)}
        ${navItem('/console/billing', 'Billing', section)}
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

function authForm({ mode, error, next }) {
  const signup = mode === 'signup';
  return wrap({
    title: signup ? 'Create account' : 'Sign in',
    user: null,
    body: `<main><section class="hero compact"><p class="hero-badge">Account</p><h1>${signup ? 'Create an Aorila account.' : 'Sign in to Aorila.'}</h1><p class="lede">${signup ? 'One account for pods, billing, and the console.' : 'Open the console to start compute.'}</p>${error ? `<p class="form-status err">${esc(error)}</p>` : ''}<form class="waitlist" method="post" action="${signup ? '/signup' : '/login'}"><input type="hidden" name="next" value="${esc(next || '/console')}" />${signup ? '<label>Name<input name="name" required autocomplete="name" /></label><label>Company<input name="company" autocomplete="organization" /></label>' : ''}<label>Email<input type="email" name="email" required autocomplete="email" /></label><label>Password<input type="password" name="password" required minlength="8" /></label>${signup ? '<label>Account type<select name="plan"><option value="on-demand">On-demand</option><option value="commercial">Commercial</option></select></label>' : ''}<button class="cta primary" type="submit">${signup ? 'Create account' : 'Sign in'}</button></form><p class="price-note">${signup ? 'Already have an account? <a href="/login">Sign in</a>.' : 'No account? <a href="/signup">Create one</a>.'}</p></section></main>`,
  });
}

function machineList(machines) {
  if (!machines.length) return '<p class="console-note">No pods yet. Press New to start one.</p>';
  return machines
    .map((m) => {
      const open = m.jupyter
        ? `<a class="cta primary" href="${esc(m.jupyter)}" target="_blank" rel="noreferrer">Open notebook</a>`
        : '';
      const stop =
        m.status === 'stopped' || m.status === 'failed'
          ? ''
          : `<form method="post" action="/console/stop/${esc(m.id)}"><button class="cta ghost" type="submit">Stop</button></form>`;
      return `<div class="console-pod"><div><b>${esc(m.name || m.sku)}</b><div class="console-meta"><span>$${Number(m.usdPerHour || 0).toFixed(2)}/hr</span><span>${esc(m.sku || '')}</span><span>${esc(m.status)}</span></div></div><div class="console-actions">${open}${stop}</div></div>`;
    })
    .join('');
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

function liveBlock() {
  return '<div class="console-card"><h2>Live catalog</h2><div data-live-prices data-start="1"></div></div>';
}

function agentCard() {
  return `<div class="console-card"><h2>Onboard your agent to Aorila</h2><p class="console-note">Paste one line into your coding agent. It pulls the Aorila agent setup from Atraly docs, then it can deploy pods and serverless.</p><p class="console-note">Copy this into your coding agent</p><code>Set up Aorila for me: fetch https://docs.atraly.com/agent</code></div>`;
}

function consolePage({ user, balanceCents, machines, bookings, error, notice, section }) {
  const sec = section || 'home';
  const first = String(user.name || 'there').split(' ')[0];
  const flash = `${error ? `<p class="form-status err">${esc(error)}</p>` : ''}${notice ? `<p class="form-status ok">${esc(notice)}</p>` : ''}`;
  const tabs = `<nav class="console-tabs" aria-label="Console views"><a href="/console"${sec === 'home' ? ' aria-current="page"' : ''}>Home</a><a href="/console/billing"${sec === 'billing' ? ' aria-current="page"' : ''}>Billing</a></nav>`;
  const actions = `<div class="console-actions"><a class="cta ghost" href="/console">Customize</a><a class="cta primary" href="/console/pods">+ New</a></div>`;

  let main = '';
  if (sec === 'billing') {
    main = `${flash}<h1>Billing</h1>${tabs}<div class="console-card"><p class="console-note">Balance ${money(balanceCents)}. This is workspace credit, not a card charge yet.</p><form class="waitlist" method="post" action="/console/credits"><label>Amount<select name="dollars"><option value="25">$25</option><option value="100" selected>$100</option><option value="500">$500</option><option value="1000">$1,000</option></select></label><button class="cta primary" type="submit">Add credits</button></form></div>`;
  } else if (sec === 'account') {
    main = `${flash}<h1>Account</h1><div class="console-card"><p class="console-note">${esc(user.name)} · ${esc(user.email || '')}<br />${esc(user.company || 'On-demand')}</p><form method="post" action="/logout"><button class="cta ghost" type="submit">Sign out</button></form></div>`;
  } else if (sec === 'storage') {
    main = `${flash}<h1>Storage</h1><div class="console-card"><p class="console-note">Network volumes attach to pods after a start. Nothing stored yet.</p></div>`;
  } else if (sec === 'hub' || sec === 'serverless' || sec === 'pods' || sec === 'clusters' || sec === 'deployments') {
    const titles = { hub: 'Hub', serverless: 'Serverless', pods: 'Pods', clusters: 'Clusters', deployments: 'Deployments' };
    main = `${flash}<h1>${titles[sec]}</h1>${actions}${sec === 'pods' ? `<div class="console-card"><h2>Recent Pods</h2>${machineList(machines)}</div>` : ''}${liveBlock()}`;
  } else {
    main = `${flash}<h1>Ahoy, ${esc(first)}!</h1>${actions}${tabs}${agentCard()}<div class="console-card"><h2>Recent Pods</h2>${machineList(machines)}</div>${bookings && bookings.length ? `<div class="console-card"><h2>Commercial</h2>${bookingRows(bookings)}</div>` : ''}`;
  }

  return consoleWrap({ title: 'Console', user, balanceCents, section: sec, main });
}

function billingPage(opts) {
  return consolePage({ ...opts, section: 'billing' });
}

function commercialConsole({ user, bookings, error, notice }) {
  return wrap({
    title: 'Commercial portal',
    user,
    commercial: true,
    body: `<div class="ms-shell"><nav class="ms-rail" aria-label="Commercial"><a href="/commercial">Overview</a><a href="/commercial/vms">Planned VMs</a><a href="/commercial/reserved">Reserved</a><a href="/commercial/console" aria-current="page">Portal</a><a href="/console">On-demand console</a><a href="/console/billing">Billing</a></nav><main class="ms-main"><p class="ms-kicker">Commercial</p><h1>Organization portal</h1><p class="lede">${esc(user.company || user.name)} — planned VMs and reserved hours.</p>${error ? `<p class="form-status err">${esc(error)}</p>` : ''}${notice ? `<p class="form-status ok">${esc(notice)}</p>` : ''}<h2>Request capacity</h2><form class="waitlist" method="post" action="/commercial/console/book"><label>Kind<select name="kind"><option value="planned-vm">Planned VM</option><option value="reserved">Reserved hours</option></select></label><label>Machine / SKU<input name="sku" required placeholder="Aorila H100 80GB" /></label><label>Window<input name="window" required placeholder="14 days starting Oct 1" /></label><label>Notes<textarea name="notes" rows="3"></textarea></label><button class="cta primary" type="submit">Submit request</button></form><h2>Open requests</h2>${bookingRows(bookings)}</main></div>`,
  });
}

module.exports = { authForm, consolePage, billingPage, commercialConsole, wrap };
