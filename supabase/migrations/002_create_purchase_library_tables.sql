-- Migration: Create purchase and library database tables
-- Task: 1.3 Create purchase and library database tables  
-- Requirements: 4.5, 5.1, 6.1

-- Create ebook_purchases table for transaction records
CREATE TABLE ebook_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE RESTRICT,
  stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
  amount_paid DECIMAL(10,2) NOT NULL CHECK (amount_paid >= 0),
  purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_ebook_library table for owned content tracking
CREATE TABLE user_ebook_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ebook_id UUID NOT NULL REFERENCES ebooks(id) ON DELETE RESTRICT,
  purchase_id UUID NOT NULL REFERENCES ebook_purchases(id) ON DELETE RESTRICT,
  download_count INTEGER DEFAULT 0 CHECK (download_count >= 0),
  last_downloaded TIMESTAMP WITH TIME ZONE,
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique ownership per user per ebook
  UNIQUE(user_id, ebook_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_purchases_user ON ebook_purchases(user_id);
CREATE INDEX idx_purchases_status ON ebook_purchases(status);
CREATE INDEX idx_purchases_date ON ebook_purchases(purchase_date);
CREATE INDEX idx_purchases_stripe_id ON ebook_purchases(stripe_payment_intent_id);

CREATE INDEX idx_library_user ON user_ebook_library(user_id);
CREATE INDEX idx_library_ebook ON user_ebook_library(ebook_id);
CREATE INDEX idx_library_purchase ON user_ebook_library(purchase_id);
CREATE INDEX idx_library_added_date ON user_ebook_library(added_date);

-- Create trigger to automatically update updated_at on purchases table
CREATE TRIGGER update_purchases_updated_at 
  BEFORE UPDATE ON ebook_purchases 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ebook_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ebook_library ENABLE ROW LEVEL SECURITY;

-- Create policies for user access to their own purchases
CREATE POLICY "Users can view their own purchases" ON ebook_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their own library" ON user_ebook_library
  FOR SELECT USING (user_id = auth.uid());

-- Admin policies for managing purchases and library
CREATE POLICY "Admins can manage all purchases" ON ebook_purchases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY "Admins can manage all library entries" ON user_ebook_library
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- Service role policies for backend operations (purchases and library management)
CREATE POLICY "Service role can manage purchases" ON ebook_purchases
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage library" ON user_ebook_library
  FOR ALL USING (auth.role() = 'service_role');