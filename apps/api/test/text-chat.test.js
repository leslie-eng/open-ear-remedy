import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';
import { createFakeClock } from './fake-clock.js';
import * as billing from '../src/services/billing.js';
import { query } from '../src/db.js';
import { createCallCoordinator } from '../src/calls/coordinator.js';

describe.skipIf(!hasTestDatabase)('text chat with a Listener', () => {
  let clock;
  let inbox;
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

  async function person(credits = 100) {
    const userId = await createUser();
    if (credits) await billing.adjustCredits({ adminId: await createUser(), userId, delta: credits, reason: 'test setup' });
    return userId;
  }

  async function onlineListener() {
    const id = await createUser();
    await calls.listenerOnline(id);
    return id;
  }

  /** Requests a text chat and has `listener` accept it. */
  async function textChat(credits = 100) {
    const listener = await onlineListener();
    const client = await person(credits);
    await calls.requestCall(client, { mode: 'text' });
    const { callId } = last(client, 'call:ringing');
    await calls.accept(listener, callId);
    return { client, listener, callId };
  }

  it('rings Listeners and tells them it is a text chat', async () => {
    const listener = await onlineListener();
    const client = await person();
    await calls.requestCall(client, { mode: 'text' });

    expect(last(listener, 'call:incoming')).toMatchObject({ mode: 'text', callerName: 'Anonymous' });
  });

  it('starts as soon as the Listener accepts: there is no audio to wait for', async () => {
    const { client, listener, callId } = await textChat();

    expect(last(client, 'call:started')).toMatchObject({ callId });
    expect(last(listener, 'call:started')).toMatchObject({ callId });
  });

  it('passes messages to the other side only, and stores none of them', async () => {
    const { client, listener, callId } = await textChat();
    const bystander = await onlineListener();

    await calls.chatMessage(client, callId, 'I had a hard week');
    await calls.chatMessage(listener, callId, 'I am here. Tell me more.');

    expect(last(listener, 'chat:message')).toMatchObject({ callId, from: 'client', text: 'I had a hard week' });
    expect(last(client, 'chat:message')).toMatchObject({ callId, from: 'listener', text: 'I am here. Tell me more.' });
    expect(received(bystander, 'chat:message')).toHaveLength(0);

    const { rows } = await query(`SELECT row_to_json(c)::text AS r FROM call_history c`);
    expect(rows.some((row) => row.r.includes('hard week'))).toBe(false);
  });

  it('ignores messages from anyone not in the chat, and empty or overlong messages', async () => {
    const { client, listener, callId } = await textChat();
    const stranger = await person();

    await calls.chatMessage(stranger, callId, 'hello?');
    await calls.chatMessage(client, callId, '   ');
    await calls.chatMessage(client, callId, 'x'.repeat(2001));
    expect(received(listener, 'chat:message')).toHaveLength(0);
  });

  it('bills Connected Time per second, like a Call', async () => {
    const { client, callId } = await textChat();
    await clock.advance(90_000);
    await calls.hangup(client, callId);

    expect(last(client, 'call:ended')).toMatchObject({ billedSeconds: 90 });
    expect((await billing.getBalance(client)).credits).toBe(85); // 90 s at 10 credits/min
  });

  it('is one Conversation at a time: no Call while a text chat is live', async () => {
    const { client } = await textChat();
    await onlineListener();
    await calls.requestCall(client, { mode: 'voice' });
    expect(last(client, 'error')).toMatchObject({ code: 'ALREADY_IN_CALL' });
  });

  it('keeps the Listener busy during the chat and gives them a Cooldown afterwards', async () => {
    const { client, listener, callId } = await textChat();
    const other = await person();
    await calls.requestCall(other, { mode: 'text' });
    expect(last(other, 'error')).toMatchObject({ code: 'NO_LISTENERS_AVAILABLE' });

    await calls.hangup(client, callId);
    expect(last(listener, 'listener:status').cooldownUntil).toBeGreaterThan(clock.now());
  });

  it('ends at the time the person can afford', async () => {
    const { client } = await textChat(20); // 20 credits = 2 minutes
    await clock.advance(120_000);
    expect(last(client, 'call:ended')).toMatchObject({ reason: 'time_limit', billedSeconds: 120 });
  });
});
