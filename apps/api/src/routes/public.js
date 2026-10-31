import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import { asyncHandler } from '../middleware.js';
import { sendRawEmail } from '../email.js';
import { escapeHtml, isValidEmail, rateLimit } from '../util.js';

const router = Router();

const formLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

router.post(
  '/contact',
  formLimit,
  asyncHandler(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();

    if (!name || name.length > 100) return res.status(400).json({ error: 'Please enter your name' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
    if (subject.length > 200) return res.status(400).json({ error: 'Subject is too long' });
    if (!message || message.length > 5000) {
      return res.status(400).json({ error: 'Please enter a message (up to 5000 characters)' });
    }

    await query(
      `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`,
      [name, email, subject || null, message],
    );

    if (config.resendApiKey && config.adminEmail) {
      try {
        await sendRawEmail({
          to: config.adminEmail,
          subject: `Contact form: ${(subject || 'New message').replace(/[\r\n]/g, ' ').slice(0, 100)}`,
          html: `<h2>New contact message</h2>
            <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
            <p><strong>Subject:</strong> ${escapeHtml(subject || '—')}</p>
            <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
        });
      } catch (e) {
        console.error('Contact email error:', e);
      }
    }

    res.json({ success: true });
  }),
);

router.post(
  '/newsletter',
  formLimit,
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
    await query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
      [email],
    );
    res.json({ success: true });
  }),
);

export default router;
