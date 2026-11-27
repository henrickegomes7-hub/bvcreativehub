ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('requester','designer','art_director','admin'));
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS app_invitations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 email VARCHAR(254) NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('requester','designer','art_director')),
 token_hash CHAR(64) NOT NULL UNIQUE,
 created_by UUID NOT NULL REFERENCES app_users(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ,
 revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS app_invitation_pending_email ON app_invitations(email) WHERE used_at IS NULL AND revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS request_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id UUID NOT NULL REFERENCES creative_requests(id) ON DELETE RESTRICT,
 actor_id UUID NOT NULL REFERENCES app_users(id),
 action TEXT NOT NULL,
 reason TEXT NOT NULL DEFAULT '',
 snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS request_events_timeline ON request_events(request_id,created_at,id);
CREATE INDEX IF NOT EXISTS request_order_idx ON creative_requests(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS request_owner_order_idx ON creative_requests(requester_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS request_assignee_idx ON creative_requests((data->>'assignee_id'));
CREATE INDEX IF NOT EXISTS request_approver_idx ON creative_requests((data->>'approver_id'));
CREATE INDEX IF NOT EXISTS request_status_idx ON creative_requests((data->>'status'));
