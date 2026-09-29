import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Select,
  Switch,
  Alert,
  LoadingState,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type ModuleCatalogItem,
  type TenantModuleStatus,
  type TenantRecord,
} from '../api/superAdminApi';

export function ModuleAccessPage() {
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [moduleStatuses, setModuleStatuses] = useState<TenantModuleStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, tenantsRes] = await Promise.all([
        superAdminApi.getModuleCatalog(),
        superAdminApi.listTenants({ limit: 100 }),
      ]);
      setCatalog(catalogRes);
      setTenants(tenantsRes.items);
      if (tenantsRes.items.length > 0 && !selectedTenantId) {
        setSelectedTenantId(tenantsRes.items[0]!.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load module catalog');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const fetchTenantModules = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    try {
      const statuses = await superAdminApi.getTenantModules(tenantId);
      setModuleStatuses(statuses);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load module statuses');
    }
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantModules(selectedTenantId);
    }
  }, [selectedTenantId, fetchTenantModules]);

  const handleToggleModule = async (moduleCode: string, isEnabled: boolean) => {
    if (!selectedTenantId) return;
    setUpdatingCode(moduleCode);
    setError(null);
    setSuccess(null);
    try {
      if (isEnabled) {
        await superAdminApi.disableModule(selectedTenantId, moduleCode);
        setSuccess(`Application module '${moduleCode.toUpperCase()}' has been disabled.`);
      } else {
        await superAdminApi.enableModule(selectedTenantId, moduleCode);
        setSuccess(`Application module '${moduleCode.toUpperCase()}' has been enabled.`);
      }
      await fetchTenantModules(selectedTenantId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle module entitlement');
    } finally {
      setUpdatingCode(null);
    }
  };

  const getStatusForModule = (code: string): 'enabled' | 'disabled' => {
    const found = moduleStatuses.find((m) => m.moduleCode === code);
    return found ? found.status : 'disabled';
  };

  return (
    <Page>
      <PageHeader
        title="Module Access Management"
        subtitle="Control which business applications (HRMS, CRM, PM) are licensed and active per customer"
      />

      {error && (
        <Alert variant="error" title="Action Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Entitlement Updated" onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <Stack gap="md">
          <Toolbar
            left={
              <Inline gap="md" align="center">
                <Select
                  label="Select Customer Tenant"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
                />
              </Inline>
            }
            right={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => selectedTenantId && fetchTenantModules(selectedTenantId)}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {loading && <LoadingState label="Loading application catalog..." />}

          {!loading && (
            <Grid columns={1} gap="md">
              {catalog.map((item) => {
                const status = getStatusForModule(item.code);
                const isEnabled = status === 'enabled';
                const isUpdating = updatingCode === item.code;

                return (
                  <Card key={item.code}>
                    <Inline justify="between" align="center">
                      <Stack gap="xs">
                        <Inline gap="sm" align="center">
                          <strong>{item.name}</strong>
                          <code>{item.code}</code>
                          <Badge variant={isEnabled ? 'success' : 'neutral'}>
                            {status.toUpperCase()}
                          </Badge>
                          <Badge variant="info">{item.category}</Badge>
                        </Inline>
                        <span>{item.description}</span>
                        <span className="bezent-caption">
                          Version {item.version} • Availability: {item.availability}
                        </span>
                      </Stack>

                      <Inline gap="md" align="center">
                        <Switch
                          checked={isEnabled}
                          disabled={isUpdating || !selectedTenantId}
                          onChange={() => handleToggleModule(item.code, isEnabled)}
                        />
                        <span className="bezent-caption">
                          {isUpdating ? 'Updating...' : isEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </Inline>
                    </Inline>
                  </Card>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Card>
    </Page>
  );
}
