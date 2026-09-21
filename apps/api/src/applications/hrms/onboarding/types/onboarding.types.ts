export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type OnboardingStage = 'preboarding' | 'documents' | 'induction' | 'completed';
export type OnboardingStatus = 'active' | 'withdrawn' | 'completed';

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

export interface OnboardingCaseListItem {
  id: string;
  tenantId: string;
  companyId: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email: string;
  phone?: string | null;
  joiningDate: string;
  employmentType: EmploymentType;
  stage: OnboardingStage;
  status: OnboardingStatus;
  departmentId: string;
  departmentName: string;
  designationId: string;
  designationName: string;
  locationId?: string | null;
  locationName?: string | null;
  createdAt: Date;
}
