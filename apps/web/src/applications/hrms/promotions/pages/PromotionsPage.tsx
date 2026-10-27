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
  PromotionsFilterPanel,
  type PromotionsFilterState,
  EMPTY_PROMOTIONS_FILTER_STATE,
  countActivePromotionsFilters,
} from '../components/PromotionsFilterPanel';
import { PromotionsTable } from '../components/PromotionsTable';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

const PROMOTION_ACTION_TYPES: EmployeeActionType[] = ['designation_change', 'department_change'];

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

export interface PromotionsPageProps {
  title?: string;
  subtitle?: string;
}

export function PromotionsPage({
  title = 'Promotions',
  subtitle = 'Manage employee promotions, role changes, and career progression.',
}: PromotionsPageProps) {
  const navigate = useNavigate();
  const today = useMemo(() => getTodayIsoDate(), []);

  // Organization Masters (Departments & Designations)
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
  const [appliedFilters, setAppliedFilters] = useState<PromotionsFilterState>(
    EMPTY_PROMOTIONS_FILTER_STATE,
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

  const appliedCount = countActivePromotionsFilters(appliedFilters);
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
        // Non-blocking; filter dropdown falls back gracefully
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch promotion actions
  useEffect(() => {
    let active = true;
    setListState((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchEmployeeActions({
        page,
        pageSize,
        actionTypes: appliedFilters.actionType
          ? [appliedFilters.actionType]
          : PROMOTION_ACTION_TYPES,
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
            error: err instanceof Error ? err.message : 'Failed to load promotion records.',
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
    setAppliedFilters(EMPTY_PROMOTIONS_FILTER_STATE);
    setPage(1);
  };

  // Handle Page Size Change
  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  // Apply Promotion action
  const handleApplyAction = async (action: EmployeeActionListItem) => {
    try {
      await applyEmployeeAction(action.id, action.version);
      setSuccessMessage(`Promotion for ${action.employeeName} has been successfully applied.`);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to apply promotion.');
    }
  };

  // Cancel Promotion action
  const handleCancelAction = async (action: EmployeeActionListItem) => {
    const reason = window.prompt(
      `Please provide a reason for cancelling the promotion for ${action.employeeName}:`,
    );
    if (reason === null) return;

    try {
      await cancelEmployeeAction(action.id, action.version, reason.trim() || undefined);
      setSuccessMessage(`Promotion for ${action.employeeName} has been cancelled.`);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel promotion.');
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
          : PROMOTION_ACTION_TYPES,
        status: appliedFilters.status || undefined,
        departmentId: appliedFilters.departmentId || undefined,
        effectiveDateFrom: appliedFilters.effectiveDateFrom || undefined,
        effectiveDateTo: appliedFilters.effectiveDateTo || undefined,
        search: search.trim() || undefined,
      });

      const records = res.data;
      if (records.length === 0) {
        alert('No promotion records match the criteria to export.');
        return;
      }

      const headers = [
        'Action ID',
        'Employee ID',
        'Employee Name',
        'Action Type',
        'Current Role',
        'Proposed Role',
        'Current Department',
        'Proposed Department',
        'Effective Date',
        'Status',
        'Reason',
      ];

      const csvRows = [
        headers.join(','),
        ...records.map((r) => {
          const roleChange = r.changes.find((c) => c.field === 'designationId');
          const deptChange = r.changes.find((c) => c.field === 'departmentId');
          return [
            `"${r.id}"`,
            `"${r.employeeNumber}"`,
            `"${(r.employeeName || '').replace(/"/g, '""')}"`,
            `"${actionTypeLabel(r.actionType)}"`,
            `"${(roleChange?.fromLabel || '').replace(/"/g, '""')}"`,
            `"${(roleChange?.toLabel || '').replace(/"/g, '""')}"`,
            `"${(deptChange?.fromLabel || '').replace(/"/g, '""')}"`,
            `"${(deptChange?.toLabel || '').replace(/"/g, '""')}"`,
            `"${r.effectiveDate}"`,
            `"${ACTION_STATUS_LABELS[r.status] || r.status}"`,
            `"${(r.reason || '').replace(/"/g, '""')}"`,
          ].join(',');
        }),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `promotions_directory_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export promotions.');
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
              aria-label="Export promotions to CSV"
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<BezentIcon name="plus" size={16} />}
              onClick={() => setIsNewModalOpen(true)}
              aria-label="Initiate new promotion"
            >
              Initiate Promotion
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
          title="Promotion updated"
        >
          {successMessage}
        </Alert>
      )}

      {/* 2. Workforce KPI Cards */}
      <Grid columns={4} gap="md" className="bezent-kpi-grid">
        {/* Total Promotions */}
        <div className="bezent-kpi-card bezent-kpi-card--blue">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
            <BezentIcon name="career" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Total Promotions</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.all
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">All recorded employee promotions</p>
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

        {/* Upcoming Promotions */}
        <div className="bezent-kpi-card bezent-kpi-card--purple">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--purple">
            <BezentIcon name="calendar" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Upcoming Promotions</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.upcoming
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Scheduled with future effective date</p>
          </div>
        </div>

        {/* Completed Promotions */}
        <div className="bezent-kpi-card bezent-kpi-card--green">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--green">
            <BezentIcon name="userCheck" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Completed Promotions</p>
            <p className="bezent-kpi-card__value">
              {loading && !statusCounts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : statusCounts ? (
                statusCounts.applied
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Applied to employee records</p>
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
            aria-label="Search promotions"
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

            <PromotionsFilterPanel
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

          <span className="bezent-records-text">{`${totalItems} Promotions`}</span>
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
              <span>{`Type: ${actionTypeLabel(appliedFilters.actionType)}`}</span>
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
              <span>{`Effective: ${appliedFilters.effectiveDateFrom || 'Start'} to ${appliedFilters.effectiveDateTo || 'End'}`}</span>
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

      {/* 5. Promotion Table Card */}
      <div className="bezent-table-card">
        <PromotionsTable
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
          onInitiatePromotion={() => setIsNewModalOpen(true)}
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
              )} of ${pagination.totalItems} promotions`}
            </span>
          }
          right={
            <Inline gap="lg" align="center">
              <Inline gap="xs" align="center">
                <Label htmlFor="promotions-page-size-select" size="sm">
                  Rows per page:
                </Label>
                <Select
                  id="promotions-page-size-select"
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
                aria-label="Promotions pagination"
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

      {/* 7. Initiate Promotion Modal */}
      <NewEmployeeActionModal
        isOpen={isNewModalOpen}
        preset={{
          allowedActionTypes: PROMOTION_ACTION_TYPES,
          actionType: 'designation_change',
        }}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(created) => {
          setIsNewModalOpen(false);
          setSuccessMessage(`Promotion initiated for ${created.employeeName}.`);
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
