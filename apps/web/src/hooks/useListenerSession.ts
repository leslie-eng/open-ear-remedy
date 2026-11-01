import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_CHAT_MESSAGE_CHARS, type ConversationMode, type EndReason, type ListenerNote, type ServerMessage, type SignalPayload } from '@openear/shared/calls';
import { apiFetch } from '../lib/api';
import { openCallSocket, type CallSocket, type SocketStatus } from '../lib/callSocket';
import { callsSupported, createCallPeer, getMicrophone, type CallPeer } from '../lib/callPeer';

export interface IncomingCall {
  callId: string;
  callerName: string;
  mode: ConversationMode;
}

export interface ChatLine {
  id: string;
  from: 'me' | 'client';
  text: string;
}

export interface ActiveCall {
  callId: string;
  callerName: string;
  mode: ConversationMode;
  /** Earlier notes about this person from Listeners (empty if they turned notes off). */
  notes: ListenerNote[];
  /** Text Chat only. Kept in memory for this conversation; never saved. */
  lines: ChatLine[];
  phase: 'connecting' | 'live';
  elapsed: number;
  peerReconnecting: boolean;
}

export interface LastCall {
  callId: string;
  callerName: string;
  mode: ConversationMode;
  noteSaved: boolean;
  reason: EndReason;
  billedSeconds: number;
  reported: boolean;
}

