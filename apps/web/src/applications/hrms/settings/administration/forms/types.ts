import type {
  CustomFieldType,
  FormCustomizationMetadata,
  FormFieldConfig,
  ResolvedFormField,
} from '../../api/formsApi';

export interface ToolboxItem {
  type: CustomFieldType;
  label: string;
  category: 'text' | 'choice' | 'date' | 'advanced';
  icon: string;
}

export const TOOLBOX_ITEMS: readonly ToolboxItem[] = [
  { type: 'single_line', label: 'Single Line', category: 'text', icon: 'edit' },
  { type: 'multi_line', label: 'Multi Line', category: 'text', icon: 'edit' },
  { type: 'email', label: 'Email', category: 'text', icon: 'edit' },
  { type: 'phone', label: 'Phone', category: 'text', icon: 'edit' },
  { type: 'number', label: 'Number', category: 'advanced', icon: 'sparkles' },
  { type: 'decimal', label: 'Decimal', category: 'advanced', icon: 'sparkles' },
  { type: 'dropdown', label: 'Dropdown', category: 'choice', icon: 'filter' },
  { type: 'radio', label: 'Radio', category: 'choice', icon: 'filter' },
  { type: 'checkbox', label: 'Checkbox', category: 'choice', icon: 'check' },
  { type: 'multi_select', label: 'Multi Select', category: 'choice', icon: 'filter' },
  { type: 'date', label: 'Date', category: 'date', icon: 'calendar' },
  { type: 'time', label: 'Time', category: 'date', icon: 'calendar' },
  { type: 'datetime', label: 'Date-Time', category: 'date', icon: 'calendar' },
  { type: 'file_upload', label: 'File Upload', category: 'advanced', icon: 'documents' },
] as const;

/**
 * Generates a company-owned custom field key matching /^custom\.[a-f0-9]{32}$/
 * enforced by the server Form Engine validation.
 */
export function generateCustomFieldKey(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `custom.${hex}`;
}

/**
 * Creates a new custom field definition ready to be added to an editor draft.
 */
export function createNewCustomField(
  type: CustomFieldType,
  label: string,
  order: number,
  groupKey?: string,
): ResolvedFormField {
  const isChoiceType =
    type === 'dropdown' || type === 'radio' || type === 'checkbox' || type === 'multi_select';

  const initialConfig: FormFieldConfig = isChoiceType
    ? {
        options: [
          { value: 'option_1', label: 'Option 1' },
          { value: 'option_2', label: 'Option 2' },
        ],
        ...(groupKey ? { groupKey } : {}),
      }
    : groupKey
      ? { groupKey }
      : {};

  return {
    key: generateCustomFieldKey(),
    type,
    label: label.trim() || 'New Custom Field',
    description: null,
    origin: 'custom',
    protected: false,
    protectedReason: null,
    configurable: true,
    enabled: true,
    required: false,
    order,
    width: 'half',
    config: initialConfig,
    defaults: null,
    overridden: false,
  };
}

export interface ChapterDefinition {
  key: string;
  stepNumber: string;
  label: string;
  title: string;
  description: string;
  kicker: string;
}

