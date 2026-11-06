# BV Creative Hub 🎨⚡
> **Plataforma de Gestão, Automação e Esteira de Produção de Design Gráfico para o Departamento Criativo do Grupo BV.**

O **BV Creative Hub** centraliza o ciclo de vida completo das demandas de design do Grupo BV: desde o briefing estruturado, triagem e controle rigoroso de SLAs, até a esteira Kanban de produção, portal formal de aprovação com comparador de versões, biblioteca de identidade visual e relatórios de produtividade.

---

## 🛠️ Tecnologias e Arquitetura

- **Frontend Core**: React 19 / TypeScript / Vite
- **UI & Estilização**: Tailwind CSS v4, Lucide React, Motion
- **Design System & Paleta Oficial do Grupo BV**:
  - `Azul BV`: `#083181` (Cor primária, abas ativas e botões principais)
  - `Laranja BV`: `#c56a2d` (Acento vibrante, alertas, CTAs de alta conversão e prioridades)
  - `Verde BV`: `#a0b900` (Símbolo oficial BV, status aprovado, entregas no prazo)
  - `Amarelo Texto`: `#e8dda5` (Destaques tipográficos sobre fundos azuis e superfícies escuras)
  - `Tema Escuro & Claro`: Alternância fluida no topo com persistência em localStorage
- **Inteligência Artificial**: Automação com Gemini API (`gemini-3.8-flash`) para estruturação automática de briefings e sugestão de categorias
- **Dashboard & Analytics**: Recharts (Gráficos de vazão, produtividade de designers e status)
- **Banco de Dados & Infra**: PostgreSQL privado acessado pelo backend Express; sessão segura em cookie HttpOnly
- **Permissões**: Funcionários veem somente suas próprias solicitações; a conta administrativa tem acesso ao painel e às solicitações de todos

---

## 📁 Estrutura do Projeto

```text
bv-creative-hub/
├── public/                      # Ativos estáticos e favicon
├── src/
│   ├── components/
│   │   ├── auth/                # Login e cadastro de funcionários
│   │   ├── layout/              # Header de sessão e navegação por perfil
│   │   ├── dashboard/           # KPIs executivos, gráficos Recharts e alertas de SLA
│   │   ├── solicitacoes/        # Tabela SaaS, Modal de Novo Briefing e Ficha Detalhada
│   │   ├── kanban/              # Quadro Kanban com 5 colunas e validação de esteira
│   │   ├── aprovacoes/          # Portal formal com comparador V1 x V2 e checklist
│   │   ├── calendario/          # Cronograma editorial mensal/semanal
│   │   ├── biblioteca/          # Brand Asset Center (Logos, cores com cópia HEX, tipografia)
│   │   ├── templates/           # Banco de templates (Figma, Photoshop, PPT)
│   │   ├── relatorios/          # Relatórios de produtividade, exportação CSV e Print
│   │   ├── configuracoes/       # Departamentos, usuários e infraestrutura
│   │   └── ui/                  # Componentes reutilizáveis (Button, Badge, Modal)
│   ├── lib/
│   │   └── supabase.ts          # Inicialização e detecção do cliente Supabase
│   ├── services/
│   │   ├── seedData.ts          # Dados demonstrativos do Grupo BV
│   │   └── storageService.ts    # Camada unificada de persistência e auditoria
│   ├── types/
│   │   └── index.ts             # Contratos TypeScript completos
│   ├── utils/
│   │   ├── sla.ts               # Cálculos de tempo de SLA, alertas e horas úteis
│   │   ├── sla.test.ts          # Testes unitários de SLA
│   │   ├── workflow.ts          # Máquina de estados e validações de esteira
│   │   ├── workflow.test.ts     # Testes unitários do workflow
│   │   └── exportZip.ts         # Exportador do código-fonte em ZIP
│   ├── App.tsx                  # Orquestrador da aplicação
│   ├── index.css                # Configurações de tema, fontes e variáveis de cor
│   └── main.tsx                 # Ponto de entrada React
├── supabase/
│   ├── migrations/
│   │   └── 20260101000000_create_bv_creative_hub_schema.sql  # Schema legado para Supabase
│   └── seed.sql                 # Dados demonstrativos legados
├── database/
│   └── migrations/
│       └── 20261105000000_create_standalone_auth.sql          # Login e solicitações PostgreSQL
├── .env.example                 # Modelo de variáveis de ambiente
├── package.json                 # Dependências e scripts
├── tsconfig.json                # Configuração TypeScript rigorosa
└── README.md                    # Guia completo de instalação e uso
```

---

## 🚀 Guia de Instalação e Execução Local no VS Code

Siga o passo a passo abaixo para rodar a aplicação em seu computador:

### 1. Pré-requisitos

