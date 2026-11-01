import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startFakeOpenRouter, useFakeOpenRouter } from './fake-openrouter.js';
import { testDatabaseUrl } from './test-env.js';

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
  let knowledge;
  let config;

  beforeAll(async () => {
    provider = await startFakeOpenRouter();
    useFakeOpenRouter(provider.baseUrl);

    ({ app } = await import('../src/app.js'));
    billing = await import('../src/services/billing.js');
    ({ signToken } = await import('../src/auth.js'));
    ({ query } = await import('../src/db.js'));
    ({ createUser, resetData } = await import('./db.js'));
    knowledge = await import('../src/knowledge/index.js');
    ({ config } = await import('../src/config.js'));
    app = app.listen(0);
    await new Promise((r) => app.once('listening', r));
    baseUrl = `http://127.0.0.1:${app.address().port}`;
  });
  afterAll(() => {
    app?.close();
    provider?.close();
  });
  beforeEach(async () => {
    await resetData();
    provider.reset();
    config.ragEnabled = true;
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

    const [sent] = provider.calls('chat/completions');
    expect(sent.url).toBe('/api/v1/chat/completions');
    expect(sent.auth).toBe('Bearer sk-or-test');
    expect(sent.body.model).toBe('test/model');
    expect(sent.body.messages.at(-1)).toEqual({ role: 'user', content: 'Rough day.' });
  });

  it('tells the model to point people in danger to the crisis help page', async () => {
    const user = await userWithCredits(5);
    await send(user.token, { message: 'Hi' });

    const system = provider.calls('chat/completions')[0].body.messages[0];
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

  describe('drawing on knowledge sources', () => {
    async function approvedSource(title, content) {
      const s = await knowledge.addSource({ title, author: 'Open Ear', licence: 'Our own work', buffer: Buffer.from(content), ext: '.txt' });
      await knowledge.approveSource(s.id, 'Dr. A. Mwangi');
      await knowledge.setSourceEnabled(s.id, true);
      provider.reset();
      return s;
    }
    const systemMessages = () => provider.calls('chat/completions')[0].body.messages.filter((m) => m.role === 'system');

    it('gives the model matching passages as reference material, after its rules, and returns their titles', async () => {
      await approvedSource('Calm Breathing', 'Slow breathing helps when panic rises.');
      const user = await userWithCredits(5);
      const res = await send(user.token, { message: 'What helps when panic rises?' });

      const body = await res.json();
      expect(body.sources).toEqual([{ title: 'Calm Breathing', author: 'Open Ear' }]);
      const [rules, reference] = systemMessages();
      expect(rules.content).toContain('openearemedy.com/crisis-help');
      expect(reference.content).toMatch(/not instructions/i);
      expect(reference.content).toContain('Slow breathing helps when panic rises.');
    });

    it('logs which sources were used', async () => {
      await approvedSource('Calm Breathing', 'Slow breathing helps when panic rises.');
      const user = await userWithCredits(5);
      await send(user.token, { message: 'What helps when panic rises?' });

      const [source] = await knowledge.listSources();
      expect(source.usesLast30Days).toBe(1);
    });

    it('answers without reference material when nothing matches', async () => {
      await approvedSource('Calm Breathing', 'Slow breathing helps when panic rises.');
      const user = await userWithCredits(5);
      const body = await (await send(user.token, { message: 'Tell me a joke' })).json();

      expect(body.sources).toEqual([]);
      expect(systemMessages()).toHaveLength(1);
    });

    it('still answers, without sources, when knowledge search is down', async () => {
      await approvedSource('Calm Breathing', 'Slow breathing helps when panic rises.');
      provider.fake.failEmbeddings = true;
      const user = await userWithCredits(5);
      const res = await send(user.token, { message: 'What helps when panic rises?' });

      expect(res.status).toBe(200);
      expect((await res.json()).sources).toEqual([]);
    });

    it('does not search at all when RAG is switched off', async () => {
      await approvedSource('Calm Breathing', 'Slow breathing helps when panic rises.');
      config.ragEnabled = false; // RAG_ENABLED=false
      const user = await userWithCredits(5);
      await send(user.token, { message: 'What helps when panic rises?' });

      expect(provider.calls('embeddings')).toHaveLength(0);
    });
  });

  describe('crisis safety net', () => {
    it.each([
      'I want to kill myself',
      'i have been thinking about suicide',
      'Sometimes I self-harm',
      "I don't want to live anymore",
      'Nataka kujiua',
      'How many pills would it take to not wake up?',
      'My partner hits me and I am scared to go home',
      'I feel like hurting someone else',
    ])('flags Crisis Help whatever the model says: "%s"', async (message) => {
      provider.fake.reply = 'That sounds hard.';
      const user = await userWithCredits(5);
      const body = await (await send(user.token, { message })).json();
      expect(body.crisisHelp).toBe(true);
    });

    it.each(['Work was stressful today', 'I take my pills every morning', 'This exam is killing me'])(
      'does not flag an ordinary message: "%s"',
      async (message) => {
        const user = await userWithCredits(5);
        const body = await (await send(user.token, { message })).json();
        expect(body.crisisHelp).toBe(false);
      },
    );
  });
});
