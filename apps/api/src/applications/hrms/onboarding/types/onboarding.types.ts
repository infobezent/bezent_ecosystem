export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type OnboardingStage = 'preboarding' | 'documents' | 'induction' | 'completed';
export type OnboardingStatus = 'draft' | 'active' | 'withdrawn' | 'completed';

export interface CreateNewHireDto {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  companyId: string;
  departmentId: string;
  designationId: string;
  locationId?: string;
  joiningDate: string;
  employmentType?: EmploymentType;
}

export interface CreateCaseDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  joiningDate?: string;
  employmentType?: EmploymentType;
  draftPayload?: Record<string, unknown>;
  status?: 'draft' | 'active';
}

export interface UpdateDraftDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  joiningDate?: string;
  employmentType?: EmploymentType;
  draftPayload?: Record<string, unknown>;
  version?: number;
}

export interface SubmitCaseDto {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  departmentId: string;
  designationId: string;
  locationId?: string;
  joiningDate: string;
  employmentType?: EmploymentType;
  version?: number;
}

export interface OnboardingCaseListItem {
  id: string;
  tenantId: string;
  companyId: string;
  firstName: string | null;
  lastName?: string | null;
  fullName: string;
  email: string | null;
  phone?: string | null;
  joiningDate: string | null;
  employmentType: EmploymentType;
  stage: OnboardingStage;
  status: OnboardingStatus;
  version: number;
  draftPayload?: Record<string, unknown> | null;
  withdrawalReason?: string | null;
  withdrawnAt?: Date | null;
  completedAt?: Date | null;
  departmentId: string | null;
  departmentName?: string | null;
  designationId: string | null;
  designationName?: string | null;
  locationId: string | null;
  locationName?: string | null;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TransitionStageDto {
  toStage: string;
  notes?: string;
  version: number;
}

export interface WithdrawCaseDto {
  reason: string;
  version: number;
}

export interface OnboardingCaseHistoryItem {
  id: string;
  tenantId: string;
  companyId: string;
  caseId: string;
  fromStage: string | null;
  toStage: string;
  action: 'transition' | 'revert' | 'withdraw' | 'complete';
  notes: string | null;
  createdAt: Date;
}
