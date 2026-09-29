import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Alert,
  LoadingState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import { companyAdminApi, type RoleDefinition } from '../api/companyAdminApi';

export function CompanyRolesPage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.getRoles(activeCompanyId);
      setRoles(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return (
    <Page>
      <PageHeader
        title="Roles & Permissions"
        subtitle={`Authorized roles and access controls governing ${activeCompany?.name || 'Company'}`}
        actions={
          <Button
            variant="secondary"
            onClick={fetchRoles}
            leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
          >
            Refresh
          </Button>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchRoles()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {loading && roles.length === 0 ? (
        <LoadingState label="Loading role catalog..." />
      ) : (
        <Stack gap="lg">
          <Alert variant="info" title="Role Hierarchy & Boundaries">
            Platform roles like <strong>Super Admin</strong> operate strictly at the ecosystem
            infrastructure layer and cannot be assigned by Company Admins. Roles listed below are
            scoped strictly to <strong>{activeCompany?.name}</strong>.
          </Alert>

          <Section
            title="Available Company Roles"
            subtitle="Configured permissions and authorization boundaries for company personnel"
          >
            <Grid columns={2} gap="md">
              {roles.map((r) => (
                <Card key={r.id}>
                  <Stack gap="md">
                    <Inline justify="between">
                      <Stack gap="none">
                        <strong>{r.name}</strong>
                        <span className="bezent-metric-label">{r.id}</span>
                      </Stack>
                      <Badge
                        variant={
                          r.id === 'company_admin'
                            ? 'info'
                            : r.id === 'hr_manager'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {r.id.toUpperCase()}
                      </Badge>
                    </Inline>

                    <p>{r.description}</p>

                    <Stack gap="xs">
                      <span className="bezent-metric-label">
                        Granted Permissions ({r.permissions.length}):
                      </span>
                      <Inline gap="xs" wrap>
                        {r.permissions.map((perm) => (
                          <Badge key={perm} variant="neutral" size="sm">
                            {perm}
                          </Badge>
                        ))}
                      </Inline>
                    </Stack>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Section>
        </Stack>
      )}
    </Page>
  );
}
