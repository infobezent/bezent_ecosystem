# HRMS Navigation, Routing and the More Launcher

**Status: implemented (Phase 0B.8), validated and frozen (Phase 0B.9).
Navigation and routing only — no HRMS module is implemented.** Governed by [AGENTS.md](../../AGENTS.md).

## 1. HRMS as an application

HRMS is a BEZENT **business application** (`applications/hrms`) rendered
inside the one global `AppShell`. There is no `HRMSLayout`. Its navigation
domains (Leave, Attendance, Payroll, ...) are business modules/domains of the
application, not applications.

## 2. Canonical catalog ownership

`apps/web/src/applications/hrms/navigation/hrmsNavigation.ts` is the ONLY
place HRMS destinations are defined. The sidebar, sub-navigation, More
launcher, routes and search context are all derived from it. Nothing in
`layouts`, `app`, `platform` or pages may keep its own list. The old
`devShellNavigation.ts` was deleted.

## 3. Navigation type model (`shared/types/navigation.ts`)

Generic (reusable by CRM/PM), typed against the canonical `BezentIconName`:

- `NavDestination { id, label, icon, segment, subtitle?, description?, keywords?, categoryId?, sidebar?, quickAccess?, permissionKey?, children? }`
- `NavChild { id, label, icon, permissionKey? }`
- `NavCategory { id, label, description?, icon }`
- `ApplicationNavigation { categories, destinations }`

Placement is expressed on one entry, without duplication: `sidebar: true` →
LeftSidebar; `categoryId` → also listed in More; `children` → sub-navigation
(flyout).

## 4. Route scheme

`/<application>/<destination>[/<child>]` — `/hrms/attendance`,
`/hrms/leave/holidays`; future `/crm/...`, `/projects/...`. Routes are
**generated from the catalog** in `applications/hrms/routes/hrmsRoutes.tsx`
(no second route map). `/` → `/hrms` → `/hrms/dashboard` (redirects,
`replace`). Unknown `/hrms/*` renders a "Page not available" placeholder
inside the shell; addresses outside any application render a global one.
`app/router/AppRouter.tsx` only mounts `application.routes`.

## 5. Primary sidebar (7 + More)

Dashboard, Onboarding, Leave, Attendance, Timesheets, Performance,
Employees, then the More button. Source: the old six fixed slots plus the
dynamic slot's default (Employees). The old user-swappable dynamic slot
needed persisted preferences and is not migrated.

## 6. More launcher (20 destinations, 6 categories)

Final approved categories (`MORE_CATEGORIES`): **People** (Onboarding,
Employees, Organization, Recruitment), **Work & Time** (Leave, Attendance,
Timesheets, Shifts), **Growth** (Performance, Learning, Career Paths), **Pay &
Benefits** (Payroll, Compensation, Benefits), **Workplace** (Documents, Assets,
Employee Requests), **HR Operations** (Standard Operations, Reports, HR
Settings). Includes Quick Access tiles (Leave, Attendance, Employees, Payroll —
the `quickAccess` flag), category drill-in, search, and the active/“More has an
active item” marker. The old 4-group `MORE_GROUP_DEFINITIONS` and the
prototype "All / People / Workforce / Development / Admin" idea are dead code
and not used.

**Mechanism vs data:** `layouts/app-shell/MoreLauncher` is generic (props:
categories, items, active id, `onSelect`). HRMS supplies data only through
the catalog. Not migrated (all localStorage-backed preferences): Quick Access
pinning/"Customize", "Recently Used", promoting a tool to the sidebar.

## 7. Sub-navigation

Supplied by `children`; the generic `SubNavFlyout` renders them and reports
the choice. Rows: Dashboard (Overview, Analytics, Activity), Onboarding (New
Hires, Task Checklists, Document Collection, Workflows), Leave (Leave Summary,
Apply Leave, Leave Approvals, Holiday Calendar), Attendance (Daily Log,
Monthly Summary, Regularization, Policies), Timesheets (Timer & Log, Weekly
Timesheets, Project Hours, Approvals), Performance (Goals & OKRs, Appraisals,
360 Feedback); launcher-only parents also carry children for routing:
Organization (Departments, Org Chart), Recruitment (Job Openings, Candidates,
Interviews, Offers). Depth is one level.

