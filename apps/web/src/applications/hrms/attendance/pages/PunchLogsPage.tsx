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
import { fetchDepartments } from '../../../company-admin/organization/api/departmentApi';
import { fetchWorkLocations } from '../../../company-admin/organization/api/workLocationApi';
import type {
  PunchLogItem,
  PunchLogSummaryCounters,
  PunchEventDetail,
  PunchLogFilter,
} from '../types/attendance.types';

export function PunchLogsPage() {
  // ── Date Presets & Filter State ──────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom'>('today');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateInterpretation, setDateInterpretation] = useState<'event_timestamp' | 'workday'>('event_timestamp');

  // ── Primary Filters ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [validationFilter, setValidationFilter] = useState('');

  // ── Advanced Filters ──────────────────────────────────────────────────────
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [punchTypeFilter, setPunchTypeFilter] = useState('');
  const [processingStateFilter, setProcessingStateFilter] = useState('');

  // ── Sorting & Pagination ──────────────────────────────────────────────────
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

  // ── Details Drawer ────────────────────────────────────────────────────────
  const [drawerPunchId, setDrawerPunchId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<PunchEventDetail | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'timeline' | 'linked' | 'history'>('overview');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // ── Investigation Modal ───────────────────────────────────────────────────
  const [investigationModalOpen, setInvestigationModalOpen] = useState(false);
  const [investigatingPunch, setInvestigatingPunch] = useState<PunchLogItem | null>(null);
  const [investigationStatus, setInvestigationStatus] = useState<'open' | 'assigned' | 'in_review' | 'resolved' | 'closed'>('open');
  const [assignedTo, setAssignedTo] = useState('');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [resolvedEmployeeId, setResolvedEmployeeId] = useState('');
  const [resolutionReason, setResolutionReason] = useState('');
  const [investigationSubmitting, setInvestigationSubmitting] = useState(false);

  // ── Bulk Banner & Feedback ────────────────────────────────────────────────
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  // ── Close action menu on click outside ────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenuId]);

  // ── Load Auxiliary Filters ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    Promise.allSettled([fetchDepartments(), fetchWorkLocations()]).then(([deptRes, locRes]) => {
      if (!mounted) return;
      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) {
        setDepartments(deptRes.value.map((d: any) => ({ id: d.id, name: d.name })));
      }
      if (locRes.status === 'fulfilled' && Array.isArray(locRes.value)) {
        setWorkLocations(locRes.value.map((l: any) => ({ id: l.id, name: l.name })));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // ── Date Preset Handler ───────────────────────────────────────────────────
  const applyDatePreset = (preset: 'today' | 'yesterday' | 'last_7_days' | 'this_month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = y.toISOString().slice(0, 10);
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (preset === 'last_7_days') {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setDateFrom(past.toISOString().slice(0, 10));
      setDateTo(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(firstDay.toISOString().slice(0, 10));
      setDateTo(todayStr);
    }
    setPage(1);
  };

  // ── Load Punch Logs from Real Backend ─────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: PunchLogFilter = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        dateInterpretation,
        search: debouncedSearch || undefined,
        source: sourceFilter || undefined,
        validationStatus: validationFilter || undefined,
        departmentId: departmentId || undefined,
        locationId: locationId || undefined,
        punchType: punchTypeFilter || undefined,
        processingState: processingStateFilter || undefined,
        page,
        limit,
      };

      const res = await fetchPunchLogs(filter);
      setItems(res.punches);
      setCounters(res.counters);
      setTotalCount(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load punch logs');
    } finally {
      setLoading(false);
    }
  }, [
    dateFrom,
    dateTo,
    dateInterpretation,
    debouncedSearch,
    sourceFilter,
    validationFilter,
    departmentId,
    locationId,
    punchTypeFilter,
    processingStateFilter,
    page,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Drawer Loader ─────────────────────────────────────────────────────────
  const handleOpenDrawer = async (punchId: string, initialTab: 'overview' | 'timeline' | 'linked' | 'history' = 'overview') => {
    setDrawerPunchId(punchId);
    setDrawerTab(initialTab);
    setDrawerLoading(true);
    setDrawerError(null);
    setActiveMenuId(null);
    try {
      const detail = await fetchPunchDetails(punchId);
      setDrawerDetail(detail);
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to load punch details');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerPunchId(null);
    setDrawerDetail(null);
    setDrawerError(null);
  };

  // ── Investigation Handlers ────────────────────────────────────────────────
  const handleOpenInvestigation = (punch: PunchLogItem) => {
    setInvestigatingPunch(punch);
    setInvestigationStatus(punch.investigationStatus !== 'none' ? punch.investigationStatus : 'open');
    setAssignedTo(punch.assignedTo || '');
    setInvestigationNotes(punch.investigationNotes || '');
    setResolvedEmployeeId(punch.employeeId || '');
    setResolutionReason('');
    setActiveMenuId(null);
    setInvestigationModalOpen(true);
  };

  const handleSaveInvestigation = async () => {
    if (!investigatingPunch) return;
    setInvestigationSubmitting(true);
    try {
      await updatePunchInvestigation({
        punchId: investigatingPunch.id,
        investigationStatus,
        assignedTo: assignedTo.trim() || undefined,
        investigationNotes: investigationNotes.trim() || undefined,
        resolvedEmployeeId: resolvedEmployeeId.trim() || undefined,
        resolutionReason: resolutionReason.trim() || undefined,
      });
      setBannerMessage({ type: 'success', text: `Investigation updated for event ${investigatingPunch.id}` });
      setInvestigationModalOpen(false);
      setInvestigatingPunch(null);
      await loadData();
      if (drawerPunchId === investigatingPunch.id) {
        handleOpenDrawer(investigatingPunch.id, drawerTab);
      }
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Failed to update investigation',
      });
    } finally {
      setInvestigationSubmitting(false);
    }
  };

  // ── Retry Processing Handler ──────────────────────────────────────────────
  const handleRetryProcessing = async (punchIds: string[]) => {
    setActiveMenuId(null);
    setBulkActionLoading(true);
    try {
      const res = await retryPunchProcessing(punchIds);
      setBannerMessage({
        type: 'success',
        text: res.message || `Successfully retried ${res.retriedCount} punch event(s)`,
      });
      setSelectedIds(new Set());
      await loadData();
      if (drawerPunchId && punchIds.includes(drawerPunchId)) {
        handleOpenDrawer(drawerPunchId, drawerTab);
      }
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Retry processing failed',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ── Bulk Actions Handlers ─────────────────────────────────────────────────
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

  const handleBulkMarkInvestigation = async () => {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await bulkPunchAction({
        action: 'mark_investigation',
        punchIds: Array.from(selectedIds),
        notes: 'Flagged for bulk investigation review',
      });
      setBannerMessage({ type: 'success', text: res.message });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: err instanceof Error ? err.message : 'Bulk action failed',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRetry = async () => {
    if (selectedIds.size === 0) return;
    await handleRetryProcessing(Array.from(selectedIds));
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
          source: sourceFilter || undefined,
          validationStatus: validationFilter || undefined,
          departmentId: departmentId || undefined,
          locationId: locationId || undefined,
          punchType: punchTypeFilter || undefined,
          processingState: processingStateFilter || undefined,
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

  // ── Reset Filters ─────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    applyDatePreset('today');
    setDateInterpretation('event_timestamp');
    setSearch('');
    setDebouncedSearch('');
    setSourceFilter('');
    setValidationFilter('');
    setDepartmentId('');
    setLocationId('');
    setPunchTypeFilter('');
    setProcessingStateFilter('');
    setSelectedIds(new Set());
    setPage(1);
  };

  // ── Formatting Utilities ──────────────────────────────────────────────────
  const formatDateTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  // ── Drawer Tab Definitions ────────────────────────────────────────────────
  const drawerTabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'linked', label: 'Linked Attendance' },
      { id: 'history', label: 'History & Audit' },
    ],
    [],
  );

  return (
    <Page>
      {/* ── Page Header ── */}
      <PageHeader
        title="Punch Logs"
        breadcrumbs={<span>Attendance / Punch Logs</span>}
        actions={
          <Inline gap="sm" align="center">
            {/* Date Preset Selector */}
            <Select
              value={datePreset}
              onChange={(e) => applyDatePreset(e.target.value as any)}
              aria-label="Date Range Preset"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
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
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => applyDatePreset('today')}
            >
              Today
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExportModalOpen(true)}
            >
              <BezentIcon name="download" size={16} /> Export
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* Bulk Action Alert Banner */}
        {bannerMessage && (
          <Alert variant={bannerMessage.type}>
            {bannerMessage.text}
          </Alert>
        )}

        {/* ── Six Summary Counters Strip (Single Desktop Row) ── */}
        <Grid columns={6} gap="sm">
          <div
            className={`bezent-stat-card ${validationFilter === '' && processingStateFilter === '' ? 'is-active' : ''}`}
            onClick={() => {
              setValidationFilter('');
              setProcessingStateFilter('');
              setPage(1);
            }}
            title="Total captured punch events within selected timeframe"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Total Events</span>
            <span className="bezent-stat-card__val">{counters.total}</span>
          </div>

          <div
            className={`bezent-stat-card ${validationFilter === 'valid' ? 'is-active' : ''}`}
            onClick={() => {
              setValidationFilter((curr) => (curr === 'valid' ? '' : 'valid'));
              setPage(1);
            }}
            title="Events that passed integrity validation rules"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Valid</span>
            <span className="bezent-stat-card__val">{counters.valid}</span>
          </div>

          <div
            className={`bezent-stat-card ${validationFilter === 'needs_review' ? 'is-active' : ''}`}
            onClick={() => {
              setValidationFilter((curr) => (curr === 'needs_review' ? '' : 'needs_review'));
              setPage(1);
            }}
            title="Punches requiring supervisor review or under investigation"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Needs Review</span>
            <span className="bezent-stat-card__val">{counters.needsReview}</span>
          </div>

          <div
            className={`bezent-stat-card ${validationFilter === 'duplicate' ? 'is-active' : ''}`}
            onClick={() => {
              setValidationFilter((curr) => (curr === 'duplicate' ? '' : 'duplicate'));
              setPage(1);
            }}
            title="Rapid repeat punches identified as duplicates"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Duplicates</span>
            <span className="bezent-stat-card__val">{counters.duplicates}</span>
          </div>

          <div
            className={`bezent-stat-card ${validationFilter === 'unmatched' ? 'is-active' : ''}`}
            onClick={() => {
              setValidationFilter((curr) => (curr === 'unmatched' ? '' : 'unmatched'));
              setPage(1);
            }}
            title="Clock events not yet mapped to an active employee profile"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Unmatched</span>
            <span className="bezent-stat-card__val">{counters.unmatched}</span>
          </div>

          <div
            className={`bezent-stat-card ${processingStateFilter === 'failed' ? 'is-active' : ''}`}
            onClick={() => {
              setProcessingStateFilter((curr) => (curr === 'failed' ? '' : 'failed'));
              setPage(1);
            }}
            title="Technical pipeline or downstream ingestion failures"
            role="button"
            tabIndex={0}
          >
            <span className="bezent-stat-card__label">Processing Failed</span>
            <span className="bezent-stat-card__val">{counters.processingFailed}</span>
          </div>
        </Grid>

        {/* ── Progressive Disclosure Filters ── */}
        <Card padding="sm">
          <Stack gap="sm">
            <div className="bezent-filter-toolbar">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee name or code..."
              />

              <Select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Sources</option>
                <option value="biometric">Biometric Device</option>
                <option value="web">Web Portal</option>
                <option value="mobile">Mobile Application</option>
                <option value="kiosk">On-Site Kiosk</option>
                <option value="import">Batch Import</option>
              </Select>

              <Select
                value={validationFilter}
                onChange={(e) => {
                  setValidationFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Results</option>
                <option value="valid">Valid</option>
                <option value="pending_validation">Pending Validation</option>
                <option value="duplicate">Duplicate</option>
                <option value="invalid">Invalid</option>
                <option value="needs_review">Needs Review</option>
                <option value="unmatched">Unmatched</option>
              </Select>

              <Button
                variant={isAdvancedOpen ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                More Filters {isAdvancedOpen ? '▲' : '▼'}
              </Button>

              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
            </div>

            {/* Expandable Advanced Filters */}
            {isAdvancedOpen && (
              <div className="bezent-filter-toolbar__more">
                <Inline gap="md" wrap>
                  <Select
                    label="Date Interpretation"
                    value={dateInterpretation}
                    onChange={(e) => {
                      setDateInterpretation(e.target.value as any);
                      setPage(1);
                    }}
                  >
                    <option value="event_timestamp">Event Timestamp (UTC/Captured)</option>
                    <option value="workday">Attendance Workday (Engine-Assigned)</option>
                  </Select>

                  <Select
                    label="Department"
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Branch / Location"
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Locations</option>
                    {workLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>

                  <Select
                    label="Punch Type"
                    value={punchTypeFilter}
                    onChange={(e) => {
                      setPunchTypeFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Punch Types</option>
                    <option value="in">IN</option>
                    <option value="out">OUT</option>
                    <option value="break_in">Break IN</option>
                    <option value="break_out">Break OUT</option>
                    <option value="unknown">Unknown</option>
                  </Select>

                  <Select
                    label="Processing State"
                    value={processingStateFilter}
                    onChange={(e) => {
                      setProcessingStateFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Processing States</option>
                    <option value="processed">Processed</option>
                    <option value="processing">Processing</option>
                    <option value="received">Received</option>
                    <option value="failed">Failed</option>
                    <option value="retry_pending">Retry Pending</option>
                  </Select>
                </Inline>
              </div>
            )}
          </Stack>
        </Card>

        {/* ── Contextual Bulk Selection Bar ── */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center">
              <span className="bezent-table-meta-title">
                {selectedIds.size} event(s) selected
              </span>
              <Inline gap="sm" align="center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkRetry}
                  disabled={bulkActionLoading}
                >
                  Retry Processing
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBulkMarkInvestigation}
                  disabled={bulkActionLoading}
                >
                  Mark for Investigation
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setExportScope('selected');
                    setExportModalOpen(true);
                  }}
                >
                  Export Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear Selection
                </Button>
              </Inline>
            </Inline>
          </Card>
        )}

        {/* ── Main Data View ── */}
        {loading ? (
          <LoadingState label="Fetching attendance punch events..." />
        ) : error ? (
          <Alert variant="danger" title="Error Loading Punch Logs">
            {error}
            <Button variant="secondary" onClick={loadData}>
              Retry
            </Button>
          </Alert>
        ) : items.length === 0 ? (
          <EmptyState
            title="No Punch Events"
            description="No attendance punch logs found matching your filter criteria."
          />
        ) : (
          <div className="bezent-table-container">
            <Table compact hoverable>
              <TableHead>
                <TableRow>
                  {/* Row Selection Checkbox */}
                  <TableHeaderCell style={{ width: '40px' } as any}>
                    <Checkbox
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all rows"
                    />
                  </TableHeaderCell>
                  {/* 1. Employee */}
                  <TableHeaderCell>Employee</TableHeaderCell>
                  {/* 2. Punch Date & Time */}
                  <TableHeaderCell>Punch Date & Time</TableHeaderCell>
                  {/* 3. Punch Type */}
                  <TableHeaderCell>Punch Type</TableHeaderCell>
                  {/* 4. Source */}
                  <TableHeaderCell>Source</TableHeaderCell>
                  {/* 5. Device / Location */}
                  <TableHeaderCell>Device / Location</TableHeaderCell>
                  {/* 6. Workday */}
                  <TableHeaderCell>Workday</TableHeaderCell>
                  {/* 7. Validation */}
                  <TableHeaderCell>Validation</TableHeaderCell>
                  {/* 8. Processing State */}
                  <TableHeaderCell>Processing State</TableHeaderCell>
                  {/* 9. Linked Attendance */}
                  <TableHeaderCell>Linked Attendance</TableHeaderCell>
                  {/* 10. Actions */}
                  <TableHeaderCell style={{ width: '50px', textAlign: 'center' } as any}>
                    Actions
                  </TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.map((punch) => {
                  const isSelected = selectedIds.has(punch.id);
                  const isMenuOpen = activeMenuId === punch.id;

                  return (
                    <TableRow
                      key={punch.id}
                      onClick={() => handleOpenDrawer(punch.id)}
                    >
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

                      {/* 1. Employee (Avatar + Plain text name & ID) */}
                      <TableCell>
                        <div className="bezent-table-cell--avatar-meta">
                          <Avatar
                            initials={punch.employeeName ? punch.employeeName.slice(0, 2).toUpperCase() : '?'}
                            alt={punch.employeeName || 'Unmatched'}
                            src={punch.avatarUrl}
                            size="sm"
                          />
                          <div className="bezent-table-meta-group">
                            <span className="bezent-table-meta-title">
                              {punch.employeeName}
                            </span>
                            <span className="bezent-table-meta-subtitle">
                              {punch.employeeCode}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Punch Date & Time */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {formatDateTime(punch.punchTime)}
                        </span>
                      </TableCell>

                      {/* 3. Punch Type */}
                      <TableCell>
                        <Badge
                          variant={
                            punch.punchType === 'in'
                              ? 'success'
                              : punch.punchType === 'out'
                              ? 'neutral'
                              : 'warning'
                          }
                        >
                          {punch.punchType.toUpperCase()}
                        </Badge>
                      </TableCell>

                      {/* 4. Source */}
                      <TableCell>
                        <Badge variant="neutral">
                          {punch.source.toUpperCase()}
                        </Badge>
                      </TableCell>

                      {/* 5. Device / Location */}
                      <TableCell>
                        <span className="bezent-table-meta-title">
                          {punch.workLocation || (punch.deviceMetadata as any)?.deviceId || '-'}
                        </span>
                      </TableCell>

                      {/* 6. Workday */}
                      <TableCell>
                        <span className="bezent-table-meta-subtitle">
                          {punch.workday || '-'}
                        </span>
                      </TableCell>

                      {/* 7. Validation */}
                      <TableCell>
                        <Badge
                          variant={
                            punch.validationStatus === 'valid'
                              ? 'success'
                              : punch.validationStatus === 'duplicate'
                              ? 'warning'
                              : punch.validationStatus === 'unmatched' || punch.validationStatus === 'invalid'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {punch.validationStatus.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>

                      {/* 8. Processing State */}
                      <TableCell>
                        <Badge
                          variant={
                            punch.processingState === 'processed'
                              ? 'success'
                              : punch.processingState === 'failed'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {punch.processingState.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>

                      {/* 9. Linked Attendance */}
                      <TableCell>
                        {punch.linkedAttendanceId ? (
                          <Badge variant="info">
                            Daily Log: {punch.linkedAttendanceStatus?.toUpperCase() || 'PRESENT'}
                          </Badge>
                        ) : (
                          <span className="bezent-table-meta-subtitle">—</span>
                        )}
                      </TableCell>

                      {/* 10. Actions (Contextual Ellipsis Menu) */}
                      <TableCell
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="bezent-table-action-menu"
                          ref={isMenuOpen ? menuRef : undefined}
                        >
                          <button
                            type="button"
                            className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                            onClick={() => setActiveMenuId(isMenuOpen ? null : punch.id)}
                            aria-label="More actions"
                          >
                            ⋯
                          </button>

                          {isMenuOpen && (
                            <div className="bezent-table-action-menu__dropdown">
                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => handleOpenDrawer(punch.id, 'overview')}
                              >
                                View Event Details
                              </button>

                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => handleOpenDrawer(punch.id, 'timeline')}
                              >
                                View Employee Timeline
                              </button>

                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => handleOpenDrawer(punch.id, 'linked')}
                                disabled={!punch.linkedAttendanceId}
                              >
                                View Linked Attendance
                              </button>

                              <div className="bezent-table-action-menu__divider" />

                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => handleOpenInvestigation(punch)}
                              >
                                Investigate Event
                              </button>

                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => handleRetryProcessing([punch.id])}
                                disabled={punch.processingState !== 'failed' && punch.processingState !== 'retry_pending'}
                              >
                                Retry Processing
                              </button>

                              <button
                                type="button"
                                className="bezent-table-action-menu__item"
                                onClick={() => handleOpenDrawer(punch.id, 'history')}
                              >
                                View Audit History
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
        )}

        {/* ── Pagination Controls ── */}
        {totalCount > 0 && (
          <Inline justify="between" align="center">
            <span className="bezent-card__desc">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount} events
            </span>
            <Inline gap="xs" align="center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="bezent-table-meta-title" style={{ padding: '0 8px' } as any}>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </Inline>
          </Inline>
        )}

        {/* ── Event Details Drawer ── */}
        <Modal
          isOpen={!!drawerPunchId}
          onClose={handleCloseDrawer}
          variant="drawer"
          size="drawer"
          title={
            <Stack gap="xs">
              <Inline gap="sm" align="center">
                <span className="bezent-table-meta-title">
                  {drawerDetail?.employeeName || 'Punch Event Details'}
                </span>
                {drawerDetail && (
                  <Badge variant={drawerDetail.validationStatus === 'valid' ? 'success' : 'warning'}>
                    {drawerDetail.validationStatus.toUpperCase()}
                  </Badge>
                )}
                {drawerDetail && (
                  <Badge variant={drawerDetail.processingState === 'processed' ? 'success' : 'danger'}>
                    {drawerDetail.processingState.toUpperCase()}
                  </Badge>
                )}
              </Inline>
              <span className="bezent-table-meta-subtitle">
                ID: {drawerDetail?.id} • Code: {drawerDetail?.employeeCode}
              </span>
            </Stack>
          }
          headerBottom={
            <Tabs
              items={drawerTabs}
              activeId={drawerTab}
              onChange={(id) => setDrawerTab(id as any)}
            />
          }
        >
          {drawerLoading ? (
            <LoadingState label="Loading event details..." />
          ) : drawerError ? (
            <Alert variant="danger">{drawerError}</Alert>
          ) : !drawerDetail ? (
            <EmptyState title="Event Not Found" description="Could not load punch event details." />
          ) : (
            <Stack gap="md">
              {/* Tab 1: Overview */}
              {drawerTab === 'overview' && (
                <Stack gap="sm">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-stat-card__label">INGESTION & CAPTURE</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Event Timestamp (UTC):</span>
                        <strong>{formatDateTime(drawerDetail.punchTime)}</strong>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Received Timestamp:</span>
                        <span>{formatDateTime(drawerDetail.createdAt)}</span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Punch Type:</span>
                        <Badge variant="neutral">{drawerDetail.punchType.toUpperCase()}</Badge>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Source:</span>
                        <span>{drawerDetail.source.toUpperCase()}</span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Device / Location:</span>
                        <span>{drawerDetail.workLocation || '-'}</span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Raw Identifier:</span>
                        <span>{drawerDetail.rawIdentifier || drawerDetail.employeeCode || '-'}</span>
                      </Inline>
                    </Stack>
                  </Card>

                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-stat-card__label">VALIDATION & ENGINE PROCESSING</span>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Assigned Workday:</span>
                        <strong>{drawerDetail.workday || 'Unassigned'}</strong>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Validation Result:</span>
                        <Badge variant={drawerDetail.validationStatus === 'valid' ? 'success' : 'danger'}>
                          {drawerDetail.validationStatus.toUpperCase()}
                        </Badge>
                      </Inline>
                      {drawerDetail.validationReason && (
                        <Inline justify="between">
                          <span className="bezent-card__desc">Validation Reason:</span>
                          <span className="bezent-card__desc">{drawerDetail.validationReason}</span>
                        </Inline>
                      )}
                      <Inline justify="between">
                        <span className="bezent-card__desc">Processing State:</span>
                        <Badge variant={drawerDetail.processingState === 'processed' ? 'success' : 'danger'}>
                          {drawerDetail.processingState.toUpperCase()}
                        </Badge>
                      </Inline>
                      {drawerDetail.processingError && (
                        <Inline justify="between">
                          <span className="bezent-card__desc">Processing Error:</span>
                          <span className="bezent-card__desc" style={{ color: 'var(--status-danger-text)' } as any}>
                            {drawerDetail.processingError}
                          </span>
                        </Inline>
                      )}
                      <Inline justify="between">
                        <span className="bezent-card__desc">Retry Count:</span>
                        <span>{drawerDetail.retryCount}</span>
                      </Inline>
                      <Inline justify="between">
                        <span className="bezent-card__desc">Investigation State:</span>
                        <Badge variant="neutral">{drawerDetail.investigationStatus.toUpperCase()}</Badge>
                      </Inline>
                    </Stack>
                  </Card>

                  <Inline justify="end" gap="sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenInvestigation(drawerDetail)}
                    >
                      Investigate / Resolve
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleRetryProcessing([drawerDetail.id])}
                      disabled={drawerDetail.processingState !== 'failed' && drawerDetail.processingState !== 'retry_pending'}
                    >
                      Retry Processing
                    </Button>
                  </Inline>
                </Stack>
              )}

              {/* Tab 2: Timeline */}
              {drawerTab === 'timeline' && (
                <Stack gap="sm">
                  <span className="bezent-stat-card__label">RELATED EMPLOYEE PUNCH TIMELINE (±2 DAYS)</span>
                  {drawerDetail.timeline && drawerDetail.timeline.length > 0 ? (
                    drawerDetail.timeline.map((item) => (
                      <Card key={item.id} padding="sm">
                        <Inline justify="between" align="center">
                          <Inline gap="xs" align="center">
                            <Badge variant={item.punchType === 'in' ? 'success' : 'neutral'}>
                              {item.punchType.toUpperCase()}
                            </Badge>
                            <span className="bezent-table-meta-title">
                              {formatDateTime(item.punchTime)}
                            </span>
                          </Inline>
                          <Inline gap="xs">
                            <Badge variant="neutral">{item.source}</Badge>
                            <Badge variant={item.validationStatus === 'valid' ? 'success' : 'warning'}>
                              {item.validationStatus}
                            </Badge>
                          </Inline>
                        </Inline>
                      </Card>
                    ))
                  ) : (
                    <EmptyState
                      title="No Other Punches"
                      description="No related chronological punches found for this identifier within ±2 days."
                    />
                  )}
                </Stack>
              )}

              {/* Tab 3: Linked Attendance */}
              {drawerTab === 'linked' && (
                <Stack gap="sm">
                  <span className="bezent-stat-card__label">DAILY ATTENDANCE RECORD</span>
                  {drawerDetail.linkedAttendanceId ? (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <Inline justify="between">
                          <span className="bezent-card__desc">Daily Record ID:</span>
                          <strong>{drawerDetail.linkedAttendanceId}</strong>
                        </Inline>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Attendance Status:</span>
                          <Badge variant="success">
                            {drawerDetail.linkedAttendanceStatus?.toUpperCase() || 'PRESENT'}
                          </Badge>
                        </Inline>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Processing State:</span>
                          <span>{drawerDetail.linkedAttendanceProcessingState || 'Finalized'}</span>
                        </Inline>
                        <Inline justify="between">
                          <span className="bezent-card__desc">Workday:</span>
                          <span>{drawerDetail.workday}</span>
                        </Inline>
                      </Stack>
                    </Card>
                  ) : (
                    <EmptyState
                      title="No Linked Daily Record"
                      description="This punch event has not yet been reconciled into an authorized Daily Attendance Log."
                    />
                  )}
                </Stack>
              )}

              {/* Tab 4: History & Audit */}
              {drawerTab === 'history' && (
                <Stack gap="sm">
                  <span className="bezent-stat-card__label">AUDIT TRAIL & EVENT LIFECYCLE</span>
                  {drawerDetail.audits && drawerDetail.audits.length > 0 ? (
                    drawerDetail.audits.map((audit) => (
                      <Card key={audit.id} padding="sm">
                        <Stack gap="none">
                          <Inline justify="between" align="center">
                            <strong>{audit.action.replace('_', ' ').toUpperCase()}</strong>
                            <span className="bezent-card__desc">{formatDateTime(audit.createdAt)}</span>
                          </Inline>
                          <span className="bezent-card__desc">
                            Actor: {audit.actorUserId || 'System'} • {audit.notes || 'Automated lifecycle step'}
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

        {/* ── Investigation Modal ── */}
        {investigationModalOpen && investigatingPunch && (
          <Modal
            isOpen={investigationModalOpen}
            onClose={() => setInvestigationModalOpen(false)}
            title={`Investigate Event: ${investigatingPunch.id}`}
          >
            <Stack gap="md">
              <span className="bezent-card__desc">
                Review and record an authorized investigation outcome. Immutable raw event timestamps and codes will remain untouched.
              </span>

              <Select
                label="Investigation Status"
                value={investigationStatus}
                onChange={(e) => setInvestigationStatus(e.target.value as any)}
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Select>

              <Input
                label="Assign Reviewer (User ID)"
                placeholder="e.g. usr-supervisor-01"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />

              {investigatingPunch.validationStatus === 'unmatched' && (
                <Stack gap="xs">
                  <Input
                    label="Resolve Unmatched Identity (Employee ID)"
                    placeholder="e.g. emp_att_api_01"
                    value={resolvedEmployeeId}
                    onChange={(e) => setResolvedEmployeeId(e.target.value)}
                  />
                  <Input
                    label="Identity Resolution Reason"
                    placeholder="e.g. Matched physical RFID card against HR badge registry"
                    value={resolutionReason}
                    onChange={(e) => setResolutionReason(e.target.value)}
                  />
                </Stack>
              )}

              <Input
                label="Investigation Notes"
                placeholder="Add notes or evidence reference..."
                value={investigationNotes}
                onChange={(e) => setInvestigationNotes(e.target.value)}
              />

              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={() => setInvestigationModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveInvestigation}
                  disabled={investigationSubmitting}
                >
                  {investigationSubmitting ? 'Saving...' : 'Save Resolution'}
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
                onChange={(e) => setExportScope(e.target.value as any)}
              >
                <option value="all">All Filtered Events ({totalCount} events)</option>
                {selectedIds.size > 0 && (
                  <option value="selected">Selected Events ({selectedIds.size} events)</option>
                )}
              </Select>

              <Card padding="sm">
                <Stack gap="none">
                  <span className="bezent-card__desc">Active Range: {dateFrom} to {dateTo}</span>
                  <span className="bezent-card__desc">Date Mode: {dateInterpretation}</span>
                </Stack>
              </Card>

              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={() => setExportModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExecuteExport}
                  disabled={isExporting}
                >
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
