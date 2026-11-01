import {
  BOOKING_MAX_AHEAD_MS,
  BOOKING_MIN_LEAD_MS,
  BOOKING_MINUTES,
  BOOKING_PAUSE_MS,
  JOIN_EARLY_MS,
  NO_SHOW_AFTER_MS,
  NO_SHOW_LIMIT,
  NO_SHOW_WINDOW_MS,
  SLOT_SPACING_MINUTES,
} from '@openear/shared/booking';
import { ANONYMOUS_CALLER } from '@openear/shared/calls';
import { config } from '../config.js';
import { query } from '../db.js';
import * as billing from './billing.js';
import { withTransaction } from './credits.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Booking a Conversation for later (ADR 0008). Listeners publish free start times; a person books
 * one. Credits are held when booking and given back when the Conversation starts (normal
 * per-second billing then applies) or when the booking ends unused.
 */

export class BookingError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.expose = true;
  }
}

const SPACING_MS = SLOT_SPACING_MINUTES * 60 * 1000;

/** Adds free start times for a Listener. All or nothing. */
export async function addSlots(listenerId, startTimes, { now = new Date() } = {}) {
  const times = startTimes.map((t) => new Date(t)).sort((a, b) => a - b);
  for (const t of times) {
    if (Number.isNaN(t.getTime()) || t <= now || t - now > BOOKING_MAX_AHEAD_MS) {
      throw new BookingError('SLOT_OUT_OF_RANGE', 'Free times must be in the future and at most 14 days ahead.');
    }
  }
  const { rows: existing } = await query(
    `SELECT starts_at FROM listener_slots WHERE listener_user_id = $1 AND starts_at > $2`,
    [listenerId, new Date(now.getTime() - SPACING_MS)],
  );
  const all = [...existing.map((r) => r.starts_at), ...times].sort((a, b) => a - b);
  for (let i = 1; i < all.length; i += 1) {
    if (all[i] - all[i - 1] < SPACING_MS) {
      throw new BookingError('SLOTS_TOO_CLOSE', `Free times must be at least ${SLOT_SPACING_MINUTES} minutes apart.`);
    }
  }
  for (const t of times) {
    await query(`INSERT INTO listener_slots (listener_user_id, starts_at) VALUES ($1, $2)`, [listenerId, t]);
  }
}

const LIVE = `('booked', 'joined', 'completed')`;

function toBooking(row, { withClientName = false } = {}) {
  const booking = {
    id: row.id,
    startsAt: row.starts_at.toISOString(),
    minutes: row.minutes,
    mode: row.mode,
    status: row.status,
  };
  if (withClientName) booking.clientName = row.display_name || ANONYMOUS_CALLER;
  return booking;
}

/** Books a free time for `clientId`, holding the credits it needs. */
export async function book(clientId, { slotId, minutes, mode, timeZone = null }, { now = new Date() } = {}) {
  if (!BOOKING_MINUTES.includes(minutes)) {
    throw new BookingError('INVALID_LENGTH', 'Choose 30 or 45 minutes.');
  }
  if (mode !== 'voice' && mode !== 'text') throw new BookingError('INVALID_MODE', 'Choose a call or a text chat.');

  return withTransaction(async (client) => {
    const { rows: users } = await client.query(`SELECT booking_paused_until FROM users WHERE id = $1`, [clientId]);
    const pausedUntil = users[0]?.booking_paused_until;
    if (pausedUntil && pausedUntil > now) {
      throw new BookingError(
        'BOOKING_PAUSED',
        `Booking is paused until ${pausedUntil.toUTCString()} after two missed bookings. You can still talk now any time.`,
        403,
      );
    }
    // Lock the slot so two people booking it at once can't both win.
    const { rows: slots } = await client.query(`SELECT * FROM listener_slots WHERE id = $1 FOR UPDATE`, [slotId]);
    const slot = slots[0];
    const inWindow =
      slot &&
      slot.starts_at.getTime() - now.getTime() >= BOOKING_MIN_LEAD_MS &&
      slot.starts_at.getTime() - now.getTime() <= BOOKING_MAX_AHEAD_MS;
    const { rows: taken } = slot
      ? await client.query(`SELECT 1 FROM bookings WHERE slot_id = $1 AND status IN ${LIVE}`, [slotId])
      : { rows: [] };
    if (!inWindow || taken.length || slot.listener_user_id === clientId) {
      throw new BookingError('SLOT_TAKEN', 'That time is no longer available. Please pick another.', 409);
    }

    const held = await billing.holdForBooking(client, clientId, minutes * 60, { now });
    const { rows } = await client.query(
      `INSERT INTO bookings
         (slot_id, client_user_id, listener_user_id, starts_at, minutes, mode, held_credits, client_time_zone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING *`,
      [slot.id, clientId, slot.listener_user_id, slot.starts_at, minutes, mode, held, validTimeZone(timeZone), now],
    );
    return toBooking(rows[0]);
  });
}

