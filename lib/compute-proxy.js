const DEFAULT_ORIGIN = process.env.COMPUTE_ORIGIN || 'https://aorila-compute.onrender.com';

async function proxyGpus(req, res) {
  try {
    const url = new URL('/compute/v1/gpus', DEFAULT_ORIGIN);
    for (const [k, v] of Object.entries(req.query || {})) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
    const upstream = await fetch(url, { headers: { accept: 'application/json' } });
    const body = await upstream.text();
    res.status(upstream.status).type('json').send(body);
  } catch {
    res.status(502).json({ ok: false, error: 'Live catalog unavailable.' });
  }
}

module.exports = { proxyGpus, DEFAULT_ORIGIN };
