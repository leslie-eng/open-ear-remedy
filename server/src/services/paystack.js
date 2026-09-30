import crypto from 'node:crypto';
import { config } from '../config.js';
import { httpError } from '../util.js';

/** Credit packages. Prices live only on the server; clients pick by id. */
export const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 100, price: 29 },
  { id: 'standard', name: 'Standard', credits: 300, price: 79 },
  { id: 'value', name: 'Value', credits: 1000, price: 199 },
];

export function findPackage(idOrCredits) {
  return (
    CREDIT_PACKAGES.find((p) => p.id === idOrCredits) ||
    CREDIT_PACKAGES.find((p) => p.credits === Number(idOrCredits)) ||
    null
  );
}

export function toMinor(major) {
  const minor = Math.round(Number(major) * 100);
  if (!Number.isFinite(minor) || minor < 0) throw new Error('Invalid price amount');
  return minor;
}

export function newReference(prefix, userId) {
  return `${prefix}_${userId.slice(0, 8)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export function paystackConfigured() {
  return Boolean(config.paystackSecretKey?.startsWith('sk_'));
}

/** Starts a Paystack transaction; returns the hosted checkout URL. */
export async function initializeTransaction({ email, amountMinor, reference, callbackUrl, metadata }) {
  if (!paystackConfigured()) throw httpError(503, 'Payment service is not configured.');
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paystackSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amountMinor,
      currency: config.paystackCurrency,
      reference,
      callback_url: callbackUrl,
      metadata,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status || !json.data?.authorization_url) {
    console.error('Paystack initialize failed:', json);
    throw httpError(502, json.message || 'Failed to start checkout.');
  }
  return { url: json.data.authorization_url, reference: json.data.reference ?? reference };
}

function hmacSha512Hex(secret, message) {
  return crypto.createHmac('sha512', secret).update(message).digest('hex');
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * Paystack signs the raw body. The re-serialized form is also accepted in case a proxy
 * reformats the JSON; both still require the secret.
 */
export function verifyWebhookSignature(rawBody, parsedBody, signatureHeader) {
  const signature = String(signatureHeader || '').trim().toLowerCase();
  if (!signature) return false;
  const secrets = [config.paystackWebhookSecret, config.paystackSecretKey].filter(
    (s) => s && s.length >= 8,
  );
  const canonical = JSON.stringify(parsedBody ?? {});
  return secrets.some(
    (secret) =>
      timingSafeEqualHex(hmacSha512Hex(secret, rawBody), signature) ||
      timingSafeEqualHex(hmacSha512Hex(secret, canonical), signature),
  );
}
