export type JobLevelStatus = 'active' | 'inactive';

export interface JobLevel {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  rank: number;
  description: string | null;
  status: JobLevelStatus;
  createdAt: string;
  updatedAt: string;
  activeEmployeeCount: number;
  totalEmployeeCount: number;
  designationCount: number;
}

export interface CreateJobLevelPayload {
  name: string;
  code: string;
  rank: number;
  description?: string | null;
  status?: JobLevelStatus;
}

export interface UpdateJobLevelPayload {
  name?: string;
  code?: string;
  rank?: number;
  description?: string | null;
  status?: JobLevelStatus;
}

export interface ListJobLevelsFilter {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  lookupOnly?: boolean;
}

export interface JobLevelLifecycleResponse {
  data: JobLevel;
  affectedEmployeeCount: number;
  affectedDesignationCount: number;
  message: string;
}

export type ListJobLevelsFilters = ListJobLevelsFilter;
export type JobLevelLifecycleResult = JobLevelLifecycleResponse;
