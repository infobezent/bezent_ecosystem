# BEZENT — Phase 02.6: Production Backend Remediation, Tenant Creation Orchestration & Runtime Integration

## 1. Executive Summary

Phase 02.6 closes all verified architectural, security, and runtime gaps identified in the Phase 02.5 audit. It transitions BEZENT's Tenant Management and Subscription backend from static isolated data services into a fully integrated, transactionally atomic, and operationally resilient modular-monolith backend ready for the finalized Super Admin frontend.

Key deliverables completed:
- **Slice A (P0-1):** Production Atomic Create Tenant Orchestrator (`TenantCreationOrchestrationService`) supporting 4-step wizard payloads, durable SHA-256 idempotency caching with payload-mismatch conflict detection, and transactional rollback across tenant, company, subscriptions, pending invitation, initial provisioning jobs, outbox events, and audit logs.
- **Slice B (P0-2):** Commercial Entitlement to Runtime Access Integration. Reconciled `tenant_subscriptions` -> `effectiveEntitlementService` -> `moduleService` -> `tenant_modules`. Integrated commercial plan entitlements into runtime request authorization while maintaining backward compatibility for unseeded legacy tenants.
- **Slice C (P1-2, P2-1, P2-2):** Hardened Primary Admin Invitation Acceptance workflow with token hashing (SHA-256), 72-hour expiry, authenticated identity binding, IP/fingerprint rate limiting, and atomic creation of Primary Company `memberships` (`company_admin` role) and RBAC synchronization.
- **Slice D (P1-1, P2-3):** Runtime integration of background worker polling loops in `main.ts` (`BackgroundWorkerRunner`). Manages bounded transactional outbox processing, async email dispatch, scheduled subscription activation, and trial expiration sweeps. Exposes `/api/v1/platform/provisioning/workers/status`.
- **Slice E (P1-3, P1-4):** Summary & All Tenants List APIs with mutually exclusive `trialTenants` classification metric, parameterized search, lifecycle filtering, whitelist sorting, and full projection DTOs.
- **Slice F (P1-5):** Composite Tenant Overview API (`GET /api/v1/platform/tenants/:id/overview`) aggregating tenant identity, company info, primary admin summary, subscriptions, seat usage, provisioning status, and attention items.
- **Slice G:** Audit activity retrieval with date range/pagination and formula-injection-defended CSV streaming export (`GET /api/v1/platform/tenants/:id/activity/export`).
- **Slice H:** Zero destructive schema modifications, forward-only safety verification, and 100% pass across all 911 backend tests (59 test suites).

---

## 2. Confirmed Phase 02.5 Issues & Remediation Status

| Issue ID | Severity | Description | Phase 02.6 Remediation Status |
|---|---|---|---|
| **P0-1** | Critical | Missing atomic Create Tenant orchestration across 4-step wizard entities | **RESOLVED.** Implemented `TenantCreationOrchestrationService` with complete multi-table transaction rollback and durable idempotency. |
| **P0-2** | Critical | Commercial entitlements disconnected from runtime authorization (`moduleService`) | **RESOLVED.** Integrated `effectiveEntitlementService` into `moduleService.isTenantEntitled` and runtime access guards. |
| **P1-1** | High | Background workers (outbox, provisioning, sweeper) not registered in runtime | **RESOLVED.** Implemented `BackgroundWorkerRunner`, registered in `main.ts` with bounded intervals and graceful shutdown. |
| **P1-2** | High | Primary Admin invitation acceptance missing company membership creation | **RESOLVED.** `PrimaryAdminService.acceptInvitation` atomically provisions primary company membership with `company_admin` role and RBAC sync. |
| **P1-3** | High | Missing trial tenant summary metric in `GET /tenants/summary` | **RESOLVED.** Added deterministic `trialTenants` counter: active trial sub with 0 active paid subs. |
| **P1-4** | High | Tenant list missing search, filtering, sorting, and projections | **RESOLVED.** Implemented comprehensive list repository queries with whitelist sort and primary admin projection. |
| **P1-5** | High | Missing composite Tenant Overview API | **RESOLVED.** Implemented `GET /api/v1/platform/tenants/:id/overview`. |
| **P2-1** | Medium | Synchronous invitation email delivery | **RESOLVED.** Asynchronous delivery via transactional outbox worker (`tenant.invitation.issued`). |
| **P2-2** | Medium | Missing public invitation acceptance rate limiting | **RESOLVED.** Added `invitationAcceptRateLimiter` middleware enforcing IP and token fingerprint bounds. |
| **P2-3** | Medium | Missing scheduled subscription activation and expiry processing | **RESOLVED.** Implemented lifecycle sweeper in `BackgroundWorkerRunner` checking scheduled activations and expired trials every 60s. |

