export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  isSuperAdmin: boolean;
  memberships: Array<{
    tenantId: string;
    companyId: string;
    role: string;
    status: string;
    companyName?: string | null;
    companyCode?: string | null;
    companyStatus?: string | null;
    tenantName?: string | null;
    tenantStatus?: string | null;
  }>;
}

export interface LoginResult {
  token: string;
  user: AuthenticatedUser;
  expiresAt: string;
  defaultDestination: string;
}
