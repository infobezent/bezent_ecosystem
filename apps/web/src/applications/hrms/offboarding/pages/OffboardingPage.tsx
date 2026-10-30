import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Grid,
  Inline,
  Label,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  applyEmployeeAction,
  cancelEmployeeAction,
  fetchEmployeeActions,
  fetchOrganizationMasters,
  type ActionStatusCounts,
  type EmployeeActionListItem,
  type EmployeeActionType,
  type OrganizationMasters,
  type PaginationMetadata,
} from '../../employee-administration/api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  actionTypeLabel,
} from '../../employee-administration/model/actionCatalog';
import { NewEmployeeActionModal } from '../../employee-administration/components/NewEmployeeActionModal';
import { EmployeeActionDetailModal } from '../../employee-administration/components/EmployeeActionDetailModal';
import { employeeProfilePath } from '../../employees/model/employeeModel';
import {
  OffboardingFilterPanel,
  type OffboardingFilterState,
  EMPTY_OFFBOARDING_FILTER_STATE,
  countActiveOffboardingFilters,
} from '../components/OffboardingFilterPanel';
import { OffboardingTable } from '../components/OffboardingTable';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

const SEPARATION_ACTION_TYPES: EmployeeActionType[] = ['resignation', 'termination'];

function getTodayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function getPaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | 'ellipsis')[] = [];
  if (currentPage <= 4) {
    for (let i = 1; i <= 5; i++) items.push(i);
    items.push('ellipsis');
    items.push(totalPages);
  } else if (currentPage >= totalPages - 3) {
    items.push(1);
    items.push('ellipsis');
    for (let i = totalPages - 4; i <= totalPages; i++) items.push(i);
  } else {
    items.push(1);
    items.push('ellipsis');
    items.push(currentPage - 1);
    items.push(currentPage);
    items.push(currentPage + 1);
    items.push('ellipsis');
    items.push(totalPages);
  }
  return items;
}

export interface OffboardingPageProps {
  title?: string;
  subtitle?: string;
}

