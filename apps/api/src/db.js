import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

/**
 * Neon notes: use the pooled connection string (host contains "-pooler") with
 * sslmode=verify-full. Neon closes idle connections, so keep the pool small,
 * recycle idle clients, and never let a dropped idle client crash the process.
 */
export const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      max: config.dbPoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    })
  : null;

pool?.on('error', (err) => {
  console.error('Postgres idle client error (connection will be replaced):', err.message);
});

export async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  return pool.query(text, params);
}
