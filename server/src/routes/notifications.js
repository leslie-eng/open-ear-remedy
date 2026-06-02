import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { sendRawEmail } from '../email.js';

const THRESHOLDS = { critical: 10, low: 25, warning: 50 };

const router = Router();

router.post(
  '/low-credit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const credits = parseInt(req.body.credits, 10);
    const userEmail = req.user.email;
    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' });
    }

    let thresholdLevel = null;
    if (credits <= THRESHOLDS.critical) thresholdLevel = 'critical';
    else if (credits <= THRESHOLDS.low) thresholdLevel = 'low';
    else if (credits <= THRESHOLDS.warning) thresholdLevel = 'warning';

    if (!thresholdLevel) {
      return res.json({ message: 'Credits above all thresholds, no notification needed' });
    }

    const { rows: existing } = await query(
      `SELECT id FROM credit_notifications WHERE user_id = $1 AND threshold_level = $2`,
      [req.user.id, thresholdLevel],
    );
    if (existing[0]) {
      return res.json({ message: 'Notification already sent for this threshold' });
    }

    const subjects = {
      critical: 'Critical: Your Open Ear credits are almost depleted',
      low: 'Low Credit Alert - Open Ear',
      warning: 'Credit Reminder - Open Ear',
    };

    if (config.resendApiKey) {
      await sendRawEmail({
        to: userEmail,
        subject: subjects[thresholdLevel],
        html: `<p>Your balance is ${credits} credits. <a href="${config.clientUrl}/pricing">Buy more credits</a></p>`,
      });
    }

    await query(
      `INSERT INTO credit_notifications (user_id, email, threshold_level, credits_at_notification)
       VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, threshold_level) DO NOTHING`,
      [req.user.id, userEmail, thresholdLevel, credits],
    );

    res.json({ success: true, threshold: thresholdLevel, credits });
  }),
);

export default router;
