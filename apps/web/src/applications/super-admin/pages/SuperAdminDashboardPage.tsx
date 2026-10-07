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
  Avatar,
  Divider,
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

function getInitials(name: string): string {
  if (!name) return 'BZ';
  const clean = name.trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2 && words[0] && words[1]) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
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

  const totalNeedsAttention = data?.needsAttention?.length ?? 0;

  return (
    <Page>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Platform overview and operational health · Live customer and platform operations"
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchOverview}
              disabled={loading}
              leftIcon={<BezentIcon name="refresh" size={15} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/super-admin/provisioning')}
              leftIcon={<BezentIcon name="plus" size={15} color="currentColor" />}
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
          {/* 01 Platform Metrics Grid */}
          <Section title="Platform Metrics" variant="plain">
            <Grid columns={4} gap="md">
              {/* Card 1: Customers */}
              <Card hoverable padding="md">
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <span className="bezent-metric-label">Customers</span>
                    <BezentIcon name="organization" size={18} color="currentColor" />
                  </Inline>
                  <Inline gap="sm" align="baseline" wrap>
                    <h2 className="tabular-nums">
                      {data.metrics.customers?.total ?? data.metrics.totalTenants}
                    </h2>
                    <Badge variant="success" size="sm" showDot>
                      {data.metrics.customers?.active ?? data.metrics.activeTenants} Active
                    </Badge>
                    {(data.metrics.customers?.suspended ?? data.metrics.suspendedTenants) > 0 && (
                      <Badge variant="danger" size="sm" showDot>
                        {data.metrics.customers?.suspended ?? data.metrics.suspendedTenants}{' '}
                        Suspended
                      </Badge>
                    )}
                  </Inline>
                  <Divider />
                  <Inline justify="between" align="center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/super-admin/tenants')}
                    >
                      View Customers →
                    </Button>
                  </Inline>
                </Stack>
              </Card>

              {/* Card 2: Companies */}
              <Card hoverable padding="md">
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <span className="bezent-metric-label">Companies</span>
                    <BezentIcon name="workforce" size={18} color="currentColor" />
                  </Inline>
                  <Inline gap="sm" align="baseline" wrap>
                    <h2 className="tabular-nums">
                      {data.metrics.companies?.total ?? data.metrics.totalCompanies}
                    </h2>
                    <Badge variant="success" size="sm" showDot>
                      {data.metrics.companies?.active ?? data.metrics.activeCompanies} Active
                    </Badge>
                    {(data.metrics.companies?.suspended ?? data.metrics.suspendedCompanies) > 0 && (
                      <Badge variant="danger" size="sm" showDot>
                        {data.metrics.companies?.suspended ?? data.metrics.suspendedCompanies}{' '}
                        Suspended
                      </Badge>
                    )}
                  </Inline>
                  {(data.metrics.companies?.withoutAdmin ?? 0) > 0 && (
                    <Inline gap="xs">
                      <Badge variant="warning" size="sm">
                        {data.metrics.companies.withoutAdmin} Without Admin
                      </Badge>
                    </Inline>
                  )}
                  <Divider />
                  <Inline justify="between" align="center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/super-admin/companies')}
                    >
                      Manage Companies →
                    </Button>
                  </Inline>
                </Stack>
              </Card>

              {/* Card 3: Platform Users */}
              <Card hoverable padding="md">
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <span className="bezent-metric-label">Platform Users</span>
                    <BezentIcon name="employees" size={18} color="currentColor" />
                  </Inline>
                  <Inline gap="sm" align="baseline" wrap>
                    <h2 className="tabular-nums">
                      {data.metrics.platformUsers?.total ?? data.metrics.totalUsers}
                    </h2>
                    <Badge variant="info" size="sm" showDot>
                      {data.metrics.platformUsers?.active ?? data.metrics.activeUsers ?? 0} Active
                    </Badge>
                    {(data.metrics.platformUsers?.suspended ?? data.metrics.suspendedUsers ?? 0) >
                      0 && (
                      <Badge variant="danger" size="sm" showDot>
                        {data.metrics.platformUsers?.suspended ?? data.metrics.suspendedUsers}{' '}
                        Suspended
                      </Badge>
                    )}
                  </Inline>
                  <Divider />
                  <Inline justify="between" align="center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/super-admin/users')}
                    >
                      Manage Users →
                    </Button>
                  </Inline>
                </Stack>
              </Card>

              {/* Card 4: Company Administrators */}
              <Card hoverable padding="md">
                <Stack gap="sm">
                  <Inline justify="between" align="center">
                    <span className="bezent-metric-label">Company Administrators</span>
                    <BezentIcon name="security" size={18} color="currentColor" />
                  </Inline>
                  <Inline gap="sm" align="baseline" wrap>
                    <h2 className="tabular-nums">
                      {data.metrics.companyAdmins?.uniqueAdmins ?? data.metrics.uniqueAdmins ?? 0}
                    </h2>
                    <Badge variant="info" size="sm">
                      {data.metrics.companyAdmins?.totalAssignments ??
                        data.metrics.adminAssignments ??
                        0}{' '}
                      Assignments
                    </Badge>
                  </Inline>
                  {(data.metrics.companyAdmins?.companiesWithoutAdmin ??
                    data.metrics.companiesWithoutAdmin ??
                    0) > 0 && (
                    <Inline gap="xs">
                      <Badge variant="warning" size="sm">
                        {data.metrics.companyAdmins?.companiesWithoutAdmin ??
                          data.metrics.companiesWithoutAdmin}{' '}
                        Unmanaged
                      </Badge>
                    </Inline>
                  )}
                  <Divider />
                  <Inline justify="between" align="center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/super-admin/company-admins')}
                    >
                      Manage Admins →
                    </Button>
                  </Inline>
                </Stack>
              </Card>
            </Grid>
          </Section>

          {/* 02 Needs Attention Queue */}
          <Section
            title="Needs Attention"
            subtitle="Customer accounts requiring administrative review or configuration"
            badge={
              totalNeedsAttention > 0 ? (
                <Badge variant="danger" size="sm">
                  {totalNeedsAttention}
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  All Clear
                </Badge>
              )
            }
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/tenants')}>
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
              <Table compact hoverable>
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
                        <Inline gap="sm" align="center">
                          <Avatar
                            initials={getInitials(item.tenantName)}
                            size="sm"
                            shape="square"
                          />
                          <Stack gap="none">
                            <strong>{item.tenantName}</strong>
                            <span className="bezent-caption">{item.tenantId}</span>
                          </Stack>
                        </Inline>
                      </TableCell>
                      <TableCell>{item.reason}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.status === 'critical' ? 'danger' : 'warning'}
                          size="sm"
                          showDot
                        >
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

          {/* 03 Customer Health + Applications Overview */}
          <Grid columns={2} gap="lg">
            {/* Left Column: Customer Health */}
            <Section
              title="Customer Health"
              subtitle="Real-time tenant operational health and lifecycle status"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/tenants')}>
                  View Directory →
                </Button>
              }
            >
              <Stack gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">OPERATIONAL HEALTH</span>
                  <Inline gap="sm" wrap>
                    <Badge variant="success" size="sm" showDot>
                      {data.customerHealth?.health.healthy ??
                        data.metrics.healthSummary?.healthy ??
                        0}{' '}
                      Healthy
                    </Badge>
                    <Badge variant="warning" size="sm" showDot>
                      {data.customerHealth?.health.needsAttention ??
                        data.metrics.healthSummary?.needsAttention ??
                        0}{' '}
                      Needs Attention
                    </Badge>
                    <Badge variant="danger" size="sm" showDot>
                      {data.customerHealth?.health.critical ??
                        data.metrics.healthSummary?.critical ??
                        0}{' '}
                      Critical
                    </Badge>
                  </Inline>
                </Stack>

                <Divider />

                <Stack gap="xs">
                  <span className="bezent-caption">ACCOUNT LIFECYCLE</span>
                  <Inline gap="sm" wrap>
                    <Badge variant="success" size="sm" showDot>
                      {data.customerHealth?.lifecycle.active ??
                        data.metrics.customers?.active ??
                        data.metrics.activeTenants}{' '}
                      Active
                    </Badge>
                    <Badge
                      variant={
                        (data.customerHealth?.lifecycle.suspended ??
                          data.metrics.customers?.suspended ??
                          data.metrics.suspendedTenants) > 0
                          ? 'danger'
                          : 'neutral'
                      }
                      size="sm"
                      showDot
                    >
                      {data.customerHealth?.lifecycle.suspended ??
                        data.metrics.customers?.suspended ??
                        data.metrics.suspendedTenants}{' '}
                      Suspended
                    </Badge>
                  </Inline>
                </Stack>
              </Stack>
            </Section>

            {/* Right Column: Applications Overview */}
            <Section
              title="Applications"
              subtitle="Modular application suite availability and customer adoption"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/modules')}>
                  Manage Application Access →
                </Button>
              }
            >
              <Table compact hoverable>
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
                        <Inline gap="sm" align="center">
                          <Avatar
                            initials={app.code.slice(0, 2).toUpperCase()}
                            size="sm"
                            shape="square"
                          />
                          <Stack gap="none">
                            <strong>{app.name}</strong>
                            <span className="bezent-caption">{app.code.toUpperCase()}</span>
                          </Stack>
                        </Inline>
                      </TableCell>
                      <TableCell>
                        {app.availability === 'GA' ? (
                          <Badge variant="success" size="sm" showDot>
                            Generally Available
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Coming Soon
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {app.availability === 'GA' ? (
                          <span className="tabular-nums">{app.entitledTenantsCount} Customers</span>
                        ) : (
                          <span className="bezent-caption">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </Grid>

          {/* 04 Recent Customers */}
          <Section
            title="Recent Customers"
            subtitle="Latest registered customers across the platform"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/tenants')}>
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
              <Table compact hoverable>
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
                          <Inline gap="sm" align="center">
                            <Avatar initials={getInitials(tenant.name)} size="sm" shape="square" />
                            <Stack gap="none">
                              <strong>{tenant.name}</strong>
                              <span className="bezent-caption">
                                Created {new Date(tenant.createdAt).toLocaleDateString()}
                              </span>
                            </Stack>
                          </Inline>
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums">
                            {tenant.companyCount ?? 0}{' '}
                            {(tenant.companyCount ?? 0) === 1 ? 'Company' : 'Companies'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {activeMods.length > 0 ? (
                            <Inline gap="xs" wrap>
                              {activeMods.map((mod) => (
                                <Badge key={mod} variant="info" size="sm">
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
                            size="sm"
                            showDot
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

          {/* 05 Recent Activity */}
          <Section
            title="Recent Activity"
            subtitle="Platform-wide audit trail and governance events"
            actions={
              <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/audit-logs')}>
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
              <Table compact hoverable>
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
                          <Badge variant={getAuditActionBadgeVariant(log.action)} size="sm">
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
                        <TableCell>
                          <Inline gap="xs" align="center">
                            <BezentIcon name="employees" size={14} color="currentColor" />
                            <span>{log.actorEmail || 'System'}</span>
                          </Inline>
                        </TableCell>
                        <TableCell>
                          <span className="tabular-nums">{time.full}</span>
                        </TableCell>
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
        </Stack>
      )}
    </Page>
  );
}
