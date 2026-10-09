import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Alert,
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { TenantApplicationSummary, TenantMemberSummary } from '../types/tenantAdmin.types';

export interface TenantAdminDashboardPageProps {
  initialApplications?: TenantApplicationSummary[] | null;
}

export function TenantAdminDashboardPage({
  initialApplications,
}: TenantAdminDashboardPageProps = {}) {
  const navigate = useNavigate();
  const { tenant, companies, capacity, entitlements = [], isLoading } = useTenantAdmin();

  const [members, setMembers] = useState<TenantMemberSummary[] | null>(null);
  const [applications, setApplications] = useState<TenantApplicationSummary[] | null>(
    initialApplications !== undefined ? initialApplications : null,
  );

  useEffect(() => {
    let isMounted = true;

    // Load real members to derive unique tenant users and admin counts
    tenantAdminApi
      .listMembers()
      .then((data) => {
        if (isMounted) setMembers(data);
      })
      .catch(() => {
        // Fallback gracefully without breaking dashboard
        if (isMounted) setMembers([]);
      });

    // Load real application catalog if not provided initially
    if (initialApplications === undefined) {
      tenantAdminApi
        .listApplications()
        .then((data) => {
          if (isMounted) setApplications(data);
        })
        .catch(() => {
          if (isMounted) setApplications(null);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [initialApplications]);

  // Canonical capacity calculations
  const capacityUsed = capacity?.used ?? capacity?.currentCompanies ?? companies.length;
  const capacityMax = capacity?.max ?? capacity?.maxCompanies;
  const capacityRemaining =
    capacity?.remaining ??
    capacity?.availableCapacity ??
    (capacityMax !== undefined ? Math.max(0, capacityMax - capacityUsed) : undefined);

  const isAtCapacity =
    capacity?.canCreateCompany === false ||
    capacity?.isAtCapacity === true ||
    (capacityRemaining !== undefined && capacityRemaining <= 0) ||
    (capacityMax !== undefined && capacityUsed >= capacityMax);

  // Application entitlement counts
  const canonicalApps = [
    { code: 'hrms', name: 'HRMS' },
    { code: 'crm', name: 'CRM' },
    { code: 'project_management', name: 'Project Management' },
  ];

  const appEntitlements = canonicalApps.map((app) => {
    const fromApi = applications?.find((a) => {
      const code = a.code || a.moduleCode || a.id;
      return typeof code === 'string' && code.trim().toLowerCase() === app.code.toLowerCase();
    });
    const fromContext = entitlements.some((e) => {
      if (typeof e !== 'string') return false;
      const normalized = e.trim().toLowerCase();
      return (
        normalized === app.code.toLowerCase() ||
        normalized === app.name.toLowerCase()
      );
    });
    const isEntitled = Boolean(
      fromApi
        ? (fromApi.tenantEntitled ?? fromApi.status === 'active')
        : fromContext,
    );
    return {
      ...app,
      isEntitled,
      enabledCompaniesCount: fromApi?.enabledCompaniesCount ?? 0,
      totalCompaniesCount: fromApi?.totalCompaniesCount ?? companies.length,
    };
  });

  const entitledCount = appEntitlements.filter((a) => a.isEntitled).length || entitlements.length;

  // Real Needs Attention derivation
  const attentionItems: Array<{ id: string; variant: 'warning' | 'info'; message: string }> = [];

  if (isAtCapacity) {
    attentionItems.push({
      id: 'capacity_reached',
      variant: 'warning',
      message: `Company capacity reached (${capacityUsed} of ${capacityMax} used). Contact Super Admin to request an increase.`,
    });
  }

  if (!isLoading && companies.length === 0) {
    attentionItems.push({
      id: 'no_companies',
      variant: 'info',
      message: 'No companies configured yet. Create a company to begin distributing applications and managing workforce.',
    });
  }

  const inactiveCompanies = companies.filter((c) => c.status !== 'active');
  if (inactiveCompanies.length > 0) {
    attentionItems.push({
      id: 'inactive_companies',
      variant: 'warning',
      message: `${inactiveCompanies.length} company account${inactiveCompanies.length > 1 ? 's are' : ' is'} currently inactive.`,
    });
  }

  const adminUsersCount = members
    ? members.filter((m) => m.tenantAuthority === 'tenant_admin').length
    : null;

  return (
    <Page>
      {/* 1. Dashboard Header */}
      <PageHeader
        title={tenant?.name || 'Tenant Administration'}
        subtitle="Tenant Administration Control Center — Organization, access, and enterprise application oversight."
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/tenant-admin/access/users/members')}
            >
              Invite User
            </Button>
            <Inline gap="xs">
              <Button
                variant="primary"
                size="sm"
                disabled={isAtCapacity}
                title={isAtCapacity ? 'Company capacity reached' : undefined}
                onClick={() => navigate('/tenant-admin/tenant/companies/new')}
              >
                + Add Company
              </Button>
              {isAtCapacity && (
                <Badge variant="warning" size="sm">
                  Capacity Reached
                </Badge>
              )}
            </Inline>
          </Inline>
        }
      />

      <Stack gap="xl">
        {/* 2. Tenant Summary */}
        <Section title="Tenant Summary">
          <Grid columns={4} gap="md">
            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Tenant Status</span>
                <Inline>
                  <Badge
                    variant={tenant?.status === 'active' ? 'success' : 'neutral'}
                    size="md"
                  >
                    {(tenant?.status || 'active').toUpperCase()}
                  </Badge>
                </Inline>
                <span className="text-secondary">Account ID: {tenant?.code || tenant?.id || '—'}</span>
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Companies</span>
                <strong>
                  {capacityUsed} / {capacityMax !== undefined ? capacityMax : 'Unlimited'}
                </strong>
                <span className="text-secondary">
                  {capacityRemaining !== undefined
                    ? `${capacityRemaining} remaining`
                    : 'Within limit'}
                </span>
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Unique Tenant Users</span>
                <strong>
                  {members !== null ? members.length : isLoading ? '...' : '—'}
                </strong>
                <span className="text-secondary">
                  {adminUsersCount !== null
                    ? `${adminUsersCount} Tenant Admin${adminUsersCount === 1 ? '' : 's'}`
                    : 'Active identities'}
                </span>
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Application Entitlements</span>
                <strong>{entitledCount} Applications</strong>
                <span className="text-secondary">Enterprise platform scope</span>
              </Stack>
            </Card>
          </Grid>
        </Section>

        {/* 3. Companies */}
        <Section
          title="Companies"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/tenant-admin/tenant/companies')}
            >
              Manage Companies
            </Button>
          }
        >
          {companies.length === 0 ? (
            <Card>
              <Stack gap="sm">
                <strong>No Companies Configured</strong>
                <p className="text-secondary">
                  This tenant does not have any active business companies yet.
                </p>
                {!isAtCapacity && (
                  <Inline>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/tenant-admin/tenant/companies/new')}
                    >
                      + Add First Company
                    </Button>
                  </Inline>
                )}
              </Stack>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Company Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <strong>{company.name}</strong>
                      </TableCell>
                      <TableCell>
                        <code>{company.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={company.status === 'active' ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {company.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate(`/tenant-admin/tenant/companies/${company.id}/overview`)
                          }
                        >
                          View Company
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Section>

        {/* 4. Needs Attention */}
        <Section title="Needs Attention">
          {attentionItems.length === 0 ? (
            <Card>
              <span className="text-secondary">No administrative issues require attention.</span>
            </Card>
          ) : (
            <Stack gap="sm">
              {attentionItems.map((item) => (
                <Alert key={item.id} variant={item.variant}>
                  {item.message}
                </Alert>
              ))}
            </Stack>
          )}
        </Section>

        {/* 5. Applications Summary */}
        <Section
          title="Applications Summary"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/tenant-admin/applications/access')}
            >
              Manage Application Access
            </Button>
          }
        >
          <Grid columns={3} gap="md">
            {appEntitlements.map((app) => (
              <Card key={app.code}>
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <strong>{app.name}</strong>
                    <Badge variant={app.isEntitled ? 'success' : 'neutral'} size="sm">
                      {app.isEntitled ? 'Enabled' : 'Not Entitled'}
                    </Badge>
                  </Inline>
                  <span className="text-secondary">
                    Application Scope: Tenant-wide
                  </span>
                  {app.isEntitled && app.enabledCompaniesCount > 0 && (
                    <span className="text-secondary">
                      Active in {app.enabledCompaniesCount} of {companies.length} compan{companies.length === 1 ? 'y' : 'ies'}
                    </span>
                  )}
                </Stack>
              </Card>
            ))}
          </Grid>
        </Section>

        {/* 6. Access Summary */}
        <Section
          title="Access Summary"
          actions={
            <Inline gap="sm">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/tenant-admin/access/roles')}
              >
                Roles & Permissions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/tenant-admin/access/users/members')}
              >
                Manage Users
              </Button>
            </Inline>
          }
        >
          <Grid columns={2} gap="md">
            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Tenant User Directory</span>
                <strong>
                  {members !== null ? `${members.length} Total Users` : 'Active Directory'}
                </strong>
                <span className="text-secondary">
                  Centralized user accounts registered under this tenant.
                </span>
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Administrative Authority</span>
                <strong>
                  {adminUsersCount !== null
                    ? `${adminUsersCount} Tenant Administrator${adminUsersCount === 1 ? '' : 's'}`
                    : 'Role Governance'}
                </strong>
                <span className="text-secondary">
                  Users with tenant-wide administrative authority.
                </span>
              </Stack>
            </Card>
          </Grid>
        </Section>

        {/* 7. Recent Admin Activity */}
        <Section
          title="Recent Admin Activity"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/tenant-admin/governance/audit-logs')}
            >
              View Audit Logs
            </Button>
          }
        >
          <Card>
            <Stack gap="xs">
              <span className="text-secondary">
                Canonical audit logs record all administrative access, organization changes, and application enablement events.
              </span>
              <Inline>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/tenant-admin/governance/audit-logs')}
                >
                  Open Governance Logs
                </Button>
              </Inline>
            </Stack>
          </Card>
        </Section>
      </Stack>
    </Page>
  );
}
