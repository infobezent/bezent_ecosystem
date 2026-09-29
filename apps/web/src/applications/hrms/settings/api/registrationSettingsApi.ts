import {
  fetchResolvedForm,
  saveFormOverrides,
  type FormFieldSettingInput,
  type ResolvedForm,
} from './formsApi';

/**
 * Employee Registration configuration — the Registration view of the Form
 * Engine's resolved `employee-registration` system form. There is one
 * engine (the server resolver); this module only projects its sections/fields
 * into the flat shape the Registration form and its Customize screen use.
 */

export const EMPLOYEE_REGISTRATION_FORM_KEY = 'employee-registration';

export interface RegistrationSectionConfig {
  id: string;
  label: string;
  configurable: boolean;
  visible?: boolean;
  order?: number;
  description?: string | null;
}

export interface RegistrationFieldConfig {
  key: string;
  section: string;
  label: string;
  protected: boolean;
  protectedReason: string | null;
  configurable: boolean;
  enabled: boolean;
  required: boolean;
  defaultEnabled: boolean;
  defaultRequired: boolean;
  overridden: boolean;
  width?: 'half' | 'full';
  description?: string | null;
  order?: number;
  type?: string;
  origin?: 'system' | 'custom';
  config?: Record<string, unknown>;
}

export interface RegistrationConfiguration {
  sections: RegistrationSectionConfig[];
  fields: RegistrationFieldConfig[];
}

export type RegistrationFieldSettingInput = FormFieldSettingInput;

/** Projects a resolved form onto the Registration configuration (form order kept). */
export function toRegistrationConfiguration(form: ResolvedForm): RegistrationConfiguration {
  const meta = form.form?.metadata;
  return {
    sections: form.sections.map((section) => ({
      id: section.key,
      label: meta?.sections?.[section.key]?.title || section.label,
      configurable: section.configurable,
      visible:
        meta?.sections?.[section.key]?.visible !== undefined
          ? meta.sections[section.key]!.visible !== false
          : section.visible !== false,
      order: section.order,
      description:
        meta?.sections?.[section.key]?.description !== undefined
          ? meta.sections[section.key]!.description
          : section.description,
    })),
    fields: form.sections.flatMap((section) =>
      section.fields.map((field) => ({
        key: field.key,
        section: section.key,
        label: field.label,
        protected: field.protected,
        protectedReason: field.protectedReason,
        configurable: field.configurable,
        enabled: field.enabled,
        required: field.required,
        defaultEnabled: field.defaults?.enabled ?? field.enabled,
        defaultRequired: field.defaults?.required ?? field.required,
        overridden: field.overridden,
        width: field.width,
        description: field.description,
        order: field.order,
        type: field.type,
        origin: field.origin,
        config: field.config as Record<string, unknown> | undefined,
      })),
    ),
  };
}

export async function fetchRegistrationConfiguration(): Promise<RegistrationConfiguration> {
  return toRegistrationConfiguration(await fetchResolvedForm(EMPLOYEE_REGISTRATION_FORM_KEY));
}

export async function saveRegistrationConfiguration(
  fields: RegistrationFieldSettingInput[],
): Promise<RegistrationConfiguration> {
  return toRegistrationConfiguration(
    await saveFormOverrides(EMPLOYEE_REGISTRATION_FORM_KEY, fields),
  );
}
