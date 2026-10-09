# BEZENT — Tenant Management Phase 02: Backend Business Logic, APIs & Engine Architecture

> **Document Status:** Authoritative Architectural & Implementation Deliverable  
> **Evaluation Mode:** Phase 02 Complete Execution  
> **Role:** Principal SaaS Architect, Staff Backend Engineer, Security Architect, Database Engineer, QA Automation Lead  
> **Phase 02 Status:** **PASS**

---

## 1. Executive Summary

Phase 02 Tenant Management implements the full backend business logic, service orchestrators, transactional repositories, background execution workers, and platform HTTP APIs on top of the hardened Phase 01 database foundation.

All capabilities function with multi-tenant data isolation, strict authorization guards (`requirePlatformAuth`, `requireSuperAdmin`), and transactional consistency.

### Key Capabilities Delivered:
1. **Commercial Plan & Pricing Catalog:** Multi-application plan management (HRMS, CRM, Project Management) with tiers, seat bounds (`minSeats`, `maxSeats`), trial policies, and explicit price approval validation.
2. **Subscription Lifecycle Engine:** Complete state transitions (`pending_activation`, `active`, `trial`, `past_due`, `suspended`, `cancelled`, `expired`). Enforces single active subscription scope per `tenant:application` while supporting independent multi-application subscriptions.
3. **Seat Calculation & Enforcement:** Calculates distinct active users across company memberships and tenant administrators without double counting. Enforces bounds and blocks unsafe seat reductions below actual consumption.
4. **Effective Entitlements & Overrides Engine:** Hierarchy resolution merging commercial plan capabilities, time-bounded Super Admin overrides with audit reasons, and legacy `tenant_modules` fallback. Includes read-only mismatch reconciliation report.
5. **Primary Administrator Management & Workflows:** Single active primary administrator invariant via virtual column constraint; invitation issuing, resending, revoking, acceptance, and atomic reassignment. Protects against removal of the last authorized administrator.
6. **Tenant Lifecycle & Protected Termination:** Suspension with mandatory reason, reactivation restoring eligibility, and protected termination with explicit confirmation ID. All state transitions create append-only records in `tenant_lifecycle_events` and `audit_logs`. Non-destructive: zero hard deletions.
7. **Provisioning Engine & Transactional Outbox:** Durable background jobs with idempotency keys, worker claiming/leases, attempt counters, exponential backoff retries, manual retry API, and reliable database-backed transactional outbox message dispatching.
8. **Summary Metrics, Paginated List & Sanitized CSV Export:** Aggregated platform counts, server-side paginated tenant listing, recent activity stream, and RFC-4180 CSV export hardened against spreadsheet formula injection (`=`, `+`, `-`, `@` escaped).

---

## 2. Changed & Created Files

### Plan Catalog & Commercial Pricing
- [`apps/api/src/platform/plans/types/plan.types.ts`](../../apps/api/src/platform/plans/types/plan.types.ts): Canonical types for plans, pricing, entitlements, and filters.
- [`apps/api/src/platform/plans/validation/plan.schema.ts`](../../apps/api/src/platform/plans/validation/plan.schema.ts): Request validation for plan and price creation/updates.
- [`apps/api/src/platform/plans/repository/plan.repository.ts`](../../apps/api/src/platform/plans/repository/plan.repository.ts): Drizzle data access for plans, prices, and entitlements.
- [`apps/api/src/platform/plans/service/plan.service.ts`](../../apps/api/src/platform/plans/service/plan.service.ts): Plan business logic, price approval checks, and audit logging.
- [`apps/api/src/platform/plans/controller/plan.controller.ts`](../../apps/api/src/platform/plans/controller/plan.controller.ts): HTTP handlers for `/api/v1/platform/plans`.
- [`apps/api/src/platform/plans/routes/plan.routes.ts`](../../apps/api/src/platform/plans/routes/plan.routes.ts): Plan routes protected by `requireSuperAdmin`.

