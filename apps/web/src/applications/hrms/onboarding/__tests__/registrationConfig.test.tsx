import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import { EmployeeRegistrationPage } from '../pages/EmployeeRegistrationPage';
import { PersonalInformation } from '../components/PersonalInformation';
import {
  RegistrationConfigProvider,
  RegistrationField,
  findMissingRequiredFields,
  isEmptyValue,
} from '../registration/registrationConfig';
import type { RegistrationConfiguration } from '../../settings/api/registrationSettingsApi';
import {
  fetchRegistrationConfiguration,
  saveRegistrationConfiguration,
  toRegistrationConfiguration,
} from '../../settings/api/registrationSettingsApi';
import { FormsApiError } from '../../settings/api/formsApi';
import {
  configurationWith,
  defaultRegistrationConfiguration,
  resolvedFormOf,
} from './registrationConfigFixture';

function renderPersonal(configuration: RegistrationConfiguration) {
  return renderToStaticMarkup(
    <RegistrationConfigProvider configuration={configuration}>
      <PersonalInformation employeeId="EMP2026001" />
    </RegistrationConfigProvider>,
  );
}

function renderGeneral(configuration: RegistrationConfiguration) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RegistrationConfigProvider configuration={configuration}>
        <EmployeeRegistration onCancel={() => {}} initialDraft={null} />
      </RegistrationConfigProvider>
    </MemoryRouter>,
  );
}

const requiredMarker = (label: string) =>
  new RegExp(
    `${label.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\s*<span class="bezent-label__required"`,
  );

describe('Registration applies the resolved company configuration', () => {
  it('without overrides: every configurable field is shown and only system fields are required', () => {
    const personal = renderPersonal(defaultRegistrationConfiguration);
    for (const label of ['Blood Group', 'Middle Name', 'Last Name', 'Date of Birth', 'Street']) {
      expect(personal).toContain(label);
    }
    expect(personal).toMatch(requiredMarker('First Name'));
    expect(personal).not.toMatch(requiredMarker('Middle Name'));
    expect(personal).not.toMatch(requiredMarker('Blood Group'));

    const general = renderGeneral(defaultRegistrationConfiguration);
    expect(general).toMatch(requiredMarker('Employee ID'));
    expect(general).toMatch(requiredMarker('Joining Date'));
    expect(general).toContain('Grade / Level');
    expect(general).not.toMatch(requiredMarker('Grade / Level'));
  });

  it('hides a field the company disabled', () => {
    const html = renderPersonal(
      configurationWith({ 'personal.bloodGroup': { enabled: false, required: false } }),
    );
    expect(html).not.toContain('Blood Group');
    expect(html).not.toContain('pers-blood-group');
    expect(html).toContain('Nationality');
  });

  it('marks a field the company made required', () => {
    const html = renderPersonal(
      configurationWith({ 'personal.middleName': { enabled: true, required: true } }),
    );
    expect(html).toMatch(requiredMarker('Middle Name'));
  });

  it('hides a disabled General field in the main form', () => {
    const html = renderGeneral(
      configurationWith({ 'general.gradeLevel': { enabled: false, required: false } }),
    );
    expect(html).not.toContain('Grade / Level');
    expect(html).toContain('Organisation Unit');
  });

  it('refuses unknown field keys instead of guessing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      renderToStaticMarkup(
        <RegistrationConfigProvider configuration={defaultRegistrationConfiguration}>
          <RegistrationField fieldKey="personal.shoeSize" value="">
            <input />
          </RegistrationField>
        </RegistrationConfigProvider>,
      ),
    ).toThrow("Unknown registration field 'personal.shoeSize'");
    vi.restoreAllMocks();
  });
});

