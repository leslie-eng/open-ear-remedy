import crypto from 'node:crypto';
import http from 'node:http';

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * A bag-of-words embedding: texts that share words point the same way, texts with no words
 * in common are orthogonal (similarity 0). Enough to make search results predictable.
 */
export function fakeEmbedding(text) {
  const v = new Array(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
    v[crypto.createHash('md5').update(word).digest().readUInt32BE(0) % EMBEDDING_DIMENSIONS] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/**
 * Stands in for OpenRouter's chat and embeddings APIs. Records every request.
 * Set `reply` to change the chat answer, `fail` to make every call return 500, or
 * `failEmbeddings` to fail only the embeddings calls.
 */
export async function startFakeOpenRouter() {
  const fake = { requests: [], reply: 'I hear you.', fail: false, failEmbeddings: false };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const parsed = JSON.parse(body);
      fake.requests.push({ url: req.url, auth: req.headers.authorization, body: parsed });
      if (fake.fail || (fake.failEmbeddings && req.url.endsWith('/embeddings'))) {
        res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"error":{"message":"upstream down"}}');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.endsWith('/embeddings')) {
        const inputs = [].concat(parsed.input);
        res.end(JSON.stringify({ data: inputs.map((t, index) => ({ index, embedding: fakeEmbedding(t) })) }));
      } else {
        res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: fake.reply } }] }));
      }
    });
  });
  await new Promise((r) => server.listen(0, r));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  return {
    fake,
    baseUrl,
    /** Requests to one endpoint, e.g. 'chat/completions' or 'embeddings'. */
    calls: (endpoint) => fake.requests.filter((r) => r.url.endsWith(`/${endpoint}`)),
    reset() {
      fake.requests = [];
      fake.fail = false;
      fake.failEmbeddings = false;
      fake.reply = 'I hear you.';
    },
    close: () => server.close(),
  };
}

/** Points the app at the fake before any app module reads its config. */
export function useFakeOpenRouter(baseUrl) {
  process.env.OPENROUTER_BASE_URL = baseUrl;
  process.env.OPENROUTER_API_KEY = 'sk-or-test';
  process.env.OPENROUTER_MODEL = 'test/model';
}
