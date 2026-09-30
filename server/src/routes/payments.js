import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { addCredits, withTransaction } from '../services/credits.js';
import {
  CREDIT_PACKAGES,
  findPackage,
  initializeTransaction,
  newReference,
  paystackConfigured,
  toMinor,
  verifyWebhookSignature,
} from '../services/paystack.js';
import { rateLimit } from '../util.js';

const router = Router();

router.get('/packages', (_req, res) => {
  res.json({
    packages: CREDIT_PACKAGES.map((p) => ({ ...p, currency: config.paystackCurrency })),
  });
});

router.post(
  '/checkout',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    if (!paystackConfigured()) {
      return res.status(503).json({ error: 'Payment service is not configured.' });
    }
    // Accept a package id (or, for older clients, its credit count). Any client-sent price is ignored.
    const pkg = findPackage(req.body.packageId ?? req.body.credits);
    if (!pkg) {
      return res.status(400).json({ error: 'Unknown credit package.' });
    }

    const reference = newReference('oe', req.user.id);
    const result = await initializeTransaction({
      email: req.user.email,
      amountMinor: toMinor(pkg.price),
      reference,
      callbackUrl: `${config.clientUrl}/profile?purchase=success`,
      metadata: {
        kind: 'credits',
        user_id: req.user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        package_name: `${pkg.name} - ${pkg.credits} Credits`,
        cancel_action: `${config.clientUrl}/pricing?purchase=cancelled`,
      },
    });

    res.json(result);
  }),
);

async function handleCreditPurchase(data, meta) {
  const pkg = findPackage(meta.package_id ?? Number(meta.credits));
  const userId = meta.user_id;
  if (!pkg || !userId) return { status: 400, body: { error: 'Invalid webhook payload metadata' } };

  const amountPaid = Number(data.amount) || 0;
  const currency = String(data.currency || '').toUpperCase();
  if (amountPaid < toMinor(pkg.price) || (currency && currency !== config.paystackCurrency)) {
    console.error('Paystack amount/currency mismatch', { reference: data.reference, amountPaid, currency, pkg });
    return { status: 200, body: { received: true, ignored: 'amount_mismatch' } };
  }

  return withTransaction(async (client) => {
    // The unique index on reference makes retried webhooks a no-op.
    const { rows } = await client.query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status, reference)
       VALUES ($1, 'purchase', $2, $3, $4, 'completed', $5)
       ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING
       RETURNING id`,
      [userId, pkg.credits, amountPaid, `Purchased ${pkg.name} - ${pkg.credits} Credits`, data.reference],
    );
    if (!rows[0]) return { status: 200, body: { success: true, duplicate: true } };
    await addCredits(client, userId, pkg.credits);
    return { status: 200, body: { success: true, credits_added: pkg.credits } };
  });
}

async function handleEbookPurchase(data) {
  const amountPaid = Number(data.amount) || 0;
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM ebook_orders WHERE reference = $1 FOR UPDATE`,
      [data.reference],
    );
    const order = rows[0];
    if (!order) return { status: 200, body: { received: true, ignored: 'unknown_order' } };
    if (order.status === 'completed') return { status: 200, body: { success: true, duplicate: true } };
    if (amountPaid < order.total_amount) {
      console.error('Paystack ebook amount mismatch', { reference: data.reference, amountPaid, expected: order.total_amount });
      return { status: 200, body: { received: true, ignored: 'amount_mismatch' } };
    }
    await client.query(
      `UPDATE ebook_orders SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [order.id],
    );
    await client.query(
      `INSERT INTO user_library (user_id, product_id, order_id)
       SELECT $1, product_id, order_id FROM ebook_order_items WHERE order_id = $2
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [order.user_id, order.id],
    );
    return { status: 200, body: { success: true } };
  });
}

function parseMetadata(meta) {
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta);
    } catch {
      return {};
    }
  }
  if (!meta || typeof meta !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}

export function paystackWebhookHandler() {
  return asyncHandler(async (req, res) => {
    if (!paystackConfigured() && !config.paystackWebhookSecret) {
      return res.status(503).json({ error: 'Paystack webhook configuration missing' });
    }
    if (!verifyWebhookSignature(req.rawBody || '', req.body, req.headers['x-paystack-signature'])) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body || {};
    const data = event.data ?? {};
    const meta = parseMetadata(data.metadata);
    const reference = typeof data.reference === 'string' ? data.reference : '';

    if (event.event === 'charge.success') {
      if (!reference) return res.status(400).json({ error: 'Missing reference' });
      const result =
        meta.kind === 'ebook_order' ? await handleEbookPurchase(data) : await handleCreditPurchase(data, meta);
      return res.status(result.status).json(result.body);
    }

    if (event.event === 'charge.failed') {
      if (meta.kind === 'ebook_order' && reference) {
        await withTransaction((client) =>
          client.query(
            `UPDATE ebook_orders SET status = 'failed' WHERE reference = $1 AND status = 'pending'`,
            [reference],
          ),
        );
      } else if (meta.user_id) {
        await withTransaction((client) =>
          client.query(
            `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
             VALUES ($1, 'purchase', $2, $3, $4, 'failed')`,
            [
              meta.user_id,
              parseInt(meta.credits || '0', 10) || 0,
              Number(data.amount) || 0,
              `Failed purchase: ${meta.package_name || 'Credit Package'}`,
            ],
          ),
        );
      }
      return res.json({ success: true, message: 'Charge failure recorded' });
    }

    res.json({ received: true, event_type: event.event });
  });
}

export default router;
