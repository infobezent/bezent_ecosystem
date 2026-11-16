import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
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
import { RecordsFolderView } from '../components/RecordsFolderView';
import {
  RecordsFilterPanel,
  type RecordsFilterState,
  EMPTY_RECORDS_FILTER_STATE,
  countActiveRecordsFilters,
} from '../components/RecordsFilterPanel';
import { NewRecordModal } from '../components/NewRecordModal';
import { DEMO_RECORDS } from '../model/demoRecords';

const FOLDER_FETCH_PAGE_SIZE = 100;
const FOLDER_FETCH_MAX_PAGES = 20;

type RecordsListState = {
  status: 'loading' | 'error' | 'ready';
  documents: EmployeeDocument[];
  pagination: DocumentsPagination | null;
  counts: Record<DocumentView, number> | null;
  error: string | null;
};

/** Sample records shown when the API has nothing, filtered the same way the API would. */
function buildDemoState(search: string, filters: RecordsFilterState): RecordsListState {
  let docs = [...DEMO_RECORDS];
  if (filters.category) docs = docs.filter((d) => d.category === filters.category);
  const q = search.trim().toLowerCase();
  if (q) {
    docs = docs.filter(
      (d) =>
        d.documentName.toLowerCase().includes(q) ||
        d.employeeName.toLowerCase().includes(q) ||
        d.employeeNumber.toLowerCase().includes(q) ||
        (d.documentNumber ? d.documentNumber.toLowerCase().includes(q) : false),
    );
  }
  if (filters.status) docs = docs.filter((d) => d.status === filters.status);
  if (filters.departmentId) docs = docs.filter((d) => d.departmentId === filters.departmentId);
  return {
    status: 'ready',
    documents: docs,
    pagination: {
      page: 1,
      pageSize: FOLDER_FETCH_PAGE_SIZE,
      totalItems: docs.length,
      totalPages: 1,
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
  };
}

function getTodayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
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
  const [listState, setListState] = useState<RecordsListState>({
    status: 'loading',
    documents: [],
    pagination: null,
    counts: null,
    error: null,
  });

  // Filters, View Mode, and Category Tab State
  const [search, setSearch] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecordsFilterState>(EMPTY_RECORDS_FILTER_STATE);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
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

  // Load Documents from API. Folder mode needs every matching document so each
  // employee's folder is complete, so it walks all pages (100 per request).
  useEffect(() => {
    let active = true;
    setListState((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      const categoryParam = (filters.category as DocumentCategory) || undefined;
      const query = {
        view: filters.view,
        search: search.trim() || undefined,
        category: categoryParam,
        status: (filters.status as DocumentStatus) || undefined,
        departmentId: filters.departmentId || undefined,
      };

      const load = async () => {
        const first = await fetchDocuments({ ...query, page: 1, pageSize: FOLDER_FETCH_PAGE_SIZE });
        let documents = first.data;
        const lastPage = Math.min(first.pagination.totalPages, FOLDER_FETCH_MAX_PAGES);
        for (let p = 2; p <= lastPage; p++) {
          const next = await fetchDocuments({
            ...query,
            page: p,
            pageSize: FOLDER_FETCH_PAGE_SIZE,
          });
          documents = documents.concat(next.data);
        }
        return { ...first, data: documents };
      };

      load()
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
            setListState(buildDemoState(search, filters));
          }
        })
        .catch(() => {
          if (!active) return;
          setListState(buildDemoState(search, filters));
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, search, reloadKey]);

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
    filters.departmentId,
  );

  const handleClearAllFilters = () => {
    setSearch('');
    setFilters(EMPTY_RECORDS_FILTER_STATE);
  };

  return (
    <Page maxWidth="full" gap="md" className="bezent-page">
      {/* 1. Page Header */}
      <PageHeader eyebrow="HRMS · Workforce" title={title} subtitle={subtitle} />

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

      {/* 5. Employee folders: one per employee, ordered by employee ID */}
      <RecordsFolderView
        status={listState.status}
        documents={listState.documents}
        error={listState.error}
        filtered={isFiltered}
        openFolderId={openFolderId}
        onOpenFolder={setOpenFolderId}
        onRetry={reload}
        onView={(docId) => setOpenDocumentId(docId)}
        onOpenEmployee={(empId) => navigate(employeeProfilePath(empId))}
      />

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
