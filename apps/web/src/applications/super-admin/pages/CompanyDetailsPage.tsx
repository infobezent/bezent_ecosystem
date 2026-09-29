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
  Alert,
  LoadingState,
  Modal,
} from '../../../design-system/components';
import { superAdminApi, type CompanyRecord } from '../api/superAdminApi';

export function CompanyDetailsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editData, setEditData] = useState({
    name: '',
    legalName: '',
    businessEmail: '',
    contactPhone: '',
    country: '',
    timeZone: '',
  });

  const fetchCompany = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getCompany(companyId);
      setCompany(res);
      setEditData({
        name: res.name,
        legalName: res.legalName || '',
        businessEmail: res.businessEmail || '',
        contactPhone: res.contactPhone || '',
        country: res.country || '',
        timeZone: res.timeZone || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    setSaving(true);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!company || !companyId) return;
    try {
      if (company.status === 'active') {
        if (!confirm(`Are you sure you want to suspend company '${company.name}'?`)) return;
        const res = await superAdminApi.suspendCompany(companyId);
        setCompany(res);
      } else {
        const res = await superAdminApi.activateCompany(companyId);
        setCompany(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company status');
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

  return (
    <Page>
      <PageHeader
        title={company.name}
        subtitle={`Company ID: ${company.id} • Code: ${company.code}`}
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={() => navigate('/super-admin/companies')}>
              Back to Companies
            </Button>
            <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
              Edit Info
            </Button>
            <Button
              variant={company.status === 'active' ? 'danger' : 'secondary'}
              onClick={handleToggleStatus}
            >
              {company.status === 'active' ? 'Suspend Company' : 'Activate Company'}
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <Section title="Entity Details" subtitle="Company profile and regulatory metadata">
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
              <span className="bezent-caption">Status</span>
              <div>
                <Badge status={company.status}>{company.status}</Badge>
              </div>
            </Stack>
            <Stack gap="xs">
              <span className="bezent-caption">Tenant Association</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/super-admin/tenants/${company.tenantId}`)}
              >
                {company.tenantName || company.tenantId}
              </Button>
            </Stack>
            <Stack gap="xs">
              <span className="bezent-caption">Legal Entity Name</span>
              <span>{company.legalName || 'None'}</span>
            </Stack>
            <Stack gap="xs">
              <span className="bezent-caption">Business Email</span>
              <span>{company.businessEmail || 'None'}</span>
            </Stack>
            <Stack gap="xs">
              <span className="bezent-caption">Country</span>
              <span>{company.country || 'None'}</span>
            </Stack>
            <Stack gap="xs">
              <span className="bezent-caption">Time Zone</span>
              <span>{company.timeZone || 'None'}</span>
            </Stack>
            <Stack gap="xs">
              <span className="bezent-caption">Created Date</span>
              <span>{new Date(company.createdAt).toLocaleString()}</span>
            </Stack>
          </Grid>
        </Section>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Company Details"
        footer={
          <Inline gap="sm" justify="end">
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Inline>
        }
      >
        <form onSubmit={handleEditSubmit}>
          <Stack gap="md">
            <Input
              label="Company Name"
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
              label="Country"
              value={editData.country}
              onChange={(e) => setEditData({ ...editData, country: e.target.value })}
            />
            <Input
              label="Time Zone"
              value={editData.timeZone}
              onChange={(e) => setEditData({ ...editData, timeZone: e.target.value })}
            />
          </Stack>
        </form>
      </Modal>
    </Page>
  );
}
