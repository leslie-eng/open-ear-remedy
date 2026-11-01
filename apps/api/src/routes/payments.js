import { Router } from 'express';
import { CREDIT_PACKS, CURRENCY, MONTHLY_PASS, findOffer } from '@openear/shared/pricing';
import { asyncHandler, requireAuth } from '../middleware.js';
import * as billing from '../services/billing.js';
import * as mpesa from '../services/mpesa.js';
import { rateLimit } from '../util.js';

const router = Router();

router.get('/offers', (_req, res) => {
  res.json({ currency: CURRENCY, packs: CREDIT_PACKS, pass: MONTHLY_PASS });
});

// Pay for a Credit Pack or the Monthly Pass with M-Pesa: { offerId, phone } → { paymentId }.
router.post(
  '/checkout',
  requireAuth,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    // The client only names the offer; the price always comes from the shared catalogue.
    const offer = findOffer(req.body.offerId);
    if (!offer) return res.status(400).json({ error: 'Unknown offer.' });
    // Refuse before payment: once M-Pesa has taken the money it is too late to say no.
    if (offer.kind === 'pass' && !(await billing.canBuyPass(req.user.id))) {
      return res.status(409).json({ error: 'You already have a Monthly Pass waiting to start.' });
    }
    const paymentId = await mpesa.startPayment({
      userId: req.user.id,
      purpose: 'offer',
      offerId: offer.id,
      amount: offer.price,
      phone: req.body.phone,
      description: offer.name,
    });
    res.json({ paymentId });
  }),
);

// The browser polls this after the prompt is sent; a pending payment is confirmed with Safaricom.
router.get(
  '/:id',
  requireAuth,
  rateLimit({ windowMs: 60 * 1000, max: 40, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    const payment = /^[0-9a-f-]{36}$/i.test(req.params.id) ? await mpesa.getPayment(req.user.id, req.params.id) : null;
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  }),
);

// Safaricom posts here when a prompt ends. Always answer "accepted": Safaricom only needs to
// know we received it, and nothing is granted without confirming with Safaricom first.
router.post(
  '/mpesa/callback/:token',
  asyncHandler(async (req, res) => {
    if (req.params.token !== mpesa.callbackToken()) return res.status(404).json({ error: 'Not found' });
    await mpesa.handleCallback(req.body).catch((err) => console.error('M-Pesa callback failed', err));
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }),
);

export default router;
