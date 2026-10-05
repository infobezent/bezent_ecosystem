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
      setError(err instanceof Error ? err.message : 'Failed to load application catalog');
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
      setError(err instanceof Error ? err.message : 'Failed to load application statuses');
    }
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTenantModules(selectedTenantId);
    }
  }, [selectedTenantId, fetchTenantModules]);

  const handleToggleModule = async (item: ModuleCatalogItem, isEnabled: boolean) => {
    if (!selectedTenantId) return;

    if (!isEnabled && item.availability === 'Planned') {
      setError('This application is planned and is not yet available for customer entitlement.');
      return;
    }

    if (isEnabled) {
      const confirmDisable = confirm(
        `Disabling this application for the customer will immediately restrict access for all companies under this customer.\n\nExisting company configuration will be preserved if the application is enabled again.\n\nDo you want to proceed?`,
      );
      if (!confirmDisable) {
        return;
      }
    }

    setUpdatingCode(item.code);
    setError(null);
    setSuccess(null);
    try {
      if (isEnabled) {
        await superAdminApi.disableModule(selectedTenantId, item.code);
        setSuccess(`Application '${item.name}' has been disabled for this customer.`);
      } else {
        await superAdminApi.enableModule(selectedTenantId, item.code);
        setSuccess(`Application '${item.name}' has been enabled for this customer.`);
      }
      await fetchTenantModules(selectedTenantId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle application entitlement');
    } finally {
      setUpdatingCode(null);
    }
  };

  const getStatusForModule = (code: string): 'enabled' | 'disabled' => {
    const found = moduleStatuses.find((m) => m.moduleCode === code && m.companyId === null);
    if (found) return found.status;
    return code === 'hrms' ? 'enabled' : 'disabled';
  };

  return (
    <Page>
      <PageHeader
        title="Application Access Management"
        subtitle="Manage customer-level application entitlement ceilings across the BEZENT ecosystem."
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
                  label="Select Customer"
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
                const isPlanned = item.availability === 'Planned';
                const switchDisabled = isUpdating || !selectedTenantId || (isPlanned && !isEnabled);

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
                          {isPlanned ? (
                            isEnabled ? (
                              <Badge variant="warning">Legacy Enabled</Badge>
                            ) : (
                              <Badge variant="neutral">Coming Soon</Badge>
                            )
                          ) : (
                            <Badge variant="success">Generally Available</Badge>
                          )}
                        </Inline>
                        <span>{item.description}</span>
                        <span className="bezent-caption">
                          Version {item.version} • Availability: {isPlanned ? 'Coming Soon' : 'Generally Available'}
                        </span>
                        {isPlanned && !isEnabled && (
                          <span className="bezent-caption">
                            Coming Soon — Not available for new enablement
                          </span>
                        )}
                        {isPlanned && isEnabled && (
                          <span className="bezent-caption">
                            Enabled via legacy configuration. Can be disabled to enforce customer ceiling.
                          </span>
                        )}
                      </Stack>

                      <Inline gap="md" align="center">
                        <Switch
                          checked={isEnabled}
                          disabled={switchDisabled}
                          onChange={() => handleToggleModule(item, isEnabled)}
                        />
                        <span className="bezent-caption">
                          {isUpdating
                            ? 'Updating...'
                            : isPlanned && !isEnabled
                              ? 'Unavailable'
                              : isEnabled
                                ? 'Enabled'
                                : 'Disabled'}
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
