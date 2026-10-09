import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Grid,
  Stack,
  Inline,
  Button,
  SearchInput,
  Select,
  Checkbox,
  Alert,
  LoadingState,
  EmptyState,
  ProgressBar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { TenantAdminCompanySummary } from '../types/tenantAdmin.types';

const COLOR_VARIANTS = ['blue', 'amber', 'teal', 'purple', 'rose'] as const;
type ColorVariant = typeof COLOR_VARIANTS[number];

function getCompanyColorVariant(name: string, index: number): ColorVariant {
  let hash = index;
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % COLOR_VARIANTS.length;
  }
  return COLOR_VARIANTS[hash] ?? 'blue';
}

function getCompanyInitials(name?: string | null): string {
  if (!name) return 'CO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CO';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function formatDate(val?: string | Date | null): string {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
}

export interface TenantCompaniesPageProps {
  initialCompanies?: TenantAdminCompanySummary[];
  initialFilterOpen?: boolean;
  initialStatus?: string;
  initialLocation?: string;
  initialApps?: string[];
  initialSearchQuery?: string;
}

export function TenantCompaniesPage({
  initialCompanies,
  initialFilterOpen = false,
  initialStatus = 'all',
  initialLocation = 'all',
  initialApps = [],
  initialSearchQuery = '',
}: TenantCompaniesPageProps = {}) {
  const navigate = useNavigate();
  const {
    companies: contextCompanies,
    capacity: contextCapacity,
    isLoading: isContextLoading,
    error: contextError,
    refresh,
    selectCompany,
  } = useTenantAdmin();

  // Local state for enriched company list
  const [enrichedCompanies, setEnrichedCompanies] = useState<TenantAdminCompanySummary[] | null>(
    initialCompanies || null,
  );
  const [isEnrichLoading, setIsEnrichLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search input state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  // Committed filter state (active constraints driving results & count)
  const [committedStatus, setCommittedStatus] = useState(initialStatus);
  const [committedLocation, setCommittedLocation] = useState(initialLocation);
  const [committedApps, setCommittedApps] = useState<string[]>(initialApps);

  // Draft filter state (buffered while popover is open)
  const [draftStatus, setDraftStatus] = useState(initialStatus);
  const [draftLocation, setDraftLocation] = useState(initialLocation);
  const [draftApps, setDraftApps] = useState<string[]>(initialApps);

  // Popover open state
  const [isFilterOpen, setIsFilterOpen] = useState(initialFilterOpen);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  const handleToggleFilter = () => {
    setIsFilterOpen((prev) => {
      if (!prev) {
        // Opening: populate draft from committed state
        setDraftStatus(committedStatus);
        setDraftLocation(committedLocation);
        setDraftApps(committedApps);
      }
      return !prev;
    });
  };

  // Close filter popover on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isFilterOpen]);

  // Load enriched company data from tenantAdminApi.listCompanies()
  useEffect(() => {
    if (initialCompanies) return;

    let active = true;
    setIsEnrichLoading(true);
    setFetchError(null);

    tenantAdminApi
      .listCompanies()
      .then((res) => {
        if (active && Array.isArray(res.items)) {
          setEnrichedCompanies(res.items);
        }
      })
      .catch((err) => {
        if (active) {
          setFetchError(
            err instanceof Error ? err.message : 'Failed to fetch detailed company entities',
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsEnrichLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialCompanies]);

  const companies = useMemo(
    () => enrichedCompanies || contextCompanies || [],
    [enrichedCompanies, contextCompanies],
  );
  const isLoading = (isContextLoading && companies.length === 0) || (isEnrichLoading && companies.length === 0);
  const error = contextError || fetchError;

  // Capacity calculations
  const capacityUsed =
    contextCapacity?.used ??
    contextCapacity?.currentCompanies ??
    companies.length;
  const capacityMax =
    contextCapacity?.max ??
    contextCapacity?.maxCompanies ??
    5;
  const capacityRemaining =
    contextCapacity?.remaining ??
    contextCapacity?.availableCapacity ??
    Math.max(0, capacityMax - capacityUsed);
  const canCreateCompany =
    contextCapacity?.canCreateCompany ??
    (contextCapacity?.isAtCapacity !== undefined
      ? !contextCapacity.isAtCapacity
      : capacityUsed < capacityMax);
  const capacityPercent = Math.min(100, Math.round((capacityUsed / capacityMax) * 100));

  // Extract real filter options from available data
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) {
      const loc = c.location || c.country;
      if (loc && loc.trim()) set.add(loc.trim());
    }
    return Array.from(set).sort();
  }, [companies]);

  const availableApplications = useMemo(() => {
    const apps: Array<{ key: string; label: string }> = [];
    const hasHRMS = companies.some((c) => c.enabledModules?.includes('hrms'));
    const hasCRM = companies.some((c) => c.enabledModules?.includes('crm'));
    const hasPM = companies.some((c) => c.enabledModules?.includes('project_management'));

    if (hasHRMS) {
      apps.push({ key: 'hrms', label: 'HRMS' });
    }
    if (hasCRM) {
      apps.push({ key: 'crm', label: 'CRM' });
    }
    if (hasPM) {
      apps.push({ key: 'project_management', label: 'Project Management' });
    }
    return apps;
  }, [companies]);

  // Category-based active filter count: Status (+1), Location (+1), Applications (+1)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (committedStatus !== 'all') count += 1;
    if (committedLocation !== 'all') count += 1;
    if (committedApps.length > 0) count += 1;
    return count;
  }, [committedStatus, committedLocation, committedApps]);

  // Active filter items for chips row
  const activeFilters = useMemo(() => {
    const list: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (committedStatus !== 'all') {
      list.push({
        key: 'status',
        label: committedStatus === 'active' ? 'Active' : 'Inactive',
        onRemove: () => {
          setCommittedStatus('all');
          setDraftStatus('all');
        },
      });
    }
    if (committedLocation !== 'all') {
      list.push({
        key: 'location',
        label: committedLocation,
        onRemove: () => {
          setCommittedLocation('all');
          setDraftLocation('all');
        },
      });
    }
    committedApps.forEach((appKey) => {
      const match = availableApplications.find((a) => a.key === appKey);
      list.push({
        key: `app-${appKey}`,
        label: match?.label || appKey.toUpperCase(),
        onRemove: () => {
          setCommittedApps((prev) => prev.filter((k) => k !== appKey));
          setDraftApps((prev) => prev.filter((k) => k !== appKey));
        },
      });
    });
    return list;
  }, [committedStatus, committedLocation, committedApps, availableApplications]);

  // Filtered companies based on search and committed filters
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesCode = c.code?.toLowerCase().includes(q);
        const matchesLegal = c.legalName?.toLowerCase().includes(q);
        const matchesCountry = c.country?.toLowerCase().includes(q);
        const matchesLocation = c.location?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesLegal && !matchesCountry && !matchesLocation) {
          return false;
        }
      }

      // 2. Status Filter
      if (committedStatus !== 'all') {
        if (c.status?.toLowerCase() !== committedStatus.toLowerCase()) {
          return false;
        }
      }

      // 3. Location Filter
      if (committedLocation !== 'all') {
        const loc = (c.location || c.country || '').toLowerCase();
        if (!loc.includes(committedLocation.toLowerCase())) {
          return false;
        }
      }

      // 4. Applications Multi-Filter
      if (committedApps.length > 0) {
        if (!committedApps.some((app) => c.enabledModules?.includes(app))) {
          return false;
        }
      }

      return true;
    });
  }, [companies, searchQuery, committedStatus, committedLocation, committedApps]);

  // Popover actions
  const handleClearDraftFilters = () => {
    setDraftStatus('all');
    setDraftLocation('all');
    setDraftApps([]);
  };

  const handleApplyFilters = () => {
    setCommittedStatus(draftStatus);
    setCommittedLocation(draftLocation);
    setCommittedApps(draftApps);
    setIsFilterOpen(false);
  };

  // Reset all filters from active chips or zero-state (preserves searchQuery)
  const handleClearAllFilters = () => {
    setCommittedStatus('all');
    setCommittedLocation('all');
    setCommittedApps([]);
    setDraftStatus('all');
    setDraftLocation('all');
    setDraftApps([]);
  };

  const handleCompanyClick = (companyId: string) => {
    selectCompany(companyId);
    navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(companyId)}/overview`);
  };

  if (isLoading) {
    return <LoadingState label="Loading tenant companies and capacity..." fill />;
  }

  return (
    <Page>
      {/* 1. HEADER */}
      <PageHeader
        breadcrumbs={
          <Inline gap="xs" align="center">
            <BezentIcon name="organization" size={14} />
            <span>Tenant</span>
            <span>&gt;</span>
            <strong>Companies</strong>
          </Inline>
        }
        title={
          <>
            <span>Companies</span>
            <span className="bezent-sr-only">{`Companies (${companies.length})`}</span>
          </>
        }
        subtitle="Manage legal entities and their organization structure."
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/tenant-admin/tenant/companies/new')}
            disabled={!canCreateCompany}
            title={!canCreateCompany ? 'Company capacity reached' : undefined}
            aria-label="Add Company"
          >
            <Inline gap="xs" align="center">
              <BezentIcon name="plusSign" size={16} />
              <span>Add Company</span>
            </Inline>
          </Button>
        }
      />

      <Stack gap="lg">
        {error && (
          <Stack gap="sm">
            <Alert variant="error">{error}</Alert>
            <Inline>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFetchError(null);
                  void refresh();
                }}
              >
                Retry
              </Button>
            </Inline>
          </Stack>
        )}

        {/* 2. COMPACT COMPANY CAPACITY STRIP */}
        <section aria-label="Company Capacity">
          <div className="bezent-company-capacity-card" role="region">
            <div className="bezent-company-capacity-card__left">
              <div className="bezent-company-capacity-card__icon" aria-hidden="true">
                <BezentIcon name="organization" size={20} />
              </div>
              <div className="bezent-company-capacity-card__meta">
                <span className="bezent-company-capacity-card__label">Company Capacity</span>
                <span className="bezent-company-capacity-card__value">
                  <strong>{capacityUsed} of {capacityMax}</strong>{' '}
                  <span className="bezent-company-capacity-card__unit">companies</span>
                </span>
              </div>
            </div>

            <div className="bezent-company-capacity-card__right">
              <div className="bezent-company-capacity-card__progress-wrap">
                <ProgressBar
                  value={capacityPercent}
                  max={100}
                  size="sm"
                  variant="primary"
                  aria-label="Company capacity usage"
                />
              </div>
              <span className="bezent-company-capacity-card__remaining">
                {canCreateCompany
                  ? `${capacityRemaining} ${capacityRemaining === 1 ? 'company' : 'companies'} remaining`
                  : 'Company capacity reached'}
              </span>
            </div>
          </div>
        </section>

        {/* 3. SEARCH & FILTER TOOLBAR */}
        <div className="bezent-companies-toolbar">
          <div className="bezent-companies-toolbar__search">
            <SearchInput
              size="md"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              aria-label="Search companies"
            />
          </div>

          <div className="bezent-companies-toolbar__filter-wrap" ref={filterPopoverRef}>
            <button
              type="button"
              className={`bezent-filter-btn ${activeFilterCount > 0 ? 'bezent-filter-btn--active' : ''}`}
              onClick={handleToggleFilter}
              aria-expanded={isFilterOpen}
              aria-haspopup="dialog"
              aria-label={activeFilterCount > 0 ? `Filter ${activeFilterCount}` : 'Filter'}
            >
              <BezentIcon name="filter" size={16} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="bezent-filter-badge">{activeFilterCount}</span>
              )}
              <BezentIcon name="chevronDown" size={14} />
            </button>

            {isFilterOpen && (
              <div className="bezent-filter-popover" role="dialog" aria-label="Filters">
                <div className="bezent-filter-popover__header">
                  <span className="bezent-filter-popover__title">Filters</span>
                </div>

                {/* STATUS Group - Mutually exclusive single-select radios */}
                <div className="bezent-filter-group">
                  <span className="bezent-filter-group__label" id="filter-status-label">STATUS</span>
                  <div className="bezent-filter-radio-group" role="radiogroup" aria-labelledby="filter-status-label">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ].map((opt) => (
                      <label key={opt.value} className="bezent-filter-radio-item">
                        <input
                          type="radio"
                          name="company-filter-status"
                          value={opt.value}
                          checked={draftStatus === opt.value}
                          onChange={() => setDraftStatus(opt.value)}
                          className="bezent-filter-radio-input"
                        />
                        <span className="bezent-filter-radio-text">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* LOCATION Group - Accessible Select Dropdown */}
                <div className="bezent-filter-group">
                  <span className="bezent-filter-group__label" id="filter-location-label">LOCATION</span>
                  <Select
                    size="sm"
                    width="full"
                    value={draftLocation}
                    onChange={(e) => setDraftLocation(e.target.value)}
                    options={[
                      { value: 'all', label: 'All locations' },
                      ...availableLocations.map((loc) => ({ value: loc, label: loc })),
                    ]}
                    aria-labelledby="filter-location-label"
                  />
                </div>

                {/* APPLICATIONS Group - Multi-Select Checkboxes */}
                {availableApplications.length > 0 && (
                  <div className="bezent-filter-group">
                    <span className="bezent-filter-group__label" id="filter-apps-label">APPLICATIONS</span>
                    <div className="bezent-filter-checkbox-group" role="group" aria-labelledby="filter-apps-label">
                      {availableApplications.map((app) => (
                        <Checkbox
                          key={app.key}
                          id={`filter-app-${app.key}`}
                          size="sm"
                          label={app.label}
                          checked={draftApps.includes(app.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDraftApps((prev) => [...prev, app.key]);
                            } else {
                              setDraftApps((prev) => prev.filter((k) => k !== app.key));
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Popover Footer */}
                <div className="bezent-filter-popover__footer">
                  <button
                    type="button"
                    className="bezent-filter-popover__clear"
                    onClick={handleClearDraftFilters}
                  >
                    Clear all
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApplyFilters}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. ACTIVE FILTER CHIPS ROW */}
        {activeFilters.length > 0 && (
          <div className="bezent-active-filters-row" aria-label="Active filters">
            <span className="bezent-active-filters-label">Active filters:</span>
            {activeFilters.map((f) => (
              <span key={f.key} className="bezent-active-filter-pill">
                <span>{f.label}</span>
                <button
                  type="button"
                  className="bezent-active-filter-pill__close"
                  onClick={f.onRemove}
                  aria-label={`Remove ${f.label} filter`}
                >
                  &times;
                </button>
              </span>
            ))}
            <button
              type="button"
              className="bezent-active-filters-clear"
              onClick={handleClearAllFilters}
            >
              Clear all
            </button>
          </div>
        )}

        {/* 5. RESULT COUNT */}
        {companies.length > 0 && (
          <div className="bezent-companies-result-count">
            {filteredCompanies.length}{' '}
            {filteredCompanies.length === 1 ? 'Company' : 'Companies'}
          </div>
        )}

        {/* 6. COMPANIES GRID */}
        {companies.length === 0 ? (
          <EmptyState
            title="No companies yet"
            description="Create your first legal entity to begin configuring your organization."
            primaryAction={
              canCreateCompany
                ? {
                    label: '+ Add First Company',
                    onClick: () => navigate('/tenant-admin/tenant/companies/new'),
                  }
                : undefined
            }
          />
        ) : filteredCompanies.length === 0 ? (
          <EmptyState
            title="No companies found"
            description="No companies match your current search or filters."
            primaryAction={{
              label: 'Clear Filters',
              onClick: handleClearAllFilters,
            }}
          />
        ) : (
          <Grid columns={2} gap="lg">
            {filteredCompanies.map((company, index) => {
              const initials = getCompanyInitials(company.name);
              const colorVariant = getCompanyColorVariant(company.name, index);
              const isActive = company.status?.toLowerCase() === 'active';
              const locationStr = company.location || company.country;
              const formattedDate = formatDate(company.createdAt);
              const hasAppBadges =
                Array.isArray(company.enabledModules) && company.enabledModules.length > 0;

              return (
                <div
                  key={company.id}
                  className="bezent-company-card"
                  onClick={() => handleCompanyClick(company.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCompanyClick(company.id);
                    }
                  }}
                  aria-label={`View ${company.name}`}
                >
                  {/* Top section: Logo/Avatar + Name + Status + Code */}
                  <div className="bezent-company-card__header">
                    <div
                      className={`bezent-company-card__logo bezent-company-card__logo--${colorVariant}`}
                      aria-label={`${company.name} logo`}
                    >
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={`${company.name} logo`}
                          className="bezent-company-card__logo-img"
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    <div className="bezent-company-card__info">
                      <h3 className="bezent-company-card__title" title={company.name}>
                        {company.name}
                      </h3>

                      <div className="bezent-company-card__status-row">
                        <span
                          className={`bezent-company-card__status-pill ${
                            isActive
                              ? 'bezent-company-card__status-pill--active'
                              : 'bezent-company-card__status-pill--inactive'
                          }`}
                        >
                          <span className="bezent-company-card__status-dot" aria-hidden="true" />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                        {company.code && (
                          <span className="bezent-company-card__code">{company.code}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bezent-company-card__divider" />

                  {/* Applications Section */}
                  <div className="bezent-company-card__apps-section">
                    <span className="bezent-company-card__section-label">Applications</span>
                    <div className="bezent-company-card__apps-list">
                      {hasAppBadges ? (
                        <>
                          {company.enabledModules?.includes('hrms') && (
                            <span className="bezent-company-card__app-badge">HRMS</span>
                          )}
                          {company.enabledModules?.includes('crm') && (
                            <span className="bezent-company-card__app-badge">CRM</span>
                          )}
                          {company.enabledModules?.includes('project_management') && (
                            <span className="bezent-company-card__app-badge">PM</span>
                          )}
                        </>
                      ) : (
                        <span className="bezent-company-card__no-apps">No applications enabled</span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="bezent-company-card__meta-row">
                    <span className="bezent-company-card__meta-item">
                      <BezentIcon name="user" size={14} />
                      <span>
                        {company.adminsCount ?? 0}{' '}
                        {(company.adminsCount ?? 0) === 1 ? 'Admin' : 'Admins'}
                      </span>
                    </span>

                    {locationStr && (
                      <>
                        <span className="bezent-company-card__meta-divider" aria-hidden="true">|</span>
                        <span className="bezent-company-card__meta-item">
                          <BezentIcon name="pin" size={14} />
                          <span>{locationStr}</span>
                        </span>
                      </>
                    )}

                    {formattedDate && (
                      <>
                        <span className="bezent-company-card__meta-divider" aria-hidden="true">|</span>
                        <span className="bezent-company-card__meta-item">
                          <BezentIcon name="calendar" size={14} />
                          <span>Created {formattedDate}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Footer Action */}
                  <div className="bezent-company-card__footer">
                    <span className="bezent-company-card__view-link">
                      <span>View company</span>
                      <BezentIcon name="arrowRight" size={14} />
                    </span>
                  </div>
                </div>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Page>
  );
}
