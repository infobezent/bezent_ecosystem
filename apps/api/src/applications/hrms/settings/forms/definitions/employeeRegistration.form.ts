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

/** A Registration step whose field order is fixed; its fields are still company-configurable. */
function fixedSection(
  key: string,
  label: string,
  fields: SystemFieldDefinition[] = [],
): SystemSectionDefinition {
  return { key, label, configurable: true, fields };
}

const DROPDOWN = { type: 'dropdown' } as const;
const DATE = { type: 'date' } as const;
const PHONE = { type: 'phone' } as const;
const EMAIL = { type: 'email' } as const;
const CHECKBOX = { type: 'checkbox' } as const;
const FILE_UPLOAD = { type: 'file_upload' } as const;
const MULTI_LINE = { type: 'multi_line' } as const;
const TIME = { type: 'time' } as const;
const NUMBER = { type: 'number' } as const;
const DECIMAL = { type: 'decimal' } as const;

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
        field('personal.email', 'Personal Email', EMAIL),
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
    fixedSection('onboarding', 'Onboarding', [
      field('onboarding.laptopSetup', 'Laptop & Workspace Setup', CHECKBOX),
      field('onboarding.badgeCreation', 'ID Badge Creation', CHECKBOX),
      field('onboarding.complianceSigning', 'Compliance & Policy Signing', CHECKBOX),
      field('onboarding.teamIntroduction', 'Team Introduction & Orientation', CHECKBOX),
      field('onboarding.assetAllocation', 'Primary Hardware Asset Allocation', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'macbook_pro', label: 'Laptop (MacBook Pro 16")' },
            { value: 'thinkpad', label: 'Laptop (Lenovo ThinkPad X1)' },
            { value: 'dell_xps', label: 'Laptop (Dell XPS 15)' },
            { value: 'workstation', label: 'Custom Engineering Workstation' },
          ],
        },
      }),
      field('onboarding.securityKey', 'Security Hardware Token (YubiKey)', CHECKBOX),
    ]),
    fixedSection('skills', 'Skills', [
      field('skills.skillName', 'Skill / Technology', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'typescript', label: 'TypeScript (Technical)' },
            { value: 'react', label: 'React.js (Technical)' },
            { value: 'node', label: 'Node.js (Technical)' },
            { value: 'python', label: 'Python (Technical)' },
            { value: 'sql', label: 'SQL & Database Architecture (Technical)' },
            { value: 'talent_acq', label: 'Talent Acquisition (Functional)' },
            { value: 'payroll', label: 'Payroll Administration (Functional)' },
            { value: 'project_mgmt', label: 'Project Management & PMP (Professional)' },
            { value: 'communication', label: 'Communication & Leadership (Soft Skill)' },
            { value: 'english', label: 'English (Language)' },
          ],
        },
      }),
      field('skills.skillType', 'Skill Type', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Technical', label: 'Technical' },
            { value: 'Functional', label: 'Functional' },
            { value: 'Soft Skill', label: 'Soft Skill' },
            { value: 'Language', label: 'Language' },
            { value: 'Professional', label: 'Professional' },
          ],
        },
      }),
      field('skills.levelType', 'Level Type', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Beginner', label: 'Beginner' },
            { value: 'Intermediate', label: 'Intermediate' },
            { value: 'Advanced', label: 'Advanced' },
            { value: 'Expert', label: 'Expert' },
          ],
        },
      }),
      field('skills.level', 'Level', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Level 1 — Basic Awareness', label: 'Level 1 — Basic Awareness' },
            { value: 'Level 2 — Working Proficiency', label: 'Level 2 — Working Proficiency' },
            { value: 'Level 3 — High Proficiency', label: 'Level 3 — High Proficiency' },
            {
              value: 'Level 4 — Subject Matter Specialist',
              label: 'Level 4 — Subject Matter Specialist',
            },
          ],
        },
      }),
      field('skills.levelDate', 'Level Date', DATE),
      field('skills.yearsOfExperience', 'Experience (Years)', DECIMAL),
      field('skills.examiner', 'Examiner', {
        type: 'reference',
        config: { entity: 'employee' },
      }),
      field('skills.verifiedBy', 'Verified By', {
        type: 'reference',
        config: { entity: 'employee' },
      }),
      field('skills.mentor', 'Mentor', {
        type: 'reference',
        config: { entity: 'employee' },
      }),
    ]),
    fixedSection('emergency', 'Emergency Contact', [
      field('emergency.contactName', 'Contact Name'),
      field('emergency.relationship', 'Relationship / Role', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Father', label: 'Father' },
            { value: 'Mother', label: 'Mother' },
            { value: 'Spouse', label: 'Spouse' },
            { value: 'Brother', label: 'Brother' },
            { value: 'Sister', label: 'Sister' },
            { value: 'Son', label: 'Son' },
            { value: 'Daughter', label: 'Daughter' },
            { value: 'Guardian', label: 'Guardian' },
            { value: 'Relative', label: 'Relative' },
            { value: 'Friend', label: 'Friend' },
            { value: 'Other', label: 'Other' },
          ],
        },
      }),
      field('emergency.phone', 'Phone', PHONE),
      field('emergency.email', 'Email', EMAIL),
      field('emergency.address', 'Address Details', { ...MULTI_LINE, width: 'full' }),
      field('emergency.isPrimaryPrivate', 'Primary Emergency Contact (Private Record)', CHECKBOX),
      field('emergency.secondaryContactName', 'Secondary Contact Name'),
      field('emergency.secondaryRelationship', 'Secondary Relationship', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Father', label: 'Father' },
            { value: 'Mother', label: 'Mother' },
            { value: 'Spouse', label: 'Spouse' },
            { value: 'Brother', label: 'Brother' },
            { value: 'Sister', label: 'Sister' },
            { value: 'Guardian', label: 'Guardian' },
            { value: 'Relative', label: 'Relative' },
            { value: 'Friend', label: 'Friend' },
            { value: 'Other', label: 'Other' },
          ],
        },
      }),
      field('emergency.secondaryMobile', 'Secondary Mobile', PHONE),
      field('emergency.secondaryEmail', 'Secondary Email', EMAIL),
    ]),
    fixedSection('accounts', 'Accounts', [
      field('accounts.ifscCode', 'IFSC Code'),
      field('accounts.bankName', 'Bank Name'),
      field('accounts.branchName', 'Branch Name'),
      field('accounts.accountHolder', 'Account Holder'),
      field('accounts.accountNumber', 'Account Number'),
      field('accounts.reAccountNumber', 'Re-enter Account'),
      field('accounts.salaryStructure', 'Salary Structure', {
        ...DROPDOWN,
        config: {
          options: [
            {
              value: 'Standard IT Professional Structure',
              label: 'Standard IT Professional Structure',
            },
            { value: 'Executive Management Structure', label: 'Executive Management Structure' },
            { value: 'Sales & Commission Structure', label: 'Sales & Commission Structure' },
            { value: 'Other', label: 'Other' },
          ],
        },
      }),
      field('accounts.payGrade', 'Pay Grade', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'L1 - Entry Level', label: 'L1 - Entry Level' },
            { value: 'L2 - Mid Level', label: 'L2 - Mid Level' },
            { value: 'L3 - Senior Specialist', label: 'L3 - Senior Specialist' },
            { value: 'L4 - Lead / Manager', label: 'L4 - Lead / Manager' },
            { value: 'L5 - Executive', label: 'L5 - Executive' },
          ],
        },
      }),
      field('accounts.annualCtc', 'Annual CTC', DECIMAL),
      field('accounts.payrollGroup', 'Payroll Group', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Core Engineering Payroll', label: 'Core Engineering Payroll' },
            { value: 'Executive Payroll', label: 'Executive Payroll' },
            { value: 'Contractor Payroll', label: 'Contractor Payroll' },
          ],
        },
      }),
      field('accounts.salaryEffectiveDate', 'Salary Effective Date', DATE),
      field('accounts.paymentFrequency', 'Payment Frequency', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Weekly', label: 'Weekly' },
            { value: 'Bi-weekly', label: 'Bi-weekly' },
          ],
        },
      }),
      field('accounts.isPfApplicable', 'PF Applicable', CHECKBOX),
      field('accounts.isEsiApplicable', 'ESI Applicable', CHECKBOX),
      field('accounts.isPtApplicable', 'Professional Tax Applicable', CHECKBOX),
      field('accounts.taxRegime', 'Tax Regime', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'New Tax Regime', label: 'New Tax Regime (Default Sec 115BAC)' },
            { value: 'Old Tax Regime', label: 'Old Tax Regime (With Deductions)' },
          ],
        },
      }),
    ]),
    fixedSection('online_access', 'Online Access', [
      protectedField(
        'online_access.companyEmail',
        'Company Email',
        "Becomes the employee's work email, which every employee record requires.",
        EMAIL,
      ),
      field('online_access.username', 'System Username'),
      field('online_access.systemRole', 'Default System Role', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'employee', label: 'Employee (Self-Service)' },
            { value: 'team_lead', label: 'Team Lead / Approver' },
            { value: 'hr_manager', label: 'HR Manager' },
          ],
        },
      }),
      field('online_access.ssoEnabled', 'Single Sign-On (SSO) Provisioning', CHECKBOX),
    ]),
    fixedSection('working_hours', 'Working Hours', [
      field('working_hours.shiftPreset', 'Shift Pattern', {
        ...DROPDOWN,
        config: {
          options: [
            { value: 'general', label: 'General Shift (9:00 AM - 6:00 PM)' },
            { value: 'morning', label: 'Morning Shift (7:00 AM - 4:00 PM)' },
            { value: 'evening', label: 'Evening Shift (2:00 PM - 11:00 PM)' },
            { value: 'night', label: 'Night Shift (10:00 PM - 7:00 AM)' },
          ],
        },
      }),
      field('working_hours.startTime', 'Shift Start Time', TIME),
      field('working_hours.endTime', 'Shift End Time', TIME),
      field('working_hours.breakDuration', 'Break Duration (Mins)', NUMBER),
      field('working_hours.workingDays', 'Working Days', {
        ...DROPDOWN,
        config: {
          options: [
            { value: '5_days', label: '5 Days (Monday - Friday)' },
            { value: '6_days', label: '6 Days (Monday - Saturday)' },
          ],
        },
      }),
      field('working_hours.overtimeEligible', 'Overtime Eligible', CHECKBOX),
    ]),
    fixedSection('documents', 'Documents', [
      // A. Identity & Government Documents
      field('documents.aadhaarFile', 'Aadhaar Card', FILE_UPLOAD),
      field('documents.aadhaarNumber', 'Aadhaar Card Number'),
      field('documents.panFile', 'PAN Card', FILE_UPLOAD),
      field('documents.panNumber', 'PAN Card Number'),
      field('documents.passportFile', 'Passport', FILE_UPLOAD),
      field('documents.voterIdFile', 'Voter ID', FILE_UPLOAD),
      // B. Address Proof Documents
      field('documents.drivingLicenseFile', 'Driving License', FILE_UPLOAD),
      // C. Educational Records
      field('documents.class10File', 'Class 10 Marksheet / Certificate', FILE_UPLOAD),
      field('documents.class12File', 'Class 12 Marksheet / Certificate', FILE_UPLOAD),
      field('documents.degreeFile', 'Graduation Degree / Certificate', FILE_UPLOAD),
      field('documents.semesterMarksheetsFile', 'Semester Mark Sheets', FILE_UPLOAD),
      field('documents.postGraduationFile', 'Post-Graduation Certificate', FILE_UPLOAD),
      field('documents.certificationsFile', 'Professional / Technical Certifications', FILE_UPLOAD),
      // D. Professional History (shown for experienced hires)
      field('documents.previousAppointmentLetterFile', 'Previous Appointment Letter', FILE_UPLOAD),
      field('documents.experienceCertificateFile', 'Experience Certificate', FILE_UPLOAD),
      field('documents.relievingLetterFile', 'Relieving Letter', FILE_UPLOAD),
      field('documents.salarySlipsFile', 'Salary Slips (Last 3 Months)', FILE_UPLOAD),
      field('documents.form16File', 'Form 16 / Tax Statement', FILE_UPLOAD),
      field('documents.resignationLetterFile', 'Resignation / Exit Acceptance', FILE_UPLOAD),
      field('documents.noDuesCertificateFile', 'No-Dues Certificate', FILE_UPLOAD),
      // E. Financial & Tax Documents
      field('documents.panDocumentScanFile', 'PAN Document Scan', FILE_UPLOAD),
      field(
        'documents.cancelledCheque',
        'Bank Account Proof (Cancelled Cheque / Passbook)',
        FILE_UPLOAD,
      ),
      field('documents.uanDetailsFile', 'UAN / PF Details Document', FILE_UPLOAD),
    ]),
    fixedSection('review', 'Review', [
      field('review.selfDeclaration', 'Applicant / Employee Self-Declaration', CHECKBOX),
      field('review.hrSignOff', 'HR Operations Sign-off & Verification', CHECKBOX),
      field('review.internalNotes', 'Internal HR Verification Notes', {
        ...MULTI_LINE,
        width: 'full',
      }),
    ]),
  ],
};