/** Ends a booking that hasn't started, by the person or the Listener. Credits come back. */
export async function cancel(userId, bookingId, { now = new Date() } = {}) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM bookings WHERE id = $1 AND (client_user_id = $2 OR listener_user_id = $2) FOR UPDATE`,
      [bookingId, userId],
    );
    const booking = rows[0];
    if (!booking) throw new BookingError('NOT_FOUND', 'Booking not found.', 404);
    if (booking.status !== 'booked') throw new BookingError('NOT_CANCELLABLE', 'This booking can no longer be cancelled.', 409);

    await billing.releaseBookingHold(client, booking.client_user_id, booking.held_credits);
    const { rows: updated } = await client.query(
      `UPDATE bookings SET status = 'cancelled', held_credits = 0, cancelled_by = $2, updated_at = $3 WHERE id = $1 RETURNING *`,
      [bookingId, userId, now],
    );
    return { ...toBooking(updated[0]), cancelledByListener: userId === booking.listener_user_id, clientId: booking.client_user_id };
  });
}

/** A person's bookings: upcoming first, then the last 30 days. */
export async function myBookings(clientId, { now = new Date() } = {}) {
  const { rows } = await query(
    `SELECT * FROM bookings WHERE client_user_id = $1 AND starts_at > $2
     ORDER BY (starts_at < $3), starts_at`,
    [clientId, new Date(now.getTime() - 30 * DAY_MS), new Date(now.getTime() - 60 * 60 * 1000)],
  );
  return rows.map((r) => toBooking(r));
}

/** A Listener's free times and bookings from an hour ago onwards. */
export async function listenerSchedule(listenerId, { now = new Date() } = {}) {
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  const [{ rows: slots }, { rows: booked }, { rows: me }] = await Promise.all([
    query(
      `SELECT s.id, s.starts_at FROM listener_slots s
       WHERE s.listener_user_id = $1 AND s.starts_at > $2
         AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status IN ${LIVE})
       ORDER BY s.starts_at`,
      [listenerId, now],
    ),
    query(
      `SELECT b.*, u.display_name FROM bookings b JOIN users u ON u.id = b.client_user_id
       WHERE b.listener_user_id = $1 AND b.starts_at > $2 AND b.status IN ('booked', 'joined')
       ORDER BY b.starts_at`,
      [listenerId, since],
    ),
    query(`SELECT allow_rebook FROM users WHERE id = $1`, [listenerId]),
  ]);
  return {
    slots: slots.map((s) => ({ slotId: s.id, startsAt: s.starts_at.toISOString() })),
    bookings: booked.map((r) => toBooking(r, { withClientName: true })),
    allowRebook: me[0]?.allow_rebook ?? true,
  };
}

/**
 * Free times `clientId` could book now: 1 hour to 14 days ahead, not taken, not their own.
 * With `againAfterCallId` (one of their past Conversations), only that Listener's times, if they allow it.
 */
export async function openSlots(clientId, { now = new Date(), againAfterCallId = null } = {}) {
  let onlyListener = null;
  if (againAfterCallId) {
    const { rows } = await query(
      `SELECT c.listener_user_id FROM call_history c JOIN users u ON u.id = c.listener_user_id
       WHERE c.id = $1 AND c.user_id = $2 AND u.allow_rebook`,
      [againAfterCallId, clientId],
    );
    if (!rows.length) {
      throw new BookingError('REBOOK_UNAVAILABLE', 'Booking again with this Listener isn’t available. You can book any Listener.', 404);
    }
    onlyListener = rows[0].listener_user_id;
  }
  const { rows } = await query(
    `SELECT s.id, s.starts_at FROM listener_slots s
     WHERE s.starts_at >= $2 AND s.starts_at <= $3 AND s.listener_user_id <> $1
       AND ($4::uuid IS NULL OR s.listener_user_id = $4)
       AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status IN ${LIVE})
     ORDER BY s.starts_at`,
    [clientId, new Date(now.getTime() + BOOKING_MIN_LEAD_MS), new Date(now.getTime() + BOOKING_MAX_AHEAD_MS), onlyListener],
  );
  return rows.map((r) => ({ slotId: r.id, startsAt: r.starts_at.toISOString() }));
}

/** A Listener chooses whether people may "Book again with this Listener". */
export async function setAllowRebook(listenerId, allow) {
  await query(`UPDATE users SET allow_rebook = $2 WHERE id = $1`, [listenerId, Boolean(allow)]);
}

/** Removes one of a Listener's free times, if nobody has booked it. */
export async function removeSlot(listenerId, slotId) {
  const { rowCount } = await query(
    `DELETE FROM listener_slots s WHERE s.id = $1 AND s.listener_user_id = $2
       AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id AND b.status IN ${LIVE})`,
    [slotId, listenerId],
  );
  if (!rowCount) throw new BookingError('NOT_FOUND', 'That free time can’t be removed. It may already be booked.', 404);
}

/** The window in which a booking's Conversation can be joined: 5 minutes early until it ends. */
const joinWindow = `$2 >= b.starts_at - interval '${JOIN_EARLY_MS / 1000} seconds'
  AND $2 < b.starts_at + make_interval(mins => b.minutes)`;

/** The Listener opened their console: count them present for any booking about to start. */
export async function markListenerPresent(listenerId, { now = new Date() } = {}) {
  await query(
    `UPDATE bookings b SET listener_present_at = COALESCE(listener_present_at, $2)
     WHERE b.listener_user_id = $1 AND b.status IN ('booked', 'joined') AND ${joinWindow}`,
    [listenerId, now],
  );
}

/** The person pressed Join. Returns the booking's Listener, length and mode, or refuses. */
export async function markClientJoined(clientId, bookingId, { now = new Date() } = {}) {
  const { rows } = await query(
    `UPDATE bookings b SET client_joined_at = COALESCE(client_joined_at, $2)
     WHERE b.id = $1 AND b.client_user_id = $3 AND b.status IN ('booked', 'joined') AND ${joinWindow}
     RETURNING *`,
    [bookingId, now, clientId],
  );
  if (!rows.length) throw new BookingError('NOT_JOINABLE', 'This booking can’t be joined right now.', 409);
  const b = rows[0];
  return { listenerId: b.listener_user_id, minutes: b.minutes, mode: b.mode, status: b.status };
}

/** The booked Conversation is starting: give the hold back (per-second billing takes over). */
export async function startBookedConversation(bookingId) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`, [bookingId]);
    const b = rows[0];
    if (!b || b.status !== 'booked') return;
    await billing.releaseBookingHold(client, b.client_user_id, b.held_credits);
    await client.query(`UPDATE bookings SET status = 'joined', held_credits = 0, updated_at = NOW() WHERE id = $1`, [bookingId]);
  });
}

