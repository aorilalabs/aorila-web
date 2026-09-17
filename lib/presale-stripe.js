"use strict';

/**
 * Robot presale payments (Stripe) for the parent console.
 *
 * Endpoints (all JSON):
 *   GET  /presale/v1/config         -> amounts, publishable key, configured flag
 *   POST /presale/v1/create-intent  -> {choice: 'deposit'|'full', email} -> {clientSecret}
 *   POST /presale/v1/webhook        -> Stripe webhook (signature-verified)
 *
 * Money lands in the Stripe account; the webhook appends each successful
 * payment to presale-reservations.jsonl under DATA_DIR (durable disk).
 * Without STRIPE_SECRET_KEY the endpoints fail closed (503) and the
 * service still boots and serves everything else normally.
 *
 * Must be mounted BEFORE express.json() so the webhook route can read the
 * raw request body for signature verification.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');

const CHOICES = {
  deposit: { amount: 5000, currency: 'usd', label: 'Aorila home robot — $50 refundable presale deposit' },
  full: { amount: 499900, currency: 'usd', label: 'Aorila home robot — buy outright' },
};

const ALLOWED_ORIGINS = ['https://robotics.aorila.com', 'https://aorila.com'];

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

function mountPresaleStripe(app, opts) {
  opts = opts || {};
  const dataDir = opts.dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data', 'console');
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  let stripe = null;
  if (secretKey) {
    try {
      stripe = require('stripe')(secretKey);
    } catch (e) {
      console.error('presale: stripe init failed:', e.message);
      stripe = null;
    }
  }
  const reservationsFile = path.join(dataDir, 'presale-reservations.jsonl');

  function recordReservation(rec) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.appendFileSync(reservationsFile, JSON.stringify(rec) + '\n');
    } catch (e) {
      console.error('presale: failed to record reservation:', e.message);
    }
  }

  // Webhook first: express.raw() must see the untouched body.
  app.post('/presale/v1/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).json({ ok: false, error: 'payments not configured' });
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'bad signature' });
    }
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object || {};
      const meta = pi.metadata || {};
      recordReservation({
        at: new Date().toISOString(),
        payment_intent: pi.id,
        amount: pi.amount_received,
        currency: pi.currency,
        email: meta.email || pi.receipt_email || null,
        choice: meta.choice || null,
      });
    }
    res.json({ ok: true });
  });

  app.options('/presale/v1/*', (req, res) => {
    cors(req, res);
    res.status(204).end();
  });

  app.get('/presale/v1/config', (req, res) => {
    cors(req, res);
    res.json({
      ok: true,
      configured: Boolean(stripe),
      publishableKey: publishableKey || null,
      choices: {
        deposit: { amount: CHOICES.deposit.amount, currency: 'usd', label: CHOICES.deposit.label },
        full: { amount: CHOICES.full.amount, currency: 'usd', label: CHOICES.full.label },
      },
    });
  });

  app.post('/presale/v1/create-intent', express.json({ limit: '32kb' }), (req, res) => {
    cors(req, res);
    if (!stripe) return res.status(503).json({ ok: false, error: 'payments not configured' });
    const choice = String((req.body && req.body.choice) || '');
    const email = String((req.body && req.body.email) || '').trim();
    if (!CHOICES[choice]) return res.status(400).json({ ok: false, error: 'unknown choice' });
    if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'valid email required' });
    stripe.paymentIntents.create({
      amount: CHOICES[choice].amount,
      currency: 'usd',
      receipt_email: email,
      description: CHOICES[choice].label,
      metadata: { choice, email, product: 'aorila-home-robot' },
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    }).then((pi) => {
      res.json({ ok: true, clientSecret: pi.client_secret, amount: pi.amount, choice });
    }).catch((e) => {
      console.error('presale: create-intent failed:', e.message);
      res.status(502).json({ ok: false, error: 'payment provider error' });
    });
  });
}

module.exports = { mountPresaleStripe, PRESALE_CHOICES: CHOICES };
