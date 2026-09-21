# Approved Technology Stack

This is the single source of truth for what BEZENT is built with. It is
**governed by AGENTS.md** (the BEZENT Engineering Constitution): changing
any entry here requires an ADR and explicit approval — see
[AGENTS.md](../../AGENTS.md#article-4--changing-this-stack).

## Approved

| Layer                 | Choice                      | ADR                        |
| --------------------- | --------------------------- | -------------------------- |
| Frontend framework    | React + TypeScript          | [ADR-005](ADRs.md#adr-005) |
| Frontend build tool   | Vite                        | [ADR-005](ADRs.md#adr-005) |
| Backend runtime       | Node.js                     | [ADR-006](ADRs.md#adr-006) |
| Backend framework     | Express.js + TypeScript     | [ADR-006](ADRs.md#adr-006) |
| Database              | MySQL 8+                    | [ADR-007](ADRs.md#adr-007) |
| Database access layer | Drizzle ORM + `drizzle-kit` | [ADR-007](ADRs.md#adr-007) |
| Package manager       | npm (workspaces)            | see below                  |
| Architecture style    | Modular monolith            | [ADR-004](ADRs.md#adr-004) |
| Linting               | ESLint (flat config)        | —                          |
| Formatting            | Prettier                    | —                          |
| CI                    | GitHub Actions              | —                          |

## Explicitly rejected

- **MongoDB / any document database** — the stack resembles a MERN-style
  JavaScript setup, but BEZENT is **React + TypeScript, Node.js + Express +
  TypeScript, MySQL** — not MERN. Never introduce MongoDB or another NoSQL
  store as a substitute for or alongside MySQL without an ADR.
- **Prisma, TypeORM, Sequelize** — evaluated and rejected in favor of
  Drizzle. See [DATABASE.md](DATABASE.md#why-drizzle) for the comparison.
- **Microservices / microfrontends** — rejected for the current scale; see
  [ADR-004](ADRs.md#adr-004).
- **Yarn / pnpm** — the repository uses npm only (see below).

## Package manager: npm only

One package manager, one lockfile: **`package-lock.json`**.

- Never introduce `yarn.lock` or `pnpm-lock.yaml`.
- Never mix `npm install` with `yarn add` / `pnpm add`.
- Workspaces are npm workspaces (`apps/*`), configured in the root
  [package.json](../../package.json).

## Adding or changing a dependency

- **Routine, in-scope dependencies** (a utility library inside an already-
  approved layer, e.g. a date-formatting helper in `apps/web`) may be added
  normally as part of implementation work.
- **Anything that changes this table** — a new framework, a new database
  technology, a new build tool, a new package manager, a new ORM, a new
  architectural style — requires an ADR and explicit approval before
  implementation, per [AGENTS.md](../../AGENTS.md#article-4--changing-this-stack).
