import type { EmployeeDetails } from './employee.types.js';

/**
 * Employee record details — the employee's CURRENT canonical HR record
 * beyond core employment fields. Field set mirrors what Employee
 * Registration actually collects (Personal, Emergency Contact, Accounts →
 * bank, Skills, Working Hours). Onboarding tasks, review state, payroll
 * compensation, documents, assets and online access are not part of it.
 */

export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export type Proficiency = (typeof PROFICIENCY_LEVELS)[number];

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface PersonalDetailsInput {
  middleName: string | null;
  preferredName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  bloodGroup: string | null;
  nationality: string | null;
  nativeLanguage: string | null;
  fatherName: string | null;
  guardianName: string | null;
  personalEmail: string | null;
  homePhone: string | null;
  businessPhone: string | null;
  workPhone: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressDistrict: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
}

export interface FamilyMemberInput {
  name: string;
  relationship: string;
  dateOfBirth: string | null;
  phone: string | null;
}

export interface NomineeInput {
  name: string;
  relationship: string;
  sharePercentage: number;
}

export interface EmergencyContactInput {
  priority: 'primary' | 'secondary';
  name: string;
  relationship: string;
  phone: string;
  email: string | null;
  address: string | null;
  isPrivate: boolean;
}

export interface BankAccountInput {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string | null;
  bankLocation: string | null;
}

export interface SkillInput {
  skillName: string;
  skillType: string;
  proficiency: Proficiency;
  level: string | null;
  assessedOn: string | null;
  yearsOfExperience: number | null;
  examinerEmployeeId: string | null;
  verifiedByEmployeeId: string | null;
  mentorEmployeeId: string | null;
}

export interface WorkScheduleInput {
  workingCalendar: string | null;
  workSchedule: string | null;
  workingDays: Weekday[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
  lunchMinutes: number;
  timeZone: string | null;
}

/** Detail sections an employee record can carry (create payload and PUT sub-resources). */
export interface EmployeeRecordDetailsInput {
  personal?: PersonalDetailsInput;
  familyMembers?: FamilyMemberInput[];
  nominees?: NomineeInput[];
  emergencyContacts?: EmergencyContactInput[];
  bankAccount?: BankAccountInput;
  skills?: SkillInput[];
  workSchedule?: WorkScheduleInput;
}

export type EmployeeRecordSection = keyof EmployeeRecordDetailsInput;

export const EMPLOYEE_RECORD_SECTIONS: EmployeeRecordSection[] = [
  'personal',
  'familyMembers',
  'nominees',
  'emergencyContacts',
  'bankAccount',
  'skills',
  'workSchedule',
];

// ---------------------------------------------------------------------------
// Read model
// ---------------------------------------------------------------------------

export type PersonalDetails = PersonalDetailsInput;

export interface FamilyMember extends FamilyMemberInput {
  id: string;
}

export interface Nominee extends NomineeInput {
  id: string;
}

export interface EmergencyContact extends EmergencyContactInput {
  id: string;
}

/** Bank account as exposed by the API — the full account number is never returned. */
export interface BankAccountView {
  accountHolderName: string;
  accountNumberMasked: string;
  ifscCode: string;
  bankName: string;
  branchName: string | null;
  bankLocation: string | null;
}

export interface Skill extends SkillInput {
  id: string;
  examinerName: string | null;
  verifiedByName: string | null;
  mentorName: string | null;
}

export type WorkSchedule = WorkScheduleInput;

export interface EmployeeProfile {
  employee: EmployeeDetails;
  personal: PersonalDetails | null;
  familyMembers: FamilyMember[];
  nominees: Nominee[];
  emergencyContacts: EmergencyContact[];
  bankAccount: BankAccountView | null;
  skills: Skill[];
  workSchedule: WorkSchedule | null;
}
