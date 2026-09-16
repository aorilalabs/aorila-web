const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('static site builds', () => {
  it('builds consumer pages, redirects, and shared assets', () => {
    execFileSync('node', ['scripts/build-site.js', 'consumer'], {
      cwd: ROOT,
      env: {
        ...process.env,
        STATIC_API_ORIGIN: 'https://preview-api.example',
        STATIC_CONSOLE_ORIGIN: 'https://preview-console.example',
      },
      stdio: 'pipe',
    });
    assert.ok(fs.existsSync(path.join(DIST, 'consumer', 'index.html')));
    assert.ok(fs.existsSync(path.join(DIST, 'consumer', 'design.css')));
    assert.ok(fs.existsSync(path.join(DIST, 'consumer', 'contact', 'index.html')));
    assert.ok(fs.existsSync(path.join(DIST, 'consumer', 'commercial', 'reserved', 'index.html')));
    assert.ok(fs.existsSync(path.join(DIST, 'consumer', 'console', 'index.html')));
    assert.match(read('dist/consumer/index.html'), /<title>Aorila — Compute, AI, and Robotics/);
    assert.match(read('dist/consumer/contact/index.html'), /meta name="aorila-api-origin" content="https:\/\/preview-api\.example"/);
    // Console redirects go to the parent console origin (never an API host).
    assert.match(read('dist/consumer/console/index.html'), /https:\/\/preview-console\.example\/console/);
    assert.match(read('dist/consumer/models/index.html'), /url=\/ai-api/);
  });

  it('builds Labs from existing site files', () => {
    execFileSync('node', ['scripts/build-site.js', 'labs'], { cwd: ROOT, stdio: 'pipe' });
    assert.ok(fs.existsSync(path.join(DIST, 'labs', 'index.html')));
    assert.ok(fs.existsSync(path.join(DIST, 'labs', 'api', 'index.html')));
    assert.ok(fs.existsSync(path.join(DIST, 'labs', 'site.js')));
    const html = read('dist/labs/index.html');
    assert.match(html, /Aorila Compute — Compute marketplace/);
    const contact = read('dist/labs/contact/index.html');
    assert.match(contact, /url=https:\/\/dashboard\.aorilalabs\.com\/#support/);
  });

  it('builds a minimal honest robotics placeholder', () => {
    execFileSync('node', ['scripts/build-site.js', 'robotics'], { cwd: ROOT, stdio: 'pipe' });
    assert.ok(fs.existsSync(path.join(DIST, 'robotics', 'index.html')));
    assert.ok(fs.existsSync(path.join(DIST, 'robotics', 'design.css')));
    const html = read('dist/robotics/index.html');
    assert.match(html, /Aorila Robotics/);
    assert.match(html, /not publicly launched yet/i);
    assert.doesNotMatch(html, /coming soon/i);
    assert.doesNotMatch(html, /pre-order/i);
  });
});
