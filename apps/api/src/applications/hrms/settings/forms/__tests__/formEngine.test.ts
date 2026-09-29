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

  it('resolves section titles, descriptions, and fieldSubgroups from metadata', () => {
    const metadata = {
      sections: {
        general: {
          title: 'Custom General Info',
          description: 'Custom general description',
        },
      },
      subgroups: {
        employment_details: {
          title: 'Role & Employment Details',
          description: 'Details about the position',
        },
      },
      fieldSubgroups: {
        'general.designation': 'employment_details',
      },
    };

    const resolved = resolveForm(FORM, {
      version: 1,
      overrides: [],
      customFields: [],
      metadata,
    });
    const generalSection = resolved.sections.find((s) => s.key === 'general');
    expect(generalSection).toBeDefined();
    expect(generalSection?.label).toBe('Custom General Info');
    expect(generalSection?.description).toBe('Custom general description');
    expect(resolved.form.metadata).toEqual(metadata);

    const designationField = generalSection?.fields.find((f) => f.key === 'general.designation');
    expect(designationField?.config.groupKey).toBe('employment_details');
  });

  it('resolves custom sections, section visibility, and section ordering from metadata', () => {
    const metadata = {
      sections: {
        general: {
          title: 'Workforce Details',
          visible: false, // Attempt to hide mandatory section
        },
        skills: {
          visible: false, // Optional section hidden
        },
      },
      customSections: [
        {
          key: 'custom_sec_equipment',
          title: 'Equipment & Hardware',
          description: 'Company-issued laptops and peripherals',
          visible: true,
          order: 1,
        },
      ],
      sectionOrder: ['custom_sec_equipment', 'general', 'personal'],
    };

    const resolved = resolveForm(FORM, {
      version: 1,
      overrides: [],
      customFields: [
        {
          key: 'custom.0123456789abcdef0123456789abcdef',
          sectionKey: 'custom_sec_equipment',
          type: 'single_line',
          label: 'Laptop Serial Number',
          description: 'Asset tag or serial',
          enabled: true,
          required: true,
          width: 'full',
          sortOrder: 1,
          config: {},
        },
      ],
      metadata,
    });

    // 1. Mandatory section protection: general cannot be hidden and is protected
    const generalSection = resolved.sections.find((s) => s.key === 'general');
    expect(generalSection?.protected).toBe(true);
    expect(generalSection?.visible).toBe(true);
    expect(generalSection?.label).toBe('Workforce Details');

    // 2. Optional section visibility: skills is hidden and not protected
    const skillsSection = resolved.sections.find((s) => s.key === 'skills');
    expect(skillsSection?.protected).toBe(false);
    expect(skillsSection?.visible).toBe(false);

    // 3. Custom section resolution
    const customSection = resolved.sections.find((s) => s.key === 'custom_sec_equipment');
    expect(customSection).toBeDefined();
    expect(customSection?.origin).toBe('custom');
    expect(customSection?.configurable).toBe(true);
    expect(customSection?.visible).toBe(true);
    expect(customSection?.protected).toBe(false);
    expect(customSection?.label).toBe('Equipment & Hardware');
    expect(customSection?.fields).toHaveLength(1);
    expect(customSection?.fields[0]?.label).toBe('Laptop Serial Number');

    // 4. Section ordering: custom_sec_equipment is order 1, general is order 2, personal is order 3
    expect(resolved.sections[0]?.key).toBe('custom_sec_equipment');
    expect(resolved.sections[0]?.order).toBe(1);
    expect(resolved.sections[1]?.key).toBe('general');
    expect(resolved.sections[1]?.order).toBe(2);
    expect(resolved.sections[2]?.key).toBe('personal');
    expect(resolved.sections[2]?.order).toBe(3);
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
