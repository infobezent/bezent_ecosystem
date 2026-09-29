export type TenantStatus = 'active' | 'inactive' | 'suspended' | 'archived';

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  companyCount?: number;
  userCount?: number;
  activeModules?: string[];
}

export interface CreateTenantDto {
  id?: string;
  name: string;
  code: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: TenantStatus;
}

export interface UpdateTenantDto {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface TenantFilter {
  search?: string;
  status?: TenantStatus;
  page?: number;
  limit?: number;
}
