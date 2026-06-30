-- Migration: Create credit system database tables
-- Task: 3.2 Implement credit system integration
-- Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

-- Create user_credits table for tracking user credit balances
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  phone_number VARCHAR(20), -- Optional phone number for user profile
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique credit record per user
  UNIQUE(user_id)
);

-- Create credit_transactions table for transaction history
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  credits INTEGER NOT NULL,
  amount DECIMAL(10,2), -- Amount in dollars (nullable for non-purchase transactions)
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending', 'refunded')),
  
  -- Paystack-specific fields
  paystack_reference VARCHAR(100), -- Paystack transaction reference
  paystack_transaction_id BIGINT, -- Paystack transaction ID
  
  -- Legacy Stripe fields (for backward compatibility)
  stripe_payment_intent_id VARCHAR(255), -- Stripe payment intent ID
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_user_credits_updated_at ON user_credits(updated_at);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_paystack_ref ON credit_transactions(paystack_reference);
CREATE INDEX idx_credit_transactions_paystack_id ON credit_transactions(paystack_transaction_id);
CREATE INDEX idx_credit_transactions_stripe_intent ON credit_transactions(stripe_payment_intent_id);

-- Create trigger to automatically update updated_at on user_credits table
CREATE TRIGGER update_user_credits_updated_at 
  BEFORE UPDATE ON user_credits 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update updated_at on credit_transactions table
CREATE TRIGGER update_credit_transactions_updated_at 
  BEFORE UPDATE ON credit_transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access to their own credits
CREATE POLICY "Users can view their own credits" ON user_credits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own credits profile" ON user_credits
  FOR UPDATE USING (user_id = auth.uid());

-- Create policies for user access to their own transactions
CREATE POLICY "Users can view their own transactions" ON credit_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Admin policies for managing credits and transactions
CREATE POLICY "Admins can manage all credits" ON user_credits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

CREATE POLICY "Admins can manage all transactions" ON credit_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email LIKE '%@admin.%'
    )
  );

-- Service role policies for backend operations (webhook processing)
CREATE POLICY "Service role can manage credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage transactions" ON credit_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Create function for atomic credit updates (used by webhook handlers)
CREATE OR REPLACE FUNCTION update_user_credits_atomic(
  p_user_id UUID,
  p_credits_to_add INTEGER,
  p_transaction_type VARCHAR(50),
  p_transaction_description TEXT,
  p_amount DECIMAL(10,2) DEFAULT NULL,
  p_paystack_reference VARCHAR(100) DEFAULT NULL,
  p_paystack_transaction_id BIGINT DEFAULT NULL,
  p_stripe_payment_intent_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
  v_transaction_id UUID;
  v_result JSON;
BEGIN
  -- Lock the user's credit record for update
  SELECT credits INTO v_current_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- If user doesn't have a credit record, create one
  IF v_current_credits IS NULL THEN
    INSERT INTO user_credits (user_id, credits, created_at, updated_at)
    VALUES (p_user_id, p_credits_to_add, NOW(), NOW())
    RETURNING credits INTO v_new_credits;
  ELSE
    -- Update existing credit record
    v_new_credits := v_current_credits + p_credits_to_add;
    UPDATE user_credits 
    SET credits = v_new_credits, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Create transaction record
  INSERT INTO credit_transactions (
    user_id, type, credits, amount, description, status,
    paystack_reference, paystack_transaction_id, stripe_payment_intent_id,
    created_at, updated_at
  )
  VALUES (
    p_user_id, p_transaction_type, p_credits_to_add, p_amount, p_transaction_description, 'completed',
    p_paystack_reference, p_paystack_transaction_id, p_stripe_payment_intent_id,
    NOW(), NOW()
  )
  RETURNING id INTO v_transaction_id;
  
  -- Return result
  v_result := json_build_object(
    'success', true,
    'previous_credits', COALESCE(v_current_credits, 0),
    'new_credits', v_new_credits,
    'credits_added', p_credits_to_add,
    'transaction_id', v_transaction_id
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result
    v_result := json_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION update_user_credits_atomic TO service_role;