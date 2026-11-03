# HRMS Settings Audit: Workforce, Attendance, Leave

Date: 31 Oct 2026
Scope: `apps/api` and `apps/web` code behind HR Settings → Workforce, Attendance and Leave, plus the engines that are supposed to read those settings (employee creation, attendance calculation, leave application, accrual, background jobs) and the permission catalog.

Severity scale: **Critical** (exploitable or corrupts payroll-relevant data today), **High** (wrong results or silent data loss under normal use), **Medium** (incorrect under edge cases, or a setting that misleads admins), **Low** (hygiene, consistency).

## How this was reviewed

Backend: every settings controller, route, service, repository, validation and type file for the three modules, migrations 0031–0055, `db/schema.ts`, `createApp.ts`, `main.ts`, `accessCatalog.ts`, `access.middleware.ts`, and the consumers (`employee.service.ts`, `attendance.service.ts`, `shiftSchedule.provider.ts`, `attendanceRegularizationEligibility.service.ts`, `attendanceSecurity.service.ts`, `leave.service.ts`, `leave.repository.ts`, `leaveAccrual.service.ts`, `leaveApprovals.service.ts`).

Frontend: `SettingsPage.tsx`, `settingsCenter.ts`, `WorkforceSettingsSection.tsx`, `AttendanceSettingsSection.tsx`, and all Leave settings tabs, drawers and API clients.

Coverage gap: files eight folders below the repo root could not be copied out of the linked folder, which excludes `settings/attendance/tabs/*`, `settings/workforce/tabs/*`, `settings/workforce/api/*` and `settings/leave/api/*`. Attendance tab behaviour was checked against the compiled bundle in `apps/web/dist` (built before the latest Workforce changes, so Workforce tabs are absent from it). Workforce UI findings are therefore limited to the section shell and the API it calls.

---

## 1. Snapshot

|                      | Workforce                            | Attendance                                                                                                                                                                                                                                   | Leave                                                                                                                                          |
| -------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage              | 6 dedicated tables (0055)            | Dedicated tables for general, regularization, security, payroll, devices, periods; **shifts, roster, alert, visibility, manual-entry and day-boundary config live inside one JSON column** (`attendance_general_settings.alert_preferences`) | Dedicated tables per concern (general, types, policies, entitlements, holidays, workflows, restrictions, accrual)                              |
| Versioning           | None; in-place updates               | Policies: partial (draft/published/archived, but published rows are also editable in place). Everything else: in-place                                                                                                                       | General settings: immutable versions with optimistic concurrency. Restrictions: versioned. Types, policies, accrual rules, workflows: in-place |
| Audit trail          | **None**                             | Own table `attendance_settings_audit_logs`                                                                                                                                                                                                   | Platform `auditService`                                                                                                                        |
| GET has side effects | Yes (seeds rows on read)             | Yes (seeds rows, and policy resolution inserts policies)                                                                                                                                                                                     | No (explicitly read-only)                                                                                                                      |
| Validation style     | Hand-written per field               | Hand-written, partial                                                                                                                                                                                                                        | Hand-written, thorough                                                                                                                         |
| Read by an engine    | Only ID numbering and auto-provision | Partly (see §5)                                                                                                                                                                                                                              | Mostly (see §5)                                                                                                                                |

Leave is the most mature of the three and is a good template for the other two. Workforce is mostly configuration with no engine behind it yet. Attendance has the widest surface and the most correctness risk.

---

## 2. Cross-cutting findings

### X1 · Critical · Line managers can rewrite the company attendance policy

`attendance.routes.ts:479` keeps the legacy `PUT /hrms/attendance/policies`. The only guard is the router-wide `requireReadWrite(['hrms.attendance.view'], 'hrms.attendance.regularize')`, and the system `manager` role carries `hrms.attendance.regularize` (`accessCatalog.ts`, `role_sys_manager`). The handler (`attendance.controller.ts:590` → `AttendancePolicyService.updatePolicy`) writes grace period, half/full-day thresholds, missing-punch policy and effective date straight onto the resolved company policy row: no validation, no audit log, no versioning. Any manager can change how every employee's day is classified.
Fix: delete the legacy PUT (the UI already redirects to Settings), or guard it with `hrms.settings.manage` and route it through `AttendanceSettingsService.updatePolicy`.

### X2 · High · Settings reads are open to anyone with attendance view

