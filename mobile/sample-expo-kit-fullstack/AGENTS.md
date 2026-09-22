# Agent Instructions

This file gives AI coding agents the minimum context needed to work in this repository. It applies to the whole repo.

Stack-specific guidance lives in the agent skills installed at scaffold time — Better Auth, Hono, HeroUI Native, Turborepo, the AI SDK, React, and React Native each ship their own. Read those for library APIs; read this file for how the repo is laid out and how to run it.

## Bun Only

This repository is Bun-only. Use `bun` and `bun run` for everything; npm, pnpm, and Yarn are not supported. The Bun version is pinned in `.bun-version`.

## Project Structure

A Turborepo monorepo on Bun workspaces:

- `apps/api/` — the API (Hono, oRPC)
- `apps/mobile/` — the mobile app (React Native, Expo, Uniwind, HeroUI Native)
- `apps/web/` — the web app (React, TanStack Start, shadcn/ui)
- `packages/api/` — shared oRPC contracts and routers
- `packages/auth/` — Better Auth configuration
- `packages/config/` — shared TypeScript configuration
- `packages/db/` — Drizzle schema and migrations
- `packages/env/` — environment variable schemas and validation
- `packages/solana-client/` — the Solana Kit RPC client used by the API

Everything under `packages/` is published to the workspace under the `@repo` scope — `@repo/db`, `@repo/env`, and so on. The scope is deliberately generic so renaming the project never rewrites an import; do not rename it to match the project.

## Common Commands

Run these from the repository root; Turborepo fans them out across the workspaces.

- `bun install` installs every workspace.
- `bun run build` builds all apps.
- `bun run check-types` type checks all packages.
- `bun run lint` runs Biome; `bun run lint:fix` applies its fixes.
- `bun run test` runs the test tasks, including the turbo generator smoke test.
- `bun run ci` runs build, check-types, lint, and test in that order.
- `bun run dev:api`, `bun run dev:web`, `bun run dev:mobile` start one app each.
- `bun rename <name>` renames the project across every file.

Run a command inside one workspace with `bun run --cwd apps/web <script>`.

## Database

All database operations run from the root, against the schema in `packages/db/src/schema/`:

- `bun run db:local` starts a local libSQL server on port 8080.
- `bun run db:push` pushes schema changes to the database.
- `bun run db:generate` generates Drizzle migrations.
- `bun run db:migrate` runs migrations.
- `bun run db:studio` opens the database UI.

## Editing Rules

- Match the surrounding code. Biome owns formatting — single quotes, no semicolons, sorted imports — so run `bun run lint:fix` rather than hand-formatting.
- Run `bun run check-types` and `bun run lint` after editing, and fix what they report before calling the work done.
- Do not edit `apps/web/src/routeTree.gen.ts`, `bun.lock`, or anything under `packages/db/src/migrations/` by hand. Regenerate them instead.
- Add a package with the generator (`bun turbo gen pkg`) so it lands with the right `tsconfig.json` and `@repo` name.
- Keep `.env` out of git. Add new configuration to the matching `.env.example` and to the schema in `packages/env/`.
- Never commit secrets, private keys, seed phrases, API tokens, or personal wallet addresses.

## Solana

- The API holds a read-only Kit client (`packages/solana-client`) and reads its endpoint from `SOLANA_ENDPOINT`.
- Wallet connection, signing, and sending all happen client-side, in `apps/web` and `apps/mobile`, and only after an explicit user action and approval in the connected wallet.
- Do not add code that signs or submits a transaction without a deliberate user action, and do not move signing to the server.
