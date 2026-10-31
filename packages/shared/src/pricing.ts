/**
 * Open Ear pricing: the single source of truth for the web app and the API.
 *
 * The API is authoritative at runtime (it charges and verifies payments), but it reads
 * these same values, so what the site shows is always what the server charges.
 */

export const CURRENCY = 'USD';

export const CREDITS_PER_CALL_MINUTE = 10;
export const CREDITS_PER_CHAT_MESSAGE = 5;

/** Given once to each new account. */
export const FREE_TRIAL_CREDITS = 50;

export type CreditPackId = 'starter' | 'standard' | 'value';

export interface CreditPack {
  id: CreditPackId;
  name: string;
  credits: number;
  /** In major currency units (e.g. dollars), see CURRENCY. */
  price: number;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: 'starter', name: 'Starter', credits: 100, price: 29 },
  { id: 'standard', name: 'Standard', credits: 300, price: 79 },
  { id: 'value', name: 'Value', credits: 1000, price: 199 },
];

/** Looks a pack up by id, or by credit amount for older clients. */
export function findCreditPack(idOrCredits: string | number): CreditPack | undefined {
  return (
    CREDIT_PACKS.find((pack) => pack.id === idOrCredits) ??
    CREDIT_PACKS.find((pack) => pack.credits === Number(idOrCredits))
  );
}

/** Credits charged for a call of `seconds`. Every started minute is billed in full. */
export function creditsForCall(seconds: number): number {
  return Math.ceil(Math.max(0, seconds) / 60) * CREDITS_PER_CALL_MINUTE;
}

/** Whole call minutes a balance of `credits` pays for. */
export function callMinutesFor(credits: number): number {
  return Math.floor(Math.max(0, credits) / CREDITS_PER_CALL_MINUTE);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(amount);
}
