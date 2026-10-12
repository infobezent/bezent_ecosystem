# BEZENT HRMS — Attendance Exceptions V1.0 Implementation Report

> **Classification:** Engineering Delivery Report & Architecture Documentation  
> **Application:** HRMS  
> **Module:** Attendance  
> **Workspace:** Exceptions Case Management V1.0  
> **Status:** Production-Ready & Fully Verified  
> **Date:** October 2026  

---

## 1. Executive Summary

The **Attendance → Exceptions V1.0** case-management workspace has been fully implemented and verified inside the BEZENT modular enterprise platform. This delivery transforms attendance anomaly handling from passive, unstructured error logs into a rigorous, tenant-scoped **investigation and case management workspace**.

The implementation strictly satisfies the **Option B Enterprise layout specification**, preserves the established BEZENT navigation and design system invariants, enforces the **Strict Zero Application CSS Rule** (zero `.css` files under `applications/**`, zero inline `style={{ ... }}` objects), and integrates deeply with existing Daily Attendance logs, Punch Logs, Leave requests, and Regularization systems.

---

## 2. Database Architecture & Persistence (MySQL + Drizzle ORM)

Two dedicated, tenant-isolated tables govern the Exceptions domain:

### 2.1 `attendance_exceptions` Table
- **Primary Key:** `id varchar(64)` (surrogate ID generated via `generateSurrogateId('aexc')`).
- **Multi-Tenancy & Scoping:** `tenant_id varchar(64) NOT NULL`, `company_id varchar(64) NOT NULL`.
- **Identity Links:**
  - `employee_id varchar(64) NULL` — Nullable to gracefully support unmatched/unrecognized punch events while preserving tenant scoping.
  - `workday varchar(10) NULL` — ISO date string (`YYYY-MM-DD`).
- **Classification & Categorization:**
  - `exception_type`: 13 canonical operational anomaly types (`missing_in`, `missing_out`, `late_arrival`, `early_exit`, `insufficient_hours`, `shift_mismatch`, `duplicate_punch`, `unmatched_employee`, `invalid_punch`, `device_sync_failure`, `leave_conflict`, `on_duty_conflict`, `regularization_conflict`).
  - `severity`: 4 tiers (`critical`, `high`, `medium`, `low`).
  - `source`: Ingestion/detection origin (`biometric`, `web`, `mobile`, `kiosk`, `import`, `engine`, `leave_system`, `od_system`, `regularization_system`, `system`).
  - `source_record_type varchar(50) NOT NULL` & `source_record_id varchar(64) NOT NULL`.
- **Workflow State:**
  - `status`: `open` → `assigned` → `in_review` → `pending_action` → `resolved` → `closed`.
  - `assigned_to varchar(64) NULL`, `assigned_queue varchar(64) NULL`.
  - `pending_action_reason varchar(255) NULL`, `pending_action_awaited_from varchar(64) NULL`.
- **Resolution & Integrity Verification:**
  - `resolution_type varchar(64) NULL`, `resolution_notes text NULL`, `resolution_evidence json NULL`.
  - `resolved_at timestamp NULL`, `resolved_by_user_id varchar(64) NULL`.
  - `closed_at timestamp NULL`, `closed_by_user_id varchar(64) NULL`.
- **Deduplication Invariant:**
  - `UNIQUE INDEX idx_att_exc_dedup (tenant_id, company_id, source_record_type, source_record_id, exception_type)` guarantees idempotent detection scans without duplicate case creation.

### 2.2 `attendance_exception_audits` Table
- Append-only immutable audit trail capturing every state change, triage assignment, severity override, and resolution event.
- Supported actions: `detected`, `assigned`, `reassigned`, `status_transitioned`, `severity_overridden`, `pending_action_marked`, `note_added`, `resolution_verified`, `resolved`, `closed`, `reopened`.
- Tracks `actor_user_id`, `old_state (json)`, `new_state (json)`, `notes (text)`, and `created_at`.

---

## 3. Backend Layered Architecture (`apps/api`)

The backend capability strictly adheres to BEZENT's canonical layered domain pattern:
`routes` → `controller` → `service` → `repository` → `Drizzle MySQL`

### 3.1 Registered Endpoints (`/api/v1/hrms/attendance/exceptions`)
1. `GET /api/v1/hrms/attendance/exceptions`:
   - Triggers idempotent anomaly detection scan on the active timeframe (`detectAndSyncExceptions`).
   - Evaluates dual date interpretations (`workday` vs `detected_at`).
   - Returns paginated cases (`items`, `total`, `page`, `limit`, `totalPages`) and exact aggregate counters calculated in MySQL.
2. `GET /api/v1/hrms/attendance/exceptions/:id`:
   - Returns complete case detail, full evidence context (related punch logs, daily attendance records), and chronological audit history.
3. `POST /api/v1/hrms/attendance/exceptions/:id/assign`:
   - Assigns designated reviewer or operational queue. Automatically transitions `open` → `assigned`.
4. `POST /api/v1/hrms/attendance/exceptions/:id/status`:
   - Transitions workflow status (`in_review`, `pending_action`, `closed`, `reopened`).
   - Enforces reason and awaiting party when marking `pending_action`.
5. `POST /api/v1/hrms/attendance/exceptions/:id/severity`:
   - Overrides anomaly severity with mandatory justification reason and creates audit entry.
6. `POST /api/v1/hrms/attendance/exceptions/:id/verify-resolve`:
   - Performs verified resolution check against underlying source records before marking `resolved`.
7. `POST /api/v1/hrms/attendance/exceptions/bulk`:
   - Executes safe bulk actions (`assign`, `start_review`, `mark_pending_action`).
   - Bulk resolve/close is deliberately restricted in V1.0 to preserve audit integrity.
