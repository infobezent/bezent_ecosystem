import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Avatar,
  Tabs,
  SearchInput,
  StatusPill,
  EmptyState,
  Alert,
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
  createNewHire,
  type OrganizationMasters,
  type OnboardingCaseItem,
  type CreateNewHirePayload,
} from '../api/onboardingApi';
import { NewHireModal } from '../components/NewHireModal';
import './OnboardingPage.css';

export function OnboardingPage() {
  const devContext = useDevContext();
  const [masters, setMasters] = useState<OrganizationMasters | null>(null);
  const [cases, setCases] = useState<OnboardingCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'preboarding' | 'documents' | 'completed'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleCreateNewHire = async (payload: CreateNewHirePayload) => {
    await createNewHire(payload);
    await loadData();
  };

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

  return (
    <div className="onboarding-page">
      {/* Header Banner */}
      <header className="onboarding-page__header">
        <div className="onboarding-page__title-group">
          <div className="onboarding-page__title-row">
            <h1 className="onboarding-page__title">Onboarding</h1>
            <span className="onboarding-page__company-badge">
              <BezentIcon name="company" size={14} />
              {devContext.companyName}
            </span>
          </div>
          <p className="onboarding-page__subtitle">
            Manage candidates and new hires progressing through the onboarding pipeline.
          </p>
        </div>

        <div className="onboarding-page__actions">
          <Button
            variant="primary"
            leftIcon={<BezentIcon name="plusSign" size={16} />}
            onClick={() => setIsModalOpen(true)}
          >
            Add New Hire
          </Button>
        </div>
      </header>

      {/* Toolbar & Filters */}
      <div className="onboarding-page__toolbar">
        <Tabs
          items={[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'preboarding', label: 'Preboarding', count: counts.preboarding },
            { id: 'documents', label: 'Documents', count: counts.documents },
            { id: 'completed', label: 'Completed', count: counts.completed },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        <div className="onboarding-page__search-wrap">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search by name, email, department..."
          />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Table */}
      <div className="onboarding-page__table-section">
        {loading ? (
          <div className="onboarding-page__loading">Loading onboarding records...</div>
        ) : filteredCases.length === 0 ? (
          <EmptyState
            title="No New Hires Found"
            description={
              searchQuery
                ? `No candidates match "${searchQuery}". Try clearing your search.`
                : 'Get started by creating your first onboarding case for a new hire.'
            }
            primaryAction={
              !searchQuery
                ? {
                    label: 'Add New Hire',
                    onClick: () => setIsModalOpen(true),
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
                    <div className="onboarding-page__person-cell">
                      <Avatar initials={getInitials(item.fullName)} alt={item.fullName} />
                      <div className="onboarding-page__person-info">
                        <span className="onboarding-page__person-name">{item.fullName}</span>
                        <span className="onboarding-page__person-email">{item.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.departmentName}</TableCell>
                  <TableCell>{item.designationName}</TableCell>
                  <TableCell>{item.locationName || '—'}</TableCell>
                  <TableCell>
                    <StatusPill status={item.stage} />
                  </TableCell>
                  <TableCell>{formatDate(item.joiningDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add New Hire Modal */}
      <NewHireModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        masters={masters}
        onSubmit={handleCreateNewHire}
      />
    </div>
  );
}

export default OnboardingPage;
