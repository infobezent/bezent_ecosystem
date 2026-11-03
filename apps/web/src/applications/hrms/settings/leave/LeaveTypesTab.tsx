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
  LeaveTypeItem,
  LeaveTypeSummary,
  LeaveTypesListResponse,
  CreateLeaveTypeDto,
  PaidClassification,
} from './types/leaveTypes.types';
import {
  fetchLeaveTypes,
  createLeaveType,
  updateLeaveType,
  changeLeaveTypeStatus,
} from './api/leaveTypesApi';
import { LeaveTypeDrawer } from './LeaveTypeDrawer';

export interface LeaveTypesTabProps {
  initialData?: LeaveTypesListResponse;
  canManage?: boolean;
}

export function LeaveTypesTab({ initialData, canManage = true }: LeaveTypesTabProps = {}) {
  // Production UI starts with real state from initialData or empty, backed strictly by API data
  const [items, setItems] = useState<LeaveTypeItem[]>(initialData?.items || []);
  const [summary, setSummary] = useState<LeaveTypeSummary | null>(initialData?.summary || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [paidFilter, setPaidFilter] = useState<'all' | PaidClassification>('all');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedItem, setSelectedItem] = useState<LeaveTypeItem | null>(null);

  // Deactivation / Confirmation modal state
  const [confirmItem, setConfirmItem] = useState<LeaveTypeItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchLeaveTypes({
        search: search.trim() || undefined,
        status: statusFilter,
        paidClassification: paidFilter,
        limit: 50,
      });
      setItems(res.items);
      setSummary(res.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load leave types';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paidFilter]);

  useEffect(() => {
    if (!initialData) {
      void loadData();
    }
  }, [initialData, loadData]);

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleOpenView = (item: LeaveTypeItem) => {
    setSelectedItem(item);
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: LeaveTypeItem) => {
    setSelectedItem(item);
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  const handleSaveLeaveType = async (
    dto: CreateLeaveTypeDto,
    id?: string,
  ): Promise<LeaveTypeItem> => {
    if (id) {
      const updated = await updateLeaveType(id, dto);
      setSuccessMsg(`Leave type "${updated.name}" updated successfully.`);
      return updated;
    } else {
      const created = await createLeaveType(dto);
      setSuccessMsg(`Leave type "${created.name}" created successfully.`);
      return created;
    }
  };

  const handleSaved = (saved: LeaveTypeItem) => {
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
      const targetActive = !confirmItem.isActive;
      const res = await changeLeaveTypeStatus(confirmItem.id, targetActive);
      setSuccessMsg(
        `Leave type "${confirmItem.name}" has been ${targetActive ? 'activated' : 'deactivated'}.`,
      );
      setWarningMsg(res.warning ?? null);
      setConfirmItem(null);
      void loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update leave type status.';
      setErrorMsg(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaidFilter('all');
  };

  const hasActiveFilters = Boolean(search || statusFilter !== 'all' || paidFilter !== 'all');

  return (
    <Stack gap="xl">
      {/* 1. Header Toolbar — Clean Apple / Linear Settings Style */}
      <PageHeader
        title="Leave Types"
        subtitle="Manage the types of leave available to employees."
        badge={
          summary ? (
            <Inline gap="xs" align="center">
              <Badge variant="neutral">{summary.total} Total Types</Badge>
              <Badge variant="success">{summary.active} Active</Badge>
              {summary.inactive > 0 && <Badge variant="warning">{summary.inactive} Inactive</Badge>}
            </Inline>
          ) : undefined
        }
        actions={
          canManage ? (
            <Button
              variant="primary"
              type="button"
              onClick={handleOpenCreate}
              aria-label="Create Leave Type"
            >
              Create Leave Type
            </Button>
          ) : undefined
        }
      />

      {/* 2. Dynamic Metric Summary Cards — rendered strictly when backed by API data */}
      {summary && (
        <Grid columns={3} gap="md">
          <Card padding="md">
            <Stack gap="xs">
              <CardDescription>Total Leave Types</CardDescription>
              <CardTitle>{summary.total}</CardTitle>
            </Stack>
          </Card>

          <Card padding="md" variant="tint-blue">
            <Stack gap="xs">
              <CardDescription>Active Leave Types</CardDescription>
              <CardTitle>{summary.active}</CardTitle>
            </Stack>
          </Card>

          <Card padding="md">
            <Stack gap="xs">
              <CardDescription>Inactive Leave Types</CardDescription>
              <CardTitle>{summary.inactive}</CardTitle>
            </Stack>
          </Card>
        </Grid>
      )}

      {/* Global Alerts for Success & Error Notifications */}
      {successMsg && (
        <Alert variant="success" title="Success" dismissible onDismiss={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {warningMsg && (
        <Alert
          variant="warning"
          title="Please review"
          dismissible
          onDismiss={() => setWarningMsg(null)}
        >
          {warningMsg}
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
              placeholder="Search by name or code..."
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search leave types"
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>

            <Select
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value as 'all' | PaidClassification)}
              aria-label="Filter by payment"
            >
              <option value="all">All Payment Types</option>
              <option value="paid">Paid</option>
              <option value="partly_paid">Partly Paid</option>
              <option value="unpaid">Unpaid</option>
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
              <span>Loading leave types...</span>
            </Inline>
          </Card>
        ) : errorMsg && items.length === 0 ? (
          <Card padding="lg">
            <Stack gap="md" align="center">
              <Alert variant="error" title="Failed to Load Leave Types">
                {errorMsg}
              </Alert>
              <Button variant="primary" type="button" onClick={() => void loadData()}>
                Retry Loading Leave Types
              </Button>
            </Stack>
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? 'No Leave Types Found' : 'No Leave Types Configured'}
            description={
              hasActiveFilters
                ? 'No leave types match the active filters. Try clearing your filters.'
                : 'No leave types configured for this company yet. Click "Create Leave Type" to get started.'
            }
            primaryAction={
              hasActiveFilters
                ? {
                    label: 'Clear Filters',
                    onClick: handleClearFilters,
                  }
                : canManage
                  ? {
                      label: 'Create Leave Type',
                      onClick: handleOpenCreate,
                    }
                  : undefined
            }
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Leave Type</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Payment</TableHeaderCell>
                <TableHeaderCell>Permitted Units</TableHeaderCell>
                <TableHeaderCell>Documentation</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((lt) => {
                const isPaid = lt.payrollImpact === 'paid';
                const hasHalfDay = lt.minPerRequest === '0.50' || lt.unit === 'half_days';

                let docDesc = 'None';
                if (lt.documentRequirement === 'optional') docDesc = 'Optional';
                else if (lt.documentRequirement === 'mandatory') docDesc = 'Mandatory';
                else if (lt.documentRequirement === 'mandatory_after_n_days') {
                  docDesc = `Mandatory (> ${lt.documentThresholdDays || 1}d)`;
                }

                return (
                  <TableRow key={lt.id}>
                    {/* Name & Short Code */}
                    <TableCell>
                      <Stack gap="none">
                        <Inline gap="xs" align="center">
                          <strong>{lt.name}</strong>
                          <Badge variant="neutral">{lt.code}</Badge>
                        </Inline>
                        {lt.description && <CardDescription>{lt.description}</CardDescription>}
                      </Stack>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className="bezent-status-pill__label">
                        {lt.category.replace('_', ' ')}
                      </span>
                    </TableCell>

                    {/* Paid / Unpaid */}
                    <TableCell>
                      <Badge variant={isPaid ? 'success' : 'neutral'}>
                        {isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </TableCell>

                    {/* Permitted Units */}
                    <TableCell>{hasHalfDay ? 'Full Day & Half Day' : 'Full Day Only'}</TableCell>

                    {/* Documentation */}
                    <TableCell>{docDesc}</TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={lt.isActive ? 'success' : 'neutral'}>
                        {lt.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Inline gap="xs" align="center">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => handleOpenView(lt)}
                        >
                          View
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              type="button"
                              onClick={() => handleOpenEdit(lt)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant={lt.isActive ? 'secondary' : 'primary'}
                              size="sm"
                              type="button"
                              onClick={() => setConfirmItem(lt)}
                            >
                              {lt.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </>
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
      <LeaveTypeDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        mode={drawerMode}
        initialData={selectedItem}
        onSaved={handleSaved}
        saveFn={handleSaveLeaveType}
        onSwitchToEdit={() => setDrawerMode('edit')}
        canManage={canManage}
      />

      {/* 6. Status Toggle Confirmation Dialog */}
      {confirmItem && (
        <Modal
          isOpen={Boolean(confirmItem)}
          onClose={() => setConfirmItem(null)}
          title={
            confirmItem.isActive
              ? `Deactivate ${confirmItem.name}?`
              : `Activate ${confirmItem.name}?`
          }
          description={
            confirmItem.isActive
              ? 'Are you sure you want to deactivate this leave type?'
              : 'Reactivating this leave type allows employees to submit new requests under this category.'
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
                variant={confirmItem.isActive ? 'danger' : 'primary'}
                type="button"
                onClick={handleStatusToggleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Inline gap="xs" align="center">
                    <Spinner size="sm" />
                    <span>Processing...</span>
                  </Inline>
                ) : confirmItem.isActive ? (
                  'Confirm Deactivation'
                ) : (
                  'Confirm Activation'
                )}
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            {confirmItem.isActive ? (
              <p className="bezent-card__desc">
                Deactivating{' '}
                <strong>
                  {confirmItem.name} ({confirmItem.code})
                </strong>{' '}
                prevents employees from creating new leave applications under this category.
                Existing leave balances, historical requests, and reporting records remain
                completely preserved.
              </p>
            ) : (
              <p className="bezent-card__desc">
                Activating{' '}
                <strong>
                  {confirmItem.name} ({confirmItem.code})
                </strong>{' '}
                makes it immediately available for eligible workforce employees to select when
                applying for leave.
              </p>
            )}
          </Stack>
        </Modal>
      )}
    </Stack>
  );
}

export default LeaveTypesTab;
