# BEZENT — Tenant Management Phase 02.5: API Contract & End-to-End Readiness Audit

> **Document Status:** Authoritative Architectural & Technical Audit Deliverable  
> **Evaluation Mode:** Deep, Evidence-Based, Read-Only Audit  
> **Role:** Principal SaaS Architect, Backend Auditor, API Contract Engineer, Security Engineer, QA Lead  
> **Repository:** `E:\Company\bezent_ecosystem`  
> **Phase 03 Recommendation:** **CONDITIONAL (Remediation Required via Phase 02.6)**  
> **Overall Backend Readiness Score:** **71.5%**

---

## 1. Executive Summary

This document presents a comprehensive, evidence-based, read-only architectural audit of the BEZENT Tenant Management backend following the completion of Phase 01 (Database Foundation) and Phase 02 (Core Services & APIs).

The audit assesses whether the backend services, repositories, controllers, background engines, and HTTP endpoints are ready to safely support the finalized Super Admin Tenant Management user interface.

### Key Audit Findings:
1. **Core Data Models & Security Invariants are Rock-Solid:** The database schema (`0030_tenant_management_v1.sql`), virtual column uniqueness (`primary_active_guard`), MySQL transactions, RBAC (`requirePlatformAuth`, `requireSuperAdmin`), and Drizzle repositories function cleanly with 100% test pass rates (58 test suites, 891 tests).
2. **Critical Gaps in Creation & Orchestration (P0):** The existing `POST /api/v1/platform/provisioning/provision` is a legacy Phase 00 artifact that bypasses commercial plans, does not write to `tenant_subscriptions`, does not issue invitation tokens, and immediately creates active administrators with unusable hashed passwords. There is **no atomic, 4-step tenant creation orchestration API** that accepts the finalized wizard payload.
3. **Runtime Entitlement Disconnect (P0):** While `effectiveEntitlementService` resolves commercial plan entitlements and overrides, runtime authorization (`accessResolverService` and `ModuleService.getEnabledModules()`) still exclusively checks the legacy `tenant_modules` table. There is no automated bridge synchronizing subscription changes to `tenant_modules`.
4. **Console Aggregation & List Filtering Gaps (P1):** The `GET /api/v1/platform/tenants` list API lacks Primary Admin details, subscription summaries, plan filtering, application subscription filtering, date range filtering, and server-side column sorting. `GET /api/v1/platform/tenants/summary` does not provide the mandatory `trialTenants` metric.
5. **Background Engines are Offline in Runtime (P1):** While `ProvisioningJobService` and `TransactionalOutboxService` implement database leasing, exponential backoff, and idempotent claiming, neither background worker is registered in `apps/api/src/main.ts`. No polling daemon runs in the production runtime.
6. **Primary Admin Company Membership Gap (P1):** When a Primary Admin accepts their invitation via `POST /api/v1/platform/tenants/invitations/:token/accept`, `tenant_admins` is updated, but no record is inserted into `memberships` for the primary company. This leaves the administrator with no company workspace authority.

---

## 2. Overall Readiness Scoring

A weighted component scoring model was applied across 8 architectural domains:

| Domain | Weight | Readiness | Weighted Score | Status |
|---|:---:|:---:|:---:|:---:|
| **1. Commercial Plan & Pricing Catalog** | 10% | 100% | 10.0% | Complete |
| **2. Subscriptions Engine (Option A Internal)** | 15% | 85% | 12.75% | Partial (Lacks background expiration & scheduled activation workers) |
| **3. Entitlements & Overrides Engine** | 15% | 75% | 11.25% | Partial (Lacks runtime sync bridge to `tenant_modules`) |
| **4. Primary Admin & Invitation Engine** | 10% | 80% | 8.0% | Partial (Lacks company membership activation on accept & outbox email) |
| **5. Tenant Lifecycle & Hardened Governance** | 10% | 95% | 9.5% | Complete |
| **6. All Tenants Console API (List & Summary)** | 15% | 60% | 9.0% | Partial (Lacks trial metric, primary admin in list, sorting, plan filter) |
| **7. Create Tenant 4-Step Orchestration API** | 15% | 40% | 6.0% | Incomplete (No unified 4-step transactional endpoint) |
| **8. Background Engines & Outbox Runtime** | 10% | 50% | 5.0% | Incomplete (Services exist, but not started in server bootstrap) |
| **Total Weighted Readiness** | **100%** | — | **71.5%** | **CONDITIONAL** |

---

## 3. Verified Existing Capabilities

The following capabilities were verified directly in source code and automated tests:

