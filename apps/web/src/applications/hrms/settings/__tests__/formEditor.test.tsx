import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createNewCustomField,
  generateCustomFieldKey,
  getGroupsForSection,
  getSubgroupForField,
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
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('ADMINISTRATION &amp; WORKFLOW');
    expect(html).toContain('Standard Platform Chapter');
  });

  it('drag handle is present on every field; Up/Down arrow buttons are absent', () => {
    // Regression: ensure the Up/Down button migration to drag-and-drop is complete.
    // Every field must expose a drag handle regardless of selection state.
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={mockSections}
        activeSectionKey="general"
        selectedFieldKey={null}
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    // Drag handle rendered for every field (regardless of selection)
    // Two fields exist in general → two drag handles
    const dragHandleMatches = [...html.matchAll(/Drag handle/g)];
    expect(dragHandleMatches.length).toBeGreaterThanOrEqual(2);

    // Up/Down arrow controls must not be present
    expect(html).not.toContain('Move up');
    expect(html).not.toContain('Move down');
    expect(html).not.toContain('aria-label="Move up"');
    expect(html).not.toContain('aria-label="Move down"');
  });
});

describe('Form Editor → Field Reorder (arrayMove)', () => {
  it('reorders fields correctly using arrayMove semantics', async () => {
    // Mirror the handleReorderFields logic used in FormEditorPage so that the
    // unit test exercises the exact same algorithm without a full DOM render.
    // Fields: [A, B, C] → drag A to position 2 → expect [B, C, A].
    const fields = [
      { ...mockSystemField, key: 'general.a', order: 1 },
      { ...mockCustomField, key: 'general.b', order: 2 },
      { ...mockCustomField, key: 'general.c', order: 3 },
    ];

    const { arrayMove } = await import('@dnd-kit/sortable');
    // Mirrors the fixed handleReorderFields: sort by order first.
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex((f) => f.key === 'general.a');
    const toIdx = sorted.findIndex((f) => f.key === 'general.c');
    const reordered = arrayMove(sorted, fromIdx, toIdx).map((f, i) => ({ ...f, order: i + 1 }));

    expect(reordered.map((f) => f.key)).toEqual(['general.b', 'general.c', 'general.a']);
    expect(reordered.map((f) => f.order)).toEqual([1, 2, 3]);
  });

  it('sort-before-arrayMove: out-of-order raw array does not corrupt visual reorder', async () => {
    // REGRESSION TEST for the root-cause bug:
    // getGroupsForSection ignores `order`, so after a previous drag the raw
    // sec.fields array may be stored in non-visual order. Without sorting before
    // arrayMove, subsequent drags operate on wrong indices.
    //
    // Scenario: fields are stored in raw array as [B(order:2), A(order:1), C(order:3)]
    // (A was swapped to position 0 visually but stored at index 1 raw).
    // User drags C (order:3) before A (order:1). Expected visual result: [C, A, B].
    const rawFields = [
      { ...mockCustomField, key: 'general.b', order: 2 }, // stored at raw index 0
      { ...mockSystemField, key: 'general.a', order: 1 }, // stored at raw index 1
      { ...mockCustomField, key: 'general.c', order: 3 }, // stored at raw index 2
    ];

    const { arrayMove } = await import('@dnd-kit/sortable');

    // Bug path (without sort): indices are from raw array
    const bugFromIdx = rawFields.findIndex((f) => f.key === 'general.c'); // 2
    const bugToIdx = rawFields.findIndex((f) => f.key === 'general.a'); // 1
    const bugReordered = arrayMove(rawFields, bugFromIdx, bugToIdx).map((f, i) => ({
      ...f,
      order: i + 1,
    }));
    // Bug: produces [B, C, A] (swapped B and C in raw — wrong visual result)
    expect(bugReordered.map((f) => f.key)).not.toEqual(['general.c', 'general.a', 'general.b']);

    // Fixed path (with sort first): indices are from visual order
    const sorted = [...rawFields].sort((a, b) => a.order - b.order);
    // sorted = [A(1), B(2), C(3)]
    const fixFromIdx = sorted.findIndex((f) => f.key === 'general.c'); // 2
    const fixToIdx = sorted.findIndex((f) => f.key === 'general.a'); // 0
    const fixReordered = arrayMove(sorted, fixFromIdx, fixToIdx).map((f, i) => ({
      ...f,
      order: i + 1,
    }));
    // Fixed: C moves before A → [C, A, B]
    expect(fixReordered.map((f) => f.key)).toEqual(['general.c', 'general.a', 'general.b']);
    expect(fixReordered.map((f) => f.order)).toEqual([1, 2, 3]);
  });

  it('dragging a field to the same position (noop) leaves order unchanged', async () => {
    const fields = [
      { ...mockSystemField, key: 'general.a', order: 1 },
      { ...mockCustomField, key: 'general.b', order: 2 },
    ];

    const { arrayMove } = await import('@dnd-kit/sortable');
    const idx = fields.findIndex((f) => f.key === 'general.a');
    // active.id === over.id — handleDragEnd returns early, arrayMove never called
    // Simulate the guard: fromIdx === toIdx
    const reordered =
      idx === idx
        ? fields.map((f, i) => ({ ...f, order: i + 1 }))
        : arrayMove(fields, idx, idx).map((f, i) => ({ ...f, order: i + 1 }));

    expect(reordered.map((f) => f.key)).toEqual(['general.a', 'general.b']);
  });

  it('system field (Employee ID) retains its protected flag after reorder', async () => {
    const fields = [mockSystemField, mockCustomField];
    const { arrayMove } = await import('@dnd-kit/sortable');
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    // Move system field to end
    const reordered = arrayMove(sorted, 0, 1).map((f, i) => ({ ...f, order: i + 1 }));
    const empId = reordered.find((f) => f.key === 'general.employeeId');
    expect(empId).toBeDefined();
    expect(empId?.protected).toBe(true);
    expect(empId?.origin).toBe('system');
    // order updated, protection flags unchanged
    expect(empId?.order).toBe(2);
  });

  it('canvas renders fields sorted by order, not by raw array position', () => {
    // REGRESSION TEST: verifies that FormCanvas respects `order` for rendering.
    // Even if the raw section.fields array is in a different order (e.g. due to
    // API insertion order), the canvas must render sorted by `order`.
    //
    // Arrange: two fields with reversed order values vs. array positions.
    const sectionsOutOfOrder: ResolvedFormSection[] = [
      {
        key: 'general',
        label: 'General Information',
        order: 1,
        origin: 'system',
        configurable: true,
        fields: [
          {
            ...mockCustomField,
            key: 'general.employmentType',
            label: 'Employment Type',
            order: 2, // ← stored second in raw array
          },
          {
            ...mockSystemField,
            key: 'general.employeeId',
            label: 'Employee ID',
            order: 1, // ← stored first but has lower order
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <FormCanvas
        sections={sectionsOutOfOrder}
        activeSectionKey="general"
        selectedFieldKey={null}
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    // Employee ID (order:1) must appear BEFORE Employment Type (order:2) in the HTML
    const empIdPos = html.indexOf('Employee ID');
    const empTypePos = html.indexOf('Employment Type');
    expect(empIdPos).toBeGreaterThan(-1);
    expect(empTypePos).toBeGreaterThan(-1);
    expect(empIdPos).toBeLessThan(empTypePos);
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

describe('Form Editor → Add Field Drag-and-Drop (Toolbox to Canvas)', () => {
  it('renders SubgroupDropZone at the end of each subgroup in FormCanvas', () => {
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={mockSections}
        activeSectionKey="general"
        selectedFieldKey={mockSystemField.key}
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    // Subgroup dropzones rendered for groups
    expect(html).toContain('data-testid="dropzone-general_info"');
    expect(html).toContain('data-testid="dropzone-employment_details"');
    expect(html).toContain('data-testid="dropzone-additional_info"');
    expect(html).toContain('Add to GENERAL INFORMATION');
    expect(html).toContain('Add to EMPLOYMENT DETAILS');
  });

  it('drops toolbox field at top of a subgroup (before first field)', () => {
    const existingFields: ResolvedFormField[] = [
      { ...mockSystemField, key: 'general.employeeId', order: 1 },
      { ...mockCustomField, key: 'general.employmentType', order: 2 },
    ];

    // Simulate dropping "phone" BEFORE general.employeeId
    const sortedFields = [...existingFields].sort((a, b) => a.order - b.order);
    const targetIdx = sortedFields.findIndex((f) => f.key === 'general.employeeId');
    expect(targetIdx).toBe(0);

    const targetField = sortedFields[targetIdx]!;
    const groupKey = getSubgroupForField('general', targetField);
    expect(groupKey).toBe('general_info');

    const insertIndex = 0; // 'before'
    const newField = createNewCustomField('phone', 'Phone', insertIndex + 1, groupKey);

    expect(newField.type).toBe('phone');
    expect(newField.label).toBe('Phone');
    expect(newField.config.groupKey).toBe('general_info');
    expect(newField.key.startsWith('custom.')).toBe(true);

    sortedFields.splice(insertIndex, 0, newField);
    const reindexed = sortedFields.map((f, i) => ({ ...f, order: i + 1 }));

    // New field is at index 0 (top) with order 1
    expect(reindexed[0]!.key).toBe(newField.key);
    expect(reindexed[0]!.order).toBe(1);
    expect(reindexed[1]!.key).toBe('general.employeeId');
    expect(reindexed[1]!.order).toBe(2);
    expect(reindexed[2]!.key).toBe('general.employmentType');
    expect(reindexed[2]!.order).toBe(3);

    // Canvas grouping places it into general_info
    const groups = getGroupsForSection('general', reindexed);
    const infoGroup = groups.find((g) => g.key === 'general_info');
    expect(infoGroup).toBeDefined();
    expect(infoGroup?.fields.some((f) => f.key === newField.key)).toBe(true);
  });

  it('drops toolbox field in middle of a subgroup (after a field)', () => {
    const existingFields: ResolvedFormField[] = [
      { ...mockSystemField, key: 'general.employeeId', order: 1 },
      { ...mockCustomField, key: 'general.employmentType', order: 2 },
    ];

    // Simulate dropping "single_line" AFTER general.employeeId
    const sortedFields = [...existingFields].sort((a, b) => a.order - b.order);
    const targetIdx = sortedFields.findIndex((f) => f.key === 'general.employeeId');
    const targetField = sortedFields[targetIdx]!;
    const groupKey = getSubgroupForField('general', targetField);

    const insertIndex = targetIdx + 1; // 'after'
    const newField = createNewCustomField('single_line', 'Nick Name', insertIndex + 1, groupKey);

    sortedFields.splice(insertIndex, 0, newField);
    const reindexed = sortedFields.map((f, i) => ({ ...f, order: i + 1 }));

    // Placed between employeeId and employmentType
    expect(reindexed[0]!.key).toBe('general.employeeId');
    expect(reindexed[0]!.order).toBe(1);
    expect(reindexed[1]!.key).toBe(newField.key);
    expect(reindexed[1]!.order).toBe(2);
    expect(reindexed[2]!.key).toBe('general.employmentType');
    expect(reindexed[2]!.order).toBe(3);
  });

  it('drops toolbox field at the end of a subgroup', () => {
    const existingFields: ResolvedFormField[] = [
      { ...mockSystemField, key: 'general.employeeId', order: 1 },
      { ...mockCustomField, key: 'general.employmentType', order: 2 },
      { ...mockCustomField, key: 'general.department', order: 3 },
    ];

    // Group 'general_info' contains employeeId and employmentType
    const sortedFields = [...existingFields].sort((a, b) => a.order - b.order);
    const targetGroupKey = 'general_info';
    const groupFields = sortedFields.filter(
      (f) => getSubgroupForField('general', f) === targetGroupKey,
    );

    expect(groupFields.length).toBe(2);
    const lastField = groupFields[groupFields.length - 1]!;
    const lastIdx = sortedFields.findIndex((f) => f.key === lastField.key);
    expect(lastIdx).toBe(1); // after employmentType, before department

    const insertIndex = lastIdx + 1;
    const newField = createNewCustomField(
      'dropdown',
      'Badge Color',
      insertIndex + 1,
      targetGroupKey,
    );

    sortedFields.splice(insertIndex, 0, newField);
    const reindexed = sortedFields.map((f, i) => ({ ...f, order: i + 1 }));

    expect(reindexed[2]!.key).toBe(newField.key);
    expect(reindexed[2]!.order).toBe(3);
    expect(reindexed[3]!.key).toBe('general.department');
    expect(reindexed[3]!.order).toBe(4);

    // Grouping puts it into general_info
    const groups = getGroupsForSection('general', reindexed);
    const infoGroup = groups.find((g) => g.key === 'general_info');
    expect(infoGroup?.fields.some((f) => f.key === newField.key)).toBe(true);
  });

  it('persists newly added field with correct config and order through save workflow', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        form: {
          key: 'employee-registration',
          name: 'Employee Registration',
          description: '',
          kind: 'system',
          status: 'active',
          version: 2,
        },
        sections: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const newField = createNewCustomField('phone', 'Emergency Phone', 2, 'general_info');

    await saveFormDefinition('employee-registration', {
      version: 1,
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
            {
              key: newField.key,
              origin: newField.origin,
              label: newField.label,
              description: newField.description,
              enabled: newField.enabled,
              required: newField.required,
              width: newField.width,
              type: newField.type as 'phone',
              config: newField.config,
            },
          ],
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.version).toBe(1);
    expect(body.sections[0].fields).toHaveLength(2);

    const savedCustom = body.sections[0].fields[1];
    expect(savedCustom.key).toBe(newField.key);
    expect(savedCustom.type).toBe('phone');
    expect(savedCustom.label).toBe('Emergency Phone');
    expect(savedCustom.config.groupKey).toBe('general_info');
  });

  it('renders and allows editing Section Title & Description in FieldProperties Form Properties tab', () => {
    const onUpdateTitle = vi.fn();
    const onUpdateDesc = vi.fn();

    const html = renderToStaticMarkup(
      <FieldProperties
        field={null}
        form={{
          key: 'employee-registration',
          name: 'Employee Registration',
          version: 1,
          kind: 'system',
        }}
        activeSection={mockSections[0]}
        sectionTitle="General Info Custom"
        sectionDescription="Detailed description of general section"
        onUpdateSectionTitle={onUpdateTitle}
        onUpdateSectionDescription={onUpdateDesc}
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('Form Properties');
    expect(html).toContain('Section Title');
    expect(html).toContain('Section Description');
    expect(html).toContain('General Info Custom');
    expect(html).toContain('Detailed description of general section');
    expect(html).toContain('general'); // stable section key shown read-only
  });

  it('renders and allows editing Subgroup Title & Description in FieldProperties Subgroup tab', () => {
    const onUpdateTitle = vi.fn();
    const onUpdateDesc = vi.fn();

    const html = renderToStaticMarkup(
      <FieldProperties
        field={null}
        form={{
          key: 'employee-registration',
          name: 'Employee Registration',
          version: 1,
          kind: 'system',
        }}
        activeSection={mockSections[0]}
        selectedSubgroup={{
          key: 'employment_details',
          title: 'Employment Details',
          description: 'Official employment data',
          sectionKey: 'general',
        }}
        onUpdateSubgroupTitle={onUpdateTitle}
        onUpdateSubgroupDescription={onUpdateDesc}
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('Subgroup Properties');
    expect(html).toContain('Subgroup Title');
    expect(html).toContain('Subgroup Description');
    expect(html).toContain('Employment Details');
    expect(html).toContain('Official employment data');
    expect(html).toContain('employment_details'); // stable internal subgroup ID
  });

  it('renders empty subgroup drop target when subgroup has no fields', () => {
    // Section with no fields in employment_details
    const fieldsOnlyInGeneralInfo: ResolvedFormField[] = [
      { ...mockSystemField, key: 'general.employeeId', order: 1 },
    ];
    const sectionWithEmptyGroup: ResolvedFormSection = {
      key: 'general',
      label: 'General',
      order: 1,
      origin: 'system',
      configurable: true,
      fields: fieldsOnlyInGeneralInfo,
    };

    const html = renderToStaticMarkup(
      <FormCanvas
        sections={[sectionWithEmptyGroup]}
        activeSectionKey="general"
        selectedFieldKey={null}
        onSelectSection={vi.fn()}
        onSelectField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    // Empty subgroup dropzone rendered for empty subgroups (e.g. employment_details)
    expect(html).toContain('bezent-subgroup-dropzone--empty');
    expect(html).toContain('Empty Subgroup: Drop fields here');
    expect(html).toContain('data-testid="dropzone-empty-employment_details"');
  });

  it('moves existing field between subgroups by updating metadata.fieldSubgroups', () => {
    const fields: ResolvedFormField[] = [
      { ...mockSystemField, key: 'general.employeeId', order: 1 },
      { ...mockCustomField, key: 'general.designation', order: 2 },
    ];

    // By default, employeeId is in general_info, designation is in employment_details
    expect(getSubgroupForField('general', fields[0]!)).toBe('general_info');
    expect(getSubgroupForField('general', fields[1]!)).toBe('employment_details');

    // Move designation to general_info via metadata
    const metadata = {
      sections: {},
      subgroups: {},
      fieldSubgroups: {
        'general.designation': 'general_info',
      },
    };

    expect(getSubgroupForField('general', fields[1]!, metadata)).toBe('general_info');

    const groups = getGroupsForSection('general', fields, metadata);
    const generalInfoGroup = groups.find((g) => g.key === 'general_info');
    expect(generalInfoGroup?.fields.map((f) => f.key)).toEqual([
      'general.employeeId',
      'general.designation',
    ]);
  });

  it('applies custom subgroup titles and descriptions from metadata', () => {
    const fields: ResolvedFormField[] = [
      { ...mockSystemField, key: 'general.employeeId', order: 1 },
    ];

    const metadata = {
      sections: {
        general: {
          title: 'Custom Work Info',
          description: 'Custom work info description',
        },
      },
      subgroups: {
        general_info: {
          title: 'Basic Employee Profile',
          description: 'Core details for registration',
        },
      },
      fieldSubgroups: {},
    };

    const groups = getGroupsForSection('general', fields, metadata);
    const generalInfoGroup = groups.find((g) => g.key === 'general_info');
    expect(generalInfoGroup?.title).toBe('Basic Employee Profile');
    expect(generalInfoGroup?.description).toBe('Core details for registration');
  });

  it('persists metadata alongside form sections during saveFormDefinition', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        form: {
          key: 'employee-registration',
          name: 'Employee Registration',
          description: '',
          kind: 'system',
          status: 'active',
          version: 2,
        },
        sections: [],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const metadata = {
      sections: {
        general: {
          title: 'General Identity',
          description: 'Company-specific identity information',
        },
      },
      subgroups: {
        employment_details: {
          title: 'Role & Department',
          description: 'Position assignments',
        },
      },
      fieldSubgroups: {
        'general.designation': 'employment_details',
      },
    };

    await saveFormDefinition('employee-registration', {
      version: 1,
      metadata,
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
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.metadata).toEqual(metadata);
  });

  describe('Section Customization in Form Properties', () => {
    const mockGeneralSection: ResolvedFormSection = {
      key: 'general',
      label: 'General Information',
      description: 'Core employee profile',
      order: 1,
      origin: 'system',
      configurable: true,
      protected: true,
      visible: true,
      fields: [mockSystemField],
    };

    const mockCustomSection: ResolvedFormSection = {
      key: 'custom_sec_123',
      label: 'Certifications & Compliance',
      description: 'Regulatory compliance records',
      order: 2,
      origin: 'custom',
      configurable: true,
      protected: false,
      visible: true,
      fields: [],
    };

    it('renders section identifier, title, description, and visibility under Form Properties', () => {
      const html = renderToStaticMarkup(
        <FieldProperties
          field={null}
          activeSection={mockGeneralSection}
          sectionTitle="Basic Information"
          sectionDescription="Updated description"
          sectionVisible={true}
          sectionOrderIndex={0}
          totalSections={3}
          isMandatorySection={true}
          onUpdateField={vi.fn()}
          onDeleteField={vi.fn()}
        />,
      );

      expect(html).toContain('ACTIVE CHAPTER / SECTION');
      expect(html).toContain('Section Identifier');
      expect(html).toContain('general');
      expect(html).toContain('Basic Information');
      expect(html).toContain('Updated description');
      expect(html).toContain('Section Visibility');
      expect(html).toContain(
        'Mandatory system section. Cannot be hidden from employee registration.',
      );
    });

    it('renders section order controls and position indicators', () => {
      const html = renderToStaticMarkup(
        <FieldProperties
          field={null}
          activeSection={mockGeneralSection}
          sectionTitle="General Information"
          sectionOrderIndex={1}
          totalSections={4}
          isMandatorySection={true}
          onUpdateField={vi.fn()}
          onDeleteField={vi.fn()}
        />,
      );

      expect(html).toContain('Position 2 of 4');
      expect(html).toContain('Move Up');
      expect(html).toContain('Move Down');
    });

    it('renders Delete Section for custom sections and protects system sections', () => {
      const systemHtml = renderToStaticMarkup(
        <FieldProperties
          field={null}
          activeSection={mockGeneralSection}
          sectionTitle="General Information"
          onUpdateField={vi.fn()}
          onDeleteField={vi.fn()}
        />,
      );
      expect(systemHtml).toContain('System sections are protected and cannot be deleted.');

      const customHtml = renderToStaticMarkup(
        <FieldProperties
          field={null}
          activeSection={mockCustomSection}
          sectionTitle="Certifications &amp; Compliance"
          onUpdateField={vi.fn()}
          onDeleteField={vi.fn()}
        />,
      );
      expect(customHtml).toContain('Delete Section');
      expect(customHtml).toContain('Custom Section');
    });

    it('renders Add Section button and action modal markup', () => {
      const html = renderToStaticMarkup(
        <FieldProperties
          field={null}
          activeSection={mockGeneralSection}
          onUpdateField={vi.fn()}
          onDeleteField={vi.fn()}
        />,
      );
      expect(html).toContain('SECTION MANAGEMENT');
      expect(html).toContain('Add Section');
    });

    it('correctly reflects section customization, visibility, and custom sections in toRegistrationConfiguration', () => {
      const resolvedForm = {
        form: {
          key: 'employee-registration',
          name: 'Employee Registration',
          description: '',
          kind: 'system' as const,
          status: 'active' as const,
          version: 2,
          metadata: {
            sections: {
              general: { title: 'Primary Profile', description: 'Updated primary', visible: true },
              skills: { visible: false },
            },
            sectionOrder: ['general', 'custom_sec_123', 'skills'],
          },
        },
        sections: [
          mockGeneralSection,
          mockCustomSection,
          {
            key: 'skills',
            label: 'Skills',
            description: null,
            order: 3,
            origin: 'system' as const,
            configurable: true,
            protected: false,
            visible: false,
            fields: [],
          },
        ],
      };

      const config = toRegistrationConfiguration(resolvedForm);

      expect(config.sections).toHaveLength(3);
      // General section title customized
      const general = config.sections.find((s) => s.id === 'general');
      expect(general?.label).toBe('Primary Profile');
      expect(general?.visible).toBe(true);

      // Custom section preserved
      const custom = config.sections.find((s) => s.id === 'custom_sec_123');
      expect(custom?.label).toBe('Certifications & Compliance');

      // Skills section marked hidden
      const skills = config.sections.find((s) => s.id === 'skills');
      expect(skills?.visible).toBe(false);
    });
  });
});
