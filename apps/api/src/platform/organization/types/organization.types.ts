export interface MasterItem {
  id: string;
  name: string;
  code: string;
}

export interface OrganizationMasters {
  company: { id: string; name: string; code: string } | null;
  departments: MasterItem[];
  designations: MasterItem[];
  locations: (MasterItem & { city: string | null; country: string | null })[];
}

export interface OrganizationProfileRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  displayName: string | null;
  organizationType: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryEmail: string | null;
  phoneNumber: string | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postalCode: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationProfileDto {
  name: string;
  displayName?: string | null;
  organizationType: string;
  industry?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  primaryEmail: string;
  phoneNumber?: string | null;
  alternateEmail?: string | null;
  alternatePhone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  country: string;
  state: string;
  city: string;
  postalCode: string;
}
