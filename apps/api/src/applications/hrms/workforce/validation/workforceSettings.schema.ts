import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  UpdateGeneralSettingsInput,
  CreateEmploymentTypeInput,
  UpdateEmploymentTypeInput,
  UpdateProbationPolicyInput,
  UpdateLifecyclePolicyInput,
  UpdateOffboardingPolicyInput,
  CreateClearanceTemplateInput,
} from '../types/workforceSettings.types.js';

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return input as Record<string, unknown>;
}

export function validateUpdateGeneralSettings(input: unknown): UpdateGeneralSettingsInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};
  const result: UpdateGeneralSettingsInput = {};

  if (data.generationMode !== undefined) {
    if (data.generationMode !== 'automatic' && data.generationMode !== 'manual') {
      errors.generationMode = 'generationMode must be "automatic" or "manual"';
    } else {
      result.generationMode = data.generationMode;
    }
  }

  if (data.idPrefix !== undefined) {
    if (typeof data.idPrefix !== 'string' || !data.idPrefix.trim()) {
      errors.idPrefix = 'idPrefix must be a non-empty string';
    } else if (data.idPrefix.trim().length > 32) {
      errors.idPrefix = 'idPrefix cannot exceed 32 characters';
    } else {
      result.idPrefix = data.idPrefix.trim();
    }
  }

  if (data.idSuffix !== undefined) {
    if (data.idSuffix === null || data.idSuffix === '') {
      result.idSuffix = null;
    } else if (typeof data.idSuffix !== 'string') {
      errors.idSuffix = 'idSuffix must be a string or null';
    } else if (data.idSuffix.trim().length > 32) {
      errors.idSuffix = 'idSuffix cannot exceed 32 characters';
    } else {
      result.idSuffix = data.idSuffix.trim();
    }
  }

  if (data.sequenceLength !== undefined) {
    if (
      typeof data.sequenceLength !== 'number' ||
      !Number.isInteger(data.sequenceLength) ||
      data.sequenceLength < 3 ||
      data.sequenceLength > 10
    ) {
      errors.sequenceLength = 'sequenceLength must be an integer between 3 and 10';
    } else {
      result.sequenceLength = data.sequenceLength;
    }
  }

  if (data.startingNumber !== undefined) {
    if (
      typeof data.startingNumber !== 'number' ||
      !Number.isInteger(data.startingNumber) ||
      data.startingNumber < 1
    ) {
      errors.startingNumber = 'startingNumber must be a positive integer';
    } else {
      result.startingNumber = data.startingNumber;
    }
  }

  if (data.resetFrequency !== undefined) {
    if (
      data.resetFrequency !== 'never' &&
      data.resetFrequency !== 'calendar_year' &&
      data.resetFrequency !== 'financial_year'
    ) {
      errors.resetFrequency = 'resetFrequency must be "never", "calendar_year", or "financial_year"';
    } else {
      result.resetFrequency = data.resetFrequency;
    }
  }

  if (data.allowManualOverride !== undefined) {
    if (typeof data.allowManualOverride !== 'boolean') {
      errors.allowManualOverride = 'allowManualOverride must be a boolean';
    } else {
      result.allowManualOverride = data.allowManualOverride;
    }
  }

  if (data.preventIdReuse !== undefined) {
    if (typeof data.preventIdReuse !== 'boolean') {
      errors.preventIdReuse = 'preventIdReuse must be a boolean';
    } else {
      result.preventIdReuse = data.preventIdReuse;
    }
  }

  if (data.autoProvisionUser !== undefined) {
    if (typeof data.autoProvisionUser !== 'boolean') {
      errors.autoProvisionUser = 'autoProvisionUser must be a boolean';
    } else {
      result.autoProvisionUser = data.autoProvisionUser;
    }
  }

  if (data.activationTiming !== undefined) {
    if (
      data.activationTiming !== 'instant' &&
      data.activationTiming !== 'joining_date' &&
      data.activationTiming !== 'manual'
    ) {
      errors.activationTiming = 'activationTiming must be "instant", "joining_date", or "manual"';
    } else {
      result.activationTiming = data.activationTiming;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for general workforce settings', errors);
  }

  return result;
}

