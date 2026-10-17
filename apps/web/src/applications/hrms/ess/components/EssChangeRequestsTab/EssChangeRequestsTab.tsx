import { useState, useMemo } from 'react';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Modal,
  Inline,
  Stack,
  type BadgeVariant,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { essApi, type EssRequest } from '../../api/essApi';

export interface EssChangeRequestsTabProps {
  changeRequests: EssRequest[];
  loading?: boolean;
  onRefresh?: () => Promise<void> | void;
  onRequestNewChange: () => void;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function getStatusBadge(status: EssRequest['status']): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'pending':
      return { label: 'Pending Review', variant: 'warning' };
    case 'approved':
      return { label: 'Approved', variant: 'success' };
    case 'rejected':
      return { label: 'Rejected', variant: 'danger' };
    case 'cancelled':
      return { label: 'Cancelled', variant: 'neutral' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

function getSectionLabel(section?: string | null): string {
  if (!section) return 'General';
  switch (section) {
    case 'personal':
      return 'Personal Information';
    case 'address':
      return 'Residential Address';
    case 'emergency_contact':
      return 'Emergency Contact';
    case 'bank_account':
      return 'Bank Account';
    default:
      return section.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

interface ParsedChangeItem {
  key: string;
  label: string;
  value: string;
}

function extractChanges(request: EssRequest): ParsedChangeItem[] {
  const details = request.details || {};
  const rawChanges =
    ((request as unknown as { changes?: unknown }).changes as Record<string, unknown>) ||
    (details.changes as Record<string, unknown>) ||
    {};

  // Case 1: Structured change object with field, fieldLabel, proposedValue
  if ('proposedValue' in rawChanges || 'field' in rawChanges) {
    const label =
      (rawChanges.fieldLabel as string) || (rawChanges.field as string) || 'Proposed Value';
    const val = String(rawChanges.proposedValue ?? '—');
    return [{ key: (rawChanges.field as string) || 'change', label, value: val }];
  }

  // Case 2: Key-value dictionary of modified fields
  const items: ParsedChangeItem[] = [];
  for (const [k, v] of Object.entries(rawChanges)) {
    if (v === null || v === undefined || typeof v === 'object') continue;
    const formattedKey = k
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim();
    const label = formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1);
    items.push({
      key: k,
      label,
      value: String(v),
    });
  }

  return items;
}

export function EssChangeRequestsTab({
  changeRequests,
  loading = false,
  onRefresh,
  onRequestNewChange,
}: EssChangeRequestsTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<EssRequest | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState<EssRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionAlert, setActionAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sort newest first
  const sortedRequests = useMemo(() => {
    return [...changeRequests].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [changeRequests]);

  // Actual metric counts derived strictly from API results
  const counts = useMemo(() => {
    const total = sortedRequests.length;
    const pending = sortedRequests.filter((r) => r.status === 'pending').length;
    const approved = sortedRequests.filter((r) => r.status === 'approved').length;
    const rejected = sortedRequests.filter((r) => r.status === 'rejected').length;
    const cancelled = sortedRequests.filter((r) => r.status === 'cancelled').length;
    return { total, pending, approved, rejected, cancelled };
  }, [sortedRequests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    if (activeFilter === 'all') return sortedRequests;
    return sortedRequests.filter((r) => r.status === activeFilter);
  }, [sortedRequests, activeFilter]);

  const handleOpenCancel = (req: EssRequest) => {
    setCancellingRequest(req);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRequest) return;
    setIsCancelling(true);
    setActionAlert(null);
    try {
      await essApi.cancelRequest(cancellingRequest.id);
      setActionAlert({
        type: 'success',
        message: `Change request #${cancellingRequest.id.slice(0, 8)} has been cancelled.`,
      });
      setCancellingRequest(null);
      if (selectedRequest?.id === cancellingRequest.id) {
        setSelectedRequest(null);
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: unknown) {
      setActionAlert({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to cancel change request',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading profile change requests..." />;
  }

  return (
    <div className="ess-profile-sections-stack">
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="ess-profile-section-panel">
        <div className="ess-profile-section-header">
          <div className="ess-profile-section-title-wrap">
            <div className="ess-profile-section-icon-badge">
              <BezentIcon name="edit" size={16} />
            </div>
            <div>
              <h3 className="ess-profile-section-heading">Profile Change Requests</h3>
              <p className="ess-profile-section-desc">
                Track formal corrections to verified personal, identity, and statutory records
                submitted for HR review
              </p>
            </div>
          </div>
          <Button
            id="ess-change-requests-new-btn"
            variant="primary"
            size="sm"
            leftIcon={<BezentIcon name="add" size={14} />}
            onClick={onRequestNewChange}
          >
            New Request
          </Button>
        </div>

        {/* Action feedback alert */}
        {actionAlert && (
          <div className="ess-change-req-alert-wrap">
            <Alert variant={actionAlert.type}>{actionAlert.message}</Alert>
          </div>
        )}

        {/* ── Summary Count Cards ─────────────────────────────────── */}
        <div className="ess-change-req-metrics" data-testid="change-requests-metrics">
          <div className="ess-change-req-metric-card ess-change-req-metric-card--total">
            <span className="ess-change-req-metric-val">{counts.total}</span>
            <span className="ess-change-req-metric-label">Total Requests</span>
          </div>
          <div className="ess-change-req-metric-card ess-change-req-metric-card--pending">
            <span className="ess-change-req-metric-val">{counts.pending}</span>
            <span className="ess-change-req-metric-label">Pending HR Review</span>
          </div>
          <div className="ess-change-req-metric-card ess-change-req-metric-card--approved">
            <span className="ess-change-req-metric-val">{counts.approved}</span>
            <span className="ess-change-req-metric-label">Approved</span>
          </div>
          <div className="ess-change-req-metric-card ess-change-req-metric-card--rejected">
            <span className="ess-change-req-metric-val">{counts.rejected}</span>
            <span className="ess-change-req-metric-label">Rejected</span>
          </div>
        </div>

        {/* ── Status Filters ──────────────────────────────────────── */}
        <div
          className="ess-change-req-filters"
          role="tablist"
          aria-label="Filter change requests by status"
        >
          <button
            type="button"
            className={`ess-change-req-filter-btn ${activeFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Requests <span className="ess-change-req-count-pill">{counts.total}</span>
          </button>
          <button
            type="button"
            className={`ess-change-req-filter-btn ${activeFilter === 'pending' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('pending')}
          >
            Pending <span className="ess-change-req-count-pill">{counts.pending}</span>
          </button>
          <button
            type="button"
            className={`ess-change-req-filter-btn ${activeFilter === 'approved' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('approved')}
          >
            Approved <span className="ess-change-req-count-pill">{counts.approved}</span>
          </button>
          <button
            type="button"
            className={`ess-change-req-filter-btn ${activeFilter === 'rejected' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('rejected')}
          >
            Rejected <span className="ess-change-req-count-pill">{counts.rejected}</span>
          </button>
          <button
            type="button"
            className={`ess-change-req-filter-btn ${activeFilter === 'cancelled' ? 'is-active' : ''}`}
            onClick={() => setActiveFilter('cancelled')}
          >
            Cancelled <span className="ess-change-req-count-pill">{counts.cancelled}</span>
          </button>
        </div>

        {/* ── Request List ────────────────────────────────────────── */}
        {sortedRequests.length === 0 ? (
          <EmptyState
            size="compact"
            title="No Profile Change Requests"
            description="You have not submitted any profile correction requests yet. If your legal identity or address requires updating, submit a request for HR verification."
            primaryAction={{
              label: 'Submit First Request',
              onClick: onRequestNewChange,
            }}
          />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            size="compact"
            title={`No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Requests`}
            description={`There are currently no profile correction requests with "${activeFilter}" status.`}
            primaryAction={{
              label: 'View All Requests',
              onClick: () => setActiveFilter('all'),
            }}
          />
        ) : (
          <div className="ess-change-req-list" data-testid="change-requests-list">
            {filteredRequests.map((req) => {
              const statusBadge = getStatusBadge(req.status);
              const section =
                (req as unknown as { section?: string }).section ||
                (req.details?.section as string | undefined);
              const sectionLabel = getSectionLabel(section);
              const reason =
                (req as unknown as { reason?: string }).reason ||
                (req.details?.reason as string | undefined);
              const changes = extractChanges(req);

              return (
                <div
                  key={req.id}
                  className="ess-change-req-card"
                  data-testid={`change-request-item-${req.id}`}
                >
                  <div className="ess-change-req-card-top">
                    <Inline gap="xs" align="center">
                      <span className="ess-change-req-id-tag">
                        REQ-{req.id.slice(0, 8).toUpperCase()}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {sectionLabel}
                      </Badge>
                      <h4 className="ess-change-req-title">{req.subject}</h4>
                    </Inline>

                    <Inline gap="xs" align="center">
                      <Badge variant={statusBadge.variant} size="sm">
                        {statusBadge.label}
                      </Badge>
                    </Inline>
                  </div>

                  <div className="ess-change-req-sub">
                    <span>
                      Submitted: <strong>{formatDate(req.createdAt)}</strong>
                    </span>
                    {req.updatedAt && req.updatedAt !== req.createdAt && (
                      <>
                        <span className="ess-profile-dot-separator">•</span>
                        <span>
                          Updated: <strong>{formatDate(req.updatedAt)}</strong>
                        </span>
                      </>
                    )}
                    {reason && (
                      <>
                        <span className="ess-profile-dot-separator">•</span>
                        <span>
                          Reason: <em>{reason}</em>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Changes preview */}
                  {changes.length > 0 && (
                    <div className="ess-change-req-changes-box">
                      {changes.map((c) => (
                        <div key={c.key} className="ess-change-req-change-row">
                          <span className="ess-change-req-change-field">{c.label}:</span>
                          <span className="ess-change-req-change-val">{c.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reviewer remarks if available */}
                  {req.reviewerNotes && (
                    <div className="ess-change-req-reviewer-box">
                      <strong>HR Reviewer Remarks:</strong> {req.reviewerNotes}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="ess-profile-emergency-actions">
                    <Button variant="secondary" size="sm" onClick={() => setSelectedRequest(req)}>
                      View Details
                    </Button>
                    {req.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenCancel(req)}>
                        Cancel Request
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Request Details Modal ─────────────────────────────────── */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          title={`Request Details — REQ-${selectedRequest.id.slice(0, 8).toUpperCase()}`}
          description="Detailed breakdown of profile correction submission and HR verification status"
          onClose={() => setSelectedRequest(null)}
          footer={
            <div className="ess-change-req-footer-full">
              <Inline gap="sm" justify="between">
                <div>
                  {selectedRequest.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const r = selectedRequest;
                        setSelectedRequest(null);
                        handleOpenCancel(r);
                      }}
                    >
                      Cancel Request
                    </Button>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </Inline>
            </div>
          }
        >
          <Stack gap="md">
            <div className="ess-change-req-detail-section">
              <div className="ess-change-req-detail-row">
                <span className="ess-change-req-detail-label">Status</span>
                <Badge variant={getStatusBadge(selectedRequest.status).variant} size="sm">
                  {getStatusBadge(selectedRequest.status).label}
                </Badge>
              </div>

              <div className="ess-change-req-detail-row">
                <span className="ess-change-req-detail-label">Category Section</span>
                <span className="ess-change-req-detail-val">
                  {getSectionLabel(
                    (selectedRequest as unknown as { section?: string }).section ||
                      (selectedRequest.details?.section as string | undefined),
                  )}
                </span>
              </div>

              <div className="ess-change-req-detail-row">
                <span className="ess-change-req-detail-label">Subject</span>
                <span className="ess-change-req-detail-val">{selectedRequest.subject}</span>
              </div>

              <div className="ess-change-req-detail-row">
                <span className="ess-change-req-detail-label">Date Submitted</span>
                <span className="ess-change-req-detail-val">
                  {formatDateTime(selectedRequest.createdAt)}
                </span>
              </div>

              {selectedRequest.updatedAt && (
                <div className="ess-change-req-detail-row">
                  <span className="ess-change-req-detail-label">Last Updated</span>
                  <span className="ess-change-req-detail-val">
                    {formatDateTime(selectedRequest.updatedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Requested Values */}
            <div className="ess-change-req-detail-section">
              <div className="ess-profile-field-label">Requested Corrections</div>
              {extractChanges(selectedRequest).length > 0 ? (
                extractChanges(selectedRequest).map((c) => (
                  <div key={c.key} className="ess-change-req-detail-row">
                    <span className="ess-change-req-detail-label">{c.label}</span>
                    <span className="ess-change-req-detail-val">{c.value}</span>
                  </div>
                ))
              ) : (
                <span className="ess-profile-field-value is-empty">
                  No individual field breakdown provided.
                </span>
              )}
            </div>

            {/* Employee Justification */}
            <div className="ess-change-req-detail-section">
              <div className="ess-profile-field-label">Employee Reason / Justification</div>
              <span className="ess-change-req-detail-val ess-change-req-detail-val--left">
                {(selectedRequest as unknown as { reason?: string }).reason ||
                  (selectedRequest.details?.reason as string | undefined) ||
                  (selectedRequest.details?.description as string | undefined) ||
                  'No justification statement provided.'}
              </span>
            </div>

            {/* HR Reviewer Feedback */}
            {selectedRequest.reviewerNotes && (
              <div className="ess-change-req-reviewer-box">
                <strong>HR Verification Response:</strong>
                <p className="ess-change-req-reviewer-text">{selectedRequest.reviewerNotes}</p>
              </div>
            )}
          </Stack>
        </Modal>
      )}

      {/* ── Cancel Confirmation Modal ─────────────────────────────── */}
      {cancellingRequest && (
        <Modal
          isOpen={true}
          title="Cancel Profile Change Request"
          description={`Are you sure you want to withdraw request REQ-${cancellingRequest.id.slice(0, 8).toUpperCase()}?`}
          onClose={() => !isCancelling && setCancellingRequest(null)}
          footer={
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCancellingRequest(null)}
                disabled={isCancelling}
              >
                Keep Request
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmCancel}
                loading={isCancelling}
              >
                Confirm Cancellation
              </Button>
            </Inline>
          }
        >
          <Stack gap="sm">
            <span>
              This will withdraw your correction request for{' '}
              <strong>{cancellingRequest.subject}</strong> from the HR review queue.
            </span>
            <span className="ess-change-req-cancel-note">
              Note: Withdrawn requests cannot be reinstated, but you may submit a new request at any
              time.
            </span>
          </Stack>
        </Modal>
      )}
    </div>
  );
}

export default EssChangeRequestsTab;
