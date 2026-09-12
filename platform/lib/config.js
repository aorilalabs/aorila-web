function num(name, fallback) {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function flag(name) {
  const v = String(process.env[name] || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function tokens(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadConfig() {
  return {
    port: num('PORT', 3000),
    feeBps: num('AORILA_FEE_BPS', 600),
    adminToken: process.env.AORILA_ADMIN_TOKEN || '',
    apiTokens: tokens('AORILA_API_TOKENS'),
    revealUpstream: flag('AORILA_REVEAL_UPSTREAM'),
    dataDir: process.env.AORILA_DATA_DIR || require('path').join(__dirname, '..', '..', 'data'),
    defaultImage: process.env.AORILA_DEFAULT_IMAGE || 'pytorch/pytorch:2.4.1-cuda12.1-cudnn9-devel',
    maxConcurrentJobs: num('AORILA_MAX_CONCURRENT_JOBS', 8),
    runpodKey: process.env.RUNPOD_API_KEY || '',
    vastKey: process.env.VAST_API_KEY || '',
    lambdaKey: process.env.LAMBDA_API_KEY || '',
  };
}

module.exports = { loadConfig };
