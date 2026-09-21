# AGENTS.md — The BEZENT Engineering Constitution

This document is the **primary, mandatory engineering ruleset** for every
human developer and every AI coding agent working in this repository. It is
not background reading and not optional context — it is **executable
engineering policy**. The documents it points to under `docs/` carry the
same authority: together they are BEZENT's governed documentation set (see
[ADR-013](docs/architecture/ADRs.md#adr-013)).

If any instruction you are given conflicts with this document, treat that
as a signal to stop and confirm rather than to proceed — see
[Article 4](#article-4--changing-this-stack).

## Preamble — what this repository is

BEZENT (Business Ecosystem Zentram) is a modular business platform, not a
single-purpose HRMS product. The current business application is Complete
HRMS + Employee Self-Service. The architecture exists so future business
applications — CRM, Project Management, Finance, Inventory, Support — can
be added without restructuring the platform. See
[docs/architecture/README.md](docs/architecture/README.md) for the full
vision and phase roadmap.

## BEZENT Architecture Terminology

This vocabulary is permanent and must be used consistently across code,
comments, and documentation. See [ADR-014](docs/architecture/ADRs.md#adr-014)
for why it was adopted.

**Platform**
: BEZENT itself — the business ecosystem/platform as a whole.

**Business Applications**
: Top-level BEZENT products: HRMS (current), and CRM, Project Management,
Finance, Inventory, Support (future). Each lives at
`applications/<name>` in both `apps/web/src` and `apps/api/src`.

**Business Modules / Domains**
: Capabilities _inside_ a business application — e.g., inside HRMS:
Organization, Employees, Recruitment, Onboarding, Attendance, Shifts,
Leave, Timesheets, Payroll, Performance, Learning, Career, Documents,
Assets, Employee Requests, Reports, Settings. "Module" and "domain" are
used interchangeably at this level. **Never call HRMS itself "a module"
that "contains modules"** — HRMS is the business application; Attendance,
Leave, Payroll, etc. are its modules/domains.

**Employee Self-Service (ESS)**
: A permission-scoped _experience_ within the HRMS business application —
not a separate application, not a separate domain, and never
`applications/employee` or `applications/ess`. Each HRMS domain exposes
both an administrative and a self-service experience over the same
underlying data.

**`src/app` vs. `src/applications` — do not confuse these:**

| Folder             | Means                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`          | Application bootstrap/composition infrastructure: startup, router composition, providers, configuration, global initialization. |
| `src/applications` | BEZENT business applications: `applications/hrms`, and future `applications/crm`, `applications/project-management`, etc.       |

`src/platform` (cross-application platform capabilities), `src/design-system`
(the global UI system), and `src/shared` (domain-independent reusable code)
complete the top-level vocabulary — see
[docs/architecture/REPOSITORY.md](docs/architecture/REPOSITORY.md) for the
full folder map.

Renaming or restructuring any of this terminology or its directory
convention requires the Article 4 process (justification → ADR → explicit
approval) — see Article 4, below.

## Article 1 — Authority

1. This Constitution governs `apps/web`, `apps/api`, and everything under
   `docs/`. It applies equally to code written by a human and code written
   or modified by an AI agent.
2. The documents indexed in Article 2 are **source-of-truth**, not
   suggestions. Where code and documentation disagree, that is a defect to
   fix — either the code violates policy, or the documentation is stale and
   needs an explicit update — never a reason to silently follow the code.
3. A request from a user, an issue, or any other prompt does not by itself
   authorize an architectural change. See Article 4.

## Article 2 — Required reading before modifying code

**Before modifying code in an area, read the document(s) that govern it.**
This is not optional for an AI agent. If you are about to touch a file and
haven't read its governing document(s) in this session, read them first.

| You are about to touch...                                                   | Read first                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anything, as a starting point                                               | [docs/architecture/README.md](docs/architecture/README.md)                                                                                                                                                                       |
| The technology stack / a new dependency of a new kind                       | [docs/architecture/TECH-STACK.md](docs/architecture/TECH-STACK.md)                                                                                                                                                               |
| Top-level repo/workspace structure                                          | [docs/architecture/REPOSITORY.md](docs/architecture/REPOSITORY.md)                                                                                                                                                               |
| `apps/web/src/**`                                                           | [docs/architecture/FRONTEND.md](docs/architecture/FRONTEND.md)                                                                                                                                                                   |
| `apps/api/src/**`                                                           | [docs/architecture/BACKEND.md](docs/architecture/BACKEND.md)                                                                                                                                                                     |
| Anything under `db/` or schema/migrations                                   | [docs/architecture/DATABASE.md](docs/architecture/DATABASE.md), [docs/database/RULES.md](docs/database/RULES.md)                                                                                                                 |
| `applications/*` or `platform/*` (either app)                               | [docs/architecture/APPLICATION-BOUNDARIES.md](docs/architecture/APPLICATION-BOUNDARIES.md), [docs/architecture/DEPENDENCY-RULES.md](docs/architecture/DEPENDENCY-RULES.md)                                                       |
| `design-system/**`                                                          | [docs/architecture/DESIGN-SYSTEM.md](docs/architecture/DESIGN-SYSTEM.md), [docs/architecture/DESIGN-SYSTEM-TOKENS.md](docs/architecture/DESIGN-SYSTEM-TOKENS.md), [docs/architecture/UI-RULES.md](docs/architecture/UI-RULES.md) |
| `design-system/icons/**`                                                    | [docs/architecture/ICON-SYSTEM.md](docs/architecture/ICON-SYSTEM.md)                                                                                                                                                             |
| `design-system/components/**`, or any new UI primitive                      | [docs/architecture/DESIGN-SYSTEM-COMPONENTS.md](docs/architecture/DESIGN-SYSTEM-COMPONENTS.md)                                                                                                                                   |
| `layouts/**` (AppShell)                                                     | [docs/architecture/APPSHELL.md](docs/architecture/APPSHELL.md)                                                                                                                                                                   |
| `platform/search/**`                                                        | [docs/architecture/GLOBAL-SEARCH.md](docs/architecture/GLOBAL-SEARCH.md)                                                                                                                                                         |
| `platform/{utility-drawer,notifications,approvals,tasks,calendar,notes}/**` | [docs/architecture/GLOBAL-UTILITIES.md](docs/architecture/GLOBAL-UTILITIES.md)                                                                                                                                                   |
| `applications/hrms/{navigation,routes}/**`, sidebar/More/routing            | [docs/architecture/HRMS-NAVIGATION.md](docs/architecture/HRMS-NAVIGATION.md)                                                                                                                                                     |
| Any JSX/TSX styling                                                         | [docs/architecture/UI-RULES.md](docs/architecture/UI-RULES.md)                                                                                                                                                                   |
| Anything referencing the old approved BEZENT UI                             | [docs/architecture/UI-MIGRATION.md](docs/architecture/UI-MIGRATION.md)                                                                                                                                                           |
| API routes/controllers                                                      | [docs/api/STANDARDS.md](docs/api/STANDARDS.md)                                                                                                                                                                                   |
| Auth, secrets, headers, CORS                                                | [docs/security/README.md](docs/security/README.md)                                                                                                                                                                               |
| General style/structure questions not covered above                         | [docs/CODING-STANDARDS.md](docs/CODING-STANDARDS.md)                                                                                                                                                                             |
| Any past architectural decision and its rationale                           | [docs/architecture/ADRs.md](docs/architecture/ADRs.md)                                                                                                                                                                           |

## Article 3 — Non-negotiable architectural invariants

These are permanent unless changed through the Article 4 process. They are
summarized here; the linked document is authoritative for detail.

1. **Modular monolith.** One deployable API (`apps/api`), one frontend
   (`apps/web`). No new services/servers per business application. See
   [APPLICATION-BOUNDARIES.md](docs/architecture/APPLICATION-BOUNDARIES.md).
2. **No inline CSS.** No `style={{ ... }}`, no `style="..."`. Enforced by
   ESLint. See [UI-RULES.md](docs/architecture/UI-RULES.md).
3. **One global design system, one token source, one icon system.** No
   business application defines competing styling, its own color palette,
   or its own icons — not even HRMS. All colors/spacing/typography/
   shadows/motion consume the tokens in `design-system/tokens/`; no
   hardcoded brand color anywhere else. Every BEZENT icon is rendered
   through `design-system/icons` (`BezentIcon`/`BezentNavIcon`) — an AI
   agent must never substitute another icon library (Lucide, Material
   Icons, Font Awesome, ...) for the approved BEZENT icon geometry, and
   must never create a second, competing icon registry or resolution
   mechanism. A genuinely new icon is added to
   `design-system/icons/definitions/` under design-system ownership, not
   inside an application. Theme (light/dark/system) is global, resolved
   once in `app/providers`, never re-implemented per feature. See
   [DESIGN-SYSTEM.md](docs/architecture/DESIGN-SYSTEM.md),
   [DESIGN-SYSTEM-TOKENS.md](docs/architecture/DESIGN-SYSTEM-TOKENS.md),
   and [ICON-SYSTEM.md](docs/architecture/ICON-SYSTEM.md).
   **Components:** applications MUST reuse existing global components from
   `design-system/components` (Button, IconButton, Tooltip, Badge, Avatar,
   EmptyState, ...). Before creating any Button/Input/Badge/Tooltip-like
   element, search the design-system first; a duplicate or competing global
   component inside an application or platform is prohibited. Do not add a
   design-system component merely because it seems useful — it must be
   evidenced, domain-independent and needed by real consumers. Any change
   to a global component must consider every BEZENT application that uses
   it. See
   [DESIGN-SYSTEM-COMPONENTS.md](docs/architecture/DESIGN-SYSTEM-COMPONENTS.md).
   **Global shell:** the shell belongs to `layouts/app-shell` (`AppShell`).
   Business applications must not create competing global shells; HRMS
   renders inside AppShell and CRM/PM must reuse it. AppShell contains no
   business-domain logic, and `layouts` never imports `applications/*`
   internals (navigation data flows from an application into the shell,
   never the reverse). Global navigation visual primitives reuse
   `design-system`. See [APPSHELL.md](docs/architecture/APPSHELL.md).
   **Global Search** belongs to `platform/search`. Business applications
   must not implement a competing global search, and Global Search must not
   import application internals — searchable entities are contributed later
   through the `SearchProvider` contract. Mock/dev search data must never
   become production business data. See
   [GLOBAL-SEARCH.md](docs/architecture/GLOBAL-SEARCH.md).
   **Global utilities** (Notifications, Approvals, Tasks, Calendar, Notes and
   the shared drawer shell) belong to `platform`; the RightRail that opens
   them belongs to `layouts`. `layouts` must not import utility
   implementations and utilities must not import `layouts` or business
   applications — `app/router` composes both sides, and ONE shared state
   (`useActiveUtility`) controls which utility is open. Utility fixture data
   is dev-only and never becomes production data. Global Tasks is not
   Project Management tasks, and Approvals is cross-application
   infrastructure. See [GLOBAL-UTILITIES.md](docs/architecture/GLOBAL-UTILITIES.md).
   **Navigation:** HRMS navigation has ONE canonical catalog
   (`applications/hrms/navigation`); `layouts` must never define HRMS
   navigation data, and new destinations update the catalog — never a local
   sidebar array. HRMS routes belong to `applications/hrms` (generated from
   the catalog) and the URL/router is the source of truth for selected
   navigation. Global utilities are not HRMS destinations; HRMS Documents and
   the global Notes utility are separate concepts. CRM/PM will supply their
   own catalogs to the same shell mechanisms. See
   [HRMS-NAVIGATION.md](docs/architecture/HRMS-NAVIGATION.md).
   **UI foundation freeze (Phase 0B.9):** AppShell, TopNav, LeftSidebar,
   RightRail, BottomBar, Global Search, global utilities, the More launcher,
   the theme, the icon language and the global component language are frozen.
   HRMS pages build ON them; changing one needs an explicit global-shell or
   design-system reason (Article 4), never a module-level convenience. See
   [UI-MIGRATION-FINAL.md](docs/architecture/UI-MIGRATION-FINAL.md).
4. **User ≠ Employee.** Identity and employment record are never merged,
   even informally. See
   [DATABASE.md](docs/architecture/DATABASE.md#user--employee-adr-009).
5. **Tenant scoping.** Every tenant-scoped table carries `tenant_id`; every
   query is explicitly tenant-scoped server-side. Frontend filtering is
   never treated as isolation. See
   [DATABASE.md](docs/architecture/DATABASE.md#multi-tenancy).
6. **Dependency direction.** `design-system`/`shared` depend on nothing
   business-specific; `platform` never depends on `applications/*`;
   `applications/hrms` may depend on `platform`, `shared`, `design-system`.
   Future business applications never import another application's
   internals. See
   [DEPENDENCY-RULES.md](docs/architecture/DEPENDENCY-RULES.md).
7. **The old approved BEZENT UI is never copied wholesale.** It is
   migrated selectively per
   [UI-MIGRATION.md](docs/architecture/UI-MIGRATION.md).
8. **Migrations only.** Schema changes go through Drizzle migrations
   (`apps/api/src/db/migrations`). Never hand-edit a database. See
   [database/RULES.md](docs/database/RULES.md#migrations-only).
9. **npm only, one lockfile.** No `yarn.lock`/`pnpm-lock.yaml`. See
   [TECH-STACK.md](docs/architecture/TECH-STACK.md#package-manager-npm-only).
10. **No speculative scaffolding.** See Article 5.

## Article 4 — Changing This Stack

Architecture, the approved technology stack, database strategy, business
application/module ownership, dependency direction, global UI rules, and
the BEZENT Architecture Terminology itself **must not be silently
changed** — by a human or by an AI agent. This includes:

- introducing a new framework, database technology, ORM, build tool, or
  package manager (see [TECH-STACK.md](docs/architecture/TECH-STACK.md)),
- changing which application/layer may depend on which (see
  [DEPENDENCY-RULES.md](docs/architecture/DEPENDENCY-RULES.md)),
- changing the multi-tenancy strategy, the User/Employee model, or a
  database convention in [database/RULES.md](docs/database/RULES.md),
- weakening or removing a UI rule (e.g. permitting inline CSS somewhere) —
  see [UI-RULES.md](docs/architecture/UI-RULES.md),
- restructuring the modular-monolith boundary (e.g. splitting out a
  service) — see
  [APPLICATION-BOUNDARIES.md](docs/architecture/APPLICATION-BOUNDARIES.md),
- renaming or redefining Platform / Business Application / Business
  Module-Domain, or the `app` vs. `applications` distinction (see BEZENT
  Architecture Terminology, above),
- adding a new top-level folder under `apps/`, `packages/`, or the repo
  root ahead of a concrete, current need.

Any such change requires, **in this order, before implementation begins**:

1. **Explicit justification** — a clear statement of the problem, why the
   current architecture doesn't serve it, and what changes.
2. **An Architecture Decision Record (ADR)** — added to
   [docs/architecture/ADRs.md](docs/architecture/ADRs.md), following the
   existing ADR-001…014 format, numbered sequentially.
3. **Explicit approval** — from the user/maintainer, given in response to
   the justification and ADR — before any code implementing the change is
   written.

An AI agent that identifies a plausible architectural improvement must
**propose it** (justification + draft ADR) and **stop for approval** — it
must not implement the change first and document it after, and must not
treat an unrelated task's instructions as implicit approval for an
architectural change that task didn't ask for.

## Article 5 — No speculative scaffolding

Do not create empty folders, packages, or per-capability subdivisions "to
look complete" or "for when we need it." Before adding a new top-level
folder under `platform/`, `applications/`, or `packages/` (in either app),
check whether the current phase's stated scope actually calls for it — see
[docs/architecture/REPOSITORY.md](docs/architecture/REPOSITORY.md#adding-a-new-top-level-folder)
and [docs/architecture/APPLICATION-BOUNDARIES.md](docs/architecture/APPLICATION-BOUNDARIES.md#platform-boundary).
A folder is created when its first real implementation lands, not before.

## Article 6 — Enforcement

- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run
build`, and `npm run test` must all pass — CI
  ([.github/workflows/ci.yml](.github/workflows/ci.yml)) enforces this on
  every PR.
- The no-inline-CSS rule is enforced mechanically by ESLint; the
  dependency-direction and no-speculative-scaffolding rules are enforced by
  review today (see
  [DEPENDENCY-RULES.md](docs/architecture/DEPENDENCY-RULES.md#preventing-circular-dependencies)
  for the plan to promote that to tooling).
- Passing CI does not by itself authorize an architectural change — CI
  checks code quality, not governance compliance. Article 4 still applies.

## Commands

```bash
npm install
npm run dev           # both apps
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run test
```

## Current phase

Phase 0 (Architecture Foundation) is complete: workspace, application
boundaries, API health endpoint, Drizzle/MySQL connectivity infrastructure.
The `modules/hrms` → `applications/hrms` terminology correction ([ADR-014](docs/architecture/ADRs.md#adr-014))
is also complete. **No business database tables exist yet.** Do not add
HRMS/tenant/user database schema without going through Article 4 — that
work belongs to a separate, dedicated database design phase. See
[docs/architecture/README.md](docs/architecture/README.md) for the full
phase roadmap and what's intentionally deferred.
