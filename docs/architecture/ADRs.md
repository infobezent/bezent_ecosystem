# Architecture Decision Records

<a id="adr-001"></a>

### ADR-001 — BEZENT is a modular business platform

BEZENT is architected as a platform of business applications sharing a
common core, not as a single-purpose HRMS product.

<a id="adr-002"></a>

### ADR-002 — HRMS is the first business application

Complete HRMS + Employee Self-Service is built first, inside
`applications/hrms`, without special-casing the platform around it.

<a id="adr-003"></a>

### ADR-003 — Employee Self-Service reuses HRMS domains

ESS is not a parallel system. It reuses the same domains and underlying
data as HR administration, differentiated by permissions and experience.

<a id="adr-004"></a>

### ADR-004 — Start with a modular monolith

One deployable frontend, one deployable backend, with clean internal
boundaries between platform and business applications. No microservices/
microfrontends until scale genuinely requires extraction.

<a id="adr-005"></a>

### ADR-005 — React + TypeScript + Vite frontend

Chosen for developer experience, ecosystem maturity, and fast local
iteration.

<a id="adr-006"></a>

### ADR-006 — Node.js + Express + TypeScript backend

Chosen for ecosystem maturity, team familiarity, and straightforward fit
with a modular-monolith Express app.

<a id="adr-007"></a>

### ADR-007 — MySQL relational database, accessed via Drizzle ORM

MySQL 8+ for relational integrity across tenant/organization/employee data.
Drizzle ORM chosen over Prisma, TypeORM, and Sequelize for its SQL-first
schema, strong TypeScript inference without codegen, first-class MySQL
support, and lightweight migration tooling. See
[DATABASE.md](DATABASE.md#why-drizzle) for the full comparison.

<a id="adr-008"></a>

### ADR-008 — Multi-tenant readiness from the foundation

Shared database, shared schema, `tenant_id`-scoped rows, with isolation
enforced server-side — designed for from the start even though no tenant
tables exist yet. See [DATABASE.md](DATABASE.md#multi-tenancy).

<a id="adr-009"></a>

### ADR-009 — User and Employee are separate concepts

Identity (`User`) and employment record (`Employee`) are distinct entities,
related but never merged. See
[DATABASE.md](DATABASE.md#user--employee-adr-009).

<a id="adr-010"></a>

### ADR-010 — Global BEZENT Design System

One design system (`design-system/`) consumed by every business
application; no application-specific or page-specific competing styling.
See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

<a id="adr-011"></a>

### ADR-011 — Inline CSS is prohibited

`style={{ ... }}` / `style="..."` are disallowed throughout `apps/web`,
enforced by ESLint. Styling goes through design-system tokens and classes.
See [UI-RULES.md](UI-RULES.md).

<a id="adr-012"></a>

### ADR-012 — Old approved UI is selectively migrated, not copied wholesale

The separate, already-approved BEZENT UI is the visual source of truth but
is inventoried, classified, and migrated piece by piece in Phase 0B — never
copied as source folders or as `App.tsx` directly. See
[UI-MIGRATION.md](UI-MIGRATION.md).

<a id="adr-013"></a>

### ADR-013 — The documentation set is executable engineering policy

[AGENTS.md](../../AGENTS.md) (the BEZENT Engineering Constitution) and the
architecture documents it governs are not optional reference material —
they are binding on every human and AI contributor. Architecture, the
approved technology stack, database strategy, module ownership, dependency
direction, and global UI rules must never be silently changed; any such
change requires explicit justification, a new ADR, and explicit approval
before implementation. See
[AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).

<a id="adr-014"></a>

### ADR-014 — `modules/hrms` renamed to `applications/hrms`; Application vs. Module/Domain terminology adopted

**Justification:** "HRMS as a module" was ambiguous, because HRMS itself
contains many business capabilities (Attendance, Leave, Payroll, ...) that
are also naturally called "modules." This produced statements like "the
HRMS module contains modules," which obscure the actual hierarchy.

**Decision:** BEZENT adopts an explicit three-level vocabulary — **Platform
→ Business Applications → Business Modules/Domains**. `apps/api/src/modules/hrms`
and `apps/web/src/modules/hrms` are renamed to `apps/api/src/applications/hrms`
and `apps/web/src/applications/hrms`. "Module" (or "domain") is now reserved
for a capability _inside_ a business application (Attendance, Leave,
Payroll, ...); "application" (or "business application") is reserved for a
top-level BEZENT product (HRMS, and future CRM, Project Management,
Finance, Inventory, Support). Employee Self-Service remains a
permission-scoped experience within HRMS, never a separate application or
domain. See
[AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology)
for the full vocabulary and directory convention, and
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md) (formerly
MODULE-BOUNDARIES.md) for the boundary rationale.

**Approval:** explicit, given by the user as the instruction that produced
this ADR and the accompanying rename.

**Scope:** this is a terminology/structure correction only — no HRMS
features, no business database tables, no old-UI migration, and no new
business applications were introduced by this change.

<a id="adr-015"></a>

### ADR-015 — Adoption of Google Material Symbols Outlined for Global Icon Rendering

**Justification:** The BEZENT web platform is standardizing its design system
on Google Workspace visual aesthetics. Custom SVG paths in
`design-system/icons/definitions/` lacked unified optical sizing and font-variation
weights. Adopting Google Material Symbols Outlined delivers pixel-perfect alignment
with Google Workspace, standardizes glyph geometry, and eliminates manual SVG
maintenance.

**Decision:**

1. Load Google Material Symbols Outlined font via Google Fonts CDN in `apps/web/index.html`.
2. Keep `BezentIcon` and `BezentNavIcon` as the single canonical rendering boundary
   (`design-system/icons/`), updating their inner rendering engine to render the
   corresponding Material Symbol ligature glyph with themed CSS properties (`color`,
   `font-size`, fill state).
3. Map BEZENT domain and utility icon concepts to their exact Material Symbols
   Outlined glyph counterparts in the canonical registry.

**Approval:** explicit, approved by the user per Article 4.

## Recording a new ADR

Adding ADR-015 and beyond follows the process defined in
[AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack):
justification → ADR entry here → explicit approval → implementation, in
that order.
