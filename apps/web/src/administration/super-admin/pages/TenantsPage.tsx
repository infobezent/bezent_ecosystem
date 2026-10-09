import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
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
  Avatar,
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
  type TenantRecord,
  type TenantSummaryMetrics,
  type PlanRecord,
  type TenantListParams,
} from '../api/superAdminApi';

export interface TenantsPageProps {
  initialTenants?: TenantRecord[];
  initialLoading?: boolean;
  initialSummary?: TenantSummaryMetrics;
}

export function TenantsPage({
  initialTenants,
  initialLoading = true,
  initialSummary,
}: TenantsPageProps = {}) {
  const navigate = useNavigate();

  // Summary Metrics State
  const [summary, setSummary] = useState<TenantSummaryMetrics | null>(initialSummary ?? null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(
    initialSummary ? false : !initialTenants,
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Tenant List State
  const [tenants, setTenants] = useState<TenantRecord[]>(initialTenants ?? []);
  const [total, setTotal] = useState<number>(initialTenants?.length ?? 0);
  const [loading, setLoading] = useState<boolean>(initialTenants ? false : initialLoading);
  const [listError, setListError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Search & Filter State
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [applicationFilter, setApplicationFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Available Plans Catalog State
  const [availablePlans, setAvailablePlans] = useState<PlanRecord[]>([]);

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status' | 'id'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Lifecycle Modals State
  const [suspendTarget, setSuspendTarget] = useState<TenantRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [suspendReasonError, setSuspendReasonError] = useState<string | null>(null);
  const [submittingSuspend, setSubmittingSuspend] = useState<boolean>(false);

  const [reactivateTarget, setReactivateTarget] = useState<TenantRecord | null>(null);
  const [submittingReactivate, setSubmittingReactivate] = useState<boolean>(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Plans Catalog once
  useEffect(() => {
    let isMounted = true;
    superAdminApi
      .listPlans()
      .then((plans) => {
        if (isMounted) setAvailablePlans(plans || []);
      })
      .catch(() => {
        // Non-blocking: plan catalog filter will show default options
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Summary Metrics
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await superAdminApi.getTenantSummary();
      setSummary(data);
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to fetch summary metrics');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Calculate Date Bounds from selected Created Date filter
  const dateParams = useMemo(() => {
    if (dateFilter === 'all') return {};
    const now = new Date();
    const past = new Date();

    if (dateFilter === '7d') {
      past.setDate(now.getDate() - 7);
    } else if (dateFilter === '30d') {
      past.setDate(now.getDate() - 30);
    } else if (dateFilter === '90d') {
      past.setDate(now.getDate() - 90);
    }

    return {
      createdFrom: past.toISOString(),
      createdTo: now.toISOString(),
    };
  }, [dateFilter]);

  // Fetch Tenants List
  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const params: TenantListParams = {
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        application: applicationFilter !== 'all' ? applicationFilter : undefined,
        planId: planFilter !== 'all' ? planFilter : undefined,
        ...dateParams,
        sortBy,
        sortOrder,
        page,
        limit: pageSize,
      };

      const response = await superAdminApi.listTenants(params);
      setTenants(response.items);
      setTotal(response.total);
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, applicationFilter, planFilter, dateParams, sortBy, sortOrder, page, pageSize]);

  // Initial and reactive fetch
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearch) count += 1;
    if (statusFilter !== 'all') count += 1;
    if (applicationFilter !== 'all') count += 1;
    if (planFilter !== 'all') count += 1;
    if (dateFilter !== 'all') count += 1;
    return count;
  }, [debouncedSearch, statusFilter, applicationFilter, planFilter, dateFilter]);

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setApplicationFilter('all');
    setPlanFilter('all');
    setDateFilter('all');
    setPage(1);
  };

  const handleSort = (field: 'name' | 'createdAt' | 'status' | 'id') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleRefresh = async () => {
    setActionSuccess(null);
    await Promise.all([fetchSummary(), fetchTenants()]);
  };

  // Suspend Dialog
  const handleOpenSuspend = (tenant: TenantRecord) => {
    setSuspendTarget(tenant);
    setSuspendReason('');
    setSuspendReasonError(null);
  };

  const handleConfirmSuspend = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!suspendTarget) return;

    if (!suspendReason.trim()) {
      setSuspendReasonError('A valid reason is required to suspend a customer tenant.');
      return;
    }

    setSubmittingSuspend(true);
    setSuspendReasonError(null);
    try {
      await superAdminApi.suspendTenant(suspendTarget.id, suspendReason.trim());
      setActionSuccess(`Customer tenant '${suspendTarget.name}' has been suspended.`);
      setSuspendTarget(null);
      await Promise.all([fetchSummary(), fetchTenants()]);
    } catch (err: unknown) {
      setSuspendReasonError(err instanceof Error ? err.message : 'Failed to suspend tenant');
    } finally {
      setSubmittingSuspend(false);
    }
  };

  // Reactivate Dialog
  const handleOpenReactivate = (tenant: TenantRecord) => {
    setReactivateTarget(tenant);
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateTarget) return;
    setSubmittingReactivate(true);
    try {
      await superAdminApi.activateTenant(reactivateTarget.id, 'Administrative reactivation');
      setActionSuccess(`Customer tenant '${reactivateTarget.name}' has been reactivated.`);
      setReactivateTarget(null);
      await Promise.all([fetchSummary(), fetchTenants()]);
    } catch (err: unknown) {
      setListError(err instanceof Error ? err.message : 'Failed to reactivate tenant');
    } finally {
      setSubmittingReactivate(false);
    }
  };

  // Safe fallback initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return 'TN';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Status Badge Mapper
  const renderStatusBadge = (tenant: TenantRecord) => {
    const classification = tenant.derivedCommercialClassification || tenant.status;
    switch (classification) {
      case 'active':
        return <Badge variant="success" showDot size="sm">Active</Badge>;
      case 'trial':
        return <Badge variant="warning" showDot size="sm">Trial</Badge>;
      case 'suspended':
        return <Badge variant="danger" showDot size="sm">Suspended</Badge>;
      case 'pending_setup':
        return <Badge variant="neutral" showDot size="sm">Pending Setup</Badge>;
      case 'archived':
        return <Badge variant="neutral" size="sm">Archived</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{tenant.status}</Badge>;
    }
  };

  // Application Badges Mapper
  const renderApplications = (tenant: TenantRecord) => {
    const apps = tenant.activeModules || [];
    if (apps.length === 0) {
      return <span className="bezent-caption">No applications</span>;
    }

    return (
      <Inline gap="xs" align="center">
        {apps.map((appCode) => {
          let label = appCode.toUpperCase();
          if (appCode === 'project_management') label = 'PM';
          if (appCode === 'hrms') label = 'HRMS';
          if (appCode === 'crm') label = 'CRM';

          return (
            <Badge key={appCode} variant={appCode === 'hrms' ? 'info' : 'neutral'} size="sm">
              {label}
            </Badge>
          );
        })}
      </Inline>
    );
  };

  // Subscription Summary Mapper
  const renderSubscription = (tenant: TenantRecord) => {
    const summary = tenant.subscriptionSummary;
    if (!summary || (!summary.activePlans?.length && !summary.hasTrial)) {
      return <span className="bezent-caption">No subscription</span>;
    }

    const plansText = summary.activePlans.length > 0 ? summary.activePlans.join(', ') : 'Standard';

    return (
      <Stack gap="xs">
        <Inline gap="xs" align="center">
          <strong>{plansText}</strong>
          {summary.hasTrial ? (
            <Badge variant="warning" size="sm">Trial</Badge>
          ) : (
            <Badge variant="success" size="sm">Paid</Badge>
          )}
        </Inline>
      </Stack>
    );
  };

  // Total pages
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Page>
      <PageHeader
        title="All Tenants"
        subtitle="Manage customer organizations, application access, subscriptions, and tenant lifecycle."
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/super-admin/tenants/create')}
              leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
            >
              Create Tenant
            </Button>
          </Inline>
        }
      />

      {actionSuccess && (
        <Alert variant="success" title="Success" onDismiss={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {/* Summary Metrics Section */}
      <section aria-label="Tenant Summary Metrics">
        {summaryError && (
          <Alert variant="warning" title="Summary Metrics Unavailable" onDismiss={() => setSummaryError(null)}>
            {summaryError}
          </Alert>
        )}

        <Grid columns={4} gap="md">
          {/* Card 1: Total Tenants */}
          <Card variant="flat" padding="md">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-caption">Total Tenants</span>
                <BezentIcon name="organization" size={18} color="currentColor" />
              </Inline>
              <h2 className="bezent-heading-lg">
                {summaryLoading ? '—' : summary ? summary.totalTenants : total}
              </h2>
              <span className="bezent-caption">All registered customer accounts</span>
            </Stack>
          </Card>

          {/* Card 2: Active Tenants */}
          <Card variant="flat" padding="md">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-caption">Active Tenants</span>
                <BezentIcon name="check" size={18} color="currentColor" />
              </Inline>
              <h2 className="bezent-heading-lg">
                {summaryLoading ? '—' : summary ? summary.activeTenants : 0}
              </h2>
              <span className="bezent-caption">Operational customer accounts</span>
            </Stack>
          </Card>

          {/* Card 3: Trial Tenants */}
          <Card variant="flat" padding="md">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-caption">Trial Tenants</span>
                <BezentIcon name="assignment" size={18} color="currentColor" />
              </Inline>
              <h2 className="bezent-heading-lg">
                {summaryLoading ? '—' : summary ? summary.trialTenants : 0}
              </h2>
              <span className="bezent-caption">Active trial with zero paid</span>
            </Stack>
          </Card>

          {/* Card 4: Suspended Tenants */}
          <Card variant="flat" padding="md">
            <Stack gap="xs">
              <Inline justify="between" align="center">
                <span className="bezent-caption">Suspended Tenants</span>
                <BezentIcon name="lock" size={18} color="currentColor" />
              </Inline>
              <h2 className="bezent-heading-lg">
                {summaryLoading ? '—' : summary ? summary.suspendedTenants : 0}
              </h2>
              <span className="bezent-caption">Restricted administrative state</span>
            </Stack>
          </Card>
        </Grid>
      </section>

      {/* Main Tenant Table Card */}
      <Card>
        <Stack gap="md">
          {/* Toolbar: Search, Filters, Reset */}
          <Toolbar
            left={
              <Inline gap="sm" align="center">
                <Input
                  placeholder="Search tenants by name, ID, or admin email"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setDebouncedSearch(searchInput.trim());
                      setPage(1);
                    }
                  }}
                />

                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active' },
                    { value: 'trial', label: 'Trial' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'pending_setup', label: 'Pending Setup' },
                  ]}
                />

                <Select
                  value={applicationFilter}
                  onChange={(e) => {
                    setApplicationFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Applications' },
                    { value: 'hrms', label: 'HRMS' },
                    { value: 'crm', label: 'CRM' },
                    { value: 'project_management', label: 'Project Management' },
                  ]}
                />

                <Select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Plans' },
                    ...availablePlans.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.applicationCode.toUpperCase()})`,
                    })),
                  ]}
                />

                <Select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: '7d', label: 'Last 7 Days' },
                    { value: '30d', label: 'Last 30 Days' },
                    { value: '90d', label: 'Last 90 Days' },
                  ]}
                />

                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                    Reset Filters ({activeFilterCount})
                  </Button>
                )}
              </Inline>
            }
            right={
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {listError && (
            <Alert variant="error" title="Failed to load tenants" onDismiss={() => setListError(null)}>
              {listError}
            </Alert>
          )}

          {loading && <LoadingState label="Loading customer tenants..." />}

          {!loading && tenants.length === 0 && (
            <EmptyState
              title={activeFilterCount > 0 ? 'No matching customer tenants' : 'No customer tenants found'}
              description={
                activeFilterCount > 0
                  ? 'No customer tenants match your current filter criteria. Try resetting or adjusting your filters.'
                  : 'No customer organizations have been registered or provisioned in the platform yet.'
              }
              primaryAction={
                activeFilterCount > 0
                  ? { label: 'Reset Filters', onClick: handleResetFilters }
                  : {
                      label: 'Create Tenant',
                      onClick: () => navigate('/super-admin/tenants/create'),
                    }
              }
            />
          )}

          {!loading && tenants.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell onClick={() => handleSort('name')}>
                    <Inline gap="xs" align="center">
                      <span>Tenant</span>
                      {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Inline>
                  </TableHeaderCell>
                  <TableHeaderCell>Primary Admin</TableHeaderCell>
                  <TableHeaderCell>Applications</TableHeaderCell>
                  <TableHeaderCell>Subscription</TableHeaderCell>
                  <TableHeaderCell>Users</TableHeaderCell>
                  <TableHeaderCell onClick={() => handleSort('createdAt')}>
                    <Inline gap="xs" align="center">
                      <span>Created</span>
                      {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Inline>
                  </TableHeaderCell>
                  <TableHeaderCell onClick={() => handleSort('status')}>
                    <Inline gap="xs" align="center">
                      <span>Status</span>
                      {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Inline>
                  </TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tenants.map((tenant) => {
                  const admin = tenant.primaryAdmin;
                  const seats = tenant.subscriptionSummary?.totalSeats ?? 0;
                  const usersCount = tenant.userCount ?? 0;

                  return (
                    <TableRow key={tenant.id}>
                      {/* 1. Tenant Column */}
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <Avatar
                            initials={getInitials(tenant.name)}
                            src={tenant.logoUrl || undefined}
                            size="md"
                            shape="square"
                          />
                          <Stack gap="xs">
                            <strong>{tenant.name}</strong>
                            <Inline gap="xs" align="center">
                              <code>{tenant.code}</code>
                              <span className="bezent-caption">•</span>
                              <span className="bezent-caption">{tenant.id}</span>
                            </Inline>
                          </Stack>
                        </Inline>
                      </TableCell>

                      {/* 2. Primary Admin Column */}
                      <TableCell>
                        {admin ? (
                          <Stack gap="xs">
                            <Inline gap="xs" align="center">
                              <strong>{admin.name}</strong>
                              {admin.status === 'pending' && (
                                <Badge variant="warning" size="sm">Pending Invitation</Badge>
                              )}
                            </Inline>
                            <span className="bezent-caption">{admin.email || 'Not assigned'}</span>
                          </Stack>
                        ) : (
                          <span className="bezent-caption">Not assigned</span>
                        )}
                      </TableCell>

                      {/* 3. Applications Column */}
                      <TableCell>{renderApplications(tenant)}</TableCell>

                      {/* 4. Subscription Column */}
                      <TableCell>{renderSubscription(tenant)}</TableCell>

                      {/* 5. Users / Seats Column */}
                      <TableCell>
                        <Inline gap="xs" align="center">
                          <span>{usersCount}</span>
                          <span className="bezent-caption">/</span>
                          <span className="bezent-caption">{seats > 0 ? seats : '—'}</span>
                        </Inline>
                      </TableCell>

                      {/* 6. Created Column */}
                      <TableCell>
                        <span className="bezent-caption">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>

                      {/* 7. Status Column */}
                      <TableCell>{renderStatusBadge(tenant)}</TableCell>

                      {/* 8. Actions Column */}
                      <TableCell>
                        <Inline gap="sm" align="center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                          >
                            View Tenant
                          </Button>

                          {tenant.status === 'active' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleOpenSuspend(tenant)}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenReactivate(tenant)}
                            >
                              Reactivate
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

          {/* Pagination Controls */}
          {!loading && total > 0 && (
            <Toolbar
              left={
                <span className="bezent-caption">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} customer tenants
                </span>
              }
              right={
                <Inline gap="md" align="center">
                  <Inline gap="xs" align="center">
                    <span className="bezent-caption">Page size:</span>
                    <Select
                      value={String(pageSize)}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      options={[
                        { value: '10', label: '10' },
                        { value: '20', label: '20' },
                        { value: '50', label: '50' },
                      ]}
                    />
                  </Inline>

                  <Inline gap="xs" align="center">
                    <span className="bezent-caption">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      leftIcon={<BezentIcon name="chevronLeft" size={14} color="currentColor" />}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      rightIcon={<BezentIcon name="chevronRight" size={14} color="currentColor" />}
                    >
                      Next
                    </Button>
                  </Inline>
                </Inline>
              }
            />
          )}
        </Stack>
      </Card>

      {/* Suspend Tenant Modal */}
      <Modal
        isOpen={suspendTarget !== null}
        onClose={() => setSuspendTarget(null)}
        title="Suspend Customer Tenant"
        description={`Suspending customer '${suspendTarget?.name}' will immediately revoke access to all business applications for every company and user under this account. Active sessions will be terminated.`}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmSuspend}
              disabled={submittingSuspend || !suspendReason.trim()}
            >
              {submittingSuspend ? 'Suspending...' : 'Confirm Suspension'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleConfirmSuspend}>
          <Stack gap="md">
            {suspendReasonError && (
              <Alert variant="error" title="Validation Error">
                {suspendReasonError}
              </Alert>
            )}

            <Alert variant="warning" title="Customer-Wide Impact">
              This action disables all organization workspaces and application access for this customer. Entitlements will be paused until reactivated by an authorized Super Administrator.
            </Alert>

            <Input
              label="Suspension Reason *"
              placeholder="e.g. Terms of Service violation, non-payment, or administrative hold"
              value={suspendReason}
              onChange={(e) => {
                setSuspendReason(e.target.value);
                setSuspendReasonError(null);
              }}
              required
            />
          </Stack>
        </form>
      </Modal>

      {/* Reactivate Tenant Modal */}
      <Modal
        isOpen={reactivateTarget !== null}
        onClose={() => setReactivateTarget(null)}
        title="Reactivate Customer Tenant"
        description={`Reactivating customer '${reactivateTarget?.name}' will restore access to all entitled applications and authorized users under this customer domain.`}
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setReactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmReactivate}
              disabled={submittingReactivate}
            >
              {submittingReactivate ? 'Reactivating...' : 'Confirm Reactivation'}
            </Button>
          </Inline>
        }
      >
        <Stack gap="sm">
          <Alert variant="info" title="Access Restoration">
            The customer organization will return to active operational state. Note that reactivation does not automatically restore expired or cancelled application subscriptions.
          </Alert>
        </Stack>
      </Modal>
    </Page>
  );
}
