import { beforeEach, describe, expect, it } from 'vitest';
import { createUser, hasTestDatabase, resetData } from './db.js';
import * as billing from '../src/services/billing.js';

describe.skipIf(!hasTestDatabase)('billing', () => {
  beforeEach(resetData);

  it('starts a new user with no credits and no pass', async () => {
    const userId = await createUser();
    expect(await billing.getBalance(userId)).toEqual({ credits: 0, pass: null, queuedPass: null });
  });

  describe('free trial', () => {
    it('gives a verified account 50 credits', async () => {
      const userId = await createUser({ verified: true });
      await billing.claimTrial(userId);
      expect((await billing.getBalance(userId)).credits).toBe(50);
    });

    it('can only be claimed once', async () => {
      const userId = await createUser({ verified: true });
      await billing.claimTrial(userId);
      await expect(billing.claimTrial(userId)).rejects.toMatchObject({ code: 'TRIAL_ALREADY_CLAIMED' });
      expect((await billing.getBalance(userId)).credits).toBe(50);
    });

    it('is refused until the email address is verified', async () => {
      const userId = await createUser({ verified: false });
      await expect(billing.claimTrial(userId)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
      expect((await billing.getBalance(userId)).credits).toBe(0);
    });
  });

  describe('buying credit packs', () => {
    it('adds the pack credits to the balance', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'value', { reference: 'ps_ref_1' });
      expect((await billing.getBalance(userId)).credits).toBe(600);
    });

    it('credits a payment reference only once', async () => {
      const userId = await createUser();
      const first = await billing.grantPurchase(userId, 'starter', { reference: 'ps_ref_2' });
      const repeat = await billing.grantPurchase(userId, 'starter', { reference: 'ps_ref_2' });
      expect(first.alreadyGranted).toBe(false);
      expect(repeat.alreadyGranted).toBe(true);
      expect((await billing.getBalance(userId)).credits).toBe(100);
    });

    it('rejects offers that do not exist', async () => {
      const userId = await createUser();
      await expect(billing.grantPurchase(userId, 'platinum', { reference: 'ps_ref_3' })).rejects.toMatchObject({
        code: 'UNKNOWN_OFFER',
      });
    });
  });

  describe('buying the Monthly Pass', () => {
    const now = new Date('2026-11-01T09:00:00Z');
    const days = (n) => n * 24 * 60 * 60 * 1000;

    it('starts immediately with 30 days, 180 call minutes and 100 AI messages a day', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_pass_1', now });
      const { pass, queuedPass, credits } = await billing.getBalance(userId, { now });
      expect(pass).toMatchObject({ callSecondsLeft: 10_800, aiMessagesPerDay: 100 });
      expect(pass.expiresAt.getTime() - now.getTime()).toBe(days(30));
      expect(queuedPass).toBeNull();
      expect(credits).toBe(0);
    });

    it('queues a pass bought while one is active, to start when the current one ends', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_pass_2', now });
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_pass_3', now: new Date(now.getTime() + days(28)) });
      const { pass, queuedPass } = await billing.getBalance(userId, { now: new Date(now.getTime() + days(28)) });
      expect(queuedPass.startsAt.getTime()).toBe(pass.expiresAt.getTime());
      expect(queuedPass.expiresAt.getTime() - queuedPass.startsAt.getTime()).toBe(days(30));
    });

    it('allows buying a pass only while at most one is waiting in the queue', async () => {
      const userId = await createUser();
      expect(await billing.canBuyPass(userId, { now })).toBe(true);
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_pass_4', now });
      expect(await billing.canBuyPass(userId, { now })).toBe(true);
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_pass_5', now });
      expect(await billing.canBuyPass(userId, { now })).toBe(false);
    });
  });

  describe('charging for calls', () => {
    const now = new Date('2026-11-01T09:00:00Z');

    it('charges credits per second when there is no pass', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'starter', { reference: 'ps_c1' });
      const charge = await billing.chargeCall(userId, 90, { now });
      expect(charge).toMatchObject({ passSeconds: 0, credits: 15 });
      expect((await billing.getBalance(userId, { now })).credits).toBe(85);
    });

    it('uses Monthly Pass time first, leaving credits untouched', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'starter', { reference: 'ps_c2' });
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_c3', now });
      await billing.chargeCall(userId, 600, { now });
      const balance = await billing.getBalance(userId, { now });
      expect(balance.pass.callSecondsLeft).toBe(10_200);
      expect(balance.credits).toBe(100);
    });

    it('charges credits for the part of a call the pass could not cover', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'starter', { reference: 'ps_c4' });
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_c5', now });
      await billing.chargeCall(userId, 10_770, { now });
      const charge = await billing.chargeCall(userId, 90, { now });
      expect(charge).toMatchObject({ passSeconds: 30, credits: 10 });
      const balance = await billing.getBalance(userId, { now });
      expect(balance.pass.callSecondsLeft).toBe(0);
      expect(balance.credits).toBe(90);
    });

    it('never takes the balance below zero', async () => {
      const userId = await createUser();
      await billing.adjustCredits({ adminId: await createUser(), userId, delta: 5, reason: 'test setup' });
      const charge = await billing.chargeCall(userId, 600, { now });
      expect(charge.credits).toBe(5);
      expect((await billing.getBalance(userId, { now })).credits).toBe(0);
    });
  });

  describe('admin credit adjustments', () => {
    it('requires a written reason', async () => {
      const [adminId, userId] = [await createUser(), await createUser()];
      for (const reason of ['', '   ', undefined]) {
        await expect(billing.adjustCredits({ adminId, userId, delta: 20, reason })).rejects.toMatchObject({
          code: 'REASON_REQUIRED',
        });
      }
      expect((await billing.getBalance(userId)).credits).toBe(0);
    });

    it('records who changed the balance, by how much and why', async () => {
      const [adminId, userId] = [await createUser(), await createUser()];
      await billing.adjustCredits({ adminId, userId, delta: 30, reason: 'Refund: call dropped' });
      await billing.adjustCredits({ adminId, userId, delta: -10, reason: 'Duplicate refund' });
      expect((await billing.getBalance(userId)).credits).toBe(20);
      const log = await billing.listAdjustments(userId);
      expect(log.map(({ delta, reason, adminId: by }) => ({ delta, reason, by }))).toEqual([
        { delta: -10, reason: 'Duplicate refund', by: adminId },
        { delta: 30, reason: 'Refund: call dropped', by: adminId },
      ]);
    });
  });

  describe('charging for AI chat messages', () => {
    const lateEvening = new Date('2026-11-01T20:30:00Z'); // 23:30 in Nairobi
    const nextNairobiDay = new Date('2026-11-01T21:00:00Z'); // 00:00 in Nairobi

    async function userWithPass(reference) {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'starter', { reference: `${reference}_pack` });
      await billing.grantPurchase(userId, 'monthly-pass', { reference, now: new Date('2026-11-01T08:00:00Z') });
      return userId;
    }

    it('costs 1 credit per message without a pass', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'starter', { reference: 'ps_m1' });
      expect(await billing.chargeChatMessage(userId, { now: lateEvening })).toMatchObject({ paidWith: 'credits' });
      expect((await billing.getBalance(userId, { now: lateEvening })).credits).toBe(99);
    });

    it('is refused when there is no pass allowance and no credit left', async () => {
      const userId = await createUser();
      await expect(billing.chargeChatMessage(userId, { now: lateEvening })).rejects.toMatchObject({
        code: 'INSUFFICIENT_BALANCE',
      });
    });

    it('uses the pass allowance of 100 messages a day before any credits', async () => {
      const userId = await userWithPass('ps_m2');
      for (let i = 0; i < 100; i += 1) {
        expect(await billing.chargeChatMessage(userId, { now: lateEvening })).toMatchObject({ paidWith: 'pass' });
      }
      expect((await billing.getBalance(userId, { now: lateEvening })).credits).toBe(100);
      expect(await billing.chargeChatMessage(userId, { now: lateEvening })).toMatchObject({ paidWith: 'credits' });
      expect((await billing.getBalance(userId, { now: lateEvening })).credits).toBe(99);
    });

    it('gives a fresh daily allowance at midnight Nairobi time', async () => {
      const userId = await userWithPass('ps_m3');
      for (let i = 0; i < 100; i += 1) await billing.chargeChatMessage(userId, { now: lateEvening });
      expect(await billing.chargeChatMessage(userId, { now: nextNairobiDay })).toMatchObject({ paidWith: 'pass' });
    });

    it('refunds a message whose AI reply failed to whichever source paid for it', async () => {
      const passUser = await userWithPass('ps_m4');
      const fromPass = await billing.chargeChatMessage(passUser, { now: lateEvening });
      await billing.refundChatMessage(passUser, fromPass);
      for (let i = 0; i < 100; i += 1) {
        expect(await billing.chargeChatMessage(passUser, { now: lateEvening })).toMatchObject({ paidWith: 'pass' });
      }

      const creditUser = await createUser();
      await billing.grantPurchase(creditUser, 'starter', { reference: 'ps_m5' });
      const fromCredits = await billing.chargeChatMessage(creditUser, { now: lateEvening });
      await billing.refundChatMessage(creditUser, fromCredits);
      expect((await billing.getBalance(creditUser, { now: lateEvening })).credits).toBe(100);
    });
  });

  describe('concurrent spending', () => {
    it('never spends more than the balance when many charges arrive at once', async () => {
      const userId = await createUser();
      await billing.adjustCredits({ adminId: await createUser(), userId, delta: 10, reason: 'test setup' });
      const results = await Promise.allSettled(
        Array.from({ length: 20 }, () => billing.chargeChatMessage(userId)),
      );
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(10);
      expect(results.filter((r) => r.status === 'rejected' && r.reason.code === 'INSUFFICIENT_BALANCE')).toHaveLength(10);
      expect((await billing.getBalance(userId)).credits).toBe(0);
    });
  });

  describe('Monthly Pass expiry reminders', () => {
    const bought = new Date('2026-11-01T09:00:00Z');
    const days = (n) => new Date(bought.getTime() + n * 24 * 60 * 60 * 1000);

    it('are due once a pass has 3 days or less left, and only once', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_r1', now: bought });
      expect(await billing.passesDueForReminder({ now: days(26) })).toHaveLength(0);

      const due = await billing.passesDueForReminder({ now: days(27.5) });
      expect(due).toHaveLength(1);
      expect(due[0]).toMatchObject({ userId, email: expect.stringContaining('@') });

      await billing.markReminded(due[0].passId);
      expect(await billing.passesDueForReminder({ now: days(28) })).toHaveLength(0);
    });

    it('are skipped when the user has already bought the next pass', async () => {
      const userId = await createUser();
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_r2', now: bought });
      await billing.grantPurchase(userId, 'monthly-pass', { reference: 'ps_r3', now: days(20) });
      expect(await billing.passesDueForReminder({ now: days(28) })).toHaveLength(0);
    });
  });
});
