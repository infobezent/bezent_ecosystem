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
  Badge,
  Button,
  Input,
  Select,
  Alert,
  LoadingState,
  EmptyState,
  Modal,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type CompanyRecord,
  type TenantRecord,
  type TenantModuleStatus,
  type CompanyAdminAssignment,
  type AuditLogEntry,
  type PlatformUserSummary,
} from '../api/superAdminApi';

type TabKey = 'overview' | 'applications' | 'administrators' | 'activity';

interface CompanyDetailsPageProps {
  initialCompany?: CompanyRecord;
  initialTenant?: TenantRecord;
  initialModules?: TenantModuleStatus[];
  initialTenantModules?: TenantModuleStatus[];
  initialAdmins?: CompanyAdminAssignment[];
  initialAuditLogs?: AuditLogEntry[];
}

export function CompanyDetailsPage({
  initialCompany,
  initialTenant,
  initialModules,
  initialTenantModules,
  initialAdmins,
  initialAuditLogs,
}: CompanyDetailsPageProps) {
  const { companyId: routeCompanyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const companyId = initialCompany?.id || routeCompanyId || '';

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [company, setCompany] = useState<CompanyRecord | null>(initialCompany ?? null);
  const [tenant, setTenant] = useState<TenantRecord | null>(initialTenant ?? null);
  const [companyModules, setCompanyModules] = useState<TenantModuleStatus[]>(initialModules ?? []);
  const [tenantModules, setTenantModules] = useState<TenantModuleStatus[]>(
    initialTenantModules ?? [],
  );
  const [admins, setAdmins] = useState<CompanyAdminAssignment[]>(initialAdmins ?? []);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs ?? []);
  const [tenantUsers, setTenantUsers] = useState<PlatformUserSummary[]>([]);

  const [loading, setLoading] = useState<boolean>(!initialCompany);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editData, setEditData] = useState({
    name: '',
    legalName: '',
    businessEmail: '',
    contactPhone: '',
    country: '',
    timeZone: '',
  });

  // Assign Admin Modal State
  const [isAssignAdminOpen, setIsAssignAdminOpen] = useState<boolean>(false);
  const [assigningAdmin, setAssigningAdmin] = useState<boolean>(false);
  const [adminMode, setAdminMode] = useState<'existing' | 'new'>('existing');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newAdminData, setNewAdminData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  // Suspend Confirmation State
  const [isSuspendConfirmOpen, setIsSuspendConfirmOpen] = useState<boolean>(false);
  const [suspending, setSuspending] = useState<boolean>(false);

  const fetchCompanyDetails = useCallback(async () => {
    if (initialCompany) return;
    if (!companyId) return;

    setLoading(true);
    setError(null);
    try {
      const compRes = await superAdminApi.getCompany(companyId);
      setCompany(compRes);

      setEditData({
        name: compRes.name,
        legalName: compRes.legalName || '',
        businessEmail: compRes.businessEmail || '',
        contactPhone: compRes.contactPhone || '',
        country: compRes.country || '',
        timeZone: compRes.timeZone || '',
      });

      // Concurrently fetch parent tenant, tenant modules, company modules, company admins, and company audit logs
      const [tenantRes, tModsRes, cModsRes, adminsRes, auditRes, usersRes] = await Promise.all([
        superAdminApi.getTenant(compRes.tenantId),
        superAdminApi.getTenantModules(compRes.tenantId),
        superAdminApi.getTenantModules(compRes.tenantId, compRes.id),
        superAdminApi.listCompanyAdmins({ companyId: compRes.id }),
        superAdminApi.listAuditLogs({ companyId: compRes.id, limit: 100 }),
        superAdminApi.listUsers({ tenantId: compRes.tenantId }),
      ]);

      setTenant(tenantRes);
      setTenantModules(tModsRes);
      setCompanyModules(cModsRes);
      setAdmins(adminsRes);
      setAuditLogs(auditRes.items);
      setTenantUsers(usersRes.items);
      if (usersRes.items.length > 0) {
        setSelectedUserId(usersRes.items[0]!.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, [companyId, initialCompany]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  // Edit Company Submit
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSavingEdit(true);
    try {
      const updated = await superAdminApi.updateCompany(companyId, {
        name: editData.name.trim(),
        legalName: editData.legalName.trim() || undefined,
        businessEmail: editData.businessEmail.trim() || undefined,
        contactPhone: editData.contactPhone.trim() || undefined,
        country: editData.country.trim() || undefined,
        timeZone: editData.timeZone.trim() || undefined,
      });
      setCompany(updated);
      setIsEditOpen(false);
      setActionSuccess('Company details updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setSavingEdit(false);
    }
  };

  // Status Toggle
  const handleConfirmSuspend = async () => {
    if (!companyId) return;
    setSuspending(true);
    try {
      const updated = await superAdminApi.suspendCompany(companyId);
      setCompany(updated);
      setIsSuspendConfirmOpen(false);
      setActionSuccess('Company suspended.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to suspend company');
    } finally {
      setSuspending(false);
    }
  };

  const handleActivate = async () => {
    if (!companyId) return;
    try {
      const updated = await superAdminApi.activateCompany(companyId);
      setCompany(updated);
      setActionSuccess('Company reactivated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate company');
    }
  };

  // Module Enable / Disable
  const handleToggleModule = async (
    moduleCode: string,
    currentStatus: 'enabled' | 'disabled' | null,
  ) => {
    if (!company) return;
    try {
      if (currentStatus === 'enabled') {
        await superAdminApi.disableModule(company.tenantId, moduleCode, company.id);
        setActionSuccess(`Application '${moduleCode.toUpperCase()}' disabled for this company.`);
      } else {
        await superAdminApi.enableModule(company.tenantId, moduleCode, company.id);
        setActionSuccess(`Application '${moduleCode.toUpperCase()}' enabled for this company.`);
      }
      const refreshedMods = await superAdminApi.getTenantModules(company.tenantId, company.id);
      setCompanyModules(refreshedMods);
      // Also refresh company
      const refreshedComp = await superAdminApi.getCompany(company.id);
      setCompany(refreshedComp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle application access');
    }
  };

  // Assign Admin
  const handleAssignAdminSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setAssigningAdmin(true);
    try {
      let payload: {
        tenantId: string;
        companyId: string;
        userId?: string;
        newUser?: { email: string; firstName: string; lastName: string; phone?: string };
      };

      if (adminMode === 'existing') {
        if (!selectedUserId) {
          setError('Please select an existing user.');
          setAssigningAdmin(false);
          return;
        }
        payload = {
          tenantId: company.tenantId,
          companyId: company.id,
          userId: selectedUserId,
        };
      } else {
        if (
          !newAdminData.email.trim() ||
          !newAdminData.firstName.trim() ||
          !newAdminData.lastName.trim()
        ) {
          setError(
            'Email, First Name, and Last Name are required for new administrator invitation.',
          );
          setAssigningAdmin(false);
          return;
        }
        payload = {
          tenantId: company.tenantId,
          companyId: company.id,
          newUser: {
            email: newAdminData.email.trim().toLowerCase(),
            firstName: newAdminData.firstName.trim(),
            lastName: newAdminData.lastName.trim(),
            phone: newAdminData.phone.trim() || undefined,
          },
        };
      }

      const res = await superAdminApi.assignCompanyAdmin(payload);
      setIsAssignAdminOpen(false);
      setActionSuccess(
        res.invitationDelivery.message || 'Company Administrator assigned successfully.',
      );
      const refreshedAdmins = await superAdminApi.listCompanyAdmins({ companyId: company.id });
      setAdmins(refreshedAdmins);
      const refreshedComp = await superAdminApi.getCompany(company.id);
      setCompany(refreshedComp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign company administrator');
    } finally {
      setAssigningAdmin(false);
    }
  };

  // Revoke Admin
  const handleRevokeAdmin = async (membershipId: string) => {
    if (!company) return;
    if (!confirm('Are you sure you want to revoke this Company Administrator access?')) return;
    try {
      await superAdminApi.revokeCompanyAdmin(membershipId);
      setActionSuccess('Company Administrator access revoked.');
      const refreshedAdmins = await superAdminApi.listCompanyAdmins({ companyId: company.id });
      setAdmins(refreshedAdmins);
      const refreshedComp = await superAdminApi.getCompany(company.id);
      setCompany(refreshedComp);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke company administrator');
    }
  };

  // Resend Invitation
  const handleResendInvitation = async (membershipId: string) => {
    try {
      const res = await superAdminApi.resendCompanyAdminInvitation(membershipId);
      setActionSuccess(res.invitationDelivery.message || 'Sign-in invitation resent.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend sign-in invitation');
    }
  };

  if (loading && !company) {
    return (
      <Page>
        <LoadingState label="Loading company details..." />
      </Page>
    );
  }

  if (!company) {
    return (
      <Page>
        <Alert variant="error" title="Company Not Found">
          The requested company entity does not exist.
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/super-admin/companies')}>
          Return to Companies
        </Button>
      </Page>
    );
  }

  // Helper: check if tenant is entitled to module
  const isTenantEntitledTo = (code: 'hrms' | 'crm' | 'project_management'): boolean => {
    const mod = tenantModules.find((m) => m.moduleCode === code && m.companyId === null);
    if (code === 'hrms') {
      return mod?.status !== 'disabled';
    }
    return mod?.status === 'enabled';
  };

  // Lightweight Deterministic Company Setup Status
  const enabledApps = companyModules.filter((m) => m.status === 'enabled');
  const hasAppEnabled =
    enabledApps.length > 0 || (company.enabledModules && company.enabledModules.length > 0);
  const hasAdminAssigned = admins.length > 0;
  const hasAdminSignedIn = admins.some((a) => Boolean(a.lastLoginAt));

  const milestones = [
    {
      key: 'created',
      label: 'Company created',
      completed: true,
    },
    {
      key: 'app_enabled',
      label: 'At least one application enabled',
      completed: Boolean(hasAppEnabled),
      actionLabel: 'Manage Applications',
      onAction: () => setActiveTab('applications'),
    },
    {
      key: 'admin_assigned',
      label: 'Company Administrator assigned',
      completed: Boolean(hasAdminAssigned),
      actionLabel: 'Assign Administrator',
      onAction: () => setIsAssignAdminOpen(true),
    },
    {
      key: 'admin_signed_in',
      label: 'Administrator completed first sign-in',
      completed: Boolean(hasAdminSignedIn),
      actionLabel: admins.length > 0 ? 'Resend Invitation' : undefined,
      onAction:
        admins.length > 0 ? () => handleResendInvitation(admins[0]!.membershipId) : undefined,
    },
  ];

  const incompleteMilestones = milestones.filter((m) => !m.completed);
  const isSetupComplete = incompleteMilestones.length === 0;
  const nextActionMilestone = incompleteMilestones[0];

  return (
    <Page>
      {/* ── TARGET HEADER ───────────────────────────────────────── */}
      <PageHeader
        title={company.name}
        subtitle={`${company.code} • ${company.tenantName || tenant?.name || company.tenantId}`}
        badge={
          <Badge status={company.status}>
            {company.status === 'active' ? '● Active' : 'Suspended'}
          </Badge>
        }
        actions={
          <Inline gap="sm">
            <Button
              variant="secondary"
              onClick={() => navigate('/super-admin/companies')}
              leftIcon={<BezentIcon name="chevron-left" size={14} color="currentColor" />}
            >
              Companies
            </Button>
            <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
              Edit Company
            </Button>
            {company.status === 'active' ? (
              <Button variant="danger" onClick={() => setIsSuspendConfirmOpen(true)}>
                Suspend Company
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleActivate}>
                Reactivate Company
              </Button>
            )}
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {actionSuccess && (
        <Alert variant="info" title="Success" onDismiss={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {/* ── 4 TABS: Overview, Applications, Administrators, Activity ── */}
      <Tabs
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'applications', label: 'Applications', count: enabledApps.length },
          { id: 'administrators', label: 'Administrators', count: admins.length },
          { id: 'activity', label: 'Activity' },
        ]}
        activeId={activeTab}
        onChange={(tabId) => setActiveTab(tabId as TabKey)}
      />

      {/* ── TAB 1: OVERVIEW ───────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <Stack gap="lg">
          {/* Summary Stat Cards */}
          <Grid columns="auto-fit" gap="md">
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Status</span>
                <Badge status={company.status}>
                  {company.status === 'active' ? 'Active' : 'Suspended'}
                </Badge>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Customer</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/super-admin/tenants/${company.tenantId}`)}
                >
                  {company.tenantName || tenant?.name || company.tenantId}
                </Button>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Applications</span>
                <strong>{enabledApps.length > 0 ? `${enabledApps.length} Enabled` : 'None'}</strong>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Company Admins</span>
                <strong>{admins.length} Assigned</strong>
              </Stack>
            </Card>
            <Card>
              <Stack gap="xs">
                <span className="bezent-caption">Created</span>
                <span>{new Date(company.createdAt).toLocaleDateString()}</span>
              </Stack>
            </Card>
          </Grid>

          {/* LIGHTWEIGHT DETERMINISTIC SETUP STATUS */}
          <Card>
            <Section
              title="Company Setup Status"
              subtitle="Deterministic setup milestones derived from platform data"
              actions={
                isSetupComplete ? (
                  <Badge variant="success">Setup Complete</Badge>
                ) : (
                  <Badge variant="warning">
                    {incompleteMilestones.length} step{incompleteMilestones.length === 1 ? '' : 's'}{' '}
                    remaining
                  </Badge>
                )
              }
            >
              <Stack gap="md">
                <Grid columns={4} gap="md">
                  {milestones.map((m) => (
                    <Card key={m.key}>
                      <Stack gap="xs">
                        <Inline gap="xs" align="center">
                          <span>{m.completed ? '✓' : '○'}</span>
                          <strong className="bezent-caption">{m.label}</strong>
                        </Inline>
                        <Badge variant={m.completed ? 'success' : 'neutral'}>
                          {m.completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </Stack>
                    </Card>
                  ))}
                </Grid>

                {!isSetupComplete && nextActionMilestone && nextActionMilestone.actionLabel && (
                  <Inline justify="between" align="center">
                    <span className="bezent-caption">
                      Next Best Action: Resolve <strong>{nextActionMilestone.label}</strong>
                    </span>
                    <Button variant="primary" size="sm" onClick={nextActionMilestone.onAction}>
                      {nextActionMilestone.actionLabel}
                    </Button>
                  </Inline>
                )}
              </Stack>
            </Section>
          </Card>

          {/* COMPANY INFORMATION */}
          <Card>
            <Section
              title="Company Information"
              subtitle="Corporate registration and operational metadata"
            >
              <Grid columns={3} gap="md">
                <Stack gap="xs">
                  <span className="bezent-caption">Company Name</span>
                  <strong>{company.name}</strong>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Company Code</span>
                  <code>{company.code}</code>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Legal Entity Name</span>
                  <span>{company.legalName || '—'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Parent Customer</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/super-admin/tenants/${company.tenantId}`)}
                  >
                    {company.tenantName || tenant?.name || company.tenantId}
                  </Button>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Country</span>
                  <span>{company.country || '—'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Time Zone</span>
                  <span>{company.timeZone || '—'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Business Email</span>
                  <span>{company.businessEmail || '—'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Contact Phone</span>
                  <span>{company.contactPhone || '—'}</span>
                </Stack>
                <Stack gap="xs">
                  <span className="bezent-caption">Created Date</span>
                  <span>{new Date(company.createdAt).toLocaleString()}</span>
                </Stack>
              </Grid>
            </Section>
          </Card>
        </Stack>
      )}

      {/* ── TAB 2: APPLICATIONS ───────────────────────────────────── */}
      {activeTab === 'applications' && (
        <Stack gap="md">
          <Alert variant="info" title="Tenant Entitlement Ceiling">
            Company applications are strictly bounded by customer tenant entitlements. A company can
            only be granted applications that are enabled for its parent customer tenant.
          </Alert>

          <Stack gap="sm">
            {[
              {
                code: 'hrms' as const,
                title: 'Human Resource Management System (HRMS)',
                description:
                  'Workforce records, organization structure, attendance, and leave management.',
              },
              {
                code: 'crm' as const,
                title: 'Customer Relationship Management (CRM)',
                description: 'Sales pipelines, customer accounts, contacts, and deal management.',
              },
              {
                code: 'project_management' as const,
                title: 'Project Management (PM)',
                description: 'Projects, tasks, sprints, timesheets, and milestone tracking.',
              },
            ].map((app) => {
              const tenantEntitled = isTenantEntitledTo(app.code);
              const compMod = companyModules.find((m) => m.moduleCode === app.code);
              const isCompEnabled = compMod?.status === 'enabled';

              return (
                <Card key={app.code}>
                  <Inline justify="between" align="center">
                    <Stack gap="xs">
                      <strong>{app.title}</strong>
                      <span className="bezent-caption">{app.description}</span>
                      <Inline gap="md" align="center">
                        <Inline gap="xs" align="center">
                          <span className="bezent-caption">Tenant Entitlement:</span>
                          <Badge variant={tenantEntitled ? 'success' : 'neutral'}>
                            {tenantEntitled ? '✓ Available' : '✕ Not Available'}
                          </Badge>
                        </Inline>
                        <Inline gap="xs" align="center">
                          <span className="bezent-caption">Company Access:</span>
                          {tenantEntitled ? (
                            <Badge variant={isCompEnabled ? 'success' : 'neutral'}>
                              {isCompEnabled ? '● Enabled' : '○ Disabled'}
                            </Badge>
                          ) : (
                            <span className="bezent-caption">
                              — Not included in customer entitlement
                            </span>
                          )}
                        </Inline>
                      </Inline>
                    </Stack>

                    <div>
                      {tenantEntitled ? (
                        <Button
                          variant={isCompEnabled ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() =>
                            handleToggleModule(app.code, compMod ? compMod.status : null)
                          }
                        >
                          {isCompEnabled ? 'Disable Access' : 'Enable Access'}
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" disabled>
                          Unavailable
                        </Button>
                      )}
                    </div>
                  </Inline>
                </Card>
              );
            })}
          </Stack>
        </Stack>
      )}

      {/* ── TAB 3: ADMINISTRATORS ─────────────────────────────────── */}
      {activeTab === 'administrators' && (
        <Stack gap="md">
          <Inline justify="between" align="center">
            <span className="bezent-caption">
              Administrators assigned to <strong>{company.name}</strong>. BEZENT uses passwordless
              universal identity; administrators sign in via Email OTP.
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAssignAdminOpen(true)}
              leftIcon={<BezentIcon name="plus" size={14} color="currentColor" />}
            >
              Assign Administrator
            </Button>
          </Inline>

          {admins.length === 0 && (
            <EmptyState
              title="No Company Administrator"
              description="This company currently has no administrator assigned."
              primaryAction={{
                label: 'Assign Administrator',
                onClick: () => setIsAssignAdminOpen(true),
              }}
            />
          )}

          {admins.length > 0 && (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Administrator</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Sign-In Status</TableHeaderCell>
                    <TableHeaderCell>Last Sign-In</TableHeaderCell>
                    <TableHeaderCell>Assigned Date</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {admins.map((a) => (
                    <TableRow key={a.membershipId}>
                      <TableCell>
                        <strong>
                          {a.firstName} {a.lastName}
                        </strong>
                      </TableCell>
                      <TableCell>
                        <span>{a.email}</span>
                      </TableCell>
                      <TableCell>
                        {a.lastLoginAt ? (
                          <Badge variant="success">● Active</Badge>
                        ) : (
                          <Badge variant="warning">○ Pending First Sign-in</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span>
                          {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span>{new Date(a.assignedAt).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell>
                        <Inline gap="xs">
                          {!a.lastLoginAt && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResendInvitation(a.membershipId)}
                            >
                              Resend Invite
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevokeAdmin(a.membershipId)}
                          >
                            Revoke
                          </Button>
                        </Inline>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      )}

      {/* ── TAB 4: ACTIVITY ───────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <Stack gap="md">
          <span className="bezent-caption">
            Administrative and security audit trail for <strong>{company.name}</strong>.
          </span>

          {auditLogs.length === 0 && (
            <EmptyState
              title="No activity recorded"
              description="No audit events have been recorded for this company entity yet."
            />
          )}

          {auditLogs.length > 0 && (
            <Card>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Timestamp</TableHeaderCell>
                    <TableHeaderCell>Actor</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                    <TableHeaderCell>Target</TableHeaderCell>
                    <TableHeaderCell>Details</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="bezent-caption">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span>{log.actorEmail || log.actorUserId || 'System'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <code>
                          {log.targetType}:{log.targetId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className="bezent-caption">
                          {log.metadata ? JSON.stringify(log.metadata) : '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </Stack>
      )}

      {/* ── EDIT COMPANY MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Company Details"
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
              label="Company Name *"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              required
            />
            <Input
              label="Legal Name"
              value={editData.legalName}
              onChange={(e) => setEditData({ ...editData, legalName: e.target.value })}
            />
            <Input
              label="Business Email"
              type="email"
              value={editData.businessEmail}
              onChange={(e) => setEditData({ ...editData, businessEmail: e.target.value })}
            />
            <Input
              label="Contact Phone"
              value={editData.contactPhone}
              onChange={(e) => setEditData({ ...editData, contactPhone: e.target.value })}
            />
            <Inline gap="md">
              <Input
                label="Country"
                value={editData.country}
                onChange={(e) => setEditData({ ...editData, country: e.target.value })}
              />
              <Input
                label="Time Zone"
                value={editData.timeZone}
                onChange={(e) => setEditData({ ...editData, timeZone: e.target.value })}
              />
            </Inline>
          </Stack>
        </form>
      </Modal>

      {/* ── ASSIGN ADMINISTRATOR MODAL ────────────────────────────── */}
      <Modal
        isOpen={isAssignAdminOpen}
        onClose={() => setIsAssignAdminOpen(false)}
        title="Assign Company Administrator"
        description="Assign an existing user or invite a new administrator via Email OTP."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsAssignAdminOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignAdminSubmit} disabled={assigningAdmin}>
              {assigningAdmin ? 'Assigning...' : 'Assign Administrator'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleAssignAdminSubmit}>
          <Stack gap="md">
            <Inline gap="sm">
              <Button
                variant={adminMode === 'existing' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setAdminMode('existing')}
              >
                Assign Existing User
              </Button>
              <Button
                variant={adminMode === 'new' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setAdminMode('new')}
              >
                Invite New Administrator
              </Button>
            </Inline>

            {adminMode === 'existing' && (
              <Stack gap="sm">
                {tenantUsers.length === 0 ? (
                  <Alert variant="warning" title="No Users Found">
                    No users exist under this customer tenant. You can invite a new administrator
                    instead.
                  </Alert>
                ) : (
                  <Select
                    label="Select Existing User *"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    options={tenantUsers.map((u) => ({
                      value: u.id,
                      label: `${u.firstName} ${u.lastName} (${u.email})`,
                    }))}
                  />
                )}
              </Stack>
            )}

            {adminMode === 'new' && (
              <Stack gap="sm">
                <Input
                  label="Administrator Email *"
                  type="email"
                  placeholder="admin@company.com"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                  required
                />
                <Inline gap="md">
                  <Input
                    label="First Name *"
                    placeholder="Jane"
                    value={newAdminData.firstName}
                    onChange={(e) =>
                      setNewAdminData({ ...newAdminData, firstName: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Last Name *"
                    placeholder="Doe"
                    value={newAdminData.lastName}
                    onChange={(e) => setNewAdminData({ ...newAdminData, lastName: e.target.value })}
                    required
                  />
                </Inline>
                <Input
                  label="Phone"
                  placeholder="+1 555-0100"
                  value={newAdminData.phone}
                  onChange={(e) => setNewAdminData({ ...newAdminData, phone: e.target.value })}
                />
                <span className="bezent-caption">
                  The administrator will receive a sign-in invitation and sign in via Email OTP. No
                  passwords are created.
                </span>
              </Stack>
            )}
          </Stack>
        </form>
      </Modal>

      {/* ── SUSPEND CONFIRMATION MODAL ────────────────────────────── */}
      <Modal
        isOpen={isSuspendConfirmOpen}
        onClose={() => setIsSuspendConfirmOpen(false)}
        title="Suspend Company Entity"
        description="Confirm company suspension."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsSuspendConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmSuspend} disabled={suspending}>
              {suspending ? 'Suspending...' : 'Confirm Suspension'}
            </Button>
          </Inline>
        }
      >
        <Alert variant="warning" title="Restricted Access">
          Are you sure you want to suspend &apos;{company.name}&apos;? Suspending this company will
          block all users and company administrators from accessing applications and services for
          this company entity until reactivated.
        </Alert>
      </Modal>
    </Page>
  );
}
