export type LocationType =
  | 'office'
  | 'branch'
  | 'plant_factory'
  | 'client_site'
  | 'remote'
  | 'other';

export const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: 'office', label: 'Office' },
  { value: 'branch', label: 'Branch' },
  { value: 'plant_factory', label: 'Plant / Factory' },
  { value: 'client_site', label: 'Client Site' },
  { value: 'remote', label: 'Remote' },
  { value: 'other', label: 'Other' },
];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  office: 'Office',
  branch: 'Branch',
  plant_factory: 'Plant / Factory',
  client_site: 'Client Site',
  remote: 'Remote',
  other: 'Other',
};

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
  activeEmployeeCount: number;
  totalEmployeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkLocationPayload {
  name: string;
  code?: string | null;
  type: LocationType;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timezone?: string | null;
  description?: string | null;
  status?: WorkLocationStatus;
}

export interface UpdateWorkLocationPayload {
  name?: string;
  code?: string | null;
  type?: LocationType;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timezone?: string | null;
  description?: string | null;
  status?: WorkLocationStatus;
}

export interface ListWorkLocationsFilters {
  status?: 'active' | 'inactive' | 'all';
  locationType?: LocationType | 'all';
  search?: string;
}

export interface WorkLocationLifecycleResult {
  data: WorkLocationRecord;
  affectedEmployeeCount: number;
  message: string;
}