/** A listener's console: go online, see who is ringing, take a call, end or report it. */
export function useListenerSession() {
  const [connection, setConnection] = useState<SocketStatus>('closed');
  const [role, setRole] = useState<'caller' | 'listener' | null>(null);
  const [online, setOnline] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall[]>([]);
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [lastCall, setLastCall] = useState<LastCall | null>(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socket = useRef<CallSocket | null>(null);
  const peer = useRef<CallPeer | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const pendingSignals = useRef<SignalPayload[]>([]);
  const startedAt = useRef<number | null>(null);
  const activeRef = useRef<ActiveCall | null>(null);
  activeRef.current = active;
  // What the listener asked for. After a reconnect (e.g. the server restarted) the server has
  // forgotten their presence, so they are put back online automatically.
  const wantsOnline = useRef(false);

  const endAudio = () => {
    peer.current?.close();
    peer.current = null;
    mic.current?.getTracks().forEach((t) => t.stop());
    mic.current = null;
    pendingSignals.current = [];
    startedAt.current = null;
    setMuted(false);
  };

  const handleMessage = useCallback(async (msg: ServerMessage) => {
    switch (msg.type) {
      case 'ready':
        setRole(msg.role);
        if (wantsOnline.current && msg.role === 'listener') socket.current?.send({ type: 'listener:online' });
        break;
      case 'error':
        setError(msg.message);
        break;
      case 'listener:status':
        setOnline(msg.online);
        setCooldownUntil(msg.cooldownUntil);
        break;
      case 'call:incoming':
        setIncoming((list) => [
          ...list.filter((c) => c.callId !== msg.callId),
          { callId: msg.callId, callerName: msg.callerName, mode: msg.mode ?? 'voice' },
        ]);
        break;
      case 'call:taken':
        setIncoming((list) => list.filter((c) => c.callId !== msg.callId));
        break;
      case 'call:matched': {
        const callerName = msg.callerName ?? 'Anonymous';
        setIncoming([]);
        const mode = msg.mode ?? 'voice';
        setActive({ callId: msg.callId, callerName, mode, notes: msg.notes ?? [], lines: [], phase: 'connecting', elapsed: 0, peerReconnecting: false });
        // A Text Chat has no audio to set up.
        if (mode === 'text') break;
        const callId = msg.callId;
        try {
          peer.current = await createCallPeer({
            role: 'listener',
            microphone: mic.current!,
            sendSignal: (payload) => socket.current?.send({ type: 'signal', callId, payload }),
            onConnected: () => socket.current?.send({ type: 'call:connected', callId }),
            onFailed: () => {
              if (activeRef.current?.phase !== 'live') {
                socket.current?.send({ type: 'call:hangup', callId });
                setError('The audio connection could not be set up.');
              } else {
                setActive((a) => a && { ...a, peerReconnecting: true });
              }
            },
          });
          for (const s of pendingSignals.current.splice(0)) await peer.current.handleSignal(s);
        } catch {
          socket.current?.send({ type: 'call:hangup', callId });
          setError('The audio connection could not be set up.');
        }
        break;
      }
      case 'signal':
        if (peer.current) await peer.current.handleSignal(msg.payload);
        else pendingSignals.current.push(msg.payload);
        break;
      case 'call:started':
        startedAt.current = Date.now();
        setActive((a) => a && { ...a, phase: 'live', elapsed: 0 });
        break;
      case 'chat:message':
        setActive((a) =>
          a && a.callId === msg.callId
            ? { ...a, peerReconnecting: false, lines: [...a.lines, { id: `${msg.at}-${a.lines.length}`, from: 'client', text: msg.text }] }
            : a,
        );
        break;
      case 'call:peer-reconnecting':
        setActive((a) => a && { ...a, peerReconnecting: true });
        break;
      case 'call:ended': {
        const ended = activeRef.current;
        endAudio();
        setActive(null);
        if (ended) {
          setLastCall({
            callId: ended.callId,
            callerName: ended.callerName,
            mode: ended.mode,
            noteSaved: false,
            reason: msg.reason,
            billedSeconds: msg.billedSeconds,
            reported: false,
          });
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    socket.current = openCallSocket({ onMessage: (m) => void handleMessage(m), onStatus: setConnection });
    return () => {
      socket.current?.close();
      socket.current = null;
      endAudio();
    };
  }, [handleMessage]);

  // Call timer.
  useEffect(() => {
    if (active?.phase !== 'live') return;
    const id = setInterval(() => {
      if (startedAt.current) setActive((a) => a && { ...a, elapsed: Math.floor((Date.now() - startedAt.current!) / 1000) });
    }, 1000);
    return () => clearInterval(id);
  }, [active?.phase]);

  const goOnline = useCallback(() => {
    setError(null);
    if (!callsSupported()) {
      setError('This browser cannot take calls. Please use a recent Chrome, Safari, Edge or Firefox.');
      return;
    }
    wantsOnline.current = true;
    socket.current?.send({ type: 'listener:online' });
  }, []);

  const goOffline = useCallback(() => {
    wantsOnline.current = false;
    socket.current?.send({ type: 'listener:offline' });
  }, []);

  const accept = useCallback(async (call: IncomingCall) => {
    setError(null);
    if (call.mode === 'voice') {
      try {
        mic.current = await getMicrophone();
      } catch {
        setError('Allow microphone access to take calls.');
        return;
      }
    }
    socket.current?.send({ type: 'call:accept', callId: call.callId });
  }, []);

  /** Sends a Text Chat message to the person. */
  const sendChat = useCallback((text: string) => {
    const a = activeRef.current;
    const body = text.trim().slice(0, MAX_CHAT_MESSAGE_CHARS);
    if (!a || a.mode !== 'text' || a.phase !== 'live' || !body) return false;
    socket.current?.send({ type: 'chat:message', callId: a.callId, text: body });
    setActive((cur) => cur && { ...cur, lines: [...cur.lines, { id: `me-${Date.now()}-${cur.lines.length}`, from: 'me', text: body }] });
    return true;
  }, []);

  /** Saves the Listener's private note about the Conversation that just ended. */
  const saveNote = useCallback(async (callId: string, body: string) => {
    await apiFetch('/api/notes', { method: 'POST', body: JSON.stringify({ callId, body }) });
    setLastCall((c) => (c && c.callId === callId ? { ...c, noteSaved: true } : c));
  }, []);

  const hangup = useCallback(() => {
    if (activeRef.current) socket.current?.send({ type: 'call:hangup', callId: activeRef.current.callId });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      peer.current?.setMuted(!m);
      return !m;
    });
  }, []);

  const report = useCallback((callId: string, reason: string) => {
    socket.current?.send({ type: 'call:report', callId, reason });
    setLastCall((c) => (c && c.callId === callId ? { ...c, reported: true } : c));
  }, []);

  return {
    connection,
    role,
    online,
    cooldownUntil,
    incoming,
    active,
    lastCall,
    muted,
    error,
    goOnline,
    goOffline,
    accept,
    sendChat,
    saveNote,
    hangup,
    toggleMute,
    report,
    dismissLastCall: () => setLastCall(null),
  };
}
