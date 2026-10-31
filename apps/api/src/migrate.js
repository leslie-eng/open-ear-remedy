import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!pool) {
    console.error('Set DATABASE_URL in server/.env');
    process.exit(1);
  }
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Migration complete.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