export function validateCreateEmploymentType(input: unknown): CreateEmploymentTypeInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  if (!data.code || typeof data.code !== 'string' || !data.code.trim()) {
    errors.code = 'Employment type code is required';
  } else if (data.code.trim().length > 32) {
    errors.code = 'Employment type code cannot exceed 32 characters';
  }

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Employment type name is required';
  } else if (data.name.trim().length > 128) {
    errors.name = 'Employment type name cannot exceed 128 characters';
  }

  let workHoursPerWeek = 40.0;
  if (data.workHoursPerWeek !== undefined) {
    if (
      typeof data.workHoursPerWeek !== 'number' ||
      data.workHoursPerWeek < 0 ||
      data.workHoursPerWeek > 168
    ) {
      errors.workHoursPerWeek = 'workHoursPerWeek must be a number between 0 and 168';
    } else {
      workHoursPerWeek = data.workHoursPerWeek;
    }
  }

  let defaultNoticeDays = 60;
  if (data.defaultNoticeDays !== undefined) {
    if (
      typeof data.defaultNoticeDays !== 'number' ||
      !Number.isInteger(data.defaultNoticeDays) ||
      data.defaultNoticeDays < 0 ||
      data.defaultNoticeDays > 365
    ) {
      errors.defaultNoticeDays = 'defaultNoticeDays must be an integer between 0 and 365';
    } else {
      defaultNoticeDays = data.defaultNoticeDays;
    }
  }

  if (data.isBenefitsEligible !== undefined && typeof data.isBenefitsEligible !== 'boolean') {
    errors.isBenefitsEligible = 'isBenefitsEligible must be a boolean';
  }

  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.isActive = 'isActive must be a boolean';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for creating employment type', errors);
  }

  return {
    code: (data.code as string).trim().toUpperCase(),
    name: (data.name as string).trim(),
    description: typeof data.description === 'string' ? data.description.trim() : null,
    workHoursPerWeek,
    isBenefitsEligible: data.isBenefitsEligible !== undefined ? (data.isBenefitsEligible as boolean) : true,
    defaultNoticeDays,
    isActive: data.isActive !== undefined ? (data.isActive as boolean) : true,
  };
}

export function validateUpdateEmploymentType(input: unknown): UpdateEmploymentTypeInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};
  const result: UpdateEmploymentTypeInput = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Employment type name cannot be empty';
    } else if (data.name.trim().length > 128) {
      errors.name = 'Employment type name cannot exceed 128 characters';
    } else {
      result.name = data.name.trim();
    }
  }

  if (data.description !== undefined) {
    result.description = typeof data.description === 'string' ? data.description.trim() : null;
  }

  if (data.workHoursPerWeek !== undefined) {
    if (
      typeof data.workHoursPerWeek !== 'number' ||
      data.workHoursPerWeek < 0 ||
      data.workHoursPerWeek > 168
    ) {
      errors.workHoursPerWeek = 'workHoursPerWeek must be a number between 0 and 168';
    } else {
      result.workHoursPerWeek = data.workHoursPerWeek;
    }
  }

  if (data.defaultNoticeDays !== undefined) {
    if (
      typeof data.defaultNoticeDays !== 'number' ||
      !Number.isInteger(data.defaultNoticeDays) ||
      data.defaultNoticeDays < 0 ||
      data.defaultNoticeDays > 365
    ) {
      errors.defaultNoticeDays = 'defaultNoticeDays must be an integer between 0 and 365';
    } else {
      result.defaultNoticeDays = data.defaultNoticeDays;
    }
  }

  if (data.isBenefitsEligible !== undefined) {
    if (typeof data.isBenefitsEligible !== 'boolean') {
      errors.isBenefitsEligible = 'isBenefitsEligible must be a boolean';
    } else {
      result.isBenefitsEligible = data.isBenefitsEligible;
    }
  }

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== 'boolean') {
      errors.isActive = 'isActive must be a boolean';
    } else {
      result.isActive = data.isActive;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for updating employment type', errors);
  }

  return result;
}

