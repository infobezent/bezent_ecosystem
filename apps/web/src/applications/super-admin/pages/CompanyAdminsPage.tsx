import { useState, useEffect, useCallback, type FormEvent } from 'react';
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
import {
  superAdminApi,
  type CompanyAdminAssignment,
  type TenantRecord,
  type CompanyRecord,
} from '../api/superAdminApi';

export function CompanyAdminsPage() {
  const [admins, setAdmins] = useState<CompanyAdminAssignment[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');

  // Modal State
  const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [assignMode, setAssignMode] = useState<'create' | 'existing'>('create');
  const [modalTenantId, setModalTenantId] = useState<string>('');
  const [modalCompanyId, setModalCompanyId] = useState<string>('');
  const [existingUserId, setExistingUserId] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [adminsRes, tenantsRes, companiesRes] = await Promise.all([
        superAdminApi.listCompanyAdmins({
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
        }),
        superAdminApi.listTenants({ limit: 100 }),
        superAdminApi.listCompanies(),
      ]);
      setAdmins(adminsRes);
      setTenants(tenantsRes.items);
      setCompanies(companiesRes.items);
      if (!modalTenantId && tenantsRes.items.length > 0) {
        setModalTenantId(tenantsRes.items[0]!.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company administrators');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, modalTenantId]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAssignSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!modalTenantId) {
      setFormError('Tenant selection is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await superAdminApi.assignCompanyAdmin({
        tenantId: modalTenantId,
        companyId: modalCompanyId || undefined,
        userId: assignMode === 'existing' ? existingUserId.trim() : undefined,
        newUser:
          assignMode === 'create'
            ? {
                email: newEmail.trim().toLowerCase(),
                firstName: newFirstName.trim(),
                lastName: newLastName.trim(),
                password: newPassword || undefined,
              }
            : undefined,
      });

      setIsAssignOpen(false);
      setExistingUserId('');
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewPassword('');
      await fetchAdmins();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to assign administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (admin: CompanyAdminAssignment) => {
    if (!confirm(`Are you sure you want to revoke Company Admin access for ${admin.user.email}?`)) {
      return;
    }
    try {
      await superAdminApi.revokeCompanyAdmin(admin.id);
      await fetchAdmins();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke administrator');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Company Administrators"
        subtitle="Manage designated company administrators assigned to customer tenants"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsAssignOpen(true)}
            leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
          >
            Assign Company Admin
          </Button>
        }
      />

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Stack gap="md">
          {/* Toolbar */}
          <Toolbar
            left={
              <Inline gap="md" align="center">
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Customer Tenants' },
                    ...tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                  ]}
                />
              </Inline>
            }
            right={
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchAdmins}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {loading && <LoadingState label="Loading company administrators..." />}

          {!loading && admins.length === 0 && (
            <EmptyState
              title="No company administrators assigned"
              description="No company administrator assignments found for the selected tenant."
              primaryAction={{
                label: 'Assign Company Admin',
                onClick: () => setIsAssignOpen(true),
              }}
            />
          )}

          {!loading && admins.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Administrator</TableHeaderCell>
                  <TableHeaderCell>Customer Tenant</TableHeaderCell>
                  <TableHeaderCell>Company</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Assigned Date</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Stack gap="xs">
                        <strong>
                          {item.user.firstName} {item.user.lastName}
                        </strong>
                        <span className="bezent-caption">{item.user.email}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code>{item.tenantName || item.tenantId}</code>
                    </TableCell>
                    <TableCell>{item.companyName || 'Tenant-wide'}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'active' ? 'success' : 'neutral'}>
                        {item.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.assignedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {item.status === 'active' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevoke(item)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Card>

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Assign Company Administrator"
        description="Grant Company Admin permissions to a user for a specific customer tenant."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignSubmit} disabled={submitting}>
              {submitting ? 'Assigning...' : 'Assign Administrator'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleAssignSubmit}>
          <Stack gap="md">
            {formError && (
              <Alert variant="error" title="Validation Error">
                {formError}
              </Alert>
            )}

            <Select
              label="Target Customer Tenant *"
              value={modalTenantId}
              onChange={(e) => setModalTenantId(e.target.value)}
              options={tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
              required
            />

            <Select
              label="Target Company (Optional)"
              value={modalCompanyId}
              onChange={(e) => setModalCompanyId(e.target.value)}
              options={[
                { value: '', label: 'All Companies under Tenant (Tenant-wide)' },
                ...companies
                  .filter((c) => !modalTenantId || c.tenantId === modalTenantId)
                  .map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
              ]}
            />

            <Select
              label="User Mode"
              value={assignMode}
              onChange={(e) => setAssignMode(e.target.value as 'create' | 'existing')}
              options={[
                { value: 'create', label: 'Create New User Account' },
                { value: 'existing', label: 'Assign Existing User ID' },
              ]}
            />

            {assignMode === 'existing' ? (
              <Input
                label="Existing User ID *"
                placeholder="e.g. usr_12345678"
                value={existingUserId}
                onChange={(e) => setExistingUserId(e.target.value)}
                required
              />
            ) : (
              <Stack gap="md">
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="admin@customer.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
                <Inline gap="md">
                  <Input
                    label="First Name *"
                    placeholder="Jane"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                  />
                  <Input
                    label="Last Name *"
                    placeholder="Doe"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                  />
                </Inline>
                <Input
                  label="Initial Password"
                  placeholder="Optional temporary password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Stack>
            )}
          </Stack>
        </form>
      </Modal>
    </Page>
  );
}