- **Commercial Plan Catalog:** Full CRUD, multi-application support (`hrms`, `crm`, `project_management`), tiers (`starter`, `growth`, `enterprise`), min/max seat bounds, and strict price approval enforcement (`apps/api/src/platform/plans/`).
- **Subscription CRUD & Seat Guards:** Full subscription management, single active subscription per `tenant:application` backed by MySQL unique index, and prevention of seat downgrades below active usage (`apps/api/src/platform/subscriptions/`).
- **Effective Entitlements & Overrides:** Deterministic hierarchy resolution (Commercial Plan $\rightarrow$ Active Overrides $\rightarrow$ Legacy Fallback) and mismatch reconciliation (`apps/api/src/platform/entitlements/`).
- **Lifecycle Transitions & Termination:** Protected suspension, reactivation, and termination requiring confirmation ID and min-5-char reason. RFC-4180 CSV export with formula injection defense (`apps/api/src/platform/tenants/`).
- **Transactional Outbox Data Layer:** Schema table `transactional_outbox`, batched claim with row status update, exponential backoff, and dead-letter handling (`apps/api/src/platform/outbox/`).
- **Provisioning Job Data Layer:** Schema table `provisioning_jobs`, idempotency keys, step timeline JSON persistence, worker lease claiming, and manual retry endpoint (`apps/api/src/platform/provisioning/`).

---

## 4. All Tenants Readiness Matrix

Super Admin $\rightarrow$ Tenants $\rightarrow$ All Tenants view requirements evaluated against current implementation:

| Requirement | Implementation Status | Evidence / Location | Gap / Deficiency |
|---|:---:|---|---|
| **Total Tenants Metric** | **COMPLETE** | `TenantService.getSummaryMetrics()` (`apps/api/src/platform/tenants/service/tenant.service.ts:233`) | None. Returns count of all non-archived tenants. |
| **Active Tenants Metric** | **COMPLETE** | `TenantService.getSummaryMetrics()` (`line 234`) | None. Returns count with `status = 'active'`. |
| **Suspended Tenants Metric** | **COMPLETE** | `TenantService.getSummaryMetrics()` (`line 235`) | None. Returns count with `status = 'suspended'`. |
| **Trial Tenants Metric** | **MISSING** | `tenant.service.ts:230` | `getSummaryMetrics()` does NOT return `trialTenants`. Must define deterministic tenant-level classification policy. |
| **Search by Tenant Name & ID** | **COMPLETE** | `TenantRepository.list()` (`apps/api/src/platform/tenants/repository/tenant.repository.ts:290`) | Searches `tenants.name`, `tenants.id`, `tenantDetails.code`. |
| **Search by Primary Admin Email** | **MISSING** | `tenant.repository.ts:290-300` | Search only inspects `tenantDetails.contactEmail`. Does NOT search `tenant_admins` $\rightarrow$ `users.email`. |
| **Status Filtering** | **PARTIAL** | `tenant.repository.ts:287` | Filters `tenants.status` (`active`, `suspended`, `archived`). Cannot filter by `'trial'` because trial is a subscription state, not a tenant state. |
| **Application Filtering** | **PARTIAL** | `tenant.repository.ts:301-315` | Filters legacy `tenant_modules` table only. Does NOT filter by active `tenant_subscriptions.application_code`. |
| **Plan Filtering** | **MISSING** | `tenant.repository.ts:280-318` | No `planId` filter supported in query schema or repository. |
| **Creation Date Range Filtering** | **MISSING** | `tenant.repository.ts:280-318` | No `from` or `to` timestamp filtering supported. |
| **Server-Side Sorting** | **MISSING** | `tenant.repository.ts:334` | Hardcoded to `.orderBy(desc(tenants.createdAt))`. No dynamic `sortBy` or `sortOrder`. |
| **Pagination** | **COMPLETE** | `tenant.repository.ts:282-284` | Supports `page` and `limit`, returns `{ items, total }`. |
| **Tenant Logo / Name / ID** | **PARTIAL** | `tenant.repository.ts:321` | Returns name and ID. Logo URL is not joined or returned in tenant record. |
| **Primary Admin Details in List** | **MISSING** | `tenant.repository.ts:424` | Returns `adminsCount` (derived from company admins), but does NOT return the Primary Admin's name, email, or status. |
| **Subscription Summary in List** | **MISSING** | `tenant.repository.ts:424` | Does NOT join `tenant_subscriptions`. Active plans, seats, and trial flags are absent from list items. |
| **Active vs Licensed Users in List** | **PARTIAL** | `tenant.repository.ts:424` | Returns `userCount` (memberships count), but does not return licensed seats ceiling. |
| **Lifecycle Actions (Suspend/Activate)** | **COMPLETE** | `POST /tenants/:id/suspend`, `POST /tenants/:id/activate` | Handled by `tenantController.suspend` and `activate`. |

