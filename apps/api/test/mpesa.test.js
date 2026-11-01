import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startFakeDaraja, stkCallback } from './fake-daraja.js';
import { testDatabaseUrl } from './test-env.js';

describe.skipIf(!testDatabaseUrl())('M-Pesa payments (Daraja)', () => {
  let daraja;
  let server;
  let baseUrl;
  let billing;
  let query;
  let signToken;
  let createUser;
  let resetData;

  beforeAll(async () => {
    daraja = await startFakeDaraja();
    process.env.DARAJA_BASE_URL = daraja.baseUrl;
    process.env.DARAJA_CONSUMER_KEY = 'test-key';
    process.env.DARAJA_CONSUMER_SECRET = 'test-secret';
    process.env.DARAJA_SHORT_CODE = '174379';
    process.env.DARAJA_PASSKEY = 'test-passkey';
    process.env.PUBLIC_API_URL = 'https://api.example.test';

    const { app } = await import('../src/app.js');
    billing = await import('../src/services/billing.js');
    ({ query } = await import('../src/db.js'));
    ({ signToken } = await import('../src/auth.js'));
    ({ createUser, resetData } = await import('./db.js'));
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => {
    server?.close();
    daraja?.close();
  });
  beforeEach(async () => {
    await resetData();
    daraja.reset();
  });

  async function person() {
    const id = await createUser();
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return { id, token: signToken(rows[0]) };
  }

  const api = (token, path, body) =>
    fetch(`${baseUrl}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body && JSON.stringify(body),
    });

  /** Starts paying for an offer; returns the payment id and Safaricom's CheckoutRequestID. */
  async function pay(user, offerId = 'starter', phone = '0712 345 678') {
    const res = await api(user.token, '/api/payments/checkout', { offerId, phone });
    const body = await res.json();
    return { res, paymentId: body.paymentId, checkoutRequestId: `ws_CO_${daraja.state.pushes}` };
  }

  /** Where our API told Safaricom to post the result (taken from the STK Push request). */
  const callbackUrl = () => new URL(daraja.calls('/mpesa/stkpush')[0].body.CallBackURL);

  const postCallback = (body, url = callbackUrl()) =>
    fetch(`${baseUrl}${url.pathname}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  it("sends an M-Pesa prompt to the person's phone for the offer's price", async () => {
    const user = await person();
    const { res } = await pay(user, 'standard', '0712 345 678');

    expect(res.status).toBe(200);
    const push = daraja.calls('/mpesa/stkpush')[0].body;
    expect(push).toMatchObject({ BusinessShortCode: '174379', Amount: 135, PartyA: '254712345678', PhoneNumber: '254712345678' });
    expect(push.CallBackURL).toMatch(/^https:\/\/api\.example\.test\/api\/payments\/mpesa\/callback\//);
    expect(Buffer.from(push.Password, 'base64').toString()).toBe(`174379test-passkey${push.Timestamp}`);
  });

  it.each(['12345', '0812345678', '+44 7700 900123', ''])('refuses the phone number "%s" without prompting', async (phone) => {
    const user = await person();
    const { res } = await pay(user, 'starter', phone);
    expect(res.status).toBe(400);
    expect(daraja.calls('/mpesa/stkpush')).toHaveLength(0);
  });

  it('grants the Credits once Safaricom confirms the payment', async () => {
    const user = await person();
    const { paymentId, checkoutRequestId } = await pay(user, 'starter');
    expect((await (await api(user.token, `/api/payments/${paymentId}`)).json()).status).toBe('pending');

    daraja.settle(checkoutRequestId, '0');
    expect((await (await api(user.token, `/api/payments/${paymentId}`)).json()).status).toBe('completed');
    expect((await billing.getBalance(user.id)).credits).toBe(100);
  });

  it('keeps waiting while Safaricom says the payment is still being processed (code 4999)', async () => {
    const user = await person();
    const { paymentId, checkoutRequestId } = await pay(user, 'starter');
    daraja.settle(checkoutRequestId, '4999');
    expect((await (await api(user.token, `/api/payments/${paymentId}`)).json()).status).toBe('pending');

    daraja.settle(checkoutRequestId, '0');
    expect((await (await api(user.token, `/api/payments/${paymentId}`)).json()).status).toBe('completed');
  });

  it('records the receipt from the callback, but only grants after asking Safaricom', async () => {
    const user = await person();
    const { paymentId, checkoutRequestId } = await pay(user, 'starter');

    // A callback claiming success while Safaricom still says "processing" grants nothing.
    await postCallback(stkCallback(checkoutRequestId, 0, { receipt: 'SBX1234567' }));
    expect((await billing.getBalance(user.id)).credits).toBe(0);

    daraja.settle(checkoutRequestId, '0');
    await postCallback(stkCallback(checkoutRequestId, 0, { receipt: 'SBX1234567' }));
    expect((await billing.getBalance(user.id)).credits).toBe(100);
    expect(await (await api(user.token, `/api/payments/${paymentId}`)).json()).toMatchObject({ status: 'completed', receipt: 'SBX1234567' });
  });

  it('ignores a forged success callback for a payment Safaricom says was cancelled', async () => {
    const user = await person();
    const { paymentId, checkoutRequestId } = await pay(user, 'value');
    daraja.settle(checkoutRequestId, '1032');

    await postCallback(stkCallback(checkoutRequestId, 0));
    expect((await billing.getBalance(user.id)).credits).toBe(0);
    expect((await (await api(user.token, `/api/payments/${paymentId}`)).json()).status).toBe('failed');
  });

  it('rejects callbacks to the wrong address and ignores unknown payments', async () => {
    const user = await person();
    const { checkoutRequestId } = await pay(user, 'starter');
    daraja.settle(checkoutRequestId, '0');

    const wrong = new URL(callbackUrl());
    wrong.pathname = wrong.pathname.replace(/[^/]+$/, 'not-the-token');
    expect((await postCallback(stkCallback(checkoutRequestId, 0), wrong)).status).toBe(404);
    expect((await postCallback(stkCallback('ws_CO_unknown', 0))).status).toBe(200);
    expect((await billing.getBalance(user.id)).credits).toBe(0);
  });

  it('grants a payment only once however often it is confirmed', async () => {
    const user = await person();
    const { paymentId, checkoutRequestId } = await pay(user, 'starter');
    daraja.settle(checkoutRequestId, '0');

    await Promise.all([
      postCallback(stkCallback(checkoutRequestId, 0)),
      postCallback(stkCallback(checkoutRequestId, 0)),
      api(user.token, `/api/payments/${paymentId}`),
      api(user.token, `/api/payments/${paymentId}`),
    ]);
    expect((await billing.getBalance(user.id)).credits).toBe(100);
  });

  it("does not show one person's payment to another", async () => {
    const owner = await person();
    const other = await person();
    const { paymentId } = await pay(owner, 'starter');
    expect((await api(other.token, `/api/payments/${paymentId}`)).status).toBe(404);
  });

  it('refuses a second queued Monthly Pass before prompting', async () => {
    const user = await person();
    await billing.grantPurchase(user.id, 'monthly-pass', { reference: 'p1' });
    await billing.grantPurchase(user.id, 'monthly-pass', { reference: 'p2' });

    const { res } = await pay(user, 'monthly-pass');
    expect(res.status).toBe(409);
    expect(daraja.calls('/mpesa/stkpush')).toHaveLength(0);
  });

  it('completes an ebook order and adds the books to the library once paid', async () => {
    const user = await person();
    const { rows } = await query(
      `INSERT INTO products (title, description, short_description, category, price, currency, file_url)
       VALUES ('Calm', 'd', 's', 'self-help', 249.50, 'KES', 'ebooks/calm.pdf') RETURNING id`,
    );
    const res = await api(user.token, '/api/ebooks/checkout', { ebookIds: [rows[0].id], phone: '0712345678' });
    const { paymentId, reference } = await res.json();

    // M-Pesa takes whole shillings, so KSh 249.50 is charged as KSh 250.
    expect(daraja.calls('/mpesa/stkpush')[0].body.Amount).toBe(250);
    daraja.settle(`ws_CO_${daraja.state.pushes}`, '0');
    expect((await (await api(user.token, `/api/payments/${paymentId}`)).json()).status).toBe('completed');

    const order = await (await api(user.token, `/api/ebooks/orders/${reference}`)).json();
    expect(order.order.status).toBe('completed');
    const library = await query('SELECT 1 FROM user_library WHERE user_id = $1', [user.id]);
    expect(library.rowCount).toBe(1);
  });
});
