(function () {
  'use strict';

  // Entity rule: sites share ONLY login. The API origin is the Labs API
  // (api.aorilalabs.com) for commercial uses; api.aorila.com does not exist.
  // Every page must still declare its own origin via <meta name="aorila-api-origin">.
  const CUSTOM_API_ORIGIN = 'https://api.aorilalabs.com';
  const META_NAME = 'aorila-api-origin';
  const DYNAMIC_PATHS = [
    '/leads',
    '/login',
    '/signin',
    '/signup',
    '/register',
    '/logout',
    '/console',
    '/account',
    '/dashboard',
    '/compute/',
    '/commercial/console',
  ];

  function normalizeOrigin(origin) {
    return String(origin || '').trim().replace(/\/+$/, '');
  }

  function resolveApiOrigin(loc, doc) {
    const meta = doc && doc.querySelector ? doc.querySelector(`meta[name="${META_NAME}"]`) : null;
    const metaOrigin = normalizeOrigin(meta && meta.getAttribute('content'));
    if (metaOrigin) return metaOrigin;

    const locationLike = loc || (typeof location !== 'undefined' ? location : null);
    const host = String(locationLike && locationLike.hostname || '').toLowerCase();
    if (!host) return CUSTOM_API_ORIGIN;
    if (host === 'localhost' || host === '127.0.0.1') {
      const protocol = locationLike.protocol || 'http:';
      return `${protocol}//${host}:3000`;
    }
    return CUSTOM_API_ORIGIN;
  }

  function isDynamicPath(pathname) {
    return DYNAMIC_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
  }

  function toApiHref(href, loc, doc) {
    if (!href || !href.startsWith('/')) return href;
    const locationLike = loc || (typeof location !== 'undefined' ? location : null);
    const base = locationLike ? locationLike.origin : 'https://aorila.com';
    const url = new URL(href, base);
    if (!isDynamicPath(url.pathname)) return href;
    return resolveApiOrigin(locationLike, doc) + url.pathname + url.search + url.hash;
  }

  function apiUrl(pathname, loc, doc) {
    const path = String(pathname || '/');
    return resolveApiOrigin(loc, doc) + (path.startsWith('/') ? path : `/${path}`);
  }

  function rewriteDynamicAttrs(root, loc, doc) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('a[href^="/"]').forEach((a) => {
      const rewritten = toApiHref(a.getAttribute('href'), loc, doc);
      if (rewritten) a.setAttribute('href', rewritten);
    });
    root.querySelectorAll('form[action^="/"]').forEach((form) => {
      const rewritten = toApiHref(form.getAttribute('action'), loc, doc);
      if (rewritten) form.setAttribute('action', rewritten);
    });
  }

  const api = {
    META_NAME,
    DYNAMIC_PATHS,
    resolveApiOrigin,
    isDynamicPath,
    toApiHref,
    apiUrl,
    rewriteDynamicAttrs,
  };
  if (typeof window !== 'undefined') window.AorilaSite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (typeof document === 'undefined') return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('in');
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('.section, .hero').forEach((el) => io.observe(el));

  const host = location.hostname;
  const previewHost = host === 'localhost' || host === '127.0.0.1';
  const preview = new URLSearchParams(location.search).get('site');
  const sent = new URLSearchParams(location.search).get('sent');

  if (previewHost) {
    document.querySelectorAll('[data-local-site]').forEach((a) => {
      const site = a.getAttribute('data-local-site');
      if (site === 'labs' || site === 'consumer') {
        a.setAttribute('href', '/?site=' + site);
      }
    });
  }

  rewriteDynamicAttrs(document, location, document);

  if (sent === '1') {
    document.querySelectorAll('.waitlist .form-status').forEach((el) => {
      el.textContent = 'Received. We will follow up by email.';
      el.classList.add('ok');
    });
  }

  function isLeadForm(form) {
    if (form.hasAttribute('data-native')) return false;
    const action = String(form.getAttribute('action') || '');
    if (/\/(login|signup|logout|console|commercial|account)/i.test(action)) return false;
    return action === '' || action === '/leads' || form.hasAttribute('data-lead');
  }

  document.querySelectorAll('form.waitlist').forEach((form) => {
    if (!isLeadForm(form)) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = form.querySelector('.form-status');
      const button = form.querySelector('button[type="submit"]');
      const payload = {};
      new FormData(form).forEach((value, key) => {
        payload[key] = String(value).trim();
      });
      if (!payload.site) payload.site = document.body.getAttribute('data-site') || '';
      if (!payload.kind) payload.kind = form.getAttribute('data-kind') || 'contact';
      if (status) {
        status.classList.remove('ok', 'err');
        status.textContent = 'Sending…';
      }
      if (button) button.disabled = true;
      try {
        const res = await fetch(apiUrl('/leads', location, document), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not send.');
        form.reset();
        if (status) {
          status.classList.add('ok');
          status.textContent = 'Received. We will follow up by email.';
        }
      } catch (err) {
        if (status) {
          status.classList.add('err');
          status.textContent = (err && err.message) || 'Could not send. Use the email link.';
        }
      } finally {
        if (button) button.disabled = false;
      }
    });
  });

  if (preview === 'labs' || preview === 'consumer') {
    document.querySelectorAll('a[href^="/"]').forEach((a) => {
      if (a.hasAttribute('data-local-site')) return;
      const url = new URL(a.getAttribute('href'), location.origin);
      if (!url.searchParams.has('site')) {
        url.searchParams.set('site', preview);
        a.setAttribute('href', url.pathname + url.search + url.hash);
      }
    });
  }

  document.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = document.getElementById(el.getAttribute('data-scroll-to'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // ?section=<slug> deep links — no # fragments anywhere. On page load, scroll
  // to the matching section; same-page [data-scroll] links smooth-scroll in
  // place and keep the URL in sync via history.replaceState.
  function sectionTarget(slug) {
    if (!slug) return null;
    return document.querySelector('section[data-scroll="' + slug + '"]') || document.getElementById(slug);
  }
  document.querySelectorAll('a[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const slug = a.getAttribute('data-scroll');
      const target = sectionTarget(slug);
      if (!target) return;
      let samePage = false;
      try { samePage = new URL(a.href).pathname === location.pathname; } catch { samePage = false; }
      if (samePage) {
        e.preventDefault();
        history.replaceState(null, '', location.pathname + '?section=' + encodeURIComponent(slug));
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  const initialSection = sectionTarget(new URLSearchParams(location.search).get('section'));
  if (initialSection) initialSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const header = document.querySelector('header.nav');
  const toggle = document.querySelector('.nav-toggle');
  const sidebar = document.querySelector('.nav-sidebar');
  const backdrop = document.querySelector('[data-nav-backdrop]');

  function setSidebarOpen(open) {
    if (!header || !toggle || !sidebar) return;
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-sidebar-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      sidebar.removeAttribute('hidden');
      sidebar.removeAttribute('aria-hidden');
      sidebar.removeAttribute('inert');
      if (backdrop) backdrop.removeAttribute('hidden');
      requestAnimationFrame(() => {
        sidebar.classList.add('is-open');
      });
    } else {
      sidebar.classList.remove('is-open');
      sidebar.setAttribute('aria-hidden', 'true');
      sidebar.setAttribute('inert', '');
      document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => {
        el.classList.remove('is-open');
        const btn = el.querySelector('.nav-dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      window.setTimeout(() => {
        if (!sidebar.classList.contains('is-open')) {
          sidebar.setAttribute('hidden', '');
          if (backdrop) backdrop.setAttribute('hidden', '');
        }
      }, 220);
    }
  }

  if (sidebar && !sidebar.classList.contains('is-open')) {
    sidebar.setAttribute('aria-hidden', 'true');
    sidebar.setAttribute('inert', '');
  }

  if (header && toggle && sidebar) {
    toggle.addEventListener('click', () => {
      setSidebarOpen(!sidebar.classList.contains('is-open'));
    });
  }
  document.querySelectorAll('[data-nav-close]').forEach((btn) => {
    btn.addEventListener('click', () => setSidebarOpen(false));
  });
  if (backdrop) {
    backdrop.addEventListener('click', () => setSidebarOpen(false));
  }

  document.querySelectorAll('.nav-dropdown').forEach((dropdown) => {
    const button = dropdown.querySelector('.nav-dropdown-toggle');
    if (!button) return;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains('is-open');
      document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => {
        el.classList.remove('is-open');
        const btn = el.querySelector('.nav-dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        dropdown.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => {
      el.classList.remove('is-open');
      const btn = el.querySelector('.nav-dropdown-toggle');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => {
      el.classList.remove('is-open');
      const btn = el.querySelector('.nav-dropdown-toggle');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
    if (document.body.classList.contains('nav-sidebar-open')) {
      setSidebarOpen(false);
    }
    closeSearch();
  });

  const overlay = document.querySelector('[data-search-overlay]');
  const searchInput = overlay && overlay.querySelector('input[type="search"]');

  function openSearch() {
    if (!overlay) return;
    setSidebarOpen(false);
    overlay.hidden = false;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  function closeSearch() {
    if (!overlay) return;
    overlay.hidden = true;
  }

  document.querySelectorAll('[data-search-open]').forEach((btn) => {
    btn.addEventListener('click', openSearch);
  });
  document.querySelectorAll('[data-search-close]').forEach((btn) => {
    btn.addEventListener('click', closeSearch);
  });
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeSearch();
    });
  }
  /* shared mega menu: hovering/clicking any tab opens the one white panel */
  document.querySelectorAll('.nav-mega').forEach((mega) => {
    const panel = mega.querySelector(':scope > .nav-mega-panel');
    if (!panel) return;
    const toggles = Array.from(mega.querySelectorAll('.nav-mega-toggle'));
    const closeMega = () => {
      mega.classList.remove('is-open');
      toggles.forEach((t) => t.setAttribute('aria-expanded', 'false'));
    };
    toggles.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        const willOpen = !mega.classList.contains('is-open');
        document.querySelectorAll('.nav-mega.is-open').forEach((m) => m.classList.remove('is-open'));
        document.querySelectorAll('.nav-dropdown.is-open').forEach((el) => {
          el.classList.remove('is-open');
          const b2 = el.querySelector('.nav-dropdown-toggle');
          if (b2) b2.setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          mega.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
    document.addEventListener('click', (event) => {
      if (!mega.contains(event.target)) closeMega();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMega();
    });
    /* grace period: keep the panel alive while the pointer crosses the dead
       zone between the tabs and the panel, so it can't flicker shut */
    let closeTimer = null;
    mega.addEventListener('mouseleave', () => {
      clearTimeout(closeTimer);
      mega.classList.add('is-closing');
      closeTimer = setTimeout(() => mega.classList.remove('is-closing'), 350);
    });
    mega.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      mega.classList.remove('is-closing');
    });
  });

  /* hero typewriter: the whole headline (including the highlighted "here")
     types and erases as one flowing unit, so words never orphan mid-line.
     Smart backspace only retypes what changed between phrases ("Your " and
     "here." are shared, so just the middle words swap). Keystrokes are
     humanized with +/-30% jitter. The h1 keeps its tallest height so the
     page below never jumps, and the caret rides the typing frontier. */
  (function heroTypewriter() {
    var el = document.getElementById('heroType');
    if (!el) return;
    var h1 = el.closest('h1');
    var hereEl = document.getElementById('heroHere');
    var dotEl = document.getElementById('heroDot');
    var caret = h1 ? h1.querySelector('.type-caret') : null;
    if (!h1 || !hereEl || !dotEl || !caret) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var phrases = [
      { t: 'Compute Earns More', h: 'Here' },
      { t: 'AI Runs Better', h: 'Here' },
      { t: 'You Fit In', h: 'Here' },
    ];
    var TYPE_MS = 65, ERASE_MS = 50, HOLD_MS = 2000;
    var pi = 0, mode = 'hold';
    function caretTo(seg) { seg.appendChild(caret); }
    function setFull(idx) {
      var p = phrases[idx];
      el.textContent = p.t;
      hereEl.textContent = p.h;
      dotEl.textContent = '.';
      caretTo(dotEl);
    }
    function stabilize() {
      var cur = pi, maxH = 0;
      for (var k = 0; k < phrases.length; k++) { setFull(k); maxH = Math.max(maxH, h1.offsetHeight); }
      setFull(cur);
      h1.style.minHeight = maxH + 'px';
    }
    function human(base) { return base * (0.7 + Math.random() * 0.6); }
    function commonPrefix(a, b) {
      var n = Math.min(a.length, b.length), i = 0;
      while (i < n && a.charAt(i) === b.charAt(i)) i++;
      return i;
    }
    function tick() {
      if (mode === 'type') {
        var p = phrases[pi];
        if (el.textContent.length < p.t.length) {
          el.textContent += p.t.charAt(el.textContent.length);
          caretTo(el);
          setTimeout(tick, human(TYPE_MS));
        } else {
          mode = 'hold'; setTimeout(tick, HOLD_MS);
        }
      } else if (mode === 'erase') {
        var next = phrases[(pi + 1) % phrases.length];
        if (hereEl.textContent !== next.h || dotEl.textContent !== '.') {
          var seg;
          if (dotEl.textContent) { dotEl.textContent = ''; seg = dotEl; }
          else if (hereEl.textContent) { hereEl.textContent = hereEl.textContent.slice(0, -1); seg = hereEl; }
          else { el.textContent = el.textContent.slice(0, -1); seg = el; }
          caretTo(seg);
          setTimeout(tick, human(ERASE_MS));
          return;
        }
        var keep = commonPrefix(el.textContent, next.t);
        if (el.textContent.length > keep) {
          el.textContent = el.textContent.slice(0, -1);
          caretTo(el);
          setTimeout(tick, human(ERASE_MS));
        } else {
          pi = (pi + 1) % phrases.length;
          mode = 'type';
          setTimeout(tick, 250);
        }
      } else { mode = 'erase'; setTimeout(tick, 400); }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stabilize);
    stabilize();
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(stabilize, 200); });
    setTimeout(tick, HOLD_MS);
  })();
})();

/* Stats band: real platform numbers from the Labs backend. The band stays
   hidden until live stats load — it never shows fake or placeholder numbers. */
(function () {
  if (typeof document === 'undefined') return;
  var band = document.getElementById('stats');
  if (!band) return;
  function fmtInt(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function fmtPaid(n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    var s = v.toFixed(2);
    if (s.slice(-3) === '.00') s = s.slice(0, -3);
    var parts = s.split('.');
    parts[0] = Number(parts[0]).toLocaleString('en-US');
    return '$' + parts.join('.');
  }
  fetch('https://dashboard.aorilalabs.com/compute/v1/stats', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('stats ' + r.status); return r.json(); })
    .then(function (s) {
      if (!s || !s.ok || s.paidOut == null) throw new Error('bad stats');
      document.getElementById('statUsers').textContent = fmtInt(s.users);
      document.getElementById('statCredits').textContent = fmtInt(s.creditsUsed);
      document.getElementById('statPaid').textContent = fmtPaid(s.paidOut);
      band.hidden = false;
    })
    .catch(function () { /* stay hidden: never show fake numbers */ });
})();
