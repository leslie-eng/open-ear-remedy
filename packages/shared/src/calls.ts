/**
 * Call rules and the signaling protocol shared by the browser and the API.
 * Audio flows browser-to-browser over WebRTC (always via the TURN relay in production);
 * the API only introduces the two sides, times the call and bills it.
 */

/** Ringing stops (no charge) if no listener accepts in this time. */
export const RING_TIMEOUT_MS = 60_000;
/** A side that loses its connection this long ends the call; billing stops at the drop. */
export const RECONNECT_GRACE_MS = 30_000;
/** Quiet time after each call before a listener's console rings again. */
export const LISTENER_COOLDOWN_MS = 2 * 60_000;
/** The caller is warned when this much call time is left. */
export const LOW_TIME_WARNING_SECONDS = 120;
/** Display name a listener sees when the caller hasn't chosen one. */
export const ANONYMOUS_CALLER = 'Anonymous';

export type EndReason = 'hangup' | 'no_answer' | 'cancelled' | 'dropped' | 'time_limit';

/** Opaque WebRTC payload (SDP offer/answer or ICE candidate), relayed untouched. */
export type SignalPayload =
  | { kind: 'offer' | 'answer'; sdp: string }
  | { kind: 'candidate'; candidate: Record<string, unknown> | null };

/** Browser → API. */
export type ClientMessage =
  | { type: 'auth'; token: string }
  | { type: 'listener:online' }
  | { type: 'listener:offline' }
  | { type: 'call:request' }
  | { type: 'call:cancel'; callId: string }
  | { type: 'call:accept'; callId: string }
  | { type: 'call:connected'; callId: string }
  | { type: 'call:hangup'; callId: string }
  | { type: 'call:report'; callId: string; reason: string }
  | { type: 'signal'; callId: string; payload: SignalPayload };

/** API → browser. */
export type ServerMessage =
  | { type: 'ready'; role: 'caller' | 'listener' }
  | { type: 'error'; code: string; message: string }
  | { type: 'listener:status'; online: boolean; cooldownUntil: number | null }
  | { type: 'call:ringing'; callId: string; timeoutMs: number }
  | { type: 'call:incoming'; callId: string; callerName: string }
  | { type: 'call:taken'; callId: string }
  | { type: 'call:matched'; callId: string; role: 'caller' | 'listener'; callerName?: string }
  | { type: 'call:started'; callId: string; maxSeconds: number }
  | { type: 'call:low-time'; callId: string; secondsLeft: number }
  | { type: 'call:peer-reconnecting'; callId: string }
  | { type: 'call:ended'; callId: string; reason: EndReason; billedSeconds: number }
  | { type: 'signal'; callId: string; payload: SignalPayload };