8. `GET /api/v1/hrms/attendance/exceptions/export`:
   - Streams CSV export with RFC-4180 escaping and formula-injection defense (`'` prefix on cells starting with `=`, `+`, `-`, `@`).

---

## 4. Frontend Workspace (`AttendanceExceptionsPage.tsx`)

Following the **Option B Enterprise** visual hierarchy and UX specification:

### 4.1 Header & Workday Controls
- Compact PageHeader (`Attendance / Exceptions`).
- Quick date preset selector (`Today`, `Yesterday`, `Last 7 Days`, `This Month`, `Custom Range`) with custom date range pickers.
- Global "Today" quick button and "Export" action button.

### 4.2 Single-Row Summary Counters Strip
Six interactive stat cards laid out in a single desktop row using `<Grid columns={6} gap="sm">`:
1. **ACTIVE CASES**: Sum of Open, Assigned, In Review, and Pending Action cases.
2. **CRITICAL**: Active cases with critical payroll or compliance impact.
3. **HIGH PRIORITY**: Active cases with high operational priority.
4. **UNASSIGNED**: Cases requiring triage and assignment.
5. **PENDING ACTION**: Cases awaiting action from employee, manager, or hardware sync.
6. **RESOLVED TODAY**: Cases successfully closed/resolved on the current day.
Each card functions as a quick filter shortcut with active border indicators.

### 4.3 Progressive Disclosure Filter Bar
- **Primary Filter Row:** Full-text Search (Employee Name, Code, Case ID), Workflow Status dropdown, Severity dropdown, Anomaly Type dropdown, "More Filters" toggle button, and "Reset" button.
- **Advanced Expandable Row:** Date interpretation toggle (`workday` vs `detected_at`), Ingestion Source filter, Assignment Queue filter, Pending Reason filter.

### 4.4 10-Column Data Table with Contextual Menu
1. `Selection Checkbox`: Master select-all checkbox with indeterminate state.
2. `Employee`: Composite avatar, full employee name, and code (or "Unmatched Employee" badge).
3. `Workday`: Workday date with day-of-week formatting.
4. `Exception`: Semantic icon, exception title, and human-readable type tag.
5. `Severity`: Color-coded semantic badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
6. `Source`: Source origin tag (`Biometric`, `Web`, `Engine`, `Leave System`, etc.).
7. `Assigned To`: Reviewer name or "Unassigned" pill.
8. `Detected At`: Detection timestamp with relative/time formatting.
9. `Status`: Semantic workflow badge (`OPEN`, `ASSIGNED`, `IN REVIEW`, `PENDING ACTION`, `RESOLVED`, `CLOSED`).
10. `Related Record`: Interactive pill linking to source punch or daily log.
11. `Actions`: Contextual `⋯` IconButton opening drawer actions.

### 4.5 Contextual Bulk Operations Bar
Appears when one or more rows are selected:
- Selected count indicator.
- `Assign / Reassign` button (modal).
- `Start Review` button.
- `Mark Pending Action` button (modal).
- `Export Selected` action.
- `Clear Selection` button.

### 4.6 4-Tab Investigation Drawer
Sliding right-side drawer displaying comprehensive case intelligence:
- **Tab 1: Overview:** Case metadata, assignment status, pending action reasons, root cause, resolution notes.
- **Tab 2: Evidence & Context:** Related punch events within ±2 days, linked daily attendance record, shift rules, and conflict details.
- **Tab 3: Workflow Actions:** Triage assignment, severity override, mark pending action, verified resolution submission.
- **Tab 4: History & Audits:** Append-only timeline showing timestamp, actor, action, old/new states, and investigator notes.

---

## 5. Design System Compliance & Zero Application CSS Invariant

- **Zero `.css` Files:** No CSS files exist in `apps/web/src/applications/hrms/attendance/**`.
- **Zero Inline Styles:** All visual presentation is composed through Design System components (`Page`, `PageHeader`, `Card`, `Grid`, `Stack`, `Inline`, `Table`, `Badge`, `Button`, `IconButton`, `Select`, `Input`, `SearchInput`, `Modal`, `Tabs`, `EmptyState`, `Alert`) and tokenized classes (`bezent-stat-card`, `bezent-table-meta-title`, etc.).
- **Material Symbols Icons:** All icons render exclusively via `<BezentIcon name="..." />`.

---

## 6. Verification & Test Summary

| Layer | Test Suite | Tests Executed | Status |
| :--- | :--- | :---: | :---: |
| **Backend API** | `attendanceExceptionsV1Api.test.ts` | 10 passed / 0 failed | **PASS** |
| **Backend Regression** | `punchLogsV1Api.test.ts` | 8 passed / 0 failed | **PASS** |
| **Backend Regression** | `attendanceApi.test.ts` | 14 passed / 0 failed | **PASS** |
| **Frontend Web** | `attendanceExceptionsPageV1.test.tsx` | 3 passed / 0 failed | **PASS** |
| **Frontend Web** | `dailyAttendanceLogV1.test.tsx` | 4 passed / 0 failed | **PASS** |
| **Frontend Web** | `punchLogsPageV1.test.tsx` | 3 passed / 0 failed | **PASS** |
| **Frontend Web** | `attendanceViews.test.tsx` | 12 passed / 0 failed | **PASS** |
| **Typecheck** | `tsc -b apps/api/tsconfig.json --noEmit` | Clean (0 errors) | **PASS** |
| **Typecheck** | `tsc -b apps/web/tsconfig.json --noEmit` | Clean (0 errors) | **PASS** |

The Attendance Exceptions V1.0 workspace is complete, verified, and operational.
