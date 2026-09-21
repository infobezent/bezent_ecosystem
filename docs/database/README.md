# Database Documentation

- **[RULES.md](RULES.md)** — the source of truth for concrete database
  conventions (primary keys, `tenant_id`, timestamps, soft delete, status
  fields, indexes, migrations, naming).
- **[../architecture/DATABASE.md](../architecture/DATABASE.md)** — the
  strategy behind those rules: ORM choice, multi-tenancy approach, and the
  User ≠ Employee model.

Detailed relational design (ERDs, exact table/column definitions) is
produced during the dedicated database design phase (post-Phase 0) and
will be documented here once it exists.
