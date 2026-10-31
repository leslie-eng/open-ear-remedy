import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { withTransaction } from '../services/credits.js';
import { CREDIT_PACKS, CURRENCY, MONTHLY_PASS, findOffer } from '@openear/shared/pricing';
import * as billing from '../services/billing.js';
import {
  initializeTransaction,
  newReference,
  paystackConfigured,
  toMinor,
  verifyWebhookSignature,
} from '../services/paystack.js';
import { rateLimit } from '../util.js';

const router = Router();

router.get('/offers', (_req, res) => {
  res.json({ currency: CURRENCY, packs: CREDIT_PACKS, pass: MONTHLY_PASS });
});

router.post(
  '/checkout',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    if (!paystackConfigured()) {
      return res.status(503).json({ error: 'Payment service is not configured.' });
    }
    // The client only names the offer; the price always comes from the shared catalogue.
    const offer = findOffer(req.body.offerId);
    if (!offer) {
      return res.status(400).json({ error: 'Unknown offer.' });
    }
    // Refuse before payment: once Paystack has taken the money it is too late to say no.
    if (offer.kind === 'pass' && !(await billing.canBuyPass(req.user.id))) {
      return res.status(409).json({ error: 'You already have a Monthly Pass waiting to start.' });
    }

    const reference = newReference('oe', req.user.id);
    const result = await initializeTransaction({
      email: req.user.email,
      amountMinor: toMinor(offer.price),
      reference,
      callbackUrl: `${config.clientUrl}/dashboard?purchase=success`,
      metadata: {
        kind: 'offer',
        user_id: req.user.id,
        offer_id: offer.id,
        offer_name: offer.name,
        cancel_action: `${config.clientUrl}/pricing?purchase=cancelled`,
      },
    });

    res.json(result);
  }),
);

async function handleOfferPurchase(data, meta) {
  const offer = findOffer(meta.offer_id);
  const userId = meta.user_id;
  if (!offer || !userId) return { status: 400, body: { error: 'Invalid webhook payload metadata' } };

  const amountPaid = Number(data.amount) || 0;
  const currency = String(data.currency || '').toUpperCase();
  if (amountPaid < toMinor(offer.price) || currency !== CURRENCY) {
    console.error('Paystack amount/currency mismatch', { reference: data.reference, amountPaid, currency, offer: offer.id });
    return { status: 200, body: { received: true, ignored: 'amount_mismatch' } };
  }

  const { alreadyGranted } = await billing.grantPurchase(userId, offer.id, { reference: data.reference });
  return { status: 200, body: { success: true, duplicate: alreadyGranted } };
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
        meta.kind === 'ebook_order' ? await handleEbookPurchase(data) : await handleOfferPurchase(data, meta);
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
             VALUES ($1, 'purchase', 0, $2, $3, 'failed')`,
            [meta.user_id, Number(data.amount) || 0, `Failed purchase: ${meta.offer_name || 'Open Ear purchase'}`],
          ),
        );
      }
      return res.json({ success: true, message: 'Charge failure recorded' });
    }

    res.json({ received: true, event_type: event.event });
  });
}

export default router;
