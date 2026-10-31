import { config } from '../config.js';

/**
 * ICE servers for a call. Production: short-lived Cloudflare TURN credentials with
 * relay-only transport, so neither side ever learns the other's IP address.
 * Development without TURN keys: public STUN only (direct connections, fine for two local tabs).
 */
const CREDENTIAL_TTL_SECONDS = 2 * 60 * 60;

export function turnConfigured() {
  return Boolean(config.turnKeyId && config.turnApiToken);
}

export async function iceConfig() {
  if (!turnConfigured()) {
    if (config.nodeEnv === 'production') {
      const err = new Error('Calls are not available right now.');
      err.status = 503;
      err.expose = true;
      throw err;
    }
    return { iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }], iceTransportPolicy: 'all' };
  }

  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(config.turnKeyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.turnApiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
    },
  );
  if (!res.ok) throw new Error(`Cloudflare TURN error ${res.status}: ${await res.text()}`);
  const { iceServers } = await res.json();
  // Browsers block port 53, so those URLs would only time out.
  const usable = iceServers
    .map((server) => ({ ...server, urls: [].concat(server.urls).filter((url) => !/:53(\?|$)/.test(url)) }))
    .filter((server) => server.urls.length > 0);
  return { iceServers: usable, iceTransportPolicy: 'relay' };
}
