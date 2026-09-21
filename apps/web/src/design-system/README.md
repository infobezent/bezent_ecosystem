# design-system/

The single global BEZENT design system: `components/`, `icons/`, `tokens/`,
`styles/`. All BEZENT UI consumes this — no application or page defines
its own competing styling.

## Status (Phase 0B.9 — frozen)

**Tokens, the global theme/base-style foundation, and the icon system are
implemented.**

- `tokens/theme.css` — the full semantic color/surface/shadow token set
  (light + dark), extracted from the approved old BEZENT UI.
- `tokens/typography.css`, `tokens/motion.css`, `tokens/layout.css` — the
  typography, motion, and shell-dimension token sets.
- `tokens/tokens.ts` — typed `var()` accessor layer.
- `styles/reset.css`, `styles/base.css`, `styles/globals.css` — the
  minimal global foundation `main.tsx` imports.
- `icons/` — the canonical BEZENT icon registry,
  `BezentIcon`/`BezentNavIcon` components, and their CSS. See
  [docs/architecture/ICON-SYSTEM.md](../../../../docs/architecture/ICON-SYSTEM.md).

See [docs/architecture/DESIGN-SYSTEM-TOKENS.md](../../../../docs/architecture/DESIGN-SYSTEM-TOKENS.md)
for token documentation (brand color, theme modes, token categories,
naming rules, typed access, persistence, FOUC prevention, layout/motion
tokens, legacy-alias disposition).

- `components/` — Button, IconButton, Tooltip, Badge, Avatar, EmptyState
  (Phase 0B.4). See
  [docs/architecture/DESIGN-SYSTEM-COMPONENTS.md](../../../../docs/architecture/DESIGN-SYSTEM-COMPONENTS.md).
  Applications must reuse these; never create competing versions.

**Not implemented (deferred until a real consumer needs them):** Surface/
Popover, MenuItem, Input, Divider, extra Button variants. The design system
is part of the UI foundation freeze — see
[docs/architecture/UI-MIGRATION-FINAL.md](../../../../docs/architecture/UI-MIGRATION-FINAL.md).

## Permanent rule: no inline CSS

`style={{ ... }}` / `style="..."` is prohibited everywhere in `apps/web`,
enforced by ESLint (`no-restricted-syntax` in `eslint.config.mjs`). All
styling goes through this design system's tokens and classes.
