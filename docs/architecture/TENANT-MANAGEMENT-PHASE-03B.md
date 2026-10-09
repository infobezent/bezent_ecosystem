# TENANT-MANAGEMENT-PHASE-03B.md — Super Admin Create Tenant (4-Step Wizard) Production Implementation & Backend Integration

## 1. Executive Summary

Phase 03B implements the production-grade **Create Tenant (4-Step Wizard)** inside the BEZENT Super Admin platform. Built upon the Phase 02.6 transactional orchestration backend (`/api/v1/platform/tenants/orchestrate`) and Phase 03A All Tenants management experience, this workflow enables Super Administrators to atomically provision a customer organization, register its legal identity, invite the Primary Tenant Administrator, configure application subscriptions (HRMS, CRM, Project Management) without invented commercial pricing, perform preflight safety verification, and execute idempotent transactional tenant creation.

The entire frontend experience adheres to the BEZENT Design System, Gmail-inspired enterprise ergonomics, Zero Application CSS rule, and accessibility standards.

---

## 2. Scope

- **In Scope:**
  - Dedicated canonical route: `/super-admin/tenants/create`
  - Integration with Super Admin navigation catalog and All Tenants action buttons
  - Interactive 4-step wizard stepper (Company Info → Primary Admin → Applications & Subscriptions → Review & Create)
  - Step 1: Legal Company Name, Display Name, Business Email, Country, IANA Timezone select, Location & Regional details, Corporate Identifiers, auto-generated immutable Tenant ID notice
  - Step 2: Primary Administrator Full Name, Work Email, Phone, Job Title, 72-hour invitation validity notification, passwordless OTP notice
  - Step 3: Application Cards (HRMS, CRM, Project Management), dynamic plan selection filtered by application from real backend catalog (`/api/v1/platform/plans`), Trial vs Paid modes, licensed seats, billing cycle, immediate vs scheduled activation, zero-application support with non-blocking informational notice
  - Step 4: Full data review, edit shortcuts, automated server preflight validation against `POST /api/v1/platform/tenants/orchestrate/preflight`, non-blocking similarity warnings, blocking error prevention, atomic setup explanation
  - Step 5: Dedicated success screen displaying confirmed server IDs (`tenantId`, `primaryCompanyId`), invitation queued notice, asynchronous provisioning pending notice, and action CTAs
  - Idempotent creation via `Idempotency-Key` header and safe retry logic
  - Comprehensive unit and integration test suite (21 tests in `createTenantUI.test.tsx`, all 136 Super Admin tests passing, 20 backend orchestration tests passing)
- **Out of Scope (Deferred):**
  - Phase 03C (Tenant Details management tabs, subscription adjustments post-creation)
  - External payment gateway checkout or card processing (Internal Option A billing)
  - Unrelated application modules or Company Admin UI modifications

---

## 3. Four-Step Wizard Architecture

The wizard is implemented in `apps/web/src/applications/super-admin/pages/CreateTenantPage.tsx` using a single canonical form state machine.

### State Progression Model

```
Step 1: Company Info
   │ (Validates Legal Name, Display Name, Business Email, Country, Timezone)
   ▼
Step 2: Primary Admin
   │ (Validates Full Name, Work Email; no passwords)
   ▼
Step 3: Applications & Subscriptions
   │ (Selects 0..N apps; dynamic catalog plans; seat bounds; trial/paid; activation mode)
   ▼
Step 4: Review & Create
   │ (Calls preflight validation endpoint; renders warnings; generates idempotency key)
   ▼
Submission: POST /api/v1/platform/tenants/orchestrate (with Idempotency-Key header)
   ▼
Step 5: Success State
     (Displays confirmed tenantId, companyId, queued invitation, pending worker status)
```

1. **State Preservation:** State is maintained in component memory and preserved across step transitions. Users can use stepper pills or "Edit" buttons on Step 4 to jump back to any previous step without loss of entered values.
2. **Preflight Invalidation:** Any mutation to fields in Steps 1, 2, or 3 immediately clears existing preflight results (`invalidatePreflight`), preventing submission against stale preflight assertions.
3. **Double Submission Prevention:** Submission buttons are disabled and reflect loading states during network execution (`isSubmitting || preflightLoading`).

