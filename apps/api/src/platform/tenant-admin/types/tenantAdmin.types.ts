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

