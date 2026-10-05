export type DesignationStatus = 'active' | 'inactive';

export interface DesignationRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string | null;
  description: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  status: DesignationStatus;
  activeEmployeeCount: number;
  totalEmployeeCount?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateDesignationDto {
  name: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  status?: DesignationStatus;
}

export interface UpdateDesignationDto {
  name?: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  status?: DesignationStatus;
  confirmStructuralMove?: boolean;
}

export interface ListDesignationsQuery {
  status?: 'active' | 'inactive' | 'all';
  departmentId?: string;
  eligibleForDepartmentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DesignationAuditDetails {
  designationId: string;
  name: string;
  code?: string | null;
  departmentId?: string | null;
  previousDepartmentId?: string | null;
  newDepartmentId?: string | null;
  affectedEmployeeCount?: number;
  status?: string;
  reason?: string;
}
