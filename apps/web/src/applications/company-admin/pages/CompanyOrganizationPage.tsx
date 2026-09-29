import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Button,
  Alert,
  LoadingState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type OrganizationSummary,
} from '../api/companyAdminApi';

export function CompanyOrganizationPage() {
  const navigate = useNavigate();
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [data, setData] = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrgSummary = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.getOrganizationSummary(activeCompanyId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load organization summary');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchOrgSummary();
  }, [fetchOrgSummary]);

  return (
    <Page>
      <PageHeader
        title="Organization Management"
        subtitle={`Organizational hierarchy, departments, and office locations for ${activeCompany?.name || 'Company'}`}
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchOrgSummary}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/hrms/organization/departments')}
              leftIcon={<BezentIcon name="organization" size={16} color="currentColor" />}
            >
              HRMS Organization Center
            </Button>
          </Inline>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchOrgSummary()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <LoadingState label="Loading organization structure..." />
      ) : data ? (
        <Stack gap="lg">
          <Alert variant="info" title="Canonical HRMS Master Records">
            Organization masters are unified across the BEZENT platform. All workforce records and employment histories link directly to these organizational entities.
          </Alert>

          {/* Counts Overview */}
          <Section
            title="Workforce Structure Metrics"
            subtitle="Departmental and organizational master counts"
          >
            <Grid columns={4} gap="md">
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Departments</span>
                  <h2>{data.counts.departments}</h2>
                  <Badge variant="neutral">Active Departments</Badge>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Designations</span>
                  <h2>{data.counts.designations}</h2>
                  <Badge variant="neutral">Job Titles</Badge>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Office Locations</span>
                  <h2>{data.counts.locations}</h2>
                  <Badge variant="neutral">Work Sites</Badge>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Active Employees</span>
                  <h2>{data.counts.activeEmployees}</h2>
                  <Badge variant="success">Assigned</Badge>
                </Stack>
              </Card>
            </Grid>
          </Section>

          {/* Departments Directory */}
          <Section
            title="Departments"
            subtitle="Configured business units and operational divisions"
          >
            <Card>
              {data.departments.length === 0 ? (
                <p>No departments configured for this company yet.</p>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Department Name</TableHeaderCell>
                      <TableHeaderCell>Code</TableHeaderCell>
                      <TableHeaderCell>ID</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.departments.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell>
                          <strong>{dept.name}</strong>
                        </TableCell>
                        <TableCell>
                          <Badge variant="info">{dept.code}</Badge>
                        </TableCell>
                        <TableCell>
                          <code>{dept.id}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </Section>

          {/* Designations & Locations Grid */}
          <Grid columns={2} gap="md">
            <Section title="Designations" subtitle="Job titles and positions">
              <Card>
                {data.designations.length === 0 ? (
                  <p>No designations configured yet.</p>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Job Title</TableHeaderCell>
                        <TableHeaderCell>ID</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.designations.map((desig) => (
                        <TableRow key={desig.id}>
                          <TableCell>
                            <strong>{desig.title}</strong>
                          </TableCell>
                          <TableCell>
                            <code>{desig.id}</code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </Section>

            <Section title="Locations" subtitle="Operating branches and offices">
              <Card>
                {data.locations.length === 0 ? (
                  <p>No locations configured yet.</p>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Office Name</TableHeaderCell>
                        <TableHeaderCell>City / Country</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.locations.map((loc) => (
                        <TableRow key={loc.id}>
                          <TableCell>
                            <strong>{loc.name}</strong>
                          </TableCell>
                          <TableCell>
                            {[loc.city, loc.country].filter(Boolean).join(', ') || 'Global'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </Section>
          </Grid>
        </Stack>
      ) : null}
    </Page>
  );
}
