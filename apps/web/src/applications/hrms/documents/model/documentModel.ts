import type {
  DocumentCategory,
  DocumentStatus,
  DocumentView,
  ExpiryState,
} from '../api/documentsApi';

/** Main-page views (Requirements management is a later milestone). */
export const DOCUMENT_TABS: { id: DocumentView; label: string }[] = [
  { id: 'all', label: 'All Documents' },
  { id: 'pending_review', label: 'Pending Review' },
  { id: 'expiring', label: 'Expiring' },
  { id: 'expired', label: 'Expired' },
];

/** Approved document categories. */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  personal_identity: 'Personal & Identity',
  address_proof: 'Address Proof',
  education: 'Education',
  previous_employment: 'Previous Employment',
  bank_payroll: 'Bank & Payroll',
  tax_other: 'Tax & Other Documents',
};

/** Approved lifecycle statuses. */
export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
  resubmission_required: 'Resubmission Required',
  expired: 'Expired',
};

export function statusVariant(
  status: DocumentStatus,
): 'neutral' | 'info' | 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'verified':
      return 'success';
    case 'under_review':
      return 'info';
    case 'rejected':
    case 'expired':
      return 'danger';
    case 'resubmission_required':
      return 'warning';
    default:
      return 'neutral';
  }
}

export const EXPIRY_LABELS: Record<Exclude<ExpiryState, null | 'valid'>, string> = {
  expired: 'Expired',
  expiring: 'Expiring soon',
};
