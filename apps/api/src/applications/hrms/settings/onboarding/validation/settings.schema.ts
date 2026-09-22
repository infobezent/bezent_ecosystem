import { ValidationError } from '../../../../../app/errors/AppError.js';
import {
  SUPPORTED_STAGE_KEYS,
  PROTECTED_SYSTEM_FIELD_KEYS,
  type SupportedStageKey,
  type UpdateOnboardingGeneralSettingsDto,
  type UpdateOnboardingStageConfigDto,
  type UpdateOnboardingFieldConfigDto,
  type CreateOnboardingDocumentRequirementDto,
  type UpdateOnboardingDocumentRequirementDto,
  type CreateOnboardingChecklistTemplateDto,
  type UpdateOnboardingChecklistTemplateDto,
  type UpdateOnboardingConversionSettingsDto,
} from '../types/settings.types.js';

export function validateUpdateGeneralSettings(input: unknown): UpdateOnboardingGeneralSettingsDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateOnboardingGeneralSettingsDto = {};

  if (data.onboardingEnabled !== undefined) {
    if (typeof data.onboardingEnabled !== 'boolean') {
      errors.onboardingEnabled = 'onboardingEnabled must be a boolean';
    } else {
      result.onboardingEnabled = data.onboardingEnabled;
    }
  }

  if (data.defaultDurationDays !== undefined) {
    if (
      typeof data.defaultDurationDays !== 'number' ||
      !Number.isInteger(data.defaultDurationDays) ||
      data.defaultDurationDays < 1 ||
      data.defaultDurationDays > 365
    ) {
      errors.defaultDurationDays = 'defaultDurationDays must be an integer between 1 and 365';
    } else {
      result.defaultDurationDays = data.defaultDurationDays;
    }
  }

  if (data.idPrefix !== undefined) {
    if (typeof data.idPrefix !== 'string' || !data.idPrefix.trim()) {
      errors.idPrefix = 'idPrefix must be a non-empty string';
    } else if (data.idPrefix.trim().length > 20) {
      errors.idPrefix = 'idPrefix must not exceed 20 characters';
    } else {
      result.idPrefix = data.idPrefix.trim();
    }
  }

  if (data.defaultLocationId !== undefined) {
    if (data.defaultLocationId === null || data.defaultLocationId === '') {
      result.defaultLocationId = null;
    } else if (typeof data.defaultLocationId !== 'string') {
      errors.defaultLocationId = 'defaultLocationId must be a string or null';
    } else {
      result.defaultLocationId = data.defaultLocationId.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for general settings', errors);
  }

  return result;
}

export function validateStageKey(stageKey: string): SupportedStageKey {
  if (!stageKey || typeof stageKey !== 'string') {
    throw new ValidationError('Stage key is required');
  }

  const normalized = stageKey.trim().toLowerCase();
  if (!SUPPORTED_STAGE_KEYS.includes(normalized as SupportedStageKey)) {
    throw new ValidationError(
      `Invalid stage reference '${stageKey}'. Supported stages are: ${SUPPORTED_STAGE_KEYS.join(', ')}`,
      { stageKey: `Stage must be one of: ${SUPPORTED_STAGE_KEYS.join(', ')}` },
    );
  }

  return normalized as SupportedStageKey;
}

export function validateUpdateStageConfig(
  stageKey: string,
  input: unknown,
): UpdateOnboardingStageConfigDto {
  validateStageKey(stageKey);

  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateOnboardingStageConfigDto = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Stage name must be a non-empty string';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Stage name must not exceed 100 characters';
    } else {
      result.name = data.name.trim();
    }
  }

  if (data.description !== undefined) {
    if (data.description === null || data.description === '') {
      result.description = null;
    } else if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string or null';
    } else if (data.description.trim().length > 255) {
      errors.description = 'Description must not exceed 255 characters';
    } else {
      result.description = data.description.trim();
    }
  }

  if (data.displayOrder !== undefined) {
    if (
      typeof data.displayOrder !== 'number' ||
      !Number.isInteger(data.displayOrder) ||
      data.displayOrder < 0
    ) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    } else {
      result.displayOrder = data.displayOrder;
    }
  }

  if (data.isRequired !== undefined) {
    if (typeof data.isRequired !== 'boolean') {
      errors.isRequired = 'isRequired must be a boolean';
    } else {
      result.isRequired = data.isRequired;
    }
  }

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== 'boolean') {
      errors.isActive = 'isActive must be a boolean';
    } else {
      // Protection: completed stage cannot be deactivated
      if (stageKey === 'completed' && !data.isActive) {
        errors.isActive =
          'Terminal stage "completed" is a protected system stage and cannot be deactivated';
      } else {
        result.isActive = data.isActive;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for stage config', errors);
  }

  return result;
}

