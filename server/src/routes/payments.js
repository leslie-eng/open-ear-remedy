import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';

const router = Router();

function subunitAmount(price) {
  const rounded = Math.round(price * 100);
  if (!Number.isFinite(rounded) || rounded <= 0) throw new Error('Invalid price amount');
  return rounded;
}

function hmacSha512Hex(secret, message) {
  return crypto.createHmac('sha512', secret).update(message).digest('hex');
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function parseMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v != null) out[k] = String(v);
  }
  return out;
}

router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!config.paystackSecretKey?.startsWith('sk_')) {
      return res.status(503).json({ error: 'Payment service is not configured.' });
    }

    const {
      userId: requestedUserId,
      userEmail,
      packageName,
      credits,
      price,
      successUrl,
      cancelUrl,
    } = req.body;

    const userId = req.user.id;
    const verifiedEmail = req.user.email || userEmail;

    if (!verifiedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail)) {
      return res.status(400).json({ error: 'A valid account email is required for checkout.' });
    }
    if (credits == null || price == null) {
      return res.status(400).json({ error: 'Missing required fields: credits or price' });
    }

    const creditsNum = Number(credits);
    const priceNum = Number(price);
    if (!Number.isFinite(creditsNum) || creditsNum <= 0 || creditsNum !== Math.floor(creditsNum)) {
      return res.status(400).json({ error: 'Invalid credits value.' });
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Invalid price value.' });
    }
    if (requestedUserId && requestedUserId !== userId) {
      return res.status(403).json({ error: 'User mismatch in checkout request.' });
    }

    const amountSubunits = subunitAmount(priceNum);
    const reference = `oe_${userId.slice(0, 12)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const origin = req.headers.origin;
    const callbackUrl = successUrl || (origin ? `${origin}/profile?purchase=success` : null);
    if (!callbackUrl) {
      return res.status(400).json({ error: 'successUrl is required when Origin header is missing.' });
    }

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: verifiedEmail,
        amount: amountSubunits,
        currency: config.paystackCurrency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          user_id: userId,
          credits: String(creditsNum),
          package_name: packageName || `${creditsNum} Credits`,
          cancel_url: cancelUrl || '',
        },
      }),
    });

    const initJson = await initRes.json();
    if (!initRes.ok || !initJson.status || !initJson.data?.authorization_url) {
      return res.status(502).json({
        error: initJson.message || 'Failed to start checkout.',
      });
    }

    res.json({
      url: initJson.data.authorization_url,
      reference: initJson.data.reference ?? reference,
    });
  }),
);

export function paystackWebhookHandler() {
  return asyncHandler(async (req, res) => {
    const signingSecrets = [config.paystackWebhookSecret, config.paystackSecretKey].filter(
      (s) => s && s.length >= 8,
    );
    if (signingSecrets.length === 0) {
      return res.status(503).json({ error: 'Paystack webhook configuration missing' });
    }

    const body = req.rawBody || JSON.stringify(req.body);
    const signature = (req.headers['x-paystack-signature'] || '').trim().toLowerCase();
    if (!signature) {
      return res.status(400).json({ error: 'Missing x-paystack-signature header' });
    }

    const parsed = typeof req.body === 'object' ? req.body : JSON.parse(body);
    const canonicalPayload = JSON.stringify(parsed);
    let verified = false;
    for (const secret of signingSecrets) {
      const hashRaw = hmacSha512Hex(secret, body).toLowerCase();
      const hashCanonical = hmacSha512Hex(secret, canonicalPayload).toLowerCase();
      if (timingSafeEqualHex(hashRaw, signature) || timingSafeEqualHex(hashCanonical, signature)) {
        verified = true;
        break;
      }
    }
    if (!verified) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const eventType = parsed.event;
    if (eventType === 'charge.success') {
      const data = parsed.data ?? {};
      const meta = parseMetadata(data.metadata);
      const userId = meta.user_id;
      const credits = parseInt(meta.credits || '0', 10);
      const packageName = meta.package_name || 'Credit Package';
      const reference = typeof data.reference === 'string' ? data.reference : '';
      const amountPaid = typeof data.amount === 'number' ? data.amount : parseInt(String(data.amount ?? '0'), 10);

      if (!userId || credits <= 0 || !reference) {
        return res.status(400).json({ error: 'Invalid webhook payload metadata' });
      }

      const refTail = `paystack_ref:${reference}`;
      const { rows: existingTx } = await query(
        `SELECT id FROM credit_transactions WHERE user_id = $1 AND description LIKE $2 LIMIT 1`,
        [userId, `%${refTail}%`],
      );
      if (existingTx[0]) {
        return res.json({ success: true, duplicate: true, reference });
      }

      const { rows: existingCredits } = await query(
        `SELECT id, credits FROM user_credits WHERE user_id = $1`,
        [userId],
      );

      if (existingCredits[0]) {
        await query(
          `UPDATE user_credits SET credits = $1, updated_at = NOW() WHERE user_id = $2`,
          [existingCredits[0].credits + credits, userId],
        );
      } else {
        await query(
          `INSERT INTO user_credits (user_id, credits) VALUES ($1, $2)`,
          [userId, credits],
        );
      }

      await query(
        `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
         VALUES ($1, 'purchase', $2, $3, $4, 'completed')`,
        [userId, credits, amountPaid, `Purchased ${packageName} ${refTail}`],
      );

      return res.json({ success: true, user_id: userId, credits_added: credits });
    }

    if (eventType === 'charge.failed') {
      const data = parsed.data ?? {};
      const meta = parseMetadata(data.metadata);
      const userId = meta.user_id;
      if (userId) {
        await query(
          `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
           VALUES ($1, 'purchase', $2, $3, $4, 'failed')`,
          [
            userId,
            parseInt(meta.credits || '0', 10),
            typeof data.amount === 'number' ? data.amount : 0,
            `Failed purchase: ${meta.package_name || 'Credit Package'}`,
          ],
        );
      }
      return res.json({ success: true, message: 'Charge failure recorded' });
    }

    res.json({ received: true, event_type: eventType });
  });
}

export default router;
