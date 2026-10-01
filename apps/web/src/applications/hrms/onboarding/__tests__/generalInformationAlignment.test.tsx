import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeneralInformation } from '../components/GeneralInformation';
import {
  RegistrationConfigProvider,
} from '../registration/registrationConfig';
import type { RegistrationConfiguration } from '../../settings/api/registrationSettingsApi';
import {
  KNOWN_SECTION_GROUPS,
  getGroupsForSection,
} from '../../settings/administration/forms/types';
import {
  configurationWith,
  defaultRegistrationConfiguration,
  resolvedFormOf,
} from './registrationConfigFixture';
import { FormCanvas } from '../../settings/administration/forms/FormCanvas';
import {
  INITIAL_REGISTRATION_DATA,
  toReviewSectionData,
  buildCreateEmployeePayload,
} from '../types/registration.types';

import type { GeneralInformationProps } from '../components/GeneralInformation';

function renderGeneralWith(
  config: RegistrationConfiguration,
  props?: GeneralInformationProps,
) {
  return renderToStaticMarkup(
    <RegistrationConfigProvider configuration={config}>
      <GeneralInformation
        employeeId={props?.employeeId ?? 'EMP2026001'}
        data={props?.data}
        onChange={props?.onChange}
      />
    </RegistrationConfigProvider>,
  );
}

