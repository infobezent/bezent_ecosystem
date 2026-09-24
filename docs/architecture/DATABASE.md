# Database Architecture

**Status: Implemented.** MySQL 8.4+ and Drizzle ORM form the authoritative persistence layer for all persistent backend capabilities. Silent in-memory fallbacks are prohibited (ADR-016).

## Stack

MySQL 8.4+, accessed via **Drizzle ORM** (see ADR-007 / ORM decision below).

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

## Persistence Infrastructure (Implemented)

- `apps/api/drizzle.config.ts` — drizzle-kit configuration (MySQL dialect,
  schema path, migrations output path, credentials from environment).
- `apps/api/src/db/connection.ts` — MySQL connection pool (`mysql2`) and Drizzle instance. All persistent operations require an active, reachable database. Unreachable database connections fail fast by throwing `DatabaseConnectionError` (`500 DATABASE_UNAVAILABLE`).
- `apps/api/src/db/schema.ts` — Active Drizzle schema defining platform, organization masters, onboarding, and settings tables.
- `apps/api/src/db/migrations/` — Active migration directory tracked by Drizzle Kit metadata (`_journal.json`), containing versioned SQL migrations (0000–0005).
- `apps/api/src/db/seed.ts` — Deterministic development seed runner creating platform root tenants (`tenant_demo_01`), company masters (`comp_demo_01`), organization units, and default onboarding configuration.
- `GET /api/v1/health` reports `database: { configured, connected }` checking live pool connectivity.

## Implemented Database Schema (Current)

The current schema contains 13 active tables across platform and HRMS domains:

1. **Platform Root (Tenancy Foundation — PR #45 / Step 03A):**
   - `tenants` — Top-level customer/tenant isolation boundary (`id`, `name`, `status`, `created_at`, `updated_at`).
2. **Organization Masters:**
   - `companies` — Legal business entities within a tenant (`id`, `tenant_id`, `name`, `code`, `status`, timestamps).
   - `departments` — Department units scoped to company (`id`, `tenant_id`, `company_id`, `name`, `code`, `status`, timestamps).
   - `designations` — Job designations scoped to company (`id`, `tenant_id`, `company_id`, `name`, `code`, `status`, timestamps).
   - `locations` — Physical locations scoped to company (`id`, `tenant_id`, `company_id`, `name`, `code`, `city`, `country`, `status`, timestamps).
3. **HRMS Onboarding:**
   - `onboarding_cases` — Active candidate onboarding records (`id`, `tenant_id`, `company_id`, candidate details, `current_stage_code`, `status`, timestamps).
   - `onboarding_case_stage_history` — Audit trail of stage transitions (`id`, `tenant_id`, `company_id`, `case_id`, `from_stage_code`, `to_stage_code`, timestamps).
4. **HRMS Onboarding Settings:**
   - `onboarding_general_settings` — General onboarding policies scoped to `(tenant_id, company_id)`.
   - `onboarding_stage_configs` — Stage pipeline definitions per company.
   - `onboarding_field_configs` — Dynamic form field configurations per company.
   - `onboarding_document_requirements` — Document requirements per company.
   - `onboarding_checklist_templates` — Preboarding checklist templates per company.
   - `onboarding_conversion_settings` — Settings for employee conversion per company.

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

Strategy: **shared database, shared schema, tenant-scoped rows.**

### Current Implementation (Step 03A)

- **Root Tenant Table:** The `tenants` table exists in MySQL/Drizzle (`id`, `name`, `status`, `created_at`, `updated_at`).
- **Seeding Order:** `tenant_demo_01` is seeded before dependent company and master records.
- **Tenant Scoping:** All business tables carry `tenant_id` (`varchar(64) NOT NULL`), and child records additionally carry `company_id`. Repository queries explicitly filter by `tenantId` and `companyId`.
- **Development Request Context:** Multi-tenancy request scoping is currently resolved via `devContextMiddleware` from `x-tenant-id` and `x-company-id` headers (falling back to `DEFAULT_DEV_CONTEXT`).

### Planned / Not Yet Implemented (Step 03B, Step 03C, & Future)

- **Company -> Tenant Foreign Key:** `companies.tenant_id` is NOT yet constrained by a foreign key to `tenants.id` (deferred to Step 03B after data verification and migration preparation).
- **Tenant-Scoped Company Code Uniqueness:** Uniqueness for `companies.code` is currently global, not yet scoped per `tenant_id` (planned for Step 03B).
- **Per-Request Tenant Validation:** Tenant existence and active status are NOT yet validated per request (planned for Step 03C platform tenancy middleware).
- **Tenant Management API:** Tenant CRUD operations and administration endpoints do not yet exist.
- **Trusted Production Authentication:** Resolving tenant context from cryptographically signed tokens or verified session identity is not yet implemented.

Why shared schema over per-tenant database/schema: simplest to operate and
migrate at this stage; revisit only if a specific compliance requirement
demands stronger physical isolation later.

## Conventions and migrations

The concrete, row-level rules (primary keys, `tenant_id`, timestamps, soft
delete, status fields, indexes, transaction boundaries, migration policy,
naming) are the source of truth in
[docs/database/RULES.md](../database/RULES.md) — this document covers
strategy, that one covers the rule set applied once real tables exist.
