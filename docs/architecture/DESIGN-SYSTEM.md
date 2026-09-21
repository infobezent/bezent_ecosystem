# Design-System Ownership

This is the source of truth for **who owns BEZENT's visual language and how
it may be changed.** For the no-inline-CSS rule and other UI-wide coding
rules, see [UI-RULES.md](UI-RULES.md). For how the old approved BEZENT UI
is migrated in, see [UI-MIGRATION.md](UI-MIGRATION.md).

## One design system, one owner

`apps/web/src/design-system/` is the **single, global** BEZENT design
system:

```
design-system/
├── components/   design primitives (buttons, inputs, cards, badges, ...)
├── icons/        the icon set
├── tokens/       colors, typography, spacing, radius, shadows
└── styles/       global stylesheet plumbing
```

Every business application (`applications/hrms`, and future applications)
**consumes** this design system. No application, module/domain, page, or
feature may define its own competing button, color palette, spacing scale,
or styling approach. There is exactly one design system for all of BEZENT,
not one per business application, and it does not live inside any
application (see [AGENTS.md — BEZENT Architecture
Terminology](../../AGENTS.md#bezent-architecture-terminology)).

## Ownership boundary

`design-system/` is architecturally a leaf: it has no dependency on
`platform/` or `applications/*` (see
[DEPENDENCY-RULES.md](DEPENDENCY-RULES.md#frontend-appswebsrc)). Anyone
building a business application consumes tokens/components from
`design-system/`; nobody builds business-specific styling and nobody adds
business-specific knowledge into `design-system/`.

Adding a genuinely new, reusable primitive (a new component, a new token)
belongs in `design-system/`. Adding a one-off visual treatment for a single
feature does not — if it isn't reusable across BEZENT, it doesn't belong
in the design system, and it shouldn't be invented as inline/local styling
either (see [UI-RULES.md](UI-RULES.md)).

## Current status: tokens, icons and components implemented (frozen)

The design system is implemented: **tokens** ([DESIGN-SYSTEM-TOKENS.md](DESIGN-SYSTEM-TOKENS.md)),
the **icon system** ([ICON-SYSTEM.md](ICON-SYSTEM.md)) and the **component
foundation** ([DESIGN-SYSTEM-COMPONENTS.md](DESIGN-SYSTEM-COMPONENTS.md)).
It is part of the UI foundation freeze declared in
[UI-MIGRATION-FINAL.md](UI-MIGRATION-FINAL.md).

The old placeholder stylesheet has been removed —
`design-system/styles/globals.css` (real tokens + base element styles) is
now what `apps/web/src/main.tsx` imports.

## Changing the design system

Because every business application depends on it, a change to
`design-system/` is platform-wide by definition:

- Adding a new component/token/icon that fills a real, currently-missing
  need is normal implementation work.
- Replacing the design system's foundations (e.g. adopting a different
  styling approach, a different token format, a CSS-in-JS library) is an
  architectural change and requires the ADR + approval process in
  [AGENTS.md, Article 4](../../AGENTS.md#article-4--changing-this-stack).
