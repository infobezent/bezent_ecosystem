# Form Engine (HR Settings → Forms)

**Status: Phase 2 — resolution, versioning, custom fields, and a unified
editor.** Owner: HRMS settings domain
(`apps/api/src/applications/hrms/settings/forms/`). Two system forms are
registered: `employee-registration` and `candidate-intake`.

## 1. Resolution model

```
BEZENT system definition   (code, ships with each release)
        +
company overrides          (MySQL, form_field_overrides)
        +
company custom fields      (MySQL, form_custom_fields)
        =
resolved form              (GET /api/v1/hrms/settings/forms/:formKey)
```

There is exactly one resolver (`service/formResolver.ts`). The editor UI and
the resolved-form API both consume its output; nothing renders the system
definition or the overrides independently of it.

## 2. System definitions

- Live in code (`definitions/*.form.ts`), registered in
  `definitions/systemForms.ts`. `listSystemForms()` exposes the registry
  (key/name/description) for form-picker UIs via `GET /api/v1/hrms/settings/forms`.
- A form has a stable key (`employee-registration`, `candidate-intake`), name,
  kind (`system`) and status. Sections and fields are ordered arrays; resolved
  `order` is the 1-based position. Fields carry `type`, `label`, optional
  `description`, `protected` (+ reason), default `enabled`/`required`, layout
  `width` (`half` | `full`) and type-specific `config`.
- **Keys are permanent identifiers.** A field key such as `personal.firstName`
  names the field, not its location; it is never renamed or reused.
- `configurable` is decided per section by the system definition, not the
  frontend.
- **Protected** fields (employee ID, joining date, first name, company email)
  are required by the employee record: always enabled and required, enforced
  by validation (400) and again by the resolver whatever is stored. The editor
  must render these honestly — no editable-looking input standing in for data
  the system generates — rather than merely disabling a control.

## 3. Company overrides and custom fields

- Table `form_field_overrides` — one row per (tenant, company, form key, field
  key). Only differences are stored: each property is `NULL` when it equals
  the system default, and a row with nothing left to override is deleted. The
  system form is **never copied** per company.
- Table `form_custom_fields` — company-owned fields, keyed by a generated
  stable key `custom.<32 hex chars>` (pattern `custom\.[a-f0-9]{32}`,
  validated server-side), merged by the resolver with `origin: 'custom'`. Up
  to 100 custom fields per form. Values live separately, keyed by entity and
  field key — never new columns on `employees`.
- `form_customizations` holds the company's draft `version` (optimistic
  concurrency token for `PUT /:formKey`) and a `metadata` JSON blob: section
  visibility/order, custom sections, subgroup titles, the intake/publish
  config, field conditional rules (`fieldRules`), field access-control rules
  (`fieldPermissions`), and field validation overrides (`fieldValidation`).

## 4. How BEZENT updates coexist with customer overrides

| BEZENT change             | Effect on a customised company                                                     |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Adds a field / section    | Appears with its defaults (resolver iterates the definition); overrides untouched. |
| Changes a field's default | Applies unless the company overrode _that property_ (NULL = inherit).              |
| Removes a field           | Disappears; any stale override row is ignored by the resolver.                     |
| Protects a field          | Protection wins over any stored override.                                          |

## 5. Versioning and publishing

- `PUT /:formKey` saves the complete draft (sections, fields, metadata) in one
  transaction, gated by the `version` the caller last read: a mismatch is
  rejected as a concurrency conflict (`CONCURRENCY_CONFLICT`) rather than
  silently overwriting another editor's save.
- `POST /:formKey/publish` snapshots the current resolved form as a new
  immutable version under `metadata.publishedSnapshots`, independent of the
  draft `version` counter. `GET /:formKey/versions` lists those snapshots.

## 6. API

| Method | Path                                             | Purpose                                                     |
| ------ | ------------------------------------------------ | ----------------------------------------------------------- |
| GET    | `/api/v1/hrms/settings/forms`                    | The registry of system forms (key/name/description)         |
| GET    | `/api/v1/hrms/settings/forms/:formKey`           | Resolved form: `{ form, sections: [{ …, fields: [...] }] }` |
| PUT    | `/api/v1/hrms/settings/forms/:formKey`           | Full editor save, optimistic concurrency via `version`      |
| POST   | `/api/v1/hrms/settings/forms/:formKey/publish`   | Snapshot the current draft as a new immutable version       |
| GET    | `/api/v1/hrms/settings/forms/:formKey/versions`  | List published version snapshots                            |
| GET    | `/api/v1/hrms/settings/forms/:formKey/overrides` | Legacy Phase 1: the company's stored field toggles          |
| PUT    | `/api/v1/hrms/settings/forms/:formKey/overrides` | Legacy Phase 1: `{ fields: [{ key, enabled, required }] }`  |

## 7. Frontend editor

A single builder, under `apps/web/src/applications/hrms/settings/forms/`,
serves every system form:

- `FormsListPage.tsx` — lists the real system forms (from `GET
/hrms/settings/forms`) and opens one.
- `FormBuilderPage.tsx` — the editor itself (routed at
  `/hrms/settings/forms/:formKey`), with a Customization / Access Control /
  Preview stepper, backed entirely by the resolved-form API — no hardcoded
  fallback form data, and failures are surfaced rather than papered over.
- `builder/` — the presentational pieces: `BuilderFieldToolbox`,
  `BuilderFormCanvas`, `BuilderPropertiesPanel`, `PublishConfirmationModal`,
  `FormPreviewModal`.

This replaced an earlier, separate "quick toggle" editor
(`settings/administration/forms/`) that duplicated the same feature; only
`administration/forms/types.ts` (chapter/subgroup metadata shared with the
Employee Registration onboarding wizard) remains from it.
