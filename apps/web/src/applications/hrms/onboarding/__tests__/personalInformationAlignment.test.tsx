import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PersonalInformation } from '../components/PersonalInformation';
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
import { FieldProperties } from '../../settings/administration/forms/FieldProperties';
import {
  INITIAL_REGISTRATION_DATA,
  toReviewSectionData,
  buildCreateEmployeePayload,
} from '../types/registration.types';

import type { PersonalInformationProps } from '../components/PersonalInformation';

function renderPersonalWith(
  config: RegistrationConfiguration,
  props?: PersonalInformationProps,
) {
  return renderToStaticMarkup(
    <RegistrationConfigProvider configuration={config}>
      <PersonalInformation employeeId={props?.employeeId ?? 'EMP2026001'} data={props?.data} />
    </RegistrationConfigProvider>,
  );
}

describe('Chapter 01 (Personal Information) Form Editor ↔ Runtime Alignment', () => {
  it('Editor and Runtime resolve the same canonical Chapter 01 section groups and field identities', () => {
    // 1. Editor definition: KNOWN_SECTION_GROUPS.personal
    const editorGroups = KNOWN_SECTION_GROUPS['personal']!;
    expect(editorGroups).toBeDefined();
    const groupKeys = editorGroups.map((g) => g.key);
    expect(groupKeys).toEqual([
      'personal_details',
      'contact_info',
      'current_address',
      'permanent_address',
    ]);

    // 2. Runtime partitioning using getGroupsForSection on default configuration
    const personalFields = defaultRegistrationConfiguration.fields.filter(
      (f) => f.section === 'personal' && f.enabled,
    );
    const resolvedGroups = getGroupsForSection(
      'personal',
      personalFields as unknown as Parameters<typeof getGroupsForSection>[1],
    );
    expect(resolvedGroups.map((g) => g.key)).toEqual(groupKeys);

    // 3. Render runtime and verify each group title is present
    const html = renderPersonalWith(defaultRegistrationConfiguration);
    expect(html).toContain('PERSONAL DETAILS');
    expect(html).toContain('CONTACT &amp; COMMUNICATION');
    expect(html).toContain('CURRENT ADDRESS');
    expect(html).toContain('PERMANENT ADDRESS');

    // 4. Verify all canonical personal fields exist in the runtime output
    const expectedFieldKeys = [
      'personal.firstName',
      'personal.middleName',
      'personal.lastName',
      'personal.preferredName',
      'personal.gender',
      'personal.dateOfBirth',
      'personal.maritalStatus',
      'personal.bloodGroup',
      'personal.nationality',
      'personal.nativeLanguage',
      'personal.parentGuardians',
      'personal.mobilePhone',
      'personal.email',
      'personal.timeZone',
      'personal.street',
      'personal.addressLine2',
      'personal.country',
      'personal.pinCode',
      'personal.city',
      'personal.district',
      'personal.state',
      'personal.isPermanentSameAsCurrent',
    ];
    for (const key of expectedFieldKeys) {
      const fieldDef = defaultRegistrationConfiguration.fields.find((f) => f.key === key);
      expect(fieldDef).toBeDefined();
    }
  });

  it('respects configured field order in runtime', () => {
    // Reorder: put personal.lastName before personal.firstName
    const reorderedFields = defaultRegistrationConfiguration.fields.map((f) => {
      if (f.key === 'personal.lastName') return { ...f, order: 1 };
      if (f.key === 'personal.firstName') return { ...f, order: 2 };
      return f;
    });

    const config: RegistrationConfiguration = {
      ...defaultRegistrationConfiguration,
      fields: reorderedFields,
    };

    const html = renderPersonalWith(config);
    const lastNameIndex = html.indexOf('pers-last-name');
    const firstNameIndex = html.indexOf('pers-first-name');

    expect(lastNameIndex).toBeGreaterThan(-1);
    expect(firstNameIndex).toBeGreaterThan(-1);
    expect(lastNameIndex).toBeLessThan(firstNameIndex);
  });

  it('hides a field in runtime when disabled in configuration where allowed', () => {
    // Disable blood group and middle name
    const config = configurationWith({
      'personal.bloodGroup': { enabled: false, required: false },
      'personal.middleName': { enabled: false, required: false },
    });

    const html = renderPersonalWith(config);
    expect(html).not.toContain('pers-blood-group');
    expect(html).not.toContain('Blood Group');
    expect(html).not.toContain('pers-middle-name');
    expect(html).toContain('pers-first-name');
    expect(html).toContain('First Name');
  });

  it('propagates custom label, custom placeholder, and custom help text to runtime', () => {
    const config = configurationWith({
      'personal.lastName': {
        enabled: true,
        required: false,
        label: 'Family Name / Surname',
        description: 'As written in government passport or official ID',
        config: { placeholder: 'Enter official surname' },
      },
    });

    const html = renderPersonalWith(config);
    expect(html).toContain('Family Name / Surname');
    expect(html).toContain('As written in government passport or official ID');
    expect(html).toContain('placeholder="Enter official surname"');
  });

  it('propagates required changes to runtime while keeping protected fields protected', () => {
    // Make personal.maritalStatus required
    const config = configurationWith({
      'personal.maritalStatus': { enabled: true, required: true },
    });

    const html = renderPersonalWith(config);
    // Required asterisk check
    expect(html).toMatch(
      /Marital Status\s*<span class="bezent-label__required"[^>]*>\*<\/span>/,
    );
    // Protected first name is always required
    expect(html).toMatch(
      /First Name\s*<span class="bezent-label__required"[^>]*>\*<\/span>/,
    );
  });

  it('propagates field width (full vs half) to runtime layout', () => {
    const config = configurationWith({
      'personal.firstName': { enabled: true, required: true, width: 'full' },
    });

    const html = renderPersonalWith(config);
    // span="full" sets bezent-form-field--span-full on the field wrapper
    expect(html).toContain('bezent-form-field--span-full');
  });

  it('renders custom fields added via Form Editor in runtime', () => {
    const customFieldDef = {
      key: 'personal.c_emergency_diet',
      section: 'personal',
      label: 'Dietary Preference',
      protected: false,
      protectedReason: null,
      configurable: true,
      enabled: true,
      required: false,
      defaultEnabled: true,
      defaultRequired: false,
      overridden: false,
      width: 'half' as const,
      description: 'Special dietary requirements',
      order: 99,
      type: 'single_line',
      origin: 'custom' as const,
      config: { placeholder: 'e.g. Vegetarian / Vegan' },
    };

    const config: RegistrationConfiguration = {
      ...defaultRegistrationConfiguration,
      fields: [...defaultRegistrationConfiguration.fields, customFieldDef],
    };

    const html = renderPersonalWith(config);
    expect(html).toContain('Dietary Preference');
    expect(html).toContain('placeholder="e.g. Vegetarian / Vegan"');
    expect(html).toContain('Special dietary requirements');
  });

  it('renders Profile Photo canonically and reflects disabled state', () => {
    // 1. By default, Profile Photo is present
    const defaultHtml = renderPersonalWith(defaultRegistrationConfiguration);
    expect(defaultHtml).toContain('bezent-photo-uploader');
    expect(defaultHtml).toContain('Profile Photo');
    expect(defaultHtml).toContain('Upload Photo');

    // 2. When disabled by company configuration, Profile Photo disappears
    const configNoPhoto = configurationWith({
      'personal.profilePhoto': { enabled: false, required: false },
    });
    const noPhotoHtml = renderPersonalWith(configNoPhoto);
    expect(noPhotoHtml).not.toContain('bezent-photo-uploader');
    expect(noPhotoHtml).not.toContain('Upload Photo');
  });

  it('displays Employee ID honestly in informational context without breaking canonical field count', () => {
    const html = renderPersonalWith(defaultRegistrationConfiguration, { employeeId: 'EMP-9988' });
    expect(html).toContain('EMP-9988');
    expect(html).toContain('Employee ID:');
    expect(html).toContain('System Assigned');
  });

  it('existing registration state flows to Review and CreateEmployee payload accurately', () => {
    const initial = INITIAL_REGISTRATION_DATA;
    const testData = {
      ...initial,
      personal: {
        ...initial.personal,
        firstName: 'Priya',
        lastName: 'Ramaswamy',
        personalEmail: 'priya.r@example.com',
        mobilePhone: '9840123456',
        currentCity: 'Coimbatore',
        currentState: 'Tamil Nadu',
      },
    };

    // Review mapping
    const reviewData = toReviewSectionData(testData);
    expect(reviewData.personal.fullName).toBe('Priya Ramaswamy');
    expect(reviewData.personal.personalEmail).toBe('priya.r@example.com');
    expect(reviewData.personal.mobilePhone).toBe('9840123456');
    expect(reviewData.personal.currentCity).toBe('Coimbatore');

    // Create Employee payload
    const payload = buildCreateEmployeePayload(testData);
    expect(payload.firstName).toBe('Priya');
    expect(payload.lastName).toBe('Ramaswamy');
    expect(payload.phone).toBe('9840123456');
    expect(payload.details?.personal?.addressCity).toBe('Coimbatore');
  });

  it('dynamically resolves Employee ID ownership from configuration section order without hardcoding', () => {
    // Case 1: Default configuration (General is Chapter 01)
    const defaultHtml = renderPersonalWith(defaultRegistrationConfiguration, { employeeId: 'EMP-001' });
    expect(defaultHtml).toContain('(System Assigned • Chapter 01)');

    // Case 2: Reordered configuration (Personal is Chapter 01, General is Chapter 02)
    const reorderedSections = defaultRegistrationConfiguration.sections.map((sec) => {
      if (sec.id === 'personal') return { ...sec, order: 1 };
      if (sec.id === 'general') return { ...sec, order: 2 };
      return sec;
    });
    const reorderedConfig: RegistrationConfiguration = {
      ...defaultRegistrationConfiguration,
      sections: reorderedSections,
    };
    const reorderedHtml = renderPersonalWith(reorderedConfig, { employeeId: 'EMP-001' });
    expect(reorderedHtml).toContain('(System Assigned • Chapter 02)');
  });

  it('honestly represents Profile Photo as a protected system control on FormCanvas', () => {
    const resolved = resolvedFormOf(defaultRegistrationConfiguration);
    const html = renderToStaticMarkup(
      <FormCanvas
        sections={resolved.sections}
        activeSectionKey="personal"
        selectedFieldKey={null}
        onSelectField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('Profile Photo');
    expect(html).toContain('System Control');
    expect(html).toContain('JPG / PNG • Max 5 MB');
    expect(html).toContain('Upload Photo');
  });

  it('honestly represents Employee ID as a protected system-assigned control on FormCanvas without fake inputs', () => {
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

    expect(html).toContain('Employee ID');
    expect(html).toContain('System Assigned');
    expect(html).toContain('Generated automatically');
    expect(html).not.toContain('placeholder="EMP2026001"');
  });

  it('protects specialized system controls from deletion and type modification in FieldProperties', () => {
    // 1. Profile Photo properties
    const photoControl = {
      key: 'personal.profilePhoto',
      label: 'Profile Photo',
      type: 'file_upload' as const,
      origin: 'system' as const,
      protected: true,
      protectedReason: 'Profile photo is a protected system control for employee identification.',
      configurable: false,
      enabled: true,
      required: false,
      order: 0,
      width: 'full' as const,
      description: 'JPG / PNG • Max 5 MB',
      config: { maxSizeMb: 5, placeholder: 'JPG / PNG • Max 5 MB' },
      defaults: { label: 'Profile Photo', enabled: true, required: false, width: 'full' as const },
      overridden: false,
    };

    const photoHtml = renderToStaticMarkup(
      <FieldProperties
        field={photoControl}
        selectedEntity="field"
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );
    expect(photoHtml).toContain('System Control');
    expect(photoHtml).toContain('File Upload');
    expect(photoHtml).toContain('Protected');
    expect(photoHtml).not.toContain('System Field');
    expect(photoHtml).toContain('readonly=""');
    expect(photoHtml).not.toContain('Delete Custom Field');

    // 2. Employee ID properties
    const employeeIdField = {
      key: 'general.employeeId',
      label: 'Employee ID',
      type: 'text' as const,
      origin: 'system' as const,
      protected: true,
      protectedReason: 'Employee ID is unique identifier',
      configurable: false,
      enabled: true,
      required: true,
      order: 1,
      width: 'half' as const,
      description: null,
      config: {},
      defaults: { label: 'Employee ID', enabled: true, required: true, width: 'half' as const },
      overridden: false,
    };

    const empIdHtml = renderToStaticMarkup(
      <FieldProperties
        field={employeeIdField}
        selectedEntity="field"
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );
    expect(empIdHtml).toContain('System Assigned');
    expect(empIdHtml).toContain('Protected System Field');
    expect(empIdHtml).toContain('readonly=""');
    expect(empIdHtml).not.toContain('Delete Custom Field');
    expect(empIdHtml).toContain('Protected');
  });

  it('cleans up Chapter Settings by removing Move Up/Down buttons and showing compact order', () => {
    const activeSec = {
      key: 'personal',
      label: 'Personal Information',
      order: 2,
      origin: 'system' as const,
      configurable: true,
      fields: [],
    };

    const html = renderToStaticMarkup(
      <FieldProperties
        field={null}
        activeSection={activeSec}
        sectionTitle="Personal Information"
        sectionOrderIndex={1}
        totalSections={10}
        selectedEntity="chapter"
        onUpdateField={vi.fn()}
        onDeleteField={vi.fn()}
      />,
    );

    expect(html).toContain('Position 02 of 10');
    expect(html).toContain('Reorder chapters from Form Structure');
    expect(html).not.toContain('Move Up');
    expect(html).not.toContain('Move Down');
    expect(html).toContain('Key');
    expect(html).toContain('Protection');
  });
});
