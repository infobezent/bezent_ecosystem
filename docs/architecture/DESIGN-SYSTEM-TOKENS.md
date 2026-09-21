# BEZENT Design System — Token Foundation

**Status: implemented (Phase 0B.2).** This is the canonical documentation
for BEZENT's design tokens and theme foundation. For _who owns_ the design
system and the dependency rules around it, see
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). For the full migration analysis this
phase implements, see
[UI-MIGRATION-INVENTORY.md](UI-MIGRATION-INVENTORY.md).

## 1. Source of truth

Every token value in this document was extracted from the separately
approved old BEZENT UI (`src/index.css`, `src/theme/tokens.ts`,
`src/theme/ThemeContext.tsx`, and `index.html`'s pre-React theme script —
see [UI-MIGRATION-INVENTORY.md §4](UI-MIGRATION-INVENTORY.md#4-design-token-inventory)).
No color, spacing, timing, or dimension value in this foundation was
invented — each is either a direct extraction or, where explicitly noted,
a documented, evidence-based consolidation of values already reused
multiple times in the source.

## 2. Brand color

BEZENT primary: **`#931CF5`** (`--accent-primary`), identical in both
light and dark themes. This is BEZENT's brand identity — never replace,
substitute, or hardcode a different purple anywhere in the codebase.

## 3. Theme modes

Three modes are supported: **light**, **dark**, **system**. `system`
resolves to whichever of light/dark matches the OS's
`prefers-color-scheme`, and re-resolves live if the OS preference changes
while the app is open.

## 4. Token categories

All tokens live in `apps/web/src/design-system/tokens/`:

| File             | Contents                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme.css`      | The full semantic color/surface/shadow token set — surfaces, interactive surfaces, typography colors, borders, the icon-system color tokens, search, accent/brand, floating surfaces, shadows, top-nav controls, sidebar navigation, right rail, bottom bar, popup rows, the more-services panel, and the right utility drawer. ~222 custom properties, each defined for both `[data-theme="light"]` and `[data-theme="dark"]`. |
| `typography.css` | Font family (Inter) and the 5 approved font weights.                                                                                                                                                                                                                                                                                                                                                                            |
| `motion.css`     | Reusable transition duration and easing-curve tokens (see §12).                                                                                                                                                                                                                                                                                                                                                                 |
| `layout.css`     | Fixed BEZENT shell dimensions (see §11).                                                                                                                                                                                                                                                                                                                                                                                        |
| `tokens.ts`      | Typed accessor layer (see §7).                                                                                                                                                                                                                                                                                                                                                                                                  |
| `index.ts`       | Barrel export for `tokens.ts`.                                                                                                                                                                                                                                                                                                                                                                                                  |

**Why not the `colors.css` / `spacing.css` / `radius.css` / `shadows.css`
split suggested as a starting direction:** the old UI's tokens are one
unified semantic system, branched by theme, not layered into
primitive-vs-semantic color files — introducing that split would invent a
structure the source doesn't have. Similarly, the old UI never tokenized
a spacing or border-radius **scale** (padding/margin/radius values were
ad hoc numbers inline, never CSS custom properties) — inventing a
`4/8/12/16/24`-style scale now would not be a faithful extraction, so
`spacing.css` and `radius.css` do not exist yet. A real scale is
introduced later, from actual component usage, once design-system
components are built (Phase 0B.4+) — see
[UI-MIGRATION-INVENTORY.md §11](UI-MIGRATION-INVENTORY.md#11-hrms-specific-inventory)
for the general principle. Shadow tokens are theme-dependent in the
source (different values per theme) and live inside `theme.css`'s
per-theme blocks rather than a separate always-static `shadows.css`.

## 5. CSS variable naming rules

- `kebab-case`, prefixed by category: `--bg-*`, `--text-*`, `--border-*`,
  `--icon-*`, `--search-*`, `--accent-*`, `--surface-*`, `--shadow-*`,
  `--drawer-*`, `--more-*`, `--popup-*`, `--nav-*`, `--sidebar-*`,
  `--right-rail-*`, `--footer-*`, `--btn-ai-*`, `--top-utility-*`,
  `--status-*`, `--font-*`, `--motion-*`, `--shell-*`.
- A token may reference another token (`--search-chip-selected-bg:
var(--nav-selected)`) but never a raw literal duplicated from another
  token's value — one value, one name, referenced everywhere it recurs.
- No fallback value on a token-to-token reference inside `theme.css`
  itself — every token is unconditionally defined by this file, so a
  fallback there is redundant (see §9).

## 6. How components must consume tokens

Always `var(--token-name)`, in a CSS file/class — never a hardcoded hex,
never a duplicated light/dark pair maintained in JavaScript, never inline
`style={{...}}`. This is a permanent rule (see
[UI-RULES.md](UI-RULES.md)); it is enforced mechanically by ESLint for
JSX and is not optional for CSS either.

```css
/* correct */
.example {
  background: var(--bg-surface);
  color: var(--text-primary);
}
```

```tsx
/* wrong — never do this */
<div style={{ background: 'var(--bg-surface)' }} />
<div style={{ background: '#FFFFFF' }} />
```

## 7. Typed token access

`design-system/tokens/tokens.ts` exports `THEME_TOKENS`,
`TYPOGRAPHY_TOKENS`, `MOTION_TOKENS`, and `LAYOUT_TOKENS` — plain objects
of categorized `var(--...)` strings, for the rare case where a token name
needs to be referenced from TypeScript rather than CSS (e.g. passed to a
charting library). **Every value in these objects is a `var()` string —
never a literal hex/color/duration.** CSS remains the actual source of
truth; this file is a convenience index into it, not a parallel palette.
Not every one of the ~222 CSS custom properties has a TS entry — only the
categories the old UI's own typed layer covered, plus the three new token
groups from this phase. Anything not covered here is still fully usable
via `var(--token-name)` directly in CSS.

## 8. Light/dark resolution

`app/providers/ThemeProvider.tsx` owns theme **state and resolution**:

- `mode: 'light' | 'dark' | 'system'` — the user's stored preference.
- `resolvedTheme: 'light' | 'dark'` — `mode` resolved against the OS
  preference when `mode === 'system'`.
- Resolution re-runs live via a `prefers-color-scheme` media-query
  `change` listener, so switching OS theme while `mode === 'system'`
  updates the app without a reload.
- `document.documentElement`'s `data-theme` attribute and
  `style.colorScheme` are kept in sync with `resolvedTheme` in an effect.

**Why `app/providers` and not a new `platform/appearance`:** nothing here
is business-specific, and creating a new `platform/` boundary ahead of a
concrete need it would violate [AGENTS.md, Article
5](../../AGENTS.md#article-5--no-speculative-scaffolding). If a real
cross-application "appearance" capability is ever needed beyond this, that
is a future decision made when the need is concrete — through the normal
Article 4 process if it changes ownership.

**Deferred, on purpose:** the visual theme controls (`ThemeToggle`,
`RightRailThemeControl`) are **not** implemented in this phase — only the
state/provider foundation they'll eventually consume. They belong to a
later design-system component phase.

## 9. Theme persistence

`localStorage`, key **`bezent-theme`** — the exact key the approved old
UI used, kept for continuity since the new architecture didn't define its
own key yet. Both `ThemeProvider` and the pre-React initialization script
(§10) read/write this same key; there is exactly one theme algorithm, not
two independent ones.

## 10. FOUC prevention

`apps/web/index.html` contains a minimal, synchronous, dependency-free
inline `<script>` in `<head>`, run before React mounts:

1. Reads `localStorage['bezent-theme']`.
2. If the stored value is `system` (or missing/invalid), resolves it
   against `window.matchMedia('(prefers-color-scheme: dark)')`.
3. Sets `data-theme` on `<html>` and `document.documentElement.style.colorScheme`
   before first paint.

This is a **stricter** implementation than the old UI's own script, which
only checked for the literal string `"dark"` and did not resolve `system`
at all (a real gap in the old UI — a user with `mode: "system"` on a
dark-preference OS would see a light flash before React corrected it).
The new script resolves `system` correctly, closing that gap, while
remaining minimal and dependency-free as required.

## 11. Layout dimension tokens

`design-system/tokens/layout.css` — stable, approved BEZENT shell
measurements, extracted from the old UI's `App.tsx`:

| Token                          | Value   | Old UI source                                        |
| ------------------------------ | ------- | ---------------------------------------------------- |
| `--shell-topbar-height`        | `60px`  | `TopNav` fixed height                                |
| `--shell-sidebar-width`        | `90px`  | `leftW`                                              |
| `--shell-right-rail-width`     | `48px`  | `railW` when open                                    |
| `--shell-bottom-bar-height`    | `36px`  | `BottomBar` fixed height / workspace `bottom` offset |
| `--shell-utility-drawer-width` | `370px` | `DRAWER_W`                                           |
| `--shell-ai-panel-width`       | `340px` | `AI_PANEL_W`                                         |

**No AppShell is built in this phase** — these are tokens only, for the
AppShell implementation to consume in Phase 0B.5.

## 12. Motion foundation

`design-system/tokens/motion.css` — only values genuinely **reused**
across multiple places in the old UI are promoted to tokens:

| Token                      | Value                           | Reuse evidence                                                                                                                                              |
| -------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--motion-duration-theme`  | `180ms`                         | Global light/dark cross-fade, applied identically to `html`/`body`/`#root` and every shell region (`header`/`aside`/`footer`/`nav`/`main`)                  |
| `--motion-ease-standard`   | `cubic-bezier(0.16, 1, 0.3, 1)` | Reused 7× across the old UI's entrance animations (notification dropdown, notification content, more-flyout, drill in/out, sub-nav flyout, search dropdown) |
| `--motion-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)`    | Reused 3× for the utility-drawer circular-reveal transition                                                                                                 |
| `--motion-ease-exit`       | `cubic-bezier(0.4, 0, 1, 1)`    | The notification dropdown's leave transition                                                                                                                |

Per-component entrance/exit **durations** that differ per component
(135ms/140ms/160ms/200ms/240ms/260ms/360ms across the drawer reveal,
notification dropdown, sub-nav flyout, search dropdown, and more-launcher)
are **not** normalized into one scale here — the old UI tunes each
individually, and unifying them now would misrepresent the source. Each
is extracted alongside its owning component, in that component's own
migration phase (0B.4 design-system components, 0B.5 AppShell, 0B.6
search, 0B.7 platform capabilities) — see
[UI-MIGRATION-INVENTORY.md §6](UI-MIGRATION-INVENTORY.md#6-design-system-inventory-beyond-raw-tokens).
No component-specific keyframes (drawer circular reveal, notification
dropdown enter/leave, sub-nav flyout entry, search dropdown entry,
more-launcher transitions) are migrated in this phase either — only the
reusable variables above.

## 13. Legacy aliases

The old UI's `index.css` had a "Legacy aliases for backward compatibility"
block (`--color-primary`, `--color-selected-icon`, `--color-selected-bg`,
`--color-hover-bg`, `--color-btn-hover`, `--color-active-pressed`,
`--color-purple-heading`, `--color-very-dark-purple`).

**Disposition: REMOVED (all 8).** A full search of the old UI's component
source found **zero references** to any of them anywhere outside
`index.css` itself — they were dead weight. One (`--color-selected-icon`)
was also internally inconsistent between light and dark mode (mapped to a
different underlying token per theme), a further sign they weren't
maintained as real dependencies. None are carried forward. If a future
migration phase discovers old-UI code that genuinely still references one
of these names, it should be repointed to the real semantic token it
meant (e.g. `--color-primary` → `--accent-primary`), not have the alias
resurrected.

No tokens were renamed in this phase — every token in `theme.css` keeps
its exact old name (only the 8 aliases above were dropped, and internal
redundant hex fallbacks were removed — see §9 of
[UI-MIGRATION-INVENTORY.md](UI-MIGRATION-INVENTORY.md) and the hardcoded-
fallback note below).

## 14. Hardcoded fallback cleanup

The inventory flagged token references like `var(--icon-default,
#B8A7C7)` in **component** code, where the literal fallback doesn't match
the light-mode value it would apply in (`#B8A7C7` is the _dark_-mode
value). That specific cleanup applies to component files (`BezentIcon`,
`BezentNavIcon`, etc.), which are **not migrated in this phase** (Phase
0B.3+) — the mismatch still exists there today and will be fixed when
those files are migrated.

Within the token foundation itself, the handful of internal
token-to-token references that had a redundant hex fallback (e.g.
`var(--nav-selected, #EAD7FD)`) had that fallback removed, since every
token here is unconditionally defined — see §5.

## 15. No inline CSS

Permanent rule, unchanged — see [UI-RULES.md](UI-RULES.md). This
foundation introduces zero `style={{...}}`, zero
`React.CSSProperties`-typed inline style objects, and zero imperative
`element.style.*` mutation. Verified by scanning the entire `apps/web`
production source — see the Phase 0B.2 completion report for the exact
scan command and result.

## 16. Phase 0B.5 additions (AppShell)

Added to `tokens/layout.css`, each with old-UI evidence:

- `--shell-nav-item-width` 78, `--shell-nav-item-height` 68,
  `--shell-nav-item-gap` 2, `--shell-nav-label-max-width` 74,
  `--shell-nav-label-area-height` 24 — the old `SIDEBAR_NAV_TOKENS`.
- `--shell-subnav-flyout-width` 250 — old `SubNavFlyout` width.
- `--z-right-rail` 50, `--z-right-rail-tab` 60, `--z-sidebar` 90,
  `--z-topbar` 100, `--z-bottombar` 100, `--z-tooltip` 300, `--z-flyout` 340 —
  the old shell's literal z-index values. `Tooltip.css` now uses
  `--z-tooltip`.

See [APPSHELL.md](APPSHELL.md).

## 17. Phase 0B.8 additions (More launcher)

`--z-launcher` 350 and `--shell-launcher-width` 710px (layout.css), and
`--motion-duration-launcher-enter` 200ms / `--motion-duration-launcher-drill` 135ms
(motion.css) — the old launcher's literal values. Colours reuse the existing
`--more-*` tokens. See [HRMS-NAVIGATION.md](HRMS-NAVIGATION.md).

## 18. Phase 0B.9 audit

- **Removed (unused legacy/prototype):** `--surface-primary/-floating/-hover/-selected` (+ their `-dark` variants), `--border-surface`, `--border-dark`, `--text-primary-dark`, `--text-secondary-dark`, `--accent-purple`, `--sidebar-{icon,label}-{default,hover,active}`, `--right-rail-icon`.
- **Added:** `--shadow-brand-sm` (`0 1px 3px rgba(147,28,245,.25)`), the one brand-tinted lift used by the logo tile and `Badge` (previously two near-identical literals).
- **Left as documented exceptions:** the EmptyState CTA gradient/shadows and illustration fills, the right-rail edge-tab shadow, and neutral black shadows.
- **Unused but kept:** the remaining unreferenced semantic tokens (e.g. `--more-row-*`, `--btn-ai-active-*`, `--search-kbd-*`) are designed sets for existing components and may be consumed by HRMS pages; prune only with a consumer-driven review.
- `color-scheme` is now set in CSS (`base.css` per `[data-theme]`) instead of imperatively in `ThemeProvider`/the FOUC script.

## 19. Approved Global Colour Palette

The canonical BEZENT colour system provides one unified, single-source-of-truth palette across all applications (HRMS, and future CRM, Project Management, Finance, Inventory, Support).

### Brand Identity Scale

- **Primary / Default (`--accent-primary`):** `#931CF5` — The immutable BEZENT identity purple.
- **Primary Hover (`--accent-hover`):** `#8418DC`
- **Primary Pressed (`--accent-pressed`):** `#7114BD`
- **Primary Dark (`--accent-dark`):** `#5D109C` — Strong brand text, active structural icon elements.
- **Primary Soft (`--accent-soft`):** `#EAD7FD` — Selected navigation container, subtle badges.
- **Primary Subtle (`--accent-subtle`):** `#F7F0FE` — Interactive hover states, light brand tint.

### Supporting Semantic Accents (Status Only)

Semantic status colours communicate status exclusively and must never be used decoratively:

- **Info (`--status-info`):** `#3B82F6` (light fg `#1D4ED8`, bg `#EFF6FF`; dark fg `#93C5FD`, bg `rgba(59, 130, 246, 0.16)`)
- **Success (`--status-success`):** `#10B981` (light fg `#059669`, bg `#ECFDF5`; dark fg `#6EE7B7`, bg `rgba(16, 185, 129, 0.16)`)
- **Warning (`--status-warning`):** `#F59E0B` (light fg `#B45309`, bg `#FEF3C7`; dark fg `#FDE68A`, bg `rgba(245, 158, 11, 0.16)`)
- **Error / Danger (`--status-danger`):** `#EF4444` (light fg `#B91C1C`, bg `#FEE2E2`; dark fg `#FCA5A5`, bg `rgba(239, 68, 68, 0.16)`)

### Light Theme Neutral Scale

- **Shell Navigation Surfaces (`--bg-header`, `--bg-sidebar`, `--bg-footer`, `--bg-popup-header`):** `#FFFFFF`
- **Main Workspace Canvas (`--bg-app`):** `#F8F7FA` (subtle cool neutral canvas providing clear separation from white shell and white cards)
- **Surface Secondary (`--bg-surface-secondary`):** `#F8F8FA`
- **Cards / Content Surface (`--bg-surface`):** `#FFFFFF`
- **Subtle / Hover Neutral (`--border-subtle`, neutral hover):** `#F1F1F4`
- **Border (`--border-default`, `--border-divider`, `--header-border-bottom`):** `#E5E7EB`
- **Muted (`--text-disabled`):** `#CBD5E1`
- **Secondary Text / Neutral Muted (`--text-muted`):** `#94A3B8`
- **Secondary Text (`--text-secondary`, `--footer-text`):** `#64748B`
- **Body Text (`--text-body`):** `#475569`
- **Heading / Strong Text (`--text-primary`, `--nav-label-default`):** `#1E293B`
- **Strong Heading / Wordmark / Highest Contrast (`--text-brand`):** `#0F172A`
- **Text on Primary (`--text-inverse`, `--icon-on-solid`):** `#FFFFFF`

### Visual Hierarchy (Light Theme)

```
WHITE Shell Surfaces (--bg-header, --bg-sidebar, --bg-footer: #FFFFFF)
        ↓
#F8F7FA Main Workspace Canvas (--bg-app: #F8F7FA)
        ↓
WHITE Cards / Tables / Forms (--bg-surface: #FFFFFF)
        ↓
Subtle Border (--border-default: #E5E7EB)
        ↓
Content Typography (Primary: #1E293B, Body: #475569, Secondary: #64748B)
```

The previously tested warm `#F4F2EE` workspace canvas is explicitly rejected and replaced with this cool neutral hierarchy. Separation between workspace and elevated cards is achieved cleanly through cool neutral tone, subtle `#E5E7EB` borders, and small approved elevation shadows (`--shadow-card`), without artificial high-contrast borders or heavy shadows.

### Dark Theme Principles

- **Primary Identity Preserved:** `#931CF5` remains the primary brand color.
- **Deep Navy/Purple Surface Architecture:** Surfaces layer from deepest background (`--bg-app: #0F0318`, `--bg-sidebar: #2C0849`, `--bg-header: #490D7A`, `--bg-popup: #3B0B62`) without flattening to pure black.
- **Text & Status Contrast:** High-contrast text (`#FFFFFF`, `#CFC5D6`) and legible status tones meeting WCAG contrast against dark purple backgrounds.
- **Pure CSS Theme Resolution:** Swapping `[data-theme='light']` and `[data-theme='dark']` dynamically re-resolves all semantic tokens without component-level branching or visual flash.

### Future Application Inheritance

All business applications (HRMS, CRM, Project Management) inherit colors strictly from `AppShell` and the global design-system tokens (`apps/web/src/design-system/tokens/`). No business application may define local background colors, component overrides, or competing token systems.
