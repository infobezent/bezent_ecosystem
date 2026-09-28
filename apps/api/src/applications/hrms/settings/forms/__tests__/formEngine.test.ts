import { describe, it, expect } from 'vitest';
import { EMPLOYEE_REGISTRATION_FORM } from '../definitions/employeeRegistration.form.js';
import { getSystemForm, indexSystemFields } from '../definitions/systemForms.js';
import { resolveForm } from '../service/formResolver.js';
import { validateUpdateFormOverrides } from '../validation/formOverrides.schema.js';
import { ValidationError } from '../../../../../app/errors/AppError.js';
import type {
  FormFieldOverrideValues,
  FormFieldWidth,
  ResolvedForm,
  SystemFormDefinition,
} from '../types/form.types.js';

const FORM = EMPLOYEE_REGISTRATION_FORM;

function fieldOf(resolved: ResolvedForm, key: string) {
  const field = resolved.sections.flatMap((s) => s.fields).find((f) => f.key === key);
  expect(field, key).toBeDefined();
  return field!;
}

function override(
  fieldKey: string,
  enabled: boolean | null,
  required: boolean | null,
  label: string | null = null,
  description: string | null = null,
  width: FormFieldWidth | null = null,
  sortOrder: number | null = null,
): FormFieldOverrideValues {
  return { fieldKey, enabled, required, label, description, width, sortOrder };
}

function errorsOf(input: unknown): Record<string, string> {
  try {
    validateUpdateFormOverrides(FORM, input);
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    return (err as ValidationError).details ?? {};
  }
  throw new Error('Expected ValidationError');
}

