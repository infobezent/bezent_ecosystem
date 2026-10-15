/**
 * BEZENT HRMS — Comp-Off Management Workspace (V1.0)
 *
 * Full-stack functional workspace for Compensatory Off (Comp-Off) Management:
 * - Operational KPI metrics
 * - Earning requests catalog with real-time eligibility inspection & detail views
 * - Reviewer approval queue with decision actions & self-approval protection
 * - Approved entitlements register with validity and reversal capability
 * - Canonical Leave credit handoff ledger with idempotent sync status
 * - Policy inspector & statutory/company thresholds
 * - Complete audit trail
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
  fetchCompOffOverview,
  fetchCompOffRequests,
  fetchCompOffRequestDetail,
  createCompOffRequest,
  withdrawCompOffRequest,
  cancelCompOffRequest,
  fetchCompOffApprovalQueue,
  decideCompOffRequest,
  fetchCompOffEntitlements,
  reverseCompOffEntitlement,
  fetchCompOffHandoffs,
  fetchCompOffPolicies,
  checkCompOffEligibility,
  type CompOffOverviewMetrics,
  type CompOffRequestItem,
  type CompOffEntitlementItem,
  type CompOffHandoffItem,
  type CompOffPolicyItem,
  type CompOffAuditItem,
  type CompOffEligibilityCalculation,
} from '../api/attendanceCompOffApi';

type CompOffTab =
  'overview' | 'requests' | 'approvals' | 'entitlements' | 'handoffs' | 'policies' | 'audits';

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

export function AttendanceCompOffPage() {
  const [activeTab, setActiveTab] = useState<CompOffTab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [metrics, setMetrics] = useState<CompOffOverviewMetrics | null>(null);
  const [requests, setRequests] = useState<CompOffRequestItem[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<CompOffRequestItem[]>([]);
  const [entitlements, setEntitlements] = useState<CompOffEntitlementItem[]>([]);
  const [handoffs, setHandoffs] = useState<CompOffHandoffItem[]>([]);
  const [policies, setPolicies] = useState<CompOffPolicyItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<
    (CompOffRequestItem & { audits: CompOffAuditItem[] }) | null
  >(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Create Request Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createEmployeeId, setCreateEmployeeId] = useState('');
  const [createWorkDate, setCreateWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [createCreditDays, setCreateCreditDays] = useState(1.0);
  const [createReason, setCreateReason] = useState('');
  const [createStartTime, setCreateStartTime] = useState('09:00');
  const [createEndTime, setCreateEndTime] = useState('18:00');
  const [eligibilityCheck, setEligibilityCheck] = useState<{
    loading: boolean;
    result?: CompOffEligibilityCalculation;
    checked: boolean;
  }>({ loading: false, checked: false });

  // Decision Modal
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<CompOffRequestItem | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [approvedCreditDays, setApprovedCreditDays] = useState(1.0);
  const [reviewNotes, setReviewNotes] = useState('');

  // Reversal Modal
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [targetEntitlement, setTargetEntitlement] = useState<CompOffEntitlementItem | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Load Overview Data
  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompOffOverview();
      setMetrics(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load Comp-Off overview.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Requests Catalog
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompOffRequests({
        status: statusFilter,
        search,
      });
      setRequests(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      setTotalCount(
        typeof data?.total === 'number'
          ? data.total
          : Array.isArray(data?.items)
            ? data.items.length
            : Array.isArray(data)
              ? (data as unknown[]).length
              : 0,
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load Comp-Off claims.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  // Load Approval Queue
  const loadApprovalQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompOffApprovalQueue();
      setApprovalQueue(
        Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: CompOffRequestItem[] })?.items)
            ? (data as { items: CompOffRequestItem[] }).items
            : [],
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load approval queue.'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Entitlements Ledger
  const loadEntitlements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompOffEntitlements({
        status: statusFilter,
      });
      setEntitlements(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      setTotalCount(
        typeof data?.total === 'number'
          ? data.total
          : Array.isArray(data?.items)
            ? data.items.length
            : Array.isArray(data)
              ? (data as unknown[]).length
              : 0,
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load entitlements ledger.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Load Handoffs
  const loadHandoffs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompOffHandoffs({
        status: statusFilter,
      });
      setHandoffs(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
      setTotalCount(
        typeof data?.total === 'number'
          ? data.total
          : Array.isArray(data?.items)
            ? data.items.length
            : Array.isArray(data)
              ? (data as unknown[]).length
              : 0,
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load leave handoffs.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Load Policies
  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompOffPolicies();
      setPolicies(
        Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: CompOffPolicyItem[] })?.items)
            ? (data as { items: CompOffPolicyItem[] }).items
            : [],
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load Comp-Off policies.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
    else if (activeTab === 'requests') loadRequests();
    else if (activeTab === 'approvals') loadApprovalQueue();
    else if (activeTab === 'entitlements') loadEntitlements();
    else if (activeTab === 'handoffs') loadHandoffs();
    else if (activeTab === 'policies') loadPolicies();
    else if (activeTab === 'audits') loadRequests();
  }, [
    activeTab,
    loadOverview,
    loadRequests,
    loadApprovalQueue,
    loadEntitlements,
    loadHandoffs,
    loadPolicies,
  ]);

  // Run Real-Time Eligibility Evaluation
  const handleEvaluateEligibility = async () => {
    if (!createEmployeeId.trim() || !createWorkDate) {
      setError('Please provide Employee ID and Work Date to evaluate eligibility.');
      return;
    }
    try {
      setEligibilityCheck({ loading: true, checked: false });
      setError(null);
      const res = await checkCompOffEligibility(createEmployeeId.trim(), createWorkDate);
      setEligibilityCheck({
        loading: false,
        result: res.calculation,
        checked: true,
      });
      if (res.calculation.eligibleCreditDays) {
        setCreateCreditDays(res.calculation.eligibleCreditDays);
      }
    } catch (err) {
      setEligibilityCheck({ loading: false, checked: false });
      setError(getErrorMessage(err, 'Eligibility check failed.'));
    }
  };

  // Submit Claim
  const handleCreateRequest = async () => {
    if (!createEmployeeId.trim() || !createReason.trim()) {
      setError('Employee ID and justification reason are required.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await createCompOffRequest({
        employeeId: createEmployeeId.trim(),
        workDate: createWorkDate,
        requestedCreditDays: createCreditDays,
        reason: createReason.trim(),
        sourceIntervals: [
          {
            startTime: createStartTime,
            endTime: createEndTime,
            durationMinutes: 480,
          },
        ],
      });
      setSuccessMessage('Comp-Off claim submitted successfully.');
      setCreateModalOpen(false);
      setCreateReason('');
      setEligibilityCheck({ loading: false, checked: false });
      loadRequests();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit Comp-Off claim.'));
    } finally {
      setLoading(false);
    }
  };

  // View Claim Detail
  const handleViewDetail = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const detail = await fetchCompOffRequestDetail(id);
      setSelectedRequest(detail);
      setDetailModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch claim details.'));
    } finally {
      setLoading(false);
    }
  };

  // Submit Review Decision
  const handleDecision = async () => {
    if (!targetRequest) return;
    try {
      setLoading(true);
      setError(null);
      await decideCompOffRequest(targetRequest.id, {
        decision: decisionType,
        approvedCreditDays: decisionType === 'approved' ? approvedCreditDays : undefined,
        reviewNotes: reviewNotes.trim() || undefined,
        expectedVersion: targetRequest.version,
      });
      setSuccessMessage(`Claim ${targetRequest.requestNumber} ${decisionType} successfully.`);
      setDecisionModalOpen(false);
      setTargetRequest(null);
      setReviewNotes('');
      loadApprovalQueue();
    } catch (err) {
      setError(getErrorMessage(err, 'Review decision failed.'));
    } finally {
      setLoading(false);
    }
  };

  // Reverse Entitlement
  const handleReverseEntitlement = async () => {
    if (!targetEntitlement || !reversalReason.trim()) {
      setError('Reversal justification reason is required.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await reverseCompOffEntitlement(targetEntitlement.id, reversalReason.trim());
      setSuccessMessage(`Entitlement reversed and Leave handoff notified successfully.`);
      setReversalModalOpen(false);
      setTargetEntitlement(null);
      setReversalReason('');
      loadEntitlements();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reverse entitlement.'));
    } finally {
      setLoading(false);
    }
  };

  // Withdraw / Cancel Claim
  const handleWithdraw = async (id: string) => {
    if (!window.confirm('Are you sure you want to withdraw this Comp-Off claim?')) return;
    try {
      setLoading(true);
      await withdrawCompOffRequest(id, 'Withdrawn by requester');
      setSuccessMessage('Claim withdrawn successfully.');
      loadRequests();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to withdraw claim.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this Comp-Off claim?')) return;
    try {
      setLoading(true);
      await cancelCompOffRequest(id, 'Cancelled by administrator');
      setSuccessMessage('Claim cancelled successfully.');
      loadRequests();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel claim.'));
    } finally {
      setLoading(false);
    }
  };

  const renderBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
      case 'acknowledged':
      case 'credited_to_leave':
        return <Badge variant="success">{status.replace(/_/g, ' ')}</Badge>;
      case 'pending_approval':
      case 'pending_handoff':
      case 'submitted':
        return <Badge variant="warning">{status.replace(/_/g, ' ')}</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge variant="danger">{status.replace(/_/g, ' ')}</Badge>;
      case 'reversed':
      case 'cancelled':
      case 'withdrawn':
        return <Badge variant="neutral">{status.replace(/_/g, ' ')}</Badge>;
      default:
        return <Badge variant="info">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <Page>
      <PageHeader
        title="Comp-Off Management"
        subtitle="Compensatory Off entitlements integrated with Attendance, Overtime and Leave"
        actions={
          <Inline gap="sm">
            <Button
              variant="primary"
              onClick={() => {
                setEligibilityCheck({ loading: false, checked: false });
                setCreateModalOpen(true);
              }}
            >
              <BezentIcon name="plusSign" size={16} />
              Claim Comp-Off
            </Button>
          </Inline>
        }
      />

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
        activeId={activeTab}
        onChange={(tabId) => setActiveTab(tabId as CompOffTab)}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'requests', label: 'Earning Requests' },
          { id: 'approvals', label: 'Approval Queue' },
          { id: 'entitlements', label: 'Approved Earnings' },
          { id: 'handoffs', label: 'Credit Handoff Status' },
          { id: 'policies', label: 'Policies' },
          { id: 'audits', label: 'Audit History' },
        ]}
      />

      {loading && <LoadingState label="Loading Comp-Off workspace data..." />}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && !metrics && !loading && !error && (
        <EmptyState
          title="No Metrics Available"
          description="Comp-Off summary metrics could not be loaded for this period."
        />
      )}
      {activeTab === 'overview' && metrics && (
        <Stack gap="lg">
          <Grid columns={4} gap="md">
            <Card>
              <Stack gap="sm">
                <Inline justify="between">
                  <span>Total Claims</span>
                  <BezentIcon name="calendar" size={20} />
                </Inline>
                <h3>{metrics.totalRequests}</h3>
                <small>Historical claims filed</small>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <Inline justify="between">
                  <span>Pending Approval</span>
                  <BezentIcon name="approvals" size={20} />
                </Inline>
                <h3>{metrics.pendingApprovalCount}</h3>
                <small>Awaiting manager/HR decision</small>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <Inline justify="between">
                  <span>Total Earned Days</span>
                  <Badge variant="success">Earned</Badge>
                </Inline>
                <h3>{metrics.totalEarnedDays.toFixed(1)} days</h3>
                <small>Approved entitlement credits</small>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <Inline justify="between">
                  <span>Leave Handoffs</span>
                  <BezentIcon name="leave" size={20} />
                </Inline>
                <h3>{metrics.creditedLeaveCount}</h3>
                <small>Durable leave contracts acknowledged</small>
              </Stack>
            </Card>
          </Grid>

          <Card title="Governance & Double Benefit Protection Rules">
            <Stack gap="md">
              <p>BEZENT HRMS Comp-Off V1.0 enforces authoritative attendance reconciliation:</p>
              <Grid columns={2} gap="md">
                <Card>
                  <Stack gap="sm">
                    <strong>1. Overtime vs Comp-Off Protection</strong>
                    <small>
                      An approved work interval cannot generate both payable overtime and Comp-Off
                      credit. Any allocated overtime minutes are systematically deducted before
                      qualifying credit is evaluated.
                    </small>
                  </Stack>
                </Card>
                <Card>
                  <Stack gap="sm">
                    <strong>2. Conversion Thresholds & Daily Baseline</strong>
                    <small>
                      Qualifying duration requires verified full-day (480 mins) or half-day (240
                      mins) thresholds. Missing or incomplete punches require regularization before
                      entitlement eligibility.
                    </small>
                  </Stack>
                </Card>
                <Card>
                  <Stack gap="sm">
                    <strong>3. Canonical Leave Hand-off Contract</strong>
                    <small>
                      Attendance durably records earning entitlements and synchronizes via
                      idempotent leave handoff contracts without creating an uncoordinated secondary
                      leave ledger inside Attendance.
                    </small>
                  </Stack>
                </Card>
                <Card>
                  <Stack gap="sm">
                    <strong>4. Immutable Audit & Self-Approval Prevention</strong>
                    <small>
                      Requesters cannot review their own claims. Every state transition is recorded
                      in an immutable audit log with optimistic concurrency version control.
                    </small>
                  </Stack>
                </Card>
              </Grid>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* 2. REQUESTS TAB */}
      {activeTab === 'requests' && (
        <Stack gap="md">
          <Card>
            <Inline justify="between" align="center">
              <Inline gap="sm">
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search claims or employee..."
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'pending_approval', label: 'Pending Approval' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                    { value: 'withdrawn', label: 'Withdrawn' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </Inline>
              <span>Total Claims: {totalCount ?? 0}</span>
            </Inline>
          </Card>

          {(requests ?? []).length === 0 ? (
            <EmptyState
              title="No Comp-Off claims found"
              description="No claims match your filter criteria or no claims have been filed."
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Claim #</TableHeaderCell>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Work Date</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell>Qualifying Mins</TableHeaderCell>
                    <TableHeaderCell>Requested Credit</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(requests ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <strong>{r.requestNumber}</strong>
                      </TableCell>
                      <TableCell>
                        <Stack gap="none">
                          <span>{r.employeeName}</span>
                          <small>{r.employeeCode}</small>
                        </Stack>
                      </TableCell>
                      <TableCell>{r.workDate}</TableCell>
                      <TableCell>{r.dayType.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{r.qualifyingWorkedMinutes}m</TableCell>
                      <TableCell>
                        <strong>{r.requestedCreditDays} day</strong>
                      </TableCell>
                      <TableCell>{renderBadge(r.status)}</TableCell>
                      <TableCell>
                        <Inline gap="sm">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewDetail(r.id)}
                          >
                            View
                          </Button>
                          {['submitted', 'pending_approval'].includes(r.status) && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleWithdraw(r.id)}
                            >
                              Withdraw
                            </Button>
                          )}
                          {r.status === 'submitted' && (
                            <Button size="sm" variant="danger" onClick={() => handleCancel(r.id)}>
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
      )}

      {/* 3. APPROVAL QUEUE TAB */}
      {activeTab === 'approvals' && (
        <Stack gap="md">
          <Card>
            <Inline justify="between" align="center">
              <span>Claims Awaiting Decision: {(approvalQueue ?? []).length}</span>
              <Button size="sm" variant="secondary" onClick={loadApprovalQueue}>
                Refresh Queue
              </Button>
            </Inline>
          </Card>

          {(approvalQueue ?? []).length === 0 ? (
            <EmptyState
              title="Approval Queue Clean"
              description="There are currently no Comp-Off earning claims awaiting your review."
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Claim #</TableHeaderCell>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Work Date</TableHeaderCell>
                    <TableHeaderCell>Scenario</TableHeaderCell>
                    <TableHeaderCell>Qualifying / Scheduled</TableHeaderCell>
                    <TableHeaderCell>Requested Credit</TableHeaderCell>
                    <TableHeaderCell>Reason</TableHeaderCell>
                    <TableHeaderCell>Decision Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(approvalQueue ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <strong>{r.requestNumber}</strong>
                      </TableCell>
                      <TableCell>
                        <Stack gap="none">
                          <span>{r.employeeName}</span>
                          <small>{r.employeeCode}</small>
                        </Stack>
                      </TableCell>
                      <TableCell>{r.workDate}</TableCell>
                      <TableCell>{r.dayType.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        {r.qualifyingWorkedMinutes}m / {r.scheduledMinutes}m
                      </TableCell>
                      <TableCell>
                        <strong>{r.requestedCreditDays} day</strong>
                      </TableCell>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell>
                        <Inline gap="sm">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setTargetRequest(r);
                              setDecisionType('approved');
                              setApprovedCreditDays(r.requestedCreditDays);
                              setDecisionModalOpen(true);
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setTargetRequest(r);
                              setDecisionType('rejected');
                              setApprovedCreditDays(0);
                              setDecisionModalOpen(true);
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
            </Card>
          )}
        </Stack>
      )}

      {/* 4. APPROVED EARNINGS (ENTITLEMENTS) TAB */}
      {activeTab === 'entitlements' && (
        <Stack gap="md">
          <Card>
            <Inline justify="between" align="center">
              <span>Authoritative Comp-Off Entitlements Ledger</span>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'pending_handoff', label: 'Pending Handoff' },
                  { value: 'credited_to_leave', label: 'Credited To Leave' },
                  { value: 'reversed', label: 'Reversed' },
                ]}
              />
            </Inline>
          </Card>

          {(entitlements ?? []).length === 0 ? (
            <EmptyState
              title="No Entitlements Found"
              description="No approved Comp-Off entitlements match the selected filter."
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Entitlement ID</TableHeaderCell>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Work Date</TableHeaderCell>
                    <TableHeaderCell>Earned Credit</TableHeaderCell>
                    <TableHeaderCell>Validity Window</TableHeaderCell>
                    <TableHeaderCell>Origin</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(entitlements ?? []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <strong>{e.id}</strong>
                      </TableCell>
                      <TableCell>
                        <Stack gap="none">
                          <span>{e.employeeName}</span>
                          <small>{e.employeeCode}</small>
                        </Stack>
                      </TableCell>
                      <TableCell>{e.workDate}</TableCell>
                      <TableCell>
                        <strong>{e.earnedDays} day</strong> ({e.earnedMinutes}m)
                      </TableCell>
                      <TableCell>
                        {e.validFrom} to {e.expiresAt}
                      </TableCell>
                      <TableCell>
                        {e.sourceOvertimeSettlementId ? (
                          <Badge variant="info">OT Settlement</Badge>
                        ) : (
                          <Badge variant="neutral">Attendance Claim</Badge>
                        )}
                      </TableCell>
                      <TableCell>{renderBadge(e.status)}</TableCell>
                      <TableCell>
                        {e.status !== 'reversed' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setTargetEntitlement(e);
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
            </Card>
          )}
        </Stack>
      )}

      {/* 5. CREDIT HANDOFF STATUS TAB */}
      {activeTab === 'handoffs' && (
        <Stack gap="md">
          <Card>
            <Inline justify="between" align="center">
              <span>Leave Credit Synchronization Ledger</span>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'acknowledged', label: 'Acknowledged' },
                  { value: 'pending_handoff', label: 'Pending Handoff' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'reversed', label: 'Reversed' },
                ]}
              />
            </Inline>
          </Card>

          {(handoffs ?? []).length === 0 ? (
            <EmptyState
              title="No Leave Handoffs Recorded"
              description="No credit handoff records exist for the selected filter."
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Handoff ID</TableHeaderCell>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Leave Type</TableHeaderCell>
                    <TableHeaderCell>Credit Amount</TableHeaderCell>
                    <TableHeaderCell>Idempotency Key</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Sync Date</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(handoffs ?? []).map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <strong>{h.id}</strong>
                      </TableCell>
                      <TableCell>
                        <Stack gap="none">
                          <span>{h.employeeName}</span>
                          <small>{h.employeeCode}</small>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{h.leaveTypeCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <strong>{h.creditDays} day</strong> ({h.creditMinutes}m)
                      </TableCell>
                      <TableCell>
                        <small>{h.idempotencyKey}</small>
                      </TableCell>
                      <TableCell>{renderBadge(h.status)}</TableCell>
                      <TableCell>{String(h.acknowledgedAt || h.createdAt).slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      )}

      {/* 6. POLICIES TAB */}
      {activeTab === 'policies' && (
        <Stack gap="md">
          <Card>
            <Inline justify="between" align="center">
              <span>Authoritative Organization Comp-Off Policies</span>
              <Button size="sm" variant="secondary" onClick={loadPolicies}>
                Refresh
              </Button>
            </Inline>
          </Card>

          {(policies ?? []).length === 0 ? (
            <EmptyState
              title="No Published Comp-Off Policies"
              description="No Comp-Off policies have been configured or published for this organization."
            />
          ) : (
            <Grid columns={2} gap="md">
              {(policies ?? []).map((p) => (
                <Card key={p.id} title={p.policyName}>
                  <Stack gap="sm">
                    <Inline justify="between">
                      <span>Status:</span>
                      {renderBadge(p.status)}
                    </Inline>
                    <Inline justify="between">
                      <span>Version:</span>
                      <strong>v{p.version}</strong>
                    </Inline>
                    <Inline justify="between">
                      <span>Minimum Qualifying Work:</span>
                      <strong>{p.minimumQualifyingMinutes} minutes</strong>
                    </Inline>
                    <Inline justify="between">
                      <span>Half-Day / Full-Day Threshold:</span>
                      <strong>
                        {p.halfDayThresholdMinutes}m / {p.fullDayThresholdMinutes}m
                      </strong>
                    </Inline>
                    <Inline justify="between">
                      <span>Claim Submission Deadline:</span>
                      <strong>{p.submissionDeadlineDays} days</strong>
                    </Inline>
                    <Inline justify="between">
                      <span>Credit Validity:</span>
                      <strong>{p.validityDays} days from work date</strong>
                    </Inline>
                    <Inline justify="between">
                      <span>Max Monthly Cap:</span>
                      <strong>{p.maxEarningLimitPerMonthDays} days/month</strong>
                    </Inline>
                    <Inline justify="between">
                      <span>Rounding Rule:</span>
                      <strong>{p.roundingRule.replace(/_/g, ' ')}</strong>
                    </Inline>
                  </Stack>
                </Card>
              ))}
            </Grid>
          )}
        </Stack>
      )}

      {/* 7. AUDIT HISTORY TAB */}
      {activeTab === 'audits' && (
        <Stack gap="md">
          <Card>
            <span>Immutable Comp-Off Lifecycle Audit Trail</span>
          </Card>
          {(requests ?? []).length === 0 ? (
            <EmptyState
              title="No Audit Records Available"
              description="No Comp-Off requests have audit trails recorded."
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Claim #</TableHeaderCell>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Work Date</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Submitted At</TableHeaderCell>
                    <TableHeaderCell>Reviewer</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(requests ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <strong>{r.requestNumber}</strong>
                      </TableCell>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell>{r.workDate}</TableCell>
                      <TableCell>{renderBadge(r.status)}</TableCell>
                      <TableCell>{String(r.submittedAt || '').slice(0, 19)}</TableCell>
                      <TableCell>{r.reviewedByUserId || 'Pending Review'}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewDetail(r.id)}
                        >
                          Audit Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      )}

      {/* CLAIM SUBMISSION MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Claim Compensatory Off (Comp-Off)"
      >
        <Stack gap="md">
          <Input
            label="Employee ID"
            value={createEmployeeId}
            onChange={(e) => setCreateEmployeeId(e.target.value)}
            placeholder="e.g. emp_01"
            required
          />

          <Input
            label="Work Date"
            type="date"
            value={createWorkDate}
            onChange={(e) => setCreateWorkDate(e.target.value)}
            required
          />

          <Button
            variant="secondary"
            onClick={handleEvaluateEligibility}
            disabled={eligibilityCheck.loading}
          >
            {eligibilityCheck.loading ? 'Evaluating...' : 'Evaluate Eligibility & Worked Duration'}
          </Button>

          {eligibilityCheck.checked && eligibilityCheck.result && (
            <Card>
              <Stack gap="sm">
                <strong>Eligibility Evaluation Result:</strong>
                <Inline justify="between">
                  <span>Is Eligible:</span>
                  {eligibilityCheck.result.isEligible ? (
                    <Badge variant="success">Eligible</Badge>
                  ) : (
                    <Badge variant="danger">Not Eligible</Badge>
                  )}
                </Inline>
                <Inline justify="between">
                  <span>Qualifying Worked Duration:</span>
                  <strong>{eligibilityCheck.result.qualifyingWorkedMinutes} minutes</strong>
                </Inline>
                <Inline justify="between">
                  <span>Eligible Credit:</span>
                  <strong>{eligibilityCheck.result.eligibleCreditDays} day</strong>
                </Inline>
                {eligibilityCheck.result.nonEligibilityReason && (
                  <Alert variant="warning" title="Notice">
                    {eligibilityCheck.result.nonEligibilityReason}
                  </Alert>
                )}
                {eligibilityCheck.result.complianceNotes?.map((note, idx) => (
                  <small key={idx}>{note}</small>
                ))}
              </Stack>
            </Card>
          )}

          <Grid columns={2} gap="sm">
            <Input
              label="Work Start Time"
              type="time"
              value={createStartTime}
              onChange={(e) => setCreateStartTime(e.target.value)}
            />
            <Input
              label="Work End Time"
              type="time"
              value={createEndTime}
              onChange={(e) => setCreateEndTime(e.target.value)}
            />
          </Grid>

          <Select
            label="Requested Credit Days"
            value={String(createCreditDays)}
            onChange={(e) => setCreateCreditDays(parseFloat(e.target.value))}
            options={[
              { value: '0.5', label: '0.5 Day (Half Day)' },
              { value: '1', label: '1.0 Day (Full Day)' },
            ]}
          />

          <Input
            label="Justification Reason"
            value={createReason}
            onChange={(e) => setCreateReason(e.target.value)}
            placeholder="Describe extra work, project release or weekend support..."
            required
          />

          <Inline justify="end" gap="sm">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRequest} disabled={loading}>
              Submit Claim
            </Button>
          </Inline>
        </Stack>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={
          selectedRequest ? `Claim Details: ${selectedRequest.requestNumber}` : 'Claim Details'
        }
      >
        {selectedRequest && (
          <Stack gap="md">
            <Grid columns={2} gap="sm">
              <Stack gap="none">
                <small>Employee</small>
                <strong>
                  {selectedRequest.employeeName} ({selectedRequest.employeeCode})
                </strong>
              </Stack>
              <Stack gap="none">
                <small>Work Date</small>
                <strong>{selectedRequest.workDate}</strong>
              </Stack>
              <Stack gap="none">
                <small>Day Scenario</small>
                <strong>{selectedRequest.dayType.replace(/_/g, ' ')}</strong>
              </Stack>
              <Stack gap="none">
                <small>Status</small>
                {renderBadge(selectedRequest.status)}
              </Stack>
              <Stack gap="none">
                <small>Qualifying Duration</small>
                <strong>{selectedRequest.qualifyingWorkedMinutes} minutes</strong>
              </Stack>
              <Stack gap="none">
                <small>Requested / Approved Credit</small>
                <strong>
                  {selectedRequest.requestedCreditDays}d / {selectedRequest.approvedCreditDays}d
                </strong>
              </Stack>
            </Grid>

            <Stack gap="none">
              <small>Justification</small>
              <p>{selectedRequest.reason}</p>
            </Stack>

            {selectedRequest.reviewNotes && (
              <Stack gap="none">
                <small>Reviewer Notes</small>
                <p>{selectedRequest.reviewNotes}</p>
              </Stack>
            )}

            <Card title="Audit Log">
              {(selectedRequest.audits ?? []).length === 0 ? (
                <small>No audit events recorded for this request.</small>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Action</TableHeaderCell>
                      <TableHeaderCell>From Status</TableHeaderCell>
                      <TableHeaderCell>To Status</TableHeaderCell>
                      <TableHeaderCell>Actor</TableHeaderCell>
                      <TableHeaderCell>Timestamp</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedRequest.audits ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <strong>{a.action}</strong>
                        </TableCell>
                        <TableCell>{a.fromStatus || '-'}</TableCell>
                        <TableCell>{a.toStatus || '-'}</TableCell>
                        <TableCell>{a.performedByUserId}</TableCell>
                        <TableCell>{String(a.createdAt).slice(0, 19)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Inline justify="end">
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </Inline>
          </Stack>
        )}
      </Modal>

      {/* REVIEW DECISION MODAL */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={targetRequest ? `Review Claim: ${targetRequest.requestNumber}` : 'Review Decision'}
      >
        {targetRequest && (
          <Stack gap="md">
            <Stack gap="none">
              <small>Employee</small>
              <strong>{targetRequest.employeeName}</strong>
            </Stack>

            <Stack gap="none">
              <small>Requested Credit</small>
              <strong>{targetRequest.requestedCreditDays} day</strong>
            </Stack>

            {decisionType === 'approved' && (
              <Select
                label="Approved Credit Days"
                value={String(approvedCreditDays)}
                onChange={(e) => setApprovedCreditDays(parseFloat(e.target.value))}
                options={[
                  { value: '0.5', label: '0.5 Day (Half Day)' },
                  { value: '1', label: '1.0 Day (Full Day)' },
                ]}
              />
            )}

            <Input
              label="Reviewer Notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Comments on verified work logs or reasons..."
              required={decisionType === 'rejected'}
            />

            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setDecisionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={decisionType === 'approved' ? 'primary' : 'danger'}
                onClick={handleDecision}
                disabled={loading}
              >
                Confirm {decisionType === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </Inline>
          </Stack>
        )}
      </Modal>

      {/* REVERSAL MODAL */}
      <Modal
        isOpen={reversalModalOpen}
        onClose={() => setReversalModalOpen(false)}
        title="Reverse Comp-Off Entitlement"
      >
        {targetEntitlement && (
          <Stack gap="md">
            <Alert variant="warning" title="Warning">
              Reversing this entitlement will roll back credit from the canonical Leave ledger. This
              action is permanent and audited.
            </Alert>

            <Stack gap="none">
              <small>Entitlement ID</small>
              <strong>{targetEntitlement.id}</strong>
            </Stack>

            <Stack gap="none">
              <small>Earned Credit</small>
              <strong>{targetEntitlement.earnedDays} days</strong>
            </Stack>

            <Input
              label="Reversal Justification"
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="State reason for cancellation or reversal..."
              required
            />

            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setReversalModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReverseEntitlement} disabled={loading}>
                Confirm Reversal
              </Button>
            </Inline>
          </Stack>
        )}
      </Modal>
    </Page>
  );
}
export default AttendanceCompOffPage;
