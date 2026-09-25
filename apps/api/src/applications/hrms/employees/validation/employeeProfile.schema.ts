import { ValidationError } from '../../../../app/errors/AppError.js';
import { DATE_REGEX, EMAIL_REGEX } from './employee.schema.js';
import {
  EMPLOYEE_RECORD_SECTIONS,
  PROFICIENCY_LEVELS,
  WEEKDAYS,
  type BankAccountInput,
  type EmergencyContactInput,
  type EmployeeRecordDetailsInput,
  type EmployeeRecordSection,
  type FamilyMemberInput,
  type NomineeInput,
  type PersonalDetailsInput,
  type Proficiency,
  type SkillInput,
  type Weekday,
  type WorkScheduleInput,
} from '../types/employeeProfile.types.js';

type Errors = Record<string, string>;
type Raw = Record<string, unknown>;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_REGEX = /^[A-Za-z0-9]{6,34}$/;
const MAX_REPEATABLE_ITEMS = 50;

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

function asObject(value: unknown, path: string, errors: Errors): Raw | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors[path] = 'Must be an object';
    return null;
  }
  return value as Raw;
}

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function text(
  raw: Raw,
  key: string,
  path: string,
  errors: Errors,
  { required = false, max = 255 }: { required?: boolean; max?: number } = {},
): string | null {
  const value = raw[key];
  if (isBlank(value)) {
    if (required) errors[`${path}.${key}`] = 'Required';
    return null;
  }
  if (typeof value !== 'string') {
    errors[`${path}.${key}`] = 'Must be a string';
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    errors[`${path}.${key}`] = `Must not exceed ${max} characters`;
    return null;
  }
  return trimmed;
}

function date(
  raw: Raw,
  key: string,
  path: string,
  errors: Errors,
  { notInFuture = false }: { notInFuture?: boolean } = {},
): string | null {
  const value = text(raw, key, path, errors, { max: 10 });
  if (value === null) return null;
  if (!isValidDate(value)) {
    errors[`${path}.${key}`] = 'Must be a valid date in YYYY-MM-DD format';
    return null;
  }
  if (notInFuture && value > new Date().toISOString().slice(0, 10)) {
    errors[`${path}.${key}`] = 'Cannot be in the future';
    return null;
  }
  return value;
}

function email(raw: Raw, key: string, path: string, errors: Errors): string | null {
  const value = text(raw, key, path, errors);
  if (value === null) return null;
  if (!EMAIL_REGEX.test(value)) {
    errors[`${path}.${key}`] = 'Invalid email format';
    return null;
  }
  return value.toLowerCase();
}

function integer(
  raw: Raw,
  key: string,
  path: string,
  errors: Errors,
  { required = false, min, max }: { required?: boolean; min: number; max: number },
): number | null {
  const value = raw[key];
  if (value === undefined || value === null || value === '') {
    if (required) errors[`${path}.${key}`] = 'Required';
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    errors[`${path}.${key}`] = `Must be a whole number between ${min} and ${max}`;
    return null;
  }
  return value;
}

