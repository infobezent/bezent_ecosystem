# Security Foundation

This document defines the security posture, controls currently in place, and the security boundaries for the BEZENT platform.

## Current Security Controls (Implemented)

- **HTTP Header Hardening:** `helmet` middleware is applied globally to enforce secure HTTP response headers.
- **CORS Configuration:** `cors` middleware is enabled across API routes.
- **API Boundary Input Validation:** Strict request payload and query validation via Zod schemas at the controller boundary before reaching service logic.
- **Centralized Error Sanitization:** Centralized error handling (`apps/api/src/app/errors/errorHandler.ts`) prevents internal details or stack traces from leaking outside development environments.
- **Fail-Fast Database Safety (ADR-016):** Database connection errors fail explicitly with `DATABASE_UNAVAILABLE` rather than silently degrading into insecure in-memory or fallback stores.
- **Environment Configuration:** Sensitive secrets and database credentials reside strictly in git-ignored `.env` files; only `.env.example` is committed.
- **Tenant Data Isolation at Data-Access Layer:** Repository queries enforce tenant scoping by requiring `tenant_id` (and `company_id` where applicable) on database queries.

## Development Context Trust Boundary

- **Pre-Authentication Request Context:** Current API endpoints resolve tenant and company identity through `devContextMiddleware` (`apps/api/src/platform/context/devContext.ts`), which inspects `x-tenant-id` and `x-company-id` request headers and falls back to `DEFAULT_DEV_CONTEXT`.
- **TRUST BOUNDARY WARNING:** `devContext` is **development-only infrastructure** designed to facilitate pre-authentication module development. It is **NOT** secure authentication. Headers can be supplied arbitrarily by clients and are not cryptographically verified or validated against the `tenants` table.

## Not Yet Implemented / Planned Security Controls

The following security controls are planned for future platform milestones and are **not yet implemented**:

- **Authentication:** Password hashing, user credentials, login flows, and token/session issuance.
- **Verified Identity:** Resolving cryptographic claims or verified session state to a specific `User`.
- **Tenant & Company Membership Verification:** Enforcing that an authenticated user is an active member of the requested tenant and company.
- **Authorization & Access Control (RBAC / PBAC):** Role-based and permission-based authorization checks per endpoint.
- **Trusted Tenant Resolution:** Deriving tenant context securely from the authenticated identity rather than client-supplied headers.
- **Rate Limiting:** Protection against brute-force attacks and abuse.
- **Business Audit Logging:** Tamper-evident operational audit logs distinct from application error logging.
- **Production Secrets Management:** Managed KMS / vault solutions for production credential management.
