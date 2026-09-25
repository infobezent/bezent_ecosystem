import type { PaginationMetadata } from '../../employees/types/employee.types.js';

/**
 * Documents domain — the canonical employee-document lifecycle
 * (Administration → Documents). Metadata only until file storage exists.
 */

export const DOCUMENT_CATEGORIES = [
  'personal_identity',
  'address_proof',
  'education',
  'previous_employment',
  'bank_payroll',
  'tax_other',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_STATUSES = [
  'pending',
  'under_review',
  'verified',
  'rejected',
  'resubmission_required',
  'expired',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Main-page views. */
export const DOCUMENT_VIEWS = ['all', 'pending_review', 'expiring', 'expired'] as const;
export type DocumentView = (typeof DOCUMENT_VIEWS)[number];

/** Statuses awaiting an HR reviewer. */
export const PENDING_REVIEW_STATUSES: DocumentStatus[] = ['pending', 'under_review'];

/** A document is "expiring" when its expiry date falls within this many days. */
export const EXPIRY_WARNING_DAYS = 30;

/** Derived from the real expiry date only — never fabricated. */
export type ExpiryState = 'expired' | 'expiring' | 'valid' | null;

export interface CreateEmployeeDocumentDto {
  employeeId: string;
  category: DocumentCategory;
  documentName: string;
  documentNumber: string | null;
  expiryDate: string | null;
}

export interface ListEmployeeDocumentsParams {
  page: number;
  pageSize: number;
  view: DocumentView;
  search?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  departmentId?: string;
  employeeId?: string;
}

export interface EmployeeDocumentListItem {
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
  /** Binary file storage is not available yet; no document has a retrievable file. */
  fileAvailable: false;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentViewCounts = Record<DocumentView, number>;

export interface PaginatedEmployeeDocumentsResult {
  items: EmployeeDocumentListItem[];
  pagination: PaginationMetadata;
  counts: DocumentViewCounts;
}
