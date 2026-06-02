import { Router } from 'express';
import { config } from '../config.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import { getCredits } from '../services/credits.js';
import { query } from '../db.js';

const SYSTEM_PROMPT = `You are a warm, friendly AI companion for Open Ear. Be supportive, conversational, and brief (2-4 sentences). If someone mentions self-harm, gently suggest 988 Suicide & Crisis Lifeline.`;

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!config.groqApiKey) {
      return res.status(503).json({ error: 'Chat service is not configured' });
    }

    const credits = await getCredits(req.user.id);
    const cost = 5;
    if (credits < cost) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    const { message, conversationHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }
    messages.push({ role: 'user', content: message });

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

    if (!groqRes.ok) {
      console.error('Groq error:', await groqRes.text());
      return res.status(500).json({ error: 'Failed to get AI response' });
    }

    const data = await groqRes.json();
    const aiResponse =
      data.choices?.[0]?.message?.content ||
      "I'm here to listen. Could you tell me more about how you're feeling?";

    const newCredits = Math.max(0, credits - cost);
    await query(
      `UPDATE user_credits SET credits = $1, updated_at = NOW() WHERE user_id = $2`,
      [newCredits, req.user.id],
    );
    await query(
      `INSERT INTO credit_transactions (user_id, type, credits, amount, description, status)
       VALUES ($1, 'usage', $2, $3, 'Chat message', 'completed')`,
      [req.user.id, -cost, -cost],
    );

    res.json({ response: aiResponse, credits: newCredits });
  }),
);

export default router;
