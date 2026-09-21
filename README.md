# BEZENT — Business Ecosystem Zentram

BEZENT is a modular business platform. It is **not** solely an HRMS — HRMS is the
first business application built on top of a shared platform core that will later
host CRM, Project Management, Finance, Inventory, and Support.

The architecture foundation (Phase 0) and the **global UI foundation**
(Phase 0B: tokens/theme, icons, components, AppShell, Global Search, global
utilities, HRMS navigation) are complete and **frozen** — see
[docs/architecture/UI-MIGRATION-FINAL.md](docs/architecture/UI-MIGRATION-FINAL.md).
No HRMS business module, business database table or business API exists yet;
HRMS destinations render development placeholders. Next: Phase 1 —
Organization Management.

## Start here

**[AGENTS.md](AGENTS.md)** is the BEZENT Engineering Constitution — the
mandatory ruleset for every human and AI contributor. Read it, and the
document it points you to for the area you're changing, before modifying
any code.

## Documentation map

| Topic                                                      | Document                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Engineering Constitution (rules, ADR process)              | [AGENTS.md](AGENTS.md)                                                                     |
| Architecture terminology (Platform / Application / Module) | [AGENTS.md — BEZENT Architecture Terminology](AGENTS.md#bezent-architecture-terminology)   |
| Architecture overview & phase roadmap                      | [docs/architecture/README.md](docs/architecture/README.md)                                 |
| Approved technology stack                                  | [docs/architecture/TECH-STACK.md](docs/architecture/TECH-STACK.md)                         |
| Repository / workspace architecture                        | [docs/architecture/REPOSITORY.md](docs/architecture/REPOSITORY.md)                         |
| Frontend architecture                                      | [docs/architecture/FRONTEND.md](docs/architecture/FRONTEND.md)                             |
| Backend architecture                                       | [docs/architecture/BACKEND.md](docs/architecture/BACKEND.md)                               |
| Database architecture (strategy)                           | [docs/architecture/DATABASE.md](docs/architecture/DATABASE.md)                             |
| Database rules (conventions)                               | [docs/database/RULES.md](docs/database/RULES.md)                                           |
| Application boundaries                                     | [docs/architecture/APPLICATION-BOUNDARIES.md](docs/architecture/APPLICATION-BOUNDARIES.md) |
| Dependency rules                                           | [docs/architecture/DEPENDENCY-RULES.md](docs/architecture/DEPENDENCY-RULES.md)             |
| Design-system ownership                                    | [docs/architecture/DESIGN-SYSTEM.md](docs/architecture/DESIGN-SYSTEM.md)                   |
| UI rules (incl. no inline CSS)                             | [docs/architecture/UI-RULES.md](docs/architecture/UI-RULES.md)                             |
| Old UI migration strategy                                  | [docs/architecture/UI-MIGRATION.md](docs/architecture/UI-MIGRATION.md)                     |
| Coding standards                                           | [docs/CODING-STANDARDS.md](docs/CODING-STANDARDS.md)                                       |
| API standards                                              | [docs/api/STANDARDS.md](docs/api/STANDARDS.md)                                             |
| Security foundation                                        | [docs/security/README.md](docs/security/README.md)                                         |
| Architecture Decision Records                              | [docs/architecture/ADRs.md](docs/architecture/ADRs.md)                                     |

## Stack

- **Frontend:** React + TypeScript + Vite (`apps/web`)
- **Backend:** Node.js + Express + TypeScript (`apps/api`)
- **Database:** MySQL 8+ via Drizzle ORM

See [docs/architecture/TECH-STACK.md](docs/architecture/TECH-STACK.md) for
the full approved stack, what's explicitly rejected (no MongoDB, npm only),
and how to change it.

## Workspace layout

```
apps/
  web/     React + TS + Vite frontend
  api/     Express + TS backend
docs/      Architecture, database, API and security documentation
scripts/   Repo-level scripts
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in real values, especially DB credentials
npm run dev             # starts apps/api and apps/web together
```

Other useful scripts:

```bash
npm run dev:web        # frontend only
npm run dev:api        # backend only
npm run build           # build both apps
npm run typecheck       # typecheck both apps
npm run lint             # lint the whole repo
npm run format:check    # verify formatting
npm run test              # API tests (1) + frontend navigation/route tests (20)
```

## Current scope

Structure + the frozen global UI foundation only: application boundaries, the
global shell with HRMS navigation/routing, an API health endpoint, and
Drizzle/MySQL connectivity infrastructure with **no business tables**. See
[docs/architecture/README.md](docs/architecture/README.md) for what is
intentionally deferred and why.
