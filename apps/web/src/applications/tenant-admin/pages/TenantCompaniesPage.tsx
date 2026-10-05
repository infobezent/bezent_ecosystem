import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Button,
  Inline,
  Stack,
  EmptyState,
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';

export function TenantCompaniesPage() {
  const navigate = useNavigate();
  const { companies, capacity, isLoading } = useTenantAdmin();

  return (
    <Page>
      <PageHeader
        title="Companies"
        subtitle="Manage legal company entities, organizational hierarchies, and company-level settings."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/tenant-admin/tenant/companies/new')}
            disabled={capacity?.isAtCapacity}
          >
            + Create Company
          </Button>
        }
      />

      <Stack gap="lg">
        {capacity && (
          <Card variant="flat">
            <Inline justify="between" align="center" wrap gap="md">
              <Stack gap="xs">
                <strong>Tenant Company Capacity</strong>
                <span className="text-secondary">
                  {capacity.currentCompanies} of {capacity.maxCompanies} allowed companies provisioned.
                </span>
              </Stack>
              <Badge variant={capacity.isAtCapacity ? 'danger' : 'success'}>
                {capacity.isAtCapacity ? 'CAPACITY LIMIT REACHED' : `${capacity.availableCapacity} AVAILABLE`}
              </Badge>
            </Inline>
          </Card>
        )}

        <Section title={`Companies (${companies.length})`}>
          {companies.length === 0 && !isLoading ? (
            <EmptyState
              title="No Companies Found"
              description="No company entities have been provisioned in this tenant yet."
              primaryAction={{
                label: 'Create First Company',
                onClick: () => navigate('/tenant-admin/tenant/companies/new'),
              }}
            />
          ) : (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Company Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Country</TableHeaderCell>
                    <TableHeaderCell>Time Zone</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Stack gap="xs">
                          <strong>{company.name}</strong>
                          {company.legalName && (
                            <span className="text-secondary">{company.legalName}</span>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <code>{company.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {company.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.country || '—'}</TableCell>
                      <TableCell>{company.timeZone || '—'}</TableCell>
                      <TableCell align="right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview`,
                            )
                          }
                        >
                          Manage Company
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Section>
      </Stack>
    </Page>
  );
}
