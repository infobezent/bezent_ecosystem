# Database Architecture

**Status: strategy documented only. No business tables exist in Phase 0.**
Detailed relational design (exact columns, keys, indexes) for tenants,
users, employees, and HRMS domain tables happens in a dedicated database
design phase.

## Stack

MySQL 8+, accessed via **Drizzle ORM** (see ADR-007 / ORM decision below).

### Why Drizzle

Evaluated against Prisma, Sequelize, and TypeORM:

- **Prisma** — excellent DX, but its generated client/schema DSL sits a
  layer removed from real SQL, and its runtime engine adds deployment
  complexity not justified here.
- **TypeORM** — mature, but decorator/metadata-heavy with weaker type
  inference and a clunkier migration story.
- **Sequelize** — weakest TypeScript support (bolted on rather than
  native); doesn't fit a TypeScript-first mandate.
- **Drizzle** — SQL-first schema definitions in TypeScript, strong type
  inference with no codegen step, first-class MySQL support, lightweight
  migration tooling (`drizzle-kit`), straightforward transactions, and
  stays close enough to raw SQL for a MySQL-experienced team to reason
  about directly.

## Phase 0 infrastructure (implemented)

- `apps/api/drizzle.config.ts` — drizzle-kit configuration (dialect,
  schema path, migrations output path, connection credentials from env).
- `apps/api/src/db/connection.ts` — lazily-created `mysql2` pool + Drizzle
  instance. The database is entirely optional: nothing in Phase 0 requires
  it to be configured or reachable.
- `apps/api/src/db/schema.ts` — empty schema entry point (no tables).
- `apps/api/src/db/migrations/` — empty; will hold generated migrations
  once real tables are designed.
- `GET /api/v1/health` reports `database: { configured, connected }`
  when environment variables are present, and `{ configured: false,
connected: false }` otherwise — it never fails because a database isn't
  configured.

## Relational shape (direction, not yet implemented)

```
Tenant
│
├── Users / Memberships
│
├── Organization
│   ├── Business Units
│   ├── Locations
│   ├── Departments
│   ├── Designations
│   └── Positions
│
└── Employees
    │
    ├── Attendance
    ├── Leave
    ├── Shifts
    ├── Documents
    ├── Assets
    ├── Performance
    └── ...
```

No single universal "employee" table holding everything — each domain owns
its own relational tables, related back to `employees`.

## User ≠ Employee (ADR-009)

`User` and `Employee` are, and will remain, separate entities:

- **User** — identity/login: credentials, session/auth state.
- **Employee** — employment/business record: the HR record BEZENT manages.

They may be related (an employee may have a linked user login) but are
never merged. This must support, going forward:

- an employee with no login (no `User`)
- an employee without login access
- a company admin who is also an employee
- an HR user who is also an employee
- a future external user with no employee record
- a terminated employee (employment ended, login state handled separately)
- a disabled login for an active employee
- a rehired employee

No `users`/`employees` tables exist yet — this is documented direction for
the dedicated database design phase, per explicit instruction not to create
these entities prematurely.

## Multi-tenancy

Strategy: **shared database, shared schema, tenant-scoped rows.** Every
future business table carries a `tenant_id` column; every query is
explicitly tenant-scoped server-side (e.g. repository methods require a
`tenantId` argument). Frontend filtering is never treated as isolation —
enforcement is server-side, always.

- **Tenant context** — resolved server-side (from authenticated session/
  token) once identity/auth exists in `platform/`; never trusted from
  client input alone.
- **Tenant ownership** — every tenant-scoped table gets `tenant_id`,
  indexed, and included in every WHERE clause touching that table.
- **Query scoping** — enforced at the data-access layer, not left to
  individual callers to remember per-query.
- **Authorization relationship** — tenant scoping and role/permission
  authorization are separate, composable checks (tenant membership answers
  "can this user see this tenant's data at all"; RBAC answers "can this
  user perform this action").
- **File isolation readiness** — any future document/file storage must key
  storage paths/records by `tenant_id` as well, mirroring row-level
  isolation.
- **Audit isolation readiness** — audit log entries carry `tenant_id` so
  audit queries and retention can be scoped per tenant.

Why shared schema over per-tenant database/schema: simplest to operate and
migrate at this stage; revisit only if a specific compliance requirement
demands stronger physical isolation later.

## Conventions and migrations

The concrete, row-level rules (primary keys, `tenant_id`, timestamps, soft
delete, status fields, indexes, transaction boundaries, migration policy,
naming) are the source of truth in
[docs/database/RULES.md](../database/RULES.md) — this document covers
strategy, that one covers the rule set applied once real tables exist.