export const CHAPTER_METADATA: readonly ChapterDefinition[] = [
  {
    key: 'general',
    stepNumber: '01',
    label: 'General Information',
    title: 'GENERAL INFORMATION',
    description: 'Core identity, organizational placement, and employment classification details',
    kicker: 'CHAPTER // 01',
  },
  {
    key: 'personal',
    stepNumber: '02',
    label: 'Personal Information',
    title: 'PERSONAL INFORMATION',
    description:
      'Legal identity, demographics, contact details, permanent residence, and family profile',
    kicker: 'CHAPTER // 02',
  },
  {
    key: 'onboarding',
    stepNumber: '03',
    label: 'Administration / Onboarding',
    title: 'ADMINISTRATION & WORKFLOW',
    description: 'Pre-boarding setup, compliance checklist items, and hardware/asset provisioning',
    kicker: 'CHAPTER // 03',
  },
  {
    key: 'skills',
    stepNumber: '04',
    label: 'Skills & Competencies',
    title: 'SKILLS & COMPETENCY PROFILE',
    description:
      'Technical proficiencies, competency evaluations, certifications, and assigned mentors',
    kicker: 'CHAPTER // 04',
  },
  {
    key: 'emergency',
    stepNumber: '05',
    label: 'Emergency Contact',
    title: 'EMERGENCY CONTACT DETAILS',
    description: 'Primary and secondary emergency contacts, relationships, and emergency protocols',
    kicker: 'CHAPTER // 05',
  },
  {
    key: 'accounts',
    stepNumber: '06',
    label: 'Accounts & Statutory',
    title: 'STATUTORY & BANK ACCOUNTS',
    description:
      'Disbursement bank accounts, PF/ESI numbers, tax classification, and payroll setup',
    kicker: 'CHAPTER // 06',
  },
  {
    key: 'online_access',
    stepNumber: '07',
    label: 'Online Access & Security',
    title: 'ONLINE ACCESS & CREDENTIALS',
    description:
      'Single sign-on authorization, enterprise email allocation, and portal permissions',
    kicker: 'CHAPTER // 07',
  },
  {
    key: 'working_hours',
    stepNumber: '08',
    label: 'Working Hours & Shifts',
    title: 'WORKING HOURS & SCHEDULE',
    description:
      'Assigned shift schedule, weekly calendar, holiday calendar, and time tracking policy',
    kicker: 'CHAPTER // 08',
  },
  {
    key: 'documents',
    stepNumber: '09',
    label: 'Documents & Compliance',
    title: 'DOCUMENT REPOSITORY & VERIFICATION',
    description:
      'Mandatory identification proof, experience letters, certificates, and photo upload',
    kicker: 'CHAPTER // 09',
  },
  {
    key: 'review',
    stepNumber: '10',
    label: 'Review & Finalize',
    title: 'REGISTRATION REVIEW & SUBMISSION',
    description:
      'Comprehensive overview of all registration chapters prior to employee profile activation',
    kicker: 'CHAPTER // 10',
  },
] as const;

export interface SectionGroupDefinition {
  key: string;
  title: string;
  description?: string;
  fieldKeys: readonly string[];
}

export const KNOWN_SECTION_GROUPS: Record<string, readonly SectionGroupDefinition[]> = {
  general: [
    {
      key: 'general_info',
      title: 'GENERAL INFORMATION',
      description: 'Core identity, placement, and employment classification details',
      fieldKeys: ['general.employeeId', 'general.employmentType', 'general.employmentStatus'],
    },
    {
      key: 'employment_details',
      title: 'EMPLOYMENT DETAILS',
      description: 'Organizational structure, placement, and reporting hierarchy',
      fieldKeys: [
        'general.department',
        'general.team',
        'general.designation',
        'general.gradeLevel',
        'general.reportingManager',
        'general.organisationUnit',
        'general.officeLocation',
        'general.joiningDate',
      ],
    },
    {
      key: 'additional_info',
      title: 'ADDITIONAL INFORMATION',
      description: 'Confirmed dates, terms, recruitment source, and probation terms',
      fieldKeys: [
        'general.confirmedJoiningDate',
        'general.endDate',
        'general.sourceOfHire',
        'general.referralId',
        'general.probationPeriod',
        'general.noticePeriod',
      ],
    },
  ],
  personal: [
    {
      key: 'personal_details',
      title: 'PERSONAL DETAILS',
      description: 'Legal identity, demographics, and parent/guardian profile',
      fieldKeys: [
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
      ],
    },
    {
      key: 'contact_info',
      title: 'CONTACT & COMMUNICATION',
      description: 'Primary mobile, personal email, and time zone',
      fieldKeys: ['personal.mobilePhone', 'personal.email', 'personal.timeZone'],
    },
    {
      key: 'current_address',
      title: 'CURRENT ADDRESS',
      description: 'Present residential address and postal details',
      fieldKeys: [
        'personal.street',
        'personal.addressLine2',
        'personal.country',
        'personal.pinCode',
        'personal.city',
        'personal.district',
        'personal.state',
      ],
    },
    {
      key: 'permanent_address',
      title: 'PERMANENT ADDRESS',
      description: 'Legal domicile and permanent address',
      fieldKeys: [
        'personal.isPermanentSameAsCurrent',
        'personal.permanentStreet',
        'personal.permanentAddressLine2',
        'personal.permanentCountry',
        'personal.permanentPinCode',
        'personal.permanentCity',
        'personal.permanentDistrict',
        'personal.permanentState',
      ],
    },
  ],
  online_access: [
    {
      key: 'credentials',
      title: 'ONLINE ACCESS & CREDENTIALS',
      description:
        'Single sign-on authorization, enterprise email allocation, and portal permissions',
      fieldKeys: ['online_access.companyEmail'],
    },
  ],
};

