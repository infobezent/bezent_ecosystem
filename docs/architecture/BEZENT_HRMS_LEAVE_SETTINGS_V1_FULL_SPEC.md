# BEZENT HRMS Leave Module — Leave Settings V1 Full Specification (All Tabs)

> **Document Status:** APPROVED by Product Owner on 2026-10-30 (all recommendations D1–D10 accepted)
> **Document Version:** `1.0.1`
> **Branch:** `feat/hrms-leave-settings-v1`
> **Module Paths:** `apps/api/src/applications/hrms/leave` · `apps/web/src/applications/hrms/settings/leave`
> **Governance:** Subservient to `AGENTS.md`. Tab 1 (General Settings) detail remains authoritative in
> [`BEZENT_Leave_General_Settings_V1_Final_Requirements.md`](BEZENT_Leave_General_Settings_V1_Final_Requirements.md);
> this document summarises it and specifies the remaining six tabs plus the shared leave core they depend on.
> **Change Control:** No new tab, table, or engine beyond the already-built Tabs 1–3 is implemented until the
> Product Owner approves this document (Section 12). Approval may be granted per phase.

---

## 1. Purpose & Scope

Leave Settings is the single place where a company configures **how leave works**: the leave year, the types of
leave, who is entitled to what, how balances grow and reset, which combinations are restricted, which days are
holidays, and who approves. Every downstream surface — ESS _Apply Leave_, HR leave queue, balances, attendance
`on_leave` marking, payroll LOP — reads from these settings.

### 1.1 Tab Map

| #   | Tab                         | Answers the question                                        | Status today                        |
| --- | --------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| 1   | **General Settings**        | When does the leave year run and how are days counted?      | Built (hardening pending)           |
| 2   | **Leave Types**             | What kinds of leave exist and what are their request rules? | Built (hardening pending)           |
| 3   | **Leave Policies**          | Which employees get how much of each leave type?            | Built (entitlements missing)        |
| 4   | **Accrual & Carry Forward** | How do balances grow, roll over, lapse, or encash?          | Not built                           |
| 5   | **Restrictions**            | Which combinations, periods, and frequencies are blocked?   | Not built                           |
| 6   | **Holidays**                | Which dates are holidays, per location?                     | Not built (ESS uses hardcoded list) |
| 7   | **Approval Workflow**       | Who approves, in what order, with what SLA?                 | Not built (no approval API exists)  |

### 1.2 Responsibility Boundaries (no field lives in two places)

| Concern                                                                                                    | Owner tab               | Not configured in                                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| Leave year, day counting, rounding, back/advance windows                                                   | General Settings        | Types, Policies                                                  |
| Request-shape rules of a type (unit, min/max per request, documents, half-day, sandwich, probation/notice) | Leave Types             | Policies                                                         |
| **Quota amount** per type per employee group                                                               | Leave Policies          | Leave Types (`max_per_year` becomes a hard ceiling only)         |
| Accrual frequency, pro-rata, carry-forward, lapse, encashment                                              | Accrual & Carry Forward | Leave Types (type only holds on/off flags)                       |
| Cross-type clubbing, blackout periods, minimum gap, monthly frequency caps                                 | Restrictions            | Leave Types                                                      |
| Holiday dates & optional-holiday quota                                                                     | Holidays                | General Settings                                                 |
| Approval levels, SLA, auto-approval                                                                        | Approval Workflow       | Leave Types (type holds only an optional `workflow_id` override) |

### 1.3 Explicit V1 Exclusions

1. Hour-based leave (days only; `0.5` / `1.0` increments).
2. Location-specific leave year.
3. Requests spanning leave-year or go-live boundaries (rejected, never auto-split).
4. Multi-day requests with partial (half) first/last day.
5. `custom` policy scope / rule-builder eligibility (deferred to V2 — see Decision D3).
6. More than two approval levels.
7. Encashment payout execution (V1 produces payroll handover records only).

---

## 2. Shared Leave Core (prerequisite for Tabs 3–7)

The settings tabs are useless unless leave requests and balances actually consume them. Today requests and
balances use a hardcoded enum (`annual | sick | casual | unpaid`) with hardcoded quotas (18/12/6). V1 replaces
this with the following core contract.

### 2.1 Data model changes