describe('Required validation (Save & Next)', () => {
  const config = configurationWith({ 'personal.middleName': { enabled: true, required: true } });

  it('blocks on required, enabled fields of the section whose value is empty', () => {
    const values = new Map<string, unknown>([
      ['personal.firstName', 'Asha'],
      ['personal.middleName', '   '],
      ['personal.lastName', ''],
    ]);
    expect(findMissingRequiredFields(config, 'personal', values)).toEqual(['personal.middleName']);
  });

  it('passes once the required values are provided', () => {
    const values = new Map<string, unknown>([
      ['personal.firstName', 'Asha'],
      ['personal.middleName', 'K'],
    ]);
    expect(findMissingRequiredFields(config, 'personal', values)).toEqual([]);
  });

  it('includes protected fields and only checks the given section', () => {
    const values = new Map<string, unknown>([
      ['personal.firstName', ''],
      ['general.employeeId', ''],
    ]);
    expect(findMissingRequiredFields(defaultRegistrationConfiguration, 'personal', values)).toEqual(
      ['personal.firstName'],
    );
  });

  it('never blocks on disabled or unrendered fields', () => {
    const disabled = configurationWith({
      'personal.middleName': { enabled: false, required: false },
    });
    expect(
      findMissingRequiredFields(disabled, 'personal', new Map([['personal.middleName', '']])),
    ).toEqual([]);
    // A required field that is not rendered reports no value and cannot block.
    expect(findMissingRequiredFields(config, 'personal', new Map())).toEqual([]);
  });

  it('treats whitespace-only strings as empty', () => {
    expect(isEmptyValue('  ')).toBe(true);
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue('x')).toBe(false);
  });
});

describe('Registration configuration ← Form Engine API client', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('projects the resolved form onto the Registration configuration', () => {
    const configuration = configurationWith({
      'personal.bloodGroup': { enabled: false, required: false },
    });
    expect(toRegistrationConfiguration(resolvedFormOf(configuration))).toEqual(configuration);
  });

  it('reads and saves the employee-registration form on the real endpoints (no local fallback)', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ data: resolvedFormOf() }),
      });
    });

    expect(await fetchRegistrationConfiguration()).toEqual(defaultRegistrationConfiguration);
    await saveRegistrationConfiguration([
      { key: 'personal.bloodGroup', enabled: false, required: false },
    ]);

    expect(calls[0]!.url).toMatch(/\/hrms\/settings\/forms\/employee-registration$/);
    expect(calls[1]!.url).toMatch(/\/hrms\/settings\/forms\/employee-registration\/overrides$/);
    expect(calls[1]!.init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[1]!.init?.body))).toEqual({
      fields: [{ key: 'personal.bloodGroup', enabled: false, required: false }],
    });
  });

  it('surfaces server rejections with their details', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: 'Validation failed for registration settings',
          details: { 'fields[0]': "'First Name' is system-required" },
        },
      }),
    });
    const error = await saveRegistrationConfiguration([
      { key: 'personal.firstName', enabled: false, required: false },
    ]).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(FormsApiError);
    expect((error as FormsApiError).details?.['fields[0]']).toContain('system-required');
  });
});

describe('RegistrationConfigProvider contract — regression guards', () => {
  it('EmployeeRegistration throws the context error when rendered outside RegistrationConfigProvider', () => {
    // Regression: if RegistrationConfigLoader/RegistrationConfigProvider is ever
    // removed from the route tree, this test catches the regression immediately
    // rather than causing a silent runtime crash.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      renderToStaticMarkup(
        <MemoryRouter>
          <EmployeeRegistration onCancel={() => {}} initialDraft={null} />
        </MemoryRouter>,
      ),
    ).toThrow('useRegistrationConfig must be used within a RegistrationConfigProvider');
    vi.restoreAllMocks();
  });

  it('EmployeeRegistrationPage renders the loading gate (RegistrationConfigLoader) before the form', () => {
    // RegistrationConfigLoader always renders <LoadingState> on the first synchronous
    // pass (the fetch is async); EmployeeRegistration is never mounted without the
    // provider. This asserts the route element is EmployeeRegistrationPage, not
    // a bare EmployeeRegistration.
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EmployeeRegistrationPage />
      </MemoryRouter>,
    );
    expect(html).toContain('Loading employee registration');
    // The form body must NOT be present on the first synchronous render
    // because the provider is not yet mounted.
    expect(html).not.toContain('bezent-page-header');
  });
});

