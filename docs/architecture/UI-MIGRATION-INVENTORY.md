# UI Migration Inventory — Phase 0B.1 (Analysis Only)

**Status: analysis only. No source code was copied, modified, or migrated to
produce this document.** This is the required reading before any Phase 0B.2+
work begins. See [UI-MIGRATION.md](UI-MIGRATION.md) for the migration
process this inventory feeds into, and
[AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology)
for the Platform/Application/Module vocabulary used throughout.

Source analyzed: `bezent_ui-main` (the separately approved old BEZENT UI),
60 files, **16,546 lines** of TypeScript/TSX/CSS across 27 source files
(excluding Figma Make tooling, lockfiles, and generated content).

---

## 1. Executive Summary

The old UI is a **single-page, single-tenant, mock-data-driven prototype**
built with the Figma Make tool (React 19 + Vite 8 + Tailwind CSS 4, though
Tailwind is unused — see §13). It implements one composition: a fixed
top nav, left nav, right utility rail, bottom bar, and a workspace area that
currently shows only global search results or an empty state — **no actual
HRMS business screen is rendered**. Its real value is almost entirely in:

1. **The design token system** (`src/index.css`, ~230 CSS custom properties
   across light/dark themes) — genuinely excellent, comprehensive, and the
   single most valuable migration asset.
2. **The icon system** (`design-system/icons/`) — 70 hand-drawn duotone
   SVG icons with outline/solid variants, a clean rendering primitive
   (`BezentIcon`), and a navigation-icon container (`BezentNavIcon`) with a
   well-documented interaction spec.
3. **The BEZENT empty-state illustration** — a genuinely polished,
   accessible, animated inline-SVG illustration.
4. **Platform capability UI shells** — Notifications, Tasks, Approvals,
   Calendar, Notes — each with a drawer + full-page + detail view, built
   against mock in-memory state.
5. **Global search UI** — search input, filters, results list — built
   against a large hardcoded mock dataset.

Everything else — the 6,670-line `App.tsx` monolith, near-total reliance
on inline `style={{}}` (861 occurrences), **three separate, overlapping
HRMS navigation catalogs**, one entirely dead HRMS component, Figma Make
platform tooling, and a dual-lockfile package setup — is either a
migration risk, a boundary violation to fix during migration, or
explicitly excluded from migration.

**Bottom line:** migrate the _design language_ (tokens, icons,
illustration, a handful of genuinely reusable interaction patterns)
deliberately and piece by piece. Do **not** migrate `App.tsx`, the
navigation catalogs, or the mock data wholesale — they must be rebuilt
against the new architecture's boundaries (`design-system` /
`platform` / `applications/hrms`).

---

## 2. Old UI Architecture

```
figma-make-app (React 19 + Vite 8 + Tailwind 4, Figma Make scaffold)
│
├── index.html            Figma Make HTML shell + theme-flash-prevention script
├── src/main.tsx           Mounts <ThemeProvider><App /></ThemeProvider>
├── src/index.css          ~230 design tokens (light+dark) + ~15 reusable CSS classes + keyframes
├── src/App.tsx            6,670 lines — EVERYTHING (see §3)
├── src/theme/              Theme context, toggle UI, tokens re-export
├── src/design-system/icons/  Icon primitives, 70 hand-drawn icons, nav catalog (misplaced)
├── src/components/         GlobalSearch, MoreLauncher, EmptyState family
├── src/components/search/  Search sub-components + 1,211-line mock dataset
├── src/imports/pasted_text/  Original Figma Make prompt specs (not code)
├── src/assets/empty-states/  3 stub PNGs (131 bytes each — effectively unused)
└── scripts/writeIcons.js   One-off codegen script with a hardcoded local file path
```

There is **no router library** — routing is hand-rolled via
`window.location.hash`/`pathname`/`localStorage`, all inside `App.tsx`
(`getModuleFromRoute`, `getChildFromRoute`, `updateModuleRoute`,
`MODULE_TO_SLUG`/`SLUG_TO_MODULE`). There is **no backend** — every
"data" source (notifications, tasks, approvals, events, notes, search
records, candidates) is a hardcoded in-memory array seeded once and
mutated with `useState`.

---

## 3. App.tsx Decomposition

`App.tsx` is a 6,670-line monolith containing ~70 components, all of the
app's routing logic, and every platform-capability UI. Responsibility map:

```
OLD App.tsx (6,670 lines, one file)
│
├── Icon compatibility shims (AppIcon, MatIcon, Ico)         → superseded by design-system/icons; DISCARD shims
├── Tooltip                                                   → design-system/components
├── TopNav (branding, GlobalSearch, notif bell, settings,
│    quick-create, AI button, app launcher, profile avatar)   → layouts (shell) + platform (search/notif/AI are capabilities)
├── LeftNav + SubNavFlyout + DynamicFlyoutPointer              → layouts (shell mechanism)
│    + FIXED_PRIMARY_ITEMS / MODULE_CATALOG / HRMS_PRIMARY_RAIL
│      (imported from design-system/icons — WRONG boundary)   → applications/hrms (nav catalog is HRMS content)
├── CandidateTableView                                         → applications/hrms (currently DEAD — never rendered)
├── RightNav + RailBtn + RIGHT_UTILITIES/RIGHT_ITEMS config    → layouts (shell) + platform (capability registry)
├── BottomBar + FooterBtn                                      → layouts
├── AIPanel + SuggestionChip                                   → platform/ai (not yet a defined platform capability)
├── Notifications (Notif type, NotifRow, NotifGroupLabel,
│    NotifFilterPanel, NotificationDropdown, NotificationsPage) → platform/notifications
├── Tasks (Task type, TaskRow, TaskFilterPanel, TaskDrawer,
│    TasksPage, AddTaskPanel, TaskDetail)                       → platform/tasks
├── Approvals (Approval type, ApprovalRow, ApprovalDrawer,
│    ApprovalCenter, ApprovalDetail)                            → platform/approvals
├── Calendar (CalEvent type, CalEventBlock, ScheduleDrawer,
│    SchedulePage, CreateEventPanel, MiniCalendar,
│    EventDetailView)                                           → platform/calendar
├── Notes (Note type, NoteCard, NoteEditor, NotesDrawer,
│    NotesPage, ConvertToTaskForm)                               → platform/notes
├── CustomizeDrawer                                             → platform/settings (or applications/hrms/settings — needs a decision, see §16)
├── DrawerLoader / DrawerContentReady / UtilityDrawerShell       → layouts or design-system (generic drawer shell mechanism — genuinely reusable)
├── Route/persistence helpers (MODULE_TO_SLUG, SLUG_TO_MODULE,
│    getChildFromRoute, getModuleFromRoute, updateModuleRoute)   → applications/hrms navigation config + platform routing convention (hash-routing itself should be REBUILT using react-router, already a dependency of apps/web)
├── getEmptyStateTypeForModule                                  → applications/hrms (module→empty-state mapping is HRMS-specific)
└── export default function App()                               → app/ (composition root) — but must shrink drastically; see §16 risk
```

**Do not copy `App.tsx` wholesale** — this is both an explicit instruction
and a practical necessity: it mixes at least four architectural layers
(layout shell, platform capabilities, HRMS navigation data, and HRMS
business UI) in one file with zero module boundaries.

---

## 4. Design-Token Inventory

Source of truth: `src/index.css`, lines 118–661 (`:root`/`[data-theme="light"]`
and `[data-theme="dark"]` blocks). This is genuinely excellent, comprehensive
semantic token work — the strongest single asset in the old UI.

