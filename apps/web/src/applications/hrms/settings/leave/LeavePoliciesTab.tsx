import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardTitle,
  CardDescription,
  Stack,
  Inline,
  Grid,
  Button,
  Select,
  SearchInput,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Alert,
  Spinner,
  Modal,
  EmptyState,
  PageHeader,
} from '../../../../design-system/components';
import type {
  LeavePolicyItem,
  LeavePoliciesSummary,
  LeavePoliciesListResponse,
  CreateLeavePolicyDto,
  PolicyScopeOptions,
  PolicyStatus,
} from './types/leavePolicies.types';
import type { LeaveTypeItem } from './types/leaveTypes.types';
import {
  fetchLeavePolicies,
  createLeavePolicy,
  updateLeavePolicy,
  changeLeavePolicyStatus,
} from './api/leavePoliciesApi';
import { fetchLeaveTypes } from './api/leaveTypesApi';
import { fetchOrganizationMasters } from '../../api/organizationMastersApi';
import { LeavePolicyDrawer } from './LeavePolicyDrawer';

export interface LeavePoliciesTabProps {
  initialData?: LeavePoliciesListResponse;
  initialLeaveTypes?: LeaveTypeItem[];
  initialScopeOptions?: PolicyScopeOptions;
  canManage?: boolean;
}

const STATUS_VARIANTS: Record<PolicyStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  scheduled: 'info',
  archived: 'neutral',
};

