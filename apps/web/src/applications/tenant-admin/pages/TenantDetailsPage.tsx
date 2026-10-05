import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';

export function TenantDetailsPage() {
  const { tenant, capacity, isLoading } = useTenantAdmin();

  return (
    <Page>
      <PageHeader
        title="Tenant Details"
        subtitle="Tenant organizational identity, corporate contact information, and account capacity."
      />

      <Stack gap="lg">
        <Section title="Tenant Information">
          <Card>
            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <span className="text-secondary">Tenant Name</span>
                <strong>{tenant?.name || (isLoading ? 'Loading...' : '—')}</strong>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Tenant Code</span>
                <span>{tenant?.code || '—'}</span>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Tenant ID</span>
                <code>{tenant?.id || (isLoading ? 'Loading...' : '—')}</code>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Status</span>
                <Inline>
                  <Badge variant={tenant?.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {(tenant?.status || 'active').toUpperCase()}
                  </Badge>
                </Inline>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Contact Email</span>
                <span>{tenant?.contactEmail || '—'}</span>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Contact Phone</span>
                <span>{tenant?.contactPhone || '—'}</span>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Created At</span>
                <span>{tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : '—'}</span>
              </Stack>

              <Stack gap="xs">
                <span className="text-secondary">Company Capacity</span>
                <span>
                  {capacity
                    ? `${capacity.currentCompanies} / ${capacity.maxCompanies} companies (${capacity.availableCapacity} available)`
                    : 'Unlimited / Standard'}
                </span>
              </Stack>
            </Grid>
          </Card>
        </Section>
      </Stack>
    </Page>
  );
}