| Table                                | Change                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `employee_leave_requests`            | Add `leave_type_id` (FK `leave_types.id`), `policy_id`, `settings_version_id`; change `total_days` → `decimal(5,2)`; keep `session`, `calculation_snapshot`; add `approval_stage`, `submitted_by_user_id`, `on_behalf_reason`. Legacy `leave_type` enum kept read-only during transition, then dropped in a later migration.                                 |
| `employee_leave_balances`            | Add `leave_type_id`, `cycle_start_date`, `cycle_end_date`; change `total_days/used_days/pending_days` → `decimal(6,2)`; add `carried_forward_days`, `accrued_days`, `adjusted_days`. Unique on `(company_id, employee_id, leave_type_id, cycle_start_date)`.                                                                                                 |
| **NEW** `leave_balance_transactions` | Append-only ledger: `id, tenant_id, company_id, employee_id, leave_type_id, cycle_start_date, txn_type (opening, accrual, usage_reserve, usage_release, usage_confirm, adjustment, carry_forward_in, lapse, encashment), days decimal(6,2), reference_type, reference_id, reason, created_by_user_id, created_at`. Balance row = materialised sum of ledger. |
| **NEW** `leave_request_approvals`    | One row per approval step: `request_id, level, approver_employee_id, action (pending, approved, rejected, escalated, skipped), acted_by_user_id, comment, acted_at, sla_due_at`.                                                                                                                                                                             |

### 2.2 Migration of existing data

1. On first access per company, seed four default leave types if none exist: **Annual Leave (AL)**, **Casual Leave
   (CL)**, **Sick Leave (SL)**, **Loss of Pay (LOP)** — and one default company-wide policy "Standard Leave Policy"
   granting AL 18 / CL 6 / SL 12 / LOP unlimited (current hardcoded behaviour preserved).
2. Backfill `leave_type_id` on requests/balances: `annual→AL`, `casual→CL`, `sick→SL`, `unpaid→LOP`.
3. Write one `opening` ledger transaction per existing balance row.
4. Remove `ensureDefaultLeaveBalances` hardcoded quotas; balances are created from the employee's resolved policy.
5. Remove duplicated apply/cancel logic in `ess.service.ts`; ESS calls `LeaveService` (single source of truth).

### 2.3 Request evaluation pipeline (server-side, in order)

```
1. Resolve settings version  (General Settings, at submission timestamp)
2. Resolve leave type        (must be active, visible, effective on dates)
3. Resolve employee policy   (Section 5.4) → type must be linked; else reject
4. Window checks             (go-live, back-dated, advance, payroll lock, leave-year boundary)
5. Eligibility               (probation / notice period / gender-specific if configured)
6. Duration                  (day counting × holidays × weekly-offs × sandwich rule × half-day session)
7. Type limits               (min/max per request, max consecutive, max per month/year ceiling)
8. Restrictions              (clubbing, blackout, min gap, frequency caps)
9. Documents                 (required? threshold days?)
10. Balance                  (available = entitlement + CF + adjustments − used − pending; negative limit)
11. Persist                  (request + sealed calculation_snapshot + usage_reserve ledger txn) in ONE transaction
12. Route                    (create approval steps from workflow, or auto-approve)
```

Every rejection returns `400` with a stable `code` (e.g. `LEAVE_BACKDATE_LIMIT`, `LEAVE_TYPE_NOT_IN_POLICY`) and a
human message. The full error-code catalogue is listed in Appendix A.

---

## 3. Tab 1 — General Settings (summary)

Authoritative detail: `BEZENT_Leave_General_Settings_V1_Final_Requirements.md` (13 PO decisions, 20 scenarios).

| Setting                    | Type                                            | Default           | Rule                                                                        |
| -------------------------- | ----------------------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| `leave_year_cycle`         | `calendar_year` \| `financial_year` \| `custom` | `calendar_year`   | Locked after activation                                                     |
| `custom_year_start_date`   | `MM-DD`                                         | `null`            | Required if custom; real calendar date; no `02-29`; locked after activation |
| `go_live_date`             | `YYYY-MM-DD`                                    | provisioning date | Real date; immutable after activation                                       |
| `day_counting_method`      | `working_days` \| `calendar_days`               | `working_days`    | Versioned                                                                   |
| `balance_precision`        | `whole_numbers` \| `half` \| `two_decimals`     | `two_decimals`    | Display only, lossless                                                      |
| `balance_rounding_rule`    | `nearest` \| `round_up` \| `round_down`         | `nearest`         | 0.5 increment, half-up                                                      |
| `max_backdated_days`       | int 0–90                                        | 7                 | Governs `startDate`                                                         |
| `max_advance_booking_days` | int 1–365                                       | 180               | Governs `endDate`; no bypass                                                |

