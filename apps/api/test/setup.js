import { testDatabaseUrl } from './test-env.js';

// Point the app's pool at the test database before any app module reads its config.
const url = testDatabaseUrl();
if (url) {
  process.env.DATABASE_URL = url;
  process.env.DATABASE_URL_UNPOOLED = url;
}

// Never use real payment keys in tests: without Daraja keys nothing can reach Safaricom.
// The M-Pesa tests point the app at a local fake Daraja instead.
for (const key of ['DARAJA_CONSUMER_KEY', 'DARAJA_CONSUMER_SECRET', 'DARAJA_PASSKEY', 'DARAJA_SHORT_CODE']) process.env[key] = '';

// Likewise no real OpenRouter key: the chat tests point the app at a local fake provider.
process.env.OPENROUTER_API_KEY = '';
