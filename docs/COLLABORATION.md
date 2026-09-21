# BEZENT — Team Collaboration Guide

> **3-person engineering team.** This document is the single reference
> for how we collaborate on the BEZENT monorepo. Keep it practical —
> not enterprise ceremony.

---

## 1. Branch Strategy

`main
  │  Stable baseline. Protected. Releases are tagged here.
  │
  └── develop
       │  Normal team integration branch. All feature work merges here first.
       │
       ├── feature/<scope>     New capability
       ├── fix/<scope>         Bug fix
       ├── refactor/<scope>    Code restructure (no behaviour change)
       ├── docs/<scope>        Documentation only
       ├── test/<scope>        Test additions/corrections
       └── chore/<scope>       Tooling, config, dependencies`

**Normal development flow:**

`

1. Branch off develop
   git switch develop
   git pull origin develop
   git switch -c feature/<scope>

2. Develop and commit locally

3. Open PR → target: develop

4. Pass CI + 1 review → squash merge into develop

5. When develop is stable → PR: develop → main → normal merge
   `

Developers do **not** commit directly to main or develop.

---

## 2. Developer Ownership

Ownership = **primary reviewer + maintainer + conflict resolver** for that
area. It does not mean exclusive commit rights. Cross-domain work
(e.g. full-stack feature slices) is expected and done through PR review.

### Developer 1 — Platform & Backend Foundation

**Primary areas:**

| Path                  | Description                            |
| --------------------- | -------------------------------------- |
| pps/api/              | All backend source                     |
| pps/api/src/app/      | API bootstrap, server, middleware      |
| pps/api/src/db/       | Drizzle schema, migrations, connection |
| pps/api/src/platform/ | Shared backend services                |
| pps/api/src/shared/   | Shared backend utilities/types         |

**Future responsibility (not yet implemented):**
Tenant scoping · Company/Legal Entity · Organizational Units · Locations ·
Users · Roles & Permissions · RBAC · Auth · Audit/Security

### Developer 2 — HRMS Domain & Workflows

**Primary areas:**

| Path                           | Description                  |
| ------------------------------ | ---------------------------- |
| pps/web/src/applications/hrms/ | HRMS frontend domain         |
| pps/api/src/applications/hrms/ | HRMS backend domain (future) |

**Future responsibility (not yet implemented):**
Recruitment · Candidates · Interviews · Onboarding · Employees ·
Attendance · Leave · Shifts · Timesheets · Performance · Learning ·
Career · Documents · Assets · Employee Requests · HR Reports · HR Settings

**First priority when development begins:** Onboarding vertical slice

### Developer 3 — Frontend Foundation & Shared Experience

**Primary areas:**

| Path                       | Description                                                     |
| -------------------------- | --------------------------------------------------------------- |
| pps/web/src/design-system/ | Design system (tokens, components, icons)                       |
| pps/web/src/layouts/       | AppShell, TopNav, LeftSidebar, RightRail, BottomBar             |
| pps/web/src/platform/      | Global search, notifications, approvals, tasks, calendar, notes |
| pps/web/src/shared/        | Shared frontend utilities, types, hooks                         |
| pps/web/src/app/           | Bootstrap, router, providers                                    |

**Future responsibility:**
App Shell evolution · Design System extensions · Global Search integration ·
Shared frontend services · Frontend build/tooling

---

## 3. Branch Naming Rules

Format: <prefix>/<brief-kebab-scope>

| Prefix   | Use for                              |
| -------- | ------------------------------------ |
| eature/  | New capability                       |
| ix/      | Bug fix                              |
|          |
| efactor/ | Restructure without behaviour change |
| docs/    | Documentation only                   |
| est/     | Test additions/corrections           |
| chore/   | Tooling, config, dependency updates  |

**Examples:**

`feature/onboarding-candidate-list
feature/onboarding-workflow
feature/organization-foundation
fix/search-keyboard-navigation
refactor/hrms-navigation
docs/onboarding-architecture
chore/update-vite
test/hrms-navigation-coverage`

**Never include developer names in branch names.**

`

# BAD

feature/mukesh-onboarding

# GOOD

feature/onboarding-workflow
`

---

## 4. Commit Convention

Use **Conventional Commits** style.

`
<type>(<optional scope>): <short description>

[optional body]
`

**Allowed types:**

| Type    | Use for                              |
| ------- | ------------------------------------ |
| eat     | New feature or capability            |
| ix      | Bug fix                              |
|         |
| efactor | Restructure without behaviour change |
| docs    | Documentation only                   |
| est     | Adding or fixing tests               |
| chore   | Tooling, config, dependency changes  |
| uild    | Build system changes                 |
| ci      | CI/CD configuration changes          |

**Good examples:**

