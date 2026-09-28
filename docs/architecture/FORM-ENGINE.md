# Form Engine (HR Settings → Administration → Forms)

**Status: Phase 1 — data/API/resolution foundation.** Owner: HRMS settings
domain (`apps/api/src/applications/hrms/settings/forms/`). Employee Registration
is the first (and currently only) form on the engine.

## 1. Resolution model

```
BEZENT system definition   (code, ships with each release)
        +
company overrides          (MySQL, form_field_overrides)
        +
company custom fields      (Phase 2)
        =
resolved form              (GET /api/v1/hrms/settings/forms/:formKey)
```

There is exactly one resolver (`service/formResolver.ts`). The Registration
form and its Customize screen both consume its output; the web
`registrationSettingsApi.ts` is only a projection of the resolved form into the
flat shape those screens use.

## 2. System definitions

- Live in code (`definitions/*.form.ts`), registered in `definitions/systemForms.ts`.
- A form has a stable key (`employee-registration`), name, kind (`system`) and
  status. Sections and fields are ordered arrays; resolved `order` is the
  1-based position. Fields carry `type`, `label`, optional `description`,
  `protected` (+ reason), default `enabled`/`required`, layout `width`
  (`half` | `full`) and type-specific `config`.
- **Keys are permanent identifiers.** A field key such as `personal.firstName`
  names the field, not its location; it is never renamed or reused.
- `configurable` is decided per section. Current release: General and Personal
  Information only; the other Registration steps are listed but fixed.
- **Protected** fields (employee ID, joining date, first name, company email)
  are required by the employee record: always enabled and required, enforced
  by validation (400) and again by the resolver whatever is stored.

## 3. Company overrides

- Table `form_field_overrides` — one row per (tenant, company, form key, field
  key). Tenant/company scoped on every query.
- Only differences are stored: each property (`is_enabled`, `is_required`) is
  `NULL` when it equals the system default, and a row with nothing left to
  override is deleted. The system form is **never copied** per company.

## 4. How BEZENT updates coexist with customer overrides

| BEZENT change                  | Effect on a customised company                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Adds a field / section         | Appears with its defaults (resolver iterates the definition); overrides untouched. |
| Changes a field's default      | Applies unless the company overrode _that property_ (NULL = inherit).              |
| Relabels / retypes / re-widths | Applies to everyone (overrides do not store these yet).                            |
| Removes a field                | Disappears; any stale override row is ignored by the resolver.                     |
| Protects a field               | Protection wins over any stored override.                                          |

No definition version or publishing history is stored: overrides bind to keys,
not to a definition revision, so none is needed yet. Introduce a revision only
with a concrete use (e.g. optimistic concurrency in the Phase 2 editor, or
published versions of custom forms).

## 5. API

| Method | Path                                             | Purpose                                                     |
| ------ | ------------------------------------------------ | ----------------------------------------------------------- |
| GET    | `/api/v1/hrms/settings/forms/:formKey`           | Resolved form: `{ form, sections: [{ …, fields: [...] }] }` |
| GET    | `/api/v1/hrms/settings/forms/:formKey/overrides` | The company's stored overrides (`null` = inherited)         |
| PUT    | `/api/v1/hrms/settings/forms/:formKey/overrides` | `{ fields: [{ key, enabled, required }] }` → resolved form  |

PUT sets the listed fields and leaves others untouched; one invalid entry
rejects the whole request. Phase 2 extends the same payload additively
(per-field `order`/`width`, section ordering, `customFields`) without replacing
the endpoints.

## 6. Custom fields (Phase 2 boundary — not implemented)

- **Definitions:** company-owned rows (e.g. `form_custom_fields`: tenant,
  company, form key, section key, generated stable key such as
  `custom.<id>`, type, label, config, order, width, enabled, required),
  merged by the same resolver with `origin: 'custom'`.
- **Values:** never new columns on `employees`. Stored separately, keyed by
  entity and field key (e.g. `form_field_values`: tenant, company, entity
  type, entity id, field key, value), written by the owning domain.
- Custom forms (kind `custom`) get their own company-owned definition tables;
  overrides apply only to system forms.
