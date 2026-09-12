const { loadConfig } = require('./lib/config');
const { createStore } = require('./lib/store');
const { createRunpodAdapter } = require('./adapters/runpod');
const { createVastAdapter } = require('./adapters/vast');
const { createListedAdapter } = require('./adapters/listed');
const { createJobService } = require('./lib/jobs');
const { publicOffer, publicJob } = require('./lib/brand');
const { rankOffers } = require('./lib/router');

function buildPlatform(options = {}) {
  const config = options.config || loadConfig();
  const store = options.store || createStore(config.dataDir);
  const adapters = options.adapters || [
    createRunpodAdapter({ key: config.runpodKey, feeBps: config.feeBps }),
    createVastAdapter({ key: config.vastKey, feeBps: config.feeBps }),
    createListedAdapter({ feeBps: config.feeBps }),
  ];
  const jobs = createJobService({ store, adapters, config });
  return { config, jobs, adapters };
}

function mountPlatform(app, options = {}) {
  const { config, jobs, adapters } = buildPlatform(options);
  const reveal = Boolean(config.revealUpstream);

  app.get('/v1/health', (req, res) => {
    res.json({ ok: true, product: 'Aorila', pools: adapters.map((a) => ({ live: a.live })) });
  });

  app.get('/v1/catalog/gpus', async (req, res, next) => {
    try {
      const offers = await jobs.allOffers();
      const ranked = rankOffers(offers, { sku: req.query.sku, tier: req.query.tier, region: req.query.region });
      res.json({ ok: true, feeBps: config.feeBps, offers: ranked.map((o) => publicOffer(o, { reveal })) });
    } catch (err) { next(err); }
  });

  app.post('/v1/jobs', async (req, res, next) => {
    try {
      const job = await jobs.create(req.body || {});
      res.status(201).json({ ok: true, job: publicJob(job, { reveal }) });
    } catch (err) { next(err); }
  });

  app.get('/v1/jobs', (req, res) => {
    res.json({ ok: true, jobs: jobs.list().map((j) => publicJob(j, { reveal })) });
  });

  app.get('/v1/jobs/:id', async (req, res, next) => {
    try {
      const job = await jobs.refresh(req.params.id);
      if (!job) return res.status(404).json({ ok: false, error: 'Job not found.' });
      res.json({ ok: true, job: publicJob(job, { reveal }) });
    } catch (err) { next(err); }
  });

  app.post('/v1/jobs/:id/stop', async (req, res, next) => {
    try {
      const job = await jobs.stop(req.params.id);
      if (!job) return res.status(404).json({ ok: false, error: 'Job not found.' });
      res.json({ ok: true, job: publicJob(job, { reveal }) });
    } catch (err) { next(err); }
  });

  return { config, jobs };
}

module.exports = { mountPlatform, buildPlatform };
