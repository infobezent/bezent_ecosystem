import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  OrganizationHierarchy,
  EligibleHead,
  BusinessUnitRecord,
  DivisionRecord,
  CreateBusinessUnitPayload,
  UpdateBusinessUnitPayload,
  CreateDivisionPayload,
  UpdateDivisionPayload,
  StructuralStatus,
} from '../types/structure';

export async function fetchOrganizationHierarchy(): Promise<OrganizationHierarchy> {
  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/company-admin/organization/structure`);
  let body: { data?: OrganizationHierarchy; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function fetchEligibleHeads(): Promise<EligibleHead[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/heads`,
  );
  let body: { data?: EligibleHead[]; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function fetchBusinessUnits(): Promise<BusinessUnitRecord[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/business-units`,
  );
  let body: { data?: BusinessUnitRecord[]; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function createBusinessUnit(
  payload: CreateBusinessUnitPayload,
): Promise<BusinessUnitRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/business-units`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: BusinessUnitRecord; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function updateBusinessUnit(
  id: string,
  payload: UpdateBusinessUnitPayload,
): Promise<BusinessUnitRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/business-units/${encodedId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: BusinessUnitRecord; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function setBusinessUnitStatus(
  id: string,
  status: StructuralStatus,
): Promise<BusinessUnitRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/business-units/${encodedId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  let body: { data?: BusinessUnitRecord; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function fetchDivisions(businessUnitId?: string): Promise<DivisionRecord[]> {
  const query = businessUnitId ? `?businessUnitId=${encodeURIComponent(businessUnitId)}` : '';
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/divisions${query}`,
  );
  let body: { data?: DivisionRecord[]; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function createDivision(payload: CreateDivisionPayload): Promise<DivisionRecord> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/divisions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: DivisionRecord; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function updateDivision(
  id: string,
  payload: UpdateDivisionPayload,
): Promise<DivisionRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/divisions/${encodedId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  let body: { data?: DivisionRecord; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}

export async function setDivisionStatus(
  id: string,
  status: StructuralStatus,
): Promise<DivisionRecord> {
  const encodedId = encodeURIComponent(id);
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/company-admin/organization/structure/divisions/${encodedId}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
  );
  let body: { data?: DivisionRecord; error?: { message?: string } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
  }
  return body.data;
}
