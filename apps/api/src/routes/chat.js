import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import * as knowledge from '../knowledge/index.js';
import * as billing from '../services/billing.js';
import { MAX_MESSAGE_CHARS, companionReply, toHistory } from '../services/companion.js';
import { rateLimit } from '../util.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60 * 1000, max: 15, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    if (!config.openRouterApiKey) {
      return res.status(503).json({ error: 'Chat service is not configured' });
    }

    const { message, conversationHistory } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_CHARS} characters)` });
    }

    // Charge first (atomically) so concurrent requests can't overspend; refund if the AI call fails.
    // Throws a 402 BillingError when there is no pass allowance or credit left.
    const receipt = await billing.chargeChatMessage(req.user.id);

    const { response, sources, sourceIds, crisisHelp } = await companionReply(message, toHistory(conversationHistory));

    if (!response) {
      await billing.refundChatMessage(req.user.id, receipt);
      return res.status(502).json({ error: 'Failed to get AI response', balance: await billing.getBalance(req.user.id) });
    }

    await knowledge.recordUsage(sourceIds).catch((err) => console.error(err));

    res.json({ response, sources, crisisHelp, balance: await billing.getBalance(req.user.id) });
  }),
);

export default router;