| Category             | Token examples                                                                                                | Count (approx) |
| -------------------- | ------------------------------------------------------------------------------------------------------------- | -------------- |
| Surfaces             | `--bg-app`, `--bg-surface`, `--bg-header`, `--bg-sidebar`, `--bg-popup`, `--bg-drawer`                        | 11             |
| Interactive surfaces | `--bg-hover`, `--bg-selected`, `--nav-hover`, `--nav-selected`, `--nav-icon-*`                                | 14             |
| Typography           | `--text-brand`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`, `--text-inverse`     | 6              |
| Borders              | `--border-default`, `--border-subtle`, `--border-divider`, `--border-focus`                                   | 5              |
| Icon system          | `--icon-default`, `--icon-hover`, `--icon-active`, `--icon-surface*`, duotone `--icon-stroke*`/`--icon-fill*` | 16             |
| Search               | `--search-bg`, `--search-border*`, `--search-chip-*`, `--search-row-*`                                        | 24             |
| Accent/brand         | `--accent-primary` (#931CF5), `--accent-hover`, `--accent-pressed`, `--accent-soft`                           | 5              |
| Floating surfaces    | `--floating-surface-*`, `--floating-row-*`                                                                    | 6              |
| Shadows              | `--shadow-popup`, `--shadow-card`, `--shadow-dropdown`                                                        | 3              |
| TopNav controls      | `--top-utility-*`, `--btn-create-hover`, `--btn-ai-*`                                                         | 9              |
| Sidebar nav          | `--sidebar-icon-*`, `--sidebar-label-*`                                                                       | 6              |
| Right rail           | `--right-rail-*`                                                                                              | 6              |
| Bottom bar           | `--footer-icon`, `--footer-text`, `--footer-hover-*`                                                          | 4              |
| Popup rows           | `--popup-row-*`, `--popup-selected-*`, `--popup-hover-*`, `--popup-item-*`                                    | 10             |
| More-services panel  | `--more-panel-*`, `--more-row-*`, `--more-card-*`, `--more-cat-*`                                             | ~20            |
| Right utility drawer | `--drawer-bg`, `--drawer-tab-*`, `--drawer-row-*`, `--drawer-badge-*`, `--drawer-checkbox-*`                  | ~25            |
| Legacy aliases       | `--color-primary`, `--color-selected-icon`, etc.                                                              | 8              |

Both a **light** and a **dark** palette are fully defined (`[data-theme="light"]`
and `[data-theme="dark"]`), switched via a `data-theme` attribute on
`<html>` — this mechanism is sound and should be preserved conceptually.

**Brand primary:** `#931CF5` (light) / same hex, different surrounding
palette (dark). **Font:** Inter (loaded via Google Fonts `@import` in
`index.css` — flag for Phase 0B.2: self-hosting vs. CDN import is a
decision to make, not carried over silently).

A parallel, typed JS/TS access layer exists at `src/theme/tokens.ts`
(`THEME_TOKENS` object of categorized `var(--...)` string references) —
this is a convenience wrapper, not a duplicate source of truth, and is a
reasonable pattern to carry forward.

**Risk:** many components reference tokens with **hardcoded hex
fallbacks** that don't always match the actual light-mode value (e.g.
`var(--icon-default, #B8A7C7)` — `#B8A7C7` is actually the _dark-mode_
value; light mode is `#4A275F`). These fallbacks are inert as long as the
token is always defined, but they're misleading and inconsistent — clean
up during Phase 0B.2, don't propagate.

---

## 5. Inline-CSS Inventory

**861 `style={{...}}` occurrences across 15 files.** This is the single
largest and most permanent-rule-violating pattern in the old UI, and the
main reason `App.tsx` cannot be copied even in spirit.

| File                                                                                                       | `style={{` count |
| ---------------------------------------------------------------------------------------------------------- | ---------------: |
| `App.tsx`                                                                                                  |              667 |
| `components/MoreLauncher.tsx`                                                                              |               69 |
| `components/search/SearchResultsView.tsx`                                                                  |               35 |
| `components/search/SearchEmptyState.tsx`                                                                   |               20 |
| `theme/ThemeToggle.tsx`                                                                                    |               11 |
| `components/search/SearchResults.tsx`                                                                      |               10 |
| `components/search/SearchResultRow.tsx`                                                                    |               10 |
| `components/GlobalSearch.tsx`                                                                              |               10 |
| `components/BezentEmptyState.tsx`                                                                          |               10 |
| `components/search/SearchFilters.tsx`                                                                      |                8 |
| `theme/RightRailThemeControl.tsx`                                                                          |                4 |
| `design-system/icons/BezentNavIcon.tsx`                                                                    |                3 |
| `components/BezentEmptyStateIllustration.tsx`                                                              |                2 |
| `design-system/icons/BezentIcon.tsx`                                                                       |                1 |
| (0 in `ThemeContext.tsx`, `iconDefinitions.tsx`, `BezentEnterpriseIcon.tsx`, `EmptyState.tsx`, `main.tsx`) |                — |

### Classification (per the requested A–G scheme)

- **A. Global Design Token** — the _values_ used inside most inline
  styles (`var(--bg-header)`, `var(--icon-active)`, etc.) — correct
  values, wrong delivery mechanism (should be CSS classes referencing the
  same custom properties, not JS objects).
- **B. Design-System Component Style** — `BezentIcon`, `BezentNavIcon`,
  `Tooltip`, `BezentEmptyState`/`BezentEmptyStateIllustration` — sizing,
  duotone color logic, tooltip positioning. High-value, migrate as real
  CSS/classes on the new components.
- **C. Layout Style** — `TopNav`, `LeftNav`, `RightNav`, `BottomBar`,
  the fixed-position workspace/AI-panel containers in `App()` itself
  (`position: fixed`, `top/bottom/left/right` math using `leftW`/`railW`/
  `drawerW`) — becomes `layouts/` CSS, ideally with the pixel arithmetic
  replaced by CSS custom properties/`calc()` rather than JS-computed inline
  values.
- **D. Platform Capability Style** — Notification/Task/Approval/Calendar/
  Note drawers and pages, `AIPanel`, `CustomizeDrawer` — becomes CSS
  modules/classes under each `platform/<capability>` folder once built.
- **E. HRMS Domain Style** — `CandidateTableView` (dead — see §11),
  `getEmptyStateTypeForModule`-driven empty-state variant selection.
  Minimal today since no real HRMS screen exists yet.
- **F. Legitimate Runtime/Dynamic Style** — genuinely computed values:
  `AppIcon`'s `pixelSize` (numeric icon size resolved at render time),
  drawer width math (`railW + drawerW`), `AI_PANEL_W`-based transitions.
  These are the only cases Phase 0B's UI-RULES.md exception clause
  ("genuinely runtime-calculated visual data") should cover — and even
  several of these mix static properties (`display: flex`, `alignItems`)
  into the same object that could be a class, leaving only the truly
  dynamic value (e.g. `width`) as an inline style or CSS variable.
- **G. Dead/Unnecessary** — `Ico` and `MatIcon` compatibility shims in
  `App.tsx` (lines 141–196) exist only to adapt old call sites to the new
  icon system and are not otherwise used productively; `EmptyState.tsx`
  is a 2-line re-export shim.

**Imperative style mutation** (a variant not in the A–G list, worth
flagging separately): `ThemeToggle.tsx` sets
`e.currentTarget.style.background = ...` directly in `onMouseEnter`/
`onMouseLeave` handlers instead of using CSS `:hover` — this is inline
styling by another mechanism and should become a CSS class with a
`:hover` rule.

**Conclusion for Phase 0B.4 (Design-System Components):** essentially
every interactive primitive in the old UI (buttons, rows, badges, chips,
tooltips, nav items) needs to be rebuilt as a real `design-system/`
component with CSS classes/modules consuming the token set from §4 — none
of the existing inline-styled implementations can be copied as-is under
the no-inline-CSS rule.

