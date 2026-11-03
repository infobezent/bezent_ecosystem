import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  InitiateOnboardingDto,
  ReviewOnboardingDto,
  ConfirmOnboardingDto,
  CancelOnboardingDto,
  OnboardingEmploymentType,
} from '../types/onboarding.types.js';

const VALID_EMPLOYMENT_TYPES: OnboardingEmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'intern',
];

export function validateInitiateOnboarding(input: unknown): InitiateOnboardingDto {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const obj = input as Record<string, unknown>;
  const dto: InitiateOnboardingDto = {};

  if (obj.targetJoiningDate !== undefined && obj.targetJoiningDate !== null) {
    if (typeof obj.targetJoiningDate !== 'string') {
      throw new ValidationError('Target joining date must be a string');
    }
    dto.targetJoiningDate = obj.targetJoiningDate.trim();
  }

  if (obj.departmentId !== undefined && obj.departmentId !== null) {
    if (typeof obj.departmentId !== 'string') {
      throw new ValidationError('Department ID must be a string');
    }
    dto.departmentId = obj.departmentId.trim() || null;
  }

  if (obj.designationId !== undefined && obj.designationId !== null) {
    if (typeof obj.designationId !== 'string') {
      throw new ValidationError('Designation ID must be a string');
    }
    dto.designationId = obj.designationId.trim() || null;
  }

  if (obj.locationId !== undefined && obj.locationId !== null) {
    if (typeof obj.locationId !== 'string') {
      throw new ValidationError('Location ID must be a string');
    }
    dto.locationId = obj.locationId.trim() || null;
  }

  if (obj.reportingManagerId !== undefined && obj.reportingManagerId !== null) {
    if (typeof obj.reportingManagerId !== 'string') {
      throw new ValidationError('Reporting manager ID must be a string');
    }
    dto.reportingManagerId = obj.reportingManagerId.trim() || null;
  }

  if (obj.employmentType !== undefined && obj.employmentType !== null) {
    let empType = String(obj.employmentType).trim() as OnboardingEmploymentType;
    if (empType === ('internship' as any)) {
      empType = 'intern';
    }
    if (!VALID_EMPLOYMENT_TYPES.includes(empType)) {
      throw new ValidationError(
        `Invalid employment type '${obj.employmentType}'. Valid: ${VALID_EMPLOYMENT_TYPES.join(', ')}`,
      );
    }
    dto.employmentType = empType;
  }

  if (obj.workflowTemplate !== undefined && obj.workflowTemplate !== null) {
    dto.workflowTemplate = String(obj.workflowTemplate).trim() || null;
  }

  if (obj.assignedPartner !== undefined && obj.assignedPartner !== null) {
    dto.assignedPartner = String(obj.assignedPartner).trim() || null;
  }

  if (obj.notes !== undefined && obj.notes !== null) {
    dto.notes = String(obj.notes).trim() || null;
  }

  return dto;
}

export function validateReviewOnboarding(input: unknown): ReviewOnboardingDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Review onboarding payload is required');
  }
  const obj = input as Record<string, unknown>;
  const base = validateInitiateOnboarding(input);
  const dto: ReviewOnboardingDto = { ...base };

  if (obj.status !== undefined && obj.status !== null) {
    const statusStr = String(obj.status).trim();
    if (statusStr !== 'pending_review' && statusStr !== 'ready_for_confirmation') {
      throw new ValidationError(
        "Status must be either 'pending_review' or 'ready_for_confirmation'",
      );
    }
    dto.status = statusStr;
  }

  return dto;
}

export function validateConfirmOnboarding(input: unknown): ConfirmOnboardingDto {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const obj = input as Record<string, unknown>;
  return {
    notes: obj.notes ? String(obj.notes).trim() : null,
  };
}

export function validateCancelOnboarding(input: unknown): CancelOnboardingDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Cancellation payload is required');
  }
  const obj = input as Record<string, unknown>;
  if (!obj.reason || typeof obj.reason !== 'string' || !obj.reason.trim()) {
    throw new ValidationError('Cancellation reason is required');
  }
  return {
    reason: obj.reason.trim(),
  };
}
