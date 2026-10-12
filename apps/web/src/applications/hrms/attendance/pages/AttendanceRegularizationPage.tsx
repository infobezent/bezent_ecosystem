import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  Select,
  Input,
  SearchInput,
  Checkbox,
  Badge,
  Avatar,
  Modal,
  Tabs,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchRegularizationWorkspace,
  fetchRegularizationDetails,
  checkRegularizationEligibility,
  submitRegularization,
  assignRegularizationReviewer,
  startRegularizationReview,
  requestRegularizationInfo,
  reviewRegularizationDecision,
  bulkRegularizationAction,
  exportRegularizationsCsvBlob,
} from '../api/attendanceApi';
import type {
  RegularizationItemV1,
  RegularizationDetailV1,
  RegularizationSummaryCounters,
  RegularizationFilterV1,
  RegularizationRequestType,
  RegularizationApprovalStatus,
  RegularizationApplicationStatus,
  RegularizationEligibilityCheckResult,
} from '../types/attendance.types';

// Preset date helpers
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStartOfMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDate(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatDayOfWeek(val?: string | null): string {
  if (!val) return '';
  const parts = val.split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }
  return '';
}

function formatTime(val?: string | Date | null): string {
  if (!val) return '';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateTime(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatExceptionDisplay(id?: string | null) {
  if (!id) return <span className="bezent-table-meta-subtitle">—</span>;
  if (id.startsWith('EXC-')) {
    return <Badge variant="neutral">{id}</Badge>;
  }
  const shortId = `EXC-${id.slice(-5).toUpperCase()}`;
  return (
    <span title={id}>
      <Badge variant="neutral">{shortId}</Badge>
    </span>
  );
}

const REQUEST_TYPE_LABELS: Record<RegularizationRequestType, string> = {
  missing_in: 'Missing IN',
  missing_out: 'Missing OUT',
  incorrect_time: 'Incorrect Time',
  status_correction: 'Status Correction',
  worked_hours: 'Worked Hours',
  both_missing: 'Both Punches Missing',
  wrong_direction: 'Wrong Direction',
};

export function AttendanceRegularizationPage() {
  // 1. Date Range State (defaults to current month)
  const [workdayFrom, setWorkdayFrom] = useState(getStartOfMonthString());
  const [workdayTo, setWorkdayTo] = useState(getTodayString());

  // 2. Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<string>('all');
  const [requestType, setRequestType] = useState<string>('all');
  const [applicationStatus, setApplicationStatus] = useState<string>('all');

  // Progressive Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [relatedException, setRelatedException] = useState('all');
  const [source, setSource] = useState('all');

  // 3. Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // 4. Data State
  const [items, setItems] = useState<RegularizationItemV1[]>([]);
  const [counters, setCounters] = useState<RegularizationSummaryCounters>({
    pendingReview: 0,
    underReview: 0,
    awaitingInfo: 0,
    approvedToday: 0,
    applicationIssues: 0,
    rejectedToday: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 5. Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 6. Review Drawer State
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<RegularizationDetailV1 | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'evidence' | 'decision' | 'history'>('overview');
  const [drawerActionLoading, setDrawerActionLoading] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'clarify'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');

  // 7. New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formWorkday, setFormWorkday] = useState(getTodayString());
  const [formType, setFormType] = useState<RegularizationRequestType>('missing_out');
  const [formProposedIn, setFormProposedIn] = useState('09:00');
  const [formProposedOut, setFormProposedOut] = useState('18:00');
  const [formProposedStatus, setFormProposedStatus] = useState('half_day');
  const [formClaimedHours, setFormClaimedHours] = useState('8.0');
  const [formDirection, setFormDirection] = useState('IN');
  const [formReason, setFormReason] = useState('');
  const [formAttachments, setFormAttachments] = useState<Array<{ name: string; size: string; url?: string }>>([]);
  const [formExceptionId, setFormExceptionId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<RegularizationEligibilityCheckResult | null>(null);

  // 8. Bulk Operation Modals State
  const [bulkModalAction, setBulkModalAction] = useState<string | null>(null);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResultReport, setBulkResultReport] = useState<{
    succeeded: string[];
    skipped: Array<{ id: string; reason: string }>;
    failed: Array<{ id: string; error: string }>;
  } | null>(null);

  // 9. Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [exportScope, setExportScope] = useState<'selected' | 'filtered'>('filtered');
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Table Data & Summary Counters
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: RegularizationFilterV1 = {
        workdayFrom,
        workdayTo,
        search: debouncedSearch.trim() || undefined,
        approvalStatus: approvalStatus === 'all' ? undefined : approvalStatus,
        applicationStatus: applicationStatus === 'all' ? undefined : applicationStatus,
        requestType: requestType === 'all' ? undefined : requestType,
        submittedFrom: submittedFrom || undefined,
        submittedTo: submittedTo || undefined,
        assignedTo: assignedTo === 'all' ? undefined : assignedTo,
        departmentId: departmentId === 'all' ? undefined : departmentId,
        locationId: locationId === 'all' ? undefined : locationId,
        relatedException: relatedException === 'all' ? undefined : relatedException,
        source: source === 'all' ? undefined : source,
        page,
        limit: pageSize,
      };

      const res = await fetchRegularizationWorkspace(filter);
      setItems(res.items);
      setCounters(res.counters);
      setTotalCount(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load regularizations');
    } finally {
      setLoading(false);
    }
  }, [
    workdayFrom,
    workdayTo,
    debouncedSearch,
    approvalStatus,
    applicationStatus,
    requestType,
    submittedFrom,
    submittedTo,
    assignedTo,
    departmentId,
    locationId,
    relatedException,
    source,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Review Drawer Details
  const handleOpenDrawer = useCallback(async (id: string) => {
    setDrawerId(id);
    setDrawerLoading(true);
    setDecisionNotes('');
    try {
      const data = await fetchRegularizationDetails(id);
      setDrawerDetail(data);
    } catch {
      // Gracefully handled in drawer
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handleCloseDrawer = () => {
    setDrawerId(null);
    setDrawerDetail(null);
  };

  // Check Eligibility on Form Change
  useEffect(() => {
    if (!showNewModal || !formWorkday || !formEmployeeId) return;
    let isCancelled = false;
    checkRegularizationEligibility(formEmployeeId, formWorkday, formType)
      .then((res) => {
        if (!isCancelled) setEligibilityResult(res);
      })
      .catch(() => {
        if (!isCancelled) setEligibilityResult(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [showNewModal, formWorkday, formEmployeeId, formType]);

  // Master Checkbox Select-All
  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false;
    return items.every((i) => selectedIds.has(i.id));
  }, [items, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Counter Click handler
  const handleCounterClick = (targetStatus: string) => {
    setPage(1);
    if (targetStatus === 'application_issues') {
      setApprovalStatus('all');
      setApplicationStatus(applicationStatus === 'failed' ? 'all' : 'failed');
    } else if (targetStatus === 'approved_today') {
      setApprovalStatus(approvalStatus === 'approved' ? 'all' : 'approved');
      setApplicationStatus('all');
    } else if (targetStatus === 'rejected_today') {
      setApprovalStatus(approvalStatus === 'rejected' ? 'all' : 'rejected');
      setApplicationStatus('all');
    } else {
      setApplicationStatus('all');
      setApprovalStatus(approvalStatus === targetStatus ? 'all' : targetStatus);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setApprovalStatus('all');
    setRequestType('all');
    setApplicationStatus('all');
    setSubmittedFrom('');
    setSubmittedTo('');
    setAssignedTo('all');
    setDepartmentId('all');
    setLocationId('all');
    setRelatedException('all');
    setSource('all');
    setPage(1);
  };

  // Active advanced filters count
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (submittedFrom || submittedTo) count++;
    if (assignedTo !== 'all') count++;
    if (departmentId !== 'all') count++;
    if (locationId !== 'all') count++;
    if (relatedException !== 'all') count++;
    if (source !== 'all') count++;
    return count;
  }, [submittedFrom, submittedTo, assignedTo, departmentId, locationId, relatedException, source]);

  // Drawer Actions Execution
  const handleDrawerDecision = async () => {
    if (!drawerDetail) return;
    setDrawerActionLoading(true);
    try {
      if (decisionType === 'clarify') {
        await requestRegularizationInfo(drawerDetail.id, decisionNotes.trim() || 'Please provide clarification.');
      } else {
        await reviewRegularizationDecision(drawerDetail.id, {
          status: decisionType,
          reason: decisionNotes.trim() || undefined,
          remarks: decisionNotes.trim() || undefined,
        });
      }
      await handleOpenDrawer(drawerDetail.id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Decision action failed');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  // Quick Action in Overview Tab
  const handleQuickAssign = async (assignee: string | null) => {
    if (!drawerDetail) return;
    setDrawerActionLoading(true);
    try {
      await assignRegularizationReviewer(drawerDetail.id, assignee);
      await handleOpenDrawer(drawerDetail.id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to assign reviewer');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  const handleQuickStartReview = async () => {
    if (!drawerDetail) return;
    setDrawerActionLoading(true);
    try {
      await startRegularizationReview(drawerDetail.id);
      await handleOpenDrawer(drawerDetail.id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start review');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  // Bulk Operations Submit
  const handleBulkExecute = async () => {
    if (!bulkModalAction || selectedIds.size === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await bulkRegularizationAction({
        action: bulkModalAction as 'assign' | 'start_review' | 'request_info' | 'bulk_approve' | 'bulk_reject',
        requestIds: Array.from(selectedIds),
        assignedTo: bulkAssignee || undefined,
        notes: bulkReason || undefined,
        reason: bulkReason || undefined,
      });
      setBulkResultReport(res);
      setSelectedIds(new Set());
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Submit New Regularization
  const handleCreateSubmit = async (isDraft = false) => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      await submitRegularization({
        employeeId: formEmployeeId.trim(),
        workday: formWorkday,
        requestType: formType,
        proposedCheckIn: formProposedIn || undefined,
        proposedCheckOut: formProposedOut || undefined,
        proposedStatus: formProposedStatus || undefined,
        claimedHours: formClaimedHours ? parseFloat(formClaimedHours) : undefined,
        targetPunchDirection: formDirection || undefined,
        reason: formReason.trim(),
        evidenceAttachments: formAttachments,
        relatedExceptionId: formExceptionId.trim() || undefined,
        isDraft,
      });
      setShowNewModal(false);
      setFormReason('');
      setFormAttachments([]);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Export Trigger
  const handleExportExecute = async () => {
    setExporting(true);
    try {
      const ids = exportScope === 'selected' ? Array.from(selectedIds) : undefined;
      const blob = await exportRegularizationsCsvBlob(
        {
          workdayFrom,
          workdayTo,
          approvalStatus: approvalStatus === 'all' ? undefined : approvalStatus,
          applicationStatus: applicationStatus === 'all' ? undefined : applicationStatus,
          requestType: requestType === 'all' ? undefined : requestType,
          assignedTo: assignedTo === 'all' ? undefined : assignedTo,
          departmentId: departmentId === 'all' ? undefined : departmentId,
        },
        ids,
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_regularization_${getTodayString()}.${exportFormat === 'excel' ? 'csv' : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Semantic Approval Badge
  const renderApprovalBadge = (status: RegularizationApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'under_review':
        return <Badge variant="info">Under Review</Badge>;
      case 'awaiting_info':
        return <Badge variant="warning">Awaiting Info</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'draft':
        return <Badge variant="neutral">Draft</Badge>;
      case 'submitted':
      default:
        return <Badge variant="warning">Pending Review</Badge>;
    }
  };

  // Semantic Application Badge
  const renderApplicationBadge = (status: RegularizationApplicationStatus) => {
    switch (status) {
      case 'applied':
        return <Badge variant="success">Applied</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'blocked':
        return <Badge variant="danger">Blocked</Badge>;
      case 'pending_application':
        return <Badge variant="warning">Pending</Badge>;
      case 'not_applicable':
      default:
        return <Badge variant="neutral">Not Applied</Badge>;
    }
  };

  return (
    <Page>
      {/* 1. Header & Actions Strip */}
      <PageHeader
        breadcrumbs={<span>Attendance / Regularization</span>}
        title={
          <span>
            Regularization
            <span className="bezent-sr-only">
              Submit, review and manage attendance correction requests
            </span>
          </span>
        }
        actions={
          <Inline gap="xs" align="center">
            {/* Workday Date Range Selector */}
            <Card padding="none">
              <Inline gap="xs" align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const from = new Date(workdayFrom);
                    from.setMonth(from.getMonth() - 1);
                    setWorkdayFrom(from.toISOString().slice(0, 10));
                  }}
                  aria-label="Previous month"
                >
                  <BezentIcon name="chevron_left" size={14} />
                </Button>
                <span className="bezent-table-meta-title">
                  {formatDate(workdayFrom)} – {formatDate(workdayTo)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const to = new Date(workdayTo);
                    to.setMonth(to.getMonth() + 1);
                    setWorkdayTo(to.toISOString().slice(0, 10));
                  }}
                  aria-label="Next month"
                >
                  <BezentIcon name="chevron_right" size={14} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setWorkdayFrom(getStartOfMonthString());
                    setWorkdayTo(getTodayString());
                  }}
                >
                  Today
                </Button>
              </Inline>
            </Card>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportModal(true)}
            >
              <BezentIcon name="download" size={14} /> Export
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormEmployeeId('emp_demo_01');
                setFormWorkday(getTodayString());
                setShowNewModal(true);
              }}
            >
              <BezentIcon name="add" size={14} /> New Request
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* 2. Six Compact Summary Counters Strip (~78px height, 1 row) */}
        <Grid columns={6} gap="sm">
          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'submitted' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('submitted')}
            role="button"
            tabIndex={0}
            title="Requests awaiting review"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Pending Review</span>
              <BezentIcon name="tasks" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.pendingReview}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'under_review' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('under_review')}
            role="button"
            tabIndex={0}
            title="Requests under active review"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Under Review</span>
              <BezentIcon name="search" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.underReview}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'awaiting_info' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('awaiting_info')}
            role="button"
            tabIndex={0}
            title="Requests awaiting employee clarification"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Awaiting Info</span>
              <BezentIcon name="notes" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.awaitingInfo}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'approved' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('approved_today')}
            role="button"
            tabIndex={0}
            title="Requests approved today"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Approved Today</span>
              <BezentIcon name="approvals" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.approvedToday}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${applicationStatus === 'failed' || applicationStatus === 'blocked' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('application_issues')}
            role="button"
            tabIndex={0}
            title="Approved requests blocked or failed during application"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Application Issues</span>
              <BezentIcon name="security" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.applicationIssues}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'rejected' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('rejected_today')}
            role="button"
            tabIndex={0}
            title="Requests rejected today"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Rejected Today</span>
              <BezentIcon name="delete" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.rejectedToday}</span>
          </div>
        </Grid>

        {/* 3. Primary Filter Toolbar */}
        <Card padding="sm">
          <Stack gap="sm">
            <div className="bezent-filter-toolbar">
              <SearchInput
                placeholder="Search by name, employee ID or request ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Select
                value={approvalStatus}
                onChange={(e) => {
                  setApprovalStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Approval Statuses</option>
                <option value="submitted">Pending Review</option>
                <option value="under_review">Under Review</option>
                <option value="awaiting_info">Awaiting Info</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </Select>

              <Select
                value={requestType}
                onChange={(e) => {
                  setRequestType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Request Types</option>
                <option value="missing_in">Missing IN Punch</option>
                <option value="missing_out">Missing OUT Punch</option>
                <option value="incorrect_time">Incorrect Punch Time</option>
                <option value="status_correction">Status Correction</option>
                <option value="worked_hours">Worked Hours</option>
                <option value="both_missing">Both Punches Missing</option>
                <option value="wrong_direction">Wrong Punch Direction</option>
              </Select>

              <Select
                value={applicationStatus}
                onChange={(e) => {
                  setApplicationStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Application States</option>
                <option value="not_applicable">Not Applied</option>
                <option value="pending_application">Pending</option>
                <option value="applied">Applied</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
              </Select>

              <div className="bezent-filter-toolbar__actions">
                <Button
                  variant={showAdvancedFilters ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <BezentIcon name="filter_list" size={14} />
                  {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
                  {activeAdvancedFilterCount > 0 && ` (${activeAdvancedFilterCount})`}
                </Button>

                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Collapsible Advanced Filters Row */}
            {showAdvancedFilters && (
              <div className="bezent-filter-toolbar__more">
                <Stack gap="xs">
                  <span className="bezent-card__desc">Workday Range</span>
                  <Inline gap="xs">
                    <Input
                      type="date"
                      value={workdayFrom}
                      onChange={(e) => setWorkdayFrom(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={workdayTo}
                      onChange={(e) => setWorkdayTo(e.target.value)}
                    />
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Submitted Date Range</span>
                  <Inline gap="xs">
                    <Input
                      type="date"
                      value={submittedFrom}
                      onChange={(e) => setSubmittedFrom(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={submittedTo}
                      onChange={(e) => setSubmittedTo(e.target.value)}
                    />
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Assigned To</span>
                  <Select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="all">All Reviewers</option>
                    <option value="unassigned">Unassigned</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Department</span>
                  <Select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Branch / Location</span>
                  <Select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                  >
                    <option value="all">All Locations</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Related Exception</span>
                  <Select
                    value={relatedException}
                    onChange={(e) => setRelatedException(e.target.value)}
                  >
                    <option value="all">All Cases</option>
                    <option value="has_exception">Has Linked Exception</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Request Source</span>
                  <Select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="all">All Sources</option>
                    <option value="web">Web HR Admin</option>
                    <option value="ess">Employee Self-Service</option>
                    <option value="mobile">Mobile App</option>
                    <option value="biometric">Biometric Auto</option>
                  </Select>
                </Stack>

                <Inline justify="end" align="center" gap="xs">
                  <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                    Reset Filters
                  </Button>
                  <Button variant="primary" size="sm" onClick={loadData}>
                    Apply Filters
                  </Button>
                </Inline>
              </div>
            )}
          </Stack>
        </Card>

        {/* 4. Contextual Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center">
              <Inline gap="md" align="center">
                <Checkbox
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                />
                <strong>{selectedIds.size} selected</strong>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set(items.map((i) => i.id)))}
                >
                  Select all {totalCount}
                </Button>
              </Inline>

              <Inline gap="xs" align="center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBulkModalAction('assign');
                    setBulkReason('');
                  }}
                >
                  <BezentIcon name="person" size={14} /> Assign / Reassign
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBulkModalAction('start_review');
                    setBulkReason('');
                  }}
                >
                  <BezentIcon name="play_arrow" size={14} /> Start Review
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBulkModalAction('request_info');
                    setBulkReason('');
                  }}
                >
                  <BezentIcon name="chat" size={14} /> Request Info
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setBulkModalAction('bulk_approve');
                    setBulkReason('');
                  }}
                >
                  <BezentIcon name="check" size={14} /> Approve
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setBulkModalAction('bulk_reject');
                    setBulkReason('');
                  }}
                >
                  <BezentIcon name="close" size={14} /> Reject
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setExportScope('selected');
                    setShowExportModal(true);
                  }}
                >
                  <BezentIcon name="download" size={14} /> Export Selected
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </Inline>
            </Inline>
          </Card>
        )}

        {/* 5. Ten-Column Data Table with Explicit Minimum Widths and Horizontal Scroll */}
        {loading ? (
          <LoadingState label="Loading regularization workspace..." />
        ) : error ? (
          <Alert variant="danger" title="Error Loading Requests">
            {error}
            <Button variant="secondary" onClick={loadData}>
              Retry
            </Button>
          </Alert>
        ) : items.length === 0 ? (
          <EmptyState
            title="No Regularization Requests Found"
            description="There are currently no attendance correction requests matching the specified filters."
          />
        ) : (
          <Table compact hoverable className="bezent-table--workspace">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="bezent-table-col--select">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--employee">Employee</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--workday">Workday</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--type">Request Type</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--change">Requested Change</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--submitted">Submitted At</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--assigned">Assigned To</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--approval">Approval Status</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--application">Application Status</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--exception">Related Exception</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--actions bezent-table-col--sticky-right">Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="bezent-table-col--select">
                    <Checkbox
                      checked={selectedIds.has(req.id)}
                      onChange={() => toggleSelectOne(req.id)}
                    />
                  </TableCell>

                  {/* 1. Employee */}
                  <TableCell className="bezent-table-col--employee">
                    <div className="bezent-table-cell--avatar-meta">
                      <Avatar
                        initials={req.employeeName ? req.employeeName.slice(0, 2).toUpperCase() : 'EM'}
                        alt={req.employeeName}
                        size="sm"
                      />
                      <div className="bezent-table-meta-group">
                        <span className="bezent-table-meta-title" title={req.employeeName}>
                          {req.employeeName}
                        </span>
                        <span className="bezent-table-meta-subtitle">{req.employeeCode}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 2. Workday */}
                  <TableCell className="bezent-table-col--workday">
                    <div className="bezent-table-meta-group">
                      <span className="bezent-table-meta-title">{formatDate(req.workday)}</span>
                      <span className="bezent-table-meta-subtitle">{formatDayOfWeek(req.workday)}</span>
                    </div>
                  </TableCell>

                  {/* 3. Request Type */}
                  <TableCell className="bezent-table-col--type">
                    <span className="bezent-table-cell--nowrap" title={REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType}>
                      {REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType}
                    </span>
                  </TableCell>

                  {/* 4. Requested Change */}
                  <TableCell className="bezent-table-col--change">
                    <span className="bezent-table-cell--nowrap" title={req.requestedChange}>
                      {req.requestedChange}
                    </span>
                  </TableCell>

                  {/* 5. Submitted At */}
                  <TableCell className="bezent-table-col--submitted">
                    <div className="bezent-table-meta-group">
                      <span className="bezent-table-meta-title">{formatDate(req.submittedAt)}</span>
                      <span className="bezent-table-meta-subtitle">{formatTime(req.submittedAt)}</span>
                    </div>
                  </TableCell>

                  {/* 6. Assigned To */}
                  <TableCell className="bezent-table-col--assigned">
                    {req.assignedToName ? (
                      <div className="bezent-table-cell--avatar-meta">
                        <Avatar
                          initials={req.assignedToName.slice(0, 2).toUpperCase()}
                          alt={req.assignedToName}
                          size="sm"
                        />
                        <span className="bezent-table-cell--nowrap">{req.assignedToName}</span>
                      </div>
                    ) : (
                      <span className="bezent-table-meta-subtitle">Unassigned</span>
                    )}
                  </TableCell>

                  {/* 7. Approval Status */}
                  <TableCell className="bezent-table-col--approval">{renderApprovalBadge(req.approvalStatus)}</TableCell>

                  {/* 8. Application Status */}
                  <TableCell className="bezent-table-col--application">{renderApplicationBadge(req.applicationStatus)}</TableCell>

                  {/* 9. Related Exception */}
                  <TableCell className="bezent-table-col--exception">
                    {formatExceptionDisplay(req.relatedExceptionId)}
                  </TableCell>

                  {/* 10. Actions (Sticky Right) */}
                  <TableCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                    <IconButton
                      label="View details and review"
                      onClick={() => handleOpenDrawer(req.id)}
                    >
                      <BezentIcon name="more" size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* 6. Pagination Bar */}
        <Inline justify="between" align="center">
          <span className="bezent-card__desc">
            Showing {items.length > 0 ? (page - 1) * pageSize + 1 : 0} –{' '}
            {Math.min(page * pageSize, totalCount)} of {totalCount} requests
          </span>

          <Inline gap="sm" align="center">
            <Inline gap="xs" align="center">
              <span className="bezent-card__desc">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </Inline>

            <Inline gap="xs" align="center">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <BezentIcon name="chevron_left" size={16} />
              </Button>
              <span className="bezent-table-meta-title">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <BezentIcon name="chevron_right" size={16} />
              </Button>
            </Inline>
          </Inline>
        </Inline>
      </Stack>

      {/* 7. Four-Tab Review Drawer (Regularization Details) */}
      {drawerId && (
        <Modal
          title={`Regularization Details: ${drawerDetail?.requestNumber || drawerId}`}
          isOpen={true}
          onClose={handleCloseDrawer}
        >
          {drawerLoading || !drawerDetail ? (
            <LoadingState label="Loading request intelligence..." />
          ) : (
            <Stack gap="md">
              {/* Header Profile Strip */}
              <Card padding="sm">
                <Inline justify="between" align="center">
                  <Inline gap="sm" align="center">
                    <Avatar
                      initials={drawerDetail.employeeName ? drawerDetail.employeeName.slice(0, 2).toUpperCase() : '?'}
                      alt={drawerDetail.employeeName}
                      size="md"
                    />
                    <Stack gap="none">
                      <strong>{drawerDetail.employeeName}</strong>
                      <span className="bezent-card__desc">
                        {drawerDetail.employeeCode} | {drawerDetail.departmentName || 'Engineering'}
                      </span>
                    </Stack>
                  </Inline>

                  <Inline gap="xs" align="center">
                    {renderApprovalBadge(drawerDetail.approvalStatus)}
                    {renderApplicationBadge(drawerDetail.applicationStatus)}
                  </Inline>
                </Inline>
              </Card>

              {/* Four Tabs */}
              <Tabs
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'evidence', label: 'Evidence' },
                  { id: 'decision', label: 'Decision' },
                  { id: 'history', label: 'History' },
                ]}
                activeId={drawerTab}
                onChange={(tabId) => setDrawerTab(tabId as typeof drawerTab)}
              />

              {/* Tab 1: Overview */}
              {drawerTab === 'overview' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Request Information</span>
                      <Grid columns={2} gap="sm">
                        <Stack gap="none">
                          <span className="bezent-card__desc">Request ID</span>
                          <strong>{drawerDetail.requestNumber}</strong>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Employee</span>
                          <span>
                            {drawerDetail.employeeName} ({drawerDetail.employeeCode})
                          </span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Workday</span>
                          <span>{formatDate(drawerDetail.workday)}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Request Type</span>
                          <span>{REQUEST_TYPE_LABELS[drawerDetail.requestType]}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Recorded IN</span>
                          <span>{drawerDetail.recordedCheckIn || '—'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Recorded OUT</span>
                          <span>{drawerDetail.recordedCheckOut || '—'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Proposed Correction</span>
                          <strong>{drawerDetail.requestedChange}</strong>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Submitted At</span>
                          <span>{formatDateTime(drawerDetail.submittedAt)}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Assigned To</span>
                          <span>{drawerDetail.assignedToName || 'Unassigned'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Related Exception</span>
                          <span>{drawerDetail.relatedExceptionId || '—'}</span>
                        </Stack>
                      </Grid>
                    </Stack>
                  </Card>

                  {/* Employee Reason */}
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Employee Reason</span>
                      <p className="bezent-card__desc">{drawerDetail.reason}</p>
                    </Stack>
                  </Card>

                  {/* Attachments */}
                  {drawerDetail.evidenceAttachments.length > 0 && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <span className="bezent-table-meta-title">
                          Attachments ({drawerDetail.evidenceAttachments.length})
                        </span>
                        {drawerDetail.evidenceAttachments.map((att, idx) => (
                          <Inline key={idx} justify="between" align="center">
                            <Inline gap="xs" align="center">
                              <BezentIcon name="attachment" size={16} />
                              <span>{att.name}</span>
                              <span className="bezent-card__desc">({att.size})</span>
                            </Inline>
                            <BezentIcon name="download" size={16} />
                          </Inline>
                        ))}
                      </Stack>
                    </Card>
                  )}

                  {/* Quick Actions */}
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Quick Actions</span>
                      <Inline gap="sm">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={drawerActionLoading}
                          onClick={() => handleQuickAssign('usr_demo_hr_01')}
                        >
                          Assign / Reassign
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={drawerActionLoading}
                          onClick={handleQuickStartReview}
                        >
                          Start Review
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={drawerActionLoading}
                          onClick={() => setDrawerTab('decision')}
                        >
                          Request More Info
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={drawerActionLoading}
                          onClick={() => setDrawerTab('decision')}
                        >
                          Review & Decide
                        </Button>
                      </Inline>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Tab 2: Evidence */}
              {drawerTab === 'evidence' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Original vs Proposed Timings</span>
                      <Grid columns={2} gap="sm">
                        <Card padding="sm">
                          <Stack gap="none">
                            <span className="bezent-card__desc">Recorded Attendance</span>
                            <strong>
                              {drawerDetail.recordedCheckIn || '—'} – {drawerDetail.recordedCheckOut || '—'}
                            </strong>
                            <span>Status: {drawerDetail.recordedStatus || 'Absent'}</span>
                          </Stack>
                        </Card>
                        <Card padding="sm">
                          <Stack gap="none">
                            <span className="bezent-card__desc">Requested Correction</span>
                            <strong>
                              {drawerDetail.proposedCheckIn || '—'} – {drawerDetail.proposedCheckOut || '—'}
                            </strong>
                            <span>Claim: {drawerDetail.requestedChange}</span>
                          </Stack>
                        </Card>
                      </Grid>
                    </Stack>
                  </Card>

                  {/* Punch Timeline */}
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Biometric Punch Timeline</span>
                      {drawerDetail.evidenceContext.punchTimeline.length === 0 ? (
                        <span className="bezent-card__desc">
                          No raw biometric or web punch events recorded on this workday.
                        </span>
                      ) : (
                        drawerDetail.evidenceContext.punchTimeline.map((p) => (
                          <Inline key={p.id} justify="between" align="center">
                            <span>{new Date(p.punchTime).toLocaleTimeString()}</span>
                            <Badge variant="neutral">{p.punchType.toUpperCase()}</Badge>
                            <span className="bezent-card__desc">{p.source}</span>
                            <span>{p.workLocation}</span>
                          </Inline>
                        ))
                      )}
                    </Stack>
                  </Card>

                  {/* Shift & Policy Rules */}
                  <Card padding="sm">
                    <Grid columns={2} gap="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Assigned Shift</span>
                        <strong>{drawerDetail.evidenceContext.shiftSchedule?.name}</strong>
                        <span>
                          {drawerDetail.evidenceContext.shiftSchedule?.startTime} –{' '}
                          {drawerDetail.evidenceContext.shiftSchedule?.endTime}
                        </span>
                      </Stack>
                      <Stack gap="none">
                        <span className="bezent-card__desc">Payroll Lock State</span>
                        <strong>
                          {drawerDetail.evidenceContext.payrollLockState.isLocked
                            ? 'Locked for Payroll'
                            : 'Open (Not Locked)'}
                        </strong>
                      </Stack>
                    </Grid>
                  </Card>
                </Stack>
              )}

              {/* Tab 3: Decision */}
              {drawerTab === 'decision' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="sm">
                      <span className="bezent-table-meta-title">Reviewer Decision</span>

                      <Inline gap="md">
                        <label>
                          <input
                            type="radio"
                            name="decision"
                            value="approved"
                            checked={decisionType === 'approved'}
                            onChange={() => setDecisionType('approved')}
                          />{' '}
                          <strong>Approve Request</strong>
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="decision"
                            value="rejected"
                            checked={decisionType === 'rejected'}
                            onChange={() => setDecisionType('rejected')}
                          />{' '}
                          <strong>Reject Request</strong>
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="decision"
                            value="clarify"
                            checked={decisionType === 'clarify'}
                            onChange={() => setDecisionType('clarify')}
                          />{' '}
                          <strong>Request More Info</strong>
                        </label>
                      </Inline>

                      <Stack gap="xs">
                        <span className="bezent-card__desc">
                          {decisionType === 'rejected'
                            ? 'Rejection Reason (Mandatory):'
                            : decisionType === 'clarify'
                              ? 'Questions / Clarification Needed from Employee (Mandatory):'
                              : 'Approval Notes / Justification (Optional):'}
                        </span>
                        <Input
                          placeholder="Enter decision rationale or reviewer instructions..."
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                        />
                      </Stack>

                      <Inline justify="end">
                        <Button
                          variant={decisionType === 'rejected' ? 'danger' : 'primary'}
                          disabled={drawerActionLoading}
                          onClick={handleDrawerDecision}
                        >
                          {decisionType === 'approved'
                            ? 'Confirm & Apply Approval'
                            : decisionType === 'rejected'
                              ? 'Confirm Rejection'
                              : 'Send Clarification Request'}
                        </Button>
                      </Inline>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Tab 4: History */}
              {drawerTab === 'history' && (
                <Card padding="sm">
                  <Stack gap="sm">
                    <span className="bezent-table-meta-title">Audit History</span>
                    {drawerDetail.audits.map((a) => (
                      <Card key={a.id} padding="sm">
                        <Inline justify="between" align="center">
                          <Stack gap="none">
                            <strong>{a.action.toUpperCase()}</strong>
                            <span className="bezent-card__desc">{a.notes}</span>
                          </Stack>
                          <Stack gap="none" align="end">
                            <span>{formatDateTime(a.createdAt)}</span>
                            <span className="bezent-card__desc">By {a.actorName}</span>
                          </Stack>
                        </Inline>
                      </Card>
                    ))}
                  </Stack>
                </Card>
              )}
            </Stack>
          )}
        </Modal>
      )}

      {/* 8. Dynamic New Request Modal */}
      {showNewModal && (
        <Modal
          title="Submit Attendance Regularization Request"
          isOpen={true}
          onClose={() => setShowNewModal(false)}
        >
          <Stack gap="md">
            {formError && <Alert variant="danger">{formError}</Alert>}

            <Grid columns={2} gap="sm">
              <Stack gap="xs">
                <span className="bezent-card__desc">Employee ID</span>
                <Input
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  placeholder="e.g. EMP-024"
                />
              </Stack>

              <Stack gap="xs">
                <span className="bezent-card__desc">Workday Date</span>
                <Input
                  type="date"
                  value={formWorkday}
                  onChange={(e) => setFormWorkday(e.target.value)}
                />
              </Stack>
            </Grid>

            <Stack gap="xs">
              <span className="bezent-card__desc">Request Type</span>
              <Select
                value={formType}
                onChange={(e) => setFormType(e.target.value as RegularizationRequestType)}
              >
                <option value="missing_in">1. Missing IN Punch</option>
                <option value="missing_out">2. Missing OUT Punch</option>
                <option value="incorrect_time">3. Incorrect Punch Time</option>
                <option value="status_correction">4. Attendance Status Correction</option>
                <option value="worked_hours">5. Worked Hours Discrepancy</option>
                <option value="both_missing">6. Both IN & OUT Missing</option>
                <option value="wrong_direction">7. Wrong Punch Direction</option>
              </Select>
            </Stack>

            {/* Dynamic Fields */}
            {(formType === 'missing_in' || formType === 'both_missing' || formType === 'incorrect_time') && (
              <Stack gap="xs">
                <span className="bezent-card__desc">Proposed Check-IN Time</span>
                <Input
                  type="time"
                  value={formProposedIn}
                  onChange={(e) => setFormProposedIn(e.target.value)}
                />
              </Stack>
            )}

            {(formType === 'missing_out' || formType === 'both_missing' || formType === 'incorrect_time') && (
              <Stack gap="xs">
                <span className="bezent-card__desc">Proposed Check-OUT Time</span>
                <Input
                  type="time"
                  value={formProposedOut}
                  onChange={(e) => setFormProposedOut(e.target.value)}
                />
              </Stack>
            )}

            {formType === 'status_correction' && (
              <Stack gap="xs">
                <span className="bezent-card__desc">Proposed Status Classification</span>
                <Select
                  value={formProposedStatus}
                  onChange={(e) => setFormProposedStatus(e.target.value)}
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                </Select>
              </Stack>
            )}

            {formType === 'worked_hours' && (
              <Stack gap="xs">
                <span className="bezent-card__desc">Claimed Worked Hours</span>
                <Input
                  type="number"
                  step="0.5"
                  value={formClaimedHours}
                  onChange={(e) => setFormClaimedHours(e.target.value)}
                />
              </Stack>
            )}

            {formType === 'wrong_direction' && (
              <Stack gap="xs">
                <span className="bezent-card__desc">Corrected Punch Direction</span>
                <Select
                  value={formDirection}
                  onChange={(e) => setFormDirection(e.target.value)}
                >
                  <option value="IN">Treat as Check-IN</option>
                  <option value="OUT">Treat as Check-OUT</option>
                </Select>
              </Stack>
            )}

            {/* Eligibility Preview Banner */}
            {eligibilityResult && (
              <Alert
                variant={eligibilityResult.eligible ? 'success' : 'danger'}
                title={eligibilityResult.eligible ? 'Eligible for Submission' : 'Ineligible for Submission'}
              >
                {eligibilityResult.eligible
                  ? 'All 11 enterprise validation rules passed.'
                  : eligibilityResult.reasons.join(' ')}
              </Alert>
            )}

            <Stack gap="xs">
              <span className="bezent-card__desc">Reason for Correction (Mandatory)</span>
              <Input
                placeholder="Explain the missed punch or timing discrepancy..."
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
              />
            </Stack>

            <Stack gap="xs">
              <span className="bezent-card__desc">Linked Exception ID (Optional)</span>
              <Input
                placeholder="e.g. EXC-2026-00124"
                value={formExceptionId}
                onChange={(e) => setFormExceptionId(e.target.value)}
              />
            </Stack>

            <Inline justify="end" gap="sm">
              <Button
                variant="secondary"
                disabled={formSubmitting}
                onClick={() => handleCreateSubmit(true)}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                disabled={formSubmitting}
                onClick={() => handleCreateSubmit(false)}
              >
                Review & Submit
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 9. Bulk Action Execution Modal */}
      {bulkModalAction && (
        <Modal
          title={`Bulk Operation: ${bulkModalAction.replace('_', ' ').toUpperCase()}`}
          isOpen={true}
          onClose={() => setBulkModalAction(null)}
        >
          <Stack gap="md">
            <span>
              You have selected <strong>{selectedIds.size}</strong> requests to execute{' '}
              <strong>{bulkModalAction}</strong>.
            </span>

            {bulkModalAction === 'bulk_approve' && (
              <Alert variant="warning" title="Controlled Bulk Approval Safety Gate">
                Per enterprise policy, only low-risk, unlocked, non-conflicting requests will be
                approved. Complex cases (both punches missing, status overrides, locked workdays)
                will be skipped for individual review.
              </Alert>
            )}

            {bulkModalAction === 'assign' && (
              <Stack gap="xs">
                <span className="bezent-card__desc">Assign To Reviewer:</span>
                <Input
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  placeholder="Reviewer User ID"
                />
              </Stack>
            )}

            <Stack gap="xs">
              <span className="bezent-card__desc">Reason / Notes:</span>
              <Input
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Enter justification..."
              />
            </Stack>

            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setBulkModalAction(null)}>
                Cancel
              </Button>
              <Button
                variant={bulkModalAction === 'bulk_reject' ? 'danger' : 'primary'}
                disabled={bulkSubmitting}
                onClick={handleBulkExecute}
              >
                Confirm Bulk Action
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 10. Bulk Result Summary Report Modal */}
      {bulkResultReport && (
        <Modal
          title="Bulk Operation Report"
          isOpen={true}
          onClose={() => setBulkResultReport(null)}
        >
          <Stack gap="md">
            <Alert variant="info">
              Succeeded: {bulkResultReport.succeeded.length} | Skipped:{' '}
              {bulkResultReport.skipped.length} | Failed: {bulkResultReport.failed.length}
            </Alert>

            {bulkResultReport.skipped.length > 0 && (
              <Stack gap="xs">
                <strong>Skipped Requests (Safety Enforced):</strong>
                {bulkResultReport.skipped.map((s, idx) => (
                  <span key={idx} className="bezent-card__desc">
                    • Request {s.id}: {s.reason}
                  </span>
                ))}
              </Stack>
            )}

            <Inline justify="end">
              <Button variant="primary" onClick={() => setBulkResultReport(null)}>
                Done
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 11. Export Modal */}
      {showExportModal && (
        <Modal
          title="Export Regularization Register"
          isOpen={true}
          onClose={() => setShowExportModal(false)}
        >
          <Stack gap="md">
            <Stack gap="xs">
              <span className="bezent-card__desc">Export Scope</span>
              <Inline gap="md">
                <label>
                  <input
                    type="radio"
                    name="scope"
                    value="filtered"
                    checked={exportScope === 'filtered'}
                    onChange={() => setExportScope('filtered')}
                  />{' '}
                  All Filtered Requests ({totalCount})
                </label>
                <label>
                  <input
                    type="radio"
                    name="scope"
                    value="selected"
                    checked={exportScope === 'selected'}
                    onChange={() => setExportScope('selected')}
                    disabled={selectedIds.size === 0}
                  />{' '}
                  Selected Requests ({selectedIds.size})
                </label>
              </Inline>
            </Stack>

            <Stack gap="xs">
              <span className="bezent-card__desc">Export Format</span>
              <Inline gap="md">
                <label>
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                  />{' '}
                  CSV (Standard)
                </label>
                <label>
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={() => setExportFormat('excel')}
                  />{' '}
                  Excel Spreadsheet
                </label>
              </Inline>
            </Stack>

            <Alert variant="info">
              Export data includes RFC-4180 formula-injection defense and tenant isolation.
            </Alert>

            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={exporting}
                onClick={handleExportExecute}
              >
                Download Register
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
