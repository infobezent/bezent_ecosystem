export type GradeStatus = 'active' | 'inactive';

export interface GradeRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string;
  rank: number;
  description: string | null;
  status: GradeStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  activeEmployeeCount: number;
  totalEmployeeCount: number;
  designationCount: number;
}

export interface CreateGradeDto {
  name: string;
  code: string;
  rank: number;
  description?: string | null;
  status?: GradeStatus;
}

export interface UpdateGradeDto {
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

export interface GradeLifecycleResult {
  data: GradeRecord;
  affectedEmployeeCount: number;
  affectedDesignationCount: number;
  message: string;
}
