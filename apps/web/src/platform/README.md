# platform/

Frontend capabilities reusable across every BEZENT application (HRMS, and
later CRM, Projects, Finance, Inventory, Support) — authentication state,
tenant/company context, current-user context, access-control gating,
notifications, approvals, tasks, calendar, notes, global search, documents,
audit-related UI.

Implemented (frozen UI foundation): `search/` ([GLOBAL-SEARCH.md](../../../../docs/architecture/GLOBAL-SEARCH.md)),
`utility-drawer/`, `notifications/`, `approvals/`, `tasks/`, `calendar/`, `notes/`
([GLOBAL-UTILITIES.md](../../../../docs/architecture/GLOBAL-UTILITIES.md)). These are UI
capabilities fed by props/providers; identity, tenant, access-control and real data
sources do not exist yet. Not pre-split into per-capability folders — a capability
gets its own folder only when a real application needs it (see
[docs/architecture/APPLICATION-BOUNDARIES.md](../../../../docs/architecture/APPLICATION-BOUNDARIES.md)).

`applications/*` may depend on `platform`. `platform` must never depend on
`applications/*`.
