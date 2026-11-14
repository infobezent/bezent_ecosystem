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

<a id="adr-016"></a>

### ADR-016 — No Silent In-Memory Persistence Fallbacks

**Context:** Persistence repositories in backend domains previously contained fallback mechanisms that caught database connection errors and silently served or mutated data in in-memory maps or static fallback fixtures (e.g. `FALLBACK_MASTERS`, `inMemoryCases`, `memGeneral`). This allowed the API to start and respond with synthetic mock data even when the database was unconfigured, misconfigured, or unreachable, obscuring connection issues and causing non-deterministic state between application runs.

**Decision:**

1. All persistent business data operations must strictly target the configured MySQL database via Drizzle ORM.
2. In-memory, mock, or silent persistence fallback stores in runtime repositories are prohibited.
3. Database unavailability or unreachability must fail fast and explicitly by throwing `DatabaseConnectionError`, surfaced by the centralized error handler as HTTP `500 DATABASE_UNAVAILABLE`.

**Consequences:**

- Production-like behavior is deterministic across all environments; state cannot diverge into ephemeral memory.
- Database misconfigurations, network outages, or unreachable database instances are visible immediately rather than masked.
- Tests requiring persistence must execute against proper MySQL infrastructure rather than silently exercising memory fallbacks.
- Zero hidden fallback data stores remain in runtime code paths.

**Approval:** explicit, approved in PR #44 per Article 4.

<a id="adr-017"></a>

### ADR-017 — Centralized RBAC: roles, role assignments and a code-defined permission catalog

**Context:** Phases 1–3 introduced platform authentication (`users`,
`sessions`), company access (`memberships`) and a Super Admin flag
(`users.is_super_admin`). Authorization, however, is expressed as a single
role enum on `memberships` (`company_admin | hr_manager | employee | user`)
and a hard-coded role list in the Company Admin service. There is no
permission model, no effective-permission resolution, no custom roles, no
Manager role, and Company Admin role changes overwrite the previous role.
Business authorization therefore cannot follow the canonical chain
`User → Company Membership → Roles → Permissions → Capability` (Article 17).

**Decision:**

1. **Membership = company access.** `memberships` continues to record that a
   User may access a company. Its `role` column is retained for backward
   compatibility and is no longer the authorization source.
2. **Roles** live in a new `roles` table. System roles (`tenant_id` /
   `company_id` NULL, `is_system = true`) keep the existing identifiers
   (`company_admin`, `hr_manager`, `employee`, `user`) and add `manager`.
   Companies may create custom roles scoped to `(tenant_id, company_id)`.
   Roles are deactivated (status), never hard-deleted while assigned.
3. **Permissions** are a **code-defined catalog** with stable dotted
   identifiers (e.g. `company.users.invite`, `hrms.employees.update`,
   `ess.leave.apply`), grouped by area (Platform, Company Administration,
   HRMS, ESS, CRM, Project Management) — the same "system definitions ship in
   code" pattern as the Form Engine. System-role permission sets also ship in
   code (they cannot be edited at runtime); `role_permissions` maps a company
   **custom** role to catalog identifiers. Platform-scope permissions can never
   be attached to a company role; Super Admin remains `users.is_super_admin`
   only. Self-service (`ess.*`) permissions are granted by a linked, active
   Employee record — never by a role.
4. **Role assignments** live in a new `role_assignments` table
   `(user_id, role_id, tenant_id, company_id, status)`; a user may hold many
   roles per company. Existing `memberships.role` values are backfilled into
   `role_assignments` by migration.
5. **One effective-permission resolver** evaluates, per request and per
   selected company only: active session → active account → active
   membership → company/tenant not suspended → active role assignments →
   active roles → role permissions → module entitlements. Deny by default;
   permissions from different companies are never combined. Client-supplied
   company context is always re-validated server-side.

**Consequences:** Adds three tables (`roles`, `role_permissions`,
`role_assignments`) via an additive migration; no existing column is
dropped. Middleware `requireCompanyContext` / `requirePermission` replace
role-name checks. Securing the HRMS API with this model (removing
dev-context header trust) is delivered separately.

