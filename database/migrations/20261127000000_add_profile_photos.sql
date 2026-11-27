ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS avatar_image BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_revision TEXT;
