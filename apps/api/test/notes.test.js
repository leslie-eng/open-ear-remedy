import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';
import { createFakeClock } from './fake-clock.js';
import * as billing from '../src/services/billing.js';
import * as notes from '../src/services/notes.js';
import { query } from '../src/db.js';
import { createCallCoordinator } from '../src/calls/coordinator.js';

describe.skipIf(!hasTestDatabase)('Listener notes', () => {
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

  const last = (userId, type) => (inbox.get(userId) ?? []).filter((m) => m.type === type).at(-1);

  async function person() {
    const userId = await createUser();
    await billing.adjustCredits({ adminId: await createUser(), userId, delta: 300, reason: 'test setup' });
    return userId;
  }

  async function listener() {
    const id = await createUser();
    await calls.listenerOnline(id);
    return id;
  }

  /** A finished text chat between `client` and `listenerId`; returns its id. */
  async function conversation(client, listenerId) {
    await clock.advance(10 * 60_000); // past any Cooldown
    await calls.requestCall(client, { mode: 'text' });
    const { callId } = last(client, 'call:ringing');
    await calls.accept(listenerId, callId);
    await calls.hangup(client, callId);
    return callId;
  }

  it('shows the next Listener the earlier notes about this person, and never the person', async () => {
    const client = await person();
    const [first, second] = [await listener(), await listener()];
    const callId = await conversation(client, first);
    await notes.saveNote({ listenerId: first, callId, body: 'Grieving her mother; finds walks help.' });

    await calls.listenerOffline(first);
    await clock.advance(10 * 60_000);
    await calls.requestCall(client, { mode: 'voice' });
    await calls.accept(second, last(client, 'call:ringing').callId);

    expect(last(second, 'call:matched').notes).toEqual([
      expect.objectContaining({ body: 'Grieving her mother; finds walks help.', mode: 'text', byYou: false }),
    ]);
    expect(last(client, 'call:matched').notes).toBeUndefined();
  });

  it('only lets the Listener of that Conversation write its note', async () => {
    const client = await person();
    const [mine, other] = [await listener(), await listener()];
    const callId = await conversation(client, mine);

    await expect(notes.saveNote({ listenerId: other, callId, body: 'Not my call' })).rejects.toMatchObject({ status: 404 });
    await notes.saveNote({ listenerId: mine, callId, body: 'First version' });
    await notes.saveNote({ listenerId: mine, callId, body: 'Edited' });
    expect((await notes.notesAbout(client)).map((n) => n.body)).toEqual(['Edited']);
  });

  it('keeps no notes for someone who turned them off', async () => {
    const client = await person();
    const l = await listener();
    const callId = await conversation(client, l);
    await notes.saveNote({ listenerId: l, callId, body: 'Before opting out' });

    await notes.setOptOut(client, true);
    // Opting out also removes existing notes, and new ones are refused.
    expect(await notes.notesAbout(client)).toEqual([]);
    await expect(notes.saveNote({ listenerId: l, callId, body: 'After' })).rejects.toMatchObject({ status: 403 });
  });

  it('deletes every note about a person when they ask', async () => {
    const client = await person();
    const l = await listener();
    await notes.saveNote({ listenerId: l, callId: await conversation(client, l), body: 'One' });
    await notes.saveNote({ listenerId: l, callId: await conversation(client, l), body: 'Two' });

    await notes.deleteNotesAbout(client);
    expect(await notes.notesAbout(client)).toEqual([]);
  });

  it('forgets notes after 12 months', async () => {
    const client = await person();
    const l = await listener();
    const callId = await conversation(client, l);
    await notes.saveNote({ listenerId: l, callId, body: 'Old note' });
    await query(`UPDATE listener_notes SET created_at = NOW() - INTERVAL '13 months'`);

    expect(await notes.notesAbout(client)).toEqual([]);
    expect(await notes.purgeExpired()).toBe(1);
    expect((await query('SELECT 1 FROM listener_notes')).rowCount).toBe(0);
  });

  it('records that the person has seen the notes notice', async () => {
    const client = await person();
    expect(await notes.settings(client)).toEqual({ optedOut: false, noticeSeen: false });
    await notes.markNoticeSeen(client);
    expect(await notes.settings(client)).toEqual({ optedOut: false, noticeSeen: true });
  });
});
