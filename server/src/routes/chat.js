import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { addCredits, deductCredits, withTransaction } from '../services/credits.js';
import { rateLimit } from '../util.js';

const SYSTEM_PROMPT = `You are a warm, friendly AI companion for Open Ear. Be supportive, conversational, and brief (2-4 sentences). If someone mentions self-harm, gently suggest 988 Suicide & Crisis Lifeline.`;

const COST = 5;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 20;

const router = Router();

router.post(
  '/',
  requireAuth,
  rateLimit({ windowMs: 60 * 1000, max: 15, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    if (!config.groqApiKey) {
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
    const newCredits = await deductCredits(req.user.id, COST, 'Chat message', null, { requireFull: true });
    if (newCredits === null) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    let aiResponse;
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
      if (!groqRes.ok) throw new Error(`Groq error: ${await groqRes.text()}`);
      const data = await groqRes.json();
      aiResponse = data.choices?.[0]?.message?.content;
    } catch (err) {
      console.error(err);
    }

    if (!aiResponse) {
      const refunded = await withTransaction(async (client) => {
        const credits = await addCredits(client, req.user.id, COST);
        await client.query(
          `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
           VALUES ($1, 'refund', $2, $2, 'Chat message refund', 'completed')`,
          [req.user.id, COST],
        );
        return credits;
      });
      return res.status(502).json({ error: 'Failed to get AI response', credits: refunded });
    }

    res.json({ response: aiResponse, credits: newCredits });
  }),
);

export default router;