---

## 6. Design-System Inventory (beyond raw tokens)

Genuinely reusable visual patterns identified, with source:

| Pattern                                     | Source                                                                                                                                     | Notes                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duotone icon rendering                      | `design-system/icons/BezentIcon.tsx`                                                                                                       | Clean primitive: outline/solid variant switch, stroke/fill token resolution                                                                                                           |
| Nav icon container (default/hover/selected) | `design-system/icons/BezentNavIcon.tsx`                                                                                                    | Documented interaction spec in a comment (lines 15–23) — reuse the spec, rebuild the implementation without inline styles                                                             |
| Tooltip                                     | `App.tsx:200-222`                                                                                                                          | 4-directional positioning tooltip, small, reusable                                                                                                                                    |
| Empty-state illustration                    | `components/BezentEmptyStateIllustration.tsx`                                                                                              | Hand-crafted animated inline SVG, respects `prefers-reduced-motion` — high value                                                                                                      |
| Empty-state card/copy variants              | `components/BezentEmptyState.tsx`                                                                                                          | Per-module variant text (leave/attendance/payroll/candidates/...)                                                                                                                     |
| Right-rail icon button                      | `.bezent-right-rail-btn` (`index.css:872-913`)                                                                                             | Already a real CSS class — good example to follow                                                                                                                                     |
| Duotone icon micro-interactions             | `.bezent-duotone-icon` (`index.css:915-947`)                                                                                               | Already a real CSS class                                                                                                                                                              |
| Drawer circular-reveal loading transition   | `index.css:61-112` (`drawerCircleExpand`/`drawerIconSequence`/`drawerContentIn` keyframes) + `App.tsx` `DrawerLoader`/`DrawerContentReady` | Distinctive, documented (see `src/imports/pasted_text/drawer-loading-transition.md` for the original spec), genuinely part of BEZENT's visual identity — high value, preserve exactly |
| Notification dropdown enter/leave           | `index.css:682-731`                                                                                                                        | Real CSS keyframes + classes                                                                                                                                                          |
| Sub-nav flyout entry                        | `index.css:839-853`                                                                                                                        | Real CSS keyframes + classes                                                                                                                                                          |
| Search dropdown entry                       | `index.css:855-869`                                                                                                                        | Real CSS keyframes + classes                                                                                                                                                          |
| More-flyout entry / drill transitions       | `index.css:733-779`                                                                                                                        | Real CSS keyframes + classes                                                                                                                                                          |
| Primary button global state                 | `index.css:663-680` (`button[data-variant="primary"]`, `.btn-primary`)                                                                     | Already correctly implemented as CSS, not inline                                                                                                                                      |

**Notable positive finding:** the animation/keyframe layer in `index.css`
is _already done correctly_ — real CSS classes and `@keyframes`, no inline
style violations. This is the pattern every migrated interactive component
should follow.

---

## 7. Icon Inventory

Source of truth files: `design-system/icons/{iconTypes.ts, iconDefinitions.tsx,
iconRegistry.ts, BezentIcon.tsx, BezentNavIcon.tsx}`.

- **`iconTypes.ts`** — shared types (`IconDefinition`, `BezentIconProps`,
  `BEZENT_ICON_SIZES`, `SIDEBAR_NAV_TOKENS`). Also — boundary violation —
  defines `NavigationChildItem`/`NavigationModuleItem`/`NavigationGroup`
  and `BezentProduct = "hrms" | "crm" | "pm" | "global"`, which are
  **navigation-catalog types, not icon types**. `BezentProduct` is a
  useful precedent for categorizing by business application, though.
- **`iconDefinitions.tsx`** — **70 hand-drawn SVG icon definitions**, each
  with `outline` and `solid` render functions, each tagged
  `category: "global" | "hrms" | "crm" | "pm"`. This is the real,
  hand-crafted visual asset — genuinely worth migrating icon-by-icon.
  **Data-integrity bug found:** two duplicate keys — `payroll` (defined at
  line 321 and again at 457) and `candidates` (line 397 and 476) — the
  second definition silently overwrites the first in the object literal.
  Needs resolution (are these meant to be different icons?) before
  migration.
- **`iconRegistry.ts`** — `getBezentIconDefinition()` (genuine icon-system
  code, keep) **plus** `FIXED_PRIMARY_ITEMS`, `MODULE_CATALOG`,
  `MORE_GROUP_DEFINITIONS`, `HRMS_PRIMARY_RAIL`, `HRMS_MORE_GROUPS`,
  `isModulePermitted()`, `getParentModuleForChild()`,
  `isParentModuleActive()` — **all HRMS navigation-catalog and
  permission-check code, misplaced inside `design-system/icons/`.** This
  must move to `applications/hrms/` (catalog) and `platform/access-control`
  (permission check, once that capability exists) during migration — not
  stay in the design system.
- **`BezentIcon.tsx`** — the actual renderer; clean, correct duotone
  color-state logic. Source of truth for icon rendering.
- **`BezentNavIcon.tsx`** — nav-specific icon container; well-documented
  interaction spec; duplicates some dark/light branching in JS that the
  CSS custom properties already handle via cascade (see §9 risk).
- **`BezentEnterpriseIcon.tsx` (417 lines)** — **a second, parallel icon
  system**: string-name pattern matching (`name.toLowerCase().includes(...)`)
  to select hand-coded SVGs, used only by `MoreLauncher.tsx`. Overlaps
  significantly with `iconDefinitions.tsx`/`BezentIcon` in _content_
  (renders icons for the same concepts — employees, payroll, etc.) via a
  _different, more fragile mechanism_ (substring matching vs. a keyed
  registry). **Duplicated icon logic — needs a consolidation decision**
  (very likely: retire this file and repoint `MoreLauncher` at
  `BezentIcon`/`iconDefinitions`) before/during Phase 0B.3.
- **Icon sizing:** `BEZENT_ICON_SIZES` gives named size tokens
  (`primaryRail: 20`, `topNav: 18`, `rightRail: 19`, `footer: 18`, etc.) —
  good, keep as design tokens.
- **Color/state behavior:** default/hover/selected/pressed/disabled states
  map to `--icon-default/-hover/-active/-muted` tokens consistently
  across `BezentIcon` and the old `AppIcon`/`ICON_COLORS` in `App.tsx` —
  consistent enough to consolidate on one source (`BezentIcon`).
- **Dependency:** `lucide-react` is used both directly (`import * as L`,
  scattered single-icon imports like `Folders`, `Plus`, `Settings`,
  `Wrench`, `Sun`, `Moon`, `Monitor`, `Check`) _and_ as a fallback/adapter
  inside `MatIcon`/`Ico`. The hand-drawn `iconDefinitions.tsx` icons are
  **not** Lucide-based (custom SVG paths) — so BEZENT effectively has two
  icon sources today (hand-drawn BEZENT set + ad hoc Lucide imports for
  utility chrome like Settings/Sun/Moon/Check). Both are legitimate; just
  document the split rather than merging them.

**Proposed clean `design-system/icons/` structure** (direction only, not
implemented in this phase):

```
design-system/icons/
├── icon.types.ts        BezentIconProps, IconDefinition, size tokens — icon concerns only
├── icon-definitions/     the 70 hand-drawn icons (dedupe payroll/candidates), possibly split per category file
├── BezentIcon.tsx        the renderer (keep as-is conceptually)
├── BezentNavIcon.tsx     the nav container (keep, remove inline styles + redundant isDark branching)
└── index.ts
```

