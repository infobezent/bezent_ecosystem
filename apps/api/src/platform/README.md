# platform/

Reusable platform capabilities shared by every current and future business
application (HRMS, and later CRM, Projects, Finance, Inventory, Support).

Business applications (`applications/hrms`, and future applications)
consume these capabilities — they never implement their own
authentication, tenant resolution, or access control.

## Current Platform Capabilities (Implemented)

### Development Application Context (`platform/context/`)

- `devContext.ts` — Pre-authentication request context infrastructure.
- Provides `devContextMiddleware` which extracts `x-tenant-id` and `x-company-id` request headers (falling back to `DEFAULT_DEV_CONTEXT`: `tenant_demo_01` / `comp_demo_01`).
- Mounts `GET /api/v1/context` returning active development context.
- **Trust Boundary:** `devContext` is local development infrastructure only. It is **not** authenticated and does not perform tenant status validation against the database.

> **Note on Tenancy:** The root `tenants` persistence table exists in the database schema (`apps/api/src/db/schema.ts`), but a runtime `platform/tenancy/` service or validation middleware is **not yet implemented** (planned for Step 03C).

## Planned Platform Responsibilities (Not Yet Implemented)

- **Identity & Authentication:** Login, sessions/tokens, password hashing, user credentials.
- **Tenancy Runtime Service:** Server-side tenant status validation, tenant resolution from session, and tenant management lifecycle (Step 03C).
- **Users:** User identity records, distinct from HR employee records (see [docs/architecture/DATABASE.md](../../../../docs/architecture/DATABASE.md), ADR-009).
- **Access Control:** Application access, role assignment, permissions, and scoping (Super Admin / Company Admin / ESS).
- **Audit:** Business operational audit logging, distinct from technical/application logs.
- **Cross-Application Utilities:** Global notifications, approvals, workflow engine, and document repository.

## Sub-boundary Organization

Sub-boundaries within `platform/` are introduced only as their actual implementation begins, avoiding empty scaffolding without functional code behind it. See [docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md).
