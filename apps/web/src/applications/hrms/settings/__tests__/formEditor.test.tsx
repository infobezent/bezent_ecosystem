import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createNewCustomField,
  generateCustomFieldKey,
  getGroupsForSection,
  TOOLBOX_ITEMS,
} from '../forms/types';
import { FieldToolbox } from '../forms/FieldToolbox';
import { FormCanvas } from '../forms/FormCanvas';
import { FieldProperties } from '../forms/FieldProperties';
import {
  saveFormDefinition,
  type ResolvedFormField,
  type ResolvedFormSection,
} from '../api/formsApi';
import { toRegistrationConfiguration } from '../api/registrationSettingsApi';

const mockSystemField: ResolvedFormField = {
  key: 'general.employeeId',
  type: 'text',
  label: 'Employee ID',
  description: 'Unique company identifier',
  origin: 'system',
  protected: true,
  protectedReason: 'Required by the employee record.',
  configurable: true,
  enabled: true,
  required: true,
  order: 1,
  width: 'half',
  config: {},
  defaults: { label: 'Employee ID', enabled: true, required: true, width: 'half' },
  overridden: false,
};

const mockCustomField: ResolvedFormField = {
  key: 'custom.0123456789abcdef0123456789abcdef',
  type: 'dropdown',
  label: 'Custom Division',
  description: 'Optional department division',
  origin: 'custom',
  protected: false,
  protectedReason: null,
  configurable: true,
  enabled: true,
  required: false,
  order: 2,
  width: 'full',
  config: {
    options: [
      { value: 'div_a', label: 'Division A' },
      { value: 'div_b', label: 'Division B' },
    ],
  },
  defaults: null,
  overridden: false,
};

const mockSections: ResolvedFormSection[] = [
  {
    key: 'general',
    label: 'General',
    order: 1,
    origin: 'system',
    configurable: true,
    fields: [mockSystemField, mockCustomField],
  },
  {
    key: 'personal',
    label: 'Personal Information',
    order: 2,
    origin: 'system',
    configurable: true,
    fields: [
      {
        key: 'personal.firstName',
        type: 'text',
        label: 'First Name',
        description: null,
        origin: 'system',
        protected: true,
        protectedReason: 'Required by the employee record.',
        configurable: true,
        enabled: true,
        required: true,
        order: 1,
        width: 'half',
        config: {},
        defaults: null,
        overridden: false,
      },
    ],
  },
  {
    key: 'onboarding',
    label: 'Administration',
    order: 3,
    origin: 'system',
    configurable: false,
    fields: [],
  },
];

describe('Form Editor → Toolbox & Custom Field Factory', () => {
  it('toolbox contains exactly 14 field types', () => {
    expect(TOOLBOX_ITEMS).toHaveLength(14);
    const types = TOOLBOX_ITEMS.map((item) => item.type);
    expect(types).toContain('single_line');
    expect(types).toContain('multi_line');
    expect(types).toContain('email');
    expect(types).toContain('phone');
    expect(types).toContain('number');
    expect(types).toContain('decimal');
    expect(types).toContain('dropdown');
    expect(types).toContain('radio');
    expect(types).toContain('checkbox');
    expect(types).toContain('multi_select');
    expect(types).toContain('date');
    expect(types).toContain('time');
    expect(types).toContain('datetime');
    expect(types).toContain('file_upload');
  });

  it('generateCustomFieldKey creates valid custom.<32-hex> keys', () => {
    const key = generateCustomFieldKey();
    expect(key).toMatch(/^custom\.[a-f0-9]{32}$/);
    const key2 = generateCustomFieldKey();
    expect(key).not.toEqual(key2);
  });

  it('createNewCustomField sets correct defaults and initial configuration', () => {
    const field = createNewCustomField('dropdown', 'My Dropdown', 3);
    expect(field.key).toMatch(/^custom\.[a-f0-9]{32}$/);
    expect(field.type).toBe('dropdown');
    expect(field.label).toBe('My Dropdown');
    expect(field.origin).toBe('custom');
    expect(field.protected).toBe(false);
    expect(field.enabled).toBe(true);
    expect(field.required).toBe(false);
    expect(field.width).toBe('half');
    expect(field.defaults).toBeNull();
    expect(field.config.options).toHaveLength(2);
  });

  it('FieldToolbox renders all items', () => {
    const html = renderToStaticMarkup(
      <FieldToolbox onAddField={vi.fn()} activeSectionLabel="General" isConfigurable={true} />,
    );
    expect(html).toContain('Add Field');
    expect(html).toContain('Search fields...');
    expect(html).toContain('Single Line');
    expect(html).toContain('Dropdown');
    expect(html).toContain('File Upload');
    expect(html).toContain('Click or drag a field to add to');
    expect(html).toContain('General');
  });
});

