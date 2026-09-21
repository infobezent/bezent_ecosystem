# UI Rules

Global rules for all BEZENT frontend code (`apps/web`). For who owns the
design system these rules protect, see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## Rule 1 — No inline CSS (permanent, ADR-011)

Prohibited everywhere in `apps/web`:

- `style={{ ... }}` (React inline style objects)
- `style="..."` (raw HTML style attributes)
- Ad-hoc `React.CSSProperties` objects used for ordinary visual styling
- Hardcoded JS style objects passed into components for the same purpose

Use design-system tokens and CSS classes instead — see
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

**Enforcement:** ESLint `no-restricted-syntax` rule targeting the `style`
JSX attribute, scoped to `apps/web/**/*.{ts,tsx}`, defined in
[eslint.config.mjs](../../eslint.config.mjs). A change that reintroduces
`style={{` will fail `npm run lint` and CI.

**The only acceptable exception:** genuinely runtime-calculated visual data
that cannot reasonably be expressed via a CSS class or CSS custom property
(e.g. a computed `transform` during a live drag interaction). Such
exceptions:

- must be rare,
- must be accompanied by a comment explaining why a class/CSS variable
  isn't possible,
- do not need an ADR (this is a coding-level exception, not an
  architectural change), but should be flagged in code review.

## Rule 2 — One design system, no competing styling

Every module consumes `design-system/` components and tokens. No module,
page, or feature defines its own button, color palette, spacing scale, or
parallel styling system. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

## Rule 3 — No global stylesheet sprawl

Avoid: a giant global stylesheet, duplicated per-page CSS, hardcoded
repeated hex colors, ad-hoc spacing values, or a module inventing its own
competing design system. Styling belongs in `design-system/styles` (global)
or as component-scoped styles that consume design-system tokens — never as
copy-pasted magic values.

## Rule 4 — The old approved UI is a source, not a shortcut

Do not copy markup, classes, or styles out of the old approved BEZENT UI
ad hoc to "get something working faster." Old UI content is migrated
deliberately, inventoried and classified, per
[UI-MIGRATION.md](UI-MIGRATION.md) — not copy-pasted piecemeal outside that
process.

## Phase 0 status

The current placeholder page (`app/router/DevPlaceholderPage.tsx`) and its
stylesheet (`design-system/styles/placeholder.css`) exist only to prove the
React app renders. They already comply with Rule 1 (no inline styles) but
are not real BEZENT UI and are replaced, not extended, once Phase 0B
begins.

## Changing these rules

These are permanent, platform-wide rules. Removing or weakening any of them
(e.g. permitting inline CSS in a specific module) is an architectural
change and requires the ADR + approval process in
[AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