`/hrms/attendance/settings/*` reads accept `hrms.attendance.view`, which every manager has. That exposes IP allowlists, geofence coordinates, device IPs/ports, payroll periods and the full settings audit log (previous values, client IPs, user agents).
Fix: settings reads should require `hrms.settings.view`; expose only what managers need (e.g. effective policy) through operational endpoints.

### X3 · High · Over-broad write permissions in Workforce

`workforceSettings.routes.ts` accepts `hrms.workforce.manage` or `organization.designations.manage` for writes. The catalog describes `hrms.workforce.manage` as "Edit designations, job levels and grades", yet it also unlocks ID numbering, probation, notice periods and clearance templates. Leave already has dedicated `hrms.leave.settings_*` permissions; Workforce and Attendance should get the same (`hrms.workforce.settings_manage`, `hrms.attendance.settings_manage`).

### X4 · High · Two incompatible "employment type" models

`employees.employment_type` is a hard-coded enum (`full_time | part_time | contract | intern`, `schema.ts:368`). Workforce Settings manages a separate table `workforce_employment_types` with codes `FT/PT/CT/IN/PB`. Nothing links them: employee forms, onboarding, leave policy scope (`leavePolicies.service.ts:69`) and overtime all use the enum. Admin-created employment types appear in Settings but can never be assigned to anyone, and "PB – Probationary" conflates a probation status with an employment type.
Fix: make `employees.employment_type_id` a FK to `workforce_employment_types`, migrate enum values to seeded codes, and drop `PB`.

### X5 · High · Public holidays are ignored by attendance

Holiday calendars live under Leave Settings and are used by leave day-counting only. The attendance engine decides "holiday" purely from the shift's working days (`attendanceCalculation.service.ts` ~L68, `attendance.repository.ts:1224`). A configured public holiday on a weekday is marked **absent** in attendance and payroll handover. Weekly offs are also labelled `holiday`, so the two cannot be told apart in reports.
Fix: move holiday calendars to a shared HRMS calendar service; attendance should resolve the employee's calendar by location and emit distinct `weekly_off` / `holiday` statuses.

### X6 · Medium · "Write on read" seeding races

Workforce (`getGeneralSettings`, probation, lifecycle, offboarding, employment types, clearance templates) and Attendance (general, regularization, security, payroll, company policy) insert default rows inside GET handlers using check-then-insert with no transaction. Two concurrent first loads hit the `UNIQUE(company_id)` index and one request returns 500. Leave avoids this by returning in-memory defaults until first publish; copy that approach.

### X7 · Medium · Inconsistent change governance across the three modules

Leave general settings require a change reason, keep immutable versions and use `expectedCurrentVersionNumber`. Attendance asks for a reason only on policy publish and tracking-date change. Workforce asks for nothing and logs nothing. Two admins editing the same Workforce or Attendance screen silently overwrite each other (last write wins). Standardise on the Leave pattern for anything payroll-relevant.

### X8 · Medium · In-process background jobs on every API instance

`main.ts` starts auto-lock, comp-off expiry, missing-punch, leave policy lifecycle and leave balance/SLA sweeps with `setInterval` in the web process, each also running immediately on boot. With more than one API instance every job runs N times concurrently. The leave jobs are described as idempotent, but attendance auto-lock and comp-off expiry are not guarded by a distributed lock. Shutdown only stops two of the six timers. Move these to `backgroundWorker.runner` with a DB lease.

### X9 · Low · Stale docs and dead code

`apps/api/src/applications/hrms/README.md` still lists Attendance and Leave as "planned". `settings/README.md` describes an `administration/` workspace that `SettingsPage.tsx` no longer renders (`AdministrationSettingsSection` is orphaned). `settingsCenter.ts` still exports unused mock types (`LeaveTypeConfig`, `AttendanceTypeConfig`, `EmployeeCategoryConfig`, `CompanyPolicy`, …).

---

## 3. Workforce Settings

Tabs: General & Auto-Numbering, Organization & Hierarchy, Registration & Forms, Onboarding Workflows, Probation & Confirmation, Transfers & Lifecycle, Offboarding & Clearance. The middle three are thin wrappers around existing org/forms/onboarding screens.

### W1 · Critical · Duplicate employee IDs under concurrent creation

