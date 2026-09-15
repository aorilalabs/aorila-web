const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Wiring checks only — no network. The live signup/login path is verified
// against production after deploy.
describe('supabase auth wiring', () => {
  it('is enabled by default with the shared Atraly project', () => {
    const { supabaseEnabled } = require('../lib/supabase-auth');
    assert.equal(supabaseEnabled(), true);
  });

  it('local mode disables Supabase (hermetic tests)', () => {
    process.env.AORILA_AUTH_MODE = 'local';
    const { supabaseEnabled } = require('../lib/supabase-auth');
    assert.equal(supabaseEnabled(), false);
    delete process.env.AORILA_AUTH_MODE;
  });
});
