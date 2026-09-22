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

export interface OnboardingGeneralSettings {
  id: string;
  tenantId: string;
  companyId: string;
  onboardingEnabled: boolean;
  defaultDurationDays: number;
  idPrefix: string;
  defaultLocationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOnboardingGeneralSettingsDto {
  onboardingEnabled?: boolean;
  defaultDurationDays?: number;
  idPrefix?: string;
  defaultLocationId?: string | null;
}

export interface OnboardingStageConfig {
  id: string;
  tenantId: string;
  companyId: string;
  stageKey: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isRequired: boolean;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOnboardingStageConfigDto {
  name?: string;
  description?: string | null;
  displayOrder?: number;
  isRequired?: boolean;
  isActive?: boolean;
}

export interface OnboardingFieldConfig {
  id: string;
  tenantId: string;
  companyId: string;
  fieldKey: string;
  label: string;
  isRequired: boolean;
  isEnabled: boolean;
  displayOrder: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOnboardingFieldConfigDto {
  label?: string;
  isRequired?: boolean;
  isEnabled?: boolean;
  displayOrder?: number;
}

export interface OnboardingDocumentRequirement {
  id: string;
  tenantId: string;
  companyId: string;
  documentType: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  verificationRequired: boolean;
  expiryTracking: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface OnboardingChecklistTemplate {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  description: string | null;
  stageKey: string;
  assigneeType: string;
  dueOffsetDays: number;
  isRequired: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface OnboardingConversionSettings {
  id: string;
  tenantId: string;
  companyId: string;
  autoConvertOnJoining: boolean;
  requireDocumentVerification: boolean;
  requireChecklistCompletion: boolean;
  employeeIdPrefix: string;
  defaultEmploymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOnboardingConversionSettingsDto {
  autoConvertOnJoining?: boolean;
  requireDocumentVerification?: boolean;
  requireChecklistCompletion?: boolean;
  employeeIdPrefix?: string;
  defaultEmploymentStatus?: string;
}

export interface OnboardingSettingsAggregate {
  general: OnboardingGeneralSettings;
  stages: OnboardingStageConfig[];
  fields: OnboardingFieldConfig[];
  documents: OnboardingDocumentRequirement[];
  checklists: OnboardingChecklistTemplate[];
  conversion: OnboardingConversionSettings;
}
