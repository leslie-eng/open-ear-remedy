import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { deductCredits, getCredits } from '../services/credits.js';

const router = Router();

router.post(
  '/initiate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { toNumber } = req.body;
    const credits = await getCredits(req.user.id);
    if (credits < 10) {
      return res.status(400).json({ error: 'Insufficient credits. Minimum 10 credits required.' });
    }

    let callSid = `sim_${Date.now()}`;

    if (config.twilioAccountSid && config.twilioAuthToken && config.twilioPhoneNumber && toNumber) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, you are now connected to Open Ear support.</Say>
</Response>`;
      const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64');
      const form = new URLSearchParams();
      form.append('To', toNumber);
      form.append('From', config.twilioPhoneNumber);
      form.append('Twiml', twiml);

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
        const errText = await twilioRes.text();
        throw new Error(`Twilio API error: ${errText}`);
      }
      const callData = await twilioRes.json();
      callSid = callData.sid;
    }

    const { rows } = await query(
      `INSERT INTO call_history (user_id, call_sid, status) VALUES ($1, $2, 'in-progress') RETURNING *`,
      [req.user.id, callSid],
    );

    res.json({
      success: true,
      callSid,
      callId: rows[0].id,
      message: 'Call initiated successfully',
    });
  }),
);

router.post(
  '/end',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { callId, durationSeconds } = req.body;
    const duration = parseInt(durationSeconds, 10) || 0;
    const creditsUsed = Math.ceil(duration / 60) * 10;

    await query(
      `UPDATE call_history SET duration_seconds = $1, credits_used = $2, status = 'completed', ended_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [duration, creditsUsed, callId, req.user.id],
    );

    const remainingCredits = await deductCredits(
      req.user.id,
      creditsUsed,
      `Call duration: ${Math.ceil(duration / 60)} minutes`,
      callId,
    );

    res.json({
      success: true,
      creditsUsed,
      remainingCredits,
      message: 'Call ended and credits deducted',
    });
  }),
);

export default router;
