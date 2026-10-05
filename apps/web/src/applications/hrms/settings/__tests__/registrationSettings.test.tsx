import { afterEach, describe, it, expect, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  RegistrationFormEditor,
  applySettingChange,
  defaultSectionId,
  fieldStatus,
  firstFieldKey,
  hasUnsavedChanges,
  settingsOf,
  type RegistrationFormEditorProps,
} from '../administration/forms/RegistrationSettingsSection';
import { AdministrationSettingsSection } from '../administration/AdministrationSettingsSection';
import {
  EmployeeRegistrationFormConfiguration,
  FORM_CONFIGURATION_TABS,
  FormsLanding,
} from '../administration/forms/FormsSettings';
import { saveRegistrationConfiguration } from '../api/registrationSettingsApi';
import {
  configurationWith,
  defaultRegistrationConfiguration,
  resolvedFormOf,
} from '../../onboarding/__tests__/registrationConfigFixture';

const noop = () => {};

/**
 * Collects elements from a hook-free element tree. Function components named in
 * `expand` are rendered in place so their output can be inspected too.
 */
function findElements(
  node: ReactNode,
  predicate: (el: ReactElement) => boolean,
  expand: string[] = [],
): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap((child) => findElements(child, predicate, expand));
  if (!isValidElement(node)) return [];
  const el = node as ReactElement<Record<string, unknown>>;
  if (typeof el.type === 'function' && expand.includes(el.type.name)) {
    return findElements((el.type as (p: unknown) => ReactNode)(el.props), predicate, expand);
  }
  const nested = Object.values(el.props).flatMap((value) =>
    findElements(value as ReactNode, predicate, expand),
  );
  return [...(predicate(el) ? [el] : []), ...nested];
}

function byAriaLabel(label: string) {
  return (el: ReactElement) => (el.props as { 'aria-label'?: string })['aria-label'] === label;
}

/** The opening <button ...> tag of the button whose content includes `text`. */
function buttonTag(html: string, text: string): string {
  const match = html
    .split('<button')
    .slice(1)
    .find((chunk) => chunk.split('</button>')[0]!.includes(text));
  expect(match, text).toBeDefined();
  return `<button${match!.split('>')[0]}>`;
}

function editorProps(
  overrides: Partial<RegistrationFormEditorProps> = {},
  configuration = defaultRegistrationConfiguration,
): RegistrationFormEditorProps {
  return {
    configuration,
    settings: settingsOf(configuration),
    selectedSectionId: defaultSectionId(configuration),
    selectedFieldKey: firstFieldKey(configuration, defaultSectionId(configuration)),
    onSelectSection: noop,
    onSelectField: noop,
    onToggleEnabled: noop,
    onToggleRequired: noop,
    ...overrides,
  };
}

function render(props: RegistrationFormEditorProps) {
  return renderToStaticMarkup(<RegistrationFormEditor {...props} />);
}

/** The <input> tag with the given aria-label. */
function inputTag(html: string, ariaLabel: string): string {
  const tag = (html.match(/<input[^>]*>/g) ?? []).find((t) =>
    t.includes(`aria-label="${ariaLabel}"`),
  );
  expect(tag, ariaLabel).toBeDefined();
  return tag!;
}

/** The markup of the listbox with the given accessible name. */
function listboxHtml(html: string, ariaLabel: string): string {
  const start = html.indexOf(`role="listbox" aria-label="${ariaLabel}"`);
  expect(start, ariaLabel).toBeGreaterThan(-1);
  return html.slice(start);
}

