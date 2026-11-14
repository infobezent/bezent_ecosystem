import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Actions,
  Alert,
  Avatar,
  Button,
  Card,
  CardBody,
  EmptyState,
  Grid,
  IconButton,
  Inline,
  Input,
  Label,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Toolbar,
  type BadgeVariant,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { employmentTypeLabel, getAvatarColor } from '../../employees/model/employeeModel';
import {
  fetchOrganizationMasters,
  fetchNewHiresPaginated,
  transitionCaseStage,
  type OrganizationMasters,
  type OnboardingCaseItem,
  type StageCounts,
  type OnboardingStage,
} from '../api/onboardingApi';
import {
  OnboardingFilterPanel,
  type OnboardingFilterState,
  EMPTY_ONBOARDING_FILTER_STATE,
  countActiveOnboardingFilters,
} from '../components/OnboardingFilterPanel';
import { fetchStageConfigs } from '../../settings/api/onboardingSettingsApi';
import type { OnboardingStageConfig } from '../../settings/types/settings';

interface OnboardingPageProps {
  title?: string;
  onAddNewHire?: () => void;
}

export function OnboardingPage({ title = 'Onboarding', onAddNewHire }: OnboardingPageProps) {
  const navigate = useNavigate();
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [stageConfigs, setStageConfigs] = useState<OnboardingStageConfig[]>([]);
  const [cases, setCases] = useState<OnboardingCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Transition Modal State
  const [transitioningCase, setTransitioningCase] = useState<OnboardingCaseItem | null>(null);
  const [targetStageKey, setTargetStageKey] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // View mode switcher: list vs grid (matching Employee Directory)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('newHire');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filters & Search
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<OnboardingFilterState>(
    EMPTY_ONBOARDING_FILTER_STATE,
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => setActiveActionMenuId(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const toggleMenu = (id: string) => {
    setActiveActionMenuId((prev) => (prev === id ? null : id));
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const appliedCount = countActiveOnboardingFilters(appliedFilters);
  const hasActiveFilters = appliedCount > 0 || searchQuery !== '';

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [counts, setCounts] = useState<StageCounts>({
    all: 0,
    preboarding: 0,
    documents: 0,
    completed: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mastersData, res, configs] = await Promise.all([
        fetchOrganizationMasters().catch(() => null),
        fetchNewHiresPaginated({
          page,
          pageSize,
          stage: activeTab,
          search: searchQuery,
          departmentId: appliedFilters.departmentId || undefined,
          departmentIds:
            appliedFilters.departmentIds.length > 0 ? appliedFilters.departmentIds : undefined,
          locationId: appliedFilters.locationId || undefined,
          locationIds:
            appliedFilters.locationIds.length > 0 ? appliedFilters.locationIds : undefined,
          employmentType: appliedFilters.employmentType || undefined,
          status: appliedFilters.status || undefined,
          joiningDateFrom: appliedFilters.joiningDateFrom || undefined,
          joiningDateTo: appliedFilters.joiningDateTo || undefined,
        }),
        fetchStageConfigs().catch(() => []),
      ]);
      if (mastersData) {
        setMasters(mastersData);
      }
      if (configs && configs.length > 0) {
        setStageConfigs(configs);
      }
      setCases(res.data);
      setTotalItems(res.pagination.totalItems);
      setTotalPages(res.pagination.totalPages);
      setCounts(res.counts);

      if (res.pagination.totalPages > 0 && page > res.pagination.totalPages) {
        setPage(res.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, searchQuery, appliedFilters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (newTabId: string) => {
    setActiveTab(newTabId);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedFilters(EMPTY_ONBOARDING_FILTER_STATE);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Navigate directly to standalone Employee Registration wizard
  const handleAddNewHire = () => {
    if (onAddNewHire) {
      onAddNewHire();
    } else {
      navigate('/hrms/workforce/onboarding/registration');
    }
  };

  const handleRowAction = (item: OnboardingCaseItem) => {
    navigate(`/hrms/workforce/onboarding/registration/${item.id}`, {
      state: { caseId: item.id, newHire: item },
    });
  };

  const openTransitionModal = (item: OnboardingCaseItem) => {
    setTransitioningCase(item);
    setTransitionNotes('');
    setTransitionError(null);
    const available = stageConfigs.filter((s) => s.isActive && s.stageKey !== item.stage);
    setTargetStageKey(available[0]?.stageKey || '');
  };

  const closeTransitionModal = () => {
    setTransitioningCase(null);
    setTransitionError(null);
  };

  const handleConfirmTransition = async () => {
    if (!transitioningCase || !targetStageKey) return;
    setTransitioning(true);
    setTransitionError(null);
    try {
      await transitionCaseStage(transitioningCase.id, {
        toStage: targetStageKey,
        notes: transitionNotes.trim() || undefined,
        version: transitioningCase.version ?? 1,
      });
      setSuccessMessage(`Stage transition succeeded for ${transitioningCase.fullName}.`);
      closeTransitionModal();
      await loadData();
    } catch (err) {
      setTransitionError(err instanceof Error ? err.message : 'Failed to transition stage');
    } finally {
      setTransitioning(false);
    }
  };

  const targetStageOptions = useMemo(() => {
    if (!transitioningCase) return [];
    return stageConfigs
      .filter((s) => s.isActive && s.stageKey !== transitioningCase.stage)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => ({
        value: s.stageKey,
        label: `${s.name}${s.isRequired ? ' (Required)' : ' (Optional)'}`,
      }));
  }, [stageConfigs, transitioningCase]);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0];
    const second = parts[1];
    if (parts.length >= 2 && first && second && first[0] && second[0]) {
      return `${first[0]}${second[0]}`.toUpperCase();
    }
    return (parts[0]?.[0] || 'U').toUpperCase();
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr.startsWith('1970-01-01') || dateStr === '0000-00-00') return '—';
    try {
      const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
      if (isNaN(date.getTime()) || date.getUTCFullYear() <= 1970) return '—';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return '—';
    }
  };

  const sortedCases = useMemo(() => {
    if (!sortColumn) return cases;
    return [...cases].sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortColumn === 'newHire') {
        valA = a.fullName || '';
        valB = b.fullName || '';
      } else if (sortColumn === 'department') {
        valA = a.departmentName || '';
        valB = b.departmentName || '';
      } else if (sortColumn === 'location') {
        valA = a.locationName || '';
        valB = b.locationName || '';
      } else if (sortColumn === 'employment') {
        valA = a.employmentType || '';
        valB = b.employmentType || '';
      } else if (sortColumn === 'joiningDate') {
        valA = a.joiningDate || '';
        valB = b.joiningDate || '';
      } else if (sortColumn === 'status' || sortColumn === 'stage') {
        valA = a.stage || '';
        valB = b.stage || '';
      }
      const cmp = valA.localeCompare(valB);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [cases, sortColumn, sortDirection]);

  const handleExportCsv = () => {
    try {
      const records = sortedCases;
      if (records.length === 0) {
        alert('No new hire records to export.');
        return;
      }
      const headers = [
        'Candidate Name',
        'Email',
        'Phone',
        'Department',
        'Designation',
        'Location',
        'Employment Type',
        'Stage',
        'Status',
        'Joining Date',
      ];
      const csvRows = [
        headers.join(','),
        ...records.map((item) =>
          [
            `"${(item.fullName || '').replace(/"/g, '""')}"`,
            `"${(item.email || '').replace(/"/g, '""')}"`,
            `"${(item.phone || '').replace(/"/g, '""')}"`,
            `"${(item.departmentName || '').replace(/"/g, '""')}"`,
            `"${(item.designationName || '').replace(/"/g, '""')}"`,
            `"${(item.locationName || '').replace(/"/g, '""')}"`,
            `"${employmentTypeLabel(item.employmentType) || ''}"`,
            `"${item.stage || ''}"`,
            `"${item.status || ''}"`,
            `"${item.joiningDate || ''}"`,
          ].join(','),
        ),
      ];
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `onboarding_new_hires_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export new hires');
    }
  };

  const renderSortHeader = (column: string, label: string) => {
    const isActive = sortColumn === column;
    const arrow = isActive ? (sortDirection === 'asc' ? '↑' : '↓') : '↑';
    const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <TableHeaderCell aria-sort={ariaSort}>
        <button
          type="button"
          className={`bezent-table-th-sortable ${isActive ? 'bezent-table-th-sortable--active' : ''}`}
          onClick={() => handleSort(column)}
          aria-label={`Sort by ${label} ${isActive && sortDirection === 'asc' ? 'descending' : 'ascending'}`}
        >
          <span>{label}</span>
          <span
            className={`bezent-table-sort-arrow ${isActive ? 'bezent-table-sort-arrow--active' : ''}`}
            aria-hidden="true"
          >
            {arrow}
          </span>
        </button>
      </TableHeaderCell>
    );
  };

  const getStageBadgeProps = (
    stage: OnboardingStage,
    status: string,
  ): { label: string; variant: BadgeVariant } => {
    if (status === 'withdrawn') {
      return { label: 'Withdrawn', variant: 'danger' };
    }
    const cfg = stageConfigs.find((s) => s.stageKey === stage);
    const label = cfg?.name ?? stage.charAt(0).toUpperCase() + stage.slice(1);
    if (cfg?.isTerminal || stage === 'completed') {
      return { label, variant: 'success' };
    }
    if (stage === 'preboarding') {
      return { label, variant: 'info' };
    }
    if (stage === 'documents') {
      return { label, variant: 'warning' };
    }
    return { label, variant: 'neutral' };
  };

  const tabItems = useMemo(() => {
    if (stageConfigs.length > 0) {
      const activeConfigs = stageConfigs
        .filter((s) => s.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      return [
        { id: 'all', label: 'All', count: counts.all },
        ...activeConfigs.map((s) => ({
          id: s.stageKey,
          label: s.name,
          count: counts[s.stageKey] ?? 0,
        })),
      ];
    }
    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'preboarding', label: 'Preboarding', count: counts.preboarding },
      { id: 'documents', label: 'Documents', count: counts.documents },
      { id: 'completed', label: 'Completed', count: counts.completed },
    ];
  }, [stageConfigs, counts]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  }, [page, totalPages]);

  const resultRangeText = useMemo(() => {
    if (totalItems === 0) return 'Showing 0 of 0 new hires';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    return `Showing ${start}–${end} of ${totalItems} new hires`;
  }, [page, pageSize, totalItems]);

  const inProgressCount = useMemo(() => {
    if (stageConfigs.length > 0) {
      return stageConfigs
        .filter((s) => s.isActive && !s.isTerminal && s.stageKey !== 'completed')
        .reduce((sum, s) => sum + (counts[s.stageKey] ?? 0), 0);
    }
    return (counts.preboarding ?? 0) + (counts.documents ?? 0);
  }, [stageConfigs, counts]);

  return (
    <Page maxWidth="full" gap="lg">
      <div className="employees-directory-page onboarding-directory-page">
        <Stack gap="lg">
          {/* 1. Page Header */}
          <PageHeader
            title={title}
            subtitle="Manage new hires from pre-joining through employee creation."
            actions={
              <Button
                variant="primary"
                leftIcon={<BezentIcon name="plusSign" size={16} />}
                onClick={handleAddNewHire}
              >
                Add New Hire
              </Button>
            }
          />

          {/* Feedback alerts */}
          {successMessage && (
            <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          {error && (
            <Alert variant="danger" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Search & Action Toolbar with Status Filter Tabs */}
          <Toolbar
            left={
              <Inline align="center" gap="sm">
                {/* Compact Search Bar with Icon */}
                <div className="bezent-search-bar">
                  <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
                  <input
                    type="search"
                    placeholder="Search by name, email, department..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="bezent-search-bar__input"
                    aria-label="Search by name, email, department..."
                  />
                </div>

                {/* Filter Toggle Button */}
                <div className="bezent-filter-anchor">
                  <Button
                    variant={appliedCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                    size="md"
                    shape="rounded"
                    className={appliedCount > 0 ? 'bezent-btn--filters-active' : ''}
                    leftIcon={<BezentIcon name="filter" size={16} />}
                    onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                    aria-expanded={isFilterPanelOpen}
                    aria-label="Filters"
                  >
                    <span>Filters</span>
                    {appliedCount > 0 && (
                      <span className="bezent-btn__filter-count">{appliedCount}</span>
                    )}
                  </Button>

                  <OnboardingFilterPanel
                    isOpen={isFilterPanelOpen}
                    onClose={() => setIsFilterPanelOpen(false)}
                    appliedFilters={appliedFilters}
                    onApply={(newFilters) => {
                      setAppliedFilters(newFilters);
                      setPage(1);
                    }}
                    masters={masters}
                  />
                </div>

                {/* Reset Button */}
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

                {/* View Mode Toggle: List vs Grid */}
                <div
                  className="bezent-view-toggle"
                  role="group"
                  aria-label="New hires view layout switcher"
                >
                  <button
                    type="button"
                    className={`bezent-view-toggle__btn ${viewMode === 'list' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="List View"
                    aria-label="List View"
                    aria-pressed={viewMode === 'list'}
                  >
                    <BezentIcon name="viewList" size={18} />
                  </button>
                  <button
                    type="button"
                    className={`bezent-view-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid View"
                    aria-label="Grid View"
                    aria-pressed={viewMode === 'grid'}
                  >
                    <BezentIcon name="viewGrid" size={18} />
                  </button>
                </div>

                {/* Horizontal Status Filter Tabs */}
                <div
                  className="bezent-filter-tabs"
                  role="tablist"
                  aria-label="Filter new hires by stage"
                >
                  {tabItems.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`bezent-filter-tab ${isActive ? 'is-active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className="bezent-filter-tab-count">{tab.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Inline>
            }
            right={
              <Inline align="center" gap="xs">
                <span className="bezent-records-text" hidden>
                  {`${totalItems} New Hires`}
                </span>
                <IconButton
                  label="Export"
                  variant="ghost"
                  tooltipDirection="down"
                  onClick={handleExportCsv}
                >
                  <BezentIcon name="export" size={18} />
                </IconButton>
                <IconButton
                  label="Import"
                  variant="ghost"
                  tooltipDirection="down"
                  onClick={() => {
                    alert('Import new hires via CSV is available in Settings > Import.');
                  }}
                >
                  <BezentIcon name="upload" size={18} />
                </IconButton>
                <IconButton
                  label="Add New Hire"
                  variant="solid"
                  tooltipDirection="down"
                  onClick={handleAddNewHire}
                >
                  <BezentIcon name="plusSign" size={18} />
                </IconButton>
              </Inline>
            }
          />

          {/* Active Filter Chips (rendered below toolbar without pushing down table when empty) */}
          {appliedCount > 0 && (
            <div className="bezent-active-chips-strip">
              {appliedFilters.departmentId && (
                <span className="bezent-active-filter-chip">
                  <span>{`Department: ${masters?.departments.find((d) => d.id === appliedFilters.departmentId)?.name ?? appliedFilters.departmentId}`}</span>
                  <button
                    type="button"
                    className="bezent-active-filter-chip__remove"
                    aria-label="Remove department filter"
                    onClick={() => {
                      setAppliedFilters((prev) => ({
                        ...prev,
                        departmentId: '',
                        departmentIds: [],
                      }));
                      setPage(1);
                    }}
                  >
                    ×
                  </button>
                </span>
              )}

              {appliedFilters.locationId && (
                <span className="bezent-active-filter-chip">
                  <span>{`Location: ${masters?.locations.find((l) => l.id === appliedFilters.locationId)?.name ?? appliedFilters.locationId}`}</span>
                  <button
                    type="button"
                    className="bezent-active-filter-chip__remove"
                    aria-label="Remove location filter"
                    onClick={() => {
                      setAppliedFilters((prev) => ({
                        ...prev,
                        locationId: '',
                        locationIds: [],
                      }));
                      setPage(1);
                    }}
                  >
                    ×
                  </button>
                </span>
              )}

              {appliedFilters.employmentType && (
                <span className="bezent-active-filter-chip">
                  <span>{`Employment: ${appliedFilters.employmentType.replace('_', ' ')}`}</span>
                  <button
                    type="button"
                    className="bezent-active-filter-chip__remove"
                    aria-label="Remove employment type filter"
                    onClick={() => {
                      setAppliedFilters((prev) => ({ ...prev, employmentType: '' }));
                      setPage(1);
                    }}
                  >
                    ×
                  </button>
                </span>
              )}

              {appliedFilters.status && (
                <span className="bezent-active-filter-chip">
                  <span>{`Status: ${appliedFilters.status.charAt(0).toUpperCase() + appliedFilters.status.slice(1)}`}</span>
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

              {(appliedFilters.joiningDateFrom || appliedFilters.joiningDateTo) && (
                <span className="bezent-active-filter-chip">
                  <span>{`Joined: ${appliedFilters.joiningDateFrom || 'Start'} to ${appliedFilters.joiningDateTo || 'Present'}`}</span>
                  <button
                    type="button"
                    className="bezent-active-filter-chip__remove"
                    aria-label="Remove join date filter"
                    onClick={() => {
                      setAppliedFilters((prev) => ({
                        ...prev,
                        joiningDateFrom: '',
                        joiningDateTo: '',
                      }));
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
                  setAppliedFilters(EMPTY_ONBOARDING_FILTER_STATE);
                  setPage(1);
                }}
              >
                Clear all
              </button>
            </div>
          )}

          {/* 4. Table / Content States */}
          {loading ? (
            <LoadingState label="Loading new hire records…" fill />
          ) : cases.length === 0 ? (
            <EmptyState
              variant="onboarding"
              title={
                searchQuery || activeTab !== 'all' ? 'No matching new hires' : 'No New Hires Found'
              }
              description={
                searchQuery || activeTab !== 'all'
                  ? 'No candidate records match your current filter criteria. Try adjusting your search or tab filter.'
                  : 'Get started by creating your first onboarding case for a new hire.'
              }
              primaryAction={
                !searchQuery && activeTab === 'all'
                  ? {
                      label: 'Add New Hire',
                      onClick: handleAddNewHire,
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {viewMode === 'grid' ? (
                <Grid columns={3} gap="md" aria-label="New Hires Grid View">
                  {sortedCases.map((item) => {
                    const isMenuOpen = activeActionMenuId === item.id;
                    const avatarColor = getAvatarColor(item.id || item.fullName);
                    const initials = getInitials(item.fullName);
                    const badgeInfo = getStageBadgeProps(item.stage, item.status);
                    const isCompleted = item.stage === 'completed';

                    return (
                      <Card
                        key={item.id}
                        variant="default"
                        padding="md"
                        hoverable
                        onClick={() => handleRowAction(item)}
                      >
                        <CardBody>
                          <Stack gap="sm">
                            {/* Top: Avatar + Name & Email + Context Action */}
                            <Inline justify="between" align="start">
                              <Inline align="center" gap="sm">
                                <Avatar
                                  initials={initials}
                                  size="md"
                                  color={avatarColor}
                                  alt={item.fullName}
                                />
                                <Stack gap="none">
                                  <span className="bezent-table-meta-title">{item.fullName}</span>
                                  <span className="bezent-table-meta-subtitle">
                                    {item.email || '—'}
                                  </span>
                                </Stack>
                              </Inline>
                              <div
                                className="bezent-table-action-menu"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                                  aria-label={`Actions for ${item.fullName}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMenu(item.id);
                                  }}
                                >
                                  <BezentIcon name="more" size={18} />
                                </button>
                                {isMenuOpen && (
                                  <div className="bezent-table-action-menu__dropdown" role="menu">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="bezent-table-action-menu__item"
                                      onClick={() => {
                                        toggleMenu(item.id);
                                        handleRowAction(item);
                                      }}
                                    >
                                      <BezentIcon
                                        name={isCompleted ? 'employees' : 'edit'}
                                        size={16}
                                      />
                                      {isCompleted
                                        ? 'View Profile'
                                        : item.stage === 'preboarding'
                                          ? 'Start Registration'
                                          : 'Continue Registration'}
                                    </button>
                                    {!isCompleted && item.status === 'active' && (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="bezent-table-action-menu__item"
                                        onClick={() => {
                                          toggleMenu(item.id);
                                          openTransitionModal(item);
                                        }}
                                      >
                                        <BezentIcon name="arrowRight" size={16} />
                                        Transition Stage
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Inline>

                            {/* Middle: Designation & Department */}
                            <Stack gap="none">
                              <span className="bezent-table-meta-title">
                                {item.designationName || 'New Hire'}
                              </span>
                              <span className="bezent-table-meta-subtitle">
                                {item.departmentName || '—'}
                              </span>
                            </Stack>

                            {/* Location & Employment Type */}
                            <Inline justify="between" align="center">
                              <span className="bezent-table-meta-subtitle">
                                {item.locationName || 'Main Campus'}
                              </span>
                              <span className="bezent-table-meta-title">
                                {employmentTypeLabel(item.employmentType)}
                              </span>
                            </Inline>

                            {/* Footer: Stage Badge + Joined Date */}
                            <Inline justify="between" align="center">
                              <span
                                className={`bezent-status-pill bezent-status-pill--${badgeInfo.variant} bezent-status-pill--sm`}
                              >
                                <span className="bezent-status-pill__dot" aria-hidden="true" />
                                <span className="bezent-status-pill__label">{badgeInfo.label}</span>
                              </span>
                              <span className="bezent-table-meta-dim">
                                {formatDate(item.joiningDate)}
                              </span>
                            </Inline>
                          </Stack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </Grid>
              ) : (
                <div className="bezent-table-card">
                  <Table hoverable aria-label="New Hires">
                    <TableHead>
                      <TableRow>
                        {renderSortHeader(
                          'newHire',
                          totalItems !== undefined ? `New Hire (${totalItems})` : 'New Hire',
                        )}
                        {renderSortHeader('department', 'Department')}
                        {renderSortHeader('location', 'Work Location')}
                        {renderSortHeader('employment', 'Employment')}
                        {renderSortHeader('joiningDate', 'Joined Date')}
                        {renderSortHeader('status', 'Status')}
                        <TableHeaderCell className="bezent-table-col--actions">
                          Actions
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedCases.map((item, _index) => {
                        const isMenuOpen = activeActionMenuId === item.id;
                        const avatarColor = getAvatarColor(item.id || item.fullName);
                        const initials = getInitials(item.fullName);
                        const badgeInfo = getStageBadgeProps(item.stage, item.status);
                        const isCompleted = item.stage === 'completed';
                        const isNearBottom =
                          _index >= sortedCases.length - 2 && sortedCases.length > 2;

                        return (
                          <TableRow key={item.id} className={isMenuOpen ? 'is-menu-open' : ''}>
                            {/* New Hire Avatar + Name + Subtitle (Email • Designation) */}
                            <TableCell>
                              <div className="bezent-table-cell--avatar-meta">
                                <Avatar
                                  initials={initials}
                                  color={avatarColor}
                                  size="md"
                                  alt={item.fullName}
                                />
                                <div className="bezent-table-meta-group">
                                  <button
                                    type="button"
                                    className="bezent-table-meta-title"
                                    onClick={() => handleRowAction(item)}
                                    aria-label={`Open registration for ${item.fullName}`}
                                  >
                                    {item.fullName}
                                  </button>
                                  <span className="bezent-table-meta-subtitle">
                                    {item.email || '—'}
                                    {item.designationName ? ` • ${item.designationName}` : ''}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Department */}
                            <TableCell>{item.departmentName || '—'}</TableCell>

                            {/* Work Location */}
                            <TableCell>{item.locationName || '—'}</TableCell>

                            {/* Employment */}
                            <TableCell>{employmentTypeLabel(item.employmentType) || '—'}</TableCell>

                            {/* Joined Date */}
                            <TableCell>{formatDate(item.joiningDate)}</TableCell>

                            {/* Status / Stage Pill with dot */}
                            <TableCell>
                              <span
                                className={`bezent-status-pill bezent-status-pill--${badgeInfo.variant} bezent-status-pill--sm`}
                              >
                                <span className="bezent-status-pill__dot" aria-hidden="true" />
                                <span className="bezent-status-pill__label">{badgeInfo.label}</span>
                              </span>
                            </TableCell>

                            {/* Actions (dropdown menu) */}
                            <TableCell className="bezent-table-col--actions">
                              <div className="bezent-table-action-menu">
                                <button
                                  type="button"
                                  className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                                  aria-label={`Actions for ${item.fullName}`}
                                  aria-expanded={isMenuOpen}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMenu(item.id);
                                  }}
                                >
                                  <BezentIcon name="more" size={18} />
                                </button>

                                {isMenuOpen && (
                                  <div
                                    className={`bezent-table-action-menu__dropdown ${isNearBottom ? 'bezent-table-action-menu__dropdown--upwards' : ''}`}
                                    role="menu"
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="bezent-table-action-menu__item"
                                      onClick={() => {
                                        toggleMenu(item.id);
                                        handleRowAction(item);
                                      }}
                                    >
                                      <BezentIcon
                                        name={isCompleted ? 'employees' : 'edit'}
                                        size={16}
                                      />
                                      {isCompleted
                                        ? 'View Profile'
                                        : item.stage === 'preboarding'
                                          ? 'Start Registration'
                                          : 'Continue Registration'}
                                    </button>
                                    {!isCompleted && item.status === 'active' && (
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className="bezent-table-action-menu__item"
                                        onClick={() => {
                                          toggleMenu(item.id);
                                          openTransitionModal(item);
                                        }}
                                      >
                                        <BezentIcon name="arrowRight" size={16} />
                                        Transition Stage
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
                </div>
              )}

              {/* Pagination Controls */}
              <Toolbar
                align="center"
                left={
                  <span className="bezent-pagination__info" aria-live="polite">
                    {resultRangeText}
                  </span>
                }
                right={
                  <Inline gap="lg" align="center">
                    <Inline gap="xs" align="center">
                      <Label htmlFor="onboarding-page-size" size="sm">
                        Rows per page:
                      </Label>
                      <Select
                        id="onboarding-page-size"
                        size="sm"
                        width="auto"
                        placement="top"
                        value={String(pageSize)}
                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                        options={[
                          { value: '25', label: '25' },
                          { value: '50', label: '50' },
                          { value: '100', label: '100' },
                        ]}
                        aria-label="Rows per page"
                      />
                    </Inline>
                    <div className="bezent-pagination">
                      <button
                        type="button"
                        className="bezent-pagination__btn"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      {pageNumbers.map((p, idx) =>
                        typeof p === 'number' ? (
                          <button
                            key={p}
                            type="button"
                            className={`bezent-pagination__btn ${p === page ? 'is-active' : ''}`}
                            onClick={() => setPage(p)}
                            aria-current={p === page ? 'page' : undefined}
                          >
                            {p}
                          </button>
                        ) : (
                          <span key={`ellipsis-${idx}`} className="bezent-pagination__ellipsis">
                            …
                          </span>
                        ),
                      )}
                      <button
                        type="button"
                        className="bezent-pagination__btn"
                        disabled={page >= totalPages || totalPages === 0}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </Inline>
                }
              />
            </>
          )}
        </Stack>
      </div>

      {/* Transition Modal */}
      {transitioningCase && (
        <Modal
          isOpen={Boolean(transitioningCase)}
          onClose={closeTransitionModal}
          title={`Transition Stage: ${transitioningCase.fullName}`}
          description="Move candidate through the dynamic company onboarding workflow."
          size="md"
          footer={
            <Actions align="end" gap="sm">
              <Button
                variant="secondary"
                onClick={closeTransitionModal}
                disabled={transitioning}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmTransition}
                disabled={transitioning || !targetStageKey}
                type="button"
              >
                {transitioning ? 'Transitioning...' : 'Confirm Transition'}
              </Button>
            </Actions>
          }
        >
          <Stack gap="md">
            {transitionError && <Alert variant="danger">{transitionError}</Alert>}

            <Select
              id="transition-target-stage"
              label="Target Stage *"
              value={targetStageKey}
              onChange={(e) => setTargetStageKey(e.target.value)}
              options={targetStageOptions}
              helperText="Select the stage to transition the candidate to. Required intermediate stages cannot be skipped."
            />

            <Input
              id="transition-notes"
              label="Transition Notes"
              value={transitionNotes}
              maxLength={500}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTransitionNotes(e.target.value)
              }
              placeholder="Optional notes or audit comments"
            />
          </Stack>
        </Modal>
      )}
    </Page>
  );
}

export default OnboardingPage;
