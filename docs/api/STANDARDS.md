# API Standards

The source of truth for how BEZENT's REST API is designed. For the error-
handling and validation architecture these standards build on, see
[../architecture/BACKEND.md](../architecture/BACKEND.md).

## Versioning and URL Structure

- All routes are mounted under the `/api/v1` namespace.
- Platform utility routes live at `/api/v1/<utility>`:
  - `/api/v1/health`
  - `/api/v1/context`
- Business application routes follow the canonical application namespace:
  - `/api/v1/<application>/<domain>/...`
  - Current business application: `/api/v1/hrms/...`
- A breaking change to an existing endpoint's contract requires a new version prefix (`/api/v2`) rather than silently changing `/api/v1` behavior.

## Request Validation

- Validation happens strictly at the API controller boundary using Zod schemas before any service or repository logic executes.
- Frontend-side validation is never trusted as the sole line of defense.
- When validation fails, controllers throw a `ValidationError` containing structured field-level errors (`details?: Record<string, string>`), which the centralized error handler transforms into a 400 response.

## Response Conventions

- **Success Data Envelope:** All successful JSON responses wrap their payload in a top-level `data` property:
  ```json
  {
    "data": { ... }
  }
  ```
- **Paginated Collections:** List endpoints returning paginated data provide `data`, `pagination`, and optional summary `counts`:
  ```json
  {
    "data": [ ... ],
    "pagination": {
      "total": 42,
      "page": 1,
      "pageSize": 20,
      "totalPages": 3
    },
    "counts": {
      "all": 42,
      "draft": 5,
      "in_progress": 25,
      "completed": 12
    }
  }
  ```
- **HTTP Status Codes:**
  - `200 OK` — Standard successful retrieval or update.
  - `201 Created` — Successful resource creation.
  - `400 Bad Request` — Validation failure (`VALIDATION_ERROR`) or missing context (`CONTEXT_MISSING`).
  - `404 Not Found` — Resource not found (`NOT_FOUND`).
  - `409 Conflict` — State conflict (`CONFLICT`).
  - `500 Internal Error` — Unexpected server errors (`INTERNAL_ERROR`) or database failure (`DATABASE_UNAVAILABLE`).

## Error Envelope

All error responses follow the centralized shape produced by `apps/api/src/app/errors/errorHandler.ts`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found",
    "details": {
      "fieldName": "Explanation of validation error"
    }
  }
}
```

- `code` is a stable, machine-readable string (e.g. `NOT_FOUND`, `VALIDATION_ERROR`, `DATABASE_UNAVAILABLE`).
- `message` is a safe, human-readable error description.
- `details` is included for validation errors providing field-by-field explanations.
- `stack` is included outside production only — never in production.
- Controllers throw `AppError` subclasses; they never call `res.status(...).json(...)` directly for errors.

## Development Context vs. Production Auth

- **Current Implementation:** Request context is provided by `devContextMiddleware` (`apps/api/src/platform/context/devContext.ts`). It inspects `x-tenant-id` and `x-company-id` headers, falling back to `DEFAULT_DEV_CONTEXT` (`tenant_demo_01`, `comp_demo_01`).
- **Trust Boundary:** Headers are development-only inputs and are **not** authenticated or validated against the `tenants` table.
- **Planned / Future:** Production identity, verified session tokens, membership resolution, and RBAC will replace `devContext` when platform authentication is built.

## Active Route Overview (Current)

A concise overview of active endpoints currently registered under `/api/v1`:

### Platform

- `GET /api/v1/health` — Application health and MySQL database pool status.
- `GET /api/v1/context` — Returns active development context (`tenantId`, `companyId`).

### HRMS Organization Masters

- `GET /api/v1/hrms/organization/masters` — Retrieves companies, departments, designations, and locations scoped to tenant and company.

### HRMS Onboarding

- `GET /api/v1/hrms/onboarding/new-hires` — List new hires with pagination, status filters, and category counts.
- `GET /api/v1/hrms/onboarding/cases` — List active onboarding cases.
- `POST /api/v1/hrms/onboarding/cases` — Create a new onboarding case.
- `GET /api/v1/hrms/onboarding/cases/:id` — Retrieve onboarding case details and stage timeline.
- `POST /api/v1/hrms/onboarding/cases/:id/stage` — Advance/transition onboarding stage.
- `POST /api/v1/hrms/onboarding/cases/:id/withdraw` — Withdraw an onboarding case.

### HRMS Onboarding Settings

- `GET /api/v1/hrms/settings/onboarding/summary` — Full onboarding settings summary.
- `GET` / `PUT /api/v1/hrms/settings/onboarding/general` — General onboarding policies.
- `GET` / `PUT /api/v1/hrms/settings/onboarding/stages` — Stage configuration pipeline.
- `GET` / `PUT /api/v1/hrms/settings/onboarding/fields` — Dynamic form field configurations.
- `GET` / `PUT /api/v1/hrms/settings/onboarding/documents` — Document collection requirements.
- `GET` / `PUT /api/v1/hrms/settings/onboarding/checklists` — Checklist templates.
- `GET` / `PUT /api/v1/hrms/settings/onboarding/conversion` — Conversion settings.

## Changing These Standards

A change to the conventions above applies platform-wide — treat it as an architectural change requiring the ADR + approval process in [AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
