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
  Switch,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type CompanyModuleStatus,
  type ModuleCode,
} from '../api/companyAdminApi';

export function CompanyModulesPage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [modules, setModules] = useState<CompanyModuleStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchModules = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.getModules(activeCompanyId);
      setModules(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleToggleModule = async (mod: CompanyModuleStatus) => {
    if (!activeCompanyId) return;
    if (!mod.tenantEntitled) {
      setError(
        `Cannot enable ${mod.name} for this company because it is not provisioned or entitled at the tenant level by Super Admin.`,
      );
      return;
    }

    setUpdatingCode(mod.code);
    setError(null);
    setSuccess(null);

    try {
      const nextState = !mod.companyEnabled;
      const res = await companyAdminApi.setModuleStatus(
        mod.code as ModuleCode,
        nextState,
        activeCompanyId,
      );
      setSuccess(res.message);
      setModules((prev) =>
        prev.map((m) => (m.code === mod.code ? { ...m, companyEnabled: nextState } : m)),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle module status');
    } finally {
      setUpdatingCode(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Application Module Access"
        subtitle={`Provisioned applications and company-level enablement for ${activeCompany?.name || 'Company'}`}
        actions={
          <Button
            variant="secondary"
            onClick={fetchModules}
            leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
          >
            Refresh
          </Button>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchModules()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success">
          {success}
        </Alert>
      )}

      {loading && modules.length === 0 ? (
        <LoadingState label="Loading application entitlements..." />
      ) : (
        <Stack gap="lg">
          <Alert variant="info" title="Tenant Entitlement Governance">
            Applications are provisioned to customer tenants by Super Admin. A Company Admin can enable or disable access for company personnel, but cannot override tenant-level entitlements.
          </Alert>

          <Section
            title="Ecosystem Business Applications"
            subtitle="Current status and operational enablement across this company entity"
          >
            <Grid columns={3} gap="md">
              {modules.map((m) => {
                const isToggling = updatingCode === m.code;

                return (
                  <Card key={m.code}>
                    <Stack gap="md">
                      <Inline justify="between">
                        <strong>{m.name}</strong>
                        <Badge variant={m.companyEnabled ? 'success' : 'neutral'}>
                          {m.companyEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </Inline>

                      <p>{m.description}</p>

                      <Stack gap="xs">
                        <Inline justify="between">
                          <span className="bezent-metric-label">Tenant Entitlement:</span>
                          <Badge variant={m.tenantEntitled ? 'info' : 'danger'} size="sm">
                            {m.tenantEntitled ? 'Entitled' : 'Not Entitled'}
                          </Badge>
                        </Inline>

                        <Inline justify="between">
                          <span className="bezent-metric-label">Company Access:</span>
                          <Badge variant={m.companyEnabled ? 'success' : 'neutral'} size="sm">
                            {m.companyEnabled ? 'Active' : 'Deactivated'}
                          </Badge>
                        </Inline>
                      </Stack>

                      <Inline justify="between" gap="sm">
                        <Switch
                          id={`switch-${m.code}`}
                          checked={m.companyEnabled}
                          disabled={!m.tenantEntitled || isToggling}
                          onChange={() => handleToggleModule(m)}
                        />
                        <span className="bezent-metric-label">
                          {isToggling
                            ? 'Saving...'
                            : !m.tenantEntitled
                            ? 'Disabled at Tenant Level'
                            : m.companyEnabled
                            ? 'Company Active'
                            : 'Enable for Company'}
                        </span>
                      </Inline>
                    </Stack>
                  </Card>
                );
              })}
            </Grid>
          </Section>
        </Stack>
      )}
    </Page>
  );
}
