# BEZENT Architecture — Overview

## Vision

BEZENT (Business Ecosystem Zentram) is a modular business **platform**, not
a single-purpose HRMS product. The current **business application** is
**Complete HRMS + Employee Self-Service**. The architecture exists so
future business applications — CRM, Project Management, Finance, Inventory,
Support — can be added without restructuring the platform.

See [AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology)
for the exact vocabulary this document set uses: **Platform** →
**Business Applications** → **Business Modules/Domains**.

```
BEZENT
│
├── Platform Core
│
├── Applications
│   │
│   └── HRMS                     [CURRENT]
│       ├── Organization
│       ├── Employees
│       ├── Recruitment
│       ├── Onboarding
│       ├── Attendance
│       ├── Shifts
│       ├── Leave
│       ├── Timesheets
│       ├── Payroll
│       ├── Performance
│       ├── Learning
│       ├── Career
│       ├── Documents
│       ├── Assets
│       ├── Requests
│       ├── Reports
│       └── Settings
│
└── Future Applications
    ├── CRM
    ├── Project Management
    ├── Finance
    ├── Inventory
    └── Support
```

The HRMS domains above are **architectural direction only** — none are
implemented yet, and none should be created as empty folders ahead of their
actual implementation (see
[AGENTS.md, Article 5](../../AGENTS.md#article-5--no-speculative-scaffolding)).
Employee Self-Service is not a box in this tree — it is a permission-scoped
experience across the domains above, not a separate application or domain.

## Phases

- **Phase 0 — Architecture Foundation (complete).** Workspace structure,
  application boundaries, a minimal runnable frontend placeholder, an API
  health endpoint, and Drizzle/MySQL connectivity infrastructure. No
  business database tables, no business features, no old-UI migration.
- **Phase 0 (terminology correction, complete).** `modules/hrms` renamed to
  `applications/hrms` to make explicit that HRMS is a business application
  composed of business modules/domains, not "a module containing modules."
  See [ADR-014](ADRs.md#adr-014).
- **Phase 0B — UI Migration (complete, frozen).** Inventory, classify, extract
  design tokens from, and selectively migrate the separately approved old
  BEZENT UI. See [UI-MIGRATION.md](UI-MIGRATION.md).
  - **Phase 0B.1 — Inventory (complete).** See
    [UI-MIGRATION-INVENTORY.md](UI-MIGRATION-INVENTORY.md).
  - **Phase 0B.2 — Design tokens + theme foundation (complete).** See
    [DESIGN-SYSTEM-TOKENS.md](DESIGN-SYSTEM-TOKENS.md).
  - **Phase 0B.3 — Global icon system (complete).** See
    [ICON-SYSTEM.md](ICON-SYSTEM.md).
  - **Phase 0B.4 — Global component foundation (complete).** See
    [DESIGN-SYSTEM-COMPONENTS.md](DESIGN-SYSTEM-COMPONENTS.md).
  - **Phase 0B.5 - Global AppShell (complete).** See
    [APPSHELL.md](APPSHELL.md).
  - **Phase 0B.6 - Global Search (complete, UI only).** See
    [GLOBAL-SEARCH.md](GLOBAL-SEARCH.md).
  - **Phase 0B.7 - Global utilities (complete, UI only).** See
    [GLOBAL-UTILITIES.md](GLOBAL-UTILITIES.md).
  - **Phase 0B.8 - HRMS navigation + routing + More launcher (complete).** See
    [HRMS-NAVIGATION.md](HRMS-NAVIGATION.md).
  - **Phase 0B.9 - Final QA, cleanup and UI foundation freeze (complete).** See
    [UI-MIGRATION-FINAL.md](UI-MIGRATION-FINAL.md).
- **Database design (future, dedicated phase).** Detailed relational design
  for tenants, users, employees, and HRMS domain tables. See
  [DATABASE.md](DATABASE.md) for the strategy that phase will implement.
- **HRMS feature development (future).** Implementation of HRMS business
  modules/domains inside `applications/hrms`, per domain, admin +
  self-service together.

## Architecture documents

This whole set, together with [AGENTS.md](../../AGENTS.md) (the BEZENT
Engineering Constitution), is governed documentation — see
[AGENTS.md, Article 2](../../AGENTS.md#article-2--required-reading-before-modifying-code)
for which document to read before touching a given part of the codebase.

- [TECH-STACK.md](TECH-STACK.md) — the approved technology stack, what's
  explicitly rejected, and package-manager policy.
- [REPOSITORY.md](REPOSITORY.md) — workspace/monorepo structure and why.
- [FRONTEND.md](FRONTEND.md) — React/TS/Vite architecture and folder
  responsibilities.
- [BACKEND.md](BACKEND.md) — Express/TS architecture, business-module
  internal structure, error handling, validation.
- [DATABASE.md](DATABASE.md) — MySQL/Drizzle strategy, multi-tenancy, User
  vs Employee (strategy only — see [../database/RULES.md](../database/RULES.md)
  for concrete conventions; no tables exist yet).
- [APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md) — why BEZENT's
  business applications are shaped this way.
- [DEPENDENCY-RULES.md](DEPENDENCY-RULES.md) — the canonical, enforceable
  dependency direction rules, frontend and backend.
- [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) — who owns BEZENT's visual language
  and how it may change.
- [DESIGN-SYSTEM-TOKENS.md](DESIGN-SYSTEM-TOKENS.md) — the canonical
  token/theme foundation: brand color, token categories, naming rules,
  typed access, light/dark/system resolution, persistence, FOUC
  prevention, layout/motion tokens.
- [ICON-SYSTEM.md](ICON-SYSTEM.md) — the canonical icon registry, the
  general/navigation icon components, and duplicate-key resolutions.
- [DESIGN-SYSTEM-COMPONENTS.md](DESIGN-SYSTEM-COMPONENTS.md) — the global
  component system: implemented primitives, classification of deferred
  candidates, and the rubric for adding new ones.
- [APPSHELL.md](APPSHELL.md) - the global application shell: ownership,
  regions, scroll and layering, sub-nav ownership, old-to-new mapping.
- [GLOBAL-SEARCH.md](GLOBAL-SEARCH.md) - the Global Search platform capability:
  contract, states, tokens, dev-data policy, deferred backend search.
- [GLOBAL-UTILITIES.md](GLOBAL-UTILITIES.md) - the utility rail capabilities and
  drawers: registry, shared shell, reveal animation, layering, contracts.
- [HRMS-NAVIGATION.md](HRMS-NAVIGATION.md) - the canonical HRMS navigation catalog,
  route scheme, sub-navigation and More launcher.
- [UI-MIGRATION-FINAL.md](UI-MIGRATION-FINAL.md) - the final migrated frontend
  foundation, dependency rules, extension model and the UI freeze.
- [UI-RULES.md](UI-RULES.md) — global frontend rules, including the
  permanent no-inline-CSS rule.
- [UI-MIGRATION.md](UI-MIGRATION.md) — how the old approved BEZENT UI will
  be selectively migrated in Phase 0B.
- [UI-MIGRATION-INVENTORY.md](UI-MIGRATION-INVENTORY.md) — the Phase 0B.1
  file-by-file migration analysis.
- [ADRs.md](ADRs.md) — architecture decision records.

Also see, outside this directory: [docs/CODING-STANDARDS.md](../CODING-STANDARDS.md),
[docs/api/STANDARDS.md](../api/STANDARDS.md), [docs/database/RULES.md](../database/RULES.md),
[docs/security/README.md](../security/README.md).

## What Phase 0 intentionally does not include

- No business database tables (`tenants`, `users`, `employees`, or any HRMS
  table).
- No authentication, authorization, or RBAC implementation.
- No HRMS pages, routes, or business logic.
- No migration of the old approved BEZENT UI — the Phase 0 frontend is a
  minimal neutral placeholder only.
- No `packages/shared-contracts` — introduced only once real frontend/API
  contracts exist to share.
- No per-capability `platform/` subfolders (`identity/`, `tenants/`,
  `access-control/`, etc.) — `platform/` is a single documented boundary
  until a real implementation needs a subfolder.
- No HRMS business module/domain folders (`attendance/`, `leave/`,
  `payroll/`, ...) under `applications/hrms/` — that tree in the Vision
  section above is direction only.
- No `applications/crm`, `applications/project-management`, or any other
  future business application.
