import { Pool, type PoolClient } from 'pg';

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function databaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown';
  const value = error as { code?: unknown; name?: unknown };
  if (typeof value.code === 'string' && /^[A-Z0-9_]+$/i.test(value.code)) return value.code;
  if (typeof value.name === 'string' && /^[A-Za-z]+Error$/.test(value.name)) return value.name;
  return 'unknown';
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não foi configurada.');
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
}

export function ensureDatabaseSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    let client: PoolClient | undefined;
    try {
      client = await getPool().connect();
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('bv_creative_hub_schema_v2'))");
      await client.query(`CREATE TABLE IF NOT EXISTS app_schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      const applied = await client.query("SELECT 1 FROM app_schema_migrations WHERE name = '20261124000000_invites_workflow'");
      const photos = await client.query("SELECT 1 FROM app_schema_migrations WHERE name = '20261127000000_add_profile_photos'");
      if (!photos.rowCount) {
        await client.query(`ALTER TABLE app_users
          ADD COLUMN IF NOT EXISTS avatar_image BYTEA,
          ADD COLUMN IF NOT EXISTS avatar_revision TEXT`);
        await client.query("INSERT INTO app_schema_migrations(name) VALUES ('20261127000000_add_profile_photos')");
      }
      if (applied.rowCount) {
        await client.query(`INSERT INTO app_departments (id,code,name,manager_name,icon,color,description)
          VALUES ('dept-grupo-bv','GBV','GRUPO BV','A definir','Building2','#083181','Departamento solicitante do BV Creative Hub.')
          ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,manager_name=EXCLUDED.manager_name,
          icon=EXCLUDED.icon,color=EXCLUDED.color,description=EXCLUDED.description`);
        await client.query('COMMIT');
        return;
      }
      await client.query('ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check');
      await client.query("ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('requester','designer','art_director','admin'))");
      await client.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true');
      await client.query(`CREATE TABLE IF NOT EXISTS app_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(254) NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('requester','designer','art_director')),
        token_hash CHAR(64) NOT NULL UNIQUE,
        created_by UUID NOT NULL REFERENCES app_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        revoked_at TIMESTAMPTZ
      )`);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS app_invitation_pending_email ON app_invitations(email) WHERE used_at IS NULL AND revoked_at IS NULL');
      await client.query(`CREATE TABLE IF NOT EXISTS request_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID NOT NULL REFERENCES creative_requests(id) ON DELETE RESTRICT,
        actor_id UUID NOT NULL REFERENCES app_users(id),
        action TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        snapshot JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await client.query('CREATE INDEX IF NOT EXISTS request_events_timeline ON request_events(request_id,created_at,id)');
      await client.query('CREATE INDEX IF NOT EXISTS request_order_idx ON creative_requests(created_at DESC,id DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS request_owner_order_idx ON creative_requests(requester_id,created_at DESC,id DESC)');
      await client.query("CREATE INDEX IF NOT EXISTS request_assignee_idx ON creative_requests((data->>'assignee_id'))");
      await client.query("CREATE INDEX IF NOT EXISTS request_approver_idx ON creative_requests((data->>'approver_id'))");
      await client.query("CREATE INDEX IF NOT EXISTS request_status_idx ON creative_requests((data->>'status'))");
      await client.query("INSERT INTO app_schema_migrations(name) VALUES ('20261124000000_invites_workflow') ON CONFLICT DO NOTHING");
      await client.query(`INSERT INTO app_departments (id,code,name,manager_name,icon,color,description)
        VALUES ('dept-grupo-bv','GBV','GRUPO BV','A definir','Building2','#083181','Departamento solicitante do BV Creative Hub.')
        ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,manager_name=EXCLUDED.manager_name,
        icon=EXCLUDED.icon,color=EXCLUDED.color,description=EXCLUDED.description`);
      await client.query('COMMIT');
    } catch (error) {
      await client?.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client?.release();
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
