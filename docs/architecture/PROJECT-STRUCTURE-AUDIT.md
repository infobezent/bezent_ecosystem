# Project Structure Audit (Pre-0B.9)

**Audit only — nothing was moved, deleted, renamed or restructured.** Method:
the file list comes from `git ls-files -co --exclude-standard` filtered to files
that exist on disk; the import graph, cycles, orphans, unused exports, filename
case and CSS/doc-link checks come from a script over the real sources (not from
documentation). The audit describes the working tree **as it is now**, which
already contains the Phase 0B.9 changes (removed legacy tokens, focus rings,
`--shadow-brand-sm`, web tests, `/dev` gating); it is not a pre-0B.9 snapshot.

## A. Executive summary

- **Architecture is internally consistent.** Zero layer-rule violations, zero
  circular dependencies, zero case-sensitivity import risks, zero unresolved
  imports, one navigation catalog, one route composition strategy, one icon
  registry, one of each global component, no MongoDB/legacy backend, no secrets.
- **No BLOCKER.** One HIGH: the new project is not committed at all (see N/W).
- The real problems are hygiene, not architecture: env-file ownership, dev CSS
  and fixtures shipping in the production bundle, two stale/broken documents,
  a few unused exports, and a types/runtime version mismatch (`@types/express` 5
  vs `express` 4).
- Ready for the UI foundation freeze **after P0 items below** (all small).
  Ready for Phase 1 on the frontend; backend/env plumbing needs P0 fixes first.

## B. Actual repository tree (first-party files on disk)

Generated from disk; every first-party file is listed (grouped by directory,
`(n)` = file count). Ignored/generated: `node_modules/`, `dist/`, `.git/`.