### 3.1 Hardening required on the built implementation

1. Validate every enum and integer server-side (reject `NaN`, non-integers, unknown enum values with `400`).
2. Validate real calendar dates (`2026-02-31` rejected), and reject an invalid `effectiveFrom`.
3. GET must be side-effect free: default provisioning and activation run in an idempotent, transactional path.
4. `publishNewVersion` and `ensureDefaultSettings` run inside one DB transaction; the optimistic version check is a
   conditional `UPDATE ... WHERE current_version_number = ?` so concurrent publishes return `409`, never `500`.
5. Scheduled versions are promoted to the live row when `effectiveFrom` passes (read-path resolution by
   `effectiveFrom ≤ now` is authoritative; the live row is a cache).
6. Post-activation lock also covers `custom_year_start_date`, and compares against the **latest published** version.
7. "Today" is evaluated in the company timezone, not UTC.

---

## 4. Tab 2 — Leave Types

### 4.1 Purpose

Defines each kind of leave and the **shape** of a valid request for it. Does not define how many days anyone gets.

### 4.2 List view

- Summary cards: Total · Active · Inactive · Paid · Unpaid (`partly_paid` counted separately as "Partly Paid").
- Filters: search (name/code), status, category, paid classification.
- Columns: Color chip + Name · Code · Category · Paid · Unit · Half-day · Linked policies count · Status · Actions.
- Actions (requires manage): View · Edit · Activate/Deactivate. **No hard delete** — archive only when unused.

### 4.3 Fields

| Group          | Field                                         | Type / Values                                                                                                   | Default               | Validation                                                                 |
| -------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| Identity       | `name`                                        | text 2–100                                                                                                      | —                     | Unique per company (case-insensitive)                                      |
|                | `code`                                        | `[A-Z0-9_]{1,20}`                                                                                               | —                     | Unique per company; **immutable once the type has any request or balance** |
|                | `short_label`                                 | text ≤ 50                                                                                                       | first 50 of name      | —                                                                          |
|                | `color_token`                                 | Design System token (`success, warning, info, danger, neutral` (no `accent` badge exists in the Design System)) | by paid class         | Must be a known token                                                      |
|                | `description`, `instructions`                 | text                                                                                                            | null                  | Instructions shown to employee on Apply                                    |
| Classification | `category`                                    | `paid, unpaid, statutory, special_event, compensatory, optional_holiday, loss_of_pay`                           | `paid`                | —                                                                          |
|                | `payroll_impact`                              | `paid, unpaid, partly_paid`                                                                                     | derived from category | Must be consistent: `unpaid`/`loss_of_pay` ⇒ `unpaid`                      |
|                | `is_tracked`                                  | bool                                                                                                            | true                  | Untracked types (e.g. LOP) skip balance check                              |
|                | `visible_to_employee`                         | bool                                                                                                            | true                  | Hidden types are HR-applied only                                           |
| Request shape  | `unit`                                        | `days` (V1 only)                                                                                                | `days`                | `half_days`/`hours` rejected in V1                                         |
|                | `allow_half_day`                              | bool                                                                                                            | true                  | **New column** (currently validated but not saved)                         |
|                | `min_per_request`                             | decimal                                                                                                         | 1.0 (0.5 if half-day) | > 0; ≥ 1 when half-day disabled; multiple of 0.5                           |
|                | `max_per_request`                             | decimal \| null                                                                                                 | null                  | ≥ min_per_request                                                          |
|                | `max_consecutive_days`                        | int \| null                                                                                                     | null                  | ≥ min_per_request                                                          |
|                | `max_per_month`                               | decimal \| null                                                                                                 | null                  | ≤ max_per_year                                                             |
|                | `max_per_year`                                | decimal \| null                                                                                                 | null                  | Hard ceiling regardless of policy quota                                    |
| Day treatment  | `weekly_off_treatment`                        | `inherit, count, exclude`                                                                                       | `inherit`             | inherit = General Settings method                                          |
|                | `holiday_treatment`                           | `inherit, count, exclude`                                                                                       | `inherit`             | —                                                                          |
|                | `sandwich_rule_enabled`                       | bool                                                                                                            | false                 | When on: weekly-offs/holidays between two leave days are charged           |
| Documents      | `document_requirement`                        | `none, optional, mandatory, mandatory_after_n_days`                                                             | `none`                | —                                                                          |
|                | `document_threshold_days`                     | int ≥ 1                                                                                                         | null                  | Required when `mandatory_after_n_days`                                     |
|                | `certificate_type`                            | text ≤ 100                                                                                                      | null                  | e.g. "Medical certificate"                                                 |
| Eligibility    | `allowed_in_probation`                        | bool                                                                                                            | true                  | —                                                                          |
|                | `allowed_in_notice_period`                    | bool                                                                                                            | false                 | —                                                                          |
|                | `gender_eligibility`                          | `all, female, male`                                                                                             | `all`                 | **New column** — for maternity/paternity types                             |
| Balance        | `negative_balance_enabled`                    | bool                                                                                                            | false                 | —                                                                          |
|                | `negative_balance_limit`                      | decimal ≥ 0.5                                                                                                   | null                  | Required when enabled (currently never saved)                              |
|                | `carry_forward_enabled`, `encashment_enabled` | bool                                                                                                            | false                 | Detail lives in Tab 4                                                      |
| Attendance     | `attendance_status_code`                      | text ≤ 20                                                                                                       | = code                | Shown in attendance grid                                                   |
|                | `counts_as_present`                           | bool                                                                                                            | false                 | e.g. On-duty-like types                                                    |
|                | `counts_toward_service`                       | bool                                                                                                            | true                  | —                                                                          |
| Visibility     | `team_calendar_visibility`                    | `leave_type, generic_leave, none`                                                                               | `generic_leave`       | —                                                                          |
| Routing        | `workflow_id`                                 | FK workflow \| null                                                                                             | null                  | Override of default workflow (Tab 7)                                       |
| Lifecycle      | `effective_from` / `effective_to`             | date                                                                                                            | today / null          | to ≥ from                                                                  |
|                | `is_active`                                   | bool                                                                                                            | true                  | —                                                                          |

