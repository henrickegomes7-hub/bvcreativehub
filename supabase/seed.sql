-- ==============================================================================
-- BV CREATIVE HUB - SEED DATA DEMONSTRATIVO (POSTGRESQL / SUPABASE)
-- Dados fictícios para demonstração e homologação do departamento criativo Grupo BV
-- ==============================================================================

-- 1. Inserção de Departamentos
INSERT INTO public.departments (id, code, name, manager_name, icon, color, description) VALUES
('a0000001-0000-0000-0000-000000000001', 'CART', 'Cartões BV & Fidelidade', 'Mariana Alencar', 'CreditCard', '#083181', 'Campanhas de aquisição, ativação, cashback e benefícios de cartões de crédito BV.'),
('a0000001-0000-0000-0000-000000000002', 'VEIC', 'Veículos & Financiamentos', 'Carlos Eduardo Prado', 'Car', '#c56a2d', 'Comunicação para rede de concessionárias parceiras, feirões e financiamento de veículos.'),
('a0000001-0000-0000-0000-000000000003', 'MKTG', 'Marketing Institucional & Marca', 'Beatriz Castilho', 'Megaphone', '#a0b900', 'Posicionamento institucional, patrocínios, ESG, relatórios de sustentabilidade e imprensa.'),
('a0000001-0000-0000-0000-000000000004', 'IMOB', 'Crédito Imobiliário & Solar', 'Henrique Faria', 'Home', '#083181', 'Campanhas de crédito com garantia de imóvel e financiamento de energia solar.'),
('a0000001-0000-0000-0000-000000000005', 'RHEN', 'Gente, Gestão & Endomarketing', 'Patrícia Nogueira', 'Users', '#9333EA', 'Comunicação interna para colaboradores, programas de diversidade, onboarding e eventos BV.'),
('a0000001-0000-0000-0000-000000000006', 'INOV', 'Inovação & Produtos Digitais', 'Gustavo Pinheiro', 'Sparkles', '#0D9488', 'Lançamento de recursos do Super App BV, jornadas de conta digital e Open Finance.'),
('a0000001-0000-0000-0000-000000000007', 'COMP', 'Compliance, Risco & Jurídico', 'Renata Vilela', 'ShieldCheck', '#475569', 'Comunicações regulatórias do BACEN, segurança da informação e prevenção a fraudes.')
ON CONFLICT (id) DO NOTHING;

