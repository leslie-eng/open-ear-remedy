import pg from 'pg';
import { testDatabaseUrl } from './test-env.js';
import { runMigrations } from '../src/migrate.js';

/** Rebuilds the test database from the migrations once per run, so the migrations are tested too. */
export default async function setup() {
  const url = testDatabaseUrl();
  if (!url) {
    console.warn('\n  TEST_DATABASE_URL is not set: database tests will be skipped.\n');
    return;
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await client.end();
  await runMigrations(url, { log: () => {} });
}
