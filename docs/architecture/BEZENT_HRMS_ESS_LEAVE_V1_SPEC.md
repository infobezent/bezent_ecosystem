# BEZENT HRMS — ESS Leave V1 (Content Specification)

> **Document Status:** Complete & Approved for Implementation  
> **Document Version:** `1.0.0`  
> **Path:** `apps/web/src/applications/hrms/ess/pages/EssLeavePage.tsx`  
> **Backend Service:** `apps/api/src/applications/hrms/ess/service/ess.service.ts` · `leave.service.ts`  
> **Role & Scope:** Employee Self-Service (ESS). Accessible by all active employees with `ess` workspace.

---

## 1. Purpose & User Stories

**ESS Leave** enables every employee in the company to manage their own leave lifecycle transparently without HR intervention:
1. **As an employee**, I want to see my live available leave balances (Annual, Casual, Sick, etc.) so I know how many days I can take.
2. **As an employee**, I want to apply for leave with clear date selection, session choice (Full / Half-day), and see instant working-day deductions before submitting.
3. **As an employee**, I want to track the exact multi-level approval progress (Manager $\rightarrow$ HR) and cancellation status of my requests.
4. **As a reporting manager**, I want a dedicated "Team Approvals" queue on the same page so I can quickly approve or reject my direct reportees' requests.
5. **As an employee**, I want to see upcoming public and optional holidays to plan my leaves effectively.

---

## 2. Screen Layout Hierarchy

The screen follows BEZENT Design System standards (`Page`, `PageHeader`, `Section`, `Grid`, `Card`, `Table`, `Modal`, `Toolbar`):

```
┌────────────────────────────────────────────────────────────────────────┐
│ Page Header: "Leave Management"               [ + Apply for Leave ]   │
│ Subtitle: "View annual leave balances, track requests & holiday cal"   │
├────────────────────────────────────────────────────────────────────────┤
│ [Alert Banners: Missing Policy / Missing Holiday Calendar / SLA Alert] │
├────────────────────────────────────────────────────────────────────────┤
│ 1. HERO & LEAVE BALANCES CARDS                                        │
│    [ Annual Leave ]     [ Casual Leave ]     [ Sick Leave ]    [ LOP ] │
│    12 days left         4 days left          7 days left       No cap  │
│    Used: 6 of 18        Used: 2 of 6         Used: 1 of 8      Used: 0 │
├────────────────────────────────────────────────────────────────────────┤
│ 2. TEAM APPROVALS (Conditional: Only visible if employee has reportees)│
│    Table: Employee | Type & Days | Dates | Reason | [Approve] [Reject] │
├────────────────────────────────────────────────────────────────────────┤
│ 3. MY LEAVE HISTORY                                                    │
│    Toolbar: [All | Pending | Approved | Rejected | Cancelled]  Count: 4│
│    Table: Leave Type | Dates | Days & Session | Reason | Status | Action│
├────────────────────────────────────────────────────────────────────────┤
│ 4. UPCOMING HOLIDAYS                                                   │
│    Grid of Cards: Date | Holiday Name | Day | [Upcoming / Optional]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component & Content Breakdown

### 3.1 Page Header
* **Title:** `Leave Management`
* **Subtitle:** `View annual leave balances, submit leave applications, track approvals, and holiday calendar`
* **Badge / Metadata:** Current Leave Year Cycle (e.g. `Cycle: Jan 01, 2026 – Dec 31, 2026 • Standard Leave Policy`)
* **Primary Action CTA:** `Apply for Leave` (Button with `leave` icon). Triggers the **Apply Leave Drawer/Modal**.

---

### 3.2 System Alerts (Conditional)
* **No Policy Alert (Warning):**
  * *Title:* `No leave policy assigned`
  * *Body:* `You are not covered by an active leave policy yet. Please contact HR to assign a policy before applying.`
* **Missing Holiday Calendar Alert (Warning):**
  * *Title:* `Holiday calendar not published`
  * *Body:* `No holiday calendar covers your location for this leave year. Working days cannot be auto-calculated. Please contact HR.`

---

### 3.3 Section 1: Leave Balances (Cards Grid)
Displays 4 responsive cards (1 per leave type resolved from the employee's active policy):

| Element | Description & Rules |
| :--- | :--- |
| **Type Badge** | Colored badge using the leave type's assigned token (`success`, `info`, `warning`, `neutral`). |
| **Available Days** | Large prominent number + label: `X days left`. |
| **Progress Bar** | Visual meter indicating quota consumed: `(usedDays / totalDays) * 100`. Turns amber/danger at > 80% usage. |
| **Quota Subtext** | `Used: {usedDays} of {totalDays}`. |
| **Pending Counter** | If pending requests exist: `Pending: {pendingDays} day(s)` in subtle text. |
| **Unlimited Type** | For LOP or types without ceiling: Displays `No quota limit` with `Used: {usedDays} days`. |

---

### 3.4 Section 2: Team Approvals Queue (Manager View)
*Rendered only if the logged-in user has pending approval steps for direct or indirect reportees.*

* **Header:** `Team Approvals` · Subtitle: `Leave requests awaiting your decision`
* **Table Columns:**
  1. **Employee:** Avatar + Full Name + Department.
  2. **Leave:** Type badge (e.g., `CL`) + Duration (`2 day(s)`) + Tag if cancellation (`Cancellation`).
  3. **Dates:** `YYYY-MM-DD` to `YYYY-MM-DD` (e.g., `Nov 12 – Nov 13, 2026`).
  4. **Reason:** Truncated text with full tooltip.
  5. **Actions:** 
     * `Approve` button (Primary, size sm).
     * `Reject` button (Secondary, size sm). Opens Rejection Modal requiring a minimum 3-character reason.

---

### 3.5 Section 3: My Leave History
* **Header:** `My Leave History` · Subtitle: `Track approval status or cancel pending leave requests`
* **Toolbar:**
  * **Status Filter:** Dropdown with `All Requests`, `Pending Review`, `Approved`, `Rejected`, `Cancelled`.
  * **Counter:** `Showing X request(s)`.
* **Table Columns:**
  1. **Leave Type:** Badge with configured color tone.
  2. **Start Date:** `YYYY-MM-DD`.
  3. **End Date:** `YYYY-MM-DD`.
  4. **Days & Session:** e.g., `1.0 day(s)` or `0.5 day(s) (First half)`.
  5. **Reason:** Text summary.
  6. **Status:** Colored badge (`Pending` - warning, `Approved` - success, `Rejected` - danger, `Cancelled` - neutral).
  7. **Actions:**
     * `Details` (Ghost button): Opens Request Details Modal.
     * `Cancel` (Danger button): Only visible for `pending` requests. Opens confirmation modal.

---

### 3.6 Section 4: Upcoming Holidays
* **Header:** `Upcoming Holidays` · Subtitle: `Holidays from your holiday calendar for this leave year`
* **Card Grid (3 columns):**
  * **Holiday Icon:** Calendar icon.
  * **Holiday Name:** Bold title (e.g., `Deepavali`, `New Year's Day`).
  * **Type Tag:** `Optional` badge (warning) if floating holiday; `Mandatory` if public.
  * **Timing Tag:** `Upcoming` (info) or `Past` (neutral).
  * **Date & Day:** e.g., `2026-11-08 • Sunday`.

