import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config.js';
import { query } from '../db.js';
import { ensureUserCredits } from '../auth.js';

/**
 * Sign in with Google. The website gets an ID token from Google's button; this checks Google
 * signed it for our app, then finds or creates the account. No client secret is involved.
 */

const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
let jwks;

export class GoogleSignInError extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
    this.expose = true;
  }
}

async function verifyIdToken(credential) {
  jwks ??= createRemoteJWKSet(new URL(config.googleJwksUrl));
  try {
    const { payload } = await jwtVerify(String(credential), jwks, { issuer: ISSUERS, audience: config.googleClientId });
    if (payload.email_verified !== true || typeof payload.email !== 'string' || !payload.sub) {
      throw new Error('email not verified');
    }
    return { sub: payload.sub, email: payload.email.trim().toLowerCase(), name: typeof payload.name === 'string' ? payload.name : null };
  } catch {
    throw new GoogleSignInError('Google sign-in failed. Please try again.');
  }
}

/** Returns the signed-in user row. */
export async function signInWithGoogle(credential) {
  const { sub, email, name } = await verifyIdToken(credential);

  // Recognise the Google account first (its email may have changed), then fall back to the email.
  const { rows } = await query(
    `SELECT * FROM users WHERE google_sub = $1
     UNION ALL
     SELECT * FROM users WHERE email = $2 AND (google_sub IS NULL OR google_sub = $1)
     LIMIT 1`,
    [sub, email],
  );
  let user = rows[0];

  if (user) {
    // Google has proved who owns this address. A password set on a never-verified account was
    // chosen by whoever signed up, possibly someone else, so it is cancelled.
    const updated = await query(
      `UPDATE users SET google_sub = $2,
         password_hash = CASE WHEN email_verified_at IS NULL THEN NULL ELSE password_hash END,
         email_verified_at = COALESCE(email_verified_at, NOW()),
         full_name = COALESCE(full_name, $3),
         updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [user.id, sub, name],
    );
    user = updated.rows[0];
  } else {
    const created = await query(
      `INSERT INTO users (email, full_name, google_sub, email_verified_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (email) DO NOTHING RETURNING *`,
      [email, name, sub],
    );
    // The address belongs to an account already linked to a different Google account.
    if (!created.rows[0]) throw new GoogleSignInError('This email is linked to a different Google account. Sign in with your password instead.');
    user = created.rows[0];
  }
  await ensureUserCredits(user.id);
  return user;
}
