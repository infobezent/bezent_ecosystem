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
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useDevContext } from '../../../../platform/context/DevContext';
import {
  fetchOrganizationMasters,
  fetchNewHires,
  type OrganizationMasters,
  type OnboardingCaseItem,
} from '../api/onboardingApi';
import { EmployeeRegistration } from '../components/EmployeeRegistration';
import { DraftsModal, EmployeeRegistrationDraft } from '../components/DraftsModal';

interface OnboardingPageProps {
  title?: string;
}

export function OnboardingPage({ title = 'Onboarding' }: OnboardingPageProps) {
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
      const [mastersData, casesData] = await Promise.all([
        fetchOrganizationMasters(),
        fetchNewHires(),
      ]);
      setMasters(mastersData);
      setCases(casesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const matchesTab = activeTab === 'all' || c.stage === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.departmentName.toLowerCase().includes(q) ||
        c.designationName.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [cases, activeTab, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: cases.length,
      preboarding: cases.filter((c) => c.stage === 'preboarding').length,
      documents: cases.filter((c) => c.stage === 'documents').length,
      completed: cases.filter((c) => c.stage === 'completed').length,
    };
  }, [cases]);

  if (viewMode === 'registration') {
    return (
      <Page className="onboarding-page" maxWidth="full">
        <EmployeeRegistration
          initialDraft={selectedDraft}
          onCancel={() => {
            setSelectedDraft(null);
            setViewMode('list');
          }}
        />
      </Page>
    );
  }

  return (
    <Page className="onboarding-page" maxWidth="default" gap="lg">
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
        subtitle="Manage candidates and new hires progressing through the onboarding pipeline."
        actions={
          <div className="onboarding-page__actions">
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
                setViewMode('registration');
              }}
            >
              <span className="onboarding-page__btn-content">
                <BezentIcon name="plusSign" size={16} />
                Add New Hire
              </span>
            </Button>
          </div>
        }
      />

      {/* Toolbar & Filters */}
      <Toolbar className="onboarding-page__toolbar">
        <div className="onboarding-page__tabs bezent-filter-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`onboarding-page__tab bezent-filter-tab ${
              activeTab === 'all' ? 'onboarding-page__tab--active is-active' : ''
            }`}
            onClick={() => setActiveTab('all')}
          >
            All{' '}
            <span className="onboarding-page__tab-count bezent-filter-tab-count">{counts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preboarding'}
            className={`onboarding-page__tab bezent-filter-tab ${
              activeTab === 'preboarding' ? 'onboarding-page__tab--active is-active' : ''
            }`}
            onClick={() => setActiveTab('preboarding')}
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
            onClick={() => setActiveTab('documents')}
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
            onClick={() => setActiveTab('completed')}
          >
            Completed{' '}
            <span className="onboarding-page__tab-count bezent-filter-tab-count">
              {counts.completed}
            </span>
          </button>
        </div>

        <div className="onboarding-page__search-box bezent-search-bar">
          <BezentIcon name="search" size={16} />
          <input
            type="text"
            className="onboarding-page__search-input bezent-search-bar__input"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Toolbar>

      {/* Error state */}
      {error && (
        <div className="new-hire-modal__error-alert" role="alert">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="onboarding-page__table-container">
        {loading ? (
          <LoadingState label="Loading onboarding records…" fill />
        ) : filteredCases.length === 0 ? (
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
                    onClick: () => setViewMode('registration'),
                  }
                : undefined
            }
          />
        ) : (
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
              {filteredCases.map((item) => (
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
        )}
      </div>

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