---

## 3. Architecture Decisions

1. **Option A Internal Billing (No External Gateway):** Subscriptions and plans are managed purely through platform repositories and internal business logic. No Stripe/PayPal/Razorpay dependencies.
2. **Modular Monolith Layering Invariants:** 
   `routes -> controller -> service -> repository -> database (Drizzle MySQL)`.
   Business domains consume platform services; cross-application platform capabilities (`platform/workers`, `platform/entitlements`, `platform/tenants`) remain neutral and reusable.
3. **Dual Entitlement Authority Reconciliation:**
   - Commercial subscriptions in `tenant_subscriptions` define maximum licensed entitlements for commercial tenants.
   - For tenants with commercial subscriptions, runtime access strictly reflects effective plan entitlements and active overrides.
   - Legacy tenants without any commercial subscriptions fall back to legacy `tenant_modules` configuration, with HRMS enabled by default.
   - Explicitly configured company-level records in `tenant_modules` can narrow, but never expand, tenant-level entitlements.
4. **Asynchronous Outbox Communication:** No external network requests (email dispatch, webhooks) occur inside database transaction blocks. All outbound communications are committed as events to `tenant_outbox` and processed asynchronously by the worker runner.

---

## 4. Exact Changed Files

### New Files Created
- `apps/api/src/platform/tenants/service/tenantOrchestration.service.ts` — 4-step atomic orchestration, preflight validation, and durable idempotency.
- `apps/api/src/platform/tenants/controller/tenantOrchestration.controller.ts` — Controller handlers for preflight and final orchestration endpoints.
- `apps/api/src/platform/tenants/validation/tenantOrchestration.schema.ts` — Validation schemas and IANA timezone validator.
- `apps/api/src/platform/tenants/service/primaryAdmin.service.ts` — Primary admin invitation issuance, token hashing, and atomic company membership acceptance.
- `apps/api/src/platform/tenants/controller/primaryAdmin.controller.ts` — Acceptance and reassignment HTTP endpoints.
- `apps/api/src/platform/workers/backgroundWorker.runner.ts` — Outbox batch dispatcher, lifecycle subscription sweeper, and health metrics.
- `apps/api/src/platform/auth/middleware/rateLimiter.middleware.ts` — In-memory token and IP rate limiters.
- `apps/api/src/platform/__tests__/tenantManagementPhase026.test.ts` — 20 dedicated end-to-end integration tests covering Slices A through G.

### Modified Files
- `apps/api/src/main.ts` — Bootstraps `backgroundWorkerRunner` alongside Express HTTP server, with SIGINT/SIGTERM shutdown handlers.
- `apps/api/src/platform/tenants/routes/tenant.routes.ts` — Registered orchestration routes, overview route, activity export route, and invitation routes.
- `apps/api/src/platform/tenants/service/tenant.service.ts` — Implemented `getTenantOverview`, `exportActivityCsv`, and updated `getTenantSummary`.
- `apps/api/src/platform/tenants/repository/tenant.repository.ts` — Parameterized search, filtering, and sorting queries for `findTenants`.
- `apps/api/src/platform/entitlements/service/effectiveEntitlement.service.ts` — Reconciled commercial subscriptions with legacy fallback policy.
- `apps/api/src/platform/modules/service/module.service.ts` — Integrated `effectiveEntitlementService` into `isTenantEntitled` and runtime access resolution.
- `apps/api/src/platform/dashboard/routes/dashboard.routes.ts` — Scoped Super Admin middleware directly to `/dashboard/overview` to eliminate router-level leakage.

---

## 5. New and Modified API Contracts

