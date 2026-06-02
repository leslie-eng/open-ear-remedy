import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { getOrCreateCredits } from '../services/credits.js';

const router = Router();

router.get(
  '/credits',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await getOrCreateCredits(req.user.id);
    res.json({ credits: row.credits });
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
    const { phone_number } = req.body;
    await getOrCreateCredits(req.user.id);
    await query(
      `UPDATE user_credits SET phone_number = $1, updated_at = NOW() WHERE user_id = $2`,
      [phone_number || null, req.user.id],
    );
    res.json({ success: true });
  }),
);

router.post(
  '/credits/deduct',
  requireAuth,
  asyncHandler(async (req, res) => {
    const amount = parseInt(req.body.amount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const { rows } = await query(
      `SELECT credits FROM user_credits WHERE user_id = $1`,
      [req.user.id],
    );
    const current = rows[0]?.credits ?? 0;
    const newCredits = Math.max(0, current - amount);
    await query(
      `UPDATE user_credits SET credits = $1, updated_at = NOW() WHERE user_id = $2`,
      [newCredits, req.user.id],
    );
    if (req.body.description) {
      await query(
        `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
         VALUES ($1, 'usage', $2, $3, $4, 'completed')`,
        [req.user.id, -amount, -amount, req.body.description],
      );
    }
    res.json({ credits: newCredits });
  }),
);

router.get(
  '/call-history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
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
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
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
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 200);
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
    const { rows } = await query(
      `INSERT INTO mood_logs (user_id, mood, mood_score, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, mood, mood_score, note || null],
    );
    res.json({ data: rows[0] });
  }),
);

export default router;
