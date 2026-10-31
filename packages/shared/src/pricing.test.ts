import { describe, expect, it } from 'vitest';
import { callSecondsAvailable, chatDay, creditsForCall, findOffer, formatPrice, splitCallCharge } from './pricing.js';

describe('call billing', () => {
  it('bills per second at 10 credits a minute, rounding up to whole credits', () => {
    expect(creditsForCall(0)).toBe(0);
    expect(creditsForCall(1)).toBe(1);
    expect(creditsForCall(6)).toBe(1);
    expect(creditsForCall(7)).toBe(2);
    expect(creditsForCall(60)).toBe(10);
    expect(creditsForCall(61)).toBe(11);
    expect(creditsForCall(30 * 60)).toBe(300);
  });
});

describe('splitting a call between the Monthly Pass and credits', () => {
  it('charges credits only when there is no pass time', () => {
    expect(splitCallCharge({ seconds: 90, passSecondsLeft: 0 })).toEqual({ passSeconds: 0, credits: 15 });
  });

  it('uses pass time first and charges nothing when it covers the call', () => {
    expect(splitCallCharge({ seconds: 90, passSecondsLeft: 600 })).toEqual({ passSeconds: 90, credits: 0 });
  });

  it('charges credits only for the part of the call the pass did not cover', () => {
    expect(splitCallCharge({ seconds: 90, passSecondsLeft: 30 })).toEqual({ passSeconds: 30, credits: 10 });
  });
});

describe('how long a call can last', () => {
  it('is zero with no credits and no pass time', () => {
    expect(callSecondsAvailable({ credits: 0, passSecondsLeft: 0 })).toBe(0);
  });

  it('gives 6 seconds per credit', () => {
    expect(callSecondsAvailable({ credits: 5, passSecondsLeft: 0 })).toBe(30);
    expect(callSecondsAvailable({ credits: 100, passSecondsLeft: 0 })).toBe(600);
  });

  it('adds pass time to the time credits pay for', () => {
    expect(callSecondsAvailable({ credits: 10, passSecondsLeft: 120 })).toBe(180);
  });

  it('never exceeds the 60-minute call cap', () => {
    expect(callSecondsAvailable({ credits: 600, passSecondsLeft: 10_800 })).toBe(3600);
  });
});

describe('what can be bought', () => {
  it('sells three credit packs priced in shillings', () => {
    expect(findOffer('starter')).toMatchObject({ kind: 'pack', credits: 100, price: 50 });
    expect(findOffer('standard')).toMatchObject({ kind: 'pack', credits: 300, price: 135 });
    expect(findOffer('value')).toMatchObject({ kind: 'pack', credits: 600, price: 245 });
  });

  it('sells a 30-day Monthly Pass with 180 call minutes and 100 AI messages a day', () => {
    expect(findOffer('monthly-pass')).toMatchObject({
      kind: 'pass',
      price: 500,
      days: 30,
      callSeconds: 180 * 60,
      aiMessagesPerDay: 100,
    });
  });

  it('does not recognise unknown offers', () => {
    expect(findOffer('platinum')).toBeUndefined();
    expect(findOffer(100)).toBeUndefined();
  });
});

describe('showing prices', () => {
  it('shows whole shillings without decimals', () => {
    expect(formatPrice(50)).toBe('KSh 50');
    expect(formatPrice(1500)).toBe('KSh 1,500');
  });

  it('shows fractional amounts, like per-minute rates, to two decimals', () => {
    expect(formatPrice(245 / 60)).toBe('KSh 4.08');
  });
});

describe('the Monthly Pass daily AI message allowance', () => {
  it('resets at midnight Nairobi time (UTC+3), not UTC midnight', () => {
    expect(chatDay(new Date('2026-10-31T20:59:59Z'))).toBe('2026-10-31');
    expect(chatDay(new Date('2026-10-31T21:00:00Z'))).toBe('2026-11-01');
    expect(chatDay(new Date('2026-12-31T22:30:00Z'))).toBe('2027-01-01');
  });
});
