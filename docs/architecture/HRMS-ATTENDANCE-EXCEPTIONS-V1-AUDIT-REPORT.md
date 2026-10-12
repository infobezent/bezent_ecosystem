# BEZENT HRMS — Attendance Exceptions V1.0: Architecture Audit & Impact Report

## 1. Architectural Findings & Repository Context

- **Database (`apps/api/src/db/schema.ts`)**:
  - Currently contains `employeeAttendance`, `attendancePunches`, `attendancePunchAudits`, `attendancePolicies`, `attendanceSettings`, `attendanceRegularizations`, `attendanceOnDutyRequests`.
  - Missing a dedicated, enterprise-grade case management entity for exceptions. Previously, `/hrms/attendance/exceptions` was an ad-hoc in-memory projection querying `employeeAttendance` directly.
  - Required Database Entities:
    1. `attendance_exceptions`: Primary case management table supporting multi-tenant isolation, source references (`daily_log`, `punch_event`, `leave`, `on_duty`, `regularization`), severity (`critical`, `high`, `medium`, `low`), workflow status (`open`, `assigned`, `in_review`, `pending_action`, `resolved`, `closed`), assigned reviewer/queue, pending action reasons, resolution verification metadata, and detection timestamps.
    2. `attendance_exception_audits`: Append-only audit trail logging creation, severity overrides, assignments, workflow transitions, reviewer notes, and resolution evidence.
  - Proper foreign keys, multi-tenant composite indexes (`tenant_id`, `company_id`), and deduplication constraints on `(tenant_id, company_id, source_type, source_id, exception_type)`.

- **Backend Services (`apps/api`)**:
  - `attendance.repository.ts`:
    - Add `detectAndSyncExceptions`: Scans source records (attendance daily logs with missing punches, late/early discrepancies, short hours, shift mismatches, unmatched/duplicate punch logs, request conflicts) and idempotently inserts or updates exceptions.
    - Add `getExceptions`: Paginated, filtered queries supporting dual date interpretation (workday vs detected_at), full text search, sorting, and real SQL aggregate counters (`activeCases`, `critical`, `highPriority`, `unassigned`, `pendingAction`, `resolvedToday`).
    - Add `getExceptionById`: Returns complete case record with evidence context (linked punches, daily log, policy, requests) and chronological audit history.
    - Add `updateExceptionWorkflow`: Validates state machine transitions (`open` → `assigned` → `in_review` → `pending_action` → `resolved` → `closed`), records notes and evidence, and logs immutable audit records.
    - Add `verifyAndResolveException`: Verifies underlying source state before permitting resolution (e.g. confirms punch added, daily log recalculated, or regularized).
    - Add `bulkExceptionAction`: Safe bulk assignment, start review, and pending action updates with per-item eligibility checks.
    - Add `exportExceptionsCsv`: Formula-injection-safe CSV generator.
  - `attendance.service.ts` & `attendance.controller.ts`:
    - Expose RESTful endpoints under `/hrms/attendance/exceptions`.

- **Frontend (`apps/web`)**:
  - Replace existing prototype `AttendanceExceptionsPage.tsx` with Option B Balanced Enterprise layout:
    - Compact Page Header (`Attendance / Exceptions` breadcrumb, date range, export).
    - Six summary counters in one desktop row (`Active Cases`, `Critical`, `High Priority`, `Unassigned`, `Pending Action`, `Resolved Today`).
    - Primary filter bar with debounced search, status, severity, exception type, More Filters, and Reset.
    - Expandable advanced filters (Workday range, Detected date range, Source, Assignment queues, Department, Branch, Pending action reason).
    - 10-column table (Employee, Workday, Exception, Severity, Source, Assigned To, Detected At, Status, Related Record, Actions).
    - 4-tab right-side drawer (`Overview`, `Evidence`, `Actions`, `History`).
    - Bulk action toolbar (Assign/Reassign, Start Review, Mark Pending Action, Export).
    - Modals for Assignment, Severity Override, Pending Action Reason, and CSV Export.
    - Strict Zero Application CSS: 0 `.css` files, 0 inline `style={{ ... }}` objects.

## 2. Implementation Sequence

1. **Step 1: Database Schema & Migration**:
   - Define `attendanceExceptions` and `attendanceExceptionAudits` in `schema.ts`.
   - Generate and apply migration `0035_attendance_exceptions_v1.sql`.
2. **Step 2: Backend Domain & Repository Layer**:
   - Define contracts in `attendance.types.ts`.
   - Implement repository methods for detection, deduplication, case querying, workflow state machine, audit logging, bulk operations, and verification.
3. **Step 3: Service, Controller & Routes**:
   - Wire up service and API endpoints with RBAC and tenant scoping.
4. **Step 4: Frontend API & Types**:
   - Update `attendance.types.ts` and `attendanceApi.ts`.
5. **Step 5: Frontend UI**:
   - Build `AttendanceExceptionsPage.tsx` adhering to the reference design.
6. **Step 6: Automated Testing**:
   - Backend integration tests & frontend component tests.
7. **Step 7: Verification & Final Report**:
   - Typecheck, run tests, and provide delivery documentation.
