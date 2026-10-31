/**
 * Display-only pricing constants for marketing UI (estimator, pricing copy).
 * The server owns real prices and charges; these mirror:
 *   - CREDITS_PER_MINUTE in server/src/routes/calls.js
 *   - COST in server/src/routes/chat.js
 *   - CREDIT_PACKAGES in server/src/services/paystack.js
 * TODO(pricing): keep in sync with the server, or load packages from GET /api/payments/packages.
 */
export const CREDITS_PER_CALL_MINUTE = 10;
export const CREDITS_PER_CHAT_MESSAGE = 5;
export const FREE_TRIAL_CREDITS = 50;
export const CURRENCY = 'USD';

export const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 100, price: 29 },
  { id: 'standard', name: 'Standard', credits: 300, price: 79 },
  { id: 'value', name: 'Value', credits: 1000, price: 199 },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

export function pricePerCredit(pack: CreditPack): number {
  return pack.price / pack.credits;
}

/** Estimated call cost in currency units at a given pack's per-credit rate. */
export function estimateCallCost(minutes: number, pack: CreditPack): number {
  return minutes * CREDITS_PER_CALL_MINUTE * pricePerCredit(pack);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(amount);
}
