export type DesignationStatus = 'active' | 'inactive';

export interface DesignationRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string | null;
  description: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  status: DesignationStatus;
  activeEmployeeCount: number;
  totalEmployeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignationPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  status?: DesignationStatus;
}

export interface UpdateDesignationPayload {
  name?: string;
  code?: string | null;
  description?: string | null;
  departmentId?: string | null;
  status?: DesignationStatus;
  confirmStructuralMove?: boolean;
}

export interface ListDesignationsFilters {
  status?: 'active' | 'inactive' | 'all';
  departmentId?: string;
  eligibleForDepartmentId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
