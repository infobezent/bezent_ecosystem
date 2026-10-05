import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Card,
  Stack,
  Button,
  Inline,
} from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';

export function CreateCompanyPage() {
  const navigate = useNavigate();
  const { capacity } = useTenantAdmin();

  return (
    <Page>
      <PageHeader
        title="Create Company"
        subtitle="Provision a new legal business entity within tenant capacity limits."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/tenant-admin/tenant/companies')}
          >
            Back to Companies
          </Button>
        }
      />

      <Stack gap="lg">
        <Card>
          <Stack gap="md">
            <strong>Company Provisioning Wizard</strong>
            <p className="text-secondary">
              Company creation wizard will be fully interactive in Phase 3B. Companies are bounded by tenant capacity (
              {capacity ? `${capacity.currentCompanies}/${capacity.maxCompanies}` : 'Standard'}).
            </p>
            <Inline>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/tenant-admin/tenant/companies')}
              >
                Return to Companies Directory
              </Button>
            </Inline>
          </Stack>
        </Card>
      </Stack>
    </Page>
  );
}