Fields removed from the UI (kept only as DB defaults until a later migration): `grant_method` (moved to Tab 4).

### 4.4 Business rules

1. **Deactivate**: blocks new applications; existing requests/balances untouched. If the type is linked to an
   active/scheduled policy, the response returns a warning listing those policies.
2. **Compensatory** category draws from `attendance_comp_off_entitlements` (earned via Attendance comp-off),
   not from a policy quota. The policy cannot assign a quota to a compensatory type.
3. **Optional holiday** category draws from the optional-holiday quota in Tab 6 and may only be applied on a date
   marked optional in the employee's holiday calendar.
4. Usage is detected by `leave_type_id`, never by code heuristics.

### 4.5 Acceptance criteria

- Creating `CL` twice in one company → `409 Conflict`.
- Renaming code of a type with one historical request → `400 LEAVE_TYPE_CODE_LOCKED`.
- `allow_half_day=false` + `min_per_request=0.5` → `400`.
- `category=loss_of_pay` + `payroll_impact=paid` → `400`.
- Unknown `category` value → `400` (not `500`).

---

## 5. Tab 3 — Leave Policies

### 5.1 Purpose

Assigns leave types **and quotas** to groups of employees for a date range.

### 5.2 Fields

| Field                                                          | Type                                                                                                                                | Rule                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `code`, `description`                                  | as today                                                                                                                            | unique per company                                                                                                                       |
| `scope`                                                        | `company, department, location, employment_type`                                                                                    | `custom` removed in V1 (D3)                                                                                                              |
| `scope_id`                                                     | FK                                                                                                                                  | **Required** unless `company`; must exist in `departments` / `locations` / employment-type enum; picked from a dropdown, never free text |
| `scope_name`                                                   | derived                                                                                                                             | Server fills from referenced record                                                                                                      |
| `effective_from` / `effective_to`                              | date                                                                                                                                | real dates; to ≥ from                                                                                                                    |
| `priority`                                                     | int 0–100                                                                                                                           | Tie-breaker only (Section 5.4)                                                                                                           |
| `status`                                                       | `draft, scheduled, active, archived`                                                                                                | Lifecycle 5.3                                                                                                                            |
| **Entitlements** (new child table `leave_policy_entitlements`) | per linked type: `leave_type_id`, `annual_quota` decimal (null = unlimited for untracked types), `override_max_per_year` (optional) | Every linked type must exist, belong to the company, be active, and not be `compensatory`                                                |

`linked_leave_type_ids` JSON is replaced by the entitlements table (migrated 1:1 with the type's current
`max_per_year` as the quota).

### 5.3 Lifecycle

```
draft ──activate──▶ scheduled (effective_from > today) ──[daily job at company midnight]──▶ active
draft ──activate──▶ active    (effective_from ≤ today)
active/scheduled ──archive──▶ archived   (terminal; history preserved)
active ──[effective_to passed, daily job]──▶ archived
```

