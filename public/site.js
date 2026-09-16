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
     The caret rides at the typing frontier; the h1 keeps its tallest height
     so the page below never jumps. */
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
      { t: 'Your compute earns more', h: 'here' },
      { t: 'Your gaming runs better', h: 'here' },
      { t: 'Your AI runs better', h: 'here' },
    ];
    var TYPE_MS = 80, ERASE_MS = 50, HOLD_MS = 2000;
    var pi = 0, mode = 'hold';
    var segs = [el, hereEl, dotEl];
    function full() { return [phrases[pi].t, phrases[pi].h, '.']; }
    function placeCaret() {
      var host = dotEl.textContent ? dotEl : hereEl.textContent ? hereEl : el;
      host.appendChild(caret);
    }
    function setFull() {
      var f = full();
      el.textContent = f[0];
      hereEl.textContent = f[1];
      dotEl.textContent = f[2];
      placeCaret();
    }
    function stabilize() {
      var cur = pi, maxH = 0;
      for (var k = 0; k < phrases.length; k++) { pi = k; setFull(); maxH = Math.max(maxH, h1.offsetHeight); }
      pi = cur; setFull();
      h1.style.minHeight = maxH + 'px';
    }
    function tick() {
      var f = full();
      if (mode === 'type') {
        var i = el.textContent.length < f[0].length ? 0 : hereEl.textContent.length < f[1].length ? 1 : 2;
        segs[i].textContent += f[i].charAt(segs[i].textContent.length);
        placeCaret();
        if (el.textContent.length === f[0].length && hereEl.textContent.length === f[1].length && dotEl.textContent.length === 1) {
          mode = 'hold'; setTimeout(tick, HOLD_MS); return;
        }
        setTimeout(tick, TYPE_MS);
      } else if (mode === 'erase') {
        var j = dotEl.textContent.length ? 2 : hereEl.textContent.length ? 1 : 0;
        segs[j].textContent = segs[j].textContent.slice(0, -1);
        placeCaret();
        if (!el.textContent.length && !hereEl.textContent.length && !dotEl.textContent.length) {
          pi = (pi + 1) % phrases.length; mode = 'type'; setTimeout(tick, 350); return;
        }
        setTimeout(tick, ERASE_MS);
      } else { mode = 'erase'; setTimeout(tick, 400); }
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(stabilize);
    stabilize();
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(stabilize, 200); });
    setTimeout(tick, HOLD_MS);
  })();
})();
