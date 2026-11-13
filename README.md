# BV Creative Hub 🎨⚡

> Plataforma de gestão, automação e fluxo operacional para demandas criativas do Grupo BV.

## Visão geral

O BV Creative Hub foi pensado para centralizar e otimizar o ciclo completo de demandas criativas do Grupo BV, desde a captação do briefing até aprovação, produção, revisão e acompanhamento final. A solução combina frontend em React, backend em Express e banco PostgreSQL.

## Destaques

- Gestão de demandas criativas por departamento
- Fluxo de aprovação e acompanhamento de produção
- Autenticação segura com sessões, validações centralizadas e controle de acesso por perfil
- Arquitetura modular e organizada por domínio para facilitar manutenção e escalabilidade
- Estrutura pronta para evolução em ambiente de produção

## Stack tecnológica

- Frontend: React 19 + TypeScript + Vite
- Backend: Express + TypeScript
- Banco de dados: PostgreSQL
- Autenticação: sessões com cookie HttpOnly e validações centralizadas
- UI: Tailwind CSS
- Testes: cobertura automatizada de autenticação e regras de acesso

## Estrutura do projeto

```text
backend/          # autenticação, rotas, banco e middlewares
src/              # frontend da aplicação
public/           # assets públicos
config/           # metadados e exemplos de configuração
database/         # migrações do banco
scripts/          # utilitários e migração
supabase/         # schema e seed legado
tests/            # testes automatizados
docs/             # documentação técnica do projeto
```

## Documentação

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/SETUP.md](./docs/SETUP.md)

## Requisitos

- Node.js >= 22.12.0
- npm
- PostgreSQL
- Chaves de ambiente configuradas

## Instalação

```bash
npm install
npm run dev
```

## Validação

```bash
npm run lint
npm test
npm run check
```

## Variáveis de ambiente

Crie um arquivo `.env` com as variáveis essenciais do projeto, incluindo:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_BOOTSTRAP_TOKEN`
- credenciais do Gmail para reset de senha

Importante: nunca versionar credenciais reais em repositórios públicos. Use variáveis de ambiente seguras em produção.

## Segurança e produção

A base da aplicação foi estruturada com foco em segurança, incluindo:

- validação centralizada de autenticação
- controle de acesso por perfil e permissão
- cookies com flags apropriadas para ambiente web
- headers de segurança defensivos
- organização do código para reduzir riscos e facilitar manutenção

## Status do projeto

O projeto está em estado funcional, com arquitetura organizada, documentação técnica e validação automatizada em place. Para entrega em produção, ainda é necessário configurar HTTPS, domínio, variáveis reais do ambiente e monitoramento do deploy.

## Observação

A arquitetura foi organizada por módulos e por domínio para melhorar manutenção, reduzir duplicação de lógica e fortalecer testabilidade e segurança.
