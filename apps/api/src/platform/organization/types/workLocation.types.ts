export type LocationType =
  | 'office'
  | 'branch'
  | 'plant_factory'
  | 'client_site'
  | 'remote'
  | 'other';

export const LOCATION_TYPES: readonly LocationType[] = [
  'office',
  'branch',
  'plant_factory',
  'client_site',
  'remote',
  'other',
] as const;

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
  createdAt: Date | string;
  updatedAt: Date | string;
  activeEmployeeCount: number;
  totalEmployeeCount: number;
}

export interface CreateWorkLocationDto {
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

export interface UpdateWorkLocationDto {
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

export interface ListWorkLocationsFilter {
  status?: 'active' | 'inactive' | 'all';
  locationType?: LocationType | 'all';
  search?: string;
}

export interface WorkLocationLifecycleResult {
  data: WorkLocationRecord;
  affectedEmployeeCount: number;
  message: string;
}
