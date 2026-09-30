import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { comparePassword, findUserByEmail } from '../auth.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { getOrCreateCredits, withTransaction } from '../services/credits.js';
import { mapEbook, mapOrders } from '../services/ebooks.js';
import { rateLimit } from '../util.js';

const router = Router();

function clampLimit(raw, fallback, max) {
  const n = parseInt(raw ?? fallback, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

router.get(
  '/credits',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await getOrCreateCredits(req.user.id);
    res.json({ credits: row.credits, free_credits_available: !row.free_credits_claimed_at });
  }),
);

router.post(
  '/claim-free-credits',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getOrCreateCredits(req.user.id);
    const credits = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE user_credits
         SET credits = credits + $2, free_credits_claimed_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND free_credits_claimed_at IS NULL
         RETURNING credits`,
        [req.user.id, config.freeTrialCredits],
      );
      if (!rows[0]) return null;
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
         VALUES ($1, 'bonus', $2, 0, 'Free trial credits', 'completed')`,
        [req.user.id, config.freeTrialCredits],
      );
      return rows[0].credits;
    });
    if (credits === null) {
      return res.status(400).json({ error: 'Free credits have already been claimed on this account.' });
    }
    res.json({ credits });
  }),
);

router.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await getOrCreateCredits(req.user.id);
    res.json({
      email: req.user.email,
      phone_number: row.phone_number,
      credits: row.credits,
      created_at: row.created_at || req.user.created_at,
    });
  }),
);

router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const phone = req.body.phone_number ? String(req.body.phone_number).trim() : null;
    if (phone && !/^\+?[0-9\s\-().]{7,20}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    await getOrCreateCredits(req.user.id);
    await query(
      `UPDATE user_credits SET phone_number = $1, updated_at = NOW() WHERE user_id = $2`,
      [phone, req.user.id],
    );
    res.json({ success: true });
  }),
);

router.delete(
  '/account',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const user = await findUserByEmail(req.user.email);
    if (!(await comparePassword(req.body?.password, user.password_hash))) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }
    // Related rows (credits, history, library, orders...) cascade.
    await query(`DELETE FROM verification_tokens WHERE email = $1`, [user.email]);
    await query(`DELETE FROM users WHERE id = $1`, [user.id]);
    res.json({ success: true });
  }),
);

router.get(
  '/call-history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 10, 100);
    const { rows } = await query(
      `SELECT id, duration_seconds, credits_used, status, started_at, ended_at, created_at
       FROM call_history WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2`,
      [req.user.id, limit],
    );
    res.json({ data: rows });
  }),
);

router.get(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 20, 100);
    const { rows } = await query(
      `SELECT id, type, amount, credits, description, status, created_at
       FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit],
    );
    res.json({ data: rows });
  }),
);

router.get(
  '/mood-logs',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = clampLimit(req.query.limit, 30, 200);
    const { rows } = await query(
      `SELECT id, mood, mood_score, note, created_at FROM mood_logs
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit],
    );
    res.json({ data: rows });
  }),
);

router.post(
  '/mood-logs',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { mood, mood_score, note } = req.body;
    const score = Number(mood_score);
    if (typeof mood !== 'string' || !mood.trim() || mood.length > 50) {
      return res.status(400).json({ error: 'Mood is required' });
    }
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Mood score must be between 1 and 5' });
    }
    if (note != null && (typeof note !== 'string' || note.length > 2000)) {
      return res.status(400).json({ error: 'Note must be under 2000 characters' });
    }
    const { rows } = await query(
      `INSERT INTO mood_logs (user_id, mood, mood_score, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, mood.trim(), score, note || null],
    );
    res.json({ data: rows[0] });
  }),
);

router.get(
  '/library',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT p.*, l.purchased_at, o.reference AS order_reference
       FROM user_library l
       JOIN products p ON p.id = l.product_id
       LEFT JOIN ebook_orders o ON o.id = l.order_id
       WHERE l.user_id = $1
       ORDER BY l.purchased_at DESC`,
      [req.user.id],
    );
    res.json({
      library: rows.map((r) => ({
        ebook: mapEbook(r),
        purchased_at: r.purchased_at,
        order_reference: r.order_reference,
      })),
    });
  }),
);

router.get(
  '/orders',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT * FROM ebook_orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id],
    );
    res.json({ orders: await mapOrders(rows) });
  }),
);

export default router;