### Deterministic Trial Tenant Classification Policy:
> **Policy:** A Tenant is classified as **Trial** if and only if:
> 1. It has at least one active subscription in `status = 'trial'`, **AND**
> 2. It has **zero** subscriptions in `status = 'active'` (paid).
> 
> *Rationale:* If a customer has paid for HRMS but is trialing CRM, the customer is commercially an Active Paid Customer with a trialing add-on. They must not be counted as a Trial Tenant.

---

## 5. Create Tenant Readiness Matrix

Super Admin $\rightarrow$ Tenants $\rightarrow$ Create Tenant (4-Step Wizard) evaluated against backend:

| Step / Requirement | Implementation Status | Evidence / Location | Gap / Deficiency |
|---|:---:|---|---|
| **Step 1: Company Profile Fields** | **PARTIAL** | `apps/api/src/platform/tenants/validation/tenant.schema.ts` | Base `createTenant` accepts only name, code, phone, email. Lacks display name, logo URL, website, industry, company size, full address, timezone, tax/reg fields. |
| **Step 1: Immutable Tenant ID** | **COMPLETE** | `apps/api/src/platform/auth/security.ts:generateSurrogateId` | Generated with prefix `tnt_...`. |
| **Step 1: Primary Company Creation** | **PARTIAL** | `provisioning.service.ts:146` | Exists in legacy `provisionCustomer`, but absent from base `createTenant`. |
| **Step 1: Similarity Warnings** | **MISSING** | None | No preflight duplicate similarity check on tenant or company legal name. |
| **Step 2: Primary Admin Designation** | **COMPLETE** | `apps/api/src/platform/tenants/service/primaryAdmin.service.ts` | Fully supported via `invitePrimaryAdmin`. |
| **Step 2: Identity Reuse** | **COMPLETE** | `primaryAdmin.service.ts:340` | Checks if user email exists globally; reuses without creating duplicate identity. |
| **Step 2: Invitation Issuance & Expiry** | **COMPLETE** | `primaryAdmin.service.ts:174-190` | Generates 32-byte secure token, sets 7-day expiration. |
| **Step 2: No Authority Before Accept** | **COMPLETE** | `primaryAdmin.service.ts:188` | Invitation stays `pending`. `tenant_admins` record is not created until token acceptance. |
| **Step 3: Multi-Application Selection** | **COMPLETE** | `apps/api/src/platform/plans/` | Plan catalog supports `hrms`, `crm`, `project_management`. |
| **Step 3: Subscription Creation (Seats/Cycle)** | **COMPLETE** | `apps/api/src/platform/subscriptions/service/subscription.service.ts:42` | `createSubscription` supports plan selection, licensed seats, trial/paid mode, and billing cycles. |
| **Step 3: Entitlement Preview** | **COMPLETE** | `GET /tenants/:id/entitlements` | Preview endpoint exists. |
| **Step 4: Server Preflight Validation** | **MISSING** | `provisioning.service.ts:63` | Legacy preflight only checks code and email; does not preflight check plans, prices, or seat allocations. |
| **Step 4: Idempotency Key Handling** | **PARTIAL** | `provisioningJob.service.ts:28` | Supported in jobs and outbox, but no top-level tenant creation idempotency key check. |
| **Step 4: Atomic Multi-Entity Transaction** | **MISSING** | None | No single transactional boundary creates Tenant + Primary Company + Subscriptions + Admin Invitation + Outbox Event in one atomic commit. |
| **Step 4: Asynchronous Email & Provisioning** | **PARTIAL** | `outbox/` & `provisioning/` | Data tables exist, but synchronous email is still called in `primaryAdmin.service.ts:192`. |

---

## 6. Tenant Details Readiness Matrix

Super Admin $\rightarrow$ Tenants $\rightarrow$ Tenant Details (5 Tabs) evaluated against backend:

### Tab 1: Overview
- **Enabled Applications & Subscriptions:** Requires querying `GET /subscriptions?tenantId=...`. Not included in `GET /tenants/:id`.
- **Primary Admin Summary:** Requires separate query `GET /tenants/:tenantId/primary-admin`.
- **Company Setup & Health Progress:** Included in `GET /tenants/:id` (`health`, `setupProgress`).
- **Composite API Gap:** Super Admin UI must issue **4 parallel HTTP requests** to assemble the Overview screen. A dedicated composite endpoint `GET /api/v1/platform/tenants/:id/overview` is recommended.

### Tab 2: Entitlements
- **Effective Entitlements:** Fully backed by `GET /api/v1/platform/tenants/:tenantId/entitlements`.
- **Overrides & Revocation:** Fully backed by `GET /overrides`, `POST /overrides`, `POST /overrides/:id/revoke`.
- **Reconciliation Report:** Fully backed by `GET /reconciliation`.
- **Entitlement Audit History:** Partial. Filtered through general audit logs.

