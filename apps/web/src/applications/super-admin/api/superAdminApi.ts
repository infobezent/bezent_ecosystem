/**
 * Compatibility Re-Export Entrypoint for Super Admin API Client.
 *
 * CANONICAL IMPLEMENTATION:
 * apps/web/src/administration/super-admin/api/superAdminApi.ts
 *
 * Under BEZENT Architecture Rules (AGENTS.md, FRONTEND.md, ADR-014),
 * the Super Admin workspace is canonically owned by src/administration/super-admin.
 * This file maintains 100% backward compatibility for all existing imports.
 */

export * from '../../../administration/super-admin/api/superAdminApi';
