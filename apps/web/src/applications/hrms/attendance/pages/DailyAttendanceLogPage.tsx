import { useState, useEffect, useCallback } from 'react';
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
import type {
  DailyAttendanceItem,
  DailyLogSummaryCounters,
  DailyLogEmployeeDetail,
  AttendanceGeneralSettings,
} from '../types/attendance.types';

export function DailyAttendanceLogPage() {
  // Primary Filters
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [processingStateFilter, setProcessingStateFilter] = useState('');

  // Advanced Filters
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [shiftRefFilter, setShiftRefFilter] = useState('');
  const [locationIdFilter, setLocationIdFilter] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState('');
  const [punchSourceFilter, setPunchSourceFilter] = useState('');

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

  // Manual Adjustment Modal State
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DailyAttendanceItem | null>(null);
  const [manualEmployeeId, setManualEmployeeId] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [workLocation, setWorkLocation] = useState('office');
  const [correctionReason, setCorrectionReason] = useState('');
  const [manualStatus, setManualStatus] = useState<'present' | 'half_day' | 'absent'>('present');
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
        departmentId: departmentId || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
        processingState: processingStateFilter || undefined,
        shiftRef: shiftRefFilter || undefined,
        locationId: locationIdFilter || undefined,
        indicator: indicatorFilter || undefined,
        punchSource: punchSourceFilter || undefined,
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
  }, [
    date,
    departmentId,
    statusFilter,
    debouncedSearch,
    processingStateFilter,
    shiftRefFilter,
    locationIdFilter,
    indicatorFilter,
    punchSourceFilter,
    page,
    limit,
    sortBy,
    sortOrder,
  ]);

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
    setDate(new Date().toISOString().slice(0, 10));
    setSearch('');
    setDebouncedSearch('');
    setDepartmentId('');
    setStatusFilter('');
    setProcessingStateFilter('');
    setShiftRefFilter('');
    setLocationIdFilter('');
    setIndicatorFilter('');
    setPunchSourceFilter('');
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

  // Manual Adjustment Handlers
  const handleOpenManualEntry = (record?: DailyAttendanceItem) => {
    if (record) {
      setSelectedRecord(record);
      setManualEmployeeId(record.employeeId);
      setCheckInTime(record.checkInTime ?? '09:00');
      setCheckOutTime(record.checkOutTime ?? '18:00');
      setWorkLocation(record.workLocation ?? 'office');
      setManualStatus(
        record.status === 'half_day'
          ? 'half_day'
          : record.status === 'absent'
            ? 'absent'
            : 'present',
      );
    } else {
      setSelectedRecord(null);
      setManualEmployeeId(items[0]?.employeeId ?? '');
      setCheckInTime('09:00');
      setCheckOutTime('18:00');
      setWorkLocation('office');
      setManualStatus('present');
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
      setModalError('Please specify the reason for manual attendance entry');
      return;
    }

    setSubmittingCorrection(true);
    setModalError(null);
    try {
      await submitManualCorrection({
        employeeId: manualEmployeeId,
        date,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        workLocation,
        reason:
          manualStatus === 'present'
            ? correctionReason.trim()
            : `[${manualStatus.toUpperCase()}] ${correctionReason.trim()}`,
      });
      setManualEntryOpen(false);
      setSelectedRecord(null);
      await loadData();
      if (drawerEmployeeId === manualEmployeeId) {
        handleOpenDrawer(manualEmployeeId, drawerTab);
      }
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save manual attendance');
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

  // Status Badge Helper
  const renderStatusBadge = (status: DailyAttendanceItem['status']) => {
    switch (status) {
      case 'present':
        return <Badge variant="success">Present</Badge>;
      case 'half_day':
        return <Badge variant="warning">Half Day</Badge>;
      case 'on_leave':
        return <Badge variant="info">On Leave</Badge>;
      case 'on_duty':
        return <Badge variant="info">On-Duty</Badge>;
      case 'holiday':
        return <Badge variant="neutral">Holiday / Off</Badge>;
      case 'incomplete':
        return <Badge variant="danger">Incomplete</Badge>;
      case 'absent':
      default:
        return <Badge variant="danger">Absent</Badge>;
    }
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

  // Indicators Rendering Helper
  const renderIndicators = (indicators?: string[]) => {
    if (!indicators || indicators.length === 0) {
      return <span className="bezent-card__desc">—</span>;
    }
    return (
      <Inline gap="xs" wrap>
        {indicators.map((ind) => {
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

  const hasAdvancedFilters = Boolean(
    shiftRefFilter || locationIdFilter || indicatorFilter || punchSourceFilter,
  );

  return (
    <Page>
      {/* ── Page Header ── */}
      <PageHeader
        title="Daily Log"
        actions={
          <Inline gap="sm" align="center">
            {/* Workday navigation */}
            <Inline gap="xs" align="center">
              <Button
                variant="secondary"
                size="control"
                onClick={handlePrevDay}
                aria-label="Previous workday"
              >
                <BezentIcon name="chevronLeft" size={14} />
              </Button>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
              />
              <Button
                variant="secondary"
                size="control"
                onClick={handleNextDay}
                aria-label="Next workday"
              >
                <BezentIcon name="chevronRight" size={14} />
              </Button>
              <Button variant="secondary" size="control" onClick={handleToday}>
                Today
              </Button>
            </Inline>

            {/* Export & Actions */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadAttendanceCsv('daily', { date })}
            >
              <BezentIcon name="download" size={16} /> Export
            </Button>

            {generalSettings?.manualEntryAllowed !== false && (
              <Button variant="primary" size="sm" onClick={() => handleOpenManualEntry()}>
                + Manual Entry
              </Button>
            )}
          </Inline>
        }
      />

      <Stack gap="md">
        {/* Bulk Action Alert Banner */}
        {bulkBannerMessage && (
          <Alert variant={bulkBannerMessage.type}>{bulkBannerMessage.text}</Alert>
        )}

        {/* ── Summary Counters Strip (Single Row on Desktop) ── */}
        <Grid columns={6} gap="sm">
          <div
            className={`bezent-stat-card ${statusFilter === 'scheduled' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'scheduled' ? '' : 'scheduled'))}
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Scheduled</span>
            <span className="bezent-stat-card__val">{counters.scheduled}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'present' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'present' ? '' : 'present'))}
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Present</span>
            <span className="bezent-stat-card__val">{counters.present}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'absent' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'absent' ? '' : 'absent'))}
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Absent</span>
            <span className="bezent-stat-card__val">{counters.absent}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'on_leave' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'on_leave' ? '' : 'on_leave'))}
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">On Leave</span>
            <span className="bezent-stat-card__val">{counters.onLeave}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'on_duty' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter((curr) => (curr === 'on_duty' ? '' : 'on_duty'))}
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">On-Duty</span>
            <span className="bezent-stat-card__val">{counters.onDuty}</span>
          </div>

          <div
            className={`bezent-stat-card ${statusFilter === 'pending_review' ? 'is-active' : ''}`}
            onClick={() =>
              setStatusFilter((curr) => (curr === 'pending_review' ? '' : 'pending_review'))
            }
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Pending Review</span>
            <span className="bezent-stat-card__val">{counters.pendingReview}</span>
          </div>
        </Grid>

        {/* ── Filters Toolbar ── */}
        <Card padding="sm">
          <Stack gap="sm">
            <div className="bezent-filter-toolbar">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee name or code..."
              />

              <Select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>

              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Classifications</option>
                <option value="present">Present</option>
                <option value="half_day">Half Day</option>
                <option value="absent">Absent</option>
                <option value="on_leave">On Leave</option>
                <option value="on_duty">On-Duty</option>
                <option value="holiday">Holiday / Off</option>
                <option value="incomplete">Incomplete / Unresolved</option>
              </Select>

              <Select
                value={processingStateFilter}
                onChange={(e) => {
                  setProcessingStateFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Processing States</option>
                <option value="provisional">Provisional</option>
                <option value="incomplete">Incomplete</option>
                <option value="pending_review">Pending Review</option>
                <option value="finalized">Finalized</option>
                <option value="locked">Locked</option>
              </Select>

              <div className="bezent-filter-toolbar__actions">
                <Button
                  variant={isAdvancedFiltersOpen || hasAdvancedFilters ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setIsAdvancedFiltersOpen((prev) => !prev)}
                >
                  {isAdvancedFiltersOpen ? 'Hide Filters' : 'More Filters'}
                  {hasAdvancedFilters ? ' •' : ''}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Collapsible Advanced Filters */}
            {isAdvancedFiltersOpen && (
              <div className="bezent-filter-toolbar__more">
                <Select
                  value={shiftRefFilter}
                  onChange={(e) => {
                    setShiftRefFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Shifts</option>
                  <option value="General 09:00 - 18:00">General 09:00 - 18:00</option>
                  <option value="Morning 06:00 - 14:00">Morning 06:00 - 14:00</option>
                  <option value="Night 22:00 - 06:00">Night 22:00 - 06:00</option>
                </Select>

                <Select
                  value={locationIdFilter}
                  onChange={(e) => {
                    setLocationIdFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Work Locations</option>
                  {workLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>

                <Select
                  value={indicatorFilter}
                  onChange={(e) => {
                    setIndicatorFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Indicators</option>
                  <option value="late">Late Arrival</option>
                  <option value="early_exit">Early Exit</option>
                  <option value="missing_punch_in">Missing Punch In</option>
                  <option value="missing_punch_out">Missing Punch Out</option>
                  <option value="insufficient_hours">Short Hours</option>
                  <option value="regularized">Adjusted / Regularized</option>
                  <option value="device_sync_pending">Device Sync Pending</option>
                </Select>

                <Select
                  value={punchSourceFilter}
                  onChange={(e) => {
                    setPunchSourceFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Punch Sources</option>
                  <option value="web">Web Portal</option>
                  <option value="mobile">Mobile App</option>
                  <option value="biometric">Biometric Device</option>
                  <option value="manual">Manual Entry</option>
                  <option value="api">API Integration</option>
                </Select>
              </div>
            )}
          </Stack>
        </Card>

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

        {/* ── Table & Pagination ── */}
        {loading ? (
          <LoadingState label="Loading daily attendance records..." />
        ) : error ? (
          <Alert variant="danger" title="Error Loading Daily Log">
            {error}
            <Button variant="secondary" onClick={loadData}>
              Retry
            </Button>
          </Alert>
        ) : items.length === 0 ? (
          <EmptyState
            variant="attendance"
            title="No Attendance Records"
            description="No employee attendance records matched the selected date and filters."
          />
        ) : (
          <Card padding="none">
            <Table compact hoverable>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <Checkbox
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={handleToggleSelectAll}
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
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('department');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Department {sortBy === 'department' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell>Shift</TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('checkIn');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Punch In {sortBy === 'checkIn' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('checkOut');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Punch Out {sortBy === 'checkOut' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('workedHours');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Worked Hours {sortBy === 'workedHours' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell
                    onClick={() => {
                      setSortBy('status');
                      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Attendance {sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                  </TableHeaderCell>
                  <TableHeaderCell>Indicators</TableHeaderCell>
                  <TableHeaderCell>Review State</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
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
                        />
                      </TableCell>

                      {/* 1. Employee */}
                      <TableCell>
                        <div className="bezent-table-cell--avatar-meta">
                          <Avatar initials={initials} size="sm" />
                          <div className="bezent-table-meta-group">
                            <button
                              type="button"
                              className="bezent-table-meta-title"
                              onClick={() => handleOpenDrawer(item.employeeId)}
                            >
                              {item.firstName} {item.lastName ?? ''}
                            </button>
                            <span className="bezent-table-meta-subtitle">{item.employeeCode}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Department */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {item.departmentName ?? '—'}
                        </span>
                      </TableCell>

                      {/* 3. Shift */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {item.shiftScheduleRef ?? 'General 09:00 - 18:00'}
                        </span>
                      </TableCell>

                      {/* 4. Punch In */}
                      <TableCell>
                        {item.checkInTime ? (
                          <Inline gap="xs" align="center">
                            <span>{item.checkInTime}</span>
                            {item.isLate ? (
                              <Badge variant="warning">+{item.lateMinutes}m</Badge>
                            ) : null}
                          </Inline>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 5. Punch Out */}
                      <TableCell>
                        {item.checkOutTime ? (
                          <Inline gap="xs" align="center">
                            <span>{item.checkOutTime}</span>
                            {item.isEarlyExit ? (
                              <Badge variant="warning">-{item.earlyMinutes}m</Badge>
                            ) : null}
                          </Inline>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 6. Worked Hours */}
                      <TableCell>
                        <strong>{formatWorkedHours(item.workedMinutes)}</strong>
                      </TableCell>

                      {/* 7. Attendance Classification */}
                      <TableCell>{renderStatusBadge(item.status)}</TableCell>

                      {/* 8. Indicators */}
                      <TableCell>{renderIndicators(item.indicators)}</TableCell>

                      {/* 9. Review State */}
                      <TableCell>{renderReviewStateBadge(item.processingState)}</TableCell>

                      {/* 10. Actions Menu */}
                      <TableCell>
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
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId);
                                }}
                              >
                                <BezentIcon name="view" size={14} /> View Details
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId);
                                }}
                              >
                                <BezentIcon name="clock" size={14} /> View Punch Timeline
                              </button>
                              {generalSettings?.manualEntryAllowed !== false && (
                                <button
                                  type="button"
                                  className="bezent-table-action-menu__item"
                                  disabled={item.processingState === 'locked'}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenManualEntry(item);
                                  }}
                                >
                                  <BezentIcon name="edit" size={14} /> Manual Entry / Adjustment
                                </button>
                              )}
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={item.processingState === 'locked'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId);
                                }}
                              >
                                <BezentIcon name="refresh" size={14} /> Initiate Regularization
                              </button>
                              {item.isMissingPunch && (
                                <button
                                  type="button"
                                  className="bezent-table-action-menu__item"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    handleOpenDrawer(item.employeeId);
                                  }}
                                >
                                  <BezentIcon name="alert-triangle" size={14} /> Review Exception
                                </button>
                              )}
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId);
                                }}
                              >
                                <BezentIcon name="calendar" size={14} /> View Leave / OD
                              </button>
                              <div className="bezent-table-action-menu__divider" />
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                disabled={item.processingState === 'locked'}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleRecalculateSingle(item.employeeId);
                                }}
                              >
                                <BezentIcon name="refresh" size={14} /> Recalculate
                              </button>
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  handleOpenDrawer(item.employeeId);
                                }}
                              >
                                <BezentIcon name="history" size={14} /> View Audit History
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
                          <span>{drawerDetail.employee.assignedShift.scheduleRef}</span>
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

        {/* ── Manual Attendance Entry Modal ── */}
        {manualEntryOpen && (
          <Modal
            isOpen={true}
            onClose={() => setManualEntryOpen(false)}
            title={
              selectedRecord
                ? `Manual Attendance: ${selectedRecord.firstName} ${selectedRecord.lastName ?? ''}`
                : 'Create Manual Attendance Entry'
            }
          >
            <Stack gap="md">
              <p className="bezent-card__desc">
                Adjust punch timings and credit attendance for {date}. Immutable audit records will
                track this administrative modification.
              </p>

              {modalError && <Alert variant="danger">{modalError}</Alert>}

              {!selectedRecord && (
                <Select
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

              <Inline gap="md">
                <Input
                  label="Punch In Time"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
                <Input
                  label="Punch Out Time"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                />
              </Inline>

              <Inline gap="md">
                <Select
                  label="Work Location"
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                >
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="field">Field</option>
                </Select>

                <Select
                  label="Attendance Status"
                  value={manualStatus}
                  onChange={(e) =>
                    setManualStatus(e.target.value as 'present' | 'half_day' | 'absent')
                  }
                >
                  <option value="present">Present (Full Day)</option>
                  <option value="half_day">Half Day Credit</option>
                  <option value="absent">Absent</option>
                </Select>
              </Inline>

              <Input
                label="Reason for Adjustment"
                placeholder="e.g. Card malfunction, onsite client visit authorized by manager"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />

              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={() => setManualEntryOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveCorrection}
                  disabled={submittingCorrection}
                >
                  {submittingCorrection ? 'Saving...' : 'Save Adjustment'}
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