### Tab 3: Provisioning
- **Job Listing & Details:** Backed by `GET /provisioning/jobs?tenantId=...` and `GET /provisioning/jobs/:id`.
- **Step Timeline State:** Serialized in `provisioning_jobs.step_state`.
- **Manual Retry:** Backed by `POST /provisioning/jobs/:id/retry`.
- **Operational Gap:** Currently, tenant creation does NOT insert rows into `provisioning_jobs`, leaving this tab empty in production.

### Tab 4: Lifecycle
- **Status Transitions:** Fully backed by `/suspend`, `/activate`, `/terminate`.
- **Termination Protection:** Requires `confirmTenantId` and `reason` (min 5 chars).
- **History Stream:** Backed by `GET /tenants/:id/lifecycle-history` (`tenant_lifecycle_events`).

### Tab 5: Activity
- **Audit Logs:** Backed by `GET /tenants/:id/activity`.
- **Sanitized CSV Export:** Backed by `GET /tenants/:id/activity/export` with spreadsheet formula injection protection.
- **Filter Gap:** Lacks date range (`from`/`to`) and action type query parameters. Lacks pagination (`offset`/`page`).

---

## 7. Subscription & Entitlement Findings

### Operational vs Conceptual Reality:
```
Commercial Plan Catalog (Plans, Prices, Tiers)
         ↓
Tenant Subscriptions (tenant_subscriptions table)
         ↓
Effective Entitlements Service (preview/reconciliation API)
      ✖ [DISCONNECTED]
Runtime Authorization Guard (apps/api/src/platform/access/middleware/access.middleware.ts)
         ↓
Legacy tenant_modules Table (direct SQL query in ModuleService)
```

1. **The Disconnect:**
   - In `apps/api/src/platform/access/middleware/access.middleware.ts:96`, `requireApplicationAccess()` checks `req.access.enabledModules`.
   - `req.access.enabledModules` is populated by `AccessResolverService.resolveCompanyAccess()` (`apps/api/src/platform/access/service/accessResolver.service.ts:94`), which calls `ModuleService.getEnabledModules()`.
   - `ModuleService.getEnabledModules()` queries **`tenant_modules`**, which knows nothing about `tenant_subscriptions`!
2. **Consequence:** If a Super Admin creates a subscription in `tenant_subscriptions` for `hrms`, the user will STILL receive `MODULE_DISABLED (403)` when calling `/api/v1/hrms` unless a corresponding row exists in `tenant_modules`.
3. **Automated Background Workers Missing:**
   - No worker automatically sweeps subscriptions where `access_mode = 'trial'` and `trial_ends_at < NOW()` to transition them to `'expired'`.
   - No worker automatically sweeps subscriptions where `status = 'pending_activation'` and `scheduled_activation_at <= NOW()` to transition them to `'active'`.

---

## 8. Invitation & Primary Admin Findings

### End-to-End Flow Trace:
```
Super Admin triggers invite
  → PrimaryAdminService.invitePrimaryAdmin()
  → Token generated & inserted into invitations table
  → Synchronous email sent via emailService.sendSignInInvitation() [Bypasses Outbox]
  → Administrator receives email with sign-in link
  → Administrator visits /login, signs in via Email OTP (ADR-018)
  → Administrator accepts invitation via POST /tenants/invitations/:token/accept
  → PrimaryAdminService.acceptInvitation()
      - Updates invitations.status = 'accepted'
      - Inserts/updates tenant_admins (is_primary = true, status = 'active')
      - [MISSING LINK]: Does NOT insert record into memberships table for primary company
```

### Missing Links Identified:
1. **Missing Company Membership on Acceptance:**
   - `PrimaryAdminService.acceptInvitation` (`primaryAdmin.service.ts:388`) inserts into `tenant_admins`, but does **not** insert into `memberships` for the tenant's primary company with `role: 'company_admin'`.
   - When the user signs in, `authService.toAuthenticatedUser()` loads `memberships` from MySQL. Because no membership exists, the user's session contains an empty membership list for the company.
2. **Synchronous Email Dispatch:**
   - `PrimaryAdminService.invitePrimaryAdmin` directly awaits SMTP delivery instead of writing an event to `transactional_outbox`. A slow SMTP response degrades API latency.
3. **Public Route Rate Limiting:**
   - `POST /tenants/invitations/:token/accept` is public without rate-limiting middleware.

---

## 9. Provisioning & Outbox Findings

### Architecture Trace:
- **`ProvisioningJobService`** (`apps/api/src/platform/provisioning/service/provisioningJob.service.ts`):
  - Clean implementation of worker claiming via `claimNextJob(workerId)`.
  - Exponential backoff calculation: $\text{backoffMs} = 2^{\text{attemptCount}} \times 1000$.
  - Step timeline state updates.
