import crypto from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db.js';
import * as billing from './billing.js';
import { withTransaction } from './credits.js';
import * as daraja from './daraja.js';
import { httpError } from '../util.js';

/**
 * M-Pesa payments: send a PIN prompt, then grant what was bought once Safaricom confirms.
 *
 * Safaricom's callbacks are not signed, so a callback is only ever a hint: every payment is
 * settled from Safaricom's own answer to an STK Query. Settling is idempotent, so a callback and
 * the person's browser asking at the same time grant once.
 */

export { darajaConfigured } from './daraja.js';

/** Kenyan mobile numbers in Daraja's form, 2547XXXXXXXX or 2541XXXXXXXX; null if not one. */
export function normalisePhone(input) {
  const digits = String(input ?? '').replace(/[\s()-]/g, '').replace(/^\+/, '');
  const m = digits.match(/^(?:254|0)?([71]\d{8})$/);
  return m ? `254${m[1]}` : null;
}

/** Part of the callback URL, so stray posts are turned away before anything is looked up. */
export function callbackToken() {
  return crypto.createHmac('sha256', config.jwtSecret).update('daraja-callback').digest('hex').slice(0, 32);
}

function callbackUrl() {
  return `${config.publicApiUrl}/api/payments/mpesa/callback/${callbackToken()}`;
}

/** Records the payment, then sends the prompt. Returns the payment id. */
export async function startPayment({ userId, purpose, offerId = null, ebookOrderId = null, amount, phone, description }) {
  if (!daraja.darajaConfigured()) throw httpError(503, 'M-Pesa payments are not available right now.');
  const msisdn = normalisePhone(phone);
  if (!msisdn) throw httpError(400, 'Enter a Safaricom number like 0712 345 678.');
  const shillings = Math.ceil(amount);

  const { rows } = await query(
    `INSERT INTO mpesa_payments (user_id, purpose, offer_id, ebook_order_id, amount, phone)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, purpose, offerId, ebookOrderId, shillings, msisdn],
  );
  const paymentId = rows[0].id;

  try {
    const { checkoutRequestId, merchantRequestId } = await daraja.stkPush({
      phone: msisdn,
      amount: shillings,
      accountReference: 'OpenEar',
      description,
      callbackUrl: callbackUrl(),
    });
    await query(`UPDATE mpesa_payments SET checkout_request_id = $2, merchant_request_id = $3 WHERE id = $1`, [
      paymentId,
      checkoutRequestId,
      merchantRequestId,
    ]);
  } catch (err) {
    console.error(err);
    await query(`UPDATE mpesa_payments SET status = 'failed', result_desc = 'Prompt could not be sent' WHERE id = $1`, [paymentId]);
    throw httpError(502, 'We could not send the M-Pesa prompt. Check the number and try again.');
  }
  return paymentId;
}

/** Grants what an ebook order bought (inside the caller's transaction). */
async function completeEbookOrder(client, orderId) {
  const { rows } = await client.query(
    `UPDATE ebook_orders SET status = 'completed', completed_at = NOW() WHERE id = $1 AND status <> 'completed' RETURNING user_id`,
    [orderId],
  );
  if (!rows[0]) return;
  await client.query(
    `INSERT INTO user_library (user_id, product_id, order_id)
     SELECT $1, product_id, order_id FROM ebook_order_items WHERE order_id = $2
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [rows[0].user_id, orderId],
  );
}

/** Asks Safaricom about a pending payment and settles it if it has ended. */
async function confirm(payment) {
  if (payment.status !== 'pending' || !payment.checkout_request_id) return;
  const result = await daraja.stkQuery(payment.checkout_request_id);
  if (result.state === 'pending') return;

  if (result.state === 'paid' && payment.purpose === 'offer') {
    // Idempotent by reference, so it is safe to repeat if two confirmations race.
    await billing.grantPurchase(payment.user_id, payment.offer_id, { reference: `mpesa_${payment.id}` });
  }
  await withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM mpesa_payments WHERE id = $1 FOR UPDATE`, [payment.id]);
    if (rows[0]?.status !== 'pending') return;
    if (result.state === 'paid' && payment.purpose === 'ebook_order') await completeEbookOrder(client, payment.ebook_order_id);
    if (result.state === 'failed' && payment.purpose === 'ebook_order') {
      await client.query(`UPDATE ebook_orders SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [payment.ebook_order_id]);
    }
    await client.query(
      `UPDATE mpesa_payments SET status = $2, result_code = $3, result_desc = $4,
         completed_at = CASE WHEN $2 = 'completed' THEN NOW() END
       WHERE id = $1`,
      [payment.id, result.state === 'paid' ? 'completed' : 'failed', result.resultCode, result.resultDesc],
    );
  });
}

function toStatus(row) {
  return {
    id: row.id,
    status: row.status,
    amount: row.amount,
    receipt: row.status === 'completed' ? row.mpesa_receipt : null,
    message: row.status === 'failed' ? failureMessage(row.result_code) : null,
  };
}

function failureMessage(code) {
  return (
    {
      1032: 'You cancelled the M-Pesa prompt.',
      1037: 'The M-Pesa prompt timed out. Please try again.',
      1: 'Your M-Pesa balance was too low.',
      2001: 'The M-Pesa PIN was wrong.',
    }[code] ?? 'The payment did not go through.'
  );
}

/** The person's own payment, confirmed with Safaricom if still pending; null if not theirs. */
export async function getPayment(userId, paymentId) {
  const read = async () =>
    (await query(`SELECT * FROM mpesa_payments WHERE id = $1 AND user_id = $2`, [paymentId, userId])).rows[0];
  const payment = await read();
  if (!payment) return null;
  if (payment.status === 'pending') {
    await confirm(payment).catch((err) => console.error('M-Pesa confirm failed', err));
    return toStatus(await read());
  }
  return toStatus(payment);
}

/** Safaricom's callback: note the receipt number, then confirm with Safaricom before granting. */
export async function handleCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return;
  const receipt = cb.CallbackMetadata?.Item?.find((i) => i?.Name === 'MpesaReceiptNumber')?.Value;
  const { rows } = await query(
    `UPDATE mpesa_payments SET mpesa_receipt = COALESCE(mpesa_receipt, $2)
     WHERE checkout_request_id = $1 RETURNING *`,
    [String(cb.CheckoutRequestID), receipt ? String(receipt).slice(0, 32) : null],
  );
  if (rows[0]) await confirm(rows[0]);
}
