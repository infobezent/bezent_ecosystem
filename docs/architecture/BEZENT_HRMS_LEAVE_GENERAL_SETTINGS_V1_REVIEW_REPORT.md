# BEZENT HRMS Leave Module — General Settings V1 Review Report

> **Document Identifier:** `BEZENT_HRMS_LEAVE_GENERAL_SETTINGS_V1_REVIEW_REPORT.md`  
> **Review Target:** `docs/architecture/BEZENT_HRMS_LEAVE_GENERAL_SETTINGS_V1_SPEC.md` (Version `2.1.0-CANONICAL-SPEC`)  
> **Review Lifecycle Status:** `PENDING_PRODUCT_OWNER_APPROVAL`  
> **Repository Baseline:** Branch `feat/auto-provision-employee-user-access` (HEAD Commit `47c667c603a8368f1feb4d61f0917262c24520a2`)  
> **Safety Reference Archive:** Branch `backup/leave-module-pre-cleanup` (Commit `d5717005c8e7d2aedde3221edbbea6cbe2599e35`)  
> **Scope:** Comprehensive Architectural Verification, Contradiction Audit, Technical Reconciliation, and Acceptance Matrix Expansion.

---

## 1. Executive Summary

This review report accompanies the finalization of the **BEZENT HRMS Leave Module — General Settings V1 Specification** (`2.1.0-CANONICAL-SPEC`).

In strict adherence to repository engineering constitution `AGENTS.md` (Articles 1–30) and Product Owner directives:

- **No application source code, database schemas, Drizzle migrations, API endpoints, tests, or seed data were modified.**
- The current branch remains at clean HEAD commit `47c667c`.
- The specifications and review documents exist in `docs/architecture/` under the status `PENDING_PRODUCT_OWNER_APPROVAL`.
- The specification reconciles all 12 mandatory technical topics (Sections 5.1 to 5.12), preserves all 13 confirmed Product Owner decisions, eliminates previous draft contradictions, and expands the QA test matrix to **40 comprehensive Given/When/Then acceptance scenarios**.

---

## 2. Verified Repository Baseline & Source References

Every technical claim in the specification was directly verified by reading current codebase files on branch `feat/auto-provision-employee-user-access`:

| Component / Architectural Fact       | Verification Status | Source Reference                                                         | Exact Repository Observation                                                                                                                                                                                                                                    |
| :----------------------------------- | :------------------ | :----------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`employee_leave_balances` Table**  | **Verified**        | `apps/api/src/db/schema.ts:3040-3071`                                    | Existing schema stores `totalDays`, `usedDays`, and `pendingDays` as MySQL `int`. Has compound unique index on `(tenantId, companyId, employeeId, leaveType, year)`.                                                                                            |
| **`employee_leave_requests` Table**  | **Verified**        | `apps/api/src/db/schema.ts:3078-3109`                                    | Existing schema stores `startDate` (`varchar(10)`), `endDate` (`varchar(10)`), `totalDays` (`int`), and `status` enum (`'pending'`, `'approved'`, `'rejected'`, `'cancelled'`). Does NOT possess `session` enum or `calculationSnapshot` JSON.                  |
| **Pending Reservation Logic**        | **Verified**        | `apps/api/src/applications/hrms/leave/service/leave.service.ts:140`      | Leave request submission executes atomic pending reservation: `pendingDays = pendingDays + totalDays`. Cancellation decrements `GREATEST(0, pendingDays - totalDays)`.                                                                                          |
| **Overlap Detection**                | **Verified**        | `apps/api/src/applications/hrms/leave/service/leave.service.ts:68`       | Queries existing requests where `status IN ('pending', 'approved')` and date ranges intersect; aborts with `409 Conflict`.                                                                                                                                      |
| **Attendance Status Enum**           | **Verified**        | `apps/api/src/db/schema.ts:1966-1975`                                    | Table `employee_attendance.status` enum contains: `['present', 'absent', 'half_day', 'on_leave', 'holiday', 'incomplete']`. Table does NOT contain a separate `'half_day_leave'` enum value.                                                                    |
| **Attendance Cutoff Periods**        | **Verified**        | `apps/api/src/db/schema.ts:2927-2953`                                    | Table `attendance_periods` contains `period_code`, `start_date`, `end_date`, and `status` enum (`'open'`, `'locked'`, `'finalized'`).                                                                                                                           |
| **Payroll Handover Batches**         | **Verified**        | `apps/api/src/db/schema.ts:2961-2976`                                    | Table `attendance_payroll_handover_batches` references `attendance_periods.id` with `batch_number`, `total_employees`, and `total_payable_days`.                                                                                                                |
| **Access Control Permissions**       | **Verified**        | `apps/api/src/platform/access/catalog/accessCatalog.ts:331-368, 447-450` | Existing catalog contains `hrms.settings.view`, `hrms.settings.manage`, `hrms.leave.view`, `hrms.leave.approve`, `ess.leave.view`, `ess.leave.apply`. Does NOT contain `hrms.leave.settings.*`, `apply_on_behalf`, `backdated_override`, or `payroll_override`. |
| **Design System Primitives**         | **Verified**        | `apps/web/src/design-system/components/index.ts`                         | All UI primitives are available: `Button`, `IconButton`, `Input`, `Select`, `Switch`, `Modal`, `Tabs`, `Table`, `Badge`, `Alert`, `Card`, `Stack`, `Inline`, `Grid`, `Page`, `PageHeader`, `Toolbar`.                                                           |
| **Zero Application CSS Invariant**   | **Verified**        | `AGENTS.md` (Article 7) & ADR-011                                        | Zero `.css` files permitted in `apps/web/src/applications/hrms/`, zero inline `style={{}}`.                                                                                                                                                                     |
| **Current Leave Settings Component** | **Verified**        | `apps/web/src/applications/hrms/settings/leave/LeaveSettingsSection.tsx` | Currently renders a mock table of leave types using local `DEFAULT_LEAVE_TYPES` and in-memory state. General Settings tab has not been implemented yet.                                                                                                         |

