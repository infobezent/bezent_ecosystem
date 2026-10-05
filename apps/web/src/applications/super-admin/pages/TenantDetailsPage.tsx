import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Input,
  Select,
  Alert,
  LoadingState,
  EmptyState,
  Modal,
  Tabs,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type TenantRecord,
  type CompanyRecord,
  type TenantModuleStatus,
  type ModuleCatalogItem,
  type CompanyAdminAssignment,
  type AuditLogEntry,
} from '../api/superAdminApi';

type TabKey = 'overview' | 'companies' | 'applications' | 'administrators' | 'activity';

export function TenantDetailsPage({
  initialTenant,
  initialLoading = true,
}: {
  initialTenant?: TenantRecord;
  initialLoading?: boolean;
} = {}) {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [tenant, setTenant] = useState<TenantRecord | null>(initialTenant ?? null);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [tenantModules, setTenantModules] = useState<TenantModuleStatus[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>([]);
  const [companyModulesMap, setCompanyModulesMap] = useState<Record<string, TenantModuleStatus[]>>(
    {},
  );
  const [admins, setAdmins] = useState<CompanyAdminAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [loading, setLoading] = useState<boolean>(initialTenant ? false : initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editData, setEditData] = useState({ name: '', contactEmail: '', contactPhone: '' });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<boolean>(false);

  // Assign Admin Modal State
  const [isAssignAdminOpen, setIsAssignAdminOpen] = useState<boolean>(false);
  const [assignData, setAssignData] = useState({
    companyId: '',
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [savingAdmin, setSavingAdmin] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Resend Invite State
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [tenantRes, companiesRes, tenantModsRes, catalogRes, adminsRes, auditRes] =
        await Promise.all([
          superAdminApi.getTenant(tenantId),
          superAdminApi.listCompanies({ tenantId }),
          superAdminApi.getTenantModules(tenantId),
          superAdminApi.getModuleCatalog(),
          superAdminApi.listCompanyAdmins({ tenantId }),
          superAdminApi.listAuditLogs({ tenantId, limit: 100 }),
        ]);

      setTenant(tenantRes);
      setCompanies(companiesRes.items);
      setTenantModules(tenantModsRes);
      setCatalog(catalogRes);
      setAdmins(adminsRes);
      setAuditLogs(auditRes.items);

      setEditData({
        name: tenantRes.name,
        contactEmail: tenantRes.contactEmail || '',
        contactPhone: tenantRes.contactPhone || '',
      });

      // Load company-level module entitlements for each company under this tenant
      const compMap: Record<string, TenantModuleStatus[]> = {};
      await Promise.all(
        companiesRes.items.map(async (c) => {
          try {
            const mods = await superAdminApi.getTenantModules(tenantId, c.id);
            compMap[c.id] = mods;
          } catch {
            compMap[c.id] = [];
          }
        }),
      );
      setCompanyModulesMap(compMap);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId || !tenant) return;
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await superAdminApi.updateTenant(tenantId, {
        name: editData.name.trim(),
        contactEmail: editData.contactEmail.trim() || undefined,
        contactPhone: editData.contactPhone.trim() || undefined,
      });
      setTenant(updated);
      setIsEditOpen(false);
      setSuccessMessage('Customer tenant information updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!tenant || !tenantId) return;
    setSavingStatus(true);
    setError(null);
    try {
      let updated: TenantRecord;
      if (tenant.status === 'active') {
        updated = await superAdminApi.suspendTenant(tenantId);
        setSuccessMessage(
          `Tenant '${tenant.name}' has been suspended. All associated company and user access is restricted.`,
        );
      } else {
        updated = await superAdminApi.activateTenant(tenantId);
        setSuccessMessage(`Tenant '${tenant.name}' has been reactivated successfully.`);
      }
      setTenant(updated);
      setIsStatusModalOpen(false);
      await fetchAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change tenant status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleToggleTenantModule = async (
    moduleCode: string,
    currentStatus: 'enabled' | 'disabled',
  ) => {
    if (!tenantId) return;
    setError(null);
    try {
      if (currentStatus === 'enabled') {
        await superAdminApi.disableModule(tenantId, moduleCode);
        setSuccessMessage(`Disabled application '${moduleCode}' ceiling for this customer.`);
      } else {
        await superAdminApi.enableModule(tenantId, moduleCode);
        setSuccessMessage(`Enabled application '${moduleCode}' ceiling for this customer.`);
      }
      await fetchAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update application entitlement');
    }
  };

  const handleAssignAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    if (!assignData.companyId) {
      setAdminError('Please select a company');
      return;
    }
    if (!assignData.email.trim() || !assignData.firstName.trim() || !assignData.lastName.trim()) {
      setAdminError('Email, First Name, and Last Name are required');
      return;
    }

    setSavingAdmin(true);
    setAdminError(null);
    try {
      await superAdminApi.assignCompanyAdmin({
        tenantId,
        companyId: assignData.companyId,
        newUser: {
          email: assignData.email.trim(),
          firstName: assignData.firstName.trim(),
          lastName: assignData.lastName.trim(),
          phone: assignData.phone.trim() || undefined,
        },
      });
      setIsAssignAdminOpen(false);
      setAssignData({ companyId: '', email: '', firstName: '', lastName: '', phone: '' });
      setSuccessMessage(
        'Administrator assigned successfully. Sign-in invitation email dispatched.',
      );
      await fetchAllData();
    } catch (err: unknown) {
      setAdminError(err instanceof Error ? err.message : 'Failed to assign administrator');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleResendInvite = async (admin: CompanyAdminAssignment) => {
    setResendingId(admin.membershipId);
    setError(null);
    try {
      const res = await superAdminApi.resendCompanyAdminInvitation(admin.membershipId);
      setSuccessMessage(
        `Invitation resent to ${admin.email}. ${res.invitationDelivery?.message || ''}`,
      );
      await fetchAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleRevokeAdmin = async (admin: CompanyAdminAssignment) => {
    if (
      !confirm(
        `Are you sure you want to revoke administrator access for ${admin.firstName} ${admin.lastName} (${admin.email}) from ${admin.companyName || 'company'}?`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await superAdminApi.revokeCompanyAdmin(admin.membershipId);
      setSuccessMessage(`Administrator access revoked for ${admin.email}.`);
      await fetchAllData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke administrator access');
    }
  };

  const handleExecuteNextBestAction = (actionKey: string, targetTab?: string) => {
    if (actionKey === 'assign_admin') {
      if (companies.length > 0 && companies[0]) {
        setAssignData((prev) => ({ ...prev, companyId: companies[0]?.id || '' }));
      }
      setIsAssignAdminOpen(true);
    } else if (actionKey === 'reactivate_tenant') {
      setIsStatusModalOpen(true);
    } else if (actionKey === 'configure_applications') {
      setActiveTab('applications');
    } else if (actionKey === 'resend_invitation') {
      setActiveTab('administrators');
    } else if (actionKey === 'create_company') {
      navigate('/super-admin/companies');
    } else if (
      targetTab &&
      ['overview', 'companies', 'applications', 'administrators', 'activity'].includes(targetTab)
    ) {
      setActiveTab(targetTab as TabKey);
    }
  };

  if (loading && !tenant) {
    return (
      <Page>
        <LoadingState label="Loading customer tenant profile..." />
      </Page>
    );
  }

  if (!tenant) {
    return (
      <Page>
        <Alert variant="error" title="Customer Tenant Not Found">
          The requested customer tenant account does not exist or has been removed.
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
          Return to Tenants
        </Button>
      </Page>
    );
  }

  // Derive counts and metrics
  const activeModulesCount = tenantModules.filter((m) => m.status === 'enabled').length;
  const companiesWithoutAdmin = companies.filter(
    (c) => !admins.some((a) => a.companyId === c.id && a.status === 'active'),
  );

  return (
    <Page>
      <PageHeader
        title={tenant.name}
        subtitle={`Tenant ID: ${tenant.id} • Code: ${tenant.code}`}
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
              Back to Tenants
            </Button>
            <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
              Edit Info
            </Button>
            <Button
              variant={tenant.status === 'active' ? 'danger' : 'secondary'}
              onClick={() => setIsStatusModalOpen(true)}
            >
              {tenant.status === 'active' ? 'Suspend Tenant' : 'Reactivate Tenant'}
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Action Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Success" onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Tabs Bar */}
      <Tabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TabKey)}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'companies', label: 'Companies', count: companies.length },
          { id: 'applications', label: 'Applications', count: activeModulesCount },
          { id: 'administrators', label: 'Administrators', count: admins.length },
          { id: 'activity', label: 'Activity', count: auditLogs.length },
        ]}
      />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <Stack gap="lg">
          {/* Summary Metric Cards */}
          <Grid columns={4} gap="md">
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Customer Status</span>
                <Inline gap="xs" align="center">
                  <Badge status={tenant.status}>{tenant.status}</Badge>
                </Inline>
                <span className="bezent-caption">Isolation: Tenant-enforced</span>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Companies</span>
                <strong>{companies.length}</strong>
                <span className="bezent-caption">
                  {companies.filter((c) => c.status === 'active').length} active legal entities
                </span>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Applications Entitled</span>
                <strong>
                  {activeModulesCount} of {catalog.length}
                </strong>
                <span className="bezent-caption">Tenant ceiling configuration</span>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Customer Since</span>
                <strong>{new Date(tenant.createdAt).toLocaleDateString()}</strong>
                <span className="bezent-caption">
                  {admins.length} company {admins.length === 1 ? 'admin' : 'admins'}
                </span>
              </Stack>
            </Card>
          </Grid>

          {/* Customer Health & Attention Card */}
          {tenant.health &&
          ['healthy', 'needs_attention', 'critical'].includes(tenant.health.status) ? (
            (() => {
              const healthReasons: string[] = Array.isArray(tenant.health.reasons)
                ? tenant.health.reasons.filter(
                    (r): r is string => typeof r === 'string' && r.trim().length > 0,
                  )
                : typeof tenant.health.reason === 'string' && tenant.health.reason.trim()
                  ? [tenant.health.reason.trim()]
                  : [];

              return (
                <Card>
                  <Section
                    title="Customer Health & Attention Engine"
                    subtitle="Deterministic system status derived from verified platform data"
                  >
                    <Grid columns={2} gap="lg">
                      <Stack gap="sm">
                        <Inline gap="sm" align="center">
                          <span className="bezent-caption">Attention State:</span>
                          <Badge
                            variant={
                              tenant.health.status === 'healthy'
                                ? 'success'
                                : tenant.health.status === 'critical'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {tenant.health.status === 'healthy'
                              ? 'Healthy'
                              : tenant.health.status === 'critical'
                                ? 'Critical Attention'
                                : 'Needs Attention'}
                          </Badge>
                        </Inline>

                        <Stack gap="xs">
                          <span className="bezent-caption">Evaluation Findings:</span>
                          {healthReasons.length === 0 ? (
                            <span className="bezent-caption">
                              No health issues or findings reported.
                            </span>
                          ) : (
                            healthReasons.map((reason, idx) => (
                              <Inline key={idx} gap="xs" align="center">
                                <BezentIcon
                                  name={tenant.health?.status === 'healthy' ? 'check' : 'alert'}
                                  size={14}
                                  color={
                                    tenant.health?.status === 'healthy' ? '#10b981' : '#f59e0b'
                                  }
                                />
                                <span>{reason}</span>
                              </Inline>
                            ))
                          )}
                        </Stack>
                      </Stack>

                      <Stack gap="sm">
                        <span className="bezent-caption">Next Best Action:</span>
                        {tenant.health.nextBestAction ? (
                          <Stack gap="xs">
                            <Alert
                              variant={tenant.health.status === 'critical' ? 'error' : 'warning'}
                              title="Recommended Action"
                            >
                              <Inline gap="md" align="center" justify="between">
                                <span>{tenant.health.nextBestAction.label}</span>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    handleExecuteNextBestAction(
                                      tenant.health?.nextBestAction?.action ||
                                        tenant.health?.nextBestAction?.actionType ||
                                        '',
                                      tenant.health?.nextBestAction?.targetTab,
                                    )
                                  }
                                >
                                  Execute Action
                                </Button>
                              </Inline>
                            </Alert>
                          </Stack>
                        ) : (
                          <Inline gap="xs" align="center">
                            <BezentIcon name="check" size={16} color="#10b981" />
                            <span>All core setup and health prerequisites are satisfied.</span>
                          </Inline>
                        )}
                      </Stack>
                    </Grid>
                  </Section>
                </Card>
              );
            })()
          ) : (
            <Card>
              <Section
                title="Customer Health & Attention Engine"
                subtitle="Deterministic system status derived from verified platform data"
              >
                <Stack gap="sm">
                  <Inline gap="sm" align="center">
                    <span className="bezent-caption">Attention State:</span>
                    <Badge variant="neutral">Health unavailable</Badge>
                  </Inline>
                  <span className="bezent-caption">
                    Health evaluation metrics are currently unavailable or not configured for this
                    customer.
                  </span>
                </Stack>
              </Section>
            </Card>
          )}

          {/* Setup Progress Card */}
          {tenant.setupProgress ? (
            (() => {
              const milestones = Array.isArray(tenant.setupProgress.milestones)
                ? tenant.setupProgress.milestones
                : [];
              const completedCount =
                tenant.setupProgress.completedMilestones ??
                milestones.filter((m) => m.completed).length;
              const totalCount = tenant.setupProgress.totalMilestones ?? milestones.length;
              const pct =
                tenant.setupProgress.percentage ??
                (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

              return (
                <Card>
                  <Section
                    title={`Customer Setup Progress (${completedCount} of ${totalCount} Milestones • ${pct}%)`}
                    subtitle="Milestone verification based on verified platform records"
                  >
                    {milestones.length === 0 ? (
                      <span className="bezent-caption">No milestone details available.</span>
                    ) : (
                      <Table compact>
                        <TableHead>
                          <TableRow>
                            <TableHeaderCell>Milestone</TableHeaderCell>
                            <TableHeaderCell>Description</TableHeaderCell>
                            <TableHeaderCell>Status</TableHeaderCell>
                            <TableHeaderCell>Verified At</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {milestones.map((m) => (
                            <TableRow key={m.key}>
                              <TableCell>
                                <strong>{m.title || m.label || m.key}</strong>
                              </TableCell>
                              <TableCell>{m.description}</TableCell>
                              <TableCell>
                                <Badge variant={m.completed ? 'success' : 'neutral'}>
                                  {m.completed ? 'Completed' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {m.completedAt ? new Date(m.completedAt).toLocaleString() : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Section>
                </Card>
              );
            })()
          ) : (
            <Card>
              <Section
                title="Customer Setup Progress"
                subtitle="Milestone verification based on verified platform records"
              >
                <span className="bezent-caption">
                  Setup progress tracking is not available for this customer.
                </span>
              </Section>
            </Card>
          )}

          {/* Tenant Identity Details Card */}
          <Card>
            <Section title="Tenant Identity & Isolation" subtitle="Canonical customer properties">
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Customer Name</span>
                  <strong>{tenant.name}</strong>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Tenant Code</span>
                  <code>{tenant.code}</code>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Status</span>
                  <div>
                    <Badge status={tenant.status}>{tenant.status}</Badge>
                  </div>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Primary Contact Email</span>
                  <span>{tenant.contactEmail || 'Not provided'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Primary Contact Phone</span>
                  <span>{tenant.contactPhone || 'Not provided'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Created Date</span>
                  <span>{new Date(tenant.createdAt).toLocaleString()}</span>
                </Stack>
              </Grid>
            </Section>
          </Card>
        </Stack>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <Card>
          <Section
            title={`Companies (${companies.length})`}
            subtitle="Legal entities and business structures operating within this tenant domain"
          >
            {companies.length === 0 ? (
              <EmptyState
                title="No companies found"
                description="This tenant currently has no companies provisioned. Customers require at least one primary company to operate."
                primaryAction={{
                  label: 'Manage Companies',
                  onClick: () => navigate('/super-admin/companies'),
                }}
              />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Company Name</TableHeaderCell>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Enabled Applications</TableHeaderCell>
                    <TableHeaderCell>Country</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.map((c) => {
                    const cModules = (companyModulesMap[c.id] || [])
                      .filter((m) => m.status === 'enabled')
                      .map((m) => m.moduleCode);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Stack gap="xs">
                            <strong>{c.name}</strong>
                            <span className="bezent-caption">{c.legalName || 'No legal name'}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <code>{c.code}</code>
                        </TableCell>
                        <TableCell>
                          {cModules.length === 0 ? (
                            <span className="bezent-caption">None active</span>
                          ) : (
                            <Inline gap="xs">
                              {cModules.map((mCode) => (
                                <Badge key={mCode} variant="neutral" size="sm">
                                  {mCode === 'project_management' ? 'PM' : mCode.toUpperCase()}
                                </Badge>
                              ))}
                            </Inline>
                          )}
                        </TableCell>
                        <TableCell>{c.country || '—'}</TableCell>
                        <TableCell>
                          <Badge status={c.status}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/companies/${c.id}`)}
                          >
                            View Company
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
      )}

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <Stack gap="lg">
          <Card>
            <Section
              title="Application Entitlement Architecture"
              subtitle="Tenant entitlement ceiling vs company application access"
            >
              <Alert variant="info" title="Entitlement Ceiling Principle">
                The Tenant Entitlement Ceiling sets the absolute boundary of applications permitted
                for this customer account. A company can only be granted access to an application if
                that application is first enabled at the tenant ceiling level.
              </Alert>
            </Section>
          </Card>

          <Card>
            <Section
              title="Catalog Applications"
              subtitle="Manage customer-wide access ceilings and inspect company access"
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Application</TableHeaderCell>
                    <TableHeaderCell>Category & Version</TableHeaderCell>
                    <TableHeaderCell>Tenant Entitlement Ceiling</TableHeaderCell>
                    <TableHeaderCell>Company Access Status</TableHeaderCell>
                    <TableHeaderCell>Ceiling Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catalog.map((item) => {
                    const tenantMod = tenantModules.find((m) => m.moduleCode === item.code);
                    const isCeilingEnabled = tenantMod?.status === 'enabled';

                    // Check which companies have this enabled
                    const companiesWithApp = companies.filter((c) => {
                      const cMods = companyModulesMap[c.id] || [];
                      return cMods.some(
                        (m) => m.moduleCode === item.code && m.status === 'enabled',
                      );
                    });

                    return (
                      <TableRow key={item.code}>
                        <TableCell>
                          <Stack gap="xs">
                            <strong>{item.name}</strong>
                            <code>{item.code}</code>
                            <span className="bezent-caption">{item.description}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack gap="xs">
                            <span>{item.category}</span>
                            <span className="bezent-caption">
                              v{item.version} • {item.availability}
                            </span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isCeilingEnabled ? 'success' : 'neutral'}>
                            {isCeilingEnabled ? 'ENTITLED' : 'RESTRICTED'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!isCeilingEnabled ? (
                            <span className="bezent-caption">
                              Blocked by Tenant Ceiling (no company can access)
                            </span>
                          ) : companiesWithApp.length > 0 ? (
                            <Inline gap="xs">
                              <span className="bezent-caption">
                                Active on {companiesWithApp.length} of {companies.length} companies:
                              </span>
                              {companiesWithApp.map((c) => (
                                <Badge key={c.id} variant="neutral" size="sm">
                                  {c.code}
                                </Badge>
                              ))}
                            </Inline>
                          ) : (
                            <span className="bezent-caption">
                              Entitled at ceiling, but not enabled on any company yet
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant={isCeilingEnabled ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() =>
                              handleToggleTenantModule(
                                item.code,
                                isCeilingEnabled ? 'enabled' : 'disabled',
                              )
                            }
                          >
                            {isCeilingEnabled ? 'Disable Ceiling' : 'Enable Ceiling'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Section>
          </Card>
        </Stack>
      )}

      {/* Administrators Tab */}
      {activeTab === 'administrators' && (
        <Stack gap="lg">
          {companiesWithoutAdmin.length > 0 && (
            <Alert variant="warning" title="Attention: Missing Company Administrators">
              The following companies have no assigned Company Administrator:{' '}
              <strong>{companiesWithoutAdmin.map((c) => c.name).join(', ')}</strong>. Every company
              requires an administrator for operational ownership.
            </Alert>
          )}

          <Card>
            <Section
              title={`Company Administrators (${admins.length})`}
              subtitle="Designated administrative owners across customer companies"
              actions={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (companies.length > 0 && companies[0]) {
                      setAssignData((prev) => ({ ...prev, companyId: companies[0]?.id || '' }));
                    }
                    setIsAssignAdminOpen(true);
                  }}
                  leftIcon={<BezentIcon name="plus" size={14} color="currentColor" />}
                >
                  Assign Administrator
                </Button>
              }
            >
              {admins.length === 0 ? (
                <EmptyState
                  title="No administrators assigned"
                  description="No company administrators are currently assigned to companies in this tenant."
                  primaryAction={{
                    label: 'Assign Administrator',
                    onClick: () => setIsAssignAdminOpen(true),
                  }}
                />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Administrator</TableHeaderCell>
                      <TableHeaderCell>Assigned Company</TableHeaderCell>
                      <TableHeaderCell>Account / Sign-in Status</TableHeaderCell>
                      <TableHeaderCell>Assigned Date</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.membershipId}>
                        <TableCell>
                          <Stack gap="xs">
                            <strong>
                              {admin.firstName} {admin.lastName}
                            </strong>
                            <span className="bezent-caption">{admin.email}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <strong>{admin.companyName || 'Unknown Company'}</strong>
                        </TableCell>
                        <TableCell>
                          {admin.lastLoginAt ? (
                            <Badge variant="success">Active (Signed In)</Badge>
                          ) : (
                            <Badge variant="warning">Pending First Sign-In</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(admin.assignedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Inline gap="xs">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResendInvite(admin)}
                              disabled={resendingId === admin.membershipId}
                            >
                              {resendingId === admin.membershipId ? 'Sending...' : 'Resend Invite'}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRevokeAdmin(admin)}
                            >
                              Revoke
                            </Button>
                          </Inline>
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
              title="Authentication & Credential Policy"
              subtitle="BEZENT Universal Auth Standards"
            >
              <span className="bezent-caption">
                BEZENT exclusively uses passwordless Email + OTP authentication. Passwords are never
                created, stored, or reset. Administrators receive a one-time sign-in code sent to
                their registered email address.
              </span>
            </Section>
          </Card>
        </Stack>
      )}

      {/* Activity & Customer Journey Tab */}
      {activeTab === 'activity' && (
        <Stack gap="lg">
          {/* Customer Journey Timeline Derived from Audit Events */}
          <Card>
            <Section
              title="Customer Journey Milestones"
              subtitle="Chronological lifecycle progression derived from immutable audit records"
            >
              <Stack gap="md">
                {auditLogs.length === 0 ? (
                  <span className="bezent-caption">
                    No audit events recorded for this customer yet.
                  </span>
                ) : (
                  <Table compact>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Lifecycle Milestone</TableHeaderCell>
                        <TableHeaderCell>Trigger Event</TableHeaderCell>
                        <TableHeaderCell>Actor</TableHeaderCell>
                        <TableHeaderCell>Timestamp</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {auditLogs
                        .filter((entry) =>
                          [
                            'customer_provisioned',
                            'tenant_created',
                            'company_created',
                            'module_enabled',
                            'company_admin_assigned',
                            'company_admin_invitation_resent',
                            'tenant_suspended',
                            'tenant_activated',
                          ].includes(entry.action),
                        )
                        .slice(0, 10)
                        .map((entry) => {
                          let title = entry.action.replace(/_/g, ' ').toUpperCase();
                          if (entry.action === 'customer_provisioned')
                            title = 'Customer Provisioned';
                          if (entry.action === 'tenant_created')
                            title = 'Customer Tenant Established';
                          if (entry.action === 'company_created') title = 'Company Created';
                          if (entry.action === 'module_enabled')
                            title = 'Application Entitlement Granted';
                          if (entry.action === 'company_admin_assigned')
                            title = 'Company Admin Assigned';
                          if (entry.action === 'company_admin_invitation_resent')
                            title = 'Sign-in Invitation Resent';
                          if (entry.action === 'tenant_suspended') title = 'Tenant Suspended';
                          if (entry.action === 'tenant_activated') title = 'Tenant Reactivated';

                          return (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <Inline gap="xs" align="center">
                                  <BezentIcon name="check" size={14} color="#10b981" />
                                  <strong>{title}</strong>
                                </Inline>
                              </TableCell>
                              <TableCell>
                                <code>{entry.action}</code>
                              </TableCell>
                              <TableCell>{entry.actorEmail || 'System'}</TableCell>
                              <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </Stack>
            </Section>
          </Card>

          {/* Full Tenant-Scoped Immutable Audit Log */}
          <Card>
            <Section
              title={`Tenant Audit Log (${auditLogs.length} Events)`}
              subtitle="Filtered customer-scoped view of canonical platform audit records"
              actions={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchAllData}
                  leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
                >
                  Refresh Logs
                </Button>
              }
            >
              {auditLogs.length === 0 ? (
                <EmptyState
                  title="No audit entries"
                  description="No audit logs have been recorded for this customer domain."
                />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Timestamp</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                      <TableHeaderCell>Actor</TableHeaderCell>
                      <TableHeaderCell>Target</TableHeaderCell>
                      <TableHeaderCell>Metadata</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogs.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="neutral">{entry.action}</Badge>
                        </TableCell>
                        <TableCell>{entry.actorEmail || 'System / Automated'}</TableCell>
                        <TableCell>
                          <code>
                            {entry.targetType}:{entry.targetId.slice(0, 8)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {entry.metadata ? (
                            <span className="bezent-caption">
                              {JSON.stringify(entry.metadata).slice(0, 60)}...
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </Card>
        </Stack>
      )}

      {/* Edit Tenant Information Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Customer Tenant"
        description="Update administrative and contact metadata for this customer domain."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <Stack gap="md">
            <Input
              label="Customer / Tenant Name *"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />
            <Input
              label="Primary Contact Email"
              type="email"
              value={editData.contactEmail}
              onChange={(e) => setEditData({ ...editData, contactEmail: e.target.value })}
            />
            <Input
              label="Primary Contact Phone"
              value={editData.contactPhone}
              onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
            />
          </Stack>
        </form>
      </Modal>

      {/* Status Change (Suspend / Reactivate) Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          tenant.status === 'active' ? 'Suspend Customer Tenant' : 'Reactivate Customer Tenant'
        }
        description={
          tenant.status === 'active'
            ? `Suspending customer '${tenant.name}' will immediately revoke access to all business applications for every company and user under this account. Active sessions will be terminated.`
            : `Reactivating customer '${tenant.name}' will restore access to all entitled applications and authorized users under this customer domain.`
        }
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={tenant.status === 'active' ? 'danger' : 'primary'}
              onClick={handleConfirmStatusChange}
              disabled={savingStatus}
            >
              {savingStatus
                ? 'Processing...'
                : tenant.status === 'active'
                  ? 'Confirm Suspension'
                  : 'Confirm Reactivation'}
            </Button>
          </Inline>
        }
      >
        <Alert
          variant={tenant.status === 'active' ? 'warning' : 'info'}
          title={tenant.status === 'active' ? 'Operational Impact Notice' : 'Restoration Notice'}
        >
          {tenant.status === 'active'
            ? 'This customer will be locked out immediately. Company administrators will be unable to log in, and all background automations for this tenant will halt.'
            : 'Access will be restored immediately according to pre-configured company-level application entitlements.'}
        </Alert>
      </Modal>

      {/* Assign Administrator Modal */}
      <Modal
        isOpen={isAssignAdminOpen}
        onClose={() => setIsAssignAdminOpen(false)}
        title="Assign Company Administrator"
        description="Designate an administrator with operational ownership over a company in this tenant."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsAssignAdminOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignAdmin} disabled={savingAdmin}>
              {savingAdmin ? 'Assigning...' : 'Assign Administrator'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleAssignAdmin}>
          <Stack gap="md">
            {adminError && (
              <Alert variant="error" title="Assignment Error">
                {adminError}
              </Alert>
            )}

            <Select
              label="Select Company *"
              value={assignData.companyId}
              onChange={(e) => setAssignData({ ...assignData, companyId: e.target.value })}
              options={[
                { value: '', label: 'Select a company...' },
                ...companies.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
              ]}
              required
            />

            <Input
              label="Administrator Email *"
              type="email"
              placeholder="admin@company.com"
              value={assignData.email}
              onChange={(e) => setAssignData({ ...assignData, email: e.target.value })}
              required
            />

            <Grid columns={2} gap="sm">
              <Input
                label="First Name *"
                placeholder="Jane"
                value={assignData.firstName}
                onChange={(e) => setAssignData({ ...assignData, firstName: e.target.value })}
                required
              />
              <Input
                label="Last Name *"
                placeholder="Doe"
                value={assignData.lastName}
                onChange={(e) => setAssignData({ ...assignData, lastName: e.target.value })}
                required
              />
            </Grid>

            <Input
              label="Contact Phone"
              placeholder="+1-555-0100"
              value={assignData.phone}
              onChange={(e) => setAssignData({ ...assignData, phone: e.target.value })}
            />

            <Alert variant="info" title="Passwordless Universal Sign-in">
              Upon assignment, an email sign-in invitation will be delivered to this address. The
              administrator will sign in using an Email OTP code.
            </Alert>
          </Stack>
        </form>
      </Modal>
    </Page>
  );
}
