#!/usr/bin/env node
/**
 * Lightweight secret-pattern scan for this public repo.
 * Scans tracked text files; exits 1 if a high-confidence secret pattern is found.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIR = new Set(['node_modules', '.git', 'data']);
const SKIP_FILE = new Set(['package-lock.json']);
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.woff', '.woff2',
  '.ttf', '.eot', '.mp4', '.mov', '.zip', '.gz',
]);

const PATTERNS = [
  { id: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/g },
  { id: 'github-pat', re: /ghp_[A-Za-z0-9_]{20,}/g },
  { id: 'github-fine-grained', re: /github_pat_[A-Za-z0-9_]{20,}/g },
  { id: 'stripe-live', re: /sk_live_[A-Za-z0-9]{16,}/g },
  { id: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { id: 'google-api-key', re: /AIza[0-9A-Za-z\-_]{35}/g },
  { id: 'private-key-block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { id: 'generic-bearer', re: /(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"][A-Za-z0-9_\-\.]{24,}['"]/gi },
];

function listFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    const acc = [];
    function walk(dir) {
      for (const name of fs.readdirSync(dir)) {
        if (SKIP_DIR.has(name)) continue;
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) walk(p);
        else acc.push(path.relative(ROOT, p));
      }
    }
    walk(ROOT);
    return acc;
  }
}

function shouldScan(rel) {
  const base = path.basename(rel);
  if (SKIP_FILE.has(base)) return false;
  if (SKIP_EXT.has(path.extname(rel).toLowerCase())) return false;
  if (rel.startsWith('data/')) return false;
  return true;
}

const hits = [];
for (const rel of listFiles()) {
  if (!shouldScan(rel)) continue;
  let text;
  try {
    text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\u0000')) continue;
  for (const { id, re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) hits.push({ file: rel, id });
  }
}

if (hits.length) {
  console.error('secret-scan: possible secrets found');
  for (const h of hits) console.error(`  ${h.id}  ${h.file}`);
  process.exit(1);
}
console.log('secret-scan: clean (' + listFiles().filter(shouldScan).length + ' files)');
