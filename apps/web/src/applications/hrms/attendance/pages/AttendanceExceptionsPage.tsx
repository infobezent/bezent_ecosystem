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
  fetchExceptionCases,
  fetchExceptionDetails,
  assignExceptionCase,
  updateExceptionCaseStatus,
  overrideExceptionCaseSeverity,
  verifyAndResolveExceptionCase,
  bulkExceptionCaseAction,
  exportExceptionsCsv,
} from '../api/attendanceApi';
import type {
  AttendanceExceptionCaseItem,
  ExceptionCaseDetail,
  ExceptionSummaryCounters,
  ExceptionFilter,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
} from '../types/attendance.types';

// Preset date calculations
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getLast7DaysString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

function getStartOfMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDateTime(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeOnly(timeStr?: string | null): string {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  if (h === undefined || m === undefined) return timeStr;
  const numH = parseInt(h, 10);
  const ampm = numH >= 12 ? 'PM' : 'AM';
  const formattedH = numH % 12 || 12;
  return `${formattedH}:${m} ${ampm}`;
}

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  missing_in: 'Missing IN',
  missing_out: 'Missing OUT',
  late_arrival: 'Late Arrival',
  early_exit: 'Early Exit',
  insufficient_hours: 'Insufficient Hours',
  shift_mismatch: 'Shift Mismatch',
  duplicate_punch: 'Duplicate Punch',
  unmatched_employee: 'Unmatched Employee',
  invalid_punch: 'Invalid Punch',
  device_sync_failure: 'Device Sync Failure',
  leave_conflict: 'Leave Conflict',
  on_duty_conflict: 'On-Duty Conflict',
  regularization_conflict: 'Regularization Conflict',
};

