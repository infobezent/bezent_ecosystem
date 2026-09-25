import { appConfig } from '../../../../app/config/env';

/**
 * Documents API client — the canonical employee-document lifecycle.
 * Real backend only; failures surface as `DocumentsApiError`, never as
 * fallback data.
 */

export type DocumentCategory =
  | 'personal_identity'
  | 'address_proof'
  | 'education'
  | 'previous_employment'
  | 'bank_payroll'
  | 'tax_other';

export type DocumentStatus =
  'pending' | 'under_review' | 'verified' | 'rejected' | 'resubmission_required' | 'expired';

export type DocumentView = 'all' | 'pending_review' | 'expiring' | 'expired';

export type ExpiryState = 'expired' | 'expiring' | 'valid' | null;

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  category: DocumentCategory;
  documentName: string;
  documentNumber: string | null;
  status: DocumentStatus;
  expiryDate: string | null;
  expiryState: ExpiryState;
  verificationRemarks: string | null;
  /** Binary file storage does not exist yet — always false. */
  fileAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface DocumentListResponse {
  data: EmployeeDocument[];
  pagination: DocumentsPagination;
  counts: Record<DocumentView, number>;
}

export interface ListDocumentsQuery {
  view?: DocumentView;
  search?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  departmentId?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export class DocumentsApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'DocumentsApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${appConfig.apiBaseUrl}${path}`);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const error = (body as { error?: { message?: string; code?: string } } | null)?.error;
    throw new DocumentsApiError(
      error?.message ?? `Request failed with status ${res.status}`,
      res.status,
      error?.code ?? 'REQUEST_FAILED',
    );
  }
  return body as T;
}

export async function fetchDocuments(
  query: ListDocumentsQuery = {},
): Promise<DocumentListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return request<DocumentListResponse>(`/hrms/employee-documents${qs ? `?${qs}` : ''}`);
}

export async function fetchDocument(id: string): Promise<EmployeeDocument> {
  const body = await request<{ data: EmployeeDocument }>(
    `/hrms/employee-documents/${encodeURIComponent(id)}`,
  );
  return body.data;
}
