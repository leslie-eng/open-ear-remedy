import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
  emailFrom: process.env.EMAIL_FROM || 'Open Ear <noreply@openear.com>',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackWebhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  paystackCurrency: (process.env.PAYSTACK_CURRENCY || 'USD').trim().toUpperCase(),
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
  callMaxMinutes: parseInt(process.env.CALL_MAX_MINUTES || '60', 10),
  freeTrialCredits: parseInt(process.env.FREE_TRIAL_CREDITS || '50', 10),
  // Number of reverse proxies in front of the app (LiteSpeed/Apache on cPanel, Render's LB).
  trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')),
};
