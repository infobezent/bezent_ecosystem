export type DepartmentStatus = 'active' | 'inactive';

export interface DepartmentRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string | null;
  description: string | null;
  businessUnitId: string | null;
  businessUnitName?: string | null;
  divisionId: string | null;
  divisionName?: string | null;
  parentDepartmentId: string | null;
  parentDepartmentName?: string | null;
  headEmployeeId: string | null;
  headEmployeeName?: string | null;
  headEmployeeNumber?: string | null;
  status: DepartmentStatus;
  childDepartmentCount: number;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code?: string | null;
  description?: string | null;
  businessUnitId?: string | null;
  divisionId?: string | null;
  parentDepartmentId?: string | null;
  headEmployeeId?: string | null;
  status?: DepartmentStatus;
}

export interface UpdateDepartmentDto {
  name: string;
  code?: string | null;
  description?: string | null;
  businessUnitId?: string | null;
  divisionId?: string | null;
  parentDepartmentId?: string | null;
  headEmployeeId?: string | null;
  status?: DepartmentStatus;
}

export interface SetDepartmentStatusDto {
  status: DepartmentStatus;
}

export interface DepartmentFilter {
  status?: 'active' | 'inactive' | 'all';
  businessUnitId?: string;
  divisionId?: string;
  parentDepartmentId?: string;
  search?: string;
}
