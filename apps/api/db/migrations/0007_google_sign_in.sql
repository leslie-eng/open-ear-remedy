-- 0007: Sign in with Google.

-- Accounts created through Google have no password (they can set one later with "forgot password").
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Google's stable account ID, so a returning person is recognised even if their Gmail address changes.
ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE;
