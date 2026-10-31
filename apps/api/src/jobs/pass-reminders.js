import { config } from '../config.js';
import { pool } from '../db.js';
import { sendRawEmail } from '../email.js';
import { markReminded, passesDueForReminder } from '../services/billing.js';
import { escapeHtml } from '../util.js';

/**
 * Emails people whose Monthly Pass ends within 3 days (and who haven't renewed), once per pass.
 * Run daily: `npm run jobs:pass-reminders -w @openear/api` (GitHub Actions in production, see .github/workflows/scheduled.yml).
 */
async function main() {
  const due = await passesDueForReminder();
  let sent = 0;
  for (const pass of due) {
    const ends = pass.expiresAt.toLocaleDateString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Africa/Nairobi',
    });
    try {
      await sendRawEmail({
        to: pass.email,
        subject: 'Your Open Ear Monthly Pass ends soon',
        html: `<p>Hi ${escapeHtml(pass.name || 'there')},</p>
<p>Your Monthly Pass ends on <strong>${escapeHtml(ends)}</strong>. Passes never renew by themselves.</p>
<p>If you'd like to keep your call time and daily AI messages, you can get your next pass now. It starts when this one ends, so you won't lose any days.</p>
<p><a href="${config.clientUrl}/pricing">Renew your Monthly Pass</a></p>
<p>Your credits are unaffected and never expire.</p>`,
      });
      await markReminded(pass.passId);
      sent += 1;
    } catch (err) {
      // Leave it unmarked so tomorrow's run tries again.
      console.error('Pass reminder failed', { passId: pass.passId, error: err.message });
    }
  }
  console.log(`Pass reminders: ${sent} sent, ${due.length - sent} failed, ${due.length} due.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool?.end());
