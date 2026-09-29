import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  FormField,
  Input,
  Badge,
  Alert,
} from '../../../design-system/components';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';

export function CompanySettingsPage() {
  const { activeCompany } = useCompanyAdmin();

  return (
    <Page>
      <PageHeader
        title="Company Governance & Settings"
        subtitle={`System policies, isolation boundaries, and security controls for ${activeCompany?.name || 'Company'}`}
      />

      <CompanyContextBar />

      <Stack gap="lg">
        <Alert variant="info" title="Security & Multi-Tenant Boundary Enforcement">
          This company is managed under tenant <strong>{activeCompany?.tenantName}</strong> (ID:{' '}
          {activeCompany?.tenantId}). All personnel, workforce data, roles, and administrative
          records are isolated on the server side using cryptographically enforced company scoping.
        </Alert>

        <Section
          title="Tenant & Platform Isolation"
          subtitle="System invariants governing this company workspace"
        >
          <Card>
            <Grid columns={2} gap="md">
              <FormField label="Assigned Tenant Boundary">
                <Input value={activeCompany?.tenantName || ''} disabled readOnly />
              </FormField>

              <FormField label="Company Identifier">
                <Input value={activeCompany?.id || ''} disabled readOnly />
              </FormField>

              <FormField label="System Company Code">
                <Input value={activeCompany?.code || ''} disabled readOnly />
              </FormField>

              <FormField label="Operating Status">
                <Inline align="center" gap="sm">
                  <Badge variant={activeCompany?.status === 'active' ? 'success' : 'danger'}>
                    {activeCompany?.status.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </Inline>
              </FormField>
            </Grid>
          </Card>
        </Section>

        <Section
          title="Security & Authorization Policies"
          subtitle="Enterprise access safeguards and privilege limits"
        >
          <Grid columns={3} gap="md">
            <Card>
              <Stack gap="sm">
                <strong>Sole Admin Protection</strong>
                <p>
                  The platform prevents accidental removal or demotion of the last active Company
                  Administrator. At least one administrator must remain assigned to the company.
                </p>
                <Badge variant="success">Active Policy</Badge>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <strong>Invitation Security (7-Day TTL)</strong>
                <p>
                  User invitation tokens are generated cryptographically and expire automatically
                  after 7 days. Tokens can be revoked or refreshed at any time.
                </p>
                <Badge variant="info">Enforced</Badge>
              </Stack>
            </Card>

            <Card>
              <Stack gap="sm">
                <strong>Privilege Escalation Prevention</strong>
                <p>
                  Company Administrators cannot assign platform-level Super Admin credentials or
                  override tenant-level software entitlement locks.
                </p>
                <Badge variant="neutral">Platform Invariant</Badge>
              </Stack>
            </Card>
          </Grid>
        </Section>
      </Stack>
    </Page>
  );
}
