# BEZENT Design System — Icon System

**Status: implemented (Phase 0B.3).** This is the canonical documentation
for BEZENT's icon system. For tokens/theme, see
[DESIGN-SYSTEM-TOKENS.md](DESIGN-SYSTEM-TOKENS.md). For who owns the
design system, see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). For the full
migration analysis, see
[UI-MIGRATION-INVENTORY.md §7](UI-MIGRATION-INVENTORY.md#7-icon-inventory).

## 1. Ownership

Icons are a **global design-system asset**, owned by
`apps/web/src/design-system/icons/` — never by an application. HRMS,
future CRM, future Project Management, and every other BEZENT business
application consume the same icon set; none defines its own. This holds
even though a majority of icon _concepts_ today are HRMS-flavored (see §4)
— the concept catalog is HRMS-shaped because HRMS is the only business
application under active development, not because the icon system belongs
to HRMS. See
[AGENTS.md — BEZENT Architecture Terminology](../../AGENTS.md#bezent-architecture-terminology).

## 2. Canonical registry

**One concept, one icon.** `design-system/icons/registry.ts` exports
`getBezentIconDefinition(name)`, which resolves any canonical key _or_
legacy/loose alias (via `CANONICAL_CONCEPT_MAP`) to exactly one
`IconDefinition`. There is no second lookup path.

The old approved UI's `iconRegistry.ts` mixed this responsibility with an
entire HRMS navigation catalog (`FIXED_PRIMARY_ITEMS`, `MODULE_CATALOG`,
`HRMS_PRIMARY_RAIL`, `MORE_GROUP_DEFINITIONS`) and a permission check
(`isModulePermitted`). Only `CANONICAL_CONCEPT_MAP` and
`getBezentIconDefinition` were icon-system responsibilities — migrated
here verbatim. The navigation catalog and permission check are **not**
migrated in this phase; they belong to `applications/hrms/` (catalog) and
`platform/access-control` (permission check, once that capability exists),
built when HRMS navigation work actually begins — see §8 and
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md).

## 3. Icon-name type

```ts
export type BezentIconName = keyof typeof ICON_DEFINITIONS; // 67 canonical keys
```

`BezentIcon`'s and `BezentNavIcon`'s `name` prop is typed as
`BezentIconName`, derived directly from the registry — an unknown icon
name fails TypeScript compilation. The looser `BezentIconProps.name:
string` (in `types.ts`) exists only for the rarer case of a genuinely
dynamic/legacy name resolved through `getBezentIconDefinition`'s alias map
at runtime (e.g. a name computed from external data).

## 4. Icon catalog (67 canonical icons)

Split into four source files by the old UI's own `category` field — a
real, evidenced split, not an invented one:

| File                     | Category                   | Count |
| ------------------------ | -------------------------- | ----- |
| `definitions/global.tsx` | `global`                   | 29    |
| `definitions/hrms.tsx`   | `hrms`                     | 21    |
| `definitions/crm.tsx`    | `crm` (future application) | 10    |
| `definitions/pm.tsx`     | `pm` (future application)  | 7     |

`definitions/index.ts` merges all four into the single `ICON_DEFINITIONS`
map every lookup goes through — the split is a source-file organization
choice, not a second registry.

## 5. General icon component

`BezentIcon` (`design-system/icons/components/BezentIcon.tsx`) is the
canonical renderer — the only component that renders a BEZENT icon glyph.
It resolves `name` through the registry, picks the `outline` or `solid`
variant, and supplies theme-driven duotone colors
(stroke/secondary-fill/structural/accent/cutout) via CSS custom properties
from `design-system/tokens/theme.css`.

## 6. Navigation icon behavior

`BezentNavIcon` wraps `BezentIcon` with the navigation-item container and
its default/hover/selected states (40×40px, 10px radius — see
`icons.css`). This is retained as a separate component because it
genuinely serves a distinct responsibility (a stateful container, not
just glyph rendering) that a future `LeftNav`/`RightNav` will use — see
[UI-MIGRATION-INVENTORY.md §9](UI-MIGRATION-INVENTORY.md#9-layout-inventory).
It has **no dependency on theme state** — the stencil-cutout color that
previously required a JS `isDark` check is now a themed CSS custom
property (`--nav-icon-cutout`, defined per `[data-theme]`), so the
component stays a pure `design-system` leaf per
[DEPENDENCY-RULES.md](DEPENDENCY-RULES.md) — it must never import from
`app/` or any other layer above it.

**Bug fixed during migration:** the old `BezentNavIcon.tsx` derived
`isDark` from `mode === "dark"` (the raw, unresolved theme preference) —
wrong when `mode === "system"`, where a user on a dark OS would get the
light-mode cutout color. Removing the JS branch entirely (see above) also
removes this bug, for every mode, permanently.

## 7. Enterprise icon decision: REMOVED

`BezentEnterpriseIcon` (old `design-system/icons/BezentEnterpriseIcon.tsx`)
is **not migrated**. Analysis:

- Its **outline/default state rendered raw Lucide icons** (`L.Users`,
  `L.Briefcase`, `L.ContactRound`, ~25 others) — different geometry from
  BEZENT's own hand-drawn icon set, not a themed variant of it.
- Its **active/solid state** re-implemented, via brittle
  `name.toLowerCase().includes(...)` substring matching, custom SVGs that
  substantially duplicate concepts already in `iconDefinitions.tsx`
  (its `candidates`-active glyph and `payroll`/pay-active glyph are
  near-identical to the canonical `candidates` and `payroll` solid
  renderers).
- It was used in exactly one place (`MoreLauncher.tsx`, not migrated this
  phase) and represented a second, competing icon-resolution mechanism —
  directly the situation [AGENTS.md, Article
  3](../../AGENTS.md#article-3--non-negotiable-architectural-invariants)
  and this phase's "one canonical source" mandate rule out.

When `MoreLauncher` is migrated in a future phase, it is repointed at the
canonical `BezentIcon` instead — closing this duplication permanently, not
carrying it forward under a new name.

## 8. Color/token usage

Every color `BezentIcon`/`BezentNavIcon` use is a `var(--token-name)`
reference into `design-system/tokens/theme.css` — no hardcoded hex for any
_state_ color (default/hover/selected/active/muted/duotone-secondary).

**Fallback cleanup performed:** the old `BezentIcon.tsx` wrapped nearly
every token reference in a hardcoded hex fallback
(`var(--icon-active, #A020F0)`, etc.) — dead weight, since every token is
unconditionally defined by `theme.css` (Phase 0B.2), and several fallbacks
were the _wrong_ theme's value used as a "neutral" default. All such
fallbacks were removed. One fallback (`var(--nav-cutout, #FFFFFF)`)
referenced a token (`--nav-cutout`) that was **never actually defined**
anywhere in the old UI — it always silently resolved to its hardcoded
fallback. It now correctly references `--nav-icon-cutout` (see below).

**One missing token identified and added** (per the "stop and report, add
only if evidenced" instruction for this phase): `--nav-icon-cutout`. The
old `BezentNavIcon.tsx` computed this value with a hardcoded
`isDark ? "#35104F" : "#FFFFFF"` JS branch — a real, executed value (not a
dead fallback), but never promoted to a token in Phase 0B.2. It is now
`--nav-icon-cutout` in `theme.css` (`#FFFFFF` light / `#35104F` dark),
letting the CSS cascade resolve it instead of JavaScript. Two motion
durations evidenced by this phase's own components were added the same
way — `--motion-duration-icon` (160ms) and `--motion-duration-nav-icon`
(140ms) — see [DESIGN-SYSTEM-TOKENS.md §12](DESIGN-SYSTEM-TOKENS.md#12-motion-foundation).

**One icon keeps genuine per-theme JS branching:** `assets`' solid
renderer has three hardcoded, `isDark`-branched hex values for its 3D
cube-edge shading (`#35104F`/`#4A0B78`/`#E9D0FD`/`#FFFFFF`). These are
icon-specific illustration shading, not semantic UI-state colors, and
don't map cleanly onto any single existing token — preserved exactly as
the approved old UI has it rather than invented into a new token category
it doesn't fit.

## 9. Sizing

`BEZENT_ICON_SIZES` (in `types.ts`) is preserved exactly from the old
UI's named size scale — `primaryRail`, `moreFlyout`, `topNav`,
`topNavAction`, `rightRail`, `footer`, `quickAction`, `compact`, `nav`,
`action`, `module`, `flyout`. `BezentIconProps.size` accepts a named token,
a raw number, or a string, matching the old API. No new size system was
introduced.

## 10. Accessibility

`BezentIcon` defaults `aria-hidden="true"` (icons are decorative by
default, paired with visible text labels in their consuming UI) and
accepts `title`/`aria-label` for the rarer case of a standalone
meaningful icon. This is unchanged from the old approved UI's behavior —
no new abstraction was introduced.

## 11. Duplicate-key resolutions

The old `iconDefinitions.tsx` defined three concepts **twice** under the
same object key. In a JS object literal, the later property always wins —
so in every case, only the _second_ definition was ever reachable at
runtime; the first was dead, unreachable code. Each pair's SECOND
definition is what ships here, preserving exactly what the approved UI has
always actually rendered:

| Key          | First def. (line, old file) | Second def. (line, old file) | Kept   | Notes                                                                                                                                                   |
| ------------ | --------------------------- | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payroll`    | 320                         | 456                          | Second | Near-identical "paycheck card" glyph; second has a slightly simpler white stripe, no decorative extra line                                              |
| `candidates` | 396                         | 475                          | Second | Near-identical "ID card + person" glyph; second uses a marginally smaller circle/path radius                                                            |
| `reports`    | 495 (`category: "hrms"`)    | 706 (`category: "global"`)   | Second | Same pie-chart geometry; the live category is `global` (Reports is a cross-application concept, not HRMS-exclusive) — lives in `definitions/global.tsx` |

No new distinct names (e.g. `payroll-alt`) were introduced — in every
case the two definitions were the same concept, not two different ones
that needed separating.

## 12. Old → new file mapping

| Old file                                                    | New location(s)                                                               | Migration action                                                                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-system/icons/iconTypes.ts`                          | `icons/types.ts` (icon types + `BEZENT_ICON_SIZES` only)                      | Split — navigation-catalog types (`NavigationModuleItem`, `NavigationGroup`, ...) and `SIDEBAR_NAV_TOKENS` **not migrated**, deferred to `applications/hrms/` and the AppShell/layouts phase   |
| `design-system/icons/iconDefinitions.tsx`                   | `icons/definitions/{global,hrms,crm,pm}.tsx`                                  | Copy with cleanup — deduplicated (§11), removed ~90 unreachable default-parameter hex fallbacks                                                                                                |
| `design-system/icons/iconRegistry.ts`                       | `icons/registry.ts` (concept map + lookup only)                               | Split — navigation catalog and permission check **not migrated** (§2)                                                                                                                          |
| `design-system/icons/BezentIcon.tsx`                        | `icons/components/BezentIcon.tsx`                                             | Copy with cleanup — fallback cleanup (§8), typed `name` (§3)                                                                                                                                   |
| `design-system/icons/BezentNavIcon.tsx`                     | `icons/components/BezentNavIcon.tsx`                                          | Rebuilt — inline styles → CSS classes, theme bug fix (§6)                                                                                                                                      |
| `design-system/icons/BezentEnterpriseIcon.tsx`              | —                                                                             | **Discarded** (§7)                                                                                                                                                                             |
| `index.css` lines 915-947 (`.bezent-duotone-icon` + states) | `icons/components/icons.css`                                                  | Copy with cleanup — dropped the not-yet-migrated `.bezent-right-rail-btn` compound selectors (the generic `button`/`[role="button"]` selectors already cover any future button-based consumer) |
| (new, not in old UI)                                        | `icons/components/icons.css` `.bezent-nav-icon-anchor`/`.bezent-nav-icon-box` | New CSS classes replacing `BezentNavIcon`'s inline container styles — same visual values, not previously expressed as CSS                                                                      |

## 13. How future applications consume icons

```tsx
import { BezentIcon } from 'apps/web/src/design-system/icons';

<BezentIcon name="employees" variant="outline" size="nav" />
<BezentIcon name="employees" variant="solid" active size="nav" />
```

Any business application — `applications/hrms` today, `applications/crm`
or `applications/project-management` later — imports from
`design-system/icons` the same way. No application may define its own
icon component, its own icon registry, or its own icon SVGs for a concept
this catalog already covers.

## Rules for adding a new icon

1. Check `CANONICAL_CONCEPT_MAP` and `ICON_DEFINITIONS` first — do not add
   a near-duplicate of an existing concept under a new name.
2. Add the `IconDefinition` (both `outline` and `solid` renderers) to the
   correct category file (`global`/`hrms`/`crm`/`pm`) in `definitions/`.
3. Use only `color`, `secondaryColor`, `structuralColor`, `accentColor`,
   `cutoutColor` (all supplied by `BezentIcon`, resolved from tokens) —
   never a hardcoded hex for a semantic state. A hardcoded hex is
   acceptable only for genuine, non-semantic illustration shading (see
   §8's `assets` example), and must be documented inline as such.
4. Do not create a second lookup path, a second component, or a
   per-application icon file. One concept, one canonical icon, one
   registry.

## Phase 0B.5 additions — shell glyphs

Five single-stroke utility glyphs were added to `definitions/global.tsx`
because the old approved shell used lucide equivalents for them and no
canonical icon existed: `plusSign` (Quick Create), `chevronLeft`,
`chevronRight` (right-rail collapse/expand), `moon`, `sun` (theme control).
The same geometry serves outline and solid. No second icon library was
added.

Two resolution gotchas, both from `registry.ts`: name lookup is
case-insensitive through `CANONICAL_CONCEPT_MAP`, so every new camelCase key
needs a lowercase map entry; and the legacy identifier `plus` already maps to
the circled `add` icon, which is why the bare glyph is named `plusSign`.
Documents in the rail use the canonical `documents` icon, not the old
lucide `Folders`.

## 14. ADR-015: Google Material Symbols Outlined Adoption

Per **[ADR-015](ADRs.md#adr-015)**, Google Material Symbols Outlined
(`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@...`)
has been adopted as the primary icon system engine across the BEZENT
ecosystem.

### Key Architectural Properties

1. **Seamless Backward Compatibility**:
   `<BezentIcon name="..." />` and `<BezentNavIcon name="..." />` retain
   their exact props, size tokens (`BEZENT_ICON_SIZES`), and call signatures.
   All existing callers across HRMS, CRM, PM, and AppShell remain intact
   without code modifications.
2. **Concept-to-Glyph Resolution**:
   `apps/web/src/design-system/icons/materialSymbolsMap.ts` defines the
   canonical `MATERIAL_SYMBOLS_MAP` that maps BEZENT concept keys (`dashboard`,
   `employees`, `attendance`, `payroll`, `timesheets`, `performance`,
   `leave`, `more`, etc.) directly to their Material Symbols Outlined ligature
   names.
3. **Variant & State Support**:
   - `variant="outline"` renders standard outlined glyph geometry (`FILL 0`).
   - `variant="solid"` renders filled glyph geometry (`FILL 1`).
   - Selected / active states cleanly transition container and stroke tokens
     without distortion.
4. **Zero Inline Styles (AGENTS.md Invariant 2 Compliant)**:
   Rendering utilizes semantic classes (`material-symbols-outlined`,
   `bezent-material-icon`, `bezent-icon-sz-{size}`, `is-solid`, `is-active`)
   and data attributes (`data-size`, `data-variant`, `data-color`), strictly
   avoiding `style={{ ... }}` per constitutional rules.
