export type UserAccountStatus = 'active' | 'inactive' | 'suspended';

export interface UserMembershipRecord {
  id: string;
  tenantId: string;
  tenantName?: string;
  companyId: string;
  companyName?: string;
  role: string;
  status: string;
}

export interface PlatformUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: UserAccountStatus;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  memberships?: UserMembershipRecord[];
}

export interface CreateUserDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status?: UserAccountStatus;
  isSuperAdmin?: boolean;
}

export interface UserFilter {
  search?: string;
  tenantId?: string;
  companyId?: string;
  status?: UserAccountStatus;
  page?: number;
  limit?: number;
}
