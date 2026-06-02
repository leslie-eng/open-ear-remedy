import { Router } from 'express';
import { query } from '../db.js';
import { config } from '../config.js';
import {
  comparePassword,
  ensureUserCredits,
  findUserByEmail,
  generateOtp,
  generateToken,
  hashPassword,
  publicUser,
  signToken,
  verifyToken,
} from '../auth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../email.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = verifyToken(token);
      const { rows } = await query(
        `SELECT id, email, full_name, email_verified_at, created_at FROM users WHERE id = $1`,
        [payload.sub],
      );
      const user = rows[0];
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      return res.json({ user: publicUser(user) });
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }),
);

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const fullName = String(req.body.fullName || req.body.full_name || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await findUserByEmail(email);
    if (existing?.email_verified_at) {
      return res.status(400).json({ error: 'User already registered' });
    }

    const passwordHash = await hashPassword(password);
    let userId;

    if (existing) {
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
    await query(`DELETE FROM verification_tokens WHERE email = $1 AND type = 'signup'`, [email]);
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
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const user = await findUserByEmail(email);
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
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || req.body.code || '').replace(/\s+/g, '');
    const type = req.body.type === 'signup' ? 'signup' : 'email';

    const { rows } = await query(
      `SELECT * FROM verification_tokens
       WHERE email = $1 AND token = $2 AND type = $3 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, token, type],
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
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
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const user = await findUserByEmail(email);
    if (!user) {
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
  asyncHandler(async (req, res) => {
    const token = String(req.query.token || '');
    const { rows } = await query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );
    res.json({ valid: Boolean(rows[0]) });
  }),
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const token = String(req.body.token || '');
    const password = req.body.password;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const { rows } = await query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
      [token],
    );
    if (!rows[0]) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const passwordHash = await hashPassword(password);
    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
      passwordHash,
      rows[0].user_id,
    ]);
    await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [rows[0].id]);
    res.json({ message: 'Password updated' });
  }),
);

router.patch(
  '/password',
  asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!bearer) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const payload = verifyToken(bearer);
      const password = req.body.password;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const passwordHash = await hashPassword(password);
      await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
        passwordHash,
        payload.sub,
      ]);
      res.json({ message: 'Password updated' });
    } catch (e) {
      next(e);
    }
  }),
);

export default router;
