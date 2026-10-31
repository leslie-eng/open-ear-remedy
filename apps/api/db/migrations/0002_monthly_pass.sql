-- 0002: Monthly Pass. Allowances are copied onto each pass at purchase, so a later price
-- change never alters a pass someone already bought.
CREATE TABLE monthly_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  call_seconds_total INTEGER NOT NULL CHECK (call_seconds_total >= 0),
  call_seconds_used INTEGER NOT NULL DEFAULT 0 CHECK (call_seconds_used BETWEEN 0 AND call_seconds_total),
  ai_messages_per_day INTEGER NOT NULL CHECK (ai_messages_per_day >= 0),
  -- Paystack reference; unique so a repeated webhook can't grant the same pass twice.
  reference TEXT UNIQUE,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > starts_at)
);

CREATE INDEX idx_monthly_passes_user ON monthly_passes(user_id, expires_at);

-- AI messages used per pass per Nairobi calendar day.
CREATE TABLE pass_chat_usage (
  pass_id UUID NOT NULL REFERENCES monthly_passes(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0 CHECK (messages >= 0),
  PRIMARY KEY (pass_id, day)
);
