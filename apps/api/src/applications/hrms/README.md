# applications/hrms/

BEZENT's first **business application**: Complete HRMS + Employee
Self-Service.

## HRMS is a Business Application, Not a Module

`applications/hrms` is a top-level BEZENT **business application** (see
[docs/architecture/README.md](../../../../docs/architecture/README.md)).
Internally it is composed of **business modules/domains** (Organization,
Onboarding, Leave, Attendance, Payroll, ...). HRMS is not "a module that contains
modules"; it is the application, and Organization, Onboarding, Leave, etc. are its
modules/domains. See
[docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md).

## Employee Self-Service (ESS)

Employee Self-Service (ESS) is a **permission-scoped experience within
HRMS**, not a separate application and not a separate domain. Each HRMS
domain exposes both an administrative experience and an employee self-service
experience over the _same_ underlying data.

## Implemented HRMS Domains (Current)

```
applications/hrms/
├── organization/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   └── routes/
├── onboarding/
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── routes/
│   ├── validation/
│   └── types/
└── settings/
    └── onboarding/
        ├── controller/
        ├── service/
        ├── repository/
        ├── routes/
        ├── validation/
        └── types/
```

### Domain Responsibilities

1. **`organization/`**
   - Manages organization hierarchy masters: companies, departments, designations, and locations.
   - Enforces tenant and company scoping across master lookups.

2. **`onboarding/`**
   - Handles the lifecycle of new hires and onboarding cases: case drafting, submission, stage progression, and case withdrawal.
   - Maintains stage transition history and audit records.

3. **`settings/onboarding/`**
   - Manages company-specific onboarding configuration: general settings, stage pipelines, dynamic field configs, document requirements, checklist templates, and employee conversion rules.

### Canonical Layer Responsibilities

- **Controller (`controller/`):** Parses HTTP requests, extracts request context (`req.devContext`), delegates to validation, coordinates with the service layer, and writes standardized responses.
- **Validation (`validation/`):** Zod schemas validating incoming request bodies and query parameters at the boundary.
- **Service (`service/`):** Encapsulates business logic, state machines, domain rules, and multi-table transactions.
- **Repository (`repository/`):** Performs data access via Drizzle ORM against MySQL, strictly enforcing `tenant_id` and `company_id` scoping.
- **Routes (`routes/`):** Express router mounting domain endpoints under `/api/v1/hrms/...`.
- **Types (`types/`):** TypeScript domain models and DTO type definitions.

## Planned HRMS Domains (Not Yet Implemented)

The following business modules are planned for subsequent implementation slices and are not yet built:

- Employees (workforce directory and employment records)
- Recruitment
- Attendance
- Shifts
- Leave
- Timesheets
- Payroll
- Performance
- Learning
- Career
- Documents
- Assets
- Employee Requests
- Reports

Detailed business domain specifications will be maintained under `docs/modules/hrms/`.

## Dependencies

`applications/hrms` may depend on `platform` and `shared`. It must never be
depended on by `platform`, `shared`, or any future application (CRM,
Project Management, etc.).