```text
(root)/  (12)
    .env.example, .gitignore, .nvmrc, .prettierignore, .prettierrc.json, AGENTS.md, CLAUDE.md, README.md, eslint.config.mjs, package-lock.json, package.json, tsconfig.json
.claude/  (1)
    launch.json
.github/workflows/  (1)
    ci.yml
apps/api/  (3)
    drizzle.config.ts, package.json, tsconfig.json
apps/api/src/  (1)
    main.ts
apps/api/src/app/config/  (1)
    env.ts
apps/api/src/app/errors/  (2)
    AppError.ts, errorHandler.ts
apps/api/src/app/middleware/  (1)
    notFound.ts
apps/api/src/app/server/  (2)
    createApp.ts, health.route.ts
apps/api/src/app/server/__tests__/  (1)
    health.test.ts
apps/api/src/applications/hrms/  (1)
    README.md
apps/api/src/db/  (2)
    connection.ts, schema.ts
apps/api/src/db/migrations/  (1)
    .gitkeep
apps/api/src/platform/  (1)
    README.md
apps/api/src/shared/  (1)
    README.md
apps/web/  (6)
    index.html, package.json, tsconfig.app.json, tsconfig.json, tsconfig.node.json, vite.config.ts
apps/web/src/  (3)
    App.tsx, main.tsx, vite-env.d.ts
apps/web/src/app/config/  (2)
    applications.ts, env.ts
apps/web/src/app/providers/  (2)
    AppProviders.tsx, ThemeProvider.tsx
apps/web/src/app/router/  (8)
    AppRouter.tsx, DevPlaceholderPage.css, DevPlaceholderPage.tsx, NotFoundPage.tsx, ShellLayout.tsx, devSearchFixtures.ts, devUtilityFixtures.ts, shellNavigation.ts
apps/web/src/applications/hrms/  (2)
    README.md, index.ts
apps/web/src/applications/hrms/navigation/  (3)
    hrmsNavigation.test.ts, hrmsNavigation.ts, index.ts
apps/web/src/applications/hrms/pages/  (2)
    ModulePlaceholder.css, ModulePlaceholder.tsx
apps/web/src/applications/hrms/routes/  (2)
    hrmsRoutes.tsx, index.ts
apps/web/src/assets/  (2)
    .gitkeep, README.md
apps/web/src/design-system/  (1)
    README.md
apps/web/src/design-system/components/  (1)
    index.ts
apps/web/src/design-system/components/Avatar/  (3)
    Avatar.css, Avatar.tsx, index.ts
apps/web/src/design-system/components/Badge/  (3)
    Badge.css, Badge.tsx, index.ts
apps/web/src/design-system/components/Button/  (3)
    Button.css, Button.tsx, index.ts
apps/web/src/design-system/components/EmptyState/  (5)
    EmptyState.css, EmptyState.tsx, EmptyStateIllustration.css, EmptyStateIllustration.tsx, index.ts
apps/web/src/design-system/components/IconButton/  (3)
    IconButton.css, IconButton.tsx, index.ts
apps/web/src/design-system/components/Tooltip/  (3)
    Tooltip.css, Tooltip.tsx, index.ts
apps/web/src/design-system/icons/  (3)
    index.ts, registry.ts, types.ts
apps/web/src/design-system/icons/components/  (4)
    BezentIcon.tsx, BezentNavIcon.tsx, icons.css, index.ts
apps/web/src/design-system/icons/definitions/  (6)
    crm.tsx, global.tsx, hrms.tsx, index.ts, pm.tsx, shared.ts
apps/web/src/design-system/styles/  (3)
    base.css, globals.css, reset.css
apps/web/src/design-system/tokens/  (6)
    index.ts, layout.css, motion.css, theme.css, tokens.ts, typography.css
apps/web/src/layouts/  (1)
    README.md
apps/web/src/layouts/app-shell/  (16)
    AppShell.css, AppShell.tsx, BottomBar.css, BottomBar.tsx, LeftSidebar.css, LeftSidebar.tsx, MoreLauncher.css, MoreLauncher.tsx, RightRail.css, RightRail.tsx, SubNavFlyout.css, SubNavFlyout.tsx, TopNav.css, TopNav.tsx, index.ts, types.ts
apps/web/src/platform/  (1)
    README.md
apps/web/src/platform/approvals/  (4)
    ApprovalsDrawer.css, ApprovalsDrawer.tsx, index.ts, types.ts
apps/web/src/platform/calendar/  (4)
    CalendarDrawer.css, CalendarDrawer.tsx, index.ts, types.ts
apps/web/src/platform/notes/  (4)
    NotesDrawer.css, NotesDrawer.tsx, index.ts, types.ts
apps/web/src/platform/notifications/  (4)
    NotificationsPanel.css, NotificationsPanel.tsx, index.ts, types.ts
apps/web/src/platform/search/  (12)
    GlobalSearch.css, GlobalSearch.tsx, SearchEmptyState.css, SearchEmptyState.tsx, SearchFilters.css, SearchFilters.tsx, SearchResultRow.css, SearchResultRow.tsx, SearchResults.css, SearchResults.tsx, index.ts, types.ts
apps/web/src/platform/tasks/  (4)
    TasksDrawer.css, TasksDrawer.tsx, index.ts, types.ts
apps/web/src/platform/utility-drawer/  (7)
    UtilityDrawerParts.css, UtilityDrawerParts.tsx, UtilityDrawerShell.css, UtilityDrawerShell.tsx, index.ts, registry.ts, useActiveUtility.ts
apps/web/src/shared/  (1)
    README.md
apps/web/src/shared/constants/  (1)
    .gitkeep
apps/web/src/shared/hooks/  (1)
    .gitkeep
apps/web/src/shared/types/  (3)
    .gitkeep, application.ts, navigation.ts
apps/web/src/shared/utils/  (3)
    .gitkeep, navigation.test.ts, navigation.ts
docs/  (1)
    CODING-STANDARDS.md
docs/api/  (2)
    README.md, STANDARDS.md
docs/architecture/  (21)
    ADRs.md, APPLICATION-BOUNDARIES.md, APPSHELL.md, BACKEND.md, DATABASE.md, DEPENDENCY-RULES.md, DESIGN-SYSTEM-COMPONENTS.md, DESIGN-SYSTEM-TOKENS.md, DESIGN-SYSTEM.md, FRONTEND.md, GLOBAL-SEARCH.md, GLOBAL-UTILITIES.md, HRMS-NAVIGATION.md, ICON-SYSTEM.md, README.md, REPOSITORY.md, TECH-STACK.md, UI-MIGRATION-FINAL.md, UI-MIGRATION-INVENTORY.md, UI-MIGRATION.md, UI-RULES.md
docs/database/  (2)
    README.md, RULES.md
docs/security/  (1)
    README.md
scripts/  (1)
    README.md
```

