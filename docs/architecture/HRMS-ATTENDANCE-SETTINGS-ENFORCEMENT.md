# HRMS Attendance Settings — what is enforced

**Status:** current as of the attendance-settings enforcement work. This is the
authoritative map from each setting in **HR Settings → Attendance** to the code
that applies it. It supersedes the "Working" claims in
[HRMS-ATTENDANCE-SETTINGS-V1-IMPLEMENTATION-REPORT.md](HRMS-ATTENDANCE-SETTINGS-V1-IMPLEMENTATION-REPORT.md),
which described what could be saved, not what changed behaviour.

Every row marked **enforced** has a behaviour test in
`apps/api/src/applications/hrms/attendance/__tests__/attendanceSettingsEnforcement.test.ts`
(or `attendanceSettingsApi.test.ts`) that changes the setting and asserts the effect.

## General

| Setting                                            | Status                    | Where                                                                      |
| -------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| Timezone                                           | stored, used by reports   | reports/monthly summary                                                    |
| Day boundary time                                  | **enforced**              | `attendanceWorkday.service.ts` decides the workday of ESS punches          |
| Tracking start date                                | **enforced**              | regularization eligibility                                                 |
| Manual entry allowed / roles / methods / reason    | **enforced**              | `attendanceManualEntry.service.ts` (interactive admin corrections only)    |
| Manual entry attachment, approval mode             | not enforced              | needs attachments and a pending-approval state on corrections              |
| Employee visibility, default history days          | **enforced**              | `attendanceEmployeeView.service.ts` (ESS history and monthly summary)      |
| Alerts: late arrival, early exit, regularization   | **enforced, in-app only** | `attendanceAlert.service.ts`                                               |
| Alerts: missing punch, exceptions, on-duty, device | not enforced              | missing punch needs a scheduled detector; others have no recipient mapping |
| Alert channels email / push / SMS; recipients `hr` | not enforced              | no delivery channel or recipient mapping yet                               |
| Processing mode                                    | not enforced              | punches are always processed immediately                                   |

## Policies

Grace period, late/early tracking, half/full-day thresholds, break deduction,
classification, penalties and department/employee overrides are applied by the
calculation engine on every check-in, check-out, correction and recalculation.

## Regularization

| Setting                                  | Status                 | Where                                                             |
| ---------------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| Enabled, window, monthly quota, evidence | **enforced**           | `attendanceRegularizationEligibility.service.ts` (HR and ESS)     |
| Allowed correction categories            | **enforced**           | same; legacy ids (`missed_in`, `time_adjustment`…) are understood |
| Require reason                           | **enforced**           | HR submission and ESS                                             |
| Block on payroll lock                    | **enforced**           | lock reason becomes a warning when off                            |
| Allow employee withdrawal                | **enforced**           | `cancelRequest`                                                   |
| Approval hierarchy: HR only              | **enforced** (routing) | request goes to the HR queue                                      |
| Approval hierarchy: zero-touch           | **enforced**           | submitted requests are auto-approved                              |
| Auto-approve grace minutes               | **enforced**           | time corrections within N minutes of the recorded time            |
| Manager-then-HR stages, who may decide   | not enforced           | needs a role model for approvers                                  |

ESS regularization still writes to the legacy `employee_requests` ledger, so
hierarchy routing and auto-approval apply to the HR workflow only.

## Capture & devices

| Item                      | Status       | Notes                                                                               |
| ------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| Terminal registry         | working      |                                                                                     |
| Test ping                 | **real**     | TCP connect to host:port; "online" means the terminal accepts connections           |
| Bulk raw-punch import     | **enforced** | validates rows, skips duplicates, writes punches, derives daily records, reversible |
| Historical summary import | removed      | it never imported anything                                                          |
| Vendor protocol / push    | not built    | needs a device adapter                                                              |

## Location & security (ESS punches)

| Setting                                       | Status       |
| --------------------------------------------- | ------------ |
| Strict geofence (requires location, blocks)   | **enforced** |
| Advisory geofence                             | flagged      |
| IP allowlist with enforcement                 | **enforced** |
| Repeated-punch throttle                       | **enforced** |
| Impossible travel, mock location              | flagged      |
| Max devices per employee, VPN/proxy detection | not enforced |

Nothing blocks unless an administrator configures a strict rule.

## Payroll & locking

| Setting                      | Status                   | Where                                                    |
| ---------------------------- | ------------------------ | -------------------------------------------------------- |
| Cycle type and cutoff day    | **enforced**             | `attendancePeriodCalendar.ts`; readiness, lock, handover |
| Blocking severity            | **enforced**             | lock readiness                                           |
| Require approval before lock | **enforced**             | needs a reviewed monthly summary for the period          |
| Pending regularizations      | **enforced, per period** | readiness counts the period's own requests               |
| Auto-lock on cutoff          | **enforced**             | `attendanceAutoLock.service.ts`, started from `main.ts`  |

Auto-lock locks the most recent ended period using the same readiness rules as
a manual lock, retries on every sweep (every 15 minutes) until the period is
ready, and never re-locks a period an administrator re-opened. It lives in the
HRMS application and is started by the API bootstrap because `platform` must
not depend on applications.
