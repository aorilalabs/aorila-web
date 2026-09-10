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
})();
