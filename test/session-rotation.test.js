const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.AORILA_AUTH_MODE = 'local'; // hermetic auth: no live Supabase calls
const { createAccountStore } = require('../lib/accounts');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aorila-rot-'));
}

describe('session secret rotation fallback (SESSION_SECRET_PREV)', () => {
  it('keeps pre-rotation sessions valid via the previous secret', async () => {
    const dataDir = tmpDir();
    const oldStore = createAccountStore({ dataDir, secret: 'old-secret-value' });
    const user = await oldStore.signup({ email: 'rot@example.com', password: 'password123', name: 'Rot' });
    const oldToken = oldStore.issueSession(user);

    // Without the fallback, the rotated secret kills the old session.
    const noFallback = createAccountStore({ dataDir, secret: 'new-secret-value' });
    assert.equal(noFallback.readSession(oldToken), null);

    // With SESSION_SECRET_PREV set to the old secret, it still works.
    const rotated = createAccountStore({ dataDir, secret: 'new-secret-value', prevSecret: 'old-secret-value' });
    const seen = rotated.readSession(oldToken);
    assert.ok(seen);
    assert.equal(seen.email, 'rot@example.com');

    // Revoking an old-secret session also works through the fallback.
    rotated.revokeSession(oldToken);
    assert.equal(rotated.readSession(oldToken), null);
  });

  it('signs new sessions with the current secret only', async () => {
    const dataDir = tmpDir();
    const rotated = createAccountStore({ dataDir, secret: 'new-secret-value', prevSecret: 'old-secret-value' });
    const user = await rotated.signup({ email: 'new@example.com', password: 'password123', name: 'New' });
    const token = rotated.issueSession(user);
    assert.ok(rotated.readSession(token));

    // A store that only knows the old secret must reject the new token.
    const oldOnly = createAccountStore({ dataDir, secret: 'old-secret-value' });
    assert.equal(oldOnly.readSession(token), null);
  });

  it('rejects tokens signed by an unknown secret', async () => {
    const dataDir = tmpDir();
    const rotated = createAccountStore({ dataDir, secret: 'new-secret-value', prevSecret: 'old-secret-value' });
    const attacker = createAccountStore({ dataDir, secret: 'attacker-secret' });
    const user = await attacker.signup({ email: 'x@example.com', password: 'password123', name: 'X' });
    const badToken = attacker.issueSession(user);
    assert.equal(rotated.readSession(badToken), null);
  });

  it('reads SESSION_SECRET_PREV from the environment', async () => {
    const dataDir = tmpDir();
    const oldStore = createAccountStore({ dataDir, secret: 'env-old-secret' });
    const user = await oldStore.signup({ email: 'env@example.com', password: 'password123', name: 'Env' });
    const oldToken = oldStore.issueSession(user);
    process.env.SESSION_SECRET = 'env-new-secret';
    process.env.SESSION_SECRET_PREV = 'env-old-secret';
    try {
      const viaEnv = createAccountStore({ dataDir });
      assert.ok(viaEnv.readSession(oldToken));
    } finally {
      delete process.env.SESSION_SECRET;
      delete process.env.SESSION_SECRET_PREV;
    }
  });
});