---

## 3. Contradictions Found & Corrected

During the review of earlier proposals and drafts, several critical contradictions and ambiguities were discovered and corrected:

1. **Incorrect Attribution of February 29 Prohibition:**
   - _Previous Draft Finding:_ Section 6.1 previously attributed the prohibition of February 29 as `custom_year_start_date` to `(PO Decision #8)`.
   - _Correction:_ PO Decision #8 governs Half-Day Sessions (`first_half` / `second_half`). The prohibition of February 29 is a fundamental date-arithmetic invariant: February 29 does not exist in 3 out of every 4 calendar years, so using it as an annual start date would cause annual rollover engines to crash on non-leap years. The citation was corrected to reflect calendar integrity.
2. **Conflicting Company Activation & Immutability Rules:**
   - _Previous Draft Finding:_ Sections 5.1, 5.3, and 6.1 contained slightly different triggers for when `leave_year_cycle` and `go_live_date` become immutable (one section cited "reaching go_live_date", another cited "first leave request", and another cited "company provisioning").
   - _Correction:_ Reconciled into a single, unified activation contract (Section 6.1). A company is in `pre_activation` draft mode during setup where settings are editable. Activation occurs at the **earliest** of: (a) wall-clock arrival of `go_live_date 00:00:00` in company timezone, (b) creation of the first opening balance, or (c) submission of the first leave request. Post-activation, both values are strictly locked against modification via UI and API.
3. **Attendance Status Enum Mismatch (`half_day_leave` vs `half_day`):**
   - _Previous Draft Finding:_ Earlier drafts assumed `employee_attendance` possessed a status enum value called `half_day_leave`.
   - _Correction:_ Inspection of `apps/api/src/db/schema.ts:1969` revealed that `employee_attendance.status` contains `'half_day'` and `'on_leave'`, but NOT `'half_day_leave'`. The specification was updated to classify `half_day_leave` as a **proposed integration contract** and recommended mapping to existing `'half_day'` with session metadata stored in `calculation_metadata` to avoid unnecessary schema migrations.
4. **Attendance Punch Expectations Contradiction:**
   - _Previous Draft Finding:_ One section suggested that `first_half` leave excuses the second half of the day.
   - _Correction:_ Corrected to exact operational logic: For shift 09:00–18:00, `first_half` leave excuses the first half (09:00 to shift midpoint ~13:00); the employee is expected to work and punch during the second half (13:00 to 18:00). Conversely, `second_half` leave excuses the second half; punches are expected during the first half.
5. **Lossless Display vs Floating-Point Truncation:**
   - _Previous Draft Finding:_ Ambiguity regarding whether `whole_numbers` precision could round or truncate fractional balances.
   - _Correction:_ Formally established the **Lossless Presentation Invariant**: `whole_numbers` suppresses decimals only for exact integers (`14.00 -> "14"`), but renders non-zero fractions losslessly (`14.50 -> "14.5"`). Formatting is strictly a presentation transformation that never mutates raw database numbers.
6. **Synchronous PPA Timing vs Premature Generation:**
   - _Previous Draft Finding:_ Earlier text was ambiguous on whether PPA records are created at submission time or approval time.
   - _Correction:_ PPA records are generated **synchronously upon final approval only**. Creating PPA records at submission would pollute payroll queues with unapproved or rejected requests.
7. **Universal Advance Booking Boundary:**
   - _Previous Draft Finding:_ Questions existed on whether HR managers could bypass `max_advance_booking_days`.
   - _Correction:_ Formally established that in V1, `max_advance_booking_days` applies universally to all roles with **zero bypass**.

