import { Router } from 'express';
import { query } from '../db.js';
import { sendRawEmail } from '../email.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import * as bookings from '../services/bookings.js';
import { httpError, rateLimit } from '../util.js';

/**
 * Booking a Conversation for later. Mounted at /api/bookings.
 *   People: see free times, book, cancel, list their bookings, download a calendar file.
 *   Listeners: publish and remove free times, see their schedule, allow "Book again".
 * Joining happens over the call socket (call:request with bookingId).
 */
const router = Router();
router.use(requireAuth);

const isUuid = (v) => /^[0-9a-f-]{36}$/i.test(String(v));

async function requireListener(req, _res, next) {
  try {
    const { rows } = await query(`SELECT 1 FROM listeners WHERE user_id = $1 AND active`, [req.user.id]);
    next(rows[0] ? undefined : httpError(403, 'Only Listeners can do that.'));
  } catch (err) {
    next(err);
  }
}

// ?again=<callId> limits the times to the Listener from that past Conversation.
router.get(
  '/slots',
  asyncHandler(async (req, res) => {
    const again = req.query.again;
    if (again !== undefined && !isUuid(again)) throw httpError(404, 'Booking again with this Listener isn’t available.');
    res.json({ slots: await bookings.openSlots(req.user.id, { againAfterCallId: again ?? null }) });
  }),
);

// { slotId, minutes: 30|45, mode: 'voice'|'text', timeZone }
router.post(
  '/',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const { slotId, minutes, mode, timeZone } = req.body ?? {};
    if (!isUuid(slotId)) throw httpError(409, 'That time is no longer available. Please pick another.');
    const booking = await bookings.book(req.user.id, { slotId, minutes: Number(minutes), mode, timeZone });
    res.status(201).json({ booking });
  }),
);

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    res.json({ bookings: await bookings.myBookings(req.user.id) });
  }),
);

// Either side can cancel before it starts; the other side is told by email.
router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw httpError(404, 'Booking not found.');
    const result = await bookings.cancel(req.user.id, req.params.id);
    if (result.cancelledByListener) {
      const { rows } = await query(`SELECT email FROM users WHERE id = $1`, [result.clientId]);
      if (rows[0]?.email) {
        await sendRawEmail({
          to: rows[0].email,
          subject: 'Your Open Ear conversation',
          html: `<p>Sorry: your Listener had to cancel your booked conversation. Your credits have been returned in full.</p>
                 <p>You can book another time, or talk now if a Listener is free.</p>`,
        }).catch((err) => console.error('Booking cancel email failed', err));
      }
    }
    res.json({ booking: { id: result.id, status: result.status } });
  }),
);

router.get(
  '/:id/calendar.ics',
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw httpError(404, 'Booking not found.');
    const ics = await bookings.calendarFile(req.user.id, req.params.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="open-ear-conversation.ics"');
    res.send(ics);
  }),
);

router.get(
  '/listener/schedule',
  requireListener,
  asyncHandler(async (req, res) => {
    res.json(await bookings.listenerSchedule(req.user.id));
  }),
);

// { startsAt: [iso, ...] }
router.post(
  '/listener/slots',
  requireListener,
  asyncHandler(async (req, res) => {
    const times = req.body?.startsAt;
    if (!Array.isArray(times) || times.length === 0 || times.length > 50) {
      throw httpError(400, 'Send between 1 and 50 start times.');
    }
    await bookings.addSlots(req.user.id, times);
    res.status(201).json(await bookings.listenerSchedule(req.user.id));
  }),
);

router.delete(
  '/listener/slots/:id',
  requireListener,
  asyncHandler(async (req, res) => {
    if (!isUuid(req.params.id)) throw httpError(404, 'Free time not found.');
    await bookings.removeSlot(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

// { allow: boolean }
router.put(
  '/listener/rebook',
  requireListener,
  asyncHandler(async (req, res) => {
    await bookings.setAllowRebook(req.user.id, req.body?.allow !== false);
    res.json(await bookings.listenerSchedule(req.user.id));
  }),
);

export default router;
