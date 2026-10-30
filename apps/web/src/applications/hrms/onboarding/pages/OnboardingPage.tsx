import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Actions,
  Alert,
  Avatar,
  Badge,
  Button,
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
  SearchInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tabs,
  Toolbar,
  type BadgeVariant,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
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

  // Filters & Search
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<OnboardingFilterState>(
    EMPTY_ONBOARDING_FILTER_STATE,
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
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

          {/* 2. Workforce KPI Cards (4 columns matching Employees Directory) */}
          <Grid columns={4} gap="md">
            {/* Total New Hires */}
            <div className="bezent-kpi-card bezent-kpi-card--blue">
              <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
                <BezentIcon name="employees" size={20} />
              </div>
              <div className="bezent-kpi-card__info">
                <p className="bezent-kpi-card__title">Total New Hires</p>
                <p className="bezent-kpi-card__value">
                  {loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : (
                    counts.all
                  )}
                </p>
                <p className="bezent-kpi-card__caption">All tracked onboarding cases</p>
              </div>
            </div>

            {/* In Progress */}
            <div className="bezent-kpi-card bezent-kpi-card--purple">
              <div className="bezent-kpi-card__icon bezent-kpi-card__icon--purple">
                <BezentIcon name="clock" size={20} />
              </div>
              <div className="bezent-kpi-card__info">
                <p className="bezent-kpi-card__title">In Progress</p>
                <p className="bezent-kpi-card__value">
                  {loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : (
                    inProgressCount
                  )}
                </p>
                <p className="bezent-kpi-card__caption">Preboarding & document verification</p>
              </div>
            </div>

            {/* Completed */}
            <div className="bezent-kpi-card bezent-kpi-card--green">
              <div className="bezent-kpi-card__icon bezent-kpi-card__icon--green">
                <BezentIcon name="userCheck" size={20} />
              </div>
              <div className="bezent-kpi-card__info">
                <p className="bezent-kpi-card__title">Completed</p>
                <p className="bezent-kpi-card__value">
                  {loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : (
                    counts.completed
                  )}
                </p>
                <p className="bezent-kpi-card__caption">Successfully completed onboarding</p>
              </div>
            </div>

            {/* Pre-boarding */}
            <div className="bezent-kpi-card bezent-kpi-card--amber">
              <div className="bezent-kpi-card__icon bezent-kpi-card__icon--amber">
                <BezentIcon name="onboarding" size={20} />
              </div>
              <div className="bezent-kpi-card__info">
                <p className="bezent-kpi-card__title">Pre-boarding</p>
                <p className="bezent-kpi-card__value">
                  {loading ? (
                    <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
                  ) : (
                    (counts.preboarding ?? 0)
                  )}
                </p>
                <p className="bezent-kpi-card__caption">Awaiting registration & verification</p>
              </div>
            </div>
          </Grid>

          {/* 3. Search & Filter Toolbar directly below KPI Cards */}
          <div className="bezent-directory-toolbar">
            <div className="bezent-directory-toolbar__search">
              <SearchInput
                placeholder="Search by name, email, department..."
                shape="rounded"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onClear={() => handleSearchChange('')}
                aria-label="Search new hires"
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

              <span className="bezent-records-text">{`${totalItems} New Hires`}</span>
            </div>
          </div>

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

          {/* 4. Stage Filter Tabs on their own dedicated line */}
          <Tabs activeId={activeTab} onChange={handleTabChange} items={tabItems} />

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
              <div className="bezent-table-card">
                <Table hoverable>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>New Hire</TableHeaderCell>
                      <TableHeaderCell>Job / Department</TableHeaderCell>
                      <TableHeaderCell>Location</TableHeaderCell>
                      <TableHeaderCell>Joining Date</TableHeaderCell>
                      <TableHeaderCell>Current Stage</TableHeaderCell>
                      <TableHeaderCell align="right">Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cases.map((item) => {
                      const badgeInfo = getStageBadgeProps(item.stage, item.status);
                      const isCompleted = item.stage === 'completed';

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="bezent-table-cell--avatar-meta">
                              <Avatar initials={getInitials(item.fullName)} alt={item.fullName} />
                              <div className="bezent-table-meta-group">
                                <Label
                                  as="span"
                                  size="sm"
                                  weight="semibold"
                                  className="bezent-table-meta-title"
                                >
                                  {item.fullName}
                                </Label>
                                {item.email && (
                                  <span className="bezent-table-meta-subtitle">{item.email}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="bezent-table-meta-group">
                              <Label
                                as="span"
                                size="sm"
                                weight="semibold"
                                className="bezent-table-meta-title"
                              >
                                {item.designationName || '—'}
                              </Label>
                              {item.departmentName && (
                                <span className="bezent-table-meta-subtitle">
                                  {item.departmentName}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Label as="span" size="sm" weight="regular">
                              {item.locationName || '—'}
                            </Label>
                          </TableCell>
                          <TableCell>
                            <Label as="span" size="sm" weight="regular">
                              {formatDate(item.joiningDate)}
                            </Label>
                          </TableCell>
                          <TableCell>
                            <Badge variant={badgeInfo.variant}>{badgeInfo.label}</Badge>
                          </TableCell>
                          <TableCell align="right">
                            <Inline gap="xs" justify="end" align="center">
                              {!isCompleted && item.status === 'active' && (
                                <IconButton
                                  label={`Transition ${item.fullName}`}
                                  onClick={() => openTransitionModal(item)}
                                >
                                  <BezentIcon name="arrowRight" size={18} />
                                </IconButton>
                              )}
                              <IconButton
                                label={
                                  isCompleted
                                    ? `View ${item.fullName}`
                                    : item.stage === 'preboarding'
                                      ? `Start Registration (${item.fullName})`
                                      : `Continue Registration (${item.fullName})`
                                }
                                onClick={() => handleRowAction(item)}
                              >
                                <BezentIcon name={isCompleted ? 'openInNew' : 'edit'} size={18} />
                              </IconButton>
                            </Inline>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

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
              onChange={(e) => setTransitionNotes(e.target.value)}
              placeholder="Optional notes or audit comments"
            />
          </Stack>
        </Modal>
      )}
    </Page>
  );
}

export default OnboardingPage;
