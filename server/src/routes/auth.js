import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import {
  bearerToken,
  comparePassword,
  ensureUserCredits,
  findUserByEmail,
  generateOtp,
  generateToken,
  hashPassword,
  publicUser,
  signToken,
  userFromToken,
} from '../auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../email.js';
import { asyncHandler } from '../middleware.js';
import { isValidEmail, rateLimit } from '../util.js';

const router = Router();

const MAX_OTP_ATTEMPTS = 5;
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 128;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function passwordError(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters`;
  }
  if (password.length > MAX_PASSWORD) return `Password must be at most ${MAX_PASSWORD} characters`;
  return null;
}

const MINUTE = 60 * 1000;
const byIp = (req) => req.ip;
const byEmail = (req) => normalizeEmail(req.body?.email) || req.ip;
// Anything that sends email: stops mail-bombing and email-provider quota abuse.
const emailSendIpLimit = rateLimit({ windowMs: 60 * MINUTE, max: 20, key: byIp });
const emailSendAddrLimit = rateLimit({ windowMs: 60 * MINUTE, max: 5, key: byEmail });
const signinIpLimit = rateLimit({ windowMs: 15 * MINUTE, max: 50, key: byIp });
const signinAddrLimit = rateLimit({ windowMs: 15 * MINUTE, max: 10, key: byEmail });
const verifyLimit = rateLimit({ windowMs: 15 * MINUTE, max: 20, key: byIp });
const resetLimit = rateLimit({ windowMs: 15 * MINUTE, max: 20, key: byIp });

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await userFromToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ user: publicUser(user) });
  }),
);

router.post(
  '/signup',
  emailSendIpLimit,
  emailSendAddrLimit,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const fullName = String(req.body.fullName || req.body.full_name || '').trim().slice(0, 100);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await findUserByEmail(email);
    if (existing?.email_verified_at) {
      return res.status(400).json({ error: 'User already registered' });
    }

    const passwordHash = await hashPassword(password);
    let userId;

    if (existing) {
      // Unverified account: the new password only takes effect once the emailed code is entered.
      userId = existing.id;
      await query(
        `UPDATE users SET password_hash = $1, full_name = $2, updated_at = NOW() WHERE id = $3`,
        [passwordHash, fullName, userId],
      );
    } else {
      const { rows } = await query(
        `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id`,
        [email, passwordHash, fullName],
      );
      userId = rows[0].id;
      await ensureUserCredits(userId);
    }

    const code = generateOtp();
    await query(`DELETE FROM verification_tokens WHERE email = $1`, [email]);
    await query(
      `INSERT INTO verification_tokens (email, token, type, expires_at) VALUES ($1, $2, 'signup', NOW() + INTERVAL '15 minutes')`,
      [email, code],
    );
    await sendVerificationEmail(email, code);

    res.json({ message: 'Verification code sent', needsVerification: true });
  }),
);

router.post(
  '/signin',
  signinIpLimit,
  signinAddrLimit,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const user = email ? await findUserByEmail(email) : null;
    if (!user || !(await comparePassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid login credentials' });
    }
    if (!user.email_verified_at) {
      return res.status(403).json({ error: 'Email not confirmed' });
    }
    const access_token = signToken(user);
    res.json({
      user: publicUser(user),
      session: { access_token },
      access_token,
    });
  }),
);

router.post(
  '/verify-otp',
  verifyLimit,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || req.body.code || '').replace(/\s+/g, '');

    // Only one live code exists per email (older ones are deleted whenever a new one is sent),
    // so wrong guesses are counted against it and it is burned after MAX_OTP_ATTEMPTS.
    const { rows } = await query(
      `SELECT * FROM verification_tokens
       WHERE email = $1 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email],
    );
    const live = rows[0];
    if (!live || live.attempts >= MAX_OTP_ATTEMPTS) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired verification code. Please request a new one.' });
    }
    if (live.token !== token) {
      await query(`UPDATE verification_tokens SET attempts = attempts + 1 WHERE id = $1`, [live.id]);
      const left = MAX_OTP_ATTEMPTS - live.attempts - 1;
      return res.status(400).json({
        error:
          left > 0
            ? `Invalid verification code. ${left} attempt${left === 1 ? '' : 's'} left.`
            : 'Too many wrong attempts. Please request a new code.',
      });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    await query(`UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`, [
      user.id,
    ]);
    await query(`DELETE FROM verification_tokens WHERE email = $1`, [email]);
    await ensureUserCredits(user.id);

    const verified = await findUserByEmail(email);
    const access_token = signToken(verified);
    res.json({
      user: publicUser(verified),
      session: { access_token },
      access_token,
    });
  }),
);

router.post(
  '/resend-otp',
  emailSendIpLimit,
  emailSendAddrLimit,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);
    if (!user || user.email_verified_at) {
      return res.json({ message: 'If the account exists, a code was sent' });
    }
    const code = generateOtp();
    await query(`DELETE FROM verification_tokens WHERE email = $1`, [email]);
    await query(
      `INSERT INTO verification_tokens (email, token, type, expires_at) VALUES ($1, $2, 'signup', NOW() + INTERVAL '15 minutes')`,
      [email, code],
    );
    await sendVerificationEmail(email, code);
    res.json({ message: 'Verification code resent' });
  }),
);

router.post(
  '/forgot-password',
  emailSendIpLimit,
  emailSendAddrLimit,
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);
    if (user) {
      const token = generateToken();
      await query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`, [
        user.id,
      ]);
      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [user.id, token],
      );
      const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
    res.json({ message: 'If the account exists, a reset link was sent' });
  }),
);

router.get(
  '/reset-password/validate',
  resetLimit,
  asyncHandler(async (req, res) => {
    const token = String(req.query.token || '');
    const { rows } = await query(
      `SELECT id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );
    res.json({ valid: Boolean(rows[0]) });
  }),
);

router.post(
  '/reset-password',
  resetLimit,
  asyncHandler(async (req, res) => {
    const token = String(req.body.token || '');
    const password = req.body.password;
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    // Claim the token atomically so it can't be redeemed twice concurrently.
    const { rows } = await query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
       RETURNING user_id`,
      [token],
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const passwordHash = await hashPassword(password);
    // Bumping token_version signs out every existing session.
    await query(
      `UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, rows[0].user_id],
    );
    res.json({ message: 'Password updated' });
  }),
);

router.patch(
  '/password',
  signinIpLimit,
  asyncHandler(async (req, res) => {
    const bearer = bearerToken(req);
    const sessionUser = bearer ? await userFromToken(bearer) : null;
    if (!sessionUser) return res.status(401).json({ error: 'Unauthorized' });

    const { currentPassword, password } = req.body;
    const pwErr = passwordError(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const user = await findUserByEmail(sessionUser.email);
    if (!(await comparePassword(currentPassword, user.password_hash))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW()
       WHERE id = $2 RETURNING id, email, token_version`,
      [passwordHash, user.id],
    );
    // Other sessions are now invalid; hand this one a fresh token.
    res.json({ message: 'Password updated', access_token: signToken(rows[0]) });
  }),
);

export default router;
