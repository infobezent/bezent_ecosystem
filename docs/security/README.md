# Security Foundation

No authentication, authorization, or user-facing feature exists in Phase 0,
so there is nothing to secure yet beyond standard HTTP hardening. This
records what the architecture is preparing for, and what's deliberately not
built yet.

## In place (Phase 0)

- `helmet` for secure HTTP headers.
- `cors` middleware (default/open in Phase 0 — tightened once real origins
  and auth exist).
- Centralized error handler that never leaks stack traces outside
  development (`apps/api/src/app/errors/errorHandler.ts`).
- Environment-based configuration; `.env` is git-ignored, only
  `.env.example` (with no real secrets) is committed.

## Prepared for, not yet implemented

- Password hashing and secure authentication (`platform/` identity, future).
- Authorization / RBAC (`platform/` access-control, future).
- Tenant isolation enforcement at the query layer (see
  [../architecture/DATABASE.md](../architecture/DATABASE.md#multi-tenancy)).
- Rate limiting.
- Stricter CORS policy once real frontend origins/environments are defined.
- Input validation at API boundaries (see
  [../architecture/BACKEND.md](../architecture/BACKEND.md#validation)) —
  applies once the first module endpoint accepts input.
- File upload validation (once file/document handling exists).
- Business audit logs, distinct from technical/application logs (see
  `platform/` audit, future).
- Secrets management beyond local `.env` (e.g. a managed secrets store) —
  to be decided per deployment environment.

No fake/demo authentication is implemented to "show" the architecture —
per explicit instruction, this is deferred until real identity
infrastructure is built.