- Editing an **active** policy's scope, dates or entitlements re-runs the overlap check (today it is skipped).
- Entitlement changes on an active policy apply from the next accrual/cycle; they never rewrite past ledgers.

### 5.4 Policy resolution (one effective policy per employee per date)

1. Candidate policies = `active` policies whose scope matches the employee on that date.
2. Most specific scope wins: `employment_type` > `location` > `department` > `company`.
3. Same specificity → higher `priority` wins → then later `effective_from`.
4. Overlap rule: two active/scheduled policies with the **same scope and same scope_id** and overlapping dates are
   forbidden (`409`). Different scope_ids never conflict (fixes the current "all departments conflict" bug).
5. No matching policy → employee cannot apply (`400 LEAVE_NO_POLICY`) and HR sees the employee in a
   "No policy assigned" warning on the policy list.

### 5.5 Acceptance criteria

- Two active department policies for _Engineering_ and _Sales_ → both allowed.
- Second active policy for _Engineering_ overlapping dates → `409`.
- Employee in Engineering with company policy (AL 18) and Engineering policy (AL 21) → resolves AL 21.
- Scheduled policy with `effective_from = tomorrow` → becomes `active` after the daily job runs.
- Linking a deleted / other-company leave type id → `400`.

---

## 6. Tab 4 — Accrual & Carry Forward

### 6.1 Purpose

Defines, per leave type, how the policy quota becomes balance, and what happens at cycle end.

### 6.2 Accrual rules (table `leave_accrual_rules`, one per leave type, versioned by `effective_from`)

| Field                     | Values                                                                 | Default          | Notes                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| `grant_method`            | `upfront_annual`, `monthly`, `quarterly`, `half_yearly`, `manual_only` | `upfront_annual` |                                                                                                           |
| `accrual_timing`          | `cycle_start`, `period_start`, `period_end`                            | `period_start`   | For periodic methods                                                                                      |
| `pro_rata_on_joining`     | bool                                                                   | true             | Joiners get quota × remaining-period fraction                                                             |
| `joining_cutoff_day`      | int 1–28                                                               | 15               | Joined after this day of a period → that period not credited                                              |
| `pro_rata_on_exit`        | bool                                                                   | true             | Exit mid-cycle → unearned upfront grant recovered via `adjustment` txn                                    |
| `accrue_during_probation` | bool                                                                   | true             | If false, credit starts after confirmation (optionally back-credited — `backcredit_after_probation` bool) |
| `accrue_during_lop`       | bool                                                                   | true             | If false, monthly accrual reduced proportionally to LOP days                                              |

Rounding uses General Settings `balance_rounding_rule` with 0.5 increment and fixed-point arithmetic.

### 6.3 Carry forward & lapse

| Field                         | Values                                             | Default |
| ----------------------------- | -------------------------------------------------- | ------- |
| `carry_forward_enabled`       | bool (mirrors Leave Type flag)                     | false   |
| `max_carry_forward_days`      | decimal ≥ 0 \| null (unlimited)                    | null    |
| `max_accumulation_days`       | decimal \| null — absolute cap on balance after CF | null    |
| `carry_forward_expiry_months` | int 1–12 \| null — CF days lapse after N months    | null    |
| `lapse_remaining`             | bool — days above CF cap lapse at cycle end        | true    |

### 6.4 Encashment

| Field                   | Values                                    | Default     |
| ----------------------- | ----------------------------------------- | ----------- |
| `encashment_enabled`    | bool (mirrors Leave Type flag)            | false       |
| `encashment_trigger`    | `cycle_end`, `exit`, `both`               | `cycle_end` |
| `min_balance_to_retain` | decimal ≥ 0                               | 0           |
| `max_encashable_days`   | decimal \| null                           | null        |
| `encashment_basis`      | `basic`, `gross` (label for payroll only) | `basic`     |

V1 produces a payroll handover record only (no amount calculation).

### 6.5 Year-end processing

- A **cycle-close job** per company runs at the leave-year boundary (company timezone), idempotent per
  `(company, cycle_start_date)`.
- Order per employee & type: confirm pending usages stay pending in the old cycle → compute closing balance →
  encash (if configured) → carry forward up to cap → lapse remainder → open new cycle balance with
  `carry_forward_in` + first accrual.
- HR can run a **dry-run preview** that lists per-employee CF / lapse / encash amounts before the job commits.
- Every movement is a ledger transaction; nothing overwrites balance rows directly.

