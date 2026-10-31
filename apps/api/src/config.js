import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Local dev: apps/api/.env wins, then the repo-root .env. On Render, real env vars win over both.
dotenv.config({ path: [path.join(__dirname, '..', '.env'), path.join(__dirname, '..', '..', '..', '.env')], quiet: true });

function r2Config() {
  const r2 = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicBucket: process.env.R2_PUBLIC_BUCKET,
    privateBucket: process.env.R2_PRIVATE_BUCKET,
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  };
  const missing = Object.entries(r2).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length === Object.keys(r2).length) return null; // not configured: use local disk
  if (missing.length) throw new Error(`Incomplete R2 config, missing: ${missing.join(', ')}`);
  return r2;
}

const DEFAULT_JWT_SECRET = 'dev-secret-change-in-production';
const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || '';

if (nodeEnv === 'production' && (jwtSecret.length < 32 || jwtSecret === DEFAULT_JWT_SECRET)) {
  // Refuse to start: a missing/weak secret lets anyone forge login tokens.
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production');
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || '',
  // Neon: migrations should use the direct (non-pooled) connection string when available.
  migrationDatabaseUrl: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '',
  dbPoolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  jwtSecret: jwtSecret || DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, ''),
  // Public base URL of this API (for links to uploaded covers). Same as CLIENT_URL when /api is proxied on the site's domain.
  publicApiUrl: (process.env.PUBLIC_API_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Open Ear <noreply@openearemedy.com>',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  // Optional comma list of allowed dialing prefixes for outbound calls, e.g. "+233,+234,+1".
  callAllowedPrefixes: (process.env.CALL_ALLOWED_PREFIXES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Number of reverse proxies in front of the app (LiteSpeed/Apache on cPanel, Render's LB).
  trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),
  // Local-disk storage for development; production uses Cloudflare R2 when R2_* vars are set.
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')),
  r2: r2Config(),
};
