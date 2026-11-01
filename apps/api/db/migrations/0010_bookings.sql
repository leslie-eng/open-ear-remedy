-- 0010: booking a Conversation with a Listener for later (ADR 0008).

-- A start time a Listener has said they are free. One Booking at most per slot.
CREATE TABLE listener_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listener_user_id, starts_at)
);

CREATE INDEX idx_listener_slots_starts ON listener_slots(starts_at);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES listener_slots(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listener_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes IN (30, 45)),
  mode TEXT NOT NULL CHECK (mode IN ('voice', 'text')),
  -- booked -> joined (the Conversation started) -> completed; or cancelled / client_no_show / listener_no_show.
  status TEXT NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'joined', 'completed', 'cancelled', 'client_no_show', 'listener_no_show')),
  -- Credits taken aside when booking; given back when the Conversation starts or the booking ends unused.
  held_credits INTEGER NOT NULL DEFAULT 0 CHECK (held_credits >= 0),
  client_time_zone TEXT,
  client_joined_at TIMESTAMPTZ,
  listener_present_at TIMESTAMPTZ,
  call_id UUID REFERENCES call_history(id) ON DELETE SET NULL,
  reminded_24h_at TIMESTAMPTZ,
  reminded_1h_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A slot can be booked again only after an earlier booking of it was cancelled.
CREATE UNIQUE INDEX idx_bookings_live_slot ON bookings(slot_id) WHERE status IN ('booked', 'joined', 'completed');
CREATE INDEX idx_bookings_client ON bookings(client_user_id, starts_at DESC);
CREATE INDEX idx_bookings_listener ON bookings(listener_user_id, starts_at DESC);
CREATE INDEX idx_bookings_open ON bookings(starts_at) WHERE status IN ('booked', 'joined');

ALTER TABLE call_history ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- After two no-shows in 30 days a person can't book for 7 days (Talk now still works).
ALTER TABLE users ADD COLUMN booking_paused_until TIMESTAMPTZ;
-- A Listener can stop people choosing "Book again with this Listener".
ALTER TABLE users ADD COLUMN allow_rebook BOOLEAN NOT NULL DEFAULT TRUE;