/** The markup of one option (by item id) in the rendered editor. */
function optionHtml(html: string, id: string): string {
  const idAt = html.indexOf(`data-item-id="${id}"`);
  expect(idAt, id).toBeGreaterThan(-1);
  const rest = html.slice(html.lastIndexOf('<div role="option"', idAt));
  const next = rest.indexOf('<div role="option"', 1);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('HR Settings → Administration → Forms', () => {
  it('Administration settings opens on Forms, without the legacy in-memory Form Builder', () => {
    const html = renderToStaticMarkup(<AdministrationSettingsSection />);
    expect(html).toContain('>Forms<');
    expect(html).toContain('System Forms');
    expect(html).toContain('Custom Forms');
    expect(html).not.toContain('Form Builder');
  });

  it('Forms lists Employee Registration as an active system form with Configure', () => {
    const onConfigure = vi.fn();
    const html = renderToStaticMarkup(<FormsLanding onConfigure={onConfigure} />);
    expect(html).toContain('Employee Registration');
    expect(html).toContain('Active');
    expect(html).toContain('Configure');

    const tree = FormsLanding({ onConfigure });
    const configure = findElements(tree, byAriaLabel('Configure Employee Registration'))[0];
    (configure!.props as { onClick: () => void }).onClick();
    expect(onConfigure).toHaveBeenCalledWith('employee-registration');
  });

  it('Custom Forms is empty and Create Form is visibly unavailable', () => {
    const html = renderToStaticMarkup(<FormsLanding onConfigure={noop} />);
    expect(html).toContain('No custom forms yet');
    expect(html).toContain('available in a future release');
    expect(buttonTag(html, 'Create Form')).toContain('disabled=""');
  });

  it('Configure opens Customize; Access Control and Preview stay disabled', () => {
    const html = renderToStaticMarkup(<EmployeeRegistrationFormConfiguration onBack={noop} />);
    expect(html).toContain('Customize');
    // Customize = the persisted Enabled / Required configuration (loads from the API).
    expect(html).toContain('Loading registration settings');
    expect(buttonTag(html, 'Access Control')).toContain('disabled=""');
    expect(buttonTag(html, 'Preview')).toContain('disabled=""');
    expect(buttonTag(html, 'Customize')).not.toContain('disabled=""');
    expect(FORM_CONFIGURATION_TABS.filter((t) => !t.disabled).map((t) => t.id)).toEqual([
      'customize',
    ]);
  });
});

describe('Employee Registration → Customize (Form Editor)', () => {
  it('shows Sections | Form Fields | Field Properties with General selected by default', () => {
    const html = render(editorProps());
    for (const pane of ['>Sections<', '>Form Fields<', '>Field Properties<']) {
      expect(html).toContain(pane);
    }
    const sections = listboxHtml(html, 'Form sections');
    expect(optionHtml(sections, 'general')).toContain('aria-selected="true"');
    expect(optionHtml(sections, 'general')).toContain('17 fields');
    expect(optionHtml(sections, 'personal')).toContain('aria-selected="false"');
    expect(optionHtml(sections, 'personal')).toContain('29 fields');
    // Only configurable sections are offered — no placeholder sections.
    for (const hidden of ['Online Access', 'Review', 'Company Email']) {
      expect(html).not.toContain(hidden);
    }
    // General's fields are listed; the first field is selected and its properties shown.
    expect(html).toContain('aria-label="General fields"');
    expect(optionHtml(html, 'general.employeeId')).toContain('aria-selected="true"');
    expect(html).not.toContain('First Name');
  });

  it('switching to Personal Information lists that section’s fields', () => {
    const onSelectSection = vi.fn();
    const props = editorProps({ onSelectSection });
    const sectionList = findElements(
      RegistrationFormEditor(props),
      byAriaLabel('Form sections'),
    )[0];
    (sectionList!.props as { onSelect: (id: string) => void }).onSelect('personal');
    expect(onSelectSection).toHaveBeenCalledWith('personal');

    const html = render(
      editorProps({
        selectedSectionId: 'personal',
        selectedFieldKey: firstFieldKey(defaultRegistrationConfiguration, 'personal'),
      }),
    );
    expect(html).toContain('aria-label="Personal Information fields"');
    expect(html).toContain('Middle Name');
    expect(html).not.toContain('Employee ID');
    expect(optionHtml(html, 'personal.firstName')).toContain('aria-selected="true"');
  });

  it('selecting a field opens its properties', () => {
    const onSelectField = vi.fn();
    const props = editorProps({ selectedSectionId: 'personal', onSelectField });
    const fieldList = findElements(
      RegistrationFormEditor(props),
      byAriaLabel('Personal Information fields'),
    )[0];
    (fieldList!.props as { onSelect: (id: string) => void }).onSelect('personal.middleName');
    expect(onSelectField).toHaveBeenCalledWith('personal.middleName');

    const html = render({ ...props, selectedFieldKey: 'personal.middleName' });
    expect(optionHtml(html, 'personal.middleName')).toContain('aria-selected="true"');
    expect(inputTag(html, 'Middle Name enabled')).toContain('checked=""');
    expect(inputTag(html, 'Middle Name enabled')).not.toContain('disabled=""');
    expect(inputTag(html, 'Middle Name required')).not.toContain('disabled=""');
  });

  it('shows each field’s draft status: System required / Required / Optional / Disabled', () => {
    const configuration = configurationWith({
      'personal.bloodGroup': { enabled: false, required: false },
      'personal.gender': { enabled: true, required: true },
    });
    const html = render(editorProps({ selectedSectionId: 'personal' }, configuration));
    expect(optionHtml(html, 'personal.firstName')).toContain('System required');
    expect(optionHtml(html, 'personal.gender')).toContain('>Required<');
    expect(optionHtml(html, 'personal.middleName')).toContain('Optional');
    expect(optionHtml(html, 'personal.bloodGroup')).toContain('Disabled');

    const field = configuration.fields.find((f) => f.key === 'personal.middleName')!;
    expect(fieldStatus(field, { enabled: true, required: true }).label).toBe('Required');
    expect(fieldStatus(field, { enabled: false, required: false }).label).toBe('Disabled');
  });

  it('Enabled and Required switches report changes that update the draft', () => {
    const onToggleEnabled = vi.fn();
    const onToggleRequired = vi.fn();
    const tree = RegistrationFormEditor(
      editorProps({
        selectedSectionId: 'personal',
        selectedFieldKey: 'personal.middleName',
        onToggleEnabled,
        onToggleRequired,
      }),
    );
    const find = (label: string) =>
      findElements(tree, byAriaLabel(label), ['FieldProperties'])[0]!.props as {
        onChange: (e: { target: { checked: boolean } }) => void;
      };
    find('Middle Name required').onChange({ target: { checked: true } });
    expect(onToggleRequired).toHaveBeenCalledWith('personal.middleName', true);
    find('Middle Name enabled').onChange({ target: { checked: false } });
    expect(onToggleEnabled).toHaveBeenCalledWith('personal.middleName', false);

    // The container applies them to its draft; disabling a field clears Required.
    const draft = settingsOf(defaultRegistrationConfiguration);
    const required = applySettingChange(draft, 'personal.middleName', { required: true });
    expect(required['personal.middleName']).toEqual({ enabled: true, required: true });
    const disabled = applySettingChange(required, 'personal.middleName', { enabled: false });
    expect(disabled['personal.middleName']).toEqual({ enabled: false, required: false });
    expect(hasUnsavedChanges(disabled, draft)).toBe(true);
  });

  it('a disabled field cannot be made required', () => {
    const configuration = configurationWith({
      'personal.bloodGroup': { enabled: false, required: false },
    });
    const html = render(
      editorProps(
        { selectedSectionId: 'personal', selectedFieldKey: 'personal.bloodGroup' },
        configuration,
      ),
    );
    expect(inputTag(html, 'Blood Group enabled')).not.toContain('checked=""');
    expect(inputTag(html, 'Blood Group required')).toContain('disabled=""');
  });

  it('protected fields stay enabled, required and locked, and explain why', () => {
    const html = render(
      editorProps({ selectedSectionId: 'personal', selectedFieldKey: 'personal.firstName' }),
    );
    for (const control of ['First Name enabled', 'First Name required']) {
      expect(inputTag(html, control)).toContain('checked=""');
      expect(inputTag(html, control)).toContain('disabled=""');
    }
    expect(html).toContain('Required by the employee record.');
    // Unknown keys (e.g. protected, non-configurable fields) are never added to the draft.
    const draft = settingsOf(defaultRegistrationConfiguration);
    expect(draft['online_access.companyEmail']).toBeUndefined();
    expect(applySettingChange(draft, 'online_access.companyEmail', { enabled: false })).toBe(draft);
  });

  it('Discard restores the persisted settings', () => {
    const persisted = settingsOf(defaultRegistrationConfiguration);
    const edited = applySettingChange(persisted, 'general.team', { enabled: false });
    expect(hasUnsavedChanges(edited, persisted)).toBe(true);
    // Discard Changes resets the draft to settingsOf(configuration).
    const discarded = settingsOf(defaultRegistrationConfiguration);
    expect(discarded).toEqual(persisted);
    expect(hasUnsavedChanges(discarded, persisted)).toBe(false);
  });
});

describe('Employee Registration → Save Changes', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('persists the whole draft to the settings API', async () => {
    const saved = configurationWith({ 'general.team': { enabled: false, required: false } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: resolvedFormOf(saved) }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const draft = applySettingChange(settingsOf(defaultRegistrationConfiguration), 'general.team', {
      enabled: false,
    });
    const result = await saveRegistrationConfiguration(
      Object.entries(draft).map(([key, value]) => ({ key, ...value })),
    );

    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toContain('/hrms/settings/forms/employee-registration/overrides');
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body as string) as {
      fields: { key: string; enabled: boolean; required: boolean }[];
    };
    expect(body.fields).toHaveLength(46);
    expect(body.fields.find((f) => f.key === 'general.team')).toEqual({
      key: 'general.team',
      enabled: false,
      required: false,
    });
    // After saving, the saved configuration becomes the new baseline.
    expect(hasUnsavedChanges(draft, settingsOf(result))).toBe(false);
  });
});

