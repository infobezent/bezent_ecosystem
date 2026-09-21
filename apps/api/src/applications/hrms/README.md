# applications/hrms/

BEZENT's first **business application**: Complete HRMS + Employee
Self-Service.

No routes, services, or schema exist yet — this folder is the
application's boundary/mount point only.

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
HRMS**, not a separate application and not a separate domain. Each HRMS
domain below will eventually expose **both** an administrative experience
and an employee self-service experience over the _same_ underlying data —
never as duplicate applications or duplicate domains. See
[docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md).

## Future domains/modules (documented direction only, not created yet)

Organization, Employees, Recruitment, Onboarding, Attendance, Shifts,
Leave, Timesheets, Payroll, Performance, Learning, Career, Documents,
Assets, Employee Requests, Reports, Settings.

Each domain gets its own folder (controller/service/repository/validation/
types/routes) **when its implementation actually begins**, not before.

## Dependencies

`applications/hrms` may depend on `platform` and `shared`. It must never be
depended on by `platform`, `shared`, or any future application (CRM,
Project Management, etc.).
