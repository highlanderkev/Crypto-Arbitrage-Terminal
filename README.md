# Crypto-Arbitrage-Bot (ArbitrageX Terminal)

A crypto cross-exchange arbitrage AI research platform that monitors spread opportunities across major exchanges and generates AI-assisted analysis reports.

## Features

- Live arbitrage opportunity scanning
- Exchange spread and fee analysis
- AI-generated research reports for opportunities
- Real-time price monitoring
- Watchlist management
- Streaming AI chat assistant for arbitrage research

## Tech Stack

- Node.js 24 + TypeScript 5.9
- pnpm workspaces
- API: Express 5
- Frontend: React + Vite + Tailwind
- Database: PostgreSQL + Drizzle ORM
- Validation: Zod

## Repository Layout

- `/artifacts/api-server` - backend API service
- `/artifacts/arb-agent` - frontend application
- `/lib/api-spec` - OpenAPI contract and codegen source
- `/lib/db` - database schema and access layer

## Prerequisites

- Node.js 24
- pnpm
- PostgreSQL

Required environment variables:

- `DATABASE_URL`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`

## Development

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/arb-agent run dev
```

## Build and Typecheck

```bash
pnpm run typecheck
pnpm run build
```

## API Code Generation

If you modify the OpenAPI spec, regenerate client/schemas:

```bash
pnpm --filter @workspace/api-spec run codegen
```