- **`TransactionalOutboxService`** (`apps/api/src/platform/outbox/service/transactionalOutbox.service.ts`):
  - Batch claim via `claimPendingBatch(limit)`.
  - Status updates (`published`, `dead_letter`).
- **THE FATAL RUNTIME GAP:**
  - Neither `provisioningJobService` nor `transactionalOutboxService` has an active background polling loop started in `apps/api/src/main.ts`.
  - There is no scheduled cron or `setInterval` executing `claimPendingBatch` or `claimNextJob`.
  - Events written to `transactional_outbox` will remain in `status = 'pending'` indefinitely in a running server.

---

## 10. API Contract Inventory

| HTTP Method | Route | Auth Guard | Required Role | Controller & Action | Service & Repository | Status | Evidence Location |
|---|---|---|---|---|---|:---:|---|
| `GET` | `/api/v1/platform/plans` | `requirePlatformAuth` | Super Admin | `planController.list` | `PlanService.listPlans` / `PlanRepository.list` | Complete | `plan.routes.ts:9` |
| `POST` | `/api/v1/platform/plans` | `requirePlatformAuth` | Super Admin | `planController.create` | `PlanService.createPlan` / `PlanRepository.create` | Complete | `plan.routes.ts:10` |
| `GET` | `/api/v1/platform/plans/:id` | `requirePlatformAuth` | Super Admin | `planController.getById` | `PlanService.getPlanById` / `PlanRepository.findById` | Complete | `plan.routes.ts:11` |
| `PATCH` | `/api/v1/platform/plans/:id` | `requirePlatformAuth` | Super Admin | `planController.update` | `PlanService.updatePlan` / `PlanRepository.update` | Complete | `plan.routes.ts:12` |
| `POST` | `/api/v1/platform/plans/:id/prices` | `requirePlatformAuth` | Super Admin | `planController.addPrice` | `PlanService.addPrice` / `PlanRepository.createPrice` | Complete | `plan.routes.ts:15` |
| `PATCH` | `/api/v1/platform/plans/prices/:priceId` | `requirePlatformAuth` | Super Admin | `planController.updatePrice` | `PlanService.updatePrice` / `PlanRepository.updatePrice` | Complete | `plan.routes.ts:16` |
| `GET` | `/api/v1/platform/subscriptions` | `requirePlatformAuth` | Super Admin | `subscriptionController.list` | `SubscriptionService.listSubscriptions` / `SubscriptionRepo.list` | Complete | `subscription.routes.ts:9` |
| `GET` | `/api/v1/platform/subscriptions/:id` | `requirePlatformAuth` | Super Admin | `subscriptionController.getById` | `SubscriptionService.getSubscriptionById` / `SubscriptionRepo.findById` | Complete | `subscription.routes.ts:10` |
| `PATCH` | `/api/v1/platform/subscriptions/:id` | `requirePlatformAuth` | Super Admin | `subscriptionController.update` | `SubscriptionService.updateSubscription` / `SubscriptionRepo.update` | Complete | `subscription.routes.ts:11` |
| `POST` | `/api/v1/platform/subscriptions/:id/activate` | `requirePlatformAuth` | Super Admin | `subscriptionController.activate` | `SubscriptionService.activateSubscription` / `SubscriptionRepo.update` | Complete | `subscription.routes.ts:14` |
| `POST` | `/api/v1/platform/subscriptions/:id/renew` | `requirePlatformAuth` | Super Admin | `subscriptionController.renew` | `SubscriptionService.renewSubscription` / `SubscriptionRepo.update` | Complete | `subscription.routes.ts:15` |
| `POST` | `/api/v1/platform/subscriptions/:id/cancel` | `requirePlatformAuth` | Super Admin | `subscriptionController.cancel` | `SubscriptionService.cancelSubscription` / `SubscriptionRepo.update` | Complete | `subscription.routes.ts:16` |
| `GET` | `/api/v1/platform/tenants/:tenantId/subscriptions` | `requirePlatformAuth` | Super Admin | `subscriptionController.listByTenant` | `SubscriptionService.listSubscriptions` / `SubscriptionRepo.list` | Complete | `subscription.routes.ts:19` |
| `POST` | `/api/v1/platform/tenants/:tenantId/subscriptions` | `requirePlatformAuth` | Super Admin | `subscriptionController.create` | `SubscriptionService.createSubscription` / `SubscriptionRepo.create` | Complete | `subscription.routes.ts:20` |
| `GET` | `/api/v1/platform/tenants/:tenantId/entitlements` | `requirePlatformAuth` | Super Admin | `entitlementController.getEffective` | `EffectiveEntitlementService.resolveTenantEntitlements` | Complete | `entitlement.routes.ts:9` |
| `GET` | `/api/v1/platform/tenants/:tenantId/entitlements/reconciliation` | `requirePlatformAuth` | Super Admin | `entitlementController.reconcile` | `EffectiveEntitlementService.reconcileEntitlements` | Complete | `entitlement.routes.ts:10` |
| `GET` | `/api/v1/platform/tenants/:tenantId/entitlements/overrides` | `requirePlatformAuth` | Super Admin | `entitlementController.listOverrides` | `EffectiveEntitlementService.listOverrides` | Complete | `entitlement.routes.ts:12` |
| `POST` | `/api/v1/platform/tenants/:tenantId/entitlements/overrides` | `requirePlatformAuth` | Super Admin | `entitlementController.createOverride` | `EffectiveEntitlementService.createOverride` | Complete | `entitlement.routes.ts:13` |
| `POST` | `/api/v1/platform/tenants/:tenantId/entitlements/overrides/:overrideId/revoke` | `requirePlatformAuth` | Super Admin | `entitlementController.revokeOverride` | `EffectiveEntitlementService.revokeOverride` | Complete | `entitlement.routes.ts:14` |
| `GET` | `/api/v1/platform/tenants/summary` | `requirePlatformAuth` | Super Admin | `tenantController.getSummary` | `TenantService.getSummaryMetrics` / `TenantRepo.getCounts` | Partial (Lacks trial metric) | `tenant.routes.ts:15` |
| `GET` | `/api/v1/platform/tenants` | `requirePlatformAuth` | Super Admin | `tenantController.list` | `TenantService.listTenants` / `TenantRepository.list` | Partial (Lacks sorting, plan/admin filter) | `tenant.routes.ts:18` |
| `POST` | `/api/v1/platform/tenants` | `requirePlatformAuth` | Super Admin | `tenantController.create` | `TenantService.createTenant` / `TenantRepository.create` | Partial (Base CRUD only, not 4-step wizard) | `tenant.routes.ts:19` |
| `GET` | `/api/v1/platform/tenants/:id` | `requirePlatformAuth` | Super Admin | `tenantController.getById` | `TenantService.getTenantById` / `TenantRepository.findById` | Complete | `tenant.routes.ts:20` |
| `PATCH` | `/api/v1/platform/tenants/:id` | `requirePlatformAuth` | Super Admin | `tenantController.update` | `TenantService.updateTenant` / `TenantRepository.update` | Complete | `tenant.routes.ts:22` |
| `POST` | `/api/v1/platform/tenants/:id/activate` | `requirePlatformAuth` | Super Admin | `tenantController.activate` | `TenantService.activateTenant` / `TenantRepository.updateTenantStatus` | Complete | `tenant.routes.ts:25` |
| `POST` | `/api/v1/platform/tenants/:id/suspend` | `requirePlatformAuth` | Super Admin | `tenantController.suspend` | `TenantService.suspendTenant` / `TenantRepository.updateTenantStatus` | Complete | `tenant.routes.ts:27` |
| `POST` | `/api/v1/platform/tenants/:id/terminate` | `requirePlatformAuth` | Super Admin | `tenantController.terminate` | `TenantService.terminateTenant` / `TenantRepository.updateTenantStatus` | Complete | `tenant.routes.ts:28` |
| `GET` | `/api/v1/platform/tenants/:id/lifecycle-history` | `requirePlatformAuth` | Super Admin | `tenantController.getLifecycleHistory` | `TenantService.getLifecycleHistory` / `TenantRepo.listLifecycleEvents` | Complete | `tenant.routes.ts:29` |
| `GET` | `/api/v1/platform/tenants/:id/activity` | `requirePlatformAuth` | Super Admin | `tenantController.getActivity` | `TenantService.getTenantActivity` / `TenantRepo.listAuditLogs` | Complete | `tenant.routes.ts:32` |
| `GET` | `/api/v1/platform/tenants/:id/activity/export` | `requirePlatformAuth` | Super Admin | `tenantController.exportActivity` | `TenantService.exportTenantActivityCsv` / `TenantRepo.listAuditLogs` | Complete | `tenant.routes.ts:33` |
| `GET` | `/api/v1/platform/tenants/:tenantId/primary-admin` | `requirePlatformAuth` | Super Admin | `primaryAdminController.getPrimaryAdmin` | `PrimaryAdminService.getPrimaryAdmin` / Drizzle queries | Complete | `tenant.routes.ts:41` |
| `POST` | `/api/v1/platform/tenants/:tenantId/primary-admin/invite` | `requirePlatformAuth` | Super Admin | `primaryAdminController.invite` | `PrimaryAdminService.invitePrimaryAdmin` / Drizzle queries | Complete | `tenant.routes.ts:42` |
| `POST` | `/api/v1/platform/tenants/:tenantId/primary-admin/invitations/:invitationId/resend` | `requirePlatformAuth` | Super Admin | `primaryAdminController.resend` | `PrimaryAdminService.resendInvitation` / Drizzle queries | Complete | `tenant.routes.ts:43` |
| `DELETE` | `/api/v1/platform/tenants/:tenantId/primary-admin/invitations/:invitationId` | `requirePlatformAuth` | Super Admin | `primaryAdminController.revoke` | `PrimaryAdminService.revokeInvitation` / Drizzle queries | Complete | `tenant.routes.ts:47` |
| `POST` | `/api/v1/platform/tenants/:tenantId/primary-admin/reassign` | `requirePlatformAuth` | Super Admin | `primaryAdminController.reassign` | `PrimaryAdminService.reassignPrimaryAdmin` / Drizzle queries | Complete | `tenant.routes.ts:51` |
| `POST` | `/api/v1/platform/tenants/invitations/:token/accept` | None (Public Token) | None | `primaryAdminController.accept` | `PrimaryAdminService.acceptInvitation` / Drizzle queries | Partial (Missing company membership creation) | `tenant.routes.ts:9` |
| `GET` | `/api/v1/platform/provisioning/jobs` | `requirePlatformAuth` | Super Admin | `customerProvisioningController.listJobs` | `ProvisioningJobService.listJobs` | Complete | `provisioning.routes.ts:13` |
| `GET` | `/api/v1/platform/provisioning/jobs/:id` | `requirePlatformAuth` | Super Admin | `customerProvisioningController.getJobById` | `ProvisioningJobService.getJobById` | Complete | `provisioning.routes.ts:14` |
| `POST` | `/api/v1/platform/provisioning/jobs/:id/retry` | `requirePlatformAuth` | Super Admin | `customerProvisioningController.retryJob` | `ProvisioningJobService.retryJob` | Complete | `provisioning.routes.ts:15` |
| `GET` | `/api/v1/platform/provisioning/outbox/status` | `requirePlatformAuth` | Super Admin | `customerProvisioningController.getOutboxStatus` | `TransactionalOutboxService.getStatus` | Complete | `provisioning.routes.ts:16` |