export function validateUpdateFieldConfig(
  fieldKey: string,
  input: unknown,
): UpdateOnboardingFieldConfigDto {
  if (!fieldKey || typeof fieldKey !== 'string') {
    throw new ValidationError('Field key is required');
  }

  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const normalizedFieldKey = fieldKey.trim();
  const isProtectedSystemField = (PROTECTED_SYSTEM_FIELD_KEYS as readonly string[]).includes(
    normalizedFieldKey,
  );

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateOnboardingFieldConfigDto = {};

  if (data.label !== undefined) {
    if (typeof data.label !== 'string' || !data.label.trim()) {
      errors.label = 'Label must be a non-empty string';
    } else if (data.label.trim().length > 100) {
      errors.label = 'Label must not exceed 100 characters';
    } else {
      result.label = data.label.trim();
    }
  }

  if (data.isRequired !== undefined) {
    if (typeof data.isRequired !== 'boolean') {
      errors.isRequired = 'isRequired must be a boolean';
    } else {
      if (isProtectedSystemField && !data.isRequired) {
        errors.isRequired = `Protected system field "${normalizedFieldKey}" is mandatory and cannot be marked as optional`;
      } else {
        result.isRequired = data.isRequired;
      }
    }
  }

  if (data.isEnabled !== undefined) {
    if (typeof data.isEnabled !== 'boolean') {
      errors.isEnabled = 'isEnabled must be a boolean';
    } else {
      if (isProtectedSystemField && !data.isEnabled) {
        errors.isEnabled = `Protected system field "${normalizedFieldKey}" is mandatory and cannot be disabled`;
      } else {
        result.isEnabled = data.isEnabled;
      }
    }
  }

  if (data.displayOrder !== undefined) {
    if (
      typeof data.displayOrder !== 'number' ||
      !Number.isInteger(data.displayOrder) ||
      data.displayOrder < 0
    ) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    } else {
      result.displayOrder = data.displayOrder;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for field config', errors);
  }

  return result;
}

export function validateCreateDocumentRequirement(
  input: unknown,
): CreateOnboardingDocumentRequirementDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.documentType || typeof data.documentType !== 'string' || !data.documentType.trim()) {
    errors.documentType = 'documentType is required';
  } else {
    const docType = data.documentType.trim();
    if (!/^[a-z0-9_]{2,50}$/.test(docType)) {
      errors.documentType =
        'documentType must be 2-50 characters lowercase alphanumeric and underscore';
    }
  }

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Document name is required';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Document name must not exceed 100 characters';
  }

  let description: string | null = null;
  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (data.description.trim().length > 255) {
      errors.description = 'Description must not exceed 255 characters';
    } else {
      description = data.description.trim();
    }
  }

  if (data.isRequired !== undefined && typeof data.isRequired !== 'boolean') {
    errors.isRequired = 'isRequired must be a boolean';
  }

  if (data.verificationRequired !== undefined && typeof data.verificationRequired !== 'boolean') {
    errors.verificationRequired = 'verificationRequired must be a boolean';
  }

  if (data.expiryTracking !== undefined && typeof data.expiryTracking !== 'boolean') {
    errors.expiryTracking = 'expiryTracking must be a boolean';
  }

  if (data.displayOrder !== undefined) {
    if (
      typeof data.displayOrder !== 'number' ||
      !Number.isInteger(data.displayOrder) ||
      data.displayOrder < 0
    ) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    }
  }

  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.isActive = 'isActive must be a boolean';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for document requirement', errors);
  }

  return {
    documentType: (data.documentType as string).trim(),
    name: (data.name as string).trim(),
    description,
    isRequired: data.isRequired !== undefined ? Boolean(data.isRequired) : true,
    verificationRequired:
      data.verificationRequired !== undefined ? Boolean(data.verificationRequired) : true,
    expiryTracking: data.expiryTracking !== undefined ? Boolean(data.expiryTracking) : false,
    displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

export function validateUpdateDocumentRequirement(
  input: unknown,
): UpdateOnboardingDocumentRequirementDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateOnboardingDocumentRequirementDto = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Document name must be a non-empty string';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Document name must not exceed 100 characters';
    } else {
      result.name = data.name.trim();
    }
  }

  if (data.description !== undefined) {
    if (data.description === null || data.description === '') {
      result.description = null;
    } else if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string or null';
    } else if (data.description.trim().length > 255) {
      errors.description = 'Description must not exceed 255 characters';
    } else {
      result.description = data.description.trim();
    }
  }

  if (data.isRequired !== undefined) {
    if (typeof data.isRequired !== 'boolean') {
      errors.isRequired = 'isRequired must be a boolean';
    } else {
      result.isRequired = data.isRequired;
    }
  }

  if (data.verificationRequired !== undefined) {
    if (typeof data.verificationRequired !== 'boolean') {
      errors.verificationRequired = 'verificationRequired must be a boolean';
    } else {
      result.verificationRequired = data.verificationRequired;
    }
  }

  if (data.expiryTracking !== undefined) {
    if (typeof data.expiryTracking !== 'boolean') {
      errors.expiryTracking = 'expiryTracking must be a boolean';
    } else {
      result.expiryTracking = data.expiryTracking;
    }
  }

  if (data.displayOrder !== undefined) {
    if (
      typeof data.displayOrder !== 'number' ||
      !Number.isInteger(data.displayOrder) ||
      data.displayOrder < 0
    ) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    } else {
      result.displayOrder = data.displayOrder;
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
    throw new ValidationError('Validation failed for document requirement update', errors);
  }

  return result;
}

