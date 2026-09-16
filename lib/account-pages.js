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
  '<footer class="site-footer"><div class="wrap"><nav class="footer-links" aria-label="Legal"><a href="/tp">T & P</a><a href="/support">Support</a><a href="/partner">Partners</a><a href="/contact">Contact</a><a href="https://api.aorila.com">Developer</a></nav><div class="footer-meta"><span>Aorila</span></div></div></footer>';

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />';

function wrap({ title, body, user, commercial }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)} — Aorila</title><link rel="icon" href="/favicon.svg" type="image/svg+xml" />${FONTS}<link rel="stylesheet" href="/design.css" /></head><body class="ds" data-site="consumer"><div class="topline"></div>${consumerNav({ accountUser: user, commercialCurrent: Boolean(commercial) })}${body}${FOOTER}<script src="/site.js"></script><script src="/price.js"></script></body></html>`;
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
  ${FONTS}
  <link rel="stylesheet" href="/design.css" />
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
    body: `<main class="auth-main"><div class="auth-card"><span class="hero-badge">Account</span><h1>${signup ? 'Create an Aorila account.' : 'Sign in to Aorila.'}</h1><p class="lede">${signup ? 'One account for Aorila and Atraly — pods, billing, and the console.' : 'One login for Aorila and Atraly. Open the console to start compute.'}</p>${error ? `<p class="form-status err">${esc(error)}</p>` : ''}<form class="waitlist" method="post" action="${signup ? '/signup' : '/login'}"><input type="hidden" name="next" value="${esc(next || '/console')}" />${signup ? '<label>NAME<input name="name" required autocomplete="name" /></label>' : ''}<label>EMAIL<input type="email" name="email" required autocomplete="email" /></label><label>PASSWORD<input type="password" name="password" required minlength="8" /></label><button class="btn acid" type="submit">${signup ? 'Create account' : 'Sign in'}</button></form><p class="price-note" style="margin-top:14px">${signup ? 'Already have an account? <a href="/login">Sign in</a>.' : 'No account? <a href="/signup">Create one</a>.'}</p></div></main>`,
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
      return `<div class="console-pod"><div><a href="/console/pods/${esc(m.id)}"><b>${esc(m.name || m.sku)}</b></a><div class="console-meta"><span>$${Number(m.usdPerHour || 0).toFixed(2)}/hr</span><span>${esc(m.sku || '')}</span><span>${esc(m.status)}</span></div></div><div class="console-actions">${open}${stop}</div></div>`;
    })
    .join('');
}

function endpointList(endpoints) {
  if (!endpoints.length) return '<p class="console-note">No endpoints yet.</p>';
  return endpoints
    .map(
      (e) =>
        `<div class="console-pod"><div><b>${esc(e.name)}</b><div class="console-meta"><span>${esc(e.sku || 'auto')}</span><span>${esc(e.minWorkers)}-${esc(e.maxWorkers)} workers</span><span>${esc(e.status)}</span></div></div></div>`
    )
    .join('');
}

function volumeList(volumes) {
  if (!volumes.length) return '<p class="console-note">No volumes yet.</p>';
  return volumes
    .map(
      (v) =>
        `<div class="console-pod"><div><b>${esc(v.name)}</b><div class="console-meta"><span>${esc(v.sizeGb)} GB</span><span>${esc(v.region)}</span><span>${esc(v.status)}</span></div></div></div>`
    )
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
  return '<div class="console-card"><h2>Live catalog</h2><div data-live-prices="offers" data-start="1"></div></div>';
}

function agentCard() {
  return `<div class="console-card"><h2>Onboard your agent to Aorila</h2><p class="console-note">Paste one line into your coding agent. It pulls the Aorila agent setup, then it can deploy pods and serverless.</p><p class="console-note">Copy this into your coding agent</p><code>Set up Aorila for me: fetch https://aorila.com/agent</code></div>`;
}

function flashBlock(error, notice) {
  return `${error ? `<p class="form-status err">${esc(error)}</p>` : ''}${notice ? `<p class="form-status ok">${esc(notice)}</p>` : ''}`;
}

