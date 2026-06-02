import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

const connString = process.env.DATABASE_URL || '';
const inputPathArg = process.argv[2];
const inputPath = inputPathArg
  ? path.resolve(process.cwd(), inputPathArg)
  : path.resolve(process.cwd(), 'data', 'admin-ebooks.json');

if (!connString) {
  console.error('Missing DATABASE_URL environment variable.');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  console.error('Pass a JSON file path as argument or create data/admin-ebooks.json');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf-8');
let ebooks;
try {
  ebooks = JSON.parse(raw);
  if (!Array.isArray(ebooks)) throw new Error('JSON root is not an array');
} catch (error) {
  console.error(`Invalid JSON in ${inputPath}:`, error.message);
  process.exit(1);
}

const client = new Client({ connectionString: connString });

const upsertSql = `
INSERT INTO products (
  id, title, author, description, short_description, price, category, product_type,
  cover_image_url, file_url, file_format, file_size, publication_date,
  isbn, sample_url, is_active, attributes
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, 'digital',
  $8, $9, $10, $11, $12,
  $13, $14, $15, $16
)
ON CONFLICT (id)
DO UPDATE SET
  title = EXCLUDED.title,
  author = EXCLUDED.author,
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  cover_image_url = EXCLUDED.cover_image_url,
  file_url = EXCLUDED.file_url,
  file_format = EXCLUDED.file_format,
  file_size = EXCLUDED.file_size,
  publication_date = EXCLUDED.publication_date,
  isbn = EXCLUDED.isbn,
  sample_url = EXCLUDED.sample_url,
  is_active = EXCLUDED.is_active,
  attributes = EXCLUDED.attributes
`;

function normalizeEbook(item) {
  return {
    id: String(item.id),
    title: String(item.title || '').trim(),
    author: String(item.author || '').trim(),
    description: String(item.description || '').trim(),
    short_description: String(item.short_description || '').trim(),
    price: Number(item.price || 0),
    category: String(item.category || 'mental-wellness'),
    cover_image_url: item.cover_image_url ? String(item.cover_image_url) : null,
    file_url: String(item.file_url || '').trim(),
    file_format: item.file_format === 'EPUB' ? 'EPUB' : 'PDF',
    file_size: Number(item.file_size || 0),
    publication_date: item.publication_date ? String(item.publication_date) : null,
    isbn: item.isbn ? String(item.isbn) : null,
    sample_pages_url: item.sample_pages_url ? String(item.sample_pages_url) : null,
    is_active: item.is_active !== false,
    attributes: {
      source: 'ebook-migration',
      original_type: 'ebook',
    },
  };
}

async function run() {
  await client.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.query('BEGIN');

    for (const row of ebooks) {
      const e = normalizeEbook(row);
      if (!e.id || !e.title || !e.author || !e.description || !e.short_description || !e.file_url) {
        skipped += 1;
        continue;
      }

      await client.query(upsertSql, [
        e.id,
        e.title,
        e.author,
        e.description,
        e.short_description,
        e.price,
        e.category,
        e.cover_image_url,
        e.file_url,
        e.file_format,
        e.file_size,
        e.publication_date,
        e.isbn,
        e.sample_pages_url,
        e.is_active,
        JSON.stringify(e.attributes),
      ]);
      inserted += 1;
    }

    await client.query('COMMIT');
    console.log(`Migration complete. Upserted ${inserted} ebook(s), skipped ${skipped}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