function list(value: unknown, path: string, errors: Errors): Raw[] {
  if (!Array.isArray(value)) {
    errors[path] = 'Must be an array';
    return [];
  }
  if (value.length > MAX_REPEATABLE_ITEMS) {
    errors[path] = `Must not contain more than ${MAX_REPEATABLE_ITEMS} items`;
    return [];
  }
  return value
    .map((item, index) => asObject(item, `${path}[${index}]`, errors))
    .filter((item): item is Raw => item !== null);
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function personal(value: unknown, errors: Errors): PersonalDetailsInput | undefined {
  const raw = asObject(value, 'personal', errors);
  if (!raw) return undefined;
  const p = 'personal';
  return {
    middleName: text(raw, 'middleName', p, errors, { max: 100 }),
    preferredName: text(raw, 'preferredName', p, errors, { max: 100 }),
    gender: text(raw, 'gender', p, errors, { max: 50 }),
    dateOfBirth: date(raw, 'dateOfBirth', p, errors, { notInFuture: true }),
    maritalStatus: text(raw, 'maritalStatus', p, errors, { max: 50 }),
    bloodGroup: text(raw, 'bloodGroup', p, errors, { max: 10 }),
    nationality: text(raw, 'nationality', p, errors, { max: 100 }),
    nativeLanguage: text(raw, 'nativeLanguage', p, errors, { max: 100 }),
    fatherName: text(raw, 'fatherName', p, errors, { max: 200 }),
    guardianName: text(raw, 'guardianName', p, errors, { max: 200 }),
    personalEmail: email(raw, 'personalEmail', p, errors),
    homePhone: text(raw, 'homePhone', p, errors, { max: 50 }),
    businessPhone: text(raw, 'businessPhone', p, errors, { max: 50 }),
    workPhone: text(raw, 'workPhone', p, errors, { max: 50 }),
    addressStreet: text(raw, 'addressStreet', p, errors),
    addressCity: text(raw, 'addressCity', p, errors, { max: 100 }),
    addressDistrict: text(raw, 'addressDistrict', p, errors, { max: 100 }),
    addressState: text(raw, 'addressState', p, errors, { max: 100 }),
    addressPostalCode: text(raw, 'addressPostalCode', p, errors, { max: 20 }),
    addressCountry: text(raw, 'addressCountry', p, errors, { max: 100 }),
  };
}

function familyMembers(value: unknown, errors: Errors): FamilyMemberInput[] {
  return list(value, 'familyMembers', errors).map((raw, i) => {
    const p = `familyMembers[${i}]`;
    return {
      name: text(raw, 'name', p, errors, { required: true, max: 200 })!,
      relationship: text(raw, 'relationship', p, errors, { required: true, max: 50 })!,
      dateOfBirth: date(raw, 'dateOfBirth', p, errors, { notInFuture: true }),
      phone: text(raw, 'phone', p, errors, { max: 50 }),
    };
  });
}

function nominees(value: unknown, errors: Errors): NomineeInput[] {
  const items = list(value, 'nominees', errors).map((raw, i) => {
    const p = `nominees[${i}]`;
    return {
      name: text(raw, 'name', p, errors, { required: true, max: 200 })!,
      relationship: text(raw, 'relationship', p, errors, { required: true, max: 50 })!,
      sharePercentage: integer(raw, 'sharePercentage', p, errors, {
        required: true,
        min: 1,
        max: 100,
      })!,
    };
  });
  const total = items.reduce((sum, item) => sum + (item.sharePercentage ?? 0), 0);
  if (total > 100) errors.nominees = 'Nominee shares must not total more than 100%';
  return items;
}

function emergencyContacts(value: unknown, errors: Errors): EmergencyContactInput[] {
  const items = list(value, 'emergencyContacts', errors).map((raw, i) => {
    const p = `emergencyContacts[${i}]`;
    const priority = raw.priority;
    if (priority !== 'primary' && priority !== 'secondary') {
      errors[`${p}.priority`] = "Must be 'primary' or 'secondary'";
    }
    if (raw.isPrivate !== undefined && typeof raw.isPrivate !== 'boolean') {
      errors[`${p}.isPrivate`] = 'Must be a boolean';
    }
    return {
      priority: priority as EmergencyContactInput['priority'],
      name: text(raw, 'name', p, errors, { required: true, max: 200 })!,
      relationship: text(raw, 'relationship', p, errors, { required: true, max: 50 })!,
      phone: text(raw, 'phone', p, errors, { required: true, max: 50 })!,
      email: email(raw, 'email', p, errors),
      address: text(raw, 'address', p, errors, { max: 500 }),
      isPrivate: raw.isPrivate === true,
    };
  });

  const priorities = items.map((item) => item.priority);
  if (new Set(priorities).size !== priorities.length) {
    errors.emergencyContacts = 'At most one primary and one secondary contact are allowed';
  } else if (items.length > 0 && !priorities.includes('primary')) {
    errors.emergencyContacts = 'A primary emergency contact is required';
  }
  return items;
}

function bankAccount(value: unknown, errors: Errors): BankAccountInput | undefined {
  const raw = asObject(value, 'bankAccount', errors);
  if (!raw) return undefined;
  const p = 'bankAccount';
  const accountNumber = text(raw, 'accountNumber', p, errors, { required: true, max: 34 });
  if (accountNumber && !ACCOUNT_NUMBER_REGEX.test(accountNumber)) {
    errors[`${p}.accountNumber`] = 'Must be 6–34 letters or digits';
  }
  const ifsc = text(raw, 'ifscCode', p, errors, { required: true, max: 11 })?.toUpperCase();
  if (ifsc && !IFSC_REGEX.test(ifsc)) {
    errors[`${p}.ifscCode`] = 'Must be a valid 11-character IFSC code';
  }
  return {
    accountHolderName: text(raw, 'accountHolderName', p, errors, { required: true, max: 200 })!,
    accountNumber: accountNumber!,
    ifscCode: ifsc!,
    bankName: text(raw, 'bankName', p, errors, { required: true, max: 200 })!,
    branchName: text(raw, 'branchName', p, errors, { max: 200 }),
    bankLocation: text(raw, 'bankLocation', p, errors, { max: 200 }),
  };
}

function skills(value: unknown, errors: Errors): SkillInput[] {
  return list(value, 'skills', errors).map((raw, i) => {
    const p = `skills[${i}]`;
    const proficiency = raw.proficiency;
    if (!PROFICIENCY_LEVELS.includes(proficiency as Proficiency)) {
      errors[`${p}.proficiency`] = `Must be one of: ${PROFICIENCY_LEVELS.join(', ')}`;
    }
    return {
      skillName: text(raw, 'skillName', p, errors, { required: true, max: 200 })!,
      skillType: text(raw, 'skillType', p, errors, { required: true, max: 50 })!,
      proficiency: proficiency as Proficiency,
      level: text(raw, 'level', p, errors, { max: 50 }),
      assessedOn: date(raw, 'assessedOn', p, errors),
      yearsOfExperience: integer(raw, 'yearsOfExperience', p, errors, { min: 0, max: 60 }),
      examinerEmployeeId: text(raw, 'examinerEmployeeId', p, errors, { max: 64 }),
      verifiedByEmployeeId: text(raw, 'verifiedByEmployeeId', p, errors, { max: 64 }),
      mentorEmployeeId: text(raw, 'mentorEmployeeId', p, errors, { max: 64 }),
    };
  });
}

function workSchedule(value: unknown, errors: Errors): WorkScheduleInput | undefined {
  const raw = asObject(value, 'workSchedule', errors);
  if (!raw) return undefined;
  const p = 'workSchedule';

  let workingDays: Weekday[] = [];
  if (
    !Array.isArray(raw.workingDays) ||
    raw.workingDays.length === 0 ||
    raw.workingDays.some((day) => !WEEKDAYS.includes(day as Weekday)) ||
    new Set(raw.workingDays).size !== raw.workingDays.length
  ) {
    errors[`${p}.workingDays`] =
      `Must be a non-empty list of distinct days: ${WEEKDAYS.join(', ')}`;
  } else {
    // Stored in calendar order regardless of input order.
    workingDays = WEEKDAYS.filter((day) => (raw.workingDays as string[]).includes(day));
  }

  const startTime = text(raw, 'startTime', p, errors, { required: true, max: 5 });
  const endTime = text(raw, 'endTime', p, errors, { required: true, max: 5 });
  if (startTime && !TIME_REGEX.test(startTime)) errors[`${p}.startTime`] = 'Must be HH:MM';
  if (endTime && !TIME_REGEX.test(endTime)) errors[`${p}.endTime`] = 'Must be HH:MM';
  if (startTime && endTime && startTime === endTime) {
    errors[`${p}.endTime`] = 'End time must differ from start time';
  }

  return {
    workingCalendar: text(raw, 'workingCalendar', p, errors, { max: 100 }),
    workSchedule: text(raw, 'workSchedule', p, errors, { max: 100 }),
    workingDays,
    startTime: startTime!,
    endTime: endTime!,
    breakMinutes: integer(raw, 'breakMinutes', p, errors, { min: 0, max: 240 }) ?? 0,
    lunchMinutes: integer(raw, 'lunchMinutes', p, errors, { min: 0, max: 240 }) ?? 0,
    timeZone: text(raw, 'timeZone', p, errors, { max: 64 }),
  };
}

const SECTION_VALIDATORS: {
  [K in EmployeeRecordSection]: (value: unknown, errors: Errors) => EmployeeRecordDetailsInput[K];
} = {
  personal,
  familyMembers,
  nominees,
  emergencyContacts,
  bankAccount,
  skills,
  workSchedule,
};

/**
 * Validates employee record details. Unknown keys are rejected — in
 * particular onboarding-only data (tasks, review, assets, online access,
 * documents, compensation) can never enter the employee master record.
 */
export function validateEmployeeRecordDetails(input: unknown): EmployeeRecordDetailsInput {
  if (input === undefined || input === null) return {};
  const errors: Errors = {};
  const raw = asObject(input, 'details', errors);
  if (!raw) throw new ValidationError('Validation failed for employee details', errors);

  const result: EmployeeRecordDetailsInput = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!EMPLOYEE_RECORD_SECTIONS.includes(key as EmployeeRecordSection)) {
      errors[`details.${key}`] =
        `'${key}' is not part of the employee record. Allowed: ${EMPLOYEE_RECORD_SECTIONS.join(', ')}`;
      continue;
    }
    const section = key as EmployeeRecordSection;
    (result as Record<string, unknown>)[section] = SECTION_VALIDATORS[section](value, errors);
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for employee details', errors);
  }
  return result;
}

/** Validates one section body for a PUT sub-resource. */
export function validateEmployeeRecordSection<K extends EmployeeRecordSection>(
  section: K,
  input: unknown,
): NonNullable<EmployeeRecordDetailsInput[K]> {
  const details = validateEmployeeRecordDetails({ [section]: input });
  return details[section] as NonNullable<EmployeeRecordDetailsInput[K]>;
}