export function LeavePoliciesTab({
  initialData,
  initialLeaveTypes,
  initialScopeOptions,
  canManage = true,
}: LeavePoliciesTabProps = {}) {
  const [items, setItems] = useState<LeavePolicyItem[]>(initialData?.items || []);
  const [summary, setSummary] = useState<LeavePoliciesSummary | null>(initialData?.summary || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Available leave types for association
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>(initialLeaveTypes || []);
  const [scopeOptions, setScopeOptions] = useState<PolicyScopeOptions>(
    initialScopeOptions ?? { departments: [], locations: [] },
  );

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PolicyStatus>('all');
  const [scopeFilter, setScopeFilter] = useState<
    'all' | 'company' | 'department' | 'location' | 'employment_type'
  >('all');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<LeavePolicyItem | null>(null);

  // Status Confirmation modal state
  const [confirmItem, setConfirmItem] = useState<LeavePolicyItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const policiesRes = await fetchLeavePolicies({
        search: search.trim() || undefined,
        status: statusFilter,
        scope: scopeFilter,
        limit: 50,
      });

      setItems(policiesRes.items);
      setSummary(policiesRes.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load leave policies';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, scopeFilter]);

  useEffect(() => {
    if (!initialData) {
      void loadData();
    }
  }, [initialData, loadData]);

  // Leave types are loaded once for the drawer's linkage picker; keeping them out of
  // loadData's dependencies avoids a refetch loop when a company has no leave types.
  useEffect(() => {
    if (initialLeaveTypes) return;
    let cancelled = false;
    fetchLeaveTypes({ limit: 100 })
      .then((res) => {
        if (!cancelled) setLeaveTypes(res.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load leave types');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialLeaveTypes]);

  // Departments and locations for the scope picker. A failure only empties the picker.
  useEffect(() => {
    if (initialScopeOptions || !canManage) return;
    let cancelled = false;
    fetchOrganizationMasters()
      .then((masters) => {
        if (!cancelled) {
          setScopeOptions({ departments: masters.departments, locations: masters.locations });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initialScopeOptions, canManage]);

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleOpenView = (item: LeavePolicyItem) => {
    setSelectedItem(item);
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: LeavePolicyItem) => {
    setSelectedItem(item);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  const handleSavePolicy = async (
    dto: CreateLeavePolicyDto,
    id?: string,
  ): Promise<LeavePolicyItem> => {
    if (id) {
      const updated = await updateLeavePolicy(id, dto);
      setSuccessMsg(`Leave policy "${updated.name}" updated successfully.`);
      return updated;
    } else {
      const created = await createLeavePolicy(dto);
      setSuccessMsg(`Leave policy "${created.name}" created successfully.`);
      return created;
    }
  };

  const handleSaved = (saved: LeavePolicyItem) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    void loadData();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleStatusToggleConfirm = async () => {
    if (!confirmItem) return;
    setActionLoading(true);
    try {
      const targetStatus: PolicyStatus = confirmItem.status === 'draft' ? 'active' : 'archived';
      const res = await changeLeavePolicyStatus(confirmItem.id, targetStatus);
      setSuccessMsg(
        `Policy "${confirmItem.name}" is now ${res.policy.status}. ${res.warning || ''}`.trim(),
      );
      setConfirmItem(null);
      void loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update policy status.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setScopeFilter('all');
  };

  const hasActiveFilters = Boolean(search || statusFilter !== 'all' || scopeFilter !== 'all');

  return (
    <Stack gap="xl">
      {/* 1. Header Toolbar — Clean Apple / Linear Settings Style */}
      <PageHeader
        title="Leave Policies"
        subtitle="Define and manage leave rules for your workforce."
        badge={
          summary ? (
            <Inline gap="xs" align="center">
              <Badge variant="neutral">{summary.total} Total Policies</Badge>
              <Badge variant="success">{summary.active} Active</Badge>
              {summary.draft > 0 && <Badge variant="warning">{summary.draft} Draft</Badge>}
              {summary.scheduled > 0 && <Badge variant="info">{summary.scheduled} Scheduled</Badge>}
            </Inline>
          ) : undefined
        }
        actions={
          canManage ? (
            <Button
              variant="primary"
              type="button"
              onClick={handleOpenCreate}
              aria-label="Create Policy"
            >
              Create Policy
            </Button>
          ) : undefined
        }
      />

      {/* 2. Dynamic Metric Summary Cards — strictly rendered only when backed by API data */}
      {summary && (
        <Grid columns={4} gap="md">
          <Card padding="md">
            <Stack gap="xs">
              <CardDescription>Total Policies</CardDescription>
              <CardTitle>{summary.total}</CardTitle>
            </Stack>
          </Card>

          <Card padding="md" variant="tint-blue">
            <Stack gap="xs">
              <CardDescription>Active Policies</CardDescription>
              <CardTitle>{summary.active}</CardTitle>
            </Stack>
          </Card>

          <Card padding="md">
            <Stack gap="xs">
              <CardDescription>Draft Policies</CardDescription>
              <CardTitle>{summary.draft}</CardTitle>
            </Stack>
          </Card>

          <Card padding="md">
            <Stack gap="xs">
              <CardDescription>Scheduled Policies</CardDescription>
              <CardTitle>{summary.scheduled}</CardTitle>
            </Stack>
          </Card>
        </Grid>
      )}

      {summary && summary.employeesWithoutPolicy > 0 && (
        <Alert variant="warning" title="Employees without a leave policy">
          {summary.employeesWithoutPolicy} active employee
          {summary.employeesWithoutPolicy === 1 ? ' has' : 's have'} no leave policy in force today
          and cannot apply for leave until one covers them.
        </Alert>
      )}

      {/* Notifications */}
      {successMsg && (
        <Alert variant="success" title="Success" dismissible onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {errorMsg && items.length > 0 && (
        <Alert variant="error" title="Error" dismissible onDismiss={() => setErrorMsg(null)}>
          <Inline justify="between" align="center">
            <span>{errorMsg}</span>
            <Button variant="secondary" size="sm" type="button" onClick={() => void loadData()}>
              Retry
            </Button>
          </Inline>
        </Alert>
      )}

      {/* 3. Search and Filter Bar */}
      <Card padding="md">
        <Inline justify="between" align="center">
          <Inline gap="md" align="center">
            <SearchInput
              value={search}
              placeholder="Search by policy name or code..."
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leave policies"
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | PolicyStatus)}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="draft">Draft Only</option>
              <option value="scheduled">Scheduled Only</option>
              <option value="archived">Archived</option>
            </Select>

            <Select
              value={scopeFilter}
              onChange={(e) =>
                setScopeFilter(
                  e.target.value as
                    'all' | 'company' | 'department' | 'location' | 'employment_type',
                )
              }
              aria-label="Filter by scope"
            >
              <option value="all">All Scopes</option>
              <option value="company">Company-wide</option>
              <option value="department">Department</option>
              <option value="location">Work Location</option>
              <option value="employment_type">Employment Type</option>
            </Select>
          </Inline>

          {hasActiveFilters && (
            <Button variant="secondary" size="sm" type="button" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </Inline>
      </Card>

      {/* 4. Table / Content Area */}
      <Card padding="none">
        {loading ? (
          <Card padding="lg">
            <Inline justify="center" align="center" gap="sm">
              <Spinner size="md" />
              <span>Loading leave policies...</span>
            </Inline>
          </Card>
        ) : errorMsg && items.length === 0 ? (
          <Card padding="lg">
            <Stack gap="md" align="center">
              <Alert variant="error" title="Failed to Load Leave Policies">
                {errorMsg}
              </Alert>
              <Button variant="primary" type="button" onClick={() => void loadData()}>
                Retry Loading Policies
              </Button>
            </Stack>
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'No Leave Policies Found' : 'No Leave Policies Configured'}
            description={
              hasActiveFilters
                ? 'No policies match the active search or scope filters. Try clearing your filters.'
                : 'No organizational leave policies have been configured yet. Click "Create Policy" to get started.'
            }
            primaryAction={
              hasActiveFilters
                ? {
                    label: 'Clear Filters',
                    onClick: handleClearFilters,
                  }
                : canManage
                  ? {
                      label: 'Create Policy',
                      onClick: handleOpenCreate,
                    }
                  : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Policy Name</TableHeaderCell>
                <TableHeaderCell>Applicability Scope</TableHeaderCell>
                <TableHeaderCell>Effective Period</TableHeaderCell>
                <TableHeaderCell>Linked Leave Types</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((pol) => {
                const linkedCount = pol.entitlements?.length ?? 0;
                const lifecycleAction =
                  pol.status === 'draft'
                    ? 'Activate'
                    : pol.status === 'archived'
                      ? null
                      : 'Archive';
                return (
                  <TableRow key={pol.id}>
                    {/* Name & Code */}
                    <TableCell>
                      <Stack gap="none">
                        <Inline gap="xs" align="center">
                          <strong>{pol.name}</strong>
                          <Badge variant="neutral">{pol.code}</Badge>
                        </Inline>
                        {pol.description && <CardDescription>{pol.description}</CardDescription>}
                      </Stack>
                    </TableCell>

                    {/* Scope */}
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <span>{pol.scopeName || pol.scope.replace('_', ' ')}</span>
                      </Inline>
                    </TableCell>

                    {/* Effective Period */}
                    <TableCell>
                      <span>
                        {pol.effectiveFrom}{' '}
                        {pol.effectiveTo ? `to ${pol.effectiveTo}` : '(Ongoing)'}
                      </span>
                    </TableCell>

                    {/* Linked Types */}
                    <TableCell>
                      <Badge variant="neutral">
                        {linkedCount} Type{linkedCount === 1 ? '' : 's'} Linked
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[pol.status] || 'neutral'}>
                        {pol.status.toUpperCase()}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => handleOpenView(pol)}
                        >
                          View
                        </Button>
                        {canManage && pol.status !== 'archived' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => handleOpenEdit(pol)}
                          >
                            Edit
                          </Button>
                        )}
                        {canManage && lifecycleAction && (
                          <Button
                            variant={lifecycleAction === 'Archive' ? 'secondary' : 'primary'}
                            size="sm"
                            type="button"
                            onClick={() => setConfirmItem(pol)}
                          >
                            {lifecycleAction}
                          </Button>
                        )}
                      </Inline>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 5. Create / Edit / View Drawer */}
      <LeavePolicyDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode={drawerMode}
        initialData={selectedItem}
        availableLeaveTypes={leaveTypes}
        scopeOptions={scopeOptions}
        onSaved={handleSaved}
        saveFn={handleSavePolicy}
        onSwitchToEdit={() => setDrawerMode('edit')}
        canManage={canManage}
      />

      {/* 6. Lifecycle Status Confirmation Dialog */}
      {confirmItem && (
        <Modal
          isOpen={Boolean(confirmItem)}
          onClose={() => setConfirmItem(null)}
          title={
            confirmItem.status !== 'draft'
              ? `Archive ${confirmItem.name}?`
              : `Activate ${confirmItem.name}?`
          }
          description={
            confirmItem.status !== 'draft'
              ? 'Are you sure you want to retire this leave policy?'
              : 'Activating applies this policy to eligible employees from its effective date.'
          }
          footer={
            <Inline justify="between" align="center">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setConfirmItem(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={confirmItem.status !== 'draft' ? 'danger' : 'primary'}
                type="button"
                onClick={handleStatusToggleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Inline gap="xs" align="center">
                    <Spinner size="sm" />
                    <span>Processing...</span>
                  </Inline>
                ) : confirmItem.status !== 'draft' ? (
                  'Confirm Archive'
                ) : (
                  'Confirm Activation'
                )}
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {confirmItem.status !== 'draft' ? (
              <p className="bezent-card__desc">
                Archiving{' '}
                <strong>
                  {confirmItem.name} ({confirmItem.code})
                </strong>{' '}
                retires it from active policy evaluation. Historical leave requests, balances, and
                audit records remain completely preserved.
              </p>
            ) : (
              <p className="bezent-card__desc">
                Activating{' '}
                <strong>
                  {confirmItem.name} ({confirmItem.code})
                </strong>{' '}
                assigns it as an authoritative rule for all employees in scope (
                {confirmItem.scopeName || confirmItem.scope}).
              </p>
            )}
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}

export default LeavePoliciesTab;
