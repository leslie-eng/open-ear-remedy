import { config } from '../config.js';
import { query } from '../db.js';
import { withTransaction } from '../services/credits.js';
import { embed, toVector } from './embeddings.js';
import { KnowledgeError, extractText, splitIntoPassages } from './extract.js';

/**
 * Knowledge sources for the AI Companion: books and documents an admin adds, a qualified
 * professional approves, and an admin switches on. Only approved, switched-on sources are searched.
 */

export { KnowledgeError, SUPPORTED_EXTENSIONS } from './extract.js';

const SEARCH_LIMIT = 4;

const SOURCE_COLUMNS = `id, title, author, licence, approved_by, approved_at, enabled, product_id,
  file_name, passage_count, created_at`;

function toSource(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    licence: row.licence,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    enabled: row.enabled,
    productId: row.product_id,
    fileName: row.file_name,
    passageCount: row.passage_count,
    createdAt: row.created_at,
  };
}

/** Reads, splits and indexes a file. The new source starts unapproved and switched off. */
export async function addSource({ title, author = null, licence, buffer, ext, fileName = null, productId = null, addedBy = null }) {
  const passages = splitIntoPassages(await extractText(buffer, ext));
  const embeddings = await embed(passages);

  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO knowledge_sources (title, author, licence, file_name, product_id, added_by, passage_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${SOURCE_COLUMNS}`,
      [title, author, licence, fileName, productId, addedBy, passages.length],
    );
    const sourceId = rows[0].id;
    await client.query(
      `INSERT INTO knowledge_passages (source_id, position, content, embedding)
       SELECT $1, p.position, p.content, p.embedding::vector
       FROM unnest($2::int[], $3::text[], $4::text[]) AS p(position, content, embedding)`,
      [sourceId, passages.map((_, i) => i), passages, embeddings.map(toVector)],
    );
    return toSource(rows[0]);
  });
}

export async function approveSource(id, approvedBy) {
  const { rows } = await query(
    `UPDATE knowledge_sources SET approved_by = $2, approved_at = NOW() WHERE id = $1 RETURNING ${SOURCE_COLUMNS}`,
    [id, approvedBy],
  );
  if (!rows[0]) throw new KnowledgeError('NOT_FOUND', 'Source not found', 404);
  return toSource(rows[0]);
}

export async function setSourceEnabled(id, enabled) {
  const { rows } = await query(
    `UPDATE knowledge_sources SET enabled = $2
     WHERE id = $1 AND (NOT $2 OR approved_at IS NOT NULL)
     RETURNING ${SOURCE_COLUMNS}`,
    [id, enabled],
  );
  if (rows[0]) return toSource(rows[0]);
  const exists = await query('SELECT 1 FROM knowledge_sources WHERE id = $1', [id]);
  if (!exists.rowCount) throw new KnowledgeError('NOT_FOUND', 'Source not found', 404);
  throw new KnowledgeError('NOT_APPROVED', 'A qualified professional must approve this source before it can be switched on.');
}

export async function listSources() {
  const { rows } = await query(
    `SELECT ${SOURCE_COLUMNS},
       (SELECT COUNT(*)::int FROM knowledge_usage u WHERE u.source_id = s.id AND u.used_at > NOW() - INTERVAL '30 days') AS uses_last_30_days
     FROM knowledge_sources s ORDER BY created_at DESC`,
  );
  return rows.map((row) => ({ ...toSource(row), usesLast30Days: row.uses_last_30_days }));
}

export async function deleteSource(id) {
  await query('DELETE FROM knowledge_sources WHERE id = $1', [id]);
}

/** The closest passages from approved, switched-on sources, best first; empty when nothing is close enough. */
export async function search(question) {
  const [embedding] = await embed([question]);
  const { rows } = await query(
    `SELECT s.id AS source_id, s.title, s.author, p.content, 1 - (p.embedding <=> $1::vector) AS similarity
     FROM knowledge_passages p
     JOIN knowledge_sources s ON s.id = p.source_id
     WHERE s.enabled AND s.approved_at IS NOT NULL
       AND 1 - (p.embedding <=> $1::vector) >= $2
     ORDER BY p.embedding <=> $1::vector
     LIMIT $3`,
    [toVector(embedding), config.ragMinSimilarity, SEARCH_LIMIT],
  );
  return rows.map((r) => ({ sourceId: r.source_id, title: r.title, author: r.author, content: r.content, similarity: r.similarity }));
}

/** Records which sources informed a reply. Never any chat text. */
export async function recordUsage(sourceIds) {
  const unique = [...new Set(sourceIds)];
  if (unique.length) await query('INSERT INTO knowledge_usage (source_id) SELECT unnest($1::uuid[])', [unique]);
}
