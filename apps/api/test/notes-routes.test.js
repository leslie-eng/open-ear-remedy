import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';

describe.skipIf(!hasTestDatabase)('notes over HTTP', () => {
  let server;
  let baseUrl;
  let query;
  let signToken;

  beforeAll(async () => {
    const { app } = await import('../src/app.js');
    ({ query } = await import('../src/db.js'));
    ({ signToken } = await import('../src/auth.js'));
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

  /** A finished conversation between a new person and a new active Listener. */
  async function conversation() {
    const [client, listener] = [await createUser(), await createUser()];
    await query(`INSERT INTO listeners (user_id) VALUES ($1)`, [listener]);
    const { rows } = await query(
      `INSERT INTO call_history (user_id, listener_user_id, status, mode) VALUES ($1, $2, 'completed', 'text') RETURNING id`,
      [client, listener],
    );
    return { client, listener, callId: rows[0].id };
  }

  it('lets the Listener save a note, but not the person or anyone else', async () => {
    const { client, listener, callId } = await conversation();
    expect((await api(client, 'POST', '/api/notes', { callId, body: 'x' })).status).toBe(403);
    expect((await api(listener, 'POST', '/api/notes', { callId, body: 'Doing better this week.' })).status).toBe(204);
    expect((await query('SELECT body FROM listener_notes')).rows).toEqual([{ body: 'Doing better this week.' }]);
  });

  it('lets a person turn notes off and delete notes about them, without ever seeing them', async () => {
    const { client, listener, callId } = await conversation();
    await api(listener, 'POST', '/api/notes', { callId, body: 'Private' });

    const settings = await (await api(client, 'PUT', '/api/notes/settings', { noticeSeen: true })).json();
    expect(settings).toEqual({ optedOut: false, noticeSeen: true });
    expect(JSON.stringify(settings)).not.toContain('Private');

    expect((await api(client, 'DELETE', '/api/notes')).status).toBe(204);
    expect((await query('SELECT 1 FROM listener_notes')).rowCount).toBe(0);
  });
});
