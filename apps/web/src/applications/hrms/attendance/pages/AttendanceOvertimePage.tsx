/**
 * BEZENT HRMS — Overtime Management Workspace (V1.0)
 *
 * Full-stack functional workspace for Overtime Management:
 * - Operational KPI metrics
 * - Overtime requests catalog with filters and detail views
 * - Manager & HR approval queue with decision actions
 * - Approved overtime register with settlement allocation (Payable vs Comp-Off)
 * - Settlement ledger with reversal audit
 * - Overtime policy inspector
 *
 * Strictly adheres to AGENTS.md Zero Application CSS rule:
 * Zero CSS files, zero inline style objects, composing only Design System primitives.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Stack,
  Inline,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Button,
  Select,
  Input,
  SearchInput,
  Badge,
  Modal,
  Tabs,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchOvertimeOverview,
  fetchOvertimeRequests,
  fetchOvertimeRequestDetail,
  createOvertimeRequest,
  decideOvertimeRequest,
  allocateOvertimeSettlement,
  fetchOvertimeSettlements,
  reverseOvertimeSettlement,
  fetchOvertimePolicies,
  checkOvertimeEligibility,
  type OvertimeOverviewMetrics,
  type OvertimeRequestItem,
  type OvertimeSettlementItem,
  type OvertimePolicyItem,
  type OvertimeAuditItem,
  type OvertimeEligibilityCalculation,
} from '../api/attendanceOvertimeApi';

type OvertimeTab = 'overview' | 'requests' | 'approvals' | 'register' | 'settlements' | 'policies';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function AttendanceOvertimePage() {
  const [activeTab, setActiveTab] = useState<OvertimeTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [metrics, setMetrics] = useState<OvertimeOverviewMetrics | null>(null);
  const [requests, setRequests] = useState<OvertimeRequestItem[]>([]);
  const [settlements, setSettlements] = useState<OvertimeSettlementItem[]>([]);
  const [policies, setPolicies] = useState<OvertimePolicyItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [settlementFilter, setSettlementFilter] = useState('all');

  // Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<
    (OvertimeRequestItem & { settlements: OvertimeSettlementItem[]; audits: OvertimeAuditItem[] }) | null
  >(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Create Request Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createWorkDate, setCreateWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [createMinutes, setCreateMinutes] = useState(60);
  const [createReason, setCreateReason] = useState('');
  const [createStartTime, setCreateStartTime] = useState('18:00');
  const [createEndTime, setCreateEndTime] = useState('19:00');
  const [eligibilityCheck, setEligibilityCheck] = useState<{
    calculation?: OvertimeEligibilityCalculation;
    error?: string;
  } | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Review Decision Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewMinutes, setReviewMinutes] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState('');

  // Settlement Allocation Modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleRequestId, setSettleRequestId] = useState<string | null>(null);
  const [settlePayableMins, setSettlePayableMins] = useState<number>(0);
  const [settleCompOffMins, setSettleCompOffMins] = useState<number>(0);
  const [settleNotes, setSettleNotes] = useState('');
  const [settleMaxAvailable, setSettleMaxAvailable] = useState<number>(0);

  // Reversal Modal
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [reversalSettlementId, setReversalSettlementId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOvertimeOverview();
      setMetrics(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load overtime metrics'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Requests
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOvertimeRequests({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        settlementStatus: settlementFilter !== 'all' ? settlementFilter : undefined,
      });
      setRequests(res.items);
      setTotalCount(res.meta.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, settlementFilter]);

  // Load Settlements
  const loadSettlements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOvertimeSettlements();
      setSettlements(res.items);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load settlements'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Policies
  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOvertimePolicies();
      setPolicies(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load policies'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'requests' || activeTab === 'approvals' || activeTab === 'register') {
      loadRequests();
    } else if (activeTab === 'settlements') {
      loadSettlements();
    } else if (activeTab === 'policies') {
      loadPolicies();
    }
  }, [activeTab, loadOverview, loadRequests, loadSettlements, loadPolicies]);

  // View Details
  const handleOpenDetail = async (id: string) => {
    try {
      setLoading(true);
      const detail = await fetchOvertimeRequestDetail(id);
      setSelectedRequest(detail);
      setDetailModalOpen(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load request detail'));
    } finally {
      setLoading(false);
    }
  };

  // Eligibility check in Create Modal
  const handleCheckEligibility = async () => {
    if (!createEmployeeId.trim() || !createWorkDate) return;
    try {
      setCheckingEligibility(true);
      const res = await checkOvertimeEligibility(createEmployeeId.trim(), createWorkDate);
      setEligibilityCheck(res);
      if (res.calculation?.eligibleOtMinutes) {
        setCreateMinutes(res.calculation.eligibleOtMinutes);
      }
    } catch (err: unknown) {
      setEligibilityCheck({ error: getErrorMessage(err, 'Eligibility check failed') });
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Submit Request
  const handleCreateSubmit = async () => {
    if (!createEmployeeId.trim() || !createReason.trim() || createMinutes <= 0) {
      setError('Please provide valid Employee ID, duration, and reason.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await createOvertimeRequest({
        employeeId: createEmployeeId.trim(),
        workDate: createWorkDate,
        requestedOtMinutes: createMinutes,
        reason: createReason.trim(),
        sourceIntervals: [
          {
            startTime: createStartTime,
            endTime: createEndTime,
            durationMinutes: createMinutes,
          },
        ],
      });
      setCreateModalOpen(false);
      setSuccessMessage('Overtime claim submitted successfully.');
      loadRequests();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit overtime claim'));
    } finally {
      setLoading(false);
    }
  };

  // Submit Decision
  const handleReviewSubmit = async () => {
    if (!reviewRequestId) return;
    try {
      setLoading(true);
      setError(null);
      await decideOvertimeRequest(reviewRequestId, {
        decision: reviewDecision,
        approvedOtMinutes: reviewDecision === 'approved' ? reviewMinutes : undefined,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      setReviewModalOpen(false);
      setSuccessMessage(`Overtime request ${reviewDecision} successfully.`);
      loadRequests();
      if (selectedRequest && selectedRequest.id === reviewRequestId) {
        handleOpenDetail(reviewRequestId);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to process decision'));
    } finally {
      setLoading(false);
    }
  };

  // Submit Settlement Allocation
  const handleSettleSubmit = async () => {
    if (!settleRequestId) return;
    const total = settlePayableMins + settleCompOffMins;
    if (total <= 0) {
      setError('Must allocate at least 1 minute to payable or comp-off.');
      return;
    }
    if (total > settleMaxAvailable) {
      setError(`Total allocation exceeds available balance (${settleMaxAvailable} mins).`);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await allocateOvertimeSettlement(settleRequestId, {
        payableMinutes: settlePayableMins,
        compOffMinutes: settleCompOffMins,
        notes: settleNotes.trim() || undefined,
      });
      setSettleModalOpen(false);
      setSuccessMessage('Settlement allocation queued successfully.');
      loadRequests();
      loadSettlements();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to allocate settlement'));
    } finally {
      setLoading(false);
    }
  };

  // Submit Settlement Reversal
  const handleReversalSubmit = async () => {
    if (!reversalSettlementId || !reversalReason.trim()) {
      setError('Please provide a reason for reversal.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await reverseOvertimeSettlement(reversalSettlementId, reversalReason.trim());
      setReversalModalOpen(false);
      setSuccessMessage('Settlement reversed successfully.');
      loadSettlements();
      loadRequests();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to reverse settlement'));
    } finally {
      setLoading(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'submitted':
      case 'pending_approval':
        return <Badge variant="warning">Pending Approval</Badge>;
      case 'withdrawn':
        return <Badge variant="neutral">Withdrawn</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Settlement Badge Helper
  const renderSettlementBadge = (status: string) => {
    switch (status) {
      case 'pending_handoff':
        return <Badge variant="info">Pending Handoff</Badge>;
      case 'partially_allocated':
        return <Badge variant="warning">Partially Allocated</Badge>;
      case 'fully_allocated':
      case 'settled':
        return <Badge variant="success">Settled</Badge>;
      case 'reversed':
        return <Badge variant="danger">Reversed</Badge>;
      default:
        return <Badge variant="neutral">Unallocated</Badge>;
    }
  };

  return (
    <Page>
      <PageHeader
        title="Overtime Management"
        subtitle="Policy-governed overtime eligibility, claims, multi-level approvals and payroll handoff"
        actions={
          <Inline gap="sm">
            <Button
              variant="primary"
              onClick={() => {
                setEligibilityCheck(null);
                setCreateModalOpen(true);
              }}
            >
              <Inline gap="xs">
                <BezentIcon name="plusSign" size={16} color="currentColor" />
                <span>Claim Overtime</span>
              </Inline>
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {error && (
          <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        <Tabs
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'requests', label: 'All Requests' },
            { id: 'approvals', label: 'Approval Queue' },
            { id: 'register', label: 'Approved OT Register' },
            { id: 'settlements', label: 'Settlement Handoff' },
            { id: 'policies', label: 'Policies' },
          ]}
          activeId={activeTab}
          onChange={(tabId: string) => setActiveTab(tabId as OvertimeTab)}
        />

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <Stack gap="md">
            {metrics ? (
              <Grid columns={4} gap="md">
                <Card>
                  <Stack gap="xs">
                    <span>Pending Approval</span>
                    <h2>{metrics.pendingApprovalCount}</h2>
                    <span>Awaiting supervisor review</span>
                  </Stack>
                </Card>
                <Card>
                  <Stack gap="xs">
                    <span>Approved Claims</span>
                    <h2>{metrics.approvedCount}</h2>
                    <span>{(metrics.totalApprovedMinutes / 60).toFixed(1)} hrs approved</span>
                  </Stack>
                </Card>
                <Card>
                  <Stack gap="xs">
                    <span>Allocated Payable</span>
                    <h2>{(metrics.totalAllocatedPayableMinutes / 60).toFixed(1)} hrs</h2>
                    <span>Queued for payroll export</span>
                  </Stack>
                </Card>
                <Card>
                  <Stack gap="xs">
                    <span>Comp-Off Allocated</span>
                    <h2>{(metrics.totalAllocatedCompOffMinutes / 60).toFixed(1)} hrs</h2>
                    <span>Queued for leave credit</span>
                  </Stack>
                </Card>
              </Grid>
            ) : (
              <LoadingState label="Loading overtime metrics..." />
            )}
          </Stack>
        )}

        {/* 2. REQUESTS TAB */}
        {activeTab === 'requests' && (
          <Stack gap="md">
            <Card>
              <Inline gap="md" align="center" justify="between">
                <Inline gap="sm">
                  <SearchInput
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    placeholder="Search by employee, code, reason..."
                  />
                  <Select
                    value={statusFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                    options={[
                      { label: 'All Statuses', value: 'all' },
                      { label: 'Submitted', value: 'submitted' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Rejected', value: 'rejected' },
                      { label: 'Withdrawn', value: 'withdrawn' },
                      { label: 'Cancelled', value: 'cancelled' },
                    ]}
                  />
                  <Select
                    value={settlementFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSettlementFilter(e.target.value)}
                    options={[
                      { label: 'All Settlements', value: 'all' },
                      { label: 'Unallocated', value: 'unallocated' },
                      { label: 'Partially Allocated', value: 'partially_allocated' },
                      { label: 'Pending Handoff', value: 'pending_handoff' },
                      { label: 'Reversed', value: 'reversed' },
                    ]}
                  />
                </Inline>
                <span>Total: {totalCount} records</span>
              </Inline>
            </Card>

            <Card>
              {loading ? (
                <LoadingState label="Loading requests..." />
              ) : requests.length === 0 ? (
                <EmptyState
                  title="No Overtime Requests"
                  description="No overtime claims found matching your filter criteria."
                />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Request #</TableHeaderCell>
                      <TableHeaderCell>Work Date</TableHeaderCell>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Actual Worked</TableHeaderCell>
                      <TableHeaderCell>Eligible OT</TableHeaderCell>
                      <TableHeaderCell>Requested OT</TableHeaderCell>
                      <TableHeaderCell>Approved OT</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Settlement</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <strong>{r.requestNumber}</strong>
                        </TableCell>
                        <TableCell>{r.workDate}</TableCell>
                        <TableCell>
                          <Stack gap="none">
                            <span>{r.employeeName}</span>
                            <span>{r.employeeCode}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>{(r.actualWorkedMinutes / 60).toFixed(1)}h</TableCell>
                        <TableCell>{(r.eligibleOtMinutes / 60).toFixed(1)}h</TableCell>
                        <TableCell>{(r.requestedOtMinutes / 60).toFixed(1)}h</TableCell>
                        <TableCell>
                          {r.status === 'approved' ? `${(r.approvedOtMinutes / 60).toFixed(1)}h` : '—'}
                        </TableCell>
                        <TableCell>{renderStatusBadge(r.status)}</TableCell>
                        <TableCell>{renderSettlementBadge(r.settlementStatus)}</TableCell>
                        <TableCell>
                          <Inline gap="xs">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(r.id)}>
                              View
                            </Button>
                            {(r.status === 'submitted' || r.status === 'pending_approval') && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setReviewRequestId(r.id);
                                  setReviewMinutes(r.requestedOtMinutes);
                                  setReviewDecision('approved');
                                  setReviewNotes('');
                                  setReviewModalOpen(true);
                                }}
                              >
                                Review
                              </Button>
                            )}
                          </Inline>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Stack>
        )}

        {/* 3. APPROVAL QUEUE TAB */}
        {activeTab === 'approvals' && (
          <Stack gap="md">
            <Card>
              <h3>Pending Supervisor Approval Queue</h3>
              <p>
                Review overtime requests submitted against authoritative attendance records.
              </p>
            </Card>

            <Card>
              {requests.filter((r) => r.status === 'submitted' || r.status === 'pending_approval').length === 0 ? (
                <EmptyState
                  title="Approval Queue Clean"
                  description="All submitted overtime claims have been evaluated."
                />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Request #</TableHeaderCell>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Eligible Duration</TableHeaderCell>
                      <TableHeaderCell>Claimed Duration</TableHeaderCell>
                      <TableHeaderCell>Reason</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests
                      .filter((r) => r.status === 'submitted' || r.status === 'pending_approval')
                      .map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <strong>{r.requestNumber}</strong>
                          </TableCell>
                          <TableCell>
                            {r.employeeName} ({r.employeeCode})
                          </TableCell>
                          <TableCell>{r.workDate}</TableCell>
                          <TableCell>{(r.eligibleOtMinutes / 60).toFixed(1)}h</TableCell>
                          <TableCell>{(r.requestedOtMinutes / 60).toFixed(1)}h</TableCell>
                          <TableCell>{r.reason}</TableCell>
                          <TableCell>
                            <Inline gap="xs">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setReviewRequestId(r.id);
                                  setReviewMinutes(r.requestedOtMinutes);
                                  setReviewDecision('approved');
                                  setReviewNotes('');
                                  setReviewModalOpen(true);
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setReviewRequestId(r.id);
                                  setReviewDecision('rejected');
                                  setReviewNotes('');
                                  setReviewModalOpen(true);
                                }}
                              >
                                Reject
                              </Button>
                            </Inline>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Stack>
        )}

        {/* 4. APPROVED OT REGISTER TAB */}
        {activeTab === 'register' && (
          <Stack gap="md">
            <Card>
              <h3>Approved Overtime Entitlement Register</h3>
              <p>
                Approved overtime hours ready for settlement allocation into Payable Overtime or Comp-Off credits.
              </p>
            </Card>

            <Card>
              {requests.filter((r) => r.status === 'approved').length === 0 ? (
                <EmptyState title="No Approved Overtime" description="No approved overtime records found." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Request #</TableHeaderCell>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Work Date</TableHeaderCell>
                      <TableHeaderCell>Approved Hours</TableHeaderCell>
                      <TableHeaderCell>Payable Allocated</TableHeaderCell>
                      <TableHeaderCell>Comp-Off Allocated</TableHeaderCell>
                      <TableHeaderCell>Remaining Unallocated</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests
                      .filter((r) => r.status === 'approved')
                      .map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <strong>{r.requestNumber}</strong>
                          </TableCell>
                          <TableCell>{r.employeeName}</TableCell>
                          <TableCell>{r.workDate}</TableCell>
                          <TableCell>{(r.approvedOtMinutes / 60).toFixed(1)}h</TableCell>
                          <TableCell>{(r.allocatedPayableMinutes / 60).toFixed(1)}h</TableCell>
                          <TableCell>{(r.allocatedCompOffMinutes / 60).toFixed(1)}h</TableCell>
                          <TableCell>
                            <strong>{(r.unallocatedMinutes / 60).toFixed(1)}h</strong>
                          </TableCell>
                          <TableCell>{renderSettlementBadge(r.settlementStatus)}</TableCell>
                          <TableCell>
                            {r.unallocatedMinutes > 0 ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setSettleRequestId(r.id);
                                  setSettleMaxAvailable(r.unallocatedMinutes);
                                  setSettlePayableMins(r.unallocatedMinutes);
                                  setSettleCompOffMins(0);
                                  setSettleNotes('');
                                  setSettleModalOpen(true);
                                }}
                              >
                                Allocate Settlement
                              </Button>
                            ) : (
                              <Badge variant="success">Fully Allocated</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Stack>
        )}

        {/* 5. SETTLEMENTS TAB */}
        {activeTab === 'settlements' && (
          <Stack gap="md">
            <Card>
              <h3>Overtime Settlement Ledger & Handoff</h3>
              <p>
                Audit ledger of overtime hours exported to Payroll or converted to Comp-Off.
              </p>
            </Card>

            <Card>
              {settlements.length === 0 ? (
                <EmptyState title="No Settlements" description="No overtime settlement allocations recorded yet." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Request #</TableHeaderCell>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Work Date</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Allocated Hours</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Allocated At</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {settlements.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <strong>{s.requestNumber || s.requestId}</strong>
                        </TableCell>
                        <TableCell>{s.employeeName || s.employeeId}</TableCell>
                        <TableCell>{s.workDate || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={s.allocationType === 'payable' ? 'info' : 'success'}>
                            {s.allocationType === 'payable' ? 'Payable Overtime' : 'Comp-Off Credit'}
                          </Badge>
                        </TableCell>
                        <TableCell>{(s.allocatedMinutes / 60).toFixed(1)}h</TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'reversed' ? 'danger' : 'neutral'}>
                            {s.status === 'pending_handoff' ? 'Pending Handoff' : s.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(s.allocatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {s.status !== 'reversed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setReversalSettlementId(s.id);
                                setReversalReason('');
                                setReversalModalOpen(true);
                              }}
                            >
                              Reverse
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Stack>
        )}

        {/* 6. POLICIES TAB */}
        {activeTab === 'policies' && (
          <Stack gap="md">
            <Card>
              <h3>Configured Overtime Policies</h3>
              <p>
                Organizational policies governing overtime calculation caps, eligibility, and rounding rules.
              </p>
            </Card>

            <Card>
              {policies.length === 0 ? (
                <EmptyState title="No Policies Found" description="No overtime policies configured." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Policy Name</TableHeaderCell>
                      <TableHeaderCell>Scope</TableHeaderCell>
                      <TableHeaderCell>Min Duration</TableHeaderCell>
                      <TableHeaderCell>Daily Cap</TableHeaderCell>
                      <TableHeaderCell>Weekly Cap</TableHeaderCell>
                      <TableHeaderCell>Monthly Cap</TableHeaderCell>
                      <TableHeaderCell>Rounding Rule</TableHeaderCell>
                      <TableHeaderCell>Effective From</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {policies.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <strong>{p.policyName}</strong>
                        </TableCell>
                        <TableCell>{p.scope}</TableCell>
                        <TableCell>{p.minimumQualifyingMinutes} mins</TableCell>
                        <TableCell>{(p.dailyCapMinutes / 60).toFixed(1)} hrs</TableCell>
                        <TableCell>{(p.weeklyCapMinutes / 60).toFixed(1)} hrs</TableCell>
                        <TableCell>{(p.monthlyCapMinutes / 60).toFixed(1)} hrs</TableCell>
                        <TableCell>{p.roundingRule.replace('_', ' ')}</TableCell>
                        <TableCell>{p.effectiveFrom}</TableCell>
                        <TableCell>
                          <Badge variant={p.isEnabled ? 'success' : 'neutral'}>
                            {p.isEnabled ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Stack>
        )}
      </Stack>

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedRequest && (
        <Modal
          title={`Overtime Claim — ${selectedRequest.requestNumber}`}
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
        >
          <Stack gap="md">
            <Grid columns={2} gap="sm">
              <div>
                <strong>Employee:</strong> {selectedRequest.employeeName} ({selectedRequest.employeeCode})
              </div>
              <div>
                <strong>Work Date:</strong> {selectedRequest.workDate} ({selectedRequest.dayType})
              </div>
              <div>
                <strong>Scheduled:</strong> {(selectedRequest.scheduledMinutes / 60).toFixed(1)} hrs
              </div>
              <div>
                <strong>Actual Worked:</strong> {(selectedRequest.actualWorkedMinutes / 60).toFixed(1)} hrs
              </div>
              <div>
                <strong>Extra Worked:</strong> {(selectedRequest.extraWorkedMinutes / 60).toFixed(1)} hrs
              </div>
              <div>
                <strong>Policy-Eligible:</strong> {(selectedRequest.eligibleOtMinutes / 60).toFixed(1)} hrs
              </div>
              <div>
                <strong>Requested OT:</strong> {(selectedRequest.requestedOtMinutes / 60).toFixed(1)} hrs
              </div>
              <div>
                <strong>Approved OT:</strong>{' '}
                {selectedRequest.status === 'approved'
                  ? `${(selectedRequest.approvedOtMinutes / 60).toFixed(1)} hrs`
                  : 'Pending'}
              </div>
              <div>
                <strong>Approval Status:</strong> {renderStatusBadge(selectedRequest.status)}
              </div>
              <div>
                <strong>Settlement Status:</strong> {renderSettlementBadge(selectedRequest.settlementStatus)}
              </div>
            </Grid>

            <div>
              <strong>Reason:</strong>
              <p>{selectedRequest.reason}</p>
            </div>

            {selectedRequest.reviewNotes && (
              <Alert variant="info">
                <strong>Reviewer Notes:</strong> {selectedRequest.reviewNotes}
              </Alert>
            )}

            {/* Audit Trail */}
            {selectedRequest.audits && selectedRequest.audits.length > 0 && (
              <div>
                <h4>Audit History</h4>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Action</TableHeaderCell>
                      <TableHeaderCell>By</TableHeaderCell>
                      <TableHeaderCell>Timestamp</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedRequest.audits.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <code>{a.action}</code>
                        </TableCell>
                        <TableCell>{a.performedByUserName || a.performedByUserId}</TableCell>
                        <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Stack>
        </Modal>
      )}

      {/* CREATE MODAL */}
      {createModalOpen && (
        <Modal
          title="Submit Overtime Claim"
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        >
          <Stack gap="md">
            <Input
              label="Employee ID / Code"
              value={createEmployeeId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateEmployeeId(e.target.value)}
              placeholder="e.g. EMP-0002"
            />
            <Input
              label="Work Date (YYYY-MM-DD)"
              value={createWorkDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateWorkDate(e.target.value)}
            />
            <Button variant="secondary" size="sm" onClick={handleCheckEligibility} disabled={checkingEligibility}>
              {checkingEligibility ? 'Verifying...' : 'Check Attendance Eligibility'}
            </Button>

            {eligibilityCheck && (
              <Alert variant={eligibilityCheck.calculation?.isEligible ? 'success' : 'danger'}>
                {eligibilityCheck.calculation?.isEligible
                  ? `Eligible! Found ${eligibilityCheck.calculation.extraWorkedMinutes} extra mins worked. Policy eligible OT: ${eligibilityCheck.calculation.eligibleOtMinutes} mins.`
                  : `Not eligible: ${eligibilityCheck.calculation?.nonEligibilityReason || eligibilityCheck.error || 'Policy criteria not met'}`}
              </Alert>
            )}

            <Inline gap="sm">
              <Input
                label="Start Time (HH:mm)"
                value={createStartTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateStartTime(e.target.value)}
              />
              <Input
                label="End Time (HH:mm)"
                value={createEndTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateEndTime(e.target.value)}
              />
            </Inline>

            <Input
              label="Requested Overtime (Minutes)"
              type="number"
              value={String(createMinutes)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateMinutes(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              label="Business Reason & Justification"
              value={createReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateReason(e.target.value)}
              placeholder="Describe work performed and authorization reason"
            />

            <Inline gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateSubmit} disabled={loading}>
                Submit Claim
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* REVIEW DECISION MODAL */}
      {reviewModalOpen && (
        <Modal
          title="Review Overtime Claim"
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
        >
          <Stack gap="md">
            <Select
              label="Decision"
              value={reviewDecision}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setReviewDecision(e.target.value as 'approved' | 'rejected')
              }
              options={[
                { label: 'Approve', value: 'approved' },
                { label: 'Reject', value: 'rejected' },
              ]}
            />

            {reviewDecision === 'approved' && (
              <Input
                label="Approved Minutes"
                type="number"
                value={String(reviewMinutes)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewMinutes(parseInt(e.target.value, 10) || 0)}
              />
            )}

            <Input
              label="Reviewer Notes / Reason"
              value={reviewNotes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReviewNotes(e.target.value)}
              placeholder="Notes on the decision"
            />

            <Inline gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setReviewModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={reviewDecision === 'approved' ? 'primary' : 'danger'}
                onClick={handleReviewSubmit}
                disabled={loading}
              >
                Confirm {reviewDecision === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* SETTLEMENT ALLOCATION MODAL */}
      {settleModalOpen && (
        <Modal
          title="Allocate Overtime Settlement"
          isOpen={settleModalOpen}
          onClose={() => setSettleModalOpen(false)}
        >
          <Stack gap="md">
            <Alert variant="info">
              Total available unallocated balance: <strong>{settleMaxAvailable} minutes</strong> (
              {(settleMaxAvailable / 60).toFixed(1)} hrs)
            </Alert>

            <Input
              label="Payable Overtime (Minutes)"
              type="number"
              value={String(settlePayableMins)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettlePayableMins(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              label="Comp-Off Entitlement (Minutes)"
              type="number"
              value={String(settleCompOffMins)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettleCompOffMins(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              label="Allocation Notes"
              value={settleNotes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettleNotes(e.target.value)}
              placeholder="Batch or payroll handover notes"
            />

            <Inline gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setSettleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSettleSubmit} disabled={loading}>
                Confirm Allocation
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* REVERSAL MODAL */}
      {reversalModalOpen && (
        <Modal
          title="Reverse Settlement Allocation"
          isOpen={reversalModalOpen}
          onClose={() => setReversalModalOpen(false)}
        >
          <Stack gap="md">
            <Alert variant="warning">
              Reversing this settlement will restore the unallocated overtime balance on the request.
            </Alert>

            <Input
              label="Reason for Reversal"
              value={reversalReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReversalReason(e.target.value)}
              placeholder="e.g. Payroll batch adjustment or duplicate allocation"
            />

            <Inline gap="sm" justify="end">
              <Button variant="ghost" onClick={() => setReversalModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReversalSubmit} disabled={loading}>
                Confirm Reversal
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
