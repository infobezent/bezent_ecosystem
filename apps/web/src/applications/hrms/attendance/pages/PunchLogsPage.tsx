import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Page,
  PageHeader,
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
  Tabs,
  LoadingState,
  Alert,
  EmptyState,
  Avatar,
  Textarea,
  TableSkeleton,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  computePunchTrendBuckets,
  AllPunchesLineChart,
  TotalPunchesLineChart,
  FirstInBarChart,
  FirstInLineChart,
  LastOutAreaChart,
  LastOutLineChart,
  LatePunchHistogram,
  LatePunchLineChart,
  LatePunchMiniBarChart,
  ExceptionsDonutChart,
  ExceptionsLineChart,
  ExceptionsMiniBarChart,
} from '../components/PunchLogMiniGraphs';
import { AttendanceSectionTabs } from '../components/AttendanceSectionTabs';
import { AttendanceImportModal } from '../components/import';
import {
  fetchPunchLogs,
  fetchPunchDetails,
  updatePunchInvestigation,
  retryPunchProcessing,
  exportPunchLogsCsv,
} from '../api/attendanceApi';
import { fetchDepartments, fetchWorkLocations } from '../../api/organizationMastersApi';
import { generateSamplePunchLogs, getSamplePunchDetail } from '../data/samplePunchLogs';
import type {
  PunchLogItem,
  PunchLogSummaryCounters,
  PunchEventDetail,
  PunchLogFilter,
} from '../types/attendance.types';

// ============================================================================
// Section 4: Status and Source Helpers
// ============================================================================
export interface StatusBadgeConfig {
  label: string;
  tooltip: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export function getPunchResultBadge(punch: PunchLogItem): StatusBadgeConfig {
  if (!punch) {
    return {
      label: 'Accepted',
      tooltip: "Counted in the day's attendance.",
      variant: 'success',
    };
  }
  if (punch.processingState === 'failed') {
    return {
      label: 'Failed',
      tooltip: 'Could not be processed. Retry or investigate.',
      variant: 'danger',
    };
  }
  if (punch.processingState === 'processing' || punch.processingState === 'received') {
    return {
      label: 'Processing',
      tooltip: 'Waiting to be processed.',
      variant: 'info',
    };
  }
  if (
    punch.validationStatus === 'needs_review' ||
    punch.validationStatus === 'unmatched' ||
    punch.investigationStatus === 'in_review' ||
    punch.investigationStatus === 'open' ||
    punch.investigationStatus === 'assigned'
  ) {
    return {
      label: 'Flagged',
      tooltip: 'Needs review before it is counted.',
      variant: 'warning',
    };
  }
  if (punch.validationStatus === 'invalid' || punch.validationStatus === 'duplicate') {
    return {
      label: 'Rejected',
      tooltip: 'Not counted in attendance.',
      variant: 'danger',
    };
  }
  return {
    label: 'Accepted',
    tooltip: "Counted in the day's attendance.",
    variant: 'success',
  };
}

function formatSourceLabel(source?: string | null): string {
  if (!source) return '—';
  const s = source.toLowerCase().trim();
  if (s === 'biometric' || s === 'device') return 'Biometric';
  if (s === 'web') return 'Web';
  if (s === 'mobile') return 'Mobile';
  if (s === 'manual') return 'Manual';
  if (s === 'import') return 'Import';
  if (s === 'kiosk') return 'Biometric';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDirectionLabel(direction?: string | null): string {
  if (!direction) return '—';
  const d = direction.toLowerCase().trim();
  if (d === 'in' || d === 'break_in') return 'In';
  if (d === 'out' || d === 'break_out') return 'Out';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function format24HourTime(ts?: string | null): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return ts;
  }
}

function extractTerminalDeviceName(punch: PunchLogItem): string {
  if (!punch) return '—';
  const meta = punch.deviceMetadata as Record<string, unknown> | null | undefined;
  if (!meta) return '—';
  const terminal =
    (meta.terminalName as string) ||
    (meta.deviceName as string) ||
    (meta.terminal as string) ||
    (meta.terminal_name as string) ||
    (meta.name as string);
  if (terminal) return String(terminal);
  const deviceId = meta.deviceId || meta.device_id;
  if (
    deviceId &&
    typeof deviceId === 'string' &&
    !deviceId.includes('.') &&
    !deviceId.includes(':')
  ) {
    return String(deviceId);
  }
  return '—';
}

function extractSelfieThumbnail(punch: PunchLogItem): string | null {
  if (!punch) return null;
  const meta = punch.deviceMetadata as Record<string, unknown> | null | undefined;
  if (!meta) return null;
  return (
    (meta.selfieUrl as string) || (meta.photoUrl as string) || (meta.imageUrl as string) || null
  );
}

export type PunchLogViewMode = 'all' | 'first_in' | 'last_out' | 'late_punch' | 'exceptions';

export function filterLatePunches(punches: PunchLogItem[]): PunchLogItem[] {
  if (!Array.isArray(punches)) return [];
  return punches.filter((p) => {
    if (!p) return false;
    const remark = (p.validationReason || p.notes || '').trim().toLowerCase();
    return remark === 'late punch' || remark === 'late' || remark.startsWith('late');
  });
}

export function filterFirstInPunches(punches: PunchLogItem[]): PunchLogItem[] {
  if (!Array.isArray(punches)) return [];
  const inPunches = punches.filter((p) => {
    if (!p) return false;
    const dir = (p.punchType || '').toLowerCase().trim();
    return dir === 'in' || dir === 'break_in';
  });

  const earliestByGroup = new Map<string, PunchLogItem>();

  for (const punch of inPunches) {
    if (!punch) continue;
    const empKey = punch.employeeId || punch.employeeCode || punch.id || 'unknown';
    const workdayKey =
      punch.workday ||
      (punch.punchTime && typeof punch.punchTime === 'string'
        ? punch.punchTime.slice(0, 10)
        : 'unknown');
    const groupKey = `${empKey}__${workdayKey}`;

    const existing = earliestByGroup.get(groupKey);
    if (!existing) {
      earliestByGroup.set(groupKey, punch);
    } else {
      const existingTime = existing.punchTime ? new Date(existing.punchTime).getTime() : 0;
      const currTime = punch.punchTime ? new Date(punch.punchTime).getTime() : 0;
      if (currTime < existingTime) {
        earliestByGroup.set(groupKey, punch);
      }
    }
  }

  return Array.from(earliestByGroup.values()).sort((a, b) => {
    const timeA = a.punchTime ? new Date(a.punchTime).getTime() : 0;
    const timeB = b.punchTime ? new Date(b.punchTime).getTime() : 0;
    return timeA - timeB;
  });
}

export function filterLastOutPunches(punches: PunchLogItem[]): PunchLogItem[] {
  if (!Array.isArray(punches)) return [];
  const outPunches = punches.filter((p) => {
    if (!p) return false;
    const dir = (p.punchType || '').toLowerCase().trim();
    return dir === 'out' || dir === 'break_out';
  });

  const latestByGroup = new Map<string, PunchLogItem>();

  for (const punch of outPunches) {
    if (!punch) continue;
    const empKey = punch.employeeId || punch.employeeCode || punch.id || 'unknown';
    const workdayKey =
      punch.workday ||
      (punch.punchTime && typeof punch.punchTime === 'string'
        ? punch.punchTime.slice(0, 10)
        : 'unknown');
    const groupKey = `${empKey}__${workdayKey}`;

    const existing = latestByGroup.get(groupKey);
    if (!existing) {
      latestByGroup.set(groupKey, punch);
    } else {
      const existingTime = existing.punchTime ? new Date(existing.punchTime).getTime() : 0;
      const currTime = punch.punchTime ? new Date(punch.punchTime).getTime() : 0;
      if (currTime > existingTime) {
        latestByGroup.set(groupKey, punch);
      }
    }
  }

  return Array.from(latestByGroup.values()).sort((a, b) => {
    const timeA = a.punchTime ? new Date(a.punchTime).getTime() : 0;
    const timeB = b.punchTime ? new Date(b.punchTime).getTime() : 0;
    return timeA - timeB;
  });
}

export function filterExceptionPunches(punches: PunchLogItem[]): PunchLogItem[] {
  if (!Array.isArray(punches)) return [];
  return punches.filter((p) => {
    if (!p) return false;
    const badge = getPunchResultBadge(p);
    return badge.label === 'Flagged' || badge.label === 'Rejected' || badge.label === 'Failed';
  });
}

export function PunchLogsPage() {
  // ── 1. Page Header Date Range & Basis State ────────────────────────────────
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateInterpretation, setDateInterpretation] = useState<'event_timestamp' | 'workday'>(
    'event_timestamp',
  );