### 6.6 Acceptance criteria

- Monthly accrual, quota 18, joined on the 10th with cutoff 15 → first month credited 1.5.
- Joined on the 20th → first month credited 0.
- Closing 12, CF cap 5, encash on, retain 2, max encash 3 → encash 3, CF 5, lapse 2.
- Re-running the cycle-close job → no duplicate ledger rows.

---

## 7. Tab 5 — Restrictions

Company-level rules spanning more than one leave type. (Per-type rules — sandwich, max consecutive, documents —
stay on the Leave Type.)

| Rule                                       | Configuration                                                                                                | Behaviour                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Clubbing**                               | Matrix of type pairs: `allowed` / `blocked`                                                                  | Blocked pair cannot be adjacent (only weekly-offs/holidays between them count as adjacent)             |
| **Blackout periods**                       | name, date range, applicable scope (company/department/location), applicable types, `allow_hr_override` bool | Requests overlapping a blackout are rejected for ESS; HR on-behalf may override with reason if allowed |
| **Minimum notice**                         | per type: min days between submission and `startDate` (0–90)                                                 | e.g. Annual Leave needs 3 days' notice; Sick Leave 0                                                   |
| **Minimum gap**                            | per type: min working days between two requests of that type                                                 | Prevents splitting to dodge `max_consecutive_days`                                                     |
| **Frequency cap**                          | per type: max requests per month / per cycle                                                                 | e.g. Casual Leave max 2 requests / month                                                               |
| **Team concurrency** (optional V1, see D7) | max % or count of a department on leave the same day                                                         | Warn manager, or block (configurable)                                                                  |

Restrictions are stored in `leave_restriction_rules` (`rule_type`, `config` JSON validated by a per-type schema,
`is_active`, `effective_from`), versioned append-only like General Settings.

**Acceptance:** CL Friday + AL Monday with CL–AL blocked → rejected `LEAVE_CLUBBING_BLOCKED`; AL request inside a
"Year-end freeze" blackout → rejected for ESS, accepted for HR with override reason.

---

## 8. Tab 6 — Holidays

Replaces the hardcoded ESS holiday list and is the authoritative source for `working_days` counting.

### 8.1 Model

- `holiday_calendars`: `name`, `year` (leave-year cycle start), `status` (`draft`, `published`), `is_default`.
- `holiday_calendar_locations`: calendar ↔ `locations` (a location has exactly one published calendar per year;
  employees without a location use the default calendar).
- `holidays`: `calendar_id`, `date`, `name`, `type` (`mandatory`, `optional`), `description`.
- `optional_holiday_quota` on the calendar: int 0–10 (how many optional holidays an employee may take).

### 8.2 UI

- Calendar list per year with status, location count, holiday count.
- Calendar detail: table + month view; add/edit/delete holiday (draft only); **Publish** locks the calendar.
- **Copy from previous year** and **CSV import** (`date,name,type`) with row-level validation report.
- Editing a published calendar creates a revision; requests already submitted keep their sealed snapshot.

### 8.3 Rules

- No two holidays on the same date in one calendar.
- Holiday dates must fall inside the calendar's leave year.
- Missing published calendar for an employee's location under `working_days` → submission blocked
  (General Settings Correction I — no silent Mon–Fri fallback).
- Weekly-offs come from the employee's work schedule (`employee_work_schedules`), not from this tab.

---

## 9. Tab 7 — Approval Workflow

### 9.1 Model

- `leave_approval_workflows`: `name`, `is_default` (exactly one default per company), `levels` (1–2), `is_active`.
- Per level: `approver_type` (`reporting_manager`, `department_head`, `hr_role`, `specific_employee`),
  `approver_ref` (role id / employee id when applicable), `sla_hours` (1–168), `on_sla_breach`
  (`escalate_to_next`, `notify_only`, `auto_approve`).
- Workflow-level options:
  - `auto_approve_up_to_days` decimal \| null (e.g. 0.5-day requests auto-approved)
  - `skip_if_approver_is_applicant` bool (default true → moves to next level)
  - `fallback_approver` (`hr_role` id) when the resolved approver is missing/inactive
  - `cancellation_requires_approval` bool — for cancelling an **approved** future leave
  - `allow_self_approval_for_hr` bool (default false)
- Leave Type `workflow_id` overrides the default workflow.

### 9.2 Runtime behaviour

