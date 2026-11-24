import type {
  FormFieldConfig,
  FormFieldType,
  FormFieldWidth,
  SystemFieldDefinition,
  SystemFormDefinition,
  SystemSectionDefinition,
} from '../types/form.types.js';

interface FieldOptions {
  type?: FormFieldType;
  width?: FormFieldWidth;
  config?: FormFieldConfig;
  defaultRequired?: boolean;
  protected?: boolean;
  protectedReason?: string;
  description?: string;
}

function field(key: string, label: string, options: FieldOptions = {}): SystemFieldDefinition {
  return {
    key,
    type: options.type ?? 'single_line',
    label,
    description: options.description,
    protected: options.protected ?? false,
    protectedReason: options.protectedReason,
    defaultEnabled: true,
    defaultRequired: options.defaultRequired ?? false,
    width: options.width ?? 'half',
    config: options.config ?? {},
  };
}

function requiredField(
  key: string,
  label: string,
  options: FieldOptions = {},
): SystemFieldDefinition {
  return field(key, label, { ...options, defaultRequired: true });
}

const DROPDOWN = { type: 'dropdown' } as const;
const DATE = { type: 'date' } as const;
const PHONE = { type: 'phone' } as const;
const EMAIL = { type: 'email' } as const;
const MULTI_LINE = { type: 'multi_line' } as const;
const CHECKBOX = { type: 'checkbox' } as const;
const FILE_UPLOAD = { type: 'file_upload' } as const;

export const CANDIDATE_INTAKE_FORM: SystemFormDefinition = {
  key: 'candidate-intake',
  name: 'Candidate Intake Form',
  description: 'Pre-hire registration and information collection form for prospective employees.',
  kind: 'system',
  status: 'active',
  sections: [
    // 1. Personal Information
    {
      key: 'personal',
      label: 'Personal Information',
      description: 'Candidate primary legal identity and personal details.',
      configurable: true,
      fields: [
        requiredField('personal.firstName', 'First Name', { width: 'half' }),
        field('personal.middleName', 'Middle Name', { width: 'half' }),
        requiredField('personal.lastName', 'Last Name', { width: 'half' }),
        requiredField('personal.dateOfBirth', 'Date of Birth', { ...DATE, width: 'half' }),
        field('personal.gender', 'Gender', {
          ...DROPDOWN,
          width: 'half',
          config: {
            options: [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'non_binary', label: 'Non-Binary' },
              { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            ],
          },
        }),
      ],
    },

    // 2. Contact Information
    {
      key: 'contact',
      label: 'Contact Information',
      description: 'Candidate communication channels and direct contact phone numbers.',
      configurable: true,
      fields: [
        requiredField('contact.personalEmail', 'Personal Email', { ...EMAIL, width: 'half' }),
        requiredField('contact.mobileNumber', 'Mobile Number', { ...PHONE, width: 'half' }),
        field('contact.alternatePhone', 'Alternate Phone', { ...PHONE, width: 'half' }),
      ],
    },

    // 3. Address Details
    {
      key: 'address',
      label: 'Address Details',
      description:
        'Current residence and permanent address coordinates with same-as-current conditional logic.',
      configurable: true,
      fields: [
        requiredField('address.currentAddress', 'Current Address', { width: 'full' }),
        field('address.currentAddressLine2', 'Current Address Line 2', { width: 'full' }),
        requiredField('address.currentCity', 'Current City', { width: 'half' }),
        requiredField('address.currentState', 'Current State', { width: 'half' }),
        requiredField('address.currentCountry', 'Current Country', { width: 'half' }),
        requiredField('address.currentPostalCode', 'Current Postal Code', { width: 'half' }),
        field('address.sameAsCurrent', 'Same as Current Address', {
          ...CHECKBOX,
          width: 'full',
          description: 'Check if permanent residential address matches current residence.',
        }),
        field('address.permanentAddress', 'Permanent Address', { width: 'full' }),
        field('address.permanentAddressLine2', 'Permanent Address Line 2', { width: 'full' }),
        field('address.permanentCity', 'Permanent City', { width: 'half' }),
        field('address.permanentState', 'Permanent State', { width: 'half' }),
        field('address.permanentCountry', 'Permanent Country', { width: 'half' }),
        field('address.permanentPostalCode', 'Permanent Postal Code', { width: 'half' }),
      ],
    },

    // 4. Employment Information (HR-controlled, read-only to candidate)
    {
      key: 'employment',
      label: 'Employment Information',
      description:
        'Role assignment, department, and work coordinates (HR-controlled and read-only to candidate).',
      configurable: true,
      fields: [
        field('employment.position', 'Position / Job Title', { width: 'half' }),
        field('employment.department', 'Department', { ...DROPDOWN, width: 'half' }),
        field('employment.employmentType', 'Employment Type', {
          ...DROPDOWN,
          width: 'half',
          config: {
            options: [
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'intern', label: 'Intern' },
            ],
          },
        }),
        field('employment.workLocation', 'Work Location', { ...DROPDOWN, width: 'half' }),
        field('employment.reportingManager', 'Reporting Manager', {
          type: 'reference',
          width: 'half',
          config: { entity: 'employee' },
        }),
        field('employment.expectedJoiningDate', 'Expected Joining Date', {
          ...DATE,
          width: 'half',
        }),
      ],
    },

    // 5. Emergency Contact
    {
      key: 'emergency',
      label: 'Emergency Contact',
      description: 'Designated emergency contact person and emergency phone numbers.',
      configurable: true,
      fields: [
        requiredField('emergency.contactName', 'Contact Name', { width: 'half' }),
        requiredField('emergency.relationship', 'Relationship', { width: 'half' }),
        requiredField('emergency.mobileNumber', 'Mobile Number', { ...PHONE, width: 'half' }),
        field('emergency.alternatePhone', 'Alternate Phone', { ...PHONE, width: 'half' }),
      ],
    },

    // 6. Additional Information
    {
      key: 'additional',
      label: 'Additional Information',
      description: 'Profile photo and internal onboarding notes.',
      configurable: true,
      fields: [
        field('additional.profilePhoto', 'Profile Photo', {
          ...FILE_UPLOAD,
          width: 'half',
          config: { maxSizeMb: 5 },
        }),
        field('additional.additionalNotes', 'Additional Notes', {
          ...MULTI_LINE,
          width: 'full',
          description: 'Internal HR hiring context and special onboarding notes.',
        }),
      ],
    },
  ],
};
