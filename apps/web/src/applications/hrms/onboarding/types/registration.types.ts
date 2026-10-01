import type { CreateEmployeeRequest } from '../../employees/api/employeesApi';
import type { ReviewSectionData } from '../components/ReviewSection';
import type { OrganizationMasters } from '../api/onboardingApi';

export interface Chapter01GeneralState {
  employeeId: string;
  employmentType: string;
  employmentStatus: string;
  department: string;
  team: string;
  designation: string;
  gradeLevel: string;
  reportingManager: string | null;
  organisationUnit: string;
  officeLocation: string;
  joiningDate: string;
  confirmedJoiningDate: string;
  endDate: string;
  sourceOfHire: string;
  referralId: string;
  referredByEmployeeId: string | null;
  probationPeriod: string;
  noticePeriod: string;
}

export interface FamilyMemberItem {
  id: string;
  name: string;
  relationship: string;
  dob: string;
  phone?: string;
  dependent?: boolean;
}

export interface ParentGuardianItem {
  id: string;
  relationship: string;
  name: string;
}

export interface NomineeItem {
  id: string;
  nomineeName: string;
  relationship: string;
  percentage: number;
  isMinor?: boolean;
}

export interface Chapter02PersonalState {
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  gender: string;
  dob: string;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  nativeLanguage: string;
  personalEmail: string;
  mobilePhone: string;
  currentStreet: string;
  currentAddressLine2?: string;
  currentCity: string;
  currentDistrict?: string;
  currentState: string;
  currentPin: string;
  currentCountry: string;
  isPermanentSameAsCurrent: boolean;
  permanentStreet: string;
  permanentAddressLine2?: string;
  permanentCity: string;
  permanentDistrict?: string;
  permanentState: string;
  permanentPin: string;
  permanentCountry: string;
  familyMembers: FamilyMemberItem[];
  parentGuardians: ParentGuardianItem[];
  nominationDetails: NomineeItem[];
}

export interface Chapter03OnboardingState {
  tasks: Array<{
    id: string;
    taskName: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
  }>;
  assets: Array<{
    id: string;
    assetName: string;
    quantity: number | '';
    issueDate: string;
    category?: string;
    serialNumber?: string;
  }>;
}

export interface Chapter04SkillsState {
  skills: Array<{
    id: string;
    skillName: string;
    skillType: string;
    proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    level?: string;
    assessedOn?: string;
    yearsOfExperience?: number;
    examinerEmployeeId?: string;
    verifiedByEmployeeId?: string;
    mentorEmployeeId?: string;
  }>;
}

export interface Chapter05EmergencyState {
  primaryContact: {
    name: string;
    relationship: string;
    phone: string;
    altPhone?: string;
    email?: string;
    address?: string;
    isPrivate?: boolean;
  } | null;
  secondaryContact: {
    name: string;
    relationship: string;
    phone: string;
    altPhone?: string;
    email?: string;
    address?: string;
  } | null;
}

export interface Chapter06AccountsState {
  bankAccount: {
    accountHolderName: string;
    accountNumber: string;
    reEnterAccountNumber?: string;
    ifscCode: string;
    bankName: string;
    branchName?: string;
    bankLocation?: string;
  } | null;
  salaryDetails?: {
    annualCtc?: number;
    monthlyBasic?: number;
    hra?: number;
    specialAllowance?: number;
    grossSalary?: number;
    employerPf?: number;
    gratuity?: number;
    salaryStructure?: string;
    payGrade?: string;
    payrollGroup?: string;
    salaryEffectiveDate?: string;
    paymentFrequency?: string;
  } | null;
  statutoryDetails?: {
    pfApplicable?: boolean;
    esiApplicable?: boolean;
    ptApplicable?: boolean;
    taxRegime?: string;
  } | null;
}

export interface Chapter07OnlineAccessState {
  username: string;
  officialEmail: string;
  mfaRequired: boolean;
  forcePasswordSetup: boolean;
  accountActive: boolean;
}

export interface Chapter08WorkingHoursState {
  workSchedule: string;
  workingCalendar: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
  lunchMinutes: number;
  timeZone: string;
}

export interface Chapter09DocumentsState {
  isExperiencedHire: boolean;
  passportPhoto: {
    file?: File | null;
    fileName: string;
    previewUrl?: string;
    status: 'Pending' | 'Verified' | 'Rejected' | 'Not Required';
  } | null;
  items: Array<{
    id: string;
    category: string;
    name: string;
    isRequired: boolean;
    docNumber: string;
    fileName?: string;
    filePreviewUrl?: string;
    status: 'Pending' | 'Verified' | 'Rejected' | 'Not Required';
    remarks?: string;
  }>;
}

