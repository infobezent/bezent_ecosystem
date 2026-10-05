import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Card,
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
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type CompanyRecord,
  type TenantRecord,
  type TenantModuleStatus,
  type PlatformUserSummary,
} from '../api/superAdminApi';

interface CompaniesPageProps {
  initialCompanies?: CompanyRecord[];
  initialTenants?: TenantRecord[];
}

export function CompaniesPage({ initialCompanies, initialTenants }: CompaniesPageProps) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRecord[]>(initialCompanies ?? []);
  const [tenants, setTenants] = useState<TenantRecord[]>(initialTenants ?? []);
  const [total, setTotal] = useState<number>(initialCompanies ? initialCompanies.length : 0);
  const [loading, setLoading] = useState<boolean>(!initialCompanies);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [applicationFilter, setApplicationFilter] = useState<string>('all');

  // Create Company Multi-Step Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1 Form Data
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    code: '',
    legalName: '',
    businessEmail: '',
    contactPhone: '',
    country: 'US',
    timeZone: 'America/New_York',
  });

  // Step 2 Modules Data
  const [tenantModules, setTenantModules] = useState<TenantModuleStatus[]>([]);
  const [loadingModules, setLoadingModules] = useState<boolean>(false);
  const [selectedModules, setSelectedModules] = useState<Array<'hrms' | 'crm' | 'project_management'>>(['hrms']);

  // Step 3 Admin Data
  const [adminMode, setAdminMode] = useState<'existing' | 'new' | 'skip'>('skip');
  const [tenantUsers, setTenantUsers] = useState<PlatformUserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    legalName: '',
    businessEmail: '',
    contactPhone: '',
    country: '',
    timeZone: '',
  });

  // Suspend Confirmation State
  const [suspendingCompany, setSuspendingCompany] = useState<CompanyRecord | null>(null);

  const fetchData = useCallback(async () => {
    if (initialCompanies) return;
    setLoading(true);
    setError(null);
    try {
      const [companiesRes, tenantsRes] = await Promise.all([
        superAdminApi.listCompanies({
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          moduleCode: applicationFilter !== 'all' ? applicationFilter : undefined,
        }),
        superAdminApi.listTenants({ limit: 100 }),
      ]);
      setCompanies(companiesRes.items);
      setTotal(companiesRes.total);
      setTenants(tenantsRes.items);
      if (!formData.tenantId && tenantsRes.items.length > 0) {
        setFormData((prev) => ({ ...prev, tenantId: tenantsRes.items[0]!.id }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, search, statusFilter, applicationFilter, formData.tenantId, initialCompanies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selected tenant changes in Step 1, pre-fetch tenant entitlements for Step 2
  const handleTenantChange = async (tenantId: string) => {
    setFormData((prev) => ({ ...prev, tenantId }));
    if (!tenantId) return;
    setLoadingModules(true);
    try {
      const mods = await superAdminApi.getTenantModules(tenantId);
      setTenantModules(mods);
      // Default to HRMS if tenant is entitled
      const hrmsMod = mods.find((m) => m.moduleCode === 'hrms');
      if (hrmsMod && hrmsMod.status === 'disabled') {
        setSelectedModules([]);
      } else {
        setSelectedModules(['hrms']);
      }
    } catch {
      setTenantModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleOpenCreateModal = () => {
    const initialTid = tenants[0]?.id || '';
    setFormData({
      tenantId: initialTid,
      name: '',
      code: '',
      legalName: '',
      businessEmail: '',
      contactPhone: '',
      country: 'US',
      timeZone: 'America/New_York',
    });
    setCreateStep(1);
    setFormError(null);
    setAdminMode('skip');
    setSelectedUserId('');
    setNewAdmin({ email: '', firstName: '', lastName: '', phone: '' });
    if (initialTid) {
      handleTenantChange(initialTid);
    }
    setIsCreateOpen(true);
  };

  const handleStep1Next = async () => {
    if (!formData.tenantId || !formData.name.trim() || !formData.code.trim()) {
      setFormError('Tenant, Company Name, and Company Code are required.');
      return;
    }
    setFormError(null);
    if (tenantModules.length === 0 && formData.tenantId) {
      await handleTenantChange(formData.tenantId);
    }
    setCreateStep(2);
  };

  const handleStep2Next = async () => {
    setCreateStep(3);
    if (formData.tenantId) {
      setLoadingUsers(true);
      try {
        const usersRes = await superAdminApi.listUsers({ tenantId: formData.tenantId });
        setTenantUsers(usersRes.items);
        if (usersRes.items.length > 0 && !selectedUserId) {
          setSelectedUserId(usersRes.items[0]!.id);
        }
      } catch {
        setTenantUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const handleStep3Next = () => {
    if (adminMode === 'new') {
      if (!newAdmin.email.trim() || !newAdmin.firstName.trim() || !newAdmin.lastName.trim()) {
        setFormError('Admin Email, First Name, and Last Name are required when inviting a new administrator.');
        return;
      }
    }
    setFormError(null);
    setCreateStep(4);
  };

  const handleCreateSubmit = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      let adminPayload: { userId?: string; newUser?: { email: string; firstName: string; lastName: string; phone?: string } } | undefined = undefined;

      if (adminMode === 'existing' && selectedUserId) {
        adminPayload = { userId: selectedUserId };
      } else if (adminMode === 'new' && newAdmin.email.trim()) {
        adminPayload = {
          newUser: {
            email: newAdmin.email.trim().toLowerCase(),
            firstName: newAdmin.firstName.trim(),
            lastName: newAdmin.lastName.trim(),
            phone: newAdmin.phone.trim() || undefined,
          },
        };
      }

      await superAdminApi.createCompany({
        tenantId: formData.tenantId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        legalName: formData.legalName.trim() || undefined,
        businessEmail: formData.businessEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        country: formData.country.trim() || undefined,
        timeZone: formData.timeZone.trim() || undefined,
        modules: selectedModules,
        admin: adminPayload,
      });

      setIsCreateOpen(false);
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Flow
  const handleOpenEdit = (comp: CompanyRecord) => {
    setEditingCompany(comp);
    setEditFormData({
      name: comp.name,
      legalName: comp.legalName || '',
      businessEmail: comp.businessEmail || '',
      contactPhone: comp.contactPhone || '',
      country: comp.country || '',
      timeZone: comp.timeZone || '',
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setSubmitting(true);
    try {
      await superAdminApi.updateCompany(editingCompany.id, {
        name: editFormData.name.trim(),
        legalName: editFormData.legalName.trim() || undefined,
        businessEmail: editFormData.businessEmail.trim() || undefined,
        contactPhone: editFormData.contactPhone.trim() || undefined,
        country: editFormData.country.trim() || undefined,
        timeZone: editFormData.timeZone.trim() || undefined,
      });
      setIsEditOpen(false);
      setEditingCompany(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  // Status Toggle
  const handleConfirmSuspend = async () => {
    if (!suspendingCompany) return;
    try {
      await superAdminApi.suspendCompany(suspendingCompany.id);
      setSuspendingCompany(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to suspend company');
    }
  };

  const handleActivate = async (comp: CompanyRecord) => {
    try {
      await superAdminApi.activateCompany(comp.id);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate company');
    }
  };

  // Helper to check if tenant is entitled to module
  const isTenantEntitledTo = (code: 'hrms' | 'crm' | 'project_management'): boolean => {
    const mod = tenantModules.find((m) => m.moduleCode === code && m.companyId === null);
    if (code === 'hrms') {
      return mod?.status !== 'disabled';
    }
    return mod?.status === 'enabled';
  };

  const selectedTenantObj = tenants.find((t) => t.id === formData.tenantId);

  return (
    <Page>
      <PageHeader
        title="Companies"
        subtitle="Manage legal/business entities across customer tenants."
        actions={
          <Button
            variant="primary"
            onClick={handleOpenCreateModal}
            leftIcon={<BezentIcon name="plus" size={16} color="currentColor" />}
          >
            Create Company
          </Button>
        }
      />

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Stack gap="md">
          {/* Filter Toolbar */}
          <Toolbar
            left={
              <Inline gap="md" align="center">
                <Input
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Customer Tenants' },
                    ...tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                  ]}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'suspended', label: 'Suspended Only' },
                  ]}
                />
                <Select
                  value={applicationFilter}
                  onChange={(e) => setApplicationFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Applications' },
                    { value: 'hrms', label: 'HRMS' },
                    { value: 'crm', label: 'CRM' },
                    { value: 'project_management', label: 'Project Management' },
                  ]}
                />
              </Inline>
            }
            right={
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchData}
                leftIcon={<BezentIcon name="refresh" size={14} color="currentColor" />}
              >
                Refresh
              </Button>
            }
          />

          {loading && <LoadingState label="Loading companies..." />}

          {!loading && companies.length === 0 && (
            <EmptyState
              title="No companies found"
              description="No company records match your search or filter criteria."
              primaryAction={{
                label: 'Create Company',
                onClick: handleOpenCreateModal,
              }}
            />
          )}

          {!loading && companies.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Company</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Applications</TableHeaderCell>
                  <TableHeaderCell>Admin Access</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map((company) => {
                  const enabledMods = company.enabledModules ?? [];
                  const adminStatus = company.adminAccessStatus ?? 'none';
                  const activeCount = company.activeAdminsCount ?? 0;

                  return (
                    <TableRow key={company.id}>
                      {/* COMPANY COLUMN */}
                      <TableCell>
                        <Stack gap="xs">
                          <strong>{company.name}</strong>
                          <span className="bezent-caption">{company.code}</span>
                        </Stack>
                      </TableCell>

                      {/* CUSTOMER COLUMN */}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/super-admin/tenants/${company.tenantId}`)}
                        >
                          {company.tenantName || company.tenantId}
                        </Button>
                      </TableCell>

                      {/* APPLICATIONS COLUMN */}
                      <TableCell>
                        {enabledMods.length > 0 ? (
                          <Inline gap="xs">
                            {enabledMods.map((m) => (
                              <Badge key={m} variant="neutral">
                                {m === 'project_management' ? 'PM' : m.toUpperCase()}
                              </Badge>
                            ))}
                          </Inline>
                        ) : (
                          <span className="bezent-caption">None</span>
                        )}
                      </TableCell>

                      {/* ADMIN ACCESS COLUMN */}
                      <TableCell>
                        {adminStatus === 'active' && (
                          <Badge variant="success">
                            ● {activeCount > 1 ? `${activeCount} Active Admins` : 'Admin Active'}
                          </Badge>
                        )}
                        {adminStatus === 'pending' && (
                          <Badge variant="warning">○ Pending Sign-in</Badge>
                        )}
                        {adminStatus === 'none' && (
                          <Badge variant="danger">⚠ No Admin</Badge>
                        )}
                      </TableCell>

                      {/* STATUS COLUMN */}
                      <TableCell>
                        <Badge status={company.status}>
                          {company.status === 'active' ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>

                      {/* ACTIONS COLUMN */}
                      <TableCell>
                        <Inline gap="sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(company)}
                          >
                            Edit
                          </Button>
                          {company.status === 'active' ? (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setSuspendingCompany(company)}
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleActivate(company)}
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

          {!loading && total > 0 && (
            <span className="bezent-caption">
              Showing {companies.length} of {total} companies
            </span>
          )}
        </Stack>
      </Card>

      {/* ── CREATE COMPANY MULTI-STEP MODAL ───────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Company Entity"
        description="Add a legal business entity under an existing customer tenant."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            {createStep > 1 && (
              <Button
                variant="secondary"
                onClick={() => setCreateStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
              >
                ← Back
              </Button>
            )}
            {createStep === 1 && (
              <Button variant="primary" onClick={handleStep1Next}>
                Next: Applications →
              </Button>
            )}
            {createStep === 2 && (
              <Button variant="primary" onClick={handleStep2Next}>
                Next: Administrator →
              </Button>
            )}
            {createStep === 3 && (
              <Button variant="primary" onClick={handleStep3Next}>
                Next: Review →
              </Button>
            )}
            {createStep === 4 && (
              <Button variant="primary" onClick={handleCreateSubmit} disabled={submitting}>
                {submitting ? 'Creating Company...' : 'Create Company'}
              </Button>
            )}
          </Inline>
        }
      >
        <Stack gap="md">
          {formError && (
            <Alert variant="error" title="Validation Error">
              {formError}
            </Alert>
          )}

          {/* Stepper Progress Indicator */}
          <Inline gap="md" align="center" justify="center">
            <Badge variant={createStep === 1 ? 'info' : 'neutral'}>01 Company</Badge>
            <span>→</span>
            <Badge variant={createStep === 2 ? 'info' : 'neutral'}>02 Applications</Badge>
            <span>→</span>
            <Badge variant={createStep === 3 ? 'info' : 'neutral'}>03 Administrator</Badge>
            <span>→</span>
            <Badge variant={createStep === 4 ? 'info' : 'neutral'}>04 Review</Badge>
          </Inline>

          {/* STEP 1: COMPANY */}
          {createStep === 1 && (
            <Stack gap="md">
              <Select
                label="Customer Tenant *"
                value={formData.tenantId}
                onChange={(e) => handleTenantChange(e.target.value)}
                options={tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
                required
              />

              <Input
                label="Company Name *"
                placeholder="e.g. ABC Engineering Pvt Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Company Code *"
                placeholder="e.g. ABC-ENG"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />

              <Input
                label="Legal Entity Name"
                placeholder="e.g. ABC Engineering Private Limited"
                value={formData.legalName}
                onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              />

              <Input
                label="Business Contact Email"
                type="email"
                placeholder="contact@abc-eng.com"
                value={formData.businessEmail}
                onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
              />

              <Input
                label="Contact Phone"
                placeholder="+1 555-0199"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />

              <Inline gap="md">
                <Input
                  label="Country"
                  placeholder="US"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
                <Input
                  label="Time Zone"
                  placeholder="America/New_York"
                  value={formData.timeZone}
                  onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                />
              </Inline>
            </Stack>
          )}

          {/* STEP 2: APPLICATIONS (Enforces Tenant Entitlement Ceiling) */}
          {createStep === 2 && (
            <Stack gap="md">
              <span className="bezent-caption">
                Configure application access for this company. Applications are strictly bounded by{' '}
                <strong>{selectedTenantObj?.name || 'Customer'}</strong> entitlement ceiling.
              </span>

              {loadingModules && <LoadingState label="Checking customer entitlements..." />}

              {!loadingModules && (
                <Stack gap="sm">
                  {[
                    { code: 'hrms', label: 'HRMS (Human Resource Management System)' },
                    { code: 'crm', label: 'CRM (Customer Relationship Management)' },
                    { code: 'project_management', label: 'Project Management' },
                  ].map((mod) => {
                    const entitled = isTenantEntitledTo(mod.code as 'hrms' | 'crm' | 'project_management');
                    const isChecked = selectedModules.includes(mod.code as 'hrms' | 'crm' | 'project_management');

                    return (
                      <Card key={mod.code}>
                        <Inline justify="between" align="center">
                          <Stack gap="xs">
                            <strong>{mod.label}</strong>
                            <span className="bezent-caption">
                              {entitled
                                ? 'Entitled by customer tenant ceiling'
                                : 'Unavailable — not entitled for this customer'}
                            </span>
                          </Stack>
                          {entitled ? (
                            <Button
                              variant={isChecked ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedModules(selectedModules.filter((m) => m !== mod.code));
                                } else {
                                  setSelectedModules([...selectedModules, mod.code as 'hrms' | 'crm' | 'project_management']);
                                }
                              }}
                            >
                              {isChecked ? 'Enabled' : 'Disabled'}
                            </Button>
                          ) : (
                            <Badge variant="neutral">Not Entitled</Badge>
                          )}
                        </Inline>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          )}

          {/* STEP 3: ADMINISTRATOR */}
          {createStep === 3 && (
            <Stack gap="md">
              <span className="bezent-caption">
                Assign or invite a Company Administrator. BEZENT uses passwordless universal identity; the administrator signs in via Email OTP.
              </span>

              <Inline gap="sm">
                <Button
                  variant={adminMode === 'skip' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setAdminMode('skip')}
                >
                  Skip for Now
                </Button>
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

              {adminMode === 'skip' && (
                <Alert variant="info" title="No Administrator Assigned">
                  Company creation will complete without an administrator. You can assign an administrator at any time in Company Details.
                </Alert>
              )}

              {adminMode === 'existing' && (
                <Stack gap="sm">
                  {loadingUsers && <LoadingState label="Loading tenant users..." />}
                  {!loadingUsers && tenantUsers.length === 0 && (
                    <Alert variant="warning" title="No Users Found">
                      No existing users found for this customer tenant. You can invite a new administrator or skip for now.
                    </Alert>
                  )}
                  {!loadingUsers && tenantUsers.length > 0 && (
                    <Select
                      label="Select Existing User"
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
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    required
                  />
                  <Inline gap="md">
                    <Input
                      label="First Name *"
                      placeholder="Jane"
                      value={newAdmin.firstName}
                      onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="Last Name *"
                      placeholder="Doe"
                      value={newAdmin.lastName}
                      onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                      required
                    />
                  </Inline>
                  <Input
                    label="Phone"
                    placeholder="+1 555-0100"
                    value={newAdmin.phone}
                    onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                  />
                  <span className="bezent-caption">
                    Sign-in instructions will be emailed to this address. No passwords are created.
                  </span>
                </Stack>
              )}
            </Stack>
          )}

          {/* STEP 4: REVIEW */}
          {createStep === 4 && (
            <Stack gap="md">
              <Alert variant="info" title="Review Company Configuration">
                Please verify the entity details before creating. The company will be created under the selected customer tenant.
              </Alert>

              <Card>
                <Stack gap="sm">
                  <Inline justify="between">
                    <span className="bezent-caption">Customer Tenant:</span>
                    <strong>{selectedTenantObj?.name} ({selectedTenantObj?.code})</strong>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-caption">Company Name:</span>
                    <strong>{formData.name}</strong>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-caption">Company Code:</span>
                    <code>{formData.code}</code>
                  </Inline>
                  {formData.legalName && (
                    <Inline justify="between">
                      <span className="bezent-caption">Legal Entity Name:</span>
                      <span>{formData.legalName}</span>
                    </Inline>
                  )}
                  <Inline justify="between">
                    <span className="bezent-caption">Enabled Applications:</span>
                    <span>
                      {selectedModules.length > 0
                        ? selectedModules.map((m) => (m === 'project_management' ? 'PM' : m.toUpperCase())).join(', ')
                        : 'None'}
                    </span>
                  </Inline>
                  <Inline justify="between">
                    <span className="bezent-caption">Administrator:</span>
                    <span>
                      {adminMode === 'skip' && 'None (will assign later)'}
                      {adminMode === 'existing' &&
                        `Existing User (${tenantUsers.find((u) => u.id === selectedUserId)?.email || selectedUserId})`}
                      {adminMode === 'new' && `${newAdmin.firstName} ${newAdmin.lastName} (${newAdmin.email})`}
                    </span>
                  </Inline>
                </Stack>
              </Card>
            </Stack>
          )}
        </Stack>
      </Modal>

      {/* ── EDIT COMPANY MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Company Details"
        description="Update corporate profile and contact information."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <Stack gap="md">
            <Input
              label="Company Name *"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
            />
            <Input
              label="Legal Entity Name"
              value={editFormData.legalName}
              onChange={(e) => setEditFormData({ ...editFormData, legalName: e.target.value })}
            />
            <Input
              label="Business Contact Email"
              type="email"
              value={editFormData.businessEmail}
              onChange={(e) => setEditFormData({ ...editFormData, businessEmail: e.target.value })}
            />
            <Input
              label="Contact Phone"
              value={editFormData.contactPhone}
              onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
            />
            <Inline gap="md">
              <Input
                label="Country"
                value={editFormData.country}
                onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
              />
              <Input
                label="Time Zone"
                value={editFormData.timeZone}
                onChange={(e) => setEditFormData({ ...editFormData, timeZone: e.target.value })}
              />
            </Inline>
          </Stack>
        </form>
      </Modal>

      {/* ── SUSPEND CONFIRMATION MODAL ────────────────────────────── */}
      <Modal
        isOpen={Boolean(suspendingCompany)}
        onClose={() => setSuspendingCompany(null)}
        title="Suspend Company"
        description="Confirm company suspension."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setSuspendingCompany(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmSuspend}>
              Confirm Suspension
            </Button>
          </Inline>
        }
      >
        <Alert variant="warning" title="Restricted Access">
          Are you sure you want to suspend &apos;{suspendingCompany?.name}&apos;? Suspending this company will block all users and company administrators from accessing applications and services for this company entity until reactivated.
        </Alert>
      </Modal>
    </Page>
  );
}