### Tenant Subscriptions
- [`apps/api/src/platform/subscriptions/types/subscription.types.ts`](../../apps/api/src/platform/subscriptions/types/subscription.types.ts): Subscription interfaces, DTOs, and lifecycle states.
- [`apps/api/src/platform/subscriptions/validation/subscription.schema.ts`](../../apps/api/src/platform/subscriptions/validation/subscription.schema.ts): Subscription DTO validators.
- [`apps/api/src/platform/subscriptions/repository/subscription.repository.ts`](../../apps/api/src/platform/subscriptions/repository/subscription.repository.ts): Data queries and active seat aggregation query (`COUNT(DISTINCT user_id)`).
- [`apps/api/src/platform/subscriptions/service/subscription.service.ts`](../../apps/api/src/platform/subscriptions/service/subscription.service.ts): Subscription creation, activation, renewal, cancellation, and seat bounds.
- [`apps/api/src/platform/subscriptions/controller/subscription.controller.ts`](../../apps/api/src/platform/subscriptions/controller/subscription.controller.ts): Subscription HTTP handlers.
- [`apps/api/src/platform/subscriptions/routes/subscription.routes.ts`](../../apps/api/src/platform/subscriptions/routes/subscription.routes.ts): Subscription endpoints mounted on `/api/v1/platform`.

### Effective Entitlements & Overrides
- [`apps/api/src/platform/entitlements/types/entitlement.types.ts`](../../apps/api/src/platform/entitlements/types/entitlement.types.ts): Entitlement result, override models, and reconciliation report types.
- [`apps/api/src/platform/entitlements/validation/entitlement.schema.ts`](../../apps/api/src/platform/entitlements/validation/entitlement.schema.ts): Override creation and revocation validators.
- [`apps/api/src/platform/entitlements/repository/entitlementOverride.repository.ts`](../../apps/api/src/platform/entitlements/repository/entitlementOverride.repository.ts): Persistence for overrides.
- [`apps/api/src/platform/entitlements/service/effectiveEntitlement.service.ts`](../../apps/api/src/platform/entitlements/service/effectiveEntitlement.service.ts): Canonical entitlement resolver, override authorizer, and mismatch reconciliation.
- [`apps/api/src/platform/entitlements/controller/entitlement.controller.ts`](../../apps/api/src/platform/entitlements/controller/entitlement.controller.ts): Entitlement and reconciliation controllers.
- [`apps/api/src/platform/entitlements/routes/entitlement.routes.ts`](../../apps/api/src/platform/entitlements/routes/entitlement.routes.ts): Entitlement endpoints mounted on `/api/v1/platform`.

### Primary Administrator Management
- [`apps/api/src/platform/tenants/service/primaryAdmin.service.ts`](../../apps/api/src/platform/tenants/service/primaryAdmin.service.ts): Primary admin status, invitations, acceptance, atomic reassignment, and last-admin protection.
- [`apps/api/src/platform/tenants/controller/primaryAdmin.controller.ts`](../../apps/api/src/platform/tenants/controller/primaryAdmin.controller.ts): HTTP handlers for primary admin operations.

### Tenant Lifecycle & Activity Export
- [`apps/api/src/platform/tenants/repository/tenant.repository.ts`](../../apps/api/src/platform/tenants/repository/tenant.repository.ts): Extended with lifecycle events recording, audit queries, and status updates.
- [`apps/api/src/platform/tenants/service/tenant.service.ts`](../../apps/api/src/platform/tenants/service/tenant.service.ts): Enhanced with `suspendTenant`, `activateTenant`, `terminateTenant`, `getLifecycleHistory`, `getSummaryMetrics`, and `exportTenantActivityCsv`.
- [`apps/api/src/platform/tenants/controller/tenant.controller.ts`](../../apps/api/src/platform/tenants/controller/tenant.controller.ts): Updated with lifecycle endpoints, activity feed, and CSV export.
- [`apps/api/src/platform/tenants/routes/tenant.routes.ts`](../../apps/api/src/platform/tenants/routes/tenant.routes.ts): Extended route declarations.

