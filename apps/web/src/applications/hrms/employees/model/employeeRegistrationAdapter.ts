import type { EmployeeProfile } from '../api/employeesApi';
import {
  INITIAL_REGISTRATION_DATA,
  type RegistrationFormData,
} from '../../onboarding/types/registration.types';
import { updateEmployee, updateEmployeeSection } from '../api/employeesApi';

/**
 * Transforms a loaded canonical EmployeeProfile into full RegistrationFormData
 * for the 10-chapter Employee Editor.
 */
export function profileToRegistrationData(profile: EmployeeProfile): RegistrationFormData {
  const {
    employee,
    personal,
    familyMembers,
    nominees,
    emergencyContacts,
    bankAccount,
    skills,
    workSchedule,
  } = profile;

  const base: RegistrationFormData = JSON.parse(JSON.stringify(INITIAL_REGISTRATION_DATA));

  // 1. General Chapter
  base.general.employeeId = employee.employeeNumber || employee.id;
  base.general.employmentType = employee.employmentType || 'full_time';
  base.general.employmentStatus = employee.employmentStatus || 'active';
  base.general.department = employee.departmentName || 'Engineering';
  base.general.designation = employee.designationName || 'Software Engineer';
  base.general.reportingManager = employee.reportingManagerName || null;
  base.general.officeLocation = employee.locationName || 'Chennai - Main Office';
  base.general.joiningDate = employee.joiningDate || '';
  base.general.confirmedJoiningDate = employee.confirmationDate || '';
  base.general.endDate = employee.contractEndDate || '';
  base.general.sourceOfHire = employee.sourceOfHire || 'direct_applicant';
  base.general.noticePeriod = employee.noticePeriodDays
    ? `${employee.noticePeriodDays}_days`
    : '30_days';

  // 2. Personal Chapter
  base.personal.firstName = employee.firstName || '';
  base.personal.lastName = employee.lastName || '';
  base.personal.mobilePhone = employee.phone || personal?.workPhone || '';

  if (personal) {
    base.personal.middleName = personal.middleName || '';
    base.personal.preferredName = personal.preferredName || '';
    base.personal.gender = personal.gender || 'Male';
    base.personal.dob = personal.dateOfBirth || '';
    base.personal.maritalStatus = personal.maritalStatus || 'Single';
    base.personal.bloodGroup = personal.bloodGroup || 'O+';
    base.personal.nationality = personal.nationality || 'Indian';
    base.personal.nativeLanguage = personal.nativeLanguage || 'English';
    base.personal.personalEmail = personal.personalEmail || '';
    if (personal.workPhone) {
      base.personal.mobilePhone = personal.workPhone;
    }

    // Current address
    base.personal.currentStreet = personal.addressStreet || '';
    base.personal.currentAddressLine2 = personal.addressLine2 || '';
    base.personal.currentCity = personal.addressCity || '';
    base.personal.currentDistrict = personal.addressDistrict || '';
    base.personal.currentState = personal.addressState || '';
    base.personal.currentPin = personal.addressPostalCode || '';
    base.personal.currentCountry = personal.addressCountry || 'India';

    // Permanent address
    base.personal.isPermanentSameAsCurrent = personal.isPermanentSameAsCurrent ?? true;
    base.personal.permanentStreet = personal.permanentAddressStreet || '';
    base.personal.permanentAddressLine2 = personal.permanentAddressLine2 || '';
    base.personal.permanentCity = personal.permanentAddressCity || '';
    base.personal.permanentDistrict = personal.permanentAddressDistrict || '';
    base.personal.permanentState = personal.permanentAddressState || '';
    base.personal.permanentPin = personal.permanentAddressPostalCode || '';
    base.personal.permanentCountry = personal.permanentAddressCountry || 'India';

    base.personal.parentGuardians = [];
    if (personal.fatherName) {
      base.personal.parentGuardians.push({
        id: 'father',
        relationship: 'Father',
        name: personal.fatherName,
      });
    }
    if (personal.guardianName) {
      base.personal.parentGuardians.push({
        id: 'guardian',
        relationship: 'Guardian',
        name: personal.guardianName,
      });
    }
  }

  // Fallback to top-level parentGuardians if personal didn't set them
  if (
    (!base.personal.parentGuardians || base.personal.parentGuardians.length === 0) &&
    profile.parentGuardians &&
    profile.parentGuardians.length > 0
  ) {
    base.personal.parentGuardians = profile.parentGuardians.map((pg) => ({
      id: pg.id,
      relationship: pg.relationship,
      name: pg.name,
    }));
  }

  // Family members
  if (familyMembers && familyMembers.length > 0) {
    base.personal.familyMembers = familyMembers.map((fm) => ({
      id: fm.id,
      name: fm.name,
      relationship: fm.relationship,
      dob: fm.dateOfBirth || '',
      phone: fm.phone || '',
    }));
  }

  // Nominees
  if (nominees && nominees.length > 0) {
    base.personal.nominationDetails = nominees.map((n) => ({
      id: n.id,
      nomineeName: n.name,
      relationship: n.relationship,
      percentage: n.sharePercentage,
    }));
  }

  // 4. Skills Chapter
  if (skills && skills.length > 0) {
    base.skills.skills = skills.map((s) => ({
      id: s.id,
      skillName: s.skillName,
      skillType: s.skillType,
      proficiency: s.proficiency,
      level: s.level || undefined,
      assessedOn: s.assessedOn || undefined,
      yearsOfExperience: s.yearsOfExperience || undefined,
      examinerEmployeeId: s.examinerEmployeeId || undefined,
      verifiedByEmployeeId: s.verifiedByEmployeeId || undefined,
      mentorEmployeeId: s.mentorEmployeeId || undefined,
    }));
  }

  // 5. Emergency Contact Chapter
  if (emergencyContacts && emergencyContacts.length > 0) {
    const primary = emergencyContacts.find((c) => c.priority === 'primary');
    const secondary = emergencyContacts.find((c) => c.priority === 'secondary');
    if (primary) {
      base.emergency.primaryContact = {
        name: primary.name,
        relationship: primary.relationship,
        phone: primary.phone,
        email: primary.email || '',
        address: primary.address || '',
        isPrivate: primary.isPrivate,
      };
    }
    if (secondary) {
      base.emergency.secondaryContact = {
        name: secondary.name,
        relationship: secondary.relationship,
        phone: secondary.phone,
        email: secondary.email || '',
        address: secondary.address || '',
      };
    }
  }

  // 6. Accounts (Statutory & Bank)
  if (bankAccount) {
    base.accounts.bankAccount = {
      accountHolderName: bankAccount.accountHolderName,
      accountNumber: bankAccount.accountNumberMasked,
      ifscCode: bankAccount.ifscCode,
      bankName: bankAccount.bankName,
      branchName: bankAccount.branchName || '',
      bankLocation: bankAccount.bankLocation || '',
    };
  }

  // 7. Online Access
  base.onlineAccess.officialEmail = employee.email || '';
  base.onlineAccess.username = employee.email ? employee.email.split('@')[0]! : '';
  base.onlineAccess.accountActive = employee.employmentStatus === 'active';

  // 8. Working Hours
  if (workSchedule) {
    base.workingHours.workSchedule = workSchedule.workSchedule || base.workingHours.workSchedule;
    base.workingHours.workingCalendar =
      workSchedule.workingCalendar || base.workingHours.workingCalendar;
    base.workingHours.workingDays =
      workSchedule.workingDays && workSchedule.workingDays.length > 0
        ? workSchedule.workingDays
        : base.workingHours.workingDays;
    base.workingHours.startTime = workSchedule.startTime || base.workingHours.startTime;
    base.workingHours.endTime = workSchedule.endTime || base.workingHours.endTime;
    base.workingHours.breakMinutes = workSchedule.breakMinutes ?? 60;
    base.workingHours.lunchMinutes = workSchedule.lunchMinutes ?? 45;
    base.workingHours.timeZone = workSchedule.timeZone || base.workingHours.timeZone;
  }

  return base;
}

