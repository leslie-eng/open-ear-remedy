import { Router } from 'express';
import { asyncHandler, requireAuth } from '../middleware.js';
import { iceConfig } from '../calls/turn.js';
import { rateLimit } from '../util.js';

/** Calls themselves run over the WebSocket at /ws; this only hands out relay credentials. */
const router = Router();

router.get(
  '/ice-servers',
  requireAuth,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 60, key: (req) => req.user.id }),
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(await iceConfig());
  }),
);

export default router;