`feat(onboarding): add candidate checklist component
feat(api): add organization endpoint
fix(search): correct keyboard navigation on mobile
refactor(hrms): simplify route registration
docs(architecture): document tenant boundary rules
chore(deps): update vite to 6.5
test(taskUtils): add edge cases for overdue detection`

**Avoid:**

- update / changes / inal / ix stuff / misc
- One giant commit covering multiple unrelated concerns
- Committing unrelated whitespace/formatting in the same commit as logic

---

## 5. Pull Request Workflow

### Opening a PR

1. Push your branch to origin
2. Open PR on GitHub
3. **Target:** develop (not main) for all feature work
4. Fill in the PR template completely

### PR Checklist (must pass before merge)

All CI checks must be green:

`ash
npm run lint
npm run format:check
npm run typecheck
npm run test       # must be 43+ passing
npm run build
`

### What a Good PR Looks Like

- Focused on **one logical change**
- Self-contained — CI passes on its own
- Includes screenshots for any visual change
- Notes any API/DB/architecture impact
- Reasonable size — reviewers can read it in one session

### Avoid Mixing in One PR

- UI redesign + database migration
- Backend refactor + unrelated cleanup
- Multiple unrelated features

Unless the changes are technically inseparable, keep them separate.

---

## 6. Review Rules

**Minimum:** 1 teammate review before merging into develop.

For changes to **high-ownership areas**, prefer review from the primary owner:

| Area                                | Preferred reviewer |
| ----------------------------------- | ------------------ |
| design-system/, layouts/, platform/ | Developer 3        |
| pps/api/, db/, auth/RBAC            | Developer 1        |
| pplications/hrms/ domain logic      | Developer 2        |

For develop → main PRs:

- Require team review + all CI checks passing
- Author should not self-merge

Reviewers: focus on logic correctness, architecture alignment, and
test coverage — not style (that is what Prettier/ESLint are for).

---

## 7. Merge Strategy