## C. Folder count

- Directories on disk (excl. `node_modules`, `dist`, `.git`): **65**
- Directories that directly contain first-party files: **59**
- Empty directories: **0** (6 `.gitkeep` files — see Y)

## D. File count

- First-party files on disk: **201**
- Tracked-by-Git files that no longer exist on disk (old prototype UI, deletions
  uncommitted): **54**
- By area: `apps/web/src` 136 (design-system 44, platform 40, layouts 17, app 12,
  shared 9, applications 9, root files/assets 5), `apps/api` 15 (+`src` 14),
  `docs` 27, repo root 12, `scripts` 1, `.github` 1, `.claude` 1, web config/entry 5.
- By type: `.ts` 70, `.tsx` 61 (incl. tests), `.md` 40, `.css` 37, `.json` 13,
  `.yml` 1, other config 8, `.gitkeep` 6.

## E. Architecture ownership map

| Path                                                                                         | Owner                   | Verdict                                                                                                              |
| -------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/{config,providers,router}`                                                 | app (composition)       | OK; `router/dev*` and `DevPlaceholderPage` are development composition (see T)                                       |
| `apps/web/src/applications/hrms/{navigation,routes,pages}`                                   | applications            | OK; only navigation, generated routes and a placeholder                                                              |
| `apps/web/src/design-system/{tokens,icons,components,styles}`                                | design-system           | OK; `icons/definitions/{crm,pm}.tsx` are design-system-owned icons for future apps (intentional, per ICON-SYSTEM.md) |
| `apps/web/src/layouts/app-shell`                                                             | layouts                 | OK; geometry/composition only, no HRMS strings                                                                       |
| `apps/web/src/platform/{search,notifications,approvals,tasks,calendar,notes,utility-drawer}` | platform                | OK; no application/layout imports                                                                                    |
| `apps/web/src/shared/{types,utils}`                                                          | shared                  | OK, small; see I/18                                                                                                  |
| `apps/web/src/{App.tsx,main.tsx,vite-env.d.ts}`                                              | bootstrap               | intentional Vite entry files at `src/` root                                                                          |
| `apps/api/src/{app,db,main.ts}` + `applications/platform/shared` READMEs                     | server                  | OK; `applications/hrms`, `platform`, `shared` are README-only boundaries                                             |
| `docs/**`                                                                                    | documentation           | see M                                                                                                                |
| root config, `.github`, `.claude`, `scripts`                                                 | configuration / tooling | see F                                                                                                                |

## F. Root-file audit

| File                                                       | Why at root / consumer                           | Copy?                                 | Current?                                   | Verdict                                                           |
| ---------------------------------------------------------- | ------------------------------------------------ | ------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `package.json`, `package-lock.json`                        | npm workspace root; npm, CI                      | single lockfile                       | yes (`npm ci --dry-run` OK)                | KEEP                                                              |
| `tsconfig.json`                                            | base config extended by both apps                | —                                     | yes                                        | KEEP                                                              |
| `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore` | repo-wide lint/format                            | —                                     | yes                                        | KEEP                                                              |
| `.gitignore`, `.nvmrc` (20), `.env.example`                | repo tooling                                     | —                                     | see G/H                                    | KEEP (env: REVIEW)                                                |
| `README.md`, `AGENTS.md`, `CLAUDE.md`                      | entry + governance                               | —                                     | README/AGENTS current; **CLAUDE.md stale** | KEEP / REVIEW                                                     |
| `.claude/launch.json`                                      | preview server config for the Claude desktop app | —                                     | yes                                        | KEEP (untracked; consider ignoring `.claude/settings.local.json`) |
| `.github/workflows/ci.yml`                                 | CI                                               | old `deploy.yml`/`static.yml` deleted | see W                                      | KEEP                                                              |
| `scripts/README.md`                                        | placeholder for automation                       | old `scripts/writeIcons.js` deleted   | yes ("empty")                              | KEEP (intentional empty boundary)                                 |

Root clutter: none. Deleted-but-tracked legacy root files: `index.html`,
`vite.config.ts`, `pnpm-lock.yaml`, `.mise.toml`, `.gitattributes`, `public/404.html`,
`.figma/make/*`, `src/**` (54 files) — pending commit of the deletion.

## G. Package / dependency audit

Three manifests (root, `@bezent/api`, `@bezent/web`), one lockfile.
Workspaces `apps/*`; `npm ls` shows a clean tree; `npm ci --dry-run` succeeds.

- Root devDeps (eslint stack, prettier, `concurrently`, `typescript`) are all used
  (config/scripts). `typescript` is declared in all three (deduped to 5.9.3) — INFO.
- API deps all used (cors, helmet, dotenv, drizzle-orm, express, mysql2; tsx,
  drizzle-kit, vitest, supertest). **`@types/express` ^5 vs `express` ^4.21
  (installed 4.22.3 / types 5.0.6): mismatched major — MEDIUM.**
- Web deps all used (react, react-dom, react-router-dom, vite, plugin-react,
  vitest). Frontend packages are not installed at root; backend packages are not
  in web. No MongoDB/Mongoose/Prisma/Sequelize/TypeORM anywhere (also absent from
  the lockfile). No obsolete migration dependencies (no lucide, tailwind, etc.).
- `npm` prints `allow-scripts` warnings for `esbuild` postinstall — INFO.

## H. Configuration audit

- **TypeScript:** root base + `apps/web` project references (app + node) + `apps/api`
  NodeNext. Consistent; `apps/web/tsconfig.app.json` includes `src` (so tests are
  type-checked). No stale paths/aliases (none exist).
- **Vite:** minimal (`react()` plugin, port 5173); no aliases, no `envDir`.
- **ESLint (flat):** one config covering web/api; enforces the no-inline-`style`
  rule. No CSS linting (INFO).
- **Prettier:** one config; `package-lock.json` ignored.
- **Vitest:** no config files; API and web each run `vitest run` (node env).
- **Tailwind/PostCSS:** none (correctly absent).
- **Env loading:** see next section.

## I. Frontend architecture audit

Measured import edges (count of imports across layers): app→platform 13,
app→shared 5, app→design-system 3, app→layouts 2, app→applications 1,
applications→shared 4, applications→design-system 1, layouts→design-system 10,
platform→design-system 21, shared→design-system 1. **No other edges exist.**

Deviations from the expected tree (all intentional or trivial):

| Deviation                                              | Verdict                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `App.tsx`, `main.tsx` at `src/` root                   | Intentional Vite entry files (FRONTEND.md documents them) — INFO    |
| `design-system/styles/` (not in expected tree)         | Intentional global reset/base/globals — INFO                        |
| `app/router` holds dev fixtures + `DevPlaceholderPage` | Intentional but should be grouped/clearly separated — LOW (see R/T) |
| `shared/{hooks,constants}/.gitkeep` empty              | Intentional future boundaries — INFO                                |
| `assets/` empty + README                               | Intentional (no assets exist) — INFO                                |

Extensibility (`applications/{hrms,crm,project-management}`): verified in 0B.9 by
registering a temporary second application with zero changes to AppShell,
LeftSidebar, SubNavFlyout, MoreLauncher, search, utilities, theme or icons.
Nothing in the structure blocks CRM/PM.

## J. Backend audit

14 source files: `main.ts`, `app/{config/env,errors/{AppError,errorHandler},middleware/notFound,server/{createApp,health.route,__tests__/health.test}}`,
`db/{connection,schema,migrations/.gitkeep}`, plus README-only `applications/hrms`,
`platform`, `shared`. Express 4 + helmet + cors + JSON; one route
(`/api/v1/health`), 404 + error handlers. **No legacy code, no duplicate entry
points, no auth, no security-sensitive temporary code.** `cors()` is fully open
(acceptable with no auth; must be tightened before real endpoints — INFO/LOW).

## K. Database audit

Technology that exists **today**: MySQL driver (`mysql2`) + Drizzle ORM/kit
configured (`drizzle.config.ts`, `db/connection.ts` lazy pool, `db/schema.ts`
exports nothing, `db/migrations/` empty). **No tables, no migrations, no live
connection tested.** No Mongoose/MongoDB files (nothing to report separately).
Not implemented yet: schema, migrations, tenancy, users.

## L. Test audit

| Kind                       | Files                                                                                    | Tests | Notes                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| API test (supertest)       | `apps/api/.../health.test.ts`                                                            | 1     | health endpoint only                                                             |
| Frontend unit (pure logic) | `shared/utils/navigation.test.ts`, `applications/hrms/navigation/hrmsNavigation.test.ts` | 20    | navigation resolution, catalog integrity, route generation, frozen sidebar order |
| Frontend component tests   | —                                                                                        | 0     | none                                                                             |
| Integration / E2E          | —                                                                                        | 0     | none; browser QA was manual                                                      |

`npm run test` = API (1) + web (20). It does not test any UI rendering.

## M. Documentation audit

40 Markdown files. Statuses:

- CURRENT: root `README.md`, `AGENTS.md`, `docs/architecture/{ADRs,APPLICATION-BOUNDARIES,APPSHELL,BACKEND,DATABASE,DEPENDENCY-RULES,DESIGN-SYSTEM*,FRONTEND,GLOBAL-SEARCH,GLOBAL-UTILITIES,HRMS-NAVIGATION,ICON-SYSTEM,README,REPOSITORY(minor),TECH-STACK,UI-MIGRATION-FINAL,UI-RULES}`, `docs/{CODING-STANDARDS,api,database,security}/*`, platform/layouts/design-system READMEs.
- HISTORICAL (fine, labelled): `UI-MIGRATION-INVENTORY.md` (Phase 0B.1 analysis).
- **STALE:** `CLAUDE.md` ("This is Phase 0… no old-UI migration"), `docs/architecture/UI-MIGRATION.md` (titled "Phase 0B — future"), `apps/web/src/shared/README.md` ("Empty in Phase 0" but holds `types/` and `utils/` files), `REPOSITORY.md` root tree omits `.claude/`, `.nvmrc`, `.prettierignore`.
- **BROKEN LINKS:** `apps/web/src/applications/hrms/README.md` and `apps/api/src/applications/hrms/README.md` use `../../../../docs/...` (4 levels) but need 5 (`../../../../../docs/...`) — 7 dead links. All other doc links resolve.
- No duplicated documents.

## N. Dependency violations

**None.** Layer rules checked: design-system → ∅; layouts → design-system only;
platform → design-system only; shared → design-system only (one type import, INFO);
applications → shared/design-system/layouts/platform (no cross-application imports);
app → all. `layouts`↔`platform` never import each other.

## O. Circular dependencies

**None** (Tarjan SCC over 152 TS/TSX files; barrels, registries, application
registration and navigation included).

## P. Duplicate files

None: no name-pattern duplicates (`copy/old/new/final/backup/temp`), no exact or
near-duplicate files. Semantic duplicate systems: none (one nav catalog, one
route source, one icon registry split by category files merged in
`definitions/index.ts`, one of Button/IconButton/Tooltip/Badge/Avatar/EmptyState,
one drawer shell). Minor CSS coupling: `AppShell.css` and `RightRail.css` both
define `.app-shell` modifiers; `LeftSidebar.css` and `SubNavFlyout.css` both
touch `.left-sidebar__item-wrap` — LOW.

## Q. Dead / delete candidates (proven unused)

| File                                                          | Evidence                                                | Class                        |
| ------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| `apps/web/src/shared/types/.gitkeep`, `shared/utils/.gitkeep` | directories now contain real files                      | DELETE-CANDIDATE             |
| the 54 tracked legacy prototype files                         | absent from disk; only the uncommitted deletion remains | DELETE (commit the deletion) |

Unreferenced but **kept**: `apps/web/src/app/config/env.ts` (`appConfig` imported
nowhere, `VITE_API_BASE_URL` has no consumer — REVIEW, becomes live when the API
client exists), `design-system/tokens/{index,tokens}.ts` (typed accessor layer,
zero consumers — REVIEW, documented API), `apps/api/src/db/schema.ts` (drizzle
entry via config string). Unused exports: `appConfig`, `THEME_STORAGE_KEY`
(index.html duplicates the literal), `NavIcon` alias, `THEME/TYPOGRAPHY/MOTION/LAYOUT_TOKENS`.
All other "unused export" hits are prop-type interfaces used locally (intentional public types).

## R. Move candidates

| File(s)                                                                                | Suggestion                                                                                                 | Severity         |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- |
| `app/router/{devSearchFixtures,devUtilityFixtures}.ts`, `DevPlaceholderPage.{tsx,css}` | group under one clearly dev-only folder (e.g. `app/dev/`) so removal is one delete and dev CSS is isolated | LOW              |
| `app/router/NotFoundPage.tsx`                                                          | give it its own styles (currently depends on `.dev-placeholder` from dev CSS)                              | MEDIUM (see V/W) |

No architectural-layer mistakes found; nothing is in the wrong layer.

## S. Rename candidates

None. Naming is consistent: PascalCase components, lowercase module files,
camelCase data/hooks (`useActiveUtility.ts`, `hrmsNavigation.ts`); only `hrms.tsx`/`crm.tsx`/`pm.tsx`
(icon category files) are lowercase by intent.

## T. Dev / fixture files

| File                                                             | Class                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/router/devSearchFixtures.ts`                                | REMOVE BEFORE PRODUCTION / REPLACE in Phase 1+ (real search provider)                                                                             |
| `app/router/devUtilityFixtures.ts`                               | REMOVE BEFORE PRODUCTION / REPLACE in Phase 1+ (real providers)                                                                                   |
| `app/router/DevPlaceholderPage.{tsx,css}`                        | KEEP TEMPORARILY (dev route only); delete once real pages exercise the design system                                                              |
| `applications/hrms/pages/ModulePlaceholder.{tsx,css}`            | KEEP TEMPORARILY — replaced per module as modules are built (intentionally shows only "implementation starts next phase"; masquerades as nothing) |
| `app/router/NotFoundPage.tsx`                                    | KEEP (production 404 page) but fix its CSS dependency                                                                                             |
| `BottomBar` static footer items / "All Systems Operational" text | static shell copy from the old UI — INFO                                                                                                          |

All static records resembling employees/notifications/tasks/approvals/events/notes/
search results live **only** in the two fixture files (composition-owned,
imported only by `ShellLayout`, never by `platform` or HRMS). There is no
production hardcoded business data; `hrmsNavigation.ts` is navigation configuration.

## U. Security-sensitive findings

No hardcoded passwords, keys, tokens, JWT secrets, OTP/auth bypasses or
wildcard authorization found (three pattern hits were env-var _name_ reads and a
`token?` type field). `.env` files are ignored and only `.env.example` exists
(variable names only: `NODE_ENV, API_PORT, VITE_API_BASE_URL, DB_HOST, DB_PORT,
DB_USER, DB_PASSWORD, DB_NAME`). Only note: `cors()` open by default (INFO/LOW,
before real endpoints). No `dangerouslySetInnerHTML`/`innerHTML`/`eval`.

## V. Hardcoded-style findings

- Inline style / `element.style` / `setAttribute('style')`: **0** in production
  source (the last two `style.colorScheme` writes were removed in 0B.9).
- Brand literals (`#931cf5`, `rgba(147,28,245,…)`) outside `theme.css`: 11 —
  EmptyState CTA shadows + illustration fills (documented exception), rail-tab
  shadow (documented). `--shadow-brand-sm` covers the logo/Badge.
- z-index literals outside tokens: 7, all micro-layers (0/1/2/5) inside component
  stacking contexts; no 999/9999.
- Literal animation/transition durations remain in ~17 CSS files (0.1–0.16s hover
  fades from the old UI); main animations use motion tokens — INFO.

## W. Build / deployment findings

- `dist/` is ignored and not tracked. `npm run build` reproduces both apps.
- **Git state (HIGH):** the only commit is the _old_ prototype baseline. The new
  project is 195 untracked files; 54 old files show as deleted; no remote; the
  local branch is `master` while CI triggers on `main`. A fresh clone would not
  contain the project.
- CI (`ci.yml`): Node 20, `npm ci`, lint → format:check → typecheck → build →
  test — matches the repo's scripts. Old `deploy.yml`/`static.yml` (Figma Make
  Pages deploy) were deleted; no deployment config exists for the new stack
  (INFO until hosting is chosen).
- **Dev CSS ships in production (MEDIUM):** `dist` CSS contains `.dev-placeholder`
  and `.dev-icon-check` (the dev page's stylesheet is a side-effect import that
  survives tree-shaking) and `NotFoundPage` silently relies on `.dev-placeholder`.
- **Fixtures ship in production JS (MEDIUM, documented):** "Sample Person…" strings
  are in the production bundle.
- **Env ownership (MEDIUM):** `.env.example` is at the repo root, but
  `dotenv/config` (API) and Vite read `.env` relative to the workspace/cwd
  (`apps/api`, `apps/web`), so a root `.env` is not loaded by either.
  `DATABASE_URL` is supported by code/drizzle config but absent from the example.
  `VITE_API_BASE_URL` has no consumer yet.

## X. Naming / case findings

- Filename-case import mismatches (Windows→Linux risk): **0** (each import
  resolved and compared segment-by-segment against real directory listings).
- Unresolved relative imports: **0**.
- Naming style is consistent (see S).

## Y. Empty directories

None empty. `.gitkeep`: `api/db/migrations` (intentional), `web/assets`
(intentional), `web/shared/{constants,hooks}` (intentional future boundaries),
`web/shared/{types,utils}` (**redundant** — now populated).

## Z. Final recommended canonical tree

The current tree is already the recommended one, with these refinements only:

```text
apps/web/src/
├── app/            config/ (env.ts when the API client exists), providers/, router/
│   └── dev/        devSearchFixtures.ts, devUtilityFixtures.ts, DevPlaceholderPage.* (removable as one unit)
├── applications/hrms/{navigation,routes,pages}
├── design-system/{tokens,icons,components,styles}
├── layouts/app-shell/
├── platform/{search,notifications,approvals,tasks,calendar,notes,utility-drawer}
├── shared/{types,utils}   (+ hooks/, constants/ only when real files exist)
├── assets/                (empty until real assets)
├── App.tsx, main.tsx, vite-env.d.ts
```

## Severity register

| Sev     | #   | Findings                                                                                                                                                                                                                                                                                                                                                            |
| ------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BLOCKER | 0   | —                                                                                                                                                                                                                                                                                                                                                                   |
| HIGH    | 1   | H1 new project uncommitted / branch `master` vs CI `main` / no remote                                                                                                                                                                                                                                                                                               |
| MEDIUM  | 6   | M1 env-file ownership (root example vs cwd-relative loaders; `DATABASE_URL` undocumented); M2 dev CSS in production + `NotFoundPage` coupling; M3 dev fixtures in production JS; M4 `CLAUDE.md` stale; M5 broken links in both `applications/hrms` READMEs; M6 `@types/express` 5 vs `express` 4                                                                    |
| LOW     | 9   | stale `shared/README.md`; stale `UI-MIGRATION.md` title; `REPOSITORY.md` tree gaps; 2 redundant `.gitkeep`; unused exports (`appConfig`, `THEME_STORAGE_KEY`, `NavIcon`, typed token consts); typed-token layer with zero consumers; cross-file CSS class coupling (2 spots); `icons.css` global `button:hover` selector; `.claude/settings.local.json` not ignored |
| INFO    | 8   | `cors()` open until auth; `.nvmrc` 20 vs local 24; entry files at `src/` root; `shared→design-system` type import; static BottomBar copy; no CSS lint / component / e2e tests; large icon-definition files (1296/915/474/292 lines, data not logic); `allow-scripts` warnings                                                                                       |

## Summary table

| Metric                                         | Value                                                   |
| ---------------------------------------------- | ------------------------------------------------------- |
| Total folders (65 incl. no empty) / with files | 65 / 59                                                 |
| Total first-party files (disk)                 | 201 (+54 tracked-but-deleted legacy)                    |
| KEEP                                           | 126                                                     |
| REVIEW                                         | 10                                                      |
| MOVE                                           | 4 (dev files)                                           |
| MERGE                                          | 0                                                       |
| RENAME                                         | 0                                                       |
| DELETE-CANDIDATE                               | 2 (+54 legacy deletions to commit)                      |
| FIXTURE                                        | 4 (same files as MOVE)                                  |
| TEST                                           | 3                                                       |
| CONFIG                                         | 21                                                      |
| DOCUMENTATION                                  | 35 (+5 flagged REVIEW = 40 `.md`)                       |
| GENERATED                                      | 0 tracked (`dist`, lockfile is config)                  |
| Dependency violations                          | 0                                                       |
| Circular dependencies                          | 0                                                       |
| Duplicate systems                              | 0                                                       |
| Dead files                                     | 2 `.gitkeep` (+ 3 unreferenced-but-kept)                |
| Unused exports (real)                          | 6                                                       |
| Hardcoded style violations                     | 0 inline; 11 documented brand literals; 7 micro z-index |
| Security-sensitive findings                    | 0 secrets / 0 bypasses (1 INFO: open CORS)              |
| Case-sensitive import risks                    | 0                                                       |
| Build/test failures                            | 0                                                       |

## Gate results (run after the audit)

| Command                | What it runs                                | Result                      |
| ---------------------- | ------------------------------------------- | --------------------------- |
| `npm run lint`         | ESLint over the whole repo                  | pass                        |
| `npm run format:check` | Prettier check (also run by CI)             | pass                        |
| `npm run typecheck`    | `tsc` API + `tsc -b` web                    | pass                        |
| `npm run build`        | API `tsc` + web `tsc -b && vite build`      | pass                        |
| `npm run test`         | API Vitest (1 test) + web Vitest (20 tests) | pass; no UI/e2e tests exist |
| `npm ci --dry-run`     | lockfile ↔ manifests sync                   | pass                        |

## Final answers

1. **Internally consistent?** Yes — layers, imports, routing, navigation, icons and components.
2. **Wrong layer?** Nothing. Only the dev files could be grouped better.
3. **Duplicate systems?** None.
4. **Dead/legacy files?** 2 redundant `.gitkeep`; 54 legacy prototype files already deleted on disk but not committed; no legacy backend/DB.
5. **Safe to remove?** The 2 `.gitkeep`; (later) dev fixtures + dev page; nothing else proven dead.
6. **Should move?** Dev files → one `app/dev/` folder (LOW).
7. **Ready for UI freeze?** Yes, after P0 (all small, non-architectural).
8. **Ready for Phase 1?** Frontend yes; backend/env/Git plumbing needs P0 first.
9. **Must fix before Phase 1?** See P0.
10. **Should fix later?** See P1–P3.

## Prioritized cleanup plan

**P0 — before Phase 1**

1. Commit the project (delete legacy files in the same commit), decide `main` vs `master`, add a remote (H1).
2. Env ownership: pick one convention (e.g. load root `.env` via explicit path in `env.ts`/`drizzle.config.ts`, and set Vite `envDir` to the repo root), add `DATABASE_URL` to `.env.example` (M1).
3. Isolate dev CSS: give `NotFoundPage` its own styles and stop shipping `DevPlaceholderPage.css` in production (M2).
4. Update `CLAUDE.md` to the current state (M4); fix the 7 broken README links (M5).
5. Align `@types/express` with the installed Express major (M6).

**P1 — before production** 6. Remove dev fixtures/`ShellLayout` fixture wiring when real providers exist (M3); delete `/dev`. 7. Tighten CORS; add auth before any real endpoint; decide deployment target and CI branch.

**P2 — maintainability** 8. Group dev files under `app/dev/`; delete the 2 redundant `.gitkeep`; refresh `shared/README.md`, `UI-MIGRATION.md` title, `REPOSITORY.md` tree; ignore `.claude/settings.local.json`. 9. Decide the fate of the unused typed-token layer and unused exports (`appConfig`, `THEME_STORAGE_KEY`, `NavIcon`).

**P3 — optional** 10. Add component/E2E tests and CSS lint; consider tokenizing repeated literal transition durations; split the large icon-definition data files if they become hard to review.
