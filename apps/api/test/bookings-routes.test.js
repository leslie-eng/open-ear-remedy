import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';

describe.skipIf(!hasTestDatabase)('bookings over HTTP', () => {
  let server;
  let baseUrl;
  let query;
  let signToken;
  let billing;

  beforeAll(async () => {
    const { app } = await import('../src/app.js');
    ({ query } = await import('../src/db.js'));
    ({ signToken } = await import('../src/auth.js'));
    billing = await import('../src/services/billing.js');
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => server?.close());
  beforeEach(resetData);

  async function tokenFor(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return signToken(rows[0]);
  }
  const api = async (id, method, path, body) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenFor(id)}` },
      body: body && JSON.stringify(body),
    });

  it('lets a Listener publish a time, a person book it, and both get a calendar file', async () => {
    const listener = await createUser();
    await query(`INSERT INTO listeners (user_id) VALUES ($1)`, [listener]);
    const client = await createUser();
    await billing.adjustCredits({ adminId: await createUser(), userId: client, delta: 500, reason: 'test setup' });
    const startsAt = new Date(Date.now() + 3 * 3600_000);
    startsAt.setUTCSeconds(0, 0);

    expect((await api(client, 'POST', '/api/bookings/listener/slots', { startsAt: [startsAt] })).status).toBe(403);
    expect((await api(listener, 'POST', '/api/bookings/listener/slots', { startsAt: [startsAt] })).status).toBe(201);

    const { slots } = await (await api(client, 'GET', '/api/bookings/slots')).json();
    expect(slots).toHaveLength(1);
    const res = await api(client, 'POST', '/api/bookings', { slotId: slots[0].slotId, minutes: 30, mode: 'voice', timeZone: 'Africa/Nairobi' });
    expect(res.status).toBe(201);
    const { booking } = await res.json();

    const ics = await api(listener, 'GET', `/api/bookings/${booking.id}/calendar.ics`);
    expect(ics.headers.get('content-type')).toContain('text/calendar');
    expect(await ics.text()).toContain('SUMMARY:Open Ear conversation');

    const schedule = await (await api(listener, 'GET', '/api/bookings/listener/schedule')).json();
    expect(schedule.bookings).toHaveLength(1);

    expect((await api(client, 'POST', `/api/bookings/${booking.id}/cancel`)).status).toBe(200);
    expect((await billing.getBalance(client)).credits).toBe(500);
  });

  it('explains why a booking was refused', async () => {
    const client = await createUser();
    const res = await api(client, 'POST', '/api/bookings', { slotId: 'not-a-slot', minutes: 30, mode: 'voice' });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/no longer available/);
  });
});
