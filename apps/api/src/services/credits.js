import { pool, query } from '../db.js';

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

/** Runs fn(client) inside a transaction. */
export async function withTransaction(fn) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Atomically deducts credits (never below zero) and logs the usage.
 * With requireFull, fails (returns null) instead of partially charging when the balance is short.
 */
export async function deductCredits(userId, amount, description, callId = null, { requireFull = false } = {}) {
  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO user_credits (user_id, credits) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    );
    const { rows } = await client.query(
      `SELECT credits FROM user_credits WHERE user_id = $1 FOR UPDATE`,
      [userId],
    );
    const current = rows[0].credits;
    if (requireFull && current < amount) return null;
    const charged = Math.min(current, amount);
    const newCredits = current - charged;
    await client.query(
      `UPDATE user_credits SET credits = $1, updated_at = NOW() WHERE user_id = $2`,
      [newCredits, userId],
    );
    if (charged > 0) {
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status, call_id)
         VALUES ($1, 'usage', $2, $3, $4, 'completed', $5)`,
        [userId, -charged, -charged, description, callId],
      );
    }
    return newCredits;
  });
}

/** Adds credits inside an existing transaction client. */
export async function addCredits(client, userId, credits) {
  const { rows } = await client.query(
    `INSERT INTO user_credits (user_id, credits) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET credits = user_credits.credits + EXCLUDED.credits, updated_at = NOW()
     RETURNING credits`,
    [userId, credits],
  );
  return rows[0].credits;
}
