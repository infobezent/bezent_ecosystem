export type TenantAdminStatus = 'active' | 'inactive' | 'revoked';

export type CompanyBrandingMode = 'own_logo' | 'tenant_logo' | 'initials';

export interface MediaAssetSummary {
  assetId: string;
  url: string;
  key: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface TenantAdminTenantSummary {
  id: string;
  name: string;
  code: string | null;
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
  maxCompanies?: number;
  logoUrl?: string | null;
  bannerUrl?: string | null;
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
  displayName?: string | null;
  organizationType?: string | null;
  industry?: string | null;
  businessEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  country?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  timeZone?: string | null;
  registrationNumber?: string | null;
  currency?: string | null;
  locale?: string | null;
  dateFormat?: string | null;
  weekStartsOn?: string | null;
  financialYearStart?: string | null;
  logoUrl?: string | null;
  brandingMode?: CompanyBrandingMode | null;
  fiscalYearStart?: string | null;
  createdAt?: string;
  location?: string | null;
  enabledModules?: string[];
  adminsCount?: number;
}


export interface TenantAdminCapacitySummary {
  used?: number;
  max?: number;
  remaining?: number;
  canCreateCompany?: boolean;
  maxCompanies?: number;
  currentCompanies?: number;
  availableCapacity?: number;
  isAtCapacity?: boolean;
}

export interface TenantAdminContextSummary {
  tenant: TenantAdminTenantSummary;
  user: TenantAdminUserSummary;
  tenantAdmin: TenantAdminRecordSummary;
  companies: TenantAdminCompanySummary[];
  capacity?: TenantAdminCapacitySummary;
  companyCapacity?: TenantAdminCapacitySummary;
  entitlements?: string[];
}

export interface CompanyOrgCounts {
  businessUnits: number;
  divisions: number;
  departments: number;
  workLocations: number;
}

export interface TenantMemberCompanyAccessRole {
  roleId: string;
  roleCode: string;
  roleName: string;
  moduleCode?: string | null;
  isSystem?: boolean;
}

export interface TenantMemberCompanyAccess {
  companyId: string;
  companyName: string;
  companyCode: string;
  status: string;
  roles: TenantMemberCompanyAccessRole[];
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
  companiesAccess?: TenantMemberCompanyAccess[];
  createdAt: string;
}

export interface TenantApplicationSummary {
  id: string;
  code: string;
  moduleCode?: string;
  name: string;
  description?: string;
  category?: string;
  availability?: string;
  enabledCompaniesCount: number;
  totalCompaniesCount: number;
  status: 'active' | 'inactive';
  tenantEntitled?: boolean;
}

export interface CompanyApplicationItem {
  moduleCode: string;
  name?: string;
  description?: string;
  category?: string;
  availability?: string;
  tenantEntitled?: boolean;
  companyStatus?: 'enabled' | 'disabled' | string;
  canEnable?: boolean;
}

export type StructuralStatus = 'active' | 'inactive';

export interface EligibleHead {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string | null;
  fullName: string;
  email: string;
  designationName: string | null;
}

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
  status: 'active' | 'inactive';
  childDepartmentCount?: number;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DivisionRecord {
  id: string;
  tenantId: string;
  companyId: string;
  businessUnitId: string;
  businessUnitName?: string;
  name: string;
  code: string | null;
  description: string | null;
  headEmployeeId: string | null;
  headEmployeeName?: string | null;
  headEmployeeNumber?: string | null;
  status: StructuralStatus;
  departments?: DepartmentRecord[];
  departmentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessUnitRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string | null;
  description: string | null;
  headEmployeeId: string | null;
  headEmployeeName?: string | null;
  headEmployeeNumber?: string | null;
  status: StructuralStatus;
  divisionCount: number;
  divisions?: DivisionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationHierarchy {
  company: {
    id: string;
    tenantId: string;
    name: string;
    code: string;
    displayName: string | null;
    organizationType: string | null;
    industry: string | null;
    website: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
  };
  businessUnits: BusinessUnitRecord[];
  totalBusinessUnits: number;
  totalDivisions: number;
}

export type LocationType =
  | 'office'
  | 'branch'
  | 'plant_factory'
  | 'client_site'
  | 'remote'
  | 'other';

export type WorkLocationStatus = 'active' | 'inactive';

export interface WorkLocationRecord {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  code: string | null;
  type: LocationType;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timezone: string | null;
  description: string | null;
  status: WorkLocationStatus;
  activeEmployeeCount?: number;
  totalEmployeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// Company Access V1
// =========================================================================

export type CompanyAccessRole = 'member' | 'company_admin';

export interface CompanyAccessUserItem {
  id: string;
  type: 'member' | 'invitation';
  userId?: string;
  invitationId?: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  role: CompanyAccessRole;
  roleLabel: string;
  status: 'active' | 'pending' | 'inactive';
  addedAt: string;
  expiresAt?: string;
}

export interface AvailableTenantUserItem {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  isTenantAdmin: boolean;
}

export interface AssignCompanyUserPayload {
  userId: string;
  role: CompanyAccessRole;
}

export interface InviteCompanyUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  role: CompanyAccessRole;
}

export interface UpdateCompanyUserRolePayload {
  role: CompanyAccessRole;
}

export interface CompanyRoleOverviewItem {
  code: CompanyAccessRole;
  name: string;
  scope: string;
  description: string;
  administrativeCapabilities: string[];
  disclaimer: string;
}


