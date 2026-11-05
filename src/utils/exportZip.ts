import JSZip from 'jszip';

export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Project configuration files
  zip.file('.env.example', `# SUPABASE CONFIGURATION
VITE_SUPABASE_URL=https://sua-instancia.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-anon-aqui

# GEMINI API (Opcional para automações criativas)
GEMINI_API_KEY="MY_GEMINI_API_KEY"

# APP URL
APP_URL="http://localhost:3000"
`);

  zip.file('README.md', `# BV Creative Hub - Plataforma de Gestão Criativa do Grupo BV

Plataforma completa de gestão, automação e esteira de produção para o departamento criativo do Grupo BV.

## 🚀 Tecnologias

- **Frontend**: React 19 / Next.js architecture, TypeScript, Tailwind CSS, Lucide React, Recharts, Motion
- **Backend & Database**: Supabase (PostgreSQL), Row Level Security (RLS), Storage de Arquivos
- **Esteira**: Kanban de produção, controle rígido de SLAs, fluxo formal de aprovações com checklist de ajustes e histórico de versões com comparador.

## 📦 Como Instalar e Rodar Localmente no VS Code

### 1. Pré-requisitos
- Node.js versão 18 ou superior instalada (baixe em https://nodejs.org)
- Visual Studio Code

### 2. Abrir o projeto
\`\`\`bash
# Extraia o arquivo ZIP em sua pasta de preferência
# Abra a pasta no VS Code:
code bv-creative-hub
\`\`\`

### 3. Instalar dependências
\`\`\`bash
npm install
\`\`\`

### 4. Configurar Variáveis de Ambiente
Copie o arquivo \`.env.example\` para \`.env.local\`:
\`\`\`bash
cp .env.example .env.local
\`\`\`
Preencha suas credenciais do Supabase:
\`\`\`env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
\`\`\`
*Nota: A aplicação funciona imediatamente com persistência local caso não tenha o Supabase configurado de imediato.*

### 5. Executar as Migrations no Supabase
1. No painel do seu projeto Supabase, acesse **SQL Editor**.
2. Cole e execute o arquivo \`supabase/migrations/20260101000000_create_bv_creative_hub_schema.sql\`.
3. Para carregar a base de demonstração do Grupo BV, execute o arquivo \`supabase/seed.sql\`.

### 6. Iniciar o Servidor de Desenvolvimento
\`\`\`bash
npm run dev
\`\`\`
Acesse no navegador: **http://localhost:3000**

---
© 2026 Grupo BV - Todos os direitos reservados.
`);

  // Adicionamos os arquivos de migrations e seed
  const migrationsFolder = zip.folder('supabase/migrations');
  migrationsFolder?.file(
    '20260101000000_create_bv_creative_hub_schema.sql',
    `-- Consulte o repositório original para o schema completo com RLS e triggers.`
  );

  const seedFolder = zip.folder('supabase');
  seedFolder?.file('seed.sql', `-- Consulte o repositório original para o seed completo com dados do Grupo BV.`);

  // Generate the zip blob and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bv-creative-hub-source.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
