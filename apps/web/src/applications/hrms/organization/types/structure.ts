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

export interface CompanySummary {
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
}

export interface OrganizationHierarchy {
  company: CompanySummary;
  businessUnits: BusinessUnitRecord[];
  totalBusinessUnits: number;
  totalDivisions: number;
}

export interface CreateBusinessUnitPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  headEmployeeId?: string | null;
  status?: StructuralStatus;
}

export interface UpdateBusinessUnitPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  headEmployeeId?: string | null;
  status?: StructuralStatus;
}

export interface CreateDivisionPayload {
  businessUnitId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  headEmployeeId?: string | null;
  status?: StructuralStatus;
}

export interface UpdateDivisionPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  headEmployeeId?: string | null;
}

export interface SetStatusPayload {
  status: StructuralStatus;
}

export type SelectedNodeType = 'company' | 'business_unit' | 'division';

export interface SelectedNode {
  type: SelectedNodeType;
  id: string;
  data: CompanySummary | BusinessUnitRecord | DivisionRecord;
}
