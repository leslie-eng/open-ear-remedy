import { query } from '../db.js';

export async function getCredits(userId) {
  const { rows } = await query(
    `SELECT credits FROM user_credits WHERE user_id = $1`,
    [userId],
  );
  return rows[0]?.credits ?? 0;
}

export async function getOrCreateCredits(userId) {
  const { rows } = await query(
    `INSERT INTO user_credits (user_id, credits)
     VALUES ($1, 0)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING *`,
    [userId],
  );
  return rows[0];
}

export async function deductCredits(userId, amount, description, callId = null) {
  const current = await getOrCreateCredits(userId);
  const newCredits = Math.max(0, current.credits - amount);
  await query(
    `UPDATE user_credits SET credits = $1, updated_at = NOW() WHERE user_id = $2`,
    [newCredits, userId],
  );
  await query(
    `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status, call_id)
     VALUES ($1, 'usage', $2, $3, $4, 'completed', $5)`,
    [userId, -amount, -amount, description, callId],
  );
  return newCredits;
}