export interface RegistrationFormData {
  general: Chapter01GeneralState;
  personal: Chapter02PersonalState;
  onboarding: Chapter03OnboardingState;
  skills: Chapter04SkillsState;
  emergency: Chapter05EmergencyState;
  accounts: Chapter06AccountsState;
  onlineAccess: Chapter07OnlineAccessState;
  workingHours: Chapter08WorkingHoursState;
  documents: Chapter09DocumentsState;
}

export const INITIAL_REGISTRATION_DATA: RegistrationFormData = {
  general: {
    employeeId: '',
    employmentType: 'full_time',
    employmentStatus: 'pending_activation',
    department: 'Engineering',
    team: 'Product Development',
    designation: 'Software Engineer',
    gradeLevel: 'L2 - Mid Level',
    reportingManager: null,
    organisationUnit: 'Technology',
    officeLocation: 'Chennai - Main Office',
    joiningDate: '2026-04-01',
    confirmedJoiningDate: '2026-07-01',
    endDate: '',
    sourceOfHire: 'direct_applicant',
    referralId: '',
    referredByEmployeeId: null,
    probationPeriod: '6_months',
    noticePeriod: '30_days',
  },
  personal: {
    firstName: '',
    middleName: '',
    lastName: '',
    preferredName: '',
    gender: 'Male',
    dob: '',
    maritalStatus: 'Single',
    bloodGroup: 'O+',
    nationality: 'Indian',
    nativeLanguage: 'English',
    personalEmail: '',
    mobilePhone: '',
    currentStreet: '',
    currentAddressLine2: '',
    currentCity: '',
    currentDistrict: '',
    currentState: '',
    currentPin: '',
    currentCountry: 'India',
    isPermanentSameAsCurrent: true,
    permanentStreet: '',
    permanentAddressLine2: '',
    permanentCity: '',
    permanentDistrict: '',
    permanentState: '',
    permanentPin: '',
    permanentCountry: 'India',
    familyMembers: [],
    parentGuardians: [],
    nominationDetails: [],
  },
  onboarding: {
    tasks: [],
    assets: [],
  },
  skills: {
    skills: [],
  },
  emergency: {
    primaryContact: null,
    secondaryContact: null,
  },
  accounts: {
    bankAccount: null,
    salaryDetails: null,
    statutoryDetails: null,
  },
  onlineAccess: {
    username: '',
    officialEmail: '',
    mfaRequired: true,
    forcePasswordSetup: true,
    accountActive: true,
  },
  workingHours: {
    workSchedule: 'Standard General Shift (9:00 AM – 6:00 PM)',
    workingCalendar: 'India Corporate Calendar 2026',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 15,
    lunchMinutes: 45,
    timeZone: 'Asia/Kolkata (IST, UTC+5:30)',
  },
  documents: {
    isExperiencedHire: true,
    passportPhoto: null,
    items: [],
  },
};

/**
 * Maps the authoritative registration form state into the Review section view model.
 * Zero hardcoded or fake names: if unconfigured, shows empty/unassigned.
 */
