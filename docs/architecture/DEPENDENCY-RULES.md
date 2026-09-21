# Dependency Rules

This is the canonical source of truth for **what may import what** in this
repository. It is governed by [AGENTS.md](../../AGENTS.md) — the dependency
direction below must not be silently changed by an AI agent; see
[AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).

For _why_ applications are shaped this way, see
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md). This document is
the rule set; that one is the narrative.

## Frontend (`apps/web/src`)

```
design-system      ← depends on nothing under platform/ or applications/
shared             ← depends on nothing under platform/ or applications/
platform           ← depends on shared, design-system — never on applications/
layouts            ← depends on shared, design-system, platform
applications/hrms  → may depend on platform, shared, design-system, layouts
```

- `design-system` and `shared` are leaves: they know nothing about BEZENT's
  business domain or its platform capabilities.
- `platform` may use `shared` and `design-system` but must never import
  from any `applications/*` — platform capabilities are consumed by
  business applications, not the other way around.
- `applications/hrms` may depend on everything above it, but nothing may
  depend on `applications/hrms`.
- A future business application (`applications/crm`,
  `applications/project-management`, ...) follows the same shape and
  **must never import another application's internals** — not
  `applications/hrms/...` from `applications/crm/...`, and not the
  reverse.
- Within `applications/hrms`, internal business modules/domains
  (Attendance, Leave, Payroll, ...) are a separate concern from this
  application-level graph — see
  [APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md) and
  [AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology).

## Backend (`apps/api/src`)

```
shared             ← no business logic (HRMS or any other application's)
platform           ← depends on shared — never on applications/ internals
applications/hrms  → may consume platform capabilities and shared
```

- `shared` contains no business logic for any business application.
- `platform` never imports from `applications/*`.
- `applications/hrms` may consume `platform` capabilities (identity,
  tenants, access control, etc.) once they exist, and `shared` utilities.
- Future business applications must never import `applications/hrms`
  internals, and `applications/hrms` must never import a future
  application's internals.

## Cross-application communication

When one business application genuinely needs something from another (e.g.
future Finance needs an HRMS employee reference), the path is:

1. A capability exposed through `platform` (preferred — if it's genuinely
   a platform-level concern), or
2. An explicit, documented API contract between the two applications (e.g.
   HRMS exposes a stable internal service interface that Finance calls) —
   never a direct import of one application's controllers/services/
   repositories from another application's code.

Direct cross-application imports of internals are always a violation of
this document, regardless of how convenient it seems for a single feature.
This applies at the application level (`applications/hrms` vs.
`applications/crm`) — it does not describe how modules/domains _within_ one
application relate to each other, which is a per-application implementation
detail decided when that application's internals are actually built.

## Shared contracts (`packages/shared-contracts`)

Not created yet — there is no real frontend/API contract worth sharing as a
compiled type package while `apps/api` has no real endpoints. When
introduced, it will hold **API-level contracts/types only** (request/
response shapes), never database/persistence models shared directly with
the frontend. Creating this package is itself an architectural change and
follows the same ADR + approval process as everything else in this
document.

## Preventing circular dependencies

Enforced today by code review against the rules above — there is no
tooling-level enforcement yet, because the governed folders
(`platform/`, `applications/*`) are still mostly empty boundaries. As real
imports accumulate, this should be promoted to a lint rule (e.g.
`eslint-plugin-boundaries` or `import/no-restricted-paths`); doing so now
would be enforcing a rule against code that doesn't exist yet.

## Changing this document

Changing the dependency direction described here — e.g. allowing
`platform` to depend on a business application, or allowing direct
application-to-application imports — is an architectural change. It
requires explicit justification, an ADR, and explicit approval before
implementation. See
[AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
