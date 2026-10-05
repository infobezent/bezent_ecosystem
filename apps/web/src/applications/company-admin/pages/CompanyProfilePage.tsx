import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import {
  Page,
  PageHeader,
  Section,
  Card,
  Grid,
  Stack,
  Inline,
  FormField,
  FormGrid,
  Input,
  Select,
  Button,
  Alert,
  LoadingState,
  Badge,
  Avatar,
  Label,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useCompanyAdmin } from '../context/CompanyAdminContext';
import { CompanyContextBar } from '../components/CompanyContextBar';
import {
  companyAdminApi,
  type CompanyProfile,
  type UpdateCompanyProfileInput,
} from '../api/companyAdminApi';

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: 'Private Limited', label: 'Private Limited' },
  { value: 'Public Limited', label: 'Public Limited' },
  { value: 'Limited Liability Partnership (LLP)', label: 'Limited Liability Partnership (LLP)' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Non-Profit / NGO', label: 'Non-Profit / NGO' },
  { value: 'Corporation', label: 'Corporation' },
  { value: 'Other', label: 'Other' },
];

export const INDUSTRY_OPTIONS = [
  { value: 'IT Services', label: 'IT Services' },
  { value: 'Software & Technology', label: 'Software & Technology' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Healthcare & Life Sciences', label: 'Healthcare & Life Sciences' },
  { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
  { value: 'Education & Training', label: 'Education & Training' },
  { value: 'Telecommunications', label: 'Telecommunications' },
  { value: 'Consulting & Professional Services', label: 'Consulting & Professional Services' },
  { value: 'Real Estate & Construction', label: 'Real Estate & Construction' },
  { value: 'Media & Entertainment', label: 'Media & Entertainment' },
  { value: 'Logistics & Transportation', label: 'Logistics & Transportation' },
  { value: 'Other', label: 'Other' },
];

export const COUNTRY_OPTIONS = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Japan', label: 'Japan' },
  { value: 'Other', label: 'Other' },
];

export const INDIAN_STATE_OPTIONS = [
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh' },
  { value: 'Arunachal Pradesh', label: 'Arunachal Pradesh' },
  { value: 'Assam', label: 'Assam' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Chhattisgarh', label: 'Chhattisgarh' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Gujarat', label: 'Gujarat' },
  { value: 'Haryana', label: 'Haryana' },
  { value: 'Himachal Pradesh', label: 'Himachal Pradesh' },
  { value: 'Jharkhand', label: 'Jharkhand' },
  { value: 'Karnataka', label: 'Karnataka' },
  { value: 'Kerala', label: 'Kerala' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Manipur', label: 'Manipur' },
  { value: 'Meghalaya', label: 'Meghalaya' },
  { value: 'Mizoram', label: 'Mizoram' },
  { value: 'Nagaland', label: 'Nagaland' },
  { value: 'Odisha', label: 'Odisha' },
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'Sikkim', label: 'Sikkim' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu' },
  { value: 'Telangana', label: 'Telangana' },
  { value: 'Tripura', label: 'Tripura' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'Uttarakhand', label: 'Uttarakhand' },
  { value: 'West Bengal', label: 'West Bengal' },
  { value: 'Andaman and Nicobar Islands', label: 'Andaman and Nicobar Islands' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  {
    value: 'Dadra and Nagar Haveli and Daman and Diu',
    label: 'Dadra and Nagar Haveli and Daman and Diu',
  },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Jammu & Kashmir', label: 'Jammu & Kashmir' },
  { value: 'Ladakh', label: 'Ladakh' },
  { value: 'Lakshadweep', label: 'Lakshadweep' },
  { value: 'Puducherry', label: 'Puducherry' },
];

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Chennai, Kolkata, Mumbai, New Delhi (UTC+05:30)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada) (UTC-05:00)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada) (UTC-06:00)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada) (UTC-07:00)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada) (UTC-08:00)' },
  { value: 'Europe/London', label: 'London, Edinburgh, Dublin (UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Berlin, Paris, Amsterdam (UTC+01:00)' },
  { value: 'Asia/Singapore', label: 'Singapore, Kuala Lumpur (UTC+08:00)' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne, Canberra (UTC+10:00)' },
  { value: 'Asia/Dubai', label: 'Dubai, Abu Dhabi (UTC+04:00)' },
  { value: 'Asia/Tokyo', label: 'Tokyo, Osaka (UTC+09:00)' },
];