-- 2. Inserção de Perfis Fictícios de Usuários
INSERT INTO public.profiles (id, name, email, role, department_id, avatar_url, title) VALUES
('b0000001-0000-0000-0000-000000000001', 'Marina Rios', 'marina.rios@grupobv.com.br', 'creative_manager', 'a0000001-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', 'Head de Criação & Design'),
('b0000001-0000-0000-0000-000000000002', 'Lucas Takahashi', 'lucas.takahashi@grupobv.com.br', 'art_director', 'a0000001-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Diretor de Arte Sênior'),
('b0000001-0000-0000-0000-000000000003', 'Camila Duarte', 'camila.duarte@grupobv.com.br', 'designer', 'a0000001-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Designer Gráfico & Motion'),
('b0000001-0000-0000-0000-000000000004', 'Rodrigo Brandão', 'rodrigo.brandao@grupobv.com.br', 'designer', 'a0000001-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Designer Gráfico Pleno'),
('b0000001-0000-0000-0000-000000000005', 'Juliana Zanetti', 'juliana.zanetti@grupobv.com.br', 'requester', 'a0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'Especialista de Marketing - Cartões'),
('b0000001-0000-0000-0000-000000000006', 'Fernando Mendes', 'fernando.mendes@grupobv.com.br', 'requester', 'a0000001-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', 'Coordenador Comercial - Veículos')
ON CONFLICT (id) DO NOTHING;

-- 3. Inserção de Demandas Criativas
INSERT INTO public.creative_requests (
  id, code, title, description, department_id, requester_id, assignee_id, priority, status, format, deadline, estimated_hours, actual_hours, current_version, briefing, tags
) VALUES
(
  'c0000001-0000-0000-0000-000000000001',
  'BV-2026-042',
  'Campanha Cartão BV Visa Platinum - Cashback Turbinado',
  'Criação de conjunto de criativos para mídia de performance e feed no Instagram destacando os 3% de cashback nos 3 primeiros meses.',
  'a0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000005',
  'b0000001-0000-0000-0000-000000000003',
  'urgent',
  'client_approval',
  'social_feed',
  NOW() + INTERVAL '14 hours',
  12.0,
  10.5,
  2,
  '{"target_audience": "Clientes alta renda, 28-45 anos, buscando economia inteligente", "key_message": "Seu dinheiro volta direto para sua conta com o Cartão BV Platinum", "cta_text": "Peça já o seu", "specs": "1080x1350px (Feed 4:5) e 1080x1920px (Stories)", "mandatory_elements": ["Logo BV Oficial", "Bandeira Visa Platinum", "Aviso legal de taxa e aprovação"], "reference_links": ["https://bv.com.br/cartoes"]}'::jsonb,
  ARRAY['Performance', 'Cartões', 'Cashback', 'Meta Ads']
),
(
  'c0000001-0000-0000-0000-000000000002',
  'BV-2026-043',
  'Feirão Digital de Carros BV 2026 - Mídia OOH e Aeroportos',
  'Key visual e adaptação para painéis de LED em aeroportos (Congonhas e Santos Dumont) e mobiliário urbano em capitais.',
  'a0000001-0000-0000-0000-000000000002',
  'b0000001-0000-0000-0000-000000000006',
  'b0000001-0000-0000-0000-000000000002',
  'high',
  'in_progress',
  'ooh_print',
  NOW() + INTERVAL '28 hours',
  24.0,
  14.0,
  1,
  '{"target_audience": "Consumidores buscando troca de veículo com taxas especiais", "key_message": "Taxas a partir de 0.99% e 1ª parcela só para 90 dias", "cta_text": "Consulte as lojas participantes", "specs": "Painéis horizontais 1920x1080 e verticais 1080x1920 em 300DPI", "mandatory_elements": ["Logo BV Veículos", "Cores institucionais #083181 e #c56a2d", "Disclaimer BACEN"], "reference_links": []}'::jsonb,
  ARRAY['OOH', 'Veículos', 'Feirão', 'Print']
),
(
  'c0000001-0000-0000-0000-000000000003',
  'BV-2026-044',
  'Relatório Anual Integrado de Sustentabilidade & ESG 2025/2026',
  'Diagramação completa do e-book executivo em PDF interativo para divulgação com investidores e imprensa.',
  'a0000001-0000-0000-0000-000000000003',
  'b0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000004',
  'medium',
  'review',
  'ebook',
  NOW() + INTERVAL '4 days',
  40.0,
  28.0,
  1,
  '{"target_audience": "Investidores, acionistas, analistas de mercado e colaboradores", "key_message": "O compromisso do Banco BV com a descarbonização e impacto social positivo", "specs": "Formato A4 horizontal, tipografia corporativa Inter, gráficos customizados", "mandatory_elements": ["Índice navegável", "Assinatura da Diretoria", "Fotos originais BV"], "reference_links": []}'::jsonb,
  ARRAY['ESG', 'Institucional', 'E-book', 'RI']
),
(
  'c0000001-0000-0000-0000-000000000004',
  'BV-2026-045',
  'Vídeo Teaser Motion - Novo Recurso de Open Finance no App BV',
  'Animação 30s para Reels, TikTok e Stories demonstrando a consolidação de contas em poucos cliques.',
  'a0000001-0000-0000-0000-000000000006',
  'b0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000003',
  'medium',
  'backlog',
  'motion',
  NOW() + INTERVAL '6 days',
  18.0,
  0.0,
  0,
  '{"target_audience": "Usuários do App BV correntistas e novos prospects digitais", "key_message": "Todas as suas contas em um só lugar. Menos complicação, mais controle financeiro", "specs": "MP4 H.264, 1080x1920, 30fps com trilha sonora e legendas acessíveis", "mandatory_elements": ["UI Kit oficial do App BV", "Motion com ritmo dinâmico"], "reference_links": []}'::jsonb,
  ARRAY['Motion', 'App BV', 'Inovação', 'Social']
),
(
  'c0000001-0000-0000-0000-000000000005',
  'BV-2026-040',
  'Kit de Onboarding de Novos Colaboradores BV 2026',
  'Criação de ecobag, caderno corporativo, garrafa térmica e boas-vindas do time de Gente & Gestão.',
  'a0000001-0000-0000-0000-000000000005',
  'b0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000004',
  'low',
  'approved',
  'branding',
  NOW() - INTERVAL '1 day',
  16.0,
  15.0,
  1,
  '{"target_audience": "Novos colaboradores admitidos no Grupo BV em todo o Brasil", "key_message": "Bem-vindo a quem move o futuro com a gente!", "specs": "Arquivos vetoriais em Pantone e CMYK prontos para serigrafia e gravação a laser", "mandatory_elements": ["Manual de brindes BV 2026"], "reference_links": []}'::jsonb,
  ARRAY['RH', 'Endomarketing', 'Brindes', 'Concluído']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Inserção de Versões de Arquivos
INSERT INTO public.request_versions (
  id, request_id, version_number, file_name, file_url, file_size, file_type, preview_url, changelog, dimensions, resolution_dpi, color_profile, created_by
) VALUES
(
  'd0000001-0000-0000-0000-000000000001',
  'c0000001-0000-0000-0000-000000000001',
  1,
  'BV_CartaoPlatinum_Cashback_V1.png',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1080',
  '4.2 MB',
  'image/png',
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1080',
  'Primeira proposta visual com cartão 3D e selo de 3% de cashback.',
  '1080x1350',
  72,
  'RGB',
  'b0000001-0000-0000-0000-000000000003'
),
(
  'd0000001-0000-0000-0000-000000000002',
  'c0000001-0000-0000-0000-000000000001',
  2,
  'BV_CartaoPlatinum_Cashback_V2_Final.png',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1080',
  '3.8 MB',
  'image/png',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1080',
  'Ajustes realizados: ampliado o contraste do selo Visa Platinum e corrigido texto legal.',
  '1080x1350',
  72,
  'RGB',
  'b0000001-0000-0000-0000-000000000003'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Inserção de Comentários
INSERT INTO public.request_comments (
  id, request_id, version_number, user_id, content, is_adjustment, resolved
) VALUES
(
  'e0000001-0000-0000-0000-000000000001',
  'c0000001-0000-0000-0000-000000000001',
  1,
  'b0000001-0000-0000-0000-000000000005',
  'O visual ficou incrível! Apenas pedimos para dar mais destaque ao percentual de 3% de cashback e verificar o disclaimer do Bacen no rodapé.',
  TRUE,
  TRUE
),
(
  'e0000001-0000-0000-0000-000000000002',
  'c0000001-0000-0000-0000-000000000001',
  2,
  'b0000001-0000-0000-0000-000000000003',
  'Versão V2 atualizada com o selo ampliado e disclaimer revisado pelo jurídico. Pronta para aprovação final!',
  FALSE,
  FALSE
)
ON CONFLICT (id) DO NOTHING;

-- 6. Inserção de Ativos de Marca (Brand Assets)
INSERT INTO public.brand_assets (
  id, title, category, format, file_url, preview_url, hex_color, rgb_color, description, download_count, tags
) VALUES
('f0000001-0000-0000-0000-000000000001', 'Logo BV Principal - Positivo (Fundo Claro)', 'logos', 'SVG', 'https://assets.bv.com.br/logo-bv-positivo.svg', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', NULL, NULL, 'Versão primária da marca Grupo BV para aplicações em fundos brancos ou claros.', 342, ARRAY['Logo', 'SVG', 'Oficial', 'Vetor']),
('f0000001-0000-0000-0000-000000000002', 'Logo BV - Negativo (Branco para Fundo Escuro)', 'logos', 'SVG', 'https://assets.bv.com.br/logo-bv-negativo.svg', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400', NULL, NULL, 'Versão monocrática branca da marca para aplicação sobre fundos verdes escuros ou fotografias.', 289, ARRAY['Logo', 'Branco', 'Negativo']),
('f0000001-0000-0000-0000-000000000003', 'BV Azul (Azul Institucional Principal)', 'colors', 'HEX', '#083181', NULL, '#083181', 'rgb(8, 49, 129)', 'Cor institucional do Grupo BV. Transmite credibilidade, solidez bancária, governança e autoridade financeira.', 980, ARRAY['Cores', 'Primária', 'Institucional', 'Azul']),
('f0000001-0000-0000-0000-000000000004', 'BV Laranja (Laranja de Ação & Alertas)', 'colors', 'HEX', '#c56a2d', NULL, '#c56a2d', 'rgb(197, 106, 45)', 'Cor de destaque vibrante para chamadas de ação (CTAs), prioridades urgentes e conversão.', 790, ARRAY['Cores', 'Acento', 'CTA', 'Laranja']),
('f0000001-0000-0000-0000-000000000005', 'BV Verde (Símbolo & Conclusão de Metas)', 'colors', 'HEX', '#a0b900', NULL, '#a0b900', 'rgb(160, 185, 0)', 'Cor do elemento gráfico e símbolo da marca BV. Representa crescimento, metas atingidas e aprovações.', 850, ARRAY['Cores', 'Símbolo', 'Verde']),
('f0000001-0000-0000-0000-000000000008', 'BV Amarelo Texto (Destaque Tipográfico)', 'colors', 'HEX', '#e8dda5', NULL, '#e8dda5', 'rgb(232, 221, 165)', 'Cor refinada de suporte para textos e ênfases sobre superfícies azuis institucionais e temas escuros.', 620, ARRAY['Cores', 'Tipografia', 'Amarelo']),
('f0000001-0000-0000-0000-000000000006', 'Manual de Identidade Visual BV 2026 (Brandbook Oficial)', 'guidelines', 'PDF', 'https://assets.bv.com.br/manual-marca-bv-2026.pdf', NULL, NULL, NULL, 'Documento completo de diretrizes de marca, malhas construtivas, grid, tom de voz e regras de aplicação.', 512, ARRAY['Brandbook', 'Manual', 'PDF']),
('f0000001-0000-0000-0000-000000000007', 'Pacote Tipográfico Corporativo (Plus Jakarta Sans & Inter)', 'typography', 'ZIP', 'https://assets.bv.com.br/fontes-oficiais-bv.zip', NULL, NULL, NULL, 'Família tipográfica oficial para títulos de alto impacto e corpos de texto legíveis em interfaces.', 410, ARRAY['Tipografia', 'Fontes', 'Inter'])
ON CONFLICT (id) DO NOTHING;

-- 7. Inserção de Templates Gráficos
INSERT INTO public.graphic_templates (
  id, title, category, software, dimensions, aspect_ratio, preview_url, template_url, file_size, downloads, description
) VALUES
('t0000001-0000-0000-0000-000000000001', 'Post Feed Instagram 4:5 (Alta Conversão)', 'social', 'Figma', '1080x1350 px', '4:5', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600', 'https://www.figma.com/file/template-bv-feed', '18.4 MB', 624, 'Template otimizado para o feed do Instagram com grid de segurança, placeholders de produto e disclaimers.'),
('t0000001-0000-0000-0000-000000000002', 'Stories & Reels Vertical 9:16', 'social', 'Figma', '1080x1920 px', '9:16', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600', 'https://www.figma.com/file/template-bv-stories', '22.1 MB', 489, 'Estrutura vertical com áreas de proteção para botões do app, stickers e caixas de perguntas.'),
('t0000001-0000-0000-0000-000000000003', 'Carrossel Educativo 7 Telas (Finanças Descomplicadas)', 'social', 'Photoshop', '1080x1350 px', '4:5', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', 'https://assets.bv.com.br/templates/carrossel-bv.psd', '45.0 MB', 315, 'Template contínuo com guias de corte perfeitas para carrosséis instrutivos com alta taxa de salvamento.'),
('t0000001-0000-0000-0000-000000000004', 'Apresentação Corporativa Executiva (Diretoria BV)', 'presentation', 'PowerPoint', '1920x1080 px', '16:9', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600', 'https://assets.bv.com.br/templates/apresentacao-bv-executiva.pptx', '12.8 MB', 740, 'Mais de 40 slides mestres com tabelas, gráficos padronizados, organogramas e capas elegantes.'),
('t0000001-0000-0000-0000-000000000005', 'Display Banners Google Ads (Combo 7 Formatos)', 'digital', 'Figma', 'Formatos Variados', 'Multi', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600', 'https://www.figma.com/file/template-bv-gdn-banners', '31.2 MB', 290, 'Pacote com 300x250, 728x90, 300x600, 320x50, 160x600 com componentes sincronizados.')
ON CONFLICT (id) DO NOTHING;

-- 8. Inserção de Notificações Iniciais
INSERT INTO public.notifications (
  id, user_id, title, message, type, request_id, read
) VALUES
(
  'n0000001-0000-0000-0000-000000000001',
  'b0000001-0000-0000-0000-000000000005',
  'Versão V2 pronta para aprovação',
  'A designer Camila Duarte subiu a nova versão da demanda BV-2026-042 (Cartão BV Visa Platinum).',
  'approval',
  'c0000001-0000-0000-0000-000000000001',
  FALSE
),
(
  'n0000001-0000-0000-0000-000000000002',
  'b0000001-0000-0000-0000-000000000001',
  'SLA em Atenção',
  'A demanda BV-2026-042 possui prazo de entrega em menos de 14 horas.',
  'sla_risk',
  'c0000001-0000-0000-0000-000000000001',
  FALSE
)
ON CONFLICT (id) DO NOTHING;
