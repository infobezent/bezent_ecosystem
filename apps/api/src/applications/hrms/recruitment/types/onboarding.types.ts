import type {
  RecruitmentOnboarding,
  Candidate,
  CandidateApplication,
  Employee,
  JobRequisition,
} from '../../../../db/schema.js';

export type OnboardingStatus =
  | 'pending_review'
  | 'ready_for_confirmation'
  | 'completed'
  | 'cancelled';

export type OnboardingEmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';

export interface InitiateOnboardingDto {
  targetJoiningDate?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  reportingManagerId?: string | null;
  employmentType?: OnboardingEmploymentType | null;
  workflowTemplate?: string | null;
  assignedPartner?: string | null;
  notes?: string | null;
}

export interface ReviewOnboardingDto {
  targetJoiningDate?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  reportingManagerId?: string | null;
  employmentType?: OnboardingEmploymentType | null;
  workflowTemplate?: string | null;
  assignedPartner?: string | null;
  notes?: string | null;
  status?: 'pending_review' | 'ready_for_confirmation';
}

export interface ConfirmOnboardingDto {
  notes?: string | null;
}

export interface CancelOnboardingDto {
  reason: string;
}

export interface DuplicateConflictCheck {
  hasConflict: boolean;
  conflictSeverity: 'none' | 'warning' | 'blocking';
  conflictType?: 'email_exists' | 'phone_exists' | 'name_match' | 'already_onboarded' | null;
  conflictingEmployeeId?: string | null;
  conflictingEmployeeNumber?: string | null;
  conflictingEmployeeName?: string | null;
  message?: string | null;
}

export interface RecruitmentOnboardingDetail extends RecruitmentOnboarding {
  candidate: Pick<
    Candidate,
    | 'id'
    | 'candidateNumber'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'location'
    | 'currentCompany'
    | 'currentDesignation'
  >;
  application: Pick<
    CandidateApplication,
    'id' | 'stage' | 'status' | 'appliedAt' | 'hiredAt' | 'requisitionId'
  >;
  requisition?: Pick<
    JobRequisition,
    | 'id'
    | 'requisitionNumber'
    | 'jobTitle'
    | 'departmentId'
    | 'designationId'
    | 'locationId'
    | 'locationName'
    | 'employmentType'
  > | null;
  createdEmployee?: Pick<
    Employee,
    'id' | 'employeeNumber' | 'firstName' | 'lastName' | 'email'
  > | null;
  duplicateCheck: DuplicateConflictCheck;
}

export interface OnboardingFilterQuery {
  status?: OnboardingStatus;
  departmentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
