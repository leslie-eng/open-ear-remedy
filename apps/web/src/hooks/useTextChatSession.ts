import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_CHAT_MESSAGE_CHARS, type EndReason, type ServerMessage } from '@openear/shared/calls';
import { openCallSocket, type CallSocket } from '../lib/callSocket';

export type TextChatPhase = 'idle' | 'waiting' | 'ringing' | 'live' | 'ended';

/** How often to try again while waiting for a booked Listener to arrive. */
const BOOKED_RETRY_MS = 15_000;


export interface ChatLine {
  id: string;
  from: 'me' | 'listener';
  text: string;
  at: number;
}

export interface TextChatState {
  phase: TextChatPhase;
  callId: string | null;
  lines: ChatLine[];
  /** Seconds of billed (connected) time so far. */
  elapsed: number;
  maxSeconds: number;
  lowTimeWarning: boolean;
  peerReconnecting: boolean;
  endReason: EndReason | null;
  billedSeconds: number;
  error: string | null;
}

const INITIAL: TextChatState = {
  phase: 'idle',
  callId: null,
  lines: [],
  elapsed: 0,
  maxSeconds: 0,
  lowTimeWarning: false,
  peerReconnecting: false,
  endReason: null,
  billedSeconds: 0,
  error: null,
};

/**
 * A person's side of a Text Chat with a Listener: ask, ring, type, end. Same rules and billing as a
 * Call; messages travel through the call socket and are never stored.
 */
export function useTextChatSession({ onEnded }: { onEnded?: () => void } = {}) {
  const [state, setState] = useState<TextChatState>(INITIAL);
  const socket = useRef<CallSocket | null>(null);
  const startedAt = useRef<number | null>(null);
  const bookingId = useRef<string | null>(null);
  const retryTimer = useRef<number | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const patch = (next: Partial<TextChatState>) => setState((s) => ({ ...s, ...next }));

  const teardown = useCallback(() => {
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
    retryTimer.current = null;
    socket.current?.close();
    socket.current = null;
    startedAt.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  useEffect(() => {
    if (state.phase !== 'live') return;
    const id = setInterval(() => {
      if (startedAt.current) patch({ elapsed: Math.floor((Date.now() - startedAt.current) / 1000) });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const handleMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case 'error':
          // A booked Listener who hasn't arrived yet: wait here and keep trying.
          if (msg.code === 'LISTENER_NOT_READY' && bookingId.current) {
            patch({ phase: 'waiting', error: null });
            const id = bookingId.current;
            retryTimer.current = window.setTimeout(
              () => socket.current?.send({ type: 'call:request', bookingId: id }),
              BOOKED_RETRY_MS,
            );
            break;
          }
          teardown();
          patch({ phase: 'idle', error: msg.message });
          break;
        case 'call:ringing':
          patch({ phase: 'ringing', callId: msg.callId });
          break;
        case 'call:matched':
          patch({ callId: msg.callId });
          break;
        case 'call:started':
          startedAt.current = Date.now();
          patch({ phase: 'live', maxSeconds: msg.maxSeconds, elapsed: 0, peerReconnecting: false });
          break;
        case 'chat:message':
          setState((s) => ({
            ...s,
            peerReconnecting: false,
            lines: [...s.lines, { id: `${msg.at}-${s.lines.length}`, from: 'listener', text: msg.text, at: msg.at }],
          }));
          break;
        case 'call:low-time':
          patch({ lowTimeWarning: true });
          break;
        case 'call:peer-reconnecting':
          patch({ peerReconnecting: true });
          break;
        case 'call:ended':
          teardown();
          patch({ phase: 'ended', endReason: msg.reason, billedSeconds: msg.billedSeconds, peerReconnecting: false });
          onEndedRef.current?.();
          break;
      }
    },
    [teardown],
  );

  /** Starts a chat; with `booking`, joins that booked Conversation instead of ringing everyone. */
  const start = useCallback((booking?: string) => {
    setState({ ...INITIAL, phase: booking ? 'waiting' : 'ringing' });
    bookingId.current = booking ?? null;
    socket.current = openCallSocket({ onMessage: handleMessage });
    socket.current.send(booking ? { type: 'call:request', bookingId: booking } : { type: 'call:request', mode: 'text' });
  }, [handleMessage]);

  const send = useCallback(
    (text: string) => {
      const body = text.trim().slice(0, MAX_CHAT_MESSAGE_CHARS);
      if (!body || !state.callId || state.phase !== 'live') return false;
      socket.current?.send({ type: 'chat:message', callId: state.callId, text: body });
      setState((s) => ({ ...s, lines: [...s.lines, { id: `me-${Date.now()}-${s.lines.length}`, from: 'me', text: body, at: Date.now() }] }));
      return true;
    },
    [state.callId, state.phase],
  );

  const end = useCallback(() => {
    if (state.callId) socket.current?.send({ type: 'call:hangup', callId: state.callId });
    else {
      teardown();
      setState(INITIAL);
    }
  }, [state.callId, teardown]);

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, start, send, end, reset };
}
