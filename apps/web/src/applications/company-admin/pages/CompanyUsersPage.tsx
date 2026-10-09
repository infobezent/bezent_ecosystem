import { useState, useEffect, useCallback } from 'react';
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
  Toolbar,
  Modal,
  FormField,
  Grid,
  Divider,
  Section,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type CompanyUserItem,
  type InviteCompanyUserInput,
  type UserCompanyAccess,
  type RoleDefinition,
} from '../api/companyAdminApi';

export function CompanyUsersPage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [users, setUsers] = useState<CompanyUserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteData, setInviteData] = useState<InviteCompanyUserInput>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee',
  });
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteResultNotice, setInviteResultNotice] = useState<string | null>(null);

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState<CompanyUserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    'company_admin' | 'hr_manager' | 'employee' | 'user'
  >('employee');
  const [updatingRole, setUpdatingRole] = useState<boolean>(false);

  // User Details Modal
  const [viewingUser, setViewingUser] = useState<CompanyUserItem | null>(null);
  const [userAccess, setUserAccess] = useState<UserCompanyAccess | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [rolesCatalog, setRolesCatalog] = useState<RoleDefinition[]>([]);
  const [assigningRoleId, setAssigningRoleId] = useState<string>('');
  const [isAssigningRole, setIsAssigningRole] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.listUsers(
        {
          search: search.trim() || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
        activeCompanyId,
      );
      setUsers(res.users);
      setTotal(res.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company users');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    setInviting(true);
    setError(null);
    setSuccess(null);
    setInviteResultNotice(null);

    try {
      const res = await companyAdminApi.inviteUser(inviteData, activeCompanyId);
      setSuccess(`Invitation created for ${inviteData.email}.`);
      if (res.notice) {
        setInviteResultNotice(`${res.notice} Token: ${res.invitation.token}`);
      }
      setShowInviteModal(false);
      setInviteData({ email: '', firstName: '', lastName: '', role: 'employee' });
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!activeCompanyId || !editingUser) return;
    setUpdatingRole(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await companyAdminApi.updateUserRole(
        editingUser.userId,
        selectedRole,
        activeCompanyId,
      );
      setSuccess(res.message);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleToggleStatus = async (user: CompanyUserItem) => {
    if (!activeCompanyId) return;
    const newStatus = user.membershipStatus === 'active' ? 'inactive' : 'active';
    setError(null);
    setSuccess(null);

    try {
      const res = await companyAdminApi.updateUserStatus(user.userId, newStatus, activeCompanyId);
      setSuccess(res.message);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user membership status');
    }
  };

  const handleRevokeMembership = async (user: CompanyUserItem) => {
    if (!activeCompanyId) return;
    if (
      !window.confirm(
        `Revoke company membership for ${user.firstName} ${user.lastName} (${user.email})?`,
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await companyAdminApi.revokeMembership(user.userId, activeCompanyId);
      setSuccess(res.message);
      fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke company membership');
    }
  };

  const openUserDetails = async (user: CompanyUserItem) => {
    setViewingUser(user);
    setUserAccess(null);
    setDetailsError(null);
    setLoadingDetails(true);
    setAssigningRoleId('');
    try {
      const [accessRes, rolesRes] = await Promise.all([
        companyAdminApi.getUserAccess(user.userId, activeCompanyId || undefined),
        companyAdminApi.getRoles(activeCompanyId || undefined),
      ]);
      setUserAccess(accessRes);
      setRolesCatalog(rolesRes);
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load user access details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAssignRoleFromDetails = async () => {
    if (!activeCompanyId || !viewingUser || !assigningRoleId) return;
    setIsAssigningRole(true);
    setDetailsError(null);
    try {
      const updatedAccess = await companyAdminApi.assignRole(
        viewingUser.userId,
        assigningRoleId,
        activeCompanyId,
      );
      setUserAccess(updatedAccess);
      setAssigningRoleId('');
      fetchUsers();
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to assign role');
    } finally {
      setIsAssigningRole(false);
    }
  };

  const handleRevokeRoleFromDetails = async (roleId: string, roleName: string) => {
    if (!activeCompanyId || !viewingUser) return;
    if (!window.confirm(`Revoke role "${roleName}" from ${viewingUser.email}?`)) return;
    setDetailsError(null);
    try {
      const updatedAccess = await companyAdminApi.revokeRole(
        viewingUser.userId,
        roleId,
        activeCompanyId,
      );
      setUserAccess(updatedAccess);
      fetchUsers();
    } catch (err: unknown) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to revoke role');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Company User Directory"
        subtitle={`Authorized users, roles, and membership access in ${activeCompany?.name || 'Company'}`}
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchUsers}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowInviteModal(true)}
              leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
            >
              Invite User
            </Button>
          </Inline>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchUsers()} />

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

      {inviteResultNotice && (
        <Alert variant="info" title="Invitation Dispatch Note">
          {inviteResultNotice}
        </Alert>
      )}

      <Stack gap="md">
        {/* Search & Filter Toolbar */}
        <Card>
          <Toolbar
            left={
              <Inline gap="sm" wrap align="center">
                <Input
                  id="user-search"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  id="filter-role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'company_admin', label: 'Company Admin' },
                    { value: 'hr_manager', label: 'HR Manager' },
                    { value: 'employee', label: 'Employee' },
                    { value: 'user', label: 'Standard User' },
                  ]}
                />
                <Select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Membership' },
                    { value: 'inactive', label: 'Inactive Membership' },
                    { value: 'revoked', label: 'Revoked Membership' },
                  ]}
                />
              </Inline>
            }
            right={<Badge variant="neutral">Total Users: {total}</Badge>}
          />
        </Card>

        {loading && users.length === 0 ? (
          <LoadingState label="Loading company users..." />
        ) : users.length === 0 ? (
          <Card>
            <EmptyState
              title="No Users Found"
              description="No authorized users matched your current search filters. Use 'Invite User' to add members."
            />
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell>Company Role</TableHeaderCell>
                  <TableHeaderCell>Membership</TableHeaderCell>
                  <TableHeaderCell>Invitation</TableHeaderCell>
                  <TableHeaderCell>User Account</TableHeaderCell>
                  <TableHeaderCell>Joined</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Stack gap="none">
                        <strong>
                          {u.firstName} {u.lastName}
                        </strong>
                        {u.phone && <span className="bezent-metric-label">{u.phone}</span>}
                      </Stack>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.role === 'company_admin'
                            ? 'info'
                            : u.role === 'hr_manager'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {u.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.membershipStatus === 'active'
                            ? 'success'
                            : u.membershipStatus === 'inactive'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {u.membershipStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.invitationStatus ? (
                        <Badge
                          variant={
                            u.invitationStatus === 'pending'
                              ? 'warning'
                              : u.invitationStatus === 'accepted'
                                ? 'success'
                                : 'neutral'
                          }
                        >
                          {u.invitationStatus.toUpperCase()}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">DIRECT</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          u.userStatus === 'active'
                            ? 'success'
                            : u.userStatus === 'inactive'
                              ? 'neutral'
                              : 'danger'
                        }
                      >
                        {u.userStatus.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(u.joinedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Inline gap="xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUserDetails(u)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(u);
                            setSelectedRole(u.role);
                          }}
                        >
                          Role
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(u)}>
                          {u.membershipStatus === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRevokeMembership(u)}>
                          Revoke
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </Stack>

      {/* Invite User Modal */}
      {showInviteModal && (
        <Modal
          title="Invite User to Company"
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        >
          <form onSubmit={handleInvite}>
            <Stack gap="md">
              <FormField label="First Name" htmlFor="invite-firstName" required>
                <Input
                  id="invite-firstName"
                  required
                  value={inviteData.firstName}
                  onChange={(e) =>
                    setInviteData((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  placeholder="e.g. Jane"
                />
              </FormField>

              <FormField label="Last Name" htmlFor="invite-lastName" required>
                <Input
                  id="invite-lastName"
                  required
                  value={inviteData.lastName}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="e.g. Doe"
                />
              </FormField>

              <FormField label="Email Address" htmlFor="invite-email" required>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="jane.doe@company.com"
                />
              </FormField>

              <FormField label="Company Role" htmlFor="invite-role" required>
                <Select
                  id="invite-role"
                  value={inviteData.role}
                  onChange={(e) =>
                    setInviteData((prev) => ({
                      ...prev,
                      role: e.target.value as 'company_admin' | 'hr_manager' | 'employee' | 'user',
                    }))
                  }
                  options={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'hr_manager', label: 'HR Manager' },
                    { value: 'company_admin', label: 'Company Admin' },
                    { value: 'user', label: 'Standard User' },
                  ]}
                />
              </FormField>

              <Inline align="end" gap="sm">
                <Button variant="secondary" type="button" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={inviting}>
                  {inviting ? 'Sending Invite...' : 'Send Invitation'}
                </Button>
              </Inline>
            </Stack>
          </form>
        </Modal>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <Modal
          title={`Assign Role — ${editingUser.firstName} ${editingUser.lastName}`}
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
        >
          <Stack gap="md">
            <p>
              Update authorized role for <strong>{editingUser.email}</strong> within{' '}
              {activeCompany?.name}.
            </p>

            <FormField label="Select Role" htmlFor="edit-role">
              <Select
                id="edit-role"
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(
                    e.target.value as 'company_admin' | 'hr_manager' | 'employee' | 'user',
                  )
                }
                options={[
                  { value: 'employee', label: 'Employee (Workforce & ESS)' },
                  { value: 'hr_manager', label: 'HR Manager (HRMS Administration)' },
                  { value: 'company_admin', label: 'Company Admin (Full Company Workspace)' },
                  { value: 'user', label: 'Standard User' },
                ]}
              />
            </FormField>

            <Inline align="end" gap="sm">
              <Button variant="secondary" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateRole} disabled={updatingRole}>
                {updatingRole ? 'Updating...' : 'Save Role Assignment'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* User Details Modal */}
      {viewingUser && (
        <Modal
          title={`User Access Details — ${viewingUser.firstName} ${viewingUser.lastName}`}
          isOpen={Boolean(viewingUser)}
          onClose={() => setViewingUser(null)}
        >
          <Stack gap="lg">
            {loadingDetails ? (
              <LoadingState label="Loading access authorization details..." />
            ) : detailsError ? (
              <Alert variant="error" title="Access Resolution Error">
                {detailsError}
              </Alert>
            ) : userAccess ? (
              <>
                {/* 1. Global Identity vs Company Scope */}
                <Card>
                  <Stack gap="md">
                    <strong>Identity & Scope Distinction</strong>
                    <Grid columns={2} gap="md">
                      <Stack gap="xs">
                        <span className="bezent-metric-label">GLOBAL IDENTITY</span>
                        <div><strong>Email:</strong> {userAccess.email}</div>
                        <div><strong>Global User ID:</strong> <span className="bezent-metric-label">{userAccess.userId}</span></div>
                        <Inline gap="xs" align="center">
                          <span>Account Status:</span>
                          <Badge variant={viewingUser.userStatus === 'active' ? 'success' : 'danger'}>
                            {viewingUser.userStatus.toUpperCase()}
                          </Badge>
                        </Inline>
                        <div>
                          <strong>Last Sign-In:</strong>{' '}
                          {viewingUser.lastLoginAt
                            ? new Date(viewingUser.lastLoginAt).toLocaleString()
                            : 'Never'}
                        </div>
                      </Stack>
                      <Stack gap="xs">
                        <span className="bezent-metric-label">COMPANY MEMBERSHIP</span>
                        <div><strong>Company:</strong> {activeCompany?.name} ({activeCompany?.code})</div>
                        <Inline gap="xs" align="center">
                          <span>Membership Status:</span>
                          <Badge
                            variant={
                              userAccess.membershipStatus === 'active'
                                ? 'success'
                                : userAccess.membershipStatus === 'inactive'
                                  ? 'warning'
                                  : 'danger'
                            }
                          >
                            {userAccess.membershipStatus.toUpperCase()}
                          </Badge>
                        </Inline>
                        <Inline gap="xs" align="center">
                          <span>Invitation Lifecycle:</span>
                          <Badge
                            variant={
                              viewingUser.invitationStatus === 'pending'
                                ? 'warning'
                                : viewingUser.invitationStatus === 'accepted'
                                  ? 'success'
                                  : 'neutral'
                            }
                          >
                            {(viewingUser.invitationStatus || 'direct').toUpperCase()}
                          </Badge>
                        </Inline>
                        <div><strong>Member Since:</strong> {new Date(viewingUser.joinedAt).toLocaleDateString()}</div>
                      </Stack>
                    </Grid>
                  </Stack>
                </Card>

                {/* 2. Assigned Roles (RBAC) */}
                <Card>
                  <Stack gap="md">
                    <Inline justify="between" align="center">
                      <strong>Assigned Company Roles ({userAccess.roles.length})</strong>
                      <span className="bezent-metric-label">Scoped strictly to {activeCompany?.name}</span>
                    </Inline>

                    {userAccess.roles.length === 0 ? (
                      <p className="bezent-metric-label">No explicit roles assigned in this company.</p>
                    ) : (
                      <Stack gap="sm">
                        {userAccess.roles.map((r) => (
                          <Card key={r.id}>
                            <Inline justify="between" align="center">
                              <Stack gap="none">
                                <strong>{r.name}</strong>
                                <span className="bezent-metric-label">Code: {r.code} {r.moduleCode ? `• Application: ${r.moduleCode.toUpperCase()}` : '• Company Admin'}</span>
                              </Stack>
                              <Inline gap="xs" align="center">
                                <Badge variant={r.isSystem ? 'info' : 'neutral'}>
                                  {r.isSystem ? 'SYSTEM' : 'CUSTOM'}
                                </Badge>
                                {userAccess.roles.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeRoleFromDetails(r.id, r.name)}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </Inline>
                            </Inline>
                          </Card>
                        ))}
                      </Stack>
                    )}

                    <Divider />

                    {/* Assign Additional Role */}
                    <Stack gap="xs">
                      <strong>Assign Additional Role</strong>
                      <Inline gap="sm" align="center">
                        <Select
                          id="assign-new-role"
                          value={assigningRoleId}
                          onChange={(e) => setAssigningRoleId(e.target.value)}
                          options={[
                            { value: '', label: 'Select role to assign...' },
                            ...rolesCatalog
                              .filter((rc) => !userAccess.roles.some((held) => held.id === rc.id || held.code === rc.code))
                              .map((rc) => ({
                                value: rc.id,
                                label: `${rc.name} (${rc.isSystem ? 'System' : 'Custom'}${rc.moduleCode ? ` • ${rc.moduleCode.toUpperCase()}` : ''})`,
                              })),
                          ]}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!assigningRoleId || isAssigningRole}
                          onClick={handleAssignRoleFromDetails}
                        >
                          {isAssigningRole ? 'Assigning...' : 'Assign Role'}
                        </Button>
                      </Inline>
                    </Stack>
                  </Stack>
                </Card>

                {/* 3. Application Access & ESS Entitlements */}
                <Card>
                  <Stack gap="sm">
                    <strong>Application Access & Self-Service</strong>
                    <Grid columns={3} gap="sm">
                      <Card>
                        <Stack gap="none">
                          <span className="bezent-metric-label">HRMS WORKFORCE</span>
                          <strong>
                            {userAccess.roles.some((r) => r.moduleCode === 'hrms' || r.code === 'company_admin')
                              ? 'Authorized'
                              : 'Standard'}
                          </strong>
                        </Stack>
                      </Card>
                      <Card>
                        <Stack gap="none">
                          <span className="bezent-metric-label">EMPLOYEE SELF-SERVICE</span>
                          <Inline gap="xs" align="center">
                            <Badge variant={userAccess.essEligible ? 'success' : 'neutral'}>
                              {userAccess.essEligible ? 'ELIGIBLE' : 'NOT LINKED'}
                            </Badge>
                          </Inline>
                        </Stack>
                      </Card>
                      <Card>
                        <Stack gap="none">
                          <span className="bezent-metric-label">ADMIN OVERSIGHT</span>
                          <strong>
                            {userAccess.roles.some((r) => r.code === 'company_admin')
                              ? 'Company Administrator'
                              : 'Member'}
                          </strong>
                        </Stack>
                      </Card>
                    </Grid>
                  </Stack>
                </Card>

                {/* 4. Effective Permissions */}
                <Card>
                  <Stack gap="sm">
                    <Inline justify="between" align="center">
                      <strong>Effective Permissions ({userAccess.effectivePermissions.length})</strong>
                      <span className="bezent-metric-label">Consolidated authority matrix</span>
                    </Inline>
                    <Inline gap="xs" wrap>
                      {userAccess.effectivePermissions.map((perm) => (
                        <Badge key={perm} variant="neutral" size="sm">
                          {perm}
                        </Badge>
                      ))}
                    </Inline>
                  </Stack>
                </Card>
              </>
            ) : null}

            <Inline justify="end">
              <Button variant="secondary" onClick={() => setViewingUser(null)}>
                Close
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
