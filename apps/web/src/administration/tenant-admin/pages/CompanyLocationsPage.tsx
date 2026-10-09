import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Inline,
  Input,
  LoadingState,
  Page,
  PageHeader,
  Select,
  Stack,
  Tabs,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';
import { AddLocationModal } from '../components/AddLocationModal';
import { EditLocationModal } from '../components/EditLocationModal';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  LocationType,
  TenantAdminCompanySummary,
  WorkLocationRecord,
} from '../types/tenantAdmin.types';

export interface CompanyLocationsPageProps {
  initialLocations?: WorkLocationRecord[];
}

export function CompanyLocationsPage({
  initialLocations,
}: CompanyLocationsPageProps = {}) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading: isContextLoading, selectCompany } = useTenantAdmin();

  // Context resolution and tenant boundary
  const companyFromContext = useMemo(
    () => companies.find((c) => c.id === companyId) || null,
    [companies, companyId],
  );

  const [companyDetail, setCompanyDetail] = useState<TenantAdminCompanySummary | null>(null);
  const [locations, setLocations] = useState<WorkLocationRecord[]>(initialLocations ?? []);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(!initialLocations);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLocationToEdit, setSelectedLocationToEdit] = useState<WorkLocationRecord | null>(null);

  // Sync selected company in context
  useEffect(() => {
    if (companyId) {
      selectCompany(companyId);
    }
  }, [companyId, selectCompany]);

  // Load company profile and work locations
  const loadLocationsData = useCallback(async () => {
    if (!companyId) return;
    setIsLoadingData(true);
    setError(null);
    setAccessDenied(false);

    try {
      const [profileRes, locationsRes] = await Promise.all([
        tenantAdminApi.getCompanyProfile(companyId).catch(() => null),
        tenantAdminApi.getCompanyWorkLocations(companyId),
      ]);

      if (profileRes) {
        setCompanyDetail(profileRes);
      }
      setLocations(Array.isArray(locationsRes) ? locationsRes : []);
    } catch (err: unknown) {
      const errorStatus = (err as { status?: number; response?: { status?: number } })?.status ||
        (err as { response?: { status?: number } })?.response?.status;
      if (errorStatus === 403 || errorStatus === 404) {
        setAccessDenied(true);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to load company work locations';
        setError(msg);
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!initialLocations && companyId) {
      loadLocationsData();
    }
  }, [companyId, initialLocations, loadLocationsData]);

  const effectiveCompany: TenantAdminCompanySummary | null = companyDetail || companyFromContext;

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Search query (name, code, city, state)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = loc.name.toLowerCase().includes(q);
        const matchesCode = Boolean(loc.code && loc.code.toLowerCase().includes(q));
        const matchesCity = Boolean(loc.city && loc.city.toLowerCase().includes(q));
        const matchesState = Boolean(loc.state && loc.state.toLowerCase().includes(q));
        if (!matchesName && !matchesCode && !matchesCity && !matchesState) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (loc.type !== typeFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (loc.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [locations, searchQuery, typeFilter, statusFilter]);

  // Counts
  const activeCount = useMemo(
    () => locations.filter((l) => l.status === 'active').length,
    [locations],
  );
  const inactiveCount = useMemo(
    () => locations.filter((l) => l.status === 'inactive').length,
    [locations],
  );

  // Cross-tenant boundary check
  const isForeignCompany = !isContextLoading && companies.length > 0 && !companyFromContext;
  if (accessDenied || isForeignCompany || (!isContextLoading && !isLoadingData && !effectiveCompany)) {
    return (
      <Page>
        <EmptyState
          title="Company Not Found or Access Denied"
          description={`Company '${companyId}' was not found or belongs to another tenant organization. Cross-tenant access is prohibited.`}
          primaryAction={{
            label: 'Back to Companies',
            onClick: () => navigate('/tenant-admin/tenant/companies'),
          }}
        />
      </Page>
    );
  }

  if (isContextLoading || (!effectiveCompany && isLoadingData)) {
    return (
      <Page>
        <LoadingState label="Loading work locations workspace..." fill />
      </Page>
    );
  }

  if (!effectiveCompany) {
    return null;
  }

  const isLocationsEmpty = locations.length === 0;

  const handleLocationCreated = async (newLocation: WorkLocationRecord) => {
    setLocations((prev) => [newLocation, ...prev]);
    setSuccessMessage(`Work location "${newLocation.name}" created successfully.`);
  };

  const handleLocationUpdated = async (updatedLocation: WorkLocationRecord) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === updatedLocation.id ? updatedLocation : loc)),
    );
    setSuccessMessage(`Work location "${updatedLocation.name}" updated successfully.`);
  };

  const formatLocationType = (type: LocationType | string) => {
    switch (type) {
      case 'office':
        return 'Office';
      case 'branch':
        return 'Branch';
      case 'plant_factory':
        return 'Plant';
      case 'client_site':
        return 'Client Site';
      case 'remote':
        return 'Remote (Legacy)';
      case 'other':
      default:
        return 'Other';
    }
  };

  return (
    <Page>
      <Stack gap="lg">
        {/* 1. Canonical Workspace Header (activeSection="organization") */}
        <CompanyWorkspaceHeader
          company={effectiveCompany}
          activeSection="organization"
        />

        {/* 2. Organization Section Sub-Header & Sub-Navigation */}
        <PageHeader
          title="Organization"
          subtitle="Manage the company's organizational structure and work locations."
        />

        <Tabs
          activeId="locations"
          onChange={(id) => {
            if (id === 'structure') {
              navigate(
                `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/organization/structure`,
              );
            }
          }}
          items={[
            { id: 'structure', label: 'Structure' },
            { id: 'locations', label: 'Work Locations' },
          ]}
        />

        {/* Notifications */}
        {error && (
          <Alert variant="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success" onDismiss={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {/* 3. Work Locations Toolbar */}
        <div className="bezent-structure-toolbar">
          <h2 className="bezent-structure-toolbar__title">Work Locations</h2>

          {!isLoadingData && !isLocationsEmpty && (
            <div className="bezent-structure-toolbar__actions">
              <div className="bezent-structure-toolbar__search">
                <Input
                  placeholder="Search locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<BezentIcon name="search" size={16} />}
                  size="sm"
                />
              </div>

              <div className="bezent-structure-toolbar__filter">
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'office', label: 'Office' },
                    { value: 'branch', label: 'Branch' },
                    { value: 'plant_factory', label: 'Plant' },
                    { value: 'client_site', label: 'Client Site' },
                    { value: 'other', label: 'Other' },
                  ]}
                  size="sm"
                />
              </div>

              <div className="bezent-structure-toolbar__filter">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  size="sm"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<BezentIcon name="plus" size={14} />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Location
              </Button>
            </div>
          )}
        </div>

        {/* 4. Body Content */}
        {isLoadingData ? (
          <LoadingState label="Loading work locations..." fill />
        ) : isLocationsEmpty ? (
          <EmptyState
            title="No work locations yet."
            description="Add the company's first office, branch, plant, or work location."
            primaryAction={{
              label: 'Add Location',
              onClick: () => setIsAddModalOpen(true),
            }}
            primaryActionIcon={<BezentIcon name="plus" size={14} />}
          />
        ) : filteredLocations.length === 0 ? (
          <EmptyState
            title="No matching work locations"
            description="No locations match your current search and filter criteria."
            primaryAction={{
              label: 'Clear Filters',
              onClick: () => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              },
            }}
          />
        ) : (
          <Stack gap="md">
            {/* Lightweight Summary Bar */}
            <div className="bezent-locations-summary-bar">
              <span>
                {filteredLocations.length} Work Location{filteredLocations.length === 1 ? '' : 's'}
                {locations.length !== filteredLocations.length &&
                  ` (filtered from ${locations.length})`}
              </span>
              <Inline gap="md">
                {activeCount > 0 && <span>{activeCount} Active</span>}
                {inactiveCount > 0 && <span>{inactiveCount} Inactive</span>}
              </Inline>
            </div>

            {/* Scalable List Presentation */}
            <div className="bezent-location-list">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="bezent-location-row"
                  onClick={() => setSelectedLocationToEdit(loc)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedLocationToEdit(loc);
                    }
                  }}
                  aria-label={`View and edit location ${loc.name}`}
                >
                  <div className="bezent-location-row__main">
                    <div className="bezent-location-row__header">
                      <h3 className="bezent-location-row__name">{loc.name}</h3>
                      <Badge variant="neutral" size="sm">
                        {formatLocationType(loc.type)}
                      </Badge>
                      {loc.code && (
                        <Badge variant="neutral" size="sm">
                          {loc.code}
                        </Badge>
                      )}
                    </div>
                    <div className="bezent-location-row__address">
                      <span>
                        {[loc.city, loc.state, loc.country].filter(Boolean).join(', ')}
                      </span>
                      {loc.timezone && (
                        <>
                          <span className="bezent-location-row__dot">•</span>
                          <span>{loc.timezone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bezent-location-row__actions">
                    <Badge
                      variant={loc.status === 'active' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {loc.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                    <BezentIcon name="chevronRight" size={16} />
                  </div>
                </div>
              ))}
            </div>
          </Stack>
        )}
      </Stack>

      {/* Add Location Modal */}
      {isAddModalOpen && (
        <AddLocationModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          company={effectiveCompany}
          existingLocations={locations}
          onSuccess={handleLocationCreated}
        />
      )}

      {/* Edit Location Modal */}
      {selectedLocationToEdit && (
        <EditLocationModal
          isOpen={Boolean(selectedLocationToEdit)}
          onClose={() => setSelectedLocationToEdit(null)}
          company={effectiveCompany}
          location={selectedLocationToEdit}
          onSuccess={handleLocationUpdated}
        />
      )}
    </Page>
  );
}
