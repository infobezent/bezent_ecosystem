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
  ProgressBar,
  Select,
  Input,
  Divider,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { essApi, type EssLeaveBalanceItem, type EssLeaveRequest } from '../api/essApi';

type LeaveWorkspace = {
  balances: EssLeaveBalanceItem[];
  requests: EssLeaveRequest[];
  holidays: Array<{ name: string; date: string; dayOfWeek: string }>;
};

const LEAVE_TYPE_OPTIONS = [
  { value: 'annual', label: 'Annual / Paid Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'unpaid', label: 'Unpaid Leave (Loss of Pay)' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Requests' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function EssLeavePage() {
  const [workspace, setWorkspace] = useState<LeaveWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply Leave Modal state
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'casual' | 'unpaid'>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Cancel & Detail Modal state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelRequest, setConfirmCancelRequest] = useState<EssLeaveRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EssLeaveRequest | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getLeave();
      setWorkspace(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Calculate requested days
  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const selectedBalance = useMemo(() => {
    if (!workspace?.balances) return null;
    return workspace.balances.find((b) => b.leaveType === leaveType) || null;
  }, [workspace?.balances, leaveType]);

  const isInsufficientBalance =
    leaveType !== 'unpaid' &&
    selectedBalance !== null &&
    requestedDays > selectedBalance.availableDays;

  const handleApplyLeave = async () => {
    setApplyLoading(true);
    setApplyError(null);
    try {
      await essApi.applyLeave({ leaveType, startDate, endDate, reason });
      setSuccessMsg('Leave application submitted successfully.');
      setApplyOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      await load();
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Failed to apply for leave');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelRequest) return;
    setCancellingId(confirmCancelRequest.id);
    try {
      await essApi.cancelLeave(confirmCancelRequest.id);
      setSuccessMsg('Leave request cancelled successfully.');
      setConfirmCancelRequest(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel leave');
    } finally {
      setCancellingId(null);
    }
  };

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (!workspace?.requests) return [];
    if (statusFilter === 'all') return workspace.requests;
    return workspace.requests.filter((r) => r.status === statusFilter);
  }, [workspace?.requests, statusFilter]);

  if (loading) return <LoadingState label="Loading leave workspace..." />;
  if (error)
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  if (!workspace) return null;

  const balanceColors: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
    annual: 'success',
    sick: 'warning',
    casual: 'info',
    unpaid: 'neutral',
  };

  const todayStr = new Date().toISOString().split('T')[0] ?? '';

  return (
    <Page>
      <PageHeader
        title="Leave Management"
        subtitle="View annual leave balances, submit leave applications, track approvals, and holiday calendar"
        actions={
          <Button
            id="ess-apply-leave-btn"
            variant="primary"
            leftIcon={<BezentIcon name="leave" size={16} />}
            onClick={() => setApplyOpen(true)}
          >
            Apply for Leave
          </Button>
        }
      />

      {successMsg && (
        <Alert variant="success" title="Success">
          {successMsg}
        </Alert>
      )}

      {/* ── Leave Balances ────────────────────────────────────────── */}
      <Section
        title="Leave Balances"
        subtitle={`Annual entitlement for year ${new Date().getFullYear()}`}
      >
        <Grid columns={4} gap="md">
          {workspace.balances.map((bal) => {
            const usedPct =
              bal.totalDays > 0
                ? Math.min(100, Math.round((bal.usedDays / bal.totalDays) * 100))
                : 0;
            return (
              <Card key={bal.leaveType} variant="default">
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <Badge variant={balanceColors[bal.leaveType] ?? 'neutral'} size="md">
                      {capitalise(bal.leaveType)} Leave
                    </Badge>
                    <Inline gap="xs" align="baseline">
                      <strong>{bal.availableDays}</strong>
                      <span>days left</span>
                    </Inline>
                  </Inline>

                  {bal.leaveType !== 'unpaid' ? (
                    <Stack gap="xs">
                      <ProgressBar
                        value={bal.usedDays}
                        max={bal.totalDays}
                        variant={usedPct > 80 ? 'danger' : 'primary'}
                        size="sm"
                      />
                      <Inline justify="between" align="center">
                        <span>
                          Used: {bal.usedDays} of {bal.totalDays}
                        </span>
                        {bal.pendingDays > 0 && <span>Pending: {bal.pendingDays}</span>}
                      </Inline>
                    </Stack>
                  ) : (
                    <span>No quota limit (Loss of pay)</span>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Grid>
      </Section>

      {/* ── Leave Requests ────────────────────────────────────────── */}
      <Section
        title="My Leave History"
        subtitle="Track approval status or cancel pending leave requests"
      >
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
              title="No Leave Requests Found"
              description={
                statusFilter === 'all'
                  ? 'You have not submitted any leave applications yet.'
                  : `No leave applications with status "${statusFilter}".`
              }
              primaryAction={{ label: 'Apply for Leave', onClick: () => setApplyOpen(true) }}
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Leave Type</TableHeaderCell>
                    <TableHeaderCell>Start Date</TableHeaderCell>
                    <TableHeaderCell>End Date</TableHeaderCell>
                    <TableHeaderCell>Days</TableHeaderCell>
                    <TableHeaderCell>Reason</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <Badge variant={balanceColors[req.leaveType] ?? 'neutral'}>
                          {capitalise(req.leaveType)}
                        </Badge>
                      </TableCell>
                      <TableCell>{req.startDate}</TableCell>
                      <TableCell>{req.endDate}</TableCell>
                      <TableCell>
                        <strong>{req.totalDays} day(s)</strong>
                      </TableCell>
                      <TableCell>{req.reason}</TableCell>
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
                          {capitalise(req.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Inline gap="xs" align="center">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
                            Details
                          </Button>
                          {req.status === 'pending' && (
                            <Button
                              id={`cancel-leave-${req.id}`}
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

      {/* ── Holiday Calendar ──────────────────────────────────────── */}
      <Section
        title="Upcoming Holidays"
        subtitle="Public and mandatory holidays for the current calendar year"
      >
        <Grid columns={3} gap="md">
          {workspace.holidays.map((h) => {
            const isPast = h.date < todayStr;
            return (
              <Card key={h.date} variant={isPast ? 'flat' : 'default'}>
                <Inline gap="md" align="center">
                  <BezentIcon name="calendar" size={24} />
                  <Stack gap="xs">
                    <Inline gap="xs" align="center">
                      <strong>{h.name}</strong>
                      {isPast ? (
                        <Badge variant="neutral" size="sm">
                          Past
                        </Badge>
                      ) : (
                        <Badge variant="info" size="sm">
                          Upcoming
                        </Badge>
                      )}
                    </Inline>
                    <span>
                      {h.date} • {h.dayOfWeek}
                    </span>
                  </Stack>
                </Inline>
              </Card>
            );
          })}
        </Grid>
      </Section>

      {/* ── Apply Leave Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={applyOpen}
        title="Apply for Leave"
        onClose={() => setApplyOpen(false)}
        footer={
          <Inline gap="sm" justify="end">
            <Button id="leave-cancel" variant="secondary" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button
              id="leave-submit"
              variant="primary"
              onClick={handleApplyLeave}
              loading={applyLoading}
              disabled={isInsufficientBalance || requestedDays <= 0}
            >
              Submit Application
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {applyError && (
            <Alert variant="error" title="Error">
              {applyError}
            </Alert>
          )}

          {isInsufficientBalance && (
            <Alert variant="warning" title="Insufficient Leave Balance">
              You have requested {requestedDays} day(s), but your available balance for{' '}
              {capitalise(leaveType)} Leave is only {selectedBalance?.availableDays} day(s).
            </Alert>
          )}

          <FormSection title="Leave Details">
            <FormGrid columns={1}>
              <Select
                label="Leave Type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as typeof leaveType)}
                options={LEAVE_TYPE_OPTIONS}
              />

              <Grid columns={2} gap="md">
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Grid>

              {requestedDays > 0 && (
                <Card variant="flat" padding="sm">
                  <Inline justify="between" align="center">
                    <span>
                      Total Duration: <strong>{requestedDays} day(s)</strong>
                    </span>
                    {selectedBalance && leaveType !== 'unpaid' && (
                      <span>
                        Available Balance: <strong>{selectedBalance.availableDays} day(s)</strong>
                      </span>
                    )}
                  </Inline>
                </Card>
              )}

              <Input
                label="Reason"
                placeholder="State your reason for leave (e.g. Vacation, Medical rest, Family occasion)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormGrid>
          </FormSection>
        </Stack>
      </Modal>

      {/* ── Cancel Confirmation Modal ─────────────────────────────── */}
      {confirmCancelRequest && (
        <Modal
          isOpen={true}
          title="Confirm Leave Cancellation"
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
                Yes, Cancel Leave
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <span>
              Are you sure you want to cancel your{' '}
              <strong>{capitalise(confirmCancelRequest.leaveType)} Leave</strong> request from{' '}
              <strong>{confirmCancelRequest.startDate}</strong> to{' '}
              <strong>{confirmCancelRequest.endDate}</strong> ({confirmCancelRequest.totalDays}{' '}
              day(s))?
            </span>
            <span>Your leave balance will be restored automatically.</span>
          </Stack>
        </Modal>
      )}

      {/* ── Request Details Modal ─────────────────────────────────── */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          title="Leave Request Details"
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
                <span>Leave Type</span>
                <Badge variant={balanceColors[selectedRequest.leaveType] ?? 'neutral'}>
                  {capitalise(selectedRequest.leaveType)}
                </Badge>
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
                  {capitalise(selectedRequest.status)}
                </Badge>
              </Stack>
              <Stack gap="xs">
                <span>Start Date</span>
                <strong>{selectedRequest.startDate}</strong>
              </Stack>
              <Stack gap="xs">
                <span>End Date</span>
                <strong>{selectedRequest.endDate}</strong>
              </Stack>
              <Stack gap="xs">
                <span>Total Days</span>
                <strong>{selectedRequest.totalDays} day(s)</strong>
              </Stack>
              <Stack gap="xs">
                <span>Applied On</span>
                <span>{new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
              </Stack>
            </Grid>
            <Divider />
            <Stack gap="xs">
              <span>Reason</span>
              <p>{selectedRequest.reason}</p>
            </Stack>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
