# BEZENT — Super Admin Architecture Consolidation Audit
## Phase 03C.0 — Canonical Ownership, Routing, Dependency & Migration Readiness

**Audit Type:** READ-ONLY Architecture, Routing & Dependency Audit  
**Date:** 2026-10-09  
**Repository:** `E:\Company\bezent_ecosystem`  
**Target Subsystems:**
- Implementation A: `apps/web/src/administration/super-admin/`
- Implementation B: `apps/web/src/applications/super-admin/`  
**Governing Authorities:** [AGENTS.md](../../AGENTS.md), [FRONTEND.md](FRONTEND.md), [REPOSITORY.md](REPOSITORY.md), [APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md), [DEPENDENCY-RULES.md](DEPENDENCY-RULES.md), [ADR-013](ADRs.md#adr-013), [ADR-014](ADRs.md#adr-014)

---

## 1. Executive Summary

A comprehensive architectural and runtime audit of the BEZENT Super Admin frontend was conducted to evaluate two coexisting implementations: `apps/web/src/administration/super-admin` (Implementation A) and `apps/web/src/applications/super-admin` (Implementation B).

### Core Findings
1. **Authoritative Runtime Mount:** The production application router ([AppRouter.tsx](../../apps/web/src/app/routes/AppRouter.tsx#L18-L20)) and application registry ([applications.ts](../../apps/web/src/app/config/applications.ts#L2)) mount **`apps/web/src/administration/super-admin` exclusively**. Implementation B is never mounted as an application or router root.
2. **Canonical Architectural Ownership:** Under repository governance ([AGENTS.md](../../AGENTS.md#preamble--what-this-repository-is), [FRONTEND.md](FRONTEND.md#L8-L18), and [ADR-014](ADRs.md#adr-014)), the `src/applications/` directory is strictly reserved for commercial business products (`hrms`, future `crm`, `finance`, etc.). Internal platform operator capabilities belong in `src/administration/super-admin/`. Furthermore, [applications/super-admin/index.ts](../../apps/web/src/applications/super-admin/index.ts#L1) explicitly documents: `Canonical ownership: apps/web/src/administration/super-admin/`.
3. **Root Cause of Phase 03A/03B UI Disconnect:** In Phases 03A, 03B, and 03C, new UI pages (`TenantsPage.tsx`, `CreateTenantPage.tsx`, `TenantDetailsPage.tsx`) and an expanded 32.7 KB API client were developed inside `apps/web/src/applications/super-admin/pages/`. Because `AppRouter.tsx` mounted routes from `administration/super-admin/routes/superAdminRoutes.tsx`, the application continued rendering legacy Phase 01 placeholder pages until a cross-folder route patch connected them.
4. **Current Runtime State:** The system is functioning correctly in production and passes 300 tests (22 suites), clean typecheck (`tsc -b`), and production build (`vite build`). However, it relies on a cross-layer bridge: `administration/super-admin/routes/superAdminRoutes.tsx` imports the Phase 03 pages from `applications/super-admin/pages/`, and those pages import the expanded API client from `applications/super-admin/api/superAdminApi.ts`.
5. **Final Readiness Decision:** **READY FOR CONTROLLED CONSOLIDATION**. The architecture is ready for a 6-stage consolidation into `administration/super-admin` with zero user disruption and full rollback safety.

---

## 2. Current Architecture & Route Resolution Diagram

### 2.1 Route Resolution Flow (Actual Production Runtime)

```
[Browser Request (e.g. /super-admin/tenants)]
                      │
                      ▼
[apps/web/src/main.tsx] 
                      │
                      ▼
[apps/web/src/app/App.tsx]
                      │
                      ▼
[apps/web/src/app/providers/AppProviders.tsx]
                      │
                      ▼
[apps/web/src/app/routes/AppRouter.tsx (L80-95)]
                      │
                      ├─► Guard: <RequireSuperAdminWorkspace> [apps/web/src/administration/super-admin/guards/RequireSuperAdminWorkspace.tsx]
                      │     (Validates user.isSuperAdmin === true; redirects to /app/hrms or /auth/login)
                      │
                      ├─► Shell Layout: <ShellLayout /> [apps/web/src/layouts/app-shell/ShellLayout.tsx]
                      │     (Resolves nav via findApplicationByPath() -> apps/web/src/app/config/applications.ts)
                      │     (Catalog: apps/web/src/administration/super-admin/navigation/superAdminNavigation.ts)
                      │
                      └─► Child Routes: superAdminRoutes [apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx]
                            │
                            ├─► Path: "" -> <SuperAdminDashboardPage />
                            ├─► Path: "tenants" -> <TenantsPage /> [apps/web/src/applications/super-admin/pages/TenantsPage.tsx]
                            ├─► Path: "tenants/create" -> <CreateTenantPage /> [apps/web/src/applications/super-admin/pages/CreateTenantPage.tsx]
                            ├─► Path: "tenants/:tenantId" -> <TenantDetailsPage /> [apps/web/src/applications/super-admin/pages/TenantDetailsPage.tsx]
                            ├─► Path: "companies" -> <CompaniesPage /> [apps/web/src/administration/super-admin/pages/CompaniesPage.tsx]
                            ├─► Path: "users" -> <PlatformUsersPage /> [apps/web/src/administration/super-admin/pages/PlatformUsersPage.tsx]
                            ├─► Path: "company-admins" -> <CompanyAdminsPage /> [apps/web/src/administration/super-admin/pages/CompanyAdminsPage.tsx]
                            ├─► Path: "module-access" -> <ModuleAccessPage /> [apps/web/src/administration/super-admin/pages/ModuleAccessPage.tsx]
                            ├─► Path: "audit-logs" -> <AuditLogsPage /> [apps/web/src/administration/super-admin/pages/AuditLogsPage.tsx]
                            ├─► Path: "settings" -> <PlatformSettingsPage /> [apps/web/src/administration/super-admin/pages/PlatformSettingsPage.tsx]
                            └─► Path: "provisioning" -> <CustomerProvisioningPage /> [apps/web/src/administration/super-admin/pages/CustomerProvisioningPage.tsx]
                                  │
                                  ▼
                            [API Layer Call]
                            - Core operator pages call: apps/web/src/administration/super-admin/api/superAdminApi.ts
                            - Modern Tenant pages call: apps/web/src/applications/super-admin/api/superAdminApi.ts
```

---

## 3. Runtime Entrypoint Evidence

Exact line-by-line evidence proves which implementation controls the application runtime:

| Checkpoint | File Path | Line Range | Evidence & Description |
|---|---|---|---|
| **Router Composition** | [AppRouter.tsx](../../apps/web/src/app/routes/AppRouter.tsx) | L18–20 | `import { superAdminRoutes } from '../../administration/super-admin/routes/superAdminRoutes';`<br>Imports from **administration**, not applications. |
| **Route Registration** | [AppRouter.tsx](../../apps/web/src/app/routes/AppRouter.tsx) | L80–95 | `path: '/super-admin'`, `element: <RequireSuperAdminWorkspace><ShellLayout /></RequireSuperAdminWorkspace>`, `children: superAdminRoutes`. |
| **App Registry** | [applications.ts](../../apps/web/src/app/config/applications.ts) | L2, L23 | `import { superAdminApplication } from '../../administration/super-admin';`<br>`superAdminApplication` registered as platform application at `/super-admin`. |
| **Nav Resolution** | [ShellLayout.tsx](../../apps/web/src/layouts/app-shell/ShellLayout.tsx) | L74–82 | Uses `findApplicationByPath(location.pathname)` to retrieve navigation items from `superAdminApplication.navigation`. |
| **Auth Guard** | [RequireSuperAdminWorkspace.tsx](../../apps/web/src/administration/super-admin/guards/RequireSuperAdminWorkspace.tsx) | L8–26 | Enforces `isAuthenticated` and `user.isSuperAdmin === true`. Directs non-super-admins to `/app/hrms`. |
| **Current Route Bridge** | [superAdminRoutes.tsx](../../apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx) | L11–13 | `import { TenantsPage } from '../../../applications/super-admin/pages/TenantsPage';`<br>`import { CreateTenantPage } from '../../../applications/super-admin/pages/CreateTenantPage';`<br>`import { TenantDetailsPage } from '../../../applications/super-admin/pages/TenantDetailsPage';` |
| **Barrel Redirection** | [applications/super-admin/index.ts](../../apps/web/src/applications/super-admin/index.ts) | L1–5 | `// Canonical ownership: apps/web/src/administration/super-admin/`<br>`export * from '../../administration/super-admin';` |
| **Nav Barrel Redirection** | [applications/super-admin/navigation/superAdminNavigation.ts](../../apps/web/src/applications/super-admin/navigation/superAdminNavigation.ts) | L1–5 | Re-exports from `administration/super-admin/navigation/superAdminNavigation`. |
| **Route Barrel Redirection** | [applications/super-admin/routes/superAdminRoutes.ts](../../apps/web/src/applications/super-admin/routes/superAdminRoutes.ts) | L1–3 | `export { superAdminRoutes } from '../../../administration/super-admin/routes/superAdminRoutes';` |

---

## 4. Complete Super Admin Inventory & Comparison Matrix

A full recursive inventory of both trees revealed **33 files in `administration/super-admin/`** and **30 files in `applications/super-admin/`**.

### 4.1 Functional Area Matrix

| Functional Area | Administration Implementation | Applications Implementation | Active Runtime Consumer | Functional Differences | Duplication Level | Recommended Canonical Owner |
|---|---|---|---|---|---|---|
| **Root Barrel / Metadata** | `index.ts` (Application definition & exports) | `index.ts` (Delegates to administration) | `AppRouter`, `applications.ts` | Applications barrel delegates back to administration. | High (Shim) | `administration/super-admin` |
| **Overview (Dashboard)** | `pages/SuperAdminDashboardPage.tsx` (12.4 KB) | `pages/SuperAdminDashboardPage.tsx` (12.4 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Tenants (List)** | `pages/TenantsPage.tsx` (17.3 KB - Legacy Phase 01) | `pages/TenantsPage.tsx` (30.4 KB - Phase 03A) | `superAdminRoutes` (uses Applications) | Applications version has Gmail-style cards, multi-facet filtering, health badges, bulk actions, sorting, and pagination. | Divergent | `administration/super-admin` (Migrate Apps version) |
| **Create Tenant** | *None* | `pages/CreateTenantPage.tsx` (57.4 KB - Phase 03B) | `superAdminRoutes` (uses Applications) | 4-step wizard with preflight validation, plans selection, and orchestration. | Absent in Admin | `administration/super-admin` (Move from Apps) |
| **Tenant Details** | `pages/TenantDetailsPage.tsx` (51.3 KB - Legacy 5-Tab) | `pages/TenantDetailsPage.tsx` (69.2 KB - Phase 03C) | `superAdminRoutes` (uses Applications) | Applications version includes full overrides management, plan upgrades, CSV export, job retries, and drawer modals. | Divergent | `administration/super-admin` (Migrate Apps version) |
| **Companies** | `pages/CompaniesPage.tsx`, `CompanyDetailsPage.tsx` | `pages/CompaniesPage.tsx`, `CompanyDetailsPage.tsx` | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Platform Users** | `pages/PlatformUsersPage.tsx` (16.2 KB) | `pages/PlatformUsersPage.tsx` (16.2 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Company Admins** | `pages/CompanyAdminsPage.tsx` (17.3 KB) | `pages/CompanyAdminsPage.tsx` (17.3 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Module Access** | `pages/ModuleAccessPage.tsx` (14.2 KB) | `pages/ModuleAccessPage.tsx` (14.2 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Audit Logs** | `pages/AuditLogsPage.tsx` (16.9 KB) | `pages/AuditLogsPage.tsx` (16.9 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Platform Settings** | `pages/PlatformSettingsPage.tsx` (13.6 KB) | `pages/PlatformSettingsPage.tsx` (13.6 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Customer Provisioning** | `pages/CustomerProvisioningPage.tsx` (20.3 KB) | `pages/CustomerProvisioningPage.tsx` (20.3 KB) | `superAdminRoutes` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Extended Admin Pages** | 8 pages (`ApplicationCatalogPage`, `PlansPage`, `SupportCasesPage`, etc.) | *None* | `superAdminRoutes` (Admin) | Exclusive to administration/super-admin. | Present only in Admin | `administration/super-admin` |
| **Navigation Catalog** | `navigation/superAdminNavigation.ts` (10.9 KB - 8 Groups) | `navigation/superAdminNavigation.ts` (0.3 KB - Shim) | `ShellLayout`, `applications.ts` | Administration catalog contains finalized 8 canonical groups. | Duplicate Shim | `administration/super-admin` |
| **Routing Definitions** | `routes/superAdminRoutes.tsx` (14.9 KB - Mounted) | `routes/superAdminRoutes.ts` (Shim) & `.tsx` (Unused) | `AppRouter.tsx` | Applications `.tsx` is an older dead route file. Applications `.ts` is a shim. | Competing dead code | `administration/super-admin` |
| **API Client** | `api/superAdminApi.ts` (17.0 KB) | `api/superAdminApi.ts` (32.7 KB - Extended) | Split: Core uses Admin, Tenants uses Apps | Applications client contains Phase 02.6/03 methods for orchestration, overrides, jobs, activity, CSV export. | Divergent | `administration/super-admin` (Merge extended methods) |
| **Auth Guards** | `guards/RequireSuperAdminWorkspace.tsx` | `guards/RequireSuperAdminWorkspace.tsx` | `AppRouter.tsx` (Admin) | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |
| **Audit Formatters** | `utils/auditLogFormatters.ts` | `utils/auditLogFormatters.ts` | `AuditLogsPage.tsx` | Content and implementation are byte-identical. | 100% Duplicate | `administration/super-admin` |

---

## 5. Routing Duplication & Reachability Audit

### 5.1 Analysis of Route Files

1. **Active Route File:** [apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx](../../apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx) (14.9 KB).
   - Contains all canonical route declarations and compatibility redirects.
   - Mounted directly in [AppRouter.tsx](../../apps/web/src/app/routes/AppRouter.tsx#L80-95).
2. **Re-export Shim:** [apps/web/src/applications/super-admin/routes/superAdminRoutes.ts](../../apps/web/src/applications/super-admin/routes/superAdminRoutes.ts).
   - Simple 3-line re-export pointing back to the administration route array.
3. **Competing Dead Route File:** [apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx](../../apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx) (6.4 KB).
   - An older route definition tree that is **not mounted** anywhere in `apps/web`.
   - Lacks the 8 canonical groups and deep links.

### 5.2 Canonical Route Reachability Matrix

| URL Pattern | Target Component | Status | Guarding | Note |
|---|---|---|---|---|
| `/super-admin` | `SuperAdminDashboardPage` | Canonical & Reachable | `RequireSuperAdminWorkspace` | Overview dashboard. |
| `/super-admin/tenants` | `TenantsPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Modern Phase 03A list. |
| `/super-admin/tenants/create` | `CreateTenantPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Modern Phase 03B 4-step wizard. |
| `/super-admin/tenants/:tenantId` | `Navigate` to `.../overview` | Canonical & Reachable | `RequireSuperAdminWorkspace` | Default tab redirect. |
| `/super-admin/tenants/:tenantId/overview` | `TenantDetailsPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Active tab = `overview`. |
| `/super-admin/tenants/:tenantId/entitlements` | `TenantDetailsPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Active tab = `entitlements`. |
| `/super-admin/tenants/:tenantId/provisioning` | `TenantDetailsPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Active tab = `provisioning`. |
| `/super-admin/tenants/:tenantId/lifecycle` | `TenantDetailsPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Active tab = `lifecycle`. |
| `/super-admin/tenants/:tenantId/activity` | `TenantDetailsPage` (Applications) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Active tab = `activity`. |
| `/super-admin/subscriptions/plans` | `PlansPage` (Administration) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Plan catalog. |
| `/super-admin/subscriptions/tenants` | `TenantSubscriptionsPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Tenant subscriptions list. |
| `/super-admin/applications/catalog` | `ApplicationCatalogPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Application catalog. |
| `/super-admin/applications/modules` | `ModuleCatalogPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Module catalog. |
| `/super-admin/governance/audit-logs` | `AuditLogsPage` (Administration) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Operator audit logs. |
| `/super-admin/operations/health` | `TenantHealthPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Health metrics. |
| `/super-admin/operations/provisioning` | `ProvisioningJobsPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Asynchronous job queue. |
| `/super-admin/support/access` | `ControlledSupportAccessPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Emergency access logs. |
| `/super-admin/support/cases` | `SupportCasesPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Ticket management. |
| `/super-admin/settings/platform` | `PlatformSettingsPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Global settings. |
| `/super-admin/settings/users` | `PlatformUsersPage` (Admin) | Canonical & Reachable | `RequireSuperAdminWorkspace` | Operator admin users. |
| `/super-admin/companies` | `CompaniesPage` (Administration) | Compatibility Alias | `RequireSuperAdminWorkspace` | Flat legacy alias. |
| `/super-admin/audit-logs` | `AuditLogsPage` (Administration) | Compatibility Alias | `RequireSuperAdminWorkspace` | Flat legacy alias. |
| `/super-admin/settings` | `PlatformSettingsPage` (Admin) | Compatibility Alias | `RequireSuperAdminWorkspace` | Flat legacy alias. |
| `/super-admin/provisioning` | `CustomerProvisioningPage` (Admin) | Compatibility Alias | `RequireSuperAdminWorkspace` | Flat legacy alias. |

*Zero routes are shadowed or dead in the active route tree.* The dead file [applications/super-admin/routes/superAdminRoutes.tsx](../../apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx) is completely unmounted.

---

## 6. Navigation Ownership Audit

### 6.1 Canonical Catalog Inspection

The canonical catalog is defined in [apps/web/src/administration/super-admin/navigation/superAdminNavigation.ts](../../apps/web/src/administration/super-admin/navigation/superAdminNavigation.ts). It defines the 8 primary navigation groups:
1. **Overview** (`/super-admin`)
2. **Tenants** (`/super-admin/tenants`)
   - All Tenants (`/super-admin/tenants`)
   - Create Tenant (`/super-admin/tenants/create`)
   *(Tenant Details is strictly contextual and correctly omitted from the flyout)*
3. **Subscriptions** (`/super-admin/subscriptions`)
   - Plans (`/super-admin/subscriptions/plans`)
   - Tenant Subscriptions (`/super-admin/subscriptions/tenants`)
4. **Applications** (`/super-admin/applications`)
   - Application Catalog (`/super-admin/applications/catalog`)
   - Module Catalog (`/super-admin/applications/modules`)
5. **Governance** (`/super-admin/governance`)
   - Audit Logs (`/super-admin/governance/audit-logs`)
   - Module Access (`/super-admin/governance/module-access`)
6. **Operations** (`/super-admin/operations`)
   - Tenant Health (`/super-admin/operations/health`)
   - Provisioning Jobs (`/super-admin/operations/provisioning`)
7. **Support** (`/super-admin/support`)
   - Controlled Access (`/super-admin/support/access`)
   - Support Cases (`/super-admin/support/cases`)
8. **Settings** (`/super-admin/settings`)
   - Platform Settings (`/super-admin/settings/platform`)
   - Platform Users (`/super-admin/settings/users`)
   - Company Admins (`/super-admin/settings/company-admins`)

### 6.2 Navigation Consumer Tracing
- `superAdminApplication.navigation` in `app/config/applications.ts` references the catalog from `administration/super-admin`.
- When navigating to `/super-admin/tenants/123/overview`, `findNavContext()` matches the `/super-admin/tenants` prefix, ensuring the "Tenants" sidebar item remains highlighted and breadcrumbs correctly show `Tenants > Tenant Details`.
- All legacy flat links (`/super-admin/companies`, `/super-admin/audit-logs`, `/super-admin/settings`) are preserved as aliases in navigation metadata.

---

## 7. Page Ownership & Divergence Audit

Detailed side-by-side analysis of key pages:

### 7.1 `TenantsPage.tsx`
- **Administration Version** (17.3 KB): Legacy Phase 01 implementation. Displays "Tenants / Customers" header, simple table without batch actions, fallback text `"No email"`, limited filtering.
- **Applications Version** (30.4 KB): Full Phase 03A production page. Features Gmail-style card view, multi-facet filtering (status, tier, health), batch status changes, export, dynamic metrics bar, and strict Design System primitives (`Stack`, `Inline`, `Card`, `Badge`).
- **Verdict:** **Applications version is the superior implementation.** Needs to be migrated into `administration/super-admin/pages/TenantsPage.tsx`.

### 7.2 `CreateTenantPage.tsx`
- **Administration Version:** Does not exist.
- **Applications Version** (57.4 KB): Full Phase 03B production 4-step wizard. Includes Company Info, Admin Setup, Applications & Subscriptions selection, and Review & Orchestration with preflight validation.
- **Verdict:** **Applications version is canonical.** Needs to be moved into `administration/super-admin/pages/CreateTenantPage.tsx`.

### 7.3 `TenantDetailsPage.tsx`
- **Administration Version** (51.3 KB): Phase 01 5-tab layout. Basic static presentation with limited interactivity.
- **Applications Version** (69.2 KB): Full Phase 03C production workspace. Five rich tabs (Overview, Entitlements with Override Drawer, Provisioning with Job Retries, Lifecycle with Status Transitions, Activity with CSV Download).
- **Verdict:** **Applications version is canonical.** Needs to be migrated into `administration/super-admin/pages/TenantDetailsPage.tsx`.

### 7.4 Identical Pages (100% Duplicate Code)
The following 9 pages in `applications/super-admin/pages/` are identical byte-for-byte copies of their counterparts in `administration/super-admin/pages/`:
- `AuditLogsPage.tsx`
- `CompaniesPage.tsx`
- `CompanyAdminsPage.tsx`
- `CompanyDetailsPage.tsx`
- `CustomerProvisioningPage.tsx`
- `ModuleAccessPage.tsx`
- `PlatformSettingsPage.tsx`
- `PlatformUsersPage.tsx`
- `SuperAdminDashboardPage.tsx`

---

## 8. API Client & DTO Comparison Matrix

Both implementations maintain a `superAdminApi.ts` file, but their surface areas diverge significantly.

| API Method / Capability | Admin `superAdminApi.ts` (17.0 KB) | Apps `superAdminApi.ts` (32.7 KB) | Backend Route (`apps/api`) | Status & Action |
|---|---|---|---|---|
| `getPlatformStats()` | Yes | Yes | `GET /api/v1/super-admin/stats` | Identical. |
| `listCompanies()` | Yes | Yes | `GET /api/v1/super-admin/companies` | Identical. |
| `getCompanyDetails()` | Yes | Yes | `GET /api/v1/super-admin/companies/:id` | Identical. |
| `listPlatformUsers()` | Yes | Yes | `GET /api/v1/super-admin/users` | Identical. |
| `listAuditLogs()` | Yes | Yes | `GET /api/v1/super-admin/audit-logs` | Identical. |
| `listTenants()` | Yes (Basic DTO) | Yes (Extended DTO) | `GET /api/v1/super-admin/tenants` | Apps DTO supports health, adminEmail, metrics. |
| `getTenantSummary()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/summary` | **Required by Phase 03A/03C.** |
| `listPlans()` | **No** | **Yes** | `GET /api/v1/super-admin/plans` | **Required by Phase 03B/03C.** |
| `preflightTenantOrchestration()` | **No** | **Yes** | `POST /api/v1/super-admin/tenants/preflight` | **Required by Phase 03B Wizard.** |
| `orchestrateTenantCreation()` | **No** | **Yes** | `POST /api/v1/super-admin/tenants/orchestrate` | **Required by Phase 03B Wizard.** |
| `getTenantOverview()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/overview` | **Required by Phase 03C Details.** |
| `getTenantSubscriptions()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/subscriptions` | **Required by Phase 03C Details.** |
| `getTenantEntitlements()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/entitlements` | **Required by Phase 03C Details.** |
| `getTenantOverrides()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/overrides` | **Required by Phase 03C Details.** |
| `createTenantOverride()` | **No** | **Yes** | `POST /api/v1/super-admin/tenants/:id/overrides` | **Required by Phase 03C Details.** |
| `revokeTenantOverride()` | **No** | **Yes** | `DELETE /api/v1/super-admin/tenants/:id/overrides/:id` | **Required by Phase 03C Details.** |
| `listProvisioningJobs()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/provisioning` | **Required by Phase 03C Details.** |
| `retryProvisioningJob()` | **No** | **Yes** | `POST /api/v1/super-admin/tenants/:id/provisioning/retry`| **Required by Phase 03C Details.** |
| `getWorkerStatus()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/worker-status` | **Required by Phase 03C Details.** |
| `getTenantLifecycleHistory()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/lifecycle` | **Required by Phase 03C Details.** |
| `getTenantActivity()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/activity` | **Required by Phase 03C Details.** |
| `downloadTenantActivityCsv()` | **No** | **Yes** | `GET /api/v1/super-admin/tenants/:id/activity/csv` | **Required by Phase 03C Details.** |

**DTO Analysis:** The DTOs in `applications/super-admin/api/superAdminApi.ts` are a strict superset of those in `administration/super-admin/api/superAdminApi.ts`. They support the exact same backend endpoints and headers (`x-correlation-id`, `x-idempotency-key`). Merging the expanded methods into `administration/super-admin/api/superAdminApi.ts` carries zero breaking change risk.

---

## 9. Dependency Direction & ADR Compliance Audit

### 9.1 Repository Governance Hierarchy
Under [AGENTS.md (Article 3)](../../AGENTS.md#article-3--core-platform-architecture--canonical-layers) and [FRONTEND.md](FRONTEND.md#L8-L18):
```
      src/app
         ↓
src/administration (Workspaces: super-admin, tenant-admin)
src/applications   (Business products: hrms, crm, etc.)
src/layouts        (Shell layouts)
src/platform       (Global cross-app tools: search, drawer, etc.)
         ↓
src/design-system + src/shared
```

### 9.2 Current Dependency Anomalies
1. **Cross-Layer Import in Routes:**
   [apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx](../../apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx#L11-L13) imports page components from `src/applications/super-admin/pages/`.
   - *Status:* This was an intentional temporary bridge to surface Phase 03A/03B/03C screens without breaking the build.
   - *Architecture Assessment:* `administration` importing from `applications` violates modular separation and creates confusion over ownership.
2. **Circular Re-Export:**
   `applications/super-admin/index.ts` re-exports `administration/super-admin`, while `administration/super-admin/routes` imports pages from `applications/super-admin`.
   - *Status:* High cognitive overhead, potential for subtle bundling duplication.
3. **Canonical Location:**
   Platform administrative workspaces belong under `src/administration/` ([FRONTEND.md](FRONTEND.md#L10)). `src/applications/` is defined strictly for commercial business applications ([AGENTS.md Article 3](AGENTS.md#preamble--what-this-repository-is)).

---

## 10. Security & Authorization Audit

A strict audit of security controls across both implementations confirmed:

1. **Authorization Gate:**
   - Both implementations utilize the identical guard: `RequireSuperAdminWorkspace.tsx`.
   - [AppRouter.tsx](../../apps/web/src/app/routes/AppRouter.tsx#L82) mounts `<RequireSuperAdminWorkspace>` as a parent wrapper for the entire `/super-admin` route subtree.
   - Any unauthenticated request or request where `user.isSuperAdmin !== true` is intercepted at the router boundary and redirected to `/app/hrms` or `/auth/login`.
2. **Subtree Isolation:**
   - No route under `/super-admin/*` can be rendered without traversing the top-level `<RequireSuperAdminWorkspace>` check.
   - Deep links (`/super-admin/tenants/:tenantId/overview`, `/super-admin/tenants/create`) inherit this protection.
3. **Cross-Tenant Security:**
   - Super Admin workspace is tenant-agnostic (platform operator scope).
   - API calls send the operator's JWT bearer token. Backend routes (`apps/api/src/routes/superAdminRoutes.ts`) validate operator privileges via server-side middleware `requireSuperAdmin`.
4. **Security Finding:** **ZERO P0 or P1 security bypass vulnerabilities were detected.** All routes, aliases, and child pages are strictly guarded.

---

## 11. Test Coverage & False Confidence Audit

### 11.1 Test Suite Inventory
There are currently **22 Super Admin test files** totaling **300 test cases** across the repository:

| Test Location | Suite Count | Test Count | Type of Tests | Mounted Route / Component |
|---|---|---|---|---|
| `administration/super-admin/__tests__/` | 8 suites | 89 tests | Unit & Component | Tests `superAdminNavigation`, formatters, and admin pages. |
| `applications/super-admin/__tests__/` | 11 suites | 179 tests | Component & Router Integration | Tests Phase 03A `TenantsPage`, 03B `CreateTenantPage`, 03C `TenantDetailsPage`, and API client. |
| `app/routes/__tests__/` | 3 suites | 32 tests | Router Integration | Tests `AppRouter.tsx` routing, guards, and redirection. |

### 11.2 Evaluation of Test Quality
1. **Mock Concealment:** The tests in `applications/super-admin/__tests__/` use `MemoryRouter` with isolated routes. They successfully verify that the Phase 03 pages render properly and handle mock API calls, but they did not test whether `AppRouter.tsx` actually mounted those pages (which is why the initial routing disconnect was not caught by component tests).
2. **Actual AppRouter Coverage:** The router test suite in `apps/web/src/app/routes/__tests__/AppRouter.test.tsx` tests the real router configuration and confirms that `/super-admin` routes require Super Admin privileges.
3. **Browser E2E:** No Cypress or Playwright browser tests are currently running in the test suite. All tests are Vitest jsdom tests. Claims of "E2E verification" in earlier reports refer to component-level integration with mock APIs, not real browser automation.
4. **Build & Typecheck Health:**
   - `tsc -b --noEmit`: Passes with **0 errors**.
   - `vite build`: Passes successfully in **4.25 seconds**.
   - `vitest run`: **300 of 300 tests pass**.

---

## 12. Legacy Consumer & Deletion Safety Analysis

Every file in both directories has been classified into one of five categories:
- **KEEP:** Required canonical implementation.
- **MIGRATE:** Feature code to move to the canonical owner before retiring duplicate.
- **ADAPT:** Compatibility wrapper/re-export to keep during transition.
- **DEPRECATE:** Legacy file to safely remove after migration.
- **UNKNOWN:** Requires further investigation.

| File Path | Current Status | Classification | Rationale & Safe Action |
|---|---|---|---|
| `administration/super-admin/index.ts` | Active | **KEEP** | Authoritative application entrypoint. |
| `administration/super-admin/navigation/superAdminNavigation.ts` | Active | **KEEP** | Authoritative navigation catalog (8 groups). |
| `administration/super-admin/routes/superAdminRoutes.tsx` | Active | **KEEP** | Authoritative route definitions. Update imports to local pages in Stage 1. |
| `administration/super-admin/guards/RequireSuperAdminWorkspace.tsx` | Active | **KEEP** | Authoritative workspace auth guard. |
| `administration/super-admin/utils/auditLogFormatters.ts` | Active | **KEEP** | Reusable audit formatters. |
| `administration/super-admin/api/superAdminApi.ts` | Active (Base) | **KEEP / EXPAND** | Merge the 15 extended methods from Apps API into this file. |
| `administration/super-admin/pages/TenantsPage.tsx` | Legacy (Phase 01) | **DEPRECATE** | Replace with the modernized Phase 03A `TenantsPage.tsx`. |
| `administration/super-admin/pages/TenantDetailsPage.tsx` | Legacy (Phase 01) | **DEPRECATE** | Replace with the modernized Phase 03C `TenantDetailsPage.tsx`. |
| `administration/super-admin/pages/CreateTenantPage.tsx` | Missing | **MIGRATE** | Move Phase 03B `CreateTenantPage.tsx` here. |
| `administration/super-admin/pages/*` (9 identical pages) | Active | **KEEP** | Preserved in canonical home. |
| `administration/super-admin/pages/*` (8 extended pages) | Active | **KEEP** | Catalog, Plans, Support, Health pages preserved. |
| `applications/super-admin/pages/TenantsPage.tsx` | Modern (Phase 03A) | **MIGRATE** | Move to `administration/super-admin/pages/TenantsPage.tsx`. |
| `applications/super-admin/pages/CreateTenantPage.tsx` | Modern (Phase 03B) | **MIGRATE** | Move to `administration/super-admin/pages/CreateTenantPage.tsx`. |
| `applications/super-admin/pages/TenantDetailsPage.tsx` | Modern (Phase 03C) | **MIGRATE** | Move to `administration/super-admin/pages/TenantDetailsPage.tsx`. |
| `applications/super-admin/pages/*` (9 identical pages) | Duplicate | **DEPRECATE** | Unneeded once imports point to administration. |
| `applications/super-admin/api/superAdminApi.ts` | Extended (32.7 KB)| **MIGRATE** | Merge methods into administration API, then convert to adapter shim. |
| `applications/super-admin/routes/superAdminRoutes.tsx` | Dead Code (6.4 KB)| **DEPRECATE** | Unused dead route tree. |
| `applications/super-admin/routes/superAdminRoutes.ts` | Re-export Shim | **ADAPT** | Keep as shim during migration. |
| `applications/super-admin/navigation/superAdminNavigation.ts` | Re-export Shim | **ADAPT** | Keep as shim during migration. |
| `applications/super-admin/index.ts` | Re-export Shim | **ADAPT** | Keep as shim during migration. |
| `applications/super-admin/__tests__/*` | Test Suites | **MIGRATE** | Move test suites into `administration/super-admin/__tests__/`. |

---

## 13. Architecture Options Comparison

Three architectural directions were analyzed:

### Option A — Administration Canonical (RECOMMENDED)
Consolidate all Super Admin functionality into `apps/web/src/administration/super-admin/`. Maintain `apps/web/src/applications/super-admin/` solely as thin backward-compatibility re-exports, then deprecate.
- **Pros:**
  - Strictly adheres to [AGENTS.md Article 3](../../AGENTS.md) and [FRONTEND.md](FRONTEND.md#L8-L18).
  - Aligns with runtime truth: `AppRouter.tsx` and `applications.ts` already treat `administration/super-admin` as canonical.
  - Keeps `applications/` purely for commercial business apps (`hrms`, `crm`, etc.) as mandated by [ADR-014](ADRs.md#adr-014).
  - Preserves the 8 extended administration pages (`PlansPage`, `SupportCasesPage`, etc.) without relocating them.
  - Minimal migration friction: only 3 pages, 1 API expansion, and test suites need to be moved.
- **Cons:**
  - Requires updating imports in the Phase 03 pages from `applications/super-admin/api` to `administration/super-admin/api`.
- **Risk Level:** **Very Low.**

### Option B — Applications Canonical
Move the entire Super Admin workspace into `apps/web/src/applications/super-admin/` and deprecate `administration/super-admin/`.
- **Pros:**
  - Keeps the newer Phase 03 page implementations in their existing folder.
- **Cons:**
  - Violates [AGENTS.md](../../AGENTS.md#preamble--what-this-repository-is) and [FRONTEND.md](FRONTEND.md#L8-L18) by placing an operator administration workspace under `applications/`.
  - Requires updating `AppRouter.tsx`, `app/config/applications.ts`, and all platform registries.
  - Requires moving 17 existing administration pages and navigation files into `applications/`.
  - High risk of regression across application registration and shell layout.
- **Risk Level:** **High.**

### Option C — Split Ownership
Keep routing and navigation in `administration/super-admin`, but leave feature pages and API clients in `applications/super-admin`.
- **Pros:**
  - Requires zero immediate file moves.
- **Cons:**
  - Perpetuates cross-layer coupling (`administration` importing `applications`).
  - Confuses future developers and AI agents regarding where new operator screens belong.
  - Leaves duplicate API clients and dead route files in place permanently.
- **Risk Level:** **Medium (Technical Debt Accumulation).**

### Decision
**Option A (Administration Canonical) is the clear winner.** It reflects both repository constitutional governance and the actual runtime router composition.

---

## 14. Recommended Target Architecture

### Canonical Ownership Model
1. **Workspace Boundary:** All Super Admin code lives under `apps/web/src/administration/super-admin/`.
2. **Composition Boundary:** `src/app/` registers `superAdminApplication` from `administration/super-admin` and mounts `superAdminRoutes`.
3. **Domain Purity:** `src/applications/` contains only commercial business products (`applications/hrms`).

```
apps/web/src/administration/super-admin/
├── index.ts                           # Canonical Workspace Export & App Definition
├── api/
│   └── superAdminApi.ts               # Single Unified API Client (Base + Tenant Phase 02.6/03 methods)
├── context/
│   └── SuperAdminContext.tsx          # Workspace Context & State
├── guards/
│   └── RequireSuperAdminWorkspace.tsx # Route Guard (isSuperAdmin === true)
├── navigation/
│   └── superAdminNavigation.ts        # Canonical 8-Group Navigation Catalog
├── routes/
│   └── superAdminRoutes.tsx           # Canonical Route Definitions & Compatibility Redirects
├── pages/
│   ├── SuperAdminDashboardPage.tsx    # Dashboard / Overview
│   ├── TenantsPage.tsx                # Modern Phase 03A Tenants Management
│   ├── CreateTenantPage.tsx           # Modern Phase 03B 4-Step Wizard
│   ├── TenantDetailsPage.tsx          # Modern Phase 03C 5-Tab Workspace
│   ├── CompaniesPage.tsx              # Companies Management
│   ├── CompanyDetailsPage.tsx         # Company Details
│   ├── PlatformUsersPage.tsx          # Operator Admins
│   ├── CompanyAdminsPage.tsx          # Customer Tenant Admins
│   ├── ModuleAccessPage.tsx           # Entitlement Matrix
│   ├── AuditLogsPage.tsx              # Platform Audit Logs
│   ├── PlatformSettingsPage.tsx       # System Settings
│   ├── CustomerProvisioningPage.tsx   # Provisioning Orchestration
│   ├── PlansPage.tsx                  # Subscriptions: Plan Catalog
│   ├── TenantSubscriptionsPage.tsx    # Subscriptions: Tenant Subscriptions
│   ├── ApplicationCatalogPage.tsx     # Applications: App Catalog
│   ├── ModuleCatalogPage.tsx          # Applications: Module Catalog
│   ├── TenantHealthPage.tsx           # Operations: Health Metrics
│   ├── ProvisioningJobsPage.tsx       # Operations: Job Queue
│   ├── ControlledSupportAccessPage.tsx# Support: Emergency Access
│   └── SupportCasesPage.tsx           # Support: Ticket Management
├── utils/
│   └── auditLogFormatters.ts          # Reusable Audit Formatters
└── __tests__/                         # Complete Consolidated Test Suites
```

---

## 15. Staged Consolidation Plan (For Future Execution)

> **STRICT COMPLIANCE NOTICE:** The following plan is formulated for subsequent execution phases. No modifications are performed during this read-only audit.

### Stage 0 — Baseline & Rollback Checkpoint
- Preconditions: Clean working tree, all 300 tests passing.
- Actions: Record git commit hash, verify build artifacts.
- Rollback: Revert to baseline commit.

### Stage 1 — API Client Consolidation
- Preconditions: Stage 0 complete.
- Target File: `apps/web/src/administration/super-admin/api/superAdminApi.ts`.
- Actions: Merge the 15 extended methods and DTOs from `applications/super-admin/api/superAdminApi.ts` into `administration/super-admin/api/superAdminApi.ts`. Update `applications/super-admin/api/superAdminApi.ts` to re-export `superAdminApi` from `administration`.
- Acceptance Criteria: Typecheck passes, existing tests pass.

### Stage 2 — Page Component Migration
- Preconditions: Stage 1 complete.
- Target Files:
  - Copy `applications/super-admin/pages/CreateTenantPage.tsx` -> `administration/super-admin/pages/CreateTenantPage.tsx`.
  - Overwrite `administration/super-admin/pages/TenantsPage.tsx` with the modernized Phase 03A version.
  - Overwrite `administration/super-admin/pages/TenantDetailsPage.tsx` with the modernized Phase 03C version.
  - Update internal imports within these three pages to reference `../api/superAdminApi` locally.
- Acceptance Criteria: Pages render identically, zero broken imports.

### Stage 3 — Route Self-Containment
- Preconditions: Stage 2 complete.
- Target File: `apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx`.
- Actions: Change page imports in `superAdminRoutes.tsx` from `../../../applications/super-admin/pages/*` to local `./../pages/*`.
- Acceptance Criteria: `superAdminRoutes.tsx` has zero imports from `applications/super-admin`.

### Stage 4 — Test Suite Consolidation
- Preconditions: Stage 3 complete.
- Actions: Move tests from `applications/super-admin/__tests__/` to `administration/super-admin/__tests__/`. Update test import paths to point to `administration`.
- Acceptance Criteria: All 300 tests pass against `administration/super-admin`.

### Stage 5 — Legacy Shim Retention & Verification
- Preconditions: Stage 4 complete.
- Actions: Replace `apps/web/src/applications/super-admin/` with thin compatibility re-exports (`index.ts`, `api/`, `routes/`, `navigation/`). Delete the dead unmounted file `applications/super-admin/routes/superAdminRoutes.tsx`.
- Acceptance Criteria: Full build and typecheck pass without warnings.

### Stage 6 — Final Regression & E2E Validation
- Preconditions: Stage 5 complete.
- Actions: Run full unit/integration test suite, verify production build (`vite build`), perform manual runtime check of all 8 Super Admin navigation tabs and child workflows.

---

## 16. Risk Register

| Finding ID | Severity | File Path & Line | Runtime Impact | Recommended Action | Consolidation Stage |
|---|---|---|---|---|---|
| **R-01** | **P1 (High)** | [administration/super-admin/routes/superAdminRoutes.tsx#L11-L13](../../apps/web/src/administration/super-admin/routes/superAdminRoutes.tsx#L11-L13) | Cross-layer import (`administration` importing `applications`). Potential bundle confusion and architectural inconsistency. | Relocate Phase 03 pages into `administration/super-admin/pages/` and import locally. | Stage 2 & 3 |
| **R-02** | **P1 (High)** | [applications/super-admin/api/superAdminApi.ts](../../apps/web/src/applications/super-admin/api/superAdminApi.ts) | Dual API clients with diverging surface area (17 KB vs 32.7 KB). Core pages use one client, Tenant pages use the other. | Merge extended methods into `administration/super-admin/api/superAdminApi.ts`. | Stage 1 |
| **R-03** | **P2 (Med)** | [applications/super-admin/routes/superAdminRoutes.tsx](../../apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx) | Dead competing route file (6.4 KB) not mounted anywhere in the application. | Safely delete the unmounted `.tsx` file. | Stage 5 |
| **R-04** | **P2 (Med)** | [applications/super-admin/pages/](../../apps/web/src/applications/super-admin/pages/) | 9 pages are byte-identical duplicates of pages in `administration/super-admin/pages/`. | Deprecate duplicate copies in `applications/` after consolidation. | Stage 5 |
| **R-05** | **P2 (Med)** | [administration/super-admin/pages/TenantsPage.tsx](../../apps/web/src/administration/super-admin/pages/TenantsPage.tsx) | Legacy Phase 01 page still exists in administration folder while modern Phase 03A page lives in applications. | Overwrite legacy file with modern Phase 03A implementation. | Stage 2 |
| **R-06** | **P3 (Low)** | [applications/super-admin/index.ts#L1](../../apps/web/src/applications/super-admin/index.ts#L1) | Barrel shim already acknowledges canonical owner is administration, but directory still exists. | Keep as minimal backward-compatibility shim. | Stage 5 |

---

## 17. Verification Limitations

1. **Read-Only Scope:** This audit did not execute runtime file modifications, Git commits, or database alterations.
2. **Headless Environment:** Verification was conducted using static analysis, TypeScript compilation checks (`tsc -b`), Vitest test suite execution (300 tests), and Vite production bundle analysis. Real human visual evaluation in a live browser was not performed during this audit step.
3. **Backend Service:** MySQL 8.4 is active in the background (`task-69`). Backend unit/integration tests were validated during Phase 02.6.

---

## 18. Answers to Specific Audit Questions

### 1. Which Super Admin implementation is actually mounted?
**`apps/web/src/administration/super-admin` is the authoritative mounted implementation.**  
`AppRouter.tsx` (lines 18–20, 80–95) imports and mounts `superAdminRoutes` directly from `administration/super-admin/routes/superAdminRoutes`. `apps/web/src/app/config/applications.ts` registers `superAdminApplication` from `administration/super-admin`.

### 2. Which implementation should be canonical?
**`apps/web/src/administration/super-admin` should be the canonical implementation.**  
Under repository architecture rules ([AGENTS.md](../../AGENTS.md) and [FRONTEND.md](FRONTEND.md#L8-L18)), `applications/` is reserved exclusively for commercial business products (`hrms`, `crm`, etc.), while platform administration workspaces belong under `administration/`.

### 3. Why did Phase 03A/03B UI fail to appear initially?
Because the new pages (`TenantsPage.tsx`, `CreateTenantPage.tsx`) were created in `applications/super-admin/pages/`, but the production router (`AppRouter.tsx`) was importing route definitions from `administration/super-admin/routes/superAdminRoutes.tsx`, which was still pointing to the older legacy Phase 01 pages in `administration/super-admin/pages/`.

### 4. Are there duplicate API clients?
**Yes.** `administration/super-admin/api/superAdminApi.ts` (17.0 KB) and `applications/super-admin/api/superAdminApi.ts` (32.7 KB). The applications version has 15 additional methods supporting Phase 02.6 orchestration, overrides, jobs, and activity.

### 5. Are any routes shadowed or unreachable?
In the **active runtime router**, no routes are shadowed or unreachable. Deep links and compatibility aliases resolve deterministically. However, [applications/super-admin/routes/superAdminRoutes.tsx](../../apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx) is a dead, unmounted file.

### 6. Can legacy files be safely retired?
**Yes, but only through staged consolidation.** The 9 identical duplicate pages in `applications/super-admin/pages/` and the dead route file can be retired once imports are unified. The legacy `TenantsPage` and `TenantDetailsPage` in `administration/` must be replaced with their modern counterparts before retiring the originals.

### 7. What is the safest first implementation stage?
**Stage 1: Merge the extended API methods from `applications/super-admin/api/superAdminApi.ts` into `administration/super-admin/api/superAdminApi.ts`** and have the former re-export from the latter. This introduces zero UI risk and establishes a single source of truth for all API calls.

### 8. Can Phase 03C continue safely before consolidation?
**Yes.** The temporary route bridge in `administration/super-admin/routes/superAdminRoutes.tsx` currently renders the modern Phase 03C `TenantDetailsPage.tsx` flawlessly. All 300 tests pass, TypeScript compiles with 0 errors, and the production build succeeds. However, performing consolidation before expanding further is strongly recommended to eliminate technical debt.

---

## 19. Final Readiness Decision

```
================================================================================
                    READY FOR CONTROLLED CONSOLIDATION
================================================================================
```

The target architecture is fully validated against repository constitutional rules, runtime entrypoints have been traced to line-level evidence, all risks are documented, and a safe 6-stage consolidation plan is established. Migration can proceed without disrupting existing functionality.