describe('Form Editor → Section Grouping & Canvas', () => {
  it('groups fields correctly matching canonical registration chapters', () => {
    const generalGroups = getGroupsForSection('general', [mockSystemField, mockCustomField]);
    expect(generalGroups.length).toBeGreaterThanOrEqual(2);
    // General Info has employeeId
    const infoGroup = generalGroups.find((g) => g.key === 'general_info');
    expect(infoGroup).toBeDefined();
    expect(infoGroup?.fields.some((f) => f.key === 'general.employeeId')).toBe(true);
    // Additional Info group has custom field
    const additionalGroup = generalGroups.find((g) => g.key === 'additional_info');
    expect(additionalGroup).toBeDefined();
    expect(additionalGroup?.fields.some((f) => f.key === mockCustomField.key)).toBe(true);
  });

  it('renders realistic form canvas with chapter switcher and editorial header', () => {
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={mockSections}
        activeSectionKey="general"
        selectedFieldKey={mockSystemField.key}
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onMoveField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    // Section selector & Clean Chapter Header
    expect(html).toContain('Section');
    expect(html).toContain('General Information');
    expect(html).toContain('Personal Information');
    expect(html).toContain('GENERAL INFORMATION');
    expect(html).toContain('Core identity');

    // Real Form Representation
    expect(html).toContain('GENERAL INFORMATION');
    expect(html).toContain('Employee ID');
    expect(html).toContain('EMP2026001');
    expect(html).toContain('Auto'); // Real auto button preview!

    // Selection highlight & contextual controls on selected field
    expect(html).toContain('bezent-form-field--selected');
    expect(html).toContain('Drag handle');

    // Custom field rendered in Additional Information
    expect(html).toContain('ADDITIONAL INFORMATION');
    expect(html).toContain('Custom Division');
    expect(html).toContain('bezent-form-field--span-full'); // Full width applied
  });

  it('switches canvas chapter when activeSectionKey changes to personal', () => {
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={mockSections}
        activeSectionKey="personal"
        selectedFieldKey="personal.firstName"
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onMoveField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('PERSONAL INFORMATION');
    expect(html).toContain('Legal identity');
    expect(html).toContain('First Name');
  });

  it('renders standard platform chapter notice for non-configurable sections', () => {
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={mockSections}
        activeSectionKey="onboarding"
        selectedFieldKey={null}
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onMoveField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('ADMINISTRATION &amp; WORKFLOW');
    expect(html).toContain('Standard Platform Chapter');
  });
});

describe('Form Editor → Properties Inspector (Form Properties vs Field Properties)', () => {
  it('renders Form Properties when no field is selected', () => {
    const html = renderToStaticMarkup(
      <FieldProperties
        field={null}
        form={{
          name: 'Employee Registration',
          key: 'employee-registration',
          version: 2,
          kind: 'system',
        }}
        activeSection={mockSections[0]}
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );
    expect(html).toContain('Form Properties');
    expect(html).toContain('Employee Registration');
    expect(html).toContain('employee-registration');
    expect(html).toContain('v2');
    expect(html).toContain('General');
    expect(html).toContain('Form Name');
    expect(html).toContain('VALIDATION &amp; IDENTIFIERS');
  });

  it('locks protected system fields from being disabled or made optional', () => {
    const html = renderToStaticMarkup(
      <FieldProperties
        field={mockSystemField}
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
        onDeselectField={vi.fn()}
      />,
    );
    expect(html).toContain('Field Properties');
    expect(html).toContain('Protected System Field');
    expect(html).toContain('Required by the employee record.');
    // Delete button must NOT be present for system fields
    expect(html).not.toContain('Delete Field');
    // Key displayed
    expect(html).toContain('general.employeeId');
  });

  it('allows editing properties and shows Delete Field for custom fields', () => {
    const html = renderToStaticMarkup(
      <FieldProperties
        field={mockCustomField}
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
        onDeselectField={vi.fn()}
      />,
    );
    expect(html).toContain('Field Properties');
    expect(html).toContain('Custom Division');
    expect(html).toContain('Delete Field');
    expect(html).toContain('Division A');
    expect(html).toContain('Division B');
  });
});

describe('Form Editor → API Persistence & Optimistic Concurrency', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('saveFormDefinition sends version and sections payload with PUT', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          form: {
            key: 'employee-registration',
            name: 'Employee Registration',
            description: '',
            kind: 'system',
            status: 'active',
            version: 1,
          },
          sections: mockSections,
        },
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await saveFormDefinition('employee-registration', {
      version: 0,
      sections: [
        {
          key: 'general',
          fields: [
            {
              key: mockSystemField.key,
              origin: mockSystemField.origin,
              label: mockSystemField.label,
              description: mockSystemField.description,
              enabled: mockSystemField.enabled,
              required: mockSystemField.required,
              width: mockSystemField.width,
            },
          ],
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/hrms/settings/forms/employee-registration');
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body as string);
    expect(body.version).toBe(0);
    expect(body.sections).toHaveLength(1);
    expect(result.form.version).toBe(1);
  });
});

describe('Form Editor → Operation-Side Runtime Integration', () => {
  it('toRegistrationConfiguration passes width, description, order, and custom fields to runtime', () => {
    const resolvedForm = {
      form: {
        key: 'employee-registration',
        name: 'Employee Registration',
        description: '',
        kind: 'system' as const,
        status: 'active' as const,
        version: 1,
      },
      sections: [
        {
          key: 'general',
          label: 'General',
          order: 1,
          origin: 'system' as const,
          configurable: true,
          fields: [
            {
              ...mockSystemField,
              width: 'half' as const,
              description: 'Help guidance for employee ID',
            },
            {
              ...mockCustomField,
              width: 'full' as const,
            },
          ],
        },
      ],
    };

    const config = toRegistrationConfiguration(resolvedForm);
    expect(config.fields).toHaveLength(2);

    const empId = config.fields.find((f) => f.key === 'general.employeeId');
    expect(empId).toBeDefined();
    expect(empId?.width).toBe('half');
    expect(empId?.description).toBe('Help guidance for employee ID');
    expect(empId?.required).toBe(true);

    const customDiv = config.fields.find((f) => f.key === mockCustomField.key);
    expect(customDiv).toBeDefined();
    expect(customDiv?.origin).toBe('custom');
    expect(customDiv?.width).toBe('full');
  });
});
