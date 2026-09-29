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
  EmptyState,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import { companyAdminApi, type CompanyAdminDashboard } from '../api/companyAdminApi';

export function CompanyAdminDashboardPage() {
  const navigate = useNavigate();
  const { activeCompanyId, activeCompany, isLoadingCompanies, companyError } = useCompanyAdmin();
  const [data, setData] = useState<CompanyAdminDashboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!activeCompanyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await companyAdminApi.getDashboard(activeCompanyId);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company dashboard');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoadingCompanies) {
    return (
      <Page>
        <LoadingState label="Resolving company authorizations..." />
      </Page>
    );
  }

  if (companyError || !activeCompanyId) {
    return (
      <Page>
        <PageHeader
          title="Company Admin Workspace"
          subtitle="Enterprise Multi-Company Administration"
        />
        <EmptyState
          title="No Authorized Company Found"
          description={
            companyError ||
            'Your account is not assigned to any active company with administrative privileges. Please contact your platform administrator.'
          }
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={`Company Admin — ${activeCompany?.name || 'Workspace'}`}
        subtitle={`Tenant: ${activeCompany?.tenantName || ''} | Code: ${activeCompany?.code || ''}`}
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={fetchDashboard}
              leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/company-admin/users')}
              leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
            >
              Invite User
            </Button>
          </Inline>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchDashboard()} />

      {error && (
        <Alert variant="error" title="Error loading company data">
          {error}
        </Alert>
      )}

      {loading && !data && <LoadingState label="Loading company administration metrics..." />}

      {data && (
        <Stack gap="lg">
          {/* Key Metric Tiles */}
          <Section
            title="Company Metrics"
            subtitle="Personnel, invitations, and workforce overview"
          >
            <Grid columns={4} gap="md">
              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Company Users</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.totalUsers}</h2>
                    <Badge variant="success">{data.metrics.activeUsers} Active</Badge>
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/company-admin/users')}
                  >
                    Directory →
                  </Button>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Pending Invitations</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.pendingInvitations}</h2>
                    <Badge variant={data.metrics.pendingInvitations > 0 ? 'warning' : 'neutral'}>
                      {data.metrics.pendingInvitations > 0 ? 'Action Needed' : 'None'}
                    </Badge>
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/company-admin/invitations')}
                  >
                    Manage Invites →
                  </Button>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Workforce (HRMS)</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.activeEmployees}</h2>
                    <Badge variant="info">Employees</Badge>
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/company-admin/organization')}
                  >
                    Organization →
                  </Button>
                </Stack>
              </Card>

              <Card>
                <Stack gap="xs">
                  <span className="bezent-metric-label">Active Modules</span>
                  <Inline gap="md" align="baseline">
                    <h2>{data.metrics.enabledModulesCount}</h2>
                    <Badge variant="info">Provisioned</Badge>
                  </Inline>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/company-admin/modules')}
                  >
                    Module Access →
                  </Button>
                </Stack>
              </Card>
            </Grid>
          </Section>

          {/* Quick Management Shortcuts */}
          <Card>
            <Toolbar
              left={
                <Inline gap="sm" wrap>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/company-admin/profile')}
                  >
                    Company Profile
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/company-admin/organization')}
                  >
                    Organization Structure
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/company-admin/policies')}
                  >
                    Company Policies
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/company-admin/roles')}
                  >
                    Roles & Permissions
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/company-admin/audit-logs')}
                  >
                    Audit Ledger
                  </Button>
                </Inline>
              }
              right={
                <Badge variant={data.company.status === 'active' ? 'success' : 'danger'}>
                  Company Status: {data.company.status.toUpperCase()}
                </Badge>
              }
            />
          </Card>

          {/* Enabled Applications Catalog */}
          <Section
            title="Provisioned Applications"
            subtitle="Application availability and company-level enablement"
          >
            <Grid columns={3} gap="md">
              {data.modules.map((m) => (
                <Card key={m.code}>
                  <Stack gap="sm">
                    <Inline justify="between">
                      <strong>{m.name}</strong>
                      <Badge variant={m.companyEnabled ? 'success' : 'neutral'}>
                        {m.companyEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Inline>
                    <p>{m.description}</p>
                    <Inline justify="between">
                      <span className="bezent-metric-label">
                        Tenant Entitlement: {m.tenantEntitled ? 'Entitled' : 'Not Entitled'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/company-admin/modules')}
                      >
                        Configure →
                      </Button>
                    </Inline>
                  </Stack>
                </Card>
              ))}
            </Grid>
          </Section>

          {/* Recent Administrative Activity */}
          <Section
            title="Recent Activity"
            subtitle="Recent administrative events recorded in this company"
          >
            {data.recentActivities.length === 0 ? (
              <Card>
                <EmptyState
                  title="No Recent Activity"
                  description="Administrative activities and user management events will appear here."
                />
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Action</TableHeaderCell>
                      <TableHeaderCell>Actor</TableHeaderCell>
                      <TableHeaderCell>Target</TableHeaderCell>
                      <TableHeaderCell>Timestamp</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentActivities.map((act) => (
                      <TableRow key={act.id}>
                        <TableCell>
                          <Badge variant="info">{act.action}</Badge>
                        </TableCell>
                        <TableCell>{act.actorEmail || 'System'}</TableCell>
                        <TableCell>{`${act.targetType}: ${act.targetId}`}</TableCell>
                        <TableCell>{new Date(act.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </Section>
        </Stack>
      )}
    </Page>
  );
}
