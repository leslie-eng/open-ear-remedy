-- 0009: live text chat with a Listener, and Listener notes.

-- A Conversation is a voice Call or a Text Chat; both follow the same rules and billing.
ALTER TABLE call_history ADD COLUMN mode TEXT NOT NULL DEFAULT 'voice' CHECK (mode IN ('voice', 'text'));

-- A Listener's private note after a Conversation, so the next Listener need not ask the person to
-- repeat their story. Never shown to the person. Deleted after 12 months (jobs:purge-notes).
CREATE TABLE listener_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listener_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  call_id UUID NOT NULL UNIQUE REFERENCES call_history(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listener_notes_client ON listener_notes(client_user_id, created_at DESC);
CREATE INDEX idx_listener_notes_created ON listener_notes(created_at);

-- The person's choices about notes: shown a one-time notice before their first Conversation,
-- and may turn notes off (which also stops new notes being written).
ALTER TABLE users ADD COLUMN notes_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN notes_notice_seen_at TIMESTAMPTZ;
