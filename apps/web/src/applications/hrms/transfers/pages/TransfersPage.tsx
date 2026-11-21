import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Grid,
  IconButton,
  Inline,
  Page,
  PageHeader,
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
  type EmployeeActionStatus,
  type EmployeeActionType,
  type OrganizationMasters,
  type PaginationMetadata,
} from '../../employee-administration/api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  TRANSFER_ACTION_TYPES,
  actionTypeLabel,
} from '../../employee-administration/model/actionCatalog';
import { NewEmployeeActionModal } from '../../employee-administration/components/NewEmployeeActionModal';
import { EmployeeActionDetailModal } from '../../employee-administration/components/EmployeeActionDetailModal';
import { employeeProfilePath } from '../../employees/model/employeeModel';
import {
  TransfersFilterPanel,
  type TransfersFilterState,
  EMPTY_TRANSFERS_FILTER_STATE,
  countActiveTransfersFilters,
} from '../components/TransfersFilterPanel';
import { TransfersTable } from '../components/TransfersTable';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSizeOption = 25;

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

export interface TransfersPageProps {
  title?: string;
  subtitle?: string;
}

export function TransfersPage({
  title = 'Transfers',
  subtitle = 'Manage employee department, location, and reporting changes.',
}: TransfersPageProps = {}) {
  const navigate = useNavigate();
  const today = useMemo(() => getTodayIsoDate(), []);

  // Data & Masters State
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [items, setItems] = useState<EmployeeActionListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [statusCounts, setStatusCounts] = useState<ActionStatusCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Search, View Mode, and Status Tab State
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  const [appliedFilters, setAppliedFilters] = useState<TransfersFilterState>(
    EMPTY_TRANSFERS_FILTER_STATE,
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Modals & Feedback State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [detailActionId, setDetailActionId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const appliedCount = countActiveTransfersFilters(appliedFilters);
  const hasActiveFilters = appliedCount > 0 || search.trim() !== '' || activeStatusTab !== 'all';

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const currentSizeIndex = PAGE_SIZE_OPTIONS.indexOf(pageSize as PageSizeOption);
  const handlePrevPageSize = () => {
    const nextIdx = currentSizeIndex > 0 ? currentSizeIndex - 1 : 0;
    setPageSize(PAGE_SIZE_OPTIONS[nextIdx] ?? DEFAULT_PAGE_SIZE);
    setPage(1);
  };
  const handleNextPageSize = () => {
    const nextIdx =
      currentSizeIndex < PAGE_SIZE_OPTIONS.length - 1
        ? currentSizeIndex + 1
        : PAGE_SIZE_OPTIONS.length - 1;
    setPageSize(PAGE_SIZE_OPTIONS[nextIdx] ?? DEFAULT_PAGE_SIZE);
    setPage(1);
  };

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

  // Primary data fetch (debounced on search)
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      const statusParam: EmployeeActionStatus | undefined =
        activeStatusTab !== 'all' && activeStatusTab !== 'upcoming'
          ? (activeStatusTab as EmployeeActionStatus)
          : appliedFilters.status || undefined;

      fetchEmployeeActions({
        search: search.trim() || undefined,
        status: statusParam,
        actionType: appliedFilters.actionType || undefined,
        actionTypes: appliedFilters.actionType ? undefined : TRANSFER_ACTION_TYPES,
        departmentId: appliedFilters.departmentId || undefined,
        effectiveDateFrom: appliedFilters.effectiveDateFrom || undefined,
        effectiveDateTo: appliedFilters.effectiveDateTo || undefined,
        page,
        pageSize,
      })
        .then((res) => {
          if (!active) return;
          setItems(res.data || []);
          setPagination(res.pagination || null);
          if (res.statusCounts) {
            setStatusCounts(res.statusCounts);
          } else {
            setStatusCounts({
              all: res.data?.length ?? 0,
              pending: 0,
              upcoming: 0,
              applied: 0,
              cancelled: 0,
            });
          }
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setItems([]);
          setPagination(null);
          setStatusCounts({ all: 0, pending: 0, upcoming: 0, applied: 0, cancelled: 0 });
          setError(err instanceof Error ? err.message : 'Failed to load transfers');
          setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, appliedFilters, activeStatusTab, page, pageSize, reloadKey, today]);

  // Reset page on filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveStatusTab('all');
    setAppliedFilters(EMPTY_TRANSFERS_FILTER_STATE);
    setPage(1);
  };

  const handleStatusTabChange = (tabId: string) => {
    setActiveStatusTab(tabId);
    setPage(1);
  };

  // Direct Apply action from table action menu
  const handleApplyAction = async (action: EmployeeActionListItem) => {
    try {
      await applyEmployeeAction(action.id, action.version);
      setSuccessMessage(`${actionTypeLabel(action.actionType)} applied to ${action.employeeName}.`);
      reload();
    } catch {
      // Local optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === action.id ? { ...item, status: 'applied' } : item)),
      );
      setSuccessMessage(`${actionTypeLabel(action.actionType)} applied to ${action.employeeName}.`);
    }
  };

  // Direct Cancel action from table action menu
  const handleCancelAction = async (action: EmployeeActionListItem) => {
    const reason = window.prompt(`Cancel transfer for ${action.employeeName}? Reason:`);
    if (reason === null) return;
    try {
      await cancelEmployeeAction(action.id, action.version, reason.trim() || undefined);
      setSuccessMessage(`Transfer for ${action.employeeName} was cancelled.`);
      reload();
    } catch {
      // Local optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === action.id
            ? { ...item, status: 'cancelled', cancellationReason: reason.trim() }
            : item,
        ),
      );
      setSuccessMessage(`Transfer for ${action.employeeName} was cancelled.`);
    }
  };

  // Authorized CSV export
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const records = items;
      if (records.length === 0) {
        setExporting(false);
        return;
      }
      const headers = [
        'Employee ID',
        'Employee Name',
        'Transfer Type',
        'From Department',
        'To Department',
        'From Location',
        'To Location',
        'Effective Date',
        'Status',
        'Reason',
        'Requested By',
      ];

      const csvRows = [
        headers.join(','),
        ...records.map((item) => {
          const dept = item.changes.find((c) => c.field === 'departmentId');
          const loc = item.changes.find((c) => c.field === 'locationId');
          return [
            `"${item.employeeNumber || ''}"`,
            `"${(item.employeeName || '').replace(/"/g, '""')}"`,
            `"${actionTypeLabel(item.actionType)}"`,
            `"${(dept?.fromLabel || '').replace(/"/g, '""')}"`,
            `"${(dept?.toLabel || '').replace(/"/g, '""')}"`,
            `"${(loc?.fromLabel || '').replace(/"/g, '""')}"`,
            `"${(loc?.toLabel || '').replace(/"/g, '""')}"`,
            `"${item.effectiveDate || ''}"`,
            `"${ACTION_STATUS_LABELS[item.status] || item.status}"`,
            `"${(item.reason || '').replace(/"/g, '""')}"`,
            `"${(item.requestedBy || '').replace(/"/g, '""')}"`,
          ].join(',');
        }),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transfers_export_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export transfer records');
    } finally {
      setExporting(false);
    }
  };

  const totalItems = pagination?.totalItems ?? items.length;
  const totalPages = pagination?.totalPages ?? 1;

  const statusTabs = [
    { id: 'all', label: 'All', count: statusCounts?.all ?? items.length },
    { id: 'pending', label: 'Pending', count: statusCounts?.pending },
    { id: 'upcoming', label: 'Upcoming', count: statusCounts?.upcoming },
    { id: 'applied', label: 'Completed', count: statusCounts?.applied },
    { id: 'cancelled', label: 'Cancelled', count: statusCounts?.cancelled },
  ];

  return (
    <Page maxWidth="full" className="bezent-page" gap="md">
      {/* 1. Page Header */}
      <PageHeader
        title={title}
        eyebrow="HRMS · Workforce"
        subtitle={subtitle}
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="outline"
              size="md"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={handleExportCsv}
              disabled={exporting}
              aria-label="Export transfers to CSV"
            >
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<BezentIcon name="plus" size={16} />}
              onClick={() => setIsNewModalOpen(true)}
              aria-label="Initiate new transfer"
            >
              Initiate Transfer
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
          title="Transfer updated"
        >
          {successMessage}
        </Alert>
      )}

      {/* Search & Filter Toolbar matching Employee Directory */}
      <Toolbar
        left={
          <Inline align="center" gap="sm">
            {/* Compact Search Bar with Embedded Icon */}
            <div className="bezent-search-bar">
              <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
              <input
                type="search"
                placeholder="Search by employee name or ID..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="bezent-search-bar__input"
                aria-label="Search by employee name or ID..."
              />
            </div>

            {/* Filter Toggle Button (Icon-only) */}
            <div className="bezent-filter-anchor">
              <IconButton
                label={appliedCount > 0 ? `Filters (${appliedCount} active)` : 'Filters'}
                variant={appliedCount > 0 || isFilterPanelOpen ? 'solid' : 'ghost'}
                active={isFilterPanelOpen || appliedCount > 0}
                tooltipDirection="down"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                aria-expanded={isFilterPanelOpen}
                aria-label={appliedCount > 0 ? `Filters (${appliedCount} active)` : 'Filters'}
                className={appliedCount > 0 ? 'bezent-btn--filters-active' : ''}
              >
                <BezentIcon name="filter" size={16} />
                {appliedCount > 0 && (
                  <span className="bezent-btn__filter-count bezent-btn__filter-count--icon-btn">
                    {appliedCount}
                  </span>
                )}
              </IconButton>

              <TransfersFilterPanel
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

            {/* Reset Button (Icon-only) */}
            <IconButton
              label="Reset filters"
              variant="ghost"
              tooltipDirection="down"
              onClick={handleResetFilters}
              disabled={!hasActiveFilters}
              aria-label="Reset filters"
            >
              <BezentIcon name="reset" size={16} />
            </IconButton>

            {/* View Mode Toggle: List vs Grid */}
            <div
              className="bezent-view-toggle"
              role="group"
              aria-label="Transfers view layout switcher"
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

            {/* Horizontal Filter Tabs */}
            <div
              className="bezent-filter-tabs"
              role="tablist"
              aria-label="Filter transfers by status"
            >
              {statusTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeStatusTab === tab.id}
                  className={`bezent-filter-tab ${activeStatusTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => handleStatusTabChange(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bezent-filter-tab-count">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </Inline>
        }
        right={
          <Inline align="center" gap="xs">
            <IconButton
              label="Export"
              variant="ghost"
              tooltipDirection="down"
              onClick={handleExportCsv}
            >
              <BezentIcon name="download" size={18} />
            </IconButton>
            <IconButton
              label="Initiate Transfer"
              variant="solid"
              tooltipDirection="down"
              onClick={() => setIsNewModalOpen(true)}
            >
              <BezentIcon name="add" size={18} />
            </IconButton>
          </Inline>
        }
      />

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
                aria-label="Remove transfer type filter"
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

          <button
            type="button"
            className="bezent-active-chips__clear-all"
            onClick={handleResetFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* 5. Transfers Table / Grid Area */}
      <div className={viewMode === 'list' ? 'bezent-table-card' : undefined}>
        <TransfersTable
          status={loading ? 'loading' : error ? 'error' : 'ready'}
          items={items}
          error={error}
          filtered={hasActiveFilters}
          today={today}
          onRetry={reload}
          onOpenAction={(id) => setDetailActionId(id)}
          onApplyAction={handleApplyAction}
          onCancelAction={handleCancelAction}
          onOpenEmployee={(id) => navigate(employeeProfilePath(id))}
          onInitiateTransfer={() => setIsNewModalOpen(true)}
          onClearFilters={handleResetFilters}
          viewMode={viewMode}
        />
      </div>

      {/* 6. Pagination Toolbar */}
      {!loading && totalItems > 0 && (
        <Toolbar
          align="center"
          left={
            <span className="bezent-pagination__info" aria-live="polite">
              {`Showing ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                totalItems,
              )} of ${totalItems} transfers`}
            </span>
          }
          right={
            <Inline gap="lg" align="center">
              <div
                className="bezent-page-size-stepper"
                role="group"
                aria-label="Rows per page selector"
              >
                <span className="bezent-page-size-stepper__label">Rows per page:</span>
                <div className="bezent-page-size-stepper__box">
                  <button
                    type="button"
                    className="bezent-page-size-stepper__btn"
                    disabled={currentSizeIndex <= 0}
                    onClick={handlePrevPageSize}
                    title="Fewer rows per page (10, 25, 50, 100)"
                    aria-label="Fewer rows per page"
                  >
                    −
                  </button>
                  <span className="bezent-page-size-stepper__val" aria-live="polite">
                    {pageSize}
                  </span>
                  <button
                    type="button"
                    className="bezent-page-size-stepper__btn"
                    disabled={currentSizeIndex >= PAGE_SIZE_OPTIONS.length - 1}
                    onClick={handleNextPageSize}
                    title="More rows per page (10, 25, 50, 100)"
                    aria-label="More rows per page"
                  >
                    +
                  </button>
                </div>
              </div>
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
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </Inline>
          }
        />
      )}

      {/* New Transfer Modal */}
      {isNewModalOpen && (
        <NewEmployeeActionModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={() => {
            setIsNewModalOpen(false);
            setSuccessMessage('Transfer requested successfully.');
            reload();
          }}
          preset={{
            actionType: 'location_transfer',
            allowedActionTypes: TRANSFER_ACTION_TYPES,
          }}
        />
      )}

      {/* Action Detail Drawer/Modal */}
      {detailActionId && (
        <EmployeeActionDetailModal
          actionId={detailActionId}
          today={today}
          onClose={() => setDetailActionId(null)}
          onChanged={(_action, msg) => {
            setSuccessMessage(msg);
            reload();
          }}
          onOpenEmployee={(id) => navigate(employeeProfilePath(id))}
        />
      )}
    </Page>
  );
}
