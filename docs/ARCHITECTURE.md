# Arquitetura do BV Creative Hub

O frontend React chama a API Express na mesma origem. Em desenvolvimento, `server.ts` monta o Vite como middleware. Na Vercel, `api/index.ts` exporta a mesma aplicação e `vercel.json` define o roteamento, o diretório de build e os cabeçalhos.

## Dados e autorização

- **PostgreSQL** armazena contas, sessões, recuperação de senha, departamentos, convites, perfis e solicitações. A solicitação usa JSONB para briefing, anexos de referência, comentários e pareceres. Eventos de workflow ficam em uma tabela de histórico associada à demanda.
- **Sessões** usam tokens com hash e expiração. O navegador recebe um cookie HttpOnly com SameSite e Secure em produção. Senhas são derivadas com scrypt e salt.
- **Permissões** são aplicadas na API. Solicitantes acessam suas demandas. Executores e aprovadores têm acesso às responsabilidades atribuídas e às ações permitidas de seus perfis. A administração exige o perfil e o e-mail administrativo configurado.
- **Upload de foto** usa uma imagem JPEG processada no navegador. O servidor impõe limite de tamanho e exige a sessão da conta proprietária para acessar a imagem.
- **E-mail** passa pela Gmail API para entrega de convites e códigos de recuperação. A auditoria de autenticação mascara endereços de e-mail nos logs.

## Solicitações e workflow

O frontend e a API compartilham as regras de briefing em `src/utils/requestRules.ts`. A API verifica permissões, armazena as medidas de impressos como dados estruturados e aplica transições do Kanban e regras de aprovação dentro de transações.

`backend/requestQueries.ts` reúne listagem paginada, filtros, métricas, exportação, histórico e avisos. A tela de detalhes apresenta a linha do tempo a partir dos eventos, comentários e pareceres persistidos. Rascunhos do formulário, preferência de tema e leitura de avisos usam armazenamento local do navegador.

As migrações da aplicação estão em `database/migrations/`. Os arquivos em `supabase/` servem como referência para o schema legado. Consulte o [guia de configuração](./SETUP.md) para instalar, migrar e validar o projeto.