---

## 4. Route Changes

- **Canonical Route:** `/super-admin/tenants/create`
- **Route Declaration:** Added in `apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx`:
  ```tsx
  {
    path: 'tenants/create',
    element: (
      <RequireSuperAdmin>
        <CreateTenantPage />
      </RequireSuperAdmin>
    ),
  },
  ```
- **Ordering Invariant:** Declared strictly **before** `path: 'tenants/:tenantId'` to prevent parameter route collision.
- **Navigation Integration:**
  - `superAdminNavigation.ts`: Updated `create-tenant` destination path to `'tenants/create'` with `aliases: ['provisioning']` to preserve backwards compatibility for legacy navigation resolution.
  - `TenantsPage.tsx`: Primary header button "Create Tenant" and empty state CTA both navigate directly to `/super-admin/tenants/create`.

---

## 5. Files Created and Modified

| File | Change Type | Purpose |
| :--- | :--- | :--- |
| `apps/web/src/applications/super-admin/pages/CreateTenantPage.tsx` | **Created** | Complete 4-step wizard implementation with accessible stepper, responsive layout, preflight integration, idempotency, and success screen |
| `apps/web/src/applications/super-admin/__tests__/createTenantUI.test.tsx` | **Created** | Comprehensive 21-test suite verifying navigation, step validations, preflight, zero-apps, idempotency, and success states |
| `apps/web/src/applications/super-admin/api/superAdminApi.ts` | **Modified** | Added DTO types (`Step1CompanyPayload`, `Step2PrimaryAdminPayload`, `Step3SubscriptionPayload`, `TenantOrchestrationPayload`, `TenantOrchestrationPreflightResult`, `TenantOrchestrationResult`), `preflightTenantOrchestration`, and `orchestrateTenantCreation` |
| `apps/web/src/applications/super-admin/routes/superAdminRoutes.tsx` | **Modified** | Registered canonical `tenants/create` route with `RequireSuperAdmin` guard before `tenants/:tenantId` |
| `apps/web/src/administration/super-admin/navigation/superAdminNavigation.ts` | **Modified** | Updated `create-tenant` path to `'tenants/create'` with alias support for `'provisioning'` |
| `apps/web/src/applications/super-admin/pages/TenantsPage.tsx` | **Modified** | Wired header button and empty state CTA to navigate to `/super-admin/tenants/create` |
| `apps/web/src/shared/types/navigation.ts` | **Modified** | Added optional `aliases?: readonly string[]` to `NavChild` interface |
| `apps/web/src/shared/utils/navigation.ts` | **Modified** | Extended `resolveActiveNavigation` to match child aliases |
| `docs/architecture/TENANT-MANAGEMENT-PHASE-03B.md` | **Created** | Phase 03B architectural documentation and verification report |

---

## 6. Actual API Contracts

### A. Preflight Validation
- **Method & URL:** `POST /api/v1/platform/tenants/orchestrate/preflight`
- **Request Payload:**
  ```json
  {
    "company": {
      "legalName": "Apex Innovations LLC",
      "displayName": "Apex Global",
      "businessEmail": "contact@apexglobal.com",
      "country": "United States",
      "timeZone": "America/New_York",
      "contactPhone": "+1-555-0100",
      "website": "https://apexglobal.com",
      "companySize": "51-200"
    },
    "admin": {
      "fullName": "Sarah Connor",
      "workEmail": "sarah.connor@apexglobal.com",
      "phone": "+1-555-0199",
      "jobTitle": "VP Operations"
    },
    "subscriptions": [
      {
        "applicationCode": "hrms",
        "planId": "plan_hrms_growth",
        "accessMode": "paid",
        "licensedSeats": 25,
        "billingCycle": "monthly",
        "activationMode": "immediate"
      }
    ]
  }
  ```
- **Response Shape (HTTP 200):**
  ```json
  {
    "valid": true,
    "tenantSetupPolicy": "ready_to_create",
    "warnings": [
      "A company with similar name \"Apex International\" exists in the platform."
    ],
    "summary": {
      "companyName": "Apex Innovations LLC",
      "tenantName": "Apex Innovations LLC",
      "primaryCompanyName": "Apex Innovations LLC",
      "adminEmail": "sarah.connor@apexglobal.com",
      "selectedApplications": ["hrms"],
      "applicationsCount": 1,
      "subscriptions": [
        {
          "applicationCode": "hrms",
          "planId": "plan_hrms_growth",
          "accessMode": "paid",
          "seats": 25
        }
      ]
    }
  }
  ```

