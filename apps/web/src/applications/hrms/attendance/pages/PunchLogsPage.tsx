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
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchPunchLogs,
  fetchPunchDetails,
  updatePunchInvestigation,
  retryPunchProcessing,
  bulkPunchAction,
  exportPunchLogsCsv,
} from '../api/attendanceApi';
import { fetchDepartments, fetchWorkLocations } from '../../api/organizationMastersApi';
import type {
  PunchLogItem,
  PunchLogSummaryCounters,
  PunchEventDetail,
  PunchLogFilter,
} from '../types/attendance.types';

// ============================================================================
// Section 4: Status and Source Helpers
// ============================================================================
interface StatusBadgeConfig {
  label: string;
  tooltip: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

function getPunchResultBadge(punch: PunchLogItem): StatusBadgeConfig {
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
  const meta = punch.deviceMetadata as Record<string, unknown> | null | undefined;
  if (!meta) return null;
  return (
    (meta.selfieUrl as string) || (meta.photoUrl as string) || (meta.imageUrl as string) || null
  );
}

export function PunchLogsPage() {
  // ── 1. Page Header Date Range & Basis State ────────────────────────────────
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateInterpretation, setDateInterpretation] = useState<'event_timestamp' | 'workday'>(
    'event_timestamp',
  );

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
  const [items, setItems] = useState<PunchLogItem[]>([]);
  const [counters, setCounters] = useState<PunchLogSummaryCounters>({
    total: 0,
    valid: 0,
    needsReview: 0,
    duplicates: 0,
    unmatched: 0,
    processingFailed: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
    items.forEach((item) => {
      const term = extractTerminalDeviceName(item);
      if (term && term !== '—') set.add(term);
    });
    return Array.from(set);
  }, [items]);