export function validateCreateChecklistTemplate(
  input: unknown,
): CreateOnboardingChecklistTemplateDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Checklist task name is required';
  } else if (data.name.trim().length > 150) {
    errors.name = 'Checklist task name must not exceed 150 characters';
  }

  let stageKey = '';
  if (!data.stageKey || typeof data.stageKey !== 'string' || !data.stageKey.trim()) {
    errors.stageKey = 'stageKey is required';
  } else {
    try {
      stageKey = validateStageKey(data.stageKey);
    } catch (err) {
      errors.stageKey = (err as Error).message;
    }
  }

  let description: string | null = null;
  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (data.description.trim().length > 255) {
      errors.description = 'Description must not exceed 255 characters';
    } else {
      description = data.description.trim();
    }
  }

  // Extensible responsibility/actor representation (task responsibility != authorization role)
  let assigneeType = 'hr';
  if (data.assigneeType !== undefined && data.assigneeType !== null && data.assigneeType !== '') {
    if (typeof data.assigneeType !== 'string' || !data.assigneeType.trim()) {
      errors.assigneeType = 'assigneeType must be a non-empty string';
    } else if (data.assigneeType.trim().length > 50) {
      errors.assigneeType = 'assigneeType must not exceed 50 characters';
    } else {
      assigneeType = data.assigneeType.trim().toLowerCase();
    }
  }

  let dueOffsetDays = 0;
  if (data.dueOffsetDays !== undefined) {
    if (
      typeof data.dueOffsetDays !== 'number' ||
      !Number.isInteger(data.dueOffsetDays) ||
      data.dueOffsetDays < -90 ||
      data.dueOffsetDays > 365
    ) {
      errors.dueOffsetDays = 'dueOffsetDays must be an integer between -90 and 365';
    } else {
      dueOffsetDays = data.dueOffsetDays;
    }
  }

  if (data.isRequired !== undefined && typeof data.isRequired !== 'boolean') {
    errors.isRequired = 'isRequired must be a boolean';
  }

  if (data.displayOrder !== undefined) {
    if (
      typeof data.displayOrder !== 'number' ||
      !Number.isInteger(data.displayOrder) ||
      data.displayOrder < 0
    ) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    }
  }

  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.isActive = 'isActive must be a boolean';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for checklist template', errors);
  }

  return {
    name: (data.name as string).trim(),
    description,
    stageKey,
    assigneeType,
    dueOffsetDays,
    isRequired: data.isRequired !== undefined ? Boolean(data.isRequired) : true,
    displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  };
}

