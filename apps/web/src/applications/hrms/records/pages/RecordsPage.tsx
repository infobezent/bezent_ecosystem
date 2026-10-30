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
  fetchDocuments,
  type DocumentCategory,
  type DocumentStatus,
  type DocumentView,
  type DocumentsPagination,
  type EmployeeDocument,
} from '../../documents/api/documentsApi';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../api/organizationMastersApi';
import { employeeProfilePath } from '../../employees/model/employeeModel';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../documents/model/documentModel';
import { DocumentDetailModal } from '../../documents/components/DocumentDetail';
import { RecordsTable } from '../components/RecordsTable';
import {
  RecordsFilterPanel,
  type RecordsFilterState,
  EMPTY_RECORDS_FILTER_STATE,
  countActiveRecordsFilters,
} from '../components/RecordsFilterPanel';
import { NewRecordModal } from '../components/NewRecordModal';

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

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

export interface RecordsPageProps {
  title?: string;
  subtitle?: string;
}

/**
 * Workforce → Records Page
 * Centralized portal to access, verify, monitor, and manage employee records,
 * compliance documents, and credentials across the organization.
 */
export function RecordsPage({
  title = 'Records',
  subtitle = 'Access and manage employee records, documents, and employment history.',
}: RecordsPageProps) {
  const navigate = useNavigate();
  const today = useMemo(() => getTodayIsoDate(), []);

  // Organization Masters
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);

  // List State
  const [listState, setListState] = useState<{
    status: 'loading' | 'error' | 'ready';
    documents: EmployeeDocument[];
    pagination: DocumentsPagination | null;
    counts: Record<DocumentView, number> | null;
    error: string | null;
  }>({
    status: 'loading',
    documents: [],
    pagination: null,
    counts: null,
    error: null,
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RecordsFilterState>(EMPTY_RECORDS_FILTER_STATE);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Load Organization Masters (Departments)
  useEffect(() => {
    let active = true;
    fetchOrganizationMasters()
      .then((data) => active && setMasters(data))
      .catch(() => active && setMasters(null));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Load Documents from API
  useEffect(() => {
    let active = true;
    setListState((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchDocuments({
        view: filters.view,
        search: search.trim() || undefined,
        category: filters.category || undefined,
        status: filters.status || undefined,
        departmentId: filters.departmentId || undefined,
        page,
        pageSize,
      })
        .then((res) => {
          if (!active) return;
          setListState({
            status: 'ready',
            documents: res.data,
            pagination: res.pagination,
            counts: res.counts,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (!active) return;
          setListState((prev) => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load employee records',
          }));
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, search, page, pageSize, reloadKey]);

  // Export to CSV
  const handleExport = useCallback(() => {
    if (listState.documents.length === 0) return;
    const headers = [
      'Record Name',
      'Employee Name',
      'Employee ID',
      'Category',
      'Department',
      'Uploaded Date',
      'Expiry Date',
      'Verification Status',
    ];
    const rows = listState.documents.map((r) => [
      `"${r.documentName.replace(/"/g, '""')}"`,
      `"${r.employeeName.replace(/"/g, '""')}"`,
      `"${r.employeeNumber}"`,
      `"${CATEGORY_LABELS[r.category] ?? r.category}"`,
      `"${(r.departmentName ?? '').replace(/"/g, '""')}"`,
      `"${r.createdAt.slice(0, 10)}"`,
      `"${r.expiryDate ?? ''}"`,
      `"${STATUS_LABELS[r.status] ?? r.status}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_records_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [listState.documents, today]);

  const activeFiltersCount = useMemo(() => countActiveRecordsFilters(filters), [filters]);

  const isFiltered = Boolean(
    search.trim() ||
    filters.category ||
    filters.status ||
    (filters.view && filters.view !== 'all') ||
    filters.departmentId,
  );

  const handleClearAllFilters = () => {
    setSearch('');
    setFilters(EMPTY_RECORDS_FILTER_STATE);
    setPage(1);
  };

  const handleRemoveCategory = () => {
    setFilters((prev) => ({ ...prev, category: '' }));
    setPage(1);
  };

  const handleRemoveStatus = () => {
    setFilters((prev) => ({ ...prev, status: '' }));
    setPage(1);
  };

  const handleRemoveView = () => {
    setFilters((prev) => ({ ...prev, view: 'all' }));
    setPage(1);
  };

  const handleRemoveDepartment = () => {
    setFilters((prev) => ({ ...prev, departmentId: '' }));
    setPage(1);
  };

  const pagination = listState.pagination;
  const loading = listState.status === 'loading';
  const counts = listState.counts;

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
              variant="secondary"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={handleExport}
              disabled={listState.documents.length === 0}
            >
              Export
            </Button>
            <Button
              variant="primary"
              leftIcon={<BezentIcon name="plus" size={16} />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Record
            </Button>
          </Inline>
        }
      />

      {/* 2. Summary KPI Cards */}
      <Grid columns={4} gap="md">
        {/* Total Records */}
        <div className="bezent-kpi-card bezent-kpi-card--blue">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
            <BezentIcon name="documents" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Total Records</p>
            <p className="bezent-kpi-card__value">
              {loading && !counts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : counts ? (
                counts.all
              ) : pagination ? (
                pagination.totalItems
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Centralized employee records</p>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bezent-kpi-card bezent-kpi-card--amber">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--amber">
            <BezentIcon name="schedule" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Pending Verification</p>
            <p className="bezent-kpi-card__value">
              {loading && !counts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : counts ? (
                counts.pending_review
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Awaiting administrative review</p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bezent-kpi-card bezent-kpi-card--purple">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--purple">
            <BezentIcon name="calendar" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Expiring Soon</p>
            <p className="bezent-kpi-card__value">
              {loading && !counts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : counts ? (
                counts.expiring
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Expiring within 30 days</p>
          </div>
        </div>

        {/* Expired Records */}
        <div className="bezent-kpi-card bezent-kpi-card--rose">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--rose">
            <BezentIcon name="warning" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Expired Records</p>
            <p className="bezent-kpi-card__value">
              {loading && !counts ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : counts ? (
                counts.expired
              ) : (
                '—'
              )}
            </p>
            <p className="bezent-kpi-card__caption">Past validity date</p>
          </div>
        </div>
      </Grid>

      {/* 3. Search & Filter Toolbar */}
      <div className="bezent-directory-toolbar">
        <div className="bezent-directory-toolbar__search">
          <SearchInput
            placeholder="Search employee name, ID, or document..."
            shape="rounded"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            onClear={() => {
              setSearch('');
              setPage(1);
            }}
            aria-label="Search employee records"
          />
        </div>

        <div className="bezent-directory-toolbar__actions">
          <div className="bezent-filter-anchor">
            <Button
              variant={activeFiltersCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
              size="md"
              shape="rounded"
              className={activeFiltersCount > 0 ? 'bezent-btn--filters-active' : ''}
              leftIcon={<BezentIcon name="filter" size={16} />}
              onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              aria-label="Filter records"
            >
              Filters
              {activeFiltersCount > 0 && (
                <span className="bezent-btn__filter-count">{activeFiltersCount}</span>
              )}
            </Button>

            <RecordsFilterPanel
              isOpen={isFilterPanelOpen}
              onClose={() => setIsFilterPanelOpen(false)}
              appliedFilters={filters}
              onApply={(nextFilters) => {
                setFilters(nextFilters);
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
            onClick={handleClearAllFilters}
            disabled={!isFiltered}
          >
            Reset
          </Button>

          <span className="bezent-records-text">{`${pagination?.totalItems ?? 0} Records`}</span>
        </div>
      </div>

      {/* Active Filter Chips */}
      {isFiltered && (
        <div className="bezent-active-chips-strip" role="region" aria-label="Active filters">
          {search.trim() && (
            <span className="bezent-active-filter-chip">
              <span>{`Search: "${search.trim()}"`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Remove search filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.category && (
            <span className="bezent-active-filter-chip">
              <span>{`Category: ${CATEGORY_LABELS[filters.category] ?? filters.category}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                onClick={handleRemoveCategory}
                aria-label="Remove category filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.status && (
            <span className="bezent-active-filter-chip">
              <span>{`Status: ${STATUS_LABELS[filters.status] ?? filters.status}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                onClick={handleRemoveStatus}
                aria-label="Remove status filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.view && filters.view !== 'all' && (
            <span className="bezent-active-filter-chip">
              <span>{`View: ${
                filters.view === 'pending_review'
                  ? 'Pending Review'
                  : filters.view === 'expiring'
                    ? 'Expiring Soon'
                    : 'Expired'
              }`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                onClick={handleRemoveView}
                aria-label="Remove lifecycle view filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.departmentId && (
            <span className="bezent-active-filter-chip">
              <span>{`Department: ${
                masters?.departments.find((d) => d.id === filters.departmentId)?.name ??
                filters.departmentId
              }`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                onClick={handleRemoveDepartment}
                aria-label="Remove department filter"
              >
                ×
              </button>
            </span>
          )}

          <button
            type="button"
            className="bezent-active-chips__clear-all"
            onClick={handleClearAllFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* 4. Table Card */}
      <div className="bezent-table-card">
        <RecordsTable
          status={listState.status}
          documents={listState.documents}
          error={listState.error}
          filtered={isFiltered}
          onRetry={reload}
          onView={setOpenDocumentId}
          onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
        />
      </div>

      {/* 5. Pagination Toolbar */}
      {!loading && !listState.error && pagination && pagination.totalItems > 0 && (
        <Toolbar
          align="center"
          left={
            <span className="bezent-pagination__info" aria-live="polite">
              {`Showing ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                pagination.totalItems,
              )} of ${pagination.totalItems} records`}
            </span>
          }
          right={
            <Inline gap="lg" align="center">
              <Inline gap="xs" align="center">
                <Label htmlFor="records-page-size-select" size="sm">
                  Rows per page:
                </Label>
                <Select
                  id="records-page-size-select"
                  size="sm"
                  width="auto"
                  placement="top"
                  value={String(pageSize)}
                  options={PAGE_SIZE_OPTIONS}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="Rows per page"
                />
              </Inline>

              <div className="bezent-pagination" role="navigation" aria-label="Records pagination">
                <button
                  type="button"
                  className="bezent-pagination__btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>

                {getPaginationItems(page, pagination.totalPages).map((item, idx) =>
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
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </Inline>
          }
        />
      )}

      {/* Document Detail View Modal */}
      <DocumentDetailModal documentId={openDocumentId} onClose={() => setOpenDocumentId(null)} />

      {/* Upload / New Record Modal */}
      <NewRecordModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          reload();
        }}
      />
    </Page>
  );
}
