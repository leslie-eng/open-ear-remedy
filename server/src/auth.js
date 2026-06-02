import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { config } from './config.js';
import { query } from './db.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

export function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, email, full_name, email_verified_at, created_at FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash, full_name, email_verified_at, created_at FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  return rows[0] || null;
}

export async function ensureUserCredits(userId) {
  const { rows } = await query(
    `INSERT INTO user_credits (user_id, credits)
     VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId],
  );
  if (rows[0]) return rows[0];
  const existing = await query(`SELECT * FROM user_credits WHERE user_id = $1`, [userId]);
  return existing.rows[0];
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: { full_name: user.full_name || '' },
    email_confirmed_at: user.email_verified_at,
    created_at: user.created_at,
  };
}