`workforceSettings.repository.ts:136` (`getNextSequenceAndIncrement`) reads `current_counter`, computes `+1` in JS, then writes it back, with no transaction or row lock. Two simultaneous hires (bulk import, two HR users) receive the same number. `employee.service.ts` then rejects the second with `EMPLOYEE_NUMBER_EXISTS` at best, or both succeed if they race past the duplicate check.
Fix: `UPDATE … SET current_counter = LAST_INSERT_ID(GREATEST(current_counter + 1, starting_number))` then `SELECT LAST_INSERT_ID()`, or `SELECT … FOR UPDATE` inside a transaction.

### W2 · High · Numbering failures fall back to a different format silently

`employee.service.ts:93` wraps the reservation in `catch {}` and falls back to scanning existing numbers with a hard-coded `EMP-` and 4-digit padding. Any DB hiccup produces IDs that ignore the configured prefix/suffix/length and are invisible to the counter, so the next normal reservation can collide.
Fix: let the error surface; never generate IDs outside the sequence.

### W3 · High · Most numbering options are stored but not enforced

| Setting                                              | Enforced?                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `generationMode = manual`                            | No. Numbers are still auto-generated when the field is empty                    |
| `allowManualOverride = false`                        | No. A supplied `employeeNumber` is always accepted                              |
| `resetFrequency` (calendar/financial year)           | No. Counter never resets                                                        |
| `preventIdReuse`                                     | No logic exists                                                                 |
| `activationTiming` (instant / joining date / manual) | No logic exists                                                                 |
| `autoProvisionUser`                                  | Yes (`employee.service.ts:242`), but failures are swallowed with `console.warn` |

The counter is also consumed before validation, so every rejected create (duplicate email, bad department) burns a number.

### W4 · High · Probation, lifecycle, offboarding and clearance settings have no consumer

A repo-wide search finds no reader of `workforce_probation_policies`, `workforce_lifecycle_policies`, `workforce_offboarding_policies` or `workforce_clearance_checklist_templates` outside the settings module. Probation reminders, auto-confirm, extension limits, notice periods, buyout, withdrawal windows, auto-reassign of approvers and clearance checklists do nothing today. The UI presents them as live policy. Either label these tabs "Preview – not yet enforced" or hide them until the probation/offboarding engines exist.

### W5 · Medium · Deleting defaults resurrects them

`listEmploymentTypes` (`:195`) and `listClearanceTemplates` re-seed defaults whenever the table is empty. An admin who deletes all clearance items, or all employment types, gets the defaults back on next load. Employment-type delete is also a hard delete with no reference check, and `deleteEmploymentType` returns `affectedRows ? true : true` (`:383`), so callers can never detect a failed delete.

### W6 · Medium · No cross-field rules

Validation accepts `probationNoticeDays > confirmedNoticeDays > leadershipNoticeDays` in any order, `reminderLeadDays > defaultProbationDays`, and `maxExtensionDays` with `maxExtensionsAllowed = 0`. The clearance department list is a fixed enum (`it | admin | finance | hr`) instead of the company's departments.

### W7 · Low · Implementation drift from repo conventions

The README says validation is Zod at the boundary; this module hand-rolls ~560 lines of field checks. The bundle endpoint awaits six queries sequentially instead of `Promise.all`. `WorkforceSettingsSection` calls `useSearchParams()` conditionally (`inRouter ? useSearchParams() : …`), which breaks the rules of hooks.

---

## 4. Attendance Settings

Tabs: General, Attendance Policies, Shifts & Rosters, Regularization, Overtime & Comp-Off, Capture & Devices, Location & Security, Payroll & Locking, Audit & History.

### A1 · Critical · Policy resolution inserts a new policy on every historical recalculation

`attendanceSettings.service.ts:368`: when no published company policy is effective on the target date, `resolveEffectivePolicy` creates one, with `effectiveFrom` defaulting to **today**. Recalculating any date before the first policy's effective date therefore finds nothing, inserts another default policy (still effective today, so still not visible for that past date), and repeats on the next call. `attendance.service.ts:578` calls this inside a per-employee loop, so one recalculation of a past day can insert one policy row per employee. If the insert throws, `attendancePolicy.service.ts:57` swallows it and silently applies a hard-coded fallback policy.
Fix: never write during resolution. Seed one company policy at company provisioning with `effectiveFrom = trackingStartDate`, and fail loudly if none is found.

### A2 · High · Republishing with a future date leaves a gap with no policy

`publishPolicy` on an already-published policy (`attendanceSettings.repository.ts:614`) archives the current row immediately and inserts the new version with the requested `effectiveFrom`. If that date is in the future, nothing is effective in between, which then triggers A1. Archive and insert are also two statements outside a transaction.
Fix: keep the old version `published` until the new one's effective date; resolution already orders by `effectiveFrom DESC`.

