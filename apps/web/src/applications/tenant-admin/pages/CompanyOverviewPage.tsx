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
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { TenantCompanyContextBar } from '../components/TenantCompanyContextBar';

export function CompanyOverviewPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading } = useTenantAdmin();

  const company = companies.find((c) => c.id === companyId) || null;

  return (
    <Page>
      <PageHeader
        title={company ? `${company.name} — Overview` : 'Company Overview'}
        subtitle={company ? `Company Code: ${company.code}` : 'Managed Company Overview'}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/tenant-admin/tenant/companies')}
          >
            All Companies
          </Button>
        }
      />

      <Stack gap="lg">
        <TenantCompanyContextBar
          currentCompanyId={companyId}
          baseNavigatePath="/tenant-admin/tenant/companies"
        />

        {company ? (
          <>
            <Section title="Company Profile Summary">
              <Card>
                <Grid columns={3} gap="md">
                  <Stack gap="xs">
                    <span className="text-secondary">Company Name</span>
                    <strong>{company.name}</strong>
                    {company.legalName && (
                      <span className="text-secondary">{company.legalName}</span>
                    )}
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
                </Grid>
              </Card>
            </Section>

            <Section title="Organizational Units">
              <Grid columns={3} gap="md">
                <Card>
                  <Stack gap="sm">
                    <strong>Organization Structure</strong>
                    <p className="text-secondary">
                      Manage business units, divisions, and reporting hierarchies.
                    </p>
                    <Inline>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/organization/structure`,
                          )
                        }
                      >
                        Structure
                      </Button>
                    </Inline>
                  </Stack>
                </Card>

                <Card>
                  <Stack gap="sm">
                    <strong>Departments</strong>
                    <p className="text-secondary">
                      Department hierarchies, cost centers, and departmental leads.
                    </p>
                    <Inline>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/organization/departments`,
                          )
                        }
                      >
                        Departments
                      </Button>
                    </Inline>
                  </Stack>
                </Card>

                <Card>
                  <Stack gap="sm">
                    <strong>Work Locations</strong>
                    <p className="text-secondary">
                      Office facilities, remote work locations, and geographical zones.
                    </p>
                    <Inline>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/organization/locations`,
                          )
                        }
                      >
                        Work Locations
                      </Button>
                    </Inline>
                  </Stack>
                </Card>
              </Grid>
            </Section>
          </>
        ) : (
          <Card>
            <p className="text-secondary">
              {isLoading ? 'Loading company information...' : `Company '${companyId}' not found.`}
            </p>
          </Card>
        )}
      </Stack>
    </Page>
  );
}
