export type JobLevelStatus = 'active' | 'inactive';

export interface JobLevelRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  rank: number;
  description: string | null;
  status: JobLevelStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  activeEmployeeCount: number;
  totalEmployeeCount: number;
  designationCount: number;
}

export interface CreateJobLevelDto {
  name: string;
  code: string;
  rank: number;
  description?: string | null;
  status?: JobLevelStatus;
}

export interface UpdateJobLevelDto {
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

export interface JobLevelLifecycleResult {
  data: JobLevelRecord;
  affectedEmployeeCount: number;
  affectedDesignationCount: number;
  message: string;
}