export function toReviewSectionData(formData: RegistrationFormData): ReviewSectionData {
  const g = formData.general;
  const p = formData.personal;
  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || p.preferredName || '';

  return {
    general: {
      employeeId: g.employeeId,
      employmentType: g.employmentType.replace('_', ' ').toUpperCase(),
      employmentStatus: g.employmentStatus.replace('_', ' ').toUpperCase(),
      department: g.department,
      team: g.team,
      designation: g.designation,
      gradeLevel: g.gradeLevel,
      reportingManager: g.reportingManager,
      organisationUnit: g.organisationUnit,
      officeLocation: g.officeLocation,
      joiningDate: g.joiningDate,
      confirmedJoiningDate: g.confirmedJoiningDate,
      endDate: g.endDate,
      sourceOfHire: g.sourceOfHire.replace('_', ' ').toUpperCase(),
      probationPeriod: g.probationPeriod.replace('_', ' '),
      noticePeriod: g.noticePeriod.replace('_', ' '),
    },
    personal: {
      fullName,
      gender: p.gender || '—',
      dob: p.dob || '—',
      maritalStatus: p.maritalStatus || '—',
      nationality: p.nationality || '—',
      bloodGroup: p.bloodGroup || '—',
      differentlyAbled: '—',
      aadhaarNumber: '—',
      panNumber: '—',
      personalEmail: p.personalEmail,
      mobilePhone: p.mobilePhone,
      emergencyPhone: formData.emergency.primaryContact?.phone || '—',
      currentStreet: p.currentStreet,
      currentCity: p.currentCity,
      currentState: p.currentState,
      currentPin: p.currentPin,
      currentCountry: p.currentCountry,
      permanentStreet: p.isPermanentSameAsCurrent ? p.currentStreet : p.permanentStreet,
      permanentCity: p.isPermanentSameAsCurrent ? p.currentCity : p.permanentCity,
      permanentState: p.isPermanentSameAsCurrent ? p.currentState : p.permanentState,
      permanentPin: p.isPermanentSameAsCurrent ? p.currentPin : p.permanentPin,
      permanentCountry: p.isPermanentSameAsCurrent ? p.currentCountry : p.permanentCountry,
      familyMembers: p.familyMembers.map((fam) => ({
        id: fam.id,
        name: fam.name,
        relationship: fam.relationship,
        dob: fam.dob,
        dependent: Boolean(fam.dependent),
      })),
      nominationDetails: p.nominationDetails.map((nom) => ({
        id: nom.id,
        nomineeName: nom.nomineeName,
        relationship: nom.relationship,
        percentage: Number(nom.percentage) || 0,
        isMinor: Boolean(nom.isMinor),
      })),
    },
    onboarding: {
      tasks: formData.onboarding.tasks.map((t) => ({
        id: t.id,
        taskDescription: t.taskName || t.description,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
        status: t.status,
      })),
      assets: formData.onboarding.assets.map((a) => ({
        id: a.id,
        assetName: a.assetName,
        category: a.category || 'Hardware',
        serialNumber: a.serialNumber || '—',
        issueDate: a.issueDate,
        quantity: Number(a.quantity) || 1,
      })),
    },
    skills: formData.skills.skills.map((s) => ({
      id: s.id,
      skill: s.skillName,
      skillType: s.skillType,
      levelType: s.proficiency,
      level: s.level || '—',
      levelDate: s.assessedOn || '—',
      yearsExperience: s.yearsOfExperience || 0,
      examiner: s.examinerEmployeeId || '—',
      verifiedBy: s.verifiedByEmployeeId || '—',
      mentor: s.mentorEmployeeId || '—',
    })),
    emergency: {
      primaryContact: formData.emergency.primaryContact
        ? {
            name: formData.emergency.primaryContact.name,
            relationship: formData.emergency.primaryContact.relationship,
            phone: formData.emergency.primaryContact.phone,
            altPhone: formData.emergency.primaryContact.altPhone || '',
            email: formData.emergency.primaryContact.email || '',
            address: formData.emergency.primaryContact.address || '',
          }
        : null,
      secondaryContact: formData.emergency.secondaryContact
        ? {
            name: formData.emergency.secondaryContact.name,
            relationship: formData.emergency.secondaryContact.relationship,
            phone: formData.emergency.secondaryContact.phone,
            altPhone: formData.emergency.secondaryContact.altPhone || '',
            email: formData.emergency.secondaryContact.email || '',
            address: formData.emergency.secondaryContact.address || '',
          }
        : null,
    },
    accounts: formData.accounts.bankAccount
      ? {
          ifscCode: formData.accounts.bankAccount.ifscCode,
          bankName: formData.accounts.bankAccount.bankName,
          branchName: formData.accounts.bankAccount.branchName,
          accountHolderName: formData.accounts.bankAccount.accountHolderName,
          accountNumber: formData.accounts.bankAccount.accountNumber,
          reEnterAccountNumber: formData.accounts.bankAccount.reEnterAccountNumber,
        }
      : null,
    onlineAccess: {
      username: formData.onlineAccess.username,
      officialEmail: formData.onlineAccess.officialEmail,
      mfaRequired: formData.onlineAccess.mfaRequired,
      forcePasswordSetup: formData.onlineAccess.forcePasswordSetup,
      accountActive: formData.onlineAccess.accountActive,
    },
    workingHours: {
      workSchedule: formData.workingHours.workSchedule,
      assignedCalendar: formData.workingHours.workingCalendar,
      workingDays: formData.workingHours.workingDays,
      startTime: formData.workingHours.startTime,
      endTime: formData.workingHours.endTime,
      timeZone: formData.workingHours.timeZone,
      breakMinutes: formData.workingHours.breakMinutes,
      lunchMinutes: formData.workingHours.lunchMinutes,
    },
    documents: {
      isExperiencedHire: formData.documents.isExperiencedHire,
      passportPhoto: formData.documents.passportPhoto,
      items: formData.documents.items,
    },
  };
}

