# BEZENT HRMS — Leave Operations V1 (Content Spec)

> Status: **Approved (D1–D6 as recommended) and implemented** — P1 Overview/Requests/Approvals, P2 Team Calendar/Balances, P3 Holiday Calendar/Year-End, P4 Reports. Reports value liability in days only (no salary data in leave); multiply by the daily rate in payroll. Migration 0054 adds request cancellation audit fields.
> Scope: the HR/manager **Leave** module (sidebar → Leave), not ESS. Employees keep applying from ESS → My Leave.
> Builds on: Leave Settings V1 (all 7 tabs), the leave request pipeline, ledger, approvals, holidays and year-end engine already implemented.

---

## 1. Today vs proposed sub-navigation

| #   | Today (flyout)   | Proposed                                           | Why                                                                                                                             |
| --- | ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Leave Summary    | **Overview**                                       | Same name/pattern as Attendance → Overview; a live dashboard, not a static summary                                              |
| 2   | Apply Leave      | **Leave Requests** (with "Apply on Behalf" action) | HR rarely applies for themselves (they use ESS). HR needs the full request register; apply-on-behalf becomes a button inside it |
| 3   | Leave Approvals  | **Approvals**                                      | Kept; becomes the full queue with SLA, bulk actions, cancellations                                                              |
| 4   | —                | **Team Calendar**                                  | Who is off when, with holidays and concurrency warnings — most-asked manager question                                           |
| 5   | —                | **Leave Balances**                                 | Balance register per employee × type, ledger drill-down, manual adjustments                                                     |
| 6   | Holiday Calendar | **Holiday Calendar**                               | Kept; read view of the published calendar + optional-holiday uptake (editing stays in Settings → Holidays)                      |
| 7   | —                | **Year-End & Encashment**                          | Operational run of cycle close, carry forward, lapse, encashment handover to payroll                                            |
| 8   | —                | **Reports**                                        | Utilisation, LOP for payroll, liability, absenteeism, audit                                                                     |

