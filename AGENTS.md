# AGENTS.md — The BEZENT Engineering Constitution & Operational Rulebook

> **MANDATORY NOTICE TO ALL CODING AGENTS AND DEVELOPERS:**
>
> **AGENTS.md is the authoritative operational instruction set for coding agents working in this repository. Agents must read it before modifying code. Task prompts may add narrower requirements, but must not silently override repository architecture, safety, ownership, or Git rules.**
>
> If any instruction or prompt conflicts with this document, **STOP and report the conflict immediately** rather than proceeding silently. See [Article 4](#article-4--changing-this-stack--no-silent-architecture-changes) and [Article 30](#article-30--agent-stop-conditions).

This document is the **primary, mandatory engineering ruleset** for every human developer and every AI coding agent working in this repository. It is not background reading and not optional context — it is **executable engineering policy**. The documents it points to under `docs/` carry the same authority: together they are BEZENT's governed documentation set (see [ADR-013](docs/architecture/ADRs.md#adr-013)).

---

## Preamble — What This Repository Is

BEZENT (Business Ecosystem Zentram) is a modular enterprise platform, not a single-purpose HRMS product. The current business application is Complete HRMS + Employee Self-Service. The architecture exists so future business applications — CRM, Project Management, Finance, Inventory, Support — can be added without restructuring the platform. See [docs/architecture/README.md](docs/architecture/README.md) for the full vision and phase roadmap.

---

## BEZENT Architecture Terminology

This vocabulary is permanent and must be used consistently across code, comments, and documentation. See [ADR-014](docs/architecture/ADRs.md#adr-014) for why it was adopted.

**Platform**
: BEZENT itself — the business ecosystem/platform as a whole.

**Business Applications**
: Top-level BEZENT products: HRMS (current), and CRM, Project Management, Finance, Inventory, Support (future). Each lives at `applications/<name>` in both `apps/web/src` and `apps/api/src`.

**Business Modules / Domains**
: Capabilities _inside_ a business application — e.g., inside HRMS: Organization, Employees, Recruitment, Onboarding, Attendance, Shifts, Leave, Timesheets, Payroll, Performance, Learning, Career, Documents, Assets, Employee Requests, Reports, Settings. "Module" and "domain" are used interchangeably at this level. **Never call HRMS itself "a module" that "contains modules"** — HRMS is the business application; Attendance, Leave, Payroll, etc. are its modules/domains.

**Roles & Actors ≠ Applications**
: Do NOT create separate top-level applications or modules for "HR Manager", "HR Executive", "Employee", or "Hiring Manager". Those are authorization roles and actors, not applications.

**Employee Self-Service (ESS)**
: A permission-scoped _experience_ within the HRMS business application — not a separate application, not a separate domain, and never `applications/employee` or `applications/ess`. Each HRMS domain exposes both an administrative and a self-service experience over the same underlying data.

**`src/app` vs. `src/applications` — do not confuse these:**

| Folder             | Means                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app`          | Application bootstrap/composition infrastructure: startup, router composition, providers, configuration, global initialization. |
| `src/applications` | BEZENT business applications: `applications/hrms`, and future `applications/crm`, `applications/project-management`, etc.       |

`src/platform` (cross-application platform capabilities), `src/design-system` (the global UI system), and `src/shared` (domain-independent reusable code) complete the top-level vocabulary — see [docs/architecture/REPOSITORY.md](docs/architecture/REPOSITORY.md) for the full folder map.

Renaming or restructuring any of this terminology or its directory convention requires the Article 4 process (justification → ADR → explicit approval).

---

## Article 1 — Authority & Hierarchy

1. This Constitution governs `apps/web`, `apps/api`, and everything under `docs/`. It applies equally to code written by a human and code written or modified by an AI agent.
2. The documents indexed in Article 2 are **source-of-truth**, not suggestions. Where code and documentation disagree, that is a defect to fix — either the code violates policy, or the documentation is stale and needs an explicit update — never a reason to silently follow the code.
3. A prompt from a user, an issue, or any task instruction does not by itself authorize an architectural deviation. When task instructions contradict AGENTS.md: **STOP and report the conflict.**

---

## Article 2 — Required Reading Before Modifying Code

**Before modifying code in an area, read the document(s) that govern it.** This is mandatory.

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
| Team collaboration & ownership                                              | [docs/COLLABORATION.md](docs/COLLABORATION.md)                                                                                                                                                                                   |
| API routes/controllers                                                      | [docs/api/STANDARDS.md](docs/api/STANDARDS.md)                                                                                                                                                                                   |
| Auth, secrets, headers, CORS                                                | [docs/security/README.md](docs/security/README.md)                                                                                                                                                                               |
| General style/structure questions not covered above                         | [docs/CODING-STANDARDS.md](docs/CODING-STANDARDS.md)                                                                                                                                                                             |
| Any past architectural decision and its rationale                           | [docs/architecture/ADRs.md](docs/architecture/ADRs.md)                                                                                                                                                                           |

---

## Article 3 — Core Platform Architecture & Canonical Layers

### 1. Canonical Frontend Layers (`apps/web/src/`)

- `app/`: Bootstrap root, router composition, providers, app registration.
- `applications/`: Business applications (`applications/hrms`, future `applications/crm`, etc.).
- `layouts/`: Global AppShell and structural shell layouts.
- `platform/`: Cross-application capabilities (Global Search, Utility Drawer, Notifications, Tasks, Approvals, Calendar, Notes).
- `design-system/`: Design tokens, generic components, layout primitives, and icon system.
- `shared/`: Domain-independent, cross-cutting frontend utilities, types, and hooks.

### 2. Canonical Dependency Direction

```
      app
       ↓
applications + layouts + platform
       ↓
design-system + shared
```

- **Strict Rule:** Business applications may consume platform capabilities and Design System primitives. **Reverse dependencies are prohibited.**
- `design-system` MUST NOT import `applications`.
- `layouts` MUST NOT import application internals.
- `platform` MUST NOT import application internals.
- `shared` MUST NOT import business/application-specific code.
- Global infrastructure MUST NOT depend on HRMS business semantics.

---

## Article 4 — Changing This Stack & No Silent Architecture Changes

Architecture, the approved technology stack, database strategy, business application/module ownership, dependency direction, global UI rules, and the BEZENT Architecture Terminology itself **must not be silently changed** — by a human or by an AI agent. This includes:

- introducing a new framework, database technology, ORM, build tool, or package manager (see [TECH-STACK.md](docs/architecture/TECH-STACK.md)),
- changing which application/layer may depend on which (see [DEPENDENCY-RULES.md](docs/architecture/DEPENDENCY-RULES.md)),
- changing the multi-tenancy strategy, the User/Employee model, or a database convention in [database/RULES.md](docs/database/RULES.md),
- weakening or removing a UI rule (e.g. permitting inline CSS somewhere) — see [UI-RULES.md](docs/architecture/UI-RULES.md),
- restructuring the modular-monolith boundary (e.g. splitting out a service) — see [APPLICATION-BOUNDARIES.md](docs/architecture/APPLICATION-BOUNDARIES.md),
- renaming or redefining Platform / Business Application / Business Module-Domain, or the `app` vs. `applications` distinction,
- adding a new top-level folder under `apps/`, `packages/`, or the repo root ahead of a concrete, current need.

Any such change requires, **in this order, before implementation begins**:

1. **Explicit justification** — a clear statement of the problem, why the current architecture doesn't serve it, and what changes.
2. **An Architecture Decision Record (ADR)** — added to [docs/architecture/ADRs.md](docs/architecture/ADRs.md), following the existing ADR-001…014 format, numbered sequentially.
3. **Explicit approval** — from the user/maintainer, given in response to the justification and ADR — before any code implementing the change is written.

---

## Article 5 — Application Composition (`src/app`)

`src/app` is the composition root. It is responsible for:

- Application registry initialization
- Top-level router composition
- Global application providers
- AppShell composition
- Platform capability integration

**Strict Rules:**

- Do NOT put HRMS business logic in `src/app`.
- Do NOT move business components into `src/app` for convenience.
- Do NOT create another application shell inside HRMS.

---

## Article 6 — Global AppShell Invariants

The existing global `AppShell` (`apps/web/src/layouts/app-shell`) is authoritative and frozen (Phase 0B.9).

- **Do NOT duplicate or clone:** `TopNav`, `LeftSidebar`, `SubNavFlyout`, `RightRail`, `BottomBar`, `MoreLauncher`, `ProfileMenu`, `GlobalSearch`, `UtilityDrawer`, or the platform utility shells (`Notifications`, `Tasks`, `Approvals`, `Calendar`, `Notes`).
- Business pages render **INSIDE** the existing shell via React Router outlets.
- Never introduce nested or competing application shells.

---

## Article 7 — Design System & The Zero Application CSS Rule

### 1. Single UI Source

`apps/web/src/design-system/**` is the **ONLY** source for generic visual and layout primitives:

- **Primitives:** `Button`, `IconButton`, `Input`, `SearchInput`, `Textarea`, `Select`, `Switch`, `Modal`, `Tabs`, `Table`, `Tooltip`, `Badge`, `Alert`, `Card`, `Avatar`, `EmptyState`.
- **Layout & Composition:** `Page`, `PageHeader`, `Section`, `Stack`, `Inline`, `Grid`, `FormSection`, `FormGrid`, `Actions`, `Toolbar`, `Divider`.

### 2. The Strict Zero Application CSS Rule

- `apps/web/src/applications/**` MUST contain **ZERO `.css` files**.
- Application TS/TSX files MUST contain **ZERO application CSS imports**.
- **PROHIBITED:** Creating files like `OnboardingPage.css`, `SettingsPage.css`, `EmployeeRegistration.css`, `AdministrationBuilder.css`, `LeavePage.css`, etc.
- **PROHIBITED:** Bypassing this rule by writing `style={{ ... }}` or declaring inline style objects. Enforced by ESLint.
- **PROHIBITED:** Moving business-specific CSS selectors into Design System CSS files merely to satisfy the rule (e.g., `.onboarding-card`, `.employee-form`, `.hr-settings-grid`). Design System CSS must remain domain-neutral and reusable across any business application.

---

## Article 8 — Missing UI Capability Protocol

Before creating any new reusable UI component:

1. **SEARCH THE DESIGN SYSTEM FIRST.**
2. **Apply the Application-Neutrality Test:**
   _Ask:_ "Could CRM, Project Management, Finance, or Support use this component without knowing anything about HRMS?"
   - If **YES**: It is a generic Design System capability.
   - If **NO**: It is a domain-specific business component.
3. **If a required GENERIC primitive does not exist:**
   - **STOP.**
   - Do NOT create module-level CSS.
   - Do NOT create duplicate generic components inside an application.
   - Do NOT silently modify the Design System.
   - **Report to the user:** (a) Missing capability, (b) Intended use, (c) Proposed generic API, (d) Affected screens. The Global Design System owner (Dev3) must handle or review the change.

---

## Article 9 — Business Components vs. Generic Primitives

Business components live inside their respective application module (e.g., `NewHireForm`, `OnboardingStageTracker`, `DocumentVerification`, `PreboardingChecklist`, `EmployeeConversionPanel`, `GeneralSettingsSection`, `StagesSettingsSection`).

- They encapsulate business state, validation, and domain orchestration.
- They **MUST** compose global Design System primitives (`Stack`, `Grid`, `Card`, `Button`, `Input`, etc.) for all presentation and layout.

---

## Article 10 — Icon System Invariants

Every icon in BEZENT must be rendered through `design-system/icons` (`BezentIcon` / `BezentNavIcon`).

- An AI agent must **never** introduce another icon library (e.g., Lucide, Material Icons, Font Awesome) into business modules.
- An AI agent must **never** create a second, competing icon registry or inline ad-hoc SVGs.
- Genuinely new icons are added to `design-system/icons/definitions/` under Design System ownership (Dev3).

---

## Article 11 — Navigation & Routing Architecture

- HRMS navigation has **ONE canonical catalog** (`apps/web/src/applications/hrms/navigation`).
- Do NOT duplicate navigation definitions in local arrays.
- Do NOT create a second router or routing mechanism inside a business module.
- The URL/router is the sole source of truth for selected navigation state.
- Navigation categories (e.g., "Workforce", "Talent", "Configuration") are grouping metadata, not architectural boundaries.

---

## Article 12 — Platform Capability Boundary

Cross-application capabilities (`platform/search`, `platform/utility-drawer`, `platform/notifications`, `platform/approvals`, `platform/tasks`, `platform/calendar`, `platform/notes`) belong to `platform`:

- Business source-of-truth remains with the owning domain:
  - An onboarding task is owned by `applications/hrms/onboarding`; the platform Tasks drawer displays a projection of assigned tasks.
  - A leave approval is owned by `applications/hrms/leave`; the platform Approvals drawer displays an aggregated approval item.
- Do NOT create HRMS-specific copies or local forks of platform utilities.
- Global Tasks is NOT Project Management tasks; Approvals is cross-application infrastructure.

---

## Article 13 — Backend Architecture Standards

Backend root: `apps/api/src/**`. All backend capabilities must strictly adhere to the established layered domain architecture:

```
routes → controller → service → repository → database (Drizzle)
               ↓          ↓
          validation    types
```

- **Controllers:** Handle HTTP request/response parsing and status codes. Do NOT place SQL or database logic inside controllers.
- **Services:** Encapsulate business logic, domain rules, and transaction boundaries. Controllers MUST NOT bypass services to talk directly to repositories.
- **Repositories:** Responsible strictly for data access via Drizzle queries. Repositories MUST NOT handle HTTP objects (`req`, `res`).
- **Validation:** Enforce request payloads via schemas (e.g., Zod) before reaching service logic.

---

## Article 14 — Database Invariants & Rules

1. **MySQL + Drizzle is Authoritative:**
   - **PROHIBITED:** Introducing SQLite, MongoDB, in-memory repositories, JSON-file persistence, or `localStorage` as server persistence.
   - **PROHIBITED:** Silently falling back to mock or in-memory data when MySQL is unreachable. If MySQL is unavailable, the application and tests MUST **fail clearly**.
2. **Migrations Only:**
   - Schema changes go strictly through Drizzle migrations (`apps/api/src/db/migrations`). Never hand-edit a database.
   - Never carelessly alter applied migration history. Never delete or rewrite existing applied migrations merely to make tests pass.

---

## Article 15 — Tenant & Company Isolation

- Every company-owned business record must be tenant/company scoped.
- Queries in repositories must explicitly enforce tenant/company scoping server-side. Frontend filtering is never treated as isolation.
- Do not hardcode company IDs across business code.
- Development context (`DEFAULT_DEV_CONTEXT`) is local development infrastructure only. Never treat development context or headers as production security.

---

## Article 16 — Identity Model Invariants

Do NOT conflate or merge the following distinct domain concepts:

- **User:** Authentication identity and access credentials.
- **Employee:** HRMS workforce record and employment history.
- **Candidate / New Hire:** Pre-employment onboarding identity.
- **Tenant:** Customer organization / account isolation boundary.
- **Company:** Legal / business entity within a tenant.
- **Organization Unit:** Structural hierarchy within a company (department, division, team).

**Invariants:**

- `User ≠ Employee` ([ADR-009](docs/architecture/ADRs.md#adr-009)).
- `Candidate ≠ Employee`.
- Identity and employment records are never informally merged.

---

## Article 17 — Roles & Permissions vs. Product Architecture

- Do NOT hardcode product architecture around strings like `role === "HR"`, `isHRManager`, or `HRManagerContext`.
- Roles and permissions represent authorization data, not code architecture:
  $$\text{User} \longrightarrow \text{Company Membership} \longrightarrow \text{Roles} \longrightarrow \text{Permissions} \longrightarrow \text{Capability}$$
- Business modules must remain role-neutral; components render capabilities based on granted permissions, not hardcoded role checks.

---

## Article 18 — Mocking & Fallback Policy

- Mocks are permitted **strictly** in:
  1. Unit and integration tests (`__tests__/**`)
  2. Test fixtures
  3. Explicit development demo providers
- **Forbidden Pattern:**
  ```typescript
  // STRICTLY PROHIBITED
  try {
    const data = await api.fetchRealData();
    return data;
  } catch (err) {
    return fakeMockSuccessData; // NEVER DO THIS
  }
  ```
- Runtime API failures must always surface appropriate UI states: **loading**, **empty**, **error**, and **retry**. Never fake API success.

---

## Article 19 — TypeScript & Type Safety

- The entire codebase (frontend and backend) is TypeScript.
- **PROHIBITED:** Converting `.ts → .js` or `.tsx → .jsx`.
- **PROHIBITED:** Using `any` merely to silence compiler or lint errors.
- Always declare explicit interfaces, domain types, and return types matching repository standards.

---

## Article 20 — Team Ownership & Coordination Boundaries

Per `.github/CODEOWNERS` and `docs/COLLABORATION.md`:

| Role      | Owner                                       | Primary Scope                                                                                                          | Responsibilities & Boundaries                                                                                                                                                                                        |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev 1** | Architecture Maintainer (`@mukeshm2002`)    | `apps/api/**`<br>`apps/web/src/applications/hrms/settings/`<br>`/.github/`<br>Repo architecture                        | Maintains backend foundation, settings frontend, API standards, and cross-application integration. Does not silently rewrite valid Dev2/Dev3 work.                                                                   |
| **Dev 2** | HRMS Business Frontend (`@Soundhranayaki1`) | `apps/web/src/applications/hrms/**` (except settings)                                                                  | Implements HRMS business workflows (Onboarding, Employees, Recruitment, Attendance, Leave, etc.). Must NOT create application CSS, duplicate generic UI, or touch backend without coordination.                      |
| **Dev 3** | Global Frontend Foundation (`@sabinrahul`)  | `apps/web/src/design-system/**`<br>`apps/web/src/layouts/**`<br>`apps/web/src/platform/**`<br>`apps/web/src/shared/**` | Owns UI foundation, Design System primitives, AppShell, and global utilities. **Core Rule:** _Change how it looks, do NOT change what it does._ Must not alter business validation, workflows, payloads, or routing. |

Ownership is coordination guidance. Cross-owner modifications must be minimal, necessary, explicitly reported, and reviewed by the affected owner.

---

## Article 21 — Git Workflow & Protected Branch Policy

1. **Protected Branches:** `main` and `develop` are permanently protected.
   - **NEVER** perform normal feature work directly on `main` or `develop`.
   - **NEVER** push commits directly to `main` or `develop`.
2. **Normal Feature Lifecycle:**
   $$\text{latest } develop \longrightarrow \text{task branch} \longrightarrow \text{validate} \longrightarrow \text{commit} \longrightarrow \text{push} \longrightarrow \text{PR to } develop \longrightarrow \text{CI} \longrightarrow \text{squash merge}$$
3. **Release Lifecycle:** `develop → main` exclusively via a dedicated release PR.
4. **Squash Merge Only:** All PRs into `develop` and `main` must use squash merge. Rebase merge and merge commits are prohibited on feature PRs.

---

## Article 22 — One Task = One Branch = One PR

- Every task begins from a fresh checkout of the latest `origin/develop`.
- **PROHIBITED:** Permanent personal developer branches.
- **PROHIBITED:** Accumulating unrelated tasks into a single branch.
- **PROHIBITED:** Reusing a merged or stale feature branch for a subsequent task.
- Immediately after a PR merges:
  ```bash
  git switch develop
  git pull --ff-only origin develop
  ```
  Then create a new task branch.

---

## Article 23 — Safe Start Procedure

Before starting **ANY** task:

```bash
git status
```

1. The working tree **must be completely clean**. If dirty: **STOP.** Do not auto-stash, do not reset, do not delete files. Report the existing changes first.
2. Update local `develop`:
   ```bash
   git fetch origin
   git switch develop
   git pull --ff-only origin develop
   git status
   ```
3. Create the task branch:
   ```bash
   git switch -c <type>/<task-name>
   ```

---

## Article 24 — Pre-Code Inspection Protocol

Every agent must inspect before writing code:

- **SEARCH FIRST. REUSE SECOND. CREATE LAST.**
- Inspect existing implementations, architecture docs, available Design System components, backend APIs, callers, tests, and ownership boundaries.
- Never implement duplicate functionality because searching was inconvenient.

---

## Article 25 — Safe Synchronization Before Push

Before pushing any branch:

```bash
git fetch origin
git log --oneline HEAD..origin/develop
```

- If `origin/develop` has not advanced: Proceed with push.
- If `origin/develop` has advanced:
  ```bash
  git merge origin/develop
  ```
  Resolve conflicts **semantically** (see Article 26), and rerun the entire validation suite.
- Do NOT routinely rebase shared or team branches.

---

## Article 26 — Semantic Conflict Resolution

- **PROHIBITED:** Resolving conflicts blindly using `git checkout --ours` or `git checkout --theirs`.
- Never assume the feature branch version is right. Never assume the develop version is right.
- Inspect the diff, understand the upstream changes, understand the task changes, and preserve valid functionality from both sides.
- If a merge conflict crosses ownership boundaries: **STOP and report it immediately.**

---

## Article 27 — Strictly Forbidden Git Operations

Unless explicitly instructed and authorized for documented disaster recovery, coding agents are **strictly forbidden** from executing:

- `git push --force` or `git push --force-with-lease`
- `git reset --hard`
- `git clean -fd`
- `git rebase` or `git rebase -i` on shared branches
- Blind cherry-picking
- Blind conflict resolution (`-X ours` / `-X theirs`)
- History rewriting or deleting teammate commits

---

## Article 28 — Commit & PR Standards

### 1. Commit Standards

- Stage intended files explicitly (`git add path/to/file1 path/to/file2`). Avoid `git add .` unless every modified file has been individually reviewed.
- Use conventional, scoped commit messages (e.g., `feat(hrms): integrate onboarding server drafts`, `fix(api): enforce onboarding company isolation`, `refactor(web): centralize application styling`, `chore(repo): strengthen agent governance`).

### 2. PR Target & Scope

- **Verify PR Base:** Normal PRs must **ALWAYS** target `develop`. Never open a feature PR against `main`.
- **Single Coherent Task:** Do not mix backend features, frontend styling, governance changes, and dependency updates in a single PR. If scope expands, **STOP and recommend splitting the work.**
- **Comprehensive PR Description:** PRs must detail purpose, scope, changed files, architecture impact, API/DB changes, UI changes (with screenshots), validation results, and limitations.

---

## Article 29 — Validation Gate & CI Standards

### 1. Local Validation Gate

Before pushing code or marking a task complete, run and pass all required checks:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

- If any check fails, **do not claim success**. Report the exact failure command, the error, and the cause.
- Never weaken a test or modify architecture merely to make a check pass.

### 2. Required GitHub Status Check: `verify`

- The required GitHub status check for branch protection on `develop` and `main` is named exactly: **`verify`** (defined in `.github/workflows/ci.yml`).
- A PR must not be merged until `verify` passes.
- Do NOT bypass branch protection. Do NOT disable or weaken CI checks.

---

## Article 30 — Agent Stop Conditions

Coding agents must **STOP and report immediately** instead of guessing or proceeding when:

1. Architecture ownership is ambiguous or disputed.
2. The current working branch is unexpected or the working tree contains uncommitted/unknown changes.
3. A required backend API endpoint or contract does not exist.
4. A required generic Design System capability is missing.
5. A merge conflict crosses module or ownership boundaries.
6. Database migration history is inconsistent or unclear.
7. An operation would require modifying protected branches (`main`, `develop`) directly.
8. A destructive Git operation (`reset --hard`, force push, `clean -fd`) appears necessary.
9. Fulfilling the task would require faking production data or swallowing API errors with mock fallbacks.
10. Task instructions or prompt requirements contradict this Constitution (`AGENTS.md`).

---

## Article 31 — Pre-Push Architecture Audit Checklist

Before pushing any commit or opening a PR, every coding agent must complete this 15-point audit:

1. Did I change only the requested task scope?
2. Did I search existing code before creating new files?
3. Did I reuse existing Design System primitives?
4. Did I introduce ANY application CSS files (`.css` in `applications/**`)? _(Must be NO)_
5. Did I introduce ANY inline styling (`style={{ ... }}`)? _(Must be NO)_
6. Did I create duplicate global UI or competing shells? _(Must be NO)_
7. Did I maintain the canonical dependency direction?
8. Did I modify another developer's owned area without coordination?
9. Did I alter any API contract or payload unexpectedly?
10. Did I alter DB schema or migrations without proper Drizzle migrations?
11. Did I introduce silent mock fallbacks for failed APIs? _(Must be NO)_
12. Did I enforce tenant and company isolation on all server queries?
13. Did all validation checks pass (`typecheck`, `lint`, `format:check`, `test`, `build`)?
14. Is the PR base branch confirmed to be `develop`?
15. Is this PR still a single, coherent task?

---

## Article 32 — Hygiene: Generated Files & Secrets

- **No Generated Artifacts:** Never commit build outputs, distribution directories (`dist/`, `build/`), coverage reports (`coverage/`), logs, IDE configurations, or temporary files.
- **No Secrets:** Never commit `.env` files, API keys, database credentials, passwords, or personal access tokens. Use environment variables and maintain `.env.example`. Never display secrets in agent conversation logs or reports.

---

## Article 33 — No Speculative Scaffolding

Do not create empty folders, dummy packages, or speculative capabilities "for future use" or "to look complete." Before adding a new folder under `platform/`, `applications/`, or `packages/`, verify that the active milestone scope explicitly requires it. A folder is created when its first real implementation lands, not before.

---

## Article 34 — Enforcement & Compliance

- CI (`.github/workflows/ci.yml`) mechanically enforces linting, formatting, typechecking, database migrations, tests, and builds on every pull request.
- ESLint mechanically enforces the Zero Inline CSS and styling rules.
- Review and codeowners enforce ownership boundaries, dependency directions, and Git hygiene.
- **Passing CI does not authorize an architectural deviation.** Code quality and governance compliance are distinct requirements.

---

## Repository Commands Reference

```bash
npm install               # Install dependencies (npm only, single package-lock.json)
npm run dev               # Start frontend (3000) and backend (3001) concurrently
npm run dev:web           # Start frontend only
npm run dev:api           # Start backend only
npm run build             # Build both frontend and backend
npm run typecheck         # Run TypeScript checks across both apps
npm run lint              # Run ESLint across entire repository
npm run format:check      # Check formatting with Prettier
npm run test              # Execute all tests (API integration + frontend tests)
npm run db:migrate        # Apply pending Drizzle migrations (requires MySQL)
npm run db:seed           # Seed database with development baseline
```
