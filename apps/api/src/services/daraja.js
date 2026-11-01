import { config } from '../config.js';

/**
 * Safaricom Daraja: M-Pesa Express (STK Push) and its status query. A thin adapter: it speaks
 * Daraja's API and nothing else; deciding what a payment grants lives in services/mpesa.js.
 */

const d = () => config.daraja;
const STILL_PROCESSING = new Set(['4999']);
let cachedToken = null;

export function darajaConfigured() {
  const { consumerKey, consumerSecret, shortCode, passkey } = d();
  return Boolean(consumerKey && consumerSecret && shortCode && passkey);
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const basic = Buffer.from(`${d().consumerKey}:${d().consumerSecret}`).toString('base64');
  const res = await fetch(`${d().baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Daraja auth failed (${res.status}): ${await res.text()}`);
  const { access_token: value, expires_in: expiresIn } = await res.json();
  // Refresh a minute early.
  cachedToken = { value, expiresAt: Date.now() + (Number(expiresIn) - 60) * 1000 };
  return value;
}

/** yyyyMMddHHmmss in Nairobi time, as Daraja expects. */
function timestamp(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

function credentials() {
  const ts = timestamp();
  return { BusinessShortCode: d().shortCode, Password: Buffer.from(`${d().shortCode}${d().passkey}${ts}`).toString('base64'), Timestamp: ts };
}

async function post(path, body) {
  const res = await fetch(`${d().baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Sends the PIN prompt. Returns Safaricom's request IDs. */
export async function stkPush({ phone, amount, accountReference, description, callbackUrl }) {
  const buyGoods = d().transactionType === 'CustomerBuyGoodsOnline';
  const { ok, status, data } = await post('/mpesa/stkpush/v1/processrequest', {
    ...credentials(),
    TransactionType: d().transactionType,
    Amount: amount,
    PartyA: phone,
    PartyB: buyGoods && d().tillNumber ? d().tillNumber : d().shortCode,
    PhoneNumber: phone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: description.slice(0, 13),
  });
  if (!ok || String(data.ResponseCode) !== '0') {
    throw new Error(`Daraja STK push failed (${status}): ${data.errorMessage || data.ResponseDescription || 'unknown error'}`);
  }
  return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID };
}

/**
 * Asks Safaricom how a prompt ended: { state: 'pending' } while the person has not answered yet,
 * otherwise { state: 'paid' | 'failed', resultCode, resultDesc }.
 */
export async function stkQuery(checkoutRequestId) {
  const { ok, data } = await post('/mpesa/stkpushquery/v1/query', { ...credentials(), CheckoutRequestID: checkoutRequestId });
  if (!ok || data.ResultCode === undefined) return { state: 'pending' };
  const resultCode = String(data.ResultCode);
  // 4999: "The transaction is still under processing": the person has not answered yet.
  if (STILL_PROCESSING.has(resultCode)) return { state: 'pending' };
  return { state: resultCode === '0' ? 'paid' : 'failed', resultCode, resultDesc: data.ResultDesc ?? null };
}
