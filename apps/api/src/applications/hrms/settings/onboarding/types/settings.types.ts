import type {
  OnboardingGeneralSettings,
  OnboardingStageConfig,
  OnboardingFieldConfig,
  OnboardingDocumentRequirement,
  OnboardingChecklistTemplate,
  OnboardingConversionSettings,
} from '../../../../../db/schema.js';

export const SUPPORTED_STAGE_KEYS = ['preboarding', 'documents', 'induction', 'completed'] as const;
export type SupportedStageKey = (typeof SUPPORTED_STAGE_KEYS)[number];

export const PROTECTED_SYSTEM_FIELD_KEYS = [
  'firstName',
  'email',
  'companyId',
  'departmentId',
  'designationId',
  'joiningDate',
  'employmentType',
] as const;
export type ProtectedSystemFieldKey = (typeof PROTECTED_SYSTEM_FIELD_KEYS)[number];

// General Settings
export type OnboardingGeneralSettingsDto = OnboardingGeneralSettings;
export interface UpdateOnboardingGeneralSettingsDto {
  onboardingEnabled?: boolean;
  defaultDurationDays?: number;
  idPrefix?: string;
  defaultLocationId?: string | null;
}

// Stage Configurations
export type OnboardingStageConfigDto = OnboardingStageConfig;
export interface UpdateOnboardingStageConfigDto {
  name?: string;
  description?: string | null;
  displayOrder?: number;
  isRequired?: boolean;
  isActive?: boolean;
}

// Field Configurations
export type OnboardingFieldConfigDto = OnboardingFieldConfig;
export interface UpdateOnboardingFieldConfigDto {
  label?: string;
  isRequired?: boolean;
  isEnabled?: boolean;
  displayOrder?: number;
}

// Document Requirements
export type OnboardingDocumentRequirementDto = OnboardingDocumentRequirement;
export interface CreateOnboardingDocumentRequirementDto {
  documentType: string;
  name: string;
  description?: string | null;
  isRequired?: boolean;
  verificationRequired?: boolean;
  expiryTracking?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}
export interface UpdateOnboardingDocumentRequirementDto {
  name?: string;
  description?: string | null;
  isRequired?: boolean;
  verificationRequired?: boolean;
  expiryTracking?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

// Checklist Templates
export type OnboardingChecklistTemplateDto = OnboardingChecklistTemplate;
export interface CreateOnboardingChecklistTemplateDto {
  name: string;
  description?: string | null;
  stageKey: string;
  assigneeType?: string;
  dueOffsetDays?: number;
  isRequired?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}
export interface UpdateOnboardingChecklistTemplateDto {
  name?: string;
  description?: string | null;
  stageKey?: string;
  assigneeType?: string;
  dueOffsetDays?: number;
  isRequired?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

// Conversion Settings
export type OnboardingConversionSettingsDto = OnboardingConversionSettings;
export interface UpdateOnboardingConversionSettingsDto {
  autoConvertOnJoining?: boolean;
  requireDocumentVerification?: boolean;
  requireChecklistCompletion?: boolean;
  employeeIdPrefix?: string;
  defaultEmploymentStatus?: string;
}

// Aggregate Settings
export interface OnboardingSettingsAggregateDto {
  general: OnboardingGeneralSettingsDto;
  stages: OnboardingStageConfigDto[];
  fields: OnboardingFieldConfigDto[];
  documents: OnboardingDocumentRequirementDto[];
  checklists: OnboardingChecklistTemplateDto[];
  conversion: OnboardingConversionSettingsDto;
}
