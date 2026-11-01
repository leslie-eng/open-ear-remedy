import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';
import { createFakeClock } from './fake-clock.js';
import * as billing from '../src/services/billing.js';
import * as bookings from '../src/services/bookings.js';
import { createCallCoordinator } from '../src/calls/coordinator.js';

const START = Date.parse('2026-11-02T12:00:00Z');
const BOOKED_AT = new Date(START - 3 * 3600_000);
const MINUTE = 60_000;

describe.skipIf(!hasTestDatabase)('joining a booked Conversation', () => {
  let clock;
  let inbox;
  let calls;

  beforeEach(async () => {
    await resetData();
    clock = createFakeClock(START - 2 * MINUTE);
    inbox = new Map();
    calls = createCallCoordinator({
      clock,
      send: (userId, message) => inbox.set(userId, [...(inbox.get(userId) ?? []), message]),
    });
  });

  const received = (userId, type) => (inbox.get(userId) ?? []).filter((m) => m.type === type);
  const last = (userId, type) => received(userId, type).at(-1);

  async function bookedConversation({ credits = 1000, minutes = 45, mode = 'voice' } = {}) {
    const listener = await createUser();
    await bookings.addSlots(listener, [new Date(START)], { now: BOOKED_AT });
    const client = await createUser();
    await billing.adjustCredits({ adminId: await createUser(), userId: client, delta: credits, reason: 'test setup' });
    const [{ slotId }] = await bookings.openSlots(client, { now: BOOKED_AT });
    const booking = await bookings.book(client, { slotId, minutes, mode }, { now: BOOKED_AT });
    return { listener, client, booking };
  }

  it('connects the person straight to their booked Listener, ringing nobody else', async () => {
    const { listener, client, booking } = await bookedConversation();
    const bystander = await createUser();
    await calls.listenerOnline(bystander);
    await calls.listenerOnline(listener);

    await calls.requestCall(client, { mode: 'voice', bookingId: booking.id });

    expect(last(client, 'call:matched')).toMatchObject({ role: 'caller', mode: 'voice' });
    expect(last(listener, 'call:matched')).toMatchObject({ role: 'listener', mode: 'voice', booked: true });
    expect(received(bystander, 'call:incoming')).toHaveLength(0);
    expect(received(listener, 'call:incoming')).toHaveLength(0);
  });

  it('asks the person to wait when their Listener hasn’t joined yet, keeping the booking', async () => {
    const { client, booking } = await bookedConversation();

    await calls.requestCall(client, { mode: 'voice', bookingId: booking.id });

    expect(last(client, 'error')).toMatchObject({ code: 'LISTENER_NOT_READY' });
    expect((await billing.getBalance(client)).credits).toBe(1000 - 450);
    expect((await bookings.myBookings(client, { now: new Date(START) }))[0].status).toBe('booked');
  });

  it('charges only the time actually used, and marks the booking completed', async () => {
    const { listener, client, booking } = await bookedConversation({ credits: 1000, minutes: 45 });
    await calls.listenerOnline(listener);
    await calls.requestCall(client, { mode: 'voice', bookingId: booking.id });
    const { callId } = last(client, 'call:matched');

    await calls.connected(client, callId);
    await clock.advance(10 * MINUTE);
    await calls.hangup(client, callId);

    expect((await billing.getBalance(client)).credits).toBe(1000 - 100);
    expect((await bookings.myBookings(client, { now: new Date(START) }))[0].status).toBe('completed');
  });

  it('lasts no longer than the booked length', async () => {
    const { listener, client, booking } = await bookedConversation({ credits: 5000, minutes: 30, mode: 'text' });
    await calls.listenerOnline(listener);
    await calls.requestCall(client, { mode: 'text', bookingId: booking.id });

    expect(last(client, 'call:started')).toMatchObject({ maxSeconds: 30 * 60 });
    await clock.advance(30 * MINUTE);
    expect(last(client, 'call:ended')).toMatchObject({ reason: 'time_limit' });
  });

  it('connects even while the Listener is in their quiet time after another call', async () => {
    const { listener, client, booking } = await bookedConversation();
    await calls.listenerOnline(listener);
    const walkIn = await createUser();
    await billing.adjustCredits({ adminId: await createUser(), userId: walkIn, delta: 100, reason: 'test setup' });
    await calls.requestCall(walkIn, { mode: 'text' });
    const { callId: earlier } = last(walkIn, 'call:ringing');
    await calls.accept(listener, earlier);
    await calls.hangup(walkIn, earlier);

    await calls.requestCall(client, { mode: 'voice', bookingId: booking.id });

    expect(last(client, 'call:matched')).toMatchObject({ role: 'caller' });
  });

  it('refuses anyone else’s booking, and bookings outside their time', async () => {
    const { listener, client, booking } = await bookedConversation();
    await calls.listenerOnline(listener);
    const stranger = await createUser();

    await calls.requestCall(stranger, { mode: 'voice', bookingId: booking.id });
    expect(last(stranger, 'error')).toMatchObject({ code: 'NOT_JOINABLE' });

    await clock.advance(50 * MINUTE);
    await calls.requestCall(client, { mode: 'voice', bookingId: booking.id });
    expect(last(client, 'error')).toMatchObject({ code: 'NOT_JOINABLE' });
  });

  it('counts the Listener as present once their console is open near the start time', async () => {
    const { listener, client } = await bookedConversation();
    await calls.listenerOnline(listener);

    await bookings.sweep({ now: new Date(START + 15 * MINUTE), notify: { email: async () => {} } });

    expect((await bookings.myBookings(client, { now: new Date(START) }))[0].status).toBe('client_no_show');
  });
});