**IA decisions vs the old prototypes:** Time Tracker merged into Timesheets;
Job Openings/Candidates/Interviews/Offers → Recruitment children; Goals &
OKRs and Appraisals → Performance children; Workforce Hub and Operations
dropped (dead catalog only); Reports added; Onboarding added to People; the
old generic filler flyout (`DEFAULT_SUBNAV_ITEMS`) is not carried over.

## 8. Permission-ready metadata

Each destination has `permissionKey` (`hrms.<id>.view`). Metadata only:
nothing evaluates it, no roles exist, nothing is hidden. Global roles (Super
Admin, Company Admin) are not HRMS navigation concepts.

## 9. Selected state

Derived from the URL by `resolveActiveNavigation` (`shared/utils/navigation`)
— no separate selected-nav state. Deep links and refresh work
(`/hrms/attendance` loads with Attendance selected). Launcher-only
destinations show a marker dot on More.

## 10. Application identity

`BezentApplication { id, label, basePath, defaultDestinationId, navigation,
routes }` (`shared/types/application.ts`), registered in
`app/config/applications.ts`. The shell picks the application by URL prefix.

## 11. Global utility separation

Notifications (top-nav), Approvals, Tasks, Calendar and Notes are global
platform utilities and are not HRMS destinations.

## 12. Documents vs Notes

Resolved: the global rail button is **Notes** (`notes` icon, label "Notes",
same drawer/behaviour); **Documents** is an HRMS destination (`/hrms/documents`,
Workplace). They are unrelated; Documents never opens the Notes drawer.

## 13. Future CRM / PM

Add `applications/crm/{navigation,routes}`, export a `BezentApplication`,
register it. `LeftSidebar`, `SubNavFlyout`, `MoreLauncher` and AppShell
geometry need no change — only supplied data differs.

## 14. Old → new

| Old                                                                               | New                                          |
| --------------------------------------------------------------------------------- | -------------------------------------------- |
| `FIXED_PRIMARY_ITEMS`, dynamic-slot default                                       | `sidebar: true` destinations                 |
| `MODULE_CATALOG`, `MORE_GROUP_DEFINITIONS` (4 groups, dead)                       | replaced by the single catalog               |
| `BEZENT_TOOL_REGISTRY`, `MORE_CATEGORIES` (launcher)                              | catalog `categories` + `categoryId`          |
| `MODULE_SUBNAV_MAP`, `DEFAULT_SUBNAV_ITEMS`                                       | `children`                                   |
| `MODULE_TO_SLUG`, hash routing, `getParentModuleForChild`, `isParentModuleActive` | generated routes + `resolveActiveNavigation` |
| `isModulePermitted` / `permission`                                                | `permissionKey` (metadata)                   |
| `MoreLauncher.tsx`                                                                | `layouts/app-shell/MoreLauncher`             |

## 15. Intentionally unimplemented

Every module page (placeholders only), Quick Access pinning/recent tools,
dynamic sidebar slot, permission evaluation, breadcrumbs, mobile navigation.

## 16. Adding an HRMS destination

1. Add one entry to `HRMS_NAV_DESTINATIONS` (id, label, canonical icon,
   `segment`, `permissionKey`, optional `categoryId`/`sidebar`/`children`).
2. Nothing else: the route, sidebar/launcher entry and flyout follow. Never
   add a local sidebar array or hand-written route.
3. Keep labels short (one line in the 78px sidebar item).

## Layout gaps vs the old UI

More launcher category icons use BEZENT nav icons instead of the removed
lucide "enterprise" glyphs; launcher rows for Job Openings/Candidates/
Interviews/Offers/Goals are gone (now sub-navigation); the pinning star and
"Recently Used" are absent; launcher-only destinations have no flyout.