function newChooserPage({ user, balanceCents, error, notice }) {
  const main = `${flashBlock(error, notice)}<h1>New</h1><p class="console-note">Pick what to start.</p>
    <div class="chooser-grid">
      <a class="chooser" href="/console/pods/new"><b>Pod</b><span>Dedicated GPU with Jupyter.</span></a>
      <a class="chooser" href="/console/serverless/new"><b>Serverless</b><span>Autoscale workers on a URL.</span></a>
      <a class="chooser" href="/console/storage/new"><b>Volume</b><span>Persistent disk for pods.</span></a>
      <a class="chooser" href="/console/clusters"><b>Cluster</b><span>Multi-node jobs. Commercial path.</span></a>
    </div>`;
  return consoleWrap({ title: 'New', user, balanceCents, section: 'home', main });
}

function deployPodPage({ user, balanceCents, sku, offerId, error, notice }) {
  const main = `${flashBlock(error, notice)}<h1>Deploy a pod</h1>
    <form class="waitlist" method="get" action="/console/start">
      <input type="hidden" name="offerId" value="${esc(offerId || '')}" />
      <label>Name<input name="name" value="aorila-pod" required /></label>
      <label>SKU<input name="sku" value="${esc(sku || '')}" required placeholder="rtx-4090-24" /></label>
      <label>Template<select name="image"><option value="aorila/jupyter">Aorila Jupyter</option><option value="aorila/pytorch">Aorila PyTorch</option></select></label>
      <label>Disk (GB)<input name="diskGb" type="number" min="10" value="20" /></label>
      <label class="check"><input type="checkbox" name="jupyterOn" value="1" checked /> Start Jupyter</label>
      <button class="cta primary" type="submit">Deploy pod</button>
    </form>
    <p class="console-note">Or pick a live offer below. That fills the start with the exact pool.</p>
    ${liveBlock()}`;
  return consoleWrap({ title: 'Deploy pod', user, balanceCents, section: 'pods', main });
}

function podDetailPage({ user, balanceCents, machine, error, notice }) {
  const m = machine;
  const open = m.jupyter
    ? `<a class="cta primary" href="${esc(m.jupyter)}" target="_blank" rel="noreferrer">Open notebook</a>`
    : '';
  const stop =
    m.status === 'stopped' || m.status === 'failed'
      ? ''
      : `<form method="post" action="/console/stop/${esc(m.id)}"><button class="cta ghost" type="submit">Stop</button></form>`;
  const main = `${flashBlock(error, notice)}<h1>${esc(m.name || m.sku)}</h1>
    <div class="console-actions">${open}${stop}<a class="cta ghost" href="/console/pods">All pods</a></div>
    <div class="console-card">
      <div class="console-meta">
        <span>${esc(m.status)}</span>
        <span>$${Number(m.usdPerHour || 0).toFixed(2)}/hr</span>
        <span>${esc(m.sku)}</span>
        <span>${esc(m.region || 'global')}</span>
        <span>${esc(m.diskGb || 20)} GB</span>
      </div>
      <p class="console-note">${esc(m.message || 'Pod record on Aorila.')}</p>
    </div>`;
  return consoleWrap({ title: m.name || 'Pod', user, balanceCents, section: 'pods', main });
}

function newEndpointPage({ user, balanceCents, error, notice }) {
  const main = `${flashBlock(error, notice)}<h1>New endpoint</h1>
    <form class="waitlist" method="post" action="/console/serverless">
      <label>Name<input name="name" value="aorila-endpoint" required /></label>
      <label>Image<input name="image" value="aorila/worker" required /></label>
      <label>SKU<input name="sku" placeholder="rtx-4090-24" /></label>
      <label>Min workers<input name="minWorkers" type="number" min="0" value="0" /></label>
      <label>Max workers<input name="maxWorkers" type="number" min="1" value="3" /></label>
      <button class="cta primary" type="submit">Create endpoint</button>
    </form>`;
  return consoleWrap({ title: 'New endpoint', user, balanceCents, section: 'serverless', main });
}

