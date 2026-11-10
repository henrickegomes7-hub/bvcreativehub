# BV Creative Hub 🎨⚡

> Plataforma de gestão, automação e esteira de produção de design gráfico para o Grupo BV.

## Visão geral

O BV Creative Hub centraliza o ciclo completo das demandas criativas do Grupo BV: briefing, aprovação, produção, revisão e acompanhamento operacional. O projeto combina frontend em React, backend em Express e banco PostgreSQL para manter o fluxo de trabalho seguro, rastreável e escalável.

## Stack principal

- Frontend: React 19 + TypeScript + Vite
- Backend: Express + TypeScript
- Banco: PostgreSQL
- Autenticação: sessões com cookie HttpOnly e validações centralizadas
- IA: Gemini API para sugestão de demandas e apoio de briefing
- UI: Tailwind CSS, componentes reutilizáveis e paleta ajustada ao branding BV

## Estrutura

```text
backend/          # autenticação, rotas, banco e middlewares
src/              # frontend da aplicação
public/           # assets públicos
config/           # metadata e exemplos de configuração
database/         # migrações do banco
scripts/          # utilitários e migração
supabase/         # schema e seed legado
tests/            # testes automatizados
```

## Documentação técnica

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/SETUP.md](./docs/SETUP.md)

## Instalação rápida

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

Configure um arquivo `.env` com as chaves essenciais do projeto, incluindo `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_BOOTSTRAP_TOKEN`, e as credenciais do Gmail para reset de senha.

## Observações

A arquitetura foi organizada por módulos e por domínio para facilitar manutenção, reduzir duplicação de lógica e fortalecer segurança e testabilidade.