1. On submit: create `leave_request_approvals` rows from the workflow; request status `pending`, stage `level_1`.
2. Approve at last level → `approved`: ledger `usage_confirm` (pending → used), attendance marks `on_leave` /
   `half_day_leave`, PPA record if payroll-locked override (General Settings D.5).
3. Reject at any level → `rejected`: ledger `usage_release`.
4. SLA job (hourly) applies `on_sla_breach`.
5. Cancel: pending → `cancelled` + release; approved & future → `cancellation_pending` if required, else cancelled
   - release; approved & past → only HR adjustment.
6. New API: `GET /hrms/leave/requests` (queue, filters by stage/approver), `POST /hrms/leave/requests/:id/approve`,
   `POST /hrms/leave/requests/:id/reject` (comment required), guarded by `hrms.leave.approve`; approver must be
   the resolved approver of the current level (or hold HR override).

This mirrors the existing Attendance regularization manager → HR stage pattern.

---

## 10. Permissions

| Permission                                                                                   | Grants                                       |
| -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `hrms.leave.settings_view` (alias `hrms.leave.settings.view`)                                | Read all seven tabs                          |
| `hrms.leave.settings_manage` (alias `hrms.leave.settings.manage`)                            | Edit all seven tabs, run cycle-close dry run |
| `hrms.leave.year_end_process` (**new**)                                                      | Commit cycle-close job                       |
| `hrms.leave.view`                                                                            | HR leave queue & balances (read)             |
| `hrms.leave.approve`                                                                         | Approve / reject as resolved approver        |
| `hrms.leave.apply_on_behalf`, `hrms.leave.backdated_override`, `hrms.leave.payroll_override` | As General Settings D.5                      |
| `hrms.leave.balance_adjust` (**new**)                                                        | Manual ledger adjustments with reason        |
| `ess.leave.view`, `ess.leave.apply`                                                          | Employee self-service                        |

UI shows edit controls only when the user holds `settings_manage` (now wired for Tabs 1–3).
`hrms.leave.view` alone must **not** grant read of settings — settings read requires `settings_view` or
`hrms.settings.view` (D8).

---

## 11. Audit & Cross-Cutting Rules

- Every create/update/status change on any settings entity writes to `audit_logs` with before/after JSON, actor,
  and reason (reason mandatory for General Settings, policy activation/archive, restriction and workflow changes).
- All reads/writes scoped by `(tenant_id, company_id)` in the repository layer.
- All multi-row writes run in a DB transaction; uniqueness races surface as `409`, never `500`.
- Server-side validation of every enum, number, and date; frontend validation is UX only.
- IDs generated via `generateSurrogateId` (replaces hand-built `lvt_${Date.now()}` / `pol_${Date.now()}`).
- Test fixtures live in `__tests__`, not in production components.

---

## 12. Open Product Owner Decisions

| #   | Decision needed                                                                      | Recommendation                                                       |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| D1  | Quota location: policy entitlement (per type per group) vs leave type `max_per_year` | **Policy entitlement**; type `max_per_year` = hard ceiling           |
| D2  | Accrual & CF configured per leave type (company-wide) or per policy × type           | **Per leave type** in V1; per-policy override in V2                  |
| D3  | Drop `custom` policy scope from V1                                                   | **Yes, drop** (no rule builder exists)                               |
| D4  | Policy resolution order                                                              | **employment_type > location > department > company**, then priority |
| D5  | Seed default leave types + "Standard Leave Policy" for existing companies            | **Yes**, preserving today's 18/6/12 quotas                           |
| D6  | Max approval levels in V1                                                            | **2** (manager → HR)                                                 |
| D7  | Include team-concurrency restriction in V1                                           | **Warn-only** in V1                                                  |
| D8  | Can `hrms.leave.view` (managers) read settings                                       | **No** — settings read needs `settings_view`                         |
| D9  | Encashment in V1                                                                     | **Handover record only**, no amount                                  |
| D10 | Optional holidays consume a separate quota (Tab 6) instead of a leave balance        | **Yes**                                                              |

---

## 13. Implementation Plan (one PR per phase, after approval)

| Phase  | Scope                                                                                                                                       | Depends on |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **P0** | Merge-blocker fixes (done): migrations, policies loop, `canManage`, formatting                                                              | —          |
| **P1** | Hardening of Tabs 1–3 per §3.1, §4, §5 (validation, transactions, scope ids, overlap fixes, lifecycle job, entitlements table)              | P0 — done  |
| **P2** | Shared Leave Core §2: `leave_type_id`, decimals, ledger, seed + backfill migration, single `LeaveService`, request pipeline steps 1–7, 9–11 | P1         |
| **P3** | Tab 6 Holidays + replace ESS hardcoded holidays; working-days counting live                                                                 | P2         |
| **P4** | Tab 7 Approval Workflow + HR queue API/UI + attendance `on_leave` sync                                                                      | P2         |
| **P5** | Tab 5 Restrictions (pipeline step 8)                                                                                                        | P2         |
| **P6** | Tab 4 Accrual, Carry Forward, cycle-close job, dry run                                                                                      | P2, P3     |

