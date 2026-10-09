export type TenantAdminStatus = 'active' | 'inactive' | 'revoked';

export interface TenantAdminRecord {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  status: TenantAdminStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AssignTenantAdminDto {
  tenantId: string;
  userId?: string;
  newUser?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface TenantAdminAssignmentResult {
  tenantAdmin: TenantAdminRecord;
  message: string;
}

export interface TenantAdminContextSummary {
  tenant: {
    id: string;
    name: string;
    code: string | null;
    status: string;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl?: string | null;
    bannerUrl?: string | null;
    createdAt: string;
  };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tenantAdmin: {
    id: string;
    status: TenantAdminStatus;
    createdAt: string;
  };
  companies: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    legalName?: string | null;
    country?: string | null;
    timeZone?: string | null;
  }>;
  companyCapacity: {
    used: number;
    max: number;
    remaining: number;
    canCreateCompany: boolean;
  };
  entitlements: string[];
}

export interface BackfilledTenantItem {
  tenantId: string;
  tenantName: string;
  userId: string;
  userEmail: string;
  reason: string;
}

export interface SkippedTenantItem {
  tenantId: string;
  tenantName: string;
  candidateUserIds?: string[];
  userId?: string;
  reason: string;
}

export interface BackfillSummary {
  processedTenants: number;
  backfilled: BackfilledTenantItem[];
  skippedAlreadyHasAdmin: Array<{ tenantId: string; tenantName: string }>;
  skippedAmbiguous: SkippedTenantItem[];
  skippedCrossTenant: SkippedTenantItem[];
  skippedNoAdminFound: SkippedTenantItem[];
}

export type TenantMemberAuthority = 'tenant_admin' | 'standard';

export interface TenantMemberCompanyAccess {
  companyId: string;
  companyName?: string;
  companyCode?: string;
  status: 'active' | 'inactive' | 'revoked';
  roles: Array<{
    roleId: string;
    roleCode: string;
    roleName: string;
    moduleCode: string | null;
    isSystem: boolean;
  }>;
}

export interface TenantMemberRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  isSuperAdmin: boolean;
  tenantAuthority: TenantMemberAuthority;
  tenantAdminId?: string | null;
  companies: TenantMemberCompanyAccess[];
  pendingInvitations?: Array<{
    id: string;
    companyId: string;
    companyName?: string;
    role: string;
    status: string;
    expiresAt: string;
    createdAt: string;
  }>;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface TenantMemberListFilter {
  search?: string;
  status?: string;
  authority?: TenantMemberAuthority;
  companyId?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface InviteTenantMemberDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  authority?: TenantMemberAuthority;
  companyAccess?: Array<{
    companyId: string;
    roleCodes?: string[];
    roles?: string[];
  }>;
}

export interface GrantCompanyAccessDto {
  companyId: string;
  roleCodes?: string[];
  roles?: string[];
}

export interface AssignCompanyRolesDto {
  roleIds?: string[];
  roleCodes?: string[];
}

export interface TenantApplicationDistribution {
  moduleCode: string;
  name: string;
  description: string;
  category: string;
  availability: string;
  tenantEntitled: boolean;
  companyCount: number;
  enabledCompanyCount: number;
  companies: Array<{
    companyId: string;
    companyName: string;
    companyCode: string;
    status: 'enabled' | 'disabled';
  }>;
}

export interface CompanyApplicationStatus {
  moduleCode: string;
  name: string;
  description: string;
  category: string;
  availability: string;
  tenantEntitled: boolean;
  companyStatus: 'enabled' | 'disabled';
  canEnable: boolean;
}

export interface UpdateTenantProfileDto {
  name?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

/* ── Company Access V1 Types ────────────────────────────────────────── */

export type CompanyAccessRole = 'company_admin' | 'member';

export interface CompanyAccessUserItem {
  userId?: string;
  invitationId?: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: CompanyAccessRole;
  roleLabel: string;
  status: 'active' | 'inactive' | 'pending_invitation' | 'revoked';
  statusLabel: string;
  joinedAt?: string;
  invitedAt?: string;
  expiresAt?: string;
  isInvitation: boolean;
}

export interface AvailableTenantUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  tenantAuthority: 'tenant_admin' | 'standard';
}

export interface AssignCompanyUserDto {
  userId: string;
  role: CompanyAccessRole;
}

export interface InviteCompanyUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  role: CompanyAccessRole;
}

export interface UpdateCompanyUserRoleDto {
  role: CompanyAccessRole;
}

export interface CompanyRoleOverviewItem {
  code: string;
  name: string;
  scope: string;
  description: string;
  administrativeCapabilities: string[];
  disclaimer: string;
}

