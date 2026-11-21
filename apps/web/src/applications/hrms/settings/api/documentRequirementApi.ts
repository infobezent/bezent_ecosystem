import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';
import type {
  DocumentCategory,
  CreateDocumentCategoryDto,
  UpdateDocumentCategoryDto,
  DocumentRequirement,
  CreateDocumentRequirementDto,
  UpdateDocumentRequirementDto,
  SaveDocumentApplicabilityDto,
  CandidateDocumentInstance,
} from '../types/documentRequirement.types';

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    const details = errorJson.error?.details
      ? Object.values(errorJson.error.details).join(', ')
      : '';
    throw new Error(details ? `${message}: ${details}` : message);
  }
  const json = await res.json();
  return json.data as T;
}

// ==================== Categories API ====================

export async function fetchDocumentCategories(): Promise<DocumentCategory[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-categories`,
  );
  return handleResponse<DocumentCategory[]>(res, 'Failed to fetch document categories');
}

export async function createDocumentCategory(
  payload: CreateDocumentCategoryDto,
): Promise<DocumentCategory> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-categories`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DocumentCategory>(res, 'Failed to create document category');
}

export async function updateDocumentCategory(
  categoryId: string,
  payload: UpdateDocumentCategoryDto,
): Promise<DocumentCategory> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-categories/${encodeURIComponent(
      categoryId,
    )}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DocumentCategory>(res, 'Failed to update document category');
}

export async function deleteDocumentCategory(categoryId: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-categories/${encodeURIComponent(
      categoryId,
    )}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete document category');
  }
}

export async function reorderDocumentCategories(
  categoryIds: string[],
): Promise<DocumentCategory[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-categories/reorder`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds }),
    },
  );
  return handleResponse<DocumentCategory[]>(res, 'Failed to reorder document categories');
}

// ==================== Document Requirements API ====================

export async function fetchDocumentRequirements(): Promise<DocumentRequirement[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements`,
  );
  return handleResponse<DocumentRequirement[]>(res, 'Failed to fetch document requirements');
}

export async function getDocumentRequirement(id: string): Promise<DocumentRequirement> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements/${encodeURIComponent(
      id,
    )}`,
  );
  return handleResponse<DocumentRequirement>(res, 'Failed to fetch document requirement');
}

export async function createDocumentRequirement(
  payload: CreateDocumentRequirementDto,
): Promise<DocumentRequirement> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DocumentRequirement>(res, 'Failed to create document requirement');
}

export async function updateDocumentRequirement(
  id: string,
  payload: UpdateDocumentRequirementDto,
): Promise<DocumentRequirement> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements/${encodeURIComponent(
      id,
    )}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DocumentRequirement>(res, 'Failed to update document requirement');
}

export async function duplicateDocumentRequirement(id: string): Promise<DocumentRequirement> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements/${encodeURIComponent(
      id,
    )}/duplicate`,
    {
      method: 'POST',
    },
  );
  return handleResponse<DocumentRequirement>(res, 'Failed to duplicate document requirement');
}

export async function deleteDocumentRequirement(id: string): Promise<void> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements/${encodeURIComponent(
      id,
    )}`,
    {
      method: 'DELETE',
    },
  );
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || 'Failed to delete document requirement');
  }
}

export async function saveDocumentApplicability(
  id: string,
  payload: SaveDocumentApplicabilityDto,
): Promise<DocumentRequirement> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements/${encodeURIComponent(
      id,
    )}/applicability`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<DocumentRequirement>(res, 'Failed to save applicability rules');
}

export async function resolveApplicableDocuments(criteria: {
  employmentType?: string;
  departmentId?: string;
  locationId?: string;
  pipelineId?: string;
  stageKey?: string;
}): Promise<DocumentRequirement[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/settings/onboarding/document-requirements/resolve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria),
    },
  );
  return handleResponse<DocumentRequirement[]>(res, 'Failed to resolve applicable documents');
}

// ==================== Candidate Document Workflow API ====================

export async function fetchCandidateDocuments(
  caseId: string,
): Promise<CandidateDocumentInstance[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${encodeURIComponent(caseId)}/documents`,
  );
  return handleResponse<CandidateDocumentInstance[]>(res, 'Failed to fetch candidate documents');
}

export async function generateCandidateDocuments(
  caseId: string,
  params: {
    employmentType?: string;
    departmentId?: string;
    locationId?: string;
    pipelineId?: string;
    stageKey?: string;
  },
): Promise<CandidateDocumentInstance[]> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${encodeURIComponent(caseId)}/documents/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
  );
  return handleResponse<CandidateDocumentInstance[]>(
    res,
    'Failed to generate candidate documents',
  );
}

export async function uploadCandidateDocument(
  caseId: string,
  docId: string,
  payload: {
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    documentNumber?: string;
    expiryDate?: string;
  },
): Promise<CandidateDocumentInstance> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${encodeURIComponent(
      caseId,
    )}/documents/${encodeURIComponent(docId)}/upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<CandidateDocumentInstance>(res, 'Failed to upload candidate document');
}

export async function verifyCandidateDocument(
  caseId: string,
  docId: string,
  payload: {
    status: 'approved' | 'rejected';
    remarks?: string;
    documentNumber?: string;
    expiryDate?: string;
  },
): Promise<CandidateDocumentInstance> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${encodeURIComponent(
      caseId,
    )}/documents/${encodeURIComponent(docId)}/verify`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return handleResponse<CandidateDocumentInstance>(res, 'Failed to verify candidate document');
}

export async function requestCandidateReupload(
  caseId: string,
  docId: string,
  reason: string,
): Promise<CandidateDocumentInstance> {
  const res = await authorizedFetch(
    `${appConfig.apiBaseUrl}/hrms/onboarding/cases/${encodeURIComponent(
      caseId,
    )}/documents/${encodeURIComponent(docId)}/request-reupload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
  return handleResponse<CandidateDocumentInstance>(res, 'Failed to request candidate re-upload');
}