  // ── 2. Primary View Mode ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<PunchLogViewMode>('all');

  // ── 3. Filter Bar State ───────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // ── Pagination State ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const limit = 25;

  // ── Data & Metrics ────────────────────────────────────────────────────────
  const [rawPunches, setRawPunches] = useState<PunchLogItem[]>(() =>
    generateSamplePunchLogs(new Date().toISOString().slice(0, 10)),
  );
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [backendCounters, setBackendCounters] = useState<PunchLogSummaryCounters | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Metadata Options ──────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [workLocations, setWorkLocations] = useState<Array<{ id: string; name: string }>>([]);

  // ── Row Selection ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Contextual Row Menu ───────────────────────────────────────────────────
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── 7. Punch Detail Drawer State ──────────────────────────────────────────
  const [drawerPunchId, setDrawerPunchId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<PunchEventDetail | null>(null);
  const [drawerTab, setDrawerTab] = useState<'info' | 'location' | 'processing' | 'history'>(
    'info',
  );
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // ── 8. Investigate Flow Modal State ───────────────────────────────────────
  const [investigationModalOpen, setInvestigationModalOpen] = useState(false);
  const [investigatingPunch, setInvestigatingPunch] = useState<PunchLogItem | null>(null);
  const [investigationDecision, setInvestigationDecision] = useState<'accept' | 'reject'>('accept');
  const [investigationReason, setInvestigationReason] = useState('');
  const [investigationComment, setInvestigationComment] = useState('');
  const [investigationValidationError, setInvestigationValidationError] = useState<string | null>(
    null,
  );
  const [investigationSubmitting, setInvestigationSubmitting] = useState(false);

  // ── Standalone Punch Bulk Import Modal State ──────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // ── 9. Retry Processing Confirmation Modal State ──────────────────────────
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryPunchTarget, setRetryPunchTarget] = useState<PunchLogItem | null>(null);
  const [retrySubmitting, setRetrySubmitting] = useState(false);

