import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';
import { createFakeClock } from './fake-clock.js';
import * as billing from '../src/services/billing.js';
import { createCallCoordinator } from '../src/calls/coordinator.js';

describe.skipIf(!hasTestDatabase)('call coordinator', () => {
  let clock;
  let inbox; // userId -> messages received
  let calls;

  beforeEach(async () => {
    await resetData();
    clock = createFakeClock();
    inbox = new Map();
    calls = createCallCoordinator({
      clock,
      send: (userId, message) => inbox.set(userId, [...(inbox.get(userId) ?? []), message]),
    });
  });

  const received = (userId, type) => (inbox.get(userId) ?? []).filter((m) => m.type === type);
  const last = (userId, type) => received(userId, type).at(-1);

  async function callerWithCredits(credits) {
    const userId = await createUser();
    await billing.adjustCredits({ adminId: await createUser(), userId, delta: credits, reason: 'test setup' });
    return userId;
  }

  /** Rings, accepts and returns ids; audio is not yet connected. */
  async function matchedCall(credits = 100) {
    const listener = await onlineListener();
    const caller = await callerWithCredits(credits);
    await calls.requestCall(caller);
    const { callId } = last(caller, 'call:ringing');
    await calls.accept(listener, callId);
    return { caller, listener, callId };
  }

  async function onlineListener() {
    const listenerId = await createUser();
    await calls.listenerOnline(listenerId);
    return listenerId;
  }

  it('rings every free listener with only the caller display name', async () => {
    const [a, b] = [await onlineListener(), await onlineListener()];
    const caller = await callerWithCredits(100);
    await calls.requestCall(caller);

    const { callId } = last(caller, 'call:ringing');
    expect(callId).toBeTruthy();
    for (const listener of [a, b]) {
      expect(last(listener, 'call:incoming')).toEqual({ type: 'call:incoming', callId, callerName: 'Anonymous', mode: 'voice' });
    }
  });

  it('tells the caller honestly when no listener is free', async () => {
    const caller = await callerWithCredits(100);
    await calls.requestCall(caller);
    expect(last(caller, 'error')).toMatchObject({ code: 'NO_LISTENERS_AVAILABLE' });
    expect(received(caller, 'call:ringing')).toHaveLength(0);
  });

  it('refuses a call when the caller has less than a minute of call time', async () => {
    const listener = await onlineListener();
    const caller = await callerWithCredits(9);
    await calls.requestCall(caller);
    expect(last(caller, 'error')).toMatchObject({ code: 'INSUFFICIENT_BALANCE' });
    expect(received(listener, 'call:incoming')).toHaveLength(0);
  });

  it('stops ringing after 60 seconds with no answer and charges nothing', async () => {
    const listener = await onlineListener();
    const caller = await callerWithCredits(100);
    await calls.requestCall(caller);
    const { callId } = last(caller, 'call:ringing');

    await clock.advance(59_000);
    expect(received(caller, 'call:ended')).toHaveLength(0);
    await clock.advance(1_000);

    expect(last(caller, 'call:ended')).toEqual({ type: 'call:ended', callId, reason: 'no_answer', billedSeconds: 0 });
    expect(last(listener, 'call:taken')).toEqual({ type: 'call:taken', callId });
    expect((await billing.getBalance(caller)).credits).toBe(100);
  });

  it('gives the call to the first listener who accepts', async () => {
    const [first, second] = [await onlineListener(), await onlineListener()];
    const caller = await callerWithCredits(100);
    await calls.requestCall(caller);
    const { callId } = last(caller, 'call:ringing');

    await Promise.all([calls.accept(first, callId), calls.accept(second, callId)]);

    expect(last(caller, 'call:matched')).toEqual({ type: 'call:matched', callId, role: 'caller', mode: 'voice' });
    expect(last(first, 'call:matched')).toEqual({ type: 'call:matched', callId, role: 'listener', mode: 'voice', callerName: 'Anonymous', notes: [] });
    expect(received(second, 'call:matched')).toHaveLength(0);
    expect(last(second, 'call:taken')).toEqual({ type: 'call:taken', callId });

    await clock.advance(120_000);
    expect(received(caller, 'call:ended').filter((m) => m.reason === 'no_answer')).toHaveLength(0);
  });

  it('bills from the moment audio connects until hang-up', async () => {
    const { caller, listener, callId } = await matchedCall(100);
    await clock.advance(20_000); // setting up audio is free
    await calls.connected(listener, callId);
    expect(last(caller, 'call:started')).toEqual({ type: 'call:started', callId, maxSeconds: 600 });
    expect(last(listener, 'call:started')).toEqual({ type: 'call:started', callId, maxSeconds: 600 });

    await clock.advance(90_000);
    await calls.hangup(caller, callId);

    const ended = { type: 'call:ended', callId, reason: 'hangup', billedSeconds: 90 };
    expect(last(caller, 'call:ended')).toEqual(ended);
    expect(last(listener, 'call:ended')).toEqual(ended);
    expect((await billing.getBalance(caller)).credits).toBe(85);
  });

  it('warns at 2 minutes left and ends the call when the caller runs out of time', async () => {
    const { caller, listener, callId } = await matchedCall(50); // 5 minutes
    await calls.connected(caller, callId);

    await clock.advance(179_000);
    expect(received(caller, 'call:low-time')).toHaveLength(0);
    await clock.advance(1_000);
    expect(last(caller, 'call:low-time')).toEqual({ type: 'call:low-time', callId, secondsLeft: 120 });

    await clock.advance(120_000);
    const ended = { type: 'call:ended', callId, reason: 'time_limit', billedSeconds: 300 };
    expect(last(caller, 'call:ended')).toEqual(ended);
    expect(last(listener, 'call:ended')).toEqual(ended);
    expect((await billing.getBalance(caller)).credits).toBe(0);
  });

  it('ends a call 30 seconds after a side drops, billing only up to the drop', async () => {
    const { caller, listener, callId } = await matchedCall(100);
    await calls.connected(caller, callId);
    await clock.advance(60_000);

    await calls.disconnected(caller);
    expect(last(listener, 'call:peer-reconnecting')).toEqual({ type: 'call:peer-reconnecting', callId });
    await clock.advance(29_000);
    expect(received(listener, 'call:ended')).toHaveLength(0);
    await clock.advance(1_000);

    expect(last(listener, 'call:ended')).toEqual({ type: 'call:ended', callId, reason: 'dropped', billedSeconds: 60 });
    expect((await billing.getBalance(caller)).credits).toBe(90);
  });

  it('carries on if the dropped side comes back within 30 seconds', async () => {
    const { caller, listener, callId } = await matchedCall(100);
    await calls.connected(caller, callId);
    await clock.advance(60_000);
    await calls.disconnected(listener);
    await clock.advance(10_000);
    await calls.reconnected(listener);
    await clock.advance(60_000);
    expect(received(caller, 'call:ended')).toHaveLength(0);

    await calls.hangup(caller, callId);
    expect(last(caller, 'call:ended')).toMatchObject({ reason: 'hangup', billedSeconds: 130 });
  });

  it('gives a listener 2 minutes of quiet time after each call', async () => {
    const { caller, listener, callId } = await matchedCall(100);
    await calls.connected(caller, callId);
    await clock.advance(30_000);
    await calls.hangup(listener, callId);
    expect(last(listener, 'listener:status')).toEqual({
      type: 'listener:status',
      online: true,
      cooldownUntil: clock.now() + 120_000,
    });

    const next = await callerWithCredits(100);
    await calls.requestCall(next);
    expect(last(next, 'error')).toMatchObject({ code: 'NO_LISTENERS_AVAILABLE' });

    await clock.advance(120_000);
    await calls.requestCall(next);
    expect(last(listener, 'call:incoming')).toMatchObject({ callId: last(next, 'call:ringing').callId });
  });

  it('passes WebRTC signals only between the two people on the call', async () => {
    const { caller, listener, callId } = await matchedCall(100);
    const outsider = await createUser();
    const offer = { kind: 'offer', sdp: 'v=0 test-offer' };

    await calls.signal(caller, callId, offer);
    expect(last(listener, 'signal')).toEqual({ type: 'signal', callId, payload: offer });

    await calls.signal(outsider, callId, { kind: 'answer', sdp: 'v=0 injected' });
    expect(received(caller, 'signal')).toHaveLength(0);
    expect(received(outsider, 'signal')).toHaveLength(0);
  });

  it('lets only the listener on a call report the caller, with a reason', async () => {
    const { caller, listener, callId } = await matchedCall(100);
    await calls.connected(caller, callId);
    await calls.hangup(caller, callId);

    await calls.report(caller, callId, 'caller trying to report the listener');
    await calls.report(listener, callId, '   ');
    expect(last(listener, 'error')).toMatchObject({ code: 'REASON_REQUIRED' });
    await calls.report(listener, callId, 'Abusive language');

    expect((await calls.listReports()).map(({ callId: id, reason, listenerId }) => ({ id, reason, listenerId }))).toEqual([
      { id: callId, reason: 'Abusive language', listenerId: listener },
    ]);
  });

  it('reports listeners as available only when one is online and free', async () => {
    expect(calls.listenersAvailable()).toBe(false);
    const { caller, listener, callId } = await matchedCall(100);
    expect(calls.listenersAvailable()).toBe(false); // the only listener is busy
    await calls.hangup(caller, callId);
    expect(calls.listenersAvailable()).toBe(false); // quiet time
    await clock.advance(120_000);
    expect(calls.listenersAvailable()).toBe(true);
    await calls.listenerOffline(listener);
    expect(calls.listenersAvailable()).toBe(false);
  });

  it('uses Monthly Pass call time before credits', async () => {
    const listener = await onlineListener();
    const caller = await callerWithCredits(100);
    await billing.grantPurchase(caller, 'monthly-pass', { reference: 'call_pass_1', now: new Date(clock.now()) });
    await calls.requestCall(caller);
    const { callId } = last(caller, 'call:ringing');
    await calls.accept(listener, callId);
    expect(last(caller, 'call:matched')).toBeTruthy();
    await calls.connected(caller, callId);
    await clock.advance(600_000);
    await calls.hangup(caller, callId);

    const balance = await billing.getBalance(caller, { now: new Date(clock.now()) });
    expect(balance.credits).toBe(100);
    expect(balance.pass.callSecondsLeft).toBe(10_200);
  });

  it('allows one call at a time per caller, and the caller can cancel while it rings', async () => {
    await onlineListener();
    await onlineListener();
    const caller = await callerWithCredits(100);
    await calls.requestCall(caller);
    const { callId } = last(caller, 'call:ringing');

    await calls.requestCall(caller);
    expect(last(caller, 'error')).toMatchObject({ code: 'ALREADY_IN_CALL' });
    expect(received(caller, 'call:ringing')).toHaveLength(1);

    await calls.hangup(caller, callId);
    expect(last(caller, 'call:ended')).toMatchObject({ reason: 'cancelled', billedSeconds: 0 });
  });
});
