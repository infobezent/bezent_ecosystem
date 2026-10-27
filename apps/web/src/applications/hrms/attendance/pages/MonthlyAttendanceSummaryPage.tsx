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
  fetchMonthlySummaryHistory,
  startMonthlySummaryReview,
  requestMonthlySummaryCorrection,
  markMonthlySummaryReviewed,
  reopenMonthlySummaryReview,
  executeMonthlySummaryBulkAction,
  exportMonthlySummaryCsv,
  lockAttendancePeriod,
} from '../api/attendanceApi';
import { fetchDepartments } from '../../api/organizationMastersApi';
import { getEmployeeAvatarId, getAvatarColor } from '../../employees/model/employeeModel';
import type {
  MonthlySummaryRow,
  MonthlySummaryCounters,
  MonthlySummaryFilter,
  MonthlySummaryDailyRecord,
  MonthlySummaryReviewHistoryItem,
  AttendanceReviewState,
} from '../types/attendance.types';

function getCurrentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthYear(monthStr: string): string {
  try {
    const [year, month] = monthStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return monthStr;
  }
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

function formatDays(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';
  if (num === 0) return '0';
  // Allow decimals like 22.5, never trailing zero like 22.50
  return Number(num.toFixed(2)).toString();
}

function formatOvertime(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

interface ReviewStatusConfig {
  key: 'pending' | 'in_review' | 'approved' | 'frozen';
  label: string;
  tooltip: string;
  variant: 'neutral' | 'warning' | 'success' | 'info';
}

function getReviewStatusConfig(row: MonthlySummaryRow): ReviewStatusConfig {
  if (row.isLocked || (row.reviewState as string) === 'frozen') {
    return {
      key: 'frozen',
      label: 'Frozen',
      tooltip: 'Locked for payroll. No further edits.',
      variant: 'neutral',
    };
  }
  if (row.reviewState === 'reviewed' || (row.reviewState as string) === 'approved') {
    return {
      key: 'approved',
      label: 'Approved',
      tooltip: 'Reviewed and ready for payroll.',
      variant: 'success',
    };
  }
  if (row.reviewState === 'in_review') {
    return {
      key: 'in_review',
      label: 'In Review',
      tooltip: 'Under review by HR.',
      variant: 'warning',
    };
  }
  return {
    key: 'pending',
    label: 'Pending',
    tooltip: 'Not yet reviewed.',
    variant: 'neutral',
  };
}

export function MonthlyAttendanceSummaryPage() {
  // Navigation & Primary Filter State
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>('all');
  const [activeCounter, setActiveCounter] = useState<string | null>(null);

  // Departments Master
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

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
    pending: 0,
    approved: 0,
    frozen: 0,
    lossOfPayDays: 0,
    overtimeHours: 0,
  });
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toast / Banner State
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'warning' | 'danger' | 'info';
    text: string;
  } | null>(null);

  // Row Context Menu State
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Floating Filter Panel State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  // Close context menu and filter panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest?.('.bezent-table-action-menu')) {
        setOpenActionMenuId(null);
      }
      if (!target.closest?.('.bezent-filter-anchor')) {
        setIsFilterPanelOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Departments Master on mount
  useEffect(() => {
    fetchDepartments({ status: 'active' })
      .then((depts) => setDepartments(depts.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setDepartments([]));
  }, []);

  // Drilldown Drawer State
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [drawerSummary, setDrawerSummary] = useState<MonthlySummaryRow | null>(null);
  const [drawerDays, setDrawerDays] = useState<MonthlySummaryDailyRecord[]>([]);
  const [drawerHistory, setDrawerHistory] = useState<MonthlySummaryReviewHistoryItem[]>([]);
  const [drawerTab, setDrawerTab] = useState<'summary' | 'days' | 'history'>('summary');
  const [drawerReviewNote, setDrawerReviewNote] = useState<string>('');
  const [selectedPunchDay, setSelectedPunchDay] = useState<MonthlySummaryDailyRecord | null>(null);

  // Single Row Action Dialog (Send Back / Request Correction)
  const [sendBackTarget, setSendBackTarget] = useState<MonthlySummaryRow | null>(null);
  const [sendBackNotes, setSendBackNotes] = useState<string>('');
  const [sendBackSubmitting, setSendBackSubmitting] = useState<boolean>(false);

  // Bulk Operations State
  const [showBulkApproveModal, setShowBulkApproveModal] = useState<boolean>(false);
  const [bulkSubmitting, setBulkSubmitting] = useState<boolean>(false);
  const [showSkippedRecordsModal, setShowSkippedRecordsModal] = useState<boolean>(false);

  // Freeze Period State
  const [showFreezeModal, setShowFreezeModal] = useState<boolean>(false);
  const [freezeSubmitting, setFreezeSubmitting] = useState<boolean>(false);

  // Export State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [exportLevel, setExportLevel] = useState<'standard' | 'detailed' | 'audit'>('standard');
  const [exportScope, setExportScope] = useState<'selected' | 'all'>('all');
  const [exporting, setExporting] = useState<boolean>(false);

  // Determine Period Status
  const isPeriodFrozen = Boolean(
    (counters.frozen &&
      counters.frozen === counters.totalEmployees &&
      counters.totalEmployees > 0) ||
    (rows.length > 0 && rows.every((r) => r.isLocked)) ||
    (counters.locked && counters.locked === counters.totalEmployees && counters.totalEmployees > 0),
  );

  const isFreezeReady = Boolean(
    counters.totalEmployees > 0 &&
    (counters.approved ?? counters.readyForPayroll ?? 0) === counters.totalEmployees &&
    !isPeriodFrozen,
  );

  // Load Workspace Data
  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: MonthlySummaryFilter = {
        month: selectedMonth,
        search: debouncedSearch.trim() || undefined,
        departmentId: departmentId === 'all' ? undefined : departmentId,
        reviewState:
          reviewStatusFilter === 'pending'
            ? ('not_reviewed' as AttendanceReviewState)
            : reviewStatusFilter === 'in_review'
              ? ('in_review' as AttendanceReviewState)
              : reviewStatusFilter === 'approved'
                ? ('reviewed' as AttendanceReviewState)
                : undefined,
        isLocked: reviewStatusFilter === 'frozen' ? true : undefined,
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
    debouncedSearch,
    departmentId,
    reviewStatusFilter,
    activeCounter,
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
    setSelectedIds(new Set());
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const y = Number(yearStr);
    const m = Number(monthStr);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDepartmentId('all');
    setReviewStatusFilter('all');
    setActiveCounter(null);
    setSelectedIds(new Set());
    setPage(1);
  };

  const appliedFilterCount =
    (departmentId !== 'all' ? 1 : 0) + (reviewStatusFilter !== 'all' ? 1 : 0);

  const hasActiveFilters = Boolean(
    search.trim() ||
    departmentId !== 'all' ||
    reviewStatusFilter !== 'all' ||
    activeCounter !== null,
  );

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
    setDrawerTab('summary');
    setDrawerReviewNote(row.reviewNotes ?? '');
    try {
      const [summary, days, history] = await Promise.all([
        fetchMonthlySummaryById(row.id),
        fetchMonthlySummaryDays(row.id),
        fetchMonthlySummaryHistory(row.id),
      ]);
      setDrawerSummary(summary);
      setDrawerDays(days);
      setDrawerHistory(history);
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to load employee details',
      });
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerId(null);
    setDrawerSummary(null);
    setDrawerDays([]);
    setDrawerHistory([]);
    setSelectedPunchDay(null);
  };

  // Single Row Actions
  const handleSendForReview = async (row: MonthlySummaryRow) => {
    try {
      await startMonthlySummaryReview(row.id);
      setBannerMessage({
        type: 'success',
        text: `${row.employeeName} sent for review.`,
      });
      await loadWorkspace();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to start review',
      });
    }
  };

  const handleApproveRow = async (row: MonthlySummaryRow) => {
    try {
      await markMonthlySummaryReviewed(row.id, drawerReviewNote || undefined);
      setBannerMessage({
        type: 'success',
        text: `${row.employeeName} attendance summary approved.`,
      });
      await loadWorkspace();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to approve attendance',
      });
    }
  };

  const handleOpenSendBackDialog = (row: MonthlySummaryRow) => {
    setSendBackTarget(row);
    setSendBackNotes('');
  };

  const handleSubmitSendBack = async () => {
    if (!sendBackTarget) return;
    setSendBackSubmitting(true);
    try {
      await requestMonthlySummaryCorrection(
        sendBackTarget.id,
        sendBackNotes.trim() || 'Review returned for correction',
      );
      setBannerMessage({
        type: 'success',
        text: `${sendBackTarget.employeeName} returned for correction.`,
      });
      setSendBackTarget(null);
      await loadWorkspace();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to return review',
      });
    } finally {
      setSendBackSubmitting(false);
    }
  };

  // Bulk Approval Calculation
  const { eligibleRecords, skippedRecords } = useMemo(() => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.id));
    const eligible: MonthlySummaryRow[] = [];
    const skipped: Array<{ row: MonthlySummaryRow; reason: string }> = [];

    for (const r of selectedRows) {
      if (r.isLocked) {
        skipped.push({ row: r, reason: 'Record is already frozen for payroll' });
      } else if (r.unresolvedExceptions > 0) {
        skipped.push({ row: r, reason: 'Pending missed punches' });
      } else if (r.pendingCorrections > 0) {
        skipped.push({ row: r, reason: 'Unapproved overtime' });
      } else if (r.processingIssues > 0) {
        skipped.push({ row: r, reason: 'Leave conflict' });
      } else {
        eligible.push(r);
      }
    }

    return { eligibleRecords: eligible, skippedRecords: skipped };
  }, [rows, selectedIds]);

  const handleExecuteBulkApprove = async () => {
    if (eligibleRecords.length === 0) return;
    setBulkSubmitting(true);
    try {
      await executeMonthlySummaryBulkAction({
        action: 'mark_reviewed',
        summaryIds: eligibleRecords.map((r) => r.id),
      });

      setBannerMessage({
        type: 'success',
        text: `${eligibleRecords.length} approved. ${skippedRecords.length} skipped.`,
      });
      setSelectedIds(new Set());
      setShowBulkApproveModal(false);
      await loadWorkspace();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Bulk approval failed',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Freeze Period Operation
  const handleExecuteFreezePeriod = async () => {
    setFreezeSubmitting(true);
    try {
      await lockAttendancePeriod(selectedMonth);
      setBannerMessage({
        type: 'success',
        text: `${formatMonthYear(selectedMonth)} attendance has been frozen.`,
      });
      setShowFreezeModal(false);
      await loadWorkspace();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to freeze attendance period',
      });
    } finally {
      setFreezeSubmitting(false);
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
        search: debouncedSearch.trim() || undefined,
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
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Export failed',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page>
      {/* 1. Page Header (Spec Section 1) */}
      <PageHeader
        eyebrow="Attendance › Monthly Summary"
        title="Monthly Summary"
        subtitle="Review each employee’s month-end attendance and send it to payroll."
        actions={
          <Inline gap="sm" align="center">
            {/* Period Selector */}
            <Inline gap="xs" align="center">
              <span className="bezent-filter-strip-label">Period:</span>
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                <BezentIcon name="chevronLeft" size={14} />
              </Button>
              <Input
                type="month"
                aria-label="Period"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
              />
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <BezentIcon name="chevronRight" size={14} />
              </Button>
            </Inline>

            {/* Secondary Button: Export */}
            <Button
              variant="secondary"
              size="md"
              shape="rounded"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={() => setShowExportModal(true)}
            >
              Export
            </Button>

            {/* Primary Button: Freeze Period (Spec Section 8) */}
            <Button
              variant="primary"
              size="md"
              shape="rounded"
              disabled={!isFreezeReady || isPeriodFrozen}
              title={
                isPeriodFrozen
                  ? `${formatMonthYear(selectedMonth)} is frozen for payroll.`
                  : !isFreezeReady
                    ? 'All employees must be approved before freezing.'
                    : 'Freeze Period'
              }
              onClick={() => setShowFreezeModal(true)}
            >
              Freeze Period
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* Frozen Period Warning Banner (Spec Section 8) */}
        {isPeriodFrozen && (
          <Alert
            variant="warning"
            title={`${formatMonthYear(selectedMonth)} is frozen for payroll. Corrections are handled as arrears.`}
          >
            Attendance records for this pay period are locked. Any further adjustments must be
            processed as payroll arrears.
          </Alert>
        )}

        {/* Dynamic Status Notification Banner */}
        {bannerMessage && <Alert variant={bannerMessage.type}>{bannerMessage.text}</Alert>}

        {/* 3. Summary Cards Strip (Spec Section 3) */}
        <Grid columns={6} gap="md">
          {/* 1. Employees */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--blue ${reviewStatusFilter === 'all' && activeCounter === null ? 'is-active' : ''}`}
            onClick={() => {
              setReviewStatusFilter('all');
              setActiveCounter(null);
              setPage(1);
            }}
            role="button"
            tabIndex={0}
            title="Total recorded workforce"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
              <BezentIcon name="employees" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Employees</p>
              <p className="bezent-kpi-card__value">{counters.totalEmployees}</p>
              <p className="bezent-kpi-card__caption">Total workforce</p>
            </div>
          </div>

          {/* 2. Pending */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--amber ${reviewStatusFilter === 'pending' ? 'is-active' : ''}`}
            onClick={() => {
              setReviewStatusFilter((c) => (c === 'pending' ? 'all' : 'pending'));
              setActiveCounter(null);
              setPage(1);
            }}
            role="button"
            tabIndex={0}
            title="Attendance summaries awaiting review"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--amber">
              <BezentIcon name="clock" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Pending</p>
              <p className="bezent-kpi-card__value">
                {counters.pending ?? counters.needsReview ?? 0}
              </p>
              <p className="bezent-kpi-card__caption">Awaiting review</p>
            </div>
          </div>

          {/* 3. Approved */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--green ${reviewStatusFilter === 'approved' ? 'is-active' : ''}`}
            onClick={() => {
              setReviewStatusFilter((c) => (c === 'approved' ? 'all' : 'approved'));
              setActiveCounter(null);
              setPage(1);
            }}
            role="button"
            tabIndex={0}
            title="Reviewed and ready for payroll"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--green">
              <BezentIcon name="check" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Approved</p>
              <p className="bezent-kpi-card__value">
                {counters.approved ?? counters.readyForPayroll ?? 0}
              </p>
              <p className="bezent-kpi-card__caption">Ready for payroll</p>
            </div>
          </div>

          {/* 4. Frozen */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--purple ${reviewStatusFilter === 'frozen' ? 'is-active' : ''}`}
            onClick={() => {
              setReviewStatusFilter((c) => (c === 'frozen' ? 'all' : 'frozen'));
              setActiveCounter(null);
              setPage(1);
            }}
            role="button"
            tabIndex={0}
            title="Locked for payroll"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--purple">
              <BezentIcon name="lock" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Frozen</p>
              <p className="bezent-kpi-card__value">{counters.frozen ?? counters.locked ?? 0}</p>
              <p className="bezent-kpi-card__caption">Locked for payroll</p>
            </div>
          </div>

          {/* 5. Loss of Pay Days */}
          <div
            className="bezent-kpi-card bezent-kpi-card--red"
            title="Total unpaid loss of pay days across workforce"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--red">
              <BezentIcon name="close" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Loss of Pay Days</p>
              <p className="bezent-kpi-card__value">{formatDays(counters.lossOfPayDays)}</p>
              <p className="bezent-kpi-card__caption">Total unpaid days</p>
            </div>
          </div>

          {/* 6. Overtime Hours */}
          <div
            className="bezent-kpi-card bezent-kpi-card--blue"
            title="Total credited overtime hours"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
              <BezentIcon name="tasks" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Overtime Hours</p>
              <p className="bezent-kpi-card__value">
                {counters.overtimeHours ? `${counters.overtimeHours}h` : '0h'}
              </p>
              <p className="bezent-kpi-card__caption">Approved overtime</p>
            </div>
          </div>
        </Grid>

        {/* 4. Filter Bar (Spec Section 4 — Workforce Directory Floating Filter Pattern) */}
        <div className="bezent-directory-toolbar">
          <div className="bezent-directory-toolbar__search">
            <SearchInput
              placeholder="Search by name or employee ID"
              aria-label="Search"
              shape="rounded"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <div className="bezent-directory-toolbar__actions">
            <div className="bezent-filter-anchor">
              <Button
                variant={appliedFilterCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                size="md"
                shape="rounded"
                className={appliedFilterCount > 0 ? 'bezent-btn--filters-active' : ''}
                leftIcon={<BezentIcon name="filter" size={16} />}
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              >
                Filters
                {appliedFilterCount > 0 && (
                  <span className="bezent-btn__filter-count">{appliedFilterCount}</span>
                )}
              </Button>

              {isFilterPanelOpen && (
                <div className="bezent-filter-panel" onClick={(e) => e.stopPropagation()}>
                  {/* 1. Header with icon and clean close button */}
                  <div className="bezent-filter-panel__header">
                    <div className="bezent-filter-panel__title-group">
                      <BezentIcon name="filter" size={16} />
                      <h3 className="bezent-filter-panel__title">Filter Attendance</h3>
                    </div>
                    <button
                      type="button"
                      className="bezent-filter-panel__close-btn"
                      aria-label="Close filter panel"
                      onClick={() => setIsFilterPanelOpen(false)}
                    >
                      <BezentIcon name="close" size={18} />
                    </button>
                  </div>

                  {/* 2. Compact 2-Column Form Body */}
                  <div className="bezent-filter-panel__body-compact">
                    <div className="bezent-filter-form-grid">
                      <div className="bezent-filter-form-group">
                        <label className="bezent-filter-label" htmlFor="filter-department">
                          Department
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-department"
                            className="bezent-filter-select-control"
                            value={departmentId}
                            onChange={(e) => {
                              setDepartmentId(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All Departments</option>
                            {departments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>

                      <div className="bezent-filter-form-group">
                        <label className="bezent-filter-label" htmlFor="filter-review-status">
                          Review Status
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-review-status"
                            className="bezent-filter-select-control"
                            value={reviewStatusFilter}
                            onChange={(e) => {
                              setReviewStatusFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_review">In Review</option>
                            <option value="approved">Approved</option>
                            <option value="frozen">Frozen</option>
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Standard Footer Actions */}
                  <div className="bezent-filter-panel__footer-compact">
                    <button
                      type="button"
                      className="bezent-filter-panel__clear-btn"
                      onClick={handleResetFilters}
                      disabled={!hasActiveFilters}
                    >
                      Clear all
                    </button>
                    <div className="bezent-filter-panel__footer-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        shape="rounded"
                        onClick={() => setIsFilterPanelOpen(false)}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                leftIcon={<BezentIcon name="reset" size={14} />}
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            )}

            <span className="bezent-records-badge">{totalCount} Records</span>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {appliedFilterCount > 0 && (
          <div className="bezent-active-chips-strip">
            {departmentId !== 'all' && (
              <span className="bezent-active-filter-chip">
                <span>
                  {`Department: ${departments.find((d) => d.id === departmentId)?.name || departmentId}`}
                </span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove department filter"
                  onClick={() => {
                    setDepartmentId('all');
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {reviewStatusFilter !== 'all' && (
              <span className="bezent-active-filter-chip">
                <span>
                  {`Status: ${
                    reviewStatusFilter === 'in_review'
                      ? 'In Review'
                      : reviewStatusFilter.charAt(0).toUpperCase() + reviewStatusFilter.slice(1)
                  }`}
                </span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove review status filter"
                  onClick={() => {
                    setReviewStatusFilter('all');
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* 7. Bulk Approval Selection Bar (Spec Section 7) */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center">
              <Inline gap="sm" align="center">
                <strong>{selectedIds.size} employees selected</strong>
                <Button
                  variant="primary"
                  size="sm"
                  shape="rounded"
                  onClick={() => setShowBulkApproveModal(true)}
                >
                  Approve Selected
                </Button>
                {skippedRecords.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSkippedRecordsModal(true)}
                  >
                    View skipped records ({skippedRecords.length})
                  </Button>
                )}
              </Inline>

              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear Selection
              </Button>
            </Inline>
          </Card>
        )}

        {/* 5. Main 15-Column Table & Pagination (Spec Section 5 & 10) */}
        {loading ? (
          <LoadingState label="Computing authoritative monthly attendance summaries..." />
        ) : error ? (
          <Alert variant="danger" title="Could not load monthly summary">
            <Stack gap="xs">
              <p>Something went wrong while loading.</p>
              <Button variant="secondary" onClick={loadWorkspace}>
                Retry
              </Button>
            </Stack>
          </Alert>
        ) : rows.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              variant="attendance"
              title="No matching employees"
              description="No employees match your filters."
              primaryAction={{
                label: 'Reset Filters',
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <EmptyState
              variant="attendance"
              title="No attendance data for this period"
              description={`Attendance has not been generated for ${formatMonthYear(selectedMonth)}.`}
            />
          )
        ) : (
          <Card padding="none">
            <Table>
              <TableHead>
                <TableRow>
                  {/* 1. Bulk Select Checkbox */}
                  <TableHeaderCell>
                    <Checkbox
                      checked={selectedIds.size === rows.length && rows.length > 0}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      aria-label="Select all rows"
                    />
                  </TableHeaderCell>
                  {/* 2. Employee */}
                  <TableHeaderCell>Employee</TableHeaderCell>
                  {/* 3. Department */}
                  <TableHeaderCell>Department</TableHeaderCell>
                  {/* 4. Present */}
                  <TableHeaderCell>Present</TableHeaderCell>
                  {/* 5. Absent */}
                  <TableHeaderCell>Absent</TableHeaderCell>
                  {/* 6. Half Days */}
                  <TableHeaderCell>Half Days</TableHeaderCell>
                  {/* 7. Leave */}
                  <TableHeaderCell>Leave</TableHeaderCell>
                  {/* 8. Weekly Offs */}
                  <TableHeaderCell>Weekly Offs</TableHeaderCell>
                  {/* 9. Holidays */}
                  <TableHeaderCell>Holidays</TableHeaderCell>
                  {/* 10. Late Marks */}
                  <TableHeaderCell>Late Marks</TableHeaderCell>
                  {/* 11. Loss of Pay */}
                  <TableHeaderCell>
                    <span title="LOP">Loss of Pay</span>
                  </TableHeaderCell>
                  {/* 12. Overtime */}
                  <TableHeaderCell>Overtime</TableHeaderCell>
                  {/* 13. Payable Days (Key Column) */}
                  <TableHeaderCell>Payable Days</TableHeaderCell>
                  {/* 14. Review Status */}
                  <TableHeaderCell>Review Status</TableHeaderCell>
                  {/* 15. Actions */}
                  <TableHeaderCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const statusConfig = getReviewStatusConfig(row);
                  const isRowFrozen = statusConfig.key === 'frozen';
                  const overtimeMinutes =
                    row.actualWorkedMinutes > row.scheduledMinutes
                      ? row.actualWorkedMinutes - row.scheduledMinutes
                      : 0;
                  const payableDays = Math.max(
                    0,
                    Number(row.presentDays || 0) +
                      Number(row.leaveDays || 0) +
                      Number(row.weeklyOffDays || 0) +
                      Number(row.holidayDays || 0),
                  );

                  return (
                    <TableRow key={row.id}>
                      {/* 1. Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onChange={() => handleToggleSelectRow(row.id)}
                          aria-label={`Select ${row.employeeName}`}
                        />
                      </TableCell>

                      {/* 2. Employee */}
                      <TableCell>
                        <div className="bezent-table-cell--avatar-meta">
                          <Avatar
                            avatarId={getEmployeeAvatarId(row.employeeId)}
                            initials={
                              row.employeeName ? row.employeeName.slice(0, 2).toUpperCase() : 'EM'
                            }
                            color={getAvatarColor(row.employeeId)}
                            alt={row.employeeName}
                            size="md"
                          />
                          <div className="bezent-table-meta-group">
                            <button
                              type="button"
                              className="bezent-table-meta-title"
                              onClick={() => handleOpenDrawer(row)}
                            >
                              {row.employeeName}
                            </button>
                            <span className="bezent-table-meta-subtitle">{row.employeeCode}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 3. Department */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {row.departmentName || '—'}
                        </span>
                      </TableCell>

                      {/* 4. Present */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatDays(row.presentDays)}
                        </span>
                      </TableCell>

                      {/* 5. Absent */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatDays(row.absentDays)}
                        </span>
                      </TableCell>

                      {/* 6. Half Days */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatDays((row as unknown as { halfDays?: number }).halfDays ?? 0)}
                        </span>
                      </TableCell>

                      {/* 7. Leave */}
                      <TableCell>
                        <span className="bezent-table-meta-title">{formatDays(row.leaveDays)}</span>
                      </TableCell>

                      {/* 8. Weekly Offs */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {row.weeklyOffDays ? String(row.weeklyOffDays) : '—'}
                        </span>
                      </TableCell>

                      {/* 9. Holidays */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {row.holidayDays ? String(row.holidayDays) : '—'}
                        </span>
                      </TableCell>

                      {/* 10. Late Marks */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {row.lateOccurrences ? String(row.lateOccurrences) : '—'}
                        </span>
                      </TableCell>

                      {/* 11. Loss of Pay */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatDays(row.absentDays)}
                        </span>
                      </TableCell>

                      {/* 12. Overtime */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatOvertime(overtimeMinutes)}
                        </span>
                      </TableCell>

                      {/* 13. Payable Days (Key Column) */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          <strong>{formatDays(payableDays)}</strong>
                        </span>
                      </TableCell>

                      {/* 14. Review Status */}
                      <TableCell>
                        <span title={statusConfig.tooltip}>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </span>
                      </TableCell>

                      {/* 15. Actions (Spec Section 6) */}
                      <TableCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                        <div className="bezent-table-action-menu">
                          <button
                            type="button"
                            className={`bezent-table-action-btn ${openActionMenuId === row.id ? 'is-active' : ''}`}
                            aria-label={`Actions for ${row.employeeName}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId(openActionMenuId === row.id ? null : row.id);
                            }}
                          >
                            <BezentIcon name="more" size={16} />
                          </button>
                          {openActionMenuId === row.id && (
                            <div className="bezent-table-action-menu__dropdown">
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(row);
                                }}
                              >
                                <BezentIcon name="visibility" size={14} /> View Details
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={isRowFrozen}
                                title={isRowFrozen ? 'Frozen for payroll' : 'Send for Review'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleSendForReview(row);
                                }}
                              >
                                <BezentIcon name="share" size={14} /> Send for Review
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={isRowFrozen}
                                title={isRowFrozen ? 'Frozen for payroll' : 'Approve'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleApproveRow(row);
                                }}
                              >
                                <BezentIcon name="check" size={14} /> Approve
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={isRowFrozen}
                                title={isRowFrozen ? 'Frozen for payroll' : 'Send Back'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenSendBackDialog(row);
                                }}
                              >
                                <BezentIcon name="undo" size={14} /> Send Back
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="bezent-table-footer">
              <Inline justify="between" align="center">
                <span className="bezent-card__desc">
                  Showing {rows.length} of {totalCount} records (Page {page} of {totalPages})
                </span>
                <Inline gap="xs" align="center">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </Inline>
              </Inline>
            </div>
          </Card>
        )}
      </Stack>

      {/* 9. Employee Detail Drawer Modal (Spec Section 9) */}
      {drawerId && drawerSummary && (
        <Modal
          title={`${drawerSummary.employeeName} · ${formatMonthYear(drawerSummary.month)}`}
          isOpen={true}
          onClose={handleCloseDrawer}
          size="lg"
        >
          {drawerLoading ? (
            <LoadingState label="Fetching complete monthly attendance breakdown..." />
          ) : (
            <Stack gap="md">
              <Inline justify="between" align="center">
                <Inline gap="sm" align="center">
                  <Avatar
                    avatarId={getEmployeeAvatarId(drawerSummary.employeeId)}
                    initials={drawerSummary.employeeName.slice(0, 2).toUpperCase()}
                    color={getAvatarColor(drawerSummary.employeeId)}
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
                  {(() => {
                    const cfg = getReviewStatusConfig(drawerSummary);
                    return (
                      <span title={cfg.tooltip}>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </span>
                    );
                  })()}
                </Inline>
              </Inline>

              <Tabs
                items={[
                  { id: 'summary', label: 'Attendance Summary' },
                  { id: 'days', label: 'Daily Breakdown' },
                  { id: 'history', label: 'Review History' },
                ]}
                activeId={drawerTab}
                onChange={(tabId) => setDrawerTab(tabId as typeof drawerTab)}
              />

              {/* Section 1: Attendance Summary */}
              {drawerTab === 'summary' && (
                <Stack gap="md">
                  <Grid columns={3} gap="sm">
                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Scheduled Days</span>
                        <strong>{formatDays(drawerSummary.scheduledDays)} days</strong>
                        <span>{drawerSummary.scheduledMinutes} mins</span>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Present Equivalents</span>
                        <strong>{formatDays(drawerSummary.presentDays)} days</strong>
                        <span>Worked: {drawerSummary.actualWorkedHours}h</span>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Absent Days (LOP)</span>
                        <strong>{formatDays(drawerSummary.absentDays)} days</strong>
                      </Stack>
                    </Card>

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Leave Coverage</span>
                        <strong>{formatDays(drawerSummary.leaveDays)} days</strong>
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

                    <Card padding="sm">
                      <Stack gap="none">
                        <span className="bezent-card__desc">Payable Days</span>
                        <strong>
                          {formatDays(
                            Number(drawerSummary.presentDays || 0) +
                              Number(drawerSummary.leaveDays || 0) +
                              Number(drawerSummary.weeklyOffDays || 0) +
                              Number(drawerSummary.holidayDays || 0),
                          )}{' '}
                          days
                        </strong>
                      </Stack>
                    </Card>
                  </Grid>

                  <Stack gap="xs">
                    <span className="bezent-card__desc">Review note (optional)</span>
                    <Input
                      placeholder="Add an optional review note..."
                      value={drawerReviewNote}
                      onChange={(e) => setDrawerReviewNote(e.target.value)}
                    />
                  </Stack>
                </Stack>
              )}

              {/* Section 2: Daily Breakdown */}
              {drawerTab === 'days' && (
                <Stack gap="sm">
                  <span className="bezent-card__desc">
                    Click any day row to view complete punch details.
                  </span>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Date</TableHeaderCell>
                        <TableHeaderCell>Shift</TableHeaderCell>
                        <TableHeaderCell>Schedule</TableHeaderCell>
                        <TableHeaderCell>Worked</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {drawerDays.map((d) => (
                        <TableRow key={d.date} onClick={() => setSelectedPunchDay(d)}>
                          <TableCell>
                            <button
                              type="button"
                              className="bezent-table-meta-title"
                              onClick={() => setSelectedPunchDay(d)}
                            >
                              {d.date}
                            </button>
                          </TableCell>
                          <TableCell>{d.shiftName || 'Standard'}</TableCell>
                          <TableCell>
                            {d.scheduleStartTime && d.scheduleEndTime
                              ? `${d.scheduleStartTime.slice(0, 5)} - ${d.scheduleEndTime.slice(0, 5)}`
                              : '—'}
                          </TableCell>
                          <TableCell>{formatOvertime(d.actualWorkedMinutes)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                d.classification === 'present'
                                  ? 'success'
                                  : d.classification === 'absent'
                                    ? 'danger'
                                    : d.classification === 'on_leave'
                                      ? 'info'
                                      : 'neutral'
                              }
                            >
                              {d.classification.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              )}

              {/* Section 3: Review History */}
              {drawerTab === 'history' && (
                <Stack gap="sm">
                  {drawerHistory.length === 0 ? (
                    <EmptyState
                      title="No Review History"
                      description="This summary has not had any sign-off or correction events recorded yet."
                    />
                  ) : (
                    drawerHistory.map((h) => (
                      <Card key={h.id} padding="sm">
                        <Stack gap="xs">
                          <Inline justify="between" align="center">
                            <strong>Status: {h.reviewStatus.replace('_', ' ')}</strong>
                            <span className="bezent-card__desc">{formatDateTime(h.createdAt)}</span>
                          </Inline>
                          <span>
                            Reviewer: {h.reviewerName ?? h.reviewerUserId} (Version{' '}
                            {h.reviewedSummaryVersion})
                          </span>
                          {h.reviewNotes && <span>Notes: {h.reviewNotes}</span>}
                          {h.reopenReason && <span>Reason: {h.reopenReason}</span>}
                        </Stack>
                      </Card>
                    ))
                  )}
                </Stack>
              )}

              <Inline justify="between" align="center">
                <Button variant="outline" onClick={handleCloseDrawer}>
                  Close
                </Button>
                {!drawerSummary.isLocked && (
                  <Inline gap="xs">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleCloseDrawer();
                        handleOpenSendBackDialog(drawerSummary);
                      }}
                    >
                      Send Back
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleCloseDrawer();
                        handleApproveRow(drawerSummary);
                      }}
                    >
                      Approve
                    </Button>
                  </Inline>
                )}
              </Inline>
            </Stack>
          )}
        </Modal>
      )}

      {/* Punch Details Modal (Section 9 Cell Click) */}
      {selectedPunchDay && (
        <Modal
          title={`Punch details for ${selectedPunchDay.date}`}
          isOpen={true}
          onClose={() => setSelectedPunchDay(null)}
          size="md"
        >
          <Stack gap="md">
            <Grid columns={2} gap="sm">
              <Card padding="sm">
                <Stack gap="none">
                  <span className="bezent-card__desc">Scheduled Time</span>
                  <strong>
                    {selectedPunchDay.scheduleStartTime && selectedPunchDay.scheduleEndTime
                      ? `${selectedPunchDay.scheduleStartTime} - ${selectedPunchDay.scheduleEndTime}`
                      : '—'}
                  </strong>
                </Stack>
              </Card>
              <Card padding="sm">
                <Stack gap="none">
                  <span className="bezent-card__desc">Assigned Shift</span>
                  <strong>{selectedPunchDay.shiftName || 'Standard'}</strong>
                </Stack>
              </Card>
              <Card padding="sm">
                <Stack gap="none">
                  <span className="bezent-card__desc">Classification</span>
                  <strong>{selectedPunchDay.classification.replace('_', ' ')}</strong>
                </Stack>
              </Card>
              <Card padding="sm">
                <Stack gap="none">
                  <span className="bezent-card__desc">Total Worked</span>
                  <strong>{formatOvertime(selectedPunchDay.actualWorkedMinutes)}</strong>
                </Stack>
              </Card>
            </Grid>

            {selectedPunchDay.exceptionTypes && selectedPunchDay.exceptionTypes.length > 0 && (
              <Stack gap="xs">
                <strong>Recorded Exceptions</strong>
                <Inline gap="xs">
                  {selectedPunchDay.exceptionTypes.map((ex, idx) => (
                    <Badge key={idx} variant="warning">
                      {ex.replace('_', ' ')}
                    </Badge>
                  ))}
                </Inline>
              </Stack>
            )}

            <Inline justify="end">
              <Button variant="secondary" onClick={() => setSelectedPunchDay(null)}>
                Close
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 7. Bulk Approval Confirmation Modal (Spec Section 7) */}
      {showBulkApproveModal && (
        <Modal
          title={`Approve ${selectedIds.size} employees for ${formatMonthYear(selectedMonth)}?`}
          isOpen={true}
          onClose={() => setShowBulkApproveModal(false)}
          size="md"
        >
          <Stack gap="md">
            <p>
              {eligibleRecords.length} will be approved. {skippedRecords.length} with unresolved
              issues will be skipped.
            </p>

            {skippedRecords.length > 0 && (
              <Alert variant="warning" title="Skipped Records Preview">
                <Stack gap="xs">
                  {skippedRecords.slice(0, 5).map(({ row, reason }) => (
                    <span key={row.id}>
                      <strong>{row.employeeName}:</strong> {reason}
                    </span>
                  ))}
                  {skippedRecords.length > 5 && (
                    <span>...and {skippedRecords.length - 5} more.</span>
                  )}
                </Stack>
              </Alert>
            )}

            <Inline justify="end" gap="sm">
              <Button
                variant="outline"
                disabled={bulkSubmitting}
                onClick={() => setShowBulkApproveModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={bulkSubmitting || eligibleRecords.length === 0}
                onClick={handleExecuteBulkApprove}
              >
                {bulkSubmitting ? 'Approving...' : 'Approve'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* Skipped Records Detail Modal */}
      {showSkippedRecordsModal && (
        <Modal
          title={`Skipped records for ${formatMonthYear(selectedMonth)}`}
          isOpen={true}
          onClose={() => setShowSkippedRecordsModal(false)}
          size="md"
        >
          <Stack gap="md">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Reason</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {skippedRecords.map(({ row, reason }) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <strong>{row.employeeName}</strong> ({row.employeeCode})
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning">{reason}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Inline justify="end">
              <Button variant="secondary" onClick={() => setShowSkippedRecordsModal(false)}>
                Close
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 8. Freeze Period Confirmation Modal (Spec Section 8) */}
      {showFreezeModal && (
        <Modal
          title={`Freeze attendance for ${formatMonthYear(selectedMonth)}?`}
          isOpen={true}
          onClose={() => setShowFreezeModal(false)}
          size="md"
        >
          <Stack gap="md">
            <p>
              Attendance will become read-only and be sent to payroll. Later corrections will go to
              the arrears register.
            </p>

            <Inline justify="end" gap="sm">
              <Button
                variant="outline"
                disabled={freezeSubmitting}
                onClick={() => setShowFreezeModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={freezeSubmitting}
                onClick={handleExecuteFreezePeriod}
              >
                {freezeSubmitting ? 'Freezing...' : 'Freeze'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* Send Back / Correction Modal (Spec Section 6) */}
      {sendBackTarget && (
        <Modal
          title={`Send Back — ${sendBackTarget.employeeName}`}
          isOpen={true}
          onClose={() => setSendBackTarget(null)}
          size="md"
        >
          <Stack gap="md">
            <p>
              Return monthly attendance summary for <strong>{sendBackTarget.employeeName}</strong> (
              {sendBackTarget.month}) for correction.
            </p>
            <Input
              placeholder="Enter reason for sending back..."
              value={sendBackNotes}
              onChange={(e) => setSendBackNotes(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button
                variant="outline"
                disabled={sendBackSubmitting}
                onClick={() => setSendBackTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={sendBackSubmitting}
                onClick={handleSubmitSendBack}
              >
                {sendBackSubmitting ? 'Submitting...' : 'Send Back'}
              </Button>
            </Inline>
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
                variant="outline"
                disabled={exporting}
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" disabled={exporting} onClick={handleExecuteExport}>
                {exporting ? 'Exporting...' : 'Export'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