## Phase 0B.9 validation

**Origin of every destination** — A = old approved UI, B = existing BEZENT
product plan, C = introduced in 0B.8.

| Destination                                                                                                                                                        | Origin              | Note                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------- |
| Dashboard, Leave, Attendance, Performance, Employees                                                                                                               | A                   | old primary rail / dynamic-slot default                                 |
| Onboarding                                                                                                                                                         | A + B               | old primary rail; People category is C (old launcher omitted it)        |
| Timesheets                                                                                                                                                         | A + B               | old `Time Tracker` rail slot and `Timesheets` module merged (see below) |
| Organization, Recruitment, Shifts, Learning, Career Paths, Payroll, Compensation, Benefits, Documents, Assets, Employee Requests, Standard Operations, HR Settings | A                   | old launcher tools                                                      |
| Reports                                                                                                                                                            | A (old catalog) + B | absent from the final launcher registry, kept as a planned domain       |

**Sub-navigation review:**

| Item                                                                 | Origin                                                                                           | Decision                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Dashboard: Overview / Analytics / Activity                           | A (prototype flyout)                                                                             | KEEP                                                       |
| Onboarding: New Hires, Task Checklists, Document Collection          | A (prototype)                                                                                    | KEEP                                                       |
| Onboarding: Workflows                                                | C (relabel of A `Workflow Settings`)                                                             | **RENAME back** to Workflow Settings (`workflow-settings`) |
| Leave: Summary, Apply, Approvals, Holiday Calendar                   | A                                                                                                | KEEP                                                       |
| Attendance: Daily Log, Monthly Summary                               | A (renamed from Today's Log)                                                                     | KEEP                                                       |
| Attendance: Regularization                                           | B (planned Attendance admin area; old launcher description)                                      | KEEP                                                       |
| Attendance: Policies                                                 | A (Attendance Policy)                                                                            | KEEP                                                       |
| Timesheets: Timer & Log, Weekly Timesheets, Project Hours, Approvals | A                                                                                                | KEEP                                                       |
| Performance: Goals & OKRs, Appraisals, 360 Feedback                  | A (old top-level Goals/Reviews + prototype)                                                      | KEEP (moved under Performance)                             |
| Organization: Departments, Org Chart                                 | A (prototype listed them under Employees) + B (Organization = structure, departments, hierarchy) | KEEP (moved to Organization)                               |
| Recruitment: Job Openings, Candidates, Interviews, Offers            | A (old top-level)                                                                                | KEEP (moved under Recruitment)                             |

No further destinations were invented.

**Timesheets vs Time Tracker — final:** ONE concept, **Timesheets**. The
planned HRMS domain list has Timesheets only; the old prototype's Time Tracker
and Timesheets modules had overlapping sub-navigation. The sidebar keeps the
old clock glyph (`timeTracker` icon). "time tracker" survives only as a
launcher search keyword — it is not a destination or an alias route.

**Dashboard / Home / Overview — final:** the landing destination is
**Dashboard** (`/hrms/dashboard`, the old rail's first item); **Overview** is
its first sub-view. There is no separate "Home" concept anywhere in the
catalog.

**Primary sidebar — frozen:** Dashboard, Onboarding, Leave, Attendance,
Timesheets, Performance, Employees, More (matches the old rail order:
six fixed slots + the dynamic slot's default; labels are one line at 10.5px;
guarded by a test).

**More launcher — validated:** 20 destinations / 6 categories (People 4, Work &
Time 4, Growth 3, Pay & Benefits 3, Workplace 3, HR Operations 3), no
duplicates or orphans (tests enforce unique ids and valid categories).

**Launcher-only parents (Organization, Recruitment, and every More-only
destination):** was a real inconsistency (their children were unreachable
after selection). Resolved from the catalog, with no second sidebar: while a
launcher-only destination is the active route it appears as a contextual
sidebar slot before More, with its flyout. Nothing persists; it disappears
when you navigate to a sidebar destination (the old UI's persisted dynamic
slot, without the persistence).