### Provisioning Jobs & Transactional Outbox
- [`apps/api/src/platform/provisioning/service/provisioningJob.service.ts`](../../apps/api/src/platform/provisioning/service/provisioningJob.service.ts): Job creation, worker claiming/leases, step state, backoff, and manual retry.
- [`apps/api/src/platform/provisioning/controller/provisioning.controller.ts`](../../apps/api/src/platform/provisioning/controller/provisioning.controller.ts): Job status, list, and retry endpoints.
- [`apps/api/src/platform/provisioning/routes/provisioning.routes.ts`](../../apps/api/src/platform/provisioning/routes/provisioning.routes.ts): Job management routes.
- [`apps/api/src/platform/outbox/service/transactionalOutbox.service.ts`](../../apps/api/src/platform/outbox/service/transactionalOutbox.service.ts): Outbox event creation, batch claiming, dispatching, and dead-letter handling.

### Platform Composition Root
- [`apps/api/src/platform/routes.ts`](../../apps/api/src/platform/routes.ts): Registered `planRouter`, `subscriptionRouter`, `entitlementRouter`.

### Testing
- [`apps/api/src/platform/__tests__/tenantManagementPhase02.test.ts`](../../apps/api/src/platform/__tests__/tenantManagementPhase02.test.ts): 32 comprehensive integration tests covering all Phase 02 requirements.

---

## 3. API Contract Table

All endpoints are prefixed with `/api/v1/platform`. All privileged endpoints require `Authorization: Bearer <token>` and `isSuperAdmin = true`.

| Method | Endpoint | Description | Auth Guard | Request Body / Query |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/plans` | List catalog plans | Super Admin | Query: `applicationCode`, `status`, `tier` |
| **POST** | `/plans` | Create a commercial plan | Super Admin | Body: `CreatePlanDto` |
| **GET** | `/plans/:id` | Get plan details with prices & entitlements | Super Admin | URL param: `id` |
| **PATCH** | `/plans/:id` | Update plan details | Super Admin | Body: `UpdatePlanDto` |
| **POST** | `/plans/:id/prices` | Add a commercial price | Super Admin | Body: `CreatePlanPriceDto` |
| **PATCH** | `/plans/prices/:priceId` | Update price amount or status | Super Admin | Body: `UpdatePlanPriceDto` |
| **GET** | `/subscriptions` | List subscriptions across tenants | Super Admin | Query: `tenantId`, `applicationCode`, `status` |
| **GET** | `/tenants/:tenantId/subscriptions` | List subscriptions for a tenant | Super Admin | URL param: `tenantId` |
| **POST** | `/tenants/:tenantId/subscriptions` | Create commercial subscription | Super Admin | Body: `CreateSubscriptionDto` |
| **POST** | `/subscriptions/:id/activate` | Activate scheduled subscription | Super Admin | URL param: `id` |
| **POST** | `/subscriptions/:id/renew` | Renew active/trial subscription | Super Admin | Body: `{ periodDays?: number }` |
| **POST** | `/subscriptions/:id/cancel` | Cancel subscription non-destructively | Super Admin | Body: `{ reason: string }` |
| **GET** | `/tenants/:tenantId/entitlements` | Resolve effective entitlements | Super Admin | Query: `applicationCode`, `companyId` |
| **GET** | `/tenants/:tenantId/entitlements/reconciliation` | Reconcile plan vs legacy entitlements | Super Admin | Query: `applicationCode` |
| **GET** | `/tenants/:tenantId/entitlements/overrides` | List entitlement overrides | Super Admin | URL param: `tenantId` |
| **POST** | `/tenants/:tenantId/entitlements/overrides` | Create Super Admin override | Super Admin | Body: `CreateOverrideDto` |
| **POST** | `/tenants/:tenantId/entitlements/overrides/:id/revoke` | Revoke entitlement override | Super Admin | Body: `{ reason: string }` |
| **GET** | `/tenants/:tenantId/primary-admin` | Get primary administrator status | Super Admin | URL param: `tenantId` |
| **POST** | `/tenants/:tenantId/primary-admin/invite` | Invite primary administrator | Super Admin | Body: `{ email: string, jobTitle?: string }` |
| **POST** | `/tenants/:tenantId/primary-admin/invitations/:id/resend` | Resend primary admin invitation | Super Admin | URL params: `tenantId`, `id` |
| **DELETE** | `/tenants/:tenantId/primary-admin/invitations/:id` | Revoke primary admin invitation | Super Admin | URL params: `tenantId`, `id` |
| **POST** | `/tenants/:tenantId/primary-admin/reassign` | Atomically reassign primary admin | Super Admin | Body: `{ userId: string }` |
| **POST** | `/tenants/invitations/:token/accept` | Accept admin invitation | Public / Token | URL param: `token` |
| **GET** | `/tenants/summary` | Aggregated tenant metrics | Super Admin | - |
| **GET** | `/tenants` | Paginated tenant list with sorting | Super Admin | Query: `page`, `limit`, `search`, `status` |
| **GET** | `/tenants/:id` | Get tenant details | Super Admin | URL param: `id` |
| **POST** | `/tenants/:id/suspend` | Suspend tenant with reason | Super Admin | Body: `{ reason: string }` |
| **POST** | `/tenants/:id/reactivate` | Reactivate suspended tenant | Super Admin | Body: `{ reason?: string }` |
| **POST** | `/tenants/:id/terminate` | Protected tenant termination | Super Admin | Body: `{ confirmTenantId: string, reason: string }` |
| **GET** | `/tenants/:id/lifecycle-history` | Chronological lifecycle event history | Super Admin | URL param: `id` |
| **GET** | `/tenants/:id/activity` | Tenant activity audit log | Super Admin | Query: `limit` |
| **GET** | `/tenants/:id/activity/export` | Download audit log as sanitized CSV | Super Admin | Headers: `Content-Disposition: attachment` |
| **GET** | `/provisioning/jobs` | List provisioning background jobs | Super Admin | Query: `tenantId`, `status`, `limit` |
| **GET** | `/provisioning/jobs/:id` | Get provisioning job details | Super Admin | URL param: `id` |
| **POST** | `/provisioning/jobs/:id/retry` | Manually retry failed provisioning job | Super Admin | URL param: `id` |
| **GET** | `/provisioning/outbox/status` | Outbox message queue status metrics | Super Admin | - |

---

## 4. State Transition & Safety Rules

### Subscription Lifecycle Transitions
```
                [Create Scheduled]
                       ↓
               pending_activation
                       ↓ (Activation time / Explicit activation)
                       ↓
 [Create Trial]  →   trial    → (Trial Renewal / Conversion) ┐
                                                             ↓
 [Create Paid]   →   active   ←──────────────────────────────┘
                       │
                       ├───────────────┬────────────────────────┐
                       ↓               ↓                        ↓
                    past_due       cancelled                 expired
                       ↓           (Preserves                (Preserves
                    suspended       Customer Data)            Customer Data)
