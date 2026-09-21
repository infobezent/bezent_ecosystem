/**
 * Drizzle schema entry point.
 *
 * Phase 0 (Architecture Foundation) deliberately defines NO business
 * tables. `tenants`, `users`, `employees`, and all HRMS/domain tables are
 * designed in a dedicated database architecture phase (see
 * docs/database/ and docs/architecture/DATABASE.md).
 *
 * This file exists so drizzle-kit has a schema module to point at. Export
 * table definitions from here (or re-export from per-domain schema files)
 * once real tables are introduced.
 */

export {};
