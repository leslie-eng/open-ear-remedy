import { useCallback, useEffect, useRef, useState } from 'react';
import type { EndReason, ServerMessage, SignalPayload } from '@openear/shared/calls';
import { openCallSocket, type CallSocket } from '../lib/callSocket';
import { callsSupported, createCallPeer, getMicrophone, type CallPeer } from '../lib/callPeer';

export type CallPhase = 'idle' | 'preparing' | 'waiting' | 'ringing' | 'connecting' | 'live' | 'ended';

/** How often to try again while waiting for a booked Listener to arrive. */
const BOOKED_RETRY_MS = 15_000;


export interface CallState {
  phase: CallPhase;
  callId: string | null;
  /** Seconds of billed (connected) time so far. */
  elapsed: number;
  maxSeconds: number;
  lowTimeWarning: boolean;
  peerReconnecting: boolean;
  muted: boolean;
  endReason: EndReason | null;
  billedSeconds: number;
  error: string | null;
}

const INITIAL: CallState = {
  phase: 'idle',
  callId: null,
  elapsed: 0,
  maxSeconds: 0,
  lowTimeWarning: false,
  peerReconnecting: false,
  muted: false,
  endReason: null,
  billedSeconds: 0,
  error: null,
};

/** The caller's side of a call: ask, ring, connect audio, talk, end. */
export function useCallSession({ onEnded }: { onEnded?: () => void } = {}) {
  const [state, setState] = useState<CallState>(INITIAL);
  const socket = useRef<CallSocket | null>(null);
  const peer = useRef<CallPeer | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const pendingSignals = useRef<SignalPayload[]>([]);
  const startedAt = useRef<number | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const bookingId = useRef<string | null>(null);
  const retryTimer = useRef<number | null>(null);
  const phaseRef = useRef<CallPhase>('idle');
  phaseRef.current = state.phase;

  const patch = (next: Partial<CallState>) => setState((s) => ({ ...s, ...next }));

  const teardown = useCallback(() => {
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
    retryTimer.current = null;
    peer.current?.close();
    peer.current = null;
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    socket.current?.close();
    socket.current = null;
    pendingSignals.current = [];
    startedAt.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  // Tick the on-screen timer from the server's start signal.
  useEffect(() => {
    if (state.phase !== 'live') return;
    const id = setInterval(() => {
      if (startedAt.current) patch({ elapsed: Math.floor((Date.now() - startedAt.current) / 1000) });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const handleMessage = useCallback(
    async (msg: ServerMessage) => {
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
        case 'call:matched': {
          patch({ phase: 'connecting', callId: msg.callId });
          const callId = msg.callId;
          try {
            peer.current = await createCallPeer({
              role: 'caller',
              microphone: mic.current!,
              sendSignal: (payload) => socket.current?.send({ type: 'signal', callId, payload }),
              onConnected: () => socket.current?.send({ type: 'call:connected', callId }),
              onFailed: () => {
                // Never connected at all: end it (nothing is billed) rather than leave them waiting.
                if (phaseRef.current !== 'live') {
                  socket.current?.send({ type: 'call:hangup', callId });
                  patch({ error: 'We could not connect the audio. Please check your internet connection and try again.' });
                } else {
                  patch({ peerReconnecting: true });
                }
              },
            });
            for (const s of pendingSignals.current.splice(0)) await peer.current.handleSignal(s);
          } catch {
            socket.current?.send({ type: 'call:hangup', callId });
            patch({ error: 'We could not set up the audio connection. Please try again.' });
          }
          break;
        }
        case 'signal':
          if (peer.current) await peer.current.handleSignal(msg.payload);
          else pendingSignals.current.push(msg.payload);
          break;
        case 'call:started':
          startedAt.current = Date.now();
          patch({ phase: 'live', maxSeconds: msg.maxSeconds, elapsed: 0 });
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

  /** Starts a call; with `booking`, joins that booked Conversation instead of ringing everyone. */
  const start = useCallback(async (booking?: string) => {
    if (!callsSupported()) {
      patch({ error: 'This browser cannot make calls. Please use a recent Chrome, Safari, Edge or Firefox, or try our AI chat.' });
      return;
    }
    setState({ ...INITIAL, phase: 'preparing' });
    try {
      mic.current = await getMicrophone();
    } catch {
      patch({ phase: 'idle', error: 'Open Ear needs your microphone for a call. Allow microphone access and try again.' });
      return;
    }
    bookingId.current = booking ?? null;
    socket.current = openCallSocket({ onMessage: (m) => void handleMessage(m) });
    socket.current.send(booking ? { type: 'call:request', bookingId: booking } : { type: 'call:request' });
  }, [handleMessage]);

  const hangup = useCallback(() => {
    if (state.callId) socket.current?.send({ type: 'call:hangup', callId: state.callId });
    else {
      teardown();
      setState(INITIAL);
    }
  }, [state.callId, teardown]);

  const toggleMute = useCallback(() => {
    setState((s) => {
      peer.current?.setMuted(!s.muted);
      return { ...s, muted: !s.muted };
    });
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return { state, start, hangup, toggleMute, reset };
}
