import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Page,
  Stack,
  Badge,
  EmptyState,
  LoadingState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';
import { EditCompanyDrawer } from '../components/EditCompanyDrawer';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type {
  CompanyApplicationItem,
  CompanyOrgCounts,
  TenantAdminCompanySummary,
} from '../types/tenantAdmin.types';

export interface AdministrationCounts {
  companyAdmins: number;
  usersWithAccess: number;
  pendingInvitations: number;
}

export interface CompanyRecentActivityEvent {
  id: string;
  title: string;
  actor: string;
  date: string;
}

interface PlatformAppDef {
  code: string;
  name: string;
  icon: 'employees' | 'pipeline' | 'projects';
  iconStyle: 'hrms' | 'crm' | 'pm';
}

const PLATFORM_APPLICATIONS: PlatformAppDef[] = [
  { code: 'hrms', name: 'HRMS', icon: 'employees', iconStyle: 'hrms' },
  { code: 'crm', name: 'CRM', icon: 'pipeline', iconStyle: 'crm' },
  { code: 'pm', name: 'Project Management', icon: 'projects', iconStyle: 'pm' },
];

export interface CompanyOverviewPageProps {
  initialOrgCounts?: CompanyOrgCounts;
  initialAdminCounts?: AdministrationCounts;
  initialCompanyApps?: string[];
  initialRecentActivity?: CompanyRecentActivityEvent[];
}

const DEFAULT_ACTIVE_ORG_COUNTS: CompanyOrgCounts = {
  businessUnits: 2,
  divisions: 4,
  departments: 5,
  workLocations: 3,
};

const DEFAULT_ACTIVE_ADMIN_COUNTS: AdministrationCounts = {
  companyAdmins: 2,
  usersWithAccess: 42,
  pendingInvitations: 1,
};

/**
 * Canonical Selected-Company Overview Page.
 *
 * Implements the Gmail-inspired enterprise workspace overview for a company:
 * 1. Breadcrumb & Identity Header with 'Edit Company'
 * 2. 5-Section Workspace Navigation (Overview active)
 * 3. Company Snapshot (3 cols x 2 rows)
 * 4. Key Metrics Strip (Work Locations, Departments, Users, Applications)
 * 5. Main Overview Grid:
 *    Left: Organization summary + Access summary
 *    Right: Applications summary + Recent Activity
 */
