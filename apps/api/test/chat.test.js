import http from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { testDatabaseUrl } from './test-env.js';

/** Stands in for OpenRouter: records what it was sent and answers with `reply` (or fails). */
function startFakeOpenRouter() {
  const fake = { requests: [], reply: 'I hear you.', fail: false };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      fake.requests.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body) });
      if (fake.fail) {
        res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":{"message":"upstream down"}}');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: fake.reply } }] }));
    });
  });
  return { fake, server };
}

// Everything that reads the app config is imported in beforeAll, after the fake provider's
// address is known, so the app talks to it instead of OpenRouter.
describe.skipIf(!testDatabaseUrl())('AI chat', () => {
  let app;
  let provider;
  let baseUrl;
  let billing;
  let signToken;
  let query;
  let createUser;
  let resetData;

  beforeAll(async () => {
    provider = startFakeOpenRouter();
    await new Promise((r) => provider.server.listen(0, r));
    process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${provider.server.address().port}/api/v1`;
    process.env.OPENROUTER_API_KEY = 'sk-or-test';
    process.env.OPENROUTER_MODEL = 'test/model';

    ({ app } = await import('../src/app.js'));
    billing = await import('../src/services/billing.js');
    ({ signToken } = await import('../src/auth.js'));
    ({ query } = await import('../src/db.js'));
    ({ createUser, resetData } = await import('./db.js'));
    app = app.listen(0);
    await new Promise((r) => app.once('listening', r));
    baseUrl = `http://127.0.0.1:${app.address().port}`;
  });
  afterAll(() => {
    app?.close();
    provider?.server.close();
  });
  beforeEach(async () => {
    await resetData();
    provider.fake.requests = [];
    provider.fake.fail = false;
  });

  async function userWithCredits(credits) {
    const id = await createUser();
    if (credits) await billing.adjustCredits({ adminId: await createUser(), userId: id, delta: credits, reason: 'test setup' });
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return { id, token: signToken(rows[0]) };
  }

  const send = (token, body) =>
    fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

  it('answers through OpenRouter with the configured model and charges one credit', async () => {
    const user = await userWithCredits(5);
    const res = await send(user.token, { message: 'Rough day.' });

    expect(res.status).toBe(200);
    expect((await res.json()).response).toBe('I hear you.');
    expect(await billing.getBalance(user.id)).toMatchObject({ credits: 4 });

    const [sent] = provider.fake.requests;
    expect(sent.url).toBe('/api/v1/chat/completions');
    expect(sent.auth).toBe('Bearer sk-or-test');
    expect(sent.body.model).toBe('test/model');
    expect(sent.body.messages.at(-1)).toEqual({ role: 'user', content: 'Rough day.' });
  });

  it('tells the model to point people in danger to the crisis help page', async () => {
    const user = await userWithCredits(5);
    await send(user.token, { message: 'Hi' });

    const system = provider.fake.requests[0].body.messages[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('openearemedy.com/crisis-help');
  });

  it('refunds the credit when OpenRouter fails', async () => {
    const user = await userWithCredits(5);
    provider.fake.fail = true;
    const res = await send(user.token, { message: 'Hello?' });

    expect(res.status).toBe(502);
    expect(await billing.getBalance(user.id)).toMatchObject({ credits: 5 });
  });

  it('refuses without calling OpenRouter when there is nothing left to spend', async () => {
    const user = await userWithCredits(0);
    const res = await send(user.token, { message: 'Hello?' });

    expect(res.status).toBe(402);
    expect(provider.fake.requests).toHaveLength(0);
  });
});
