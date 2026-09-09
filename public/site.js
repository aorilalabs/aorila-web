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

  if (local) {
    document.querySelectorAll('[data-local-site]').forEach((a) => {
      const site = a.getAttribute('data-local-site');
      if (site === 'labs' || site === 'consumer') {
        a.setAttribute('href', '/?site=' + site);
      }
    });
  }

  document.querySelectorAll('form.waitlist').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const to = form.getAttribute('data-mailto') || '';
      const subject = form.getAttribute('data-subject') || 'API access';
      const status = form.querySelector('.form-status');
      if (!to) return;
      const lines = [];
      new FormData(form).forEach((value, key) => {
        lines.push(`${key}: ${String(value).trim()}`);
      });
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      if (status) {
        status.textContent = `Opening your mail app to ${to}. If nothing opens, write that address directly.`;
      }
      window.location.href = href;
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
})();
