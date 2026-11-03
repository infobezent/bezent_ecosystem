export interface WorkforceGeneralSettings {
  id: string;
  tenantId: string;
  companyId: string;
  generationMode: 'automatic' | 'manual';
  idPrefix: string;
  idSuffix?: string | null;
  sequenceLength: number;
  startingNumber: number;
  currentCounter: number;
  resetFrequency: 'never' | 'calendar_year' | 'financial_year';
  allowManualOverride: boolean;
  preventIdReuse: boolean;
  autoProvisionUser: boolean;
  activationTiming: 'instant' | 'joining_date' | 'manual';
  nextSuggestedId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceEmploymentType {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  workHoursPerWeek: string;
  isBenefitsEligible: boolean;
  defaultNoticeDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceProbationPolicy {
  id: string;
  tenantId: string;
  companyId: string;
  defaultProbationDays: number;
  confirmationMode: 'manager_review' | 'auto_confirm';
  reminderLeadDays: number;
  maxExtensionDays: number;
  maxExtensionsAllowed: number;
  autoGenerateLetter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceLifecyclePolicy {
  id: string;
  tenantId: string;
  companyId: string;
  requireReleasingManagerApproval: boolean;
  effectiveDateAlignment: 'immediate' | 'next_payroll_month' | 'custom';
  autoReassignShifts: boolean;
  autoReassignLeaveApprover: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceOffboardingPolicy {
  id: string;
  tenantId: string;
  companyId: string;
  probationNoticeDays: number;
  confirmedNoticeDays: number;
  leadershipNoticeDays: number;
  allowNoticeBuyout: boolean;
  allowLeaveOffset: boolean;
  resignationWithdrawalWindowDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkforceClearanceChecklistTemplate {
  id: string;
  tenantId: string;
  companyId: string;
  department: 'it' | 'admin' | 'finance' | 'hr';
  itemTitle: string;
  description?: string | null;
  isMandatory: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface WorkforceSettingsBundle {
  general: WorkforceGeneralSettings;
  employmentTypes: WorkforceEmploymentType[];
  probation: WorkforceProbationPolicy;
  lifecycle: WorkforceLifecyclePolicy;
  offboarding: WorkforceOffboardingPolicy;
  clearanceTemplates: WorkforceClearanceChecklistTemplate[];
}

export interface FormattedNextIdResult {
  nextId: string;
  prefix: string;
  sequenceNumber: number;
  suffix?: string | null;
}

export interface UpdateGeneralSettingsDto {
  generationMode?: 'automatic' | 'manual';
  idPrefix?: string;
  idSuffix?: string | null;
  sequenceLength?: number;
  startingNumber?: number;
  resetFrequency?: 'never' | 'calendar_year' | 'financial_year';
  allowManualOverride?: boolean;
  preventIdReuse?: boolean;
  autoProvisionUser?: boolean;
  activationTiming?: 'instant' | 'joining_date' | 'manual';
}

export interface CreateEmploymentTypeDto {
  code: string;
  name: string;
  description?: string | null;
  workHoursPerWeek?: number;
  isBenefitsEligible?: boolean;
  defaultNoticeDays?: number;
  isActive?: boolean;
}

export interface UpdateEmploymentTypeDto {
  name?: string;
  description?: string | null;
  workHoursPerWeek?: number;
  isBenefitsEligible?: boolean;
  defaultNoticeDays?: number;
  isActive?: boolean;
}

export interface UpdateProbationPolicyDto {
  defaultProbationDays?: number;
  confirmationMode?: 'manager_review' | 'auto_confirm';
  reminderLeadDays?: number;
  maxExtensionDays?: number;
  maxExtensionsAllowed?: number;
  autoGenerateLetter?: boolean;
}

export interface UpdateLifecyclePolicyDto {
  requireReleasingManagerApproval?: boolean;
  effectiveDateAlignment?: 'immediate' | 'next_payroll_month' | 'custom';
  autoReassignShifts?: boolean;
  autoReassignLeaveApprover?: boolean;
}

export interface UpdateOffboardingPolicyDto {
  probationNoticeDays?: number;
  confirmedNoticeDays?: number;
  leadershipNoticeDays?: number;
  allowNoticeBuyout?: boolean;
  allowLeaveOffset?: boolean;
  resignationWithdrawalWindowDays?: number;
}

export interface CreateClearanceTemplateDto {
  department: 'it' | 'admin' | 'finance' | 'hr';
  itemTitle: string;
  description?: string | null;
  isMandatory?: boolean;
  displayOrder?: number;
}

export type WorkforceTabId =
  | 'general'
  | 'organization'
  | 'registration-forms'
  | 'onboarding-workflows'
  | 'probation'
  | 'lifecycle'
  | 'offboarding';