### B. Final Tenant Creation Orchestration
- **Method & URL:** `POST /api/v1/platform/tenants/orchestrate`
- **Headers:** `Idempotency-Key: sa-tnt-<timestamp>-<random>`
- **Request Payload:** Identical to validated preflight payload
- **Response Shape (HTTP 201 / HTTP 200 on Idempotent Replay):**
  ```json
  {
    "tenantId": "tnt_apex_98214",
    "tenantCode": "APEX",
    "primaryCompanyId": "cmp_apex_001",
    "businessSetupState": "pending_admin_acceptance",
    "subscriptions": [
      {
        "id": "sub_hrms_01",
        "applicationCode": "hrms",
        "planId": "plan_hrms_growth",
        "status": "active",
        "licensedSeats": 25,
        "billingCycle": "monthly"
      }
    ],
    "invitation": {
      "id": "inv_adm_7718",
      "email": "sarah.connor@apexglobal.com",
      "status": "pending",
      "expiresAt": "2026-10-12T00:00:00.000Z"
    },
    "provisioningJobId": "wf_prov_8819",
    "provisioningStatus": "pending",
    "idempotentReplay": false
  }
  ```

---

## 7. Field Mapping

| UI Field Label | Form State Property | Backend DTO Property | Required | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Legal Company Name | `companyData.legalName` | `company.legalName` | Yes | Validated for min 2 chars |
| Display Name | `companyData.displayName` | `company.displayName` | Yes | Commercial trade name |
| Business Email | `companyData.businessEmail` | `company.businessEmail` | Yes | Checked for conflict in preflight |
| Country | `companyData.country` | `company.country` | Yes | Operational jurisdiction |
| IANA Timezone | `companyData.timeZone` | `company.timeZone` | Yes | Validated IANA canonical string |
| Contact Phone | `companyData.contactPhone` | `company.contactPhone` | No | Stored with primary company |
| Website URL | `companyData.website` | `company.website` | No | URL format validated |
| Company Size | `companyData.companySize` | `company.companySize` | No | Bracket string (e.g., '11-50') |
| Registration Number | `companyData.registrationNumber` | `company.registrationNumber` | No | CIN / Corporate ID |
| Tax Identifier | `companyData.taxIdentifier` | `company.taxIdentifier` | No | GSTIN / EIN / VAT |
| Administrator Full Name | `adminData.fullName` | `admin.fullName` | Yes | Invitee name |
| Administrator Work Email | `adminData.workEmail` | `admin.workEmail` | Yes | Invitee email |
| Administrator Phone | `adminData.phone` | `admin.phone` | No | Invitee contact phone |
| Job Title | `adminData.jobTitle` | `admin.jobTitle` | No | Primary administrator title |
| Applications | `selectedApps[code]` | `subscriptions[].applicationCode` | No | Supports zero applications |
| Plan Selection | `subscriptionsConfig[code].planId` | `subscriptions[].planId` | Cond. | Filtered from real catalog |
| Access Mode | `subscriptionsConfig[code].accessMode` | `subscriptions[].accessMode` | Cond. | 'trial' or 'paid' |
| Licensed Seats | `subscriptionsConfig[code].licensedSeats` | `subscriptions[].licensedSeats` | Cond. | Min 1 integer |
| Billing Cycle | `subscriptionsConfig[code].billingCycle` | `subscriptions[].billingCycle` | Cond. | 'monthly', 'quarterly', 'annual' |
| Activation Mode | `subscriptionsConfig[code].activationMode` | `subscriptions[].activationMode` | Cond. | 'immediate' or 'scheduled' |
| Scheduled Date | `subscriptionsConfig[code].scheduledDate` | `subscriptions[].scheduledDate` | Cond. | Validated future date |

---

## 8. Plan & Pricing Behavior