**Approval:** explicit, given by the user on 2026-09-29 per Article 4.

<a id="adr-018"></a>

### ADR-018 — Passwordless Email OTP authentication for every BEZENT user

**Context:** Platform authentication (Phase 1) used email + password for all
users, a dormant bootstrap path carried a hard-coded default Super Admin
password, and session tokens were stored in plain text. BEZENT has no email
delivery capability.

**Decision:**

1. **One passwordless flow for every user** — Super Admin, Company Admin, HR,
   Manager, Employee and any custom role. `POST /platform/auth/otp/request`
   issues a one-time code to the account email; `POST /platform/auth/otp/verify`
   exchanges it for a session. There is no role-specific login path or bypass.
   Password login (`POST /platform/auth/login`) is disabled; the password
   columns are retained (additive schema) but no longer grant access.
2. **Challenges** (`auth_otp_challenges`): 6-digit code stored only as an
   HMAC-SHA256 digest keyed by `OTP_SECRET`; 10-minute expiry; single use;
   at most 5 verification attempts, then locked; 60-second resend cooldown;
   request rate limits per email and per client IP. Requests for unknown or
   inactive accounts return the same response shape (no account enumeration)
   and send nothing.
3. **After verification** the existing session store issues the session and
   the ADR-017 resolver returns platform workspaces, companies, roles,
   permissions and workspaces. Authorization is still re-evaluated on every
   protected request; OTP changes only how a session is created.
4. **Session tokens are stored hashed** (SHA-256) in `sessions.token`.
   Sessions issued before this change remain valid until they expire.
5. **Email delivery** is a new platform capability (`platform/email`) using
   **nodemailer over SMTP**. Development and tests may use a local
   `email_outbox` table transport instead; production refuses to start
   without SMTP configuration and `OTP_SECRET`. Codes are never written to
   logs or audit metadata.

**Consequences:** Adds the `nodemailer` dependency (Tech Stack: email
delivery) and migration 0018 (`auth_otp_challenges`, `email_outbox`). The
existing web login page (password form) must move to the OTP flow — that is
the Multi-Login frontend work. Temporary passwords generated by provisioning
and invitations no longer grant access.

**Approval:** explicit, given by the user on 2026-09-29 per Article 4.

<a id="adr-019"></a>

### ADR-019 — Unification of HRMS Workforce Settings Hub (Retiring Legacy Administration & Mock Employee Settings)

**Context:** Historical HR settings had fragmented, non-persistent cards:
an "Administration" card (`id: 'onboarding'`) that housed Forms and Onboarding
alongside an empty `EmployeeNumberingSection` placeholder; a mock "Employees"
card with hardcoded client state and a dummy `setTimeout` save; and a mock
"HR Settings" card. The operational sidebar navigation already uses the
canonical concept **Workforce** (`/hrms/workforce/*`: Directory, Onboarding,
Transfers, Promotions, Offboarding, Records). Critical enterprise policies for
Probation, Notice Periods, and Transfer Approvals lacked database persistence
and configuration surfaces.

**Decision:**

1. **Unify all workforce configuration into one authoritative domain** —
   `Workforce Settings` (`/hrms/settings?module=workforce`), mirroring the
   rigor of Leave Settings (ADR-014).
2. **Retire and delete dead mock screens** — `EmployeesSettingsSection.tsx`
   and `HRSettingsSection.tsx` are removed. The Settings Hub card registry
   is updated to replace the 3 fragmented cards (`onboarding`, `employees`,
   `hr-settings`) with a single **Workforce** card (`id: 'workforce'`).
3. **Canonical 7-Tab Architecture** in `apps/web/src/applications/hrms/settings/workforce/`:
   - Tab 1: General & Auto-Numbering (ID sequence generator, employment types, work models, auto-provisioning).
   - Tab 2: Organization & Hierarchy (Designations, job levels, grades, reporting rules).
   - Tab 3: Registration & Custom Forms (Employee Registration Form builder & field editor).
   - Tab 4: Onboarding Workflows (Pre-boarding, dynamic stages, checklists, document requirements).
   - Tab 5: Probation & Confirmation (Probation duration, review workflow, extensions).
   - Tab 6: Transfers & Lifecycle (Movement types, dual-manager approvals, effective dates).
   - Tab 7: Offboarding & Clearance (Notice period matrix, buyout rules, 4-department No Dues clearance).
