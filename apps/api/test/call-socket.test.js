import http from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createUser, hasTestDatabase, resetData } from './db.js';

describe.skipIf(!hasTestDatabase)('call signaling over WebSocket', () => {
  let server;
  let base;
  let signToken;
  let query;
  let billing;
  const open = [];

  beforeAll(async () => {
    const { app } = await import('../src/app.js');
    const { attachCallSocket } = await import('../src/calls/service.js');
    ({ signToken } = await import('../src/auth.js'));
    ({ query } = await import('../src/db.js'));
    billing = await import('../src/services/billing.js');
    server = http.createServer(app);
    attachCallSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    base = `127.0.0.1:${server.address().port}`;
  });
  afterAll(() => {
    for (const ws of open) ws.terminate();
    server?.close();
  });
  beforeEach(resetData);

  async function user({ listener = false, credits = 0 } = {}) {
    const id = await createUser();
    const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (listener) await query(`INSERT INTO listeners (user_id) VALUES ($1)`, [id]);
    if (credits) await billing.adjustCredits({ adminId: await createUser(), userId: id, delta: credits, reason: 'test setup' });
    return { id, token: signToken(rows[0]) };
  }

  /** A connected client that records every message and can wait for the next of a type. */
  function client() {
    const ws = new WebSocket(`ws://${base}/ws`);
    open.push(ws);
    const messages = [];
    const waiters = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      messages.push(msg);
      for (const w of [...waiters]) {
        if (w.type === msg.type) {
          waiters.splice(waiters.indexOf(w), 1);
          w.resolve(msg);
        }
      }
    });
    const closed = new Promise((resolve) => ws.on('close', (code) => resolve(code)));
    return {
      ws,
      closed,
      ready: new Promise((resolve) => ws.on('open', resolve)),
      send: (msg) => ws.send(JSON.stringify(msg)),
      next(type) {
        const seen = messages.find((m) => m.type === type && !m.__taken);
        if (seen) {
          seen.__taken = true;
          return Promise.resolve(seen);
        }
        return new Promise((resolve) => waiters.push({ type, resolve }));
      },
    };
  }

  async function signedIn(account) {
    const c = client();
    await c.ready;
    c.send({ type: 'auth', token: account.token });
    await c.next('ready');
    return c;
  }

  it('closes connections that do not sign in', async () => {
    const c = client();
    await c.ready;
    c.send({ type: 'call:request' });
    expect(await c.closed).toBe(4001);
  });

  it('does not let a non-listener go online', async () => {
    const c = await signedIn(await user());
    c.send({ type: 'listener:online' });
    expect(await c.next('error')).toMatchObject({ code: 'NOT_A_LISTENER' });
  });

  it('connects a caller and a listener, relays their signals and ends the call for both', async () => {
    const listener = await signedIn(await user({ listener: true }));
    listener.send({ type: 'listener:online' });
    await listener.next('listener:status');

    const res = await fetch(`http://${base}/api/public/availability`);
    expect(await res.json()).toEqual({ listenersAvailable: true });

    const caller = await signedIn(await user({ credits: 100 }));
    caller.send({ type: 'call:request' });
    const { callId } = await caller.next('call:ringing');
    expect(await listener.next('call:incoming')).toMatchObject({ callId, callerName: 'Anonymous' });

    listener.send({ type: 'call:accept', callId });
    await caller.next('call:matched');
    await listener.next('call:matched');

    caller.send({ type: 'signal', callId, payload: { kind: 'offer', sdp: 'v=0 offer' } });
    expect(await listener.next('signal')).toMatchObject({ payload: { kind: 'offer', sdp: 'v=0 offer' } });

    listener.send({ type: 'call:connected', callId });
    await caller.next('call:started');
    caller.send({ type: 'call:hangup', callId });
    expect(await caller.next('call:ended')).toMatchObject({ callId, reason: 'hangup' });
    expect(await listener.next('call:ended')).toMatchObject({ callId, reason: 'hangup' });
  });

  it('lets an admin deactivate a listener who is not connected', async () => {
    const listener = await user({ listener: true });
    const admin = await user();
    await query(`INSERT INTO admin_users (user_id, role) VALUES ($1, 'admin')`, [admin.id]);
    const res = await fetch(`http://${base}/api/admin/listeners/${listener.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ active: false }),
    });
    expect(res.status).toBe(200);
  });
});
