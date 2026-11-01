import { config } from '../config.js';

/** Matches the vector(1536) column; text-embedding-3 models can shorten to this size on request. */
export const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 64;

/** Embeds texts through OpenRouter, in order. */
export async function embed(texts) {
  if (!config.openRouterApiKey) throw new Error('OPENROUTER_API_KEY is not set');
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const res = await fetch(`${config.openRouterBaseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openRouterApiKey}` },
      body: JSON.stringify({
        model: config.openRouterEmbeddingModel,
        input: texts.slice(i, i + BATCH_SIZE),
        dimensions: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`OpenRouter embeddings error (${res.status}): ${await res.text()}`);
    const { data } = await res.json();
    for (const item of [...data].sort((a, b) => a.index - b.index)) {
      if (item.embedding?.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Embedding model returned ${item.embedding?.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`);
      }
      vectors.push(item.embedding);
    }
  }
  return vectors;
}

/** pgvector's text form: '[0.1,0.2,...]'. */
export const toVector = (embedding) => `[${embedding.join(',')}]`;
