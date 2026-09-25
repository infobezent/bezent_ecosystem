import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Inline,
  Label,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import {
  fetchDocuments,
  type DocumentCategory,
  type DocumentStatus,
  type DocumentView,
  type DocumentsPagination,
  type EmployeeDocument,
} from '../api/documentsApi';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../organization/api/organizationApi';
import { employeeProfilePath } from '../../employees/model/employeeModel';
import { CATEGORY_LABELS, DOCUMENT_TABS, STATUS_LABELS } from '../model/documentModel';
import { DocumentsTable } from '../components/DocumentsTable';
import { DocumentDetailModal } from '../components/DocumentDetail';

const PAGE_SIZE = 25;

interface ListState {
  status: 'loading' | 'error' | 'ready';
  documents: EmployeeDocument[];
  pagination: DocumentsPagination | null;
  counts: Record<DocumentView, number> | null;
  error: string | null;
}

/**
 * Administration → Documents — the centralized operational area for employee
 * documents across the employee lifecycle.
 */
export function DocumentsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<DocumentView>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<DocumentCategory | ''>('');
  const [status, setStatus] = useState<DocumentStatus | ''>('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [list, setList] = useState<ListState>({
    status: 'loading',
    documents: [],
    pagination: null,
    counts: null,
    error: null,
  });

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Department filter options come from real organization masters; a failure
  // only disables that filter.
  useEffect(() => {
    let active = true;
    fetchOrganizationMasters()
      .then((data) => active && setMasters(data))
      .catch(() => active && setMasters(null));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setList((prev) => ({ ...prev, status: 'loading', error: null }));

    const timer = setTimeout(() => {
      fetchDocuments({
        view,
        search: search.trim() || undefined,
        category: category || undefined,
        status: status || undefined,
        departmentId: departmentId || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
        .then((res) => {
          if (!active) return;
          setList({
            status: 'ready',
            documents: res.data,
            pagination: res.pagination,
            counts: res.counts,
            error: null,
          });
        })
        .catch((err: unknown) => {
          if (!active) return;
          setList((prev) => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to load documents',
          }));
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [view, search, category, status, departmentId, page, reloadKey]);

  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const filtered = Boolean(view !== 'all' || search.trim() || category || status || departmentId);
  const pagination = list.pagination;

  return (
    <Page maxWidth="full" gap="lg">
      <PageHeader
        eyebrow="HRMS · Administration"
        title="Documents"
        subtitle="Manage, verify and monitor employee documents."
      />

      <Tabs
        activeId={view}
        onChange={(id) => withPageReset(setView)(id as DocumentView)}
        items={DOCUMENT_TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: list.counts ? list.counts[tab.id] : undefined,
        }))}
      />

      <Toolbar
        left={
          <SearchInput
            placeholder="Search employee or document..."
            value={search}
            onChange={(e) => withPageReset(setSearch)(e.target.value)}
            onClear={() => withPageReset(setSearch)('')}
            aria-label="Search employee or document"
          />
        }
        right={
          <Inline gap="sm" wrap>
            <Select
              aria-label="Category"
              width="auto"
              value={category}
              onChange={(e) => withPageReset(setCategory)(e.target.value as DocumentCategory | '')}
              options={[
                { value: '', label: 'All categories' },
                ...(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((value) => ({
                  value,
                  label: CATEGORY_LABELS[value],
                })),
              ]}
            />
            <Select
              aria-label="Department"
              width="auto"
              value={departmentId}
              disabled={!masters}
              onChange={(e) => withPageReset(setDepartmentId)(e.target.value)}
              options={[
                { value: '', label: 'All departments' },
                ...(masters?.departments ?? []).map((d) => ({ value: d.id, label: d.name })),
              ]}
            />
            <Select
              aria-label="Status"
              width="auto"
              value={status}
              onChange={(e) => withPageReset(setStatus)(e.target.value as DocumentStatus | '')}
              options={[
                { value: '', label: 'All statuses' },
                ...(Object.keys(STATUS_LABELS) as DocumentStatus[]).map((value) => ({
                  value,
                  label: STATUS_LABELS[value],
                })),
              ]}
            />
          </Inline>
        }
      />

      <Stack gap="md">
        <DocumentsTable
          status={list.status}
          documents={list.documents}
          error={list.error}
          filtered={filtered}
          onRetry={reload}
          onView={setOpenDocumentId}
          onOpenEmployee={(employeeId) => navigate(employeeProfilePath(employeeId))}
        />

        {list.status === 'ready' && pagination && pagination.totalPages > 1 && (
          <Toolbar
            align="center"
            left={
              <Label as="span" size="sm" aria-live="polite">
                {`Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.totalItems,
                )} of ${pagination.totalItems}`}
              </Label>
            }
            right={
              <Inline gap="xs" align="center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </Inline>
            }
          />
        )}
      </Stack>

      <DocumentDetailModal documentId={openDocumentId} onClose={() => setOpenDocumentId(null)} />
    </Page>
  );
}
