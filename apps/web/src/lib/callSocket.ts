import type { ClientMessage, ServerMessage } from '@openear/shared/calls';
import { getAccessToken } from './api';

/**
 * The call WebSocket. Signs in with the current session, queues messages until the server is
 * ready, and reconnects automatically after a drop (the server keeps a live call for 30 seconds,
 * and treats a fresh sign-in as the same person coming back).
 */
export interface CallSocket {
  send(message: ClientMessage): void;
  close(): void;
}

export type SocketStatus = 'connecting' | 'ready' | 'reconnecting' | 'closed';

const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 10000];

function socketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return configured;
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}/ws`;
}

export function openCallSocket({
  onMessage,
  onStatus,
}: {
  onMessage: (message: ServerMessage) => void;
  onStatus?: (status: SocketStatus) => void;
}): CallSocket {
  let ws: WebSocket | null = null;
  let ready = false;
  let closedByUs = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  const queue: ClientMessage[] = [];

  const connect = () => {
    onStatus?.(attempt === 0 ? 'connecting' : 'reconnecting');
    ws = new WebSocket(socketUrl());
    ws.onopen = () => {
      ws?.send(JSON.stringify({ type: 'auth', token: getAccessToken() ?? '' }));
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as ServerMessage;
      if (message.type === 'ready') {
        ready = true;
        attempt = 0;
        onStatus?.('ready');
        while (queue.length) ws?.send(JSON.stringify(queue.shift()));
      }
      onMessage(message);
    };
    ws.onclose = (event) => {
      ready = false;
      // 4001: not signed in, 4000: replaced by another tab. Retrying would not help.
      if (closedByUs || event.code === 4001 || event.code === 4000) {
        onStatus?.('closed');
        return;
      }
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      attempt += 1;
      onStatus?.('reconnecting');
      retryTimer = setTimeout(connect, delay);
    };
  };

  connect();

  return {
    send(message) {
      if (ready && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      else queue.push(message);
    },
    close() {
      closedByUs = true;
      clearTimeout(retryTimer);
      ws?.close();
    },
  };
}
