import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  FormField,
  Inline,
  Input,
  LoadingState,
  Modal,
  Page,
  PageHeader,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHeaderCell,
  TableHead,
  TableRow,
  Tabs,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { CompanyWorkspaceHeader } from '../components/CompanyWorkspaceHeader';
import { CompanyRolesOverviewTab } from '../components/CompanyRolesOverviewTab';
import { AddCompanyUserModal } from '../components/AddCompanyUserModal';
import { tenantAdminApi, TenantAdminApiError } from '../api/tenantAdminApi';
import type {
  CompanyAccessRole,
  CompanyAccessUserItem,
} from '../types/tenantAdmin.types';

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return (parts[0] || '').slice(0, 2).toUpperCase();
  return (((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '')).toUpperCase() || 'U';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Selected-Company Access Workspace Page.
 *
 * Route: `/tenant-admin/tenant/companies/:companyId/access`
 *
 * Capabilities:
 * 1. Company Users directory (members and pending invitations)
 * 2. Add User modal (Existing tenant user assignment or Invite new user)
 * 3. Role management (Member vs Company Administrator)
 * 4. Revocation and invitation cancellation
 * 5. Read-only Roles & Permissions overview tab
 */
export function CompanyAccessPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { companies, isLoading: isContextLoading } = useTenantAdmin();

  const company = companies.find((c) => c.id === companyId) || null;

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Users data state
  const [users, setUsers] = useState<CompanyAccessUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Filters & search
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Notifications / feedback
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Change Role Modal State
  const [changeRoleTarget, setChangeRoleTarget] = useState<CompanyAccessUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<CompanyAccessRole>('member');
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  // Revoke Access Modal State
  const [revokeTarget, setRevokeTarget] = useState<CompanyAccessUserItem | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [revokeModalError, setRevokeModalError] = useState<string | null>(null);

  // Cancel Invitation Modal State
  const [cancelInvTarget, setCancelInvTarget] = useState<CompanyAccessUserItem | null>(null);
  const [isCancellingInv, setIsCancellingInv] = useState<boolean>(false);
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);

  // Resending invitation state (loading spinner for row)
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoadingUsers(true);
      setUsersError(null);
      const data = await tenantAdminApi.getCompanyAccessUsers(companyId);
      setUsers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load company users';
      setUsersError(msg);
    } finally {
      setLoadingUsers(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (company) {
      loadUsers();
    }
  }, [company, loadUsers]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== 'all') {
        if (u.status !== statusFilter) return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesName = u.name.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }
      return true;
    });
  }, [users, statusFilter, search]);

  // Handlers for Change Role
  const handleOpenChangeRole = (item: CompanyAccessUserItem) => {
    setChangeRoleTarget(item);
    setSelectedNewRole(item.role === 'company_admin' ? 'member' : 'company_admin');
    setRoleModalError(null);
  };

  const handleConfirmChangeRole = async () => {
    if (!companyId || !changeRoleTarget || !changeRoleTarget.userId) return;
    try {
      setIsUpdatingRole(true);
      setRoleModalError(null);
      const res = await tenantAdminApi.updateCompanyUserRole(
        companyId,
        changeRoleTarget.userId,
        { role: selectedNewRole },
      );
      setFeedback(res.message || 'User role updated successfully');
      setChangeRoleTarget(null);
      loadUsers();
    } catch (err) {
      const msg =
        err instanceof TenantAdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to update user role';
      setRoleModalError(msg);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handlers for Revoke Access
  const handleOpenRevoke = (item: CompanyAccessUserItem) => {
    setRevokeTarget(item);
    setRevokeModalError(null);
  };

  const handleConfirmRevoke = async () => {
    if (!companyId || !revokeTarget || !revokeTarget.userId) return;
    try {
      setIsRevoking(true);
      setRevokeModalError(null);
      const res = await tenantAdminApi.revokeCompanyUserAccess(
        companyId,
        revokeTarget.userId,
      );
      setFeedback(res.message || 'Company access revoked successfully');
      setRevokeTarget(null);
      loadUsers();
    } catch (err) {
      const msg =
        err instanceof TenantAdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to revoke company access';
      setRevokeModalError(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  // Handlers for Resend Invitation
  const handleResendInvitation = async (item: CompanyAccessUserItem) => {
    if (!companyId || !item.invitationId) return;
    try {
      setResendingId(item.invitationId);
      const res = await tenantAdminApi.resendCompanyInvitation(
        companyId,
        item.invitationId,
      );
      setFeedback(res.message || `Invitation extended and re-sent to ${item.email}`);
      loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to resend invitation';
      setFeedback(null);
      setUsersError(msg);
    } finally {
      setResendingId(null);
    }
  };

  // Handlers for Cancel Invitation
  const handleOpenCancelInvitation = (item: CompanyAccessUserItem) => {
    setCancelInvTarget(item);
    setCancelModalError(null);
  };

  const handleConfirmCancelInvitation = async () => {
    if (!companyId || !cancelInvTarget || !cancelInvTarget.invitationId) return;
    try {
      setIsCancellingInv(true);
      setCancelModalError(null);
      const res = await tenantAdminApi.cancelCompanyInvitation(
        companyId,
        cancelInvTarget.invitationId,
      );
      setFeedback(res.message || `Invitation for ${cancelInvTarget.email} cancelled successfully`);
      setCancelInvTarget(null);
      loadUsers();
    } catch (err) {
      const msg =
        err instanceof TenantAdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to cancel invitation';
      setCancelModalError(msg);
    } finally {
      setIsCancellingInv(false);
    }
  };

  if (!isContextLoading && !company) {
    return (
      <Page>
        <EmptyState
          title="Company Not Found or Access Denied"
          description={`Company '${companyId}' was not found or belongs to another tenant organization. Cross-tenant access is prohibited.`}
          primaryAction={{
            label: 'Back to Companies',
            onClick: () => navigate('/tenant-admin/tenant/companies'),
          }}
        />
      </Page>
    );
  }

  if (isContextLoading || !company) {
    return (
      <Page>
        <LoadingState label="Loading company workspace..." fill />
      </Page>
    );
  }

  return (
    <Page>
      <Stack gap="lg">
        {/* Canonical Selected-Company Workspace Header */}
        <CompanyWorkspaceHeader
          company={company}
          activeSection="access"
        />

        {/* Section Page Header */}
        <PageHeader
          title="Access"
          subtitle="Manage company users, pending invitations, and delegated administrative permissions."
        />

        {/* Feedback Alert */}
        {feedback && (
          <Alert variant="success" onDismiss={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        {/* Access Workspace Tabs */}
        <Tabs
          items={[
            { id: 'users', label: `Users (${users.length})` },
            { id: 'roles', label: 'Roles & Permissions' },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as 'users' | 'roles')}
        />

        {activeTab === 'roles' ? (
          <CompanyRolesOverviewTab companyId={company.id} />
        ) : (
          <Stack gap="md">
            {/* Toolbar: Search, Filters, and Add User Action */}
            <Toolbar
              left={
                <Inline gap="sm" align="center">
                  <Input
                    leftIcon={<BezentIcon name="search" />}
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Statuses' },
                      { value: 'active', label: 'Active Members' },
                      { value: 'pending', label: 'Pending Invitations' },
                    ]}
                  />
                </Inline>
              }
              right={
                <Button
                  variant="primary"
                  leftIcon={<BezentIcon name="add" />}
                  onClick={() => setIsAddModalOpen(true)}
                  type="button"
                >
                  Add User
                </Button>
              }
            />

            {usersError && <Alert variant="danger">{usersError}</Alert>}

            {/* Users Table or Empty States */}
            {loadingUsers ? (
              <LoadingState label="Loading company users and invitations..." />
            ) : users.length === 0 ? (
              <EmptyState
                title="No Users in this Company"
                description={`No users have been assigned or invited to ${company.displayName || company.name} yet.`}
                primaryAction={{
                  label: 'Add User',
                  onClick: () => setIsAddModalOpen(true),
                }}
              />
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                title="No Matching Users Found"
                description="No company members or invitations match the search query or filter criteria."
                primaryAction={{
                  label: 'Clear Filters',
                  onClick: () => {
                    setSearch('');
                    setStatusFilter('all');
                  },
                }}
              />
            ) : (
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>User</TableHeaderCell>
                    <TableHeaderCell>Company Role</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((item) => (
                    <TableRow key={item.id}>
                      {/* User Cell */}
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <Avatar initials={getInitials(item.name)} size="sm" />
                          <Stack gap="none">
                            <strong>{item.name}</strong>
                            <span>{item.email}</span>
                          </Stack>
                        </Inline>
                      </TableCell>

                      {/* Company Role Cell */}
                      <TableCell>
                        <Badge variant={item.role === 'company_admin' ? 'info' : 'neutral'}>
                          {item.roleLabel}
                        </Badge>
                      </TableCell>

                      {/* Status Cell */}
                      <TableCell>
                        <Badge status={item.status} showDot>
                          {item.status === 'active' ? 'Active' : item.status === 'pending' ? 'Pending' : item.status}
                        </Badge>
                      </TableCell>

                      {/* Date Cell */}
                      <TableCell>
                        <Stack gap="none">
                          <span>{formatDate(item.addedAt)}</span>
                          {item.status === 'pending' && item.expiresAt && (
                            <small>Expires {formatDate(item.expiresAt)}</small>
                          )}
                        </Stack>
                      </TableCell>

                      {/* Actions Cell */}
                      <TableCell>
                        <Inline gap="xs" align="center">
                          {item.type === 'member' ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenChangeRole(item)}
                                type="button"
                              >
                                Change Role
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenRevoke(item)}
                                type="button"
                              >
                                Revoke
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleResendInvitation(item)}
                                loading={resendingId === item.invitationId}
                                type="button"
                              >
                                Resend
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenCancelInvitation(item)}
                                type="button"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </Inline>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        )}
      </Stack>

      {/* 1. Add User Modal */}
      <AddCompanyUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        companyId={company.id}
        companyName={company.displayName || company.name}
        onSuccess={(msg) => {
          setFeedback(msg);
          loadUsers();
        }}
      />

      {/* 2. Change Role Modal */}
      {changeRoleTarget && (
        <Modal
          isOpen={Boolean(changeRoleTarget)}
          onClose={() => {
            if (!isUpdatingRole) {
              setChangeRoleTarget(null);
            }
          }}
          title="Change Company Role"
          description={`Update delegated company role for ${changeRoleTarget.name}.`}
          size="sm"
          footer={
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                onClick={() => setChangeRoleTarget(null)}
                disabled={isUpdatingRole}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmChangeRole}
                loading={isUpdatingRole}
                type="button"
              >
                Update Role
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {roleModalError && <Alert variant="danger">{roleModalError}</Alert>}

            <Stack gap="xs">
              <strong>User:</strong>
              <span>
                {changeRoleTarget.name} ({changeRoleTarget.email})
              </span>
            </Stack>

            <FormField label="Assigned Role" required>
              <Select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as CompanyAccessRole)}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'company_admin', label: 'Company Administrator' },
                ]}
                required
              />
            </FormField>

            <Alert variant="info">
              {selectedNewRole === 'company_admin'
                ? 'Promoting to Company Administrator will grant operational administration rights over this company profile, structure, and access.'
                : 'Demoting to Member will remove administrative authority for this company. The user must not be the last active Company Administrator.'}
            </Alert>
          </Stack>
        </Modal>
      )}

      {/* 3. Revoke Access Confirmation Modal */}
      {revokeTarget && (
        <Modal
          isOpen={Boolean(revokeTarget)}
          onClose={() => {
            if (!isRevoking) {
              setRevokeTarget(null);
            }
          }}
          title="Revoke Company Access"
          description={`Are you sure you want to remove ${revokeTarget.name}'s access to this company?`}
          size="sm"
          footer={
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                onClick={() => setRevokeTarget(null)}
                disabled={isRevoking}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmRevoke}
                loading={isRevoking}
                type="button"
              >
                Revoke Access
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {revokeModalError && <Alert variant="danger">{revokeModalError}</Alert>}

            <Alert variant="warning">
              This will remove the user from {company.displayName || company.name}.
              Their user account and access to any other companies will remain unaffected.
              A company must always retain at least one active Company Administrator.
            </Alert>
          </Stack>
        </Modal>
      )}

      {/* 4. Cancel Invitation Confirmation Modal */}
      {cancelInvTarget && (
        <Modal
          isOpen={Boolean(cancelInvTarget)}
          onClose={() => {
            if (!isCancellingInv) {
              setCancelInvTarget(null);
            }
          }}
          title="Cancel Invitation"
          description={`Cancel pending invitation for ${cancelInvTarget.email}?`}
          size="sm"
          footer={
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                onClick={() => setCancelInvTarget(null)}
                disabled={isCancellingInv}
                type="button"
              >
                Keep Invitation
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmCancelInvitation}
                loading={isCancellingInv}
                type="button"
              >
                Cancel Invitation
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {cancelModalError && <Alert variant="danger">{cancelModalError}</Alert>}

            <Alert variant="info">
              The pending sign-in invitation token will be invalidated immediately. The user will not be able to join using the previous email link.
            </Alert>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
