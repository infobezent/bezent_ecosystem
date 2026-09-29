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
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type CompanyUserItem,
  type InviteCompanyUserInput,
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
  const [selectedRole, setSelectedRole] = useState<'company_admin' | 'hr_manager' | 'employee' | 'user'>('employee');
  const [updatingRole, setUpdatingRole] = useState<boolean>(false);

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
      const res = await companyAdminApi.updateUserRole(editingUser.userId, selectedRole, activeCompanyId);
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
    if (!window.confirm(`Revoke company membership for ${user.firstName} ${user.lastName} (${user.email})?`)) {
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
            right={
              <Badge variant="neutral">
                Total Users: {total}
              </Badge>
            }
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
                        <strong>{u.firstName} {u.lastName}</strong>
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
                    <TableCell>
                      {new Date(u.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Inline gap="xs">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.membershipStatus === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeMembership(u)}
                        >
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
                  onChange={(e) =>
                    setInviteData((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  placeholder="e.g. Doe"
                />
              </FormField>

              <FormField label="Email Address" htmlFor="invite-email" required>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData((prev) => ({ ...prev, email: e.target.value }))
                  }
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
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                >
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
              Update authorized role for <strong>{editingUser.email}</strong> within {activeCompany?.name}.
            </p>

            <FormField label="Select Role" htmlFor="edit-role">
              <Select
                id="edit-role"
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(e.target.value as 'company_admin' | 'hr_manager' | 'employee' | 'user')
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
              <Button
                variant="secondary"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateRole}
                disabled={updatingRole}
              >
                {updatingRole ? 'Updating...' : 'Save Role Assignment'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
