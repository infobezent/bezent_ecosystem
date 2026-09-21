# API Standards

The source of truth for how BEZENT's REST API is designed. For the error-
handling and validation architecture these standards build on, see
[../architecture/BACKEND.md](../architecture/BACKEND.md).

## Versioning and URL structure

- All routes are mounted under `/api/v1`.
- Resource-oriented URLs: `/api/v1/<resource>` (plural noun), e.g.
  `/api/v1/employees` (not yet implemented).
- A breaking change to an existing endpoint's contract requires a new
  version prefix (`/api/v2`) rather than silently changing `/api/v1`
  behavior — versioning strategy is finalized in detail once a real
  breaking change is first needed.

## Pagination, filtering, sorting, search

To be applied uniformly once the first list endpoint is built:

- **Pagination** — `?page=`/`?pageSize=` query parameters as the default
  approach; a cursor-based scheme is adopted instead only for an endpoint
  with a specific need (e.g. high-write, frequently-reordered data), and
  documented per-endpoint if so.
- **Filtering** — via query parameters named after the field they filter
  (e.g. `?status=active`), documented per endpoint.
- **Sorting** — `?sort=field` / `?order=asc|desc`, documented per endpoint.
- **Search** — a dedicated `?q=` parameter for free-text search where an
  endpoint supports it.

## Request validation

Validation happens at the API boundary — the controller/route layer —
before any service/business logic runs. Frontend-side validation is never
trusted as the only line of defense. See
[../architecture/BACKEND.md](../architecture/BACKEND.md#validation) for the
validation-library direction (Zod).

## Errors

All error responses follow the centralized shape produced by
`apps/api/src/app/errors/errorHandler.ts`:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

- `code` is a stable, machine-readable string (not an HTTP status text).
- `message` is safe to show to an API consumer.
- A `stack` field is included only outside `production` — never in a
  production response.
- Controllers throw an `AppError` subclass; they never call
  `res.status(...).json(...)` directly for error cases.

## Authentication and authorization

Not implemented yet. Once `platform` identity/access-control capabilities
exist, every non-public endpoint requires authentication, and
authorization is enforced server-side per request — never inferred from
frontend state alone. Header/token scheme is defined when that work begins.

## Tenant scoping

Every endpoint that touches tenant-scoped data resolves and enforces
tenant scope server-side (from the authenticated session, not from a
client-supplied tenant identifier alone). See
[../architecture/DATABASE.md](../architecture/DATABASE.md#multi-tenancy).

## Endpoints (current)

### `GET /api/v1/health`

Returns application health. Reports database connectivity only if a
database is configured; never requires business tables to exist.

```json
{
  "status": "ok",
  "service": "bezent-api",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "database": { "configured": false, "connected": false }
}
```

## Changing these standards

A change to the conventions above (versioning scheme, pagination approach,
error shape, auth scheme) applies to every future endpoint — treat it as an
architectural change requiring the ADR + approval process in
[../../AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
