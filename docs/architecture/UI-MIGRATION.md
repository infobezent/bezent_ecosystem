# Old UI Migration Strategy (Phase 0B — future)

There is a separate, already-approved BEZENT UI project. It is the visual
source of truth for the real BEZENT design system and application shell.
**It is not migrated, redesigned, or recreated in Phase 0.** Phase 0's
frontend placeholder (`DevPlaceholderPage`, `design-system/styles/
placeholder.css`) exists only to prove the React app builds and renders —
it carries no BEZENT design decisions and is discarded once real migration
begins.

## Migration process (Phase 0B)

```
OLD APPROVED BEZENT UI
        ↓
     INVENTORY
        ↓
     CLASSIFY
        ↓
      CLEAN
        ↓
     MIGRATE
        ↓
NEW BEZENT DESIGN SYSTEM / PLATFORM / HRMS
```

Every old component is evaluated individually — nothing is copied
wholesale, and the old `App.tsx` / old source folders are never copied
directly into this repository.

## Classification rules

| Old UI content                        | Destination in this repo |
| ------------------------------------- | ------------------------ |
| Design primitive (button, input, ...) | `design-system/`         |
| Global layout / navigation            | `layouts/`               |
| Global reusable capability            | `platform/`              |
| HR business functionality             | `applications/hrms/`     |
| Generic utility                       | `shared/`                |
| Static asset                          | `assets/`                |

## Scope of extraction

From the old UI, Phase 0B extracts: colors, typography, spacing, radius,
shadows, icons, and UI primitives (buttons, cards, badges, tooltips,
navigation patterns, drawers, and other approved primitives) into
`design-system/tokens`, `design-system/components`, and
`design-system/icons`.

## Preconditions

Phase 0B starts only after Phase 0 (this foundation) is complete and
explicitly approved to proceed — it is not triggered automatically by
finishing Phase 0.
