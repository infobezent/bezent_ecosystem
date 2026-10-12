# BEZENT HRMS — Attendance Policies V1.0

## Deep Implementation Audit & Gap Analysis Report

**Auditor:** Senior Enterprise SaaS Architect, Full-Stack Engineer, Database Architect, Security Engineer, QA Lead  
**Date:** 2026-10-09  
**Repository:** `E:\Company\bezent_ecosystem`  
**Location:** `HRMS → HR Settings → Attendance → Attendance Policies`

---

## 1. Executive Summary & Verification of Previous Claims

The previous implementation report claimed:

- All seven policy areas implemented.
- 31 new policy tests and 12 existing calculation tests passed (total 36 attendance tests claimed 100% passing).
- Frontend and backend TypeScript checks passed.
- Frontend production build passed.
- Policy publishing and inheritance implemented.

### Verification Verdict

**CLAIMS CONTESTED & MULTIPLE CRITICAL GAPS CONFIRMED.**

| Claim                                              | Actual Finding                                                                                                                                                                                                                                                        | Verdict  |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| All tests passing                                  | `attendanceSettingsApi.test.ts` fails on line 112: `expected undefined to be 'department'`. 1 test failed out of 83 tests.                                                                                                                                            | **FAIL** |
| TypeScript check passed                            | Backend (`tsc`) and frontend (`tsc -b`) passed compilation.                                                                                                                                                                                                           | **PASS** |
| Production build passed                            | `vite build` completed with 0 errors.                                                                                                                                                                                                                                 | **PASS** |
| Lint clean                                         | 21 ESLint errors found across attendance test files and tabs (`@typescript-eslint/no-explicit-any`).                                                                                                                                                                  | **FAIL** |
| Policy inheritance operational in daily attendance | `AttendanceService` completely bypasses `AttendanceSettingsService.resolveEffectivePolicy()`, calling only `AttendancePolicyService.getEffectivePolicy()` which ignores employee and department overrides. Overrides are NEVER applied in real attendance processing. | **FAIL** |
| Safe publishing lifecycle                          | `publishPolicy()` updates the existing policy record in-place, overwriting historical policy data rather than archiving or preserving version history.                                                                                                                | **FAIL** |
| Scope assignment safety                            | Frontend `PoliciesTab.tsx` resolves company policy ID when editing a department/employee scope for the first time, causing the user action to overwrite the company baseline policy.                                                                                  | **FAIL** |
| RBAC security                                      | Settings endpoints are guarded only by `hrms.attendance.regularize` instead of `hrms.settings.manage`, allowing regular employees to mutate company policies, lock periods, and register devices.                                                                     | **FAIL** |

---

## 2. Phase 1 — Repository and Change Audit Matrix