describe('Employee Registration system form definition', () => {
  it('is a registered, active SYSTEM form with a stable key', () => {
    expect(FORM).toMatchObject({
      key: 'employee-registration',
      name: 'Employee Registration',
      kind: 'system',
      status: 'active',
    });
    expect(getSystemForm('employee-registration')).toBe(FORM);
    expect(getSystemForm('unknown-form')).toBeUndefined();
  });

  it('keeps the ten Registration sections, in order, with stable keys', () => {
    expect(FORM.sections.map((s) => s.key)).toEqual([
      'general',
      'personal',
      'onboarding',
      'skills',
      'emergency',
      'accounts',
      'online_access',
      'working_hours',
      'documents',
      'review',
    ]);
  });

  it('makes only General and Personal Information configurable', () => {
    expect(FORM.sections.filter((s) => s.configurable).map((s) => s.label)).toEqual([
      'General',
      'Personal Information',
    ]);
    expect(FORM.sections.find((s) => s.key === 'general')!.fields).toHaveLength(17);
    expect(FORM.sections.find((s) => s.key === 'personal')!.fields).toHaveLength(29);
  });

  it('uses unique field keys across the whole form', () => {
    const keys = FORM.sections.flatMap((s) => s.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(indexSystemFields(FORM).size).toBe(keys.length);
  });

  it('protects exactly the fields the employee creation API requires', () => {
    const protectedKeys = FORM.sections.flatMap((s) =>
      s.fields.filter((f) => f.protected).map((f) => f.key),
    );
    expect(protectedKeys).toEqual([
      'general.employeeId',
      'general.joiningDate',
      'personal.firstName',
      'online_access.companyEmail',
    ]);
  });

  it('describes field type and layout', () => {
    const fields = indexSystemFields(FORM);
    expect(fields.get('general.joiningDate')!.field.type).toBe('date');
    expect(fields.get('general.department')!.field.type).toBe('dropdown');
    expect(fields.get('personal.email')!.field.type).toBe('email');
    expect(fields.get('personal.mobilePhone')!.field.type).toBe('phone');
    expect(fields.get('general.reportingManager')!.field).toMatchObject({
      type: 'reference',
      config: { entity: 'employee' },
    });
    expect(fields.get('personal.street')!.field.width).toBe('full');
    expect(fields.get('personal.city')!.field.width).toBe('half');
  });
});

describe('Form resolver', () => {
  it('with no overrides: the system defaults (all enabled, only protected required)', () => {
    const resolved = resolveForm(FORM, []);
    expect(resolved.form).toMatchObject({ key: 'employee-registration', kind: 'system' });
    for (const field of resolved.sections.flatMap((s) => s.fields)) {
      expect(field.enabled).toBe(true);
      expect(field.required).toBe(field.protected);
      expect(field.overridden).toBe(false);
      expect(field.origin).toBe('system');
    }
  });

  it('returns sections and fields with 1-based order, width, type and defaults', () => {
    const resolved = resolveForm(FORM, []);
    expect(resolved.sections.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const personal = resolved.sections[1]!;
    expect(personal).toMatchObject({ key: 'personal', order: 2, configurable: true });
    expect(personal.fields[0]).toMatchObject({
      key: 'personal.firstName',
      order: 1,
      type: 'single_line',
      width: 'half',
      protected: true,
      protectedReason: 'Every employee record requires a first name.',
      defaults: { enabled: true, required: true },
    });
  });

  it('applies an enabled override', () => {
    const resolved = resolveForm(FORM, [override('personal.bloodGroup', false, null)]);
    expect(fieldOf(resolved, 'personal.bloodGroup')).toMatchObject({
      enabled: false,
      required: false,
      overridden: true,
    });
  });

  it('applies a required override and inherits the unset enabled default', () => {
    const resolved = resolveForm(FORM, [override('personal.middleName', null, true)]);
    expect(fieldOf(resolved, 'personal.middleName')).toMatchObject({
      enabled: true,
      required: true,
      overridden: true,
    });
    expect(fieldOf(resolved, 'personal.lastName')).toMatchObject({
      enabled: true,
      required: false,
      overridden: false,
    });
  });

  it('never resolves a disabled field as required', () => {
    const resolved = resolveForm(FORM, [override('personal.gender', false, true)]);
    expect(fieldOf(resolved, 'personal.gender')).toMatchObject({ enabled: false, required: false });
  });

  it('keeps protected fields enabled and required whatever is stored', () => {
    const resolved = resolveForm(FORM, [override('personal.firstName', false, false)]);
    expect(fieldOf(resolved, 'personal.firstName')).toMatchObject({
      enabled: true,
      required: true,
    });
  });

  it('ignores overrides in non-configurable sections and for fields no longer defined', () => {
    const resolved = resolveForm(FORM, [
      override('online_access.companyEmail', false, false),
      override('personal.retiredField', false, false),
    ]);
    expect(fieldOf(resolved, 'online_access.companyEmail')).toMatchObject({
      enabled: true,
      required: true,
      overridden: false,
    });
    expect(
      resolved.sections.flatMap((s) => s.fields).some((f) => f.key === 'personal.retiredField'),
    ).toBe(false);
  });

  it('shows a field BEZENT adds later to companies with existing, unrelated overrides', () => {
    // A future system update adds `personal.pronouns` to the definition.
    const updated: SystemFormDefinition = {
      ...FORM,
      sections: FORM.sections.map((section) =>
        section.key === 'personal'
          ? {
              ...section,
              fields: [
                ...section.fields,
                {
                  key: 'personal.pronouns',
                  type: 'single_line',
                  label: 'Pronouns',
                  protected: false,
                  defaultEnabled: true,
                  defaultRequired: false,
                  width: 'half',
                  config: {},
                },
              ],
            }
          : section,
      ),
    };
    const companyOverrides = [
      override('personal.bloodGroup', false, null),
      override('personal.middleName', null, true),
    ];

    const resolved = resolveForm(updated, companyOverrides);
    expect(fieldOf(resolved, 'personal.pronouns')).toMatchObject({
      enabled: true,
      required: false,
      overridden: false,
      order: 30,
    });
    // The company's customisation is untouched by the update.
    expect(fieldOf(resolved, 'personal.bloodGroup')).toMatchObject({ enabled: false });
    expect(fieldOf(resolved, 'personal.middleName')).toMatchObject({ required: true });
  });

  it('lets a later change to a BEZENT default reach companies that did not override it', () => {
    const updated: SystemFormDefinition = {
      ...FORM,
      sections: FORM.sections.map((section) => ({
        ...section,
        fields: section.fields.map((f) =>
          f.key === 'personal.middleName' ? { ...f, defaultEnabled: false } : f,
        ),
      })),
    };
    // Company overrode only `required` of another field; middleName follows the new default.
    const resolved = resolveForm(updated, [override('personal.lastName', null, true)]);
    expect(fieldOf(resolved, 'personal.middleName')).toMatchObject({ enabled: false });
    expect(fieldOf(resolved, 'personal.lastName')).toMatchObject({ required: true });
  });
});

describe('Override validation', () => {
  it('accepts configurable fields', () => {
    expect(
      validateUpdateFormOverrides(FORM, {
        fields: [{ key: 'personal.bloodGroup', enabled: false, required: false }],
      }).fields,
    ).toHaveLength(1);
  });

  it('refuses to disable a protected field or make it optional', () => {
    expect(
      errorsOf({ fields: [{ key: 'personal.firstName', enabled: false, required: false }] })[
        'fields[0]'
      ],
    ).toContain('system-required');
    expect(
      errorsOf({ fields: [{ key: 'general.joiningDate', enabled: true, required: false }] })[
        'fields[0]'
      ],
    ).toContain('system-required');
  });

  it('rejects unknown keys, non-configurable fields, duplicates and required-while-disabled', () => {
    const errors = errorsOf({
      fields: [
        { key: 'personal.shoeSize', enabled: true, required: false },
        { key: 'online_access.companyEmail', enabled: true, required: true },
        { key: 'personal.gender', enabled: false, required: true },
        { key: 'personal.city', enabled: true, required: false },
        { key: 'personal.city', enabled: true, required: true },
      ],
    });
    expect(errors['fields[0].key']).toContain('Unknown');
    expect(errors['fields[1].key']).toContain('not configurable');
    expect(errors['fields[2]']).toContain('cannot be required while disabled');
    expect(errors['fields[4].key']).toContain('Duplicate');
  });

  it('rejects malformed bodies', () => {
    expect(errorsOf({ fields: [] }).fields).toBeDefined();
    expect(
      errorsOf({ fields: [{ key: 'personal.city', enabled: 'yes', required: false }] })[
        'fields[0]'
      ],
    ).toContain('booleans');
  });
});
