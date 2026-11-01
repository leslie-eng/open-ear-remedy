-- 0006: knowledge sources the AI Companion can draw on (retrieval-augmented replies).

CREATE EXTENSION IF NOT EXISTS vector;

-- A book or document an admin added. Only approved AND enabled sources are ever searched.
-- licence and approved_by record that we may use it and who (a qualified professional) signed it off.
CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  author TEXT CHECK (char_length(author) <= 200),
  licence TEXT NOT NULL CHECK (char_length(licence) BETWEEN 1 AND 500),
  approved_by TEXT CHECK (char_length(approved_by) <= 200),
  approved_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- Set when the source is one of our own library ebooks.
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  file_name TEXT,
  passage_count INTEGER NOT NULL DEFAULT 0,
  -- The model that made this source's embeddings. Search skips sources whose model differs from
  -- OPENROUTER_EMBEDDING_MODEL: vectors from different models cannot be compared.
  embedding_model TEXT NOT NULL,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((approved_by IS NULL) = (approved_at IS NULL))
);

-- ~300-word passages with their embeddings (openai/text-embedding-3-small, 1536 dimensions).
CREATE TABLE knowledge_passages (
  id BIGSERIAL PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  UNIQUE (source_id, position)
);

CREATE INDEX idx_knowledge_passages_embedding ON knowledge_passages USING hnsw (embedding vector_cosine_ops);

-- Which sources informed a reply, and when. Never any chat text.
CREATE TABLE knowledge_usage (
  id BIGSERIAL PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_usage_source ON knowledge_usage(source_id, used_at);