/** The booked Conversation ended. */
export async function finishBookedConversation(bookingId, callId) {
  await query(
    `UPDATE bookings SET status = 'completed', call_id = $2, updated_at = NOW() WHERE id = $1 AND status = 'joined'`,
    [bookingId, callId],
  );
}

function validTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length > 64) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

function formatWhen(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'Africa/Nairobi',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

const REMINDER_SUBJECT = 'Your Open Ear conversation';

async function emailOf(userId) {
  const { rows } = await query(`SELECT email FROM users WHERE id = $1`, [userId]);
  return rows[0]?.email;
}

async function remind(booking, notify, lead) {
  const link = `${config.clientUrl}/dashboard`;
  for (const [userId, tz, where] of [
    [booking.client_user_id, booking.client_time_zone, 'your dashboard'],
    [booking.listener_user_id, null, 'your Listener console'],
  ]) {
    const to = await emailOf(userId);
    if (!to) continue;
    await notify.email(
      to,
      REMINDER_SUBJECT,
      `<p>A reminder: your Open Ear conversation is ${lead}, on ${formatWhen(booking.starts_at, tz)}
       (${booking.minutes} minutes).</p><p>The Join button appears in <a href="${link}">${where}</a> 5 minutes before.</p>`,
    );
  }
}

async function countNoShows(client, clientId, now) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS n FROM bookings WHERE client_user_id = $1 AND status = 'client_no_show' AND starts_at > $2`,
    [clientId, new Date(now.getTime() - NO_SHOW_WINDOW_MS)],
  );
  return rows[0].n;
}

/** Settles one booking nobody (or only one side) turned up for. */
async function settleNoShow(bookingId, now, notify, adminEmail) {
  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM bookings WHERE id = $1 AND status = 'booked' FOR UPDATE`, [bookingId]);
    const b = rows[0];
    if (!b) return null;
    // The person is only counted as a no-show if their Listener was there for them.
    const status = b.listener_present_at && !b.client_joined_at ? 'client_no_show' : 'listener_no_show';
    await billing.releaseBookingHold(client, b.client_user_id, b.held_credits);
    await client.query(`UPDATE bookings SET status = $2, held_credits = 0, updated_at = $3 WHERE id = $1`, [bookingId, status, now]);
    if (status === 'client_no_show' && (await countNoShows(client, b.client_user_id, now)) >= NO_SHOW_LIMIT) {
      await client.query(`UPDATE users SET booking_paused_until = $2 WHERE id = $1`, [
        b.client_user_id,
        new Date(now.getTime() + BOOKING_PAUSE_MS),
      ]);
    }
    return { ...b, status };
  });
  if (outcome?.status !== 'listener_no_show') return;
  if (adminEmail) {
    await notify.email(
      adminEmail,
      'A Listener missed a booked conversation',
      `<p>Booking ${outcome.id} at ${outcome.starts_at.toISOString()} was missed by Listener ${outcome.listener_user_id}.
       The person's credits were returned.</p>`,
    );
  }
  if (outcome.client_joined_at) {
    const to = await emailOf(outcome.client_user_id);
    if (to) {
      await notify.email(
        to,
        REMINDER_SUBJECT,
        `<p>We're sorry: your Listener couldn't make it today. Your credits have been returned in full.</p>
         <p>If you'd like to talk now, a Listener may be free: <a href="${config.clientUrl}/call">Talk now</a>.</p>`,
      );
    }
  }
}

