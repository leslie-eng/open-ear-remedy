import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

/**
 * The tests wipe every table, so they only ever run against a database whose name contains
 * "test" (e.g. a Neon branch called test, or a local openear_test). Returns null to skip.
 */
export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  const name = new URL(url).pathname.slice(1);
  if (!/test/i.test(name)) {
    throw new Error(`TEST_DATABASE_URL must point at a database whose name contains "test" (got "${name}")`);
  }
  return url;
}
