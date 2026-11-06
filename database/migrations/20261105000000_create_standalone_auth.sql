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
  ('dept-cartoes', 'CART', 'Cartões BV & Fidelidade', 'Mariana Alencar', 'CreditCard', '#083181', 'Campanhas de aquisição, ativação, cashback e benefícios de cartões de crédito BV.'),
  ('dept-veiculos', 'VEIC', 'Veículos & Financiamentos', 'Carlos Eduardo Prado', 'Car', '#c56a2d', 'Comunicação para rede de concessionárias parceiras, feirões e financiamento de veículos.'),
  ('dept-marketing', 'MKTG', 'Marketing Institucional & Marca', 'Beatriz Castilho', 'Megaphone', '#a0b900', 'Posicionamento institucional, patrocínios, ESG, relatórios e imprensa.'),
  ('dept-imobiliario', 'IMOB', 'Crédito Imobiliário & Solar', 'Henrique Faria', 'Home', '#2563EB', 'Campanhas de crédito com garantia de imóvel e financiamento solar BV.'),
  ('dept-rh', 'RHEN', 'Gente, Gestão & Endomarketing', 'Patrícia Nogueira', 'Users', '#9333EA', 'Comunicação interna para colaboradores, programas de inclusão e eventos corporativos.'),
  ('dept-inovacao', 'INOV', 'Inovação & Produtos Digitais', 'Gustavo Pinheiro', 'Sparkles', '#0D9488', 'Lançamentos de recursos no Super App BV, jornadas de conta digital e Open Finance.'),
  ('dept-compliance', 'COMP', 'Compliance, Risco & Jurídico', 'Renata Vilela', 'ShieldCheck', '#475569', 'Comunicações regulatórias do BACEN, segurança da informação e prevenção a fraudes.')
ON CONFLICT (id) DO NOTHING;
