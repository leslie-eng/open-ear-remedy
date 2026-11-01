import http from 'node:http';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { testDatabaseUrl } from './test-env.js';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';

/** Stands in for Google: publishes a signing key, and signs ID tokens with it. */
async function startFakeGoogle() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((r) => server.listen(0, r));
  return {
    jwksUrl: `http://127.0.0.1:${server.address().port}/certs`,
    close: () => server.close(),
    /** A Google ID token; override any claim, or sign with another key. */
    async idToken(claims = {}, { key = privateKey, expiresIn = '1h' } = {}) {
      return new SignJWT({ email_verified: true, name: 'Amani Otieno', ...claims })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer('https://accounts.google.com')
        .setAudience(CLIENT_ID)
        .setSubject(claims.sub ?? 'google-sub-1')
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(key);
    },
  };
}

describe.skipIf(!testDatabaseUrl())('Sign in with Google', () => {
  let google;
  let server;
  let baseUrl;
  let query;
  let resetData;

  beforeAll(async () => {
    google = await startFakeGoogle();
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_JWKS_URL = google.jwksUrl;
    const { app } = await import('../src/app.js');
    ({ query } = await import('../src/db.js'));
    ({ resetData } = await import('./db.js'));
    server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => {
    server?.close();
    google?.close();
  });
  beforeEach(() => resetData());

  const signIn = (credential) =>
    fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

  const me = async (accessToken) =>
    (await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })).json();

  it('creates a verified account for someone new and signs them in', async () => {
    const res = await signIn(await google.idToken({ email: 'Amani@Example.com' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ email: 'amani@example.com', user_metadata: { full_name: 'Amani Otieno' } });
    expect(body.user.email_confirmed_at).toBeTruthy();
    expect((await me(body.access_token)).user.email).toBe('amani@example.com');
  });

  it('signs into the existing account with the same email, and marks it verified', async () => {
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ('amani@example.com', 'x', 'Amani') RETURNING id`,
    );
    const body = await (await signIn(await google.idToken({ email: 'amani@example.com' }))).json();

    expect(body.user.id).toBe(rows[0].id);
    expect(body.user.email_confirmed_at).toBeTruthy();
  });

  it("cancels the unconfirmed password of an unverified account it takes over", async () => {
    // Someone signed up with this email but never confirmed it; the password they chose must not
    // start working once Google proves who really owns the address.
    const bcrypt = (await import('bcryptjs')).default;
    await query(`INSERT INTO users (email, password_hash) VALUES ('amani@example.com', $1)`, [await bcrypt.hash('squatter-pw', 4)]);
    await signIn(await google.idToken({ email: 'amani@example.com' }));

    const res = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'amani@example.com', password: 'squatter-pw' }),
    });
    expect(res.status).toBe(401);
  });

  it('recognises a returning Google account even after its email changed', async () => {
    const first = await (await signIn(await google.idToken({ sub: 'g-42', email: 'old@example.com' }))).json();
    const again = await (await signIn(await google.idToken({ sub: 'g-42', email: 'new@example.com' }))).json();

    expect(again.user.id).toBe(first.user.id);
  });

  it.each([
    ['meant for another app', { aud: 'someone-else.apps.googleusercontent.com' }, {}],
    ['expired', {}, { expiresIn: '-1m' }],
    ['for an email Google has not verified', { email_verified: false }, {}],
  ])('refuses a token %s', async (_label, claims, options) => {
    const token =
      'aud' in claims
        ? await new SignJWT({ email: 'amani@example.com', email_verified: true })
            .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
            .setIssuer('https://accounts.google.com')
            .setAudience(claims.aud)
            .setSubject('google-sub-1')
            .setExpirationTime('1h')
            .sign((await generateKeyPair('RS256')).privateKey)
        : await google.idToken({ email: 'amani@example.com', ...claims }, options);
    const res = await signIn(token);

    expect(res.status).toBe(401);
    const { rows } = await query(`SELECT 1 FROM users WHERE email = 'amani@example.com'`);
    expect(rows).toHaveLength(0);
  });

  it('refuses a token not signed by Google', async () => {
    const { privateKey: forger } = await generateKeyPair('RS256');
    const res = await signIn(await google.idToken({ email: 'amani@example.com' }, { key: forger }));
    expect(res.status).toBe(401);
  });

  it('lets someone who only uses Google delete their account without a password', async () => {
    const { access_token } = await (await signIn(await google.idToken({ email: 'amani@example.com' }))).json();
    const res = await fetch(`${baseUrl}/api/user/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
      body: JSON.stringify({ confirm: 'amani@example.com' }),
    });

    expect(res.status).toBeLessThan(300);
    const { rows } = await query(`SELECT 1 FROM users WHERE email = 'amani@example.com'`);
    expect(rows).toHaveLength(0);
  });
});
