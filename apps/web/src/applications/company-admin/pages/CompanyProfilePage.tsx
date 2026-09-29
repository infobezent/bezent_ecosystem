import { useState, useEffect, useCallback } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  FormField,
  Input,
  Select,
  Button,
  Alert,
  LoadingState,
  Badge,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type CompanyProfile,
  type UpdateCompanyProfileInput,
} from '../api/companyAdminApi';

const COUNTRY_OPTIONS = [
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Germany', label: 'Germany' },
  { value: 'India', label: 'India' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada) (UTC-05:00)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada) (UTC-06:00)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada) (UTC-07:00)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada) (UTC-08:00)' },
  { value: 'Europe/London', label: 'London, Edinburgh, Dublin (UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Berlin, Paris, Amsterdam (UTC+01:00)' },
  { value: 'Asia/Kolkata', label: 'Chennai, Kolkata, Mumbai, New Delhi (UTC+05:30)' },
  { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur (UTC+08:00)' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne, Canberra (UTC+10:00)' },
];

export function CompanyProfilePage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<UpdateCompanyProfileInput>({
    legalName: '',
    businessEmail: '',
    contactPhone: '',
    country: '',
    timeZone: '',
  });

  const fetchProfile = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await companyAdminApi.getProfile(activeCompanyId);
      setProfile(res);
      setFormData({
        legalName: res.legalName || '',
        businessEmail: res.businessEmail || '',
        contactPhone: res.contactPhone || '',
        country: res.country || '',
        timeZone: res.timeZone || '',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await companyAdminApi.updateProfile(formData, activeCompanyId);
      setProfile(updated);
      setSuccess('Company profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Company Profile"
        subtitle={`Legal information, contact details, and localization for ${activeCompany?.name || 'Company'}`}
        actions={
          <Button
            variant="secondary"
            onClick={fetchProfile}
            leftIcon={<BezentIcon name="refresh" size={16} color="currentColor" />}
          >
            Refresh
          </Button>
        }
      />

      <CompanyContextBar onCompanyChange={() => fetchProfile()} />

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success">
          {success}
        </Alert>
      )}

      {loading && !profile && (
        <LoadingState label="Loading company profile..." />
      )}

      {profile && (
        <Stack gap="lg">
          {/* Read-Only System Identity Section */}
          <Section
            title="System Identifiers"
            subtitle="Platform-controlled metadata and customer ownership"
          >
            <Card>
              <Grid columns={3} gap="md">
                <FormField label="Company Display Name">
                  <Input value={profile.name} disabled readOnly />
                </FormField>
                <FormField label="Company Code">
                  <Input value={profile.code} disabled readOnly />
                </FormField>
                <FormField label="Operating Status">
                  <Inline align="center" gap="sm">
                    <Badge variant={profile.status === 'active' ? 'success' : 'danger'}>
                      {profile.status.toUpperCase()}
                    </Badge>
                  </Inline>
                </FormField>
                <FormField label="Tenant ID">
                  <Input value={profile.tenantId} disabled readOnly />
                </FormField>
                <FormField label="Company ID">
                  <Input value={profile.id} disabled readOnly />
                </FormField>
                <FormField label="Created Date">
                  <Input
                    value={new Date(profile.createdAt).toLocaleDateString()}
                    disabled
                    readOnly
                  />
                </FormField>
              </Grid>
            </Card>
          </Section>

          {/* Editable Legal & Contact Profile */}
          <Section
            title="Legal & Operational Details"
            subtitle="Configurable business contact and localization settings"
          >
            <Card>
              <form onSubmit={handleSubmit}>
                <Stack gap="md">
                  <Grid columns={2} gap="md">
                    <FormField
                      label="Legal Name"
                      htmlFor="legalName"
                      helperText="Registered legal or incorporated name of this entity"
                    >
                      <Input
                        id="legalName"
                        value={formData.legalName || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, legalName: e.target.value }))
                        }
                        placeholder="e.g. Acme Corporation LLC"
                      />
                    </FormField>

                    <FormField
                      label="Business Email"
                      htmlFor="businessEmail"
                      helperText="Official administrative correspondence email"
                    >
                      <Input
                        id="businessEmail"
                        type="email"
                        value={formData.businessEmail || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, businessEmail: e.target.value }))
                        }
                        placeholder="admin@company.com"
                      />
                    </FormField>

                    <FormField
                      label="Contact Phone"
                      htmlFor="contactPhone"
                      helperText="Primary headquarters phone number"
                    >
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                        }
                        placeholder="+1 (555) 000-0000"
                      />
                    </FormField>

                    <FormField
                      label="Country of Incorporation"
                      htmlFor="country"
                      helperText="Primary jurisdictional country"
                    >
                      <Select
                        id="country"
                        value={formData.country || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, country: e.target.value }))
                        }
                        options={[
                          { value: '', label: 'Select Country...' },
                          ...COUNTRY_OPTIONS,
                        ]}
                      />
                    </FormField>

                    <FormField
                      label="Primary Time Zone"
                      htmlFor="timeZone"
                      helperText="Default time zone for work shifts and attendance calculation"
                    >
                      <Select
                        id="timeZone"
                        value={formData.timeZone || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, timeZone: e.target.value }))
                        }
                        options={[
                          { value: '', label: 'Select Time Zone...' },
                          ...TIMEZONE_OPTIONS,
                        ]}
                      />
                    </FormField>
                  </Grid>

                  <Inline align="end" gap="sm">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                      leftIcon={<BezentIcon name="check" size={16} color="currentColor" />}
                    >
                      {saving ? 'Saving Changes...' : 'Save Profile'}
                    </Button>
                  </Inline>
                </Stack>
              </form>
            </Card>
          </Section>
        </Stack>
      )}
    </Page>
  );
}
