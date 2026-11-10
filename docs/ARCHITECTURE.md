# Arquitetura do Projeto

## Visão geral

O BV Creative Hub é uma aplicação full-stack composta por:

- Frontend em React + TypeScript + Vite
- Backend em Express + TypeScript
- Banco PostgreSQL para autenticação, usuários, departamentos e demandas
- Middleware de autenticação e autorização centralizado
- Rotas organizadas por domínio para facilitar manutenção

## Estrutura principal

```text
backend/
  audit.ts              # registro de eventos de autenticação e auditoria
  auth.ts               # helpers de validação, sessão, hash e autorização
  authRoutes.ts         # rotas públicas de autenticação
  usersRoutes.ts        # rotas de usuários
  departmentsRoutes.ts  # rotas de departamentos
  requestsRoutes.ts     # rotas de demandas e workflow
  routes.ts             # agregador de roteadores
  database.ts           # pool do PostgreSQL

src/
  components/           # views e componentes por funcionalidade
  services/             # integrações e fluxo de dados do app
  lib/                  # utilitários e conexão com cliente externo
  types/                # contratos TypeScript
  utils/                # helpers e regras de negócio
  App.tsx               # orquestração principal do frontend
  main.tsx              # bootstrap da aplicação

public/
  assets/               # imagens e recursos visuais

config/
  examples/             # templates de env/configuração
  metadata.json         # metadados da plataforma

scripts/
  migrate.ts            # migração e bootstrap do banco

tests/
  auth.test.ts          # testes de validação e helpers
  auth-routes.test.ts   # testes de sessão e acesso administrativo
```

## Fluxo de autenticação

1. O cliente envia email/senha para `/auth/login`.
2. O backend valida formato e credenciais com helpers compartilhados.
3. Uma sessão segura é criada e enviada em cookie HttpOnly.
4. Middlewares `requireUser` e `requireAdmin` validam a sessão e autorização.
5. Endpoints sensíveis acessam apenas dados permitidos ao role atual.

## Segurança aplicada

- Validação rígida de email e senha
- Hash de senha com salt e scrypt
- Sessões armazenadas com hash e expiração
- Cookies com `HttpOnly` e `SameSite`
- Regras de autorização por role e e-mail administrativo
- Auditoria com mascaramento de e-mail em logs

## Padrões de desenvolvimento

- Centralizar validações em `backend/auth.ts`
- Manter rotas por domínio em arquivos separados
- Evitar duplicação lógica entre endpoints
- Preferir helpers reutilizáveis em vez de validações espalhadas
- Validar com `npm run check` antes de fechar mudanças