Navigation catalogs (`MODULE_CATALOG`, `HRMS_PRIMARY_RAIL`,
`BEZENT_TOOL_REGISTRY`, `MODULE_TO_SLUG`) move to `applications/hrms/` —
see §16.

---

## 8. Theme Inventory

| File                              | Responsibility                                                                                                                                                                          | New owner                                                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme/ThemeContext.tsx`          | `light`/`dark`/`system` mode state, `resolvedTheme`, localStorage persistence (`bezent-theme` key), `data-theme` attribute + `colorScheme` sync, system-preference media-query listener | `platform/` (a cross-application capability) or `app/providers` if kept minimal — a judgment call for Phase 0B.2, not this phase                                                  |
| `theme/ThemeToggle.tsx`           | Two visual variants (segmented / icon-dropdown) of a mode switcher                                                                                                                      | `design-system/components` (it's a UI control) — needs its inline styles + imperative `style.background` mutation rebuilt as CSS                                                  |
| `theme/RightRailThemeControl.tsx` | Compact theme toggle for the right rail                                                                                                                                                 | `design-system/components` or `layouts` (it's positioned by the shell) — has a hardcoded, non-tokenized hover color (`#FBE8FF`) to fix                                            |
| `theme/tokens.ts`                 | Typed `THEME_TOKENS` object wrapping the CSS custom properties                                                                                                                          | `design-system/tokens` — good pattern, keep                                                                                                                                       |
| `index.html` inline script        | Reads `localStorage['bezent-theme']` and sets `data-theme` **before** React mounts, to prevent a flash of wrong theme                                                                   | Must be preserved conceptually in the new `apps/web/index.html` when theme is migrated — this is a real, valuable piece of logic, easy to lose if only React-level code is copied |

**Risk to flag for Phase 0B.2:** `BezentNavIcon` and other components
re-derive `isDark` in JavaScript (`mode === "dark"`) and then branch to
different literal hex fallbacks per theme, even though the CSS custom
properties they reference already resolve correctly per `[data-theme]`
via the cascade. This is redundant, occasionally inconsistent (see §4
hardcoded-fallback mismatch), and should be simplified to "always trust
the CSS variable" once components stop using inline styles.

---

## 9. Layout Inventory

