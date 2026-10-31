import { testDatabaseUrl } from './test-env.js';

// Point the app's pool at the test database before any app module reads its config.
const url = testDatabaseUrl();
if (url) {
  process.env.DATABASE_URL = url;
  process.env.DATABASE_URL_UNPOOLED = url;
}
