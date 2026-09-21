# BEZENT AppShell

**Status: implemented (Phase 0B.5).** The single global BEZENT application
shell. Governed by [AGENTS.md](../../AGENTS.md); visual source of truth is
the approved old UI (see [UI-MIGRATION-INVENTORY.md](UI-MIGRATION-INVENTORY.md)).

## 1. Ownership

`apps/web/src/layouts/app-shell/`. The shell is named **AppShell**, never
`HRMSLayout`: HRMS, and every future application (CRM, Project Management,
Finance, ...), renders inside it. `layouts` may depend on `design-system`
and `shared` only; it never imports `applications/*`, `platform/*` or `app/*`
(theme/router state is passed in as props by `app/router`).

## 2. Component tree

```
layouts/app-shell/
├── AppShell.tsx / .css        grid composition; owns right-rail open state
├── TopNav.tsx / .css          branding, search shell, utilities, profile
├── LeftSidebar.tsx / .css     nav rail + NavItem (private)
├── SubNavFlyout.tsx / .css    generic hover flyout
├── RightRail.tsx / .css       utility buttons, theme control, collapse
├── BottomBar.tsx / .css       footer text + footer buttons
├── types.ts                   ShellNavItem, ShellSubNavItem
└── index.ts                   public API: AppShell + types
```

```
┌──────────────────────── TopNav (60) ────────────────────────┐
│ LeftSidebar │        workspace (children)        │ RightRail │
│    (90)     │      the only scroll container     │ (48 | 0)  │
└──────────────────────── BottomBar (36) ─────────────────────┘
```

## 3. Dimensions

From `design-system/tokens/layout.css`: `--shell-topbar-height` 60,
`--shell-sidebar-width` 90, `--shell-right-rail-width` 48,
`--shell-bottom-bar-height` 36. Phase 0B.5 added the nav geometry
(`--shell-nav-item-*`, `--shell-nav-label-*`, from the old
`SIDEBAR_NAV_TOKENS`) and `--shell-subnav-flyout-width` (250, old flyout).
Components never restate these numbers.

## 4-8. Region responsibilities

- **TopNav** — BEZENT logo/wordmark, search area, Notifications (with Badge),
  Settings, Quick Create, BEZENT AI, App Launcher, profile Avatar. **All
  controls are inert visual shells.** The search bar is a read-only
  slot (`topNavSearch`) filled by the host with Global Search (Phase 0B.6).
- **LeftSidebar** — renders `ShellNavItem[]` supplied by the caller. Icon +
  two-line label, hover/selected states via `BezentNavIcon`.
- **RightRail** — Tasks, Approvals, Calendar, Documents buttons (visual only,
  optional active highlight via props), theme control, collapse/expand.
  Collapsed = column width 0 plus an edge tab.
- **BottomBar** — copyright, static "All Systems Operational" text (copied
  from the old UI, not a live feed), five footer buttons (inert).
- **Workspace** — `<main>` receiving `children` (the router `Outlet`). No
  screen content is hard-coded in the shell.

## 9. Sub-navigation ownership

The flyout mechanism (anchor, hover/open, notch, selected row) is generic and
lives in `layouts`. **Data is supplied by the caller**: today
`app/router/devShellNavigation.ts` (temporary dev data, explicitly not an
HRMS catalog); from Phase 0B.8, `applications/hrms/navigation`. Dependency
direction: application → data → shell, never the reverse. Open/close and
vertical anchoring are pure CSS (no measured pixel values, no inline style).

## 10. Scroll architecture

| Layer                     | Responsibility                                                       |
| ------------------------- | -------------------------------------------------------------------- |
| viewport / `html`, `body` | never scrolls                                                        |
| `.app-shell`              | `height: 100dvh; overflow: hidden`, CSS grid                         |
| `.app-shell__workspace`   | **the single scroll owner** (`overflow: auto`)                       |
| `.left-sidebar__list`     | scrolls only if nav items overflow the rail                          |
| flyout                    | `position: fixed`, escapes sidebar clipping; body scrolls past 360px |
| future drawers            | must overlay/dock without adding a scroller to the shell             |

## 11. Layering

