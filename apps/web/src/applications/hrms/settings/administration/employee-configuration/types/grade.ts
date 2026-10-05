export type GradeStatus = 'active' | 'inactive';

export interface Grade {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  rank: number;
  description: string | null;
  status: GradeStatus;
  createdAt: string;
  updatedAt: string;
  activeEmployeeCount: number;
  totalEmployeeCount: number;
  designationCount: number;
}

export interface CreateGradePayload {
  name: string;
  code: string;
  rank: number;
  description?: string | null;
  status?: GradeStatus;
}

export interface UpdateGradePayload {
  name?: string;
  code?: string;
  rank?: number;
  description?: string | null;
  status?: GradeStatus;
}

export interface ListGradesFilter {
  status?: 'active' | 'inactive' | 'all';
  search?: string;
  lookupOnly?: boolean;
}

export interface GradeLifecycleResponse {
  data: Grade;
  affectedEmployeeCount: number;
  affectedDesignationCount: number;
  message: string;
}

export type ListGradesFilters = ListGradesFilter;
export type GradeLifecycleResult = GradeLifecycleResponse;