export function OffboardingPage({
  title = 'Offboarding',
  subtitle = 'Manage employee exits, notice periods, clearance, and exit formalities.',
}: OffboardingPageProps) {
  const navigate = useNavigate();
  const today = useMemo(() => getTodayIsoDate(), []);

  // Organization Masters (Departments & Locations)
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);

  // List State
  const [listState, setListState] = useState<{
    status: 'loading' | 'error' | 'ready';
    items: EmployeeActionListItem[];
    pagination: PaginationMetadata | null;
    statusCounts: ActionStatusCounts | null;
    error: string | null;
  }>({
    status: 'loading',
    items: [],
    pagination: null,
    statusCounts: null,
    error: null,
  });

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState<OffboardingFilterState>(
    EMPTY_OFFBOARDING_FILTER_STATE,
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals & Feedback State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailActionId, setDetailActionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const appliedCount = countActiveOffboardingFilters(appliedFilters);
  const hasActiveFilters = appliedCount > 0 || search.trim() !== '';

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Masters loading
  useEffect(() => {
    let active = true;
    fetchOrganizationMasters()
      .then((data) => {
        if (active) setMasters(data);
      })
      .catch(() => {
        // Non-blocking
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch offboarding actions
  useEffect(() => {
    let active = true;
    setListState((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchEmployeeActions({
        page,
        pageSize,
        actionTypes: appliedFilters.actionType
          ? [appliedFilters.actionType]
          : SEPARATION_ACTION_TYPES,
        status: appliedFilters.status || undefined,
        departmentId: appliedFilters.departmentId || undefined,
        effectiveDateFrom: appliedFilters.effectiveDateFrom || undefined,
        effectiveDateTo: appliedFilters.effectiveDateTo || undefined,
        search: search.trim() || undefined,
      })
        .then((res) => {
          if (!active) return;
          setListState({
            status: 'ready',
            items: res.data,
            pagination: res.pagination,
            statusCounts: res.statusCounts ?? null,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (!active) return;
          setListState((prev) => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load offboarding records.',
          }));
        });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, pageSize, search, appliedFilters, reloadKey]);

  // Handle Search Input Change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setAppliedFilters(EMPTY_OFFBOARDING_FILTER_STATE);
    setPage(1);
  };

  // Handle Page Size Change
  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  // Complete / Apply Separation action
  const handleApplyAction = async (action: EmployeeActionListItem) => {
    try {
      await applyEmployeeAction(action.id, action.version);
      setSuccessMessage(`Offboarding separation for ${action.employeeName} has been applied.`);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to apply separation.');
    }
  };

  // Cancel Offboarding request
  const handleCancelAction = async (action: EmployeeActionListItem) => {
    const reason = window.prompt(
      `Please provide a reason for cancelling the offboarding request for ${action.employeeName}:`,
    );
    if (reason === null) return;

    try {
      await cancelEmployeeAction(action.id, action.version, reason.trim() || undefined);
      setSuccessMessage(`Offboarding request for ${action.employeeName} has been cancelled.`);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel offboarding request.');
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetchEmployeeActions({
        page: 1,
        pageSize: 500,
        actionTypes: appliedFilters.actionType
          ? [appliedFilters.actionType]
          : SEPARATION_ACTION_TYPES,
        status: appliedFilters.status || undefined,
        departmentId: appliedFilters.departmentId || undefined,
        effectiveDateFrom: appliedFilters.effectiveDateFrom || undefined,
        effectiveDateTo: appliedFilters.effectiveDateTo || undefined,
        search: search.trim() || undefined,
      });

      const records = res.data;
      if (records.length === 0) {
        alert('No offboarding records match the criteria to export.');
        return;
      }

      const headers = [
        'Action ID',
        'Employee ID',
        'Employee Name',
        'Exit Type',
        'Last Working Day',
        'Notice Date',
        'Status',
        'Requested By',
        'Reason',
      ];

      const csvRows = [
        headers.join(','),
        ...records.map((r) =>
          [
            `"${r.id}"`,
            `"${r.employeeNumber}"`,
            `"${(r.employeeName || '').replace(/"/g, '""')}"`,
            `"${actionTypeLabel(r.actionType)}"`,
            `"${r.effectiveDate}"`,
            `"${r.requestDate || ''}"`,
            `"${ACTION_STATUS_LABELS[r.status] || r.status}"`,
            `"${(r.requestedBy || '').replace(/"/g, '""')}"`,
            `"${(r.reason || '').replace(/"/g, '""')}"`,
          ].join(','),
        ),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `offboarding_directory_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export offboarding records.');
    } finally {
      setExporting(false);
    }
  };

  const { items, pagination, statusCounts, error } = listState;
  const loading = listState.status === 'loading';
  const totalPages = pagination ? pagination.totalPages : 1;
  const totalItems = pagination ? pagination.totalItems : items.length;

  return (
    <Page maxWidth="full" gap="md">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="HRMS · Workforce"
        title={title}
        subtitle={subtitle}
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="outline"
              size="md"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={handleExportCsv}
              disabled={exporting || items.length === 0}
              aria-label="Export offboarding records to CSV"
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<BezentIcon name="plus" size={16} />}
              onClick={() => setIsNewModalOpen(true)}
              aria-label="Initiate new offboarding"
            >
              Initiate Offboarding
            </Button>
          </Inline>
        }
      />

      {/* Success banner if an action was applied or cancelled */}
      {successMessage && (
        <Alert
          variant="success"
          dismissible
          onDismiss={() => setSuccessMessage(null)}
          title="Offboarding updated"
        >
          {successMessage}
        </Alert>
      )}

      {/* 2. Workforce KPI Cards */}
      <Grid columns={4} gap="md" className="bezent-kpi-grid">
        {/* Total Offboarding */}
        <div className="bezent-kpi-card bezent-kpi-card--blue">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
            <BezentIcon name="logOut" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Total Offboarding</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.all
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">All recorded employee exit cases</p>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bezent-kpi-card bezent-kpi-card--amber">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--amber">
            <BezentIcon name="schedule" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Pending Approval</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.pending
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Awaiting execution date or review</p>
          </div>
        </div>

        {/* In Notice Period */}
        <div className="bezent-kpi-card bezent-kpi-card--purple">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--purple">
            <BezentIcon name="calendar" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">In Notice Period</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.upcoming
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Serving notice with future last working date</p>
          </div>
        </div>

        {/* Completed Exits */}
        <div className="bezent-kpi-card bezent-kpi-card--green">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--green">
            <BezentIcon name="userCheck" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Completed Exits</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.applied
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Separation applied to employee records</p>
          </div>
        </div>
      </Grid>

      {/* 3. Search & Filter Toolbar */}
      <div className="bezent-directory-toolbar">
        <div className="bezent-directory-toolbar__search">
          <SearchInput
            placeholder="Search by employee name or ID..."
            shape="rounded"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={() => handleSearchChange('')}
            aria-label="Search offboarding records"
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
              {appliedCount > 0 && <span className="bezent-btn__filter-count">{appliedCount}</span>}
            </Button>

            <OffboardingFilterPanel
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              appliedFilters={appliedFilters}
              onApply={(filters) => {
                setAppliedFilters(filters);
                setPage(1);
              }}
              masters={masters}
            />
          </div>

          <Button
            variant="outline"
            size="md"
            shape="rounded"
            leftIcon={<BezentIcon name="refresh" size={16} />}
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>

          <span className="bezent-records-text">{`${totalItems} Offboarding Records`}</span>
        </div>
      </div>

      {/* 4. Active Filter Chips */}
      {appliedCount > 0 && (
        <div className="bezent-active-chips-strip">
          {appliedFilters.status && (
            <span className="bezent-active-filter-chip">
              <span>{`Status: ${ACTION_STATUS_LABELS[appliedFilters.status] ?? appliedFilters.status}`}</span>
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

          {appliedFilters.actionType && (
            <span className="bezent-active-filter-chip">
              <span>{`Exit Type: ${actionTypeLabel(appliedFilters.actionType)}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                aria-label="Remove type filter"
                onClick={() => {
                  setAppliedFilters((prev) => ({ ...prev, actionType: '' }));
                  setPage(1);
                }}
              >
                ×
              </button>
            </span>
          )}

          {appliedFilters.departmentId && (
            <span className="bezent-active-filter-chip">
              <span>{`Department: ${masters?.departments.find((d) => d.id === appliedFilters.departmentId)?.name ?? appliedFilters.departmentId}`}</span>
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

          {(appliedFilters.effectiveDateFrom || appliedFilters.effectiveDateTo) && (
            <span className="bezent-active-filter-chip">
              <span>{`Last Working Date: ${appliedFilters.effectiveDateFrom || 'Start'} to ${appliedFilters.effectiveDateTo || 'End'}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                aria-label="Remove effective date filter"
                onClick={() => {
                  setAppliedFilters((prev) => ({
                    ...prev,
                    effectiveDateFrom: '',
                    effectiveDateTo: '',
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
            onClick={handleResetFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. Offboarding Table Card */}
      <div className="bezent-table-card">
        <OffboardingTable
          status={loading ? 'loading' : error ? 'error' : 'ready'}
          items={items}
          error={error}
          filtered={hasActiveFilters}
          today={today}
          onRetry={reload}
          onOpenAction={(actionId) => setDetailActionId(actionId)}
          onApplyAction={handleApplyAction}
          onCancelAction={handleCancelAction}
          onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
          onInitiateOffboarding={() => setIsNewModalOpen(true)}
          onClearFilters={handleResetFilters}
        />
      </div>

      {/* 6. Standard Pagination Toolbar */}
      {!loading && !error && pagination && pagination.totalItems > 0 && (
        <Toolbar
          align="center"
          left={
            <span className="bezent-pagination__info" aria-live="polite">
              {`Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                pagination.page * pagination.pageSize,
                pagination.totalItems,
              )} of ${pagination.totalItems} offboarding records`}
            </span>
          }
          right={
            <Inline gap="lg" align="center">
              <Inline gap="xs" align="center">
                <Label htmlFor="offboarding-page-size-select" size="sm">
                  Rows per page:
                </Label>
                <Select
                  id="offboarding-page-size-select"
                  size="sm"
                  width="auto"
                  placement="top"
                  value={String(pageSize)}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  aria-label="Rows per page"
                />
              </Inline>

              <div
                className="bezent-pagination"
                role="navigation"
                aria-label="Offboarding pagination"
              >
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
                      aria-label={`Page ${item}`}
                      aria-current={item === page ? 'page' : undefined}
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
            </Inline>
          }
        />
      )}

      {/* 7. Initiate Offboarding Modal */}
      <NewEmployeeActionModal
        isOpen={isNewModalOpen}
        preset={{
          allowedActionTypes: SEPARATION_ACTION_TYPES,
          actionType: 'resignation',
          category: 'separation',
        }}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(created) => {
          setIsNewModalOpen(false);
          setSuccessMessage(`Offboarding initiated for ${created.employeeName}.`);
          reload();
        }}
      />

      {/* 8. Action Detail Modal */}
      <EmployeeActionDetailModal
        actionId={detailActionId}
        today={today}
        onClose={() => setDetailActionId(null)}
        onChanged={(updated, msg) => {
          setSuccessMessage(msg);
          reload();
        }}
        onOpenEmployee={(employeeId) => {
          setDetailActionId(null);
          navigate(employeeProfilePath(employeeId));
        }}
      />
    </Page>
  );
}