---

## 4. Preserved Product Owner Decisions

All thirteen confirmed Product Owner decisions are preserved intact without deviation:

1. **Leave-Year Scope:** Single company-wide leave year; no location overrides in V1.
2. **Leave-Year Cycle Changes:** Blocked after company activation in V1.
3. **Cross-Year Requests:** Rejected dynamically; no automatic request splitting.
4. **Payroll-Locked Backdated Leave:** ESS backdated submissions blocked for locked periods (`attendance_periods.status IN ('locked', 'finalized')`). HR exceptions require PPA record; no rewriting closed records.
5. **HR Backdated Override Cap:** Absolute hard cap of 90 calendar days; requests beyond 90 days are rejected for all roles.
6. **Settings Versioning:** Versioned snapshots with effective dates and change reasons.
7. **Calculation Snapshot Immutability:** Sealed upon request submission; approval does not recalculate.
8. **Half-Day Sessions:** Captures `first_half` or `second_half` aligned with shift.
9. **Single-Date Half-Day Scope:** Half-days supported for single-date requests only (`startDate === endDate`).
10. **Leave Unit:** Days only in V1 (`0.5` or `1.0`). Hour-based leave excluded.
11. **Accrual Rounding:** Fixed 0.5-day increment, `nearest` default, half-up tie-breaking (`1.25 -> 1.50`, `1.75 -> 2.00`).
12. **Pending Reservation:** Pending requests always reserve available balance atomically; fixed behavior.
13. **Deterministic Arithmetic:** Fixed-point decimal arithmetic (at least 4 decimals internal); IEEE 754 floating-point prohibited.

---

## 5. Mandatory Technical Reconciliation Summary

The canonical specification incorporates deterministic resolutions for each of the 12 technical areas:

- **5.1 Company Activation & Immutability:** Single activation lifecycle contract. Initial Version 1 is created in `pre_activation` draft mode. Activation occurs at earliest of wall-clock go-live date, first opening balance, or first leave request. Post-activation, `leave_year_cycle` and `go_live_date` are strictly immutable via UI and API.
- **5.2 Date Semantics & Timezones:** Request `startDate` and `endDate` are inclusive calendar dates (`YYYY-MM-DD`) in `company.timezone`. Cycle intervals are half-open `[start, end)`. Settings `effectiveFrom` are UTC instants compared at millisecond precision ($\le$). Calendar stepping avoids 24h millisecond math to handle DST cleanly.
- **5.3 Leave-Year Boundaries:** Deterministic algorithms for calendar (`YYYY`), financial (`FY YYYY-(YY+1)`), and custom cycles (`Cycle YYYY-(YY+1)`). Feb 29 disallowed for custom start date. Cross-year requests rejected with dynamic cycle labels.
- **5.4 Working-Day Calculations:** Date-by-date roster and holiday calendar evaluation. Missing data fails safe and blocks submission. Overlapping weekly-off and holiday exclusions recorded as `['weekly_off', 'holiday']`. Zero-charge ranges rejected. Calendar-day half-day on weekend charges 0.5 days without expecting punches.
- **5.5 Attendance Half-Day Behavior:** Clear reciprocal shift half punch validation. Midpoints derived from shift definitions without invented tolerances. Integration contract details mapped to existing `employee_attendance` schema.
- **5.6 Numeric Representation & Rounding:** IEEE 754 prohibited. Fixed-point decimal arithmetic enforced. Proposed migration to `decimal(6,2)` (balances) and `decimal(5,2)` (requests) clearly distinguished from verified existing `int` columns. Accrual rounding separated from display formatting.
- **5.7 Balance Reservation & Ledger Integrity:** Atomic SQL queries for reservation, approval consumption, and cancellation release. Concurrency safety via `pending_days` check-and-reserve. Multi-tenant compound keys validated on every transaction.
- **5.8 Settings Versioning & Scheduling:** Complete 8-setting snapshot per version. Distinguishes `latestPublishedVersion` from `activeVersion`. Strictly increasing UTC timestamps; duplicate timestamps rejected with 409 Conflict. Optimistic locking via `expectedCurrentVersionNumber`.
- **5.9 Display Precision vs Snapshots:** Presentation-only display formatting does not alter stored numeric balances or modify historical sealed calculation snapshots.
- **5.10 Operational Limits & Overrides:** Backdated limit (0–90 days), HR override cap (90 days absolute), advance booking (1–365 days, no bypass), go-live cut-over. Permissions clearly separated into Verified on HEAD vs Proposed.
- **5.11 Payroll PPA Contract:** Synchronous PPA creation upon final approval with idempotency key (`requestId + approvalTimestamp`). Closed payroll records never modified.
- **5.12 UI Requirements & Conventions:** Zero Application CSS compliance, Design System primitives only, 7 planned tabs (Tab 1: General Settings), dirty form tracking, modal confirmation with mandatory change reason.

