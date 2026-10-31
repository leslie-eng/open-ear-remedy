import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

/**
 * Applies db/migrations/NNNN_name.sql files in order, each exactly once, recording them in
 * schema_migrations. Each file runs in its own transaction under a transaction-scoped advisory
 * lock, so two deploys can't migrate at once (and it works through Neon's pooler).
 * Never edit a migration that has shipped: add a new file instead.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const LOCK_ID = 727274; // arbitrary, unique to Open Ear migrations

async function main() {
  if (!config.migrationDatabaseUrl) {
    console.error('Set DATABASE_URL (and ideally DATABASE_URL_UNPOOLED) before migrating.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: config.migrationDatabaseUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{4}_[\w-]+\.sql$/.test(f))
      .sort();

    let applied = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      await client.query('BEGIN');
      try {
        await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID]);
        const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
        if (rowCount) {
          await client.query('COMMIT');
          continue;
        }
        await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        applied += 1;
        console.log(`Applied ${version}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${version} failed: ${err.message}`);
      }
    }
    console.log(applied ? `Done: ${applied} migration(s) applied.` : 'Database is up to date.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
