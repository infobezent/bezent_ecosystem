# platform/

Reusable platform capabilities shared by every current and future business
application (HRMS, and later CRM, Projects, Finance, Inventory, Support).

Business applications (`applications/hrms`, and future applications)
consume these capabilities — they never implement their own
authentication, tenant resolution, or access control.

## Future responsibilities (not implemented in Phase 0)

- **Identity / authentication** — login, sessions/tokens, password handling.
- **Tenants** — tenant resolution, tenant context propagation.
- **Users** — user identity records, distinct from HR employee records
  (see [docs/architecture/DATABASE.md](../../../../docs/architecture/DATABASE.md), ADR-009).
- **Access control** — application access, role assignment, permissions,
  scope (Super Admin / Company Admin and beyond).
- **Audit** — business audit logging, distinct from technical/application
  logs.
- **Notifications, approvals, workflow, documents** — introduced only when
  a real module needs them.

## Why this is a single folder right now

Per the current architecture phase, `platform/` is intentionally **not**
pre-split into `identity/`, `tenants/`, `users/`, etc. Sub-boundaries are
created only when a real application's implementation requires them, to
avoid scaffolding that has no code behind it. See
[docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md).
