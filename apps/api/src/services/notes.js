import { MAX_NOTE_CHARS } from '@openear/shared/calls';
import { query } from '../db.js';
import { httpError } from '../util.js';

/**
 * Listener notes: a short private note a Listener writes after a Conversation, so the next
 * Listener need not ask the person to repeat their story.
 *
 * Who sees them: the Listener who wrote them, any Listener matched with the same person later,
 * and Admins. Never the person. They expire after 12 months. A person can turn notes off (which
 * also deletes the existing ones) or delete them at any time.
 */

const KEEP = `INTERVAL '12 months'`;

/** Writes (or rewrites) the note for a Conversation the Listener took part in. */
export async function saveNote({ listenerId, callId, body }) {
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) throw httpError(400, 'Write something, or skip the note.');
  if (text.length > MAX_NOTE_CHARS) throw httpError(400, `Notes can be up to ${MAX_NOTE_CHARS} characters.`);

  const { rows } = await query(
    `SELECT c.user_id, u.notes_opt_out FROM call_history c JOIN users u ON u.id = c.user_id
     WHERE c.id = $1 AND c.listener_user_id = $2`,
    [callId, listenerId],
  );
  if (!rows[0]) throw httpError(404, 'Conversation not found');
  if (rows[0].notes_opt_out) throw httpError(403, 'This person has turned notes off.');

  await query(
    `INSERT INTO listener_notes (client_user_id, listener_user_id, call_id, body) VALUES ($1, $2, $3, $4)
     ON CONFLICT (call_id) DO UPDATE SET body = EXCLUDED.body`,
    [rows[0].user_id, listenerId, callId, text],
  );
}

/** Current notes about a person, newest first. `viewerId` marks the viewer's own notes. */
export async function notesAbout(clientId, { viewerId = null } = {}) {
  const { rows } = await query(
    `SELECT n.body, n.created_at, n.listener_user_id, c.mode
     FROM listener_notes n JOIN call_history c ON c.id = n.call_id
     JOIN users u ON u.id = n.client_user_id
     WHERE n.client_user_id = $1 AND NOT u.notes_opt_out AND n.created_at > NOW() - ${KEEP}
     ORDER BY n.created_at DESC LIMIT 20`,
    [clientId],
  );
  return rows.map((r) => ({ body: r.body, at: r.created_at.toISOString(), mode: r.mode, byYou: r.listener_user_id === viewerId }));
}

export async function deleteNotesAbout(clientId) {
  await query(`DELETE FROM listener_notes WHERE client_user_id = $1`, [clientId]);
}

/** Turning notes off deletes the existing ones too. */
export async function setOptOut(clientId, optedOut) {
  await query(`UPDATE users SET notes_opt_out = $2 WHERE id = $1`, [clientId, Boolean(optedOut)]);
  if (optedOut) await deleteNotesAbout(clientId);
}

export async function settings(clientId) {
  const { rows } = await query(`SELECT notes_opt_out, notes_notice_seen_at FROM users WHERE id = $1`, [clientId]);
  return { optedOut: Boolean(rows[0]?.notes_opt_out), noticeSeen: Boolean(rows[0]?.notes_notice_seen_at) };
}

export async function markNoticeSeen(clientId) {
  await query(`UPDATE users SET notes_notice_seen_at = COALESCE(notes_notice_seen_at, NOW()) WHERE id = $1`, [clientId]);
}

/** Deletes notes older than 12 months; returns how many. Run daily. */
export async function purgeExpired() {
  const { rowCount } = await query(`DELETE FROM listener_notes WHERE created_at <= NOW() - ${KEEP}`);
  return rowCount;
}
