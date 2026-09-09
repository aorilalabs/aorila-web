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
