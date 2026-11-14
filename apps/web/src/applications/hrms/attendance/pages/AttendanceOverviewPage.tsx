import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Button,
  Select,
  Input,
  Alert,
  type SelectOption,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../api/organizationMastersApi';
import { fetchShifts, type FrontendShift } from '../../shifts/api/shiftApi';
import { fetchShiftRosterSettings } from '../api/attendanceApi';
import { fetchAttendanceOverview } from '../api/attendanceApi';
import type { AttendanceOverviewKpis } from '../types/attendance.types';
import { AttendanceKpiDeck } from '../components/AttendanceKpiCards';
import { AttendanceTrendsCard } from '../components/AttendanceTrendsCard';
import { AttendanceDistributionCard } from '../components/AttendanceDistributionCard';
import { AttendanceNeedsAttentionCard } from '../components/AttendanceNeedsAttentionCard';
import { AttendancePayrollReadinessCard } from '../components/AttendancePayrollReadinessCard';
import { AttendanceInsightsCard } from '../components/AttendanceInsightsCard';
import { AttendanceCalendarCard } from '../components/AttendanceCalendarCard';

export type DateRangePreset =
  'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';

export const DATE_RANGE_OPTIONS: SelectOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
];

export interface AttendanceOverviewFilters {
  dateRangePreset: DateRangePreset;
  startDate: string;
  endDate: string;
  branchId: string;
  departmentId: string;
  shiftId: string;
}

export interface AttendanceOverviewPageProps {
  title?: string;
  description?: string;
  onFilterChange?: (filters: AttendanceOverviewFilters) => void;
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function resolveDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string; label: string } {
  const now = new Date();
  const todayStr = formatDateIso(now);

  if (preset === 'today') {
    return {
      startDate: todayStr,
      endDate: todayStr,
      label: `Today · ${formatDateDisplay(now)}`,
    };
  }

  if (preset === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatDateIso(yest);
    return {
      startDate: yestStr,
      endDate: yestStr,
      label: `Yesterday · ${formatDateDisplay(yest)}`,
    };
  }

  if (preset === 'last_7_days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return {
      startDate: formatDateIso(start),
      endDate: todayStr,
      label: `${formatDateDisplay(start)} – ${formatDateDisplay(now)}`,
    };
  }

  if (preset === 'last_30_days') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return {
      startDate: formatDateIso(start),
      endDate: todayStr,
      label: `${formatDateDisplay(start)} – ${formatDateDisplay(now)}`,
    };
  }

  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: formatDateIso(start),
      endDate: todayStr,
      label: `${formatDateDisplay(start)} – ${formatDateDisplay(now)}`,
    };
  }

  // Custom preset
  const effectiveStart = customStart || todayStr;
  const effectiveEnd = customEnd || todayStr;
  const sDate = new Date(`${effectiveStart}T00:00:00`);
  const eDate = new Date(`${effectiveEnd}T00:00:00`);
  return {
    startDate: effectiveStart,
    endDate: effectiveEnd,
    label: `${formatDateDisplay(sDate)} – ${formatDateDisplay(eDate)}`,
  };
}

