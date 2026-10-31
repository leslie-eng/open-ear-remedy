import {
  CREDITS_PER_CHAT_MESSAGE,
  FREE_TRIAL_CREDITS,
  chatDay,
  findOffer,
  splitCallCharge,
} from '@openear/shared/pricing';
import { query } from '../db.js';
import { withTransaction } from './credits.js';

/**
 * Billing: the one place that changes what a user can spend.
 * Credits (from packs, the free trial and admin adjustments) never expire; a Monthly Pass
 * adds call time and a daily AI message allowance that are always used before credits.
 */

export class BillingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Locks (creating if needed) the user's credit row for the rest of the transaction. */
async function lockCredits(client, userId) {
  await client.query(
    `INSERT INTO user_credits (user_id, credits) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  const { rows } = await client.query(`SELECT * FROM user_credits WHERE user_id = $1 FOR UPDATE`, [userId]);
  return rows[0];
}

function toPass(row) {
  return {
    id: row.id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    callSecondsLeft: row.call_seconds_total - row.call_seconds_used,
    aiMessagesPerDay: row.ai_messages_per_day,
  };
}

export async function getBalance(userId, { now = new Date() } = {}) {
  const [{ rows: creditRows }, { rows: passRows }] = await Promise.all([
    query(`SELECT credits FROM user_credits WHERE user_id = $1`, [userId]),
    query(
      `SELECT * FROM monthly_passes WHERE user_id = $1 AND expires_at > $2 ORDER BY starts_at`,
      [userId, now],
    ),
  ]);
  const active = passRows.find((p) => p.starts_at <= now) ?? null;
  const queued = passRows.find((p) => p.starts_at > now) ?? null;
  return {
    credits: creditRows[0]?.credits ?? 0,
    pass: active && toPass(active),
    queuedPass: queued && { startsAt: queued.starts_at, expiresAt: queued.expires_at },
  };
}

/** One-time 50 credits for an account with a verified email. */
export async function claimTrial(userId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT email_verified_at FROM users WHERE id = $1`, [userId]);
    if (!rows[0]?.email_verified_at) {
      throw new BillingError('EMAIL_NOT_VERIFIED', 'Verify your email address to claim your free credits.');
    }
    const account = await lockCredits(client, userId);
    if (account.free_credits_claimed_at) {
      throw new BillingError('TRIAL_ALREADY_CLAIMED', 'Free credits have already been claimed on this account.');
    }
    const { rows: updated } = await client.query(
      `UPDATE user_credits SET credits = credits + $2, free_credits_claimed_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 RETURNING credits`,
      [userId, FREE_TRIAL_CREDITS],
    );
    await client.query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
       VALUES ($1, 'bonus', $2, 0, 'Free trial credits', 'completed')`,
      [userId, FREE_TRIAL_CREDITS],
    );
    return { credits: updated[0].credits };
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Latest expiry among the user's current and queued passes, or null if none are live. */
async function lastPassExpiry(client, userId, now) {
  const { rows } = await client.query(
    `SELECT MAX(expires_at) AS last FROM monthly_passes WHERE user_id = $1 AND expires_at > $2`,
    [userId, now],
  );
  return rows[0].last;
}

/** A pass can be bought unless one is already waiting to start (at most one queued). */
export async function canBuyPass(userId, { now = new Date() } = {}) {
  const { rows } = await query(
    `SELECT 1 FROM monthly_passes WHERE user_id = $1 AND starts_at > $2 LIMIT 1`,
    [userId, now],
  );
  return rows.length === 0;
}

/**
 * Grants what a confirmed payment bought. Idempotent per payment reference: the purchase is
 * recorded in credit_transactions (reference is unique) before anything is granted, so a
 * repeated webhook finds the row and grants nothing. A pass bought while another is live is
 * queued to start when the last one ends, so paid days are never lost.
 */
export async function grantPurchase(userId, offerId, { reference, now = new Date() }) {
  const offer = findOffer(offerId);
  if (!offer) throw new BillingError('UNKNOWN_OFFER', `Unknown offer: ${offerId}`);
  const credits = offer.kind === 'pack' ? offer.credits : 0;
  const description = offer.kind === 'pack' ? `${offer.name} - ${offer.credits} credits` : offer.name;

  return withTransaction(async (client) => {
    await lockCredits(client, userId);
    const { rowCount } = await client.query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status, reference)
       VALUES ($1, 'purchase', $2, $3, $4, 'completed', $5)
       ON CONFLICT (reference) WHERE reference IS NOT NULL DO NOTHING`,
      [userId, credits, offer.price * 100, description, reference],
    );
    if (rowCount === 0) return { alreadyGranted: true };

    if (offer.kind === 'pack') {
      await client.query(
        `UPDATE user_credits SET credits = credits + $2, updated_at = NOW() WHERE user_id = $1`,
        [userId, offer.credits],
      );
    } else {
      const startsAt = (await lastPassExpiry(client, userId, now)) ?? now;
      await client.query(
        `INSERT INTO monthly_passes (user_id, starts_at, expires_at, call_seconds_total, ai_messages_per_day, reference)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, startsAt, new Date(startsAt.getTime() + offer.days * DAY_MS), offer.callSeconds, offer.aiMessagesPerDay, reference],
      );
    }
    return { alreadyGranted: false };
  });
}

/** Locks the pass that is live at `now`, if any. */
async function lockActivePass(client, userId, now) {
  const { rows } = await client.query(
    `SELECT * FROM monthly_passes WHERE user_id = $1 AND starts_at <= $2 AND expires_at > $2
     ORDER BY starts_at LIMIT 1 FOR UPDATE`,
    [userId, now],
  );
  return rows[0] ?? null;
}

/**
 * Charges `seconds` of call time: pass time first, then credits. Credits are capped at the
 * balance (the server ends calls when time runs out, so any shortfall is only rounding).
 */
export async function chargeCall(userId, seconds, { callId = null, now = new Date() } = {}) {
  return withTransaction(async (client) => {
    const account = await lockCredits(client, userId);
    const pass = await lockActivePass(client, userId, now);
    const split = splitCallCharge({
      seconds,
      passSecondsLeft: pass ? pass.call_seconds_total - pass.call_seconds_used : 0,
    });

    if (split.passSeconds > 0) {
      await client.query(
        `UPDATE monthly_passes SET call_seconds_used = call_seconds_used + $2 WHERE id = $1`,
        [pass.id, split.passSeconds],
      );
    }
    const credits = Math.min(split.credits, account.credits);
    if (credits > 0) {
      await client.query(
        `UPDATE user_credits SET credits = credits - $2, updated_at = NOW() WHERE user_id = $1`,
        [userId, credits],
      );
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status, call_id)
         VALUES ($1, 'usage', $2, 0, $3, 'completed', $4)`,
        [userId, -credits, `Call: ${seconds}s`, callId],
      );
    }
    return { passSeconds: split.passSeconds, credits };
  });
}

