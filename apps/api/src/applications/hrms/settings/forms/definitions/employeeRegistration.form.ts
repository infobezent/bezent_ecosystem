import type {
  FormFieldConfig,
  FormFieldType,
  FormFieldWidth,
  SystemFieldDefinition,
  SystemFormDefinition,
  SystemSectionDefinition,
} from '../types/form.types.js';

/**
 * BEZENT system form: Employee Registration.
 *
 * Section and field keys are stable identifiers referenced by company
 * overrides and by the Registration UI — never rename or reuse one. To add a
 * field in a BEZENT update, add a definition here; companies see it with its
 * defaults and their existing overrides stay untouched.
 *
 * Defaults reproduce the Registration behaviour: every field enabled; only the
 * fields the employee creation API requires are required (and protected).
 */

interface FieldOptions {
  type?: FormFieldType;
  width?: FormFieldWidth;
  config?: FormFieldConfig;
  defaultRequired?: boolean;
}

function field(key: string, label: string, options: FieldOptions = {}): SystemFieldDefinition {
  return {
    key,
    type: options.type ?? 'single_line',
    label,
    protected: false,
    defaultEnabled: true,
    defaultRequired: options.defaultRequired ?? false,
    width: options.width ?? 'half',
    config: options.config ?? {},
  };
}

function protectedField(
  key: string,
  label: string,
  reason: string,
  options: FieldOptions = {},
): SystemFieldDefinition {
  return {
    ...field(key, label, options),
    protected: true,
    protectedReason: reason,
    defaultRequired: true,
  };
}

/** A Registration step whose fields are not configurable in this release. */
function fixedSection(
  key: string,
  label: string,
  fields: SystemFieldDefinition[] = [],
): SystemSectionDefinition {
  return { key, label, configurable: false, fields };
}

const DROPDOWN = { type: 'dropdown' } as const;
const DATE = { type: 'date' } as const;
const PHONE = { type: 'phone' } as const;

export const EMPLOYEE_REGISTRATION_FORM: SystemFormDefinition = {
  key: 'employee-registration',
  name: 'Employee Registration',
  description: 'Information collected when registering a new employee.',
  kind: 'system',
  status: 'active',
  sections: [
    {
      key: 'general',
      label: 'General',
      configurable: true,
      fields: [
        protectedField(
          'general.employeeId',
          'Employee ID',
          'System-assigned unique employee number.',
        ),
        field('general.employmentType', 'Employment Type', DROPDOWN),
        field('general.employmentStatus', 'Employment Status', DROPDOWN),
        field('general.department', 'Department', DROPDOWN),
        field('general.team', 'Team', DROPDOWN),
        field('general.designation', 'Designation', DROPDOWN),
        field('general.gradeLevel', 'Grade / Level', DROPDOWN),
        field('general.reportingManager', 'Reporting Manager', {
          type: 'reference',
          config: { entity: 'employee' },
        }),
        field('general.organisationUnit', 'Organisation Unit', DROPDOWN),
        field('general.officeLocation', 'Office Location', DROPDOWN),
        protectedField(
          'general.joiningDate',
          'Joining Date',
          'Every employee record requires a joining date.',
          DATE,
        ),
        field('general.confirmedJoiningDate', 'Confirmed Date of Joining', DATE),
        field('general.endDate', 'End Date', DATE),
        field('general.sourceOfHire', 'Source of Hire', DROPDOWN),
        field('general.referralId', 'Referral ID'),
        field('general.probationPeriod', 'Probation Period', DROPDOWN),
        field('general.noticePeriod', 'Notice Period', DROPDOWN),
      ],
    },
    {
      key: 'personal',
      label: 'Personal Information',
      configurable: true,
      fields: [
        protectedField(
          'personal.firstName',
          'First Name',
          'Every employee record requires a first name.',
        ),
        field('personal.middleName', 'Middle Name'),
        field('personal.lastName', 'Last Name'),
        field('personal.preferredName', 'Preferred Name'),
        field('personal.gender', 'Gender', DROPDOWN),
        field('personal.dateOfBirth', 'Date of Birth', DATE),
        field('personal.maritalStatus', 'Marital Status', DROPDOWN),
        field('personal.bloodGroup', 'Blood Group', DROPDOWN),
        field('personal.nationality', 'Nationality', DROPDOWN),
        field('personal.nativeLanguage', 'Native Language', DROPDOWN),
        field('personal.parentGuardians', 'Parent / Guardian Details'),
        field('personal.mobilePhone', 'Mobile Phone', PHONE),
        field('personal.email', 'Personal Email', { type: 'email' }),
        field('personal.timeZone', 'Time Zone', DROPDOWN),
        field('personal.street', 'Address Line 1', { width: 'full' }),
        field('personal.addressLine2', 'Address Line 2', { width: 'full' }),
        field('personal.country', 'Country', DROPDOWN),
        field('personal.pinCode', 'PIN Code / Postal Code'),
        field('personal.city', 'City', DROPDOWN),
        field('personal.district', 'District'),
        field('personal.state', 'State'),
        field('personal.isPermanentSameAsCurrent', 'Permanent address is same as current address'),
        field('personal.permanentStreet', 'Permanent Address Line 1', { width: 'full' }),
        field('personal.permanentAddressLine2', 'Permanent Address Line 2', { width: 'full' }),
        field('personal.permanentCountry', 'Permanent Country', DROPDOWN),
        field('personal.permanentPinCode', 'Permanent PIN Code / Postal Code'),
        field('personal.permanentCity', 'Permanent City', DROPDOWN),
        field('personal.permanentDistrict', 'Permanent District'),
        field('personal.permanentState', 'Permanent State'),
      ],
    },
    fixedSection('onboarding', 'Administration'),
    fixedSection('skills', 'Skills'),
    fixedSection('emergency', 'Emergency Contact'),
    fixedSection('accounts', 'Accounts'),
    fixedSection('online_access', 'Online Access', [
      protectedField(
        'online_access.companyEmail',
        'Company Email',
        "Becomes the employee's work email, which every employee record requires.",
        { type: 'email' },
      ),
    ]),
    fixedSection('working_hours', 'Working Hours'),
    fixedSection('documents', 'Documents'),
    fixedSection('review', 'Review'),
  ],
};
