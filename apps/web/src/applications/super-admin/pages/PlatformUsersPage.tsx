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
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { superAdminApi, type PlatformUserSummary, type TenantRecord } from '../api/superAdminApi';

export function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUserSummary[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, tenantsRes] = await Promise.all([
        superAdminApi.listUsers({
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        superAdminApi.listTenants({ limit: 100 }),
      ]);
      setUsers(usersRes.items);
      setTotal(usersRes.total);
      setTenants(tenantsRes.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load platform users');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, search, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: PlatformUserSummary) => {
    if (user.isSuperAdmin) {
      alert('Super Admin accounts cannot be suspended from user directory.');
      return;
    }
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await superAdminApi.updateUserStatus(user.id, newStatus);
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Platform Users"
        subtitle="Identity directory across all customer tenants (Platform User ≠ Employee record, ADR-009)"
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
                <Input
                  placeholder="Search user by name or email..."
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
                onClick={fetchUsers}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {loading && <LoadingState label="Loading platform users..." />}

          {!loading && users.length === 0 && (
            <EmptyState
              title="No platform users found"
              description="No user accounts match your search filters."
            />
          )}

          {!loading && users.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>User</TableHeaderCell>
                  <TableHeaderCell>Role & Level</TableHeaderCell>
                  <TableHeaderCell>Memberships</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Stack gap="xs">
                        <strong>
                          {user.firstName} {user.lastName}
                        </strong>
                        <span className="bezent-caption">{user.email}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {user.isSuperAdmin ? (
                        <Badge variant="warning">SUPER ADMIN</Badge>
                      ) : (
                        <Badge variant="neutral">Platform User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.memberships && user.memberships.length > 0 ? (
                        <Stack gap="xs">
                          {user.memberships.map((m, idx) => (
                            <span key={idx} className="bezent-caption">
                              {m.role} @ {m.tenantId}
                            </span>
                          ))}
                        </Stack>
                      ) : (
                        <span className="bezent-caption">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge status={user.status}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {!user.isSuperAdmin && (
                        <Button
                          variant={user.status === 'active' ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!loading && total > 0 && (
            <span className="bezent-caption">
              Showing {users.length} of {total} platform users
            </span>
          )}
        </Stack>
      </Card>
    </Page>
  );
}
