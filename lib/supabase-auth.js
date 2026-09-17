'use strict';

/**
 * aorila-web authenticates against the Aorila parent company's own Supabase
 * project. Logins are separate per site: an Aorila account does not work on
 * atraly.com or the Aorila Labs dashboard, and vice versa. Server-side only:
 * we call the Supabase Auth API with the public anon key, then keep our own
 * HMAC session cookie for the console.
 *
 * The anon key is public by design (publishable, RLS-protected). It can be
 * rotated via the SUPABASE_ANON_KEY env var without a code change.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fvxvvilgvplztbmovmxi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2eHZ2aWxndnBsenRibW92bXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDE2OTQsImV4cCI6MjEwNDU3NzY5NH0.ARYeILaQUN8lLiglTxHAPC60vIwUvfK2QBebFXZNFdc';

function supabaseEnabled() {
  if (process.env.AORILA_AUTH_MODE === 'local') return false;
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('%%'));
}

function friendlyError(raw, status) {
  const msg = String(raw || '');
  let text = 'Email or password is wrong.';
  if (/user already registered|already registered/i.test(msg)) {
    text = 'An account already exists for that email. Try signing in.';
  } else if (/email not confirmed/i.test(msg)) {
    text = 'Please confirm your email, then sign in.';
  } else if (/weak|short|at least/i.test(msg) && /password/i.test(msg)) {
    text = 'Password must be at least 8 characters.';
  } else if (/invalid login|invalid.*credentials/i.test(msg)) {
    text = 'Email or password is wrong.';
  }
  const err = new Error(text);
  err.status = status === 429 ? 429 : status >= 500 ? 502 : 401;
  return err;
}

async function sb(path, body) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    const err = new Error('Sign-in is temporarily unavailable. Try again.');
    err.status = 502;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw friendlyError(data.msg || data.error_description || data.error, res.status);
  }
  return data;
}

async function signup({ email, password, name }) {
  if (!supabaseEnabled()) {
    const err = new Error('Sign-up is not configured yet.');
    err.status = 503;
    throw err;
  }
  const data = await sb('/signup', {
    email,
    password,
    options: { data: { name: name || '', site: 'aorila.com' } },
  });
  const user = data.user || {};
  if (!user.id) throw friendlyError('signup failed', 500);
  return { id: user.id, email: user.email || email };
}

async function login({ email, password }) {
  if (!supabaseEnabled()) {
    const err = new Error('Sign-in is not configured yet.');
    err.status = 503;
    throw err;
  }
  const data = await sb('/token?grant_type=password', { email, password });
  const user = data.user || {};
  if (!user.id) throw friendlyError('Invalid login credentials', 400);
  return { id: user.id, email: user.email || email };
}

module.exports = { signup, login, supabaseEnabled };
