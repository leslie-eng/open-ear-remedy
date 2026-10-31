import { testDatabaseUrl } from './test-env.js';
import { query } from '../src/db.js';

export const hasTestDatabase = Boolean(testDatabaseUrl());

/** Empties every table (keeps the schema), giving each test a clean slate. */
export async function resetData() {
  const { rows } = await query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`,
  );
  await query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

let counter = 0;
export async function createUser({ verified = true } = {}) {
  counter += 1;
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, email_verified_at)
     VALUES ($1, 'x', $2, $3) RETURNING id`,
    [`user${counter}@test.local`, `User ${counter}`, verified ? new Date() : null],
  );
  return rows[0].id;
}
