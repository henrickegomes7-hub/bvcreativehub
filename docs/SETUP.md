# Configuração e execução

## Ambiente local

Use Node.js 22.12 ou superior, Bun 1.4.5, Git e um PostgreSQL acessível ao processo da aplicação.

```powershell
Copy-Item .env.example .env
bun install --frozen-lockfile
```

Configure as variáveis do [.env.example](../.env.example):

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | URL de conexão com o PostgreSQL. Use uma base separada em desenvolvimento e homologação. |
| `ADMIN_EMAIL` | E-mail reservado à administração do ambiente. |
| `ADMIN_BOOTSTRAP_TOKEN` | Segredo aleatório usado para inicializar o primeiro administrador em um banco novo. |
| `APP_URL` | Origem da aplicação, usada para gerar os links de convite. Use o endereço HTTPS em ambientes compartilhados. |
| `SUPPORT_EMAIL` | Contato de suporte apresentado na entrada. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER_EMAIL` | Credenciais OAuth e remetente da Gmail API para convites e recuperação de senha. |

```powershell
bun run db:migrate
bun run dev
```

Acesse `http://localhost:3000`. Se o banco ainda estiver vazio, use a opção de configuração inicial da conta administrativa. Depois da criação dessa conta, o token de bootstrap pode ser retirado do ambiente. O cadastro normal cria uma conta de solicitante.

## Homologação e produção

Aplique as migrações da pasta `database/migrations/` no banco do ambiente de destino. Na Vercel, cadastre as variáveis do ambiente antes de gerar o deploy. Depois, verifique `/api/health`, o login e um fluxo de solicitação com uma conta de teste autorizada. Para testar convites e recuperação, configure um remetente de homologação e confirme a entrega na caixa de teste.

Armazene credenciais reais no gerenciador de segredos. Mantenha `.env`, `.env.local` e os metadados locais da Vercel fora do Git. Se algum segredo tiver sido exposto, revogue-o e substitua-o no provedor e no ambiente que o utiliza.

## Comandos

| Comando | Resultado |
| --- | --- |
| `bun run dev` | Inicia frontend e API juntos. |
| `bun run db:migrate` | Aplica as migrações PostgreSQL. |
| `bun run lint` | Executa a checagem de tipos. |
| `bun run test` | Executa os testes automatizados. |
| `bun run check` | Executa a checagem de tipos e os testes. |
| `bun run build` | Gera os assets de produção em `dist/`. |
| `bun run package:source` | Gera o ZIP e o manifesto em `release/`, a partir do checkout Git. |