---

## 4. Modals & Interactive Flows

### 4.1 Apply Leave Modal / Drawer
Triggered by the primary CTA `Apply for Leave`.

* **Form Fields:**
  1. **Leave Type (Select):** Lists available types with real-time balance badge.
  2. **Policy Guidelines Banner:** Shows type instructions (e.g., `Sick leave beyond 2 days requires a doctor certificate`).
  3. **Start Date & End Date (Date Inputs):**
     * Start Date $\le$ End Date validation.
     * Past dates blocked if exceeding backdate window.
  4. **Duration / Session (Select):** 
     * Appears when `startDate === endDate` and leave type allows half-day.
     * Options: `Full Day`, `First Half (Morning)`, `Second Half (Afternoon)`.
  5. **Live Duration Summary Card:**
     * `Selected: X day(s) • Available Balance: Y day(s)`.
     * If $X > Y$: Warning alert `Check your balance: You have requested more days than available.`
  6. **Reason (Input / Textarea):** Mandatory explanation for the leave request.
* **Footer Actions:**
  * `Cancel` (Secondary button).
  * `Submit Application` (Primary button). Disabled if inputs are invalid or days $\le 0$.

---

### 4.2 Leave Cancellation Confirmation Modal
Triggered when clicking `Cancel` on a pending request.

* **Modal Title:** `Confirm Leave Cancellation`
* **Content:**
  * *Confirmation prompt:* `Are you sure you want to cancel your {leaveTypeName} request from {startDate} to {endDate} ({totalDays} day(s))?`
  * *Ledger Notice:* `Your leave balance will be restored automatically to your available quota.`
* **Footer Actions:**
  * `Keep Request` (Secondary button).
  * `Yes, Cancel Leave` (Danger button).

---

### 4.3 Leave Request Details Modal
Triggered when clicking `Details` on any request.

* **Modal Title:** `Leave Request Details`
* **Grid Content:**
  * Leave Type, Current Status, Applied On timestamp.
  * Date Range & Effective Duration.
  * Rejection reason (if rejected).
  * Full application reason text.

---

## 5. Security & Isolation Rules

1. **Tenant & Company Scoped:** Queries filter strictly by `tenant_id` and `company_id`.
2. **Employee Isolation:** An employee can only view, apply, and cancel their own requests (`employee_id === ctx.id`).
3. **Manager Scope for Approvals:** Only approval steps where `approver_employee_id === ctx.id` are returned in the team approvals list.
4. **Ledger Integrity:** Cancelling an application immediately writes a `usage_release` transaction to `leave_balance_transactions`, guaranteeing balance consistency.