export function validateUpdateProbationPolicy(input: unknown): UpdateProbationPolicyInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};
  const result: UpdateProbationPolicyInput = {};

  if (data.defaultProbationDays !== undefined) {
    if (
      typeof data.defaultProbationDays !== 'number' ||
      !Number.isInteger(data.defaultProbationDays) ||
      data.defaultProbationDays < 0 ||
      data.defaultProbationDays > 365
    ) {
      errors.defaultProbationDays = 'defaultProbationDays must be an integer between 0 and 365';
    } else {
      result.defaultProbationDays = data.defaultProbationDays;
    }
  }

  if (data.confirmationMode !== undefined) {
    if (data.confirmationMode !== 'manager_review' && data.confirmationMode !== 'auto_confirm') {
      errors.confirmationMode = 'confirmationMode must be "manager_review" or "auto_confirm"';
    } else {
      result.confirmationMode = data.confirmationMode;
    }
  }

  if (data.reminderLeadDays !== undefined) {
    if (
      typeof data.reminderLeadDays !== 'number' ||
      !Number.isInteger(data.reminderLeadDays) ||
      data.reminderLeadDays < 0 ||
      data.reminderLeadDays > 90
    ) {
      errors.reminderLeadDays = 'reminderLeadDays must be an integer between 0 and 90';
    } else {
      result.reminderLeadDays = data.reminderLeadDays;
    }
  }

  if (data.maxExtensionDays !== undefined) {
    if (
      typeof data.maxExtensionDays !== 'number' ||
      !Number.isInteger(data.maxExtensionDays) ||
      data.maxExtensionDays < 0 ||
      data.maxExtensionDays > 365
    ) {
      errors.maxExtensionDays = 'maxExtensionDays must be an integer between 0 and 365';
    } else {
      result.maxExtensionDays = data.maxExtensionDays;
    }
  }

  if (data.maxExtensionsAllowed !== undefined) {
    if (
      typeof data.maxExtensionsAllowed !== 'number' ||
      !Number.isInteger(data.maxExtensionsAllowed) ||
      data.maxExtensionsAllowed < 0 ||
      data.maxExtensionsAllowed > 10
    ) {
      errors.maxExtensionsAllowed = 'maxExtensionsAllowed must be an integer between 0 and 10';
    } else {
      result.maxExtensionsAllowed = data.maxExtensionsAllowed;
    }
  }

  if (data.autoGenerateLetter !== undefined) {
    if (typeof data.autoGenerateLetter !== 'boolean') {
      errors.autoGenerateLetter = 'autoGenerateLetter must be a boolean';
    } else {
      result.autoGenerateLetter = data.autoGenerateLetter;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for probation policy', errors);
  }

  return result;
}

export function validateUpdateLifecyclePolicy(input: unknown): UpdateLifecyclePolicyInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};
  const result: UpdateLifecyclePolicyInput = {};

  if (data.requireReleasingManagerApproval !== undefined) {
    if (typeof data.requireReleasingManagerApproval !== 'boolean') {
      errors.requireReleasingManagerApproval = 'requireReleasingManagerApproval must be a boolean';
    } else {
      result.requireReleasingManagerApproval = data.requireReleasingManagerApproval;
    }
  }

  if (data.effectiveDateAlignment !== undefined) {
    if (
      data.effectiveDateAlignment !== 'immediate' &&
      data.effectiveDateAlignment !== 'next_payroll_month' &&
      data.effectiveDateAlignment !== 'custom'
    ) {
      errors.effectiveDateAlignment = 'effectiveDateAlignment must be "immediate", "next_payroll_month", or "custom"';
    } else {
      result.effectiveDateAlignment = data.effectiveDateAlignment;
    }
  }

  if (data.autoReassignShifts !== undefined) {
    if (typeof data.autoReassignShifts !== 'boolean') {
      errors.autoReassignShifts = 'autoReassignShifts must be a boolean';
    } else {
      result.autoReassignShifts = data.autoReassignShifts;
    }
  }

  if (data.autoReassignLeaveApprover !== undefined) {
    if (typeof data.autoReassignLeaveApprover !== 'boolean') {
      errors.autoReassignLeaveApprover = 'autoReassignLeaveApprover must be a boolean';
    } else {
      result.autoReassignLeaveApprover = data.autoReassignLeaveApprover;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for lifecycle policy', errors);
  }

  return result;
}

