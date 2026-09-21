# Repository Architecture

How this monorepo is organized, and why. For the products it houses, see
[README.md](../../README.md); for the technology it's built with, see
[TECH-STACK.md](TECH-STACK.md).

## Workspace strategy

npm workspaces, single root `package.json`, single `package-lock.json`.
Two workspaces today:

```
bezent_ecosystem/
├── apps/
│   ├── web/     React + TypeScript + Vite frontend
│   └── api/     Node.js + Express + TypeScript backend
├── docs/        Architecture, database, API, and security documentation
├── scripts/     Repository-level automation (empty until a concrete need arises)
├── .github/     CI workflows
├── package.json          root workspace + script orchestration
├── package-lock.json
├── tsconfig.json          base TypeScript config, extended per app
├── eslint.config.mjs      flat ESLint config covering both apps
├── .prettierrc.json
├── .env.example
├── README.md              entry point — links to every document below
├── AGENTS.md              BEZENT Engineering Constitution (mandatory reading)
└── CLAUDE.md              pointer to AGENTS.md for AI coding sessions
```

## Why `apps/*` and not a flat `src/`

Each deployable unit (the frontend SPA, the backend API) is its own npm
workspace with its own `package.json`, `tsconfig.json`, and build/test
scripts, while sharing root-level lint/format/TypeScript base config. This
keeps the two apps independently buildable and testable while still
governed by one set of repository-wide rules.

## `packages/*` — not created yet

A `packages/` directory for shared, published-internally code (e.g.
`packages/shared-contracts`) is anticipated by the architecture but does
not exist yet. It is created only when a real, concrete need exists — see
[DEPENDENCY-RULES.md](DEPENDENCY-RULES.md#shared-contracts-packagesshared-contracts).
Do not create `packages/` speculatively.

## `docs/` structure

```
docs/
├── architecture/   Source-of-truth architecture documents (this directory)
├── database/       Database rules and (later) detailed schema/ERD documentation
├── api/            API standards and endpoint documentation
└── security/       Security foundation and what's deferred
```

Every document under `docs/` is **governed documentation** per
[AGENTS.md](../../AGENTS.md) — see that file's document map for which one
to read before touching which part of the codebase.

## Adding a new top-level folder

A new top-level folder under `apps/`, `packages/`, or at the repository
root is an architectural change: it requires the justification + ADR +
approval process in [AGENTS.md](../../AGENTS.md#article-4--changing-this-stack)
before it's created, not after.
