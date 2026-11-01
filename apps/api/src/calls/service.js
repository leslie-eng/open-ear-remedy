import { WebSocketServer } from 'ws';
import { userFromToken } from '../auth.js';
import { config } from '../config.js';
import { query } from '../db.js';
import { createCallCoordinator } from './coordinator.js';

/**
 * WebSocket transport for calls at /ws. Each browser signs in with its JWT as the first
 * message; afterwards messages are routed to the coordinator, which replies via `send`.
 * One live socket per user: a new sign-in replaces the old socket (that is a reconnect).
 */

const AUTH_TIMEOUT_MS = 10_000;
const HEARTBEAT_MS = 25_000;
const MAX_MESSAGE_BYTES = 64 * 1024;

const sockets = new Map(); // userId -> ws

function deliver(userId, message) {
  const ws = sockets.get(userId);
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

export const coordinator = createCallCoordinator({ send: deliver });

async function isActiveListener(userId) {
  const { rows } = await query(`SELECT 1 FROM listeners WHERE user_id = $1 AND active`, [userId]);
  return rows.length > 0;
}

const isId = (v) => typeof v === 'string' && v.length <= 64;

/** Routes one authenticated message. Listener-only actions are refused for callers. */
async function handle(session, msg) {
  const { userId, isListener } = session;
  const listenerOnly = () => {
    deliver(userId, { type: 'error', code: 'NOT_A_LISTENER', message: 'Only listeners can do that.' });
    return false;
  };

  switch (msg.type) {
    case 'listener:online':
      if (!isListener) return listenerOnly();
      return coordinator.listenerOnline(userId);
    case 'listener:offline':
      if (!isListener) return listenerOnly();
      return coordinator.listenerOffline(userId);
    case 'call:request':
      return coordinator.requestCall(userId, { mode: msg.mode === 'text' ? 'text' : 'voice' });
    case 'call:accept':
      if (!isListener) return listenerOnly();
      return isId(msg.callId) && coordinator.accept(userId, msg.callId);
    case 'call:connected':
      return isId(msg.callId) && coordinator.connected(userId, msg.callId);
    case 'call:cancel':
    case 'call:hangup':
      return isId(msg.callId) && coordinator.hangup(userId, msg.callId);
    case 'call:report':
      if (!isListener) return listenerOnly();
      return isId(msg.callId) && coordinator.report(userId, msg.callId, msg.reason);
    case 'chat:message':
      return isId(msg.callId) && coordinator.chatMessage(userId, msg.callId, msg.text);
    case 'signal':
      return isId(msg.callId) && msg.payload && typeof msg.payload === 'object' && coordinator.signal(userId, msg.callId, msg.payload);
    default:
      deliver(userId, { type: 'error', code: 'UNKNOWN_MESSAGE', message: 'Unknown message type.' });
  }
}

export function attachCallSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: MAX_MESSAGE_BYTES,
    // Browsers always send Origin; only our own site may open call sockets.
    verifyClient: ({ origin }) => !origin || config.corsOrigins.includes(origin) || config.nodeEnv !== 'production',
  });

  wss.on('connection', (ws) => {
    let session = null;
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    const authTimer = setTimeout(() => ws.close(4001, 'Sign in required'), AUTH_TIMEOUT_MS);

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return ws.close(4002, 'Invalid message');
      }
      try {
        if (!session) {
          if (msg?.type !== 'auth' || typeof msg.token !== 'string') return ws.close(4001, 'Sign in required');
          const user = await userFromToken(msg.token);
          if (!user) return ws.close(4001, 'Sign in required');
          clearTimeout(authTimer);
          session = { userId: user.id, isListener: await isActiveListener(user.id) };
          const previous = sockets.get(user.id);
          sockets.set(user.id, ws);
          if (previous && previous !== ws) previous.close(4000, 'Replaced by a newer connection');
          ws.send(JSON.stringify({ type: 'ready', role: session.isListener ? 'listener' : 'caller' }));
          await coordinator.reconnected(user.id);
          return;
        }
        await handle(session, msg);
      } catch (err) {
        console.error('Call socket error', err);
        if (session) deliver(session.userId, { type: 'error', code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (session && sockets.get(session.userId) === ws) {
        sockets.delete(session.userId);
        coordinator.disconnected(session.userId).catch((err) => console.error('Call disconnect error', err));
      }
    });
  });

  // Ping every client; drop sockets that stopped answering (dead mobile connections).
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(heartbeat));
  return wss;
}
