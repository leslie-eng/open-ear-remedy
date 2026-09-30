import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { deductCredits, getCredits } from '../services/credits.js';
import { rateLimit } from '../util.js';

const router = Router();

const CREDITS_PER_MINUTE = 10;
const E164 = /^\+[1-9]\d{7,14}$/;

function normalizePhone(raw) {
  return String(raw || '').replace(/[\s\-().]/g, '');
}

/** Billable seconds for a call: wall-clock time since start, capped at what the user could afford. */
function billableSeconds(call) {
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000));
  return Math.min(elapsed, call.max_duration_seconds ?? elapsed);
}

/** Completes a call and charges for it. Returns null if it was already ended. */
async function finishCall(userId, callId) {
  const { rows } = await query(
    `UPDATE call_history SET status = 'completed', ended_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'in-progress'
     RETURNING *`,
    [callId, userId],
  );
  const call = rows[0];
  if (!call) return null;

  const duration = billableSeconds(call);
  const minutes = Math.ceil(duration / 60);
  const creditsUsed = minutes * CREDITS_PER_MINUTE;
  await query(
    `UPDATE call_history SET duration_seconds = $1, credits_used = $2 WHERE id = $3`,
    [duration, creditsUsed, call.id],
  );
  const remainingCredits = await deductCredits(
    userId,
    creditsUsed,
    `Call duration: ${minutes} minutes`,
    call.id,
  );
  return { duration, creditsUsed, remainingCredits };
}

router.post(
  '/initiate',
  requireAuth,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const toNumber = normalizePhone(req.body.toNumber);
    if (!E164.test(toNumber)) {
      return res
        .status(400)
        .json({ error: 'Enter your phone number in international format, e.g. +233201234567.' });
    }
    if (
      config.callAllowedPrefixes.length > 0 &&
      !config.callAllowedPrefixes.some((prefix) => toNumber.startsWith(prefix))
    ) {
      return res.status(400).json({ error: 'Calls to this country are not supported.' });
    }

    // Close (and bill) any call the user left open, so abandoned calls aren't free.
    const { rows: open } = await query(
      `SELECT id FROM call_history WHERE user_id = $1 AND status = 'in-progress'`,
      [req.user.id],
    );
    for (const call of open) await finishCall(req.user.id, call.id);

    const credits = await getCredits(req.user.id);
    if (credits < CREDITS_PER_MINUTE) {
      return res.status(400).json({ error: 'Insufficient credits. Minimum 10 credits required.' });
    }
    const affordableMinutes = Math.floor(credits / CREDITS_PER_MINUTE);
    const maxDurationSeconds = Math.min(affordableMinutes, config.callMaxMinutes) * 60;

    let callSid = `sim_${Date.now()}`;

    if (config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, you are now connected to Open Ear support.</Say>
</Response>`;
      const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
      const form = new URLSearchParams();
      form.append('To', toNumber);
      form.append('From', config.twilioPhoneNumber);
      form.append('Twiml', twiml);
      // Twilio hangs up by itself once the user's credits would run out.
      form.append('TimeLimit', String(maxDurationSeconds));

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        },
      );
      if (!twilioRes.ok) {
        console.error('Twilio API error:', await twilioRes.text());
        return res.status(502).json({ error: 'Could not place the call. Please check the number and try again.' });
      }
      const callData = await twilioRes.json();
      callSid = callData.sid;
    }

    const { rows } = await query(
      `INSERT INTO call_history (user_id, call_sid, status, max_duration_seconds, to_number)
       VALUES ($1, $2, 'in-progress', $3, $4) RETURNING id`,
      [req.user.id, callSid, maxDurationSeconds, toNumber],
    );

    res.json({
      success: true,
      callSid,
      callId: rows[0].id,
      maxDurationSeconds,
      message: 'Call initiated successfully',
    });
  }),
);

router.post(
  '/end',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { callId } = req.body;
    if (typeof callId !== 'string' || !/^[0-9a-f-]{36}$/i.test(callId)) {
      return res.status(400).json({ error: 'Invalid call id' });
    }
    const result = await finishCall(req.user.id, callId);
    if (!result) {
      return res.status(404).json({ error: 'Call not found or already ended' });
    }
    res.json({
      success: true,
      creditsUsed: result.creditsUsed,
      remainingCredits: result.remainingCredits,
      durationSeconds: result.duration,
      message: 'Call ended and credits deducted',
    });
  }),
);

export default router;
