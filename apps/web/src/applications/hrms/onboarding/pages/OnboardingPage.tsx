import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { Avatar } from '../../../../design-system/components/Avatar';
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
    // Reload data to reflect persisted record from MySQL
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
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <span className="onboarding-page__btn-content">
              <BezentIcon name="plusSign" size={16} />
              Add New Hire
            </span>
          </Button>
        </div>
      </header>

      {/* Toolbar & Filters */}
      <div className="onboarding-page__toolbar">
        <div className="onboarding-page__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`onboarding-page__tab ${
              activeTab === 'all' ? 'onboarding-page__tab--active' : ''
            }`}
            onClick={() => setActiveTab('all')}
          >
            All <span className="onboarding-page__tab-count">{counts.all}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preboarding'}
            className={`onboarding-page__tab ${
              activeTab === 'preboarding' ? 'onboarding-page__tab--active' : ''
            }`}
            onClick={() => setActiveTab('preboarding')}
          >
            Preboarding <span className="onboarding-page__tab-count">{counts.preboarding}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'documents'}
            className={`onboarding-page__tab ${
              activeTab === 'documents' ? 'onboarding-page__tab--active' : ''
            }`}
            onClick={() => setActiveTab('documents')}
          >
            Documents <span className="onboarding-page__tab-count">{counts.documents}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`onboarding-page__tab ${
              activeTab === 'completed' ? 'onboarding-page__tab--active' : ''
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Completed <span className="onboarding-page__tab-count">{counts.completed}</span>
          </button>
        </div>

        <div className="onboarding-page__search-box">
          <BezentIcon name="search" size={16} />
          <input
            type="text"
            className="onboarding-page__search-input"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="new-hire-modal__error-alert" role="alert">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="onboarding-page__table-container">
        {loading ? (
          <div className="onboarding-page__loading">Loading onboarding records...</div>
        ) : filteredCases.length === 0 ? (
          <div className="onboarding-page__empty">
            <BezentIcon name="onboarding" size={40} />
            <h3 className="onboarding-page__empty-title">No New Hires Found</h3>
            <p className="onboarding-page__empty-desc">
              {searchQuery
                ? `No candidates match "${searchQuery}". Try clearing your search.`
                : 'Get started by creating your first onboarding case for a new hire.'}
            </p>
            {!searchQuery && (
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Add New Hire
              </Button>
            )}
          </div>
        ) : (
          <table className="onboarding-page__table">
            <thead>
              <tr>
                <th className="onboarding-page__th">Name</th>
                <th className="onboarding-page__th">Department</th>
                <th className="onboarding-page__th">Designation</th>
                <th className="onboarding-page__th">Location</th>
                <th className="onboarding-page__th">Stage</th>
                <th className="onboarding-page__th">Joining Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((item) => (
                <tr key={item.id} className="onboarding-page__tr">
                  <td className="onboarding-page__td">
                    <div className="onboarding-page__person-cell">
                      <Avatar initials={getInitials(item.fullName)} alt={item.fullName} />
                      <div className="onboarding-page__person-info">
                        <span className="onboarding-page__person-name">{item.fullName}</span>
                        <span className="onboarding-page__person-email">{item.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="onboarding-page__td">{item.departmentName}</td>
                  <td className="onboarding-page__td">{item.designationName}</td>
                  <td className="onboarding-page__td">{item.locationName || '—'}</td>
                  <td className="onboarding-page__td">
                    <span
                      className={`onboarding-page__stage-tag onboarding-page__stage-tag--${item.stage}`}
                    >
                      {item.stage}
                    </span>
                  </td>
                  <td className="onboarding-page__td">{formatDate(item.joiningDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
