export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type EmploymentStatus =
  'active' | 'probation' | 'notice' | 'terminated' | 'suspended' | 'resigned';

export interface CreateEmployeeDto {
  employeeNumber: string;
  userId?: string | null;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  reportingManagerId?: string | null;
  joiningDate: string; // YYYY-MM-DD
  confirmedJoiningDate?: string | null; // YYYY-MM-DD
  probationEndDate?: string | null; // YYYY-MM-DD
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string | null;
  email?: string;
  phone?: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  reportingManagerId?: string | null;
  joiningDate?: string;
  confirmedJoiningDate?: string | null;
  probationEndDate?: string | null;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
  userId?: string | null;
}

export interface EmployeeListItem {
  id: string;
  tenantId: string;
  companyId: string;
  employeeNumber: string;
  userId: string | null;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  departmentName: string | null;
  designationId: string | null;
  designationName: string | null;
  locationId: string | null;
  locationName: string | null;
  reportingManagerId: string | null;
  reportingManagerName: string | null;
  joiningDate: string;
  confirmedJoiningDate: string | null;
  probationEndDate: string | null;
  confirmationDate: string | null;
  lastWorkingDate: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeDetails = EmployeeListItem;

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedEmployeesResult {
  items: EmployeeListItem[];
  pagination: PaginationMetadata;
}

export interface ListEmployeesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  employmentType?: EmploymentType;
  employmentStatus?: EmploymentStatus;
}
