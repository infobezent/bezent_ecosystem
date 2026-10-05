import { useParams, useNavigate } from 'react-router-dom';
import { Page, PageHeader, Stack, Button } from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { TenantCompanyContextBar } from '../components/TenantCompanyContextBar';
import { OrganizationStructureSection } from '../../company-admin/organization/OrganizationStructureSection';

export function CompanyOrganizationStructurePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies } = useTenantAdmin();

  const company = companies.find((c) => c.id === companyId) || null;

  return (
    <Page>
      <PageHeader
        title={company ? `${company.name} — Organization Structure` : 'Organization Structure'}
        subtitle="Manage business units, divisions, and corporate reporting structure."
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
            Company Overview
          </Button>
        }
      />

      <Stack gap="lg">
        <TenantCompanyContextBar
          currentCompanyId={companyId}
          baseNavigatePath="/tenant-admin/tenant/companies"
        />

        <OrganizationStructureSection
          onBack={() =>
            navigate(
              company
                ? `/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview`
                : '/tenant-admin/tenant/companies',
            )
          }
        />
      </Stack>
    </Page>
  );
}
