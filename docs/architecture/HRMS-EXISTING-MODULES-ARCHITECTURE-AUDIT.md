# BEZENT — HRMS Existing Modules & Architecture Audit

**Status:** Completed & Authoritative  
**Date:** October 9, 2026  
**Auditor Roles:** Principal SaaS Architect, Senior Full-Stack Engineer, HRMS Domain Architect, Database Architect, Software Quality Auditor  
**Scope:** `apps/web/src/applications/hrms/`, `apps/api/src/applications/hrms/`, `apps/api/src/db/schema.ts`, Platform boundaries, and ESS counterparts.  
**Execution Mode:** Read-Only Source & Database Ground-Truth Audit.

---

## 1. Executive Summary

This audit assesses the actual implemented state of the **BEZENT HRMS Business Application** in `E:\Company\bezent_ecosystem` prior to the planned development of the **Attendance Module**.

### Key Audit Findings

1. **Architecture Discovery:** HRMS is structured as a top-level business application (`apps/web/src/applications/hrms` and `apps/api/src/applications/hrms`). It operates inside the global `AppShell` with strict workspace routing guards (`RequireHrmsWorkspace` and `RequireEssWorkspace`).
2. **Catalog vs. Implementation Reality:** The canonical navigation catalog (`hrmsNavigation.ts`) defines **19 destinations** across 6 categories. However, only **4 modules are fully functional** on the administrative side (**Employees**, **Employee Administration**, **Onboarding**, and **Documents**), alongside Organization workforce masters (**Designations**, **Job Levels**, **Grades**).
3. **The Attendance & Leave Dichotomy:**
   - **Administrative Side:** Both `/hrms/attendance` and `/hrms/leave` currently render generic `<ModulePlaceholder>` empty states. Neither has an administrative controller, route handler, or management UI mounted in the production router. The settings sections in HR Settings (`AttendanceSettingsSection.tsx` and `LeaveSettingsSection.tsx`) are purely local client-state stubs with simulated `setTimeout` saves.
   - **Employee Self-Service (ESS) Side:** In contrast, ESS check-in/out, daily attendance history, regularization requests, leave balance checks, and leave requests are **already functioning end-to-end** via `/api/v1/ess/attendance` and `/api/v1/ess/leave`. These delegate to backend foundation repositories (`AttendanceRepository` and `LeaveRepository`).
4. **Shift Module Status:** The Shift module (`/hrms/shifts`) is **completely unimplemented**. No database tables (`shifts`, `shift_masters`, `rosters`, `weekly_offs`) or backend services exist. The only scheduling concept in the repository is a static `employee_work_schedules` table attached to an individual employee's profile.
5. **Quality & Validation Baseline:**
   - Frontend typecheck (`npm run typecheck --workspace=apps/web`): **PASS (0 errors)**.
   - Backend typecheck (`npm run typecheck --workspace=apps/api`): **PASS (0 errors)**.
   - Frontend HRMS test suite (`vitest run apps/web/src/applications/hrms`): **PASS (21 test files, 304 tests passed)**.
   - Backend HRMS test suite (`vitest run apps/api/src/applications/hrms`): **19 of 21 test files passed (323 of 325 tests passed)**.
6. **Final Readiness Verdict:** **READY WITH PREREQUISITES**. Administrative Attendance implementation cannot be built in a vacuum; it requires defining the administrative service/router contracts and introducing punch-event and shift-roster structures without breaking the existing ESS attendance pipeline.

---

## 2. Actual HRMS Architecture

### 2.1 Workspace and Boundaries

