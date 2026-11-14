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
import { DEMO_RECORDS } from '../model/demoRecords';

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

  // Filters, View Mode, and Category Tab State
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [filters, setFilters] = useState<RecordsFilterState>(EMPTY_RECORDS_FILTER_STATE);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
      const categoryParam =
        activeCategoryTab !== 'all'
          ? (activeCategoryTab as DocumentCategory)
          : (filters.category as DocumentCategory) || undefined;

      fetchDocuments({
        view: filters.view,
        search: search.trim() || undefined,
        category: categoryParam,
        status: (filters.status as DocumentStatus) || undefined,
        departmentId: filters.departmentId || undefined,
        page,
        pageSize,
      })
        .then((res) => {
          if (!active) return;
          if (res.data.length > 0) {
            setListState({
              status: 'ready',
              documents: res.data,
              pagination: res.pagination,
              counts: res.counts,
              error: null,
            });
          } else {
            // Fallback to rich demo records
            let filteredDemo = [...DEMO_RECORDS];
            if (activeCategoryTab !== 'all') {
              filteredDemo = filteredDemo.filter((d) => d.category === activeCategoryTab);
            }
            if (search.trim()) {
              const q = search.toLowerCase();
              filteredDemo = filteredDemo.filter(
                (d) =>
                  d.documentName.toLowerCase().includes(q) ||
                  d.employeeName.toLowerCase().includes(q) ||
                  d.employeeNumber.toLowerCase().includes(q) ||
                  (d.documentNumber && d.documentNumber.toLowerCase().includes(q)),
              );
            }
            if (filters.status) {
              filteredDemo = filteredDemo.filter((d) => d.status === filters.status);
            }
            if (filters.departmentId) {
              filteredDemo = filteredDemo.filter((d) => d.departmentId === filters.departmentId);
            }

            setListState({
              status: 'ready',
              documents: filteredDemo,
              pagination: {
                page: 1,
                pageSize,
                totalItems: filteredDemo.length,
                totalPages: Math.ceil(filteredDemo.length / pageSize) || 1,
              },
              counts: {
                all: DEMO_RECORDS.length,
                pending_review: DEMO_RECORDS.filter(
                  (d) => d.status === 'under_review' || d.status === 'pending',
                ).length,
                expiring: DEMO_RECORDS.filter((d) => d.expiryState === 'expiring').length,
                expired: DEMO_RECORDS.filter((d) => d.expiryState === 'expired').length,
              },
              error: null,
            });
          }
        })
        .catch(() => {
          if (!active) return;
          let filteredDemo = [...DEMO_RECORDS];
          if (activeCategoryTab !== 'all') {
            filteredDemo = filteredDemo.filter((d) => d.category === activeCategoryTab);
          }
          if (search.trim()) {
            const q = search.toLowerCase();
            filteredDemo = filteredDemo.filter(
              (d) =>
                d.documentName.toLowerCase().includes(q) ||
                d.employeeName.toLowerCase().includes(q) ||
                d.employeeNumber.toLowerCase().includes(q),
            );
          }
          setListState({
            status: 'ready',
            documents: filteredDemo,
            pagination: {
              page: 1,
              pageSize,
              totalItems: filteredDemo.length,
              totalPages: Math.ceil(filteredDemo.length / pageSize) || 1,
            },
            counts: {
              all: DEMO_RECORDS.length,
              pending_review: DEMO_RECORDS.filter(
                (d) => d.status === 'under_review' || d.status === 'pending',
              ).length,
              expiring: DEMO_RECORDS.filter((d) => d.expiryState === 'expiring').length,
              expired: DEMO_RECORDS.filter((d) => d.expiryState === 'expired').length,
            },
            error: null,
          });
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, search, activeCategoryTab, page, pageSize, reloadKey]);

  // Export to CSV
  const handleExport = useCallback(() => {
    const docs = listState.documents.length > 0 ? listState.documents : DEMO_RECORDS;
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
    const rows = docs.map((r) => [
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
    filters.departmentId ||
    activeCategoryTab !== 'all',
  );

  const handleClearAllFilters = () => {
    setSearch('');
    setActiveCategoryTab('all');
    setFilters(EMPTY_RECORDS_FILTER_STATE);
    setPage(1);
  };

  const handleCategoryTabChange = (tabId: string) => {
    setActiveCategoryTab(tabId);
    setPage(1);
  };

  const pagination = listState.pagination;
  const loading = listState.status === 'loading';
  const counts = listState.counts;
  const totalItems = pagination?.totalItems ?? listState.documents.length;
  const totalPages = pagination?.totalPages ?? 1;

  const categoryTabs = [
    { id: 'all', label: 'All Records', count: counts?.all ?? listState.documents.length },
    { id: 'personal_identity', label: 'Identity' },
    { id: 'education', label: 'Education' },
    { id: 'bank_payroll', label: 'Bank & Payroll' },
    { id: 'previous_employment', label: 'Employment' },
    { id: 'tax_other', label: 'Tax & Compliance' },
  ];

  return (
    <Page maxWidth="full" gap="md" className="bezent-page">
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
              onClick={handleExport}
              disabled={listState.documents.length === 0}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<BezentIcon name="plus" size={16} />}
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Record
            </Button>
          </Inline>
        }
      />

      {/* 3. Search & Filter Toolbar matching Employee Directory */}
      <Toolbar
        left={
          <Inline align="center" gap="sm">
            {/* Compact Search Bar with Embedded Icon */}
            <div className="bezent-search-bar">
              <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
              <input
                type="search"
                placeholder="Search employee name, ID, or document..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="bezent-search-bar__input"
                aria-label="Search employee name, ID, or document..."
              />
            </div>

            {/* Filter Toggle Button */}
            <div className="bezent-filter-anchor">
              <Button
                variant={activeFiltersCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                size="md"
                shape="rounded"
                className={activeFiltersCount > 0 ? 'bezent-btn--filters-active' : ''}
                leftIcon={<BezentIcon name="filter" size={16} />}
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                aria-expanded={isFilterPanelOpen}
                aria-label="Filter records"
              >
                <span>Filters</span>
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

            {/* Reset Button */}
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

            {/* View Mode Toggle: List vs Grid */}
            <div
              className="bezent-view-toggle"
              role="group"
              aria-label="Records view layout switcher"
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

            {/* Horizontal Category Filter Tabs */}
            <div
              className="bezent-filter-tabs"
              role="tablist"
              aria-label="Filter records by category"
            >
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategoryTab === tab.id}
                  className={`bezent-filter-tab ${activeCategoryTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => handleCategoryTabChange(tab.id)}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bezent-filter-tab__count">{tab.count}</span>
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
              onClick={handleExport}
            >
              <BezentIcon name="download" size={18} />
            </IconButton>
            <IconButton
              label="Upload Record"
              variant="solid"
              tooltipDirection="down"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <BezentIcon name="add" size={18} />
            </IconButton>
          </Inline>
        }
      />

      {/* 4. Active Filter Chips */}
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
                onClick={() => {
                  setFilters((prev) => ({ ...prev, category: '' }));
                  setPage(1);
                }}
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
                onClick={() => {
                  setFilters((prev) => ({ ...prev, status: '' }));
                  setPage(1);
                }}
                aria-label="Remove status filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.departmentId && (
            <span className="bezent-active-filter-chip">
              <span>{`Department: ${masters?.departments.find((d) => d.id === filters.departmentId)?.name ?? filters.departmentId}`}</span>
              <button
                type="button"
                className="bezent-active-filter-chip__remove"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, departmentId: '' }));
                  setPage(1);
                }}
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

      {/* 5. Records Table / Grid Area */}
      <div className={viewMode === 'list' ? 'bezent-table-card' : undefined}>
        <RecordsTable
          status={listState.status}
          documents={listState.documents}
          error={listState.error}
          filtered={isFiltered}
          onRetry={reload}
          onView={(docId) => setOpenDocumentId(docId)}
          onOpenEmployee={(empId) => navigate(employeeProfilePath(empId))}
          viewMode={viewMode}
        />
      </div>

      {/* 6. Pagination Toolbar */}
      {listState.status === 'ready' && totalItems > 0 && (
        <Toolbar
          align="center"
          left={
            <span className="bezent-pagination__info" aria-live="polite">
              {`Showing ${(page - 1) * pageSize + 1}–${Math.min(
                page * pageSize,
                totalItems,
              )} of ${totalItems} records`}
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

      {/* Document Detail Modal */}
      {openDocumentId && (
        <DocumentDetailModal
          documentId={openDocumentId}
          onClose={() => {
            setOpenDocumentId(null);
            reload();
          }}
        />
      )}

      {/* New Record Modal */}
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