1. **Catalog Integrity:** Plans are fetched directly from `/api/v1/platform/plans` via `superAdminApi.listPlans()`. No pricing tiers or plan names are fabricated in frontend code.
2. **Application Partitioning:** Plans are cleanly partitioned by `applicationCode` (`hrms`, `crm`, `project_management`). HRMS plans never appear in CRM or PM select menus.
3. **No Payment Gateway / Option A:** No payment gateway, credit card fields, or stripe tokens are collected. Subscriptions are internal platform-managed entitlements created atomically by Super Admin.
4. **Trial Rules:** When Free Trial is chosen, trial duration is bounded by backend plan catalog defaults (e.g., 14 days for growth).
5. **Zero Applications:** Selecting zero applications is fully supported. An informative banner warns that the tenant will be created in `pending_setup` state without active application subscriptions.

---

## 9. Validation and Preflight Behavior

1. **Client-Side Step Validation:**
   - Step 1: Validates required company fields, email syntax, and IANA timezone before allowing progression.
   - Step 2: Validates admin full name and work email syntax.
   - Step 3: Validates that enabled applications have selected plans, valid seat counts ($\ge 1$), and future scheduled dates when scheduled activation is chosen.
2. **Server Preflight Validation:**
   - Automatically executed upon entering Step 4 (Review & Create) and when clicking "Re-run Server Preflight Validation".
   - Detects name similarities and existing email bindings on the server.
   - Displays non-blocking warnings in an informative alert without stopping the user.
   - Displays blocking errors and disables the "Create Tenant" submission button until resolved.
   - Any edits to earlier form steps automatically invalidate stale preflight results.

---

## 10. Idempotency and Retry Behavior

1. **Key Generation:** A unique idempotency key is generated per logical wizard session (`sa-tnt-<timestamp>-<entropy>`).
2. **Network Timeout / Retry Safety:** If a network timeout occurs, retrying with the same idempotency key sends an identical request. The Phase 02.6 backend recognizes the idempotency key and returns the already-created record (`idempotentReplay: true`) rather than attempting a duplicate insert.
3. **Payload Mutation:** If the Super Admin changes any form data and attempts submission again, the backend rejects mismatched payloads with HTTP 409 Conflict as enforced by the idempotency layer.

---

## 11. Invitation Security

1. **Passwordless OTP Model:** Absolutely no password, password-confirmation, or temporary password fields exist in the UI.
2. **Explicit 72-Hour Validity:** The UI explicitly notifies that the invitation is valid for 72 hours.
3. **Delayed Authorization:** Company Admin permissions are activated only after the invitee securely authenticates via Email OTP and accepts the invitation.
4. **No Token Exposure:** Raw invitation tokens are never displayed on screen or logged into browser storage (`localStorage` / `sessionStorage`).

---

## 12. Success-State Handling

After successful creation, Step 5 renders a dedicated completion screen:
- **Tenant ID & Code:** Displays backend-confirmed `tenantId` and `tenantCode`.
- **Primary Company ID:** Displays confirmed `primaryCompanyId`.
- **Primary Administrator:** Displays invitee email address.
- **Accurate Invitation State:** Explicitly labels invitation status as `Queued (72-hour validity)`. Does not claim "Delivered".
- **Accurate Provisioning State:** Explicitly labels provisioning as `Pending Asynchronous Worker`. Does not claim "Completed".
- **Navigation CTAs:** Provides "Back to All Tenants" (navigates to `/super-admin/tenants`) and secondary details link.

---

## 13. Accessibility and Responsive Behavior

- **A11y Progress Stepper:** Navigation stepper utilizes `<nav aria-label="Tenant Creation Steps">`, with `aria-current="step"`, accessible labels (`aria-label="Step X of 4: ..."`), and live region announcements.
- **Form Controls:** Semantic `<label>` association with form controls, accessible error messages, and disabled state styling.
- **Zero Inline Styles:** All visual elements use semantic Design System classes and tokens (`bezent-heading-md`, `bezent-caption`, `Card`, `Stack`, `Grid`, `Inline`, `Badge`, `Button`, `Alert`, `Input`, `Select`). Zero inline `style={{ ... }}` exists.
- **Responsive Layout:** Grid layouts adapt gracefully from desktop 4-column metrics and 2-column forms to stacked single-column layouts on narrower viewports without horizontal overflow.

