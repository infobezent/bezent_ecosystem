# shared/

Generic, business-agnostic utilities usable by any part of the API
(`app`, `platform`, or any module). Contains no business logic and no
knowledge of HRMS or any other business application.

Empty in Phase 0. Add a file here only when a concrete cross-cutting utility
is needed (e.g. a pagination helper, a date utility) — do not pre-create
subfolders speculatively.
