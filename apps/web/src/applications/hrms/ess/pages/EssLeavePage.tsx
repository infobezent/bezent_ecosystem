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
  Textarea,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  essApi,
  type EssHalfDaySession,
  type EssLeaveApprovalItem,
  type EssLeaveRequest,
  type EssLeaveTransactionItem,
} from '../api/essApi';

type LeaveWorkspace = Awaited<ReturnType<typeof essApi.getLeave>>;

type BadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';
const BADGE_TONES: BadgeTone[] = ['success', 'warning', 'info', 'danger', 'neutral'];
const toneOf = (token: string): BadgeTone =>
  (BADGE_TONES as string[]).includes(token) ? (token as BadgeTone) : 'neutral';

const DURATION_OPTIONS = [
  { value: 'full', label: 'Full Day(s)' },
  { value: 'first_half', label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Requests' },
  { value: 'pending', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export interface EssLeavePageProps {
  initialWorkspace?: LeaveWorkspace | null;
  initialLoading?: boolean;
  initialApprovals?: EssLeaveApprovalItem[];
  initialTransactions?: EssLeaveTransactionItem[];
  initialActiveTab?: 'requests' | 'ledger';
}

export function EssLeavePage({
  initialWorkspace,
  initialLoading,
  initialApprovals,
  initialTransactions,
  initialActiveTab,
}: EssLeavePageProps = {}) {
  const [workspace, setWorkspace] = useState<LeaveWorkspace | null>(initialWorkspace ?? null);
  const [loading, setLoading] = useState(
    initialLoading !== undefined ? initialLoading : initialWorkspace === undefined,
  );
  const [error, setError] = useState<string | null>(null);

  // Sub-tab: 'requests' | 'ledger'
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'ledger'>(
    initialActiveTab ?? 'requests',
  );

  // Ledger state
  const [transactions, setTransactions] = useState<EssLeaveTransactionItem[]>(
    initialTransactions ?? [],
  );
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotal, setLedgerTotal] = useState(initialTransactions?.length ?? 0);
  const [ledgerPages, setLedgerPages] = useState(1);
  const [ledgerLeaveTypeId, setLedgerLeaveTypeId] = useState<string>('all');
  const [ledgerDirection, setLedgerDirection] = useState<string>('all');
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');

  const loadTransactions = useCallback(
    async (page = 1) => {
      setTransactionsLoading(true);
      setTransactionsError(null);
      try {
        const res = await essApi.getLeaveTransactions({
          page,
          limit: 15,
          leaveTypeId: ledgerLeaveTypeId !== 'all' ? ledgerLeaveTypeId : undefined,
          direction: ledgerDirection !== 'all' ? ledgerDirection : undefined,
          startDate: ledgerStartDate || undefined,
          endDate: ledgerEndDate || undefined,
        });
        setTransactions(res.items);
        setLedgerTotal(res.pagination.total);
        setLedgerPages(res.pagination.pages);
        setLedgerPage(res.pagination.page);
      } catch (err: unknown) {
        setTransactionsError(
          err instanceof Error ? err.message : 'Failed to load leave transactions',
        );
      } finally {
        setTransactionsLoading(false);
      }
    },
    [ledgerLeaveTypeId, ledgerDirection, ledgerStartDate, ledgerEndDate],
  );

  useEffect(() => {
    if (activeSubTab === 'ledger' && !initialTransactions) {
      void loadTransactions(ledgerPage);
    }
  }, [activeSubTab, loadTransactions, initialTransactions, ledgerPage]);

  // Apply Leave Modal state
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [leaveTypeId, setLeaveTypeId] = useState(
    initialWorkspace?.balances[0]?.leaveTypeId || '',
  );
  const [duration, setDuration] = useState<'full' | EssHalfDaySession>('full');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // Cancel & Detail Modal state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelRequest, setConfirmCancelRequest] = useState<EssLeaveRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EssLeaveRequest | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  // Team approvals assigned to this employee
  const [approvals, setApprovals] = useState<EssLeaveApprovalItem[]>(initialApprovals ?? []);
  const [rejecting, setRejecting] = useState<EssLeaveApprovalItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      setApprovals(await essApi.getLeaveApprovals());
    } catch {
      setApprovals([]);
    }
  }, []);

  useEffect(() => {
    if (initialApprovals === undefined) {
      void loadApprovals();
    }
  }, [loadApprovals, initialApprovals]);

  const decide = async (item: EssLeaveApprovalItem, decision: 'approve' | 'reject') => {
    setDecidingId(item.approvalId);
    try {
      if (decision === 'approve') await essApi.approveLeave(item.approvalId);
      else await essApi.rejectLeave(item.approvalId, rejectComment);
      setSuccessMsg(
        `Leave request of ${item.employeeName} ${decision === 'approve' ? 'approved' : 'rejected'}.`,
      );
      setRejecting(null);
      setRejectComment('');
      await loadApprovals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record decision');
    } finally {
      setDecidingId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await essApi.getLeave();
      setWorkspace(data);
      setLeaveTypeId((current) => current || data.balances[0]?.leaveTypeId || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialWorkspace === undefined) {
      void load();
    }
  }, [load, initialWorkspace]);

  const selectedBalance = useMemo(() => {
    if (!workspace?.balances) return null;
    return workspace.balances.find((b) => b.leaveTypeId === leaveTypeId) || null;
  }, [workspace?.balances, leaveTypeId]);

  const isSingleDate = Boolean(startDate) && startDate === endDate;
  const halfDayAvailable = isSingleDate && Boolean(selectedBalance?.allowHalfDay);
  const session: EssHalfDaySession | null =
    halfDayAvailable && duration !== 'full' ? duration : null;

  // Calendar estimate only; the server charges working days per company settings.
  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    if (session) return 0.5;
    const diff = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, session]);

  const mayExceedBalance =
    selectedBalance !== null &&
    selectedBalance.availableDays !== null &&
    requestedDays > selectedBalance.availableDays;

  const handleApplyLeave = async () => {
    setApplyLoading(true);
    setApplyError(null);
    try {
      await essApi.applyLeave({ leaveTypeId, startDate, endDate, reason, session });
      setSuccessMsg('Leave application submitted successfully.');
      setApplyOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setDuration('full');
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
        subtitle={`Leave year ${workspace.cycle.label}${workspace.policy ? ` • ${workspace.policy.name}` : ''}`}
      >
        {workspace.holidayCalendarMissing && (
          <Alert variant="warning" title="Holiday calendar not published">
            No holiday calendar covers you for this leave year, so working-day leave cannot be
            calculated yet. Please contact HR.
          </Alert>
        )}
        {!workspace.policy && (
          <Alert variant="warning" title="No leave policy assigned">
            You are not covered by a leave policy yet, so leave cannot be applied. Please contact
            HR.
          </Alert>
        )}
        <Grid columns={4} gap="md">
          {workspace.balances.map((bal) => {
            const total = bal.totalDays ?? 0;
            const usedPct = total > 0 ? Math.min(100, Math.round((bal.usedDays / total) * 100)) : 0;
            return (
              <Card key={bal.leaveTypeId} variant="default">
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <Badge variant={toneOf(bal.colorToken)} size="md">
                      {bal.leaveTypeName}
                    </Badge>
                    {bal.availableDays !== null && (
                      <Inline gap="xs" align="baseline">
                        <strong>{bal.availableDays}</strong>
                        <span>days left</span>
                      </Inline>
                    )}
                  </Inline>

                  {bal.isTracked ? (
                    <Stack gap="xs">
                      <ProgressBar
                        value={bal.usedDays}
                        max={total}
                        variant={usedPct > 80 ? 'danger' : 'primary'}
                        size="sm"
                      />
                      <Inline justify="between" align="center">
                        <span>
                          Used: {bal.usedDays} of {total}
                        </span>
                        {bal.pendingDays > 0 && <span>Pending: {bal.pendingDays}</span>}
                      </Inline>
                    </Stack>
                  ) : (
                    <span>No quota limit</span>
                  )}

                  <Inline justify="end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLedgerLeaveTypeId(bal.leaveTypeId);
                        setActiveSubTab('ledger');
                      }}
                    >
                      View Ledger
                    </Button>
                  </Inline>
                </Stack>
              </Card>
            );
          })}
        </Grid>
      </Section>

      {/* ── Team Approvals ────────────────────────────────────────── */}
      {approvals.length > 0 && (
        <Section title="Team Approvals" subtitle="Leave requests awaiting your decision">
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Leave</TableHeaderCell>
                  <TableHeaderCell>Dates</TableHeaderCell>
                  <TableHeaderCell>Reason</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {approvals.map((a) => (
                  <TableRow key={a.approvalId}>
                    <TableCell>
                      <strong>{a.employeeName}</strong>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{a.leaveTypeCode}</Badge> {a.totalDays} day(s)
                      {a.purpose === 'cancellation' && <span> · cancellation</span>}
                    </TableCell>
                    <TableCell>
                      {a.startDate} to {a.endDate}
                    </TableCell>
                    <TableCell>{a.reason}</TableCell>
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <Button
                          variant="primary"
                          size="sm"
                          loading={decidingId === a.approvalId}
                          onClick={() => void decide(a, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setRejecting(a)}>
                          Reject
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Section>
      )}

      {rejecting && (
        <Modal
          isOpen={true}
          title="Reject leave request"
          onClose={() => setRejecting(null)}
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={rejectComment.trim().length < 3}
                loading={decidingId === rejecting.approvalId}
                onClick={() => void decide(rejecting, 'reject')}
              >
                Reject
              </Button>
            </Inline>
          }
        >
          <Stack gap="sm">
            <span>
              {rejecting.employeeName} · {rejecting.startDate} to {rejecting.endDate}
            </span>
            <Textarea
              aria-label="Rejection reason"
              rows={3}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Reason (required)"
            />
          </Stack>
        </Modal>
      )}

      {/* ── Leave Requests & Ledger ───────────────────────────────── */}
      <Section
        title="My Leave History"
        subtitle="Track approval status or cancel pending leave requests"
      >
        <Stack gap="md">
          <Tabs
            items={[
              { id: 'requests', label: `My Leave Requests (${filteredRequests.length})` },
              { id: 'ledger', label: `Leave Balance Ledger (${ledgerTotal})` },
            ]}
            activeId={activeSubTab}
            onChange={(id) => setActiveSubTab(id as 'requests' | 'ledger')}
          />

          {activeSubTab === 'requests' ? (
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
                            <Badge variant={toneOf(req.colorToken)}>{req.leaveTypeName}</Badge>
                          </TableCell>
                          <TableCell>{req.startDate}</TableCell>
                          <TableCell>{req.endDate}</TableCell>
                          <TableCell>
                            <strong>
                              {req.totalDays} day(s)
                              {req.session
                                ? ` (${req.session === 'first_half' ? 'First half' : 'Second half'})`
                                : ''}
                            </strong>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(req)}
                              >
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
          ) : (
            <Stack gap="md">
              <Toolbar
                left={
                  <Inline gap="sm" align="center">
                    <Select
                      size="sm"
                      value={ledgerLeaveTypeId}
                      onChange={(e) => {
                        setLedgerLeaveTypeId(e.target.value);
                        setLedgerPage(1);
                      }}
                    >
                      <option value="all">All Leave Types</option>
                      {workspace.balances.map((b) => (
                        <option key={b.leaveTypeId} value={b.leaveTypeId}>
                          {b.leaveTypeName} ({b.leaveTypeCode})
                        </option>
                      ))}
                    </Select>

                    <Select
                      size="sm"
                      value={ledgerDirection}
                      onChange={(e) => {
                        setLedgerDirection(e.target.value);
                        setLedgerPage(1);
                      }}
                    >
                      <option value="all">All Movements</option>
                      <option value="credit">Credits Only (+)</option>
                      <option value="debit">Debits Only (-)</option>
                    </Select>

                    <Inline gap="xs" align="center">
                      <span className="text-xs text-slate-500 font-medium">From:</span>
                      <Input
                        type="date"
                        size="sm"
                        value={ledgerStartDate}
                        onChange={(e) => {
                          setLedgerStartDate(e.target.value);
                          setLedgerPage(1);
                        }}
                      />
                    </Inline>

                    <Inline gap="xs" align="center">
                      <span className="text-xs text-slate-500 font-medium">To:</span>
                      <Input
                        type="date"
                        size="sm"
                        value={ledgerEndDate}
                        onChange={(e) => {
                          setLedgerEndDate(e.target.value);
                          setLedgerPage(1);
                        }}
                      />
                    </Inline>

                    {(ledgerLeaveTypeId !== 'all' ||
                      ledgerDirection !== 'all' ||
                      ledgerStartDate ||
                      ledgerEndDate) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setLedgerLeaveTypeId('all');
                          setLedgerDirection('all');
                          setLedgerStartDate('');
                          setLedgerEndDate('');
                          setLedgerPage(1);
                        }}
                      >
                        Reset Filters
                      </Button>
                    )}
                  </Inline>
                }
                right={
                  <Inline gap="sm" align="center">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void loadTransactions(ledgerPage)}
                    >
                      Refresh
                    </Button>
                    <span className="text-xs text-slate-600">
                      Showing <strong>{transactions.length}</strong> of{' '}
                      <strong>{ledgerTotal}</strong> transaction(s)
                    </span>
                  </Inline>
                }
              />

              {transactionsLoading ? (
                <LoadingState label="Loading leave balance transactions..." />
              ) : transactionsError ? (
                <Alert variant="danger" title="Error loading ledger">
                  <Inline justify="between" align="center">
                    <span>{transactionsError}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void loadTransactions(ledgerPage)}
                    >
                      Retry
                    </Button>
                  </Inline>
                </Alert>
              ) : transactions.length === 0 ? (
                <EmptyState
                  title="No Leave Transactions Recorded"
                  description="No balance movements (entitlement, accrual, deduction, or adjustment) match the selected criteria."
                />
              ) : (
                <Card>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Transaction Date</TableHeaderCell>
                        <TableHeaderCell>Leave Type</TableHeaderCell>
                        <TableHeaderCell>Details & Reason</TableHeaderCell>
                        <TableHeaderCell>Credit (+)</TableHeaderCell>
                        <TableHeaderCell>Debit (-)</TableHeaderCell>
                        <TableHeaderCell>Balance Available</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>
                            <Stack gap="xs">
                              <span className="font-medium text-slate-900">
                                {txn.transactionDate}
                              </span>
                              <span className="text-xs text-slate-500">
                                By {txn.createdBy || 'System'}
                              </span>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Inline gap="xs" align="center">
                              <Badge variant={toneOf(txn.colorToken || 'neutral')} size="sm">
                                {txn.leaveTypeCode}
                              </Badge>
                              <span className="font-medium text-slate-800">
                                {txn.leaveTypeName}
                              </span>
                            </Inline>
                          </TableCell>
                          <TableCell>
                            <Stack gap="xs">
                              <span className="text-sm text-slate-800">{txn.description}</span>
                              {txn.referenceType && (
                                <Inline gap="xs" align="center">
                                  <Badge variant="neutral" size="sm">
                                    {txn.referenceType.replace(/_/g, ' ')}
                                  </Badge>
                                  {txn.referenceId && (
                                    <span className="text-xs text-slate-500 font-mono">
                                      #{txn.referenceId.slice(-8)}
                                    </span>
                                  )}
                                </Inline>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {txn.credit > 0 ? (
                              <span className="font-semibold text-emerald-600">
                                +{txn.credit} {txn.credit === 1 ? 'day' : 'days'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {txn.debit > 0 ? (
                              <span className="font-semibold text-rose-600">
                                -{txn.debit} {txn.debit === 1 ? 'day' : 'days'}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <strong className="text-slate-900">
                              {txn.runningBalance} {txn.runningBalance === 1 ? 'day' : 'days'}
                            </strong>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {ledgerPages > 1 && (
                    <Toolbar
                      left={
                        <span className="text-xs text-slate-600">
                          Page <strong>{ledgerPage}</strong> of <strong>{ledgerPages}</strong>
                        </span>
                      }
                      right={
                        <Inline gap="xs">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={ledgerPage <= 1 || transactionsLoading}
                            onClick={() => void loadTransactions(ledgerPage - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={ledgerPage >= ledgerPages || transactionsLoading}
                            onClick={() => void loadTransactions(ledgerPage + 1)}
                          >
                            Next
                          </Button>
                        </Inline>
                      }
                    />
                  )}
                </Card>
              )}
            </Stack>
          )}
        </Stack>
      </Section>

      {/* ── Holiday Calendar ──────────────────────────────────────── */}
      <Section
        title="Upcoming Holidays"
        subtitle="Holidays from your holiday calendar for this leave year"
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
                      {h.type === 'optional' && (
                        <Badge variant="warning" size="sm">
                          Optional
                        </Badge>
                      )}
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
              disabled={!leaveTypeId || requestedDays <= 0 || !reason.trim()}
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

          {mayExceedBalance && (
            <Alert variant="warning" title="Check your balance">
              The selected dates span {requestedDays} calendar day(s), more than your available{' '}
              {selectedBalance?.leaveTypeName} balance of {selectedBalance?.availableDays} day(s).
              Weekly offs may be excluded when the request is calculated.
            </Alert>
          )}

          <FormSection title="Leave Details">
            <FormGrid columns={1}>
              <Select
                label="Leave Type"
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                options={workspace.balances.map((b) => ({
                  value: b.leaveTypeId,
                  label: b.leaveTypeName,
                }))}
              />

              {selectedBalance?.instructions && (
                <Alert variant="info" title="Guidelines">
                  {selectedBalance.instructions}
                </Alert>
              )}

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

              {halfDayAvailable && (
                <Select
                  label="Duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as typeof duration)}
                  options={DURATION_OPTIONS}
                />
              )}

              {requestedDays > 0 && (
                <Card variant="flat" padding="sm">
                  <Inline justify="between" align="center">
                    <span>
                      Selected: <strong>{requestedDays} day(s)</strong> (final working days are
                      calculated on submission)
                    </span>
                    {selectedBalance && selectedBalance.availableDays !== null && (
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
              <strong>{confirmCancelRequest.leaveTypeName}</strong> request from{' '}
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
                <Badge variant={toneOf(selectedRequest.colorToken)}>
                  {selectedRequest.leaveTypeName}
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
            {selectedRequest.session && (
              <Stack gap="xs">
                <span>Session Duration</span>
                <span>
                  {selectedRequest.session === 'first_half'
                    ? 'First Half (Morning session)'
                    : 'Second Half (Afternoon session)'}
                </span>
              </Stack>
            )}
            <Divider />
            <Stack gap="xs">
              <span>Reason</span>
              <p>{selectedRequest.reason}</p>
            </Stack>
            {selectedRequest.status === 'pending' && (
              <Alert variant="info" title="Under Review">
                Your application is currently pending review by your reporting manager or HR.
              </Alert>
            )}
            {selectedRequest.status === 'approved' && (
              <Alert variant="success" title="Approved">
                This leave has been approved and booked against your leave balance.
              </Alert>
            )}
            {selectedRequest.status === 'rejected' && (
              <Alert variant="error" title="Not Approved">
                This leave application was rejected. Please contact your manager for details.
              </Alert>
            )}
            {selectedRequest.status === 'cancelled' && (
              <Alert variant="info" title="Cancelled">
                This leave request was cancelled. Any reserved balance was returned to your quota.
              </Alert>
            )}
          </Stack>
        </Modal>
      )}
    </Page>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
