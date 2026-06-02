-- Migration: Create ebook catalog database tables
-- Task: 1.1 Create ebook catalog database tables
-- Requirements: 7.1, 7.3, 1.2

-- Create ebook_categories table first (referenced by ebooks table)
CREATE TABLE ebook_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined categories as specified in requirements
INSERT INTO ebook_categories (name, description, display_order) VALUES
('Mental Wellness', 'Books focused on overall mental health and wellness', 1),
('Self-Help', 'Practical guides for personal development', 2),
('Anxiety Management', 'Resources for understanding and managing anxiety', 3),
('Depression Support', 'Materials for coping with depression', 4),
('Mindfulness', 'Meditation and mindfulness practices', 5),
('Relationships', 'Building healthy relationships and communication', 6);

-- Create ebooks table with all required fields and constraints
CREATE TABLE ebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100) NOT NULL,
  cover_image_url TEXT,
  file_url TEXT NOT NULL,
  file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('PDF', 'EPUB')),
  file_size BIGINT CHECK (file_size > 0),
  publication_date DATE,
  isbn VARCHAR(20),
  sample_pages_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint to ensure valid categories
  CONSTRAINT fk_ebook_category 
    FOREIGN KEY (category) 
    REFERENCES ebook_categories(name) 
    ON UPDATE CASCADE
);

-- Create indexes for efficient querying as specified in design
CREATE INDEX idx_ebooks_category ON ebooks(category);
CREATE INDEX idx_ebooks_price ON ebooks(price);
CREATE INDEX idx_ebooks_active ON ebooks(is_active);
CREATE INDEX idx_ebooks_title ON ebooks(title);
CREATE INDEX idx_ebooks_author ON ebooks(author);
CREATE INDEX idx_ebooks_publication_date ON ebooks(publication_date);

-- Create index for full-text search on title, author, and description
CREATE INDEX idx_ebooks_search ON ebooks USING gin(
  to_tsvector('english', title || ' ' || author || ' ' || COALESCE(description, ''))
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on ebooks table
CREATE TRIGGER update_ebooks_updated_at 
  BEFORE UPDATE ON ebooks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for security
ALTER TABLE ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebook_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to active ebooks
CREATE POLICY "Public can view active ebooks" ON ebooks
  FOR SELECT USING (is_active = true);

-- Create policies for public read access to active categories
CREATE POLICY "Public can view active categories" ON ebook_categories
  FOR SELECT USING (is_active = true);

-- Admin policies (will be refined based on admin role implementation)
CREATE POLICY "Admins can manage ebooks" ON ebooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY "Admins can manage categories" ON ebook_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );