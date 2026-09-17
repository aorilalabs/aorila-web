const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../server');

// Labs-site completion checklist: every item below is asserted against the
// live-served pages on the aorilalabs.com host. "Always real, never fake" —
// unlaunched products say COMING SOON, prices come from the live offer API,
// legal pages are real terms, and no `#` fragments or dead /console links
// exist anywhere on Labs pages.
function request(port, { path = '/', headers = {}, method = 'GET' } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ hostname: '127.0.0.1', port, path, method, headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    r.on('error', reject);
    r.end();
  });
}

const LABS = { host: 'aorilalabs.com' };
const LABS_PATHS = ['/', '/learn', '/pricing', '/about', '/tp', '/terms'];
const DASH = 'https://dashboard.aorilalabs.com';

function hrefs(body) {
  return [...body.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
}

function sectionHtml(body, id) {
  const start = body.indexOf(`id="${id}"`);
  if (start === -1) return '';
  const secStart = body.lastIndexOf('<section', start);
  const secEnd = body.indexOf('</section>', start);
  return body.slice(secStart, secEnd);
}

function footerHtml(body) {
  const start = body.indexOf('<footer');
  const end = body.indexOf('</footer>');
  return body.slice(start, end);
}

function stripScripts(body) {
  return body.replace(/<script[\s\S]*?<\/script>/g, '');
}

describe('labs completion checklist', () => {
  let server;
  let port;
  const page = {};

  before(() => new Promise((resolve) => {
    server = createApp().listen(0, '127.0.0.1', async () => {
      port = server.address().port;
      for (const p of LABS_PATHS) {
        const res = await request(port, { path: p, headers: LABS });
        assert.equal(res.status, 200, `labs ${p}`);
        page[p] = res.body;
      }
      resolve();
    });
  }));

  after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  describe('1. /learn: unlaunched products show honest COMING SOON states', () => {
    const learn = () => page['/learn'];

    it('says GPU Pods are live today and the rest of the lineup is on the way', () => {
      assert.match(learn(), /GPU Pods are live today/);
      assert.match(learn(), /The rest of the lineup below is on the way/);
    });

    for (const slug of ['cpu-instances', 'serverless', 'clusters', 'storage']) {
      it(`product card for ${slug} carries a COMING SOON tag`, () => {
        assert.match(learn(), new RegExp(`<span class="tag soon">COMING SOON<\\/span>[\\s\\S]{0,400}data-scroll="${slug}"`));
      });
      it(`detail section for ${slug} carries a COMING SOON badge`, () => {
        assert.match(sectionHtml(learn(), slug), /<span class="soon-badge">COMING SOON<\/span>/);
      });
      it(`detail section for ${slug} has no dashboard launch CTA`, () => {
        assert.doesNotMatch(sectionHtml(learn(), slug), new RegExp(DASH.replace(/\//g, '\\/')));
      });
      it(`card for ${slug} links to the info section, not a launch flow`, () => {
        assert.match(learn(), new RegExp(`href="\\?section=${slug}"`));
      });
    }

    it('GPU Pods section has a real launch CTA to the dashboard', () => {
      const s = sectionHtml(learn(), 'gpu-pods');
      assert.match(s, />Launch a pod</);
      assert.match(s, new RegExp(`href="${DASH.replace(/\//g, '\\/')}\\/compute"`));
    });

    it('Hub section has a real browse CTA (launched product)', () => {
      const s = sectionHtml(learn(), 'hub');
      assert.match(s, />Browse the Hub</);
      assert.match(s, new RegExp(`href="${DASH.replace(/\//g, '\\/')}\\/hub"`));
    });
  });

  describe('2. /pricing: prices come from the real offer API', () => {
    const pricing = () => page['/pricing'];

    it('page lede promises real prices from the live marketplace', () => {
      assert.match(pricing(), /Real prices from the live marketplace/);
      assert.match(pricing(), /Hosts set their own rates/);
    });

    it('fetches the live GPU offer API', () => {
      assert.match(pricing(), /https:\/\/api\.aorilalabs\.com\/compute\/v1\/gpus/);
    });

    it('tries the live API first via fetch()', () => {
      assert.match(pricing(), /fetch\(API/);
    });

    it('renders no price cards in the served HTML — the grid starts empty', () => {
      assert.match(pricing(), /<div class="cards prod-grid" id="pricing-grid" aria-live="polite"><\/div>/);
    });

    it('shows an honest loading state, not placeholder prices', () => {
      assert.match(pricing(), /Loading live prices/);
    });

    it('unavailable state is honest — never invented numbers', () => {
      assert.match(pricing(), /we never show invented numbers/);
      assert.match(pricing(), /Open the dashboard to see current prices before you launch/);
    });

    it('build-time snapshot is labeled as a snapshot, never as live', () => {
      assert.match(pricing(), /Market snapshot from /);
      assert.match(pricing(), /the dashboard always shows the current market/);
    });

    it('ships with no baked fake data (placeholder is null)', () => {
      assert.match(pricing(), /\/\*__PRICING_DATA__\*\/null/);
    });

    it('no static per-GPU $/hr figures appear outside scripts', () => {
      assert.doesNotMatch(stripScripts(pricing()), /\$\d+\.\d/);
    });

    it('states the real billing facts: 1 credit = $1, stop at $0', () => {
      assert.match(pricing(), /1 credit = \$1/);
      assert.match(pricing(), /workloads stop at \$0/);
    });

    it('says the dashboard always shows the current market before launch', () => {
      assert.match(pricing(), /The dashboard always shows the current market before you launch/);
    });
  });

  describe('3. homepage: host vs renter messaging is unambiguous', () => {
    const home = () => page['/'];

    it('serves the Labs marketplace homepage', () => {
      assert.match(home(), /<title>Aorila Compute/);
      assert.match(home(), /Aorila Labs is a compute marketplace/);
    });

    it('hero names the renter side: rent GPU pods by the minute', () => {
      assert.match(home(), /Rent GPU pods by the minute on one simple bill/);
    });

    it('hero names the host side: list your own hardware and earn', () => {
      assert.match(home(), /list your own hardware and earn per minute/);
    });

    it('"Rent a GPU" CTA goes to the dashboard compute tab (renters)', () => {
      assert.match(home(), new RegExp(`<a class="btn acid" href="${DASH.replace(/\//g, '\\/')}\\/compute">Rent a GPU<\\/a>`));
    });

    it('"List your hardware" CTA goes to the dashboard earn tab (hosts)', () => {
      assert.match(home(), new RegExp(`<a class="btn" href="${DASH.replace(/\//g, '\\/')}\\/earn">List your hardware<\\/a>`));
    });

    it('FAQ answers who lists vs who rents', () => {
      assert.match(home(), /Do I need a GPU to earn as a host/);
      assert.match(home(), /can list, including a basic office PC/);
    });

    it('meta description names both sides of the marketplace', () => {
      assert.match(home(), /Hosts list their own GPUs/);
      assert.match(home(), /renters get compute on one simple bill/);
    });

    it('earnings simulator is labeled an estimate, never a promise', () => {
      assert.match(home(), /Earnings Simulator/);
      assert.match(home(), /ESTIMATE/);
      assert.match(home(), /Estimate only/);
      assert.match(home(), /Not a guarantee of income/);
    });

    it('stats band stays hidden until live numbers load (never faked)', () => {
      assert.match(home(), /<section class="pstats-band" id="stats" hidden>/);
    });

    it('about page: marketplace, not a datacenter — hosts list, renters rent', () => {
      assert.match(page['/about'], /A compute marketplace, not a cloud/);
      assert.match(page['/about'], /individuals and businesses list their own GPUs, CPUs, and storage/);
      assert.match(page['/about'], /anyone can rent that compute on one simple bill/);
    });
  });

  describe('4. /terms serves the real Terms of Service', () => {
    const terms = () => page['/terms'];

    it('has the Terms of Service heading', () => {
      assert.match(terms(), /<h2>Terms of Service<\/h2>/);
    });

    it('contains the full numbered sections', () => {
      for (const n of ['1. Services', '2. Your account', '3. Acceptable use', '4. Credits',
        '5. Payments and disputes', '6. Availability', '7. Limitation of liability',
        '8. Termination and suspension', '9. Changes to these terms',
        '10. Governing law', '11. Contact']) {
        assert.match(terms(), new RegExp(n.replace(/\./g, '\\.')), n);
      }
    });

    it('has real substance: per-minute billing, credits, governing law', () => {
      assert.match(terms(), /billed per minute against prepaid credits/);
      assert.match(terms(), /non-refundable/);
      assert.match(terms(), /laws of the State of South Carolina/);
      assert.match(terms(), /info@aorila\.com/);
    });

    it('canonicalizes to /terms', () => {
      assert.match(terms(), /<link rel="canonical" href="https:\/\/aorilalabs\.com\/terms" \/>/);
      assert.match(terms(), /<meta property="og:url" content="https:\/\/aorilalabs\.com\/terms" \/>/);
    });

    it('matches /tp terms content exactly (modulo the /terms canonical swap)', () => {
      const normalized = terms().split('https://aorilalabs.com/terms').join('https://aorilalabs.com/tp');
      assert.equal(normalized, page['/tp']);
    });

    it('has no placeholder text', () => {
      assert.doesNotMatch(terms(), /lorem ipsum/i);
      assert.doesNotMatch(terms(), /\bTBD\b/);
    });

    it('consumer host /terms still redirects to /support', async () => {
      const res = await request(port, { path: '/terms', headers: { host: 'aorila.com' } });
      assert.equal(res.status, 301);
      assert.match(String(res.headers.location || ''), /\/support/);
    });
  });

  describe('5. privacy policy covers processors, analytics, cookies, retention', () => {
    const tp = () => page['/tp'];

    it('has a Privacy Policy section', () => {
      assert.match(tp(), /<h2>Privacy Policy<\/h2>/);
    });

    it('names Stripe as a payment processor', () => {
      assert.match(tp(), /payment providers \(Stripe and Lemon Squeezy\)/);
    });

    it('names Lemon Squeezy as a payment processor', () => {
      assert.match(tp(), /Lemon Squeezy/);
    });

    it('says full card numbers are never received or stored', () => {
      assert.match(tp(), /we never receive or store full card numbers/);
    });

    it('names the real GA4 property ID', () => {
      assert.match(tp(), /Google Analytics 4 \(property G-68Z6SM8C4B\)/);
    });

    it('the GA4 tag on the page uses the same property ID the policy names', () => {
      assert.match(tp(), /gtag\/js\?id=G-68Z6SM8C4B/);
      assert.match(tp(), /gtag\('config', 'G-68Z6SM8C4B'\)/);
    });

    it('covers cookies: sign-in sessions and analytics cookies', () => {
      assert.match(tp(), /cookies for sign-in sessions and basic preferences/);
      assert.match(tp(), /analytics cookies as described above/);
    });

    it('has a data retention section', () => {
      assert.match(tp(), /<h3>Data retention<\/h3>/);
    });

    it('retention covers accounts, billing, host applications, analytics', () => {
      assert.match(tp(), /account and billing records while your account is active/);
      assert.match(tp(), /Host applications are kept while under review/);
      assert.match(tp(), /Analytics data is retained/);
    });

    it('deletion requests go to info@aorila.com', () => {
      assert.match(tp(), /request deletion of your account data/);
      assert.match(tp(), /mailto:info@aorila\.com/);
    });

    it('says personal information is not sold', () => {
      assert.match(tp(), /We do not sell your personal information/);
    });

    it('is real text with a last-updated date, not lorem', () => {
      assert.match(tp(), /Last updated: September 17, 2026/);
      assert.doesNotMatch(tp(), /lorem ipsum/i);
      assert.doesNotMatch(tp(), /\bTBD\b/);
    });
  });

  describe('6. no # fragments, no dead /console links, dashboard URLs are absolute', () => {
    for (const p of LABS_PATHS) {
      it(`${p}: no # fragment in any href`, () => {
        for (const h of hrefs(page[p])) assert.ok(!h.includes('#'), `${p} -> ${h}`);
      });
      it(`${p}: no /console links`, () => {
        for (const h of hrefs(page[p])) assert.ok(!h.includes('/console'), `${p} -> ${h}`);
        assert.doesNotMatch(page[p], /\/console/);
      });
    }

    it('footer Docs and Support point at full dashboard URLs', () => {
      for (const p of LABS_PATHS) {
        const f = footerHtml(page[p]);
        assert.match(f, new RegExp(`<a href="${DASH.replace(/\//g, '\\/')}\\/docs">Docs<\\/a>`), p);
        assert.match(f, new RegExp(`<a href="${DASH.replace(/\//g, '\\/')}\\/support">Support<\\/a>`), p);
      }
    });

    it('footer Hub link uses ?section= style, never #', () => {
      for (const p of LABS_PATHS) {
        assert.match(footerHtml(page[p]), /<a href="\/learn\?section=hub">Hub<\/a>/, p);
      }
    });

    it('learn cards use ?section= anchors for in-page jumps', () => {
      assert.match(page['/learn'], /href="\?section=gpu-pods"/);
      assert.match(page['/learn'], /data-scroll="gpu-pods"/);
    });

    for (const [path, target] of [
      ['/support', `${DASH}/support`],
      ['/contact', `${DASH}/support`],
      ['/compute', `${DASH}/compute`],
      ['/gaming', `${DASH}/gaming`],
      ['/sell', `${DASH}/earn`],
    ]) {
      it(`${path} redirects to ${target} with no #`, async () => {
        const res = await request(port, { path, headers: LABS });
        assert.equal(res.status, 301, path);
        assert.equal(res.headers.location, target);
        assert.ok(!String(res.headers.location).includes('#'));
      });
    }
  });

  describe('7. footer labels are correct', () => {
    const foot = (p) => footerHtml(page[p]);

    for (const label of ['Learn', 'Pricing', 'Hub', 'Docs', 'Support', 'About']) {
      it(`footer has a "${label}" link on every page`, () => {
        for (const p of LABS_PATHS) assert.match(foot(p), new RegExp(`>${label}<`), `${p} ${label}`);
      });
    }

    it('footer has the "T & P" legal link on every page', () => {
      for (const p of LABS_PATHS) assert.match(foot(p), /<a href="\/tp">T &amp; P<\/a>/, p);
    });

    it('footer has no misleading "API" label', () => {
      for (const p of LABS_PATHS) assert.doesNotMatch(foot(p), />API</, p);
    });

    it('footer carries the real contact email', () => {
      for (const p of LABS_PATHS) assert.match(foot(p), /mailto:info@aorila\.com/, p);
    });

    it('footer carries the public phone number', () => {
      for (const p of LABS_PATHS) assert.match(foot(p), /\(803\) 386-1704/, p);
    });

    it('footer carries the location', () => {
      for (const p of LABS_PATHS) assert.match(foot(p), /Columbia, SC/, p);
    });

    it('footer is byte-identical across all Labs pages', () => {
      const first = foot(LABS_PATHS[0]);
      for (const p of LABS_PATHS.slice(1)) assert.equal(foot(p), first, p);
    });

    it('header Dashboard CTA points at the dashboard on every page', () => {
      for (const p of LABS_PATHS) {
        assert.match(page[p], new RegExp(`<a class="nav-cta nav-far" href="${DASH.replace(/\//g, '\\/')}\\/?(signin)?"`), p);
      }
    });
  });

  describe('8. /sell forwards to the dashboard Earn tab; sitemap is clean', () => {
    it('/sell.html also redirects to the Earn tab', async () => {
      const res = await request(port, { path: '/sell.html', headers: LABS });
      assert.equal(res.status, 301);
      assert.equal(res.headers.location, `${DASH}/earn`);
    });

    it('/sell on the consumer host is a 404 (labs-only route)', async () => {
      const res = await request(port, { path: '/sell', headers: { host: 'aorila.com' } });
      assert.equal(res.status, 404);
    });

    for (const u of ['/sell', '/terms', '/tp', '/learn', '/pricing', '/about']) {
      it(`sitemap lists ${u}`, async () => {
        const res = await request(port, { path: '/sitemap.xml', headers: LABS });
        assert.equal(res.status, 200);
        assert.match(res.body, new RegExp(`<loc>https://aorilalabs\\.com${u.replace(/\//g, '\\/')}<\\/loc>`));
      });
    }

    it('sitemap has no /console entries', async () => {
      const res = await request(port, { path: '/sitemap.xml', headers: LABS });
      assert.doesNotMatch(res.body, /\/console/);
    });
  });

  describe('9. site-wide consistency', () => {
    it('GA4 property G-68Z6SM8C4B is on every Labs page', () => {
      for (const p of LABS_PATHS) assert.match(page[p], /G-68Z6SM8C4B/, p);
    });

    it('cache-busted labs.css is on every Labs page', () => {
      for (const p of LABS_PATHS) assert.match(page[p], /\/labs\.css\?v=4/, p);
    });

    it('every Labs page declares the Labs API origin', () => {
      for (const p of LABS_PATHS) {
        assert.match(page[p], /<meta name="aorila-api-origin" content="https:\/\/dashboard\.aorilalabs\.com" \/>/, p);
      }
    });

    it('trust line present on the legal page', () => {
      assert.match(page['/tp'], /Trust and security is number one/);
    });
  });
});
