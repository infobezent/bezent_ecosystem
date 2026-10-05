export interface OrganizationProfile {
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

export interface UpdateOrganizationProfilePayload {
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
