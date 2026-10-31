/**
 * Open Ear pricing: the single source of truth for the web app and the API.
 *
 * The API is authoritative at runtime (it charges and verifies payments), but it reads
 * these same values, so what the site shows is always what the server charges.
 */

export const CURRENCY = 'KES';

export const CREDITS_PER_CALL_MINUTE = 10;
export const CREDITS_PER_CHAT_MESSAGE = 1;

/** Given once to each new account with a verified email. */
export const FREE_TRIAL_CREDITS = 50;

export type CreditPackId = 'starter' | 'standard' | 'value';
export type OfferId = CreditPackId | 'monthly-pass';

export interface CreditPack {
  kind: 'pack';
  id: CreditPackId;
  name: string;
  credits: number;
  /** Whole shillings. */
  price: number;
}

export interface MonthlyPass {
  kind: 'pass';
  id: 'monthly-pass';
  name: string;
  /** Whole shillings. */
  price: number;
  days: number;
  callSeconds: number;
  aiMessagesPerDay: number;
}

export type Offer = CreditPack | MonthlyPass;

/** Pack credits never expire. */
export const CREDIT_PACKS: readonly CreditPack[] = [
  { kind: 'pack', id: 'starter', name: 'Starter', credits: 100, price: 50 },
  { kind: 'pack', id: 'standard', name: 'Standard', credits: 300, price: 135 },
  { kind: 'pack', id: 'value', name: 'Value', credits: 600, price: 245 },
];

/** Bought manually each time (no auto-renew); used before credits; unused time does not carry over. */
export const MONTHLY_PASS: MonthlyPass = {
  kind: 'pass',
  id: 'monthly-pass',
  name: 'Monthly Pass',
  price: 500,
  days: 30,
  callSeconds: 180 * 60,
  aiMessagesPerDay: 100,
};

export function findOffer(id: unknown): Offer | undefined {
  if (id === MONTHLY_PASS.id) return MONTHLY_PASS;
  return CREDIT_PACKS.find((pack) => pack.id === id);
}

/** Credits charged for `seconds` of call time: billed per second, rounded up to a whole credit. */
export function creditsForCall(seconds: number): number {
  return Math.ceil((Math.max(0, seconds) * CREDITS_PER_CALL_MINUTE) / 60);
}

/** How a call of `seconds` is paid: Monthly Pass time first, credits for the rest. */
export function splitCallCharge({ seconds, passSecondsLeft }: { seconds: number; passSecondsLeft: number }): {
  passSeconds: number;
  credits: number;
} {
  const passSeconds = Math.min(Math.max(0, seconds), Math.max(0, passSecondsLeft));
  return { passSeconds, credits: creditsForCall(seconds - passSeconds) };
}

/** Longest single call, protecting listeners from burnout. */
export const MAX_CALL_SECONDS = 60 * 60;

/** How long a call may run on the caller's pass time plus credits, capped at MAX_CALL_SECONDS. */
export function callSecondsAvailable({ credits, passSecondsLeft }: { credits: number; passSecondsLeft: number }): number {
  const fromCredits = Math.floor((Math.max(0, credits) * 60) / CREDITS_PER_CALL_MINUTE);
  return Math.min(MAX_CALL_SECONDS, Math.max(0, passSecondsLeft) + fromCredits);
}

/** Kenya has no daylight saving: Nairobi is always UTC+3. */
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** The calendar day (YYYY-MM-DD, Nairobi time) a chat message counts against for the daily allowance. */
export function chatDay(at: Date): string {
  return new Date(at.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole call minutes a balance of `credits` pays for. */
export function callMinutesFor(credits: number): number {
  return Math.floor(Math.max(0, credits) / CREDITS_PER_CALL_MINUTE);
}

/** "KSh 1,500" for whole shillings, "KSh 4.08" otherwise. */
export function formatPrice(amount: number): string {
  const whole = Number.isInteger(amount);
  const digits = whole ? 0 : 2;
  return `KSh ${amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