### A3 · High · Published policies are editable in place

`PUT /settings/policies/:id` (`repository.updatePolicy`) mutates a published row directly, including `scope`, `scopeId`, `effectiveFrom` and thresholds. This rewrites the rules behind already-finalised days and payroll handovers, and leaves "publish" as a clone of the already-edited row. On update the scope target is not re-validated (the check runs only when `isCreate`), and half/full-day validation compares input fields only, not the merged result, so setting only `halfDayThresholdHours = 9` against a stored full day of 8 passes.
Fix: allow edits only on drafts; publishing creates the new version.

### A4 · High · Shift templates are stored in a JSON blob and do not drive calculation

Shift templates, auto-allocation and swap rules are kept in `alert_preferences.shiftRosterConfig` (`attendanceSettings.repository.ts:1561–1769`).

- Calculation uses `employee_work_schedules`, a per-employee copy of start/end times with no FK to a template (`shiftSchedule.provider.ts`). Editing a template in Settings changes nobody's schedule.
- "Assigned employees" counts match `workSchedule` strings against template name/code/id, so renaming a template zeroes its count.
- `enableAutoShiftAllocation` is never passed by any caller, so the auto-allocation toggle (default on), matching window and fallback shift have no effect. If it were wired, it would override an employee's assigned schedule with whichever template starts nearest the punch, which removes late marks.
- Shift-swap rules are configurable but there is no swap feature.
- Every create/update/delete rewrites the whole JSON column. A concurrent General-settings save (which also rewrites `alert_preferences`) loses shift edits, and a client-supplied `alertPreferences.shiftRosterConfig` in a General save (`:287` spreads it unfiltered) overwrites all shifts.
- Deleting the last template brings back `DEFAULT_COMPANY_SHIFTS`; deleting a template with assigned employees is allowed; shift codes are not unique.
- Leave day-counting uses `roster.shifts[0]` as the company default (`leave.repository.ts:283`) while attendance falls back to `DEFAULT_WORK_SCHEDULE`, so an unscheduled employee can have different working days in Leave and Attendance.

Fix: `attendance_shifts` table plus `employee_shift_assignments (employee_id, shift_id, effective_from, effective_to)`. One schedule per employee with no effective dating also means changing someone's shift retroactively changes every past day on recalculation.

### A5 · High · Department/employee overrides of regularization fields do nothing

`allowRegularization`, `regularizationCutoffDays` and `requiresApproval` are listed as inheritable policy keys and editable per override, but `attendanceRegularizationEligibility.service.ts` reads only the company-level `attendance_regularization_settings` (`submissionWindowDays`, `maxRequestsPerMonth`, `approvalHierarchy`). Admins can configure a 3-day window for one department and it is ignored. Pick one source and remove the other from the UI.

### A6 · Medium · Core settings overloaded into `alert_preferences`

Besides shifts, `dayBoundaryMode`, `unscheduledFallbackCutoff`, `manualEntryConfig`, `employeeVisibilityMode`, `defaultHistoryView` and the whole alert matrix live in that JSON column, with defaults duplicated in `getGeneralSettings` and `upsertGeneralSettings`. The DB enum says `processingMode = realtime` while the API returns `automatic`. Defaults also disagree: the column default for `day_boundary_time` is `00:00:00`, the API default `04:00:00`. Promote these to typed columns.

### A7 · Medium · Location & Security settings partly enforced

Enforced in `attendanceSecurity.service.ts`: GPS/geofence, IP allowlist, rapid-punch throttle, impossible travel, mock location. Not enforced anywhere: `maxDevicesPerEmployee`, `allowSharedKiosk`, `flagVpnProxy`. Mock-location detection trusts client-sent `deviceMetadata`, which any client can omit.

### A8 · Medium · Device "Test Ping" can probe internal hosts

`attendanceDeviceProbe.ts:21` blocks only `169.254.*`, `0.0.0.0` and `metadata.google.internal`. `localhost`, `127.0.0.1`, RFC-1918 ranges, IPv6 loopback/ULA, numeric-hostname forms and DNS names resolving to internal addresses are all allowed, and the response distinguishes "refused" from "timeout". In a multi-tenant deployment a tenant HR admin can port-scan the API's network. Resolve the hostname first and reject private/loopback/link-local results, or run probes from an on-prem agent (cloud servers cannot reach LAN terminals anyway).

