import type {
  RegistrationConfiguration,
  RegistrationFieldConfig,
} from '../../settings/api/registrationSettingsApi';
import type { ResolvedForm } from '../../settings/api/formsApi';

/**
 * Test fixture mirroring the API's default resolved Registration configuration
 * (no company overrides). Tests only — the app always loads it from the API.
 */
// Section order and visibility are part of the projected configuration (Form
// Engine section ordering/visibility): system sections keep their definition
// order (1-based) and are visible unless a company hides them.
const SECTIONS: RegistrationConfiguration['sections'] = [
  { id: 'general', label: 'General', configurable: true },
  { id: 'personal', label: 'Personal Information', configurable: true },
  { id: 'onboarding', label: 'Administration', configurable: false },
  { id: 'skills', label: 'Skills', configurable: false },
  { id: 'emergency', label: 'Emergency Contact', configurable: false },
  { id: 'accounts', label: 'Accounts', configurable: false },
  { id: 'online_access', label: 'Online Access', configurable: false },
  { id: 'working_hours', label: 'Working Hours', configurable: false },
  { id: 'documents', label: 'Documents', configurable: false },
  { id: 'review', label: 'Review', configurable: false },
].map((section, index) => ({ ...section, order: index + 1, visible: true }));

const FIELDS: [key: string, label: string, isProtected?: boolean, configurable?: boolean][] = [
  ['general.employeeId', 'Employee ID', true],
  ['general.employmentType', 'Employment Type'],
  ['general.employmentStatus', 'Employment Status'],
  ['general.department', 'Department'],
  ['general.team', 'Team'],
  ['general.designation', 'Designation'],
  ['general.gradeLevel', 'Grade / Level'],
  ['general.reportingManager', 'Reporting Manager'],
  ['general.organisationUnit', 'Organisation Unit'],
  ['general.officeLocation', 'Office Location'],
  ['general.joiningDate', 'Joining Date', true],
  ['general.confirmedJoiningDate', 'Confirmed Date of Joining'],
  ['general.endDate', 'End Date'],
  ['general.sourceOfHire', 'Source of Hire'],
  ['general.referralId', 'Referral ID'],
  ['general.probationPeriod', 'Probation Period'],
  ['general.noticePeriod', 'Notice Period'],
  ['personal.firstName', 'First Name', true],
  ['personal.middleName', 'Middle Name'],
  ['personal.lastName', 'Last Name'],
  ['personal.preferredName', 'Preferred Name'],
  ['personal.gender', 'Gender'],
  ['personal.dateOfBirth', 'Date of Birth'],
  ['personal.maritalStatus', 'Marital Status'],
  ['personal.bloodGroup', 'Blood Group'],
  ['personal.nationality', 'Nationality'],
  ['personal.nativeLanguage', 'Native Language'],
  ['personal.parentGuardians', 'Parent / Guardian Details'],
  ['personal.mobilePhone', 'Mobile Phone'],
  ['personal.email', 'Personal Email'],
  ['personal.timeZone', 'Time Zone'],
  ['personal.street', 'Address Line 1'],
  ['personal.addressLine2', 'Address Line 2'],
  ['personal.country', 'Country'],
  ['personal.pinCode', 'PIN Code / Postal Code'],
  ['personal.city', 'City'],
  ['personal.district', 'District'],
  ['personal.state', 'State'],
  ['personal.isPermanentSameAsCurrent', 'Permanent address is same as current address'],
  ['personal.permanentStreet', 'Permanent Address Line 1'],
  ['personal.permanentAddressLine2', 'Permanent Address Line 2'],
  ['personal.permanentCountry', 'Permanent Country'],
  ['personal.permanentPinCode', 'Permanent PIN Code / Postal Code'],
  ['personal.permanentCity', 'Permanent City'],
  ['personal.permanentDistrict', 'Permanent District'],
  ['personal.permanentState', 'Permanent State'],
  ['online_access.companyEmail', 'Company Email', true, false],
];

const sectionCounters = new Map<string, number>();

export const defaultRegistrationConfiguration: RegistrationConfiguration = {
  sections: SECTIONS,
  fields: FIELDS.map(([key, label, isProtected = false, configurable = true]) => {
    const sec = key.split('.')[0]!;
    const count = (sectionCounters.get(sec) ?? 0) + 1;
    sectionCounters.set(sec, count);
    return {
      key,
      section: sec,
      label,
      protected: isProtected,
      protectedReason: isProtected ? 'Required by the employee record.' : null,
      configurable,
      enabled: true,
      required: isProtected,
      defaultEnabled: true,
      defaultRequired: isProtected,
      overridden: false,
      width: 'half',
      description: null,
      order: count,
      origin: 'system',
      type: 'text',
      config: {},
    };
  }),
};

/** Default configuration with some fields overridden. */
export function configurationWith(
  overrides: Record<string, Partial<RegistrationFieldConfig>>,
): RegistrationConfiguration {
  const existingKeys = new Set(defaultRegistrationConfiguration.fields.map((f) => f.key));
  const updated = defaultRegistrationConfiguration.fields.map((field) =>
    overrides[field.key] ? { ...field, ...overrides[field.key], overridden: true } : field,
  );
  for (const [key, val] of Object.entries(overrides)) {
    if (!existingKeys.has(key)) {
      const section = key.split('.')[0] || 'general';
      updated.push({
        key,
        section,
        label: val.label || key,
        protected: false,
        protectedReason: null,
        configurable: true,
        enabled: val.enabled ?? true,
        required: val.required ?? false,
        defaultEnabled: true,
        defaultRequired: false,
        overridden: true,
        width: val.width ?? 'half',
        description: val.description ?? null,
        order: val.order ?? 999,
        type: val.type ?? 'single_line',
        origin: val.origin ?? 'system',
        config: val.config ?? {},
      });
    }
  }
  return {
    ...defaultRegistrationConfiguration,
    fields: updated,
  };
}

/** The server's resolved form (Form Engine payload) for a Registration configuration. */
export function resolvedFormOf(
  configuration: RegistrationConfiguration = defaultRegistrationConfiguration,
): ResolvedForm {
  return {
    form: {
      key: 'employee-registration',
      name: 'Employee Registration',
      description: 'Information collected when registering a new employee.',
      kind: 'system',
      status: 'active',
      version: 0,
    },
    sections: configuration.sections.map((section, sectionIndex) => ({
      key: section.id,
      label: section.label,
      order: sectionIndex + 1,
      origin: 'system',
      configurable: section.configurable,
      fields: configuration.fields
        .filter((field) => field.section === section.id)
        .map((field, fieldIndex) => ({
          key: field.key,
          type: 'text',
          label: field.label,
          description: null,
          origin: 'system',
          protected: field.protected,
          protectedReason: field.protectedReason,
          configurable: field.configurable,
          enabled: field.enabled,
          required: field.required,
          order: fieldIndex + 1,
          width: 'half',
          config: {},
          defaults: {
            label: field.label,
            enabled: field.defaultEnabled,
            required: field.defaultRequired,
            width: 'half',
          },
          overridden: field.overridden,
        })),
    })),
  };
}
