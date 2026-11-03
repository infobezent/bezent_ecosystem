import type {
  WorkforceGeneralSettings,
  WorkforceEmploymentType,
  WorkforceProbationPolicy,
  WorkforceLifecyclePolicy,
  WorkforceOffboardingPolicy,
  WorkforceClearanceChecklistTemplate,
} from '../../../../db/schema.js';

export interface FormattedNextIdResult {
  nextId: string;
  prefix: string;
  sequenceNumber: number;
  suffix?: string | null;
}

export interface WorkforceSettingsBundle {
  general: WorkforceGeneralSettings & { nextSuggestedId: string };
  employmentTypes: WorkforceEmploymentType[];
  probation: WorkforceProbationPolicy;
  lifecycle: WorkforceLifecyclePolicy;
  offboarding: WorkforceOffboardingPolicy;
  clearanceTemplates: WorkforceClearanceChecklistTemplate[];
}

export interface UpdateGeneralSettingsInput {
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

export interface CreateEmploymentTypeInput {
  code: string;
  name: string;
  description?: string | null;
  workHoursPerWeek?: number;
  isBenefitsEligible?: boolean;
  defaultNoticeDays?: number;
  isActive?: boolean;
}

export interface UpdateEmploymentTypeInput {
  name?: string;
  description?: string | null;
  workHoursPerWeek?: number;
  isBenefitsEligible?: boolean;
  defaultNoticeDays?: number;
  isActive?: boolean;
}

export interface UpdateProbationPolicyInput {
  defaultProbationDays?: number;
  confirmationMode?: 'manager_review' | 'auto_confirm';
  reminderLeadDays?: number;
  maxExtensionDays?: number;
  maxExtensionsAllowed?: number;
  autoGenerateLetter?: boolean;
}

export interface UpdateLifecyclePolicyInput {
  requireReleasingManagerApproval?: boolean;
  effectiveDateAlignment?: 'immediate' | 'next_payroll_month' | 'custom';
  autoReassignShifts?: boolean;
  autoReassignLeaveApprover?: boolean;
}

export interface UpdateOffboardingPolicyInput {
  probationNoticeDays?: number;
  confirmedNoticeDays?: number;
  leadershipNoticeDays?: number;
  allowNoticeBuyout?: boolean;
  allowLeaveOffset?: boolean;
  resignationWithdrawalWindowDays?: number;
}

export interface CreateClearanceTemplateInput {
  department: 'it' | 'admin' | 'finance' | 'hr';
  itemTitle: string;
  description?: string | null;
  isMandatory?: boolean;
  displayOrder?: number;
}
