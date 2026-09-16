'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const supabaseAuth = require('./supabase-auth');

function useSupabase() {
  return supabaseAuth.supabaseEnabled();
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), useSalt, 32).toString('hex');
  return `${useSalt}:${hash}`;
}

function checkPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const next = crypto.scryptSync(String(password), salt, 32).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'));
  } catch {
    return false;
  }
}

function sign(secret, payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(secret, token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expect = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function createAccountStore(options = {}) {
  // Prefer the persistent disk (/var/data on Render) when it is mounted and
  // writable, so deploys never wipe accounts. DATA_DIR overrides everything.
  function defaultDataDir() {
    try {
      fs.accessSync('/var/data', fs.constants.W_OK);
      return '/var/data/aorila';
    } catch {
      return path.join(__dirname, '..', 'data');
    }
  }
  const dataDir = options.dataDir || process.env.DATA_DIR || defaultDataDir();
  const file = options.file || path.join(dataDir, 'accounts.json');
  const secret = options.secret || process.env.SESSION_SECRET || 'aorila-session-change-me';
  // Rotation fallback: set SESSION_SECRET_PREV to the OLD secret at rotation
  // time so sessions signed before the rotation keep working until they expire.
  // Remove it after max session TTL (30 days) so old sessions fully die.
  const prevSecret = options.prevSecret || process.env.SESSION_SECRET_PREV || '';
  function verifySession(token) {
    if (!token) return null;
    const data = verify(secret, token);
    if (data) return { data, rotated: false };
    if (prevSecret) {
      const old = verify(prevSecret, token);
      if (old) return { data: old, rotated: true };
    }
    return null;
  }
  const ttlMs = options.ttlMs || 30 * 24 * 60 * 60 * 1000;
  const empty = () => ({ users: [], machines: [], credits: [], bookings: [], endpoints: [], volumes: [], clusters: [], deployments: [] });
  function load() {
    try {
      const state = JSON.parse(fs.readFileSync(file, 'utf8'));
      state.endpoints = state.endpoints || [];
      state.volumes = state.volumes || [];
      state.clusters = state.clusters || [];
      state.deployments = state.deployments || [];
      return state;
    } catch {
      return empty();
    }
  }
  function save(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
  }
  function publicUser(user) {
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, company: user.company || '', plan: user.plan || 'on-demand', createdAt: user.createdAt };
  }
  function balance(userId) {
    return load().credits.filter((c) => c.userId === userId).reduce((sum, c) => sum + Number(c.cents || 0), 0);
  }
  function machinesFor(userId) { return load().machines.filter((m) => m.userId === userId); }
  function machineById(userId, machineId) { return machinesFor(userId).find((m) => m.id === machineId) || null; }
  function bookingsFor(userId) { return load().bookings.filter((b) => b.userId === userId); }
  function endpointsFor(userId) { return load().endpoints.filter((e) => e.userId === userId); }
  function volumesFor(userId) { return load().volumes.filter((v) => v.userId === userId); }
  function creditsFor(userId) { return load().credits.filter((c) => c.userId === userId).slice().reverse(); }
  function findUserByEmail(email) {
    const key = String(email || '').trim().toLowerCase();
    return load().users.find((u) => u.email === key) || null;
  }
  function findUserById(userId) { return load().users.find((u) => u.id === userId) || null; }
  function validEmail(key) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
  }
  async function signup({ email, password, name, company, plan }) {
    const key = String(email || '').trim().toLowerCase();
    if (!validEmail(key)) { const err = new Error('Use a valid email.'); err.status = 400; throw err; }
    if (String(password || '').length < 8) { const err = new Error('Password must be at least 8 characters.'); err.status = 400; throw err; }
    const state = load();
    if (state.users.some((u) => u.email === key)) { const err = new Error('An account already exists for that email.'); err.status = 409; throw err; }
    const displayName = String(name || key.split('@')[0]).trim();
    const planValue = plan === 'enterprise' || plan === 'commercial' ? 'enterprise' : 'on-demand';
    if (useSupabase()) {
      // Shared identity with atraly.com: Supabase owns the credential.
      const sbUser = await supabaseAuth.signup({ email: key, password, name: displayName });
      const user = { id: sbUser.id, supabaseId: sbUser.id, email: key, name: displayName, company: String(company || '').trim(), plan: planValue, auth: 'supabase', createdAt: nowIso() };
      state.users.push(user); save(state); return publicUser(user);
    }
    // Local mode (tests / fallback): hash locally.
    const user = { id: id('usr'), email: key, name: displayName, company: String(company || '').trim(), plan: planValue, password: hashPassword(password), createdAt: nowIso() };
    state.users.push(user); save(state); return publicUser(user);
  }
  async function login({ email, password }) {
    const key = String(email || '').trim().toLowerCase();
    if (useSupabase()) {
      try {
        const sbUser = await supabaseAuth.login({ email: key, password });
        const state = load();
        let user = state.users.find((u) => u.supabaseId === sbUser.id) || state.users.find((u) => u.email === key);
        if (!user) {
          user = { id: sbUser.id, supabaseId: sbUser.id, email: key, name: key.split('@')[0], company: '', plan: 'on-demand', auth: 'supabase', createdAt: nowIso() };
          state.users.push(user); save(state);
        } else if (!user.supabaseId) {
          user.supabaseId = sbUser.id; user.auth = 'supabase'; delete user.password; save(state);
        }
        return publicUser(user);
      } catch (err) {
        // Legacy local rows (pre-Supabase) still validate locally.
        const legacy = findUserByEmail(key);
        if (legacy && legacy.password && checkPassword(password, legacy.password)) return publicUser(legacy);
        throw err;
      }
    }
    const user = findUserByEmail(key);
    if (!user || !checkPassword(password, user.password)) { const err = new Error('Email or password is wrong.'); err.status = 401; throw err; }
    return publicUser(user);
  }
  function issueSession(user) { return sign(secret, { uid: user.id, exp: Date.now() + ttlMs }); }
  function tokenHash(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
  function readSession(token) {
    const verified = verifySession(token);
    const data = verified && verified.data;
    if (!data || !data.uid) return null;
    const state = load();
    state.revokedSessions = (state.revokedSessions || []).filter((r) => r.exp > Date.now());
    if (state.revokedSessions.some((r) => r.hash === tokenHash(token))) return null;
    return publicUser(findUserById(data.uid));
  }
  function revokeSession(token) {
    if (!token) return;
    const verified = verifySession(token);
    const data = verified && verified.data;
    const state = load();
    state.revokedSessions = (state.revokedSessions || []).filter((r) => r.exp > Date.now());
    state.revokedSessions.push({ hash: tokenHash(token), exp: (data && data.exp) || Date.now() + ttlMs, revokedAt: nowIso() });
    save(state);
  }
  function addCredits(userId, { cents, note }) {
    const amount = Math.round(Number(cents));
    if (!Number.isFinite(amount) || amount === 0) { const err = new Error('Credit amount is invalid.'); err.status = 400; throw err; }
    const state = load();
    if (!state.users.some((u) => u.id === userId)) { const err = new Error('Account not found.'); err.status = 404; throw err; }
    const row = { id: id('crd'), userId, cents: amount, note: String(note || 'credit'), createdAt: nowIso() };
    state.credits.push(row); save(state); return { balance: balance(userId), credit: row };
  }
  function createMachine(userId, payload) {
    const state = load();
    const machine = {
      id: id('pod'), userId,
      sku: String(payload.sku || ''),
      name: String(payload.name || payload.sku || 'Aorila GPU'),
      usdPerHour: Number(payload.usdPerHour || 0),
      region: String(payload.region || ''),
      tier: String(payload.tier || 'on-demand'),
      image: String(payload.image || 'aorila/jupyter'),
      diskGb: Number(payload.diskGb || 20),
      jupyterOn: payload.jupyterOn !== false,
      status: payload.status || 'starting',
      remoteId: payload.remoteId || null,
      jupyter: payload.jupyter || '',
      createdAt: nowIso(), updatedAt: nowIso(),
      message: payload.message || '',
    };
    state.machines.push(machine); save(state); return machine;
  }
  function updateMachine(machineId, patch) {
    const state = load();
    const machine = state.machines.find((m) => m.id === machineId);
    if (!machine) return null;
    Object.assign(machine, patch, { updatedAt: nowIso() }); save(state); return machine;
  }
  function createEndpoint(userId, payload) {
    const state = load();
    const row = {
      id: id('ep'), userId,
      name: String(payload.name || 'Aorila endpoint'),
      image: String(payload.image || 'aorila/worker'),
      sku: String(payload.sku || ''),
      minWorkers: Number(payload.minWorkers || 0),
      maxWorkers: Number(payload.maxWorkers || 3),
      status: 'queued',
      createdAt: nowIso(),
    };
    state.endpoints.push(row); save(state); return row;
  }
  function createVolume(userId, payload) {
    const state = load();
    const row = {
      id: id('vol'), userId,
      name: String(payload.name || 'workspace'),
      sizeGb: Number(payload.sizeGb || 20),
      region: String(payload.region || 'us'),
      status: 'ready',
      createdAt: nowIso(),
    };
    state.volumes.push(row); save(state); return row;
  }
  function createBooking(userId, payload) {
    const state = load();
    const booking = { id: id('bkg'), userId, kind: payload.kind === 'reserved' ? 'reserved' : 'planned-vm', sku: String(payload.sku || ''), name: String(payload.name || payload.sku || 'Planned VM'), window: String(payload.window || ''), notes: String(payload.notes || ''), status: 'requested', createdAt: nowIso() };
    state.bookings.push(booking); save(state); return booking;
  }
  // Self-serve clusters: a cluster is N pods launched together from one live
  // catalog offer. Machines are still individual pod records (stop/delete per
  // node); the cluster row just groups them.
  function createCluster(userId, payload) {
    const state = load();
    state.clusters = state.clusters || [];
    const cluster = {
      id: id('cls'), userId,
      name: String(payload.name || 'aorila-cluster'),
      offerId: String(payload.offerId || ''),
      sku: String(payload.sku || ''),
      nodes: Math.max(1, Math.min(64, Number(payload.nodes || 2))),
      machineIds: Array.isArray(payload.machineIds) ? payload.machineIds : [],
      status: String(payload.status || 'starting'),
      createdAt: nowIso(),
    };
    state.clusters.push(cluster); save(state); return cluster;
  }
  function clustersFor(userId) { return (load().clusters || []).filter((c) => c.userId === userId); }
  function clusterById(userId, clusterId) { return clustersFor(userId).find((c) => c.id === clusterId) || null; }
  // Deployments: saved launch specs. Launching one provisions a cluster through
  // the same live-catalog path as /console/clusters — never a stored price.
  function createDeployment(userId, payload) {
    const state = load();
    state.deployments = state.deployments || [];
    const dep = {
      id: id('dep'), userId,
      name: String(payload.name || 'aorila-deployment'),
      offerId: String(payload.offerId || ''),
      sku: String(payload.sku || ''),
      nodes: Math.max(1, Math.min(64, Number(payload.nodes || 2))),
      image: String(payload.image || 'aorila/pytorch'),
      diskGb: Math.max(10, Number(payload.diskGb || 20)),
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    state.deployments.push(dep); save(state); return dep;
  }
  function deploymentsFor(userId) { return (load().deployments || []).filter((d) => d.userId === userId); }
  function deploymentById(userId, deploymentId) { return deploymentsFor(userId).find((d) => d.id === deploymentId) || null; }
  function deleteDeployment(userId, deploymentId) {
    const state = load();
    state.deployments = state.deployments || [];
    const i = state.deployments.findIndex((d) => d.userId === userId && d.id === deploymentId);
    if (i === -1) return false;
    state.deployments.splice(i, 1); save(state); return true;
  }
  return {
    signup, login, issueSession, readSession, revokeSession, publicUser, findUserById,
    balance, machinesFor, machineById, bookingsFor, endpointsFor, volumesFor, creditsFor,
    addCredits, createMachine, updateMachine, createEndpoint, createVolume, createBooking,
    createCluster, clustersFor, clusterById,
    createDeployment, deploymentsFor, deploymentById, deleteDeployment,
  };
}

function parseSid(req) {
  const raw = req.get('cookie') || '';
  const match = raw.match(/(?:^|;\s*)aorila_sid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
function setSid(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `aorila_sid=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
}
function clearSid(res) {
  res.setHeader('Set-Cookie', 'aorila_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}
module.exports = { createAccountStore, parseSid, setSid, clearSid };