describe('HRMS Administration Settings UI — Approved Hierarchy & Image 2 Specifications', () => {
  it('renders Administration heading and approved description without generic Settings header', () => {
    const html = renderToStaticMarkup(<AdministrationSettingsSection />);
    // 1. Administration heading renders
    expect(html).toContain('Administration');
    // 2. Correct description renders
    expect(html).toContain('Configure employee administration and onboarding settings.');
    // 3. Generic Settings title/description no longer render in this Administration view
    expect(html).not.toContain('Configure and manage settings across the BEZENT portal.');
    expect(html).not.toContain('Settings / Administration');
  });

  it('renders top utility row with Back to Settings and current company indicator', () => {
    const onBack = vi.fn();
    const html = renderToStaticMarkup(<AdministrationSettingsSection onBack={onBack} />);
    expect(html).toContain('Back to Settings');
    expect(html).toContain('No company selected');
  });

  it('renders primary administration tabs with Forms active by default and Onboarding/Employee Configuration visible', () => {
    const html = renderToStaticMarkup(<AdministrationSettingsSection />);
    // 4. Forms is the default active tab
    expect(html).toContain('id="tab-forms"');
    expect(html).toContain('aria-selected="true"');
    // 5. Onboarding tab is visible
    expect(html).toContain('id="tab-onboarding"');
    expect(html).toContain('>Onboarding<');
    // 6. Employee Configuration tab is visible
    expect(html).toContain('id="tab-employee-configuration"');
    expect(html).toContain('>Employee Configuration<');
  });

  it('renders Forms workspace with System Forms, Employee Registration, Active status, and System Form badge', () => {
    const html = renderToStaticMarkup(<AdministrationSettingsSection />);
    // 7. Employee Registration renders
    expect(html).toContain('Employee Registration');
    expect(html).toContain('Configure fields and layout used during employee registration.');
    // 8. Active status renders
    expect(html).toContain('Active');
    // 9. System Form indicator renders
    expect(html).toContain('System Form');
    // 10. Configure button renders
    expect(html).toContain('Configure');
    // 11. Custom Forms empty state renders
    expect(html).toContain('Custom Forms');
    expect(html).toContain('No custom forms yet');
    expect(html).toContain('Creating custom forms will be available in a future release.');
    // 12. Create Form is disabled and cannot trigger unsupported creation
    expect(buttonTag(html, 'Create Form')).toContain('disabled=""');
  });

  it('Configure preserves existing navigation routing', () => {
    const onConfigure = vi.fn();
    const tree = FormsLanding({ onConfigure });
    const configure = findElements(tree, byAriaLabel('Configure Employee Registration'))[0];
    expect(configure).toBeDefined();
    (configure!.props as { onClick: () => void }).onClick();
    expect(onConfigure).toHaveBeenCalledWith('employee-registration');
  });
});