---

## 11. Security Findings

1. **Authentication & Authorization Guarding:**
   - All platform management endpoints strictly enforce `requirePlatformAuth` followed by `requireSuperAdmin`.
   - Tenant isolation is maintained server-side through scoped SQL queries.
2. **Formula Injection Defense:**
   - The CSV export endpoint (`GET /api/v1/platform/tenants/:id/activity/export`) properly prepends `'` inside double quotes for any cell starting with `=`, `+`, `-`, or `@`.
3. **Public Token Ingestion:**
   - `POST /api/v1/platform/tenants/invitations/:token/accept` correctly validates token expiry and status, but lacks request rate limiting.
4. **Primary Admin Reassignment Safety:**
   - `reassignPrimaryAdmin` executes atomically in a MySQL transaction and updates `tenant_admins`, maintaining the single active primary administrator invariant.
5. **No Password Storage:**
   - In accordance with ADR-018, no passwords are accepted or stored. All identities authenticate passwordlessly via Email OTP.

---

## 12. P0 / P1 / P2 Issues

### Priority 0 (Blocking Core Product Architecture)
- **ISSUE-P0-1: Missing 4-Step Create Tenant Orchestration Endpoint.**  
  There is no backend API that can receive the Super Admin 4-step wizard payload and atomically create the Tenant, Primary Company, Subscriptions, Primary Admin invitation, Provisioning Job, and Outbox events within a single database transaction.