### 1. Tenant Creation Preflight
- **Method:** `POST`
- **Path:** `/api/v1/platform/tenants/orchestrate/preflight`
- **Auth:** Super Admin (`requirePlatformAuth`, `requireSuperAdmin`)
- **Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "warnings": [],
    "summary": {
      "companyName": "Acme Global Industries",
      "adminEmail": "admin@acme.com",
      "applicationsCount": 2,
      "estimatedBillingCycle": "monthly"
    }
  }
}
```

### 2. Atomic Tenant Orchestration
- **Method:** `POST`
- **Path:** `/api/v1/platform/tenants/orchestrate`
- **Headers:** `Idempotency-Key: <unique-uuid>`
- **Auth:** Super Admin
- **Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "tnt_8390b10f7652",
    "primaryCompanyId": "cmp_8390b10f7652",
    "businessSetupState": "active",
    "invitation": {
      "id": "inv_450f3b499",
      "email": "admin@acme.com",
      "status": "pending",
      "expiresAt": "2026-10-11T20:30:00.000Z",
      "isPrimaryAdmin": true
    },
    "subscriptions": [
      {
        "id": "sub_308fe10b91",
        "applicationCode": "hrms",
        "planId": "plan_hrms_growth",
        "status": "active",
        "licensedSeats": 50
      }
    ],
    "provisioningStatus": "pending",
    "isIdempotentReplay": false
  }
}
```

