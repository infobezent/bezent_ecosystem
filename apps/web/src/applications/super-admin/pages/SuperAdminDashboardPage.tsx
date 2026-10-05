import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Section,
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
  Badge,
  Button,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type DashboardOverview,
  type NeedsAttentionItem,
} from '../api/superAdminApi';
import {
  formatAuditAction,
  getAuditActionBadgeVariant,
  resolveAuditTarget,
  resolveAuditContext,
  formatAuditTimestamp,
} from '../utils/auditFormatters';

interface SuperAdminDashboardPageProps {
  initialData?: DashboardOverview;
}

export function SuperAdminDashboardPage({ initialData }: SuperAdminDashboardPageProps = {}) {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await superAdminApi.getDashboard();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dashboard data could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleAttentionAction = (item: NeedsAttentionItem) => {
    if (!item.nextBestAction) {
      navigate(`/super-admin/tenants/${item.tenantId}`);
      return;
    }
    if (item.nextBestAction.targetPath) {
      navigate(item.nextBestAction.targetPath);
      return;
    }
    if (item.nextBestAction.targetTab) {
      navigate(`/super-admin/tenants/${item.tenantId}?tab=${item.nextBestAction.targetTab}`);
      return;
    }
    navigate(`/super-admin/tenants/${item.tenantId}`);
  };

  return (
    <Page>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Live customer and platform operations"
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchOverview}
              disabled={loading}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/super-admin/provisioning')}
              leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
            >
              Provision Customer
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Dashboard data could not be loaded">
          <Stack gap="sm">
            <span>{error}</span>
            <div>
              <Button variant="secondary" size="sm" onClick={fetchOverview}>
                Retry
              </Button>
            </div>
          </Stack>
        </Alert>
      )}

      {loading && !data && <LoadingState label="Loading live operational metrics..." />}

      {data && (
        <Stack gap="lg">
          {/* 01 Platform Metrics */}
          <Section title="Platform Metrics">
            <Grid columns={4} gap="md">
              {/* Card 1: Customers */}
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Customers</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.customers?.total ?? data.metrics.totalTenants}</h2>
                    <Badge variant="success">
                      {data.metrics.customers?.active ?? data.metrics.activeTenants} Active
                    </Badge>
                    {(data.metrics.customers?.suspended ?? data.metrics.suspendedTenants) > 0 && (
                      <Badge variant="danger">
                        {data.metrics.customers?.suspended ?? data.metrics.suspendedTenants} Suspended
                      </Badge>
                    )}
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/tenants')}
                  >
                    View Customers →
                  </Button>
                </Stack>
              </Card>

              {/* Card 2: Companies */}
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Companies</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.companies?.total ?? data.metrics.totalCompanies}</h2>
                    <Badge variant="success">
                      {data.metrics.companies?.active ?? data.metrics.activeCompanies} Active
                    </Badge>
                    {(data.metrics.companies?.suspended ?? data.metrics.suspendedCompanies) > 0 && (
                      <Badge variant="danger">
                        {data.metrics.companies?.suspended ?? data.metrics.suspendedCompanies} Suspended
                      </Badge>
                    )}
                  </Inline>
                  {(data.metrics.companies?.withoutAdmin ?? 0) > 0 && (
                    <Inline gap="xs">
                      <Badge variant="warning">
                        {data.metrics.companies.withoutAdmin} Without Admin
                      </Badge>
                    </Inline>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/companies')}
                  >
                    Manage Companies →
                  </Button>
                </Stack>
              </Card>

              {/* Card 3: Platform Users */}
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Platform Users</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.platformUsers?.total ?? data.metrics.totalUsers}</h2>
                    <Badge variant="info">
                      {data.metrics.platformUsers?.active ?? data.metrics.activeUsers ?? 0} Active
                    </Badge>
                    {(data.metrics.platformUsers?.suspended ?? data.metrics.suspendedUsers ?? 0) > 0 && (
                      <Badge variant="danger">
                        {data.metrics.platformUsers?.suspended ?? data.metrics.suspendedUsers} Suspended
                      </Badge>
                    )}
                  </Inline>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/users')}>
                    Manage Users →
                  </Button>
                </Stack>
              </Card>

              {/* Card 4: Company Administrators */}
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Company Administrators</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.companyAdmins?.uniqueAdmins ?? data.metrics.uniqueAdmins ?? 0}</h2>
                    <Badge variant="info">
                      {data.metrics.companyAdmins?.totalAssignments ?? data.metrics.adminAssignments ?? 0} Assignments
                    </Badge>
                  </Inline>
                  {(data.metrics.companyAdmins?.companiesWithoutAdmin ?? data.metrics.companiesWithoutAdmin ?? 0) > 0 && (
                    <Inline gap="xs">
                      <Badge variant="warning">
                        {data.metrics.companyAdmins?.companiesWithoutAdmin ?? data.metrics.companiesWithoutAdmin} Unmanaged
                      </Badge>
                    </Inline>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/company-admins')}
                  >
                    Manage Admins →
                  </Button>
                </Stack>
              </Card>
            </Grid>
          </Section>

          {/* 02 Needs Attention Queue */}
          <Card>
            <Section
              title="Needs Attention"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/super-admin/tenants')}
                >
                  View Customers →
                </Button>
              }
            >
              {(data.needsAttention || []).length === 0 ? (
                <EmptyState
                  title="All customer accounts healthy"
                  description="Everything requiring customer attention is currently resolved."
                />
              ) : (
                <Table compact>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Condition / Reason</TableHeaderCell>
                      <TableHeaderCell>Severity</TableHeaderCell>
                      <TableHeaderCell>Next Best Action</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.needsAttention.map((item) => (
                      <TableRow key={item.tenantId}>
                        <TableCell>
                          <strong>{item.tenantName}</strong>
                        </TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell>
                          <Badge variant={item.status === 'critical' ? 'danger' : 'warning'}>
                            {item.status === 'critical' ? 'Critical' : 'Needs Attention'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAttentionAction(item)}
                          >
                            {item.nextBestAction?.label || 'View Customer'} →
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </Card>

          {/* 03 Customer Health + Applications Overview */}
          <Grid columns={2} gap="lg">
            {/* Left Column: Customer Health */}
            <Card>
              <Section
                title="Customer Health"
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/tenants')}
                  >
                    View Directory →
                  </Button>
                }
              >
                <Stack gap="md">
                  <Stack gap="xs">
                    <span className="bezent-caption">OPERATIONAL HEALTH</span>
                    <Inline gap="sm">
                      <Badge variant="success">
                        {data.customerHealth?.health.healthy ?? data.metrics.healthSummary?.healthy ?? 0} Healthy
                      </Badge>
                      <Badge variant="warning">
                        {data.customerHealth?.health.needsAttention ?? data.metrics.healthSummary?.needsAttention ?? 0} Needs Attention
                      </Badge>
                      <Badge variant="danger">
                        {data.customerHealth?.health.critical ?? data.metrics.healthSummary?.critical ?? 0} Critical
                      </Badge>
                    </Inline>
                  </Stack>

                  <Stack gap="xs">
                    <span className="bezent-caption">ACCOUNT LIFECYCLE</span>
                    <Inline gap="sm">
                      <Badge variant="success">
                        {data.customerHealth?.lifecycle.active ?? data.metrics.customers?.active ?? data.metrics.activeTenants} Active
                      </Badge>
                      <Badge variant={(data.customerHealth?.lifecycle.suspended ?? data.metrics.customers?.suspended ?? data.metrics.suspendedTenants) > 0 ? 'danger' : 'neutral'}>
                        {data.customerHealth?.lifecycle.suspended ?? data.metrics.customers?.suspended ?? data.metrics.suspendedTenants} Suspended
                      </Badge>
                    </Inline>
                  </Stack>
                </Stack>
              </Section>
            </Card>

            {/* Right Column: Applications Overview */}
            <Card>
              <Section
                title="Applications"
                actions={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/modules')}
                  >
                    Manage Application Access →
                  </Button>
                }
              >
                <Table compact>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Application</TableHeaderCell>
                      <TableHeaderCell>Availability</TableHeaderCell>
                      <TableHeaderCell>Adoption</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.applications || []).map((app) => (
                      <TableRow key={app.code}>
                        <TableCell>
                          <strong>{app.name}</strong>
                        </TableCell>
                        <TableCell>
                          {app.availability === 'GA' ? (
                            <Badge variant="success">Generally Available</Badge>
                          ) : (
                            <Badge variant="neutral">Coming Soon</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {app.availability === 'GA' ? (
                            <span>{app.entitledTenantsCount} Customers</span>
                          ) : (
                            <span className="bezent-caption">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Section>
            </Card>
          </Grid>

          {/* 04 Recent Customers */}
          <Card>
            <Section
              title="Recent Customers"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/super-admin/tenants')}
                >
                  View All Customers →
                </Button>
              }
            >
              {(data.recentTenants || []).length === 0 ? (
                <EmptyState
                  title="No customer accounts"
                  description="No customer accounts have been registered yet."
                />
              ) : (
                <Table compact>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Customer</TableHeaderCell>
                      <TableHeaderCell>Companies</TableHeaderCell>
                      <TableHeaderCell>Applications</TableHeaderCell>
                      <TableHeaderCell>Health</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentTenants.map((tenant) => {
                      const healthStatus = tenant.health?.status;
                      const activeMods = tenant.activeModules ?? [];
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <Stack gap="none">
                              <strong>{tenant.name}</strong>
                              <span className="bezent-caption">
                                Created {new Date(tenant.createdAt).toLocaleDateString()}
                              </span>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {tenant.companyCount ?? 0} {(tenant.companyCount ?? 0) === 1 ? 'Company' : 'Companies'}
                          </TableCell>
                          <TableCell>
                            {activeMods.length > 0 ? (
                              <Inline gap="xs">
                                {activeMods.map((mod) => (
                                  <Badge key={mod} variant="info">
                                    {mod.toUpperCase()}
                                  </Badge>
                                ))}
                              </Inline>
                            ) : (
                              <span className="bezent-caption">No active applications</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                healthStatus === 'critical'
                                  ? 'danger'
                                  : healthStatus === 'needs_attention'
                                    ? 'warning'
                                    : 'success'
                              }
                            >
                              {healthStatus === 'critical'
                                ? 'Critical'
                                : healthStatus === 'needs_attention'
                                  ? 'Needs Attention'
                                  : 'Healthy'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                            >
                              Manage →
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Section>
          </Card>

          {/* 05 Recent Activity */}
          <Card>
            <Section
              title="Recent Activity"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/super-admin/audit-logs')}
                >
                  View Audit Logs →
                </Button>
              }
            >
              {(data.recentAuditLogs || []).length === 0 ? (
                <EmptyState
                  title="No administrative activity"
                  description="No recent administrative events recorded."
                />
              ) : (
                <Table compact>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Action</TableHeaderCell>
                      <TableHeaderCell>Target & Context</TableHeaderCell>
                      <TableHeaderCell>Actor</TableHeaderCell>
                      <TableHeaderCell>Timestamp</TableHeaderCell>
                      <TableHeaderCell>Inspect</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentAuditLogs.map((log) => {
                      const target = resolveAuditTarget(log);
                      const context = resolveAuditContext(log);
                      const time = formatAuditTimestamp(log.createdAt);

                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant={getAuditActionBadgeVariant(log.action)}>
                              {formatAuditAction(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Stack gap="none">
                              <strong>{target.label}</strong>
                              <span className="bezent-caption">
                                {context.customer}
                                {context.company ? ` · ${context.company}` : ''}
                              </span>
                            </Stack>
                          </TableCell>
                          <TableCell>{log.actorEmail || 'System'}</TableCell>
                          <TableCell>{time.full}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate('/super-admin/audit-logs')}
                            >
                              Inspect →
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Section>
          </Card>
        </Stack>
      )}
    </Page>
  );
}