export function validateUpdateChecklistTemplate(
  input: unknown,
): UpdateOnboardingChecklistTemplateDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateOnboardingChecklistTemplateDto = {};

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Checklist task name must be a non-empty string';
    } else if (data.name.trim().length > 150) {
      errors.name = 'Checklist task name must not exceed 150 characters';
    } else {
      result.name = data.name.trim();
    }
  }

  if (data.stageKey !== undefined) {
    if (typeof data.stageKey !== 'string' || !data.stageKey.trim()) {
      errors.stageKey = 'stageKey must be a non-empty string';
    } else {
      try {
        result.stageKey = validateStageKey(data.stageKey);
      } catch (err) {
        errors.stageKey = (err as Error).message;
      }
    }
  }

  if (data.description !== undefined) {
    if (data.description === null || data.description === '') {
      result.description = null;
    } else if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string or null';
    } else if (data.description.trim().length > 255) {
      errors.description = 'Description must not exceed 255 characters';
    } else {
      result.description = data.description.trim();
    }
  }

  if (data.assigneeType !== undefined) {
    if (typeof data.assigneeType !== 'string' || !data.assigneeType.trim()) {
      errors.assigneeType = 'assigneeType must be a non-empty string';
    } else if (data.assigneeType.trim().length > 50) {
      errors.assigneeType = 'assigneeType must not exceed 50 characters';
    } else {
      result.assigneeType = data.assigneeType.trim().toLowerCase();
    }
  }

  if (data.dueOffsetDays !== undefined) {
    if (
      typeof data.dueOffsetDays !== 'number' ||
      !Number.isInteger(data.dueOffsetDays) ||
      data.dueOffsetDays < -90 ||
      data.dueOffsetDays > 365
    ) {
      errors.dueOffsetDays = 'dueOffsetDays must be an integer between -90 and 365';
    } else {
      result.dueOffsetDays = data.dueOffsetDays;
    }
  }

  if (data.isRequired !== undefined) {
    if (typeof data.isRequired !== 'boolean') {
      errors.isRequired = 'isRequired must be a boolean';
    } else {
      result.isRequired = data.isRequired;
    }
  }

  if (data.displayOrder !== undefined) {
    if (
      typeof data.displayOrder !== 'number' ||
      !Number.isInteger(data.displayOrder) ||
      data.displayOrder < 0
    ) {
      errors.displayOrder = 'displayOrder must be a non-negative integer';
    } else {
      result.displayOrder = data.displayOrder;
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
    throw new ValidationError('Validation failed for checklist template update', errors);
  }

  return result;
}

export function validateUpdateConversionSettings(
  input: unknown,
): UpdateOnboardingConversionSettingsDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateOnboardingConversionSettingsDto = {};

  if (data.autoConvertOnJoining !== undefined) {
    if (typeof data.autoConvertOnJoining !== 'boolean') {
      errors.autoConvertOnJoining = 'autoConvertOnJoining must be a boolean';
    } else {
      result.autoConvertOnJoining = data.autoConvertOnJoining;
    }
  }

  if (data.requireDocumentVerification !== undefined) {
    if (typeof data.requireDocumentVerification !== 'boolean') {
      errors.requireDocumentVerification = 'requireDocumentVerification must be a boolean';
    } else {
      result.requireDocumentVerification = data.requireDocumentVerification;
    }
  }

  if (data.requireChecklistCompletion !== undefined) {
    if (typeof data.requireChecklistCompletion !== 'boolean') {
      errors.requireChecklistCompletion = 'requireChecklistCompletion must be a boolean';
    } else {
      result.requireChecklistCompletion = data.requireChecklistCompletion;
    }
  }

  if (data.employeeIdPrefix !== undefined) {
    if (typeof data.employeeIdPrefix !== 'string' || !data.employeeIdPrefix.trim()) {
      errors.employeeIdPrefix = 'employeeIdPrefix must be a non-empty string';
    } else if (data.employeeIdPrefix.trim().length > 20) {
      errors.employeeIdPrefix = 'employeeIdPrefix must not exceed 20 characters';
    } else {
      result.employeeIdPrefix = data.employeeIdPrefix.trim();
    }
  }

  if (data.defaultEmploymentStatus !== undefined) {
    if (typeof data.defaultEmploymentStatus !== 'string' || !data.defaultEmploymentStatus.trim()) {
      errors.defaultEmploymentStatus = 'defaultEmploymentStatus must be a non-empty string';
    } else if (data.defaultEmploymentStatus.trim().length > 50) {
      errors.defaultEmploymentStatus = 'defaultEmploymentStatus must not exceed 50 characters';
    } else {
      result.defaultEmploymentStatus = data.defaultEmploymentStatus.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed for conversion settings update', errors);
  }

  return result;
}
