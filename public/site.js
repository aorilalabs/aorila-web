(function () {
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
  const local = host === 'localhost' || host === '127.0.0.1';
  const preview = new URLSearchParams(location.search).get('site');
  const sent = new URLSearchParams(location.search).get('sent');

  if (local) {
    document.querySelectorAll('[data-local-site]').forEach((a) => {
      const site = a.getAttribute('data-local-site');
      if (site === 'labs' || site === 'consumer') {
        a.setAttribute('href', '/?site=' + site);
      }
    });
    document.querySelectorAll('a[href^="https://api.aorila.com"]').forEach((a) => {
      a.setAttribute('href', '/api');
    });
  }

  if (sent === '1') {
    document.querySelectorAll('.waitlist .form-status').forEach((el) => {
      el.textContent = 'Received. We will follow up by email.';
      el.classList.add('ok');
    });
  }

  document.querySelectorAll('form.waitlist').forEach((form) => {
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
        const res = await fetch('/leads', {
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
      if (backdrop) backdrop.removeAttribute('hidden');
      requestAnimationFrame(() => {
        sidebar.classList.add('is-open');
      });
    } else {
      sidebar.classList.remove('is-open');
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
})();
