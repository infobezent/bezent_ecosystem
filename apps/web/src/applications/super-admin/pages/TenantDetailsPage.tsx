import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
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
  Alert,
  LoadingState,
  Modal,
} from '../../../design-system/components';
import {
  superAdminApi,
  type TenantRecord,
  type CompanyRecord,
  type TenantModuleStatus,
} from '../api/superAdminApi';

export function TenantDetailsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [modules, setModules] = useState<TenantModuleStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editData, setEditData] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [saving, setSaving] = useState<boolean>(false);

  const fetchTenantDetails = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [tenantRes, companiesRes, modulesRes] = await Promise.all([
        superAdminApi.getTenant(tenantId),
        superAdminApi.listCompanies({ tenantId }),
        superAdminApi.getTenantModules(tenantId),
      ]);
      setTenant(tenantRes);
      setCompanies(companiesRes.items);
      setModules(modulesRes);
      setEditData({
        name: tenantRes.name,
        contactEmail: tenantRes.contactEmail || '',
        contactPhone: tenantRes.contactPhone || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenantDetails();
  }, [fetchTenantDetails]);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      const updated = await superAdminApi.updateTenant(tenantId, {
        name: editData.name.trim(),
        contactEmail: editData.contactEmail.trim() || undefined,
        contactPhone: editData.contactPhone.trim() || undefined,
      });
      setTenant(updated);
      setIsEditOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleModule = async (moduleCode: string, currentStatus: string) => {
    if (!tenantId) return;
    try {
      if (currentStatus === 'enabled') {
        await superAdminApi.disableModule(tenantId, moduleCode);
      } else {
        await superAdminApi.enableModule(tenantId, moduleCode);
      }
      const updatedModules = await superAdminApi.getTenantModules(tenantId);
      setModules(updatedModules);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle module entitlement');
    }
  };

  const handleToggleStatus = async () => {
    if (!tenant || !tenantId) return;
    try {
      if (tenant.status === 'active') {
        if (!confirm(`Are you sure you want to suspend '${tenant.name}'?`)) return;
        const res = await superAdminApi.suspendTenant(tenantId);
        setTenant(res);
      } else {
        const res = await superAdminApi.activateTenant(tenantId);
        setTenant(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    }
  };

  if (loading && !tenant) {
    return (
      <Page>
        <LoadingState label="Loading tenant profile..." />
      </Page>
    );
  }

  if (!tenant) {
    return (
      <Page>
        <Alert variant="error" title="Tenant not found">
          The requested tenant does not exist or has been removed.
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
          Return to Tenants
        </Button>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={tenant.name}
        subtitle={`Tenant ID: ${tenant.id} • Code: ${tenant.code}`}
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
              Back to Tenants
            </Button>
            <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
              Edit Info
            </Button>
            <Button
              variant={tenant.status === 'active' ? 'danger' : 'secondary'}
              onClick={handleToggleStatus}
            >
              {tenant.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack gap="lg">
        {/* Profile Card */}
        <Card>
          <Section title="Tenant Information" subtitle="Domain and administrative properties">
            <Grid columns={3} gap="md">
              <Stack gap="xs">
                <span className="bezent-caption">Customer Name</span>
                <strong>{tenant.name}</strong>
              </Stack>
              <Stack gap="xs">
                <span className="bezent-caption">Tenant Code</span>
                <code>{tenant.code}</code>
              </Stack>
              <Stack gap="xs">
                <span className="bezent-caption">Status</span>
                <div>
                  <Badge status={tenant.status}>{tenant.status}</Badge>
                </div>
              </Stack>
              <Stack gap="xs">
                <span className="bezent-caption">Contact Email</span>
                <span>{tenant.contactEmail || 'None configured'}</span>
              </Stack>
              <Stack gap="xs">
                <span className="bezent-caption">Contact Phone</span>
                <span>{tenant.contactPhone || 'None configured'}</span>
              </Stack>
              <Stack gap="xs">
                <span className="bezent-caption">Created Date</span>
                <span>{new Date(tenant.createdAt).toLocaleString()}</span>
              </Stack>
            </Grid>
          </Section>
        </Card>

        {/* Modules Entitlements */}
        <Card>
          <Section
            title="Application Module Entitlements"
            subtitle="Control business application entitlements for this customer"
          >
            <Table compact>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Module Code</TableHeaderCell>
                  <TableHeaderCell>Application</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Action</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.map((m) => (
                  <TableRow key={m.id || m.moduleCode}>
                    <TableCell>
                      <code>{m.moduleCode}</code>
                    </TableCell>
                    <TableCell>
                      {m.moduleCode === 'hrms' && 'HRMS & Employee Self-Service'}
                      {m.moduleCode === 'crm' && 'CRM (Customer Relationship Management)'}
                      {m.moduleCode === 'project_management' && 'Project Management & Collaboration'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'enabled' ? 'success' : 'neutral'}>
                        {m.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={m.status === 'enabled' ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleModule(m.moduleCode, m.status)}
                      >
                        {m.status === 'enabled' ? 'Disable' : 'Enable'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </Card>

        {/* Companies under this tenant */}
        <Card>
          <Section
            title={`Companies (${companies.length})`}
            subtitle="Legal entities operating within this tenant domain"
          >
            {companies.length === 0 ? (
              <p>No companies found under this tenant.</p>
            ) : (
              <Table compact>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Company Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Legal Name</TableHeaderCell>
                    <TableHeaderCell>Country</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <strong>{c.name}</strong>
                      </TableCell>
                      <TableCell>
                        <code>{c.code}</code>
                      </TableCell>
                      <TableCell>{c.legalName || '—'}</TableCell>
                      <TableCell>{c.country || '—'}</TableCell>
                      <TableCell>
                        <Badge status={c.status}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/super-admin/companies/${c.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </Card>
      </Stack>

      {/* Edit Tenant Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Tenant Information"
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <Stack gap="md">
            <Input
              label="Customer / Tenant Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />
            <Input
              label="Contact Email"
              type="email"
              value={editData.contactEmail}
              onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
            />
            <Input
              label="Contact Phone"
              value={editData.contactPhone}
              onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
            />
          </Stack>
        </form>
      </Modal>
    </Page>
  );
}
