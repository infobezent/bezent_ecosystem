/**
 * BEZENT HRMS - Employee Conversion Frontend Types
 */

export type ConversionMode = 'manual' | 'automatic' | 'both';
export type DefaultConversionMode = 'manual' | 'automatic';
export type EffectiveDateType = 'joining_date' | 'custom_date';
export type DefaultEmploymentStatus = 'active' | 'probation';

export interface ConversionSettingsConfig {
  conversionMode: ConversionMode;
  defaultMode: DefaultConversionMode;
  conversionTriggerStage: string;
  defaultEmploymentStatus: DefaultEmploymentStatus;
  effectiveDateType: EffectiveDateType;
  allowHrOverride: boolean;
}

export interface FieldMappingItem {
  id: string;
  sourceField: string;
  destinationField: string;
  sourceLabel: string;
  destinationLabel: string;
  isActive: boolean;
  isCustom?: boolean;
  isSystem?: boolean;
}

export type RequiredInfoGroup = 'personal' | 'employment' | 'additional';

export interface RequiredInfoItem {
  id: string;
  fieldKey: string;
  fieldName: string;
  group: RequiredInfoGroup;
  isRequired: boolean;
  isSystemMandatory?: boolean;
}

export interface PostConversionActionsConfig {
  createEmployeeProfile: boolean;
  applyChecklistTemplates: boolean;
  applyRequiredDocuments: boolean;
  enableEssAccess: boolean;
  sendNotifications: boolean;
}

export interface ConversionRulesConfig {
  preventDuplicateEmployee: boolean;
  validateRequiredFields: boolean;
  preserveCandidateHistory: boolean;
  allowRetryFailedConversion: boolean;
  restrictedRoles: string[];
  recordAuditHistory: boolean;
}

export interface EmployeeConversionConfig {
  tenantId: string;
  companyId: string;
  settings: ConversionSettingsConfig;
  fieldMappings: FieldMappingItem[];
  requiredInformation: RequiredInfoItem[];
  postConversionActions: PostConversionActionsConfig;
  conversionRules: ConversionRulesConfig;
  updatedAt: string;
  updatedBy?: string;
}

export interface UpdateEmployeeConversionConfigDto {
  settings?: Partial<ConversionSettingsConfig>;
  fieldMappings?: FieldMappingItem[];
  requiredInformation?: RequiredInfoItem[];
  postConversionActions?: Partial<PostConversionActionsConfig>;
  conversionRules?: Partial<ConversionRulesConfig>;
}

export interface ConversionCandidatePreview {
  caseId: string;
  candidateName: string;
  email: string;
  phone?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  joiningDate?: string | null;
  currentStage: string;
  isEligible: boolean;
  eligibilityReasons: string[];
  missingRequiredFields: string[];
  pendingDocumentsCount: number;
  pendingChecklistsCount: number;
  mappedEmployeePayload: Record<string, unknown>;
}

export interface ExecuteConversionDto {
  effectiveDate?: string;
  status?: DefaultEmploymentStatus;
  overrideReasons?: string;
  notes?: string;
}

export interface ConversionResult {
  success: boolean;
  caseId: string;
  employeeId?: string;
  employeeNumber?: string;
  postConversionResults: {
    profileCreated: boolean;
    checklistsApplied: boolean;
    documentsApplied: boolean;
    essAccessEnabled: boolean;
    notificationsSent: boolean;
  };
  auditLogId?: string;
  errors?: string[];
}
