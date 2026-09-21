# Frontend Architecture

`apps/web` — React + TypeScript + Vite.

## Folder responsibilities

```
apps/web/src/
├── app/            application bootstrap/composition: router, providers, config
├── platform/       reusable platform capabilities (auth, tenant/user context,
│                   access control, notifications, approvals, global search, ...)
├── applications/
│   └── hrms/       the HRMS business application
├── layouts/        global app shell / navigation layout primitives
├── design-system/  the single global BEZENT design system
│   ├── components/
│   ├── icons/
│   ├── tokens/
│   └── styles/
├── shared/         business-agnostic hooks/utils/types/constants
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
├── assets/         static assets
├── App.tsx         thin composition root
└── main.tsx        entrypoint
```

`app/` and `applications/` are unrelated concepts despite the similar
name — see
[AGENTS.md — `app/` vs. `applications/`](../../AGENTS.md#bezent-architecture-terminology)
if this is ever ambiguous.

`app/` composes the application at the infrastructure level — it
bootstraps React, wires the router (`app/router`), wires cross-cutting
providers (`app/providers`), and reads frontend configuration
(`app/config`). `App.tsx` stays thin: it renders providers and the router,
nothing else. Business logic never lives in `app/`.

`platform/` holds frontend capabilities every business application needs:
authentication state, tenant/company context, current-user context,
access-control gating, notifications, approvals, tasks, calendar, notes,
global search, documents, audit-related UI. In Phase 0 this is a single
documented boundary with no implementation — see its README for what's
deferred and why (per-capability subfolders are created only once a real
business application needs them, not speculatively).

`applications/` holds BEZENT's business applications. `applications/hrms`
is the only one that exists. Employee Self-Service is **not** a separate
application — each HRMS business module/domain (attendance, leave, etc.)
will expose both an administrative and a self-service experience against
the same data. See
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md).

`design-system/` is the single global BEZENT design system — every
business application consumes it, none defines competing styling. See
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for ownership and
[UI-RULES.md](UI-RULES.md) for the permanent no-inline-CSS rule and other
UI-wide rules.

`shared/` and `layouts/` stay business-agnostic / generic.

## Dependency rules

See [DEPENDENCY-RULES.md](DEPENDENCY-RULES.md) for the canonical frontend
dependency graph, and
[APPLICATION-BOUNDARIES.md](APPLICATION-BOUNDARIES.md) for the rationale
behind it.
