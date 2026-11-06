CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('requester', 'admin')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions(expires_at);

CREATE TABLE IF NOT EXISTS app_password_resets (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  code_salt CHAR(32) NOT NULL,
  code_hash CHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  code_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_password_resets_expiry_idx ON app_password_resets(expires_at);

CREATE SEQUENCE IF NOT EXISTS creative_request_code_seq START 1;

CREATE TABLE IF NOT EXISTS creative_requests (
  id UUID PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  code VARCHAR(40) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creative_requests_requester_created_idx
  ON creative_requests(requester_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app_departments (
  id VARCHAR(80) PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  manager_name VARCHAR(150) NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'Building2',
  color VARCHAR(20) NOT NULL DEFAULT '#083181',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_departments (id, code, name, manager_name, icon, color, description)
VALUES
  ('dept-cartoes', 'PBOA', 'PLANO BOA VIAGEM', 'A definir', 'Building2', '#083181', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-veiculos', 'FLORES', 'BV FLORES', 'A definir', 'Building2', '#c56a2d', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-marketing', 'PLAY', 'BV PLAY', 'A definir', 'Building2', '#a0b900', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-imobiliario', 'FIN', 'BV FINANÇAS', 'A definir', 'Building2', '#2563EB', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-rh', 'SAUDE', 'BV SAÚDE', 'A definir', 'Building2', '#9333EA', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-inovacao', 'PET', 'BV PET', 'A definir', 'Building2', '#0D9488', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-compliance', 'SBV', 'SAÚDE BV', 'A definir', 'Building2', '#475569', 'Departamento solicitante do BV Creative Hub.'),
  ('dept-funeraria', 'FUNE', 'FUNERÁRIA', 'A definir', 'Building2', '#64748B', 'Departamento solicitante do BV Creative Hub.')
ON CONFLICT (id) DO NOTHING;