/**
 * Saves modified employee fields to the authorized backend APIs.
 * Preserves unchanged values and avoids overwriting confidential/masked fields with placeholders.
 */
export async function saveEmployeeEdits(
  employeeId: string,
  currentProfile: EmployeeProfile,
  formData: RegistrationFormData,
): Promise<void> {
  // 1. Update Core Employee Fields
  const corePayload: Record<string, unknown> = {};
  if (formData.personal.firstName.trim() !== currentProfile.employee.firstName) {
    corePayload.firstName = formData.personal.firstName.trim();
  }
  if (formData.personal.lastName.trim() !== (currentProfile.employee.lastName || '')) {
    corePayload.lastName = formData.personal.lastName.trim();
  }
  if (
    formData.personal.mobilePhone.trim() &&
    formData.personal.mobilePhone.trim() !== (currentProfile.employee.phone || '')
  ) {
    corePayload.phone = formData.personal.mobilePhone.trim();
  }
  if (formData.general.endDate !== (currentProfile.employee.contractEndDate || '')) {
    corePayload.contractEndDate = formData.general.endDate || null;
  }
  const noticeDays = parseInt(formData.general.noticePeriod) || 30;
  if (noticeDays !== (currentProfile.employee.noticePeriodDays || 30)) {
    corePayload.noticePeriodDays = noticeDays;
  }

  if (Object.keys(corePayload).length > 0) {
    await updateEmployee(employeeId, corePayload);
  }

  // 2. Personal Details Section
  const personalPayload = {
    middleName: formData.personal.middleName || null,
    preferredName: formData.personal.preferredName || null,
    gender: formData.personal.gender || null,
    dateOfBirth: formData.personal.dob || null,
    maritalStatus: formData.personal.maritalStatus || null,
    bloodGroup: formData.personal.bloodGroup || null,
    nationality: formData.personal.nationality || null,
    nativeLanguage: formData.personal.nativeLanguage || null,
    personalEmail: formData.personal.personalEmail || null,
    workPhone: formData.personal.mobilePhone || null,
    addressStreet: formData.personal.currentStreet || null,
    addressLine2: formData.personal.currentAddressLine2 || null,
    addressCity: formData.personal.currentCity || null,
    addressDistrict: formData.personal.currentDistrict || null,
    addressState: formData.personal.currentState || null,
    addressPostalCode: formData.personal.currentPin || null,
    addressCountry: formData.personal.currentCountry || null,
    isPermanentSameAsCurrent: formData.personal.isPermanentSameAsCurrent,
    permanentAddressStreet: formData.personal.permanentStreet || null,
    permanentAddressLine2: formData.personal.permanentAddressLine2 || null,
    permanentAddressCity: formData.personal.permanentCity || null,
    permanentAddressDistrict: formData.personal.permanentDistrict || null,
    permanentAddressState: formData.personal.permanentState || null,
    permanentAddressPostalCode: formData.personal.permanentPin || null,
    permanentAddressCountry: formData.personal.permanentCountry || null,
  };
  await updateEmployeeSection(employeeId, 'personal', personalPayload);

  // 3. Family Members
  if (formData.personal.familyMembers) {
    await updateEmployeeSection(
      employeeId,
      'family-members',
      formData.personal.familyMembers.map((fm) => ({
        name: fm.name,
        relationship: fm.relationship,
        dateOfBirth: fm.dob || null,
        phone: fm.phone || null,
      })),
    );
  }

  // 4. Nominees
  if (formData.personal.nominationDetails) {
    await updateEmployeeSection(
      employeeId,
      'nominees',
      formData.personal.nominationDetails.map((n) => ({
        name: n.nomineeName,
        relationship: n.relationship,
        sharePercentage: n.percentage,
      })),
    );
  }

  // 5. Emergency Contacts
  const emergencyList = [];
  if (formData.emergency.primaryContact && formData.emergency.primaryContact.name) {
    emergencyList.push({
      priority: 'primary' as const,
      name: formData.emergency.primaryContact.name,
      relationship: formData.emergency.primaryContact.relationship,
      phone: formData.emergency.primaryContact.phone,
      email: formData.emergency.primaryContact.email || null,
      address: formData.emergency.primaryContact.address || null,
      isPrivate: formData.emergency.primaryContact.isPrivate ?? false,
    });
  }
  if (formData.emergency.secondaryContact && formData.emergency.secondaryContact.name) {
    emergencyList.push({
      priority: 'secondary' as const,
      name: formData.emergency.secondaryContact.name,
      relationship: formData.emergency.secondaryContact.relationship,
      phone: formData.emergency.secondaryContact.phone,
      email: formData.emergency.secondaryContact.email || null,
      address: formData.emergency.secondaryContact.address || null,
      isPrivate: false,
    });
  }
  if (emergencyList.length > 0) {
    await updateEmployeeSection(employeeId, 'emergency-contacts', emergencyList);
  }

  // 6. Bank Account
  // Protect sensitive data: If account number was not entered or is masked string (e.g. contains *), do NOT overwrite full account number!
  if (formData.accounts.bankAccount && formData.accounts.bankAccount.accountHolderName) {
    const rawAccNum = formData.accounts.bankAccount.accountNumber;
    const isMaskedOrEmpty = !rawAccNum || rawAccNum.includes('*');
    if (!isMaskedOrEmpty) {
      await updateEmployeeSection(employeeId, 'bank-account', {
        accountHolderName: formData.accounts.bankAccount.accountHolderName,
        accountNumber: rawAccNum,
        ifscCode: formData.accounts.bankAccount.ifscCode,
        bankName: formData.accounts.bankAccount.bankName,
        branchName: formData.accounts.bankAccount.branchName || null,
        bankLocation: formData.accounts.bankAccount.bankLocation || null,
      });
    }
  }

  // 7. Skills
  if (formData.skills.skills) {
    await updateEmployeeSection(
      employeeId,
      'skills',
      formData.skills.skills.map((s) => ({
        skillName: s.skillName,
        skillType: s.skillType,
        proficiency: s.proficiency,
        level: s.level || null,
        assessedOn: s.assessedOn || null,
        yearsOfExperience: s.yearsOfExperience || null,
        examinerEmployeeId: s.examinerEmployeeId || null,
        verifiedByEmployeeId: s.verifiedByEmployeeId || null,
        mentorEmployeeId: s.mentorEmployeeId || null,
      })),
    );
  }

  // 8. Work Schedule
  if (formData.workingHours) {
    await updateEmployeeSection(employeeId, 'work-schedule', {
      workingCalendar: formData.workingHours.workingCalendar || null,
      workSchedule: formData.workingHours.workSchedule || null,
      workingDays: formData.workingHours.workingDays || [],
      startTime: formData.workingHours.startTime,
      endTime: formData.workingHours.endTime,
      breakMinutes: formData.workingHours.breakMinutes,
      lunchMinutes: formData.workingHours.lunchMinutes,
      timeZone: formData.workingHours.timeZone || null,
    });
  }
}
