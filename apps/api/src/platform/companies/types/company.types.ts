export type CompanyStatus = 'active' | 'inactive' | 'suspended';

export interface CompanyRecord {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  code: string;
  legalName: string | null;
  businessEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  timeZone: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
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
  page?: number;
  limit?: number;
}