  // ── Active Filter Count Calculation ───────────────────────────────────────
  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (sourceFilter !== 'all') count += 1;
    if (deviceFilter !== 'all') count += 1;
    if (resultFilter !== 'all') count += 1;
    return count;
  }, [sourceFilter, deviceFilter, resultFilter]);

  const hasActiveFilters = Boolean(
    search.trim() || sourceFilter !== 'all' || deviceFilter !== 'all' || resultFilter !== 'all',
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
      setItems(result.punches || []);
      setCounters(
        result.counters || {
          total: 0,
          valid: 0,
          needsReview: 0,
          duplicates: 0,
          unmatched: 0,
          processingFailed: 0,
        },
      );
      setTotalCount(result.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load punch logs');
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

  // ── Reset Filters ─────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSourceFilter('all');
    setDeviceFilter('all');
    setResultFilter('all');
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
      const detail = await fetchPunchDetails(punchId);
      setDrawerDetail(detail);
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to fetch punch details');
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
      });
      setBannerMessage({
        type: 'success',
        text: `Punch marked as ${isAccept ? 'Accepted' : 'Rejected'}.`,
      });
      setInvestigationModalOpen(false);
      setInvestigatingPunch(null);
      await loadData();
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
      await retryPunchProcessing([retryPunchTarget.id]);
      setBannerMessage({
        type: 'success',
        text: 'Punch processed successfully.',
      });
      setRetryModalOpen(false);
      setRetryPunchTarget(null);
      await loadData();
      if (drawerPunchId === retryPunchTarget.id) {
        handleOpenDrawer(retryPunchTarget.id, drawerTab);
      }
    } catch (err: unknown) {
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

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

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

  return (
    <Page>
      {/* ── 1. Page Header (Spec Section 1) ── */}
      <PageHeader
        eyebrow="Attendance › Punch Logs"
        title="Punch Logs"
        subtitle="Review every raw punch captured from devices, web and mobile."
        actions={
          <Inline gap="sm" align="center">
            {/* Date Range Inputs */}
            <Inline gap="xs" align="center">
              <span className="bezent-table-meta-subtitle">Date Range:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                aria-label="Start date"
              />
              <span className="bezent-card__desc">to</span>
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

            {/* Date Basis Toggle with Spec Tooltips */}
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
                title="Event Time: Filter by the exact time the punch was made. Matches Punch Time in the table."
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
                title="Workday: Filter by the attendance date the punch belongs to. Night shift punches after midnight stay on the shift's workday."
              >
                Workday
              </button>
            </div>

            {/* Secondary Button: Export */}
            <Button
              variant="outline"
              size="md"
              shape="rounded"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={() => setExportModalOpen(true)}
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

        {/* ── 2. Summary Cards (Spec Section 2) ── */}
        <Grid columns={5} gap="sm">
          {/* Card 1: Total Punches */}
          <div
            className={`bezent-kpi-card ${resultFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => {
              setResultFilter('all');
              setPage(1);
            }}
            title="Total raw punches captured in selected date range"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Total Punches</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{counters.total}</span>
            </div>
          </div>

          {/* Card 2: Accepted */}
          <div
            className={`bezent-kpi-card ${resultFilter === 'accepted' ? 'is-active' : ''}`}
            onClick={() => {
              setResultFilter((curr) => (curr === 'accepted' ? 'all' : 'accepted'));
              setPage(1);
            }}
            title="Punches counted in the day's attendance"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Accepted</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{counters.valid}</span>
            </div>
          </div>

          {/* Card 3: Flagged */}
          <div
            className={`bezent-kpi-card ${resultFilter === 'flagged' ? 'is-active' : ''}`}
            onClick={() => {
              setResultFilter((curr) => (curr === 'flagged' ? 'all' : 'flagged'));
              setPage(1);
            }}
            title="Needs review before it is counted"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Flagged</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">
                {counters.needsReview + counters.unmatched}
              </span>
            </div>
          </div>

          {/* Card 4: Rejected */}
          <div
            className={`bezent-kpi-card ${resultFilter === 'rejected' ? 'is-active' : ''}`}
            onClick={() => {
              setResultFilter((curr) => (curr === 'rejected' ? 'all' : 'rejected'));
              setPage(1);
            }}
            title="Not counted in attendance"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Rejected</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{counters.duplicates}</span>
            </div>
          </div>

          {/* Card 5: Failed to Process */}
          <div
            className={`bezent-kpi-card ${resultFilter === 'failed' ? 'is-active' : ''}`}
            onClick={() => {
              setResultFilter((curr) => (curr === 'failed' ? 'all' : 'failed'));
              setPage(1);
            }}
            title="Could not be processed. Retry or investigate."
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Failed to Process</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{counters.processingFailed}</span>
            </div>
          </div>
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

        {/* ── 10. Empty & Error States / 5. Main Table (Spec Section 5 & 10) ── */}
        {loading ? (
          <LoadingState label="Fetching attendance punch events..." />
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
          </Card>
        )}

        {/* ── Pagination Controls ── */}
        {totalCount > 0 && (
          <Inline justify="between" align="center">
            <span className="bezent-card__desc">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}{' '}
              punches
            </span>
            <Inline gap="xs" align="center">
              <Button
                variant="outline"
                size="sm"
                shape="rounded"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="bezent-table-meta-title">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                shape="rounded"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </Inline>
          </Inline>
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
                      <Inline justify="between">
                        <span className="bezent-card__desc">Employee:</span>
                        <strong>
                          {drawerDetail.employeeName} ({drawerDetail.employeeCode || '—'})
                        </strong>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Punch Time:</span>
                        <strong>{format24HourTime(drawerDetail.punchTime)}</strong>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Direction:</span>
                        <span className="bezent-table-meta-title">
                          {formatDirectionLabel(drawerDetail.punchType)}
                        </span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Source:</span>
                        <Badge variant="neutral">{formatSourceLabel(drawerDetail.source)}</Badge>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Device:</span>
                        <span className="bezent-table-meta-title">
                          {extractTerminalDeviceName(drawerDetail)}
                        </span>
                      </Inline>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Section 2: Location (Zone, Distance from zone) */}
              {drawerTab === 'location' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      {drawerDetail.workLocation ? (
                        <>
                          <Inline justify="between">
                            <span className="bezent-card__desc">Zone:</span>
                            <strong>{drawerDetail.workLocation}</strong>
                          </Inline>
                          <Inline justify="between">
                            <span className="bezent-card__desc">Distance from zone:</span>
                            <span>Within geofence (0m)</span>
                          </Inline>
                        </>
                      ) : (
                        <span className="bezent-card__desc">
                          Location was not captured for this punch.
                        </span>
                      )}
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Section 3: Processing (Result, Used in Calculation, Reason) */}
              {drawerTab === 'processing' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <Inline justify="between">
                        <span className="bezent-card__desc">Result:</span>
                        <Badge variant={getPunchResultBadge(drawerDetail).variant}>
                          {getPunchResultBadge(drawerDetail).label}
                        </Badge>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Used in Calculation:</span>
                        <strong>
                          {drawerDetail.linkedAttendanceId &&
                          getPunchResultBadge(drawerDetail).label === 'Accepted'
                            ? 'Yes'
                            : 'No'}
                        </strong>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Reason:</span>
                        <span>
                          {drawerDetail.validationReason ||
                            drawerDetail.processingError ||
                            'Standard punch recorded'}
                        </span>
                      </Inline>
                      {drawerDetail.workday && (
                        <Inline justify="between">
                          <span className="bezent-card__desc">Assigned Workday:</span>
                          <span>{drawerDetail.workday}</span>
                        </Inline>
                      )}
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Section 4: History */}
              {drawerTab === 'history' && (
                <Stack gap="sm">
                  {drawerDetail.audits && drawerDetail.audits.length > 0 ? (
                    drawerDetail.audits.map((audit) => (
                      <Card key={audit.id} padding="sm">
                        <Stack gap="xs">
                          <Inline justify="between" align="center">
                            <strong>{audit.action.replace('_', ' ').toUpperCase()}</strong>
                            <span className="bezent-card__desc">
                              {format24HourTime(audit.createdAt)}
                            </span>
                          </Inline>
                          <span className="bezent-card__desc">
                            Actor: {audit.actorUserId || 'System'} •{' '}
                            {audit.notes || 'Automated lifecycle step'}
                          </span>
                        </Stack>
                      </Card>
                    ))
                  ) : (
                    <EmptyState
                      title="No Audit Records"
                      description="No audit logs recorded for this punch event yet."
                    />
                  )}
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
            title="Investigate Punch"
            size="md"
          >
            <Stack gap="md">
              <span className="bezent-card__desc">
                {investigatingPunch.employeeName} · {format24HourTime(investigatingPunch.punchTime)}
              </span>

              {/* Evidence block */}
              <Card padding="sm">
                <Stack gap="xs">
                  <strong>Evidence</strong>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Source:</span>
                    <span>{formatSourceLabel(investigatingPunch.source)}</span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Device:</span>
                    <span>{extractTerminalDeviceName(investigatingPunch)}</span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-card__desc">Location:</span>
                    <span>{investigatingPunch.workLocation || '—'}</span>
                  </Inline>
                  {investigatingPunch.validationReason && (
                    <Inline justify="between">
                      <span className="bezent-card__desc">Flag Reason:</span>
                      <span className="bezent-table-meta-title">
                        {investigatingPunch.validationReason}
                      </span>
                    </Inline>
                  )}
                </Stack>
              </Card>

              {/* Decision field */}
              <Stack gap="xs">
                <label className="bezent-filter-label" htmlFor="investigation-decision">
                  Decision
                </label>
                <Select
                  id="investigation-decision"
                  value={investigationDecision}
                  onChange={(e) => setInvestigationDecision(e.target.value as 'accept' | 'reject')}
                >
                  <option value="accept">Accept</option>
                  <option value="reject">Reject</option>
                </Select>
              </Stack>

              {/* Reason field (required) */}
              <Stack gap="xs">
                <label className="bezent-filter-label" htmlFor="investigation-reason">
                  Reason{' '}
                  <span className="bezent-label__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <Input
                  id="investigation-reason"
                  placeholder="e.g. Validated manual biometric device offline log"
                  value={investigationReason}
                  onChange={(e) => setInvestigationReason(e.target.value)}
                />
              </Stack>

              {/* Comment field (required) */}
              <Stack gap="xs">
                <label className="bezent-filter-label" htmlFor="investigation-comment">
                  Comment{' '}
                  <span className="bezent-label__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <Textarea
                  id="investigation-comment"
                  placeholder="Provide detailed justification for payroll record..."
                  value={investigationComment}
                  onChange={(e) => setInvestigationComment(e.target.value)}
                  rows={3}
                />
              </Stack>

              {/* Validation alert if missing fields */}
              {investigationValidationError && (
                <Alert variant="danger">{investigationValidationError}</Alert>
              )}

              <Inline justify="end" gap="sm">
                <Button variant="outline" onClick={() => setInvestigationModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveInvestigation}
                  disabled={investigationSubmitting}
                >
                  {investigationSubmitting ? 'Saving...' : 'Save Decision'}
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
            title="Retry processing this punch?"
            size="sm"
          >
            <Stack gap="md">
              <span className="bezent-card__desc">
                The punch will be processed again using the current rules.
              </span>

              <Inline justify="end" gap="sm">
                <Button variant="outline" onClick={() => setRetryModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleExecuteRetry} disabled={retrySubmitting}>
                  {retrySubmitting ? 'Retrying...' : 'Retry'}
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}

        {/* ── Export Configuration Dialog ── */}
        {exportModalOpen && (
          <Modal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            title="Export Attendance Punch Logs"
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
                    Date Basis:{' '}
                    {dateInterpretation === 'event_timestamp' ? 'Event Time' : 'Workday'}
                  </span>
                </Stack>
              </Card>

              <Inline justify="end" gap="sm">
                <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleExecuteExport} disabled={isExporting}>
                  {isExporting ? 'Generating...' : 'Download CSV'}
                </Button>
              </Inline>
            </Stack>
          </Modal>
        )}
      </Stack>
    </Page>
  );
}

export default PunchLogsPage;
