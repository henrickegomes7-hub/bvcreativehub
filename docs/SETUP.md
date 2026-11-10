# Guia de Setup e Execução

## Requisitos

- Node.js 22+
- npm
- PostgreSQL configurado
- VS Code (opcional, mas recomendado)

## 1. Instalação

```bash
npm install
```

## 2. Variáveis de ambiente

Crie um arquivo `.env` com base no exemplo disponível em `config/examples` ou no template do projeto.

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
ADMIN_EMAIL=seu-email@dominio.com
ADMIN_BOOTSTRAP_TOKEN=token-secreto-com-32-caracteres-ou-mais
GMAIL_CLIENT_ID=seu-client-id
GMAIL_CLIENT_SECRET=seu-client-secret
GMAIL_REFRESH_TOKEN=seu-refresh-token
GMAIL_SENDER_EMAIL=seu-email-remetente@gmail.com
```

## 3. Execução local

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## 4. Verificações úteis

```bash
npm run lint
npm test
npm run check
```

## 5. Fluxo de bootstrap admin

A conta administrativa inicial deve ser criada usando o token de bootstrap definido no ambiente.

Depois do primeiro cadastro admin, a variável `ADMIN_BOOTSTRAP_TOKEN` pode ser removida ou restringida em produção.

## 6. Boas práticas

- Nunca commitar `.env` em repositório público
- Usar credenciais de produção apenas em ambiente seguro
- Sempre validar logs e auditoria antes de liberar mudanças de autenticação
- Manter role checks explícitos em endpoints sensíveis
