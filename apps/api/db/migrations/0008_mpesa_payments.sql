-- 0008: M-Pesa (Daraja STK Push) replaces Paystack.

-- One row per payment prompt sent to a phone. Credits, a Monthly Pass or ebooks are granted only
-- once Safaricom confirms the payment when we ask it directly (its callbacks are not signed).
CREATE TABLE mpesa_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- What is being bought: a Credit Pack / Monthly Pass (offer_id) or an ebook order.
  purpose TEXT NOT NULL CHECK (purpose IN ('offer', 'ebook_order')),
  offer_id TEXT,
  ebook_order_id UUID REFERENCES ebook_orders(id) ON DELETE SET NULL,
  -- Whole shillings, as sent to M-Pesa.
  amount INTEGER NOT NULL CHECK (amount >= 1),
  -- 2547XXXXXXXX / 2541XXXXXXXX. Shown only to the person and Admins.
  phone TEXT NOT NULL,
  checkout_request_id TEXT UNIQUE,
  merchant_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  result_code TEXT,
  result_desc TEXT,
  mpesa_receipt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK ((purpose = 'offer') = (offer_id IS NOT NULL))
);

CREATE INDEX idx_mpesa_payments_user ON mpesa_payments(user_id, created_at DESC);
CREATE INDEX idx_mpesa_payments_pending ON mpesa_payments(created_at) WHERE status = 'pending';