### A9 · Medium · Payroll period unlock is too easy

`unlockPeriod` requires only a 5-character reason and the general settings-manage permission, and reopens `finalized` periods too, even after a payroll handover batch exists (`repository :1390` sets `status: 'open'` unconditionally). Require a separate permission, block unlock when a handover is `transferred`/`reconciled`, and invalidate or version the batch on reopen.

### A10 · Medium · Write guard requires two unrelated permissions

Settings writes pass through `requireReadWrite(…, 'hrms.attendance.regularize')` and then `requireReadWrite(…, 'hrms.settings.manage')`. A custom "HR settings admin" role without regularize rights cannot save attendance settings. Mount settings routes outside the operational router guard.

### A11 · Low · UI and audit gaps

`AttendanceSettingsSection` passes no permission flag, so read-only users see editable forms (the bundle shows no `can()` checks in these tabs; Leave does this correctly with `canManage`). The active tab is not kept in the URL (Leave and Workforce do this). Shift template changes are audited under category `general` because the audit enum has no `shift` value. Rollback computes the next version as the max across all scopes rather than per policy lineage.

---

## 5. Leave Settings

Tabs: General Settings, Leave Types, Leave Policies, Accrual & Carry Forward, Restrictions, Holidays, Approval Workflow.

### L1 · High · Existing companies can never change leave year or go-live date

`leaveGeneralSettings.service.ts:236`: status is `activated` once company-local today ≥ go-live date, and the default go-live date is the company's **creation date**. For any company created before it configures Leave, the very first publish is already "activated", so `leaveYearCycle` must stay `calendar_year` and `goLiveDate` must equal the creation date (`:113`). An Indian company that wants an April–March financial year cannot select it.
Fix: treat "no persisted row and no live leave records" as pre-activation regardless of dates, and default go-live to the first publish date.

### L2 · High · Year-end close runs automatically and bypasses the review permission

`runYearEndSweep` (`leaveAccrual.service.ts:488`) commits the previous cycle's close (carry forward, lapse, encashment handovers to payroll) as `system` within six hours of the new year starting. The manual preview → commit flow guarded by `hrms.leave.year_end_process` is never needed. Make automatic close opt-in, or have the sweep produce a pending run that HR commits.

### L3 · High · Active policies, types, accrual rules and workflows are edited in place

Only General Settings and Restrictions are versioned. Changing an active policy's entitlements, scope or dates (`leavePolicies.service.ts:207`) or a leave type's rules immediately alters balances and future validations with no history of what applied before. The audit entry stores only `fieldsUpdated` names, not before/after values.

### L4 · Medium · Approval routing edge cases

- If every level is skipped because the applicant is their own approver (top of hierarchy, or HR in a one-level workflow), `planApprovalSteps` returns `autoApprove: true` (`rules/leaveApproval.ts:63`), which is self-approval by configuration gap.
- `fallbackApproverRoleId` and `allowSelfApprovalForHr` are saved and returned but never applied. A step with no resolvable approver is created with both approver fields null and sits until the SLA sweep.
  Fix: when all levels skip or resolve to null, route to the fallback role; never auto-approve on skip.

### L5 · Medium · Leave-type fields with no effect

Searched across leave, ESS and attendance code. No reader exists for `countsAsPresent`, `attendanceStatusCode`, `payrollImpact`, `countsTowardService`, `teamCalendarVisibility`, or the `hours` unit. `countHolidays` is superseded by `holidayTreatment` but still stored. `grant_method` exists on both `leave_types` (8 values) and `leave_accrual_rules` (5 different values); only the accrual-rule one is used. `carry_forward_enabled` / `encashment_enabled` also exist in both tables. Either wire these into attendance/payroll or hide them in `LeaveTypeDrawer`.

### L6 · Medium · Policy model sharp edges

Exactly one policy applies per employee (most specific scope wins), so a department policy fully replaces the company policy; any leave type it omits disappears for that department. The UI should say so. `custom` scope remains in the DB enum but is rejected in V1 and resolves to "no match". Leave-type links are stored twice (`leave_policies.linked_leave_type_ids` JSON and `leave_policy_entitlements`).

### L7 · Medium · Holiday calendars

Published calendars still accept add/edit/delete; `revision` is bumped, but approved leave requests computed against the old revision are not flagged for recalculation. Calendars are keyed to the leave-cycle start year, so with a financial year the "2026" calendar covers Apr 2026–Mar 2027, which HR users will not expect. There is no unpublish.

