import { useParams, useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Button,
  Badge,
  Avatar,
  Tabs,
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { TenantCompanyContextBar } from '../components/TenantCompanyContextBar';

export function CompanyDetailsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading } = useTenantAdmin();

  const company = companies.find((c) => c.id === companyId) || null;

  return (
    <Page>
      <PageHeader
        title={company ? `${company.name} — Company Details` : 'Company Details'}
        subtitle="Legal company entity identity, localization, and corporate registration."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate(
                company
                  ? `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview`
                  : '/tenant-admin/tenant/companies',
              )
            }
          >
            Back to Overview
          </Button>
        }
      />

      <Stack gap="lg">
        <TenantCompanyContextBar
          currentCompanyId={companyId}
          baseNavigatePath="/tenant-admin/tenant/companies"
        />

        {company && (
          <Tabs
            activeId="details"
            onChange={(id) => {
              if (id === 'overview') {
                navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview`);
              } else if (id === 'organization') {
                navigate(
                  `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/organization/structure`,
                );
              }
            }}
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Company Details' },
              { id: 'organization', label: 'Organization' },
            ]}
          />
        )}

        {company ? (
          <Section title="Corporate Registration">
            <Card>
              <Grid columns={2} gap="md">
                <Stack gap="xs">
                  <span className="text-secondary">Company Name</span>
                  <strong>{company.name}</strong>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Legal Name</span>
                  <span>{company.legalName || company.name}</span>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Code</span>
                  <code>{company.code}</code>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Status</span>
                  <Inline>
                    <Badge variant={company.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {company.status.toUpperCase()}
                    </Badge>
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Branding</span>
                  <Inline gap="xs" align="center">
                    <Avatar
                      size="sm"
                      shape="square"
                      src={company.logoUrl || undefined}
                      initials={company.name.slice(0, 2).toUpperCase()}
                      alt={`${company.name} logo`}
                    />
                    <Badge
                      variant={
                        company.brandingMode === 'own_logo'
                          ? 'info'
                          : company.brandingMode === 'tenant_logo'
                            ? 'neutral'
                            : 'neutral'
                      }
                      size="sm"
                    >
                      {company.brandingMode === 'own_logo'
                        ? 'Custom Logo'
                        : company.brandingMode === 'tenant_logo'
                          ? 'Tenant Logo'
                          : 'Initials'}
                    </Badge>
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Country</span>
                  <span>{company.country || '—'}</span>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Time Zone</span>
                  <span>{company.timeZone || '—'}</span>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Currency</span>
                  <span>{company.currency || '—'}</span>
                </Stack>

                <Stack gap="xs">
                  <span className="text-secondary">Fiscal Year Start</span>
                  <span>{company.fiscalYearStart || '—'}</span>
                </Stack>
              </Grid>
            </Card>
          </Section>
        ) : (
          <Card>
            <p className="text-secondary">
              {isLoading ? 'Loading company details...' : `Company '${companyId}' not found.`}
            </p>
          </Card>
        )}
      </Stack>
    </Page>
  );
}
