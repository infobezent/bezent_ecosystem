# Coding Standards

General engineering standards for all BEZENT code (`apps/web`, `apps/api`).
For UI-specific rules, see
[architecture/UI-RULES.md](architecture/UI-RULES.md). For API-specific
standards, see [api/STANDARDS.md](api/STANDARDS.md). For database rules,
see [database/RULES.md](database/RULES.md).

## Language and typing

- TypeScript everywhere, `strict: true` (see root
  [tsconfig.json](../tsconfig.json)) — no new code disables strict checks.
- Prefer precise, narrow types over `any`. If a type genuinely can't be
  known yet, use `unknown` and narrow it, not `any`.
- No `// @ts-ignore` / `// @ts-expect-error` to silence a real type error —
  fix the type. An `@ts-expect-error` is acceptable only for a documented,
  intentional test of a type failure.

## Linting and formatting

- ESLint (`eslint.config.mjs`) and Prettier (`.prettierrc.json`) are the
  only source of truth for style — don't hand-debate formatting in review,
  run `npm run format` / `npm run lint:fix`.
- `npm run lint`, `npm run format:check`, and `npm run typecheck` must pass
  before code is considered done. CI enforces this (see
  [.github/workflows/ci.yml](../.github/workflows/ci.yml)).

## Comments

- Default to no comments. Code should be legible from naming and structure.
- Add a comment only when the _why_ is non-obvious: a hidden constraint, a
  workaround for a specific bug, an invariant a reader could easily break.
- Never leave commented-out code in a commit.

## Structure and scope

- Don't build abstractions, config options, or flexibility for a
  requirement that doesn't exist yet. Three similar lines beat a premature
  abstraction.
- Don't add error handling, fallbacks, or validation for a scenario that
  cannot happen given the code's actual callers. Validate at real
  boundaries (API input, external calls), not everywhere defensively.
- Follow the folder/application boundaries in
  [architecture/DEPENDENCY-RULES.md](architecture/DEPENDENCY-RULES.md) —
  don't reach across a boundary because it's convenient for one feature.
- Don't pre-create folders or packages ahead of need — see
  [AGENTS.md](../AGENTS.md#article-5--no-speculative-scaffolding).

## Naming

- Files: `PascalCase.tsx` for React components, `camelCase.ts` for
  everything else, matching the exported symbol's name where there is one
  primary export.
- Folders: `kebab-case` (matches this repository's existing structure:
  `design-system`, `applications/hrms`, ...).
- No abbreviations that aren't already standard in the codebase or
  ecosystem (`req`/`res` in Express handlers are fine; inventing new
  abbreviations is not).

## Error handling (backend)

Follow the centralized error strategy in
[architecture/BACKEND.md](architecture/BACKEND.md#error-handling) —
`AppError` subclasses thrown from controllers/services, handled once by
the central Express error handler. No ad-hoc `try/catch` + `res.status(...)`
scattered per route.

## Testing

- New behavior that has meaningful logic (not pure scaffolding/config)
  gets a test. Don't generate dozens of low-value tests to pad coverage —
  match test depth to actual risk.
- Tests live next to the code they test (`__tests__/` alongside the
  module), following the existing pattern in `apps/api`.

## Git hygiene

- Commits should be scoped to one logical change.
- Never commit `.env` or any file containing real secrets — only
  `.env.example` with placeholder values is committed (see
  [security/README.md](security/README.md)).
- Migrations are the only way schema changes happen — see
  [database/RULES.md](database/RULES.md#migrations-only).
