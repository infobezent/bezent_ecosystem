import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  fetchMonthlySummaryWorkspace,
  fetchMonthlySummaryById,
  fetchMonthlySummaryDays,
  fetchMonthlySummaryReadiness,
  fetchMonthlySummaryHistory,
  startMonthlySummaryReview,
  requestMonthlySummaryCorrection,
  markMonthlySummaryReviewed,
  reopenMonthlySummaryReview,
  recalculateMonthlySummary,
  previewMonthlySummaryBulkAction,
  executeMonthlySummaryBulkAction,
  exportMonthlySummaryCsv,
} from '../api/attendanceApi';
import type {
  MonthlySummaryRow,
  MonthlySummaryCounters,
  MonthlySummaryFilter,
  MonthlySummaryDailyRecord,
  MonthlySummaryReadinessReport,
  MonthlySummaryReviewHistoryItem,
  MonthlySummaryBulkPreviewResult,
  AttendancePayrollReadiness,
  AttendanceReviewState,
} from '../types/attendance.types';

function getCurrentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateTime(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MonthlyAttendanceSummaryPage() {
  const navigate = useNavigate();

  // Navigation & Primary Filter State
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [search, setSearch] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [payrollReadiness, setPayrollReadiness] = useState<string>('all');
  const [activeCounter, setActiveCounter] = useState<string | null>(null);

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [reviewStateFilter, setReviewStateFilter] = useState<string>('all');
  const [lockStatusFilter, setLockStatusFilter] = useState<string>('all');
  const [filterExceptions, setFilterExceptions] = useState<boolean>(false);
  const [filterPendingCorrections, setFilterPendingCorrections] = useState<boolean>(false);
  const [filterProcessingIssues, setFilterProcessingIssues] = useState<boolean>(false);

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MonthlySummaryRow[]>([]);
  const [counters, setCounters] = useState<MonthlySummaryCounters>({
    totalEmployees: 0,
    readyForPayroll: 0,
    needsReview: 0,
    processingIssues: 0,
    locked: 0,
    pendingCorrections: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drilldown Drawer State
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerSummary, setDrawerSummary] = useState<MonthlySummaryRow | null>(null);
  const [drawerDays, setDrawerDays] = useState<MonthlySummaryDailyRecord[]>([]);
  const [drawerReadiness, setDrawerReadiness] = useState<MonthlySummaryReadinessReport | null>(
    null,
  );
  const [drawerHistory, setDrawerHistory] = useState<MonthlySummaryReviewHistoryItem[]>([]);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'days' | 'readiness' | 'history'>(
    'overview',
  );

  // Review Dialog State
  const [reviewDialogTarget, setReviewDialogTarget] = useState<MonthlySummaryRow | null>(null);
  const [reviewDialogAction, setReviewDialogAction] = useState<
    'review' | 'start' | 'correction' | 'reopen' | null
  >(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // Bulk Operations State
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkAction, setBulkAction] = useState<
    'mark_reviewed' | 'start_review' | 'request_correction' | 'recalculate' | null
  >(null);
  const [bulkPreview, setBulkPreview] = useState<MonthlySummaryBulkPreviewResult | null>(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState<boolean>(false);
  const [bulkExecuting, setBulkExecuting] = useState<boolean>(false);
  const [bulkExecutionResult, setBulkExecutionResult] = useState<{
    succeeded: string[];
    skipped: Array<{ id: string; reason: string }>;
    failed: Array<{ id: string; error: string }>;
  } | null>(null);

  // Export State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [exportLevel, setExportLevel] = useState<'standard' | 'detailed' | 'audit'>('standard');
  const [exportScope, setExportScope] = useState<'selected' | 'all'>('all');
  const [exporting, setExporting] = useState<boolean>(false);

  // Load Workspace Data
  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: MonthlySummaryFilter = {
        month: selectedMonth,
        search: search.trim() || undefined,
        departmentId: departmentId === 'all' ? undefined : departmentId,
        payrollReadiness:
          payrollReadiness === 'all' ? undefined : (payrollReadiness as AttendancePayrollReadiness),
        reviewState:
          reviewStateFilter === 'all' ? undefined : (reviewStateFilter as AttendanceReviewState),
        isLocked:
          lockStatusFilter === 'locked'
            ? true
            : lockStatusFilter === 'unlocked'
              ? false
              : undefined,
        hasExceptions: filterExceptions || undefined,
        hasPendingCorrections: filterPendingCorrections || undefined,
        hasProcessingIssues: filterProcessingIssues || undefined,
        counterFilter: (activeCounter as MonthlySummaryFilter['counterFilter']) || undefined,
        page,
        pageSize,
      };

      const result = await fetchMonthlySummaryWorkspace(filter);
      setRows(result.items);
      setCounters(result.counters);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly attendance summary');
    } finally {
      setLoading(false);
    }
  }, [
    selectedMonth,
    search,
    departmentId,
    payrollReadiness,
    activeCounter,
    reviewStateFilter,
    lockStatusFilter,
    filterExceptions,
    filterPendingCorrections,
    filterProcessingIssues,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const y = Number(yearStr);
    const m = Number(monthStr);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setPage(1);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const y = Number(yearStr);
    const m = Number(monthStr);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartmentId('all');
    setPayrollReadiness('all');
    setActiveCounter(null);
    setReviewStateFilter('all');
    setLockStatusFilter('all');
    setFilterExceptions(false);
    setFilterPendingCorrections(false);
    setFilterProcessingIssues(false);
    setPage(1);
  };

  // Row selection
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Open Employee Drilldown Drawer
  const handleOpenDrawer = async (row: MonthlySummaryRow) => {
    setDrawerId(row.id);
    setDrawerLoading(true);
    setDrawerTab('overview');
    try {
      const [summary, days, readiness, history] = await Promise.all([
        fetchMonthlySummaryById(row.id),
        fetchMonthlySummaryDays(row.id),
        fetchMonthlySummaryReadiness(row.id),
        fetchMonthlySummaryHistory(row.id),
      ]);
      setDrawerSummary(summary);
      setDrawerDays(days);
      setDrawerReadiness(readiness);
      setDrawerHistory(history);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to load employee drilldown');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerId(null);
    setDrawerSummary(null);
    setDrawerDays([]);
    setDrawerReadiness(null);
    setDrawerHistory([]);
  };

  // Review Actions
  const handleOpenReviewDialog = (
    row: MonthlySummaryRow,
    action: 'review' | 'start' | 'correction' | 'reopen',
  ) => {
    setReviewDialogTarget(row);
    setReviewDialogAction(action);
    setReviewNotes('');
  };

  const handleSubmitReviewAction = async () => {
    if (!reviewDialogTarget || !reviewDialogAction) return;
    setReviewSubmitting(true);
    try {
      if (reviewDialogAction === 'start') {
        await startMonthlySummaryReview(reviewDialogTarget.id);
      } else if (reviewDialogAction === 'review') {
        await markMonthlySummaryReviewed(reviewDialogTarget.id, reviewNotes || undefined);
      } else if (reviewDialogAction === 'correction') {
        if (!reviewNotes.trim()) {
          alert('Correction notes are mandatory');
          setReviewSubmitting(false);
          return;
        }
        await requestMonthlySummaryCorrection(reviewDialogTarget.id, reviewNotes);
      } else if (reviewDialogAction === 'reopen') {
        if (!reviewNotes.trim()) {
          alert('Reopen reason is mandatory');
          setReviewSubmitting(false);
          return;
        }
        await reopenMonthlySummaryReview(reviewDialogTarget.id, reviewNotes);
      }

      setReviewDialogTarget(null);
      setReviewDialogAction(null);
      await loadWorkspace();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Recalculate single summary
  const handleRecalculateSingle = async (id: string) => {
    try {
      await recalculateMonthlySummary(id);
      await loadWorkspace();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Recalculation failed');
    }
  };

  // Bulk Operations
  const handleTriggerBulk = async (
    action: 'mark_reviewed' | 'start_review' | 'request_correction' | 'recalculate',
  ) => {
    if (selectedIds.size === 0) return;
    setBulkAction(action);
    setShowBulkModal(true);
    setBulkPreview(null);
    setBulkExecutionResult(null);
    setBulkPreviewLoading(true);
    try {
      const preview = await previewMonthlySummaryBulkAction(action, Array.from(selectedIds));
      setBulkPreview(preview);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to preview bulk action');
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const handleExecuteBulk = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkExecuting(true);
    try {
      const result = await executeMonthlySummaryBulkAction({
        action: bulkAction,
        summaryIds: Array.from(selectedIds),
        correctionNotes: 'Bulk review correction request',
      });
      setBulkExecutionResult(result);
      setSelectedIds(new Set());
      await loadWorkspace();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkExecuting(false);
    }
  };

  // Export
  const handleExecuteExport = async () => {
    setExporting(true);
    try {
      const blob = await exportMonthlySummaryCsv({
        month: selectedMonth,
        format: exportFormat,
        level: exportLevel,
        selectedIds: exportScope === 'selected' ? Array.from(selectedIds) : undefined,
        departmentId: departmentId === 'all' ? undefined : departmentId,
        payrollReadiness:
          payrollReadiness === 'all' ? undefined : (payrollReadiness as AttendancePayrollReadiness),
        search: search.trim() || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileExt = exportFormat === 'pdf' ? 'pdf' : exportFormat === 'excel' ? 'xlsx' : 'csv';
      a.download = `monthly_attendance_${selectedMonth}_${Date.now()}.${fileExt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setShowExportModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Badges
  const renderReadinessBadge = (readiness: AttendancePayrollReadiness) => {
    switch (readiness) {
      case 'ready':
        return <Badge variant="success">Ready for Payroll</Badge>;
      case 'blocked':
        return <Badge variant="danger">Blocked</Badge>;
      case 'needs_review':
        return <Badge variant="warning">Needs Review</Badge>;
      case 'calculating':
        return <Badge variant="info">Calculating</Badge>;
      default:
        return <Badge variant="neutral">{readiness}</Badge>;
    }
  };

  const renderReviewBadge = (state: AttendanceReviewState) => {
    switch (state) {
      case 'reviewed':
        return <Badge variant="success">Reviewed</Badge>;
      case 'in_review':
        return <Badge variant="info">In Review</Badge>;
      case 'needs_correction':
        return <Badge variant="danger">Correction Req.</Badge>;
      case 'reopened':
        return <Badge variant="warning">Reopened</Badge>;
      case 'not_reviewed':
      default:
        return <Badge variant="neutral">Not Reviewed</Badge>;
    }
  };

  return (
    <Page>
      <PageHeader
        title="Monthly Attendance Summary"
        subtitle="Workforce monthly calendar matrix — deterministic monthly aggregation, version-aware sign-off and payroll readiness workspace"
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={() => setShowExportModal(true)}>
              <BezentIcon name="download" size={16} /> Export
            </Button>
            <Button variant="secondary" onClick={loadWorkspace}>
              <BezentIcon name="refresh" size={16} /> Refresh
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* Month Navigator Toolbar */}
        <Card padding="sm">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <Button variant="secondary" onClick={handlePrevMonth}>
                <BezentIcon name="chevron-left" size={16} /> Prev Month
              </Button>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                }}
              />
              <Button variant="secondary" onClick={handleNextMonth}>
                Next Month <BezentIcon name="chevron-right" size={16} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedMonth(getCurrentMonthString());
                  setPage(1);
                }}
              >
                Current Month
              </Button>
            </Inline>

            <span className="bezent-card__desc">
              Viewing scope for <strong>{selectedMonth}</strong> ({totalCount} employees)
            </span>
          </Inline>
        </Card>

        {/* Six Summary Counters */}
        <Grid columns={6} gap="md">
          <Card
            padding="sm"
            onClick={() => {
              setActiveCounter(activeCounter === 'all' ? null : 'all');
              setPage(1);
            }}
          >
            <Stack gap="xs">
              <span className="bezent-card__desc">Total Employees</span>
              <strong>{counters.totalEmployees}</strong>
              <Badge variant="neutral">Workforce</Badge>
            </Stack>
          </Card>

          <Card
            padding="sm"
            onClick={() => {
              setActiveCounter(activeCounter === 'ready' ? null : 'ready');
              setPage(1);
            }}
          >
            <Stack gap="xs">
              <span className="bezent-card__desc">Ready for Payroll</span>
              <strong>{counters.readyForPayroll}</strong>
              <Badge variant="success">Eligible Handoff</Badge>
            </Stack>
          </Card>

          <Card
            padding="sm"
            onClick={() => {
              setActiveCounter(activeCounter === 'needs_review' ? null : 'needs_review');
              setPage(1);
            }}
          >
            <Stack gap="xs">
              <span className="bezent-card__desc">Needs Review</span>
              <strong>{counters.needsReview}</strong>
              <Badge variant="warning">Awaiting HR Sign-off</Badge>
            </Stack>
          </Card>

          <Card
            padding="sm"
            onClick={() => {
              setActiveCounter(activeCounter === 'issues' ? null : 'issues');
              setPage(1);
            }}
          >
            <Stack gap="xs">
              <span className="bezent-card__desc">Processing Issues</span>
              <strong>{counters.processingIssues}</strong>
              <Badge variant="danger">Blocking Errors</Badge>
            </Stack>
          </Card>

          <Card
            padding="sm"
            onClick={() => {
              setActiveCounter(activeCounter === 'locked' ? null : 'locked');
              setPage(1);
            }}
          >
            <Stack gap="xs">
              <span className="bezent-card__desc">Period Locked</span>
              <strong>{counters.locked}</strong>
              <Badge variant="neutral">Frozen Records</Badge>
            </Stack>
          </Card>

          <Card
            padding="sm"
            onClick={() => {
              setActiveCounter(activeCounter === 'corrections' ? null : 'corrections');
              setPage(1);
            }}
          >
            <Stack gap="xs">
              <span className="bezent-card__desc">Pending Corrections</span>
              <strong>{counters.pendingCorrections}</strong>
              <Badge variant="info">In Flight</Badge>
            </Stack>
          </Card>
        </Grid>

        {/* Primary and Advanced Filters */}
        <Card padding="md">
          <Stack gap="md">
            <Inline justify="between" align="center">
              <Inline gap="md" align="center">
                <SearchInput
                  placeholder="Search employee by name, code..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />

                <Select
                  value={payrollReadiness}
                  onChange={(e) => {
                    setPayrollReadiness(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Readiness States</option>
                  <option value="ready">Ready for Payroll</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="calculating">Calculating</option>
                </Select>

                <Button
                  variant="secondary"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <BezentIcon name="filter" size={16} />{' '}
                  {showAdvancedFilters ? 'Hide Advanced Filters' : 'More Filters'}
                </Button>

                <Button variant="ghost" onClick={handleResetFilters}>
                  Reset
                </Button>
              </Inline>

              <span className="bezent-card__desc">
                {activeCounter && <Badge variant="info">Counter Filter: {activeCounter}</Badge>}
              </span>
            </Inline>

            {/* Advanced Filters Expandable Drawer/Section */}
            {showAdvancedFilters && (
              <Card padding="sm">
                <Grid columns={4} gap="md">
                  <Select
                    value={reviewStateFilter}
                    onChange={(e) => {
                      setReviewStateFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Review States</option>
                    <option value="not_reviewed">Not Reviewed</option>
                    <option value="in_review">In Review</option>
                    <option value="needs_correction">Needs Correction</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="reopened">Reopened</option>
                  </Select>

                  <Select
                    value={lockStatusFilter}
                    onChange={(e) => {
                      setLockStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Lock States</option>
                    <option value="locked">Locked Only</option>
                    <option value="unlocked">Unlocked Only</option>
                  </Select>

                  <Inline gap="sm" align="center">
                    <Checkbox
                      checked={filterExceptions}
                      onChange={(e) => {
                        setFilterExceptions(e.target.checked);
                        setPage(1);
                      }}
                      label="Has Exceptions"
                    />
                    <Checkbox
                      checked={filterPendingCorrections}
                      onChange={(e) => {
                        setFilterPendingCorrections(e.target.checked);
                        setPage(1);
                      }}
                      label="Pending Regularizations"
                    />
                  </Inline>

                  <Inline gap="sm" align="center">
                    <Checkbox
                      checked={filterProcessingIssues}
                      onChange={(e) => {
                        setFilterProcessingIssues(e.target.checked);
                        setPage(1);
                      }}
                      label="Processing Issues"
                    />
                  </Inline>
                </Grid>
              </Card>
            )}
          </Stack>
        </Card>

        {/* Controlled Bulk Operations Toolbar (Appears when rows selected) */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center">
              <Inline gap="sm" align="center">
                <Badge variant="info">{selectedIds.size} Selected</Badge>
                <Button variant="primary" onClick={() => handleTriggerBulk('mark_reviewed')}>
                  Bulk Mark Reviewed
                </Button>
                <Button variant="secondary" onClick={() => handleTriggerBulk('start_review')}>
                  Bulk Start Review
                </Button>
                <Button variant="secondary" onClick={() => handleTriggerBulk('request_correction')}>
                  Bulk Request Correction
                </Button>
                <Button variant="secondary" onClick={() => handleTriggerBulk('recalculate')}>
                  Bulk Recalculate
                </Button>
              </Inline>

              <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </Inline>
          </Card>
        )}

        {/* Main 12-Column Table */}
        {loading ? (
          <LoadingState label="Computing authoritative monthly attendance summaries..." />
        ) : error ? (
          <Alert variant="danger" title="Error Loading Monthly Summaries">
            {error}
            <Button variant="secondary" onClick={loadWorkspace}>
              Retry
            </Button>
          </Alert>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No Monthly Summaries Found"
            description="No employee attendance records match the current filters for this period."
          />
        ) : (
          <Card padding="none">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <Checkbox
                      checked={selectedIds.size === rows.length && rows.length > 0}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    />
                  </TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Scheduled</TableHeaderCell>
                  <TableHeaderCell>Present</TableHeaderCell>
                  <TableHeaderCell>Absent</TableHeaderCell>
                  <TableHeaderCell>Leave</TableHeaderCell>
                  <TableHeaderCell>On-Duty</TableHeaderCell>
                  <TableHeaderCell>WO / Hol</TableHeaderCell>
                  <TableHeaderCell>Worked / Credited</TableHeaderCell>
                  <TableHeaderCell>Late / Early</TableHeaderCell>
                  <TableHeaderCell>Exceptions</TableHeaderCell>
                  <TableHeaderCell>Review / Readiness</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleToggleSelectRow(row.id)}
                      />
                    </TableCell>

                    {/* 1. Employee */}
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <Avatar
                          initials={
                            row.employeeName ? row.employeeName.slice(0, 2).toUpperCase() : 'EM'
                          }
                          alt={row.employeeName}
                        />
                        <Stack gap="none">
                          <button
                            type="button"
                            className="bezent-button--ghost"
                            onClick={() =>
                              navigate(`/hrms/administration/employees/${row.employeeId}`)
                            }
                          >
                            <strong>{row.employeeName}</strong>
                          </button>
                          <span className="bezent-card__desc">
                            {row.employeeCode} • {row.departmentName}
                          </span>
                        </Stack>
                      </Inline>
                    </TableCell>

                    {/* 2. Scheduled Days */}
                    <TableCell>
                      <strong>{row.scheduledDays}d</strong>
                      <span className="bezent-card__desc">
                        {Math.round(row.scheduledMinutes / 60)}h
                      </span>
                    </TableCell>

                    {/* 3. Present */}
                    <TableCell>
                      <strong>{row.presentDays}d</strong>
                    </TableCell>

                    {/* 4. Absent */}
                    <TableCell>
                      {row.absentDays > 0 ? (
                        <Badge variant="danger">{row.absentDays}d</Badge>
                      ) : (
                        <span>0d</span>
                      )}
                    </TableCell>

                    {/* 5. Leave */}
                    <TableCell>
                      {row.leaveDays > 0 ? (
                        <Badge variant="info">{row.leaveDays}d</Badge>
                      ) : (
                        <span>0d</span>
                      )}
                    </TableCell>

                    {/* 6. On-Duty */}
                    <TableCell>
                      {row.onDutyDays > 0 ? (
                        <Badge variant="success">{row.onDutyDays}d</Badge>
                      ) : (
                        <span>0d</span>
                      )}
                    </TableCell>

                    {/* 7. Weekly Off / Holiday */}
                    <TableCell>
                      <span>
                        {row.weeklyOffDays} / {row.holidayDays}
                      </span>
                    </TableCell>

                    {/* 8. Worked / Credited Hours */}
                    <TableCell>
                      <strong>{row.actualWorkedHours}h</strong>
                      <span className="bezent-card__desc">
                        Credited: {row.policyCreditedHours}h
                      </span>
                    </TableCell>

                    {/* 9. Late / Early */}
                    <TableCell>
                      <Inline gap="xs">
                        {row.lateOccurrences > 0 && (
                          <Badge variant="warning">{row.lateOccurrences}L</Badge>
                        )}
                        {row.earlyExitOccurrences > 0 && (
                          <Badge variant="neutral">{row.earlyExitOccurrences}E</Badge>
                        )}
                        {row.lateOccurrences === 0 && row.earlyExitOccurrences === 0 && (
                          <span>—</span>
                        )}
                      </Inline>
                    </TableCell>

                    {/* 10. Exceptions */}
                    <TableCell>
                      <Inline gap="xs">
                        {row.unresolvedExceptions > 0 && (
                          <Badge variant="danger">{row.unresolvedExceptions} Ex</Badge>
                        )}
                        {row.pendingCorrections > 0 && (
                          <Badge variant="warning">{row.pendingCorrections} Reg</Badge>
                        )}
                        {row.processingIssues > 0 && <Badge variant="danger">Err</Badge>}
                        {row.unresolvedExceptions === 0 &&
                          row.pendingCorrections === 0 &&
                          row.processingIssues === 0 && <span>None</span>}
                      </Inline>
                    </TableCell>

                    {/* 11. Review / Payroll State */}
                    <TableCell>
                      <Stack gap="xs">
                        {renderReviewBadge(row.reviewState)}
                        {renderReadinessBadge(row.payrollReadiness)}
                      </Stack>
                    </TableCell>

                    {/* 12. Actions */}
                    <TableCell>
                      <Inline gap="xs">
                        <Button variant="secondary" onClick={() => handleOpenDrawer(row)}>
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            handleOpenReviewDialog(
                              row,
                              row.reviewState === 'reviewed' ? 'reopen' : 'review',
                            )
                          }
                        >
                          {row.reviewState === 'reviewed' ? 'Reopen' : 'Review'}
                        </Button>
                        <Button variant="ghost" onClick={() => handleRecalculateSingle(row.id)}>
                          <BezentIcon name="refresh" size={14} />
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <Inline justify="between" align="center">
            <span className="bezent-card__desc">
              Showing Page {page} of {totalPages} ({totalCount} total)
            </span>
            <Inline gap="xs">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Inline>
          </Inline>
        )}
      </Stack>

      {/* 4-Tab Employee Monthly Drill-down Drawer (Modal size="lg") */}
      {drawerId && (
        <Modal
          title={
            drawerSummary
              ? `Monthly Drill-down: ${drawerSummary.employeeName} (${drawerSummary.month})`
              : 'Loading Employee Summary...'
          }
          isOpen={true}
          onClose={handleCloseDrawer}
          size="lg"
        >
          {drawerLoading || !drawerSummary ? (
            <LoadingState label="Fetching complete monthly attendance breakdown..." />
          ) : (
            <Stack gap="md">
              {/* Header Badges */}
              <Inline justify="between" align="center">
                <Inline gap="sm" align="center">
                  <Avatar
                    initials={drawerSummary.employeeName.slice(0, 2).toUpperCase()}
                    alt={drawerSummary.employeeName}
                  />
                  <Stack gap="none">
                    <strong>{drawerSummary.employeeName}</strong>
                    <span className="bezent-card__desc">
                      {drawerSummary.employeeCode} • {drawerSummary.departmentName}
                    </span>
                  </Stack>
                </Inline>

                <Inline gap="xs">
                  {renderReviewBadge(drawerSummary.reviewState)}
                  {renderReadinessBadge(drawerSummary.payrollReadiness)}
                  {drawerSummary.isLocked && <Badge variant="neutral">Locked</Badge>}
                </Inline>
              </Inline>

              {/* 4 Tabs */}
              <Tabs
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'days', label: 'Daily Breakdown' },
                  { id: 'readiness', label: 'Issues & Readiness' },
                  { id: 'history', label: 'Review History' },
                ]}
                activeId={drawerTab}
                onChange={(tabId) => setDrawerTab(tabId as typeof drawerTab)}
              />

              {/* Tab 1: Overview */}
              {drawerTab === 'overview' && (
                <Stack gap="md">
                  <Grid columns={3} gap="sm">
                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Scheduled Days</span>
                        <strong>{drawerSummary.scheduledDays} days</strong>
                        <span>{drawerSummary.scheduledMinutes} mins</span>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Present Equivalents</span>
                        <strong>{drawerSummary.presentDays} days</strong>
                        <span>Credited: {drawerSummary.policyCreditedHours}h</span>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Absent Equivalents</span>
                        <strong>{drawerSummary.absentDays} days</strong>
                        <span>Actual Worked: {drawerSummary.actualWorkedHours}h</span>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Leave Coverage</span>
                        <strong>{drawerSummary.leaveDays} days</strong>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">On-Duty Coverage</span>
                        <strong>{drawerSummary.onDutyDays} days</strong>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Weekly Off / Holiday</span>
                        <strong>
                          {drawerSummary.weeklyOffDays} WO / {drawerSummary.holidayDays} Hol
                        </strong>
                      </Stack>
                    </Card>
                  </Grid>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Governance & Version Metadata</strong>
                      <Grid columns={2} gap="sm">
                        <Stack gap="none">
                          <span className="bezent-card__desc">Summary Version</span>
                          <span>Version {drawerSummary.version}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Fingerprint</span>
                          <span>{drawerSummary.sourceFingerprint.slice(0, 16)}...</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Assigned Reviewer</span>
                          <span>{drawerSummary.assignedReviewerName ?? 'Unassigned'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Last Sign-off</span>
                          <span>
                            {drawerSummary.reviewedAt
                              ? formatDateTime(drawerSummary.reviewedAt)
                              : 'Not Signed Off'}
                          </span>
                        </Stack>
                      </Grid>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Tab 2: Daily Breakdown */}
              {drawerTab === 'days' && (
                <Card padding="none">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Date</TableHeaderCell>
                        <TableHeaderCell>Shift</TableHeaderCell>
                        <TableHeaderCell>Classification</TableHeaderCell>
                        <TableHeaderCell>Worked Mins</TableHeaderCell>
                        <TableHeaderCell>OD Credit</TableHeaderCell>
                        <TableHeaderCell>Leave</TableHeaderCell>
                        <TableHeaderCell>Late / Early</TableHeaderCell>
                        <TableHeaderCell>Exceptions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {drawerDays.map((d) => (
                        <TableRow key={d.date}>
                          <TableCell>
                            <strong>{d.date}</strong>
                            <span className="bezent-card__desc">{d.dayOfWeek}</span>
                          </TableCell>
                          <TableCell>{d.shiftName ?? 'Standard'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                d.classification === 'present'
                                  ? 'success'
                                  : d.classification === 'absent'
                                    ? 'danger'
                                    : d.classification === 'on_duty'
                                      ? 'info'
                                      : 'neutral'
                              }
                            >
                              {d.classification.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{d.actualWorkedMinutes}m</TableCell>
                          <TableCell>{d.onDutyMinutes > 0 ? `${d.onDutyMinutes}m` : '—'}</TableCell>
                          <TableCell>{d.leaveMinutes ? `${d.leaveMinutes}m` : '—'}</TableCell>
                          <TableCell>
                            <Inline gap="xs">
                              {d.isLate && <Badge variant="warning">{d.lateMinutes}m</Badge>}
                              {d.isEarlyExit && (
                                <Badge variant="neutral">{d.earlyExitMinutes}m</Badge>
                              )}
                              {!d.isLate && !d.isEarlyExit && <span>—</span>}
                            </Inline>
                          </TableCell>
                          <TableCell>
                            {d.hasException && <Badge variant="danger">Ex</Badge>}
                            {d.hasPendingRegularization && <Badge variant="warning">Reg</Badge>}
                            {!d.hasException && !d.hasPendingRegularization && <span>—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* Tab 3: Issues & Readiness */}
              {drawerTab === 'readiness' && (
                <Stack gap="md">
                  {drawerReadiness?.blockingChecks && drawerReadiness.blockingChecks.length > 0 && (
                    <Alert variant="danger" title="Blocking Readiness Issues">
                      <Stack gap="xs">
                        {drawerReadiness.blockingChecks.map((b) => (
                          <span key={b.code}>
                            <strong>{b.name}:</strong> {b.details}
                          </span>
                        ))}
                      </Stack>
                    </Alert>
                  )}

                  {drawerReadiness?.warningChecks && drawerReadiness.warningChecks.length > 0 && (
                    <Alert variant="warning" title="Readiness Warnings">
                      <Stack gap="xs">
                        {drawerReadiness.warningChecks.map((w) => (
                          <span key={w.code}>
                            <strong>{w.name}:</strong> {w.details}
                          </span>
                        ))}
                      </Stack>
                    </Alert>
                  )}

                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Passed Readiness Checks</strong>
                      {drawerReadiness?.passedChecks.map((p) => (
                        <Inline key={p.code} gap="xs" align="center">
                          <Badge variant="success">PASS</Badge>
                          <span>
                            <strong>{p.name}:</strong> {p.details}
                          </span>
                        </Inline>
                      ))}
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Tab 4: Review History */}
              {drawerTab === 'history' && (
                <Card padding="sm">
                  {drawerHistory.length === 0 ? (
                    <EmptyState
                      title="No Review History"
                      description="This summary has not had any sign-off or correction events recorded yet."
                    />
                  ) : (
                    <Stack gap="md">
                      {drawerHistory.map((h) => (
                        <Card key={h.id} padding="sm">
                          <Stack gap="xs">
                            <Inline justify="between" align="center">
                              <strong>Status: {h.reviewStatus.replace('_', ' ')}</strong>
                              <span className="bezent-card__desc">
                                {formatDateTime(h.createdAt)}
                              </span>
                            </Inline>
                            <span>
                              Reviewer: {h.reviewerName ?? h.reviewerUserId} (Version{' '}
                              {h.reviewedSummaryVersion})
                            </span>
                            {h.reviewNotes && <span>Notes: {h.reviewNotes}</span>}
                            {h.reopenReason && <span>Reopen Reason: {h.reopenReason}</span>}
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Card>
              )}

              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={handleCloseDrawer}>
                  Close
                </Button>
              </Inline>
            </Stack>
          )}
        </Modal>
      )}

      {/* Review Dialog Modal */}
      {reviewDialogTarget && (
        <Modal
          title={
            reviewDialogAction === 'review'
              ? `Sign Off Monthly Summary — ${reviewDialogTarget.employeeName}`
              : reviewDialogAction === 'correction'
                ? `Request Correction — ${reviewDialogTarget.employeeName}`
                : `Reopen Review — ${reviewDialogTarget.employeeName}`
          }
          isOpen={true}
          onClose={() => setReviewDialogTarget(null)}
          size="md"
        >
          <Stack gap="md">
            <span>
              Action target: <strong>{reviewDialogTarget.employeeName}</strong> for attendance month{' '}
              <strong>{reviewDialogTarget.month}</strong> (Version {reviewDialogTarget.version}).
            </span>

            <Input
              placeholder={
                reviewDialogAction === 'correction'
                  ? 'Enter mandatory correction request details...'
                  : reviewDialogAction === 'reopen'
                    ? 'Enter mandatory reason for reopening review...'
                    : 'Enter optional review sign-off notes...'
              }
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
            />

            <Inline justify="end" gap="sm">
              <Button
                variant="secondary"
                disabled={reviewSubmitting}
                onClick={() => setReviewDialogTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={reviewSubmitting}
                onClick={handleSubmitReviewAction}
              >
                {reviewSubmitting ? 'Submitting...' : 'Confirm'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* Controlled Bulk Confirmation & Preview Modal */}
      {showBulkModal && (
        <Modal
          title={`Bulk Action Preview: ${bulkAction?.replace('_', ' ')}`}
          isOpen={true}
          onClose={() => setShowBulkModal(false)}
          size="md"
        >
          <Stack gap="md">
            {bulkPreviewLoading ? (
              <LoadingState label="Checking eligibility for selected records..." />
            ) : bulkExecutionResult ? (
              <Stack gap="md">
                <Alert variant="success" title="Bulk Operation Completed">
                  Succeeded: {bulkExecutionResult.succeeded.length} | Skipped:{' '}
                  {bulkExecutionResult.skipped.length} | Failed: {bulkExecutionResult.failed.length}
                </Alert>
                <Button variant="primary" onClick={() => setShowBulkModal(false)}>
                  Done
                </Button>
              </Stack>
            ) : (
              <Stack gap="md">
                <span>
                  Total Selected: <strong>{bulkPreview?.totalSelected}</strong> | Eligible:{' '}
                  <strong>{bulkPreview?.eligibleCount}</strong> | Ineligible:{' '}
                  <strong>{bulkPreview?.notEligibleCount}</strong>
                </span>

                <Inline justify="end" gap="sm">
                  <Button
                    variant="secondary"
                    disabled={bulkExecuting}
                    onClick={() => setShowBulkModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={bulkExecuting || bulkPreview?.eligibleCount === 0}
                    onClick={handleExecuteBulk}
                  >
                    {bulkExecuting ? 'Executing...' : 'Confirm Bulk Execution'}
                  </Button>
                </Inline>
              </Stack>
            )}
          </Stack>
        </Modal>
      )}

      {/* Export Dialog Modal */}
      {showExportModal && (
        <Modal
          title="Export Attendance Monthly Summary"
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          size="md"
        >
          <Stack gap="md">
            <Select
              label="Export Format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
            >
              <option value="csv">Standard CSV</option>
              <option value="excel">Microsoft Excel Compatible</option>
              <option value="pdf">Text/Audit Summary</option>
            </Select>

            <Select
              label="Report Level"
              value={exportLevel}
              onChange={(e) => setExportLevel(e.target.value as typeof exportLevel)}
            >
              <option value="standard">Standard Monthly Register</option>
              <option value="detailed">Detailed Attendance Breakdown</option>
              <option value="audit">Restricted Review & Audit Report</option>
            </Select>

            <Select
              label="Scope"
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value as typeof exportScope)}
            >
              <option value="all">All Filtered Records ({totalCount})</option>
              <option value="selected">Selected Records Only ({selectedIds.size})</option>
            </Select>

            <Inline justify="end" gap="sm">
              <Button
                variant="secondary"
                disabled={exporting}
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" disabled={exporting} onClick={handleExecuteExport}>
                {exporting ? 'Exporting...' : 'Export File'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
