# Database Rules

The source of truth for the concrete, row-level conventions every BEZENT
table follows. For _why_ the database is shaped this way (ORM choice,
multi-tenancy strategy, User vs Employee), see
[../architecture/DATABASE.md](../architecture/DATABASE.md) — that document
is the strategy; this one is the rule set applied across migrations and schema.

## Separation of Mandatory Rules and Current Conventions

- **Mandatory Rule:** An invariant enforced platform-wide. Deviations require an ADR and explicit approval per [AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
- **Current Convention:** An implementation pattern established in current schema/migrations that meets current needs, but may be evolved or refined for new domains without violating constitutional invariants.

## Primary Keys

- **Mandatory Rule:** Surrogate keys, never natural keys (e.g. never a business code, email, or composite business attribute as a primary key).
- **Current Convention:** Existing tables use descriptive string surrogate keys stored in `varchar(64)` (e.g. `tenant_demo_01`, `comp_demo_01`, `dept_eng_01`, `case_arun_01`).

## `tenant_id` and `company_id` Scoping

- **Mandatory Rule:** Present on every tenant-scoped table, indexed, and included in every query touching that table. Frontend filtering is never treated as isolation — queries in repositories must explicitly enforce tenant and company scoping server-side.
- **Current Convention:** All business tables declare `tenant_id varchar(64) NOT NULL`. Child business records that belong to a legal company entity additionally declare `company_id varchar(64) NOT NULL`.

## Foreign Keys

- **Mandatory Rule:** Declared explicitly and enforced at the database level where relational integrity is required.
- **Current State:** Child tables declare explicit foreign keys to parent entities (e.g. `company_id` references `companies.id`, `case_id` references `onboarding_cases.id`). Note: `companies.tenant_id` referencing `tenants.id` is planned for Step 03B following data verification.

## Timestamps

- **Mandatory Rule:** `created_at` and `updated_at` on every table, managed by database-level defaults (`defaultNow()` and `onUpdateNow()`), not computed in application code.

## `created_by` / `updated_by`

- **Mandatory Rule:** Added where knowing who made a change is operationally useful — business and configuration tables. Omitted on purely derived or high-volume log-like tables where it adds no value.

## Soft Delete

- **Mandatory Rule:** Applied **selectively, not blanket**:
  - Appropriate where a record has downstream references that must remain valid after removal (e.g. an employee record referenced by historical payroll/attendance).
  - Not appropriate for simple lookup/config tables, where a hard delete is safe and soft-delete would only add unnecessary query complexity (every query would need a `deleted_at IS NULL` filter for no real benefit).
  - The decision is made per table when it's designed, and documented at that table's definition — never applied uniformly "to be safe."

## Status Fields

- **Mandatory Rule:** Explicit, enum/lookup-backed status columns — never overload a boolean or a nullable timestamp to imply state (e.g. no `deleted_at IS NOT NULL` doing double duty as a business "inactive" status).

## Unique Constraints and Indexes

- **Mandatory Rule:** Defined per actual access pattern. Any constraint meant to be per-tenant must include `tenant_id` (and `company_id` where applicable) in the composite uniqueness — never a global unique constraint where a tenant-scoped one is required.
- **Current Convention:** Existing configuration tables use composite unique indexes (e.g. `(tenant_id, company_id, code)`). Note: `companies.code` uniqueness is currently global in migration history; tenant-scoped uniqueness is planned for Step 03B.

## Transaction Boundaries

- **Mandatory Rule:** A service-layer operation that writes to more than one table wraps those writes in a single Drizzle transaction. Multi-table writes are never left to happen as separate, unguarded statements.

## No Silent In-Memory Persistence Fallbacks (ADR-016)

- **Mandatory Rule:** Persistent repositories and services MUST NOT fall back to in-memory, mock, or silent mock stores when MySQL is unavailable. Unreachable databases must fail fast with `DatabaseConnectionError` (`500 DATABASE_UNAVAILABLE`). Production-like behavior must be deterministic across all environments.

## Migrations Only

- **Mandatory Rule:** All schema changes go through `drizzle-kit` migrations committed to `apps/api/src/db/migrations/`. Production databases are never hand-edited, and applied migrations are never edited retroactively — mistakes are corrected with a new migration.

## Seeding

- **Mandatory Rule:** Development seed data is deterministic, synthetic, and executed in explicit dependency order.
- **Current Convention:** Root tenant `tenant_demo_01` is seeded first, followed by company `comp_demo_01`, organization master units, and onboarding default configurations. Never fabricate data resembling real production records or live PII.

## Naming Conventions

- Tables: `snake_case`, plural (`tenants`, `companies`, `onboarding_cases`).
- Columns: `snake_case` in SQL (`tenant_id`, `created_at`).
- Foreign key columns: `<referenced_table_singular>_id` (e.g. `company_id`, `tenant_id`, `case_id`).

## Changing These Rules

Changing mandatory rules (e.g. switching primary key strategy, introducing non-MySQL persistence) is an architectural change requiring the ADR + approval process in [AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