function newVolumePage({ user, balanceCents, error, notice }) {
  const main = `${flashBlock(error, notice)}<h1>New volume</h1>
    <form class="waitlist" method="post" action="/console/storage">
      <label>Name<input name="name" value="workspace" required /></label>
      <label>Size (GB)<input name="sizeGb" type="number" min="10" value="20" /></label>
      <label>Region<input name="region" value="us" /></label>
      <button class="cta primary" type="submit">Create volume</button>
    </form>`;
  return consoleWrap({ title: 'New volume', user, balanceCents, section: 'storage', main });
}

function consolePage({ user, balanceCents, machines, bookings, endpoints, volumes, credits, error, notice, section }) {
  const sec = section || 'home';
  const first = String(user.name || 'there').split(' ')[0];
  const flash = flashBlock(error, notice);
  const tabs = `<nav class="console-tabs" aria-label="Console views"><a href="/console"${sec === 'home' ? ' aria-current="page"' : ''}>Home</a><a href="/console/billing"${sec === 'billing' ? ' aria-current="page"' : ''}>Billing</a></nav>`;
  const actions = `<div class="console-actions"><a class="cta primary" href="/console/new">+ New</a></div>`;
  const eps = endpoints || [];
  const vols = volumes || [];
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
  } else if (sec === 'storage') {
    main = `${flash}<h1>Storage</h1>${actions}<div class="console-card"><h2>Volumes</h2>${volumeList(vols)}</div>`;
  } else if (sec === 'serverless') {
    main = `${flash}<h1>Serverless</h1>${actions}<div class="console-card"><h2>Endpoints</h2>${endpointList(eps)}</div>${liveBlock()}`;
  } else if (sec === 'hub') {
    main = `${flash}<h1>Hub</h1>${actions}<div class="console-card"><p class="console-note">Templates land here. Deploy a pod from the catalog for now.</p></div>${liveBlock()}`;
  } else if (sec === 'clusters' || sec === 'deployments') {
    main = `${flash}<h1>${sec === 'clusters' ? 'Clusters' : 'Deployments'}</h1>${actions}<div class="console-card"><p class="console-note">Multi-node and reserved layouts go through Enterprise.</p><a class="cta ghost" href="/commercial/console">Open Enterprise portal</a></div>`;
  } else if (sec === 'pods') {
    main = `${flash}<h1>Pods</h1>${actions}<div class="console-card"><h2>Recent Pods</h2>${machineList(machines)}</div>${liveBlock()}`;
  } else {
    main = `${flash}<h1>Welcome back, ${esc(first)}.</h1>${actions}${tabs}${agentCard()}<div class="console-card"><h2>Recent Pods</h2>${machineList(machines)}</div>${bookings && bookings.length ? `<div class="console-card"><h2>Enterprise</h2>${bookingRows(bookings)}</div>` : ''}`;
  }

  return consoleWrap({ title: 'Console', user, balanceCents, section: sec, main });
}

function billingPage(opts) {
  return consolePage({ ...opts, section: 'billing' });
}

function commercialConsole({ user, bookings, error, notice }) {
  return wrap({
    title: 'Enterprise portal',
    user,
    commercial: true,
    body: `<main>
      <section class="hero compact"><div class="wrap">
        <span class="hero-badge">Enterprise</span>
        <h1>Organization portal</h1>
        <p class="lede">${esc(user.company || user.name)} — planned VMs and reserved hours.</p>
        ${error ? `<p class="form-status err">${esc(error)}</p>` : ''}${notice ? `<p class="form-status ok">${esc(notice)}</p>` : ''}
      </div></section>
      <section class="section"><div class="wrap">
        <nav class="chips" aria-label="Enterprise" style="margin-bottom:26px">
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
  newChooserPage,
  deployPodPage,
  podDetailPage,
  newEndpointPage,
  newVolumePage,
};
