-- ==============================================================================
-- BV CREATIVE HUB - SCHEMA COMPLETO DE BANCO DE DADOS (POSTGRESQL / SUPABASE)
-- Departamento Criativo do Grupo BV
-- Migração: 20260101000000_create_bv_creative_hub_schema.sql
-- ==============================================================================

-- 1. Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums do Sistema
CREATE TYPE user_role_enum AS ENUM (
  'requester',
  'designer',
  'art_director',
  'creative_manager',
  'admin'
);

CREATE TYPE request_priority_enum AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE request_status_enum AS ENUM (
  'backlog',
  'in_progress',
  'review',
  'client_approval',
  'approved'
);

CREATE TYPE asset_format_enum AS ENUM (
  'social_feed',
  'social_stories',
  'carrossel',
  'banner_web',
  'motion',
  'landing_page',
  'ooh_print',
  'ebook',
  'email_marketing',
  'branding'
);

CREATE TYPE approval_decision_enum AS ENUM (
  'approved',
  'approved_with_notes',
  'changes_requested'
);

-- 3. Tabela de Departamentos do Grupo BV
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  manager_name VARCHAR(150),
  icon VARCHAR(50) DEFAULT 'Building2',
  color VARCHAR(20) DEFAULT '#083181',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Perfis de Usuários (Vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role user_role_enum NOT NULL DEFAULT 'requester',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  avatar_url TEXT,
  title VARCHAR(120),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Demandas / Solicitações Criativas
CREATE TABLE IF NOT EXISTS public.creative_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) NOT NULL UNIQUE, -- ex: BV-2026-001
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority request_priority_enum NOT NULL DEFAULT 'medium',
  status request_status_enum NOT NULL DEFAULT 'backlog',
  format asset_format_enum NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  estimated_hours NUMERIC(6,2) DEFAULT 8.0,
  actual_hours NUMERIC(6,2) DEFAULT 0.0,
  briefing JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  current_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Versões e Arquivos Gráficos (Histórico de Entregas)
CREATE TABLE IF NOT EXISTS public.request_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.creative_requests(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size VARCHAR(50),
  file_type VARCHAR(100),
  preview_url TEXT,
  changelog TEXT,
  dimensions VARCHAR(50),
  resolution_dpi INT DEFAULT 72,
  color_profile VARCHAR(10) DEFAULT 'RGB',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, version_number)
);

-- 7. Tabela de Comentários e Solicitações de Ajuste
CREATE TABLE IF NOT EXISTS public.request_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.creative_requests(id) ON DELETE CASCADE,
  version_number INT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_adjustment BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de Aprovações Formais e Auditoria
CREATE TABLE IF NOT EXISTS public.request_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES public.creative_requests(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision approval_decision_enum NOT NULL,
  feedback TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela da Biblioteca de Identidade Visual (Brand Assets)
CREATE TABLE IF NOT EXISTS public.brand_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- logos, colors, typography, icons, guidelines, photography
  format VARCHAR(20) NOT NULL,   -- SVG, PNG, PDF, OTF, TTF
  file_url TEXT NOT NULL,
  preview_url TEXT,
  hex_color VARCHAR(10),
  rgb_color VARCHAR(30),
  description TEXT,
  download_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabela de Templates Gráficos Prontos
CREATE TABLE IF NOT EXISTS public.graphic_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- social, print, presentation, corporate, digital
  software VARCHAR(50) NOT NULL, -- Figma, Photoshop, Illustrator, Canva, PowerPoint
  dimensions VARCHAR(50) NOT NULL,
  aspect_ratio VARCHAR(20) NOT NULL,
  preview_url TEXT NOT NULL,
  template_url TEXT NOT NULL,
  file_size VARCHAR(30),
  downloads INT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- approval, sla_risk, new_request, comment, assignment
  request_id UUID REFERENCES public.creative_requests(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.creative_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON public.creative_requests(priority);
CREATE INDEX IF NOT EXISTS idx_requests_department ON public.creative_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_requests_assignee ON public.creative_requests(assignee_id);
CREATE INDEX IF NOT EXISTS idx_requests_deadline ON public.creative_requests(deadline);
CREATE INDEX IF NOT EXISTS idx_versions_request ON public.request_versions(request_id);
CREATE INDEX IF NOT EXISTS idx_comments_request ON public.request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read);

-- 13. Trigger para atualização automática de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_modtime BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requests_modtime BEFORE UPDATE ON public.creative_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brand_assets_modtime BEFORE UPDATE ON public.brand_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_modtime BEFORE UPDATE ON public.graphic_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphic_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura: Usuários autenticados podem consultar os dados do hub
CREATE POLICY "Leitura departamentos para autenticados" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura profiles para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura requests para autenticados" ON public.creative_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura versions para autenticados" ON public.request_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura comments para autenticados" ON public.request_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura approvals para autenticados" ON public.request_approvals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura brand assets para autenticados" ON public.brand_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura templates para autenticados" ON public.graphic_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura notifications do próprio usuário" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Políticas de Inserção / Modificação
CREATE POLICY "Criar solicitações para usuários autenticados" ON public.creative_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('creative_manager', 'admin')));
CREATE POLICY "Atualizar solicitações para equipe criativa ou autor" ON public.creative_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Inserir versões para designers e gestores" ON public.request_versions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('designer', 'art_director', 'creative_manager', 'admin')));
CREATE POLICY "Inserir comentários para autenticados" ON public.request_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Inserir aprovações para solicitantes e diretores" ON public.request_approvals FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
