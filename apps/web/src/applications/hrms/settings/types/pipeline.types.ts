export type StageType = 'standard' | 'approval' | 'final';

export interface PipelineStageConfig {
  id: string;
  stageKey: string;
  name: string;
  description?: string | null;
  stageType: StageType;
  displayOrder: number;
  isRequired: boolean;
  isActive: boolean;
  isTerminal: boolean;
  color?: string | null;
  // Controls
  allowManualEntry: boolean;
  allowManualExit: boolean;
  requireChecklist: boolean;
  requireDocVerification: boolean;
  requireHrApproval: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnboardingPipeline {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStageConfig[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelineDto {
  name: string;
  description?: string | null;
  isDefault?: boolean;
  stages?: PipelineStageConfig[];
}

export interface UpdatePipelineDto {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export type ConditionField = 'employmentType' | 'departmentId' | 'locationId' | 'hiringCategory';
export type ConditionOperator = 'equals' | 'not_equals' | 'in' | 'is_not_empty';

export interface PipelineAssignmentRule {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  priority: number;
  conditionField: ConditionField;
  operator: ConditionOperator;
  conditionValue: string;
  targetPipelineId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
