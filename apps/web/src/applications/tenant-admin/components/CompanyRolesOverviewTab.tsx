import { useState, useEffect } from 'react';
import {
  Alert,
  Badge,
  Card,
  Grid,
  LoadingState,
  Stack,
} from '../../../design-system/components';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { CompanyRoleOverviewItem } from '../types/tenantAdmin.types';

export interface CompanyRolesOverviewTabProps {
  companyId: string;
}

const DEFAULT_ROLES_OVERVIEW: CompanyRoleOverviewItem[] = [
  {
    code: 'member',
    name: 'Member',
    scope: 'Company Member',
    description: 'Standard authenticated member of the legal company entity.',
    administrativeCapabilities: [
      'Access company self-service interfaces and personal workspace',
      'View company directory and public organizational structure',
      'Receive company notifications and announcements',
    ],
    disclaimer:
      'Application permissions (HRMS, CRM, Project Management) are provisioned and managed separately.',
  },
  {
    code: 'company_admin',
    name: 'Company Administrator',
    scope: 'Company Administration',
    description:
      'Delegated operational administrator for company masters, workforce organization, and access.',
    administrativeCapabilities: [
      'Manage company overview profile, regional settings, and visual branding',
      'Manage organizational structure (Business Units, Divisions, Departments, Work Locations)',
      'Manage company user directory, invitations, and role assignments',
      'View company administrative audit trail',
    ],
    disclaimer:
      'Does not grant Tenant Administrator authority across other companies. Business application permissions are governed separately.',
  },
];

export function CompanyRolesOverviewTab({ companyId }: CompanyRolesOverviewTabProps) {
  const [roles, setRoles] = useState<CompanyRoleOverviewItem[]>(DEFAULT_ROLES_OVERVIEW);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      try {
        setLoading(true);
        const data = await tenantAdminApi.getCompanyRolesOverview(companyId);
        if (!cancelled && data && data.length > 0) {
          setRoles(data);
        }
      } catch {
        // Fallback to canonical default overview on error
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return <LoadingState label="Loading roles and permissions overview..." />;
  }

  return (
    <Stack gap="lg">
      <Alert
        variant="info"
        title="Company Scope & Application Boundary"
      >
        Company roles govern organizational identity, delegation, and administrative ownership for this company.
        Access to specific business applications (HRMS, CRM, Project Management) and fine-grained operational roles
        are managed independently within those applications.
      </Alert>

      <Grid columns={2} gap="lg">
        {roles.map((r) => (
          <Card key={r.code}>
            <Stack gap="md">
              <Stack gap="xs">
                <Badge variant={r.code === 'company_admin' ? 'info' : 'neutral'}>
                  {r.scope}
                </Badge>
                <h3>{r.name}</h3>
                <p>{r.description}</p>
              </Stack>

              <Stack gap="xs">
                <strong>Administrative Capabilities</strong>
                <Stack gap="xs">
                  {r.administrativeCapabilities.map((cap, i) => (
                    <div key={i}>• {cap}</div>
                  ))}
                </Stack>
              </Stack>

              <Alert variant="info">
                {r.disclaimer}
              </Alert>
            </Stack>
          </Card>
        ))}
      </Grid>
    </Stack>
  );
}
