# Database Rules

The source of truth for the concrete, row-level conventions every BEZENT
table follows. For _why_ the database is shaped this way (ORM choice,
multi-tenancy strategy, User vs Employee), see
[../architecture/DATABASE.md](../architecture/DATABASE.md) — that document
is the strategy; this one is the rule set applied once real tables exist.

**No business tables exist yet** (Phase 0). These rules apply from the
first migration onward, in the dedicated database design phase.

## Primary keys

Surrogate keys, not natural keys (e.g. never a business code or email as a
primary key). Exact type (`bigint unsigned auto_increment` vs UUID) is
finalized in the database design phase and applied consistently across all
tables once decided — not mixed per table.

## Foreign keys

Declared explicitly and enforced at the database level (not just assumed
at the application layer).

## `tenant_id`

Present on every tenant-scoped table, indexed, and included in every query
touching that table. Absent only on genuinely global/platform tables with
no per-tenant meaning (e.g. a future system-wide settings table). See
[../architecture/DATABASE.md](../architecture/DATABASE.md#multi-tenancy)
for the enforcement strategy.

## Timestamps

`created_at` and `updated_at` on every table, with database-managed
defaults (not application-computed).

## `created_by` / `updated_by`

Added where knowing who made a change is operationally useful — most
business/configuration tables. Omitted on purely derived or high-volume
log-like tables where it adds no value.

## Soft delete

Applied **selectively, not blanket**:

- Appropriate where a record has downstream references that must remain
  valid after removal (e.g. an employee record referenced by historical
  payroll/attendance).
- Not appropriate for simple lookup/config tables, where a hard delete is
  safe and soft-delete would only add unnecessary query complexity (every
  query would need a `deleted_at IS NULL` filter for no real benefit).
- The decision is made per table when it's designed, and documented at
  that table's definition — never applied uniformly "to be safe."

## Status fields

Explicit, enum/lookup-backed status columns — never overload a boolean or a
nullable timestamp to imply state (e.g. no `deleted_at IS NOT NULL` doing
double duty as a business "inactive" status).

## Unique constraints and indexes

Defined per actual access pattern once real queries are known. Any
constraint meant to be per-tenant (e.g. a unique employee code) includes
`tenant_id` in the composite uniqueness — never a global unique constraint
where a per-tenant one was intended.

## Transaction boundaries

A service-layer operation that writes to more than one table wraps those
writes in a single Drizzle transaction. Multi-table writes are never left
to happen as separate, unguarded statements.

## Migrations only

All schema changes go through `drizzle-kit` migrations committed to
`apps/api/src/db/migrations/`. Production databases are never hand-edited,
and migrations are never edited retroactively after they've been applied
anywhere — a mistake is corrected with a new migration.

## Seeding

Development seed data is clearly synthetic and documented as
development-only. Never fabricate data that looks like real production
records (real-looking names tied to a real company, realistic-looking
PII, etc.).

## Naming conventions

- Tables: `snake_case`, plural (`employees`, `leave_requests`).
- Columns: `snake_case`.
- Foreign key columns: `<referenced_table_singular>_id` (e.g.
  `employee_id`, `tenant_id`).

## Changing these rules

These conventions apply platform-wide once real tables exist. Changing them
(e.g. switching primary key strategy, changing the soft-delete policy) is
an architectural change requiring the ADR + approval process in
[../../AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
