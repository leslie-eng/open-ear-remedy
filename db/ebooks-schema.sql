CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  author TEXT,
  brand TEXT,
  description TEXT NOT NULL,
  short_description TEXT NOT NULL,
  category TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('digital', 'physical', 'service')),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  cover_image_url TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Digital product fields
  file_url TEXT,
  file_format TEXT CHECK (file_format IN ('PDF', 'EPUB', 'ZIP', 'MP3', 'MP4', 'OTHER')),
  file_size BIGINT DEFAULT 0 CHECK (file_size >= 0),
  sample_url TEXT,
  publication_date DATE,
  isbn TEXT,

  -- Physical product fields
  sku TEXT,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  weight_grams INTEGER CHECK (weight_grams >= 0),
  dimensions_cm JSONB,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  colors JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Flexible extension point for custom fields
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_publication_date ON products(publication_date);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_set_updated_at ON products;
CREATE TRIGGER trigger_products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Backward-compatibility view for ebook-only consumers.
CREATE OR REPLACE VIEW ebooks AS
SELECT
  id,
  title,
  COALESCE(author, attributes->>'author', '') AS author,
  description,
  short_description,
  price,
  category,
  cover_image_url,
  file_url,
  COALESCE(file_format, 'PDF') AS file_format,
  file_size,
  publication_date,
  isbn,
  sample_url AS sample_pages_url,
  is_active,
  created_at,
  updated_at
FROM products
WHERE product_type = 'digital';
