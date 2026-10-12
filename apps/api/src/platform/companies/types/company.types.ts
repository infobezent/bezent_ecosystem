export type CompanyStatus = 'active' | 'inactive' | 'suspended';

export type CompanyAdminAccessStatus = 'active' | 'pending' | 'none';

export interface CompanyRecord {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  code: string;
  displayName?: string | null;
  legalName: string | null;
  organizationType?: string | null;
  industry?: string | null;
  businessEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  timeZone: string | null;
  registrationNumber?: string | null;
  currency?: string | null;
  locale?: string | null;
  dateFormat?: string | null;
  weekStartsOn?: string | null;
  financialYearStart?: string | null;
  logoUrl?: string | null;
  brandingMode?: 'own_logo' | 'tenant_logo' | 'initials';
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  enabledModules?: string[];
  adminsCount?: number;
  activeAdminsCount?: number;
  pendingAdminsCount?: number;
  adminAccessStatus?: CompanyAdminAccessStatus;
}

export interface CreateCompanyAdminDto {
  userId?: string;
  newUser?: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface CreateCompanyDto {
  id?: string;
  tenantId: string;
  name: string;
  code: string;
  legalName?: string | null;
  businessEmail?: string | null;
  contactPhone?: string | null;
  country?: string | null;
  timeZone?: string | null;
  status?: CompanyStatus;
  modules?: Array<'hrms' | 'crm' | 'project_management'>;
  admin?: CreateCompanyAdminDto;
}

export interface CreateTenantAdminCompanyDto {
  name: string;
  code: string;
  displayName?: string | null;
  legalName?: string | null;
  organizationType?: string | null;
  industry?: string | null;
  businessEmail?: string | null;
  contactPhone?: string | null;
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
  brandingMode?: 'own_logo' | 'tenant_logo' | 'initials';
}

export interface UpdateCompanyDto {
  name?: string;
  legalName?: string | null;
  businessEmail?: string | null;
  contactPhone?: string | null;
  country?: string | null;
  timeZone?: string | null;
}

export interface CompanyFilter {
  tenantId?: string;
  search?: string;
  status?: CompanyStatus;
  moduleCode?: string;
  page?: number;
  limit?: number;
}

export interface CompanyProfile {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  displayName: string | null;
  legalName: string | null;
  organizationType: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  businessEmail: string | null;
  contactPhone: string | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timeZone: string | null;
  registrationNumber?: string | null;
  currency?: string | null;
  locale?: string | null;
  dateFormat?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date | string;
}

export interface UpdateCompanyProfileInput {
  displayName?: string | null;
  legalName?: string | null;
  organizationType?: string | null;
  industry?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  businessEmail?: string | null;
  contactPhone?: string | null;
  alternateEmail?: string | null;
  alternatePhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timeZone?: string | null;
  registrationNumber?: string | null;
  currency?: string | null;
  locale?: string | null;
  dateFormat?: string | null;
}
