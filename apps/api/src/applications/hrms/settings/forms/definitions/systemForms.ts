import { EMPLOYEE_REGISTRATION_FORM } from './employeeRegistration.form.js';
import type {
  SystemFieldDefinition,
  SystemFormDefinition,
  SystemSectionDefinition,
} from '../types/form.types.js';

/** Registry of BEZENT system forms, by stable form key. */
const SYSTEM_FORMS: ReadonlyMap<string, SystemFormDefinition> = new Map(
  [EMPLOYEE_REGISTRATION_FORM].map((form) => [form.key, form]),
);

export function getSystemForm(formKey: string): SystemFormDefinition | undefined {
  return SYSTEM_FORMS.get(formKey);
}

export interface LocatedSystemField {
  section: SystemSectionDefinition;
  field: SystemFieldDefinition;
}

/** Index of a form's fields by key (with their section). */
export function indexSystemFields(form: SystemFormDefinition): Map<string, LocatedSystemField> {
  return new Map(
    form.sections.flatMap((section) =>
      section.fields.map((field) => [field.key, { section, field }] as const),
    ),
  );
}