---

## 14. Test Results

### 1. Wizard UI Test Suite (`apps/web/src/applications/super-admin/__tests__/createTenantUI.test.tsx`)
- **Total Tests:** 21
- **Passed:** 21 (100%)
- **Failed:** 0
- **Coverage Areas:**
  - Routing & Navigation hierarchy
  - 4-step progress indicator and accessible statuses
  - Step 1 Company Information fields, IANA timezone select, and server-generated Tenant ID notice
  - Step 2 Primary Administrator fields, passwordless model, 72-hour invitation notice
  - Step 3 Applications & Subscriptions (HRMS, CRM, PM), zero-application flow, plan filtering, seat counts, activation modes
  - Step 4 Review & Create summary cards, non-blocking preflight warnings, blocking preflight errors
  - Step 5 Success screen with accurate "Queued" and "Pending Async" labeling

### 2. Full Super Admin Frontend Test Suite
- **Test Files:** 9 passed (100%)
  - `accessAndApplications.test.tsx` (PASS)
  - `companiesUI.test.tsx` (PASS)
  - `createTenantUI.test.tsx` (PASS)
  - `dashboardUI.test.tsx` (PASS)
  - `governanceUI.test.tsx` (PASS)
  - `provisioningUI.test.tsx` (PASS)
  - `superAdmin.test.tsx` (PASS)
  - `superAdminAuth.test.tsx` (PASS)
  - `tenantsUI.test.tsx` (PASS)
- **Total Tests:** 136 passed, 0 failed

### 3. Backend Phase 02.6 Orchestration Test Suite (`apps/api/src/platform/__tests__/tenantManagementPhase026.test.ts`)
- **Total Tests:** 20 passed, 0 failed

### 4. Build & Typecheck Quality Gates
- `npm run typecheck --workspace=apps/web`: **PASSED (exit code 0)**
- `npm run typecheck --workspace=apps/api`: **PASSED (exit code 0)**
- `npm run build --workspace=apps/web`: **PASSED (exit code 0, 486 modules transformed, zero bundle errors)**

---

## 15. Screenshots & Visual Verification Evidence

- **Stepper Layout:**
  - Header: `Create Tenant` with subtitle "Set up a new customer organization, administrator, and application access."
  - Progress bar: `Step 1 of 4 — Company Information` followed by pills: `1 Company Info` (Active) → `2 Primary Admin` → `3 Applications` → `4 Review & Create`.
- **Step 1:**
  - Informational Banner: "Tenant ID will be generated automatically. Immutable system identifier assigned by the platform backend upon creation."
  - Field groups: Company Identity, Location & Regional Settings, Corporate Identifiers.
- **Step 2:**
  - Informational Banner: "Passwordless Email OTP Security (72-Hour Validity)".
  - Fields: Full Name, Work Email Address, Phone Number, Job Title.
- **Step 3:**
  - Cards: HRMS (default active), CRM, PM.
  - Controls: Plan select, Commercial Paid vs 14-Day Evaluation Trial, Licensed Seats, Billing Cycle, Activation Schedule.
- **Step 4:**
  - Preflight Verification Banner with non-blocking similarity warnings.
  - Summary cards for 1. Company Details, 2. Primary Administrator, 3. Applications & Subscriptions, 4. Transactional Commitment Notice.
- **Step 5 (Success):**
  - Large success checkmark.
  - Metrics grid: Tenant ID, Tenant Code, Primary Company ID, Setup State (`Pending Admin Acceptance`), Invitation Status (`Queued (72-hour validity)`), Provisioning Job (`Pending Asynchronous Worker`).

---

## 16. Remaining Issues

- None. All requirements from Phase 03B specification have been implemented and verified against both frontend and backend quality gates.

---

## 17. Phase 03C Readiness

The repository is fully ready for **Phase 03C (Tenant Details & Subscriptions Management)**:
1. Canonical routes for `/super-admin/tenants/:tenantId` are established.
2. Navigation, preflight, and orchestration contracts are stabilized.
3. Subscriptions catalog DTOs and API clients are established in `superAdminApi.ts`.
4. Tenant lifecycle states (`active`, `trial`, `suspended`, `pending_setup`) are supported end-to-end.
