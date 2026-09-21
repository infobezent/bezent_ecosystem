# Backend Architecture

`apps/api` — Node.js + Express + TypeScript.

## Folder responsibilities

```
apps/api/src/
├── app/
│   ├── server/       Express app bootstrap, route mounting (createApp.ts)
│   ├── middleware/    cross-cutting middleware (e.g. notFound)
│   ├── config/        environment configuration (env.ts)
│   └── errors/        AppError hierarchy + centralized error handler
├── platform/          reusable platform capabilities (documented boundary only)
├── applications/
│   └── hrms/          the HRMS business application (boundary only)
├── shared/             business-agnostic utilities
├── db/
│   ├── connection.ts   MySQL pool + Drizzle instance (lazy, optional)
│   ├── schema.ts        Drizzle schema entry point (no tables yet)
│   └── migrations/      drizzle-kit generated migrations
└── main.ts             process entrypoint
```

`app/` and `applications/` are unrelated concepts despite the similar
name — see
[AGENTS.md — `app/` vs. `applications/`](../../AGENTS.md#bezent-architecture-terminology)
if this is ever ambiguous.

`app/` owns the HTTP server, middleware pipeline, configuration loading, and
the centralized error-handling strategy. No business logic lives here.

`platform/` will own identity/authentication, tenants, users, access
control, audit, notifications, approvals, workflow, and documents — as
reusable capabilities every business application consumes. Business
applications must never implement their own authentication or tenant
resolution. In Phase 0 this is a single documented boundary with no
implementation; subfolders are added only once a real capability is built.

`applications/hrms` is the sole business application. It may depend on
`platform` and `shared`. Future business applications (CRM, Project
Management, etc.) must never import another application's internals — see
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md).

## Internal structure of a business module/domain

`applications/hrms` is itself composed of business modules/domains
(Attendance, Leave, Payroll, Recruitment, ...). A layered structure is
used for each domain's internals rather than full Clean Architecture
(`domain/application/infrastructure/api`):

```
applications/hrms/<domain>/
├── controller/
├── service/
├── repository/
├── validation/
├── types/
└── routes/
```

**Why:** at this stage no domain has business logic complex enough to
justify a domain/application/infrastructure split — introducing that
ceremony now would be empty scaffolding. The layered structure still gives
clear separation between HTTP concerns (controller/routes), business logic
(service), data access (repository), and input validation, is easy to
onboard to, and is testable. A specific domain may adopt fuller hexagonal
layering later if its complexity genuinely warrants it — that's a local,
per-domain decision, not a platform-wide mandate.

No domain has this structure populated yet; `applications/hrms` currently
contains only a README documenting future modules/domains — see
[AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology)
for the Application vs. Module/Domain distinction this section relies on.

## Error handling

Centralized: `app/errors/AppError.ts` defines a base `AppError` (and
`NotFoundError`) with a `statusCode` and `code`; `app/errors/errorHandler.ts`
is the single Express error-handling middleware that maps any thrown error
to a consistent JSON response (`{ error: { code, message } }`), omitting
stack traces outside development. Controllers throw `AppError` subclasses
instead of calling `res.status(...)` directly.

## Validation

Not yet needed — Phase 0 has no request bodies to validate beyond the
health endpoint. When the first domain endpoint is built, validation
happens at the API boundary (controller/route layer) using a TypeScript-
first schema library (Zod is the default recommendation) — never trusting
frontend-side validation alone.

## API structure

Routes are mounted under `/api/v1`. Phase 0 exposes only
`GET /api/v1/health`, which reports application health unconditionally and
database connectivity only if a database is configured (it never requires
business tables to exist).