export function CompanyProfilePage() {
  const { activeCompanyId, activeCompany } = useCompanyAdmin();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoNotice, setLogoNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<UpdateCompanyProfileInput>({
    displayName: '',
    legalName: '',
    organizationType: '',
    industry: '',
    website: '',
    logoUrl: null,
    businessEmail: '',
    contactPhone: '',
    alternateEmail: '',
    alternatePhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
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
        displayName: res.displayName || '',
        legalName: res.legalName || '',
        organizationType: res.organizationType || '',
        industry: res.industry || '',
        website: res.website || '',
        logoUrl: res.logoUrl || null,
        businessEmail: res.businessEmail || '',
        contactPhone: res.contactPhone || '',
        alternateEmail: res.alternateEmail || '',
        alternatePhone: res.alternatePhone || '',
        addressLine1: res.addressLine1 || '',
        addressLine2: res.addressLine2 || '',
        city: res.city || '',
        state: res.state || '',
        country: res.country || '',
        postalCode: res.postalCode || '',
        timeZone: res.timeZone || '',
      });
      setFieldErrors({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateField = (field: keyof UpdateCompanyProfileInput, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(null);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateCountry = (country: string) => {
    setFormData((prev) => {
      const isInd = country.toLowerCase() === 'india';
      return {
        ...prev,
        country,
        state:
          isInd && !INDIAN_STATE_OPTIONS.some((s) => s.value === prev.state)
            ? 'Tamil Nadu'
            : prev.state,
      };
    });
    setSuccess(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.country;
      delete next.state;
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\d+\-()\s.]{7,25}$/;
    const websiteRegex =
      /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;

    if (formData.businessEmail && !emailRegex.test(formData.businessEmail.trim())) {
      errors.businessEmail = 'Please enter a valid business email address';
    }

    if (formData.alternateEmail && !emailRegex.test(formData.alternateEmail.trim())) {
      errors.alternateEmail = 'Please enter a valid alternate email address';
    }

    if (formData.contactPhone && !phoneRegex.test(formData.contactPhone.trim())) {
      errors.contactPhone = 'Please enter a valid contact phone number';
    }

    if (formData.alternatePhone && !phoneRegex.test(formData.alternatePhone.trim())) {
      errors.alternatePhone = 'Please enter a valid alternate phone number';
    }

    if (
      formData.website &&
      formData.website.trim() &&
      !websiteRegex.test(formData.website.trim())
    ) {
      errors.website = 'Please enter a valid website URL (e.g. www.example.com)';
    }

    if (formData.postalCode && formData.postalCode.trim()) {
      const isInd = formData.country?.toLowerCase() === 'india';
      if (isInd && !/^\d{6}$/.test(formData.postalCode.trim())) {
        errors.postalCode = 'PIN code must be a 6-digit number';
      } else if (!/^[a-zA-Z0-9\s-]{2,20}$/.test(formData.postalCode.trim())) {
        errors.postalCode = 'Invalid postal code format';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId) return;

    if (!validateForm()) {
      setError('Please resolve the validation errors before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: UpdateCompanyProfileInput = {
        displayName: formData.displayName?.trim() || null,
        legalName: formData.legalName?.trim() || null,
        organizationType: formData.organizationType?.trim() || null,
        industry: formData.industry?.trim() || null,
        website: formData.website?.trim() || null,
        logoUrl: formData.logoUrl,
        businessEmail: formData.businessEmail?.trim() || null,
        contactPhone: formData.contactPhone?.trim() || null,
        alternateEmail: formData.alternateEmail?.trim() || null,
        alternatePhone: formData.alternatePhone?.trim() || null,
        addressLine1: formData.addressLine1?.trim() || null,
        addressLine2: formData.addressLine2?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        country: formData.country?.trim() || null,
        postalCode: formData.postalCode?.trim() || null,
        timeZone: formData.timeZone?.trim() || null,
      };

      const updated = await companyAdminApi.updateProfile(payload, activeCompanyId);
      setProfile(updated);
      setSuccess('Company profile updated successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChangeClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In compliance with platform architecture:
    // If backend storage capability is not configured, do NOT fake persistence.
    // Report upload capability status cleanly.
    setLogoNotice(
      'Binary logo file upload infrastructure is currently unconfigured. Enter a direct logo URL in the field below or configure storage.',
    );
  };

  const handleRemoveLogo = () => {
    updateField('logoUrl', null);
    setLogoNotice(null);
  };

  const isIndia = formData.country?.toLowerCase() === 'india';
  const orgInitial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'C';

  return (
    <Page>
      <PageHeader
        title="Company Profile"
        subtitle={`Canonical corporate identity, official contacts, branding, and localization for ${activeCompany?.name || 'Company'}`}
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
        <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {logoNotice && (
        <Alert
          variant="warning"
          title="Upload Storage Policy"
          dismissible
          onDismiss={() => setLogoNotice(null)}
        >
          {logoNotice}
        </Alert>
      )}

      {loading && !profile && <LoadingState label="Loading company profile..." />}

      {profile && (
        <form onSubmit={handleSubmit}>
          <Stack gap="lg">
            {/* Section A: Company Identity */}
            <Section
              title="Company Identity"
              subtitle="Corporate identity, formal entity naming, industry classification, and operating status"
            >
              <Card>
                <Stack gap="md">
                  <FormGrid columns={2} gap="md">
                    <FormField
                      label="Company Name"
                      htmlFor="companyName"
                      helperText="Platform-provisioned canonical entity name (Read-Only)"
                    >
                      <Input id="companyName" value={profile.name} disabled readOnly />
                    </FormField>

                    <FormField
                      label="Company Code"
                      htmlFor="companyCode"
                      helperText="System reference code (Read-Only)"
                    >
                      <Input id="companyCode" value={profile.code} disabled readOnly />
                    </FormField>

                    <FormField
                      label="Display Name"
                      htmlFor="displayName"
                      error={fieldErrors.displayName}
                      helperText="Public-facing or brand display name"
                    >
                      <Input
                        id="displayName"
                        value={formData.displayName || ''}
                        onChange={(e) => updateField('displayName', e.target.value)}
                        placeholder="e.g. Acme Tech"
                      />
                    </FormField>

                    <FormField
                      label="Legal Name"
                      htmlFor="legalName"
                      error={fieldErrors.legalName}
                      helperText="Registered legal or incorporated entity name"
                    >
                      <Input
                        id="legalName"
                        value={formData.legalName || ''}
                        onChange={(e) => updateField('legalName', e.target.value)}
                        placeholder="e.g. Acme Technologies Solutions LLC"
                      />
                    </FormField>

                    <FormField
                      label="Organization Type"
                      htmlFor="organizationType"
                      error={fieldErrors.organizationType}
                      helperText="Corporate structure"
                    >
                      <Select
                        id="organizationType"
                        value={formData.organizationType || ''}
                        onChange={(e) => updateField('organizationType', e.target.value)}
                        options={[
                          { value: '', label: 'Select Organization Type...' },
                          ...ORGANIZATION_TYPE_OPTIONS,
                        ]}
                      />
                    </FormField>

                    <FormField
                      label="Industry"
                      htmlFor="industry"
                      error={fieldErrors.industry}
                      helperText="Industry domain"
                    >
                      <Select
                        id="industry"
                        value={formData.industry || ''}
                        onChange={(e) => updateField('industry', e.target.value)}
                        options={[{ value: '', label: 'Select Industry...' }, ...INDUSTRY_OPTIONS]}
                      />
                    </FormField>

                    <FormField
                      label="Operating Status"
                      helperText="Entity lifecycle status (Platform-controlled)"
                    >
                      <Inline align="center" gap="sm">
                        <Badge variant={profile.status === 'active' ? 'success' : 'danger'}>
                          {profile.status.toUpperCase()}
                        </Badge>
                      </Inline>
                    </FormField>
                  </FormGrid>
                </Stack>
              </Card>
            </Section>

            {/* Section B: Contact Information */}
            <Section
              title="Contact Information"
              subtitle="Official administrative correspondence and communication channels"
            >
              <Card>
                <FormGrid columns={2} gap="md">
                  <FormField
                    label="Business Email"
                    htmlFor="businessEmail"
                    error={fieldErrors.businessEmail}
                    helperText="Primary corporate email for official notices"
                  >
                    <Input
                      id="businessEmail"
                      type="email"
                      leftIcon={<BezentIcon name="mail" size={16} />}
                      value={formData.businessEmail || ''}
                      onChange={(e) => updateField('businessEmail', e.target.value)}
                      placeholder="admin@company.com"
                    />
                  </FormField>

                  <FormField
                    label="Contact Phone"
                    htmlFor="contactPhone"
                    error={fieldErrors.contactPhone}
                    helperText="Headquarters telephone number"
                  >
                    <Input
                      id="contactPhone"
                      leftIcon={<BezentIcon name="phone" size={16} />}
                      value={formData.contactPhone || ''}
                      onChange={(e) => updateField('contactPhone', e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </FormField>

                  <FormField
                    label="Alternate Email"
                    htmlFor="alternateEmail"
                    error={fieldErrors.alternateEmail}
                    helperText="Secondary administrative correspondence email"
                  >
                    <Input
                      id="alternateEmail"
                      type="email"
                      leftIcon={<BezentIcon name="mail" size={16} />}
                      value={formData.alternateEmail || ''}
                      onChange={(e) => updateField('alternateEmail', e.target.value)}
                      placeholder="support@company.com"
                    />
                  </FormField>

                  <FormField
                    label="Alternate Phone"
                    htmlFor="alternatePhone"
                    error={fieldErrors.alternatePhone}
                    helperText="Secondary contact phone"
                  >
                    <Input
                      id="alternatePhone"
                      leftIcon={<BezentIcon name="phone" size={16} />}
                      value={formData.alternatePhone || ''}
                      onChange={(e) => updateField('alternatePhone', e.target.value)}
                      placeholder="+1 (555) 000-0001"
                    />
                  </FormField>

                  <FormField
                    label="Website"
                    htmlFor="website"
                    error={fieldErrors.website}
                    helperText="Corporate website address"
                  >
                    <Input
                      id="website"
                      value={formData.website || ''}
                      onChange={(e) => updateField('website', e.target.value)}
                      placeholder="www.company.com"
                    />
                  </FormField>
                </FormGrid>
              </Card>
            </Section>

            {/* Section C: Branding */}
            <Section
              title="Branding"
              subtitle="Company logo and brand identification displayed across the ecosystem"
            >
              <Card>
                <Grid columns={2} gap="lg">
                  <Stack gap="sm">
                    <Label>Company Logo</Label>
                    <Inline gap="md" align="center">
                      <Avatar
                        initials={orgInitial}
                        shape="square"
                        size="xl"
                        src={formData.logoUrl || undefined}
                        alt="Company Logo"
                      />
                      <Stack gap="xs">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<BezentIcon name="upload" size={14} />}
                          onClick={handleLogoChangeClick}
                          type="button"
                        >
                          Upload Logo
                        </Button>
                        <input
                          ref={fileInputRef}
                          id="company-logo-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={handleFileInputChange}
                          hidden
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<BezentIcon name="delete" size={14} />}
                          onClick={handleRemoveLogo}
                          disabled={!formData.logoUrl}
                          type="button"
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Inline>
                    <span className="bezent-form-field__helper">
                      Supported formats: PNG, JPG, or SVG (max 2 MB).
                    </span>
                  </Stack>

                  <FormField
                    label="Direct Logo URL"
                    htmlFor="logoUrl"
                    helperText="Direct image URL for company logo"
                  >
                    <Input
                      id="logoUrl"
                      value={formData.logoUrl || ''}
                      onChange={(e) => updateField('logoUrl', e.target.value || null)}
                      placeholder="https://cdn.example.com/logo.png"
                    />
                  </FormField>
                </Grid>
              </Card>
            </Section>

            {/* Section D: Registered Address */}
            <Section
              title="Registered Address"
              subtitle="Corporate legal domicile and registered address (separate from operational Work Locations)"
            >
              <Card>
                <FormGrid columns={2} gap="md">
                  <FormField
                    label="Address Line 1"
                    htmlFor="addressLine1"
                    error={fieldErrors.addressLine1}
                    helperText="Street address or P.O. Box"
                  >
                    <Input
                      id="addressLine1"
                      leftIcon={<BezentIcon name="pin" size={16} />}
                      value={formData.addressLine1 || ''}
                      onChange={(e) => updateField('addressLine1', e.target.value)}
                      placeholder="e.g. 100 Main Street, Suite 400"
                    />
                  </FormField>

                  <FormField
                    label="Address Line 2"
                    htmlFor="addressLine2"
                    error={fieldErrors.addressLine2}
                    helperText="Apartment, suite, unit, building, floor, etc."
                  >
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2 || ''}
                      onChange={(e) => updateField('addressLine2', e.target.value)}
                      placeholder="Floor 4"
                    />
                  </FormField>

                  <FormField
                    label="Country"
                    htmlFor="country"
                    error={fieldErrors.country}
                    helperText="Country of legal domicile"
                  >
                    <Select
                      id="country"
                      value={formData.country || ''}
                      onChange={(e) => updateCountry(e.target.value)}
                      options={[{ value: '', label: 'Select Country...' }, ...COUNTRY_OPTIONS]}
                    />
                  </FormField>

                  <FormField
                    label="State / Province"
                    htmlFor="state"
                    error={fieldErrors.state}
                    helperText="State, province, or region"
                  >
                    {isIndia ? (
                      <Select
                        id="state"
                        value={formData.state || ''}
                        onChange={(e) => updateField('state', e.target.value)}
                        options={[{ value: '', label: 'Select State...' }, ...INDIAN_STATE_OPTIONS]}
                      />
                    ) : (
                      <Input
                        id="state"
                        value={formData.state || ''}
                        onChange={(e) => updateField('state', e.target.value)}
                        placeholder="State / Province"
                      />
                    )}
                  </FormField>

                  <FormField
                    label="City"
                    htmlFor="city"
                    error={fieldErrors.city}
                    helperText="City or municipality"
                  >
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="City"
                    />
                  </FormField>

                  <FormField
                    label="Postal Code"
                    htmlFor="postalCode"
                    error={fieldErrors.postalCode}
                    helperText="ZIP or postal code"
                  >
                    <Input
                      id="postalCode"
                      value={formData.postalCode || ''}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                      placeholder="Postal code"
                    />
                  </FormField>
                </FormGrid>
              </Card>
            </Section>

            {/* Section E: Regional Settings */}
            <Section
              title="Regional Settings"
              subtitle="Company-wide regional and time zone preferences"
            >
              <Card>
                <Grid columns={2} gap="md">
                  <FormField
                    label="Primary Time Zone"
                    htmlFor="timeZone"
                    helperText="Default time zone for business schedules and logs"
                  >
                    <Select
                      id="timeZone"
                      value={formData.timeZone || ''}
                      onChange={(e) => updateField('timeZone', e.target.value)}
                      options={[{ value: '', label: 'Select Time Zone...' }, ...TIMEZONE_OPTIONS]}
                    />
                  </FormField>
                </Grid>
              </Card>
            </Section>

            {/* Section F: System Information */}
            <Section
              title="System Information"
              subtitle="Administrative metadata and customer isolation identifiers"
            >
              <Card>
                <Grid columns={3} gap="md">
                  <FormField label="Tenant ID" helperText="Customer organization boundary">
                    <Input value={profile.tenantId} disabled readOnly />
                  </FormField>
                  <FormField label="Company ID" helperText="Legal company entity identifier">
                    <Input value={profile.id} disabled readOnly />
                  </FormField>
                  <FormField label="Created Date" helperText="Entity provision timestamp">
                    <Input
                      value={new Date(profile.createdAt).toLocaleDateString()}
                      disabled
                      readOnly
                    />
                  </FormField>
                </Grid>
              </Card>
            </Section>

            {/* Action Bar */}
            <Inline align="end" gap="sm">
              <Button type="button" variant="secondary" onClick={fetchProfile} disabled={saving}>
                Reset
              </Button>
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
      )}
    </Page>
  );
}

export default CompanyProfilePage;