### 3. Primary Admin Invitation Acceptance
- **Method:** `POST`
- **Path:** `/api/v1/platform/tenants/invitations/:token/accept`
- **Auth:** Authenticated User matching the invited email address (`requirePlatformAuth`)
- **Rate Limit:** 10 requests per minute per IP / token
- **Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "tnt_8390b10f7652",
    "primaryCompanyId": "cmp_8390b10f7652",
    "role": "company_admin",
    "status": "active"
  }
}
```

### 4. Tenant Overview DTO
- **Method:** `GET`
- **Path:** `/api/v1/platform/tenants/:id/overview`
- **Auth:** Super Admin
- **Response:** Aggregated DTO with `tenant`, `company`, `primaryAdmin`, `applications`, `subscriptions`, `seatUsage`, and `attentionItems`.

### 5. Worker Status
- **Method:** `GET`
- **Path:** `/api/v1/platform/provisioning/workers/status`
- **Auth:** Super Admin
- **Response:** Real-time health statistics for outbox queue, provisioning backlog, and lifecycle sweeper.

---

## 6. Idempotency & Transaction Boundaries

### Idempotency Storage & Protocol
- Utilizes the `idempotency_keys` table.
- Keys are hashed with SHA-256 alongside actor user ID (`sa_actor_id:idempotencyKey`).
- When a duplicate request arrives:
  - If the SHA-256 payload hash matches the original request, the stored HTTP status and response payload are replayed identically with `isIdempotentReplay: true`.
  - If the payload hash differs, the request is immediately rejected with HTTP 409 `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`.

### Transaction Boundary
All records within `TenantCreationOrchestrationService.orchestrate` are wrapped in a single database transaction (`db.transaction(async (tx) => { ... })`):
1. Insert `tenants` record.
2. Insert `tenant_details` record.
3. Insert `companies` record (primary company).
4. Find or insert canonical `users` record.
5. Insert `invitations` record with SHA-256 hashed token and 72-hour expiration.
6. Insert `tenant_subscriptions` for all configured applications.
7. Insert `tenant_modules` entries corresponding to active subscriptions.
8. Insert initial `provisioning_jobs` for each subscribed application.
9. Insert `tenant_outbox` event for asynchronous email delivery (`tenant.invitation.issued`).
10. Insert `tenant_audit_logs` record documenting tenant creation.

If any operation fails, Drizzle rolls back the entire transaction. No orphan records can be created.

---

## 7. Runtime Entitlement & Legacy Compatibility Policy

### Decision
A unified entitlement evaluation policy was implemented in `effectiveEntitlementService.resolveEffectiveEntitlements`:

1. **Commercial Subscription Priority:** If the tenant has an active commercial subscription in `tenant_subscriptions`, `isEntitled` is granted via `source: 'commercial_subscription'`.
2. **Administrative Override:** If an active override exists in `tenant_entitlement_overrides`, it takes precedence over normal subscription terms.
3. **Commercial Isolation:** If a tenant has ANY record in `tenant_subscriptions` (e.g. CRM-only or an expired trial), they are categorized as a commercial tenant. Inactive, expired, scheduled, or unpurchased modules evaluate to `isEntitled: false`. They NEVER fall back to legacy access.
4. **Legacy Tenant Fallback:** If a tenant has zero records in `tenant_subscriptions`:
   - If explicit entries exist in `tenant_modules`, they determine access (`enabled` vs. `disabled`).
   - If no entries exist in `tenant_modules`, **HRMS defaults to entitled** (preserving backward compatibility for unseeded legacy tests and pre-Phase 02 tenants), while all other applications (`crm`, `project_management`) require explicit authorization.
5. **Company-Level Narrowing:** If a company-level record exists in `tenant_modules` with `status: 'disabled'`, access for that company is revoked even if the parent tenant is licensed.

---

## 8. Primary Admin Invitation & Membership Flow

1. **Generation:** Cryptographically secure 32-byte hex token is generated server-side.
2. **Persistence:** SHA-256 hash of the token is stored in `invitations.tokenHash`. Expiry timestamp is set to `now + 72 hours`. Plaintext token is never stored.
3. **Outbox Event:** A `tenant.invitation.issued` event is enqueued in `tenant_outbox` within the creation transaction.
4. **Dispatch:** The background worker picks up the outbox event and sends the invitation email containing sign-in instructions.
5. **Acceptance:**
   - User signs in using Email OTP.
   - User submits the invitation token to `/api/v1/platform/tenants/invitations/:token/accept`.
   - Backend verifies that authenticated session email matches `invitation.email`.
   - In a transaction, the invitation status is set to `'accepted'`, the `tenant_admins` record is marked active, and a primary company membership is created in `memberships` with `role: 'company_admin'`.
   - Canonical RBAC roles are synchronized.

---

## 9. Background Worker Architecture

- **Runner:** `BackgroundWorkerRunner` located in `apps/api/src/platform/workers/backgroundWorker.runner.ts`.
- **Runtime Lifecycle:** Initialized in `apps/api/src/main.ts` on server startup.
- **Outbox Polling:** Runs every 10 seconds. Claims batches of up to 20 pending events using atomic timestamp leasing, dispatches emails, and marks them `published` (or increments failure counts up to 5 max attempts).
- **Lifecycle Sweeper:** Runs every 60 seconds.
  - Activates scheduled subscriptions whose `startDate` has arrived.
  - Transitions expired trials whose `endDate` has passed to `'expired'`, disabling their runtime entitlements.
- **Graceful Shutdown:** Subscribed to `SIGINT` and `SIGTERM`. Flushes active polling cycles and clears interval timers before process exit.

---

## 10. Automated Test Results

### 1. Dedicated Phase 02.6 Test Suite
- **File:** `apps/api/src/platform/__tests__/tenantManagementPhase026.test.ts`
- **Result:** **20 passed (20 total)**
- **Coverage:**
  - Slice A: Preflight validation, 4-step atomic creation, payload rollback on error, idempotent replay, and conflict on key mismatch.
  - Slice B: Runtime entitlement enforcement, CRM block, legacy fallback, and company narrowing.
  - Slice C: Primary Admin invitation acceptance, email verification, 72h expiry, and token reuse rejection.
  - Slice D: Asynchronous outbox dispatch, scheduled subscription activation, and trial expiration sweeper.
  - Slice E: Mutually exclusive trial tenant classification in summary, and tenant list filtering/sorting/pagination.
  - Slice F: Composite Tenant Overview API DTO verification.
  - Slice G: Activity log filtering and formula-injection-defended CSV export.

### 2. Full Backend Regression Suite
- **Command:** `npm test --workspace=apps/api`
- **Result:** **911 passed (911 total) across 59 test files**
- **Failures:** 0
- **Duration:** 207 seconds
- **Database:** Real MySQL 8.4 Server instance running locally.

### 3. TypeScript Typecheck
- **API (`apps/api`):** `tsc -p tsconfig.json --noEmit` — **0 errors (PASS)**
- **Web (`apps/web`):** `tsc -b --noEmit` — **0 errors (PASS)**

### 4. Build Gate
- **API Build (`apps/api`):** `tsc -p tsconfig.json` — **0 errors (PASS)**

---

## 11. Security Audit Findings & Defenses

1. **Invitation Token Leakage Defense:** SHA-256 token hashing; zero plaintext tokens in database or application logs.
2. **Account Takeover Defense:** Token acceptance strictly validates that the authenticated session email matches the invitation recipient email.
3. **Brute Force & Flooding Defense:** Rate limiter added to invitation acceptance routes (10 req/min per IP / token).
4. **CSV Formula Injection Defense:** CSV exports prepend single quotes (`'`) to any cell starting with `=`, `+`, `-`, or `@`.
5. **Cross-Tenant Isolation Defense:** All repository queries explicitly filter by `tenantId`.

---

## 12. Phase 03 Readiness Decision

**Decision:** **READY**

The Phase 02.6 backend remediation is 100% complete, fully verified, and passing all quality gates. The Super Admin frontend (Phase 03) can consume these finalized APIs without risk of schema mismatch, runtime access leakage, or unhandled background workflows.