| PR direction       | Strategy                           | Reason                                                                          |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| eature/* → develop | **Squash merge**                   | Feature branches contain WIP commits; develop receives one clean logical commit |
| develop → main     | **Merge commit** (normal PR merge) | Preserves a clear integration boundary in main history                          |

**Never:**

- Force push main or develop after collaboration begins
- Rewrite shared branch history
- Merge directly without a PR (except Phase 4 bootstrap, now complete)

---

## 8. Shared-File Conflict Policy

Some files are touched by all three developers. Extra care applies.

**High-conflict shared files:**

| File / Path                               | Why shared                        |
| ----------------------------------------- | --------------------------------- |
| pps/web/src/app/router/                   | All features add routes           |
| pps/web/src/app/router/ShellLayout.tsx    | Global layout wiring              |
| pps/web/src/applications/hrms/navigation/ | HRMS nav catalog                  |
| pps/api/src/app/                          | API server / middleware bootstrap |
| pps/api/src/db/schema*                    | Database schema                   |
| pps/web/src/design-system/tokens/         | Global CSS tokens                 |
| pps/web/src/design-system/icons/          | Icon system                       |
| package.json / package-lock.json          | Dependency management             |
| sconfig.json                              | TypeScript config                 |

**Rules before editing shared files:**

1. **Mention it** — note the change in your task/issue/PR description
2. **Coordinate** — avoid two developers making simultaneous structural edits
3. **Primary owner review** — the owner of that area reviews the change
4. **Pull latest develop** before starting major shared-file work

**When resolving conflicts:**

Do **not** blindly choose ours or heirs. Read both sides, understand
the intent, and merge intentionally. If uncertain, ask before merging.

---

## 9. Database Migration Policy

> **Database implementation has not begun.** These rules apply when it does.

- All schema changes go through **Drizzle migrations**
  (pps/api/src/db/migrations/)
- Migrations must be **committed** — never apply schema changes without one
- **Never manually alter** a shared/production schema
- **Never edit** another developer's already-applied migration — create a
  new migration for subsequent changes
- DB naming conventions must remain consistent (snake_case, plural tables)
- Every tenant-scoped table must carry an explicit enant_id
- Developer 1 is primary reviewer for all schema changes

---

## 10. Design System Policy

- Applications **consume** design-system components — they do not define
  competing styles, color palettes, or icon systems
- design-system/ must **not** import application-specific code
- Do not add one-off application styling into global tokens
- Do not duplicate an existing primitive — search design-system/components
  before creating any Button/Input/Badge/Tooltip-like element
- **No inline CSS** — enforced by ESLint (
  o-inline-styles)
- All visual/token changes require **Developer 3 review**
- Icon additions go into design-system/icons/definitions/ — never inside
  an application
- See docs/architecture/DESIGN-SYSTEM.md and docs/architecture/UI-RULES.md
  for full rules

---

## 11. Definition of Done

A feature is **done** when:

- [ ] Implementation matches the agreed scope
- [ ] All existing tests pass (
      pm run test — 43+ green)
- [ ] New code is covered by appropriate tests
- [ ] pm run lint, ormat:check, ypecheck, uild all pass
- [ ] PR template filled in (including UI screenshots if applicable)
- [ ] At least 1 reviewer approved
- [ ] Squash merged into develop
- [ ] No regressions on develop after merge

---

## 12. Emergency / Hotfix Workflow

For a critical production fix that cannot wait for develop:

`

1. Branch off main directly:
   git switch -c fix/critical-<scope> main

2. Apply the minimal fix

3. PR → main (with explicit team acknowledgement)
   Require at least 1 review

4. After merge to main, immediately merge main back into develop
   to keep both branches in sync:
   git switch develop
   git merge main
   git push origin develop
   `

Hotfix branches are **not** a shortcut for normal features. They must be
genuinely urgent and minimal.

---

## 13. CODEOWNERS

`.github/CODEOWNERS` is active. GitHub will automatically request reviews
from the assigned owners whenever a PR touches their area.

**Confirmed GitHub usernames:**

| Developer   | GitHub username    | Primary area                            |
| ----------- | ------------------ | --------------------------------------- |
| Developer 1 | `@mukeshm2002`     | Platform & Backend Foundation           |
| Developer 2 | `@Soundhranayaki1` | HRMS Domain & Workflows                 |
| Developer 3 | `@sabinrahul`      | Frontend Foundation & Shared Experience |

**Active ownership mapping (`.github/CODEOWNERS`):**

| Path                                                    | Owners                                          |
| ------------------------------------------------------- | ----------------------------------------------- |
| `/.github/`                                             | `@mukeshm2002` `@sabinrahul`                    |
| `/package.json`, `/package-lock.json`, `/tsconfig.json` | `@mukeshm2002` `@sabinrahul`                    |
| `/docs/`, `/AGENTS.md`, `/CLAUDE.md`                    | `@mukeshm2002` `@Soundhranayaki1` `@sabinrahul` |
| `/apps/api/`                                            | `@mukeshm2002`                                  |
| `/apps/web/src/app/`                                    | `@mukeshm2002` `@sabinrahul`                    |
| `/apps/web/src/applications/hrms/`                      | `@Soundhranayaki1`                              |
| `/apps/web/src/design-system/`                          | `@sabinrahul`                                   |
| `/apps/web/src/layouts/`                                | `@sabinrahul`                                   |
| `/apps/web/src/platform/`                               | `@sabinrahul`                                   |
| `/apps/web/src/shared/`                                 | `@sabinrahul`                                   |

**Precedence note:** CODEOWNERS uses last-match wins. Rules in `.github/CODEOWNERS`
are ordered from general to specific so that specific paths (e.g. `hrms/`)
take precedence over broader ones (e.g. `app/`).

---

## 14. GitHub Branch Protection — Manual Setup Required

Branch protection rules **cannot be configured from the local CLI**. Apply
the following settings in GitHub UI:

**GitHub → Settings → Branches → Add ruleset**

### main

| Setting                                             | Value                            |
| --------------------------------------------------- | -------------------------------- |
| Require a pull request before merging               | ✅                               |
| Required approvals                                  | 1                                |
| Dismiss stale approvals when new commits are pushed | ✅                               |
| Require status checks to pass                       | ✅                               |
| Required check name                                 | erify _(the job name in ci.yml)_ |
| Require branch to be up to date                     | ✅                               |
| Block force pushes                                  | ✅                               |
| Block branch deletion                               | ✅                               |

### develop

| Setting                               | Value |
| ------------------------------------- | ----- |
| Require a pull request before merging | ✅    |
| Required approvals                    | 1     |
| Require status checks to pass         | ✅    |
| Required check name                   | erify |
| Block force pushes                    | ✅    |
| Block branch deletion                 | ✅    |

---

## 15. Team Access — Pending

Collaborator invitations have **not** been sent automatically (no GitHub
usernames confirmed).

**Recommended repository role for each developer:** Write

The repository owner retains Admin or Maintain as appropriate.

To invite collaborators:
**GitHub → Settings → Collaborators → Add people**

---

## 16. Getting Started (New Developer Checklist)

`ash

# Clone the repository

git clone https://github.com/infobezent/bezent_ecosystem.git
cd bezent_ecosystem

# Install all dependencies (npm workspaces)

npm install

# Copy environment template

cp .env.example .env

# Fill in DB_HOST, DB_USER, DB_PASSWORD, DB_NAME

# Verify everything passes

npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build

# Start development

npm run dev
`

Read before writing any code:

1. AGENTS.md — the engineering constitution (mandatory)
2. docs/architecture/README.md — phase roadmap and scope
3. The doc(s) in docs/architecture/ for your area (per AGENTS.md Article 2)
