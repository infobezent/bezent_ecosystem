# UI Migration — Final Foundation and Freeze

**Status: Phase 0B complete; UI FOUNDATION FROZEN (Phase 0B.9).** This is the
summary of the migrated frontend. The per-area documents remain authoritative
for detail:
[DESIGN-SYSTEM-TOKENS](DESIGN-SYSTEM-TOKENS.md),
[ICON-SYSTEM](ICON-SYSTEM.md),
[DESIGN-SYSTEM-COMPONENTS](DESIGN-SYSTEM-COMPONENTS.md),
[APPSHELL](APPSHELL.md),
[GLOBAL-SEARCH](GLOBAL-SEARCH.md),
[GLOBAL-UTILITIES](GLOBAL-UTILITIES.md),
[HRMS-NAVIGATION](HRMS-NAVIGATION.md).

## 1. Structure (`apps/web/src`)

```
app/            composition only: providers (theme), config/applications.ts
                (application registry), router (ShellLayout, AppRouter, dev fixtures)
design-system/  tokens (theme/typography/motion/layout + typed access),
                icons (ONE registry), components (Button, IconButton, Tooltip,
                Badge, Avatar, EmptyState), styles
layouts/        app-shell: AppShell, TopNav, LeftSidebar (+NavItem), SubNavFlyout,
                MoreLauncher, RightRail, BottomBar
platform/       search, notifications, approvals, tasks, calendar, notes,
                utility-drawer (registry, shell, shared parts)
applications/   hrms: navigation (canonical catalog), routes (generated),
                pages/ModulePlaceholder
shared/         types (navigation, application), utils (navigation)
```

## 2. Dependency rules (audited)

```
app  ──►  applications, platform, layouts ──►  design-system
                                          ──►  shared
applications ──► shared (and may use design-system/layouts/platform)
shared ──► design-system (icon-name type only)
```

Measured import graph: `app → applications, design-system, layouts, platform,
shared`; `applications → shared`; `layouts → design-system`; `platform →
design-system`; `shared → design-system`; `design-system → ∅`. No violations:
layouts and platform import no application code; design-system imports nothing
upward; `layouts` and `platform` do not import each other (composition in
`app/router/ShellLayout` is the only meeting point). The single non-leaf edge
is `shared/types/navigation.ts` → the design-system icon-name type.

## 3. Extension model

- **New HRMS destination:** one entry in `HRMS_NAV_DESTINATIONS`. Routes,
  sidebar/launcher entries and flyouts follow.
- **New application (CRM/PM):** export a `BezentApplication` (id, label,
  basePath, defaultDestinationId, navigation, routes) and register it in
  `app/config/applications.ts`. Verified in 0B.9 with a temporary second
  application: sidebar, flyout, launcher categories, the contextual slot and
  routing all worked with **zero** changes to AppShell/LeftSidebar/
  SubNavFlyout/MoreLauncher (probe removed afterwards).
- **New utility capability:** add to `UTILITY_CAPABILITIES`, build
  `platform/<name>`, add its case in `ShellLayout`.
- **New design-system component:** only via the rubric in
  DESIGN-SYSTEM-COMPONENTS.md.

## 4. Dev route and fixtures

- `/dev` (DevPlaceholderPage) is registered **only when `import.meta.env.DEV`**;
  it is absent from production bundles (verified: build contains none of its
  strings) and never in navigation. Delete it when real pages exercise the
  design system.
- `devSearchFixtures.ts` and `devUtilityFixtures.ts` (composition-owned in
  `app/router`, imported only by `ShellLayout`, never by `platform` or
  HRMS) stay until real providers exist. **They currently ship in production
  builds — the shell must not be released with them.** Remove them with the
  first real search/notification/task/approval/calendar/notes providers.

## 5. Quality baseline (0B.9)

Inline style: zero visual violations. Brand literals: audited (see
DESIGN-SYSTEM-TOKENS §18); `--shadow-brand-sm` added, EmptyState
gradient/illustration and the rail-tab shadow documented as local exceptions.
z-index: all layering uses `--z-*` tokens; only micro-layers 0/1/2/5 inside
component stacking contexts remain. Motion: tokens for the main animations,
component and global `prefers-reduced-motion` rules. Icons: one registry, no
external library. Tests: API `health` (1) + frontend catalog/routing/
navigation tests (20, Vitest, pure logic — no component or browser tests).

## 6. Known limitations (accepted, not defects of this migration)

- Approved **dark** tokens give low contrast for `--icon-active` (#a020f0) on
  dark surfaces (selected rail icon ≈1.9:1, drawer "Open →"/"View all" links
  ≈3.5:1, launcher "View all →" ≈3.4:1) and light muted text (`--text-muted`
  #968d9d, drawer due text) is ≈3.1–3.3:1. These are the old UI's values and
  were not changed; a future design decision could use the lighter
  `--nav-icon-active` (#c084fc) for dark selected states.
- Filter chips in drawers are presentational (as in the old UI).
- Deferred features: full pages/forms for utilities, Convert to Task,
  Customize drawer, AI panel, launcher pinning/recents, permission engine,
  backend search, real profile/notification state, mobile navigation.
- No side-by-side run of the old and new UI was performed; parity is claimed
  only against old source values, not pixel-for-pixel.

## 7. UI FOUNDATION FREEZE

Frozen as of this phase: **AppShell, TopNav, LeftSidebar, RightRail,
BottomBar, SubNavFlyout, MoreLauncher, Global Search, global utilities, the
theme, the icon language and the global component language.** HRMS pages are
built on top of them. A change to any of these needs an explicit global-shell
or design-system reason and the Article 4 process — not a module-level
convenience. Bug fixes and documented additions (e.g. a new icon or a new
evidenced token) are allowed through the normal rubrics.
