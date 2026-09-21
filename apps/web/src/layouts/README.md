# layouts/

The global BEZENT application shell. `app-shell/` is implemented (Phase 0B.5):
top nav, left sidebar, main workspace, right rail, bottom bar. See
[docs/architecture/APPSHELL.md](../../../../docs/architecture/APPSHELL.md).

Rules: business applications render inside `AppShell` and never build their
own global shell; `layouts` depends only on `design-system` and `shared`,
never on `applications/*`, `platform/*` or `app/*`; it holds no business
logic and no navigation catalog (callers pass nav data in).

HRMS navigation is never defined here: the shell renders the catalog an
application supplies (see docs/architecture/HRMS-NAVIGATION.md).