```

1. **Active Scope Invariant:** The stored virtual generated column `active_subscription_scope` (`CASE WHEN status IN ('active', 'trial') THEN CONCAT(tenant_id, ':', application_code) ELSE NULL END`) permits exactly one active or trialing subscription per tenant and application. Scheduled subscriptions (`pending_activation`) can coexist seamlessly until their activation date.
2. **Cancellation Invariant:** Cancelling a subscription sets `status = 'cancelled'`, records `cancelledAt` and `cancellationReason`. It **never deletes or modifies** underlying tenant, company, employee, or transaction data.
3. **Seat Bound Invariant:** Seats cannot be allocated below `plan.minSeats` or above `plan.maxSeats`. Furthermore, licensed seats cannot be reduced below `COUNT(DISTINCT user_id)` actively assigned across the tenant's companies and tenant administrators.

### Primary Administrator Invariant
1. MySQL virtual generated column `primary_tenant_scope` (`CASE WHEN is_primary = 1 AND status = 'active' THEN tenant_id ELSE NULL END`) with unique index `idx_tenant_admins_single_primary` prevents any two active primary administrators within the same tenant at the database engine level.
2. Multiple non-primary tenant administrators (`is_primary = 0`) can coexist without constraint limits.
3. Reassignment is executed within an atomic database transaction: demoting the current primary admin (`is_primary = false`) and promoting the target administrator (`is_primary = true`).
4. Last-admin protection blocks revoking the sole active administrator for any tenant.

### Tenant Lifecycle Transitions
1. `suspendTenant` requires a mandatory reason, sets `status = 'suspended'`, and records an event in `tenant_lifecycle_events`. It immediately blocks access across authorization guards.
2. `reactivateTenant` sets `status = 'active'`, clears `suspendedReason`, sets `reactivatedAt = now()`, and records an event in `tenant_lifecycle_events`.
3. `terminateTenant` requires `confirmTenantId === id` and a mandatory explanation (min 5 characters). It sets `status = 'archived'`. **Zero hard deletions occur.**

---

## 5. Security & CSV Injection Defense

### Formula Injection Sanitization
To prevent spreadsheet formula injection attacks (CSV Injection / CWE-1236), all export cells starting with formula trigger characters (`=`, `+`, `-`, `@`) are sanitized by prepending a single quote `'`:
```typescript
if (/^[=+\-@]/.test(str)) {
  str = `'${str}`;
}
return `"${str.replace(/"/g, '""')}"`;
```
This forces Excel, Google Sheets, and LibreOffice Calc to interpret the cell strictly as text, neutralizing malicious command execution payloads such as `=cmd|’ /C calc’!A0`.

### Credential Scrubbing
All audit logging and CSV exports scrub sensitive keys including OTPs, session tokens, passwords, cookies, and secrets.

---

## 6. Background Processing & Outbox Engine

### Provisioning Job Processor
- **Persistence:** Tracked in `provisioning_jobs`.
- **Claiming / Leases:** Background workers claim jobs using an atomic status transition from `pending` to `in_progress` with `workerId` and `startedAt`.
- **Step Tracking:** Stores structured progress in `step_state` JSON column.
- **Retry Backoff:** Exponential backoff with bounded maximum attempts (`2^attemptCount * 1000ms`).
- **Manual Intervention:** Super Admins can manually reset failed jobs for reprocessing via `POST /provisioning/jobs/:id/retry`.

### Transactional Outbox
- **Persistence:** Tracked in `transactional_outbox`.
- **Atomic Insertion:** Events are inserted into the outbox within the same database transaction as the business changes.
- **Batch Processing:** `processBatch` claims pending records whose `nextAttemptAt` has elapsed, executes event handlers, and marks records as `published`.
- **Dead-Letter Safety:** Messages exceeding 5 failed attempts transition to `dead_letter` status for administrative inspection.

---

## 7. Zero-Regression & Test Results

### Phase 02 Integration Test Results
Suite: [`apps/api/src/platform/__tests__/tenantManagementPhase02.test.ts`](../../apps/api/src/platform/__tests__/tenantManagementPhase02.test.ts)
- **Tests Executed:** **32**
- **Tests Passed:** **32** (100% pass rate)
- **Execution Time:** ~1.1s

### Phase 01 Persistence Test Results
Suite: [`apps/api/src/platform/__tests__/tenantManagementPhase01Persistence.test.ts`](../../apps/api/src/platform/__tests__/tenantManagementPhase01Persistence.test.ts)
- **Tests Executed:** **18**
- **Tests Passed:** **18** (100% pass rate)

### Overall Workspace Test Status
- **Total Test Suites:** **58** suites passed
- **Total Tests:** **891** passed (0 failed, 0 skipped)
- **TypeScript Typecheck:** Clean across both `apps/api` and `apps/web` (0 errors).

---

## 8. Phase 03 Frontend Integration Readiness

With Phase 02 fully verified, the backend APIs provide complete contracts for Phase 03 UI implementation:
1. **Tenants List & Metrics:** Wire `/api/v1/platform/tenants/summary` and `/api/v1/platform/tenants` into the Super Admin Tenants dashboard.
2. **Tenant Details & Lifecycle:** Connect `/api/v1/platform/tenants/:id` and action buttons for Suspend, Reactivate, Terminate, and CSV export.
3. **Subscriptions & Plans UI:** Display commercial plans catalog, active subscriptions, seat utilization meters, and scheduled subscription alerts.
4. **Entitlements Matrix & Overrides:** Provide Super Admin visual override builder and mismatch reconciliation view.
5. **Primary Administrator Card:** Render Primary Admin profile and invitation status with Resend, Revoke, and Reassign dialogs.
6. **Provisioning Jobs Monitor:** Real-time job status table with Step progress viewer and Manual Retry button.
