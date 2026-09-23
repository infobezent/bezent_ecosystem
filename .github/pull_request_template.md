## Summary

<!-- What does this PR do? One or two sentences. -->

## Scope & Ownership

<!-- Which area(s) does this touch? Who is the primary code owner? -->
<!-- e.g. apps/api (Dev1) · design-system / layouts (Dev3) · applications/hrms (Dev2) -->

## Key Changes

<!--
List the key files/modules changed and why.
Keep this concise — the git diff is the source of truth.
-->

-

## Governance & Architecture Pre-Merge Checklist

- [ ] **PR Targets `develop`:** (Never target `main` directly for feature work)
- [ ] **One Task = One Branch = One PR:** (Single coherent task scope)
- [ ] **Zero Application CSS:** No `.css` files created under `applications/**` and no application CSS imports
- [ ] **Zero Inline CSS:** No `style={{ ... }}` attributes or inline styling objects
- [ ] **Design System Reused:** Composed existing primitives; did not duplicate generic UI components
- [ ] **Dependency Direction Respected:** No reverse dependencies (`design-system`/`platform` do not import `applications`)
- [ ] **Backend / DB Standards:** Proper layered architecture; no in-memory DB fallbacks; migrations included if schema changed
- [ ] **Tenant / Company Isolation:** Server queries enforce tenant/company scoping
- [ ] **No Secrets or Build Artifacts:** No credentials, `.env` files, or generated `dist/`/`coverage/` files committed

## Validation Results

- [ ] `npm run typecheck` passed
- [ ] `npm run lint` passed
- [ ] `npm run format:check` passed
- [ ] `npm run test` passed
- [ ] `npm run build` passed
- [ ] Required CI check **`verify`** is expected to pass

## UI Changes

<!-- Attach screenshots or videos for any visual change. -->
<!-- Delete or mark Not Applicable if backend/docs only. -->

Not applicable / Screenshots attached:

## API Impact

<!-- Describe any new or changed endpoints, request/response shapes. -->

None

## Database Impact

<!-- Describe any schema changes, new migrations, or data model decisions. -->

None

## Architecture Impact

<!-- Does this introduce a new pattern, dependency direction, or cross-boundary concern? -->
<!-- If yes, confirm it aligns with AGENTS.md and includes an approved ADR if required. -->

None

## Notes & Limitations

<!-- Known gaps, follow-up tasks, or context reviewers should be aware of. -->