- **ISSUE-P0-2: Runtime Entitlement Disconnect.**  
  Commercial subscriptions created in `tenant_subscriptions` do not grant runtime access to HRMS, CRM, or PM because `accessResolverService` and `ModuleService` query only `tenant_modules`. Creating a subscription currently has zero runtime effect.

### Priority 1 (High Priority / Console Usability & Operation)
- **ISSUE-P1-1: Background Workers Not Started in Server Runtime.**  
  `ProvisioningJobService` and `TransactionalOutboxService` claiming loops are never initiated in `apps/api/src/main.ts`. Outbox messages and provisioning jobs will stall unless manually processed.
- **ISSUE-P1-2: Primary Admin Invitation Acceptance Does Not Create Company Membership.**  
  `PrimaryAdminService.acceptInvitation` activates `tenant_admins` but fails to create a `memberships` record for the primary company with `role = 'company_admin'`. The admin is locked out of company workspaces.
- **ISSUE-P1-3: Missing `trialTenants` Metric in Summary.**  
  `GET /api/v1/platform/tenants/summary` does not compute or return the mandatory `trialTenants` metric.
- **ISSUE-P1-4: All Tenants List Query Lacks Primary Admin, Plan Filtering, and Sorting.**  
  `GET /api/v1/platform/tenants` cannot filter by plan, cannot search by primary admin email, does not return primary admin details or subscription summaries, and does not support server-side column sorting.