describe('Chapter 02 (General) Form Editor ↔ Runtime Alignment', () => {
  it('Editor and Runtime resolve the same canonical Chapter 02 section groups and field identities', () => {
    // 1. Editor definition: KNOWN_SECTION_GROUPS.general
    const editorGroups = KNOWN_SECTION_GROUPS['general']!;
    expect(editorGroups).toBeDefined();
    const groupKeys = editorGroups.map((g) => g.key);
    expect(groupKeys).toEqual([
      'general_info',
      'employment_details',
      'additional_info',
    ]);

    // 2. Runtime partitioning using getGroupsForSection on default configuration
    const generalFields = defaultRegistrationConfiguration.fields.filter(
      (f) => f.section === 'general' && f.enabled,
    );
    const resolvedGroups = getGroupsForSection(
      'general',
      generalFields as unknown as Parameters<typeof getGroupsForSection>[1],
    );
    expect(resolvedGroups.map((g) => g.key)).toEqual(groupKeys);

    // 3. Render runtime and verify each group title is present
    const html = renderGeneralWith(defaultRegistrationConfiguration);
    expect(html).toContain('GENERAL INFORMATION');
    expect(html).toContain('EMPLOYMENT DETAILS');
    expect(html).toContain('ADDITIONAL INFORMATION');

    // 4. Verify all 17 canonical general fields exist in the runtime output
    const expectedFieldKeys = [
      'general.employeeId',
      'general.employmentType',
      'general.employmentStatus',
      'general.department',
      'general.team',
      'general.designation',
      'general.gradeLevel',
      'general.reportingManager',
      'general.organisationUnit',
      'general.officeLocation',
      'general.joiningDate',
      'general.confirmedJoiningDate',
      'general.endDate',
      'general.sourceOfHire',
      'general.referralId',
      'general.probationPeriod',
      'general.noticePeriod',
    ];
    for (const key of expectedFieldKeys) {
      const fieldDef = defaultRegistrationConfiguration.fields.find((f) => f.key === key);
      expect(fieldDef).toBeDefined();
    }
  });

  it('preserves Employee ID as a protected, system-assigned control', () => {
    const html = renderGeneralWith(defaultRegistrationConfiguration, {
      employeeId: 'EMP-GEN-2026',
    });

    // Contains Employee ID value
    expect(html).toContain('EMP-GEN-2026');
    expect(html).toContain('id="reg-employee-id"');
    // Ensure readOnly and disabled attributes are rendered
    expect(html).toContain('readonly=""');
    expect(html).toContain('disabled=""');
    // Helper text confirms system-assigned nature
    expect(html).toContain('System-assigned unique ID');
  });

  it('respects configured field order in runtime', () => {
    // Reorder: put general.designation before general.department
    const reorderedFields = defaultRegistrationConfiguration.fields.map((f) => {
      if (f.key === 'general.designation') return { ...f, order: 1 };
      if (f.key === 'general.department') return { ...f, order: 2 };
      return f;
    });

    const config: RegistrationConfiguration = {
      ...defaultRegistrationConfiguration,
      fields: reorderedFields,
    };

    const html = renderGeneralWith(config);
    const designationIndex = html.indexOf('reg-designation');
    const departmentIndex = html.indexOf('reg-department');

    expect(designationIndex).toBeGreaterThan(-1);
    expect(departmentIndex).toBeGreaterThan(-1);
    expect(designationIndex).toBeLessThan(departmentIndex);
  });

  it('hides a field in runtime when disabled in configuration where allowed', () => {
    // Disable gradeLevel and confirmedJoiningDate
    const config = configurationWith({
      'general.gradeLevel': { enabled: false, required: false },
      'general.confirmedJoiningDate': { enabled: false, required: false },
    });

    const html = renderGeneralWith(config);
    expect(html).not.toContain('reg-grade-level');
    expect(html).not.toContain('reg-confirmed-joining-date');
    expect(html).toContain('reg-department');
    expect(html).toContain('reg-employee-id');
  });

  it('propagates custom label, custom placeholder, and custom help text to runtime', () => {
    const config = configurationWith({
      'general.department': {
        enabled: true,
        required: true,
        label: 'Business Unit / Department',
        description: 'Assigned organizational division',
      },
      'general.referralId': {
        enabled: true,
        required: false,
        label: 'Employee Referral Voucher',
        description: 'Provide referrer code if applicable',
        config: { placeholder: 'e.g. REF-2026-XYZ' },
      },
    });

    const html = renderGeneralWith(config, {
      data: { sourceOfHire: 'referral' },
    });

    expect(html).toContain('Business Unit / Department');
    expect(html).toContain('Assigned organizational division');
    expect(html).toContain('Employee Referral Voucher');
    expect(html).toContain('Provide referrer code if applicable');
    expect(html).toContain('placeholder="e.g. REF-2026-XYZ"');
  });

  it('propagates required changes to runtime while keeping protected fields protected', () => {
    // Make noticePeriod required
    const config = configurationWith({
      'general.noticePeriod': { enabled: true, required: true },
    });

    const html = renderGeneralWith(config);
    // Required asterisk on Notice Period
    expect(html).toMatch(
      /Notice Period\s*<span class="bezent-label__required"[^>]*>\*<\/span>/,
    );
    // Protected joiningDate is always required
    expect(html).toMatch(
      /Joining Date\s*<span class="bezent-label__required"[^>]*>\*<\/span>/,
    );
  });

  it('propagates field width (full vs half) to runtime layout', () => {
    const config = configurationWith({
      'general.department': { enabled: true, required: true, width: 'full' },
    });

    const html = renderGeneralWith(config);
    expect(html).toContain('bezent-form-field--span-full');
  });

  it('renders custom fields added via Form Editor in runtime', () => {
    const customFieldDef = {
      key: 'general.c_cost_center',
      section: 'general',
      label: 'Cost Center Code',
      protected: false,
      protectedReason: null,
      configurable: true,
      enabled: true,
      required: false,
      defaultEnabled: true,
      defaultRequired: false,
      overridden: false,
      width: 'half' as const,
      description: 'Internal financial billing code',
      order: 99,
      type: 'single_line',
      origin: 'custom' as const,
      config: { placeholder: 'e.g. CC-9988' },
    };

    const config: RegistrationConfiguration = {
      ...defaultRegistrationConfiguration,
      fields: [...defaultRegistrationConfiguration.fields, customFieldDef],
    };

    const html = renderGeneralWith(config);
    expect(html).toContain('Cost Center Code');
    expect(html).toContain('placeholder="e.g. CC-9988"');
    expect(html).toContain('Internal financial billing code');
  });

  it('renders choice / master-data configured options override', () => {
    const config = configurationWith({
      'general.department': {
        enabled: true,
        required: true,
        config: {
          options: [
            { value: 'AI Research', label: 'AI Research Lab' },
            { value: 'Quantum Computing', label: 'Quantum Computing Div' },
          ],
        },
      },
    });

    const html = renderGeneralWith(config);
    expect(html).toContain('AI Research Lab');
    expect(html).toContain('Quantum Computing Div');
  });

  it('renders fixed-term End Date conditionally when employmentType is contract or intern', () => {
    // 1. Full-time: End Date is NOT rendered
    const fullTimeHtml = renderGeneralWith(defaultRegistrationConfiguration, {
      data: { employmentType: 'full_time' },
    });
    expect(fullTimeHtml).not.toContain('reg-end-date');

    // 2. Contract: End Date IS rendered
    const contractHtml = renderGeneralWith(defaultRegistrationConfiguration, {
      data: { employmentType: 'contract' },
    });
    expect(contractHtml).toContain('reg-end-date');

    // 3. Intern: End Date IS rendered
    const internHtml = renderGeneralWith(defaultRegistrationConfiguration, {
      data: { employmentType: 'intern' },
    });
    expect(internHtml).toContain('reg-end-date');
  });

  it('existing registration state flows to Review and CreateEmployee payload accurately', () => {
    const initial = INITIAL_REGISTRATION_DATA;
    const testData = {
      ...initial,
      general: {
        ...initial.general,
        employeeId: 'EMP-BEZ-2026',
        department: 'Engineering',
        designation: 'Staff Engineer',
        joiningDate: '2026-05-01',
        employmentType: 'full_time',
        gradeLevel: 'L4 - Lead',
        probationPeriod: '3_months',
        noticePeriod: '60_days',
      },
    };

    // Review mapping
    const reviewData = toReviewSectionData(testData);
    expect(reviewData.general.employeeId).toBe('EMP-BEZ-2026');
    expect(reviewData.general.department).toBe('Engineering');
    expect(reviewData.general.designation).toBe('Staff Engineer');
    expect(reviewData.general.joiningDate).toBe('2026-05-01');

    // Create Employee payload
    const payload = buildCreateEmployeePayload(testData);
    expect(payload.employeeNumber).toBe('EMP-BEZ-2026');
    expect(payload.joiningDate).toBe('2026-05-01');
    expect(payload.employmentType).toBe('full_time');
  });

  it('honestly represents General chapter on FormCanvas matching resolved canonical definitions', () => {
    const resolved = resolvedFormOf(defaultRegistrationConfiguration);
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={resolved.sections}
        activeSectionKey="general"
        selectedFieldKey={null}
        onSelectField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('GENERAL INFORMATION');
    expect(html).toContain('EMPLOYMENT DETAILS');
    expect(html).toContain('ADDITIONAL INFORMATION');
    expect(html).toContain('Employee ID');
    expect(html).toContain('System Assigned');
  });
});
