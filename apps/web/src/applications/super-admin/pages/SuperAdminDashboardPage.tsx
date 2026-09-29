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
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { superAdminApi, type DashboardOverview } from '../api/superAdminApi';

export function SuperAdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await superAdminApi.getDashboard();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load platform dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <Page>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="Platform-wide operations, customer tenants, and administrative governance"
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchOverview}
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
        <Alert variant="error" title="Error loading dashboard data">
          {error}
        </Alert>
      )}

      {loading && !data && <LoadingState label="Loading platform dashboard metrics..." />}

      {data && (
        <Stack gap="lg">
          {/* Key Metric Tiles */}
          <Section
            title="Platform Overview"
            subtitle="System-wide capacity and tenant distribution"
          >
            <Grid columns={3} gap="md">
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Customer Tenants</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.totalTenants}</h2>
                    <Badge variant="success">{data.metrics.activeTenants} Active</Badge>
                    {data.metrics.suspendedTenants > 0 && (
                      <Badge variant="danger">{data.metrics.suspendedTenants} Suspended</Badge>
                    )}
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/tenants')}
                  >
                    View Tenant Directory →
                  </Button>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Companies</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.totalCompanies}</h2>
                    <Badge variant="success">{data.metrics.activeCompanies} Active</Badge>
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/super-admin/companies')}
                  >
                    Manage Companies →
                  </Button>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Platform Users</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.totalUsers}</h2>
                    <Badge variant="info">{data.metrics.activeUsers} Active</Badge>
                  </Inline>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/users')}>
                    Manage Users →
                  </Button>
                </Stack>
              </Card>
            </Grid>
          </Section>

          {/* Quick Actions Bar */}
          <Card>
            <Toolbar
              left={
                <Inline gap="sm">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/super-admin/modules')}
                  >
                    Module Entitlements
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/super-admin/company-admins')}
                  >
                    Company Admins
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/super-admin/audit-logs')}
                  >
                    Audit Trail
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/super-admin/settings')}
                  >
                    Platform Settings
                  </Button>
                </Inline>
              }
            />
          </Card>

          {/* Two-column layout for Recent Tenants & Recent Audit Logs */}
          <Grid columns={2} gap="lg">
            <Card>
              <Section
                title="Recent Customer Tenants"
                subtitle="Newly created or updated tenant accounts"
              >
                {(data.recentTenants || []).length === 0 ? (
                  <p>No customer tenants created yet.</p>
                ) : (
                  <Table compact>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Customer</TableHeaderCell>
                        <TableHeaderCell>Code</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recentTenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <strong>{tenant.name}</strong>
                          </TableCell>
                          <TableCell>{tenant.code}</TableCell>
                          <TableCell>
                            <Badge status={tenant.status}>{tenant.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>
            </Card>

            <Card>
              <Section
                title="Administrative Activity"
                subtitle="Latest platform governance and audit events"
              >
                {(data.recentAuditLogs || []).length === 0 ? (
                  <p>No recent administrative activities.</p>
                ) : (
                  <Table compact>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Action</TableHeaderCell>
                        <TableHeaderCell>Target</TableHeaderCell>
                        <TableHeaderCell>Actor</TableHeaderCell>
                        <TableHeaderCell>Timestamp</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recentAuditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="neutral">{log.action}</Badge>
                          </TableCell>
                          <TableCell>
                            {log.targetType}: {log.targetId}
                          </TableCell>
                          <TableCell>{log.actorEmail || 'System'}</TableCell>
                          <TableCell>
                            {new Date(log.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>
            </Card>
          </Grid>
        </Stack>
      )}
    </Page>
  );
}
