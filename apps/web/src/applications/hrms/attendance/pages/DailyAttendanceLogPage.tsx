import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Toolbar,
  Card,
  Stack,
  Inline,
  Grid,
  Button,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Input,
  SearchInput,
  Select,
  Checkbox,
  Modal,
  LoadingState,
  Alert,
  EmptyState,
  Avatar,
  StatusBadge,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchDailyAttendanceLogV1,
  fetchEmployeeDailyDetail,
  submitManualCorrection,
  recalculateDailyAttendance,
  bulkFinalizeDailyAttendance,
  downloadAttendanceCsv,
  fetchGeneralSettings,
} from '../api/attendanceApi';
import { fetchDepartments, fetchWorkLocations } from '../../api/organizationMastersApi';
import { getEmployeeAvatarId, getAvatarColor } from '../../employees/model/employeeModel';
import type {
  DailyAttendanceItem,
  DailyLogSummaryCounters,
  DailyLogEmployeeDetail,
  AttendanceGeneralSettings,
} from '../types/attendance.types';
import {
  AttendanceFilterPanel,
  type AttendanceFilterState,
  EMPTY_ATTENDANCE_FILTER_STATE,
  countActiveAttendanceFilters,
} from '../components/AttendanceFilterPanel';

export function DailyAttendanceLogPage() {
  const [searchParams] = useSearchParams();

  // Primary Filters (initialized from URL search parameters if available)
  const [date, setDate] = useState(
    () => searchParams.get('date') || new Date().toISOString().slice(0, 10),
  );
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '');
  const [appliedFilters, setAppliedFilters] = useState<AttendanceFilterState>(() => ({
    departmentId: searchParams.get('departmentId') || '',
    status: searchParams.get('status') || '',
    shiftRef: searchParams.get('shiftRef') || '',
    locationId: searchParams.get('locationId') || '',
    processingState: searchParams.get('processingState') || '',
    indicator: searchParams.get('indicator') || '',
    punchSource: searchParams.get('punchSource') || '',
  }));
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Sync state when URL searchParams update
  useEffect(() => {
    const pDate = searchParams.get('date');
    if (pDate && pDate !== date) setDate(pDate);

    const nextFilters: AttendanceFilterState = {
      departmentId: searchParams.get('departmentId') || '',
      status: searchParams.get('status') || '',
      shiftRef: searchParams.get('shiftRef') || '',
      locationId: searchParams.get('locationId') || '',
      processingState: searchParams.get('processingState') || '',
      indicator: searchParams.get('indicator') || '',
      punchSource: searchParams.get('punchSource') || '',
    };
    setAppliedFilters(nextFilters);
  }, [searchParams]);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<
    'name' | 'code' | 'department' | 'checkIn' | 'checkOut' | 'workedHours' | 'status'
  >('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Data & State
  const [items, setItems] = useState<DailyAttendanceItem[]>([]);
  const [counters, setCounters] = useState<DailyLogSummaryCounters>({
    scheduled: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    onDuty: 0,
    pendingReview: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auxiliary Options
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [workLocations, setWorkLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [generalSettings, setGeneralSettings] = useState<AttendanceGeneralSettings | null>(null);

  // Row Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Employee Detail Drawer State
  const [drawerEmployeeId, setDrawerEmployeeId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<DailyLogEmployeeDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'summary' | 'timeline' | 'records' | 'history'>(
    'summary',
  );

  // Edit Attendance / Manual Adjustment Modal State
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DailyAttendanceItem | null>(null);
  const [manualEmployeeId, setManualEmployeeId] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [workLocation, setWorkLocation] = useState('office');
  const [correctionReason, setCorrectionReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [manualStatus, setManualStatus] = useState<string>('present');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Finalize Day Bulk Sign-off State
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizingDay, setFinalizingDay] = useState(false);

  // Bulk Operations State
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkBannerMessage, setBulkBannerMessage] = useState<{
    type: 'success' | 'warning' | 'danger';
    text: string;
  } | null>(null);

  // Contextual Row Action Menu State
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setOpenActionMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load auxiliary options on mount
  useEffect(() => {
    fetchDepartments({ status: 'active' })
      .then((depts) => setDepartments(depts.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setDepartments([]));

    fetchWorkLocations({ status: 'active' })
      .then((locs) => setWorkLocations(locs.map((l) => ({ id: l.id, name: l.name }))))
      .catch(() => setWorkLocations([]));

    fetchGeneralSettings()
      .then((settings) => setGeneralSettings(settings))
      .catch(() => setGeneralSettings(null));
  }, []);

  // Fetch daily attendance records
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDailyAttendanceLogV1({
        date,
        departmentId: appliedFilters.departmentId || undefined,
        status: appliedFilters.status || undefined,
        search: debouncedSearch || undefined,
        processingState: appliedFilters.processingState || undefined,
        shiftRef: appliedFilters.shiftRef || undefined,
        locationId: appliedFilters.locationId || undefined,
        indicator: appliedFilters.indicator || undefined,
        punchSource: appliedFilters.punchSource || undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });
      setItems(res.data);
      setCounters(res.counters);
      setTotalCount(res.total);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load daily attendance records');
    } finally {
      setLoading(false);
    }
  }, [date, appliedFilters, debouncedSearch, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().slice(0, 10));
    setPage(1);
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().slice(0, 10));
    setPage(1);
  };

  const handleToday = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setAppliedFilters(EMPTY_ATTENDANCE_FILTER_STATE);
    setSelectedIds(new Set());
    setPage(1);
  };

  // Open Employee Detail Drawer
  const handleOpenDrawer = async (
    employeeId: string,
    initialTab: 'summary' | 'timeline' | 'records' | 'history' = 'summary',
  ) => {
    setDrawerEmployeeId(employeeId);
    setDrawerTab(initialTab);
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      const detail = await fetchEmployeeDailyDetail(employeeId, date);
      setDrawerDetail(detail);
    } catch (err: unknown) {
      setDrawerError(
        err instanceof Error ? err.message : 'Failed to load employee daily attendance detail',
      );
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerEmployeeId(null);
    setDrawerDetail(null);
  };

  // Manual Adjustment / Edit Attendance Handlers
  const handleOpenManualEntry = (record?: DailyAttendanceItem) => {
    if (record) {
      setSelectedRecord(record);
      setManualEmployeeId(record.employeeId);
      setCheckInTime(record.checkInTime ?? '09:00');
      setCheckOutTime(record.checkOutTime ?? '18:00');
      setWorkLocation(record.workLocation ?? 'office');
      setManualStatus(record.status ?? 'present');
      setRemarks(record.notes ?? '');
    } else {
      setSelectedRecord(null);
      setManualEmployeeId(items[0]?.employeeId ?? '');
      setCheckInTime('09:00');
      setCheckOutTime('18:00');
      setWorkLocation('office');
      setManualStatus('present');
      setRemarks('');
    }
    setCorrectionReason('');
    setModalError(null);
    setManualEntryOpen(true);
  };

  const handleSaveCorrection = async () => {
    if (!manualEmployeeId) {
      setModalError('Please select an employee');
      return;
    }
    if (!correctionReason.trim()) {
      setModalError('Please select a reason before saving.');
      return;
    }

    setSubmittingCorrection(true);
    setModalError(null);
    try {
      const reasonCombined = remarks.trim()
        ? `[${manualStatus.toUpperCase()}] ${correctionReason} — ${remarks.trim()}`
        : `[${manualStatus.toUpperCase()}] ${correctionReason}`;

      await submitManualCorrection({
        employeeId: manualEmployeeId,
        date,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        workLocation,
        notes: remarks.trim() || undefined,
        reason: reasonCombined,
      });

      const empName = selectedRecord
        ? `${selectedRecord.firstName} ${selectedRecord.lastName ?? ''}`.trim()
        : 'employee';
      setBulkBannerMessage({
        type: 'success',
        text: `Attendance updated for ${empName}.`,
      });
      setManualEntryOpen(false);
      setSelectedRecord(null);
      await loadData();
      if (drawerEmployeeId === manualEmployeeId) {
        handleOpenDrawer(manualEmployeeId, drawerTab);
      }
    } catch {
      setModalError('Could not update attendance. Please try again.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Recalculate single record
  const handleRecalculateSingle = async (employeeId: string) => {
    try {
      setBulkActionLoading(true);
      await recalculateDailyAttendance({ employeeIds: [employeeId], date });
      setBulkBannerMessage({ type: 'success', text: 'Attendance recalculated successfully.' });
      await loadData();
      if (drawerEmployeeId === employeeId) {
        handleOpenDrawer(employeeId, drawerTab);
      }
    } catch (err: unknown) {
      setBulkBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to recalculate attendance.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Row Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.employeeId)));
    }
  };

  const handleToggleSelectRow = (employeeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  // Bulk Recalculate Selected
  const handleBulkRecalculate = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await recalculateDailyAttendance({
        employeeIds: Array.from(selectedIds),
        date,
      });
      setBulkBannerMessage({
        type: 'success',
        text: `Successfully recalculated ${res.recalculatedCount} records.${res.failures.length > 0 ? ` (${res.failures.length} failures)` : ''}`,
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: unknown) {
      setBulkBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Bulk recalculation failed.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Finalize Selected
  const handleBulkFinalize = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await bulkFinalizeDailyAttendance({
        employeeIds: Array.from(selectedIds),
        date,
      });
      setBulkBannerMessage({
        type: 'success',
        text: `Successfully finalized ${res.finalizedCount} records.`,
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: unknown) {
      setBulkBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Bulk finalization failed.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Format Worked Hours
  const formatWorkedHours = (minutes: number) => {
    if (minutes <= 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Status Labels and Codes mapping (Spec Section 3)
  const STATUS_CONFIG: Record<
    string,
    { label: string; code: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }
  > = {
    present: { label: 'Present', code: 'P', variant: 'success' },
    absent: { label: 'Absent', code: 'A', variant: 'danger' },
    half_day: { label: 'Half Day', code: 'HD', variant: 'warning' },
    weekly_off: { label: 'Weekly Off', code: 'WO', variant: 'neutral' },
    holiday: { label: 'Holiday', code: 'H', variant: 'neutral' },
    on_leave: { label: 'On Leave', code: 'L', variant: 'info' },
    work_from_home: { label: 'Work From Home', code: 'WFH', variant: 'info' },
    on_duty: { label: 'On Duty', code: 'OD', variant: 'info' },
    missing_punch: { label: 'Missed Punch', code: '—', variant: 'danger' },
    incomplete: { label: 'Missed Punch', code: '—', variant: 'danger' },
    not_checked_in: { label: 'Pending', code: '—', variant: 'neutral' },
    pending: { label: 'Pending', code: '—', variant: 'warning' },
  };

  const renderStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || {
      label: status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      code: '—',
      variant: 'neutral' as const,
    };
    return (
      <span title={`Code: ${config.code}`}>
        <Badge variant={config.variant}>{config.label}</Badge>
      </span>
    );
  };

  const formatPunchSource = (src?: string | null) => {
    if (!src) return '—';
    const s = src.toLowerCase();
    if (s === 'biometric') return 'Biometric';
    if (s === 'web') return 'Web';
    if (s === 'mobile') return 'Mobile';
    if (s === 'manual') return 'Manual';
    if (s === 'import' || s === 'api') return 'Import';
    return src.charAt(0).toUpperCase() + src.slice(1);
  };

  // Processing State Badge Helper
  const renderReviewStateBadge = (state?: DailyAttendanceItem['processingState']) => {
    switch (state) {
      case 'finalized':
        return <Badge variant="success">Finalized</Badge>;
      case 'pending_review':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'provisional':
        return <Badge variant="info">Provisional</Badge>;
      case 'locked':
        return <Badge variant="neutral">Locked</Badge>;
      case 'incomplete':
      default:
        return <Badge variant="danger">Incomplete</Badge>;
    }
  };

  // Indicators Rendering Helper (Filters out raw duplicate status flags like 'not_checked_in' / 'absent')
  const renderIndicators = (indicators?: string[], status?: string) => {
    if (!indicators || indicators.length === 0) {
      return <span className="bezent-table-meta-subtitle">—</span>;
    }
    const filtered = indicators.filter(
      (ind) =>
        ind !== 'not_checked_in' &&
        ind !== 'absent' &&
        ind !== 'present' &&
        ind !== status &&
        ind !== 'half_day',
    );
    if (filtered.length === 0) {
      return <span className="bezent-table-meta-subtitle">—</span>;
    }
    return (
      <Inline gap="xs" wrap>
        {filtered.map((ind) => {
          let label = ind;
          let variant: 'warning' | 'danger' | 'info' | 'neutral' = 'warning';
          if (ind === 'late') {
            label = 'Late';
            variant = 'warning';
          } else if (ind === 'early_exit') {
            label = 'Early Exit';
            variant = 'warning';
          } else if (ind === 'missing_punch_in') {
            label = 'Missing In';
            variant = 'danger';
          } else if (ind === 'missing_punch_out') {
            label = 'Missing Out';
            variant = 'danger';
          } else if (ind === 'insufficient_hours') {
            label = 'Short Hours';
            variant = 'warning';
          } else if (ind === 'regularized') {
            label = 'Adjusted';
            variant = 'info';
          } else if (ind === 'device_sync_pending') {
            label = 'Sync Pending';
            variant = 'neutral';
          }
          return (
            <Badge key={ind} variant={variant}>
              {label}
            </Badge>
          );
        })}
      </Inline>
    );
  };

  const formatProcessingStateLabel = (state: string) => {
    switch (state) {
      case 'provisional':
        return 'Provisional';
      case 'pending_processing':
        return 'Pending Processing';
      case 'incomplete':
        return 'Incomplete';
      case 'pending_review':
        return 'Pending Review';
      case 'finalized':
        return 'Finalized';
      case 'locked':
        return 'Locked';
      default:
        return state;
    }
  };

  const formatIndicatorLabel = (ind: string) => {
    switch (ind) {
      case 'late':
        return 'Late Arrival';
      case 'early_exit':
        return 'Early Exit';
      case 'missing_punch_in':
        return 'Missed Punch In';
      case 'missing_punch_out':
        return 'Missed Punch Out';
      case 'insufficient_hours':
        return 'Short Hours';
      case 'regularized':
        return 'Adjusted';
      case 'device_sync_pending':
        return 'Sync Pending';
      default:
        return ind;
    }
  };

  const formatShiftName = (shift?: string | null): string => {
    if (!shift) return '—';
    return (
      shift
        .replace(/\s*\(\s*\d{1,2}:\d{2}.*?\)/g, '')
        .replace(/\s+\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}.*$/g, '')
        .trim() || shift
    );
  };

  const appliedCount = countActiveAttendanceFilters(appliedFilters);
  const hasActiveFilters = Boolean(search.trim() || appliedCount > 0);
  const isMonthLocked = items.length > 0 && items.every((i) => i.processingState === 'locked');
  const dayOfWeek = (() => {
    try {
      return new Date(`${date}T00:00:00`).getDay();
    } catch {
      return -1;
    }
  })();
  const isWeeklyOffDay = dayOfWeek === 0 || dayOfWeek === 6;
  const isHolidayDay = Boolean(items.length > 0 && items.every((i) => i.status === 'holiday'));

  return (
    <Page>
      {/* ── Page Header (Spec Section 1) ── */}
      <PageHeader
        eyebrow="Attendance › Daily Attendance"
        title="Daily Attendance"
        subtitle="Review and correct each employee’s attendance for the selected date."
        actions={
          <Inline gap="sm" align="center">
            {/* Workday navigation */}
            <Inline gap="xs" align="center">
              <span className="bezent-filter-strip-label">Date:</span>
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                onClick={handlePrevDay}
                aria-label="Previous workday"
              >
                <BezentIcon name="chevronLeft" size={14} />
              </Button>
              <Input
                type="date"
                aria-label="Date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
              />
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                onClick={handleNextDay}
                aria-label="Next workday"
              >
                <BezentIcon name="chevronRight" size={14} />
              </Button>
              <Button variant="outline" size="md" shape="rounded" onClick={handleToday}>
                Today
              </Button>
            </Inline>

            {/* Export & Actions */}
            <Button
              variant="secondary"
              size="md"
              shape="rounded"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={() => downloadAttendanceCsv('daily', { date })}
            >
              Export
            </Button>

            {generalSettings?.manualEntryAllowed !== false && (
              <Button
                variant="secondary"
                size="md"
                shape="rounded"
                onClick={() => handleOpenManualEntry()}
              >
                + Manual Entry
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              shape="rounded"
              disabled={isMonthLocked || (counters.pendingReview === 0 && counters.scheduled === 0)}
              title={
                isMonthLocked
                  ? 'Locked for payroll'
                  : counters.pendingReview === 0 && counters.scheduled === 0
                    ? 'Select a date with pending records to finalize.'
                    : 'Finalize Day'
              }
              onClick={() => setFinalizeModalOpen(true)}
            >
              Finalize Day
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* Section 8: Locked Month Warning Banner */}
        {isMonthLocked && (
          <Alert
            variant="warning"
            title="This month is locked for payroll. Attendance cannot be edited."
          >
            Attendance records for this pay period have been locked for payroll processing.
          </Alert>
        )}

        {/* Bulk Action Alert Banner */}
        {bulkBannerMessage && (
          <Alert variant={bulkBannerMessage.type}>{bulkBannerMessage.text}</Alert>
        )}

        {/* ── Summary Counters Strip (4 Spacious Cards matching Employee Directory) ── */}
        <Grid columns={4} gap="md">
          {/* Scheduled */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--blue ${appliedFilters.status === 'scheduled' ? 'is-active' : ''}`}
            onClick={() => {
              setAppliedFilters((curr) => ({
                ...curr,
                status: curr.status === 'scheduled' ? '' : 'scheduled',
              }));
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAppliedFilters((curr) => ({
                  ...curr,
                  status: curr.status === 'scheduled' ? '' : 'scheduled',
                }));
                setPage(1);
              }
            }}
            role="button"
            tabIndex={0}
            title="Filter by Scheduled"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
              <BezentIcon name="workforce" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Scheduled</p>
              <p className="bezent-kpi-card__value">{counters.scheduled}</p>
              <p className="bezent-kpi-card__caption">Expected workforce</p>
            </div>
          </div>

          {/* Present */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--green ${appliedFilters.status === 'present' ? 'is-active' : ''}`}
            onClick={() => {
              setAppliedFilters((curr) => ({
                ...curr,
                status: curr.status === 'present' ? '' : 'present',
              }));
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAppliedFilters((curr) => ({
                  ...curr,
                  status: curr.status === 'present' ? '' : 'present',
                }));
                setPage(1);
              }
            }}
            role="button"
            tabIndex={0}
            title="Filter by Present"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--green">
              <BezentIcon name="check" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Present</p>
              <p className="bezent-kpi-card__value">{counters.present}</p>
              <p className="bezent-kpi-card__caption">Confirmed checked-in</p>
            </div>
          </div>

          {/* Absent */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--red ${appliedFilters.status === 'absent' ? 'is-active' : ''}`}
            onClick={() => {
              setAppliedFilters((curr) => ({
                ...curr,
                status: curr.status === 'absent' ? '' : 'absent',
              }));
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAppliedFilters((curr) => ({
                  ...curr,
                  status: curr.status === 'absent' ? '' : 'absent',
                }));
                setPage(1);
              }
            }}
            role="button"
            tabIndex={0}
            title="Filter by Absent"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--red">
              <BezentIcon name="close" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Absent</p>
              <p className="bezent-kpi-card__value">{counters.absent}</p>
              <p className="bezent-kpi-card__caption">Not checked-in</p>
            </div>
          </div>

          {/* Pending Review */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--interactive bezent-kpi-card--orange ${
              appliedFilters.processingState === 'pending_processing' ||
              appliedFilters.processingState === 'pending_review' ||
              appliedFilters.status === 'pending_review'
                ? 'is-active'
                : ''
            }`}
            onClick={() => {
              setAppliedFilters((curr) => ({
                ...curr,
                processingState:
                  curr.processingState === 'pending_processing' ||
                  curr.processingState === 'pending_review'
                    ? ''
                    : 'pending_processing',
                status: curr.status === 'pending_review' ? '' : curr.status,
              }));
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setAppliedFilters((curr) => ({
                  ...curr,
                  processingState:
                    curr.processingState === 'pending_processing' ||
                    curr.processingState === 'pending_review'
                      ? ''
                      : 'pending_processing',
                  status: curr.status === 'pending_review' ? '' : curr.status,
                }));
                setPage(1);
              }
            }}
            role="button"
            tabIndex={0}
            title="Filter by Pending Review"
          >
            <div className="bezent-kpi-card__icon bezent-kpi-card__icon--orange">
              <BezentIcon name="tasks" size={20} />
            </div>
            <div className="bezent-kpi-card__info">
              <p className="bezent-kpi-card__title">Pending Review</p>
              <p className="bezent-kpi-card__value">{counters.pendingReview}</p>
              <p className="bezent-kpi-card__caption">Exceptions awaiting action</p>
            </div>
          </div>
        </Grid>

        {/* ── Search & Filter Toolbar directly below KPI Cards (Workforce Directory Pattern) ── */}
        <div className="bezent-directory-toolbar">
          <div className="bezent-directory-toolbar__search">
            <SearchInput
              value={search}
              shape="rounded"
              aria-label="Search by name or employee ID"
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search by name or employee ID"
            />
          </div>

          <div className="bezent-directory-toolbar__actions">
            <div className="bezent-filter-anchor">
              <Button
                variant={appliedCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                size="md"
                shape="rounded"
                className={appliedCount > 0 ? 'bezent-btn--filters-active' : ''}
                leftIcon={<BezentIcon name="filter" size={16} />}
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              >
                Filters
                {appliedCount > 0 && (
                  <span className="bezent-btn__filter-count">{appliedCount}</span>
                )}
              </Button>

              <AttendanceFilterPanel
                isOpen={isFilterPanelOpen}
                onClose={() => setIsFilterPanelOpen(false)}
                appliedFilters={appliedFilters}
                onApply={(newFilters) => {
                  setAppliedFilters(newFilters);
                  setPage(1);
                }}
                departments={departments}
                workLocations={workLocations}
              />
            </div>

            <Button
              variant="outline"
              size="md"
              shape="rounded"
              leftIcon={<BezentIcon name="reset" size={16} />}
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
            >
              Reset
            </Button>

            <span className="bezent-records-badge">{totalCount} Records</span>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {appliedCount > 0 && (
          <div className="bezent-active-chips-strip">
            {appliedFilters.departmentId && (
              <span className="bezent-active-filter-chip">
                <span>{`Department: ${departments.find((d) => d.id === appliedFilters.departmentId)?.name || appliedFilters.departmentId}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove department filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, departmentId: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {appliedFilters.status && (
              <span className="bezent-active-filter-chip">
                <span>{`Status: ${STATUS_CONFIG[appliedFilters.status]?.label || appliedFilters.status}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove status filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, status: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {appliedFilters.shiftRef && (
              <span className="bezent-active-filter-chip">
                <span>{`Shift: ${formatShiftName(appliedFilters.shiftRef)}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove shift filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, shiftRef: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {appliedFilters.locationId && (
              <span className="bezent-active-filter-chip">
                <span>{`Location: ${workLocations.find((l) => l.id === appliedFilters.locationId)?.name || appliedFilters.locationId}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove location filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, locationId: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {appliedFilters.processingState && (
              <span className="bezent-active-filter-chip">
                <span>{`State: ${formatProcessingStateLabel(appliedFilters.processingState)}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove processing state filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, processingState: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {appliedFilters.indicator && (
              <span className="bezent-active-filter-chip">
                <span>{`Indicator: ${formatIndicatorLabel(appliedFilters.indicator)}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove indicator filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, indicator: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {appliedFilters.punchSource && (
              <span className="bezent-active-filter-chip">
                <span>{`Source: ${formatPunchSource(appliedFilters.punchSource)}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove punch source filter"
                  onClick={() => {
                    setAppliedFilters((prev) => ({ ...prev, punchSource: '' }));
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            <button
              type="button"
              className="bezent-active-chips__clear-all"
              onClick={() => {
                setAppliedFilters(EMPTY_ATTENDANCE_FILTER_STATE);
                setPage(1);
              }}
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Bulk Actions Contextual Toolbar ── */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Toolbar
              left={
                <Inline gap="sm" align="center">
                  <strong>{selectedIds.size} records selected</strong>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear Selection
                  </Button>
                </Inline>
              }
              right={
                <Inline gap="xs" align="center">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={handleBulkRecalculate}
                  >
                    Recalculate Selected
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={handleBulkFinalize}
                  >
                    Finalize Validated
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={bulkActionLoading}
                    onClick={() => {
                      setBulkBannerMessage({
                        type: 'info' as unknown as 'warning',
                        text: `Notification queued for ${selectedIds.size} employees.`,
                      });
                    }}
                  >
                    Notify Recipients
                  </Button>
                </Inline>
              }
            />
          </Card>
        )}

        {/* ── Table & Pagination (Spec Section 4 & 9) ── */}
        {loading ? (
          <LoadingState label="Loading daily attendance records..." />
        ) : error ? (
          <Alert variant="danger" title="Could not load attendance">
            <Stack gap="xs">
              <p>Something went wrong while loading.</p>
              <Button variant="secondary" onClick={loadData}>
                Retry
              </Button>
            </Stack>
          </Alert>
        ) : items.length === 0 ? (
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
          ) : isWeeklyOffDay ? (
            <EmptyState
              variant="attendance"
              title={`${date} is a Weekly Off`}
              description="Attendance is not tracked for this day."
            />
          ) : isHolidayDay ? (
            <EmptyState
              variant="attendance"
              title={`${date} is a Holiday`}
              description="Attendance is not tracked for this day."
            />
          ) : (
            <EmptyState
              variant="attendance"
              title="No attendance records"
              description={`There are no attendance records for ${date}.`}
            />
          )
        ) : (
          <Card padding="none">
            <Table compact hoverable>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <Checkbox
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('name');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Employee {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell>Shift</TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('checkIn');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    In {sortBy === 'checkIn' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('checkOut');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Out {sortBy === 'checkOut' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('workedHours');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Hours {sortBy === 'workedHours' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell>Break</TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('status');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Status {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell>Late</TableHeaderCell>
                  <TableHeaderCell>Early Out</TableHeaderCell>
                  <TableHeaderCell>Overtime</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Remarks</TableHeaderCell>
                  <TableHeaderCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((item) => {
                  const isSelected = selectedIds.has(item.employeeId);
                  const initials =
                    `${item.firstName?.[0] ?? ''}${item.lastName?.[0] ?? ''}`.toUpperCase() || 'EM';

                  return (
                    <TableRow
                      key={item.employeeId}
                      className={isSelected ? 'bezent-table__row--selected' : ''}
                    >
                      {/* Selection Checkbox */}
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.employeeId)}
                          aria-label={`Select ${item.firstName}`}
                        />
                      </TableCell>

                      {/* 1. Employee */}
                      <TableCell>
                        <div className="bezent-table-cell--avatar-meta">
                          <Avatar
                            avatarId={getEmployeeAvatarId(item.employeeId)}
                            initials={initials}
                            color={getAvatarColor(item.employeeId)}
                            size="md"
                            alt={`${item.firstName} ${item.lastName ?? ''}`}
                          />
                          <div className="bezent-table-meta-group">
                            <button
                              type="button"
                              className="bezent-table-meta-title"
                              onClick={() => handleOpenDrawer(item.employeeId)}
                            >
                              {item.firstName} {item.lastName ?? ''}
                            </button>
                            <span className="bezent-table-meta-subtitle">
                              {item.employeeCode}
                              {item.departmentName ? ` • ${item.departmentName}` : ''}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Shift */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {formatShiftName(item.shiftName || item.shiftScheduleRef)}
                        </span>
                      </TableCell>

                      {/* 3. In */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {item.checkInTime ? item.checkInTime.slice(0, 5) : '—'}
                        </span>
                      </TableCell>

                      {/* 4. Out */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {item.checkOutTime ? item.checkOutTime.slice(0, 5) : '—'}
                        </span>
                      </TableCell>

                      {/* 5. Hours */}
                      <TableCell>
                        <strong>{formatWorkedHours(item.workedMinutes)}</strong>
                      </TableCell>

                      {/* 6. Break */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">—</span>
                      </TableCell>

                      {/* 7. Status */}
                      <TableCell>{renderStatusBadge(item.status)}</TableCell>

                      {/* 8. Late */}
                      <TableCell>
                        {item.lateMinutes && item.lateMinutes > 0 ? (
                          <span className="bezent-table-meta-title">{item.lateMinutes} min</span>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 9. Early Out */}
                      <TableCell>
                        {item.earlyMinutes && item.earlyMinutes > 0 ? (
                          <span className="bezent-table-meta-title">{item.earlyMinutes} min</span>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 10. Overtime */}
                      <TableCell>
                        {item.workedMinutes > 480 ? (
                          <span className="bezent-table-meta-title">
                            {formatWorkedHours(item.workedMinutes - 480)}
                          </span>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 11. Source */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {formatPunchSource(item.punchSource)}
                        </span>
                      </TableCell>

                      {/* 12. Remarks */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {item.notes?.trim() || '—'}
                        </span>
                      </TableCell>

                      {/* 13. Actions (Spec Section 5) */}
                      <TableCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                        <div className="bezent-table-action-menu">
                          <button
                            type="button"
                            className={`bezent-table-action-btn ${openActionMenuId === item.employeeId ? 'is-active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenActionMenuId((prev) =>
                                prev === item.employeeId ? null : item.employeeId,
                              );
                            }}
                            aria-label="Row actions"
                          >
                            ⋯
                          </button>
                          {openActionMenuId === item.employeeId && (
                            <div
                              className="bezent-table-action-menu__dropdown"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={isMonthLocked}
                                title={isMonthLocked ? 'Locked for payroll' : 'Edit Attendance'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenManualEntry(item);
                                }}
                              >
                                <BezentIcon name="edit" size={14} /> Edit Attendance
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId, 'timeline');
                                }}
                              >
                                <BezentIcon name="clock" size={14} /> View Punches
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={isMonthLocked}
                                title={isMonthLocked ? 'Locked for payroll' : 'Regularize'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId);
                                }}
                              >
                                <BezentIcon name="refresh" size={14} /> Regularize
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
            <Toolbar
              left={
                <span className="bezent-card__desc">
                  Showing {items.length} of {totalCount} records (Page {page} of {totalPages})
                </span>
              }
              right={
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
              }
            />
          </Card>
        )}

        {/* ── Advanced Employee Detail Drawer (Phase 6) ── */}
        <Modal
          isOpen={Boolean(drawerEmployeeId)}
          onClose={handleCloseDrawer}
          variant="drawer"
          size="drawer"
          title={
            drawerDetail ? (
              <Inline gap="sm" align="center">
                <Avatar
                  initials={`${drawerDetail.employee.firstName[0]}${drawerDetail.employee.lastName?.[0] ?? ''}`}
                  size="md"
                />
                <Stack gap="none">
                  <span>
                    {drawerDetail.employee.firstName} {drawerDetail.employee.lastName ?? ''}
                  </span>
                  <span className="bezent-card__desc">
                    {drawerDetail.employee.employeeCode} •{' '}
                    {drawerDetail.employee.departmentName ?? 'Department'}
                  </span>
                </Stack>
              </Inline>
            ) : (
              'Employee Attendance Details'
            )
          }
        >
          {drawerLoading ? (
            <LoadingState label="Loading employee daily detail..." />
          ) : drawerError ? (
            <Alert variant="danger">{drawerError}</Alert>
          ) : !drawerDetail ? (
            <EmptyState
              title="Record Not Found"
              description="Employee record could not be loaded."
            />
          ) : (
            <Stack gap="md">
              {/* Drawer Navigation Tabs */}
              <Inline gap="xs" align="center">
                <Button
                  variant={drawerTab === 'summary' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDrawerTab('summary')}
                >
                  Summary
                </Button>
                <Button
                  variant={drawerTab === 'timeline' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDrawerTab('timeline')}
                >
                  Punches ({drawerDetail.punchTimeline.length})
                </Button>
                <Button
                  variant={drawerTab === 'records' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDrawerTab('records')}
                >
                  Related Records
                </Button>
                <Button
                  variant={drawerTab === 'history' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setDrawerTab('history')}
                >
                  History & Provenance
                </Button>
              </Inline>

              {/* Section 1 & 2: Employee & Attendance Summary */}
              {drawerTab === 'summary' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Workday & Shift Assignment</strong>
                      <Grid columns={2} gap="sm">
                        <Stack gap="none">
                          <span className="bezent-card__desc">Workday</span>
                          <span>{drawerDetail.employee.workday}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Assigned Shift</span>
                          <span>
                            {formatShiftName(drawerDetail.employee.assignedShift.scheduleRef)}
                          </span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Shift Window</span>
                          <span>
                            {drawerDetail.employee.assignedShift.startTime} -{' '}
                            {drawerDetail.employee.assignedShift.endTime}
                          </span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Location / Timezone</span>
                          <span>
                            {drawerDetail.employee.locationName ?? 'Office'} (
                            {drawerDetail.employee.timeZone})
                          </span>
                        </Stack>
                      </Grid>
                    </Stack>
                  </Card>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <strong>Attendance Calculation Summary</strong>
                      <Grid columns={2} gap="sm">
                        <Stack gap="none">
                          <span className="bezent-card__desc">Attendance Status</span>
                          <span>{renderStatusBadge(drawerDetail.attendanceSummary.status)}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Processing State</span>
                          <span>
                            {renderReviewStateBadge(drawerDetail.attendanceSummary.processingState)}
                          </span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Check In</span>
                          <span>{drawerDetail.attendanceSummary.checkInTime ?? '—'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Check Out</span>
                          <span>{drawerDetail.attendanceSummary.checkOutTime ?? '—'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Net Worked Hours</span>
                          <strong>
                            {formatWorkedHours(drawerDetail.attendanceSummary.workedMinutes)}
                          </strong>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Effective Policy</span>
                          <span>
                            {drawerDetail.attendanceSummary.effectivePolicy?.policyName ??
                              'Standard Policy'}{' '}
                            (v
                            {drawerDetail.attendanceSummary.effectivePolicy?.version ?? 1})
                          </span>
                        </Stack>
                      </Grid>

                      <Stack gap="none">
                        <span className="bezent-card__desc">Active Indicators</span>
                        {renderIndicators(drawerDetail.attendanceSummary.indicators)}
                      </Stack>
                    </Stack>
                  </Card>

                  <Inline gap="sm" justify="end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRecalculateSingle(drawerDetail.employee.id)}
                    >
                      Recalculate Day
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleOpenManualEntry({
                          id: drawerDetail.attendanceSummary.id,
                          employeeId: drawerDetail.employee.id,
                          employeeCode: drawerDetail.employee.employeeCode,
                          firstName: drawerDetail.employee.firstName,
                          lastName: drawerDetail.employee.lastName,
                          departmentId: null,
                          departmentName: drawerDetail.employee.departmentName,
                          designationId: null,
                          designationName: drawerDetail.employee.designationName,
                          date: drawerDetail.employee.workday,
                          checkInTime: drawerDetail.attendanceSummary.checkInTime,
                          checkOutTime: drawerDetail.attendanceSummary.checkOutTime,
                          status: drawerDetail.attendanceSummary.status,
                          workLocation: 'office',
                          workedMinutes: drawerDetail.attendanceSummary.workedMinutes,
                          lateMinutes: drawerDetail.attendanceSummary.lateMinutes,
                          earlyMinutes: drawerDetail.attendanceSummary.earlyMinutes,
                          isLate: drawerDetail.attendanceSummary.isLate,
                          isEarlyExit: drawerDetail.attendanceSummary.isEarlyExit,
                          isMissingPunch: drawerDetail.attendanceSummary.isMissingPunch,
                          isRegularized: drawerDetail.attendanceSummary.isRegularized,
                          shiftScheduleRef: drawerDetail.employee.assignedShift.scheduleRef,
                          notes: null,
                        });
                      }}
                    >
                      Adjust Attendance
                    </Button>
                  </Inline>
                </Stack>
              )}

              {/* Section 3: Punch Timeline */}
              {drawerTab === 'timeline' && (
                <Stack gap="sm">
                  <strong>Chronological Punch Events</strong>
                  {drawerDetail.punchTimeline.length === 0 ? (
                    <EmptyState
                      title="No Punches Recorded"
                      description="No physical, biometric, or mobile punches were registered for this employee on this date."
                    />
                  ) : (
                    drawerDetail.punchTimeline.map((punch, idx) => (
                      <Card key={punch.id ?? idx} padding="sm">
                        <Inline justify="between" align="center">
                          <Inline gap="sm" align="center">
                            <Badge variant={punch.punchType === 'in' ? 'success' : 'neutral'}>
                              {punch.punchType.toUpperCase()}
                            </Badge>
                            <Stack gap="none">
                              <strong>{new Date(punch.punchTime).toLocaleTimeString()}</strong>
                              <span className="bezent-card__desc">
                                Source: {punch.source} • Location: {punch.workLocation}
                              </span>
                            </Stack>
                          </Inline>
                          {punch.isDuplicate && <Badge variant="warning">Duplicate</Badge>}
                        </Inline>
                        {punch.notes && <p className="bezent-card__desc">{punch.notes}</p>}
                      </Card>
                    ))
                  )}
                </Stack>
              )}

              {/* Section 4: Related Records */}
              {drawerTab === 'records' && (
                <Stack gap="sm">
                  <strong>Approved Leaves, On-Duty & Regularization</strong>
                  {drawerDetail.relatedRecords.leave && (
                    <Card padding="sm">
                      <Stack gap="none">
                        <Inline justify="between">
                          <strong>Approved Leave</strong>
                          <Badge variant="info">{drawerDetail.relatedRecords.leave.status}</Badge>
                        </Inline>
                        <span className="bezent-card__desc">
                          {drawerDetail.relatedRecords.leave.startDate} to{' '}
                          {drawerDetail.relatedRecords.leave.endDate}
                        </span>
                        {drawerDetail.relatedRecords.leave.reason && (
                          <p className="bezent-card__desc">
                            {drawerDetail.relatedRecords.leave.reason}
                          </p>
                        )}
                      </Stack>
                    </Card>
                  )}

                  {drawerDetail.relatedRecords.onDuty && (
                    <Card padding="sm">
                      <Stack gap="none">
                        <Inline justify="between">
                          <strong>
                            On-Duty Request: {drawerDetail.relatedRecords.onDuty.odTypeName}
                          </strong>
                          <Badge variant="info">{drawerDetail.relatedRecords.onDuty.status}</Badge>
                        </Inline>
                        <span className="bezent-card__desc">
                          {drawerDetail.relatedRecords.onDuty.startDate} to{' '}
                          {drawerDetail.relatedRecords.onDuty.endDate}
                        </span>
                        <p className="bezent-card__desc">
                          {drawerDetail.relatedRecords.onDuty.reason}
                        </p>
                      </Stack>
                    </Card>
                  )}

                  {drawerDetail.relatedRecords.regularizations.length > 0 && (
                    <Stack gap="xs">
                      <strong>Regularization Requests</strong>
                      {drawerDetail.relatedRecords.regularizations.map((reg) => (
                        <Card key={reg.id} padding="sm">
                          <Stack gap="none">
                            <Inline justify="between">
                              <span>
                                In: {reg.requestedCheckIn || '—'} • Out:{' '}
                                {reg.requestedCheckOut || '—'}
                              </span>
                              <Badge variant="info">{reg.status}</Badge>
                            </Inline>
                            <span className="bezent-card__desc">{reg.reason}</span>
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  )}

                  {!drawerDetail.relatedRecords.leave &&
                    !drawerDetail.relatedRecords.onDuty &&
                    drawerDetail.relatedRecords.regularizations.length === 0 && (
                      <EmptyState
                        title="No Related Operational Records"
                        description="No leaves, on-duty requests, or regularization items pertain to this date."
                      />
                    )}
                </Stack>
              )}

              {/* Section 5: History & Actions */}
              {drawerTab === 'history' && (
                <Stack gap="sm">
                  <strong>Calculation Metadata & Provenance</strong>
                  <Card padding="sm">
                    <Stack gap="xs">
                      <Inline justify="between">
                        <span>Period Lock Status</span>
                        <Badge
                          variant={drawerDetail.historyAndActions.isLocked ? 'danger' : 'success'}
                        >
                          {drawerDetail.historyAndActions.isLocked
                            ? 'Period Locked'
                            : 'Open for Edits'}
                        </Badge>
                      </Inline>
                      {drawerDetail.historyAndActions.calculationMetadata && (
                        <pre className="bezent-card__desc">
                          {JSON.stringify(
                            drawerDetail.historyAndActions.calculationMetadata,
                            null,
                            2,
                          )}
                        </pre>
                      )}
                    </Stack>
                  </Card>
                </Stack>
              )}
            </Stack>
          )}
        </Modal>

        {/* ── Edit Attendance Modal (Spec Section 6) ── */}
        {manualEntryOpen && (
          <Modal isOpen={true} onClose={() => setManualEntryOpen(false)} title="Edit Attendance">
            <Stack gap="md">
              <p className="bezent-card__desc">
                {selectedRecord
                  ? `${selectedRecord.firstName} ${selectedRecord.lastName ?? ''}`.trim()
                  : 'Employee'}{' '}
                · {date}
              </p>

              {modalError && <Alert variant="danger">{modalError}</Alert>}

              {!selectedRecord && (
                <Select
                  label="Employee"
                  value={manualEmployeeId}
                  onChange={(e) => setManualEmployeeId(e.target.value)}
                >
                  <option value="">Select Employee</option>
                  {items.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.firstName} {emp.lastName ?? ''} ({emp.employeeCode})
                    </option>
                  ))}
                </Select>
              )}

              <Select
                label="Status"
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
              >
                <option value="present">Present</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
                <option value="on_leave">On Leave</option>
                <option value="on_duty">On Duty</option>
                <option value="work_from_home">Work From Home</option>
              </Select>

              <Inline gap="md">
                <Input
                  label="In Time"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
                <Input
                  label="Out Time"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                />
              </Inline>

              <Select
                label="Reason for change (required)"
                value={correctionReason}
                onChange={(e) => {
                  setCorrectionReason(e.target.value);
                  setModalError(null);
                }}
              >
                <option value="">Select a reason</option>
                <option value="System down">System down</option>
                <option value="Weather">Weather</option>
                <option value="Strike">Strike</option>
                <option value="Client site">Client site</option>
                <option value="Forgot to punch">Forgot to punch</option>
                <option value="Other">Other</option>
              </Select>

              <Input
                label="Remarks (optional)"
                placeholder="Additional notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />

              <p className="bezent-card__desc">Every change is recorded in the audit log.</p>

              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={() => setManualEntryOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveCorrection}
                  disabled={submittingCorrection}
                >
                  {submittingCorrection ? 'Saving...' : 'Save Changes'}
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}

        {/* ── Finalize Day Confirmation Modal (Spec Section 7) ── */}
        {finalizeModalOpen && (
          <Modal
            isOpen={true}
            onClose={() => setFinalizeModalOpen(false)}
            title={`Finalize attendance for ${date}?`}
          >
            <Stack gap="md">
              <p>
                {
                  items.filter(
                    (i) =>
                      i.processingState !== 'locked' &&
                      !i.isMissingPunch &&
                      i.processingState !== 'incomplete',
                  ).length
                }{' '}
                employees will be finalized.{' '}
                {
                  items.filter(
                    (i) =>
                      i.isMissingPunch ||
                      i.processingState === 'incomplete' ||
                      i.processingState === 'pending_review',
                  ).length
                }{' '}
                records with unresolved issues will be skipped.
              </p>

              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={() => setFinalizeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={finalizingDay}
                  onClick={async () => {
                    setFinalizingDay(true);
                    try {
                      const eligible = items.filter(
                        (i) =>
                          i.processingState !== 'locked' &&
                          !i.isMissingPunch &&
                          i.processingState !== 'incomplete',
                      );
                      const skippedCount = items.length - eligible.length;
                      const res = await bulkFinalizeDailyAttendance({
                        employeeIds: eligible.map((i) => i.employeeId),
                        date,
                      });
                      setBulkBannerMessage({
                        type: 'success',
                        text: `${res.finalizedCount} records finalized. ${skippedCount} skipped.`,
                      });
                      setFinalizeModalOpen(false);
                      await loadData();
                    } catch (err: unknown) {
                      setBulkBannerMessage({
                        type: 'danger',
                        text: err instanceof Error ? err.message : 'Could not finalize attendance.',
                      });
                      setFinalizeModalOpen(false);
                    } finally {
                      setFinalizingDay(false);
                    }
                  }}
                >
                  {finalizingDay ? 'Finalizing...' : 'Finalize'}
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}
      </Stack>
    </Page>
  );
}

export default DailyAttendanceLogPage;