export function CompanyOverviewPage({
  initialOrgCounts,
  initialAdminCounts,
  initialCompanyApps,
  initialRecentActivity,
}: CompanyOverviewPageProps = {}) {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading: isContextLoading, selectCompany } = useTenantAdmin();

  // Match company from active tenant context
  const companyFromContext = useMemo(
    () => companies.find((c) => c.id === companyId) || null,
    [companies, companyId],
  );

  const isActiveCompany = companyFromContext ? companyFromContext.status === 'active' : true;

  const [companyDetail, setCompanyDetail] = useState<TenantAdminCompanySummary | null>(null);
  const [recentActivityEvents] = useState<CompanyRecentActivityEvent[]>(
    initialRecentActivity || [],
  );
  const [orgCounts, setOrgCounts] = useState<CompanyOrgCounts>(
    initialOrgCounts ||
      (isActiveCompany
        ? DEFAULT_ACTIVE_ORG_COUNTS
        : {
            businessUnits: 0,
            divisions: 0,
            departments: 0,
            workLocations: 0,
          }),
  );
  const [companyApps, setCompanyApps] = useState<string[]>(
    initialCompanyApps ||
      companyFromContext?.enabledModules ||
      (isActiveCompany ? ['hrms', 'crm'] : []),
  );
  const [adminCounts, setAdminCounts] = useState<AdministrationCounts>(
    initialAdminCounts ||
      (isActiveCompany
        ? DEFAULT_ACTIVE_ADMIN_COUNTS
        : {
            companyAdmins: 0,
            usersWithAccess: 0,
            pendingInvitations: 0,
          }),
  );
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditDrawerOpen(true);
    }
  }, [searchParams]);

  const effectiveCompany = companyDetail || companyFromContext;

  useEffect(() => {
    if (!companyId) return;

    let mounted = true;
    setIsDataLoading(true);
    setAccessDenied(false);

    // Keep active company in context in sync
    selectCompany(companyId);

    // 1. Fetch company profile (verifies tenant ownership and fetches detailed fields)
    const profilePromise = tenantAdminApi
      .getCompanyProfile(companyId)
      .then((detail) => {
        if (mounted) setCompanyDetail(detail);
      })
      .catch((err: { status?: number }) => {
        if (err?.status === 403 || err?.status === 404) {
          if (mounted) setAccessDenied(true);
        }
      });

    // 2. Fetch real organization master and structure counts
    const orgPromise = tenantAdminApi
      .getCompanyOrgCounts(companyId)
      .then((counts) => {
        if (mounted) setOrgCounts(counts);
      })
      .catch(() => {
        if (mounted) {
          setOrgCounts({
            businessUnits: 0,
            divisions: 0,
            departments: 0,
            workLocations: 0,
          });
        }
      });

    // 3. Fetch real enabled applications for this company
    const appsPromise = tenantAdminApi
      .getCompanyApplications(companyId)
      .then((apps) => {
        if (!mounted || !Array.isArray(apps)) return;
        const enabledCodes: string[] = [];
        for (const app of apps) {
          if (typeof app === 'string') {
            enabledCodes.push(app);
          } else if (app && typeof app === 'object') {
            const item = app as CompanyApplicationItem;
            const rawStatus = item.companyStatus;
            const code = item.moduleCode || item.name;
            if (rawStatus === 'enabled' || rawStatus === 'active') {
              if (code) enabledCodes.push(String(code));
            }
          }
        }
        setCompanyApps(enabledCodes);
      })
      .catch(() => {
        if (mounted) setCompanyApps([]);
      });

    // 4. Fetch company members and count explicit delegated company admins + members
    const membersPromise = tenantAdminApi
      .listMembers({ companyId })
      .then((members) => {
        if (!mounted) return;
        if (!Array.isArray(members)) {
          setAdminCounts({ companyAdmins: 0, usersWithAccess: 0, pendingInvitations: 0 });
          return;
        }

        let delegatedAdmins = 0;
        members.forEach((m) => {
          const compAccess = m.companiesAccess?.find((ca) => ca.companyId === companyId);
          if (compAccess) {
            const hasAdminRole = compAccess.roles?.some(
              (r) =>
                r.roleCode === 'company_admin' ||
                r.roleId === 'role_sys_company_admin' ||
                r.roleName?.toLowerCase().includes('company admin'),
            );
            if (hasAdminRole) delegatedAdmins++;
          }
        });

        setAdminCounts({
          companyAdmins: delegatedAdmins,
          usersWithAccess: members.length,
          pendingInvitations: 0,
        });
      })
      .catch(() => {
        if (mounted) {
          setAdminCounts({ companyAdmins: 0, usersWithAccess: 0, pendingInvitations: 0 });
        }
      });

    Promise.all([profilePromise, orgPromise, appsPromise, membersPromise]).finally(() => {
      if (mounted) setIsDataLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [companyId, selectCompany]);

  // Check if company is missing from verified tenant companies
  const isForeignCompany = !isContextLoading && companies.length > 0 && !companyFromContext;

  // Handle cross-tenant violation or not-found company
  if (accessDenied || isForeignCompany || (!isContextLoading && !isDataLoading && !effectiveCompany)) {
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

  if (isContextLoading || (!effectiveCompany && isDataLoading)) {
    return (
      <Page>
        <LoadingState label="Loading company workspace..." fill />
      </Page>
    );
  }

  if (!effectiveCompany) {
    return null;
  }

  const registeredOfficeDisplay =
    [
      effectiveCompany.addressLine1,
      effectiveCompany.addressLine2,
      effectiveCompany.city,
      effectiveCompany.state,
      effectiveCompany.country,
    ]
      .filter(Boolean)
      .join(', ') ||
    [effectiveCompany.city, effectiveCompany.state, effectiveCompany.country].filter(Boolean).join(', ') ||
    effectiveCompany.location ||
    effectiveCompany.country ||
    '—';

  const isOrgEmpty =
    orgCounts.businessUnits === 0 &&
    orgCounts.divisions === 0 &&
    orgCounts.departments === 0 &&
    orgCounts.workLocations === 0;

  return (
    <Page>
      <Stack gap="lg">
        {/* 1. Header with Breadcrumbs, Identity, Edit Button, and 4 Canonical Tabs */}
        <CompanyWorkspaceHeader
          company={effectiveCompany}
          activeSection="overview"
          onEditCompany={() => setIsEditDrawerOpen(true)}
        />

        {/* 2. Company Information */}
        <section aria-labelledby="company-information-heading">
          <div className="bezent-snapshot-card">
            <div className="bezent-snapshot-card__header" id="company-information-heading">
              <BezentIcon name="organization" size={18} />
              <span>Company Information</span>
            </div>
            <div className="bezent-snapshot-grid">
              {/* Row 1 */}
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Legal Company Name</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.legalName || effectiveCompany.name || '—'}
                </span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Company Code</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.code || '—'}
                </span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Company Type</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.organizationType || '—'}
                </span>
              </div>

              {/* Row 2 */}
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Registration Number</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.registrationNumber || '—'}
                </span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Registered Office</span>
                <span className="bezent-snapshot-item__value">{registeredOfficeDisplay}</span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Country</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.country || '—'}
                </span>
              </div>

              {/* Row 3 */}
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Time Zone</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.timeZone || '—'}
                </span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Currency</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.currency || '—'}
                </span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Primary Email</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.businessEmail || '—'}
                </span>
              </div>

              {/* Row 4 */}
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Primary Phone</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.contactPhone || '—'}
                </span>
              </div>
              <div className="bezent-snapshot-item">
                <span className="bezent-snapshot-item__label">Website</span>
                <span className="bezent-snapshot-item__value">
                  {effectiveCompany.website || '—'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Key Metrics Strip (Horizontal interactive cards) */}
        <section aria-label="Key Company Metrics">
          <div className="bezent-overview-metrics-strip">
            {/* Work Locations */}
            <button
              type="button"
              className="bezent-overview-metric-card"
              onClick={() =>
                navigate(
                  `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/organization/locations`,
                )
              }
              aria-label={`Work Locations: ${orgCounts.workLocations}`}
            >
              <div className="bezent-overview-metric-card__left">
                <div className="bezent-overview-metric-card__icon-bubble bezent-overview-metric-card__icon-bubble--locations">
                  <BezentIcon name="pin" size={18} />
                </div>
                <div className="bezent-overview-metric-card__content">
                  <span className="bezent-overview-metric-card__value">
                    {orgCounts.workLocations}
                  </span>
                  <div className="bezent-overview-metric-card__label-row">
                    <span>Work Locations</span>
                    <BezentIcon
                      name="chevronRight"
                      size={13}
                      className="bezent-overview-metric-card__chevron"
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Departments */}
            <button
              type="button"
              className="bezent-overview-metric-card"
              onClick={() =>
                navigate(
                  `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/organization/structure`,
                )
              }
              aria-label={`Departments: ${orgCounts.departments}`}
            >
              <div className="bezent-overview-metric-card__left">
                <div className="bezent-overview-metric-card__icon-bubble bezent-overview-metric-card__icon-bubble--departments">
                  <BezentIcon name="organization" size={18} />
                </div>
                <div className="bezent-overview-metric-card__content">
                  <span className="bezent-overview-metric-card__value">
                    {orgCounts.departments}
                  </span>
                  <div className="bezent-overview-metric-card__label-row">
                    <span>Departments</span>
                    <BezentIcon
                      name="chevronRight"
                      size={13}
                      className="bezent-overview-metric-card__chevron"
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Users */}
            <button
              type="button"
              className="bezent-overview-metric-card"
              onClick={() =>
                navigate(
                  `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/access`,
                )
              }
              aria-label={`Users: ${adminCounts.usersWithAccess}`}
            >
              <div className="bezent-overview-metric-card__left">
                <div className="bezent-overview-metric-card__icon-bubble bezent-overview-metric-card__icon-bubble--users">
                  <BezentIcon name="user" size={18} />
                </div>
                <div className="bezent-overview-metric-card__content">
                  <span className="bezent-overview-metric-card__value">
                    {adminCounts.usersWithAccess}
                  </span>
                  <div className="bezent-overview-metric-card__label-row">
                    <span>Users</span>
                    <BezentIcon
                      name="chevronRight"
                      size={13}
                      className="bezent-overview-metric-card__chevron"
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Applications */}
            <button
              type="button"
              className="bezent-overview-metric-card"
              onClick={() =>
                navigate(
                  `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/applications`,
                )
              }
              aria-label={`Applications: ${companyApps.length}`}
            >
              <div className="bezent-overview-metric-card__left">
                <div className="bezent-overview-metric-card__icon-bubble bezent-overview-metric-card__icon-bubble--apps">
                  <BezentIcon name="apps" size={18} />
                </div>
                <div className="bezent-overview-metric-card__content">
                  <span className="bezent-overview-metric-card__value">
                    {companyApps.length}
                  </span>
                  <div className="bezent-overview-metric-card__label-row">
                    <span>Applications</span>
                    <BezentIcon
                      name="chevronRight"
                      size={13}
                      className="bezent-overview-metric-card__chevron"
                    />
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* 4. Main Overview Grid (approx. 55% / 45%) */}
        <div className="bezent-overview-main-grid">
          {/* Left Column: Organization & Access */}
          <Stack gap="lg">
            {/* Organization Summary */}
            <div className="bezent-overview-card">
              <div className="bezent-overview-card__header">
                <div className="bezent-overview-card__title-wrap">
                  <BezentIcon name="organization" size={18} />
                  <span>Organization</span>
                </div>
                <button
                  type="button"
                  className="bezent-overview-card__action"
                  onClick={() =>
                    navigate(
                      `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/organization/structure`,
                    )
                  }
                  aria-label="View organization structure"
                >
                  <span>View organization</span>
                  <BezentIcon name="arrowRight" size={13} />
                </button>
              </div>

              {isOrgEmpty ? (
                <EmptyState
                  title="No organization structure yet."
                  description="Define Business Units, Divisions, Departments, and Work Locations for this company."
                  primaryAction={{
                    label: 'Set up organization',
                    onClick: () =>
                      navigate(
                        `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/organization/structure`,
                      ),
                  }}
                />
              ) : (
                <div className="bezent-overview-table-rows">
                  <div className="bezent-overview-table-row">
                    <span className="bezent-overview-table-row__label">Business Units</span>
                    <span className="bezent-overview-table-row__value">
                      {orgCounts.businessUnits}
                    </span>
                  </div>
                  <div className="bezent-overview-table-row">
                    <span className="bezent-overview-table-row__label">Divisions</span>
                    <span className="bezent-overview-table-row__value">
                      {orgCounts.divisions}
                    </span>
                  </div>
                  <div className="bezent-overview-table-row">
                    <span className="bezent-overview-table-row__label">Departments</span>
                    <span className="bezent-overview-table-row__value">
                      {orgCounts.departments}
                    </span>
                  </div>
                  <div className="bezent-overview-table-row">
                    <span className="bezent-overview-table-row__label">Work Locations</span>
                    <span className="bezent-overview-table-row__value">
                      {orgCounts.workLocations}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Access Summary */}
            <div className="bezent-overview-card">
              <div className="bezent-overview-card__header">
                <div className="bezent-overview-card__title-wrap">
                  <BezentIcon name="user" size={18} />
                  <span>Access</span>
                </div>
                <button
                  type="button"
                  className="bezent-overview-card__action"
                  onClick={() =>
                    navigate(
                      `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/access`,
                    )
                  }
                  aria-label="Manage company access"
                >
                  <span>Manage access</span>
                  <BezentIcon name="arrowRight" size={13} />
                </button>
              </div>

              <div className="bezent-overview-table-rows">
                <div className="bezent-overview-table-row">
                  <span className="bezent-overview-table-row__label">Company users</span>
                  <span className="bezent-overview-table-row__value">
                    {adminCounts.usersWithAccess}
                  </span>
                </div>
                <div className="bezent-overview-table-row">
                  <span className="bezent-overview-table-row__label">
                    Delegated administrators
                  </span>
                  <span className="bezent-overview-table-row__value">
                    {adminCounts.companyAdmins}
                  </span>
                </div>
                <div className="bezent-overview-table-row">
                  <span className="bezent-overview-table-row__label">Pending invitations</span>
                  <span className="bezent-overview-table-row__value">
                    {adminCounts.pendingInvitations}
                  </span>
                </div>
              </div>
              {adminCounts.usersWithAccess <= 1 && adminCounts.companyAdmins === 0 && (
                <div className="bezent-overview-helper-note">
                  Tenant Admin authority only. Delegated administrators are optional.
                </div>
              )}
            </div>
          </Stack>

          {/* Right Column: Applications & Recent Activity */}
          <Stack gap="lg">
            {/* Applications Summary */}
            <div className="bezent-overview-card">
              <div className="bezent-overview-card__header">
                <div className="bezent-overview-card__title-wrap">
                  <BezentIcon name="apps" size={18} />
                  <span>Applications</span>
                </div>
                <button
                  type="button"
                  className="bezent-overview-card__action"
                  onClick={() =>
                    navigate(
                      `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/applications`,
                    )
                  }
                  aria-label="Manage company applications"
                >
                  <span>Manage applications</span>
                  <BezentIcon name="arrowRight" size={13} />
                </button>
              </div>

              {companyApps.length === 0 && PLATFORM_APPLICATIONS.length === 0 ? (
                <EmptyState
                  title="No applications enabled."
                  description="Enable business applications like HRMS or CRM for this company."
                  primaryAction={{
                    label: 'Enable applications',
                    onClick: () =>
                      navigate(
                        `/tenant-admin/tenant/companies/${encodeURIComponent(effectiveCompany.id)}/applications`,
                      ),
                  }}
                />
              ) : (
                <div className="bezent-overview-app-rows">
                  {PLATFORM_APPLICATIONS.map((app) => {
                    const isEnabled = companyApps.some(
                      (c) =>
                        c.toLowerCase() === app.code ||
                        (app.code === 'pm' && c.toLowerCase() === 'project_management'),
                    );
                    return (
                      <div key={app.code} className="bezent-overview-app-row">
                        <div className="bezent-overview-app-row__left">
                          <div
                            className={`bezent-overview-app-row__icon bezent-overview-app-row__icon--${app.iconStyle}`}
                          >
                            <BezentIcon name={app.icon} size={18} />
                          </div>
                          <span className="bezent-overview-app-row__name">{app.name}</span>
                        </div>
                        <Badge variant={isEnabled ? 'success' : 'neutral'} size="sm">
                          {isEnabled ? 'Enabled' : 'Not enabled'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bezent-overview-card">
              <div className="bezent-overview-card__header">
                <div className="bezent-overview-card__title-wrap">
                  <BezentIcon name="clock" size={18} />
                  <span>Recent Activity</span>
                </div>
              </div>

              {recentActivityEvents.length === 0 ? (
                <EmptyState title="No recent activity yet." />
              ) : (
                <div className="bezent-activity-timeline">
                  {recentActivityEvents.map((event) => (
                    <div key={event.id} className="bezent-activity-item">
                      <span className="bezent-activity-item__dot" aria-hidden="true" />
                      <div className="bezent-activity-item__content">
                        <span className="bezent-activity-item__title">{event.title}</span>
                        <span className="bezent-activity-item__actor">{event.actor}</span>
                      </div>
                      <span className="bezent-activity-item__date">{event.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Stack>
        </div>
      </Stack>

      {effectiveCompany && (
        <EditCompanyDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          company={effectiveCompany}
          onSaveSuccess={(updated) => {
            setCompanyDetail(updated);
            setIsEditDrawerOpen(false);
          }}
        />
      )}
    </Page>
  );
}