All z-indexes are tokens (`--z-*` in `layout.css`), values from the old UI:
right rail 50 < rail edge tab 60 < sidebar 90 < top bar/bottom bar 100 <
tooltip 300 < flyout 340. Future drawers slot between rail (50) and
sidebar (90) as in the old shell; no literal z-index belongs in a component
(the notch's `z-index: 1` is local to the flyout).

## 12. Design-system dependencies

`BezentIcon`, `BezentNavIcon`, `IconButton` (new `variant="solid"` for Quick
Create), `Tooltip`, `Badge`, `Avatar`. Ownership decisions:

- **NavItem** — stays private to `layouts/app-shell/LeftSidebar.tsx`: its
  geometry is defined by the rail and it has no consumer outside it.
- **Surface/Panel** — not created: shell regions only share background
  tokens; no shared behaviour justifies a primitive.
- **Popover/floating surface** — not created: the only floating element is
  the flyout, which is shell-specific.
- **BEZENT AI button** — single-use `--btn-ai-*` control kept in
  `TopNav.css`, not generalised into `Button` (same reasoning as Phase 0B.4).

## 13-15. Boundaries and reuse

Platform capabilities (search 0B.6, notifications/tasks/approvals/calendar
drawers 0B.7) plug into the shell's slots later; the shell holds no business
logic, API calls or data. HRMS builds nothing global — it supplies nav data
and routes. CRM/PM reuse the same `AppShell` with their own nav data.

## 16. Old → new mapping

| Old (`App.tsx` etc.)                                         | New                                           |
| ------------------------------------------------------------ | --------------------------------------------- |
| `TopNav` (226-513), `NavIconBtn`                             | `TopNav`, `IconButton`                        |
| `GlobalSearch` collapsed bar                                 | `platform/search` via the `topNavSearch` slot |
| `LeftNav`, `ZohoRailBtn` (621-1019)                          | `LeftSidebar`, `NavItem`                      |
| `SubNavFlyout`, `DynamicFlyoutPointer`, `SubNavPrototypeRow` | `SubNavFlyout`                                |
| `MODULE_SUBNAV_MAP`, `FIXED_PRIMARY_ITEMS`, `MODULE_CATALOG` | not migrated (0B.8)                           |
| `MoreLauncher` + dynamic slot                                | not migrated (0B.8)                           |
| `RightNav`, `RailBtn`, `RightRailThemeControl`               | `RightRail`                                   |
| `BottomBar`, `FooterBtn`                                     | `BottomBar`                                   |
| fixed-position regions                                       | CSS grid in `AppShell.css`                    |
| `UtilityDrawerShell`, drawers, AI panel                      | not migrated (0B.7 / later)                   |

## 17. Known differences from the old UI

- Flyout notch is fixed at 30px from the flyout top; the old UI slid the
  flyout/notch based on item position and clamped to the viewport. Placement
  here is CSS-anchored (no runtime geometry).
- Old flyout appeared after a JS timer; here open/close use CSS
  hover/focus-within with the same 200ms close grace.
- Old rail Documents icon was a lucide `Folders`; the canonical BEZENT
  `documents` icon is used.
- Old rail tooltips were clipped by `overflow: hidden`; the open rail lets
  them show.
- Quick Create, chevrons and theme icons use new registry glyphs (see
  ICON-SYSTEM.md) instead of lucide.

## Phase 0B.7 update

RightRail is now presentation-only: `items`, `activeItemId`, `onItemSelect`
(no hard-coded list). AppShell gained a docked `utilityDrawer` slot (grid
column `drawer`, `--shell-utility-drawer-width`, `--z-utility-drawer`) and the
TopNav bell takes `notificationsPanel/Open/Toggle`. See
[GLOBAL-UTILITIES.md](GLOBAL-UTILITIES.md).

## Phase 0B.8 update

LeftSidebar renders app-supplied `items` and gains an optional More button;
`AppShell` takes `launcher` (generic `MoreLauncher`, `--z-launcher: 350`,
`--shell-launcher-width`) and `activeSubId`/`onSubSelect` (SubNavFlyout selection is now
controlled by the URL). Navigation data comes from the active application; see
[HRMS-NAVIGATION.md](HRMS-NAVIGATION.md).

## Phase 0B.9

The shell is frozen ([UI-MIGRATION-FINAL.md](UI-MIGRATION-FINAL.md)). Changes in this phase: visible keyboard focus on `Button`/`IconButton`/EmptyState buttons, a viewport-capped notifications panel, and a contextual sidebar slot for launcher-only destinations (composition-level, see HRMS-NAVIGATION.md).

## Sub-nav flyout fix (pre-audit)

The flyout is now driven by ONE state value in `LeftSidebar` (`flyoutParentId`), independent of URL-derived selection: hover/focus sets it, a single 200ms timer clears it, Escape and More-open close it, items without children close it. Only the owning item renders a `SubNavFlyout`, so at most one can exist (this supersedes the earlier per-item CSS `:hover`/`:focus-within` description in §9 and the old "open/close is pure CSS" note). Placement is CSS-anchored to the owning item; if the panel would run under the bottom bar it takes a `--up` class (bottom-aligned, pointer at the bottom edge) — a measured class choice, never an inline style.
