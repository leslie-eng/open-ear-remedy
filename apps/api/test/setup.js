import { testDatabaseUrl } from './test-env.js';

// Point the app's pool at the test database before any app module reads its config.
const url = testDatabaseUrl();
if (url) {
  process.env.DATABASE_URL = url;
  process.env.DATABASE_URL_UNPOOLED = url;
}

// Never use real payment keys in tests: a fixed webhook secret signs the test payloads,
// and no Paystack API key is set, so nothing can reach Paystack.
process.env.PAYSTACK_WEBHOOK_SECRET = 'whsec_test_open_ear_webhook_secret';
process.env.PAYSTACK_SECRET_KEY = '';

// Likewise no real OpenRouter key: the chat tests point the app at a local fake provider.
process.env.OPENROUTER_API_KEY = '';