/**
 * Builds the CreateEmployeeRequest payload for POST /api/v1/hrms/employees.
 * ONLY includes backend-supported fields and record details.
 */
export function buildCreateEmployeePayload(
  formData: RegistrationFormData,
  masters?: OrganizationMasters | null,
): CreateEmployeeRequest {
  const g = formData.general;
  const p = formData.personal;

  // Resolve department, designation, and location IDs from masters if possible
  const deptMatch = masters?.departments.find(
    (d) => d.id === g.department || d.name.toLowerCase() === g.department.toLowerCase(),
  );
  const desigMatch = masters?.designations.find(
    (d) => d.id === g.designation || d.name.toLowerCase() === g.designation.toLowerCase(),
  );
  const locMatch = masters?.locations.find(
    (l) => l.id === g.officeLocation || l.name.toLowerCase() === g.officeLocation.toLowerCase(),
  );

  // Parse notice period integer if available
  const noticeMatch = g.noticePeriod.match(/(\d+)/);
  const noticePeriodDays = noticeMatch ? parseInt(noticeMatch[1] ?? '30', 10) : undefined;

  const email = (formData.onlineAccess.officialEmail || p.personalEmail || `${(p.firstName || 'emp').toLowerCase()}@company.local`).trim();

  const details: NonNullable<CreateEmployeeRequest['details']> = {};

  // 1. Personal details
  if (p.firstName) {
    details.personal = {
      middleName: p.middleName.trim() || undefined,
      preferredName: p.preferredName.trim() || undefined,
      gender: p.gender || undefined,
      dateOfBirth: p.dob || undefined,
      maritalStatus: p.maritalStatus || undefined,
      bloodGroup: p.bloodGroup || undefined,
      nationality: p.nationality || undefined,
      nativeLanguage: p.nativeLanguage || undefined,
      personalEmail: p.personalEmail.trim() || undefined,
      addressStreet: p.currentStreet.trim() || undefined,
      addressLine2: p.currentAddressLine2?.trim() || undefined,
      addressCity: p.currentCity.trim() || undefined,
      addressDistrict: p.currentDistrict?.trim() || undefined,
      addressState: p.currentState.trim() || undefined,
      addressPostalCode: p.currentPin.trim() || undefined,
      addressCountry: p.currentCountry.trim() || undefined,
      isPermanentSameAsCurrent: p.isPermanentSameAsCurrent,
      permanentAddressStreet: p.isPermanentSameAsCurrent
        ? p.currentStreet.trim() || undefined
        : p.permanentStreet.trim() || undefined,
      permanentAddressLine2: p.isPermanentSameAsCurrent
        ? p.currentAddressLine2?.trim() || undefined
        : p.permanentAddressLine2?.trim() || undefined,
      permanentAddressCity: p.isPermanentSameAsCurrent
        ? p.currentCity.trim() || undefined
        : p.permanentCity.trim() || undefined,
      permanentAddressDistrict: p.isPermanentSameAsCurrent
        ? p.currentDistrict?.trim() || undefined
        : p.permanentDistrict?.trim() || undefined,
      permanentAddressState: p.isPermanentSameAsCurrent
        ? p.currentState.trim() || undefined
        : p.permanentState.trim() || undefined,
      permanentAddressPostalCode: p.isPermanentSameAsCurrent
        ? p.currentPin.trim() || undefined
        : p.permanentPin.trim() || undefined,
      permanentAddressCountry: p.isPermanentSameAsCurrent
        ? p.currentCountry.trim() || undefined
        : p.permanentCountry.trim() || undefined,
    };
  }

  // 2. Family members
  if (p.familyMembers.length > 0) {
    details.familyMembers = p.familyMembers.map((fam) => ({
      name: fam.name,
      relationship: fam.relationship,
      dateOfBirth: fam.dob || null,
      phone: fam.phone || null,
    }));
  }

  // 3. Parent guardians
  if (p.parentGuardians.length > 0) {
    details.parentGuardians = p.parentGuardians.map((pg) => ({
      name: pg.name,
      relationship: pg.relationship,
    }));
  }

  // 4. Nominees
  if (p.nominationDetails.length > 0) {
    details.nominees = p.nominationDetails.map((nom) => ({
      name: nom.nomineeName,
      relationship: nom.relationship,
      sharePercentage: Number(nom.percentage) || 0,
    }));
  }

  // 5. Emergency contacts
  if (formData.emergency.primaryContact?.name && formData.emergency.primaryContact?.phone) {
    details.emergencyContacts = [
      {
        priority: 'primary',
        name: formData.emergency.primaryContact.name,
        relationship: formData.emergency.primaryContact.relationship || 'Emergency Contact',
        phone: formData.emergency.primaryContact.phone,
        email: formData.emergency.primaryContact.email || null,
        address: formData.emergency.primaryContact.address || null,
        isPrivate: formData.emergency.primaryContact.isPrivate ?? false,
      },
    ];
    if (formData.emergency.secondaryContact?.name && formData.emergency.secondaryContact?.phone) {
      details.emergencyContacts.push({
        priority: 'secondary',
        name: formData.emergency.secondaryContact.name,
        relationship: formData.emergency.secondaryContact.relationship || 'Emergency Contact',
        phone: formData.emergency.secondaryContact.phone,
        email: formData.emergency.secondaryContact.email || null,
        address: formData.emergency.secondaryContact.address || null,
        isPrivate: false,
      });
    }
  }

  // 6. Bank account
  if (formData.accounts.bankAccount?.accountNumber && formData.accounts.bankAccount?.ifscCode) {
    details.bankAccount = {
      accountHolderName:
        formData.accounts.bankAccount.accountHolderName ||
        `${p.firstName} ${p.lastName}`.trim() ||
        'Employee',
      accountNumber: formData.accounts.bankAccount.accountNumber,
      ifscCode: formData.accounts.bankAccount.ifscCode,
      bankName: formData.accounts.bankAccount.bankName,
      branchName: formData.accounts.bankAccount.branchName || null,
      bankLocation: formData.accounts.bankAccount.bankLocation || null,
    };
  }

  // 7. Skills
  if (formData.skills.skills.length > 0) {
    details.skills = formData.skills.skills.map((s) => ({
      skillName: s.skillName,
      skillType: s.skillType,
      proficiency: s.proficiency,
      level: s.level || null,
      assessedOn: s.assessedOn || null,
      yearsOfExperience: s.yearsOfExperience || null,
      examinerEmployeeId: s.examinerEmployeeId || null,
      verifiedByEmployeeId: s.verifiedByEmployeeId || null,
      mentorEmployeeId: s.mentorEmployeeId || null,
    }));
  }

  // 8. Work schedule
  if (
    formData.workingHours.startTime &&
    formData.workingHours.endTime &&
    formData.workingHours.workingDays.length > 0
  ) {
    details.workSchedule = {
      workingCalendar: formData.workingHours.workingCalendar || null,
      workSchedule: formData.workingHours.workSchedule || null,
      workingDays: formData.workingHours.workingDays,
      startTime: formData.workingHours.startTime,
      endTime: formData.workingHours.endTime,
      breakMinutes: formData.workingHours.breakMinutes || 0,
      lunchMinutes: formData.workingHours.lunchMinutes || 0,
      timeZone: formData.workingHours.timeZone || null,
    };
  }

  return {
    employeeNumber: g.employeeId.trim() || null,
    firstName: p.firstName.trim() || 'Pending',
    lastName: p.lastName.trim() || null,
    email,
    phone: p.mobilePhone.trim() || null,
    joiningDate: g.joiningDate || new Date().toISOString().slice(0, 10),
    confirmedJoiningDate: g.confirmedJoiningDate || null,
    departmentId: deptMatch?.id || null,
    designationId: desigMatch?.id || null,
    locationId: locMatch?.id || null,
    employmentType: (g.employmentType as any) || 'full_time',
    employmentStatus: (g.employmentStatus as any) || 'pending_activation',
    reportingManagerId: g.reportingManager || null,
    sourceOfHire: (g.sourceOfHire as any) || 'direct_applicant',
    referralCode: g.referralId.trim() || null,
    referredByEmployeeId: g.referredByEmployeeId || null,
    noticePeriodDays: noticePeriodDays ?? null,
    contractEndDate: g.endDate || null,
    ...(Object.keys(details).length > 0 ? { details } : {}),
  };
}