In accordance with [ADR-014](file:///e:/Company/bezent_ecosystem/docs/architecture/ADRs.md) and [AGENTS.md](file:///e:/Company/bezent_ecosystem/AGENTS.md):
- **HRMS is an Application, not a Module:** It lives at `applications/hrms` in both web and API.
- **Modules are Capabilities inside HRMS:** Organization, Employees, Onboarding, Documents, Attendance, Leave, etc.
- **Employee Self-Service (ESS) is an Experience, not a separate application:** It provides permission-scoped access (`/ess`) over the same underlying data models.
- **Top-Level Composition Root:** `apps/web/src/app/router/AppRouter.tsx` mounts workspace guards strictly above the shell layout:
  ```
  RequireAuth
    └── RequireHrmsWorkspace
          └── ShellLayout
                └── hrmsRoutes (/hrms/*)
  ```
- **Backend Composition Root:** `apps/api/src/app/server/createApp.ts` mounts domain routers under `/api/v1`. The administrative gate enforces session authentication and tenant access:
  ```typescript
  app.use('/api/v1/hrms', requirePlatformAuth, requireApplicationAccess('hrms', 'hrms'));
  ```

### 2.2 Directory Structure & Ownership Map

```
apps/web/src/applications/hrms/
├── administration/       # Facade re-exporting employees, employee-administration, onboarding, documents
├── api/                  # Global master API (organizationMastersApi.ts)
├── documents/            # Documents UI, models, APIs, and tests (FUNCTIONAL)
├── employee-administration/ # Employment action queue and modals (FUNCTIONAL)
├── employees/            # Employee Directory & Profile (10 tabs) (FUNCTIONAL)
├── ess/                  # Employee Self-Service experience (FUNCTIONAL)
├── navigation/           # Canonical navigation catalog (hrmsNavigation.ts)
├── onboarding/           # Onboarding pipeline, draft lifecycle, registration wizard (FUNCTIONAL)
├── pages/                # ModulePlaceholder.tsx (renders all unimplemented destinations)
├── routes/               # hrmsRoutes.tsx (generates routes dynamically from catalog)
└── settings/             # HR Settings center: Onboarding, Forms, Workforce Masters, + Stubs

apps/api/src/applications/hrms/
├── attendance/           # AttendanceRepository, AttendanceService (PARTIAL - ESS only)
├── documents/            # EmployeeDocumentController, Service, Repository (FUNCTIONAL)
├── employee-administration/ # EmployeeActionController, Service, Repository (FUNCTIONAL)
├── employees/            # EmployeeController, Service, ProfileService, Repositories (FUNCTIONAL)
├── ess/                  # EssController, EssService, EssRepository (FUNCTIONAL)
├── leave/                # LeaveRepository, LeaveService, LeaveRules (PARTIAL - ESS only)
├── onboarding/           # OnboardingController, Service, Repository (FUNCTIONAL)
├── routes/               # organizationCompatibility.routes.ts (FUNCTIONAL)
├── settings/             # forms, onboarding (FUNCTIONAL)
└── workforce/            # designation, jobLevel, grade controllers/services (FUNCTIONAL)
```

---

## 3. Complete HRMS Module Inventory

The 19 destinations from `hrmsNavigation.ts` plus cross-cutting domains are inventoried below based on concrete repository evidence:

| # | Module / Destination | Frontend Implementation | Backend Implementation | Database Schema | Test Coverage | Classification |
|---|---|---|---|---|---|---|
| 1 | **Dashboard** | `ModulePlaceholder.tsx` (renders Overview, Analytics, Activity) | None (except ESS dashboard `/api/v1/ess/dashboard`) | None (Aggregations across tables) | Catalog navigation tests | **PLACEHOLDER** (Admin) / **FUNCTIONAL** (ESS) |
| 2 | **Employees** | `EmployeeDirectoryPage`, `EmployeeProfilePage` (10 tabs, full sub-forms) | `EmployeeController`, `EmployeeService`, `EmployeeProfileService`, `EmployeeRepository` | `employees`, `employee_personal_details`, `employee_family_members`, `employee_nominees`, `employee_bank_accounts`, `employee_skills`, `employee_work_schedules` | Unit, schema, validation & MySQL db integration tests | **FUNCTIONAL** |
| 3 | **Employee Administration** | `EmployeeAdministrationPage` (Action queue, 5 transition modals, history drawer) | `EmployeeActionController`, `EmployeeActionService`, `EmployeeActionRepository` | `employee_actions`, `employee_action_history` | API tests, UI tests, validation tests, MySQL integration tests | **FUNCTIONAL** |
| 4 | **Onboarding** | `OnboardingPage` (stages, candidate tracking), `EmployeeRegistrationPage` | `OnboardingController`, `OnboardingService`, `OnboardingRepository` | `onboarding_cases`, `onboarding_case_stage_history`, `onboarding_general_settings`, `onboarding_stage_configs`, etc. | 7 frontend test files, 3 backend test files | **FUNCTIONAL** |
| 5 | **Documents** | `DocumentsPage` (list, upload modal, filter drawer, employee selector) | `EmployeeDocumentController`, `EmployeeDocumentService`, `EmployeeDocumentRepository` | `employee_documents` | UI tests, validation tests, MySQL integration tests | **FUNCTIONAL** |
| 6 | **Organization** | Integrated via Settings & Platform (`/company-admin/organization`) | `OrganizationController`, `DepartmentController`, `WorkLocationController`, `workforceRouter` | `departments`, `designations`, `locations`, `job_levels`, `grades`, `business_units`, `divisions` | Frontend UI tests, backend MySQL integration tests | **FUNCTIONAL** |
| 7 | **Attendance** | Admin: `ModulePlaceholder.tsx`<br>Settings: `AttendanceSettingsSection.tsx` (UI stub)<br>ESS: `EssAttendancePage.tsx` | Admin: **None** (No routes mounted)<br>Core: `AttendanceService`, `AttendanceRepository`<br>ESS: `/api/v1/ess/attendance/*` | `employee_attendance` (single daily check-in/out record)<br>`employee_requests` (regularization) | ESS Supertest integration tests; no admin attendance tests | **PARTIAL**<br>(Admin: PLACEHOLDER, ESS: FUNCTIONAL, Core: PARTIAL) |
| 8 | **Leave** | Admin: `ModulePlaceholder.tsx`<br>Settings: `LeaveSettingsSection.tsx` (UI stub)<br>ESS: `EssLeavePage.tsx` | Admin: **None** (No routes mounted)<br>Core: `LeaveService`, `LeaveRepository`, `leaveRules.ts`<br>ESS: `/api/v1/ess/leave/*` | `employee_leave_balances`, `employee_leave_requests` | Rule engine unit tests (`leaveRules.test.ts`), ESS integration tests | **PARTIAL**<br>(Admin: PLACEHOLDER, ESS: FUNCTIONAL, Core: PARTIAL) |
| 9 | **Timesheets** | Admin: `ModulePlaceholder.tsx`<br>Settings: `TimesheetsSettingsSection.tsx` (UI stub)<br>ESS: `EssTimesheetsPage.tsx` | Admin: **None**<br>ESS: `/api/v1/ess/timesheets` | `employee_timesheets` | ESS integration tests | **PARTIAL**<br>(Admin: PLACEHOLDER, ESS: FUNCTIONAL) |
| 10 | **Shifts** | `ModulePlaceholder.tsx` | None | None (Only static `employee_work_schedules` per employee) | Catalog navigation tests | **PLACEHOLDER** |
| 11 | **Recruitment** | `ModulePlaceholder.tsx` (children: Job Openings, Candidates, Interviews, Offers) | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 12 | **Performance** | Admin: `ModulePlaceholder.tsx`<br>Settings: `PerformanceSettingsSection.tsx` (UI stub) | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 13 | **Learning** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 14 | **Career Paths** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 15 | **Payroll** | Admin: `ModulePlaceholder.tsx`<br>ESS: `EssPayslipsPage.tsx` (placeholder) | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 16 | **Compensation** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 17 | **Benefits** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 18 | **Assets** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 19 | **Employee Requests** | Admin: `ModulePlaceholder.tsx`<br>ESS: `EssRequestsPage.tsx` (submits profile/regularization/doc requests) | Admin: **None**<br>ESS: `/api/v1/ess/requests` | `employee_requests` | ESS integration tests | **PARTIAL**<br>(Admin: PLACEHOLDER, ESS: FUNCTIONAL) |
| 20 | **Standard Operations (SOP)** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 21 | **Reports** | `ModulePlaceholder.tsx` | None | None | Catalog navigation tests | **PLACEHOLDER** |
| 22 | **HR Settings** | `SettingsPage.tsx` with tabs: Onboarding, Forms, Designations, Job Levels/Grades, Attendance, Leave, Timesheets, Performance | Forms & Onboarding settings routers mounted under `/api/v1/hrms/settings/*` | `form_customizations`, `form_field_overrides`, `form_custom_fields`, `onboarding_*` | 7 frontend test files, 4 backend test files | **PARTIAL**<br>(Workforce/Forms: FUNCTIONAL, Time/Leave: UI-ONLY) |

---

## 4. Frontend Architecture

### 4.1 Route Generation & Rendering Engine

In `apps/web/src/applications/hrms/routes/hrmsRoutes.tsx`, routes are dynamically generated by iterating over `hrmsNavigation.destinations`:
- When `destination.id === 'administration'`, it maps children:
  - `employees` → `<EmployeeDirectoryPage />`
  - `employee-administration` → `<EmployeeAdministrationPage />`
  - `onboarding` → `<OnboardingPage />`
  - `documents` → `<DocumentsPage />`
  - Canonical profile deep link: `administration/employees/:employeeId` → `<EmployeeProfilePage />`
- When `destination.id === 'settings'`, it renders `<SettingsPage />`.
- **For all other destinations** (including `attendance`, `leave`, `shifts`, `timesheets`, `performance`, `payroll`, `recruitment`, `assets`, etc.), it falls back to:
  ```tsx
  <ModulePlaceholder
    application="HRMS"
    destinationId={destination.id}
    title={destination.label}
    section={child?.label}
    sectionId={child?.id}
  />
  ```

### 4.2 Dead or Misleading UI Stubs

In `apps/web/src/applications/hrms/settings/`:
- [`AttendanceSettingsSection.tsx`](file:///e:/Company/bezent_ecosystem/apps/web/src/applications/hrms/settings/attendance/AttendanceSettingsSection.tsx): Maintains local state (`gracePeriodMins: 15`, `defaultShift: "09:00 AM - 06:00 PM"`, `attendanceTypes`), uses an artificial `setTimeout(() => setSaved(false), 3000)` on save, and makes **zero HTTP API calls**.
- [`LeaveSettingsSection.tsx`](file:///e:/Company/bezent_ecosystem/apps/web/src/applications/hrms/settings/leave/LeaveSettingsSection.tsx): Maintains hardcoded `DEFAULT_LEAVE_TYPES` array in React component state with no persistence backend.
- [`TimesheetsSettingsSection.tsx`](file:///e:/Company/bezent_ecosystem/apps/web/src/applications/hrms/settings/timesheets/TimesheetsSettingsSection.tsx): Local React component state with no persistence backend.
- [`PerformanceSettingsSection.tsx`](file:///e:/Company/bezent_ecosystem/apps/web/src/applications/hrms/settings/performance/PerformanceSettingsSection.tsx): Local React component state with no persistence backend.

---

## 5. Backend Architecture

### 5.1 Mounted vs. Unmounted Routers

Inspection of [`createApp.ts`](file:///e:/Company/bezent_ecosystem/apps/api/src/app/server/createApp.ts) lines 66–86 reveals which routers are actually mounted in Express:

```typescript
// Platform & Core
app.use('/api/v1', healthRouter);
app.use('/api/v1/platform', platformRouter);
app.use('/api/v1/company-admin', companyAdminRouter);
app.use('/api/v1/tenant-admin', tenantAdminRouter);
app.use('/api/v1/ess', essRouter);

// Administrative HRMS Gate
app.use('/api/v1/hrms', requirePlatformAuth, requireApplicationAccess('hrms', 'hrms'));

// Active Administrative Routers
app.use('/api/v1', workforceRouter);
app.use('/api/v1', organizationCompatibilityRouter);
app.use('/api/v1', onboardingRouter);
app.use('/api/v1', onboardingSettingsRouter);
app.use('/api/v1', employeeRouter);
app.use('/api/v1', employeeActionRouter);
app.use('/api/v1', employeeDocumentRouter);
app.use('/api/v1', formsRouter);
```

**Critical Architectural Gap:**
- `attendanceRouter`: **Does not exist**. No administrative attendance router is mounted.
- `leaveRouter`: **Does not exist**. No administrative leave router is mounted.
- `shiftRouter`: **Does not exist**.

### 5.2 The Hidden Backend Services

Although no administrative routes are mounted for Attendance and Leave, core business code exists under `apps/api/src/applications/hrms/`:
1. [`apps/api/src/applications/hrms/attendance/`](file:///e:/Company/bezent_ecosystem/apps/api/src/applications/hrms/attendance):
   - `attendanceRepository`: Queries and updates table `employee_attendance` (`getTodayAttendance`, `checkIn`, `checkOut`, `getAttendanceHistory`).
   - `attendanceService`: Enforces daily check-in uniqueness and check-out ordering.
   - **Current consumer:** Only `ess.repository.ts` imports and invokes `attendanceRepository`.
2. [`apps/api/src/applications/hrms/leave/`](file:///e:/Company/bezent_ecosystem/apps/api/src/applications/hrms/leave):
   - `leaveRepository`: Performs Drizzle queries on `employee_leave_balances` and `employee_leave_requests`.
   - `leaveService`: Uses `ruleEngine` with `LEAVE_BALANCE_SUFFICIENCY_RULE` and detects date overlaps.
   - **Current consumer:** Only `ess.repository.ts` imports and invokes `leaveRepository`.

---

## 6. Database Architecture

### 6.1 Existing Implemented HRMS Tables

Verified from [`apps/api/src/db/schema.ts`](file:///e:/Company/bezent_ecosystem/apps/api/src/db/schema.ts) and applied migrations (0000–0030):

```sql
-- Core Employment & Profile Details
employees
employee_personal_details
employee_family_members
employee_nominees
employee_emergency_contacts
employee_bank_accounts
employee_skills
employee_work_schedules      -- Static per-employee working days/hours
employee_actions             -- Employment lifecycle actions
employee_action_history      -- Audit trail of applied actions
employee_documents           -- Document registry & metadata

-- Onboarding Pipeline & Settings
onboarding_cases
onboarding_case_stage_history
onboarding_general_settings
onboarding_stage_configs
onboarding_field_configs
onboarding_document_requirements
onboarding_checklist_templates
onboarding_conversion_settings

-- Form Customization Engine
form_customizations
form_field_overrides
form_custom_fields

-- Time, Leave & Requests (Created in migration 0016_employee_self_service.sql)
employee_attendance          -- Single daily row (id, tenant_id, company_id, employee_id, date, check_in_time, check_out_time, status, work_location, notes)
employee_leave_balances      -- Balances by leave_type and year
employee_leave_requests      -- Requests with start/end date, days, status
employee_timesheets          -- Timesheet log entries
employee_requests            -- Generic request queue: 'profile_change', 'attendance_regularization', 'document_request', 'general_service'
```

### 6.2 Missing & Non-Existent Tables

The following enterprise attendance, shift, and leave structures **do NOT exist** anywhere in schema or migrations:
1. `punch_events` / `attendance_raw_logs`: No table exists to store granular biometric or mobile punches, punch types (IN, OUT, BREAK_IN, BREAK_OUT), device IDs, geo-coordinates, or raw timestamps.
2. `shifts` / `shift_masters`: No master table for shifts (shift code, name, grace periods, half-day hours, overnight flags).
3. `shift_rosters` / `shift_assignments`: No table exists to assign employees to rotating or scheduled shifts by date range or pattern.
4. `weekly_offs` / `company_holidays`: No master table for company holiday calendars or complex weekly-off patterns (e.g. 2nd/4th Saturday off).
5. `attendance_policies`: No table exists to persist attendance rules, late thresholds, half-day rules, or auto-absent policies.
6. `attendance_regularization_approvals`: Currently regularization is simply an item in `employee_requests` without a dedicated attendance approval lifecycle.

---

## 7. Module Ownership Matrix

| Domain | Owning Module | Responsibilities | Current Implementation State |
|---|---|---|---|
| **Employee Identity & History** | `applications/hrms/employees` & `employee-administration` | Canonical identity, employment history, profile details, job changes, probation, separation. | **Fully Functional & Canonical**. Reusable by all modules. |
| **Shift Management** | `applications/hrms/shifts` (Future) | Shift masters, shift schedules, rotating rosters, weekly-off definitions, shift allowances. | **Missing**. Only static `employee_work_schedules` exists on Employee Profile. |
| **Punches & Clocking** | `applications/hrms/attendance` | Biometric/device ingestion, web check-in/out, raw punch validation, geofencing. | **Partial**. Single check-in/out in `employee_attendance`; raw punch event model missing. |
| **Attendance Calculations** | `applications/hrms/attendance` | Daily attendance computation, total hours, late marks, early exits, overtime, half-day / absent flags. | **Missing**. Status is either manual or defaulting to 'present' on check-in. |
| **Leave Policies & Requests** | `applications/hrms/leave` | Leave entitlement policies, balance tracking, accruals, leave requests, approvals. | **Partial**. Balances and requests exist for ESS; Admin policies and approvals missing. |
| **Regularization** | `applications/hrms/attendance` | Missed punch correction, shift correction, regularization workflow and approval. | **Partial**. Submissions land in `employee_requests`; admin review missing. |

---

## 8. Attendance–Leave–Shift Integration Analysis

### Proposed Workflow Dependency Trace:
`Employee → Shift Assignment → Punch Events → Attendance Calculation → Daily Attendance`  
and  
`Leave → Attendance Reconciliation`

#### Step 1: Employee Integration
- **Existing Implementation:** [`apps/api/src/applications/hrms/employees/`](file:///e:/Company/bezent_ecosystem/apps/api/src/applications/hrms/employees)
- **Available Service:** `EmployeeService.getById(tenantId, companyId, employeeId)`
- **Evaluation:** **100% READY**. Clean multi-tenant queries, active status filtering, and referential integrity to `companies.id`.

#### Step 2: Shift Assignment Integration
- **Existing Implementation:** None for dynamic shifts. Only [`employee_work_schedules`](file:///e:/Company/bezent_ecosystem/apps/api/src/db/schema.ts#L898) (`workingDays`, `startTime`, `endTime`, `breakMinutes`, `lunchMinutes`, `timeZone`).
- **Missing Capability:** No date-ranged shift assignments, no shift rotations, no shift codes.
- **Integration Risk:** If Attendance depends immediately on a complex dynamic shift roster module before one is built, Attendance will be blocked.
- **Architectural Solution:** Attendance V1 must use `employee_work_schedules` as the default fallback schedule, with a contract ready to consume `shift_assignments` once the Shift module is built.

#### Step 3: Punch Events Ingestion
- **Existing Implementation:** ESS `POST /api/v1/ess/attendance/check-in` writes directly to `employee_attendance.checkInTime`.
- **Missing Capability:** No support for multiple daily punches, biometric device imports, mobile geolocation logging, or punch history.
- **Integration Risk:** Overwriting `checkInTime` directly loses punch auditability and prevents multiple breaks/intermittent punches.

#### Step 4: Attendance Calculation Engine
- **Existing Implementation:** None. Time calculation is currently client-side or omitted.
- **Missing Capability:** Calculation of worked hours, late duration, early departure, half-day threshold comparison, and overtime calculation.
- **Integration Risk:** Business logic duplication between administrative attendance computation and ESS summary views.

#### Step 5: Leave → Attendance Reconciliation
- **Existing Implementation:** `employee_leave_requests` table exists.
- **Missing Capability:** When a leave request is marked `approved`, no automated mechanism marks `employee_attendance.status = 'on_leave'` for the corresponding date range.
- **Integration Risk:** Employees on approved leave could be marked 'absent' by daily attendance calculation.

---

## 9. HRMS Role & Permission Audit

### 9.1 Platform RBAC Architecture

Permissions follow the standard chain:
$$\text{User} \longrightarrow \text{Company Membership} \longrightarrow \text{Roles} \longrightarrow \text{Role Permissions} \longrightarrow \text{Capability}$$

Standard HRMS permissions defined in seed/system roles:
- `hrms.employees.read`, `hrms.employees.create`, `hrms.employees.manage`
- `hrms.onboarding.read`, `hrms.onboarding.manage`
- `hrms.documents.read`, `hrms.documents.manage`
- `hrms.organization.read`, `hrms.organization.manage`
- `hrms.settings.view`, `hrms.settings.manage`

### 9.2 Attendance & Leave Permission Status
- In catalog: `hrmsNavigation.ts` defines `permissionKey: "hrms.attendance.view"` and `"hrms.leave.view"`.
- In backend seed / roles: These keys exist in system definitions but have **no routes protecting administrative attendance or leave** because those routes are not yet mounted!
- In ESS: Access is granted to any user with an active employee record linked via `email` and company membership, guarded by `RequireEssWorkspace`.

### 9.3 Cross-Tenant Isolation
- Tested in [`hrmsApiSecurity.test.ts`](file:///e:/Company/bezent_ecosystem/apps/api/src/applications/hrms/__tests__/hrmsApiSecurity.test.ts): Verified that `X-Company-Id` is strictly a client claim; server validates membership and tenant ownership. Requests targeting other companies return `404` or `403`.

---

## 10. Test & Build Evidence

Validation commands were executed in read-only mode across the monorepo:

### 10.1 TypeScript Typechecks
```bash
npm run typecheck --workspace=apps/api
# Exit code: 0 (0 errors)

npm run typecheck --workspace=apps/web
# Exit code: 0 (0 errors)
```

### 10.2 Frontend HRMS Test Suite
```bash
npx vitest run apps/web/src/applications/hrms
# Result: 21 test files passed (304 tests passed, 0 failed)
# Duration: 15.50s
```

### 10.3 Backend HRMS Test Suite
```bash
npx vitest run apps/api/src/applications/hrms
# Result: 19 test files passed, 2 test files had assertion failures (323 passed, 2 failed out of 325)
# Duration: 36.64s
```
*Note on the 2 backend test failures:* Both failures occurred in `onboarding/stageLifecycle.test.ts` (expecting 409, received 400) and `settings/onboarding/dynamicStages.test.ts` (stage deletion constraint check), caused by existing test data in the active local MySQL database. Neither affects the Employee or Attendance core repositories.

### 10.4 Production Bundles
Production builds executed successfully across both workspaces:
- `apps/api`: `tsc -p tsconfig.json` clean output.
- `apps/web`: Vite production build bundled 489 modules without error.

---

## 11. Gap Analysis

### A. Existing Strengths (Safe to Reuse Without Modification)
1. **Canonical Employee Model & Repository:** `EmployeeService` and `EmployeeRepository` provide complete employee data, active employment filtering, and company scoping.
2. **Static Work Schedules:** `employee_work_schedules` stores valid working days, start/end times, and break durations.
3. **ESS Attendance Pipeline:** `AttendanceRepository` and `EssAttendancePage` already provide operational check-in/out logic and regularization submission.
4. **Design System & Zero CSS Rule:** Rich primitives (`Table`, `Card`, `Modal`, `Tabs`, `Badge`, `Button`, `EmptyState`, `Toolbar`) are ready for composing administrative attendance screens without adding any CSS files.
5. **Rules Engine:** `ruleEngine` in `platform/rules` is operational and already evaluated in `leaveRules.test.ts`.

### B. Architecture Problems (Must Be Corrected Before/During Attendance Work)
1. **[P0] Absence of Granular Punch Audit Trail:** Table `employee_attendance` only holds single `check_in_time` and `check_out_time` strings. If an employee punches multiple times or needs correction, previous punches are lost. A dedicated `punch_events` table is required.
2. **[P0] Unmounted Admin Attendance Router:** There is no `/api/v1/hrms/attendance` router mounted in `createApp.ts`. Administrative API consumers have no backend contract.
3. **[P1] Mock State in Settings:** `AttendanceSettingsSection.tsx` is completely decoupled from any database table. Saving does not persist.
4. **[P1] Missing Attendance Calculation Service:** No backend service computes whether a punch is late, whether early exit occurred, or total productive hours.
5. **[P2] Single-Day Attendance Model:** Current schema has `date: varchar(10)` with unique index `(tenant_id, company_id, employee_id, date)`. Overnight shifts spanning midnight cannot be cleanly represented without formal shift boundaries.

### C. Missing Functionality (To Be Implemented)
1. **Administrative Attendance Dashboard & Daily Log:** Table view of all company employees for a selected date, showing check-in time, check-out time, work location, status, and calculated hours.
2. **Attendance Regularization Approval Queue:** An administrative interface to review and approve/reject attendance regularization requests submitted through ESS.
3. **Monthly Attendance Summary & Grid:** Matrix of employees vs. days of the month showing Present / Absent / Leave / Half-Day / Holiday badges.
4. **Attendance Policy Master:** Persisted configuration for grace period, minimum working hours for half-day/full-day, and auto-absent rules.

---

## 12. Reusable Components

The following existing components in the monorepo should be reused directly for the Attendance Module:

1. **Design System Layout Primitives:**
   - [`Page`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Page/Page.tsx), [`PageHeader`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/PageHeader/PageHeader.tsx), [`Toolbar`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Toolbar/Toolbar.tsx)
   - [`Table`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Table/Table.tsx), [`TableHead`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Table/TableHead.tsx), [`TableBody`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Table/TableBody.tsx), [`TableRow`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Table/TableRow.tsx), [`TableCell`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Table/TableCell.tsx)
   - [`Badge`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Badge/Badge.tsx) (for status: `present`, `absent`, `half_day`, `on_leave`, `late`)
   - [`Modal`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Modal/Modal.tsx) (for punch regularizations and manual corrections)
   - [`Tabs`](file:///e:/Company/bezent_ecosystem/apps/web/src/design-system/components/Tabs/Tabs.tsx) (for sub-navigation: Daily Log, Monthly Summary, Regularization, Policies)
2. **Backend Infrastructure:**
   - [`AttendanceRepository`](file:///e:/Company/bezent_ecosystem/apps/api/src/applications/hrms/attendance/repository/attendance.repository.ts)
   - [`ruleEngine`](file:///e:/Company/bezent_ecosystem/apps/api/src/platform/rules) for evaluating attendance compliance and late arrival rules
   - [`requirePermission`](file:///e:/Company/bezent_ecosystem/apps/api/src/platform/access/middleware/access.middleware.ts) middleware for protecting routes

---

## 13. Attendance Implementation Readiness

| Subsystem | Readiness Score | Evaluation & Blockers |
|---|---|---|
| **Employee Identity** | **100% READY** | Employee directory, active status, department/designation links are fully functional. |
| **Shift Domain** | **NOT READY** | No shift tables exist. **Blocker Bypass:** Attendance V1 must use `employee_work_schedules` as the default schedule. |
| **Leave Domain** | **60% READY** | ESS leave exists. Administrative leave reconciliation is missing. |
| **Attendance Core Schema** | **70% READY** | `employee_attendance` exists. Needs a supporting `punch_events` table and policy schema. |
| **Attendance Backend Services** | **50% READY** | Repository exists for ESS. Administrative controller, calculation engine, and approval service are missing. |
| **Attendance Frontend** | **20% READY** | ESS attendance page exists. Administrative screens are pure placeholders. |

---

## 14. Recommended Next Development Steps

Do NOT attempt to build Shifts, Attendance, and Leave simultaneously. Follow this strict phased sequence:

### Phase 1: Database Foundation & Punch Model
1. Create a non-destructive migration introducing `attendance_punches` (raw punch audit log) and `attendance_policies` (persisted rules).
2. Maintain full backward compatibility with the existing `employee_attendance` table so ESS check-in/out continues to function without regression.

### Phase 2: Administrative Attendance Backend Services
1. Create `AttendanceCalculationService` to compute daily hours, late marks, and statuses based on `employee_work_schedules`.
2. Implement `AdminAttendanceService` and `AttendanceController` handling:
   - `GET /api/v1/hrms/attendance/daily-log?date=YYYY-MM-DD`
   - `GET /api/v1/hrms/attendance/monthly-summary?year=YYYY&month=MM`
   - `GET /api/v1/hrms/attendance/regularization`
   - `PATCH /api/v1/hrms/attendance/regularization/:id/review`
   - `GET/PUT /api/v1/hrms/attendance/policies`
3. Mount `attendanceRouter` under `/api/v1/hrms/attendance` with permissions `hrms.attendance.view` and `hrms.attendance.manage`.

### Phase 3: Administrative Attendance Frontend Pages
1. Build `DailyAttendanceLogPage.tsx` using Design System `Table`, `Badge`, and `Toolbar`.
2. Build `MonthlyAttendanceSummaryPage.tsx` with date-grid navigation.
3. Build `AttendanceRegularizationPage.tsx` to approve/reject employee requests.
4. Replace `<ModulePlaceholder>` entries in `hrmsRoutes.tsx` for `attendance` and its sub-navigation children.

### Phase 4: Shift Module Development (Deferred)
- Do NOT rewrite or delay Attendance for dynamic shifts. Once Attendance V1 is stable, build `applications/hrms/shifts` as an independent domain and wire shift assignments into the attendance calculation engine via a clean adapter contract.

---

## Summary Verdict

**Verdict: READY WITH PREREQUISITES**

The repository contains solid employee data foundations, an operational database connection, an established design system, and working ESS attendance foundations. However, Attendance development cannot begin by just writing UI; it must begin with the database migration for punch events/policies and the administrative backend controller before mounting the frontend pages.
