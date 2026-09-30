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
  Modal,
  Input,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useAuthorization } from '../../../platform/auth';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type PermissionTreeApplication,
  type RoleDefinition,
} from '../api/companyAdminApi';

export function CompanyRolesPage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const { can } = useAuthorization();

  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Custom role creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tree, setTree] = useState<PermissionTreeApplication[]>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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

  const openCreateModal = async () => {
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setCreateError(null);
    setIsCreateOpen(true);
    setLoadingTree(true);

    try {
      const treeData = await companyAdminApi.getPermissionTree(activeCompanyId || undefined);
      setTree(treeData);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to load permission catalog');
    } finally {
      setLoadingTree(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      setCreateError('Role name is required');
      return;
    }
    if (selectedPermissions.length === 0) {
      setCreateError('At least one permission must be selected');
      return;
    }

    setSubmitting(true);
    setCreateError(null);
    try {
      await companyAdminApi.createCustomRole(
        {
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissions: selectedPermissions,
        },
        activeCompanyId || undefined,
      );
      setIsCreateOpen(false);
      await fetchRoles();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRoleStatus = async (role: RoleDefinition) => {
    if (!activeCompanyId || role.isSystem) return;
    const nextStatus = role.status === 'active' ? 'inactive' : 'active';
    try {
      await companyAdminApi.setCustomRoleStatus(role.id, nextStatus, activeCompanyId);
      await fetchRoles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role status');
    }
  };

  const canManageRoles = can('company.roles.manage');

  return (
    <Page>
      <PageHeader
        title="Roles & Permissions"
        subtitle={`Authorized roles and access controls governing ${activeCompany?.name || 'Company'}`}
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchRoles}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            {canManageRoles && (
              <Button
                variant="primary"
                onClick={openCreateModal}
                leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
              >
                Create Custom Role
              </Button>
            )}
          </Inline>
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
                    <Inline justify="between" align="center">
                      <Stack gap="none">
                        <strong>{r.name}</strong>
                        <span className="bezent-metric-label">{r.code || r.id}</span>
                      </Stack>
                      <Inline gap="xs">
                        {r.isSystem ? (
                          <Badge variant="info">SYSTEM</Badge>
                        ) : (
                          <Badge variant="neutral">CUSTOM</Badge>
                        )}
                        <Badge variant={r.status === 'inactive' ? 'danger' : 'success'}>
                          {(r.status || 'active').toUpperCase()}
                        </Badge>
                      </Inline>
                    </Inline>

                    <p>{r.description || 'No description provided.'}</p>

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

                    {!r.isSystem && canManageRoles && (
                      <Inline justify="end">
                        <Button variant="ghost" size="sm" onClick={() => toggleRoleStatus(r)}>
                          {r.status === 'active' ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      </Inline>
                    )}
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Section>
        </Stack>
      )}

      {/* Create Custom Role Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Custom Role"
        description="Compose a scoped role with specific permissions for company personnel."
        size="lg"
        footer={
          <Inline justify="end" gap="sm">
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateRole}
              disabled={submitting || loadingTree}
            >
              {submitting ? 'Creating...' : 'Create Role'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="md">
          {createError && (
            <Alert variant="error" title="Validation Error">
              {createError}
            </Alert>
          )}

          <Input
            label="Role Name"
            placeholder="e.g. Attendance Officer, HR Recruiter"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            disabled={submitting}
            required
          />

          <Input
            label="Description"
            placeholder="Brief explanation of duties and authorization scope"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            disabled={submitting}
          />

          {loadingTree ? (
            <LoadingState label="Loading permission catalog..." />
          ) : (
            <Stack gap="md">
              <span className="bezent-metric-label">
                Select Permissions ({selectedPermissions.length} selected):
              </span>

              {tree.map((app) => (
                <Card key={app.application}>
                  <Stack gap="sm">
                    <strong>{app.label}</strong>
                    {app.modules.map((mod) => (
                      <Stack key={mod.module} gap="xs">
                        <span className="bezent-metric-label">{mod.label}</span>
                        <Inline gap="xs" wrap>
                          {mod.permissions.map((perm) => {
                            const isSelected = selectedPermissions.includes(perm.id);
                            return (
                              <Button
                                key={perm.id}
                                variant={isSelected ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => togglePermission(perm.id)}
                                title={perm.description}
                              >
                                {perm.label}
                              </Button>
                            );
                          })}
                        </Inline>
                      </Stack>
                    ))}
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Modal>
    </Page>
  );
}
