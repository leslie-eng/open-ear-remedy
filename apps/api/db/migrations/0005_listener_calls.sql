-- 0005: in-house WebRTC calls with human listeners (replaces Twilio phone calls).

-- Listeners are existing user accounts that an admin has enabled. Deactivating keeps history.
CREATE TABLE listeners (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The only thing a listener sees about a caller. NULL means "Anonymous".
ALTER TABLE users ADD COLUMN display_name TEXT CHECK (char_length(display_name) <= 40);

-- Twilio-era columns go; call rows now record who listened and how the call went.
ALTER TABLE call_history DROP COLUMN call_sid;
ALTER TABLE call_history DROP COLUMN to_number;
ALTER TABLE call_history ADD COLUMN listener_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
-- When audio connected; billing runs from here. NULL if the call never connected.
ALTER TABLE call_history ADD COLUMN connected_at TIMESTAMPTZ;
ALTER TABLE call_history ADD COLUMN pass_seconds_used INTEGER NOT NULL DEFAULT 0;
-- hangup | no_answer | cancelled | dropped | time_limit (see @openear/shared/calls EndReason)
ALTER TABLE call_history ADD COLUMN end_reason TEXT;
ALTER TABLE call_history ALTER COLUMN status SET DEFAULT 'ringing';

CREATE INDEX idx_call_history_listener ON call_history(listener_user_id);

-- A listener can report a caller after (or during) a call; admins review these.
CREATE TABLE call_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES call_history(id) ON DELETE CASCADE,
  listener_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
