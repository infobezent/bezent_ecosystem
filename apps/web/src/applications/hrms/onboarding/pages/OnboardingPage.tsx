import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Avatar,
  EmptyState,
  Page,
  PageHeader,
  Toolbar,
  LoadingState,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Inline,
  SearchInput,
  Select,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useDevContext } from '../../../../platform/context/DevContext';
import {
  fetchOrganizationMasters,
  fetchNewHiresPaginated,
  type OrganizationMasters,
  type OnboardingCaseItem,
  type StageCounts,
} from '../api/onboardingApi';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import { DraftsModal, EmployeeRegistrationDraft } from '../components/DraftsModal';

interface OnboardingPageProps {
  title?: string;
  onAddNewHire?: () => void;
}

export function OnboardingPage({ title = 'Onboarding', onAddNewHire }: OnboardingPageProps) {
  const devContext = useDevContext();
  const [, setMasters] = useState<OrganizationMasters | null>(null);
  const [cases, setCases] = useState<OnboardingCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'registration'>('list');
  const [activeTab, setActiveTab] = useState<'all' | 'preboarding' | 'documents' | 'completed'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleTabChange = (newTab: 'all' | 'preboarding' | 'documents' | 'completed') => {
    setActiveTab(newTab);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  // Drafts State
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<EmployeeRegistrationDraft | null>(null);
  const [draftsList, setDraftsList] = useState<EmployeeRegistrationDraft[]>(() => {
    try {
      const saved = localStorage.getItem('bezent_hrms_registration_drafts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const refreshDrafts = useCallback(() => {
    try {
      const saved = localStorage.getItem('bezent_hrms_registration_drafts');
      setDraftsList(saved ? JSON.parse(saved) : []);
    } catch {
      setDraftsList([]);
    }
  }, []);

  useEffect(() => {
    if (viewMode === 'list') {
      refreshDrafts();
    }
  }, [viewMode, refreshDrafts]);

  const handleContinueDraft = (draft: EmployeeRegistrationDraft) => {
    setSelectedDraft(draft);
    setIsDraftsModalOpen(false);
    setViewMode('registration');
  };

  const handleDeleteDraft = (draftId: string) => {
    setDraftsList((prev) => {
      const updated = prev.filter((d) => d.id !== draftId);
      try {
        localStorage.setItem('bezent_hrms_registration_drafts', JSON.stringify(updated));
      } catch {
        // fallback
      }
      return updated;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mastersData, res] = await Promise.all([
        fetchOrganizationMasters(),
        fetchNewHiresPaginated({
          page,
          pageSize,
          stage: activeTab,
          search: searchQuery,
        }),
      ]);
      setMasters(mastersData);
      setCases(res.data);
      setTotalItems(res.pagination.totalItems);
      setTotalPages(res.pagination.totalPages);
      setCounts(res.counts);

      // Out-of-range safety: if page > totalPages when totalPages > 0, reset to totalPages
      if (res.pagination.totalPages > 0 && page > res.pagination.totalPages) {
        setPage(res.pagination.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, activeTab, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

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
    if (totalItems === 0) return 'Showing 0 of 0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    return `Showing ${start}–${end} of ${totalItems}`;
  }, [page, pageSize, totalItems]);

  if (viewMode === 'registration') {
    return (
      <EmployeeRegistration
        initialDraft={selectedDraft}
        onCancel={() => {
          setSelectedDraft(null);
          setViewMode('list');
        }}
      />
    );
  }

  return (
    <Page className="onboarding-page" maxWidth="full" gap="lg">
      {/* Header Banner */}
      <PageHeader
        className="onboarding-page__header"
        title={title}
        badge={
          <span className="onboarding-page__company-badge bezent-company-badge">
            <BezentIcon name="company" size={14} />
            {devContext.companyName}
          </span>
        }
        subtitle={
          title === 'Employee Administration'
            ? 'Manage employee administration, new hires, and employment records.'
            : 'Manage candidates and new hires progressing through the onboarding pipeline.'
        }
        actions={
          <Inline gap="md" align="center" className="onboarding-page__actions">
            <button
              type="button"
              className="onboarding-page__drafts-btn bezent-btn-draft"
              onClick={() => {
                refreshDrafts();
                setIsDraftsModalOpen(true);
              }}
            >
              <BezentIcon name="documents" size={16} />
              <span>View Drafts ({draftsList.length})</span>
            </button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedDraft(null);
                if (onAddNewHire) {
                  onAddNewHire();
                } else {
                  setViewMode('registration');
                }
              }}
            >
              <span className="onboarding-page__btn-content">
                <BezentIcon name="plusSign" size={16} />
                Add New Hire
              </span>
            </Button>
          </Inline>
        }
      />

      {/* Toolbar & Filters */}
      <Toolbar
        className="onboarding-page__toolbar"
        left={
          <div className="onboarding-page__tabs bezent-filter-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              className={`onboarding-page__tab bezent-filter-tab ${
                activeTab === 'all' ? 'onboarding-page__tab--active is-active' : ''
              }`}
              onClick={() => handleTabChange('all')}
            >
              All{' '}
              <span className="onboarding-page__tab-count bezent-filter-tab-count">
                {counts.all}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preboarding'}
              className={`onboarding-page__tab bezent-filter-tab ${
                activeTab === 'preboarding' ? 'onboarding-page__tab--active is-active' : ''
              }`}
              onClick={() => handleTabChange('preboarding')}
            >
              Preboarding{' '}
              <span className="onboarding-page__tab-count bezent-filter-tab-count">
                {counts.preboarding}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'documents'}
              className={`onboarding-page__tab bezent-filter-tab ${
                activeTab === 'documents' ? 'onboarding-page__tab--active is-active' : ''
              }`}
              onClick={() => handleTabChange('documents')}
            >
              Documents{' '}
              <span className="onboarding-page__tab-count bezent-filter-tab-count">
                {counts.documents}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'completed'}
              className={`onboarding-page__tab bezent-filter-tab ${
                activeTab === 'completed' ? 'onboarding-page__tab--active is-active' : ''
              }`}
              onClick={() => handleTabChange('completed')}
            >
              Completed{' '}
              <span className="onboarding-page__tab-count bezent-filter-tab-count">
                {counts.completed}
              </span>
            </button>
          </div>
        }
        right={
          <SearchInput
            placeholder={
              title === 'Employee Administration'
                ? 'Search employees...'
                : 'Search by name, email, department...'
            }
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onClear={() => handleSearchChange('')}
          />
        }
      />

      {/* Error state */}
      {error && (
        <div className="new-hire-modal__error-alert" role="alert">
          {error}
        </div>
      )}

      {/* Main Table & Pagination */}
      {loading ? (
        <LoadingState label="Loading onboarding records…" fill />
      ) : cases.length === 0 ? (
        <>
          <EmptyState
            variant="onboarding"
            title={searchQuery ? 'No matching new hires' : 'No New Hires Found'}
            description={
              searchQuery
                ? `No candidates match "${searchQuery}". Try clearing your search.`
                : 'Get started by creating your first onboarding case for a new hire.'
            }
            primaryAction={
              !searchQuery
                ? {
                    label: 'Add New Hire',
                    onClick: () => {
                      setSelectedDraft(null);
                      if (onAddNewHire) {
                        onAddNewHire();
                      } else {
                        setViewMode('registration');
                      }
                    },
                  }
                : undefined
            }
          />
          <Toolbar
            className="onboarding-page__pagination"
            left={<span className="onboarding-page__pagination-info">{resultRangeText}</span>}
            right={
              <Inline gap="lg" align="center">
                <Inline gap="xs" align="center">
                  <span>Rows per page:</span>
                  <Select
                    size="sm"
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
                <Inline gap="xs" align="center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    ‹
                  </Button>
                  <Button variant="primary" size="sm" disabled aria-current="page">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled aria-label="Next page">
                    ›
                  </Button>
                </Inline>
              </Inline>
            }
          />
        </>
      ) : (
        <>
          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Department</TableHeaderCell>
                <TableHeaderCell>Designation</TableHeaderCell>
                <TableHeaderCell>Location</TableHeaderCell>
                <TableHeaderCell>Stage</TableHeaderCell>
                <TableHeaderCell>Joining Date</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="onboarding-page__person-cell bezent-table-cell--avatar-meta">
                      <Avatar initials={getInitials(item.fullName)} alt={item.fullName} />
                      <div className="onboarding-page__person-info bezent-table-meta-group">
                        <span className="onboarding-page__person-name bezent-table-meta-title">
                          {item.fullName}
                        </span>
                        <span className="onboarding-page__person-email bezent-table-meta-subtitle">
                          {item.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.departmentName}</TableCell>
                  <TableCell>{item.designationName}</TableCell>
                  <TableCell>{item.locationName || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`onboarding-page__stage-tag bezent-stage-tag bezent-stage-tag--${item.stage}`}
                    >
                      {item.stage}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(item.joiningDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          <Toolbar
            className="onboarding-page__pagination"
            left={<span className="onboarding-page__pagination-info">{resultRangeText}</span>}
            right={
              <Inline gap="lg" align="center">
                <Inline gap="xs" align="center">
                  <span>Rows per page:</span>
                  <Select
                    size="sm"
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
                <Inline gap="xs" align="center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    ‹
                  </Button>
                  {pageNumbers.map((p, idx) =>
                    typeof p === 'number' ? (
                      <Button
                        key={p}
                        variant={p === page ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                      >
                        {p}
                      </Button>
                    ) : (
                      <span key={`ellipsis-${idx}`} aria-hidden="true">
                        …
                      </span>
                    ),
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || totalPages === 0}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="Next page"
                  >
                    ›
                  </Button>
                </Inline>
              </Inline>
            }
          />
        </>
      )}

      {/* Saved Drafts Modal */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        drafts={draftsList}
        onClose={() => setIsDraftsModalOpen(false)}
        onContinueDraft={handleContinueDraft}
        onDeleteDraft={handleDeleteDraft}
      />
    </Page>
  );
}
export default OnboardingPage;