Each phase ships with migrations verified on a fresh database, API + UI tests, and passes
`typecheck · lint · format:check · test · build`.

---

## 14. Approval Checklist

- [ ] Tab map and responsibility boundaries (§1.1, §1.2) accepted
- [ ] Shared Leave Core and data migration approach (§2) accepted
- [ ] Leave Types field catalogue and rules (§4) accepted
- [ ] Policy entitlements, lifecycle and resolution (§5) accepted
- [ ] Accrual, carry-forward, encashment and year-end processing (§6) accepted
- [ ] Restrictions catalogue (§7) accepted
- [ ] Holidays model (§8) accepted
- [ ] Approval workflow model (§9) accepted
- [ ] Decisions D1–D10 (§12) answered
- [ ] Phase order (§13) accepted

---

## Appendix A — Rejection Codes (request pipeline)

| Code                                                                        | Message (example)                                                                |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `LEAVE_BEFORE_GO_LIVE`                                                      | Leave applications cannot precede company go-live date (2026-11-01).             |
| `LEAVE_CROSSES_GO_LIVE`                                                     | Leave requests cannot cross company go-live date boundary.                       |
| `LEAVE_CROSSES_YEAR`                                                        | Requests cannot span across leave year boundaries.                               |
| `LEAVE_BACKDATE_LIMIT`                                                      | Leave requests cannot be backdated more than 7 days.                             |
| `LEAVE_BACKDATE_HARD_CAP`                                                   | Requests cannot be backdated beyond the absolute system cap of 90 calendar days. |
| `LEAVE_ADVANCE_LIMIT`                                                       | Leave requests cannot be scheduled more than 180 days in advance.                |
| `LEAVE_PAYROLL_LOCKED`                                                      | The attendance period covering {date} has been locked for payroll processing.    |
| `LEAVE_TYPE_INACTIVE`                                                       | This leave type is not currently available.                                      |
| `LEAVE_NO_POLICY`                                                           | No leave policy is assigned to you. Please contact HR.                           |
| `LEAVE_TYPE_NOT_IN_POLICY`                                                  | {type} is not part of your leave policy.                                         |
| `LEAVE_PROBATION_BLOCKED` / `LEAVE_NOTICE_BLOCKED`                          | {type} is not available during probation / notice period.                        |
| `LEAVE_SCHEDULE_MISSING`                                                    | Missing shift schedule or holiday calendar for date {date}.                      |
| `LEAVE_NON_WORKING_HALF_DAY`                                                | Cannot apply for leave on a non-working day when working-day counting is active. |
| `LEAVE_HALF_DAY_MULTI_DATE`                                                 | Multi-day half-day requests are not supported in V1.                             |
| `LEAVE_MIN_PER_REQUEST` / `LEAVE_MAX_PER_REQUEST` / `LEAVE_MAX_CONSECUTIVE` | Duration outside the allowed range for {type}.                                   |
| `LEAVE_MAX_PER_MONTH` / `LEAVE_MAX_PER_YEAR`                                | Monthly / yearly limit for {type} exceeded.                                      |
| `LEAVE_CLUBBING_BLOCKED`                                                    | {typeA} cannot be combined with {typeB}.                                         |
| `LEAVE_BLACKOUT`                                                            | Leave is not allowed during {blackoutName}.                                      |
| `LEAVE_MIN_NOTICE`                                                          | {type} must be applied at least {n} days in advance.                             |
| `LEAVE_MIN_GAP` / `LEAVE_FREQUENCY_CAP`                                     | Too many / too frequent {type} requests.                                         |
| `LEAVE_DOCUMENT_REQUIRED`                                                   | A {certificateType} is required for {type} longer than {n} days.                 |
| `LEAVE_INSUFFICIENT_BALANCE`                                                | Insufficient {type} balance. Available: {a}, Requested: {r}.                     |
| `LEAVE_OVERLAP`                                                             | Leave request overlaps with an existing {status} leave.                          |

---

_End of document. Approved 2026-10-30; implementation proceeds per §13._
