# BEZENT HRMS — Attendance Settings V1.0 Gap Analysis Matrix

**Date:** 2026-10-09  
**Repository:** `E:\Company\bezent_ecosystem`  
**Scope:** HR Settings → Attendance (7 Horizontal Configuration Tabs)  
**Role:** Principal SaaS Architect & QA Lead  

---

## 1. Domain Component Matrix

| Functional Area | Existing in Repo | Partial / Incomplete | Missing in Repo | Conflicting | Resolution Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Navigation & Shell** | HR Settings route (`/hrms/settings/attendance`), `AttendanceSettingsSection.tsx` single-form | Basic tabless view with monolithic policy fields | 7 Horizontal Tabs (General, Policies, Regularization, Capture & Devices, Location & Security, Payroll & Locking, Audit & History) | None | Refactor `AttendanceSettingsSection.tsx` into a modular tabbed container with 7 sub-views conforming to BEZENT Design System |
| **2. General Settings** | System default timezone in tenant | None | Timezone picker, day boundary time, tracking start date, processing mode, manual entry toggle, employee visibility scopes, history view filters, alert preferences | None | Create `attendance_general_settings` table, API routes, and `GeneralAttendanceSettingsTab.tsx` |
| **3. Attendance Policies** | Basic `attendance_policies` table (grace minutes, half-day/full-day thresholds, missing punch flag) | Policy updating without versioning, drafting, or override hierarchy | Draft/Publish lifecycle, version history, department/employee override assignment, break deduction methods, late penalty unit calculation, On-Duty (OD) policy & reconciliation | None | Enhance `attendance_policies` with versioning, lifecycle status, override scopes; add penalty and OD rules; create `AttendancePoliciesTab.tsx` with policy modal & overrides |
| **4. Regularization Settings** | `allowRegularization`, `regularizationCutoffDays`, `requiresApproval` in policy | Basic toggle in policy | Correction types whitelist, monthly request caps, reason/evidence flags, multi-level hierarchy (Manager/HR), auto-approval thresholds, payroll-lock blocking | None | Create `attendance_regularization_settings` table, API endpoints, and `RegularizationSettingsTab.tsx` |
| **5. Capture & Devices** | Raw punch capture methods (`web`, `mobile`, `biometric`) enum | None | Device registry (`attendance_devices`), connection status (online/offline/testing), serial/IP configuration, Excel/CSV bulk import (`attendance_import_batches`) with column mapping & rollback, mobile integration contract | Biometric hardware physical drivers cannot be assumed live | Provide honest status (online/offline/testing/mocked), adapter contracts, import validation engine, and `CaptureDevicesSettingsTab.tsx` |
| **6. Location & Security** | `locations` org table exists | Geolocation coordinates stored informally in punches | Geofence radius per workplace, IP allowlists, mobile device registration limits, mock-location & impossible travel detection, VPN flags | None | Create `attendance_security_settings` table, API endpoints, and `LocationSecuritySettingsTab.tsx` |
| **7. Payroll & Locking** | None | None | Attendance cutoff cycle (calendar vs custom day 25), attendance periods (`attendance_periods`), period locking/unlocking with audit, payroll handover batch export | Leave / Payroll salary duplication | Attendance calculates verified payable days and deduction units without calculating salaries; create `PayrollLockingSettingsTab.tsx` |
| **8. Audit & History** | Basic timestamps on tables | None | Version diff comparisons, configuration audit log (`attendance_settings_audit_logs`), rollback as new version, JSON export, sensitive data masking | None | Create `attendance_settings_audit_logs` table, revision diff engine, and `AuditHistorySettingsTab.tsx` |
| **9. ESS Compatibility** | ESS check-in/out, punch history, regularization request flow | Working with 23/23 tests passing | None | None | Preserve existing write paths, ensure new settings (geofence, regularization limits, day boundary) are consumed non-destructively |

---

## 2. Architectural Checkpoint

- **Destructive Migrations:** NONE. All changes extend tables or add new tenant-isolated tables with `DEFAULT` values.
- **Breaking Changes:** NONE. Defaults replicate current behavior for unconfigured tenants.
- **External Dependencies:** Biometric SDKs and native mobile apps require realistic adapter contracts and connection health endpoints without claiming fake hardware is physically plugged in.
- **Repository Safety:** Confirmed. Ready to proceed with non-destructive implementation.