/** Admin correction (refund, goodwill, fix). Positive adds, negative removes; never below zero. */
export async function adjustCredits({ adminId, userId, delta, reason }) {
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (!why) throw new BillingError('REASON_REQUIRED', 'Give a reason for this credit adjustment.');

  return withTransaction(async (client) => {
    const account = await lockCredits(client, userId);
    const applied = Math.max(delta, -account.credits);
    await client.query(
      `UPDATE user_credits SET credits = credits + $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, applied],
    );
    await client.query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status, admin_user_id)
       VALUES ($1, 'adjustment', $2, 0, $3, 'completed', $4)`,
      [userId, applied, why, adminId],
    );
    return { credits: account.credits + applied };
  });
}

/** A user's admin adjustments, newest first. */
export async function listAdjustments(userId) {
  const { rows } = await query(
    `SELECT credits, description, admin_user_id, created_at FROM credit_transactions
     WHERE user_id = $1 AND type = 'adjustment' ORDER BY created_at DESC, id DESC`,
    [userId],
  );
  return rows.map((r) => ({ delta: r.credits, reason: r.description, adminId: r.admin_user_id, at: r.created_at }));
}

/**
 * Pays for one AI chat message: from the pass's daily allowance (Nairobi day) if there is one
 * left, otherwise with credits. Returns a receipt to pass to refundChatMessage if the reply fails.
 */
export async function chargeChatMessage(userId, { now = new Date() } = {}) {
  return withTransaction(async (client) => {
    const account = await lockCredits(client, userId);
    const pass = await lockActivePass(client, userId, now);

    if (pass) {
      const day = chatDay(now);
      const { rows } = await client.query(
        `INSERT INTO pass_chat_usage (pass_id, day, messages) VALUES ($1, $2, 1)
         ON CONFLICT (pass_id, day) DO UPDATE SET messages = pass_chat_usage.messages + 1
         WHERE pass_chat_usage.messages < $3
         RETURNING messages`,
        [pass.id, day, pass.ai_messages_per_day],
      );
      if (rows.length) return { paidWith: 'pass', passId: pass.id, day };
    }

    if (account.credits < CREDITS_PER_CHAT_MESSAGE) {
      throw new BillingError('INSUFFICIENT_BALANCE', 'You have no messages left. Top up to keep chatting.');
    }
    await client.query(
      `UPDATE user_credits SET credits = credits - $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, CREDITS_PER_CHAT_MESSAGE],
    );
    await client.query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
       VALUES ($1, 'usage', $2, 0, 'Chat message', 'completed')`,
      [userId, -CREDITS_PER_CHAT_MESSAGE],
    );
    return { paidWith: 'credits' };
  });
}

/** Gives back what chargeChatMessage took, e.g. when the AI reply failed. */
export async function refundChatMessage(userId, receipt) {
  if (receipt.paidWith === 'pass') {
    await query(
      `UPDATE pass_chat_usage SET messages = messages - 1 WHERE pass_id = $1 AND day = $2 AND messages > 0`,
      [receipt.passId, receipt.day],
    );
    return;
  }
  await withTransaction(async (client) => {
    await lockCredits(client, userId);
    await client.query(
      `UPDATE user_credits SET credits = credits + $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, CREDITS_PER_CHAT_MESSAGE],
    );
    await client.query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
       VALUES ($1, 'refund', $2, 0, 'Chat refund: AI reply failed', 'completed')`,
      [userId, CREDITS_PER_CHAT_MESSAGE],
    );
  });
}

const REMINDER_WINDOW_MS = 3 * DAY_MS;

/** Live passes ending within 3 days, not yet reminded, with nothing queued after them. */
export async function passesDueForReminder({ now = new Date() } = {}) {
  const { rows } = await query(
    `SELECT p.id, p.user_id, p.expires_at, u.email, u.full_name
     FROM monthly_passes p JOIN users u ON u.id = p.user_id
     WHERE p.reminder_sent_at IS NULL
       AND p.starts_at <= $1 AND p.expires_at > $1 AND p.expires_at <= $2
       AND NOT EXISTS (
         SELECT 1 FROM monthly_passes n WHERE n.user_id = p.user_id AND n.starts_at >= p.expires_at
       )`,
    [now, new Date(now.getTime() + REMINDER_WINDOW_MS)],
  );
  return rows.map((r) => ({ passId: r.id, userId: r.user_id, email: r.email, name: r.full_name, expiresAt: r.expires_at }));
}

export async function markReminded(passId) {
  await query(`UPDATE monthly_passes SET reminder_sent_at = NOW() WHERE id = $1`, [passId]);
}