---

## 6. Acceptance Criteria and QA Matrix Overview

The QA Matrix in Section 7 of the specification now features **40 comprehensive test scenarios** (Scenarios 1 through 24 preserved and corrected; Scenarios 25 through 40 added):

- **Scenarios 1–5:** Cross-year rejection, working-day counting, accrual rounding with half-up tie-breaking, lossless display, and single-date half-day session selection.
- **Scenarios 6–10:** Non-working day half-day eligibility, submission-time version resolution, approval calculation invariance, atomic pending reservation, and ESS payroll-locked period hard block.
- **Scenarios 11–15:** Authorized HR locked-period override with PPA, advance booking non-bypass, backdated booking boundary, absolute 90-day HR cap, and go-live boundary rejection.
- **Scenarios 16–20:** Post-activation go-live immutability, version scheduling timestamp validation, invalid custom calendar dates, missing schedule data fail-safe block, and half-day punch validation.
- **Scenarios 21–24:** Weekend calendar-day half-day attendance, PPA creation retry idempotency, on-behalf normal approval routing, and concurrent version publishing conflict.
- **Scenarios 25–28 (New):** Initial Version 1 provisioning and company activation, RBAC permission enforcement and multi-tenant isolation, UTC timestamp equality comparison, and future-effective version status vs active version.
- **Scenarios 29–32 (New):** Lossless formatting of integers vs fractional balances, fail-safe block on missing shift roster data, parallel concurrent balance reservations, and atomic reservation reversal on cancellation/rejection.
- **Scenarios 33–36 (New):** Request snapshot immutability across settings migrations, duplicate approval retry idempotency, change reason and monotonic effective-date validation, and custom cycle evaluation across leap years.
- **Scenarios 37–40 (New):** Rejection of leave requests with zero working days, unauthorized HR overrides and override reason length validation, locked vs finalized attendance period enforcement, and cross-company tenant isolation boundary verification.

---

## 7. Open Product Owner Decisions

Four items are marked `REQUIRES_PRODUCT_OWNER_DECISION` in Section 9.2 of the specification:

1. **PPA Handover Payload Schema & Transport:**
   - _Recommendation:_ Structured JSON payload stored in `leave_payroll_adjustments` table with queue dispatch to Payroll.
2. **Attendance `half_day_leave` Enum vs Metadata Extension:**
   - _Recommendation:_ Retain existing `'half_day'` enum in `employee_attendance.status` and persist `{ leaveSession: 'first_half' | 'second_half' }` in `calculation_metadata` to avoid altering existing attendance tables.
3. **Unusual Shift Midpoints for Half-Days:**
   - _Recommendation:_ Restrict half-day leaves to shifts with standard day schedules having a defined break/midpoint in V1.
4. **Pre-Activation Opening Balance Import Procedures:**
   - _Recommendation:_ Allow opening balances to be imported via administrative CSV import prior to `go_live_date` without triggering activation until the cut-over date arrives.

---

## 8. Implementation Sequencing & Migration Prerequisites

When Product Owner approval is granted, implementation must follow this sequenced roadmap:

1. **Phase 1: Database Migrations**
   - Create `leave_general_settings` and `leave_general_settings_versions` tables.
   - Migrate `employee_leave_balances` (`totalDays`, `usedDays`, `pendingDays` from `int` to `decimal(6,2)`).
   - Migrate `employee_leave_requests` (`totalDays` from `int` to `decimal(5,2)`, add `session` enum and `calculation_snapshot` JSON column).
   - Register proposed permissions in `apps/api/src/platform/access/catalog/accessCatalog.ts`.
2. **Phase 2: Backend Domain & Services**
   - Implement `LeaveGeneralSettingsRepository` and `LeaveGeneralSettingsService`.
   - Implement date calculation engine with fixed-point arithmetic.
   - Implement API controllers and routes under `/api/v1/hrms/leave/settings/general`.
   - Add unit and integration tests.
3. **Phase 3: Frontend Implementation**
   - Implement `GeneralSettingsTab` in `apps/web/src/applications/hrms/settings/leave`.
   - Compose strictly with global Design System primitives (`Card`, `Stack`, `Grid`, `Input`, `Select`, `Button`, `Modal`, `Alert`).
   - Verify zero application CSS and zero inline styles.

---

## 9. Product Owner Approval Checklist

Before proceeding to implementation, the Product Owner should confirm:

- [ ] Reconciled activation lifecycle contract accepted.
- [ ] 13 confirmed decisions verified and preserved.
- [ ] 40 acceptance criteria approved as comprehensive test suite.
- [ ] Recommendations on open decisions (PPA schema, attendance metadata) accepted.

---

Documentation revised; implementation not started; Product Owner approval pending.