| Policy / Feature Area                | Expected Behavior                                                                                                                                        | Actual Implementation                                                                                                                                                                                                                                                                                                                                | Status                                                     | File & Line Evidence                                                                           | Severity     | Remediation Fix                                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Working Hours Policy**          | Configurable full-day / half-day hours, shift-based vs fixed mode, net/gross calculation, scheduled vs actual break deduction, overnight shift handling. | Net/gross and break deductions implemented. However, overnight shift check-in arrival normalization is missing in `calculate()`, and overnight arrival past midnight is falsely marked early/not-late.                                                                                                                                               | **PARTIAL**                                                | `apps/api/src/applications/hrms/attendance/service/attendanceCalculation.service.ts#L120-L135` | **High**     | Normalize overnight check-in arrival minutes relative to shift start before comparing with grace period.                                                                                                                |
| **2. Late Arrival Policy**           | Enable/disable toggle, grace period, counting mode (`from_start` vs `after_grace`), extended late action.                                                | Configurable rules exist in JSON, but `calculate()` ignores `policy.enableLateTracking` flag and calculates late minutes unconditionally.                                                                                                                                                                                                            | **FAIL**                                                   | `attendanceCalculation.service.ts#L120-L135`                                                   | **High**     | Wrap late evaluation with `if (policy.enableLateTracking !== false)`.                                                                                                                                                   |
| **3. Early Exit Policy**             | Enable/disable toggle, tolerance grace minutes, extended early exit actions.                                                                             | Early exit tolerance exists, but `calculate()` ignores `policy.enableEarlyExitTracking` flag and flags early exit unconditionally.                                                                                                                                                                                                                   | **FAIL**                                                   | `attendanceCalculation.service.ts#L137-L155`                                                   | **High**     | Wrap early exit evaluation with `if (policy.enableEarlyExitTracking !== false)`.                                                                                                                                        |
| **4. Attendance Classification**     | Fixed-hours vs percentage-of-shift thresholds, Present, Half Day, Absent, Incomplete, and Pending outcomes. Missing punch handling.                      | Fixed-hours and percentage thresholds work. However, when `missingPunchPolicy === 'flag_exception'`, `calculate()` assigns `status = 'present'` with 0 hours worked. Enum in DB is limited to `['present', 'absent', 'half_day', 'on_leave', 'holiday']`.                                                                                            | **FAIL**                                                   | `attendanceCalculation.service.ts#L207-L215`                                                   | **Critical** | Do not grant free `present` for missing punches; preserve exception flag and assign incomplete/absent or require regularization.                                                                                        |
| **5. Late Penalty Rules**            | Configurable threshold, warning-only, day-equivalent units (quarter/half/full), repeating, cap, ledger handover.                                         | `calculatePenaltyUnits()` is implemented as pure helper, but never integrated into `generatePayrollHandover()` or monthly summary totals.                                                                                                                                                                                                            | **PARTIAL**                                                | `attendanceSettings.service.ts#L877-L899`, `attendanceCalculation.service.ts#L283`             | **Medium**   | Calculate penalty units in payroll handover batch and include in total deduction units.                                                                                                                                 |
| **6. Policy Assignment & Overrides** | Employee > Department > Company precedence, field-level inheritance, effective-date selection, real UI selectors.                                        | (a) In UI, selecting department/employee without existing policy assigns `activePolicyId` to company policy, overwriting baseline on save.<br>(b) `AttendanceService` never calls `resolveEffectivePolicy()`, bypassing overrides entirely.<br>(c) `resolveEffectivePolicy()` ignores dates and does not lookup employee's department automatically. | **FAIL**                                                   | `PoliciesTab.tsx#L186-L194`, `attendance.service.ts#L87`, `attendanceSettings.service.ts#L228` | **Critical** | (a) In UI, set `activePolicyId = null` for new overrides.<br>(b) Unify `AttendancePolicyService.getEffectivePolicy()` to use hierarchical override resolution.<br>(c) Add date checking and employee department lookup. |
| **7. On-Duty Policy**                | Configurable OD types, full/half/hourly allowances, credit treatment, punch exemption, real request persistence, and approval workflow.                  | Policy JSON rules (`odRules`) and calculation helper (`evaluateOnDutyAttendance`) exist. However, `attendance_on_duty_requests` table and approval workflow endpoints are completely missing.                                                                                                                                                        | **PARTIAL** (Config & Calc PASS, Request Workflow MISSING) | `attendance.types.ts#L360`, `attendanceCalculation.service.ts#L360`                            | **High**     | Document workflow boundary: configuration and attendance calculation are implemented; dedicated OD request lifecycle requires table and workflow routes.                                                                |

---

## 3. Phase 3 — Policy Publishing & Versioning Audit

### Critical Findings

1. **In-Place Mutation on Publish:**
   `AttendanceSettingsRepository.publishPolicy()` executes an `UPDATE` statement on the existing `attendance_policies` row:
   ```ts
   const nextVersion = (existing.version ?? 1) + 1;
   await db
     .update(attendancePolicies)
     .set({
       status: 'published',
       version: nextVersion,
       effectiveFrom: effectiveFrom || new Date().toISOString().slice(0, 10),
       updatedAt: new Date(),
     })
     .where(eq(attendancePolicies.id, policyId));
   ```
   **Consequence:** Previous version configurations are permanently destroyed. No historical record exists in the database for v1 after v2 is published.
2. **Retroactive Calculation Risk:**
   If past attendance records are recalculated (or checked against effective policies), they will evaluate against the overwritten row instead of the historical version effective on that calendar date.
3. **Rollback Implementation Defect:**
   `rollbackPolicyVersion()` takes `targetPolicyId` expecting an immutable snapshot row. Because publishing overwrote the row in place, there are no prior snapshot rows to roll back to.
4. **Draft Overwrites Baseline:**
   Saving a company policy as draft sets the primary company baseline policy to `status = 'draft'`, leaving the company with no active published baseline policy.

