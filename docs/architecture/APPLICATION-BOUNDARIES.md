# Application Boundaries

This document explains _why_ BEZENT's business applications are shaped the
way they are. For the enforceable import rules (what may depend on what),
see [DEPENDENCY-RULES.md](DEPENDENCY-RULES.md) — that document is
canonical; this one is the narrative behind it.

For BEZENT's terminology (Platform / Business Application / Business
Module-Domain), see
[AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology).
This document previously used "module" to mean both "HRMS as a top-level
unit" and "a capability inside HRMS" — that ambiguity is why the
`modules/hrms` folder was renamed to `applications/hrms`; see
[ADR-014](ADRs.md#adr-014).

## Architectural style: modular monolith

One deployable frontend (`apps/web`), one deployable backend (`apps/api`).
No microservices, no microfrontends, no independent servers per business
application at this stage. Clean internal boundaries now preserve the
option to extract a service later if scale genuinely requires it — that is
not a Phase 0 decision.

("Modular monolith" describes the deployment/service topology of the whole
platform — one deployable unit, cleanly divided internally — a distinct
usage from "business module/domain," which describes a capability inside a
business application. See the terminology note above.)

## HRMS is a business application, not "a module"

`applications/hrms` is a single BEZENT **business application**, not split
into independent systems by audience. Internally, it is composed of
**business modules/domains** (Attendance, Leave, Payroll, Recruitment,
...). Employee Self-Service is not a separate application, and not a
separate domain — it is a permission-scoped _experience_ over the same
HRMS domains and data as HR Administration:

```
Attendance (HRMS business module/domain)
├── Administration
│   ├── workforce attendance
│   ├── regularization management
│   └── reports
└── Employee Self-Service
    ├── check-in / check-out
    ├── my attendance
    └── regularization request

Leave (HRMS business module/domain)
├── Administration
│   ├── policies
│   ├── balances
│   └── approvals
└── Employee Self-Service
    ├── my balance
    ├── request leave
    └── history
```

Never `applications/employee`, never `applications/ess`, never a duplicate
`hr`/`employee` application pair. Both experiences read and write the same
underlying domain/data.

## Platform boundary

`platform/` (frontend and backend) holds capabilities every business
application needs: identity/authentication, tenants, users, access control,
audit, notifications, approvals, workflow, documents/files, integrations,
and — on the frontend — the corresponding UI/context layer (current user,
tenant context, global search, calendar, notes, tasks).

Phase 0 deliberately keeps `platform/` as a **single boundary folder with a
README**, not pre-split into per-capability folders (`identity/`,
`tenants/`, `access-control/`, ...). A subfolder is created only once its
capability is actually implemented — this avoids scaffolding that looks
complete but has no code behind it, which would mislead rather than help.

Business applications never implement authentication, tenant resolution, or
authorization themselves, even provisionally — those always go through
`platform` once it exists. Dependency direction is one-way:

```
Business Applications
        ↓
     Platform
```

Never the reverse — `platform` never depends on a business application's
internals (see [DEPENDENCY-RULES.md](DEPENDENCY-RULES.md)).

## Shared contracts and dependency enforcement

See [DEPENDENCY-RULES.md](DEPENDENCY-RULES.md#shared-contracts-packagesshared-contracts)
for the `packages/shared-contracts` decision, and
[DEPENDENCY-RULES.md](DEPENDENCY-RULES.md#preventing-circular-dependencies)
for how the dependency graph is enforced today and in the future.
