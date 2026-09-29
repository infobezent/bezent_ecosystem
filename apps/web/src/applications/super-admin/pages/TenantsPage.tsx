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

export function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contactEmail: '',
    contactPhone: '',
  });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await superAdminApi.listTenants({
        search: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setTenants(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Tenant Name and Tenant Code are required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await superAdminApi.createTenant({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
      });
      setIsCreateOpen(false);
      setFormData({ name: '', code: '', contactEmail: '', contactPhone: '' });
      await fetchTenants();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: TenantRecord) => {
    try {
      if (tenant.status === 'active') {
        if (!confirm(`Are you sure you want to suspend tenant '${tenant.name}'? Users will be restricted from accessing the application.`)) {
          return;
        }
        await superAdminApi.suspendTenant(tenant.id);
      } else {
        await superAdminApi.activateTenant(tenant.id);
      }
      await fetchTenants();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant status');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Customer Tenants"
        subtitle="Manage customer isolation domains, status lifecycle and contact metadata"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
          >
            Create Tenant
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
                  placeholder="Search tenants by name or code..."
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
              description="No customer tenants match your search filter or none have been provisioned yet."
              primaryAction={{
                label: 'Create Tenant',
                onClick: () => setIsCreateOpen(true),
              }}
            />
          )}

          {!loading && tenants.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Customer / Tenant</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Contact</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Stack gap="xs">
                        <strong>{tenant.name}</strong>
                        <span className="bezent-caption">{tenant.id}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code>{tenant.code}</code>
                    </TableCell>
                    <TableCell>
                      <Stack gap="xs">
                        <span>{tenant.contactEmail || '—'}</span>
                        <span className="bezent-caption">{tenant.contactPhone || ''}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Badge status={tenant.status}>{tenant.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Inline gap="sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                        >
                          Details
                        </Button>
                        <Button
                          variant={tenant.status === 'active' ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleStatus(tenant)}
                        >
                          {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Create Tenant Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Customer Tenant"
        description="Establish a new customer root isolation boundary in the BEZENT platform."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Tenant'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          <Stack gap="md">
            {formError && (
              <Alert variant="error" title="Validation Error">
                {formError}
              </Alert>
            )}

            <Input
              label="Customer / Tenant Name *"
              placeholder="e.g. Acme Corporation"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Tenant Code *"
              placeholder="e.g. ACME"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helperText="Unique uppercase identifier for this customer domain"
              required
            />

            <Input
              label="Primary Contact Email"
              type="email"
              placeholder="admin@acme.com"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            />

            <Input
              label="Primary Contact Phone"
              placeholder="+1-555-0100"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
          </Stack>
        </form>
      </Modal>
    </Page>
  );
}