export function AttendanceOverviewPage({
  title = 'Attendance Overview',
  description = 'Monitor daily attendance and manage workforce attendance activities.',
  onFilterChange,
}: AttendanceOverviewPageProps) {
  const todayIso = useMemo(() => formatDateIso(new Date()), []);
  const [showHelp, setShowHelp] = useState(false);

  // ── Global Filter State ──
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [shiftId, setShiftId] = useState<string>('');

  // ── Master Options Data ──
  const [orgMasters, setOrgMasters] = useState<OrganizationMasters | null>(null);
  const [shiftsList, setShiftsList] = useState<FrontendShift[]>([]);
  const [overviewData, setOverviewData] = useState<AttendanceOverviewKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve active dates & summary
  const dateRange = useMemo(
    () => resolveDateRange(dateRangePreset, customStartDate, customEndDate),
    [dateRangePreset, customStartDate, customEndDate],
  );

  // Load master data (Locations, Departments, Shifts)
  useEffect(() => {
    let active = true;

    // 1. Locations & Departments
    fetchOrganizationMasters()
      .then((masters) => {
        if (active) setOrgMasters(masters);
      })
      .catch(() => {
        // Fallback gracefully to empty options
      });

    // 2. Shifts (try shift API with fallback to shift roster settings)
    fetchShifts({ status: 'active' })
      .then((res) => {
        if (active) setShiftsList(res.items);
      })
      .catch(() => {
        fetchShiftRosterSettings()
          .then((settings) => {
            if (active) {
              const mapped: FrontendShift[] = (settings?.shifts ?? []).map((s) => ({
                id: s.id,
                name: s.name,
                code: s.code,
                startTime: s.startTime,
                endTime: s.endTime,
                workingDays: s.workingDays,
                breakMinutes: s.breakMinutes,
                lunchMinutes: s.lunchMinutes,
                graceMinutes: s.graceMinutes,
                isOvernight: s.isOvernight,
                isActive: s.isActive,
                createdAt: '',
                updatedAt: '',
              }));
              setShiftsList(mapped);
            }
          })
          .catch(() => {
            // Degrades gracefully to "All Shifts"
          });
      });

    return () => {
      active = false;
    };
  }, []);

  // Sync shared filter changes with parent caller if subscribed
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        dateRangePreset,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        branchId,
        departmentId,
        shiftId,
      });
    }
  }, [
    dateRangePreset,
    dateRange.startDate,
    dateRange.endDate,
    branchId,
    departmentId,
    shiftId,
    onFilterChange,
  ]);

  // Fetch Attendance Overview with debouncing
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const trendRangeParam =
          dateRangePreset === 'last_30_days'
            ? '30d'
            : dateRangePreset === 'last_7_days'
              ? '7d'
              : dateRangePreset === 'custom'
                ? 'custom'
                : '7d';

        const result = await fetchAttendanceOverview(dateRange.endDate, {
          trendRange: trendRangeParam,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          departmentId: departmentId || undefined,
        });

        if (active) {
          setOverviewData(result);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load attendance overview data');
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [dateRangePreset, dateRange.startDate, dateRange.endDate, branchId, departmentId, shiftId]);

  // ── Option Lists ──
  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'All Branches' },
      ...(orgMasters?.locations.map((loc) => ({ value: loc.id, label: loc.name })) ?? []),
    ],
    [orgMasters?.locations],
  );

  const departmentOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'All Departments' },
      ...(orgMasters?.departments.map((dept) => ({ value: dept.id, label: dept.name })) ?? []),
    ],
    [orgMasters?.departments],
  );

  const shiftOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: 'All Shifts' },
      ...shiftsList.map((shift) => ({
        value: shift.id,
        label:
          shift.startTime && shift.endTime
            ? `${shift.name} (${shift.startTime} - ${shift.endTime})`
            : shift.name,
      })),
    ],
    [shiftsList],
  );

  const isFiltered =
    dateRangePreset !== 'today' ||
    Boolean(customStartDate) ||
    Boolean(customEndDate) ||
    Boolean(branchId) ||
    Boolean(departmentId) ||
    Boolean(shiftId);

  const handleResetFilters = useCallback(() => {
    setDateRangePreset('today');
    setCustomStartDate('');
    setCustomEndDate('');
    setBranchId('');
    setDepartmentId('');
    setShiftId('');
  }, []);

  return (
    <Page maxWidth="full" gap="md">
      <div className="bezent-att-overview-wrapper">
        {/* ── Page Header with Integrated Global Filters in Actions (Matching Workforce Overview) ── */}
        <PageHeader
          title={
            <div className="bezent-att-title-row">
              <h1 className="bezent-page-header__title">{title}</h1>
              <div className="bezent-att-help-trigger">
                <button
                  type="button"
                  className="bezent-att-help-btn"
                  aria-label="Attendance Overview Information"
                  onClick={() => setShowHelp((prev) => !prev)}
                  onBlur={() => setShowHelp(false)}
                >
                  ?
                </button>
                <div
                  className={`bezent-att-help-popover ${
                    showHelp ? 'bezent-att-help-popover--visible' : ''
                  }`}
                  role="tooltip"
                >
                  {description}
                </div>
              </div>
            </div>
          }
          actions={
            <div className="bezent-att-header-controls">
              {/* Filter A: Date Range Preset */}
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by date range"
                title="Date Range"
                value={dateRangePreset}
                options={DATE_RANGE_OPTIONS}
                onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
              />

              {/* Custom Date Pickers (only shown when Date Range is 'custom') */}
              {dateRangePreset === 'custom' && (
                <div className="bezent-att-custom-dates">
                  <Input
                    type="date"
                    size="sm"
                    aria-label="Custom Start Date"
                    title="Start Date"
                    value={customStartDate}
                    max={customEndDate || todayIso}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                  <span className="bezent-att-filter-separator">to</span>
                  <Input
                    type="date"
                    size="sm"
                    aria-label="Custom End Date"
                    title="End Date"
                    value={customEndDate}
                    min={customStartDate}
                    max={todayIso}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              )}

              {/* Filter B: Branch */}
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by branch"
                title="Branch"
                value={branchId}
                options={branchOptions}
                onChange={(e) => setBranchId(e.target.value)}
              />

              {/* Filter C: Department */}
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by department"
                title="Department"
                value={departmentId}
                options={departmentOptions}
                onChange={(e) => setDepartmentId(e.target.value)}
              />

              {/* Filter D: Shift */}
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by shift"
                title="Shift"
                value={shiftId}
                options={shiftOptions}
                onChange={(e) => setShiftId(e.target.value)}
              />

              {/* Filter Reset Button */}
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="bezent-att-reset-btn"
                  leftIcon={<BezentIcon name="sync" size={13} />}
                  onClick={handleResetFilters}
                  title="Reset all filters to defaults"
                >
                  Reset
                </Button>
              )}

              {/* Active Date Display Pill */}
              <div className="bezent-att-date-display-pill" title="Selected Date">
                <BezentIcon name="calendar" size={13} />
                <span>{dateRange.label}</span>
              </div>
            </div>
          }
        />

        {error && (
          <Alert variant="danger" title="Error Loading Overview">
            {error}
          </Alert>
        )}

        {/* ── Attendance Overview KPI Deck (5 Cards) ── */}
        <AttendanceKpiDeck overviewData={overviewData} loading={loading} />

        {/* ── Attendance Intelligence Deck: Trends (50%) + Distribution (50%) ── */}
        <div className="bezent-att-intelligence-grid">
          <AttendanceTrendsCard
            trends={overviewData?.trends}
            recentTrends={overviewData?.recentTrends}
            loading={loading}
          />
          <AttendanceDistributionCard
            departments={overviewData?.departments}
            departmentBreakdown={overviewData?.departmentBreakdown}
            loading={loading}
          />
        </div>

        {/* ── Attendance Operations & Governance Deck: Needs Attention (50%) + Payroll Readiness (50%) ── */}
        <div className="bezent-att-intelligence-grid">
          <AttendanceNeedsAttentionCard actionQueue={overviewData?.actionQueue} loading={loading} />
          <AttendancePayrollReadinessCard
            monthlyReadiness={overviewData?.monthlyReadiness}
            loading={loading}
          />
        </div>

        {/* ── Attendance Intelligence & Calendar Deck: Insights (50%) + Calendar (50%) ── */}
        <div className="bezent-att-intelligence-grid">
          <AttendanceInsightsCard overviewData={overviewData} loading={loading} />
          <AttendanceCalendarCard overviewData={overviewData} loading={loading} />
        </div>
      </div>
    </Page>
  );
}