| Shell region         | Old implementation                                                                                                                             | Fixed dimensions found                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Top Navigation       | `TopNav` (`App.tsx:226-513`)                                                                                                                   | height 60px, `position: fixed; inset: 0 0 auto 0`                                                               |
| Left Sidebar         | `LeftNav` (`App.tsx:728-1021`) + `SubNavFlyout`/`DynamicFlyoutPointer`                                                                         | width 90px (`leftW` in `App()`)                                                                                 |
| Right Utility Rail   | `RightNav`/`RailBtn` (`App.tsx:1899-2054`)                                                                                                     | width 48px open / 0 closed (`railW`)                                                                            |
| Right Utility Drawer | `UtilityDrawerShell` (`App.tsx:6077-6096`)                                                                                                     | `DRAWER_W` constant (referenced, not redefined in the excerpt reviewed — confirm exact value during Phase 0B.5) |
| Bottom Bar           | `BottomBar`/`FooterBtn` (`App.tsx:2054-2126`)                                                                                                  | height 36px (`bottom: 36` used throughout as the workspace's bottom offset)                                     |
| Global overlays      | Inline `position: fixed` panels for `CreateEventPanel`/`AddTaskPanel` (`App.tsx:6578-6604`), centered with a `backdropFilter: blur(2px)` scrim | ad hoc per-usage, not a shared "Modal"/"Overlay" primitive                                                      |
| Global drawers       | `UtilityDrawerShell` + `DrawerLoader`/`DrawerContentReady` (circular-reveal transition)                                                        | shared mechanism, good reuse candidate                                                                          |
| AI panel             | Right-hand slide-out panel inside `App()`'s render, width `AI_PANEL_W = 340`                                                                   | not modeled as a capability with its own state module — lives entirely in `App()`'s local `useState`            |

**How this should form `AppShell` (direction only — not implemented):**
an `AppShell` in `layouts/` would own the fixed top/left/right/bottom
regions and the workspace content slot, receiving the active drawer/
overlay as children/props from `app/` composition — with `platform/`
capabilities (notifications, tasks, approvals, calendar, notes, settings)
each owning their own drawer content component, and `applications/hrms`
owning the workspace content and its own navigation catalog. The old
`App()`'s ~150 lines of local `useState` for drawer/page/panel visibility
per capability is the biggest structural risk to carry forward as-is (see
§16) — it does not scale to a second business application sharing the
same shell.

---

## 10. Platform Capability Inventory

Every one of these exists today only as UI + local component state in
`App.tsx`, seeded from a hardcoded array. None has real data, persistence,
or backend integration — that's expected and correct for a UI prototype,
but means **all "business behavior" here is mock, not to be treated as a
spec for real behavior** beyond the interaction pattern itself.

| Capability             | Visual component(s)                                                                                          | State shape                                                 | Mock data seed                                                                                                     | Notes                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global Search**      | `GlobalSearch`, `SearchResultsView`, `SearchFilters`, `SearchResults`, `SearchResultRow`, `SearchEmptyState` | `SearchState` (`searchTypes.ts`)                            | `ALL_SEARCH_RECORDS` (`searchData.ts`, ~550 lines of records)                                                      | See §14 dedicated section                                                                                                                                                                     |
| **Notifications**      | `NotificationDropdown` (header), `NotificationsPage` (full page), `NotifRow`, `NotifFilterPanel`             | `Notif` type (`App.tsx:2346`)                               | `INIT_NOTIFS` (referenced in `App()`, definition not inside the read excerpt — confirm location during Phase 0B.7) | No drawer — dropdown from bell icon only                                                                                                                                                      |
| **Tasks**              | `TaskDrawer`, `TasksPage`, `TaskDetail`, `AddTaskPanel`, `TaskRow`, `TaskFilterPanel`, `SummaryTile`         | `Task` type (`App.tsx:3078`) incl. checklist items          | `INIT_TASKS`                                                                                                       | Drawer + full page + detail + create panel — most complete capability pattern                                                                                                                 |
| **Approvals**          | `ApprovalDrawer`, `ApprovalCenter`, `ApprovalDetail`, `ApprovalRow`, `ApprovalFilterPanel`                   | `Approval` type (`App.tsx:3947`) with `history` audit trail | `INIT_APPROVALS`                                                                                                   | Approve/reject/more-info actions mutate local state only                                                                                                                                      |
| **Calendar**           | `ScheduleDrawer`, `SchedulePage`, `CreateEventPanel`, `MiniCalendar`, `EventDetailView`, `CalEventBlock`     | `CalEvent` type (`App.tsx:4714`)                            | `INIT_EVENTS`                                                                                                      | Includes a hand-rolled mini month-view calendar                                                                                                                                               |
| **Notes**              | `NotesDrawer`, `NotesPage`, `NoteEditor`, `NoteCard`, `ConvertToTaskForm`                                    | `Note` type (`App.tsx:5279`)                                | `INIT_NOTES`                                                                                                       | Notably, the right-rail icon for this capability is labeled **"Documents"** (`RIGHT_UTILITIES.documents`) even though it opens Notes — naming mismatch to resolve, not carry forward silently |
| **AI Panel**           | `AIPanel`, `SuggestionChip`                                                                                  | local `aiOpen` boolean only                                 | static suggestion chips                                                                                            | No real state model; thinnest capability, mostly a static right-hand panel                                                                                                                    |
| **Settings/Customize** | `CustomizeDrawer`                                                                                            | none observed beyond `onClose`                              | none                                                                                                               | Owner undecided — global platform settings vs. app-specific settings; needs a decision in Phase 0B.7                                                                                          |

**Separation for Phase 0B.7 (per capability):**

- _Visual component_ → `platform/<capability>/` (once that boundary is
  populated) or a shared `design-system` primitive if the pattern (e.g.
  drawer shell, row, filter panel) is generic across all five capabilities.
- _State_ → currently all lives in `App()`'s top-level `useState` calls;
  must be extracted to each capability's own state/context so `app/` isn't
  the owner of five unrelated business capabilities' state.
- _Mock data_ → discard; replace with real API integration when
  `platform/notifications` etc. are actually implemented against a
  backend. Do not carry the `INIT_*` arrays into production code even as
  "seed data."
- _Business behavior_ (`handleMarkRead`, `handleTaskComplete`,
  `handleApprovalAction`, etc.) → becomes each capability's own service/
  hook layer once real APIs exist; the _shape_ of these handlers (what
  operations exist) is a reasonable reference, their _implementation_
  (array `.map`/`.filter` on local state) is not.
- _Global shell integration_ → the drawer-switch logic in `App()`
  (`utilCfg.id === "tasks" ? <TaskDrawer/> : ...`) belongs in the new
  `AppShell` (layouts), driven by a capability registry rather than a
  hardcoded if/else chain.

---

## 11. HRMS-Specific Inventory

The old UI has **almost no real HRMS UI** — it's overwhelmingly shell and
platform-capability chrome. What exists:

| Item                                                        | Location                              | Status                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CandidateTableView`                                        | `App.tsx:1392-1703` (~310 lines)      | **Dead code** — defined, uses `CANDIDATE_SAMPLE_DATA`, styled like "Zoho People layout" per its own comment, but **never referenced or rendered anywhere in `App.tsx`**. Confirmed via full-file search.                                                       |
| `MODULE_CATALOG` / `HRMS_PRIMARY_RAIL` / `HRMS_MORE_GROUPS` | `design-system/icons/iconRegistry.ts` | Navigation _catalog_ only (labels, icons, routes, grouping) — no actual screens behind most entries                                                                                                                                                            |
| `MODULE_TO_SLUG`                                            | `App.tsx:6100-6129`                   | A **third**, independent HRMS module/slug list (routing)                                                                                                                                                                                                       |
| `BEZENT_TOOL_REGISTRY`                                      | `components/MoreLauncher.tsx`         | A **fourth** (partially — categorized differently) HRMS tool catalog, with descriptions/keywords, for the app-launcher search                                                                                                                                  |
| `getEmptyStateTypeForModule`                                | `App.tsx:6223-6242`                   | Keyword-matching function mapping any module name string to one of a fixed set of empty-state illustration variants — the only place "HRMS domain awareness" actually drives UI behavior today                                                                 |
| Icon definitions tagged `category: "hrms"`                  | `iconDefinitions.tsx`                 | ~19 of the 70 icons (employees, workforce, onboarding, leave, attendance, timeTracker, shifts, timesheets, performance, goals, reviews, learning, career, payroll (×2), compensation, benefits, recruitment, candidates (×2), interviews, jobOpenings, offers) |
| Search module keys / mock records                           | `searchTypes.ts`, `searchData.ts`     | HRMS-flavored (`employees`, `attendance`, `leave-tracker`, etc.) but entirely mock                                                                                                                                                                             |

**High-risk finding:** `MODULE_CATALOG` (iconRegistry.ts),
`MODULE_TO_SLUG` (App.tsx), and `BEZENT_TOOL_REGISTRY` (MoreLauncher.tsx)
are **three independently maintained lists of "what HRMS modules exist"**,
with no shared source of truth, already drifting in structure (different
grouping schemes: `MORE_GROUP_DEFINITIONS` uses
people/workforce/development/administration; `BEZENT_TOOL_REGISTRY` uses
people/work_time/growth/pay_benefits/workplace/hr_operations). Migration
must reconcile these into **one** canonical HRMS navigation/module catalog
living in `applications/hrms/`, not migrate all three.

---

## 12. Asset Inventory

| Asset                       | Location                   | Classification                                                                                                                                                                               |
| --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `panda-employees-dark.png`  | `src/assets/empty-states/` | **131 bytes** — effectively a stub/placeholder, not a real illustration. UNUSED in practice (the real empty-state visual is the inline-SVG `BezentEmptyStateIllustration`, not these PNGs)   |
| `panda-employees-light.png` | same                       | same — 131 bytes, stub                                                                                                                                                                       |
| `panda-reports-light.png`   | same                       | same — 131 bytes, stub                                                                                                                                                                       |
| Google Fonts `Inter` import | `index.css:1`              | External CDN font load — GLOBAL BEZENT ASSET conceptually, but the _mechanism_ (remote `@import`) is a Phase 0B.2 decision point (self-host vs. CDN), not something to carry over unexamined |
| No SVG files on disk        | —                          | All icon/illustration art is inline SVG in `.tsx` files, not separate `.svg` assets — there is no `assets/icons/` to migrate; the icons live in code (see §7)                                |

**No logos, no real photography/illustration files, no font files** exist
in this repository. The "asset audit" is effectively empty of real binary
assets — nearly everything visual is code (CSS + inline SVG). Treat the
three stub PNGs as **UNUSED** and do not migrate them.

---

## 13. Dependency Inventory

From the old `package.json`:

| Dependency                                        | Classification                                   | Reasoning                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react` ^19.0.0                                   | **REPLACE WITH EXISTING NEW PROJECT CAPABILITY** | New project pins React `^18.3.1` (see [TECH-STACK.md](TECH-STACK.md)) — a deliberate, already-made decision; do not upgrade to 19 as a side effect of migration                                                                                                                                         |
| `react-dom` ^19.0.0                               | same                                             | same                                                                                                                                                                                                                                                                                                    |
| `lucide-react` ^1.46.0                            | **REQUIRED**                                     | Actively used for utility/chrome icons (Settings, Plus, Sun/Moon/Monitor, Check, etc.) alongside the hand-drawn BEZENT icon set; version needs revisiting (1.x is unusually low for lucide-react — confirm this isn't a Figma Make-specific pinned fork before adopting)                                |
| `enhanced-resolve` ^5.24.5                        | **OLD UI ONLY**                                  | Webpack-ecosystem module resolution helper; no evidence of direct use in `src/` — likely a Figma Make tooling transitive requirement. Do not carry over without confirming a need                                                                                                                       |
| `@tailwindcss/vite` ^4.0.0                        | **UNNECESSARY**                                  | Tailwind is imported (`@import 'tailwindcss'` in `index.css`) but **zero Tailwind utility classes are used anywhere in `src/`** (confirmed by scanning every `className` — all are custom BEM-style names, no `flex`/`px-4`/etc. utilities). Effectively dead weight in the old UI itself; do not adopt |
| `tailwindcss` ^4.0.0                              | **UNNECESSARY**                                  | same reasoning                                                                                                                                                                                                                                                                                          |
| `@types/node`, `@types/react`, `@types/react-dom` | **REQUIRED (version-matched)**                   | Standard, but must match whatever React version the new project uses (18, not 19)                                                                                                                                                                                                                       |
| `@vitejs/plugin-react` ^6.0.0                     | **POSSIBLY REQUIRED**                            | New project already has `@vitejs/plugin-react` (a different version, per its own package.json) — no need to import the old version                                                                                                                                                                      |
| `oxfmt` ^0.2.0                                    | **OLD UI ONLY**                                  | Figma Make's own formatter tool; new project already has Prettier + ESLint (see [TECH-STACK.md](TECH-STACK.md)) — do not introduce a second formatter                                                                                                                                                   |
| `typescript` ^5.7.0                               | **POSSIBLY REQUIRED**                            | New project already pins TypeScript `^5.7.2` — compatible, no action needed                                                                                                                                                                                                                             |
| `vite` ^8.0.5                                     | **REPLACE WITH EXISTING NEW PROJECT CAPABILITY** | New project uses Vite `^6.0.6`; do not upgrade to 8 as a side effect                                                                                                                                                                                                                                    |

**No dependencies are installed in this phase**, per instructions. This
table is guidance for whoever scopes Phase 0B.3+ dependency changes.

**Package-manager finding (governance-relevant):** the old UI ships
**both** `package-lock.json` **and** `pnpm-lock.yaml` — exactly the
mixed-package-manager situation [TECH-STACK.md](TECH-STACK.md) explicitly
prohibits for this repository. This is expected for an externally-sourced
reference project and requires no action here, but confirms the new
project's npm-only rule should not be relaxed to accommodate anything
copied from this source.

---

## 14. Search Inventory (detailed, per §10 of the task)

| File                                | Contents                                                                                                                                                                                                                                                                             | Destination                                                                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `searchTypes.ts`                    | `SearchModuleKey` (HRMS-specific union), `FilterChipOption/Config`, `SearchResultItem`, `ContextSuggestion`, `SearchState`                                                                                                                                                           | Types split: `SearchResultItem`/`FilterChipConfig`/`SearchState`/`ContextSuggestion` → `platform/search` (generic search infra); `SearchModuleKey` → `applications/hrms` (it's HRMS's module vocabulary)                        |
| `searchData.ts` (1,211 lines)       | `getSearchModuleKey()`/`getModuleDisplayName()` (HRMS-keyword heuristics), `MODULE_FILTER_CONFIGS`, `MODULE_SUGGESTIONS`, `ALL_SEARCH_RECORDS` (~550 lines of hardcoded fake employee/leave/etc. records), `searchBEZENTRecords()` (fuzzy-match search function over the mock array) | **Mock/static data — DISCARD.** The search _algorithm shape_ (`searchBEZENTRecords`) is a reasonable reference for a future real search implementation but is tightly coupled to the mock array's structure, not reusable as-is |
| `GlobalSearch.tsx`                  | Search input UI, discovery/filter-open state, keyboard nav (`selectedIndex`)                                                                                                                                                                                                         | `platform/search` — generic UI, though its internal `currentModuleKey` derivation logic re-implements a keyword heuristic already present in `searchData.ts` (duplication risk)                                                 |
| `SearchFilters.tsx`                 | Filter chip rendering                                                                                                                                                                                                                                                                | `platform/search` — generic                                                                                                                                                                                                     |
| `SearchResultRow.tsx`               | One result row                                                                                                                                                                                                                                                                       | `design-system/components` (generic row pattern) or `platform/search`                                                                                                                                                           |
| `SearchResults.tsx`                 | Result list container                                                                                                                                                                                                                                                                | `platform/search`                                                                                                                                                                                                               |
| `SearchEmptyState.tsx`              | No-results state                                                                                                                                                                                                                                                                     | `platform/search`, reusing `design-system` empty-state primitives                                                                                                                                                               |
| `SearchResultsView.tsx` (564 lines) | Full-page search results view (mounted in `App()` when a query is executed)                                                                                                                                                                                                          | `platform/search` — this is effectively the "search results page," should become a first-class platform view, not something `applications/hrms` half-owns                                                                       |

**Do not move the entire old `components/search/` folder wholesale** —
per instruction, the generic search _infrastructure_ (input, filters,
result list rendering, empty state) is genuinely `platform/search`
material; the _indexed content_ (`ALL_SEARCH_RECORDS`) and the _module
vocabulary_ (`SearchModuleKey`) are HRMS-specific and must not be treated
as if they were generic platform data.

---

## 15. Dead / Generated Content — Explicitly Excluded from Migration

| Item                                                                                                            | Why excluded                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.figma/make/*` (analyze-routes, deploy, deploy-preview, dev, dev.json, format, install, langserver, site.json) | Figma Make's own CLI/tooling scaffolding — not BEZENT source                                                                                                                                                                                                                                      |
| `.github/workflows/deploy.yml`, `.github/workflows/static.yml`                                                  | GitHub Pages deployment tied to the old hosting model (`base: '/bezent_ui/'` in `vite.config.ts`); the new project already has its own CI ([.github/workflows/ci.yml](../../.github/workflows/ci.yml))                                                                                            |
| `public/404.html`                                                                                               | GitHub Pages SPA-routing redirect shim hardcoded to `/bezent_ui/` — hosting-specific, not portable                                                                                                                                                                                                |
| `.mise.toml`                                                                                                    | Toolchain pin (Node 22, pnpm) for the old project's own dev environment — new project has its own `.nvmrc`/`engines`                                                                                                                                                                              |
| Old `AGENTS.md`/`CLAUDE.md`                                                                                     | Entirely Figma Make platform documentation ("A Vite development server is already running on $PORT...") — no BEZENT architecture content, superseded by the new project's own governance docs                                                                                                     |
| `scripts/writeIcons.js`                                                                                         | A one-off codegen script that writes a **hardcoded literal copy** of `iconDefinitions.tsx`'s content to an absolute local path (`C:/Users/Sureha DJ/Downloads/Enterprise SaaS Navigation Shell/...`) — not portable, a drift-risk generator, not applicable outside the original author's machine |
| `pnpm-lock.yaml` (alongside `package-lock.json`)                                                                | Dual lockfile — the new project is npm-only (see §13)                                                                                                                                                                                                                                             |
| `src/imports/pasted_text/*.md` (3 files)                                                                        | Original Figma Make **prompt text**, not application code — valuable as historical spec/context (see §16) but never a migration source                                                                                                                                                            |
| `node_modules/`, `dist/`, any build output                                                                      | Never present in the analyzed source, but confirmed excluded by the old `.gitignore` and by not being part of the 60 tracked files                                                                                                                                                                |

---

## 16. File-by-File Migration Matrix

Legend for **Migration Action**: COPY WITH CLEANUP · REFACTOR · MERGE ·
REBUILD USING APPROVED VISUALS · KEEP AS REFERENCE ONLY · DISCARD.

| Old Location                                                                                                                 | Current Responsibility                                | New Owner                                                                    | Proposed New Location                                                                                                                                   | Migration Action                                                       | Dependencies                                                              | Risk                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.css` (tokens, lines 118-661)                                                                                      | Light/dark design tokens                              | design-system                                                                | `design-system/tokens/` (as CSS custom properties file)                                                                                                 | **COPY WITH CLEANUP**                                                  | none                                                                      | Low — fix hardcoded-fallback mismatches (§4) while copying                                                                                                                                                           |
| `src/index.css` (classes/keyframes, lines 1-117, 663-948)                                                                    | Reusable animation/interaction classes                | design-system                                                                | `design-system/styles/`                                                                                                                                 | **COPY WITH CLEANUP**                                                  | tokens above                                                              | Low                                                                                                                                                                                                                  |
| `src/theme/tokens.ts`                                                                                                        | Typed token accessor                                  | design-system                                                                | `design-system/tokens/`                                                                                                                                 | **COPY WITH CLEANUP**                                                  | tokens css                                                                | Low                                                                                                                                                                                                                  |
| `src/theme/ThemeContext.tsx`                                                                                                 | Theme mode state/persistence                          | platform (or app/providers)                                                  | `platform/appearance/` or `app/providers/`                                                                                                              | **REFACTOR**                                                           | none                                                                      | Medium — decide platform vs. app/providers ownership first (see Article 4 process if it's genuinely a new `platform/` subfolder)                                                                                     |
| `src/theme/ThemeToggle.tsx`                                                                                                  | Theme switcher UI                                     | design-system                                                                | `design-system/components/`                                                                                                                             | **REBUILD USING APPROVED VISUALS**                                     | ThemeContext, tokens                                                      | Medium — remove inline styles + imperative style mutation                                                                                                                                                            |
| `src/theme/RightRailThemeControl.tsx`                                                                                        | Compact theme toggle                                  | design-system or layouts                                                     | `design-system/components/`                                                                                                                             | **REBUILD USING APPROVED VISUALS**                                     | ThemeContext                                                              | Low — fix hardcoded hover color                                                                                                                                                                                      |
| `index.html` theme-flash script                                                                                              | FOUC prevention                                       | app                                                                          | `apps/web/index.html`                                                                                                                                   | **COPY WITH CLEANUP**                                                  | ThemeContext's storage key                                                | Low but easy to forget                                                                                                                                                                                               |
| `src/design-system/icons/iconTypes.ts`                                                                                       | Icon types + (misplaced) nav types                    | design-system + applications/hrms                                            | split: icon parts → `design-system/icons/`; nav types → `applications/hrms/` or a shared `shared/types` if genuinely cross-application                  | **REFACTOR** (split file)                                              | none                                                                      | Medium — requires the split to be done carefully, not copy-pasted whole                                                                                                                                              |
| `src/design-system/icons/iconDefinitions.tsx`                                                                                | 70 hand-drawn icons                                   | design-system                                                                | `design-system/icons/`                                                                                                                                  | **COPY WITH CLEANUP**                                                  | iconTypes                                                                 | Medium — fix duplicate `payroll`/`candidates` keys first                                                                                                                                                             |
| `src/design-system/icons/iconRegistry.ts`                                                                                    | Icon lookup **+ HRMS nav catalog + permission check** | design-system (lookup) / applications/hrms (catalog) / platform (permission) | split three ways                                                                                                                                        | **REFACTOR** (split file)                                              | iconDefinitions                                                           | **High** — this file is the clearest boundary violation in the codebase; splitting it correctly is the single most important Phase 0B.3/0B.8 task                                                                    |
| `src/design-system/icons/BezentIcon.tsx`                                                                                     | Icon renderer                                         | design-system                                                                | `design-system/icons/`                                                                                                                                  | **COPY WITH CLEANUP**                                                  | iconRegistry (lookup only)                                                | Low                                                                                                                                                                                                                  |
| `src/design-system/icons/BezentNavIcon.tsx`                                                                                  | Nav icon container                                    | design-system                                                                | `design-system/icons/`                                                                                                                                  | **REBUILD USING APPROVED VISUALS**                                     | BezentIcon, theme                                                         | Medium — remove inline styles, redundant isDark branching                                                                                                                                                            |
| `src/design-system/icons/BezentEnterpriseIcon.tsx`                                                                           | Second, parallel icon system (string-matched)         | —                                                                            | —                                                                                                                                                       | **DISCARD** (after confirming MoreLauncher can use BezentIcon instead) | MoreLauncher.tsx                                                          | Medium — used in 5 places in MoreLauncher; needs a real replacement pass, not a blind delete                                                                                                                         |
| `src/App.tsx` (icon shims: `AppIcon`, `MatIcon`, `Ico`)                                                                      | Compat adapters                                       | —                                                                            | —                                                                                                                                                       | **DISCARD**                                                            | —                                                                         | Low                                                                                                                                                                                                                  |
| `src/App.tsx` (`Tooltip`)                                                                                                    | Positioned tooltip                                    | design-system                                                                | `design-system/components/`                                                                                                                             | **REBUILD USING APPROVED VISUALS**                                     | tokens                                                                    | Low                                                                                                                                                                                                                  |
| `src/App.tsx` (`TopNav`, `LeftNav`, `SubNavFlyout`, `DynamicFlyoutPointer`, `RightNav`, `RailBtn`, `BottomBar`, `FooterBtn`) | Shell chrome                                          | layouts                                                                      | `layouts/`                                                                                                                                              | **REBUILD USING APPROVED VISUALS**                                     | design-system, platform capability registries                             | **High** — largest single rebuild; must not copy the 3,000+ combined lines of inline-styled JSX as-is                                                                                                                |
| `src/App.tsx` (`MODULE_TO_SLUG`/`SLUG_TO_MODULE`, `getModuleFromRoute`, `getChildFromRoute`, `updateModuleRoute`)            | Hand-rolled hash router                               | applications/hrms (data) + platform routing convention                       | `applications/hrms/` (catalog) — routing mechanism itself should use `react-router` (already a dependency)                                              | **REBUILD USING APPROVED VISUALS**                                     | react-router (new project already has it)                                 | **High** — do not port hash-based routing; use the router already established in [FRONTEND.md](FRONTEND.md)                                                                                                          |
| `src/App.tsx` (`CandidateTableView`)                                                                                         | Dead HRMS prototype table                             | applications/hrms                                                            | n/a until Candidates domain work begins                                                                                                                 | **KEEP AS REFERENCE ONLY**                                             | mock data                                                                 | Low (it's inert) but do not silently drop — it's the only concrete "what a real HRMS table might look like" reference in the whole codebase                                                                          |
| `src/App.tsx` (Notifications/Tasks/Approvals/Calendar/Notes components + types)                                              | Platform capability UI                                | platform                                                                     | `platform/{notifications,tasks,approvals,calendar,notes}/` (created only when each capability is actually built)                                        | **REBUILD USING APPROVED VISUALS**                                     | design-system, drawer shell                                               | **High** — five capabilities' worth of UI, state, and mock data all currently entangled in one file's local state                                                                                                    |
| `src/App.tsx` (`DrawerLoader`, `DrawerContentReady`, `UtilityDrawerShell`)                                                   | Generic drawer shell + circular-reveal transition     | layouts or design-system                                                     | `layouts/` (shell) using `design-system/styles` (the keyframes)                                                                                         | **COPY WITH CLEANUP**                                                  | index.css keyframes                                                       | Medium — genuinely reusable, one of the better-isolated pieces                                                                                                                                                       |
| `src/App.tsx` (`AIPanel`, `SuggestionChip`)                                                                                  | AI side panel                                         | platform (new capability, not yet documented anywhere)                       | `platform/ai/` (only if/when this becomes a real capability — flag for Article 4 if it introduces a new platform subfolder ahead of need)               | **KEEP AS REFERENCE ONLY**                                             | —                                                                         | Low — thin, mostly static                                                                                                                                                                                            |
| `src/App.tsx` (`CustomizeDrawer`)                                                                                            | Settings panel                                        | undecided (platform vs. applications/hrms)                                   | TBD                                                                                                                                                     | **KEEP AS REFERENCE ONLY**                                             | —                                                                         | Medium — ownership needs a decision before rebuilding                                                                                                                                                                |
| `src/App.tsx` (`getEmptyStateTypeForModule`)                                                                                 | Module→illustration-variant mapping                   | applications/hrms                                                            | `applications/hrms/`                                                                                                                                    | **REFACTOR**                                                           | BezentEmptyState variants                                                 | Low                                                                                                                                                                                                                  |
| `src/App.tsx` (`export default function App()`)                                                                              | Composition root                                      | app + layouts                                                                | `apps/web/src/App.tsx` (thin) + `layouts/AppShell`                                                                                                      | **REBUILD USING APPROVED VISUALS**                                     | everything above                                                          | **High** — the current 430-line `App()` function must shrink to the thin composition root the new [FRONTEND.md](FRONTEND.md) already mandates; all the `useState` calls for five platform capabilities must move out |
| `src/components/BezentEmptyState.tsx`                                                                                        | Empty-state card + per-module copy                    | design-system                                                                | `design-system/components/`                                                                                                                             | **COPY WITH CLEANUP**                                                  | BezentEmptyStateIllustration                                              | Low                                                                                                                                                                                                                  |
| `src/components/BezentEmptyStateIllustration.tsx`                                                                            | Hand-crafted animated SVG illustration                | design-system                                                                | `design-system/components/` (or `design-system/icons/` if treated as iconography)                                                                       | **COPY WITH CLEANUP**                                                  | none                                                                      | Low — one of the highest-value, lowest-risk assets to migrate                                                                                                                                                        |
| `src/components/EmptyState.tsx`                                                                                              | 2-line re-export shim                                 | —                                                                            | —                                                                                                                                                       | **DISCARD**                                                            | —                                                                         | Low                                                                                                                                                                                                                  |
| `src/components/GlobalSearch.tsx`                                                                                            | Search input UI                                       | platform                                                                     | `platform/search/`                                                                                                                                      | **REBUILD USING APPROVED VISUALS**                                     | search types/data split (§14)                                             | Medium                                                                                                                                                                                                               |
| `src/components/MoreLauncher.tsx` (1,567 lines)                                                                              | App-launcher popover + `BEZENT_TOOL_REGISTRY`         | platform (launcher UI) + applications/hrms (registry content)                | split                                                                                                                                                   | **REFACTOR** (split file)                                              | BezentEnterpriseIcon (to be discarded — needs repoint), isModulePermitted | **High** — largest single component file after App.tsx; contains its own HRMS catalog (§11)                                                                                                                          |
| `src/components/index.ts`                                                                                                    | Barrel export                                         | —                                                                            | mirrored per new location                                                                                                                               | **REFACTOR**                                                           | —                                                                         | Low                                                                                                                                                                                                                  |
| `src/components/search/*`                                                                                                    | Search sub-components                                 | platform/search (infra) vs. applications/hrms (mock content)                 | see §14 table                                                                                                                                           | mixed — see §14                                                        | search types                                                              | Medium                                                                                                                                                                                                               |
| `src/components/search/searchData.ts`                                                                                        | Mock search index                                     | —                                                                            | —                                                                                                                                                       | **DISCARD** (algorithm shape only as reference)                        | —                                                                         | Low                                                                                                                                                                                                                  |
| `src/imports/pasted_text/*.md`                                                                                               | Original Figma Make prompts/specs                     | —                                                                            | `docs/architecture/` reference material _if_ the team wants to keep the interaction specs (e.g. the drawer-loading-transition spec is genuinely useful) | **KEEP AS REFERENCE ONLY**                                             | —                                                                         | Low                                                                                                                                                                                                                  |
| `src/assets/empty-states/*.png`                                                                                              | 3 stub images (131 bytes each)                        | —                                                                            | —                                                                                                                                                       | **DISCARD**                                                            | —                                                                         | Low                                                                                                                                                                                                                  |
| `scripts/writeIcons.js`                                                                                                      | Hardcoded-path codegen script                         | —                                                                            | —                                                                                                                                                       | **DISCARD**                                                            | —                                                                         | Low                                                                                                                                                                                                                  |
| `.figma/`, `.github/workflows/*`, `public/404.html`, `.mise.toml`, old `AGENTS.md`/`CLAUDE.md`, `pnpm-lock.yaml`             | Figma Make / old hosting tooling                      | —                                                                            | —                                                                                                                                                       | **DISCARD**                                                            | —                                                                         | None (already excluded, see §15)                                                                                                                                                                                     |

---

## 17. Risks

### High visual-regression risk (preserve exactly)

- **Brand color and token values** (§4) — any drift from `#931CF5` and
  the surrounding palette is immediately visible and is the most
  recognizable part of BEZENT's identity.
- **Drawer circular-reveal loading transition** (§6) — a distinctive,
  deliberately-specified interaction (see the original prompt in
  `src/imports/pasted_text/drawer-loading-transition.md`); easy to
  simplify away by accident during a rebuild.
- **Duotone icon rendering** (outline vs. solid, stroke/fill token pairs)
  — subtle but consistent across the whole icon set; a rebuild that
  "simplifies" to single-color icons would be a visible regression.
- **Empty-state illustration animation** (plane loop, sparkle fade,
  `prefers-reduced-motion` handling) — accessibility behavior as well as
  visual, easy to drop if not explicitly ported.
- **Light/dark theme parity** — every token has both a light and dark
  value; migrating "the tokens" without verifying both modes risks a
  half-finished dark theme.

### Structural / architectural risk

- **The three-to-four overlapping HRMS catalogs** (§11) — reconciling
  `MODULE_CATALOG`, `MODULE_TO_SLUG`, and `BEZENT_TOOL_REGISTRY` into one
  source of truth is non-trivial (different grouping schemes, possibly
  different item sets) and must happen _before_ `applications/hrms`
  navigation is built, not discovered mid-implementation.
- **`iconRegistry.ts`'s mixed responsibilities** (§7, §16) — splitting
  icon lookup from navigation catalog from permission-check logic touches
  a file everything else imports from; sequencing this split correctly in
  Phase 0B.3 matters.
- **`App()`'s centralized `useState` for five platform capabilities** —
  the single biggest scalability risk if copied as a pattern: it does not
  extend to a second business application sharing the shell, and directly
  contradicts the new architecture's platform/application boundary.
- **Duplicate icon keys** (`payroll`, `candidates` in `iconDefinitions.tsx`)
  — a silent bug today; must be resolved with a real design decision
  (are these actually two different icons that were meant to have unique
  keys?), not just deduplicated arbitrarily.
- **Hash-based routing** — reimplementing `window.location.hash` parsing
  rather than adopting `react-router` (already a dependency of the new
  `apps/web`) would reintroduce technical debt the new architecture
  already resolved.

### Low risk / low value

- Figma Make tooling, dual lockfile, stub PNGs, the `writeIcons.js`
  script, and the old governance docs — all cleanly excluded, no
  migration decision needed.

---

## 18. Items Requiring Manual Visual Verification

Once Phase 0B.2+ actually renders migrated components, a human should
visually compare these against the old UI (running it side-by-side, since
it is a working prototype):

1. Full light/dark theme parity across every token category in §4,
   especially the less-common ones (More-Services panel, right-utility
   drawer badges/checkboxes).
2. Icon duotone rendering at each defined size (`compact`/`nav`/`action`/
   `module` and the `BEZENT_ICON_SIZES` set) in both default/hover/
   selected/pressed states.
3. The empty-state illustration's animation timing and
   `prefers-reduced-motion` fallback.
4. Drawer open/close circular-reveal transition timing (360ms expand,
   180ms content reveal per the CSS) at each of the five capability
   entry points.
5. Sub-nav flyout positioning (`DynamicFlyoutPointer`) relative to the
   hovered/selected left-nav item — this is coordinate-math-driven and a
   common source of pixel-level regressions.
6. Notification dropdown enter/leave animation and unread-badge
   positioning on the bell icon.
7. Search dropdown/discovery panel entry animation and keyboard
   navigation (`selectedIndex`) behavior.
8. Top nav's Quick Create / BEZENT AI / App Launcher button hover,
   pressed, and active visual states (multiple manually-tracked
   `useState` hover booleans per button — easy to miss a state when
   rebuilding as CSS `:hover`/`:active`).
9. Right-rail button active/hover compound states
   (`.bezent-right-rail-btn.is-active:hover`) — verify the CSS-class
   version (already correctly implemented, §6) is what gets reused,
   not reinvented.
10. Resolution of the two duplicate icon keys (`payroll`, `candidates`)
    — a design decision, not just a code fix, and worth a visual sign-off
    once resolved.