### L8 · Low · Accrual sweep cost and frontend staleness

The balance sweep loops company × employee × entitlement with several queries per iteration every six hours and on every boot. Leave tabs stay mounted after first visit, so adding a leave type does not refresh the type list inside an already-opened Policies tab.

### What Leave does well

Read-only GET with derived defaults; immutable general-settings versions with `expectedCurrentVersionNumber` and transactional publish; overlap checks on policy scope/dates; versioned restriction rules; payroll-lock integration with attendance periods and a separate override permission; separate `settings_view` / `settings_manage` / `year_end_process` / `balance_adjust` permissions; `canManage` gating in every tab; tab state kept in `?tab=`.

---

## 6. Setting → engine matrix

"Live" means a runtime code path reads the value and changes behaviour.

| Area                                                        | Live                                                                                                             | Stored only                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Workforce · numbering                                       | prefix, suffix, length, starting number, auto-provision                                                          | generation mode, manual override, reset frequency, prevent reuse, activation timing                 |
| Workforce · employment types                                | (display only)                                                                                                   | all (employees use a separate enum)                                                                 |
| Workforce · probation / lifecycle / offboarding / clearance | none                                                                                                             | all                                                                                                 |
| Attendance · general                                        | timezone, tracking start, manual entry, visibility, alerts (partial)                                             | —                                                                                                   |
| Attendance · policies                                       | company-level thresholds, grace, late/early tracking, penalties, classification                                  | override values for regularization keys                                                             |
| Attendance · shifts & roster                                | none (calc reads `employee_work_schedules`); Leave reads `shifts[0]` as a default                                | templates as schedule source, auto-allocation, fallback shift, swap rules                           |
| Attendance · regularization                                 | window, monthly cap, approval hierarchy, payroll-lock block                                                      | —                                                                                                   |
| Attendance · security                                       | GPS/geofence, IP allowlist, throttle, impossible travel, mock location (client-reported)                         | max devices, shared kiosk, VPN flag                                                                 |
| Attendance · payroll                                        | cycle, cutoff, auto-lock, readiness severity                                                                     | —                                                                                                   |
| Leave · general                                             | all                                                                                                              | —                                                                                                   |
| Leave · types                                               | eligibility, limits, documents, sandwich/holiday/weekly-off treatment, negative balance, probation/notice/gender | counts as present, attendance code, payroll impact, service credit, calendar visibility, hours unit |
| Leave · approval                                            | levels, SLA actions, auto-approve threshold, skip-if-applicant, cancellation approval                            | fallback approver, HR self-approval                                                                 |
| Leave · restrictions                                        | blackout, notice, clubbing, gap, frequency (blocking); team concurrency (warning)                                | —                                                                                                   |

---

## 7. Suggested fix order

Phase 0 (this week, small diffs):

1. Remove or re-guard legacy `PUT /hrms/attendance/policies` (X1).
2. Atomic employee-ID reservation; remove the silent fallback (W1, W2).
3. Stop `resolveEffectivePolicy` from inserting rows; seed at provisioning (A1).
4. Tighten settings read permission to `hrms.settings.view` (X2).

Phase 1 (correctness): 5. Republish keeps the old version until the new effective date; drafts-only editing (A2, A3). 6. Fix Leave activation logic so year cycle and go-live can be set on first publish (L1). 7. Make automatic year-end close produce a pending run (L2). 8. Approval fallback routing; no auto-approve on full skip (L4). 9. Attendance reads holiday calendars; separate `weekly_off` status (X5). 10. Device probe address filtering (A8); unlock guard (A9).

Phase 2 (data model): 11. Shift tables with effective-dated assignments; retire `shiftRosterConfig` JSON (A4). 12. Promote JSON-hidden attendance config to typed columns (A6). 13. Employment type FK unification (X4). 14. Dedicated Workforce/Attendance settings permissions; audit + change reason + optimistic concurrency for Workforce and Attendance, following the Leave pattern (X3, X7). 15. Versioning for leave types, policies, accrual rules and workflows (L3).

Phase 3 (honesty in the UI): 16. Hide or badge every "stored only" setting in §6 until an engine reads it (W3, W4, A5, A7, L5). 17. Permission gating and URL tab state in Attendance settings; remove orphaned Administration section and mock types (A11, X9).