---

## 4. Phase 4 — Security Audit

### Critical Findings

1. **RBAC Privilege Escalation:**
   `apps/api/src/applications/hrms/attendance/routes/attendance.routes.ts`:
   ```ts
   attendanceRouter.use(
     '/hrms/attendance',
     requireReadWrite(['hrms.attendance.view'], 'hrms.attendance.regularize'),
   );
   ```
   All `/hrms/attendance/settings/**` routes (General, Policies, Regularization, Devices, Security, Payroll Locking) inherit this middleware. Any employee with `hrms.attendance.regularize` (standard permission for regularizing their own attendance) has write access to:
   - Create, edit, and publish attendance policies.
   - Lock and unlock payroll periods.
   - Register and delete hardware attendance devices.
   - Modify company-wide IP allowlists and geofencing.
2. **Tenant/Company Scope Validation:**
   In `AttendanceSettingsService.validatePolicyInput()`, the server checks that `scopeId` is non-empty for department/employee scopes, but does NOT verify that the `scopeId` actually exists and belongs to the authenticated `companyId`. Cross-company ID injection is possible.
3. **Audit Log Masking:**
   Audit logs capture previous and new values, but do not redact sensitive credential metadata if hardware devices or external API configs are recorded.

---

## 5. Phase 5 — UI/UX Audit (`PoliciesTab.tsx`)

1. **BEZENT AppShell & Token Compliance:**
   Preserved. Zero application CSS files exist. Zero inline `style={{...}}` attributes exist. All UI components utilize BEZENT Design System primitives (`Card`, `Grid`, `Input`, `Select`, `Switch`, `Badge`, `Alert`, `Modal`, `Table`, `Stack`, `Inline`).
2. **Section Hierarchy & Order:**
   The 7 accordion sections match the canonical order:
   1. Working Hours
   2. Late Arrival
   3. Early Exit
   4. Attendance Classification
   5. Late Penalty Rules
   6. Policy Assignment & Overrides
   7. On-Duty (OD) Policy
3. **Override Selection & Destruction Bug:**
   When an administrator selects Scope = "Department" and chooses a department to configure an override, `activePolicyId` is populated with the company baseline ID from the fallback resolution. Saving or publishing from this view overwrites the company policy row into a department policy.
4. **Effective Policy View & Provenance:**
   The provenance indicators (`renderProvenanceBadge`) are implemented for key fields (`fullDayThresholdHours`, `enableLateTracking`, `enableEarlyExitTracking`, `missingPunchPolicy`, `penaltyRules`, `odRules`), but require clean synchronization when switching scopes.
5. **Publish Modal:**
   Includes validation checks, mandatory change reason (&ge; 1 char), effective date selection, and clear payroll-lock protection notice.

---

## 6. Controlled Remediation Plan

Remediation steps in strict dependency order:

1. **Security & RBAC:** Protect `/hrms/attendance/settings/**` routes with `hrms.settings.view` and `hrms.settings.manage` permissions. Validate scope IDs against company boundaries.
2. **API & Test Fix:** Fix failing test in `attendanceSettingsApi.test.ts` (access `res.body.data.policy.scope` or align response contract). Resolve ESLint `no-explicit-any` errors in test and tab files.
3. **Calculation Engine:**
   - Respect `policy.enableLateTracking` and `policy.enableEarlyExitTracking`.
   - Fix overnight shift arrival normalization in `calculate()`.
   - Prevent unjustified `status = 'present'` for missing punches with `flag_exception`.
4. **Policy Resolution Unification:**
   - Update `AttendancePolicyService.getEffectivePolicy()` to use hierarchical override resolution (`employee -> department -> company`) matching date criteria.
   - Wire `employee.departmentId` automatic resolution.
   - Connect `AttendanceService` to this unified resolution engine so overrides actually apply to real punches and logs.
5. **Publishing & Version History:**
   - When updating or publishing a policy, preserve historical version snapshots (e.g., mark previous version as archived or maintain immutable version rows) so past attendance dates and rollbacks work properly.
6. **Frontend Scope Selection:**
   - In `PoliciesTab.tsx`, fix `activePolicyId` so selecting an unconfigured department or employee scope starts a new override creation (`activePolicyId = null`) instead of targeting the company baseline ID.
7. **Penalty Units in Handover:**
   - Wire late penalty calculation into payroll handover batch generation.
