import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import * as billing from '../services/billing.js';
import { rateLimit } from '../util.js';

// The AI is a companion, not a counsellor: it never diagnoses, and anyone in danger is sent to
// real people (emergency services, helplines on the crisis page) rather than kept in the chat.
const SYSTEM_PROMPT = `You are Open Ear's AI companion: warm, calm and non-judgemental. Listen first, reflect back what you hear, and keep replies brief (2-4 sentences) and conversational.
You are not a therapist or doctor. Do not diagnose, give medical or medication advice, or claim to be human.
If someone mentions suicide, self-harm, harming others, abuse, or being in danger, respond with care, encourage them to contact local emergency services or a crisis helpline right now, and share https://openearemedy.com/crisis-help where they can find numbers. They can also talk to a real person through an Open Ear call.`;

const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 20;

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

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-MAX_HISTORY_MESSAGES)) {
        if (typeof msg?.content !== 'string') continue;
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content.slice(0, MAX_MESSAGE_CHARS),
        });
      }
    }
    messages.push({ role: 'user', content: message });

    // Charge first (atomically) so concurrent requests can't overspend; refund if the AI call fails.
    // Throws a 402 BillingError when there is no pass allowance or credit left.
    const receipt = await billing.chargeChatMessage(req.user.id);

    let aiResponse;
    try {
      const aiRes = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openRouterApiKey}`,
          // Optional OpenRouter attribution headers.
          'HTTP-Referer': config.clientUrl,
          'X-Title': 'Open Ear',
        },
        body: JSON.stringify({
          model: config.openRouterModel,
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!aiRes.ok) throw new Error(`OpenRouter error (${aiRes.status}): ${await aiRes.text()}`);
      const data = await aiRes.json();
      aiResponse = data.choices?.[0]?.message?.content;
    } catch (err) {
      console.error(err);
    }

    if (!aiResponse) {
      await billing.refundChatMessage(req.user.id, receipt);
      return res.status(502).json({ error: 'Failed to get AI response', balance: await billing.getBalance(req.user.id) });
    }

    res.json({ response: aiResponse, balance: await billing.getBalance(req.user.id) });
  }),
);

export default router;
