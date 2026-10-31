-- 0003: who made each admin credit adjustment (the reason is stored in description).
ALTER TABLE credit_transactions ADD COLUMN admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE credit_transactions ADD CONSTRAINT credit_adjustments_are_attributed
  CHECK (type <> 'adjustment' OR (admin_user_id IS NOT NULL AND length(trim(description)) > 0));
