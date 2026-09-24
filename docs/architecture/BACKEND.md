# Backend Architecture

`apps/api` — Node.js + Express + TypeScript.

## Folder responsibilities

```
apps/api/src/
├── app/
│   ├── server/       Express app bootstrap, createApp.ts, health router
│   ├── middleware/   cross-cutting middleware (notFound, etc.)
│   ├── config/       environment configuration (env.ts)
│   └── errors/       AppError hierarchy + centralized error handler
├── platform/         reusable platform capabilities (platform/context)
├── applications/
│   └── hrms/         the HRMS business application
│       ├── organization/       organization masters data access
│       ├── onboarding/         new hire management, cases, stage lifecycle
│       └── settings/           administration & onboarding configuration
├── shared/            business-agnostic utilities
├── db/
│   ├── connection.ts  MySQL2 pool + Drizzle instance (strict, fail-fast)
│   ├── schema.ts      Drizzle schema (tenants, org masters, onboarding, settings)
│   ├── migrations/    drizzle-kit generated SQL migrations
│   └── seed.ts        deterministic development seed script
└── main.ts            process entrypoint
```

`app/` and `applications/` are unrelated concepts despite the similar
name — see
[AGENTS.md — `app/` vs. `applications/`](../../AGENTS.md#bezent-architecture-terminology).

`app/` owns the HTTP server bootstrap, middleware pipeline, environment
configuration, and the centralized error-handling strategy. No business
domain logic lives in `app/`.

`platform/` owns cross-application platform capabilities. Currently,
`platform/context/devContext.ts` provides development request context
resolution. Future platform capabilities (identity/auth, tenancy runtime
services, access control/RBAC, audit logging, notifications, approvals)
will live here as reusable services that business applications consume.

`applications/hrms` is the primary business application. It currently
contains implemented domains for `organization`, `onboarding`, and
`settings/onboarding`. Future business applications (CRM, Project Management,
etc.) will live as sibling folders under `applications/` and must never
depend on HRMS internals — see
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md).

## Internal structure of a business module/domain

Implemented HRMS business domains follow a consistent layered architecture:

```
applications/hrms/<domain>/
├── controller/     HTTP request/response parsing, status codes, DTO mapping
├── service/        business logic, validation orchestration, domain rules
├── repository/     data access via Drizzle ORM, strict tenant/company scoping
├── validation/     request payload validation schemas (Zod)
├── types/          domain-specific TypeScript interfaces and types
└── routes/         Express route definitions and middleware binding
```

### Current Implemented HRMS Domains:

- **`organization`**: Read and query access for organizational master records
  (`companies`, `departments`, `designations`, `locations`).
- **`onboarding`**: Complete candidate onboarding lifecycle, preboarding cases,
  draft registration, stage transitions, and audit stage history.
- **`settings/onboarding`**: Administrative configuration builder for onboarding
  general settings, custom stages, configurable fields, document requirements,
  checklist templates, and workforce conversion rules.

### Planned HRMS Domains (Not Yet Implemented):

- Recruitment, Candidates, Interviews, Employees (Core Workforce), Attendance,
  Shifts, Leave, Timesheets, Payroll, Performance, Learning, Career, Documents,
  Assets, Employee Requests, Reports.

## Request Execution Flow

A typical request through the backend executes through these canonical layers:

```
HTTP Request
     ↓
Express Middleware (helmet, cors, devContextMiddleware)
     ↓
Route Layer (express.Router)
     ↓
Controller Layer (parses params/body, invokes validation)
     ↓
Validation (Zod schemas)
     ↓
Service Layer (business logic, transactions, domain invariants)
     ↓
Repository Layer (Drizzle queries with tenantId + companyId scoping)
     ↓
MySQL Database
```

## Error Handling & Sanitization

Centralized error handling is enforced:

- Base `AppError` (`app/errors/AppError.ts`) defines an error with an HTTP
  `statusCode` and machine-readable `code`. Subclasses include `NotFoundError`
  and `DatabaseConnectionError`.
- Centralized `errorHandler` (`app/errors/errorHandler.ts`) catches all thrown
  errors and returns a standardized JSON error envelope:
  ```json
  {
    "error": {
      "code": "DATABASE_UNAVAILABLE",
      "message": "Database is not configured"
    }
  }
  ```
- Outside development, internal driver details, connection strings, hostnames,
  ports, raw SQL queries, and stack traces are stripped to prevent data leakage.
- Controllers throw `AppError` subclasses rather than calling `res.status(...)`
  directly with raw error objects.

## Strict Persistence & Fail-Fast Database Behavior

In accordance with ADR-016 and AGENTS.md Article 14:

- All domain repositories persist exclusively to MySQL via Drizzle ORM.
- **No silent in-memory or mock fallbacks are permitted.** If MySQL is
  unconfigured, unreachable, or encounters a connection error, calls fail
  fast by throwing `DatabaseConnectionError`.
- Database availability is mandatory for domain operations.

## API Structure

All routes are mounted under `/api/v1` in `createApp.ts`:

- Platform routes: `GET /api/v1/health`, `GET /api/v1/context`
- HRMS domain routes: `/api/v1/hrms/<domain>/...`