export interface ResolvedSectionGroup {
  key: string;
  title: string;
  description?: string;
  fields: ResolvedFormField[];
}

/**
 * Partitions fields of a form section into logical groups matching the
 * canonical Employee Registration structure (e.g. General Information,
 * Employment Details, Additional Information).
 */
/**
 * Determines which subgroup a field belongs to.
 * Explicit `config.groupKey` takes precedence over static `KNOWN_SECTION_GROUPS` definitions.
 * Custom fields without an explicit groupKey default to 'additional_info'.
 */
export function getSubgroupForField(
  sectionKey: string,
  field: ResolvedFormField,
  metadata?: FormCustomizationMetadata,
): string {
  const customSubgroup = metadata?.fieldSubgroups?.[field.key];
  if (customSubgroup) {
    return customSubgroup;
  }
  if (field.config?.groupKey) {
    return field.config.groupKey;
  }
  const definedGroups = KNOWN_SECTION_GROUPS[sectionKey];
  if (definedGroups) {
    for (const group of definedGroups) {
      if (group.fieldKeys.includes(field.key)) {
        return group.key;
      }
    }
  }
  return 'additional_info';
}

/**
 * Partitions fields of a form section into logical groups matching the
 * canonical Employee Registration structure (e.g. General Information,
 * Employment Details, Additional Information).
 */
export function getGroupsForSection(
  sectionKey: string,
  sectionFields: readonly ResolvedFormField[],
  metadata?: FormCustomizationMetadata,
): ResolvedSectionGroup[] {
  const definedGroups = KNOWN_SECTION_GROUPS[sectionKey];
  if (!definedGroups) {
    if (sectionFields.length === 0) return [];
    const customTitle = metadata?.subgroups?.['all_fields']?.title;
    const customDesc = metadata?.subgroups?.['all_fields']?.description;
    return [
      {
        key: 'all_fields',
        title: customTitle || 'SECTION FIELDS',
        description: customDesc,
        fields: [...sectionFields],
      },
    ];
  }

  const assignedKeys = new Set<string>();
  const result: ResolvedSectionGroup[] = [];

  for (const groupDef of definedGroups) {
    const groupFields: ResolvedFormField[] = [];

    for (const field of sectionFields) {
      if (assignedKeys.has(field.key)) continue;

      const fieldGroup = getSubgroupForField(sectionKey, field, metadata);
      if (fieldGroup === groupDef.key) {
        groupFields.push(field);
        assignedKeys.add(field.key);
      }
    }

    const groupMeta = metadata?.subgroups?.[groupDef.key];
    result.push({
      key: groupDef.key,
      title: groupMeta?.title || groupDef.title,
      description:
        groupMeta?.description !== undefined ? groupMeta.description : groupDef.description,
      fields: groupFields,
    });
  }

  // Any remaining fields not assigned to any group belong to "additional_info"
  const remainingFields = sectionFields.filter((f) => !assignedKeys.has(f.key));
  if (remainingFields.length > 0) {
    const existingAdditional = result.find((g) => g.key === 'additional_info');
    if (existingAdditional) {
      existingAdditional.fields.push(...remainingFields);
    } else {
      const additionalMeta = metadata?.subgroups?.['additional_info'];
      result.push({
        key: 'additional_info',
        title: additionalMeta?.title || 'ADDITIONAL INFORMATION',
        description:
          additionalMeta?.description !== undefined
            ? additionalMeta.description
            : 'Custom fields and company-specific attributes',
        fields: remainingFields,
      });
    }
  }

  return result;
}
