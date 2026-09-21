# applications/hrms/

BEZENT's first **business application**: Complete HRMS + Employee
Self-Service.

Implemented so far (Phase 0B.8): `navigation/` (the ONE canonical HRMS
catalog), `routes/` (generated from it) and `pages/ModulePlaceholder`. No
business module exists yet. See
[docs/architecture/HRMS-NAVIGATION.md](../../../../docs/architecture/HRMS-NAVIGATION.md).

## HRMS is a business application, not a module

`applications/hrms` is a top-level BEZENT **business application** (see
[docs/architecture/README.md](../../../../docs/architecture/README.md)).
Internally it is composed of **business modules/domains** (Attendance,
Leave, Payroll, Recruitment, ...) — HRMS is not "a module that contains
modules"; it is the application, and Attendance/Leave/Payroll/etc. are its
modules/domains. See
[docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md).

## Employee Self-Service is not a separate system

Employee Self-Service (ESS) is a **permission-scoped experience within
HRMS**, not a separate application and not a separate domain — it is not
`applications/employee` or `applications/ess`. Each HRMS domain will
eventually expose both an administrative experience and an employee
self-service experience against the same underlying data — never as
duplicate applications or duplicate domains. See
[docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md).

## Future domains/modules (documented direction only, not created yet)

Organization, Employees, Recruitment, Onboarding, Attendance, Shifts,
Leave, Timesheets, Payroll, Performance, Learning, Career, Documents,
Assets, Employee Requests, Reports, Settings.

## Dependencies

`applications/hrms` may depend on `platform`, `shared`, and
`design-system`. It must never be depended on by those, nor by any future
application.
