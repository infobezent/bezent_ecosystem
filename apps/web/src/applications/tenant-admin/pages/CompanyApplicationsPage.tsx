import { useParams, useNavigate } from 'react-router-dom';
import { Page, Stack, EmptyState, LoadingState } from '../../../design-system/components';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';

/**
 * Company-scoped Applications Page Shell.
 *
 * Renders inside the selected Company workspace:
 * - Preserves CompanyWorkspaceHeader
 * - Marks 'Applications' tab active
 * - Enforces tenant/company boundary validation
 */
export function CompanyApplicationsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading } = useTenantAdmin();

  const company = companies.find((c) => c.id === companyId) || null;

  if (!isLoading && !company) {
    return (
      <Page>
        <EmptyState
          title="Company Not Found or Access Denied"
          description={`Company '${companyId}' was not found or belongs to another tenant organization. Cross-tenant access is prohibited.`}
          primaryAction={{
            label: 'Back to Companies',
            onClick: () => navigate('/tenant-admin/tenant/companies'),
          }}
        />
      </Page>
    );
  }

  if (isLoading || !company) {
    return (
      <Page>
        <LoadingState label="Loading company workspace..." fill />
      </Page>
    );
  }

  return (
    <Page>
      <Stack gap="lg">
        <CompanyWorkspaceHeader
          company={company}
          activeSection="applications"
          onEditCompany={() =>
            navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(company.id)}/overview?edit=true`)
          }
        />
        <EmptyState
          title="Applications"
          description="Application access for this company will be managed here."
        />
      </Stack>
    </Page>
  );
}
