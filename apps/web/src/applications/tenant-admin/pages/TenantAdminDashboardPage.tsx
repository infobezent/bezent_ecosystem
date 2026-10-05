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
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';

export function TenantAdminDashboardPage() {
  const navigate = useNavigate();
  const { tenant, user, companies, capacity, isLoading } = useTenantAdmin();

  return (
    <Page>
      <PageHeader
        title="Tenant Overview"
        subtitle={tenant?.name ? `Tenant Administrator Console — ${tenant.name}` : 'Tenant Administrator Console'}
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/tenant-admin/tenant/details')}
            >
              Tenant Details
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/tenant-admin/tenant/companies')}
            >
              Manage Companies
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        <Section title="Tenant Identity & Authority">
          <Grid columns={4} gap="md">
            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Tenant Name</span>
                <strong>{tenant?.name || (isLoading ? 'Loading...' : '—')}</strong>
                {tenant?.status && (
                  <Inline>
                    <Badge variant={tenant.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {tenant.status.toUpperCase()}
                    </Badge>
                  </Inline>
                )}
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Tenant ID</span>
                <code>{tenant?.id || (isLoading ? 'Loading...' : '—')}</code>
                {tenant?.code && <span className="text-secondary">Code: {tenant.code}</span>}
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Administrator</span>
                <strong>{user ? `${user.firstName} ${user.lastName}` : (isLoading ? 'Loading...' : '—')}</strong>
                <span className="text-secondary">{user?.email || '—'}</span>
              </Stack>
            </Card>

            <Card>
              <Stack gap="xs">
                <span className="text-secondary">Managed Companies</span>
                <strong>{companies.length}</strong>
                {capacity && (
                  <span className="text-secondary">
                    {capacity.currentCompanies} / {capacity.maxCompanies} Capacity Used
                  </span>
                )}
              </Stack>
            </Card>
          </Grid>
        </Section>

        <Section title="Administrative Domains">
          <Grid columns={3} gap="md">
            <Card>
              <Stack gap="sm">
                <strong>Tenant Organization</strong>
                <p className="text-secondary">
                  Manage tenant-level corporate details, legal entities, and company creation.
                </p>
                <Inline>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/tenant-admin/tenant/companies')}
                  >
                    View Companies ({companies.length})
                  </Button>
                </Inline>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <strong>Access & Governance</strong>
                <p className="text-secondary">
                  Manage tenant members, directory invitations, and role-based permissions.
                </p>
                <Inline>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/tenant-admin/access/users/members')}
                  >
                    Manage Users
                  </Button>
                </Inline>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <strong>Enterprise Applications</strong>
                <p className="text-secondary">
                  Review tenant application entitlements (HRMS, CRM, PM) and company distribution.
                </p>
                <Inline>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/tenant-admin/applications/access')}
                  >
                    Application Access
                  </Button>
                </Inline>
              </Stack>
            </Card>
          </Grid>
        </Section>
      </Stack>
    </Page>
  );
}
