import {
  ANONYMOUS_CALLER,
  LISTENER_COOLDOWN_MS,
  LOW_TIME_WARNING_SECONDS,
  MAX_CHAT_MESSAGE_CHARS,
  RECONNECT_GRACE_MS,
  RING_TIMEOUT_MS,
} from '@openear/shared/calls';
import { callSecondsAvailable } from '@openear/shared/pricing';
import { query } from '../db.js';
import * as billing from '../services/billing.js';
import * as notes from '../services/notes.js';

const realClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

/**
 * Runs every Conversation, voice Call or Text Chat: who is online, ringing, matching, timing,
 * billing and ending. Both modes follow the same rules; a Text Chat starts its billed time when
 * the Listener accepts (there is no audio to wait for) and relays typed messages, never storing them.
 * Transport-agnostic: the WebSocket layer feeds events in and delivers `send(userId, message)`.
 * State changes happen synchronously before any await, so two listeners accepting at the
 * same moment can never both win.
 */
export function createCallCoordinator({ send, clock = realClock }) {
  const listeners = new Map(); // listenerId -> { busyCallId, cooldownUntil }
  const calls = new Map(); // callId -> call state
  const requesting = new Set(); // callers whose request is being set up

  const isFree = (state) => !state.offline && !state.busyCallId && (state.cooldownUntil ?? 0) <= clock.now();

  function sendStatus(listenerId) {
    const state = listeners.get(listenerId);
    send(listenerId, {
      type: 'listener:status',
      online: Boolean(state),
      cooldownUntil: state && state.cooldownUntil > clock.now() ? state.cooldownUntil : null,
    });
  }

  function refuse(userId, code, message) {
    send(userId, { type: 'error', code, message });
    return null;
  }

  async function callerName(userId) {
    const { rows } = await query(`SELECT display_name FROM users WHERE id = $1`, [userId]);
    return rows[0]?.display_name || ANONYMOUS_CALLER;
  }

  const STATUS_FOR = { no_answer: 'missed', cancelled: 'cancelled' };

  /**
   * Ends a call once: stops its timers, bills connected time (from audio connect to `endedAt`,
   * capped at what the caller could afford), records it, and tells everyone involved.
   */
  async function endCall(call, reason, { endedAt = clock.now() } = {}) {
    if (call.status === 'ended') return;
    const wasMatched = Boolean(call.listenerId);
    call.status = 'ended';
    calls.delete(call.id);
    for (const timer of Object.values(call.timers)) clock.clearTimeout(timer);

    const billedSeconds = call.connectedAt
      ? Math.min(call.maxSeconds, Math.max(0, Math.floor((endedAt - call.connectedAt) / 1000)))
      : 0;
    const charge = billedSeconds
      ? await billing.chargeCall(call.callerId, billedSeconds, { callId: call.id, now: new Date(endedAt) })
      : { credits: 0, passSeconds: 0 };
    await query(
      `UPDATE call_history
       SET status = $2, end_reason = $3, ended_at = $4, duration_seconds = $5, credits_used = $6, pass_seconds_used = $7
       WHERE id = $1`,
      [call.id, STATUS_FOR[reason] ?? 'completed', reason, new Date(endedAt), billedSeconds, charge.credits, charge.passSeconds],
    );

    const ended = { type: 'call:ended', callId: call.id, reason, billedSeconds };
    send(call.callerId, ended);
    if (wasMatched) {
      send(call.listenerId, ended);
      const listener = listeners.get(call.listenerId);
      if (listener?.offline) {
        listeners.delete(call.listenerId);
      } else if (listener) {
        listener.busyCallId = null;
        listener.cooldownUntil = clock.now() + LISTENER_COOLDOWN_MS;
        sendStatus(call.listenerId);
      }
    }
    for (const listenerId of call.rung) {
      if (listenerId !== call.listenerId) send(listenerId, { type: 'call:taken', callId: call.id });
    }
  }

  /** Starts the billed time, the low-time warning and the time limit. */
  async function startConnected(call) {
    call.status = 'connected';
    call.connectedAt = clock.now();
    const warnInMs = Math.max(0, call.maxSeconds - LOW_TIME_WARNING_SECONDS) * 1000;
    call.timers.lowTime = clock.setTimeout(() => {
      send(call.callerId, { type: 'call:low-time', callId: call.id, secondsLeft: Math.min(LOW_TIME_WARNING_SECONDS, call.maxSeconds) });
    }, warnInMs);
    call.timers.limit = clock.setTimeout(() => endCall(call, 'time_limit'), call.maxSeconds * 1000);
    const started = { type: 'call:started', callId: call.id, maxSeconds: call.maxSeconds };
    send(call.callerId, started);
    send(call.listenerId, started);
    await query(`UPDATE call_history SET status = 'connected', connected_at = $2 WHERE id = $1`, [call.id, new Date(call.connectedAt)]);
  }

  async function startCall(callerId, mode) {
    const free = [...listeners.entries()].filter(([, s]) => isFree(s)).map(([id]) => id);
    if (!free.length) {
      return refuse(callerId, 'NO_LISTENERS_AVAILABLE', 'No listener is free right now. Please try again soon, or talk with our AI chat while you wait.');
    }
    const { credits, pass } = await billing.getBalance(callerId, { now: new Date(clock.now()) });
    const maxSeconds = callSecondsAvailable({ credits, passSecondsLeft: pass?.callSecondsLeft ?? 0 });
    if (maxSeconds < 60) {
      return refuse(callerId, 'INSUFFICIENT_BALANCE', 'You need at least 1 minute of call time. Top up credits or get a Monthly Pass.');
    }
    const { rows } = await query(
      `INSERT INTO call_history (user_id, status, started_at, mode) VALUES ($1, 'ringing', $2, $3) RETURNING id`,
      [callerId, new Date(clock.now()), mode],
    );
    const callId = rows[0].id;
    const name = await callerName(callerId);
    const call = { id: callId, mode, callerId, callerName: name, listenerId: null, status: 'ringing', rung: free, maxSeconds, timers: {} };
    calls.set(callId, call);
    call.timers.ring = clock.setTimeout(() => endCall(call, 'no_answer'), RING_TIMEOUT_MS);
    send(callerId, { type: 'call:ringing', callId, timeoutMs: RING_TIMEOUT_MS });
    for (const listenerId of free) send(listenerId, { type: 'call:incoming', callId, callerName: name, mode });
    return { callId };
  }

  /** The live call a user is the caller or matched listener of, or null. */
  function callOf(userId) {
    for (const call of calls.values()) {
      if (call.callerId === userId || call.listenerId === userId) return call;
    }
    return null;
  }

  /** The live call `userId` is a participant of, or null. */
  function participantCall(userId, callId) {
    const call = calls.get(callId);
    return call && (call.callerId === userId || call.listenerId === userId) ? call : null;
  }

  return {
    /** True when at least one listener is online, not on a call and not in quiet time. */
    listenersAvailable() {
      for (const state of listeners.values()) if (!state.offline && isFree(state)) return true;
      return false;
    },

    async listenerOnline(listenerId) {
      const state = listeners.get(listenerId);
      if (state) state.offline = false;
      else listeners.set(listenerId, { busyCallId: null, cooldownUntil: null, offline: false });
      sendStatus(listenerId);
    },

    async listenerOffline(listenerId) {
      const state = listeners.get(listenerId);
      if (state?.busyCallId) state.offline = true;
      else listeners.delete(listenerId);
      sendStatus(listenerId);
    },

    /** Starts a Conversation; `mode` is 'voice' (a Call) or 'text' (a Text Chat). */
    async requestCall(callerId, { mode = 'voice' } = {}) {
      if (mode !== 'voice' && mode !== 'text') mode = 'voice';
      // Claimed synchronously so two quick requests can't both start a call.
      if (requesting.has(callerId) || callOf(callerId)) {
        return refuse(callerId, 'ALREADY_IN_CALL', 'You already have a call in progress.');
      }
      requesting.add(callerId);
      try {
        return await startCall(callerId, mode);
      } finally {
        requesting.delete(callerId);
      }
    },

    async accept(listenerId, callId) {
      const call = calls.get(callId);
      const listener = listeners.get(listenerId);
      // Checked and claimed synchronously: whoever runs this first wins.
      if (!call || call.status !== 'ringing' || !listener || !isFree(listener) || !call.rung.includes(listenerId)) {
        send(listenerId, { type: 'call:taken', callId });
        return;
      }
      call.status = 'connecting';
      call.listenerId = listenerId;
      listener.busyCallId = callId;
      clock.clearTimeout(call.timers.ring);

      for (const other of call.rung) {
        if (other !== listenerId) send(other, { type: 'call:taken', callId });
      }
      send(call.callerId, { type: 'call:matched', callId, role: 'caller', mode: call.mode });
      // The Listener sees earlier notes about this person (none if they turned notes off).
      const earlier = await notes.notesAbout(call.callerId, { viewerId: listenerId }).catch(() => []);
      send(listenerId, { type: 'call:matched', callId, role: 'listener', mode: call.mode, callerName: call.callerName, notes: earlier });
      await query(`UPDATE call_history SET status = 'connecting', listener_user_id = $2 WHERE id = $1`, [callId, listenerId]);
      if (call.mode === 'text') await startConnected(call);
    },

    /** Either side reports audio flowing; the first report starts the billed time. */
    async connected(userId, callId) {
      const call = participantCall(userId, callId);
      if (!call || call.mode !== 'voice' || call.status !== 'connecting') return;
      await startConnected(call);
    },

    /** A user's connection closed. Ringing calls are cancelled; live calls get a grace period. */
    async disconnected(userId) {
      const listener = listeners.get(userId);
      if (listener?.busyCallId) listener.offline = true;
      else if (listener) listeners.delete(userId);

      const call = callOf(userId);
      if (!call) return;
      if (call.status === 'ringing') {
        if (call.callerId === userId) await endCall(call, 'cancelled');
        return;
      }
      if (call.timers.grace) return;
      const droppedAt = clock.now();
      const peer = call.callerId === userId ? call.listenerId : call.callerId;
      send(peer, { type: 'call:peer-reconnecting', callId: call.id });
      call.timers.grace = clock.setTimeout(() => endCall(call, 'dropped', { endedAt: droppedAt }), RECONNECT_GRACE_MS);
    },

    /** The user is back (new connection, authenticated) in time: the call carries on. */
    async reconnected(userId) {
      const listener = listeners.get(userId);
      if (listener) listener.offline = false;
      const call = callOf(userId);
      if (call?.timers.grace) {
        clock.clearTimeout(call.timers.grace);
        delete call.timers.grace;
      }
    },

    /** Relays an SDP offer/answer or ICE candidate to the other participant, untouched. */
    async signal(userId, callId, payload) {
      const call = participantCall(userId, callId);
      if (!call || !call.listenerId) return;
      const peer = call.callerId === userId ? call.listenerId : call.callerId;
      send(peer, { type: 'signal', callId, payload });
    },

    /** Passes a typed message to the other side of a live Text Chat. Never stored. */
    async chatMessage(userId, callId, text) {
      const call = participantCall(userId, callId);
      if (!call || call.mode !== 'text' || call.status !== 'connected' || typeof text !== 'string') return;
      const body = text.trim();
      if (!body || body.length > MAX_CHAT_MESSAGE_CHARS) return;
      const fromClient = call.callerId === userId;
      send(fromClient ? call.listenerId : call.callerId, {
        type: 'chat:message',
        callId,
        from: fromClient ? 'client' : 'listener',
        text: body,
        at: clock.now(),
      });
    },

    /** The listener on a call (live or finished) reports the caller for admins to review. */
    async report(listenerId, callId, reason) {
      const why = typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
      if (!why) return refuse(listenerId, 'REASON_REQUIRED', 'Please say briefly what happened.');
      await query(
        `INSERT INTO call_reports (call_id, listener_user_id, reason)
         SELECT id, listener_user_id, $3 FROM call_history WHERE id = $1 AND listener_user_id = $2`,
        [callId, listenerId, why],
      );
    },

    async listReports({ limit = 100 } = {}) {
      const { rows } = await query(
        `SELECT r.call_id, r.listener_user_id, r.reason, r.created_at, c.user_id AS caller_id, u.email AS caller_email
         FROM call_reports r JOIN call_history c ON c.id = r.call_id JOIN users u ON u.id = c.user_id
         ORDER BY r.created_at DESC LIMIT $1`,
        [limit],
      );
      return rows.map((r) => ({
        callId: r.call_id,
        listenerId: r.listener_user_id,
        reason: r.reason,
        callerId: r.caller_id,
        callerEmail: r.caller_email,
        at: r.created_at,
      }));
    },

    async hangup(userId, callId) {
      const call = participantCall(userId, callId);
      if (call) await endCall(call, call.status === 'ringing' ? 'cancelled' : 'hangup');
    },
  };
}