export function AttendanceExceptionsPage() {
  // Date State
  const [datePreset, setDatePreset] = useState<
    'today' | 'yesterday' | 'last7' | 'this_month' | 'custom'
  >('this_month');
  const [dateFrom, setDateFrom] = useState(getStartOfMonthString());
  const [dateTo, setDateTo] = useState(getTodayString());
  const [dateInterpretation, setDateInterpretation] = useState<'workday' | 'detected_at'>(
    'workday',
  );

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [pendingActionReasonFilter, setPendingActionReasonFilter] = useState('all');

  // Progressive Disclosure
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy] = useState<ExceptionFilter['sortBy']>('severity');
  const [sortOrder] = useState<'asc' | 'desc'>('asc');

  // Data State
  const [items, setItems] = useState<AttendanceExceptionCaseItem[]>([]);
  const [counters, setCounters] = useState<ExceptionSummaryCounters>({
    activeCases: 0,
    critical: 0,
    highPriority: 0,
    unassigned: 0,
    pendingAction: 0,
    resolvedToday: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer State
  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<ExceptionCaseDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'evidence' | 'actions' | 'history'>(
    'overview',
  );

  // Action Modals State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetCaseIds, setAssignTargetCaseIds] = useState<string[]>([]);
  const [assigneeUser, setAssigneeUser] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [pendingActionModalOpen, setPendingActionModalOpen] = useState(false);
  const [pendingActionCaseIds, setPendingActionCaseIds] = useState<string[]>([]);
  const [pendingReason, setPendingReason] = useState('Awaiting employee regularization');
  const [pendingAwaitedFrom, setPendingAwaitedFrom] = useState('employee');
  const [pendingNotes, setPendingNotes] = useState('');
  const [isMarkingPending, setIsMarkingPending] = useState(false);

  const [severityModalOpen, setSeverityModalOpen] = useState(false);
  const [severityCaseId, setSeverityCaseId] = useState<string | null>(null);
  const [newSeverity, setNewSeverity] = useState<ExceptionSeverity>('high');
  const [severityReason, setSeverityReason] = useState('');
  const [isOverridingSeverity, setIsOverridingSeverity] = useState(false);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveCaseId, setResolveCaseId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveFeedback, setResolveFeedback] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'filtered' | 'selected'>('filtered');
  const [isExporting, setIsExporting] = useState(false);

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Date Preset Handling
  const handleDatePresetChange = (
    preset: 'today' | 'yesterday' | 'last7' | 'this_month' | 'custom',
  ) => {
    setDatePreset(preset);
    setPage(1);
    const today = getTodayString();
    switch (preset) {
      case 'today':
        setDateFrom(today);
        setDateTo(today);
        break;
      case 'yesterday': {
        const y = getYesterdayString();
        setDateFrom(y);
        setDateTo(y);
        break;
      }
      case 'last7':
        setDateFrom(getLast7DaysString());
        setDateTo(today);
        break;
      case 'this_month':
        setDateFrom(getStartOfMonthString());
        setDateTo(today);
        break;
      case 'custom':
        break;
    }
  };

  // Main Data Fetch
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: ExceptionFilter = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        dateInterpretation,
        status: statusFilter,
        severity: severityFilter === 'all' ? undefined : severityFilter,
        exceptionType: typeFilter === 'all' ? undefined : typeFilter,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        assignment: assignmentFilter === 'all' ? undefined : assignmentFilter,
        departmentId: departmentFilter || undefined,
        pendingActionReason:
          pendingActionReasonFilter === 'all' ? undefined : pendingActionReasonFilter,
        search: debouncedSearch || undefined,
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
      };

      const res = await fetchExceptionCases(filter);
      setItems(res.items);
      setCounters(res.counters);
      setTotalCount(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load exception cases');
    } finally {
      setLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    dateInterpretation,
    statusFilter,
    severityFilter,
    typeFilter,
    sourceFilter,
    assignmentFilter,
    departmentFilter,
    pendingActionReasonFilter,
    debouncedSearch,
    page,
    pageSize,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Drawer Detail Fetch
  const openDrawer = useCallback(async (caseId: string) => {
    setDrawerCaseId(caseId);
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      const detail = await fetchExceptionDetails(caseId);
      setDrawerDetail(detail);
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to load case details');
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const closeDrawer = () => {
    setDrawerCaseId(null);
    setDrawerDetail(null);
  };

  // Reset Filters
  const handleResetFilters = () => {
    handleDatePresetChange('this_month');
    setDateInterpretation('workday');
    setSearch('');
    setStatusFilter('active');
    setSeverityFilter('all');
    setTypeFilter('all');
    setSourceFilter('all');
    setAssignmentFilter('all');
    setDepartmentFilter('');
    setPendingActionReasonFilter('all');
    setPage(1);
    setSelectedIds(new Set());
  };

  // Counter Click Handling
  const handleCounterClick = (
    target: 'active' | 'critical' | 'high' | 'unassigned' | 'pending_action' | 'resolved',
  ) => {
    setPage(1);
    if (target === 'active') {
      setStatusFilter('active');
      setSeverityFilter('all');
      setAssignmentFilter('all');
    } else if (target === 'critical') {
      setStatusFilter('active');
      setSeverityFilter('critical');
    } else if (target === 'high') {
      setStatusFilter('active');
      setSeverityFilter('high');
    } else if (target === 'unassigned') {
      setStatusFilter('active');
      setAssignmentFilter('unassigned');
    } else if (target === 'pending_action') {
      setStatusFilter('pending_action');
    } else if (target === 'resolved') {
      setStatusFilter('resolved');
    }
  };

  // Selection Handling
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // Workflow Handlers
  const handleExecuteAssign = async () => {
    if (!assignTargetCaseIds.length) return;
    setIsAssigning(true);
    try {
      if (assignTargetCaseIds.length === 1 && assignTargetCaseIds[0]) {
        await assignExceptionCase(assignTargetCaseIds[0], {
          assignedTo: assigneeUser || undefined,
          notes: assignNotes || undefined,
        });
      } else {
        await bulkExceptionCaseAction({
          exceptionIds: assignTargetCaseIds,
          action: 'assign',
          assignedTo: assigneeUser || undefined,
          notes: assignNotes || undefined,
        });
      }
      setAssignModalOpen(false);
      setSelectedIds(new Set());
      await loadData();
      if (drawerCaseId && assignTargetCaseIds.includes(drawerCaseId)) {
        await openDrawer(drawerCaseId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleExecutePendingAction = async () => {
    if (!pendingActionCaseIds.length) return;
    setIsMarkingPending(true);
    try {
      if (pendingActionCaseIds.length === 1 && pendingActionCaseIds[0]) {
        await updateExceptionCaseStatus(pendingActionCaseIds[0], {
          status: 'pending_action',
          pendingActionReason: pendingReason,
          pendingActionAwaitedFrom: pendingAwaitedFrom,
          notes: pendingNotes || undefined,
        });
      } else {
        await bulkExceptionCaseAction({
          exceptionIds: pendingActionCaseIds,
          action: 'mark_pending_action',
          pendingActionReason: pendingReason,
          pendingActionAwaitedFrom: pendingAwaitedFrom,
          notes: pendingNotes || undefined,
        });
      }
      setPendingActionModalOpen(false);
      setSelectedIds(new Set());
      await loadData();
      if (drawerCaseId && pendingActionCaseIds.includes(drawerCaseId)) {
        await openDrawer(drawerCaseId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsMarkingPending(false);
    }
  };

  const handleStartReview = async (caseId: string) => {
    try {
      await updateExceptionCaseStatus(caseId, {
        status: 'in_review',
        notes: 'Review started by operator',
      });
      await loadData();
      if (drawerCaseId === caseId) await openDrawer(caseId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start review');
    }
  };

  const handleExecuteSeverityOverride = async () => {
    if (!severityCaseId || !severityReason.trim()) return;
    setIsOverridingSeverity(true);
    try {
      await overrideExceptionCaseSeverity(severityCaseId, {
        severity: newSeverity,
        reason: severityReason.trim(),
      });
      setSeverityModalOpen(false);
      await loadData();
      if (drawerCaseId === severityCaseId) await openDrawer(severityCaseId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Severity override failed');
    } finally {
      setIsOverridingSeverity(false);
    }
  };

  const handleExecuteResolve = async () => {
    if (!resolveCaseId) return;
    setIsResolving(true);
    setResolveFeedback(null);
    try {
      await verifyAndResolveExceptionCase(resolveCaseId, resolutionNotes);
      setResolveModalOpen(false);
      await loadData();
      if (drawerCaseId === resolveCaseId) await openDrawer(resolveCaseId);
    } catch (err: unknown) {
      setResolveFeedback(err instanceof Error ? err.message : 'Resolution failed');
    } finally {
      setIsResolving(false);
    }
  };

  const handleCloseCase = async (caseId: string) => {
    try {
      await updateExceptionCaseStatus(caseId, {
        status: 'closed',
        notes: 'Case closed by operator',
      });
      await loadData();
      if (drawerCaseId === caseId) await openDrawer(caseId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to close case');
    }
  };

  const handleReopenCase = async (caseId: string) => {
    try {
      await updateExceptionCaseStatus(caseId, {
        status: 'open',
        notes: 'Case reopened for re-investigation',
      });
      await loadData();
      if (drawerCaseId === caseId) await openDrawer(caseId);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reopen case');
    }
  };

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const selected = exportScope === 'selected' ? Array.from(selectedIds) : undefined;
      const blob = await exportExceptionsCsv(
        {
          dateFrom,
          dateTo,
          dateInterpretation,
          status: statusFilter,
          severity: severityFilter === 'all' ? undefined : severityFilter,
          exceptionType: typeFilter === 'all' ? undefined : typeFilter,
          source: sourceFilter === 'all' ? undefined : sourceFilter,
          assignedTo: assignmentFilter === 'all' ? undefined : assignmentFilter,
          departmentId: departmentFilter || undefined,
          search: debouncedSearch || undefined,
        },
        selected,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-exceptions-${getTodayString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export generation failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Severity & Status Badges
  const renderSeverityBadge = (sev: ExceptionSeverity) => {
    switch (sev) {
      case 'critical':
        return <Badge variant="danger">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="warning">HIGH</Badge>;
      case 'medium':
        return <Badge variant="info">MEDIUM</Badge>;
      case 'low':
        return <Badge variant="neutral">LOW</Badge>;
    }
  };

  const renderStatusBadge = (st: ExceptionStatus) => {
    switch (st) {
      case 'open':
        return <Badge variant="warning">OPEN</Badge>;
      case 'assigned':
        return <Badge variant="info">ASSIGNED</Badge>;
      case 'in_review':
        return <Badge variant="info">IN REVIEW</Badge>;
      case 'pending_action':
        return <Badge variant="warning">PENDING ACTION</Badge>;
      case 'resolved':
        return <Badge variant="success">RESOLVED</Badge>;
      case 'closed':
        return <Badge variant="neutral">CLOSED</Badge>;
    }
  };

  // Drawer Tabs
  const drawerTabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'evidence', label: 'Evidence & Context' },
      { id: 'actions', label: 'Workflow Actions' },
      { id: 'history', label: 'History & Audits' },
    ],
    [],
  );

  return (
    <Page>
      {/* ── Compact Header ── */}
      <PageHeader
        breadcrumbs={<span>Attendance / Exceptions</span>}
        title="Exceptions"
        actions={
          <Inline gap="sm" align="center">
            <Select
              value={datePreset}
              onChange={(e) =>
                handleDatePresetChange(
                  e.target.value as 'today' | 'yesterday' | 'last7' | 'this_month' | 'custom',
                )
              }
              aria-label="Date preset selector"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </Select>

            {datePreset === 'custom' && (
              <Inline gap="xs" align="center">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Start date"
                />
                <span className="bezent-table-meta-subtitle">—</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  aria-label="End date"
                />
              </Inline>
            )}

            <Button
              variant="secondary"
              onClick={() => handleDatePresetChange('today')}
              disabled={datePreset === 'today'}
            >
              Today
            </Button>

            <Button variant="secondary" onClick={() => setExportModalOpen(true)}>
              <BezentIcon name="file_download" size={16} /> Export
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* ── Six Summary Counters in 1 Horizontal Desktop Row ── */}
        <Grid columns={6} gap="sm">
          <div
            className={`bezent-stat-card ${statusFilter === 'active' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('active')}
            title="Total cases requiring review or action (Open, Assigned, In Review, Pending Action)"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">ACTIVE CASES</span>
            <span className="bezent-stat-card__val">{counters.activeCases}</span>
          </div>

          <div
            className={`bezent-stat-card ${severityFilter === 'critical' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('critical')}
            title="Active cases classified with critical business or payroll impact"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">CRITICAL</span>
            <span className="bezent-stat-card__val">{counters.critical}</span>
          </div>

          <div
            className={`bezent-stat-card ${severityFilter === 'high' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('high')}
            title="Active cases classified with high priority"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">HIGH PRIORITY</span>
            <span className="bezent-stat-card__val">{counters.highPriority}</span>
          </div>

          <div
            className={`bezent-stat-card ${assignmentFilter === 'unassigned' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('unassigned')}
            title="Active cases with no designated reviewer"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">UNASSIGNED</span>
            <span className="bezent-stat-card__val">{counters.unassigned}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'pending_action' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('pending_action')}
            title="Cases currently awaiting employee, manager, or technical action"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">PENDING ACTION</span>
            <span className="bezent-stat-card__val">{counters.pendingAction}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'resolved' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('resolved')}
            title="Cases successfully resolved today"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">RESOLVED TODAY</span>
            <span className="bezent-stat-card__val">{counters.resolvedToday}</span>
          </div>
        </Grid>

        {/* ── Primary Filter Bar ── */}
        <Card padding="sm">
          <Stack gap="sm">
            <Inline justify="between" align="center" wrap gap="sm">
              <Inline gap="sm" align="center" wrap>
                <SearchInput
                  placeholder="Search Employee, ID, or Case..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch('')}
                />

                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Workflow Status Filter"
                >
                  <option value="active">Active Cases</option>
                  <option value="open">Open</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_review">In Review</option>
                  <option value="pending_action">Pending Action</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="all">All Statuses</option>
                </Select>

                <Select
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Severity Filter"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>

                <Select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Exception Type Filter"
                >
                  <option value="all">All Exception Types</option>
                  <option value="missing_in">Missing IN</option>
                  <option value="missing_out">Missing OUT</option>
                  <option value="late_arrival">Late Arrival</option>
                  <option value="early_exit">Early Exit</option>
                  <option value="insufficient_hours">Insufficient Hours</option>
                  <option value="shift_mismatch">Shift Mismatch</option>
                  <option value="duplicate_punch">Duplicate Punch</option>
                  <option value="unmatched_employee">Unmatched Employee</option>
                  <option value="invalid_punch">Invalid Punch</option>
                  <option value="device_sync_failure">Device Sync Failure</option>
                  <option value="leave_conflict">Leave Conflict</option>
                  <option value="on_duty_conflict">On-Duty Conflict</option>
                  <option value="regularization_conflict">Regularization Conflict</option>
                </Select>
              </Inline>

              <Inline gap="sm" align="center">
                <Button
                  variant="secondary"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <BezentIcon
                    name={showAdvancedFilters ? 'expand_less' : 'filter_list'}
                    size={16}
                  />
                  {showAdvancedFilters ? 'Less Filters' : 'More Filters'}
                </Button>

                <Button variant="secondary" onClick={handleResetFilters}>
                  Reset
                </Button>
              </Inline>
            </Inline>

            {/* ── Progressive Disclosure: Advanced Filters ── */}
            {showAdvancedFilters && (
              <Card padding="sm">
                <Grid columns={4} gap="sm">
                  <Select
                    label="Date Interpretation"
                    value={dateInterpretation}
                    onChange={(e) => {
                      setDateInterpretation(e.target.value as 'workday' | 'detected_at');
                      setPage(1);
                    }}
                  >
                    <option value="workday">Attendance Workday</option>
                    <option value="detected_at">Detection Timestamp</option>
                  </Select>

                  <Select
                    label="Source"
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Sources</option>
                    <option value="engine">Attendance Engine</option>
                    <option value="biometric">Biometric Device</option>
                    <option value="web">Web Punch</option>
                    <option value="mobile">Mobile Punch</option>
                    <option value="kiosk">Kiosk</option>
                    <option value="import">Import</option>
                    <option value="leave_system">Leave System</option>
                    <option value="od_system">On-Duty System</option>
                    <option value="regularization_system">Regularization</option>
                  </Select>

                  <Select
                    label="Assignment Queue"
                    value={assignmentFilter}
                    onChange={(e) => {
                      setAssignmentFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Assignments</option>
                    <option value="unassigned">Unassigned Only</option>
                    <option value="assigned_to_me">Assigned To Me</option>
                  </Select>

                  <Select
                    label="Pending Reason"
                    value={pendingActionReasonFilter}
                    onChange={(e) => {
                      setPendingActionReasonFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Reasons</option>
                    <option value="Awaiting employee regularization">
                      Awaiting Regularization
                    </option>
                    <option value="Awaiting manager approval">Awaiting Approval</option>
                    <option value="Awaiting hardware sync">Awaiting Device Sync</option>
                    <option value="Awaiting employee clarification">Awaiting Clarification</option>
                  </Select>
                </Grid>
              </Card>
            )}
          </Stack>
        </Card>

        {/* ── Contextual Bulk Operations Bar ── */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center" wrap gap="sm">
              <Inline gap="sm" align="center">
                <Badge variant="info">{selectedIds.size} selected</Badge>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAssignTargetCaseIds(Array.from(selectedIds));
                    setAssignModalOpen(true);
                  }}
                >
                  <BezentIcon name="person_add" size={16} /> Assign / Reassign
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPendingActionCaseIds(Array.from(selectedIds));
                    setPendingActionModalOpen(true);
                  }}
                >
                  <BezentIcon name="pending_actions" size={16} /> Mark Pending Action
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setExportScope('selected');
                    setExportModalOpen(true);
                  }}
                >
                  <BezentIcon name="file_download" size={16} /> Export Selected
                </Button>
              </Inline>

              <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </Inline>
          </Card>
        )}

        {/* ── Exceptions Table: Exactly 10 Data Columns ── */}
        <Card padding="none">
          {loading ? (
            <LoadingState label="Loading exception cases..." />
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : items.length === 0 ? (
            <EmptyState
              title="No Exception Cases Found"
              description="There are currently no attendance anomalies or exceptions matching your filter criteria."
              primaryAction={{
                label: 'Clear Filters',
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  {/* Row Selection Checkbox */}
                  <TableHeaderCell>
                    <Checkbox
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={handleSelectAllVisible}
                      aria-label="Select all cases on visible page"
                    />
                  </TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Workday</TableHeaderCell>
                  <TableHeaderCell>Exception</TableHeaderCell>
                  <TableHeaderCell>Severity</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Assigned To</TableHeaderCell>
                  <TableHeaderCell>Detected At</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Related Record</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <TableRow key={item.id} onClick={() => openDrawer(item.id)}>
                      {/* Checkbox */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          aria-label={`Select exception case ${item.id}`}
                        />
                      </TableCell>

                      {/* 1. Employee */}
                      <TableCell>
                        <div className="bezent-table-cell--avatar-meta">
                          <Avatar
                            initials={
                              item.employeeName ? item.employeeName.slice(0, 2).toUpperCase() : '?'
                            }
                            alt={item.employeeName || 'Unmatched'}
                            size="sm"
                          />
                          <div className="bezent-table-meta-group">
                            <span className="bezent-table-meta-title">{item.employeeName}</span>
                            <span className="bezent-table-meta-subtitle">{item.employeeCode}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Workday */}
                      <TableCell>
                        <span className="bezent-table-meta-title">{item.workday || '—'}</span>
                      </TableCell>

                      {/* 3. Exception */}
                      <TableCell>
                        <Stack gap="none">
                          <span className="bezent-table-meta-title">
                            {EXCEPTION_TYPE_LABELS[item.exceptionType] || item.exceptionType}
                          </span>
                          <span
                            className="bezent-table-meta-subtitle"
                            title={item.description || item.title}
                          >
                            {item.title}
                          </span>
                        </Stack>
                      </TableCell>

                      {/* 4. Severity */}
                      <TableCell>{renderSeverityBadge(item.severity)}</TableCell>

                      {/* 5. Source */}
                      <TableCell>
                        <Badge variant="neutral">{item.source.toUpperCase()}</Badge>
                      </TableCell>

                      {/* 6. Assigned To */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {item.assignedToName || item.assignedTo || 'Unassigned'}
                        </span>
                      </TableCell>

                      {/* 7. Detected At */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {formatDateTime(item.detectedAt)}
                        </span>
                      </TableCell>

                      {/* 8. Status */}
                      <TableCell>{renderStatusBadge(item.status)}</TableCell>

                      {/* 9. Related Record */}
                      <TableCell>
                        {item.relatedRecordSummary ? (
                          <Badge variant="info">{item.relatedRecordSummary.label}</Badge>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 10. Actions (Contextual Menu) */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          label="Case actions"
                          aria-label="Case actions"
                          onClick={() => openDrawer(item.id)}
                          variant="ghost"
                        >
                          <BezentIcon name="more_horiz" size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <Card padding="sm">
              <Inline justify="between" align="center">
                <span className="bezent-card__desc">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
                  {totalCount} cases
                </span>
                <Inline gap="xs" align="center">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page * pageSize >= totalCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </Inline>
              </Inline>
            </Card>
          )}
        </Card>

        {/* ── Case Details Drawer (Right-side Modal/Drawer) ── */}
        <Modal
          isOpen={!!drawerCaseId}
          onClose={closeDrawer}
          variant="drawer"
          size="drawer"
          title={
            <Stack gap="xs">
              <Inline gap="sm" align="center">
                <span className="bezent-table-meta-title">
                  {drawerDetail?.title || 'Exception Case Details'}
                </span>
                {drawerDetail && renderSeverityBadge(drawerDetail.severity)}
                {drawerDetail && renderStatusBadge(drawerDetail.status)}
              </Inline>
              <span className="bezent-table-meta-subtitle">
                Case ID: {drawerDetail?.id} • Workday: {drawerDetail?.workday || 'N/A'}
              </span>
            </Stack>
          }
          headerBottom={
            <Tabs
              items={drawerTabs}
              activeId={drawerTab}
              onChange={(id) => setDrawerTab(id as 'overview' | 'evidence' | 'actions' | 'history')}
            />
          }
        >
          {drawerLoading ? (
            <LoadingState label="Loading case details..." />
          ) : drawerError ? (
            <Alert variant="danger">{drawerError}</Alert>
          ) : !drawerDetail ? (
            <EmptyState title="Case Not Found" description="Could not load exception details." />
          ) : (
            <Stack gap="md">
              {/* Tab 1: Overview */}
              {drawerTab === 'overview' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-stat-card__label">CASE INFORMATION</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Employee:</span>
                        <strong>
                          {drawerDetail.employeeName} ({drawerDetail.employeeCode})
                        </strong>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Workday:</span>
                        <span>{drawerDetail.workday || 'Unresolved Workday'}</span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Exception Type:</span>
                        <span>
                          {EXCEPTION_TYPE_LABELS[drawerDetail.exceptionType] ||
                            drawerDetail.exceptionType}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Source:</span>
                        <Badge variant="neutral">{drawerDetail.source.toUpperCase()}</Badge>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Detected At:</span>
                        <span>{formatDateTime(drawerDetail.detectedAt)}</span>
                      </Inline>
                    </Stack>
                  </Card>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-stat-card__label">ASSIGNMENT & WORKFLOW</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Assigned Reviewer:</span>
                        <strong>
                          {drawerDetail.assignedToName || drawerDetail.assignedTo || 'Unassigned'}
                        </strong>
                      </Inline>
                      {drawerDetail.pendingActionReason && (
                        <Inline justify="between">
                          <span className="bezent-card__desc">Pending Reason:</span>
                          <Badge variant="warning">
                            {drawerDetail.pendingActionReason} (Awaited from{' '}
                            {drawerDetail.pendingActionAwaitedFrom})
                          </Badge>
                        </Inline>
                      )}
                      {drawerDetail.resolutionNotes && (
                        <Inline justify="between">
                          <span className="bezent-card__desc">Resolution Notes:</span>
                          <Badge variant="success">{drawerDetail.resolutionNotes}</Badge>
                        </Inline>
                      )}
                    </Stack>
                  </Card>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-stat-card__label">DESCRIPTION & ROOT CAUSE</span>
                      <p className="bezent-card__desc">
                        {drawerDetail.description || 'No detailed notes logged.'}
                      </p>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Tab 2: Evidence */}
              {drawerTab === 'evidence' && (
                <Stack gap="sm">
                  <span className="bezent-stat-card__label">SOURCE RECORD CONTEXT</span>
                  {drawerDetail.evidence.dailyLog ? (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <strong>Daily Attendance Record</strong>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Status:</span>
                          <Badge variant="neutral">
                            {drawerDetail.evidence.dailyLog.status.toUpperCase()}
                          </Badge>
                        </Inline>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Check-In:</span>
                          <span>{formatTimeOnly(drawerDetail.evidence.dailyLog.checkInTime)}</span>
                        </Inline>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Check-Out:</span>
                          <span>{formatTimeOnly(drawerDetail.evidence.dailyLog.checkOutTime)}</span>
                        </Inline>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Worked Minutes:</span>
                          <span>{drawerDetail.evidence.dailyLog.workedMinutes} mins</span>
                        </Inline>
                      </Stack>
                    </Card>
                  ) : (
                    <Alert variant="info">
                      No linked daily attendance record for this exception source.
                    </Alert>
                  )}

                  <span className="bezent-stat-card__label">WORKDAY PUNCH TIMELINE</span>
                  {drawerDetail.evidence.punches && drawerDetail.evidence.punches.length > 0 ? (
                    drawerDetail.evidence.punches.map((p) => (
                      <Card key={p.id} padding="sm">
                        <Inline justify="between" align="center">
                          <Inline gap="xs" align="center">
                            <Badge variant={p.punchType === 'in' ? 'success' : 'neutral'}>
                              {p.punchType.toUpperCase()}
                            </Badge>
                            <span className="bezent-table-meta-title">
                              {formatDateTime(p.punchTime)}
                            </span>
                          </Inline>
                          <Badge variant="neutral">{p.source}</Badge>
                        </Inline>
                      </Card>
                    ))
                  ) : (
                    <Alert variant="warning">
                      No hardware or web punch events recorded on this date.
                    </Alert>
                  )}
                </Stack>
              )}

              {/* Tab 3: Actions */}
              {drawerTab === 'actions' && (
                <Stack gap="sm">
                  <span className="bezent-stat-card__label">AVAILABLE WORKFLOW ACTIONS</span>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Assign / Reassign Reviewer</strong>
                      <p className="bezent-card__desc">
                        Transfer case ownership to an authorized attendance reviewer.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setAssignTargetCaseIds([drawerDetail.id]);
                          setAssignModalOpen(true);
                        }}
                      >
                        <BezentIcon name="person_add" size={16} /> Assign Case
                      </Button>
                    </Stack>
                  </Card>

                  {drawerDetail.status !== 'in_review' &&
                    drawerDetail.status !== 'resolved' &&
                    drawerDetail.status !== 'closed' && (
                      <Card padding="sm">
                        <Stack gap="xs">
                          <strong>Start Active Investigation</strong>
                          <p className="bezent-card__desc">
                            Move case to In Review status to indicate investigation is underway.
                          </p>
                          <Button
                            variant="secondary"
                            onClick={() => handleStartReview(drawerDetail.id)}
                          >
                            <BezentIcon name="play_arrow" size={16} /> Start Review
                          </Button>
                        </Stack>
                      </Card>
                    )}

                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Mark Pending Action</strong>
                      <p className="bezent-card__desc">
                        Pause investigation awaiting employee regularization, manager sign-off, or
                        device sync.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setPendingActionCaseIds([drawerDetail.id]);
                          setPendingActionModalOpen(true);
                        }}
                      >
                        <BezentIcon name="pending_actions" size={16} /> Mark Pending Action
                      </Button>
                    </Stack>
                  </Card>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Override Severity Level</strong>
                      <p className="bezent-card__desc">
                        Escalate or de-escalate case priority with mandatory audit justification.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSeverityCaseId(drawerDetail.id);
                          setNewSeverity(drawerDetail.severity);
                          setSeverityModalOpen(true);
                        }}
                      >
                        <BezentIcon name="tune" size={16} /> Override Severity
                      </Button>
                    </Stack>
                  </Card>

                  {drawerDetail.status !== 'resolved' && drawerDetail.status !== 'closed' && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <strong>Verify Source & Resolve</strong>
                        <p className="bezent-card__desc">
                          Verifies underlying source records (e.g. punches added, regularization
                          approved) before marking resolved.
                        </p>
                        <Button
                          variant="primary"
                          onClick={() => {
                            setResolveCaseId(drawerDetail.id);
                            setResolutionNotes('');
                            setResolveFeedback(null);
                            setResolveModalOpen(true);
                          }}
                        >
                          <BezentIcon name="check_circle" size={16} /> Verify & Resolve Case
                        </Button>
                      </Stack>
                    </Card>
                  )}

                  {drawerDetail.status === 'resolved' && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <strong>Close Case</strong>
                        <p className="bezent-card__desc">
                          Finalize and archive this resolved exception case.
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => handleCloseCase(drawerDetail.id)}
                        >
                          <BezentIcon name="archive" size={16} /> Close Case
                        </Button>
                      </Stack>
                    </Card>
                  )}

                  {(drawerDetail.status === 'resolved' || drawerDetail.status === 'closed') && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <strong>Reopen Case</strong>
                        <p className="bezent-card__desc">
                          Reopen case for re-investigation if new discrepancy is found.
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => handleReopenCase(drawerDetail.id)}
                        >
                          <BezentIcon name="refresh" size={16} /> Reopen Case
                        </Button>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              )}

              {/* Tab 4: History & Audits */}
              {drawerTab === 'history' && (
                <Stack gap="sm">
                  <span className="bezent-stat-card__label">CASE LIFECYCLE AUDIT TRAIL</span>
                  {drawerDetail.audits && drawerDetail.audits.length > 0 ? (
                    drawerDetail.audits.map((a) => (
                      <Card key={a.id} padding="sm">
                        <Stack gap="none">
                          <Inline justify="between" align="center">
                            <strong>{a.action.replace('_', ' ').toUpperCase()}</strong>
                            <span className="bezent-card__desc">{formatDateTime(a.createdAt)}</span>
                          </Inline>
                          <span className="bezent-card__desc">
                            Actor: {a.actorUserId || 'System'} • {a.notes || 'Action recorded'}
                          </span>
                        </Stack>
                      </Card>
                    ))
                  ) : (
                    <EmptyState
                      title="No Audit Records"
                      description="No lifecycle audits recorded yet."
                    />
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Modal>

        {/* ── Assign Case Modal ── */}
        <Modal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign / Reassign Reviewer"
        >
          <Stack gap="sm">
            <p className="bezent-card__desc">
              Assign {assignTargetCaseIds.length} case(s) to an authorized attendance reviewer.
            </p>
            <Input
              label="Reviewer User ID / Name"
              placeholder="e.g. HR Admin or Manager ID"
              value={assigneeUser}
              onChange={(e) => setAssigneeUser(e.target.value)}
            />
            <Input
              label="Assignment Notes (Optional)"
              placeholder="Provide instructions for the reviewer"
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteAssign} disabled={isAssigning}>
                {isAssigning ? 'Assigning...' : 'Assign Cases'}
              </Button>
            </Inline>
          </Stack>
        </Modal>

        {/* ── Mark Pending Action Modal ── */}
        <Modal
          isOpen={pendingActionModalOpen}
          onClose={() => setPendingActionModalOpen(false)}
          title="Mark Pending Action"
        >
          <Stack gap="sm">
            <p className="bezent-card__desc">
              Record what external action is awaited before this case can progress.
            </p>
            <Select
              label="Pending Action Reason"
              value={pendingReason}
              onChange={(e) => setPendingReason(e.target.value)}
            >
              <option value="Awaiting employee regularization">
                Awaiting Employee Regularization
              </option>
              <option value="Awaiting manager approval">Awaiting Manager Approval</option>
              <option value="Awaiting hardware sync">Awaiting Hardware Device Sync</option>
              <option value="Awaiting employee clarification">Awaiting Clarification</option>
            </Select>
            <Select
              label="Awaited From"
              value={pendingAwaitedFrom}
              onChange={(e) => setPendingAwaitedFrom(e.target.value)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Reporting Manager</option>
              <option value="hr">HR Operations</option>
              <option value="it">IT / Device Support</option>
            </Select>
            <Input
              label="Notes"
              placeholder="Additional explanation"
              value={pendingNotes}
              onChange={(e) => setPendingNotes(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setPendingActionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExecutePendingAction}
                disabled={isMarkingPending}
              >
                {isMarkingPending ? 'Updating...' : 'Mark Pending'}
              </Button>
            </Inline>
          </Stack>
        </Modal>

        {/* ── Override Severity Modal ── */}
        <Modal
          isOpen={severityModalOpen}
          onClose={() => setSeverityModalOpen(false)}
          title="Override Case Severity"
        >
          <Stack gap="sm">
            <p className="bezent-card__desc">
              Overrides the automated rule-based severity. Requires a mandatory reason for audit.
            </p>
            <Select
              label="New Severity Level"
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as ExceptionSeverity)}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Input
              label="Mandatory Reason"
              placeholder="e.g. VIP client executive on approved travel"
              value={severityReason}
              onChange={(e) => setSeverityReason(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setSeverityModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleExecuteSeverityOverride}
                disabled={isOverridingSeverity || !severityReason.trim()}
              >
                {isOverridingSeverity ? 'Saving...' : 'Apply Severity Override'}
              </Button>
            </Inline>
          </Stack>
        </Modal>

        {/* ── Verify & Resolve Modal ── */}
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title="Verify Source & Resolve Exception"
        >
          <Stack gap="sm">
            <p className="bezent-card__desc">
              The system will verify that the underlying condition (e.g. missing punch rectified,
              daily log regularized, or punch mapped) is resolved before transitioning this case.
            </p>
            {resolveFeedback && <Alert variant="danger">{resolveFeedback}</Alert>}
            <Input
              label="Resolution Notes"
              placeholder="e.g. Verified regularization approval #REG-1049"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setResolveModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteResolve} disabled={isResolving}>
                {isResolving ? 'Verifying...' : 'Verify & Mark Resolved'}
              </Button>
            </Inline>
          </Stack>
        </Modal>

        {/* ── Export Modal ── */}
        <Modal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          title="Export Attendance Exceptions"
        >
          <Stack gap="sm">
            <Select
              label="Export Universe"
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value as 'filtered' | 'selected')}
            >
              <option value="filtered">All Filtered Cases ({totalCount} cases)</option>
              {selectedIds.size > 0 && (
                <option value="selected">Selected Cases ({selectedIds.size} cases)</option>
              )}
            </Select>

            <Card padding="sm">
              <Stack gap="none">
                <span className="bezent-card__desc">
                  Active Range: {dateFrom} to {dateTo}
                </span>
                <span className="bezent-card__desc">Interpretation: {dateInterpretation}</span>
                <span className="bezent-card__desc">
                  Security: Formula injection defense active
                </span>
              </Stack>
            </Card>

            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setExportModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExecuteExport} disabled={isExporting}>
                {isExporting ? 'Generating...' : 'Download CSV'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      </Stack>
    </Page>
  );
}