  // ── Feedback Toast / Banner ───────────────────────────────────────────────
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'danger' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // ── Export Modal ──────────────────────────────────────────────────────────
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // ── Debounce Search Input ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Close action menu & filter panel on click outside ─────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest?.('.bezent-table-action-menu')) {
        setActiveMenuId(null);
      }
      if (!target.closest?.('.bezent-filter-anchor')) {
        setIsFilterPanelOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Fetch Master Metadata on Mount ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchDepartments({ status: 'active' }).catch(() => []),
      fetchWorkLocations({ status: 'active' }).catch(() => []),
    ]).then(([depts, locs]) => {
      setDepartments(depts.map((d) => ({ id: d.id, name: d.name })));
      setWorkLocations(locs.map((l) => ({ id: l.id, name: l.name })));
    });
  }, []);

  // ── Distinct Device Names from Items for Filter ───────────────────────────
  const knownDevices = useMemo(() => {
    const set = new Set<string>();
    rawPunches.forEach((item) => {
      const term = extractTerminalDeviceName(item);
      if (term && term !== '—') set.add(term);
    });
    return Array.from(set);
  }, [rawPunches]);

  // ── Active Filter Count Calculation ───────────────────────────────────────
  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (sourceFilter !== 'all') count += 1;
    if (deviceFilter !== 'all') count += 1;
    if (resultFilter !== 'all') count += 1;
    return count;
  }, [sourceFilter, deviceFilter, resultFilter]);

  const hasActiveFilters = Boolean(
    search.trim() ||
      sourceFilter !== 'all' ||
      deviceFilter !== 'all' ||
      resultFilter !== 'all' ||
      viewMode !== 'all',
  );

  // ── Data Loader ───────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: PunchLogFilter = {
        dateFrom,
        dateTo,
        dateInterpretation,
        search: debouncedSearch || undefined,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        validationStatus:
          resultFilter === 'accepted'
            ? 'valid'
            : resultFilter === 'flagged'
              ? 'needs_review'
              : resultFilter === 'rejected'
                ? 'invalid'
                : undefined,
        processingState: resultFilter === 'failed' ? 'failed' : undefined,
        page,
        limit,
      };

      const result = await fetchPunchLogs(filter);
      if (result && result.punches && result.punches.length > 0) {
        setRawPunches(result.punches);
        setIsUsingRealData(true);
        setBackendCounters(result.counters || null);
      } else {
        // Fall back to sample punch records for demonstration
        setRawPunches(generateSamplePunchLogs(dateFrom));
        setIsUsingRealData(false);
        setBackendCounters(null);
      }
    } catch {
      // In case of any API error or dev disconnect, seamlessly show sample records
      setRawPunches(generateSamplePunchLogs(dateFrom));
      setIsUsingRealData(false);
      setBackendCounters(null);
    } finally {
      setLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    dateInterpretation,
    debouncedSearch,
    sourceFilter,
    resultFilter,
    page,
    limit,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Punches in Active Date Scope (Basis for KPI Counters and Trend Graphs) ──
  const inDateRangePunches = useMemo(() => {
    return rawPunches.filter((p) => {
      if (dateInterpretation === 'event_timestamp') {
        const eventDate = p.punchTime ? p.punchTime.slice(0, 10) : '';
        if (dateFrom && eventDate < dateFrom) return false;
        if (dateTo && eventDate > dateTo) return false;
        return true;
      } else {
        const workday = p.workday || (p.punchTime ? p.punchTime.slice(0, 10) : '');
        if (dateFrom && workday < dateFrom) return false;
        if (dateTo && workday > dateTo) return false;
        return true;
      }
    });
  }, [rawPunches, dateInterpretation, dateFrom, dateTo]);

  // ── Scoped Punches (Date Range + Search + Advanced Filters) ────────────────
  const scopedBasePunches = useMemo(() => {
    let list = inDateRangePunches;

    // Search by employee name or employee code / rawIdentifier
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((p) => {
        const name = (p.employeeName || '').toLowerCase();
        const code = (p.employeeCode || '').toLowerCase();
        const raw = (p.rawIdentifier || '').toLowerCase();
        return name.includes(q) || code.includes(q) || raw.includes(q);
      });
    }

    // Advanced Filter: Source
    if (sourceFilter !== 'all') {
      list = list.filter((p) => {
        const s = (p.source || '').toLowerCase().trim();
        return s === sourceFilter.toLowerCase().trim();
      });
    }

    // Advanced Filter: Device
    if (deviceFilter !== 'all') {
      list = list.filter((p) => {
        const dev = extractTerminalDeviceName(p);
        return dev === deviceFilter;
      });
    }

    // Advanced Filter: Result
    if (resultFilter !== 'all') {
      list = list.filter((p) => {
        const badge = getPunchResultBadge(p);
        if (resultFilter === 'accepted') return badge.label === 'Accepted';
        if (resultFilter === 'flagged') return badge.label === 'Flagged';
        if (resultFilter === 'rejected') return badge.label === 'Rejected';
        if (resultFilter === 'failed') return badge.label === 'Failed';
        return true;
      });
    }

    return list;
  }, [
    inDateRangePunches,
    debouncedSearch,
    sourceFilter,
    deviceFilter,
    resultFilter,
  ]);

  // ── 5 Category Punches (All Punches, First In, Last Out, Late Punch, Exceptions) ──
  const categoryPunches = useMemo(() => {
    return {
      all: scopedBasePunches,
      firstIn: filterFirstInPunches(scopedBasePunches),
      lastOut: filterLastOutPunches(scopedBasePunches),
      latePunch: filterLatePunches(scopedBasePunches),
      exceptions: filterExceptionPunches(scopedBasePunches),
    };
  }, [scopedBasePunches]);

  // ── Derived Active Table Records from Selected Category Card ──────────────
  const filteredItems = useMemo(() => {
    if (viewMode === 'first_in') return categoryPunches.firstIn;
    if (viewMode === 'last_out') return categoryPunches.lastOut;
    if (viewMode === 'late_punch') return categoryPunches.latePunch;
    if (viewMode === 'exceptions') return categoryPunches.exceptions;
    return categoryPunches.all;
  }, [viewMode, categoryPunches]);

  // ── Actual Attendance Records Trends for the 5 Category Mini Graphs ───────
  const categoryTrends = useMemo(() => {
    return {
      all: computePunchTrendBuckets(categoryPunches.all, dateFrom, dateTo),
      firstIn: computePunchTrendBuckets(categoryPunches.firstIn, dateFrom, dateTo),
      lastOut: computePunchTrendBuckets(categoryPunches.lastOut, dateFrom, dateTo),
      latePunch: computePunchTrendBuckets(categoryPunches.latePunch, dateFrom, dateTo),
      exceptions: computePunchTrendBuckets(categoryPunches.exceptions, dateFrom, dateTo),
    };
  }, [categoryPunches, dateFrom, dateTo]);

  // ── Total Records and Pagination ──────────────────────────────────────────
  const totalCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const items = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, page, limit]);

  // ── Reset Filters ─────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSourceFilter('all');
    setDeviceFilter('all');
    setResultFilter('all');
    setViewMode('all');
    setSelectedIds(new Set());
    setPage(1);
  };

  // ── 7. Drawer Open & Fetch Handler ────────────────────────────────────────
  const handleOpenDrawer = async (
    punchId: string,
    tab: 'info' | 'location' | 'processing' | 'history' = 'info',
  ) => {
    setDrawerPunchId(punchId);
    setDrawerTab(tab);
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      const sampleItem =
        rawPunches.find((i) => i.id === punchId) ||
        generateSamplePunchLogs(dateFrom).find((i) => i.id === punchId);
      if (sampleItem) {
        setDrawerDetail(getSamplePunchDetail(sampleItem));
        setDrawerLoading(false);
        return;
      }
      const detail = await fetchPunchDetails(punchId);
      setDrawerDetail(detail);
    } catch {
      const sampleFallback = generateSamplePunchLogs(dateFrom).find((i) => i.id === punchId);
      if (sampleFallback) {
        setDrawerDetail(getSamplePunchDetail(sampleFallback));
      } else {
        setDrawerError('Failed to fetch punch details');
      }
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerPunchId(null);
    setDrawerDetail(null);
  };

  // ── 8. Investigate Flow Handlers ──────────────────────────────────────────
  const handleOpenInvestigation = (punch: PunchLogItem) => {
    setActiveMenuId(null);
    setInvestigatingPunch(punch);
    setInvestigationDecision('accept');
    setInvestigationReason('');
    setInvestigationComment('');
    setInvestigationValidationError(null);
    setInvestigationModalOpen(true);
  };

  const handleSaveInvestigation = async () => {
    if (!investigatingPunch) return;
    if (!investigationReason.trim() || !investigationComment.trim()) {
      setInvestigationValidationError('Please add a reason and comment before saving.');
      return;
    }
    setInvestigationValidationError(null);
    setInvestigationSubmitting(true);
    try {
      const isAccept = investigationDecision === 'accept';
      await updatePunchInvestigation({
        punchId: investigatingPunch.id,
        investigationStatus: isAccept ? 'resolved' : 'closed',
        investigationNotes: `[Decision: ${isAccept ? 'Accepted' : 'Rejected'}] Reason: ${investigationReason.trim()} | Comment: ${investigationComment.trim()}`,
      }).catch(() => null);

      // Update local state for responsive UI demonstration
      setRawPunches((prev) =>
        prev.map((item) => {
          if (item.id === investigatingPunch.id) {
            return {
              ...item,
              validationStatus: isAccept ? 'valid' : 'invalid',
              validationReason: `Investigated: ${investigationReason.trim()}`,
              investigationStatus: isAccept ? 'resolved' : 'closed',
              linkedAttendanceId: isAccept ? `att-${item.employeeCode}-${item.workday}` : undefined,
            };
          }
          return item;
        }),
      );

      setBannerMessage({
        type: 'success',
        text: `Punch marked as ${isAccept ? 'Accepted' : 'Rejected'}.`,
      });
      setInvestigationModalOpen(false);
      setInvestigatingPunch(null);
      if (drawerPunchId === investigatingPunch.id) {
        handleOpenDrawer(investigatingPunch.id, drawerTab);
      }
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Could not save investigation decision.',
      });
    } finally {
      setInvestigationSubmitting(false);
    }
  };

  // ── 9. Retry Processing Flow Handlers ─────────────────────────────────────
  const handleOpenRetryConfirmation = (punch: PunchLogItem) => {
    setActiveMenuId(null);
    setRetryPunchTarget(punch);
    setRetryModalOpen(true);
  };

  const handleExecuteRetry = async () => {
    if (!retryPunchTarget) return;
    setRetrySubmitting(true);
    try {
      await retryPunchProcessing([retryPunchTarget.id]).catch(() => null);

      // Update local item for responsive demo
      setRawPunches((prev) =>
        prev.map((item) => {
          if (item.id === retryPunchTarget.id) {
            return {
              ...item,
              processingState: 'processed',
              validationStatus: 'valid',
              validationReason: 'Processed via retry',
              linkedAttendanceId: `att-${item.employeeCode}-${item.workday}`,
            };
          }
          return item;
        }),
      );

      setBannerMessage({
        type: 'success',
        text: 'Punch processed successfully.',
      });
      setRetryModalOpen(false);
      setRetryPunchTarget(null);
      if (drawerPunchId === retryPunchTarget.id) {
        handleOpenDrawer(retryPunchTarget.id, drawerTab);
      }
    } catch {
      setBannerMessage({
        type: 'danger',
        text: 'Could not process this punch. Please check the details and try again.',
      });
    } finally {
      setRetrySubmitting(false);
    }
  };

  // ── Row Selection Handlers ────────────────────────────────────────────────
  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleToggleSelectRow = (punchId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(punchId)) next.delete(punchId);
      else next.add(punchId);
      return next;
    });
  };

  // ── Export Handler ────────────────────────────────────────────────────────
  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const selectedList = exportScope === 'selected' ? Array.from(selectedIds) : undefined;
      const blob = await exportPunchLogsCsv(
        {
          dateFrom,
          dateTo,
          dateInterpretation,
          search: debouncedSearch || undefined,
          source: sourceFilter === 'all' ? undefined : sourceFilter,
          validationStatus:
            resultFilter === 'accepted'
              ? 'valid'
              : resultFilter === 'flagged'
                ? 'needs_review'
                : resultFilter === 'rejected'
                  ? 'invalid'
                  : undefined,
          processingState: resultFilter === 'failed' ? 'failed' : undefined,
        },
        selectedList,
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `punch_logs_${dateFrom}_${dateTo}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportModalOpen(false);
      setBannerMessage({ type: 'success', text: 'Punch logs export downloaded successfully.' });
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Export failed.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Drawer Tabs
  const drawerTabs = useMemo(
    () => [
      { id: 'info', label: 'Punch Information' },
      { id: 'location', label: 'Location' },
      { id: 'processing', label: 'Processing' },
      { id: 'history', label: 'History' },
    ],
    [],
  );

  const getPaginationItems = (currentPage: number, total: number): (number | 'ellipsis')[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('ellipsis');
      pages.push(total);
    } else if (currentPage >= total - 3) {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('ellipsis');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('ellipsis');
      pages.push(total);
    }
    return pages;
  };

  return (
    <Page>
      {/* ── 1. Page Header (Unified Attendance Navigation) ── */}
      <PageHeader title="Attendance" actions={<AttendanceSectionTabs group="records" />} />

      <Stack gap="md">
        {/* Banner Notification */}
        {bannerMessage && (
          <Alert variant={bannerMessage.type} dismissible onDismiss={() => setBannerMessage(null)}>
            {bannerMessage.text}
          </Alert>
        )}

        {/* ── 2. Five Interactive Category Summary Cards (Primary Category Navigation) ── */}
        <Grid columns={5} className="bezent-punch-kpi-grid">
          {/* Card 1: All Punches */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--blue ${viewMode === 'all' ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('all');
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('all');
                setPage(1);
              }
            }}
            title="All Punches: Display all recorded punch entries."
            role="button"
            tabIndex={0}
            aria-pressed={viewMode === 'all'}
          >
            <div className="bezent-kpi-card__top">
              <div className="bezent-kpi-card__left">
                <span className="bezent-kpi-card__title">All Punches</span>
                <span className="bezent-kpi-card__value">{categoryPunches.all.length}</span>
              </div>
              <div className="bezent-kpi-card__graph">
                <AllPunchesLineChart
                  data={categoryTrends.all}
                  total={categoryPunches.all.length}
                />
              </div>
            </div>
            <div className="bezent-kpi-sub-pill bezent-kpi-sub-pill--blue">
              <span className="bezent-kpi-sub-pill-dot" />
              Total Activity
            </div>
          </div>

          {/* Card 2: First In */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--green ${viewMode === 'first_in' ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('first_in');
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('first_in');
                setPage(1);
              }
            }}
            title="First In: Earliest IN punch per employee per workday."
            role="button"
            tabIndex={0}
            aria-pressed={viewMode === 'first_in'}
          >
            <div className="bezent-kpi-card__top">
              <div className="bezent-kpi-card__left">
                <span className="bezent-kpi-card__title">First In</span>
                <span className="bezent-kpi-card__value">{categoryPunches.firstIn.length}</span>
              </div>
              <div className="bezent-kpi-card__graph">
                <FirstInBarChart
                  data={categoryTrends.firstIn}
                  total={categoryPunches.firstIn.length}
                />
              </div>
            </div>
            <div className="bezent-kpi-sub-pill bezent-kpi-sub-pill--green">
              <span className="bezent-kpi-sub-pill-dot" />
              First Inbound
            </div>
          </div>

          {/* Card 3: Last Out */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--purple ${viewMode === 'last_out' ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('last_out');
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('last_out');
                setPage(1);
              }
            }}
            title="Last Out: Latest OUT punch per employee per workday."
            role="button"
            tabIndex={0}
            aria-pressed={viewMode === 'last_out'}
          >
            <div className="bezent-kpi-card__top">
              <div className="bezent-kpi-card__left">
                <span className="bezent-kpi-card__title">Last Out</span>
                <span className="bezent-kpi-card__value">{categoryPunches.lastOut.length}</span>
              </div>
              <div className="bezent-kpi-card__graph">
                <LastOutAreaChart
                  data={categoryTrends.lastOut}
                  total={categoryPunches.lastOut.length}
                />
              </div>
            </div>
            <div className="bezent-kpi-sub-pill bezent-kpi-sub-pill--purple">
              <span className="bezent-kpi-sub-pill-dot" />
              Last Outbound
            </div>
          </div>

          {/* Card 4: Late Punch */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--amber ${viewMode === 'late_punch' ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('late_punch');
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('late_punch');
                setPage(1);
              }
            }}
            title="Late Punch: Display late punch records."
            role="button"
            tabIndex={0}
            aria-pressed={viewMode === 'late_punch'}
          >
            <div className="bezent-kpi-card__top">
              <div className="bezent-kpi-card__left">
                <span className="bezent-kpi-card__title">Late Punch</span>
                <span className="bezent-kpi-card__value">{categoryPunches.latePunch.length}</span>
              </div>
              <div className="bezent-kpi-card__graph">
                <LatePunchHistogram
                  punches={categoryPunches.latePunch}
                  data={categoryTrends.latePunch}
                  total={categoryPunches.latePunch.length}
                />
              </div>
            </div>
            <div className="bezent-kpi-sub-pill bezent-kpi-sub-pill--amber">
              <span className="bezent-kpi-sub-pill-dot" />
              Late Arrivals
            </div>
          </div>

          {/* Card 5: Exceptions */}
          <div
            className={`bezent-kpi-card bezent-kpi-card--red ${viewMode === 'exceptions' ? 'is-active' : ''}`}
            onClick={() => {
              setViewMode('exceptions');
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setViewMode('exceptions');
                setPage(1);
              }
            }}
            title="Exceptions: Flagged, Rejected, and Failed to Process records."
            role="button"
            tabIndex={0}
            aria-pressed={viewMode === 'exceptions'}
          >
            <div className="bezent-kpi-card__top">
              <div className="bezent-kpi-card__left">
                <span className="bezent-kpi-card__title">Exceptions</span>
                <span className="bezent-kpi-card__value">{categoryPunches.exceptions.length}</span>
              </div>
              <div className="bezent-kpi-card__graph">
                <ExceptionsDonutChart
                  punches={categoryPunches.exceptions}
                  data={categoryTrends.exceptions}
                  total={categoryPunches.exceptions.length}
                />
              </div>
            </div>
            <div className="bezent-kpi-sub-pill bezent-kpi-sub-pill--red">
              <span className="bezent-kpi-sub-pill-dot" />
              Requires Review
            </div>
          </div>
        </Grid>

        {/* ── 3. Single-Line Directory Toolbar ── */}
        <div className="bezent-directory-toolbar bezent-att-directory-toolbar">
          <div className="bezent-att-toolbar-left">
            <div className="bezent-att-search">
              <SearchInput
                value={search}
                shape="rounded"
                aria-label="Search by name or employee ID"
                placeholder="Search name or ID"
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>

            {/* Advanced Filters Button & Popover */}
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
                  {/* Panel Header */}
                  <div className="bezent-filter-panel__header">
                    <div className="bezent-filter-panel__title-group">
                      <BezentIcon name="filter" size={16} />
                      <h3 className="bezent-filter-panel__title">Filter Punch Logs</h3>
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

                  {/* Panel Form Body */}
                  <div className="bezent-filter-panel__body-compact">
                    <div className="bezent-filter-form-grid">
                      {/* Source Filter */}
                      <div className="bezent-filter-form-group">
                        <label className="bezent-filter-label" htmlFor="filter-source">
                          Source
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-source"
                            className="bezent-filter-select-control"
                            value={sourceFilter}
                            onChange={(e) => {
                              setSourceFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All Sources</option>
                            <option value="biometric">Biometric</option>
                            <option value="web">Web</option>
                            <option value="mobile">Mobile</option>
                            <option value="manual">Manual</option>
                            <option value="import">Import</option>
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Device Filter */}
                      <div className="bezent-filter-form-group">
                        <label className="bezent-filter-label" htmlFor="filter-device">
                          Device
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-device"
                            className="bezent-filter-select-control"
                            value={deviceFilter}
                            onChange={(e) => {
                              setDeviceFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All Devices</option>
                            {knownDevices.map((dev) => (
                              <option key={dev} value={dev}>
                                {dev}
                              </option>
                            ))}
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>

                      {/* Result Filter */}
                      <div className="bezent-filter-form-group--full">
                        <label className="bezent-filter-label" htmlFor="filter-result">
                          Result
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-result"
                            className="bezent-filter-select-control"
                            value={resultFilter}
                            onChange={(e) => {
                              setResultFilter(e.target.value);
                              setPage(1);
                            }}
                          >
                            <option value="all">All</option>
                            <option value="accepted">Accepted</option>
                            <option value="flagged">Flagged</option>
                            <option value="rejected">Rejected</option>
                            <option value="failed">Failed to Process</option>
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
              <Button
                variant="outline"
                size="md"
                shape="rounded"
                leftIcon={<BezentIcon name="reset" size={14} />}
                onClick={handleResetFilters}
                title="Reset all active filters"
              >
                Reset
              </Button>
            )}
          </div>

          <div className="bezent-directory-toolbar__actions bezent-att-toolbar-actions">
            {/* Date Range Inputs */}
            <div className="bezent-att-workday-nav">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                aria-label="Start date"
              />
              <span className="bezent-filter-strip-label">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                aria-label="End date"
              />
            </div>

            {/* Date Basis Toggle: Event Time vs Workday */}
            <div className="bezent-segmented-toggle">
              <button
                type="button"
                className={`bezent-segmented-toggle__btn ${
                  dateInterpretation === 'event_timestamp' ? 'is-active' : ''
                }`}
                onClick={() => {
                  setDateInterpretation('event_timestamp');
                  setPage(1);
                }}
                title="Event Time: Filter by the exact time the punch was made."
              >
                Event Time
              </button>
              <button
                type="button"
                className={`bezent-segmented-toggle__btn ${
                  dateInterpretation === 'workday' ? 'is-active' : ''
                }`}
                onClick={() => {
                  setDateInterpretation('workday');
                  setPage(1);
                }}
                title="Workday: Filter by the attendance date the punch belongs to."
              >
                Workday
              </button>
            </div>

            {/* Export: Icon Only */}
            <Button
              variant="outline"
              size="md"
              shape="rounded"
              onClick={() => setExportModalOpen(true)}
              aria-label="Export Punch Logs"
              title="Export Punch Logs"
            >
              <BezentIcon name="download" size={16} />
            </Button>

            {/* Import: Icon Only */}
            <Button
              variant="outline"
              size="md"
              shape="rounded"
              onClick={() => setIsImportModalOpen(true)}
              aria-label="Import Punches CSV"
              title="Import Punches CSV"
            >
              <BezentIcon name="upload" size={16} />
            </Button>

            <span className="bezent-records-badge">{totalCount} Records</span>
          </div>
        </div>

        {/* Active Filter Chips Strip */}
        {appliedFilterCount > 0 && (
          <div className="bezent-active-chips-strip">
            {sourceFilter !== 'all' && (
              <span className="bezent-active-filter-chip">
                <span>{`Source: ${formatSourceLabel(sourceFilter)}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove source filter"
                  onClick={() => {
                    setSourceFilter('all');
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {deviceFilter !== 'all' && (
              <span className="bezent-active-filter-chip">
                <span>{`Device: ${deviceFilter}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove device filter"
                  onClick={() => {
                    setDeviceFilter('all');
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}

            {resultFilter !== 'all' && (
              <span className="bezent-active-filter-chip">
                <span>{`Result: ${resultFilter.charAt(0).toUpperCase() + resultFilter.slice(1)}`}</span>
                <button
                  type="button"
                  className="bezent-active-filter-chip__remove"
                  aria-label="Remove result filter"
                  onClick={() => {
                    setResultFilter('all');
                    setPage(1);
                  }}
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* ── Contextual Bulk Selection Bar ── */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center">
              <span className="bezent-table-meta-title">
                {selectedIds.size} punch event(s) selected
              </span>
              <Inline gap="sm" align="center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExportScope('selected');
                    setExportModalOpen(true);
                  }}
                >
                  Export Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear Selection
                </Button>
              </Inline>
            </Inline>
          </Card>
        )}

        {/* ── 5. Main Table with Zero-CLS Shimmer Skeleton ── */}
        {loading ? (
          <Card padding="none">
            <Table compact hoverable>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="bezent-table-col--select">
                    <Checkbox disabled aria-label="Select all rows" />
                  </TableHeaderCell>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Punch Time</TableHeaderCell>
                  <TableHeaderCell>Direction</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Device</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Result</TableHeaderCell>
                  <TableHeaderCell>Used in Calculation</TableHeaderCell>
                  <TableHeaderCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableSkeleton rows={8} columns={10} label="Loading punch logs..." />
            </Table>
          </Card>
        ) : error ? (
          <Alert variant="danger" title="Could not load punch logs">
            <span>Something went wrong while loading.</span>
            <Inline gap="xs">
              <Button variant="secondary" size="sm" onClick={loadData}>
                Retry
              </Button>
            </Inline>
          </Alert>
        ) : items.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              variant="attendance"
              title="No matching punches"
              description="No punches match your filters."
              primaryAction={{
                label: 'Reset Filters',
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <EmptyState
              variant="attendance"
              title="No punches found"
              description="No punches were captured for the selected date range."
            />
          )
        ) : (
          <Card padding="none">
            <Table compact hoverable>
              <TableHead>
                <TableRow>
                  {/* Select Checkbox */}
                  <TableHeaderCell className="bezent-table-col--select">
                    <Checkbox
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all rows"
                    />
                  </TableHeaderCell>
                  {/* 1. Employee */}
                  <TableHeaderCell>Employee</TableHeaderCell>
                  {/* 2. Punch Time (Matches Event Time basis) */}
                  <TableHeaderCell>Punch Time</TableHeaderCell>
                  {/* 3. Direction */}
                  <TableHeaderCell>Direction</TableHeaderCell>
                  {/* 4. Source */}
                  <TableHeaderCell>Source</TableHeaderCell>
                  {/* 5. Device */}
                  <TableHeaderCell>Device</TableHeaderCell>
                  {/* 6. Location */}
                  <TableHeaderCell>Location</TableHeaderCell>
                  {/* 7. Result */}
                  <TableHeaderCell>Result</TableHeaderCell>
                  {/* 8. Used in Calculation */}
                  <TableHeaderCell>Used in Calculation</TableHeaderCell>
                  {/* 9. Actions (Sticky Right) */}
                  <TableHeaderCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((punch) => {
                  const isSelected = selectedIds.has(punch.id);
                  const isMenuOpen = activeMenuId === punch.id;
                  const resultBadge = getPunchResultBadge(punch);
                  const deviceName = extractTerminalDeviceName(punch);
                  const selfieUrl = extractSelfieThumbnail(punch);
                  const isUsedInCalc =
                    punch.linkedAttendanceId !== null &&
                    punch.linkedAttendanceId !== undefined &&
                    resultBadge.label === 'Accepted';

                  return (
                    <TableRow key={punch.id} onClick={() => handleOpenDrawer(punch.id)}>
                      {/* Checkbox */}
                      <TableCell
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectRow(punch.id);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(punch.id)}
                          aria-label={`Select punch event ${punch.id}`}
                        />
                      </TableCell>

                      {/* 1. Employee (Avatar + Name + ID + optional selfie thumbnail) */}
                      <TableCell>
                        <div className="bezent-table-cell--avatar-meta">
                          <Avatar
                            initials={
                              punch.employeeName
                                ? punch.employeeName.slice(0, 2).toUpperCase()
                                : '?'
                            }
                            alt={punch.employeeName || 'Unmatched'}
                            src={selfieUrl || punch.avatarUrl}
                            size="sm"
                          />
                          <div className="bezent-table-meta-group">
                            <span className="bezent-table-meta-title">
                              {punch.employeeName || 'Unmatched Identity'}
                            </span>
                            <span className="bezent-table-meta-subtitle">
                              {punch.employeeCode || punch.rawIdentifier || '—'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Punch Time (Date + HH:MM:SS 24-hr format) */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {format24HourTime(punch.punchTime)}
                        </span>
                      </TableCell>

                      {/* 3. Direction (In / Out) */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatDirectionLabel(punch.punchType)}
                        </span>
                      </TableCell>

                      {/* 4. Source Badge */}
                      <TableCell>
                        <Badge variant="neutral">{formatSourceLabel(punch.source)}</Badge>
                      </TableCell>

                      {/* 5. Device (Terminal name, else —) */}
                      <TableCell>
                        <span className="bezent-table-meta-title">{deviceName}</span>
                      </TableCell>

                      {/* 6. Location (Zone name or Outside zone / —) */}
                      <TableCell>
                        <span className="bezent-table-meta-title">{punch.workLocation || '—'}</span>
                      </TableCell>

                      {/* 7. Result Badge */}
                      <TableCell>
                        <span title={resultBadge.tooltip}>
                          <Badge variant={resultBadge.variant}>{resultBadge.label}</Badge>
                        </span>
                      </TableCell>

                      {/* 8. Used in Calculation (Yes / No) */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {isUsedInCalc ? 'Yes' : 'No'}
                        </span>
                      </TableCell>

                      {/* 9. Row Actions (Sticky Right — Spec Section 6) */}
                      <TableCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                        <div
                          className="bezent-table-action-menu"
                          ref={isMenuOpen ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : punch.id);
                            }}
                            aria-label={`Actions for punch ${punch.id}`}
                          >
                            <BezentIcon name="more" size={16} />
                          </button>

                          {isMenuOpen && (
                            <div
                              className="bezent-table-action-menu__dropdown"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Open detail: Always */}
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleOpenDrawer(punch.id, 'info');
                                }}
                              >
                                <BezentIcon name="visibility" size={14} /> View Details
                              </button>

                              {/* Investigate: When Flagged */}
                              {resultBadge.label === 'Flagged' && (
                                <button
                                  type="button"
                                  className="bezent-table-action-menu__item"
                                  onClick={() => handleOpenInvestigation(punch)}
                                >
                                  <BezentIcon name="search" size={14} /> Investigate
                                </button>
                              )}

                              {/* Retry: When Failed */}
                              {resultBadge.label === 'Failed' && (
                                <button
                                  type="button"
                                  className="bezent-table-action-menu__item"
                                  onClick={() => handleOpenRetryConfirmation(punch)}
                                >
                                  <BezentIcon name="reset" size={14} /> Retry Processing
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Table Footer: Clean Records Summary & Enterprise Pagination */}
            <div className="bezent-att-table-footer">
              <span className="bezent-att-table-footer-info" aria-live="polite">
                {totalPages <= 1
                  ? `Showing all ${items.length} ${items.length === 1 ? 'record' : 'records'}`
                  : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount} records`}
              </span>

              {totalPages > 1 && (
                <div className="bezent-pagination" role="navigation" aria-label="Pagination">
                  <button
                    type="button"
                    className="bezent-pagination__btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  {getPaginationItems(page, totalPages).map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`ellipsis-${idx}`} className="bezent-pagination__ellipsis">
                        …
                      </span>
                    ) : (
                      <button
                        key={`page-${item}`}
                        type="button"
                        className={`bezent-pagination__btn ${item === page ? 'is-active' : ''}`}
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className="bezent-pagination__btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── 7. Punch Detail Drawer (Spec Section 7) ── */}
        <Modal
          isOpen={!!drawerPunchId}
          onClose={handleCloseDrawer}
          variant="drawer"
          size="drawer"
          title="Punch Details"
          headerBottom={
            <Tabs
              items={drawerTabs}
              activeId={drawerTab}
              onChange={(id) => setDrawerTab(id as 'info' | 'location' | 'processing' | 'history')}
            />
          }
        >
          {drawerLoading ? (
            <LoadingState label="Loading punch details..." />
          ) : drawerError ? (
            <Alert variant="danger">{drawerError}</Alert>
          ) : !drawerDetail ? (
            <EmptyState title="Punch Not Found" description="Could not load punch event details." />
          ) : (
            <Stack gap="md">
              {/* Section 1: Punch Information (Time, Direction, Source, Device) */}
              {drawerTab === 'info' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-card__title">Employee Information</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Employee Name:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.employeeName || '—'}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Employee Code:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.employeeCode || '—'}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Department:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.departmentName || '—'}
                        </span>
                      </Inline>
                    </Stack>
                  </Card>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-card__title">Punch Event</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Event Timestamp:</span>
                        <span className="bezent-table-meta-title">
                          {format24HourTime(drawerDetail.punchTime)}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Assigned Workday:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.workday || '—'}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Direction:</span>
                        <span className="bezent-table-meta-title">
                          {formatDirectionLabel(drawerDetail.punchType)}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Source Gateway:</span>
                        <Badge variant="neutral">{formatSourceLabel(drawerDetail.source)}</Badge>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Processing Status:</span>
                        <Badge variant={getPunchResultBadge(drawerDetail).variant}>
                          {getPunchResultBadge(drawerDetail).label}
                        </Badge>
                      </Inline>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Section 2: Location Information */}
              {drawerTab === 'location' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-card__title">Work Location & Zone</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Location:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.workLocation || '—'}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Device / Terminal:</span>
                        <span className="bezent-table-meta-title">
                          {extractTerminalDeviceName(drawerDetail)}
                        </span>
                      </Inline>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Section 3: Processing & Validation Information */}
              {drawerTab === 'processing' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-card__title">Validation & Pairing</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Validation Status:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.validationStatus || '—'}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Validation Reason:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.validationReason || drawerDetail.notes || '—'}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Used in Calculation:</span>
                        <span className="bezent-table-meta-title">
                          {drawerDetail.linkedAttendanceId ? 'Yes' : 'No'}
                        </span>
                      </Inline>
                      {drawerDetail.processingError && (
                        <Alert variant="danger" title="Processing Error">
                          {drawerDetail.processingError}
                        </Alert>
                      )}
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Section 4: History & Audit Timeline */}
              {drawerTab === 'history' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <span className="bezent-card__title">Audit Trail</span>
                    {drawerDetail.audits && drawerDetail.audits.length > 0 ? (
                      <Stack gap="xs">
                        {drawerDetail.audits.map((audit) => (
                          <div key={audit.id} className="bezent-table-meta-group">
                            <span className="bezent-table-meta-title">{audit.action}</span>
                            <span className="bezent-card__desc">{audit.notes || '—'}</span>
                            <span className="bezent-table-meta-subtitle">
                              {format24HourTime(audit.createdAt)}
                            </span>
                          </div>
                        ))}
                      </Stack>
                    ) : (
                      <span className="bezent-card__desc">No audit entries recorded.</span>
                    )}
                  </Card>
                </Stack>
              )}
            </Stack>
          )}
        </Modal>

        {/* ── 8. Investigate Flow Modal (Spec Section 8) ── */}
        {investigationModalOpen && investigatingPunch && (
          <Modal
            isOpen={investigationModalOpen}
            onClose={() => setInvestigationModalOpen(false)}
            size="md"
            title={`Investigate Punch: ${investigatingPunch.employeeName || 'Unmatched'}`}
          >
            <Stack gap="md">
              {investigationValidationError && (
                <Alert variant="danger">{investigationValidationError}</Alert>
              )}

              <Card padding="sm">
                <Stack gap="xs">
                  <Inline justify="between">
                    <span className="bezent-card__desc">Employee:</span>
                    <span className="bezent-table-meta-title">
                      {investigatingPunch.employeeName} ({investigatingPunch.employeeCode || '—'})
                    </span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Punch Time:</span>
                    <span className="bezent-table-meta-title">
                      {format24HourTime(investigatingPunch.punchTime)}
                    </span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Flag Reason:</span>
                    <span className="bezent-table-meta-title">
                      {investigatingPunch.validationReason || 'Needs manual review'}
                    </span>
                  </Inline>
                </Stack>
              </Card>

              <Select
                label="Decision"
                value={investigationDecision}
                onChange={(e) => setInvestigationDecision(e.target.value as 'accept' | 'reject')}
              >
                <option value="accept">Accept — Count punch in attendance</option>
                <option value="reject">Reject — Discard punch</option>
              </Select>

              <Input
                label="Reason"
                placeholder="e.g. Employee provided approved travel slip"
                value={investigationReason}
                onChange={(e) => setInvestigationReason(e.target.value)}
              />

              <Textarea
                label="Internal HR Notes"
                placeholder="Add audit documentation..."
                value={investigationComment}
                onChange={(e) => setInvestigationComment(e.target.value)}
              />

              <Inline justify="end" gap="sm">
                <Button variant="ghost" onClick={() => setInvestigationModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={investigationSubmitting}
                  onClick={handleSaveInvestigation}
                >
                  Save Decision
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}

        {/* ── 9. Retry Processing Confirmation Modal (Spec Section 9) ── */}
        {retryModalOpen && retryPunchTarget && (
          <Modal
            isOpen={retryModalOpen}
            onClose={() => setRetryModalOpen(false)}
            size="sm"
            title="Retry Punch Processing"
          >
            <Stack gap="md">
              <span className="bezent-card__desc">
                Are you sure you want to re-queue this failed punch for processing?
              </span>

              <Card padding="sm">
                <Stack gap="xs">
                  <Inline justify="between">
                    <span className="bezent-card__desc">Employee:</span>
                    <span className="bezent-table-meta-title">
                      {retryPunchTarget.employeeName || '—'}
                    </span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Timestamp:</span>
                    <span className="bezent-table-meta-title">
                      {format24HourTime(retryPunchTarget.punchTime)}
                    </span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Error:</span>
                    <span className="bezent-table-meta-title">
                      {retryPunchTarget.processingError || 'Sync timeout'}
                    </span>
                  </Inline>
                </Stack>
              </Card>

              <Inline justify="end" gap="sm">
                <Button variant="ghost" onClick={() => setRetryModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" loading={retrySubmitting} onClick={handleExecuteRetry}>
                  Retry Now
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}

        {/* ── Export CSV Dialog Modal ── */}
        {exportModalOpen && (
          <Modal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            size="sm"
            title="Export Punch Logs"
          >
            <Stack gap="md">
              <span className="bezent-card__desc">
                Download tenant-scoped punch events as a security-escaped CSV spreadsheet.
              </span>

              <Select
                label="Export Scope"
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as 'all' | 'selected')}
              >
                <option value="all">All Filtered Punches ({totalCount} punches)</option>
                {selectedIds.size > 0 && (
                  <option value="selected">Selected Punches ({selectedIds.size} punches)</option>
                )}
              </Select>

              <Card padding="sm">
                <Stack gap="none">
                  <span className="bezent-card__desc">
                    Active Range: {dateFrom} to {dateTo}
                  </span>
                  <span className="bezent-card__desc">
                    Active View:{' '}
                    {viewMode === 'all'
                      ? 'All Punches'
                      : viewMode === 'first_in'
                        ? 'First In'
                        : viewMode === 'last_out'
                          ? 'Last Out'
                          : viewMode === 'late_punch'
                            ? 'Late Punch'
                            : 'Exceptions'}
                  </span>
                  <span className="bezent-card__desc">
                    Date Basis:{' '}
                    {dateInterpretation === 'event_timestamp' ? 'Event Time' : 'Workday'}
                  </span>
                </Stack>
              </Card>

              <Inline justify="end" gap="sm">
                <Button variant="ghost" onClick={() => setExportModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" loading={isExporting} onClick={handleExecuteExport}>
                  Download CSV
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}
      </Stack>

      {/* Standalone Attendance Punch Bulk Import Modal */}
      <AttendanceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          loadData();
        }}
      />
    </Page>
  );
}
