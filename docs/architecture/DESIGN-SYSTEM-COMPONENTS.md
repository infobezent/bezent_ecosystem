# BEZENT Design System — Component System

**Status: foundation implemented (Phase 0B.4).** Canonical documentation for
BEZENT's global UI primitives. See also
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) (ownership),
[DESIGN-SYSTEM-TOKENS.md](DESIGN-SYSTEM-TOKENS.md) (tokens/theme) and
[ICON-SYSTEM.md](ICON-SYSTEM.md) (icons).

## 1. Ownership

Components live in `apps/web/src/design-system/components/`. They are
**business-domain independent**: no HRMS/CRM concept, no employee data, no
platform capability (search, notifications, ...) lives here. `design-system`
never imports from `app/`, `platform/`, `layouts/` or `applications/`.

## 2. Components implemented

| Component                                 | Evidence in old approved UI                                                                                                                    | Variants / API                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Button`                                  | Global `.btn-primary` / `button[data-variant="primary"]` rule (`index.css`), matched value-for-value by the "Quick Create" button in `App.tsx` | `variant: 'primary'` only; native `<button>`, `disabled`                                                   |
| `IconButton`                              | `NavIconBtn` (`App.tsx`), used for Settings and App Launcher                                                                                   | `label` (required, accessible name + hover tooltip), `active`, `tooltipDirection`                          |
| `Tooltip`                                 | `Tooltip` (`App.tsx`)                                                                                                                          | `label`, `direction: left \| right \| up \| down`; pure-CSS positioning, no library                        |
| `Badge`                                   | Notification unread-count badge (`App.tsx`)                                                                                                    | `count` (+ `max`), or `dot`; decorative (`aria-hidden`)                                                    |
| `Avatar`                                  | Profile avatar (`App.tsx`)                                                                                                                     | `initials`, or `src` + `alt`; fixed 34px (only size evidenced)                                             |
| `EmptyState` (+ `EmptyStateIllustration`) | `BezentEmptyState` / `BezentEmptyStateIllustration`                                                                                            | `title`, `description`, `primaryAction`, `secondaryAction`, `size: default \| compact`, `hideIllustration` |

## 3. Candidate classification

| Candidate                  | Decision                   | Reason                                                                                                                       |
| -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Button                     | CREATE NOW                 | Evidenced generic class + real usage                                                                                         |
| IconButton                 | CREATE NOW                 | Repeated pattern, needed by AppShell                                                                                         |
| Tooltip                    | CREATE NOW                 | Used by multiple controls, self-contained                                                                                    |
| Badge                      | CREATE NOW                 | Evidenced count badge; kept generic                                                                                          |
| Avatar                     | CREATE NOW                 | Evidenced profile avatar                                                                                                     |
| Empty state                | CREATE NOW (shell only)    | Generic shell + illustration; business copy excluded                                                                         |
| Divider                    | NOT JUSTIFIED              | Only ad hoc `border` styles, no component pattern                                                                            |
| Surface / Panel            | DEFER TO APPSHELL          | No concrete first consumer yet; floating panels share tokens (`--floating-surface-*`) but positioning is bespoke per feature |
| Popover / floating surface | DEFER TO APPSHELL/PLATFORM | Old positioning is hand-coded per trigger, not a reusable contract                                                           |
| Search input shell         | DEFER TO PLATFORM          | Search is a platform capability; no generic Input evidenced separately                                                       |
| Drawer primitives          | DEFER TO APPSHELL          | `UtilityDrawerShell` is Phase 0B.5                                                                                           |
| Menu item / action row     | DEFER TO APPSHELL/PLATFORM | `--popup-row-*` tokens exist but no first consumer to shape the API                                                          |
| Navigation item            | DEFER TO APPSHELL          | `BezentNavIcon` already covers the icon part                                                                                 |

## 4. Deliberate decisions

- **Only one Button variant.** The "BEZENT AI" bordered button uses
  feature-specific `--btn-ai-*` tokens and appears once; generalizing it
  into `secondary` would invent a variant. Button text size/padding are
  borrowed from that button because no old `.btn-primary` instance carried
  a label — documented, not invented.
- **EmptyState excludes the old preset dictionary.** ~20 hardcoded per-module
  (Leave, Payroll, ...) strings were business copy. Consumers pass their own.
  The old `useTheme()` dependency was also dropped (design-system must not
  import `app/`).
- **EmptyState CTA arrow icon omitted.** It came from `lucide-react`, which is
  not a dependency of this project; `primaryActionIcon` is an optional slot.
- **Avatar has no `size` prop; no `style` prop anywhere.** One evidenced size;
  exposing `style` would invite inline CSS.
- **Bug fixed:** the old illustration `<svg>` had `height="auto"`, invalid as an
  SVG attribute (console error). Removed.
- **Tokens:** no new tokens added. Single-use illustration/CTA-gradient
  literals (`#A855F7`, `#7E22CE`, illustration fills) stay component-local,
  the same documented exception as the icon system's `assets` icon.

## 5. Tokens, theme, icons

Components consume `var(--token)` only (`--accent-*`, `--nav-*`,
`--top-utility-hover`, `--bg-popup`, `--border-default`, `--shadow-dropdown`,
`--icon-on-solid`, `--text-*`, `--bg-surface`, ...). Hover/active states use CSS
pseudo-classes (keyboard-friendly), replacing the old imperative
`element.style` mutation. Components never read localStorage,
`prefers-color-scheme`, or theme state. `EmptyStateIllustration` reads the
resolved `data-theme` attribute exactly as `BezentIcon` does. `IconButton`
accepts any children; pass `<BezentIcon>` for BEZENT glyphs.

## 6. Accessibility

Button: native semantics. IconButton: required `label` becomes `aria-label`,
`aria-pressed` reflects `active`. Tooltip: `role="tooltip"`, never a
replacement for an accessible name. Badge: `aria-hidden` — the consumer's
control label should state the count (e.g. "Notifications, 5 unread").
Avatar: `role="img"` + label for initials, `alt` for images. EmptyState:
`role="region"` labelled by `title`; illustration `aria-hidden`, animations
disabled under `prefers-reduced-motion`.

## 7. CSS ownership

Each component owns a colocated stylesheet (`Component/Component.css`).
Nothing goes in `globals.css`. No inline CSS.

## 8. Consuming components

```tsx
import { Button, IconButton, Badge } from '.../design-system/components';
```

## 9. Does a new component belong here?

Add to `design-system/components` only if it is (a) evidenced in the approved
UI or a concrete approved requirement, (b) business-domain independent,
(c) needed by real consumers soon, and (d) not already covered. Search the
design-system first; never create a competing Button/Input/Badge/Tooltip in an
application. Not a component: `EmployeeCard`, `LeaveBalanceCard`,
`AttendanceStatus` — those belong to HRMS.

## 10. Phase 0B.5 update

- `IconButton` gained `variant="solid"` (34px brand-filled) — evidence: the
  old Quick Create button. Default `ghost` is unchanged.
- **NavItem**: kept private to `layouts/app-shell` (rail-specific geometry).
- **Surface/Panel, Popover**: still not created — real shell use showed no
  shared behaviour beyond tokens; the sub-nav flyout is shell-specific.
- **`lucide-react`**: not added; missing shell glyphs went into the BEZENT
  icon registry instead (see ICON-SYSTEM.md).

## 11. Deferred

Input/search shell, Drawer primitives, MenuItem, Divider, additional Button
variants, Avatar sizes.
