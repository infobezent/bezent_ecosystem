export type TenantAdminStatus = 'active' | 'inactive' | 'revoked';

export interface TenantAdminTenantSummary {
  id: string;
  name: string;
  code: string | null;
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  maxCompanies?: number;
}

export interface TenantAdminUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface TenantAdminRecordSummary {
  id: string;
  status: TenantAdminStatus;
  createdAt: string;
}

export interface TenantAdminCompanySummary {
  id: string;
  name: string;
  code: string;
  status: string;
  legalName?: string | null;
  country?: string | null;
  timeZone?: string | null;
  currency?: string | null;
  fiscalYearStart?: string | null;
  createdAt?: string;
}

export interface TenantAdminCapacitySummary {
  maxCompanies: number;
  currentCompanies: number;
  availableCapacity: number;
  isAtCapacity: boolean;
}

export interface TenantAdminContextSummary {
  tenant: TenantAdminTenantSummary;
  user: TenantAdminUserSummary;
  tenantAdmin: TenantAdminRecordSummary;
  companies: TenantAdminCompanySummary[];
  capacity?: TenantAdminCapacitySummary;
}

export interface TenantMemberSummary {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  tenantAuthority: 'tenant_admin' | 'standard';
  companyMembershipsCount?: number;
  createdAt: string;
}

export interface TenantApplicationSummary {
  id: string;
  code: string;
  name: string;
  description?: string;
  enabledCompaniesCount: number;
  totalCompaniesCount: number;
  status: 'active' | 'inactive';
}
