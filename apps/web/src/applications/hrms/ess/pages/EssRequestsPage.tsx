import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
  Toolbar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Modal,
  FormSection,
  FormGrid,
  EmptyState,
  Select,
  Input,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { essApi, type EssRequest } from '../api/essApi';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Request Types' },
  { value: 'profile_change', label: 'Profile Change' },
  { value: 'attendance_regularization', label: 'Attendance Regularization' },
  { value: 'document_request', label: 'Document / Letter Request' },
  { value: 'general_service', label: 'General HR Service' },
];

const NEW_REQUEST_TYPES = [
  { value: 'document_request', label: 'Document / Letter Request' },
  { value: 'general_service', label: 'General HR Helpdesk / Service' },
];

const DOCUMENT_LETTER_PRESETS = [
  { value: 'bonafide', label: 'Bonafide Certificate (Bank / Loan / Address Proof)' },
  { value: 'salary_cert', label: 'Salary Certificate' },
  { value: 'employment_verif', label: 'Employment Verification Letter' },
  { value: 'visa_support', label: 'Visa Support / Travel Letter' },
  { value: 'experience_letter', label: 'Experience / Relieving Certificate' },
  { value: 'custom_doc', label: 'Other Document Request' },
];

export function EssRequestsPage() {
  const [requests, setRequests] = useState<EssRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<'document_request' | 'general_service'>(
    'document_request',
  );
  const [documentPreset, setDocumentPreset] = useState('bonafide');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Selected & Cancel
  const [selectedRequest, setSelectedRequest] = useState<EssRequest | null>(null);
  const [confirmCancelRequest, setConfirmCancelRequest] = useState<EssRequest | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getRequests();
      setRequests(data.requests);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateRequest = async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const finalSubject =
        subject.trim() ||
        (requestType === 'document_request'
          ? `Request for ${documentPreset.replace(/_/g, ' ')}`
          : 'General HR Request');
      await essApi.createRequest({
        requestType,
        subject: finalSubject,
        details: {
          preset: documentPreset,
          description: description.trim(),
          submittedAt: new Date().toISOString(),
        },
      });
      setSuccessMsg('Your request has been submitted successfully.');
      setCreateOpen(false);
      setSubject('');
      setDescription('');
      await load();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelRequest) return;
    setCancellingId(confirmCancelRequest.id);
    try {
      await essApi.cancelRequest(confirmCancelRequest.id);
      setSuccessMsg('Request cancelled successfully.');
      setConfirmCancelRequest(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.requestType !== typeFilter) return false;
      return true;
    });
  }, [requests, statusFilter, typeFilter]);

  if (loading) return <LoadingState label="Loading requests..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );

  const typeLabel = (t: EssRequest['requestType']): string =>
    t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Page>
      <PageHeader
        title="My Requests"
        subtitle="Unified request ledger for letter requests, profile corrections, attendance regularizations, and HR service tickets"
        actions={
          <Button
            id="ess-raise-request-btn"
            variant="primary"
            leftIcon={<BezentIcon name="plus" size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            Raise Request
          </Button>
        }
      />

      {successMsg && (
        <Alert variant="success" title="Success">
          {successMsg}
        </Alert>
      )}

      {/* ── Summary Counters Strip ─────────────────────────────────── */}
      <Section title="Requests Overview">
        <Grid columns={4} gap="md">
          <Card variant="default">
            <Stack gap="xs">
              <span>Total Requests</span>
              <strong>{totalCount}</strong>
              <span>Submitted across all categories</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Pending Review</span>
              <strong>{pendingCount}</strong>
              <span>Awaiting HR / Manager action</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Approved</span>
              <strong>{approvedCount}</strong>
              <span>Resolved and finalized</span>
            </Stack>
          </Card>

          <Card variant="flat">
            <Stack gap="xs">
              <span>Rejected / Cancelled</span>
              <strong>{rejectedCount}</strong>
              <span>Closed without fulfillment</span>
            </Stack>
          </Card>
        </Grid>
      </Section>

      {/* ── Requests Table ────────────────────────────────────────── */}
      <Section title="Request Ledger">
        <Stack gap="md">
          <Toolbar
            left={
              <Inline gap="sm" align="center">
                <Select
                  size="sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={STATUS_FILTER_OPTIONS}
                />
                <Select
                  size="sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={TYPE_FILTER_OPTIONS}
                />
              </Inline>
            }
            right={
              <span>
                Showing <strong>{filteredRequests.length}</strong> request(s)
              </span>
            }
          />

          {filteredRequests.length === 0 ? (
            <EmptyState
              title="No Requests Found"
              description={
                totalCount === 0
                  ? 'All your HR requests will appear here. Click "Raise Request" to submit a new service or document request.'
                  : 'No requests match your selected filters.'
              }
              primaryAction={{ label: 'Raise Request', onClick: () => setCreateOpen(true) }}
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Subject</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Submitted Date</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Badge
                          variant={
                            req.requestType === 'attendance_regularization'
                              ? 'info'
                              : req.requestType === 'profile_change'
                                ? 'warning'
                                : 'neutral'
                          }
                          size="sm"
                        >
                          {typeLabel(req.requestType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <strong>{req.subject}</strong>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'success'
                              : req.status === 'rejected'
                                ? 'danger'
                                : req.status === 'cancelled'
                                  ? 'neutral'
                                  : 'warning'
                          }
                        >
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(req.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Inline gap="xs" align="center">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                            Details
                          </Button>
                          {req.status === 'pending' && (
                            <Button
                              id={`cancel-req-${req.id}`}
                              variant="danger"
                              size="sm"
                              onClick={() => setConfirmCancelRequest(req)}
                            >
                              Cancel
                            </Button>
                          )}
                        </Inline>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      </Section>

      {/* ── Raise Request Modal ───────────────────────────────────── */}
      <Modal
        isOpen={createOpen}
        title="Raise New Request"
        onClose={() => setCreateOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRequest} loading={createLoading}>
              Submit Request
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {createError && (
            <Alert variant="error" title="Error">
              {createError}
            </Alert>
          )}
          <FormSection title="Request Category">
            <FormGrid columns={1}>
              <Select
                label="Request Type"
                value={requestType}
                onChange={(e) =>
                  setRequestType(e.target.value as 'document_request' | 'general_service')
                }
                options={NEW_REQUEST_TYPES}
              />

              {requestType === 'document_request' && (
                <Select
                  label="Document Type Preset"
                  value={documentPreset}
                  onChange={(e) => setDocumentPreset(e.target.value)}
                  options={DOCUMENT_LETTER_PRESETS}
                />
              )}

              <Input
                label="Subject / Purpose"
                placeholder={
                  requestType === 'document_request'
                    ? 'e.g., Bonafide letter for Home Loan application'
                    : 'e.g., Request for second monitor / IT Helpdesk'
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <Input
                label="Additional Details / Notes"
                placeholder="Provide any specific requirements, deadlines, or remarks for HR..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          title={`Request Details — ${selectedRequest.subject}`}
          onClose={() => setSelectedRequest(null)}
          footer={
            <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          }
        >
          <Stack gap="md">
            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <span>Category</span>
                <Badge variant="neutral">{typeLabel(selectedRequest.requestType)}</Badge>
              </Stack>
              <Stack gap="xs">
                <span>Status</span>
                <Badge
                  variant={
                    selectedRequest.status === 'approved'
                      ? 'success'
                      : selectedRequest.status === 'rejected'
                        ? 'danger'
                        : selectedRequest.status === 'cancelled'
                          ? 'neutral'
                          : 'warning'
                  }
                >
                  {selectedRequest.status.toUpperCase()}
                </Badge>
              </Stack>
              <Stack gap="xs">
                <span>Submitted At</span>
                <strong>{new Date(selectedRequest.createdAt).toLocaleString()}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Last Updated</span>
                <span>{new Date(selectedRequest.updatedAt).toLocaleString()}</span>
              </Stack>
            </Grid>

            {selectedRequest.reviewerNotes && (
              <Card variant="flat" padding="sm">
                <Stack gap="xs">
                  <span>Reviewer Remarks</span>
                  <p>{selectedRequest.reviewerNotes}</p>
                </Stack>
              </Card>
            )}

            <Divider />
            <Stack gap="xs">
              <span>Request Payload / Details</span>
              <pre>{JSON.stringify(selectedRequest.details, null, 2)}</pre>
            </Stack>
          </Stack>
        </Modal>
      )}

      {/* ── Cancel Confirmation Modal ─────────────────────────────── */}
      {confirmCancelRequest && (
        <Modal
          isOpen={true}
          title="Confirm Request Cancellation"
          onClose={() => setConfirmCancelRequest(null)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setConfirmCancelRequest(null)}>
                Keep Request
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmCancel}
                loading={cancellingId === confirmCancelRequest.id}
              >
                Yes, Cancel Request
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <span>
              Are you sure you want to cancel the request:{' '}
              <strong>{confirmCancelRequest.subject}</strong>?
            </span>
            <span>Once cancelled, this request will be archived and cannot be reopened.</span>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
