import { useParams, useNavigate } from 'react-router-dom';
import { Page, PageHeader, Stack, Button, Tabs } from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { TenantCompanyContextBar } from '../components/TenantCompanyContextBar';
import { DepartmentsSection } from '../../company-admin/organization/DepartmentsSection';

export function CompanyDepartmentsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies } = useTenantAdmin();

  const company = companies.find((c) => c.id === companyId) || null;

  return (
    <Page>
      <PageHeader
        title={company ? `${company.name} — Departments` : 'Departments'}
        subtitle="Department hierarchies, departmental leads, and cost center assignments."
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

        {company && (
          <Tabs
            activeId="organization"
            onChange={(id) => {
              if (id === 'overview') {
                navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview`);
              } else if (id === 'details') {
                navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/details`);
              }
            }}
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Company Details' },
              { id: 'organization', label: 'Organization' },
            ]}
          />
        )}

        <DepartmentsSection
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
