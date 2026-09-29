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
import { superAdminApi, type CompanyRecord, type TenantRecord } from '../api/superAdminApi';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companiesRes, tenantsRes] = await Promise.all([
        superAdminApi.listCompanies({
          tenantId: selectedTenantId !== 'all' ? selectedTenantId : undefined,
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
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
  }, [selectedTenantId, search, statusFilter, formData.tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.name.trim() || !formData.code.trim()) {
      setFormError('Tenant, Company Name and Company Code are required');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await superAdminApi.createCompany({
        tenantId: formData.tenantId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        legalName: formData.legalName.trim() || undefined,
        businessEmail: formData.businessEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        country: formData.country.trim() || undefined,
        timeZone: formData.timeZone.trim() || undefined,
      });
      setIsCreateOpen(false);
      setFormData({
        tenantId: tenants[0]?.id || '',
        name: '',
        code: '',
        legalName: '',
        businessEmail: '',
        contactPhone: '',
        country: 'US',
        timeZone: 'America/New_York',
      });
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (company: CompanyRecord) => {
    try {
      if (company.status === 'active') {
        if (!confirm(`Are you sure you want to suspend '${company.name}'?`)) return;
        await superAdminApi.suspendCompany(company.id);
      } else {
        await superAdminApi.activateCompany(company.id);
      }
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to toggle company status');
    }
  };

  return (
    <Page>
      <PageHeader
        title="Companies"
        subtitle="Manage business and legal company entities within customer tenants"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
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
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Customer Tenants' },
                    ...tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                  ]}
                />
                <Input
                  placeholder="Search by company name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
              description="No company records match your search or none have been registered under this customer."
              primaryAction={{
                label: 'Create Company',
                onClick: () => setIsCreateOpen(true),
              }}
            />
          )}

          {!loading && companies.length > 0 && (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Company</TableHeaderCell>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Tenant</TableHeaderCell>
                  <TableHeaderCell>Country / TimeZone</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Stack gap="xs">
                        <strong>{company.name}</strong>
                        <span className="bezent-caption">{company.legalName || company.id}</span>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <code>{company.code}</code>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/super-admin/tenants/${company.tenantId}`)}
                      >
                        {company.tenantName || company.tenantId}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {company.country || '—'} / {company.timeZone || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge status={company.status}>{company.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Inline gap="sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                        >
                          Details
                        </Button>
                        <Button
                          variant={company.status === 'active' ? 'danger' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleStatus(company)}
                        >
                          {company.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* Create Company Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Company Entity"
        description="Add a legal business company under an existing customer tenant."
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Company'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleCreateSubmit}>
          <Stack gap="md">
            {formError && (
              <Alert variant="error" title="Validation Error">
                {formError}
              </Alert>
            )}

            <Select
              label="Customer / Tenant *"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              options={tenants.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
              required
            />

            <Input
              label="Company Name *"
              placeholder="e.g. Acme Technologies Inc."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Company Code *"
              placeholder="e.g. ACME-TECH"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />

            <Input
              label="Legal Entity Name"
              placeholder="e.g. Acme Technologies International LLC"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            />

            <Input
              label="Business Contact Email"
              type="email"
              placeholder="contact@acme.com"
              value={formData.businessEmail}
              onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
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
        </form>
      </Modal>
    </Page>
  );
}
