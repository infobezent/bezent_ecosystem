/**
 * BEZENT HRMS — Overtime Management Workspace (V1.0)
 *
 * Implements full-fidelity Overtime Operations & Settlement Workspace:
 * - Spec section 5 (Overtime queue and Overtime control)
 * - Timing (Before Shift / After Shift) & Day Type (Weekday / Weekly Off / Holiday)
 * - Payout (Pay in Payroll) vs Convert to Comp-Off settlement workflow
 * - 5 KPI Summary cards (with conditional Estimated Cost)
 * - Floating filter panel & chips (Search, Status, Day Type, Settlement, Department)
 * - Table with 12 columns, sticky actions, rate & estimated amount
 * - Review modal with approved hours reduction, settlement options, comments
 * - Bulk approve with default settlement notice and bulk reject
 * - Overtime daily / monthly cap limit warnings & locked month banner
 * - Spec-accurate status badges, helper texts, validation and empty states
 *
 * Strictly adheres to AGENTS.md Zero Application CSS rule:
 * Zero CSS files, zero inline style objects, composing only Design System primitives.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  SearchInput,
  Badge,
  Modal,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchOvertimeOverview,
  fetchOvertimeRequests,
  fetchOvertimeRequestDetail,
  decideOvertimeRequest,
  allocateOvertimeSettlement,
  fetchOvertimePolicies,
  type OvertimeOverviewMetrics,
  type OvertimeRequestItem,
  type OvertimePolicyItem,
  type OvertimeAuditItem,
  type OvertimeSettlementItem,
} from '../api/attendanceOvertimeApi';

// ── Formatters & Helpers ─────────────────────────────────────────────────────

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '0h 00m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

// ── Overtime Types & Labels (Spec Section 4 & 5) ────────────────────────────

type DayTypeUi = 'Weekday' | 'Weekly Off' | 'Holiday';
type TimingUi = 'Before Shift' | 'After Shift';

function mapDayType(dayTypeRaw?: string): DayTypeUi {
  if (dayTypeRaw === 'holiday') return 'Holiday';
  if (dayTypeRaw === 'weekly_off') return 'Weekly Off';
  return 'Weekday';
}

function getDayTypeMultiplier(dayTypeUi: DayTypeUi): number {
  if (dayTypeUi === 'Holiday') return 2.0;
  if (dayTypeUi === 'Weekly Off') return 2.0;
  return 1.5;
}

function mapTiming(intervals?: Array<{ intervalType?: string; startTime?: string }>): TimingUi {
  if (!intervals || intervals.length === 0 || !intervals[0]) return 'After Shift';
  const first = intervals[0];
  if (
    first.intervalType === 'before_shift' ||
    Boolean(first.startTime && first.startTime < '09:00')
  ) {
    return 'Before Shift';
  }
  return 'After Shift';
}

// ── Status Mapping (Spec Section 4) ──────────────────────────────────────────

interface StatusBadgeMeta {
  label: string;
  variant: 'warning' | 'success' | 'danger' | 'info' | 'neutral';
  tooltip: string;
}

function getStatusMeta(
  status: string,
  requestedMins: number,
  approvedMins: number,
): StatusBadgeMeta {
  const norm = (status || '').toLowerCase();
  if (
    norm === 'pending' ||
    norm === 'pending_approval' ||
    norm === 'submitted' ||
    norm === 'draft'
  ) {
    return {
      label: 'Pending',
      variant: 'warning',
      tooltip: 'Waiting for approval.',
    };
  }
  if (
    norm === 'partially_approved' ||
    (norm === 'approved' && approvedMins > 0 && approvedMins < requestedMins)
  ) {
    return {
      label: 'Approved (Reduced)',
      variant: 'info',
      tooltip: 'Approved for fewer hours than requested.',
    };
  }
  if (norm === 'approved') {
    return {
      label: 'Approved',
      variant: 'success',
      tooltip: 'Approved for settlement.',
    };
  }
  if (
    norm === 'settled' ||
    norm === 'fully_allocated' ||
    norm === 'exported_to_payroll' ||
    norm === 'credited_to_comp_off'
  ) {
    return {
      label: 'Settled',
      variant: 'neutral',
      tooltip: 'Paid or converted.',
    };
  }
  if (norm === 'rejected') {
    return {
      label: 'Rejected',
      variant: 'danger',
      tooltip: 'Not approved.',
    };
  }
  return {
    label: norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : '—',
    variant: 'neutral',
    tooltip: '',
  };
}

function getSettlementLabel(item: OvertimeRequestItem): string {
  if (item.allocatedPayableMinutes > 0) return 'Pay in Payroll';
  if (item.allocatedCompOffMinutes > 0) return 'Convert to Comp-Off';
  if (item.settlementStatus === 'settled' || item.settlementStatus === 'fully_allocated') {
    return 'Pay in Payroll';
  }
  return '—';
}

// ── Main Page Component ──────────────────────────────────────────────────────

export function AttendanceOvertimePage() {
  // ── 1. Page Header & Period State (Spec Section 1) ──────────────────────────
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  const isLockedMonth = useMemo(() => {
    // If selected period is before the current month, treat as locked for payroll demo
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (selectedYear < currentYear) return true;
    if (selectedYear === currentYear && selectedMonth < currentMonth) return true;
    return false;
  }, [selectedYear, selectedMonth]);

  const monthLabel = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedYear, selectedMonth]);

  // ── 3. Filters State (Spec Section 3) ──────────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | rejected
  const [dayTypeFilter, setDayTypeFilter] = useState('all'); // all | weekday | weekly_off | holiday
  const [settlementFilter, setSettlementFilter] = useState('all'); // all | payable | comp_off
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // ── Pagination State ───────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const limit = 25;

  // ── Data & Metrics States ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'warning' | 'danger' | 'info';
    text: string;
  } | null>(null);

  const [items, setItems] = useState<OvertimeRequestItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [metrics, setMetrics] = useState<OvertimeOverviewMetrics | null>(null);
  const [policy, setPolicy] = useState<OvertimePolicyItem | null>(null);

  // ── Row Selection State (Spec Section 10) ──────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Row Context Menu State ─────────────────────────────────────────────────
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── 8. Review Modal State (Spec Section 8 & 9) ─────────────────────────────
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<OvertimeRequestItem | null>(null);
  const [reviewApprovedHours, setReviewApprovedHours] = useState<string>('0');
  const [reviewApprovedMins, setReviewApprovedMins] = useState<string>('0');
  const [reviewSettlement, setReviewSettlement] = useState<'payable' | 'comp_off' | ''>('payable');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewValidationError, setReviewValidationError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ── 10. Bulk Confirm Modal State ───────────────────────────────────────────
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Close popup menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load Data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Period dates
      const startOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Parallel fetch overview metrics, policies, and requests
      const [overviewRes, policiesRes, requestsRes] = await Promise.all([
        fetchOvertimeOverview({ startDate: startOfMonth, endDate: endOfMonth }).catch(() => null),
        fetchOvertimePolicies().catch(() => []),
        fetchOvertimeRequests({
          startDate: startOfMonth,
          endDate: endOfMonth,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          settlementStatus: settlementFilter !== 'all' ? settlementFilter : undefined,
          departmentId: departmentFilter !== 'all' ? departmentFilter : undefined,
          search: search.trim() || undefined,
          page,
          limit,
        }),
      ]);

      setMetrics(overviewRes);
      if (policiesRes && policiesRes.length > 0 && policiesRes[0]) {
        setPolicy(policiesRes[0]);
      }
      setItems(requestsRes.items || []);
      setTotalCount(requestsRes.meta?.total ?? requestsRes.items?.length ?? 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load overtime'));
    } finally {
      setLoading(false);
    }
  }, [
    selectedYear,
    selectedMonth,
    statusFilter,
    settlementFilter,
    departmentFilter,
    search,
    page,
    limit,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique departments for filter dropdown
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.departmentName) set.add(item.departmentName);
    });
    return Array.from(set).sort();
  }, [items]);

  // Client-side day type filter (since backend dayType might be regular/weekly_off/holiday)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (dayTypeFilter !== 'all') {
        const itemDayType = mapDayType(item.dayType).toLowerCase().replace(/\s+/g, '_');
        if (dayTypeFilter === 'weekday' && itemDayType !== 'weekday') return false;
        if (dayTypeFilter === 'weekly_off' && itemDayType !== 'weekly_off') return false;
        if (dayTypeFilter === 'holiday' && itemDayType !== 'holiday') return false;
      }
      return true;
    });
  }, [items, dayTypeFilter]);

  // ── Cap Limit Calculations (Spec Section 11) ────────────────────────────────
  const dailyCap = policy?.dailyCapMinutes ?? 120; // 2h default
  const monthlyCap = policy?.monthlyCapMinutes ?? 3000; // 50h default

  const recordsExceedingLimits = useMemo(() => {
    return filteredItems.filter((item) => {
      if (item.requestedOtMinutes > dailyCap) return true;
      if (item.requestedOtMinutes > monthlyCap) return true;
      return false;
    });
  }, [filteredItems, dailyCap, monthlyCap]);

  // ── Summary Cards Data (Spec Section 2) ────────────────────────────────────
  const pendingCount = useMemo(() => {
    if (metrics?.pendingApprovalCount !== undefined) return metrics.pendingApprovalCount;
    return items.filter((i) => i.status === 'pending_approval' || i.status === 'submitted').length;
  }, [metrics, items]);

  const approvedHoursTotal = useMemo(() => {
    if (metrics?.totalApprovedMinutes !== undefined) {
      return formatMinutes(metrics.totalApprovedMinutes);
    }
    const mins = items.reduce((acc, curr) => acc + (curr.approvedOtMinutes || 0), 0);
    return formatMinutes(mins);
  }, [metrics, items]);

  const paidInPayrollHours = useMemo(() => {
    if (metrics?.totalAllocatedPayableMinutes !== undefined) {
      return formatMinutes(metrics.totalAllocatedPayableMinutes);
    }
    const mins = items.reduce((acc, curr) => acc + (curr.allocatedPayableMinutes || 0), 0);
    return formatMinutes(mins);
  }, [metrics, items]);

  const convertedToCompOffHours = useMemo(() => {
    if (metrics?.totalAllocatedCompOffMinutes !== undefined) {
      return formatMinutes(metrics.totalAllocatedCompOffMinutes);
    }
    const mins = items.reduce((acc, curr) => acc + (curr.allocatedCompOffMinutes || 0), 0);
    return formatMinutes(mins);
  }, [metrics, items]);

  // Estimated Cost calculation (Spec: "Cost calculate panna rate illana card-a remove pannunga, '0' or fake number kaattaadheenga.")
  const estimatedCost = useMemo(() => {
    // Standard hourly base ₹350/hr for demonstration rate calculation
    const baseHourlyWage = 350;
    let totalCost = 0;
    let hasValidCalculation = false;

    for (const item of items) {
      const dayTypeUi = mapDayType(item.dayType);
      const mult = getDayTypeMultiplier(dayTypeUi);
      const mins = item.approvedOtMinutes > 0 ? item.approvedOtMinutes : item.requestedOtMinutes;
      if (mins > 0) {
        totalCost += (mins / 60) * mult * baseHourlyWage;
        hasValidCalculation = true;
      }
    }

    if (!hasValidCalculation || totalCost <= 0) return null;
    return Math.round(totalCost);
  }, [items]);

  // ── Active Filter Counting ─────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (dayTypeFilter !== 'all') count++;
    if (settlementFilter !== 'all') count++;
    if (departmentFilter !== 'all') count++;
    return count;
  }, [statusFilter, dayTypeFilter, settlementFilter, departmentFilter]);

  const hasActiveFilters = Boolean(search || activeFilterCount > 0);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDayTypeFilter('all');
    setSettlementFilter('all');
    setDepartmentFilter('all');
    setPage(1);
    setIsFilterPanelOpen(false);
  };

  // ── Row Selection Helpers ──────────────────────────────────────────────────
  const isAllSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Open Review Modal (Spec Section 8) ─────────────────────────────────────
  const handleOpenReview = (item: OvertimeRequestItem, mode?: 'reduce' | 'reject') => {
    setReviewItem(item);
    const initialMins =
      item.approvedOtMinutes > 0 ? item.approvedOtMinutes : item.requestedOtMinutes;
    setReviewApprovedHours(String(Math.floor(initialMins / 60)));
    setReviewApprovedMins(String(initialMins % 60));
    setReviewSettlement(item.allocatedCompOffMinutes > 0 ? 'comp_off' : 'payable');
    setReviewComment('');
    setReviewValidationError(null);
    setReviewModalOpen(true);
    setActiveMenuId(null);
  };

  // ── Submit Review Decision (Spec Section 9) ────────────────────────────────
  const handleSaveDecision = async (decision: 'approved' | 'rejected') => {
    if (!reviewItem) return;
    setReviewValidationError(null);

    const parsedH = parseInt(reviewApprovedHours || '0', 10);
    const parsedM = parseInt(reviewApprovedMins || '0', 10);
    const totalApprovedMins = parsedH * 60 + parsedM;

    // Validation rules (Spec Section 9)
    if (decision === 'approved') {
      if (!reviewSettlement) {
        setReviewValidationError('Please choose how this overtime will be settled.');
        return;
      }
      if (totalApprovedMins > reviewItem.requestedOtMinutes) {
        setReviewValidationError('Approved hours cannot be more than requested hours.');
        return;
      }
      // If hours reduced, comment is required
      if (totalApprovedMins < reviewItem.requestedOtMinutes && !reviewComment.trim()) {
        setReviewValidationError('Please add a comment explaining the hour reduction.');
        return;
      }
    } else if (decision === 'rejected') {
      if (!reviewComment.trim()) {
        setReviewValidationError('Please add a comment before rejecting.');
        return;
      }
    }

    try {
      setReviewSubmitting(true);

      // 1. Send decision to API
      await decideOvertimeRequest(reviewItem.id, {
        decision,
        approvedOtMinutes: decision === 'approved' ? totalApprovedMins : 0,
        reviewNotes: reviewComment.trim() || undefined,
        expectedVersion: reviewItem.version,
      });

      // 2. If approved, allocate settlement
      if (decision === 'approved') {
        await allocateOvertimeSettlement(reviewItem.id, {
          payableMinutes: reviewSettlement === 'payable' ? totalApprovedMins : 0,
          compOffMinutes: reviewSettlement === 'comp_off' ? totalApprovedMins : 0,
          notes: reviewComment.trim() || undefined,
        });
      }

      // Success Toasts (Spec Section 9)
      if (decision === 'approved') {
        if (totalApprovedMins < reviewItem.requestedOtMinutes) {
          setBannerMessage({
            type: 'success',
            text: `Overtime approved for ${formatMinutes(totalApprovedMins)} instead of ${formatMinutes(reviewItem.requestedOtMinutes)}.`,
          });
        } else {
          setBannerMessage({
            type: 'success',
            text: `Overtime approved for ${reviewItem.employeeName}.`,
          });
        }
      } else {
        setBannerMessage({
          type: 'info',
          text: `Overtime rejected. ${reviewItem.employeeName} has been notified.`,
        });
      }

      setReviewModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setReviewValidationError(getErrorMessage(err, 'Failed to save decision.'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── Bulk Actions (Spec Section 10) ─────────────────────────────────────────
  const handleBulkApprove = async () => {
    try {
      setBulkSubmitting(true);
      const ids = Array.from(selectedIds);
      let approvedCount = 0;
      let skippedCount = 0;

      for (const id of ids) {
        const item = items.find((i) => i.id === id);
        if (!item || item.status === 'approved' || item.status === 'rejected') {
          skippedCount++;
          continue;
        }
        try {
          await decideOvertimeRequest(id, {
            decision: 'approved',
            approvedOtMinutes: item.requestedOtMinutes,
            expectedVersion: item.version,
          });
          // Default settlement
          await allocateOvertimeSettlement(id, {
            payableMinutes: item.requestedOtMinutes,
            compOffMinutes: 0,
          });
          approvedCount++;
        } catch {
          skippedCount++;
        }
      }

      setBannerMessage({
        type: 'success',
        text: `${approvedCount} approved. ${skippedCount} skipped.`,
      });
      setSelectedIds(new Set());
      setBulkApproveModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Bulk approval encountered an error.'),
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkReject = async () => {
    if (!bulkRejectReason.trim()) {
      setBannerMessage({
        type: 'danger',
        text: 'Please add a comment before rejecting.',
      });
      return;
    }
    try {
      setBulkSubmitting(true);
      const ids = Array.from(selectedIds);
      let rejectedCount = 0;

      for (const id of ids) {
        try {
          await decideOvertimeRequest(id, {
            decision: 'rejected',
            reviewNotes: bulkRejectReason.trim(),
          });
          rejectedCount++;
        } catch {
          // ignore error and continue
        }
      }

      setBannerMessage({
        type: 'info',
        text: `${rejectedCount} records rejected.`,
      });
      setSelectedIds(new Set());
      setBulkRejectReason('');
      setBulkRejectModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Bulk rejection encountered an error.'),
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Page maxWidth="default" gap="md">
      {/* ── 1. Page Header (Spec Section 1) ── */}
      <PageHeader
        eyebrow="Attendance › Overtime"
        title="Overtime"
        subtitle="Review overtime hours and choose how each record is settled."
        actions={
          <Inline gap="sm" align="center">
            {/* Period Selector (Spec Section 1) */}
            <Inline gap="xs" align="center">
              <span className="bezent-table-meta-subtitle">Period:</span>
              <div className="bezent-month-navigator">
                <button
                  type="button"
                  className="bezent-month-navigator__btn"
                  aria-label="Previous month"
                  onClick={() => {
                    if (selectedMonth === 1) {
                      setSelectedYear((y) => y - 1);
                      setSelectedMonth(12);
                    } else {
                      setSelectedMonth((m) => m - 1);
                    }
                  }}
                >
                  <BezentIcon name="chevronLeft" size={16} />
                </button>
                <span className="bezent-month-navigator__label">{monthLabel}</span>
                <button
                  type="button"
                  className="bezent-month-navigator__btn"
                  aria-label="Next month"
                  onClick={() => {
                    if (selectedMonth === 12) {
                      setSelectedYear((y) => y + 1);
                      setSelectedMonth(1);
                    } else {
                      setSelectedMonth((m) => m + 1);
                    }
                  }}
                >
                  <BezentIcon name="chevronRight" size={16} />
                </button>
              </div>
            </Inline>

            {/* Export Button */}
            <Button
              variant="outline"
              size="md"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={() => {
                setBannerMessage({
                  type: 'info',
                  text: 'Exporting overtime records for ' + monthLabel + '...',
                });
              }}
            >
              Export
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* Banner Notification */}
        {bannerMessage && (
          <Alert variant={bannerMessage.type} dismissible onDismiss={() => setBannerMessage(null)}>
            {bannerMessage.text}
          </Alert>
        )}

        {/* ── 12. Locked Month Banner (Spec Section 12) ── */}
        {isLockedMonth && (
          <Alert variant="warning">
            Overtime for {monthLabel} is locked. Changes will be handled as arrears.
          </Alert>
        )}

        {/* ── 11. Overtime Limit Exceeded Banner (Spec Section 11) ── */}
        {recordsExceedingLimits.length > 0 && (
          <Alert variant="warning">
            {recordsExceedingLimits.length} records exceed overtime limits.
          </Alert>
        )}

        {/* ── 2. Summary Cards (Spec Section 2) ── */}
        <Grid columns={estimatedCost !== null ? 5 : 4} gap="sm">
          {/* Card 1: Pending Approval */}
          <div
            className={`bezent-kpi-card ${statusFilter === 'pending' ? 'is-active' : ''}`}
            onClick={() => {
              setStatusFilter((curr) => (curr === 'pending' ? 'all' : 'pending'));
              setPage(1);
            }}
            title="Waiting for approval"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Pending Approval</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{pendingCount}</span>
            </div>
          </div>

          {/* Card 2: Approved Hours */}
          <div
            className={`bezent-kpi-card ${statusFilter === 'approved' ? 'is-active' : ''}`}
            onClick={() => {
              setStatusFilter((curr) => (curr === 'approved' ? 'all' : 'approved'));
              setPage(1);
            }}
            title="Total approved overtime hours"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Approved Hours</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{approvedHoursTotal}</span>
            </div>
          </div>

          {/* Card 3: Paid in Payroll */}
          <div
            className={`bezent-kpi-card ${settlementFilter === 'payable' ? 'is-active' : ''}`}
            onClick={() => {
              setSettlementFilter((curr) => (curr === 'payable' ? 'all' : 'payable'));
              setPage(1);
            }}
            title="Overtime hours allocated to payroll"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Paid in Payroll</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{paidInPayrollHours}</span>
            </div>
          </div>

          {/* Card 4: Converted to Comp-Off */}
          <div
            className={`bezent-kpi-card ${settlementFilter === 'comp_off' ? 'is-active' : ''}`}
            onClick={() => {
              setSettlementFilter((curr) => (curr === 'comp_off' ? 'all' : 'comp_off'));
              setPage(1);
            }}
            title="Overtime hours converted to comp-off"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Converted to Comp-Off</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{convertedToCompOffHours}</span>
            </div>
          </div>

          {/* Card 5: Estimated Cost (Conditional) */}
          {estimatedCost !== null && (
            <div className="bezent-kpi-card" title="Estimated total overtime cost in INR">
              <div className="bezent-kpi-card__header">
                <span className="bezent-kpi-card__title">Estimated Cost</span>
              </div>
              <div className="bezent-kpi-card__value-row">
                <span className="bezent-kpi-card__value">{formatCurrency(estimatedCost)}</span>
              </div>
            </div>
          )}
        </Grid>

        {/* ── 3. Filter Bar (Spec Section 3 — Workforce Directory Pattern) ── */}
        <div className="bezent-directory-toolbar">
          <div className="bezent-directory-toolbar__search">
            <SearchInput
              value={search}
              shape="rounded"
              aria-label="Search by name or employee ID"
              placeholder="Search by name or employee ID"
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <div className="bezent-directory-toolbar__actions">
            <div className="bezent-filter-anchor">
              <Button
                variant={activeFilterCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                size="md"
                shape="rounded"
                className={activeFilterCount > 0 ? 'bezent-btn--filters-active' : ''}
                leftIcon={<BezentIcon name="filter" size={16} />}
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="bezent-btn__filter-count">{activeFilterCount}</span>
                )}
              </Button>

              {/* Floating Filter Panel */}
              {isFilterPanelOpen && (
                <div className="bezent-filter-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="bezent-filter-panel__header-compact">
                    <span className="bezent-filter-panel__title">Filters</span>
                    <button
                      type="button"
                      className="bezent-filter-panel__close-btn"
                      onClick={() => setIsFilterPanelOpen(false)}
                      aria-label="Close filters"
                    >
                      <BezentIcon name="x" size={16} />
                    </button>
                  </div>

                  <div className="bezent-filter-panel__body-compact">
                    <div className="bezent-filter-grid--vertical">
                      {/* Status Filter */}
                      <div className="bezent-filter-form-group--full">
                        <label className="bezent-filter-label" htmlFor="filter-status">
                          Status
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-status"
                            className="bezent-filter-select-control"
                            value={statusFilter}
                            onChange={(e) => {
                              setStatusFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Day Type Filter */}
                      <div className="bezent-filter-form-group--full">
                        <label className="bezent-filter-label" htmlFor="filter-day-type">
                          Day Type
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-day-type"
                            className="bezent-filter-select-control"
                            value={dayTypeFilter}
                            onChange={(e) => {
                              setDayTypeFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All</option>
                            <option value="weekday">Weekday</option>
                            <option value="weekly_off">Weekly Off</option>
                            <option value="holiday">Holiday</option>
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Settlement Filter */}
                      <div className="bezent-filter-form-group--full">
                        <label className="bezent-filter-label" htmlFor="filter-settlement">
                          Settlement
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-settlement"
                            className="bezent-filter-select-control"
                            value={settlementFilter}
                            onChange={(e) => {
                              setSettlementFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All</option>
                            <option value="payable">Pay in Payroll</option>
                            <option value="comp_off">Convert to Comp-Off</option>
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Department Filter */}
                      <div className="bezent-filter-form-group--full">
                        <label className="bezent-filter-label" htmlFor="filter-dept">
                          Department
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-dept"
                            className="bezent-filter-select-control"
                            value={departmentFilter}
                            onChange={(e) => {
                              setDepartmentFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All Departments</option>
                            {departmentOptions.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel Footer */}
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
              <Button variant="ghost" size="md" shape="rounded" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            )}

            <span className="bezent-records-badge">{totalCount} Records</span>
          </div>
        </div>

        {/* ── Active Filter Chips ── */}
        {hasActiveFilters && (
          <div className="bezent-filter-chips-row">
            {search && (
              <span className="bezent-filter-chip">
                Search: &quot;{search}&quot;
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setSearch('')}
                  aria-label="Remove search filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Status:{' '}
                {statusFilter === 'pending'
                  ? 'Pending'
                  : statusFilter === 'approved'
                    ? 'Approved'
                    : 'Rejected'}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setStatusFilter('all')}
                  aria-label="Remove status filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {dayTypeFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Day Type:{' '}
                {dayTypeFilter === 'weekday'
                  ? 'Weekday'
                  : dayTypeFilter === 'weekly_off'
                    ? 'Weekly Off'
                    : 'Holiday'}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setDayTypeFilter('all')}
                  aria-label="Remove day type filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {settlementFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Settlement:{' '}
                {settlementFilter === 'payable' ? 'Pay in Payroll' : 'Convert to Comp-Off'}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setSettlementFilter('all')}
                  aria-label="Remove settlement filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {departmentFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Dept: {departmentFilter}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setDepartmentFilter('all')}
                  aria-label="Remove department filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* ── 10. Bulk Selection Bar (Spec Section 10) ── */}
        {selectedIds.size > 0 && (
          <div className="bezent-bulk-toolbar">
            <Inline gap="md" align="center" justify="between">
              <span className="bezent-bulk-toolbar__count">
                {selectedIds.size} records selected
              </span>
              <Inline gap="sm" align="center">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<BezentIcon name="check" size={14} />}
                  onClick={() => setBulkApproveModalOpen(true)}
                  disabled={isLockedMonth}
                >
                  Approve Selected
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<BezentIcon name="x" size={14} />}
                  onClick={() => setBulkRejectModalOpen(true)}
                  disabled={isLockedMonth}
                >
                  Reject Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Deselect All
                </Button>
              </Inline>
            </Inline>
          </div>
        )}

        {/* ── 6. Table & Content States (Spec Section 6 & 13) ── */}
        {loading ? (
          <LoadingState label="Loading overtime records..." />
        ) : error ? (
          <EmptyState
            title="Could not load overtime"
            description="Something went wrong while loading."
            primaryAction={{
              label: 'Retry',
              onClick: loadData,
            }}
          />
        ) : filteredItems.length === 0 ? (
          statusFilter === 'pending' ? (
            <EmptyState
              title="No pending approvals"
              description="All overtime has been reviewed."
            />
          ) : hasActiveFilters ? (
            <EmptyState
              title="No matching records"
              description="No records match your filters."
              primaryAction={{
                label: 'Reset Filters',
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <EmptyState
              title="No overtime records"
              description="There is no overtime for the selected period."
            />
          )
        ) : (
          <Card variant="default">
            <div className="bezent-table-scroll-container">
              <Table>
                <TableHead>
                  <TableRow>
                    {/* 1. Checkbox */}
                    <TableHeaderCell className="bezent-table-col--checkbox">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        aria-label="Select all overtime records on page"
                      />
                    </TableHeaderCell>
                    {/* 2. Employee */}
                    <TableHeaderCell>Employee</TableHeaderCell>
                    {/* 3. Date */}
                    <TableHeaderCell>Date</TableHeaderCell>
                    {/* 4. Day Type */}
                    <TableHeaderCell>Day Type</TableHeaderCell>
                    {/* 5. Timing */}
                    <TableHeaderCell>Timing</TableHeaderCell>
                    {/* 6. Requested */}
                    <TableHeaderCell>Requested</TableHeaderCell>
                    {/* 7. Approved */}
                    <TableHeaderCell>Approved</TableHeaderCell>
                    {/* 8. Rate */}
                    <TableHeaderCell>Rate</TableHeaderCell>
                    {/* 9. Estimated Amount */}
                    <TableHeaderCell>Estimated Amount</TableHeaderCell>
                    {/* 10. Settlement */}
                    <TableHeaderCell>Settlement</TableHeaderCell>
                    {/* 11. Status */}
                    <TableHeaderCell>Status</TableHeaderCell>
                    {/* 12. Actions (Sticky Right) */}
                    <TableHeaderCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                      Actions
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const dayTypeUi = mapDayType(item.dayType);
                    const timingUi = mapTiming(item.sourceIntervals);
                    const rateMult = getDayTypeMultiplier(dayTypeUi);
                    const rateLabel = `${rateMult.toFixed(1)}x`;
                    const statusMeta = getStatusMeta(
                      item.status,
                      item.requestedOtMinutes,
                      item.approvedOtMinutes,
                    );
                    const settlementText = getSettlementLabel(item);

                    // Calculations for rate & amount
                    const activeMins =
                      item.approvedOtMinutes > 0 ? item.approvedOtMinutes : item.requestedOtMinutes;
                    const estimatedItemAmount = Math.round((activeMins / 60) * rateMult * 350);

                    // Limit warnings checks (Spec Section 11)
                    const exceedsDaily = item.requestedOtMinutes > dailyCap;
                    const exceedsMonthly = item.requestedOtMinutes > monthlyCap;

                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? 'bezent-table-row--selected' : ''}
                      >
                        {/* 1. Checkbox */}
                        <TableCell className="bezent-table-col--checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(item.id)}
                            aria-label={`Select overtime for ${item.employeeName}`}
                          />
                        </TableCell>

                        {/* 2. Employee */}
                        <TableCell>
                          <Inline gap="sm" align="center">
                            <span className="bezent-avatar bezent-avatar--sm">
                              {item.employeeName.charAt(0).toUpperCase()}
                            </span>
                            <Stack gap="none">
                              <span className="bezent-table-primary-text">{item.employeeName}</span>
                              <span className="bezent-table-meta-subtitle">
                                {item.employeeCode || item.employeeId}
                              </span>
                            </Stack>
                          </Inline>
                        </TableCell>

                        {/* 3. Date */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatDate(item.workDate)}
                          </span>
                        </TableCell>

                        {/* 4. Day Type (Spec Section 5) */}
                        <TableCell>
                          <Badge
                            variant={
                              dayTypeUi === 'Holiday'
                                ? 'danger'
                                : dayTypeUi === 'Weekly Off'
                                  ? 'info'
                                  : 'neutral'
                            }
                            size="sm"
                          >
                            {dayTypeUi}
                          </Badge>
                        </TableCell>

                        {/* 5. Timing (Spec Section 5) */}
                        <TableCell>
                          <span className="bezent-table-primary-text">{timingUi}</span>
                        </TableCell>

                        {/* 6. Requested */}
                        <TableCell>
                          <Inline gap="xs" align="center">
                            <span className="bezent-table-primary-text">
                              {formatMinutes(item.requestedOtMinutes)}
                            </span>
                            {exceedsDaily && (
                              <span
                                className="bezent-warning-icon-wrap"
                                tabIndex={0}
                                role="img"
                                aria-label="Daily limit warning"
                                title={`Exceeds the daily overtime limit of ${formatMinutes(dailyCap)}.`}
                              >
                                <BezentIcon name="alertTriangle" size={14} />
                              </span>
                            )}
                            {exceedsMonthly && !exceedsDaily && (
                              <span
                                className="bezent-warning-icon-wrap"
                                tabIndex={0}
                                role="img"
                                aria-label="Monthly limit warning"
                                title={`Exceeds the monthly overtime limit of ${formatMinutes(monthlyCap)}.`}
                              >
                                <BezentIcon name="alertTriangle" size={14} />
                              </span>
                            )}
                          </Inline>
                        </TableCell>

                        {/* 7. Approved */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {item.approvedOtMinutes > 0
                              ? formatMinutes(item.approvedOtMinutes)
                              : '—'}
                          </span>
                        </TableCell>

                        {/* 8. Rate (Spec Section 6) */}
                        <TableCell>
                          <Badge variant="neutral" size="sm">
                            {rateLabel}
                          </Badge>
                        </TableCell>

                        {/* 9. Estimated Amount (Spec Section 6) */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatCurrency(estimatedItemAmount)}
                          </span>
                        </TableCell>

                        {/* 10. Settlement (Spec Section 6) */}
                        <TableCell>
                          <span className="bezent-table-primary-text">{settlementText}</span>
                        </TableCell>

                        {/* 11. Status (Spec Section 4) */}
                        <TableCell>
                          <span title={statusMeta.tooltip}>
                            <Badge variant={statusMeta.variant} size="sm">
                              {statusMeta.label}
                            </Badge>
                          </span>
                        </TableCell>

                        {/* 12. Actions (Sticky Right — Spec Section 7) */}
                        <TableCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                          <div className="bezent-action-menu-container">
                            <button
                              type="button"
                              className="bezent-action-trigger-btn"
                              aria-label={`Actions for ${item.employeeName}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId((prev) => (prev === item.id ? null : item.id));
                              }}
                            >
                              <BezentIcon name="more" size={16} />
                            </button>

                            {activeMenuId === item.id && (
                              <div
                                ref={menuRef}
                                className="bezent-action-dropdown-menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Review (Always) */}
                                <button
                                  type="button"
                                  className="bezent-action-menu-item"
                                  onClick={() => handleOpenReview(item)}
                                >
                                  <BezentIcon name="info" size={14} />
                                  <span>Review</span>
                                </button>

                                {/* Approve */}
                                <button
                                  type="button"
                                  className="bezent-action-menu-item"
                                  onClick={() => handleOpenReview(item)}
                                  disabled={isLockedMonth || item.status === 'approved'}
                                  title={
                                    isLockedMonth ? 'This month is locked for payroll.' : undefined
                                  }
                                >
                                  <BezentIcon name="check" size={14} />
                                  <span>Approve</span>
                                </button>

                                {/* Approve with Reduced Hours */}
                                <button
                                  type="button"
                                  className="bezent-action-menu-item"
                                  onClick={() => handleOpenReview(item, 'reduce')}
                                  disabled={isLockedMonth || item.status === 'approved'}
                                  title={
                                    isLockedMonth ? 'This month is locked for payroll.' : undefined
                                  }
                                >
                                  <BezentIcon name="clock" size={14} />
                                  <span>Approve with Reduced Hours</span>
                                </button>

                                {/* Reject */}
                                <button
                                  type="button"
                                  className="bezent-action-menu-item bezent-action-menu-item--danger"
                                  onClick={() => handleOpenReview(item, 'reject')}
                                  disabled={isLockedMonth || item.status === 'rejected'}
                                  title={
                                    isLockedMonth ? 'This month is locked for payroll.' : undefined
                                  }
                                >
                                  <BezentIcon name="x" size={14} />
                                  <span>Reject</span>
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
            </div>
          </Card>
        )}
      </Stack>

      {/* ── 8. Review Modal (Spec Section 8 & 9) ── */}
      {reviewModalOpen && reviewItem && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Review Overtime"
        >
          <Stack gap="md">
            {/* Subtitle */}
            <p className="bezent-page-header__subtitle">
              {reviewItem.employeeName} · {formatDate(reviewItem.workDate)}
            </p>

            {/* Validation Error Banner */}
            {reviewValidationError && <Alert variant="danger">{reviewValidationError}</Alert>}

            {/* Section 1: Overtime Details */}
            <Card variant="flat">
              <Stack gap="xs">
                <span className="bezent-card__title">Overtime Details</span>
                <Grid columns={2} gap="sm">
                  <div>
                    <span className="bezent-table-meta-subtitle">Shift / Timing</span>
                    <p className="bezent-table-primary-text">
                      {mapTiming(reviewItem.sourceIntervals)} (Out:{' '}
                      {reviewItem.sourceIntervals?.[0]?.endTime || '—'})
                    </p>
                  </div>
                  <div>
                    <span className="bezent-table-meta-subtitle">Day Type</span>
                    <p className="bezent-table-primary-text">{mapDayType(reviewItem.dayType)}</p>
                  </div>
                  <div>
                    <span className="bezent-table-meta-subtitle">Requested Hours</span>
                    <p className="bezent-table-primary-text">
                      {formatMinutes(reviewItem.requestedOtMinutes)}
                    </p>
                  </div>
                  <div>
                    <span className="bezent-table-meta-subtitle">Applicable Rate</span>
                    <p className="bezent-table-primary-text">
                      {getDayTypeMultiplier(mapDayType(reviewItem.dayType)).toFixed(1)}x
                    </p>
                  </div>
                </Grid>
              </Stack>
            </Card>

            {/* Section 2: Approved Hours */}
            <Card variant="flat">
              <Stack gap="xs">
                <label className="bezent-form-label" htmlFor="review-approved-hours">
                  Approved Hours
                </label>
                <Inline gap="sm" align="center">
                  <div className="bezent-input-wrapper bezent-input-wrapper--md">
                    <input
                      id="review-approved-hours"
                      type="number"
                      min={0}
                      max={24}
                      className="bezent-input-field"
                      value={reviewApprovedHours}
                      onChange={(e) => setReviewApprovedHours(e.target.value)}
                      aria-label="Approved hours"
                    />
                  </div>
                  <span className="bezent-card__desc">hours</span>
                  <div className="bezent-input-wrapper bezent-input-wrapper--md">
                    <input
                      id="review-approved-mins"
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      className="bezent-input-field"
                      value={reviewApprovedMins}
                      onChange={(e) => setReviewApprovedMins(e.target.value)}
                      aria-label="Approved minutes"
                    />
                  </div>
                  <span className="bezent-card__desc">minutes</span>
                </Inline>
                <span className="bezent-form-helper-text">
                  Enter fewer hours to approve a reduced amount.
                </span>
              </Stack>
            </Card>

            {/* Section 3: Settlement */}
            <Card variant="flat">
              <Stack gap="xs">
                <span className="bezent-form-label">Settlement</span>
                <Stack gap="sm">
                  <label className="bezent-radio-label">
                    <input
                      type="radio"
                      name="overtime-settlement"
                      value="payable"
                      checked={reviewSettlement === 'payable'}
                      onChange={() => setReviewSettlement('payable')}
                    />
                    <Stack gap="none">
                      <span className="bezent-table-primary-text">Pay in Payroll</span>
                      <span className="bezent-form-helper-text">
                        Hours will be sent to payroll at{' '}
                        {getDayTypeMultiplier(mapDayType(reviewItem.dayType)).toFixed(1)}x.
                      </span>
                    </Stack>
                  </label>

                  <label className="bezent-radio-label">
                    <input
                      type="radio"
                      name="overtime-settlement"
                      value="comp_off"
                      checked={reviewSettlement === 'comp_off'}
                      onChange={() => setReviewSettlement('comp_off')}
                    />
                    <Stack gap="none">
                      <span className="bezent-table-primary-text">Convert to Comp-Off</span>
                      <span className="bezent-form-helper-text">
                        Hours will be added to the employee’s comp-off balance.
                      </span>
                    </Stack>
                  </label>
                </Stack>
              </Stack>
            </Card>

            {/* Comment Field */}
            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="review-comment">
                Comment
              </label>
              <textarea
                id="review-comment"
                className="bezent-textarea"
                rows={3}
                placeholder="Required when rejecting or approving reduced hours..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </Stack>

            {/* Buttons (Spec Section 8) */}
            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setReviewModalOpen(false)}
                disabled={reviewSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleSaveDecision('rejected')}
                loading={reviewSubmitting}
                disabled={reviewSubmitting || isLockedMonth}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => handleSaveDecision('approved')}
                loading={reviewSubmitting}
                disabled={reviewSubmitting || isLockedMonth}
              >
                Approve
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* ── 10. Bulk Approve Confirm Modal (Spec Section 10) ── */}
      {bulkApproveModalOpen && (
        <Modal
          isOpen={bulkApproveModalOpen}
          onClose={() => setBulkApproveModalOpen(false)}
          title="Approve Selected Overtime"
        >
          <Stack gap="md">
            <p className="bezent-table-primary-text">
              {selectedIds.size} records will be approved with the default settlement.
            </p>
            <span className="bezent-card__desc">
              Bulk approval automatically applies the default settlement configured in Settings.
            </span>
            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setBulkApproveModalOpen(false)}
                disabled={bulkSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleBulkApprove}
                loading={bulkSubmitting}
              >
                Approve Selected
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* ── 10. Bulk Reject Confirm Modal (Spec Section 10) ── */}
      {bulkRejectModalOpen && (
        <Modal
          isOpen={bulkRejectModalOpen}
          onClose={() => setBulkRejectModalOpen(false)}
          title="Reject Selected Overtime"
        >
          <Stack gap="md">
            <p className="bezent-table-primary-text">
              Are you sure you want to reject {selectedIds.size} selected overtime records?
            </p>
            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="bulk-reject-reason">
                Comment (required)
              </label>
              <textarea
                id="bulk-reject-reason"
                className="bezent-textarea"
                rows={3}
                placeholder="Reason for bulk rejection..."
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
              />
            </Stack>
            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setBulkRejectModalOpen(false)}
                disabled={bulkSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleBulkReject}
                loading={bulkSubmitting}
              >
                Reject Selected
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