- **ISSUE-P1-5: Missing Composite Overview Endpoint.**  
  The Super Admin Tenant Details Overview tab requires 4 distinct API calls instead of a clean composite payload.

### Priority 2 (Medium Priority / Hardening)
- **ISSUE-P2-1: Synchronous Email Call in Invitation Flow.**  
  `PrimaryAdminService.invitePrimaryAdmin` directly awaits SMTP delivery instead of relying on the transactional outbox.
- **ISSUE-P2-2: Missing Rate Limiting on Invitation Acceptance Route.**  
  Public route `/tenants/invitations/:token/accept` lacks IP rate limiting.
- **ISSUE-P2-3: Automated Subscription Lifecycle Sweepers Missing.**  
  No background worker automatically expires trials past `trial_ends_at` or activates pending subscriptions when `scheduled_activation_at <= NOW()`.

---

## 13. Missing Backend Work Breakdown

To prepare the backend for the Super Admin UI, the following specific modules and enhancements must be built:

1. **`TenantCreationOrchestrationService` & Route:**
   - DTO accepting Step 1 (Company/Tenant profile), Step 2 (Admin info), Step 3 (Applications & Subscriptions array), Step 4 (Idempotency key).
   - Atomic transaction inserting `tenants`, `tenant_details`, `companies`, `tenant_subscriptions`, `tenant_modules` (sync), `invitations`, `provisioning_jobs`, and `transactional_outbox`.
2. **Entitlement Runtime Bridge:**
   - Update `SubscriptionService` to automatically synchronize corresponding entries in `tenant_modules` upon subscription creation, activation, suspension, or cancellation.
3. **Primary Admin Membership Activation:**
   - In `PrimaryAdminService.acceptInvitation`, within the transaction, insert a `memberships` record for `company_id` with `role: 'company_admin'` and call `roleManagementService.syncMembershipRole()`.
4. **Enhanced Summary & List APIs:**
   - Add deterministic `trialTenants` calculation to `TenantRepository.getCounts()`.
   - Extend `TenantRepository.list()` to join `users` (via `tenant_admins.is_primary`), join `tenant_subscriptions`, support `planId` and date range filters, and support dynamic `orderBy(sortCol, sortDir)`.
5. **Composite Overview API:**
   - Add `GET /api/v1/platform/tenants/:id/overview` returning the aggregated payload for Tab 1.
6. **Runtime Background Daemon:**
   - Add a lightweight timer runner in `main.ts` or a background worker module that polls `transactionalOutboxService.processBatch()` and `provisioningJobService.claimNextJob()`.

---

## 14. Phase 02.6 Remediation Plan

Before starting Phase 03 UI development, execute a focused backend remediation slice (Phase 02.6):

- **Slice 1: Tenant Creation Orchestrator (P0)**  
  Implement `apps/api/src/platform/tenants/service/tenantOrchestration.service.ts` and mount `POST /api/v1/platform/tenants/orchestrate` (or replace `POST /api/v1/platform/tenants`).
- **Slice 2: Entitlement Runtime Bridge & Membership Activation (P0/P1)**  
  Add automatic `tenant_modules` sync on subscription lifecycle events. Add `memberships` insertion and role sync to `PrimaryAdminService.acceptInvitation`.
- **Slice 3: Summary Metrics & List Enhancement (P1)**  
  Implement `trialTenants` metric, primary admin search, plan filtering, subscription summary projection, and dynamic column sorting.
- **Slice 4: Runtime Background Workers & Composite Overview (P1)**  
  Add `GET /tenants/:id/overview`. Register outbox and provisioning worker polling loops in application bootstrap.
- **Slice 5: Verification & Regression Testing**  
  Add end-to-end integration test validating the entire 4-step creation flow through outbox dispatch, invitation acceptance, and workspace entry.

---

## 15. Phase 03 Frontend Readiness Decision

### Final Verdict: **CONDITIONAL (BLOCKED on Phase 02.6 Remediation)**

**Justification:**
While the database schema, security rules, and granular domain services are verified and passing tests, attempting to build the finalized Super Admin frontend against the current backend will cause immediate integration failure:
1. The 4-step Create Tenant wizard will have no backend endpoint to call.
2. The All Tenants console table cannot display Primary Admins, active seats, or subscription badges, nor can it sort or filter by plan.
3. Creating a tenant with subscriptions will not enable the HRMS application for that tenant due to the entitlement runtime disconnect.

**Recommendation:** Proceed immediately with **Phase 02.6 Remediation** to close these gaps. Once Phase 02.6 is complete, Phase 03 frontend UI integration will proceed smoothly without workarounds or mocks.
