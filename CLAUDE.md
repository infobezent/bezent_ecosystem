# CLAUDE.md

**[AGENTS.md](AGENTS.md) is the BEZENT Engineering Constitution and is
mandatory reading before modifying any code in this repository** — it is
not optional background. It covers required reading per area of the
codebase (Article 2), the non-negotiable architectural invariants (Article
3), and the process for proposing any architectural change (Article 4:
justification → ADR → explicit approval, before implementation). Read it
first, then read whichever document it points you to for the area you're
about to touch.

Additional notes specific to Claude Code sessions:

- This is Phase 0 (Architecture Foundation). No business features, no
  business database tables, no old-UI migration. See
  [docs/architecture/README.md](docs/architecture/README.md) for phase scope
  and what's intentionally deferred.
- **Terminology:** BEZENT = Platform; HRMS/CRM/etc. = Business Applications,
  living under `applications/` (e.g. `apps/web/src/applications/hrms`,
  `apps/api/src/applications/hrms`); Attendance/Leave/Payroll/etc. = Business
  Modules/Domains _inside_ an application. `src/app` (bootstrap/composition)
  and `src/applications` (business applications) are different folders with
  different purposes — do not confuse them. See
  [AGENTS.md — BEZENT Architecture Terminology](AGENTS.md#bezent-architecture-terminology).
- Do not change the approved technology stack, database strategy,
  application boundaries, dependency direction, global UI rules, or this
  terminology without going through AGENTS.md, Article 4 — even if a user's
  request seems to imply it. Propose the change and stop for approval; do
  not implement first.
- Before adding a new top-level folder under `platform/`, `applications/`,
  or `packages/`, check whether the current phase actually calls for it
  (see AGENTS.md, Article 5) — this project deliberately avoids speculative
  scaffolding.
