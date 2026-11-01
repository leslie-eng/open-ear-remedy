import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Local dev: apps/api/.env wins, then the repo-root .env. On Render, real env vars win over both.
dotenv.config({ path: [path.join(__dirname, '..', '.env'), path.join(__dirname, '..', '..', '..', '.env')], quiet: true });

function s3Config() {
  const required = {
    endpoint: (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/$/, ''),
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
  };
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length === Object.keys(required).length) return null; // not configured: use local disk
  if (missing.length) throw new Error(`Incomplete S3 storage config, missing: ${missing.join(', ')}`);
  return {
    ...required,
    region: process.env.AWS_REGION || 'auto',
    publicUrl: (process.env.S3_PUBLIC_URL || '').replace(/\/$/, ''),
  };
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
  // M-Pesa Express (Daraja STK Push). Sandbox by default; production: https://api.safaricom.co.ke
  daraja: {
    baseUrl: (process.env.DARAJA_BASE_URL || 'https://sandbox.safaricom.co.ke').trim().replace(/\/$/, ''),
    consumerKey: (process.env.DARAJA_CONSUMER_KEY || '').trim(),
    consumerSecret: (process.env.DARAJA_CONSUMER_SECRET || '').trim(),
    shortCode: (process.env.DARAJA_SHORT_CODE || '').trim(),
    passkey: (process.env.DARAJA_PASSKEY || '').trim(),
    // Paybill: CustomerPayBillOnline. Till (Buy Goods): CustomerBuyGoodsOnline, with DARAJA_TILL_NUMBER.
    transactionType: (process.env.DARAJA_TRANSACTION_TYPE || 'CustomerPayBillOnline').trim(),
    tillNumber: (process.env.DARAJA_TILL_NUMBER || '').trim(),
  },
  // AI chat through OpenRouter (OpenAI-compatible API). OPENROUTER_MODEL switches models without a code change.
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
  // AI Companion knowledge search (RAG). RAG_ENABLED=false is the kill switch.
  openRouterEmbeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small',
  ragEnabled: process.env.RAG_ENABLED !== 'false',
  // Cosine similarity a passage needs before the Companion is shown it (0-1). Tune with the review script.
  ragMinSimilarity: parseFloat(process.env.RAG_MIN_SIMILARITY || '0.35'),
  openRouterBaseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  // Cloudflare TURN relay for calls (Dashboard → Realtime → TURN). Required in production.
  turnKeyId: process.env.CLOUDFLARE_TURN_KEY_ID || '',
  turnApiToken: process.env.CLOUDFLARE_TURN_API_TOKEN || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  // Sign in with Google: the OAuth client ID (public). The client secret is not needed.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleJwksUrl: process.env.GOOGLE_JWKS_URL || 'https://www.googleapis.com/oauth2/v3/certs',
  // Number of reverse proxies in front of the app (LiteSpeed/Apache on cPanel, Render's LB).
  trustProxy: parseInt(process.env.TRUST_PROXY || '1', 10),
  // Local-disk storage for development; production uses S3-compatible storage (Neon) when configured.
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')),
  s3: s3Config(),
};