4. **Real Database Persistence** — Schema migrations add MySQL persistence for
   employee numbering sequences, employment types, probation policies,
   lifecycle policies, and offboarding/clearance matrices with strict tenant
   and company isolation.

**Consequences:** Eliminates confusing terminology and mock screens. Ensures
1:1 semantic alignment between the operational Workforce module and its
administrative settings hub.

**Approval:** explicit, approved by the user on 2026-10-31 per Article 4.

<a id="adr-020"></a>

### ADR-020 — Department Approved Headcount as a real, configurable data source

**Context:** The Workforce Overview's "Workforce Planning" section (Department
Staffing Health: Current Headcount, Approved Headcount, Capacity Utilization,
Staffing Gap) has no real backend source for "approved headcount" — there is
no such concept anywhere in the schema. The page currently fabricates it
(`Math.max(22, currentHeadcount + 6)` company-wide, and a hardcoded
`{'General Operations': 15, Engineering: 3, Finance: 2, 'Human Resources': 2}`
map per department), which violates the zero-fabrication requirement this
page is otherwise now held to. There is no honest way to compute this metric
without a real place for HR to record a department's budgeted headcount.

**Decision:**

1. **New additive table `department_headcount_budgets`**
   `(id, tenant_id, company_id, department_id, approved_headcount, updated_by_user_id, created_at, updated_at)`,
   tenant/company isolated, one row per `(company_id, department_id)` —
   a current snapshot, not a revision history (matches how every other
   workforce setting in ADR-019's hub is modeled; a history ledger can be a
   later addition if trending is actually needed). `approved_headcount` is a
   non-negative integer. A department with no row has **no approved
   headcount recorded** — the Overview must show that department's target as
   unavailable/empty (e.g. "Not Set"), never 0 and never a guessed number.
2. **Backend capability** under the existing `hrms/workforce` domain,
   standard layered architecture (routes → controller → service →
   repository), Zod-validated, tenant/company scoped like every other HRMS
   endpoint:
   - `GET /hrms/workforce/staffing-budgets` — list every active department
     with its current headcount (computed live from `employees`) and its
     `approvedHeadcount` (`null` when unset), gated by the existing
     `hrms.workforce.view` permission.
   - `PUT /hrms/workforce/staffing-budgets/:departmentId` — upsert one
     department's `approvedHeadcount`, gated by the existing
     `hrms.workforce.manage` permission.
3. **Workforce Overview wiring**: the Planning card reads each department's
   current headcount against its own real `approvedHeadcount` when set.
   Departments with no budget row are excluded from the company-wide
   aggregate (never contribute a fabricated number to it), and the card
   says so when one or more departments are unset, rather than silently
   understating or overstating the total.
4. **Settings UI**: a new tab or section inside the existing Workforce
   Settings hub (ADR-019) where HR can view and edit each department's
   approved headcount — without this, the schema/API have no way to be
   populated and the Overview would simply show "Not Set" everywhere
   indefinitely.

**Consequences:** Adds one table via an additive Drizzle migration; no
existing column is dropped or altered. Until HR populates it through the new
settings UI, the Workforce Overview's Planning card legitimately shows "Not
Set" / unavailable for approved headcount, capacity utilization, and staffing
gap — this is correct, honest behavior per the task's own rule ("if no
backend source exists, implement it" / "do not compromise data accuracy to
make the dashboard look populated"), not a regression from the previous
(fabricated) always-populated card.

**Approval:** _pending — awaiting explicit user approval per Article 4
before any implementation begins._

## Recording a new ADR

Adding ADR-017 and beyond follows the process defined in
[AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack):
justification → ADR entry here → explicit approval → implementation, in
that order.