1. **Node.js 22 LTS ou superior**:
   - Baixe e instale a partir de: [https://nodejs.org](https://nodejs.org)
   - Verifique a instalação no terminal:
     ```bash
     node -v
     npm -v
     ```
2. **Visual Studio Code**:
   - Baixe em: [https://code.visualstudio.com](https://code.visualstudio.com)

---

### 2. Abrir o Projeto no VS Code

1. Baixe o código do projeto (você pode clicar no botão **"Código Fonte (ZIP)"** no topo da própria aplicação para baixar tudo compactado, ou clonar a pasta).
2. Extraia os arquivos em uma pasta de sua preferência (ex: `C:\Projetos\bv-creative-hub` ou `~/Projetos/bv-creative-hub`).
3. Abra o VS Code e acesse o menu **File > Open Folder...** (ou `code bv-creative-hub` no terminal).

---

### 3. Instalar as Dependências

Abra o terminal integrado do VS Code (`Ctrl + \`` ou `Cmd + \``) e execute:

```bash
npm install
```

---

### 4. Configurar PostgreSQL e as variáveis de ambiente

Crie um banco PostgreSQL gerenciado (por exemplo, Neon ou Railway) e configure o backend. A aplicação não guarda as solicitações no navegador; sem o banco central, login e cadastro ficam desabilitados.

Copie `.env.example` para `.env` e preencha as variáveis abaixo. Em Vercel, cadastre-as em **Project Settings > Environment Variables**:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://...
ADMIN_EMAIL=henrickework@gmail.com
ADMIN_BOOTSTRAP_TOKEN=gere-um-segredo-aleatorio-com-32-caracteres-ou-mais
GMAIL_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=seu-client-secret
GMAIL_REFRESH_TOKEN=seu-refresh-token
GMAIL_SENDER_EMAIL=seuemail@gmail.com
```

`ADMIN_BOOTSTRAP_TOKEN` deve ser aleatório e mantido em segredo. Ele só é usado para criar a conta administrativa inicial. Depois de criar a conta, remova essa variável do ambiente de hospedagem.

Para habilitar **Esqueceu a senha?**, configure a API Gmail com OAuth 2.0. Ative a Gmail API em um projeto do [Google Cloud Console](https://console.cloud.google.com/), configure o consentimento OAuth e crie credenciais OAuth do tipo **Web application**. Adicione `https://developers.google.com/oauthplayground` como URI de redirecionamento autorizado. No [OAuth Playground](https://developers.google.com/oauthplayground/), habilite **Use your own OAuth credentials**, informe o Client ID e o Client Secret, autorize o escopo `https://www.googleapis.com/auth/gmail.send` com a conta remetente e troque o código por tokens. Copie o refresh token para `GMAIL_REFRESH_TOKEN` e use o mesmo e-mail autorizado em `GMAIL_SENDER_EMAIL`.

Guarde todas essas credenciais exclusivamente no servidor; na Vercel, cadastre-as em **Project Settings > Environment Variables** e faça um novo deploy. Em um app OAuth externo no modo **Testing**, o Google pode expirar refresh tokens após sete dias; para uso contínuo, será necessário configurar o consentimento e a publicação do app conforme as exigências do Google. O código de redefinição expira em 15 minutos e permite no máximo cinco tentativas.

### 5. Criar as tabelas

Configure `DATABASE_URL` no ambiente ou no `.env` e execute a migração:

```bash
npm run db:migrate
```

Não aplique o schema legado de `supabase/migrations` neste PostgreSQL independente. Ele depende do serviço de autenticação próprio do Supabase.

### 6. Primeiro acesso e permissões

1. Abra o site e crie a conta administrativa com o e-mail definido em `ADMIN_EMAIL` e a chave `ADMIN_BOOTSTRAP_TOKEN`.
2. Remova `ADMIN_BOOTSTRAP_TOKEN` das variáveis de ambiente após criar a conta.
3. O cadastro é público para qualquer pessoa com o link; todas as novas contas recebem perfil de funcionário automaticamente. O cadastro não verifica o domínio/e-mail.
4. Funcionários só carregam e podem comentar as próprias solicitações. A API confere a sessão e a propriedade no servidor; as funções administrativas exigem a conta admin.

### 7. Iniciar o Servidor de Desenvolvimento

Execute no terminal:

```bash
npm run dev
```

Você verá a saída indicando o endereço local:
```
  VITE v6.x.x  ready in 240 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Abra o seu navegador e acesse: **`http://localhost:3000`**

---

### 8. Publicar na Vercel

Importe o projeto para a Vercel, configure `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_BOOTSTRAP_TOKEN` e as quatro variáveis OAuth do Gmail, aplique a migração no banco e faça o deploy. O arquivo `vercel.json` encaminha a API ao backend Node e publica o frontend. O PostgreSQL precisa aceitar conexões do backend Vercel. `ADMIN_BOOTSTRAP_TOKEN` precisa ter pelo menos 32 caracteres aleatórios; remova-o após criar a conta administrativa.

### 9. Executar os Testes Unitários

Para rodar os testes unitários de regras de negócio, SLA e máquina de estados:

```bash
npx --yes tsx --test src/utils/sla.test.ts src/utils/workflow.test.ts
```

---

## 👥 Acesso por perfil

- **Henricke (administrador)**: dashboard, todas as solicitações, produção, aprovações, relatórios, biblioteca e configurações.
- **Funcionários**: cadastro/login e portal para criar e acompanhar somente as próprias solicitações, consultar versões e conversar sobre o pedido.

Para entregar uma arte, hospede o arquivo no OneDrive/SharePoint ou serviço da empresa, conceda acesso ao solicitante e registre o link HTTPS na versão da demanda. O sistema compartilha o link; não armazena arquivos binários.

---

## 📄 Licença

Projeto desenvolvido para o departamento criativo do **Grupo BV**. Todos os direitos reservados.