Final flyout (8 items, mirrors Attendance's density):

```
LEAVE — Leave Management
  Overview
  Leave Requests
  Approvals
  Team Calendar
  Leave Balances
  Holiday Calendar
  Year-End & Encashment
  Reports
```

Route segments: `/hrms/leave/overview`, `/requests`, `/approvals`, `/calendar`, `/balances`, `/holidays`, `/year-end`, `/reports`. `/hrms/leave` lands on Overview (same as Attendance).

---

## 2. Access model (uses existing permission keys)

| Page                  | View needs                                       | Actions need                                                                                                                                                 |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Overview              | `hrms.leave.view` (managers: own team only)      | —                                                                                                                                                            |
| Leave Requests        | `hrms.leave.view`                                | Apply on behalf: `hrms.leave.apply_on_behalf`; backdated beyond window: `hrms.leave.backdated_override`; payroll-locked dates: `hrms.leave.payroll_override` |
| Approvals             | `hrms.leave.approve` or being a pending approver | Approve/reject: assigned approver; HR override: workflow `allowSelfApprovalForHr` + `hrms.leave.approve`                                                     |
| Team Calendar         | `hrms.leave.view` (managers: reportees)          | —                                                                                                                                                            |
| Leave Balances        | `hrms.leave.view`                                | Adjust: `hrms.leave.settings_manage` (new alias `hrms.leave.balance_adjust` — optional, see D4)                                                              |
| Holiday Calendar      | `hrms.leave.view`                                | — (manage link → Settings → Holidays)                                                                                                                        |
| Year-End & Encashment | `hrms.leave.view`                                | Close cycle: `hrms.leave.year_end_process` (exists)                                                                                                          |
| Reports               | `hrms.leave.view`                                | Export: same                                                                                                                                                 |

Scope rule: HR/admin roles see the whole company; a reporting manager without company-wide `hrms.leave.view` sees only direct + indirect reportees.

---

## 3. Page content

### 3.1 Overview

Purpose: one screen answering "who is out, what needs action, is anything going wrong".

**Header card** — "Leave Overview" · date picker (default today) · Department / Location filters.

**Metrics row (4 cards)**

| Card              | Value                                                 | Badge                                |
| ----------------- | ----------------------------------------------------- | ------------------------------------ |
| On Leave Today    | count of employees with approved leave covering today | "x% of workforce"                    |
| Pending Approvals | open approval steps                                   | "y overdue (SLA)" — warning when > 0 |
| Upcoming (7 days) | approved leave starting in next 7 days                | "z employees"                        |
| LOP This Month    | LOP days in current payroll month                     | "for payroll"                        |

**Sections**

1. **Who's out today** — avatar list: name, department, leave type chip, session (Full / First half / Second half), returns on. Empty state: "Everyone is in today".
2. **Needs attention** — actionable list:
   - Approvals breaching SLA (→ Approvals, filtered)
   - Cancellation requests pending
   - Employees without a policy (→ Settings → Policies)
   - Holiday calendar not published for current year (→ Settings → Holidays)
   - Negative balances (→ Balances, filtered)
3. **Upcoming leave (next 14 days)** — compact timeline grouped by date.
4. **Leave mix this month** — bar per leave type: days taken (approved + taken).
5. **Upcoming holidays** — next 3 holidays from the published calendar.

### 3.2 Leave Requests

Purpose: the register of every leave request.

**Header card** — "Leave Requests" · actions: **Apply on Behalf** (permission-gated), **Export**.

**Metrics row**: Pending · Approved (this cycle) · Rejected (this cycle) · Cancelled (this cycle).

**Filter bar**: search (employee name / number) · status (Pending, Approved, Rejected, Cancelled, Cancellation Pending) · leave type · department · location · date range (overlapping) · "Applied by HR" toggle.

**Table columns**: Employee (avatar, name, number, department) · Leave Type (colour chip) · Dates (start – end, session) · Days · Applied On · Status (badge + current approval level, e.g. "Pending · L1 Manager") · Actions (View).

**Request detail drawer**

- Summary: employee, type, dates, days, session, reason, attachments.
- Duration breakdown: per-day list (working / weekly off / holiday / sandwich-counted) — from the stored calculation snapshot.
- Balance impact: available before → after, reserved/confirmed.
- Approval timeline: each level, approver, decision, comment, SLA due / breached, escalations.
- Policy snapshot: settings version + policy used at submission (audit).
- Actions: Cancel (pending or approved-future; reason required), Approve/Reject if the viewer is the current approver.

**Apply on Behalf modal** — employee picker → same form as ESS (type, dates, session, reason, attachment) with live preview of days + balance; shows "Applied by HR on behalf" in the request and notifies the employee. Backdated / locked-period overrides appear only with the matching permission and require a reason.

### 3.3 Approvals

Purpose: the approver's work queue (already backed by `/hrms/leave/approvals`).

**Header card** — "Leave Approvals" · scope toggle **Assigned to me / All pending** (All needs `hrms.leave.approve`).

**Metrics row**: Awaiting me · Overdue (SLA breached) · Cancellation requests · Approved today.

**Queue table**: Employee · Type · Dates · Days · Level ("L2 of 3") · Purpose (Approval / Cancellation) · SLA (due in 5h / overdue 2h) · Actions (Approve, Reject).

**Behaviours**

- Row click → same request drawer as 3.2, plus "Team on leave those days" (concurrency warning from restrictions) and the applicant's balance.
- Bulk approve (selected rows; reject stays one-by-one because a comment is mandatory).
- Reject requires a comment; approve comment optional.
- HR override badge when HR approves a step not assigned to them.

### 3.4 Team Calendar

Purpose: visual month view.

**Header card** — "Team Calendar" · month navigator · view toggle (Month / Week) · filters: department, location, leave type, "My team only".

**Grid**: rows = employees, columns = days. Cells: leave type colour (half-day = half cell), holiday column shading, weekly off shading, pending leave shown hatched/outlined.

**Side summary**: per day count "6 out (12%)"; days exceeding a team-concurrency rule flagged.

Empty state: "No leave in this period".

### 3.5 Leave Balances

Purpose: balance register and corrections.

**Header card** — "Leave Balances" · cycle selector (current / previous) · actions: **Adjust Balance**, **Export**.

**Metrics row**: Employees tracked · Total available days · Negative balances · Expiring carry-forward (next 30 days).

**Table**: Employee · one column per tracked leave type showing `available / entitled` (with reserved shown on hover), sticky employee column, filters (department, location, type, "negative only").

**Employee ledger drawer** (click a cell): opening, accruals by month, usage (reserved / confirmed / released / reversed), adjustments, carry forward in, lapse, encashment — each with date, days, reference (request id / run id), actor and note. Running balance column.

**Adjust Balance modal**: employee, leave type, credit/debit, days (respecting balance precision), reason (mandatory), effective date. Writes an `adjustment` ledger entry; audit logged; employee notified.

### 3.6 Holiday Calendar

Purpose: read-only operational view for everyone with leave view rights.

**Header card** — "Holiday Calendar" · year selector · location selector (shows the calendar mapped to that location, else the default) · link "Manage in Settings" (settings permission only).

**Content**: month cards or list grouped by month: date, weekday, name, Mandatory / Optional badge. Optional holidays show uptake: "14 employees opted".

**Metrics row**: Holidays this year · Optional holidays · Optional quota per employee · Next holiday (date + name).

### 3.7 Year-End & Encashment

Purpose: run and audit the leave-year close (engine already built).

**Header card** — "Year-End & Encashment" · cycle selector.

**Metrics row**: Employees in cycle · Carry forward days · Lapse days · Encashment days.

**Sections**

1. **Close preview** — per employee × type: available, encash, carry forward, lapse (existing preview API). Filter + export.
2. **Close the cycle** — confirmation modal summarising totals; needs `year_end_process`. Auto-close status shown ("closes automatically on 01 Jan 2027").
3. **Run history** — past runs: cycle, run date, actor (system / user), totals.
4. **Encashment handover** — rows sent to payroll (employee, type, days, basis, status: pending / picked by payroll).

### 3.8 Reports

Purpose: exportable views for HR and payroll. Each report = filters (date range, department, location, type) + table + CSV export.

| Report            | Content                                                                           |
| ----------------- | --------------------------------------------------------------------------------- |
| Leave Utilisation | days taken per type per employee/department vs entitlement                        |
| LOP for Payroll   | LOP days per employee per payroll month (feeds payroll)                           |
| Balance Liability | available paid days × (basic or gross) per encashment basis → financial liability |
| Absenteeism Trend | monthly leave days, top reasons, Monday/Friday pattern                            |
| Approval SLA      | average approval time, breaches by approver                                       |
| Leave Audit Trail | request lifecycle + adjustments + settings changes                                |

---

## 4. Backend additions needed (existing APIs reused where possible)

| Need                    | Endpoint                                                                | Exists?                               |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| Overview aggregates     | `GET /hrms/leave/overview?date=`                                        | new                                   |
| Request register        | `GET /hrms/leave/requests` (filters, paging)                            | new                                   |
| Request detail          | `GET /hrms/leave/requests/:id` (timeline, breakdown, snapshot)          | new                                   |
| Apply on behalf         | `POST /hrms/leave/requests` (employeeId) — reuses `applyLeave` pipeline | new route, existing service           |
| Cancel (HR)             | `POST /hrms/leave/requests/:id/cancel`                                  | new route, existing service           |
| Approval queue / decide | `/hrms/leave/approvals…`                                                | **exists**                            |
| Bulk approve            | `POST /hrms/leave/approvals/bulk-approve`                               | new                                   |
| Team calendar           | `GET /hrms/leave/calendar?from&to`                                      | new                                   |
| Balance register        | `GET /hrms/leave/balances?cycleStart`                                   | new                                   |
| Employee ledger         | `GET /hrms/leave/balances/:employeeId/ledger`                           | new                                   |
| Manual adjustment       | `POST /hrms/leave/balances/adjustments`                                 | new (ledger `adjustment` type exists) |
| Holidays read           | `/hrms/leave/holidays/calendars…`                                       | **exists**                            |
| Year-end                | `/hrms/leave/accrual/year-end…`, `/accrual/encashments`                 | **exists**                            |
| Reports                 | `GET /hrms/leave/reports/:reportId` + `?format=csv`                     | new                                   |

All new endpoints follow routes → controller → service → repository, tenant/company scoped, manager scoping via reporting hierarchy.

---

## 5. Decisions needed

| #   | Question                                                                                      | Recommendation                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Replace "Apply Leave" nav item with "Leave Requests" + Apply-on-Behalf button?                | **Yes**                                                                                                                        |
| D2  | Rename "Leave Summary" → "Overview"                                                           | **Yes** (matches Attendance)                                                                                                   |
| D3  | Managers see only their reportees across Overview/Requests/Calendar/Balances                  | **Yes**                                                                                                                        |
| D4  | Balance adjustments gated by settings-manage, or a new `hrms.leave.balance_adjust` permission | **New permission** (finer control)                                                                                             |
| D5  | Bulk approve allowed                                                                          | **Yes, approve only** (reject needs individual comments)                                                                       |
| D6  | Delivery order                                                                                | **P1** Overview + Requests + Approvals · **P2** Team Calendar + Balances · **P3** Holiday Calendar + Year-End · **P4** Reports |

---

## 6. Constraints

- `apps/web/src/applications/hrms/navigation/hrmsNavigation.ts` and `routes/hrmsRoutes.tsx` currently have **another developer's uncommitted changes**. Adding the new sub-nav and routes requires editing both; coordinate before implementation (Dev3 owns AppShell/navigation per AGENTS.md Art. 20).
- UI uses Design System components only (no app CSS), same header/metrics/card pattern as Attendance and Leave Settings.