export function validateUpdateOffboardingPolicy(input: unknown): UpdateOffboardingPolicyInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};
  const result: UpdateOffboardingPolicyInput = {};

  if (data.probationNoticeDays !== undefined) {
    if (
      typeof data.probationNoticeDays !== 'number' ||
      !Number.isInteger(data.probationNoticeDays) ||
      data.probationNoticeDays < 0 ||
      data.probationNoticeDays > 365
    ) {
      errors.probationNoticeDays = 'probationNoticeDays must be an integer between 0 and 365';
    } else {
      result.probationNoticeDays = data.probationNoticeDays;
    }
  }

  if (data.confirmedNoticeDays !== undefined) {
    if (
      typeof data.confirmedNoticeDays !== 'number' ||
      !Number.isInteger(data.confirmedNoticeDays) ||
      data.confirmedNoticeDays < 0 ||
      data.confirmedNoticeDays > 365
    ) {
      errors.confirmedNoticeDays = 'confirmedNoticeDays must be an integer between 0 and 365';
    } else {
      result.confirmedNoticeDays = data.confirmedNoticeDays;
    }
  }

  if (data.leadershipNoticeDays !== undefined) {
    if (
      typeof data.leadershipNoticeDays !== 'number' ||
      !Number.isInteger(data.leadershipNoticeDays) ||
      data.leadershipNoticeDays < 0 ||
      data.leadershipNoticeDays > 365
    ) {
      errors.leadershipNoticeDays = 'leadershipNoticeDays must be an integer between 0 and 365';
    } else {
      result.leadershipNoticeDays = data.leadershipNoticeDays;
    }
  }

  if (data.allowNoticeBuyout !== undefined) {
    if (typeof data.allowNoticeBuyout !== 'boolean') {
      errors.allowNoticeBuyout = 'allowNoticeBuyout must be a boolean';
    } else {
      result.allowNoticeBuyout = data.allowNoticeBuyout;
    }
  }

  if (data.allowLeaveOffset !== undefined) {
    if (typeof data.allowLeaveOffset !== 'boolean') {
      errors.allowLeaveOffset = 'allowLeaveOffset must be a boolean';
    } else {
      result.allowLeaveOffset = data.allowLeaveOffset;
    }
  }

  if (data.resignationWithdrawalWindowDays !== undefined) {
    if (
      typeof data.resignationWithdrawalWindowDays !== 'number' ||
      !Number.isInteger(data.resignationWithdrawalWindowDays) ||
      data.resignationWithdrawalWindowDays < 0 ||
      data.resignationWithdrawalWindowDays > 90
    ) {
      errors.resignationWithdrawalWindowDays = 'resignationWithdrawalWindowDays must be an integer between 0 and 90';
    } else {
      result.resignationWithdrawalWindowDays = data.resignationWithdrawalWindowDays;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for offboarding policy', errors);
  }

  return result;
}

export function validateCreateClearanceTemplate(input: unknown): CreateClearanceTemplateInput {
  const data = asObject(input);
  const errors: Record<string, string> = {};

  const validDepts = ['it', 'admin', 'finance', 'hr'];
  if (!data.department || typeof data.department !== 'string' || !validDepts.includes(data.department)) {
    errors.department = 'department must be one of "it", "admin", "finance", or "hr"';
  }

  if (!data.itemTitle || typeof data.itemTitle !== 'string' || !data.itemTitle.trim()) {
    errors.itemTitle = 'itemTitle is required';
  } else if (data.itemTitle.trim().length > 255) {
    errors.itemTitle = 'itemTitle cannot exceed 255 characters';
  }

  let displayOrder = 0;
  if (data.displayOrder !== undefined) {
    if (typeof data.displayOrder !== 'number' || !Number.isInteger(data.displayOrder) || data.displayOrder < 0) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    } else {
      displayOrder = data.displayOrder;
    }
  }

  if (data.isMandatory !== undefined && typeof data.isMandatory !== 'boolean') {
    errors.isMandatory = 'isMandatory must be a boolean';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for creating clearance checklist template', errors);
  }

  return {
    department: data.department as 'it' | 'admin' | 'finance' | 'hr',
    itemTitle: (data.itemTitle as string).trim(),
    description: typeof data.description === 'string' ? data.description.trim() : null,
    isMandatory: data.isMandatory !== undefined ? (data.isMandatory as boolean) : true,
    displayOrder,
  };
}

export function validateUpdateClearanceTemplate(input: unknown): Partial<CreateClearanceTemplateInput> {
  const data = asObject(input);
  const errors: Record<string, string> = {};
  const result: Partial<CreateClearanceTemplateInput> = {};

  const validDepts = ['it', 'admin', 'finance', 'hr'];
  if (data.department !== undefined) {
    if (typeof data.department !== 'string' || !validDepts.includes(data.department)) {
      errors.department = 'department must be one of "it", "admin", "finance", or "hr"';
    } else {
      result.department = data.department as 'it' | 'admin' | 'finance' | 'hr';
    }
  }

  if (data.itemTitle !== undefined) {
    if (typeof data.itemTitle !== 'string' || !data.itemTitle.trim()) {
      errors.itemTitle = 'itemTitle cannot be empty';
    } else if (data.itemTitle.trim().length > 255) {
      errors.itemTitle = 'itemTitle cannot exceed 255 characters';
    } else {
      result.itemTitle = data.itemTitle.trim();
    }
  }

  if (data.description !== undefined) {
    result.description = typeof data.description === 'string' ? data.description.trim() : null;
  }

  if (data.displayOrder !== undefined) {
    if (typeof data.displayOrder !== 'number' || !Number.isInteger(data.displayOrder) || data.displayOrder < 0) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    } else {
      result.displayOrder = data.displayOrder;
    }
  }

  if (data.isMandatory !== undefined) {
    if (typeof data.isMandatory !== 'boolean') {
      errors.isMandatory = 'isMandatory must be a boolean';
    } else {
      result.isMandatory = data.isMandatory;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for updating clearance checklist template', errors);
  }

  return result;
}
