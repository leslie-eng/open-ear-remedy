import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';
import * as billing from '../src/services/billing.js';
import * as bookings from '../src/services/bookings.js';
import { query } from '../src/db.js';

const NOW = new Date('2026-11-02T09:00:00Z');
const at = (iso) => new Date(iso);
const hours = (h) => new Date(NOW.getTime() + h * 3600_000);

describe.skipIf(!hasTestDatabase)('booking a Conversation', () => {
  beforeEach(async () => {
    await resetData();
  });

  async function person(credits = 1000) {
    const userId = await createUser();
    if (credits) await billing.adjustCredits({ adminId: await createUser(), userId, delta: credits, reason: 'test setup' });
    return userId;
  }

  describe('free times', () => {
    it('shows people the times Listeners are free, soonest first', async () => {
      const listener = await createUser();
      await bookings.addSlots(listener, [hours(26), hours(3)], { now: NOW });

      const open = await bookings.openSlots(await person(), { now: NOW });

      expect(open.map((s) => s.startsAt)).toEqual([hours(3).toISOString(), hours(26).toISOString()]);
    });

    it('only offers times from 1 hour to 14 days ahead', async () => {
      const listener = await createUser();
      await bookings.addSlots(listener, [hours(5)], { now: NOW });
      const client = await person();

      expect(await bookings.openSlots(client, { now: hours(4.5) })).toEqual([]);
      expect(await bookings.openSlots(client, { now: hours(5 - 24 * 15) })).toEqual([]);
      expect(await bookings.openSlots(client, { now: NOW })).toHaveLength(1);
    });

    it('refuses free times in the past, more than 14 days ahead, or closer than 45 minutes apart', async () => {
      const listener = await createUser();

      await expect(bookings.addSlots(listener, [hours(-1)], { now: NOW })).rejects.toMatchObject({ code: 'SLOT_OUT_OF_RANGE' });
      await expect(bookings.addSlots(listener, [hours(24 * 15)], { now: NOW })).rejects.toMatchObject({ code: 'SLOT_OUT_OF_RANGE' });
      await expect(bookings.addSlots(listener, [hours(3), hours(3.5)], { now: NOW })).rejects.toMatchObject({ code: 'SLOTS_TOO_CLOSE' });
      await bookings.addSlots(listener, [hours(3)], { now: NOW });
      await expect(bookings.addSlots(listener, [hours(2.5)], { now: NOW })).rejects.toMatchObject({ code: 'SLOTS_TOO_CLOSE' });
    });

    it('never offers a Listener their own free times', async () => {
      const listener = await createUser();
      await bookings.addSlots(listener, [hours(3)], { now: NOW });

      expect(await bookings.openSlots(listener, { now: NOW })).toEqual([]);
    });
  });

  async function freeSlot(startsAt = hours(3)) {
    const listener = await createUser();
    await bookings.addSlots(listener, [startsAt], { now: NOW });
    const [slot] = (await bookings.openSlots(await createUser(), { now: NOW })).filter(
      (s) => s.startsAt === startsAt.toISOString(),
    );
    return { listener, slotId: slot.slotId };
  }

  describe('booking', () => {
    it('holds the credits for the full length, so the person can see them set aside', async () => {
      const { slotId } = await freeSlot();
      const client = await person(1000);

      const booking = await bookings.book(client, { slotId, minutes: 45, mode: 'voice' }, { now: NOW });

      expect(booking).toMatchObject({ minutes: 45, mode: 'voice', status: 'booked', startsAt: hours(3).toISOString() });
      expect((await billing.getBalance(client)).credits).toBe(1000 - 450);
    });

    it('uses Monthly Pass time first, and holds credits only for the rest', async () => {
      const { slotId } = await freeSlot();
      const client = await person(1000);
      await billing.grantPurchase(client, 'monthly-pass', { reference: 'pass-1', now: NOW });

      await bookings.book(client, { slotId, minutes: 30, mode: 'text' }, { now: NOW });

      expect((await billing.getBalance(client, { now: NOW })).credits).toBe(1000);
    });

    it('refuses a booking the person cannot afford', async () => {
      const { slotId } = await freeSlot();
      const client = await person(200);

      await expect(bookings.book(client, { slotId, minutes: 30, mode: 'voice' }, { now: NOW })).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
      });
      expect((await billing.getBalance(client)).credits).toBe(200);
    });

    it('lets only one person book a free time', async () => {
      const { slotId } = await freeSlot();
      const first = await person();
      const second = await person();

      await bookings.book(first, { slotId, minutes: 30, mode: 'voice' }, { now: NOW });

      await expect(bookings.book(second, { slotId, minutes: 30, mode: 'voice' }, { now: NOW })).rejects.toMatchObject({
        code: 'SLOT_TAKEN',
      });
      expect(await bookings.openSlots(second, { now: NOW })).toEqual([]);
    });

    it('refuses lengths other than 30 or 45 minutes, and times outside the booking window', async () => {
      const { slotId } = await freeSlot(hours(1.5));
      const client = await person();

      await expect(bookings.book(client, { slotId, minutes: 60, mode: 'voice' }, { now: NOW })).rejects.toMatchObject({
        code: 'INVALID_LENGTH',
      });
      await expect(bookings.book(client, { slotId, minutes: 30, mode: 'voice' }, { now: hours(1) })).rejects.toMatchObject({
        code: 'SLOT_TAKEN',
      });
    });

    it('is free to cancel at any time: the held credits come back and the time opens up again', async () => {
      const { slotId } = await freeSlot();
      const client = await person(1000);
      const booking = await bookings.book(client, { slotId, minutes: 45, mode: 'voice' }, { now: NOW });

      await bookings.cancel(client, booking.id, { now: hours(2.9) });

      expect((await billing.getBalance(client)).credits).toBe(1000);
      expect((await bookings.myBookings(client, { now: NOW }))[0]).toMatchObject({ status: 'cancelled' });
      expect(await bookings.openSlots(await person(), { now: NOW })).toHaveLength(1);
    });

    it('lets nobody else cancel someone’s booking', async () => {
      const { slotId } = await freeSlot();
      const client = await person();
      const booking = await bookings.book(client, { slotId, minutes: 30, mode: 'voice' }, { now: NOW });

      await expect(bookings.cancel(await person(), booking.id, { now: NOW })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('shows the Listener their bookings with the person’s display name only', async () => {
      const { listener, slotId } = await freeSlot();
      const client = await person();
      await bookings.book(client, { slotId, minutes: 30, mode: 'text' }, { now: NOW });

      const schedule = await bookings.listenerSchedule(listener, { now: NOW });

      expect(schedule.bookings).toEqual([
        expect.objectContaining({ minutes: 30, mode: 'text', status: 'booked', clientName: 'Anonymous' }),
      ]);
      expect(JSON.stringify(schedule)).not.toContain('@test.local');
    });
  });

  describe('booking again with the same Listener', () => {
    async function pastCall(client, listener) {
      const { rows } = await query(
        `INSERT INTO call_history (user_id, listener_user_id, status) VALUES ($1, $2, 'completed') RETURNING id`,
        [client, listener],
      );
      return rows[0].id;
    }

    it('offers only that Listener’s free times, without revealing who they are', async () => {
      const usual = await createUser();
      const other = await createUser();
      await bookings.addSlots(usual, [hours(4)], { now: NOW });
      await bookings.addSlots(other, [hours(5)], { now: NOW });
      const client = await person();
      const callId = await pastCall(client, usual);

      const open = await bookings.openSlots(client, { now: NOW, againAfterCallId: callId });

      expect(open.map((s) => s.startsAt)).toEqual([hours(4).toISOString()]);
      expect(JSON.stringify(open)).not.toContain(usual);
    });

    it('is unavailable when the Listener has turned it off, or the call was someone else’s', async () => {
      const listener = await createUser();
      await bookings.addSlots(listener, [hours(4)], { now: NOW });
      const client = await person();
      const callId = await pastCall(client, listener);

      await expect(bookings.openSlots(await person(), { now: NOW, againAfterCallId: callId })).rejects.toMatchObject({
        code: 'REBOOK_UNAVAILABLE',
      });
      await bookings.setAllowRebook(listener, false);
      await expect(bookings.openSlots(client, { now: NOW, againAfterCallId: callId })).rejects.toMatchObject({
        code: 'REBOOK_UNAVAILABLE',
      });
    });
  });

  describe('when nobody turns up', () => {
    let sent;
    const notify = { email: async (to, subject) => sent.push({ to, subject }) };

    beforeEach(() => {
      sent = [];
    });

    async function booked(startsAt = hours(3), minutes = 30) {
      const { listener, slotId } = await freeSlot(startsAt);
      const client = await person(1000);
      const booking = await bookings.book(client, { slotId, minutes, mode: 'voice' }, { now: NOW });
      return { listener, client, booking };
    }

    const after = (booking, minutes) => new Date(Date.parse(booking.startsAt) + minutes * 60_000);

    it('gives the credits back when the person doesn’t join within 15 minutes', async () => {
      const { listener, client, booking } = await booked();
      await bookings.markListenerPresent(listener, { now: after(booking, 0) });

      await bookings.sweep({ now: after(booking, 14), notify });
      expect((await bookings.myBookings(client, { now: NOW }))[0].status).toBe('booked');

      await bookings.sweep({ now: after(booking, 15), notify });
      expect((await bookings.myBookings(client, { now: NOW }))[0].status).toBe('client_no_show');
      expect((await billing.getBalance(client)).credits).toBe(1000);
    });

    it('pauses booking for 7 days after two no-shows in 30 days, but never Talk now', async () => {
      const first = await booked(hours(3));
      await bookings.markListenerPresent(first.listener, { now: after(first.booking, 0) });
      await bookings.sweep({ now: after(first.booking, 15), notify });

      const { listener, slotId } = await freeSlot(hours(30));
      const second = await bookings.book(first.client, { slotId, minutes: 30, mode: 'voice' }, { now: NOW });
      await bookings.markListenerPresent(listener, { now: after(second, 0) });
      await bookings.sweep({ now: after(second, 15), notify });

      const later = await freeSlot(hours(60));
      await expect(
        bookings.book(first.client, { slotId: later.slotId, minutes: 30, mode: 'voice' }, { now: after(second, 20) }),
      ).rejects.toMatchObject({ code: 'BOOKING_PAUSED' });
    });

    it('when the Listener doesn’t show: credits back, nothing counted against the person, and the admin is told', async () => {
      const { client, booking } = await booked();
      await bookings.markClientJoined(client, booking.id, { now: after(booking, 1) });

      await bookings.sweep({ now: after(booking, 15), notify, adminEmail: 'admin@openear.test' });

      expect((await bookings.myBookings(client, { now: NOW }))[0].status).toBe('listener_no_show');
      expect((await billing.getBalance(client)).credits).toBe(1000);
      expect(sent.map((m) => m.to)).toContain('admin@openear.test');
    });

    it('never penalises the person when the Listener wasn’t there either', async () => {
      const { client, booking } = await booked();

      await bookings.sweep({ now: after(booking, 15), notify });

      expect((await bookings.myBookings(client, { now: NOW }))[0].status).toBe('listener_no_show');
    });
  });

  describe('reminders and calendars', () => {
    let sent;
    const notify = { email: async (to, subject, html) => sent.push({ to, subject, html }) };

    beforeEach(() => {
      sent = [];
    });

    it('emails both people 24 hours and 1 hour before, once each, with neutral wording', async () => {
      const { slotId } = await freeSlot(hours(48));
      const client = await person();
      const booking = await bookings.book(client, { slotId, minutes: 30, mode: 'voice' }, { now: NOW });

      await bookings.sweep({ now: hours(23), notify });
      expect(sent).toHaveLength(0);
      await bookings.sweep({ now: hours(24.5), notify });
      await bookings.sweep({ now: hours(25), notify });
      expect(sent).toHaveLength(2);
      await bookings.sweep({ now: hours(47.5), notify });
      expect(sent).toHaveLength(4);
      expect(sent.every((m) => m.subject === 'Your Open Ear conversation')).toBe(true);
      expect(booking.status).toBe('booked');
    });

    it('skips the 24-hour reminder for a booking made less than a day ahead', async () => {
      const { slotId } = await freeSlot(hours(3));
      await bookings.book(await person(), { slotId, minutes: 30, mode: 'voice' }, { now: NOW });

      await bookings.sweep({ now: hours(1), notify });
      expect(sent).toHaveLength(0);
      await bookings.sweep({ now: hours(2.1), notify });
      expect(sent).toHaveLength(2);
    });

    it('gives each side a calendar file that says nothing sensitive', async () => {
      const { listener, slotId } = await freeSlot(hours(3));
      const client = await person();
      const booking = await bookings.book(client, { slotId, minutes: 45, mode: 'voice' }, { now: NOW });

      const ics = await bookings.calendarFile(client, booking.id);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:Open Ear conversation');
      expect(ics).toContain('DTSTART:20261102T120000Z');
      expect(ics).toContain('DTEND:20261102T124500Z');
      expect(await bookings.calendarFile(listener, booking.id)).toContain('SUMMARY:Open Ear conversation');
      await expect(bookings.calendarFile(await person(), booking.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
