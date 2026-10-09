import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tabs,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type TenantRecord,
  type TenantOverviewData,
  type SubscriptionDetailRecord,
  type EffectiveEntitlementResult,
  type EntitlementOverrideRecord,
  type ProvisioningJobRecord,
  type WorkerStatusRecord,
  type LifecycleEventRecord,
  type AuditLogEntry,
} from '../api/superAdminApi';

export type TabKey = 'overview' | 'entitlements' | 'provisioning' | 'lifecycle' | 'activity';

const VALID_TABS: readonly TabKey[] = [
  'overview',
  'entitlements',
  'provisioning',
  'lifecycle',
  'activity',
];

export interface TenantDetailsPageProps {
  initialTenant?: TenantRecord;
  initialOverview?: TenantOverviewData;
  initialSubscriptions?: SubscriptionDetailRecord[];
  initialEntitlements?: EffectiveEntitlementResult[];
  initialOverrides?: EntitlementOverrideRecord[];
  initialJobs?: ProvisioningJobRecord[];
  initialLifecycleHistory?: LifecycleEventRecord[];
  initialAuditLogs?: AuditLogEntry[];
  initialLoading?: boolean;
}

export function TenantDetailsPage({
  initialTenant,
  initialOverview,
  initialSubscriptions,
  initialEntitlements,
  initialOverrides,
  initialJobs,
  initialLifecycleHistory,
  initialAuditLogs,
  initialLoading,
}: TenantDetailsPageProps = {}) {
  const { tenantId, tab } = useParams<{ tenantId: string; tab?: string }>();
  const navigate = useNavigate();

  // Active Tab State (derived from URL param or default)
  const activeTab: TabKey = useMemo(() => {
    if (tab && (VALID_TABS as readonly string[]).includes(tab)) {
      return tab as TabKey;
    }
    return 'overview';
  }, [tab]);

  const handleTabChange = (newTabId: string) => {
    if ((VALID_TABS as readonly string[]).includes(newTabId) && tenantId) {
      navigate(`/super-admin/tenants/${tenantId}/${newTabId}`);
    }
  };

  // Base Tenant & Overview State
  const [tenant, setTenant] = useState<TenantRecord | null>(initialTenant ?? null);
  const [overview, setOverview] = useState<TenantOverviewData | null>(initialOverview ?? null);
  const [loading, setLoading] = useState<boolean>(() => {
    if (initialLoading !== undefined) return initialLoading;
    return !(initialTenant || initialOverview);
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab 2: Entitlements & Subscriptions State
  const [subscriptions, setSubscriptions] = useState<SubscriptionDetailRecord[]>(
    initialSubscriptions ?? [],
  );
  const [entitlements, setEntitlements] = useState<EffectiveEntitlementResult[]>(
    initialEntitlements ?? [],
  );
  const [overrides, setOverrides] = useState<EntitlementOverrideRecord[]>(
    initialOverrides ?? [],
  );
  const [loadingEntitlements, setLoadingEntitlements] = useState<boolean>(false);
  const [entitlementsError, setEntitlementsError] = useState<string | null>(null);

  // Tab 3: Provisioning Jobs State
  const [jobs, setJobs] = useState<ProvisioningJobRecord[]>(initialJobs ?? []);
  const [loadingJobs, setLoadingJobs] = useState<boolean>(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ProvisioningJobRecord | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusRecord | null>(null);

  // Tab 4: Lifecycle History State
  const [lifecycleEvents, setLifecycleEvents] = useState<LifecycleEventRecord[]>(
    initialLifecycleHistory ?? [],
  );
  const [loadingLifecycle, setLoadingLifecycle] = useState<boolean>(false);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  // Tab 5: Activity Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs ?? []);
  const [activityTotal, setActivityTotal] = useState<number>(initialAuditLogs?.length ?? 0);
  const [activityPage, setActivityPage] = useState<number>(1);
  const [activityFilterAction, setActivityFilterAction] = useState<string>('');
  const [activityFilterEmail, setActivityFilterEmail] = useState<string>('');
  const [loadingActivity, setLoadingActivity] = useState<boolean>(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  // Action Modals State
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState<boolean>(false);
  const [suspendReason, setSuspendReason] = useState<string>('Administrative suspension');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState<boolean>(false);

  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState<boolean>(false);
  const [reactivateReason, setReactivateReason] = useState<string>('Administrative reactivation');
  const [isSubmittingReactivate, setIsSubmittingReactivate] = useState<boolean>(false);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [overrideApp, setOverrideApp] = useState<'hrms' | 'crm' | 'project_management'>('hrms');
  const [overrideModule, setOverrideModule] = useState<string>('leave');
  const [overrideType, setOverrideType] = useState<'enable' | 'disable' | 'limit'>('enable');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  // ── Fetch Overview & Base Tenant ──────────────────────────────────
  const fetchTenantOverview = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, tenantRes] = await Promise.all([
        superAdminApi.getTenantOverview(tenantId).catch(() => null),
        superAdminApi.getTenant(tenantId).catch(() => null),
      ]);

      if (overviewRes) {
        setOverview(overviewRes);
      }
      if (tenantRes) {
        setTenant(tenantRes);
      } else if (overviewRes?.tenant) {
        setTenant({
          id: overviewRes.tenant.id,
          name: overviewRes.tenant.name,
          code: overviewRes.tenant.code,
          contactEmail: overviewRes.tenant.contactEmail,
          contactPhone: overviewRes.tenant.contactPhone,
          status: overviewRes.tenant.status === 'archived' ? 'suspended' : (overviewRes.tenant.status as TenantRecord['status']),
          createdAt: overviewRes.tenant.createdAt,
          updatedAt: overviewRes.tenant.updatedAt,
          logoUrl: overviewRes.tenant.logoUrl,
          health: overviewRes.health,
          setupProgress: overviewRes.setupProgress,
          derivedCommercialClassification: overviewRes.derivedCommercialClassification,
        });
      } else {
        throw new Error(`Customer tenant '${tenantId}' was not found.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load customer tenant profile');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // ── Fetch Entitlements Data ───────────────────────────────────────
  const fetchEntitlementsData = useCallback(async () => {
    if (!tenantId) return;
    setLoadingEntitlements(true);
    setEntitlementsError(null);
    try {
      const [subs, ents, ovrs] = await Promise.all([
        superAdminApi.getTenantSubscriptions(tenantId).catch(() => []),
        superAdminApi.getTenantEntitlements(tenantId).catch(() => []),
        superAdminApi.getTenantOverrides(tenantId).catch(() => []),
      ]);
      setSubscriptions(subs);
      setEntitlements(ents);
      setOverrides(ovrs);
    } catch (err: unknown) {
      setEntitlementsError(
        err instanceof Error ? err.message : 'Failed to load entitlement information',
      );
    } finally {
      setLoadingEntitlements(false);
    }
  }, [tenantId]);

  // ── Fetch Provisioning Data ───────────────────────────────────────
  const fetchProvisioningData = useCallback(async () => {
    if (!tenantId) return;
    setLoadingJobs(true);
    setJobsError(null);
    try {
      const [res, worker] = await Promise.all([
        superAdminApi.listProvisioningJobs({ tenantId, limit: 50 }),
        superAdminApi.getWorkerStatus().catch(() => null),
      ]);
      setJobs(res.items);
      if (worker) setWorkerStatus(worker);
    } catch (err: unknown) {
      setJobsError(err instanceof Error ? err.message : 'Failed to load provisioning jobs');
    } finally {
      setLoadingJobs(false);
    }
  }, [tenantId]);

  // ── Fetch Lifecycle Data ──────────────────────────────────────────
  const fetchLifecycleData = useCallback(async () => {
    if (!tenantId) return;
    setLoadingLifecycle(true);
    setLifecycleError(null);
    try {
      const events = await superAdminApi.getTenantLifecycleHistory(tenantId);
      setLifecycleEvents(events);
    } catch (err: unknown) {
      setLifecycleError(err instanceof Error ? err.message : 'Failed to load lifecycle history');
    } finally {
      setLoadingLifecycle(false);
    }
  }, [tenantId]);

  // ── Fetch Activity Data ───────────────────────────────────────────
  const fetchActivityData = useCallback(async () => {
    if (!tenantId) return;
    setLoadingActivity(true);
    setActivityError(null);
    try {
      const res = await superAdminApi.getTenantActivity(tenantId, {
        action: activityFilterAction || undefined,
        actorEmail: activityFilterEmail || undefined,
        page: activityPage,
        limit: 25,
      });
      setAuditLogs(res.items);
      setActivityTotal(res.total);
    } catch (err: unknown) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load tenant activity logs');
    } finally {
      setLoadingActivity(false);
    }
  }, [tenantId, activityFilterAction, activityFilterEmail, activityPage]);

  // ── Initial and Reactive Loading ──────────────────────────────────
  useEffect(() => {
    fetchTenantOverview();
  }, [fetchTenantOverview]);

  useEffect(() => {
    if (activeTab === 'entitlements') {
      fetchEntitlementsData();
    } else if (activeTab === 'provisioning') {
      fetchProvisioningData();
    } else if (activeTab === 'lifecycle') {
      fetchLifecycleData();
    } else if (activeTab === 'activity') {
      fetchActivityData();
    }
  }, [
    activeTab,
    fetchEntitlementsData,
    fetchProvisioningData,
    fetchLifecycleData,
    fetchActivityData,
  ]);

  // ── Refresh Handler (Cross-tab Invalidation) ──────────────────────
  const handleRefreshAll = async () => {
    await fetchTenantOverview();
    if (activeTab === 'entitlements') await fetchEntitlementsData();
    if (activeTab === 'provisioning') await fetchProvisioningData();
    if (activeTab === 'lifecycle') await fetchLifecycleData();
    if (activeTab === 'activity') await fetchActivityData();
    setSuccessMessage('Workspace data refreshed successfully.');
  };

  // ── Lifecycle Action Handlers ─────────────────────────────────────
  const handleConfirmSuspend = async () => {
    if (!tenantId) return;
    setIsSubmittingSuspend(true);
    setError(null);
    try {
      await superAdminApi.suspendTenant(tenantId, suspendReason);
      setSuccessMessage(`Tenant '${tenant?.name || tenantId}' has been suspended.`);
      setIsSuspendModalOpen(false);
      await Promise.all([fetchTenantOverview(), fetchLifecycleData()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to suspend tenant');
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleConfirmReactivate = async () => {
    if (!tenantId) return;
    setIsSubmittingReactivate(true);
    setError(null);
    try {
      await superAdminApi.reactivateTenant(tenantId, reactivateReason);
      setSuccessMessage(`Tenant '${tenant?.name || tenantId}' has been reactivated.`);
      setIsReactivateModalOpen(false);
      await Promise.all([fetchTenantOverview(), fetchLifecycleData()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate tenant');
    } finally {
      setIsSubmittingReactivate(false);
    }
  };

  // ── Provisioning Retry Handler ────────────────────────────────────
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    setJobsError(null);
    try {
      await superAdminApi.retryProvisioningJob(jobId);
      setSuccessMessage(`Provisioning job '${jobId}' enqueued for retry.`);
      await Promise.all([fetchProvisioningData(), fetchTenantOverview()]);
    } catch (err: unknown) {
      setJobsError(err instanceof Error ? err.message : 'Failed to retry provisioning job');
    } finally {
      setRetryingJobId(null);
    }
  };

  // ── Override Management Handlers ──────────────────────────────────
  const handleCreateOverrideSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setIsSubmittingOverride(true);
    setEntitlementsError(null);
    try {
      await superAdminApi.createTenantOverride(tenantId, {
        applicationCode: overrideApp,
        moduleCode: overrideModule,
        overrideType,
        reason: overrideReason.trim() || 'Manual administrative override',
      });
      setSuccessMessage(`Entitlement override created for ${overrideApp}.${overrideModule}.`);
      setIsOverrideModalOpen(false);
      await fetchEntitlementsData();
    } catch (err: unknown) {
      setEntitlementsError(
        err instanceof Error ? err.message : 'Failed to create entitlement override',
      );
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleRevokeOverride = async (overrideId: string) => {
    if (!tenantId) return;
    try {
      await superAdminApi.revokeTenantOverride(
        tenantId,
        overrideId,
        'Administrative override revocation',
      );
      setSuccessMessage('Entitlement override revoked.');
      await fetchEntitlementsData();
    } catch (err: unknown) {
      setEntitlementsError(
        err instanceof Error ? err.message : 'Failed to revoke entitlement override',
      );
    }
  };

  // ── Activity CSV Export Handler ───────────────────────────────────
  const handleExportCsv = async () => {
    if (!tenantId) return;
    setIsExportingCsv(true);
    try {
      const blob = await superAdminApi.downloadTenantActivityCsv(tenantId, {
        action: activityFilterAction || undefined,
        actorEmail: activityFilterEmail || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-activity-${tenant?.code || tenantId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccessMessage('Audit activity CSV exported successfully.');
    } catch (err: unknown) {
      setActivityError(err instanceof Error ? err.message : 'Failed to export audit activity CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // ── Safe Helpers ──────────────────────────────────────────────────
  const getInitials = (name?: string): string => {
    if (!name) return 'TN';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0]! + parts[1][0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentStatus = overview?.tenant.status || tenant?.status || 'active';
  const commercialClassification =
    overview?.derivedCommercialClassification ||
    tenant?.derivedCommercialClassification ||
    (currentStatus === 'suspended' ? 'suspended' : 'active');

  // ── Loading Screen ────────────────────────────────────────────────
  if (loading && !tenant && !overview) {
    return (
      <Page>
        <LoadingState label="Loading customer tenant profile..." fill />
      </Page>
    );
  }

  // ── Not Found Screen ──────────────────────────────────────────────
  if (!loading && !tenant && !overview) {
    return (
      <Page>
        <EmptyState
          title="Customer Tenant Not Found"
          description={`The customer tenant with ID '${tenantId}' does not exist or has been removed.`}
          primaryAction={{
            label: 'Back to All Tenants',
            onClick: () => navigate('/super-admin/tenants'),
          }}
        />
      </Page>
    );
  }

  return (
    <Page>
      {/* ── Top Shared Header ──────────────────────────────────────── */}
      <PageHeader
        breadcrumbs={
          <Inline gap="xs" align="center">
            <Button
              variant="text"
              size="sm"
              onClick={() => navigate('/super-admin/tenants')}
            >
              All Tenants
            </Button>
            <span className="bezent-caption" aria-hidden="true">&rarr;</span>
            <span className="bezent-caption">
              {overview?.tenant.name || tenant?.name || 'Tenant Details'}
            </span>
          </Inline>
        }
        title={
          <Inline gap="sm" align="center">
            <Avatar
              initials={getInitials(overview?.tenant.name || tenant?.name)}
              size="md"
              shape="square"
            />
            <span>{overview?.tenant.name || tenant?.name || 'Customer Tenant'}</span>
          </Inline>
        }
        badge={
          <Inline gap="xs" align="center">
            <Badge variant={currentStatus === 'active' ? 'success' : 'danger'}>
              {`Lifecycle: ${currentStatus}`}
            </Badge>
            <Badge variant={commercialClassification === 'active' ? 'info' : 'warning'}>
              {`Commercial: ${commercialClassification}`}
            </Badge>
          </Inline>
        }
        subtitle={`Tenant ID: ${tenantId || tenant?.id} • Primary Company: ${overview?.primaryCompany?.name || 'Primary Entity'}`}
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="secondary"
              onClick={() => navigate('/super-admin/tenants')}
              leftIcon={<BezentIcon name="chevron_left" size={16} color="currentColor" />}
            >
              Back to All Tenants
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefreshAll}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            {currentStatus === 'active' ? (
              <Button
                variant="danger"
                onClick={() => setIsSuspendModalOpen(true)}
                leftIcon={<BezentIcon name="close" size={16} color="currentColor" />}
              >
                Suspend Tenant
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsReactivateModalOpen(true)}
                leftIcon={<BezentIcon name="check" size={16} color="currentColor" />}
              >
                Reactivate Tenant
              </Button>
            )}
          </Inline>
        }
      />

      {/* Global Alerts */}
      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* ── Header Metadata Bar ────────────────────────────────────── */}
      <Card variant="flat" padding="md">
        <Inline justify="between" align="center">
          <Inline gap="md" align="center">
            <Inline gap="xs" align="center">
              <span className="bezent-caption">Lifecycle Status:</span>
              <Badge
                variant={currentStatus === 'active' ? 'success' : 'danger'}
                showDot
                size="md"
              >
                {currentStatus.toUpperCase()}
              </Badge>
            </Inline>

            <Inline gap="xs" align="center">
              <span className="bezent-caption">Commercial Classification:</span>
              <Badge
                variant={
                  commercialClassification === 'active'
                    ? 'success'
                    : commercialClassification === 'trial'
                      ? 'warning'
                      : 'neutral'
                }
                size="md"
              >
                {commercialClassification.toUpperCase()}
              </Badge>
            </Inline>

            <Inline gap="xs" align="center">
              <span className="bezent-caption">Created:</span>
              <strong>
                {new Date(
                  overview?.tenant.createdAt || tenant?.createdAt || Date.now(),
                ).toLocaleDateString()}
              </strong>
            </Inline>
          </Inline>

          <Inline gap="xs" align="center">
            <span className="bezent-caption">System Code:</span>
            <code>{overview?.tenant.code || tenant?.code || 'N/A'}</code>
          </Inline>
        </Inline>
      </Card>

      {/* ── Five Canonical Tabs ────────────────────────────────────── */}
      <Tabs
        activeId={activeTab}
        onChange={handleTabChange}
        variant="underline"
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'entitlements', label: 'Entitlements' },
          { id: 'provisioning', label: 'Provisioning' },
          { id: 'lifecycle', label: 'Lifecycle' },
          { id: 'activity', label: 'Activity' },
        ]}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: OVERVIEW ───────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
          <Stack gap="lg">
            {/* Attention Required Section */}
            {overview?.attentionRequired?.needed && (
              <Alert
                variant="warning"
                title="Attention Required"
              >
                <Stack gap="xs">
                  <span>{overview.attentionRequired.reason || 'Account requires administrative attention.'}</span>
                  {overview.attentionRequired.action?.label && (
                    <span className="bezent-caption">
                      Recommended Action: <strong>{overview.attentionRequired.action.label}</strong>
                    </span>
                  )}
                </Stack>
              </Alert>
            )}

            {/* Metrics Overview Grid */}
            <Grid columns={4} gap="md">
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Active Users</span>
                  <h2 className="bezent-heading-lg">{overview?.activeUsers ?? 0}</h2>
                  <span className="bezent-caption">Registered company members</span>
                </Stack>
              </Card>

              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Licensed Seats</span>
                  <h2 className="bezent-heading-lg">{overview?.licensedSeats ?? 0}</h2>
                  <span className="bezent-caption">Total active subscription seats</span>
                </Stack>
              </Card>

              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Company Capacity</span>
                  <h2 className="bezent-heading-lg">
                    {overview?.companyCapacity ? `${overview.companyCapacity.used} / ${overview.companyCapacity.max}` : '1 / 1'}
                  </h2>
                  <span className="bezent-caption">
                    {overview?.companyCapacity?.remaining ?? 0} remaining slot(s)
                  </span>
                </Stack>
              </Card>

              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Setup Progress</span>
                  <h2 className="bezent-heading-lg">
                    {overview?.setupProgress?.percentage ?? 100}%
                  </h2>
                  <span className="bezent-caption">
                    {overview?.setupProgress?.isComplete ? 'All milestones complete' : 'Setup in progress'}
                  </span>
                </Stack>
              </Card>
            </Grid>

            {/* Section A: Tenant Identity & Section B: Primary Administrator */}
            <Grid columns={2} gap="md">
              {/* Tenant Identity */}
              <Card padding="md">
                <Stack gap="md">
                  <h3 className="bezent-heading-sm">Tenant Identity & Legal Entity</h3>
                  <Grid columns={2} gap="sm">
                    <div>
                      <span className="bezent-caption">Legal Name:</span>
                      <div><strong>{overview?.tenant.name || tenant?.name}</strong></div>
                    </div>
                    <div>
                      <span className="bezent-caption">Tenant ID:</span>
                      <div><code>{tenantId}</code></div>
                    </div>
                    <div>
                      <span className="bezent-caption">Tenant Code:</span>
                      <div><strong>{overview?.tenant.code || tenant?.code}</strong></div>
                    </div>
                    <div>
                      <span className="bezent-caption">Contact Email:</span>
                      <div>{overview?.tenant.contactEmail || tenant?.contactEmail || 'None'}</div>
                    </div>
                    <div>
                      <span className="bezent-caption">Primary Company:</span>
                      <div>{overview?.primaryCompany?.name || 'Primary Company'}</div>
                    </div>
                    <div>
                      <span className="bezent-caption">Created Date:</span>
                      <div>{new Date(overview?.tenant.createdAt || tenant?.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                  </Grid>
                </Stack>
              </Card>

              {/* Primary Administrator */}
              <Card padding="md">
                <Stack gap="md">
                  <h3 className="bezent-heading-sm">Primary Administrator</h3>
                  {overview?.primaryAdmin ? (
                    <Grid columns={2} gap="sm">
                      <div>
                        <span className="bezent-caption">Full Name:</span>
                        <div><strong>{overview.primaryAdmin.name}</strong></div>
                      </div>
                      <div>
                        <span className="bezent-caption">Work Email:</span>
                        <div>{overview.primaryAdmin.email}</div>
                      </div>
                      <div>
                        <span className="bezent-caption">Invitation Status:</span>
                        <div>
                          <Badge
                            variant={overview.primaryAdmin.status === 'active' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {overview.primaryAdmin.status === 'pending'
                              ? 'Pending Invitation (72-hour validity)'
                              : overview.primaryAdmin.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="bezent-caption">Accepted Date:</span>
                        <div>
                          {overview.primaryAdmin.acceptedAt
                            ? new Date(overview.primaryAdmin.acceptedAt).toLocaleDateString()
                            : 'Pending email OTP verification'}
                        </div>
                      </div>
                    </Grid>
                  ) : (
                    <EmptyState
                      title="No Primary Administrator"
                      description="No primary administrator has been assigned or invited to this tenant."
                    />
                  )}
                </Stack>
              </Card>
            </Grid>

            {/* Section C: Applications Access & Subscriptions */}
            <Card padding="md">
              <Stack gap="md">
                <h3 className="bezent-heading-sm">Active Applications & Subscriptions</h3>
                {overview?.enabledApplications && overview.enabledApplications.length > 0 ? (
                  <Grid columns={3} gap="md">
                    {overview.enabledApplications.map((app) => (
                      <Card key={app.applicationCode} variant="flat" padding="md">
                        <Stack gap="xs">
                          <Inline justify="between" align="center">
                            <strong>{app.applicationCode.toUpperCase()}</strong>
                            <Badge variant={app.status === 'active' ? 'success' : 'warning'} size="sm">
                              {app.status.toUpperCase()}
                            </Badge>
                          </Inline>
                          <span className="bezent-caption">Plan: {app.planId}</span>
                          <span className="bezent-caption">
                            Type: {app.isTrial ? '14-Day Free Trial' : 'Commercial Paid License'}
                          </span>
                          <span className="bezent-caption">Licensed Seats: {app.seats}</span>
                        </Stack>
                      </Card>
                    ))}
                  </Grid>
                ) : (
                  <Alert variant="info" title="Zero Applications Configured">
                    This customer tenant was created without active applications. Applications and plans can be configured in the Entitlements tab.
                  </Alert>
                )}
              </Stack>
            </Card>

            {/* Section E: Technical Provisioning & Setup */}
            <Card padding="md">
              <Stack gap="md">
                <h3 className="bezent-heading-sm">Technical Provisioning Status</h3>
                {overview?.provisioningHealth ? (
                  <Grid columns={3} gap="md">
                    <div>
                      <span className="bezent-caption">Status:</span>
                      <div>
                        <Badge
                          variant={
                            overview.provisioningHealth.status === 'completed'
                              ? 'success'
                              : overview.provisioningHealth.status === 'failed'
                                ? 'danger'
                                : 'neutral'
                          }
                          size="md"
                        >
                          {overview.provisioningHealth.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="bezent-caption">Execution Attempts:</span>
                      <div>
                        {overview.provisioningHealth.attemptCount} / {overview.provisioningHealth.maxAttempts}
                      </div>
                    </div>
                    <div>
                      <span className="bezent-caption">Last Updated:</span>
                      <div>
                        {overview.provisioningHealth.lastUpdated
                          ? new Date(overview.provisioningHealth.lastUpdated).toLocaleDateString()
                          : 'Recent'}
                      </div>
                    </div>
                  </Grid>
                ) : (
                  <span className="bezent-caption">
                    No asynchronous provisioning jobs executed for this tenant.
                  </span>
                )}
              </Stack>
            </Card>
          </Stack>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: ENTITLEMENTS ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'entitlements' && (
        <div id="panel-entitlements" role="tabpanel" aria-labelledby="tab-entitlements">
          <Stack gap="lg">
            {entitlementsError && (
              <Alert variant="error" title="Entitlements Error" onDismiss={() => setEntitlementsError(null)}>
                {entitlementsError}
              </Alert>
            )}

            {loadingEntitlements && <LoadingState label="Loading tenant entitlements and subscriptions..." />}

            {/* Section A: Application Subscriptions */}
            <Card padding="md">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">Application Subscriptions</h3>
                </Inline>

                {subscriptions.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Application</TableHeaderCell>
                        <TableHeaderCell>Plan</TableHeaderCell>
                        <TableHeaderCell>Access Mode</TableHeaderCell>
                        <TableHeaderCell>Licensed Seats</TableHeaderCell>
                        <TableHeaderCell>Billing Cycle</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell><strong>{sub.applicationCode.toUpperCase()}</strong></TableCell>
                          <TableCell>{sub.planName || sub.planId}</TableCell>
                          <TableCell>{sub.accessMode === 'trial' ? 'Free Trial' : 'Commercial Paid'}</TableCell>
                          <TableCell>{sub.licensedSeats}</TableCell>
                          <TableCell>{sub.billingCycle}</TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'active' ? 'success' : 'warning'} size="sm">
                              {sub.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Inline gap="xs">
                              {sub.status === 'active' && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await superAdminApi.cancelSubscription(sub.id, 'Administrative cancellation');
                                      setSuccessMessage(`Subscription '${sub.id}' cancelled.`);
                                      await fetchEntitlementsData();
                                    } catch (err: unknown) {
                                      setEntitlementsError(err instanceof Error ? err.message : 'Failed to cancel subscription');
                                    }
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                              {sub.status === 'cancelled' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await superAdminApi.renewSubscription(sub.id);
                                      setSuccessMessage(`Subscription '${sub.id}' renewed.`);
                                      await fetchEntitlementsData();
                                    } catch (err: unknown) {
                                      setEntitlementsError(err instanceof Error ? err.message : 'Failed to renew subscription');
                                    }
                                  }}
                                >
                                  Renew
                                </Button>
                              )}
                            </Inline>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="No Active Subscriptions"
                    description="No application subscriptions are currently assigned to this tenant."
                  />
                )}
              </Stack>
            </Card>

            {/* Section B: Effective Entitlements */}
            <Card padding="md">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">Effective Entitlements & Runtime Access</h3>
                  <Badge variant="neutral" size="sm">
                    {entitlements.length} Application(s) Configured
                  </Badge>
                </Inline>
                {entitlements.length > 0 ? (
                  <Stack gap="md">
                    {entitlements.map((e) => {
                      const enabledMods = e.modules ? e.modules.filter((m) => m.isEnabled) : [];
                      const disabledMods = e.modules ? e.modules.filter((m) => !m.isEnabled) : [];

                      return (
                        <Card key={e.applicationCode} variant="flat" padding="md">
                          <Stack gap="sm">
                            <Inline justify="between" align="center">
                              <Inline gap="sm" align="center">
                                <strong>{e.applicationCode.toUpperCase()}</strong>
                                <Badge variant={e.isEntitled ? 'success' : 'neutral'} size="sm">
                                  {e.isEntitled ? 'Entitled' : 'Not Entitled'}
                                </Badge>
                                {e.planName && (
                                  <Badge variant="info" size="sm">
                                    Plan: {e.planName}
                                  </Badge>
                                )}
                              </Inline>
                              <Inline gap="md" align="center">
                                <span className="bezent-caption">
                                  Seats: <strong>{e.licensedSeats ?? 0}</strong>
                                </span>
                                <span className="bezent-caption">
                                  Source: <code>{e.source}</code>
                                </span>
                              </Inline>
                            </Inline>

                            {/* Modules Breakdown */}
                            <Grid columns={2} gap="md">
                              {/* Enabled Modules */}
                              <Card variant="flat" padding="sm">
                                <Stack gap="xs">
                                  <Inline justify="between" align="center">
                                    <span className="bezent-caption">
                                      <strong>Enabled Modules ({enabledMods.length})</strong>
                                    </span>
                                  </Inline>
                                  {enabledMods.length > 0 ? (
                                    <Stack gap="xs">
                                      {enabledMods.map((mod) => (
                                        <Inline key={mod.moduleCode} justify="between" align="center">
                                          <Inline gap="xs" align="center">
                                            <code>{mod.moduleCode}</code>
                                            {mod.moduleCode === 'organization' || mod.moduleCode === 'employees' ? (
                                              <Badge variant="info" size="sm">Mandatory</Badge>
                                            ) : null}
                                          </Inline>
                                          <Inline gap="xs" align="center">
                                            <Badge
                                              variant={mod.source === 'override' ? 'warning' : 'success'}
                                              size="sm"
                                            >
                                              {mod.source === 'override' ? 'Override' : 'Plan Default'}
                                            </Badge>
                                            {mod.overrideReason && (
                                              <span className="bezent-caption" title={mod.overrideReason}>
                                                ({mod.overrideReason})
                                              </span>
                                            )}
                                          </Inline>
                                        </Inline>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <span className="bezent-caption">No modules enabled for this application.</span>
                                  )}
                                </Stack>
                              </Card>

                              {/* Disabled Modules */}
                              <Card variant="flat" padding="sm">
                                <Stack gap="xs">
                                  <Inline justify="between" align="center">
                                    <span className="bezent-caption">
                                      <strong>Disabled / Excluded Modules ({disabledMods.length})</strong>
                                    </span>
                                  </Inline>
                                  {disabledMods.length > 0 ? (
                                    <Stack gap="xs">
                                      {disabledMods.map((mod) => (
                                        <Inline key={mod.moduleCode} justify="between" align="center">
                                          <code>{mod.moduleCode}</code>
                                          <Badge variant="neutral" size="sm">
                                            {mod.source === 'override' ? 'Override Disabled' : 'Plan Excluded'}
                                          </Badge>
                                        </Inline>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <span className="bezent-caption">All eligible modules are active.</span>
                                  )}
                                </Stack>
                              </Card>
                            </Grid>
                          </Stack>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <span className="bezent-caption">No effective entitlement records found.</span>
                )}
              </Stack>
            </Card>

            {/* Section C: Entitlement Overrides */}
            <Card padding="md">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">Administrative Entitlement Overrides</h3>
                  <Button variant="primary" size="sm" onClick={() => setIsOverrideModalOpen(true)}>
                    + Create Override
                  </Button>
                </Inline>

                {overrides.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Application</TableHeaderCell>
                        <TableHeaderCell>Module Code</TableHeaderCell>
                        <TableHeaderCell>Override Type</TableHeaderCell>
                        <TableHeaderCell>Reason</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overrides.map((ovr) => (
                        <TableRow key={ovr.id}>
                          <TableCell>{ovr.applicationCode.toUpperCase()}</TableCell>
                          <TableCell><code>{ovr.moduleCode}</code></TableCell>
                          <TableCell><Badge size="sm">{ovr.overrideType.toUpperCase()}</Badge></TableCell>
                          <TableCell>{ovr.reason}</TableCell>
                          <TableCell>
                            <Badge variant={ovr.revokedAt ? 'neutral' : 'success'} size="sm">
                              {ovr.revokedAt ? 'Revoked' : 'Active'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {!ovr.revokedAt && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRevokeOverride(ovr.id)}
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <span className="bezent-caption">No custom administrative overrides configured.</span>
                )}
              </Stack>
            </Card>
          </Stack>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: PROVISIONING ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'provisioning' && (
        <div id="panel-provisioning" role="tabpanel" aria-labelledby="tab-provisioning">
          <Stack gap="lg">
            {jobsError && (
              <Alert variant="error" title="Provisioning Error" onDismiss={() => setJobsError(null)}>
                {jobsError}
              </Alert>
            )}

            {loadingJobs && <LoadingState label="Loading asynchronous provisioning jobs..." />}

            {/* Jobs Summary Cards */}
            <Grid columns={4} gap="md">
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Total Jobs</span>
                  <h2 className="bezent-heading-lg">{jobs.length}</h2>
                </Stack>
              </Card>
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Completed</span>
                  <h2 className="bezent-heading-lg">
                    {jobs.filter((j) => j.status === 'completed').length}
                  </h2>
                </Stack>
              </Card>
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Pending</span>
                  <h2 className="bezent-heading-lg">
                    {jobs.filter((j) => j.status === 'pending').length}
                  </h2>
                </Stack>
              </Card>
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Failed</span>
                  <h2 className="bezent-heading-lg">
                    {jobs.filter((j) => j.status === 'failed').length}
                  </h2>
                </Stack>
              </Card>
            </Grid>

            {/* Jobs Table */}
            <Card padding="md">
              <Stack gap="md">
                <h3 className="bezent-heading-sm">Provisioning Execution Jobs</h3>
                {jobs.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Job ID</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Attempts</TableHeaderCell>
                        <TableHeaderCell>Created</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell><code>{job.id}</code></TableCell>
                          <TableCell>{job.jobType.replace(/_/g, ' ').toUpperCase()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                job.status === 'completed'
                                  ? 'success'
                                  : job.status === 'failed'
                                    ? 'danger'
                                    : 'neutral'
                              }
                              size="sm"
                            >
                              {job.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{job.attemptCount} / {job.maxAttempts}</TableCell>
                          <TableCell>{new Date(job.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Inline gap="xs">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedJob(job)}
                              >
                                View Details
                              </Button>
                              {job.status === 'failed' && job.retryEligible && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={retryingJobId === job.id}
                                  onClick={() => handleRetryJob(job.id)}
                                >
                                  {retryingJobId === job.id ? 'Retrying...' : 'Retry'}
                                </Button>
                              )}
                            </Inline>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="No Provisioning Jobs"
                    description="No background provisioning jobs have been created for this tenant."
                  />
                )}
              </Stack>
            </Card>

            {/* Section E: Worker & Queue Health */}
            <Card padding="md">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">Worker &amp; Queue Health</h3>
                  <Badge variant={workerStatus?.isProcessing ? 'success' : 'neutral'} size="sm">
                    {workerStatus?.status ? workerStatus.status.toUpperCase() : 'OPERATIONAL'}
                  </Badge>
                </Inline>
                <Grid columns={3} gap="md">
                  <Card variant="flat" padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-caption">Worker Pool</span>
                      <strong>Provisioning Worker Pool</strong>
                      <span className="bezent-caption">Active background executor</span>
                    </Stack>
                  </Card>
                  <Card variant="flat" padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-caption">Active Jobs In-Flight</span>
                      <strong>{workerStatus?.activeJobs ?? 0} jobs</strong>
                      <span className="bezent-caption">Active Processing Capacity</span>
                    </Stack>
                  </Card>
                  <Card variant="flat" padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-caption">Worker Status</span>
                      <strong>Operational</strong>
                      <span className="bezent-caption">Health checked via platform worker heartbeat</span>
                    </Stack>
                  </Card>
                </Grid>
              </Stack>
            </Card>
          </Stack>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: LIFECYCLE ──────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'lifecycle' && (
        <div id="panel-lifecycle" role="tabpanel" aria-labelledby="tab-lifecycle">
          <Stack gap="lg">
            {lifecycleError && (
              <Alert variant="error" title="Lifecycle Error" onDismiss={() => setLifecycleError(null)}>
                {lifecycleError}
              </Alert>
            )}

            {loadingLifecycle && <LoadingState label="Loading tenant lifecycle transition history..." />}

            {/* Current State & Available Actions */}
            <Card padding="md">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <Stack gap="xs">
                    <h3 className="bezent-heading-sm">Current Operational Lifecycle State</h3>
                    <span className="bezent-caption">
                      Lifecycle status determines global login access and workspace routing across all customer companies.
                    </span>
                  </Stack>
                  <Badge
                    variant={currentStatus === 'active' ? 'success' : 'danger'}
                    size="md"
                    showDot
                  >
                    {currentStatus.toUpperCase()}
                  </Badge>
                </Inline>

                <Inline gap="sm">
                  {currentStatus === 'active' ? (
                    <Button
                      variant="danger"
                      onClick={() => setIsSuspendModalOpen(true)}
                    >
                      Suspend Tenant
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => setIsReactivateModalOpen(true)}
                    >
                      Reactivate Tenant
                    </Button>
                  )}
                </Inline>
              </Stack>
            </Card>

            {/* Lifecycle Timeline */}
            <Card padding="md">
              <Stack gap="md">
                <h3 className="bezent-heading-sm">Lifecycle History Timeline</h3>
                {lifecycleEvents.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Action</TableHeaderCell>
                        <TableHeaderCell>Previous Status</TableHeaderCell>
                        <TableHeaderCell>New Status</TableHeaderCell>
                        <TableHeaderCell>Reason</TableHeaderCell>
                        <TableHeaderCell>Actor</TableHeaderCell>
                        <TableHeaderCell>Timestamp</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lifecycleEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell><strong>{event.eventType.toUpperCase()}</strong></TableCell>
                          <TableCell><Badge size="sm">{event.previousStatus}</Badge></TableCell>
                          <TableCell><Badge size="sm" variant="success">{event.newStatus}</Badge></TableCell>
                          <TableCell>{event.reason || 'None specified'}</TableCell>
                          <TableCell>{event.actorEmail || 'System'}</TableCell>
                          <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="No Lifecycle History"
                    description="No administrative lifecycle events recorded for this customer tenant."
                  />
                )}
              </Stack>
            </Card>
          </Stack>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: ACTIVITY ───────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div id="panel-activity" role="tabpanel" aria-labelledby="tab-activity">
          <Stack gap="lg">
            {activityError && (
              <Alert variant="error" title="Activity Error" onDismiss={() => setActivityError(null)}>
                {activityError}
              </Alert>
            )}

            {/* Filters & Export Toolbar */}
            <Toolbar
              left={
                <Inline gap="sm" align="center">
                  <Input
                    placeholder="Filter by action..."
                    value={activityFilterAction}
                    onChange={(e) => setActivityFilterAction(e.target.value)}
                  />
                  <Input
                    placeholder="Filter by actor email..."
                    value={activityFilterEmail}
                    onChange={(e) => setActivityFilterEmail(e.target.value)}
                  />
                  <Button variant="secondary" onClick={() => fetchActivityData()}>
                    Apply Filter
                  </Button>
                </Inline>
              }
              right={
                <Button
                  variant="secondary"
                  disabled={isExportingCsv}
                  onClick={handleExportCsv}
                  leftIcon={<BezentIcon name="download" size={16} color="currentColor" />}
                >
                  {isExportingCsv ? 'Exporting...' : 'Export CSV'}
                </Button>
              }
            />

            {loadingActivity && <LoadingState label="Loading audit activity logs..." />}

            {/* Audit Logs Table */}
            <Card padding="md">
              <Stack gap="md">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">Audit Trail ({activityTotal} events)</h3>
                </Inline>

                {auditLogs.length > 0 ? (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Timestamp</TableHeaderCell>
                        <TableHeaderCell>Action</TableHeaderCell>
                        <TableHeaderCell>Actor</TableHeaderCell>
                        <TableHeaderCell>Target Type</TableHeaderCell>
                        <TableHeaderCell>Target ID</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell><code>{log.action}</code></TableCell>
                          <TableCell>{log.actorEmail || 'System'}</TableCell>
                          <TableCell>{log.targetType}</TableCell>
                          <TableCell><code>{log.targetId}</code></TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAuditLog(log)}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    title="No Audit Activity"
                    description="No audit logs matched the specified filter criteria."
                  />
                )}
              </Stack>
            </Card>
          </Stack>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── ACTION MODALS ─────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}

      {/* 1. Suspend Modal */}
      {isSuspendModalOpen && (
        <Modal
          isOpen={isSuspendModalOpen}
          onClose={() => setIsSuspendModalOpen(false)}
          title="Suspend Customer Tenant"
        >
          <Stack gap="md">
            <Alert variant="warning" title="Impact of Tenant Suspension">
              Suspending this tenant will immediately restrict login access across all companies and applications for this customer account.
            </Alert>
            <Input
              label="Suspension Reason *"
              placeholder="e.g. Inactive commercial agreement, compliance review"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              required
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setIsSuspendModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={isSubmittingSuspend || !suspendReason.trim()}
                onClick={handleConfirmSuspend}
              >
                {isSubmittingSuspend ? 'Suspending...' : 'Confirm Suspension'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 2. Reactivate Modal */}
      {isReactivateModalOpen && (
        <Modal
          isOpen={isReactivateModalOpen}
          onClose={() => setIsReactivateModalOpen(false)}
          title="Reactivate Customer Tenant"
        >
          <Stack gap="md">
            <p>
              Reactivating this tenant restores operational eligibility and allows company members to authenticate into entitled applications.
            </p>
            <Input
              label="Reactivation Reason"
              placeholder="e.g. Account reinstated after review"
              value={reactivateReason}
              onChange={(e) => setReactivateReason(e.target.value)}
            />
            <Inline justify="end" gap="sm">
              <Button variant="secondary" onClick={() => setIsReactivateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isSubmittingReactivate}
                onClick={handleConfirmReactivate}
              >
                {isSubmittingReactivate ? 'Reactivating...' : 'Confirm Reactivation'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 3. Create Override Modal */}
      {isOverrideModalOpen && (
        <Modal
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          title="Create Entitlement Override"
        >
          <form onSubmit={handleCreateOverrideSubmit}>
            <Stack gap="md">
              <Select
                label="Application *"
                value={overrideApp}
                onChange={(e) => setOverrideApp(e.target.value as 'hrms' | 'crm' | 'project_management')}
                options={[
                  { value: 'hrms', label: 'HRMS' },
                  { value: 'crm', label: 'CRM' },
                  { value: 'project_management', label: 'Project Management' },
                ]}
              />
              <Input
                label="Module Code *"
                placeholder="e.g. leave, attendance, recruitment"
                value={overrideModule}
                onChange={(e) => setOverrideModule(e.target.value)}
                required
              />
              <Select
                label="Override Type *"
                value={overrideType}
                onChange={(e) => setOverrideType(e.target.value as 'enable' | 'disable')}
                options={[
                  { value: 'enable', label: 'Enable Module' },
                  { value: 'disable', label: 'Disable Module' },
                ]}
              />
              <Input
                label="Justification Reason *"
                placeholder="Business justification for overriding standard plan entitlement"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
              />
              <Inline justify="end" gap="sm">
                <Button variant="secondary" onClick={() => setIsOverrideModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmittingOverride}>
                  {isSubmittingOverride ? 'Saving...' : 'Create Override'}
                </Button>
              </Inline>
            </Stack>
          </form>
        </Modal>
      )}

      {/* 4. Job Details Modal */}
      {selectedJob && (
        <Modal
          isOpen={Boolean(selectedJob)}
          onClose={() => setSelectedJob(null)}
          title={`Job Details: ${selectedJob.id}`}
        >
          <Stack gap="md">
            <Grid columns={2} gap="sm">
              <div>
                <span className="bezent-caption">Job Type:</span>
                <div><strong>{selectedJob.jobType}</strong></div>
              </div>
              <div>
                <span className="bezent-caption">Status:</span>
                <div><Badge size="sm">{selectedJob.status.toUpperCase()}</Badge></div>
              </div>
              <div>
                <span className="bezent-caption">Attempts:</span>
                <div>{selectedJob.attemptCount} / {selectedJob.maxAttempts}</div>
              </div>
              <div>
                <span className="bezent-caption">Created:</span>
                <div>{new Date(selectedJob.createdAt).toLocaleString()}</div>
              </div>
            </Grid>

            {selectedJob.lastError && (
              <Alert variant="error" title="Execution Error">
                {selectedJob.lastError}
              </Alert>
            )}

            <div>
              <span className="bezent-caption">Step State Payload:</span>
              <pre className="bezent-code-block">
                {JSON.stringify(selectedJob.stepState, null, 2)}
              </pre>
            </div>

            <Inline justify="end">
              <Button variant="secondary" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 5. Audit Log Details Modal */}
      {selectedAuditLog && (
        <Modal
          isOpen={Boolean(selectedAuditLog)}
          onClose={() => setSelectedAuditLog(null)}
          title={`Audit Event: ${selectedAuditLog.id}`}
        >
          <Stack gap="md">
            <Grid columns={2} gap="sm">
              <div>
                <span className="bezent-caption">Action:</span>
                <div><code>{selectedAuditLog.action}</code></div>
              </div>
              <div>
                <span className="bezent-caption">Actor:</span>
                <div>{selectedAuditLog.actorEmail || 'System'}</div>
              </div>
              <div>
                <span className="bezent-caption">Target:</span>
                <div>{selectedAuditLog.targetType} ({selectedAuditLog.targetId})</div>
              </div>
              <div>
                <span className="bezent-caption">Timestamp:</span>
                <div>{new Date(selectedAuditLog.createdAt).toLocaleString()}</div>
              </div>
            </Grid>

            {selectedAuditLog.metadata && (
              <div>
                <span className="bezent-caption">Sanitized Metadata:</span>
                <pre className="bezent-code-block">
                  {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            <Inline justify="end">
              <Button variant="secondary" onClick={() => setSelectedAuditLog(null)}>
                Close
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