/**
 * Runs every minute: sends reminders 24 hours and 1 hour before, and settles bookings nobody
 * joined within 15 minutes of the start. Safe to run more than once (each step is recorded).
 */
export async function sweep({ now = new Date(), notify, adminEmail = config.adminEmail } = {}) {
  const { rows: due24 } = await query(
    `UPDATE bookings SET reminded_24h_at = $1
     WHERE status = 'booked' AND reminded_24h_at IS NULL
       AND starts_at - $1 <= interval '24 hours' AND starts_at - $1 > interval '1 hour'
       AND starts_at - created_at > interval '24 hours'
     RETURNING *`,
    [now],
  );
  for (const b of due24) await remind(b, notify, 'tomorrow');

  const { rows: due1 } = await query(
    `UPDATE bookings SET reminded_1h_at = $1
     WHERE status = 'booked' AND reminded_1h_at IS NULL AND starts_at - $1 <= interval '1 hour' AND starts_at > $1
     RETURNING *`,
    [now],
  );
  for (const b of due1) await remind(b, notify, 'in about an hour');

  // A booked Conversation that started but never connected is over once its time has passed.
  await query(
    `UPDATE bookings SET status = 'completed', updated_at = $1
     WHERE status = 'joined' AND starts_at + make_interval(mins => minutes) <= $1`,
    [now],
  );

  const { rows: missed } = await query(
    `SELECT id FROM bookings WHERE status = 'booked' AND starts_at + interval '${NO_SHOW_AFTER_MS / 1000} seconds' <= $1`,
    [now],
  );
  for (const { id } of missed) await settleNoShow(id, now, notify, adminEmail);
}

const icsTime = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** An .ics calendar file for one of the user's bookings. Neutral wording on purpose. */
export async function calendarFile(userId, bookingId) {
  const { rows } = await query(
    `SELECT * FROM bookings WHERE id = $1 AND (client_user_id = $2 OR listener_user_id = $2)`,
    [bookingId, userId],
  );
  const b = rows[0];
  if (!b) throw new BookingError('NOT_FOUND', 'Booking not found.', 404);
  const end = new Date(b.starts_at.getTime() + b.minutes * 60 * 1000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Open Ear//Bookings//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@openearemedy.com`,
    `DTSTAMP:${icsTime(b.created_at)}`,
    `DTSTART:${icsTime(b.starts_at)}`,
    `DTEND:${icsTime(end)}`,
    'SUMMARY:Open Ear conversation',
    `DESCRIPTION:Join from ${config.clientUrl}/dashboard. The Join button appears 5 minutes before.`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Open Ear conversation',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
