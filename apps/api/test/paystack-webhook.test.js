import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';

describe.skipIf(!hasTestDatabase)('Paystack webhook', () => {
  let server;
  let baseUrl;
  let billing;

  beforeAll(async () => {
    const { app } = await import('../src/app.js');
    billing = await import('../src/services/billing.js');
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => server?.close());
  beforeEach(resetData);

  function deliver(event, { secret = process.env.PAYSTACK_WEBHOOK_SECRET } = {}) {
    const body = JSON.stringify(event);
    return fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': crypto.createHmac('sha512', secret).update(body).digest('hex'),
      },
      body,
    });
  }

  const paid = (userId, offerId, { reference, amount, currency = 'KES' }) => ({
    event: 'charge.success',
    data: { reference, amount, currency, metadata: { kind: 'offer', offer_id: offerId, user_id: userId } },
  });

  it('starts a Monthly Pass when KSh 500 is paid', async () => {
    const userId = await createUser();
    const res = await deliver(paid(userId, 'monthly-pass', { reference: 'wh_1', amount: 50_000 }));
    expect(res.status).toBe(200);
    expect((await billing.getBalance(userId)).pass).toMatchObject({ callSecondsLeft: 10_800 });
  });

  it('adds pack credits when the pack price is paid', async () => {
    const userId = await createUser();
    await deliver(paid(userId, 'standard', { reference: 'wh_2', amount: 13_500 }));
    expect((await billing.getBalance(userId)).credits).toBe(300);
  });

  it('rejects a payload signed with the wrong secret and grants nothing', async () => {
    const userId = await createUser();
    const res = await deliver(paid(userId, 'value', { reference: 'wh_3', amount: 24_500 }), { secret: 'not-the-secret' });
    expect(res.status).toBe(400);
    expect((await billing.getBalance(userId)).credits).toBe(0);
  });

  it('grants nothing when less than the price was paid', async () => {
    const userId = await createUser();
    const res = await deliver(paid(userId, 'value', { reference: 'wh_4', amount: 5_000 }));
    expect(res.status).toBe(200);
    expect((await billing.getBalance(userId)).credits).toBe(0);
  });

  it('grants nothing when paid in another currency', async () => {
    const userId = await createUser();
    await deliver(paid(userId, 'value', { reference: 'wh_5', amount: 24_500, currency: 'USD' }));
    expect((await billing.getBalance(userId)).credits).toBe(0);
  });

  it('grants a payment once even if Paystack delivers it twice', async () => {
    const userId = await createUser();
    const event = paid(userId, 'starter', { reference: 'wh_6', amount: 5_000 });
    await deliver(event);
    const repeat = await deliver(event);
    expect(repeat.status).toBe(200);
    expect((await billing.getBalance(userId)).credits).toBe(100);
  });
});
