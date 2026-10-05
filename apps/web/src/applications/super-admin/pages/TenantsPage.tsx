import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Card,
  Stack,
  Inline,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Button,
  Input,
  Select,
  Alert,
  LoadingState,
  EmptyState,
  Modal,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { superAdminApi, type TenantRecord } from '../api/superAdminApi';

export function TenantsPage({
  initialTenants,
  initialLoading = true,
}: {
  initialTenants?: TenantRecord[];
  initialLoading?: boolean;
} = {}) {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRecord[]>(initialTenants ?? []);
  const [total, setTotal] = useState<number>(initialTenants?.length ?? 0);
  const [loading, setLoading] = useState<boolean>(initialTenants ? false : initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [attentionFilter, setAttentionFilter] = useState<string>('all');

  // Edit Tenant Modal State
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [editData, setEditData] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Change Confirmation Modal State
  const [statusTarget, setStatusTarget] = useState<TenantRecord | null>(null);
  const [submittingStatus, setSubmittingStatus] = useState<boolean>(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await superAdminApi.listTenants({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        moduleCode: moduleFilter !== 'all' ? moduleFilter : undefined,
        attention: attentionFilter !== 'all' ? attentionFilter : undefined,
      });
      setTenants(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, moduleFilter, attentionFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleOpenEdit = (tenant: TenantRecord) => {
    setEditingTenant(tenant);
    setEditData({
      name: tenant.name,
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    if (!editData.name.trim()) {
      setEditError('Tenant Name is required');
      return;
    }

    setSubmittingEdit(true);
    setEditError(null);
    try {
      await superAdminApi.updateTenant(editingTenant.id, {
        name: editData.name.trim(),
        contactEmail: editData.contactEmail.trim() || undefined,
        contactPhone: editData.contactPhone.trim() || undefined,
      });
      setIsEditOpen(false);
      setEditingTenant(null);
      await fetchTenants();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    setSubmittingStatus(true);
    try {
      if (statusTarget.status === 'active') {
        await superAdminApi.suspendTenant(statusTarget.id);
      } else {
        await superAdminApi.activateTenant(statusTarget.id);
      }
      setStatusTarget(null);
      await fetchTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change tenant status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const renderHealthBadge = (tenant: TenantRecord) => {
    const health = tenant.health;
    if (!health || !health.status || !['healthy', 'needs_attention', 'critical'].includes(health.status)) {
      return <Badge variant="neutral">Health unavailable</Badge>;
    }

    const reasons: string[] = Array.isArray(health.reasons)
      ? health.reasons.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      : typeof health.reason === 'string' && health.reason.trim()
        ? [health.reason.trim()]
        : [];

    const variant =
      health.status === 'healthy' ? 'success' : health.status === 'critical' ? 'danger' : 'warning';

    const label =
      health.status === 'healthy'
        ? 'Healthy'
        : health.status === 'critical'
          ? 'Critical'
          : 'Needs Attention';

    return (
      <Stack gap="xs">
        <Inline gap="xs" align="center">
          <Badge variant={variant}>{label}</Badge>
        </Inline>
        {reasons.length > 0 && health.status !== 'healthy' && (
          <span className="bezent-caption" title={reasons.join(', ')}>
            {reasons[0]}
          </span>
        )}
      </Stack>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Tenants / Customers"
        subtitle="Manage customer account isolation, status lifecycle, application entitlements, and deterministic attention states."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/super-admin/provisioning')}
            leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
          >
            Add Customer
          </Button>
        }
      />

      {error && (
        <Alert variant="error" title="Action failed" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Stack gap="md">
          {/* Filter Toolbar */}
          <Toolbar
            left={
              <Inline gap="md" align="center">
                <Input
                  placeholder="Search by customer name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'suspended', label: 'Suspended Only' },
                  ]}
                />
                <Select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Applications' },
                    { value: 'hrms', label: 'HRMS Entitled' },
                    { value: 'crm', label: 'CRM Entitled' },
                    { value: 'project_management', label: 'Project Mgmt Entitled' },
                  ]}
                />
                <Select
                  value={attentionFilter}
                  onChange={(e) => setAttentionFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Attention States' },
                    { value: 'healthy', label: 'Healthy' },
                    { value: 'needs_attention', label: 'Needs Attention' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                />
              </Inline>
            }
            right={
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchTenants}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {loading && <LoadingState label="Loading customer tenants..." />}

          {!loading && tenants.length === 0 && (
            <EmptyState
              title="No customer tenants found"
              description="No customer tenants match your search and filter criteria or none have been provisioned yet."
              primaryAction={{
                label: 'Add Customer',
                onClick: () => navigate('/super-admin/provisioning'),
              }}
            />
          )}

          {!loading && tenants.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Customer / Tenant</TableHeaderCell>
                  <TableHeaderCell>Companies</TableHeaderCell>
                  <TableHeaderCell>Applications</TableHeaderCell>
                  <TableHeaderCell>Customer Health / Attention</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => {
                  const apps = tenant.activeModules || [];
                  const companiesCount = tenant.companiesCount ?? tenant.companies?.length ?? 0;
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Stack gap="xs">
                          <strong>{tenant.name}</strong>
                          <Inline gap="xs" align="center">
                            <code>{tenant.code}</code>
                            <span className="bezent-caption">•</span>
                            <span className="bezent-caption">{tenant.contactEmail || 'No email'}</span>
                          </Inline>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack gap="xs">
                          <span>
                            {companiesCount} {companiesCount === 1 ? 'company' : 'companies'}
                          </span>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {apps.length === 0 ? (
                          <span className="bezent-caption">No active apps</span>
                        ) : (
                          <Inline gap="xs">
                            {apps.map((appCode) => (
                              <Badge key={appCode} variant="neutral" size="sm">
                                {appCode === 'project_management' ? 'PM' : appCode.toUpperCase()}
                              </Badge>
                            ))}
                          </Inline>
                        )}
                      </TableCell>
                      <TableCell>{renderHealthBadge(tenant)}</TableCell>
                      <TableCell>
                        <Badge status={tenant.status}>{tenant.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Inline gap="sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(tenant)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={tenant.status === 'active' ? 'danger' : 'secondary'}
                            size="sm"
                            onClick={() => setStatusTarget(tenant)}
                          >
                            {tenant.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </Button>
                        </Inline>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loading && total > 0 && (
            <span className="bezent-caption">
              Showing {tenants.length} of {total} customer tenants
            </span>
          )}
        </Stack>
      </Card>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Customer Tenant"
        description="Update administrative and contact metadata for this customer domain."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={submittingEdit}>
              {submittingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <Stack gap="md">
            {editError && (
              <Alert variant="error" title="Validation Error">
                {editError}
              </Alert>
            )}

            <Input
              label="Customer / Tenant Name *"
              placeholder="e.g. Acme Corporation"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />

            <Input
              label="Contact Email"
              type="email"
              placeholder="admin@acme.com"
              value={editData.contactEmail}
              onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
            />

            <Input
              label="Contact Phone"
              placeholder="+1-555-0100"
              value={editData.contactPhone}
              onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
            />
          </Stack>
        </form>
      </Modal>

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={statusTarget?.status === 'active' ? 'Suspend Customer Tenant' : 'Reactivate Customer Tenant'}
        description={
          statusTarget?.status === 'active'
            ? `Suspending customer '${statusTarget?.name}' will immediately revoke access to all business applications for every company and user under this account. Active sessions will be terminated.`
            : `Reactivating customer '${statusTarget?.name}' will restore access to all entitled applications and authorized users under this customer domain.`
        }
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={statusTarget?.status === 'active' ? 'danger' : 'primary'}
              onClick={handleConfirmStatusChange}
              disabled={submittingStatus}
            >
              {submittingStatus
                ? 'Processing...'
                : statusTarget?.status === 'active'
                  ? 'Confirm Suspension'
                  : 'Confirm Reactivation'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="sm">
          <Alert
            variant={statusTarget?.status === 'active' ? 'warning' : 'info'}
            title={statusTarget?.status === 'active' ? 'Tenant Isolation Impact' : 'Access Restoration'}
          >
            {statusTarget?.status === 'active'
              ? 'This is a customer-wide action. All companies associated with this tenant will be inaccessible by company administrators and employees until reactivated.'
              : 'The customer tenant will return to active operational state. Company-level access configurations will resume immediately.'}
          </Alert>
        </Stack>
      </Modal>
    </Page>
  );
}
