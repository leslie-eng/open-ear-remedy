import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, requireAuth } from '../middleware.js';
import * as notes from '../services/notes.js';
import { httpError, rateLimit } from '../util.js';

/**
 * Notes, from both sides. Mounted at /api/notes.
 *   Listeners: write the note for a Conversation they just had.
 *   Everyone: see and change their notes choices, or delete every note about them.
 * People never see what the notes say.
 */
const router = Router();
router.use(requireAuth);

async function requireListener(req, _res, next) {
  try {
    const { rows } = await query(`SELECT 1 FROM listeners WHERE user_id = $1 AND active`, [req.user.id]);
    next(rows[0] ? undefined : httpError(403, 'Only Listeners can write notes.'));
  } catch (err) {
    next(err);
  }
}

// Listener: { callId, body } for a Conversation they took part in.
router.post(
  '/',
  requireListener,
  rateLimit({ windowMs: 60 * 1000, max: 20, key: (req) => req.user.id }),
  asyncHandler(async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(req.body?.callId))) throw httpError(404, 'Conversation not found');
    await notes.saveNote({ listenerId: req.user.id, callId: req.body.callId, body: req.body.body });
    res.status(204).end();
  }),
);

router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    res.json(await notes.settings(req.user.id));
  }),
);

// { optedOut } turns notes off (deleting existing ones) or back on; { noticeSeen: true } records the notice.
router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    if (typeof req.body?.optedOut === 'boolean') await notes.setOptOut(req.user.id, req.body.optedOut);
    if (req.body?.noticeSeen === true) await notes.markNoticeSeen(req.user.id);
    res.json(await notes.settings(req.user.id));
  }),
);

// "Delete notes about me".
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await notes.deleteNotesAbout(req.user.id);
    res.status(204).end();
  }),
);

export default router;
