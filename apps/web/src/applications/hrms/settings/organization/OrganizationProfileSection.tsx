import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  FormGrid,
  Grid,
  Inline,
  Input,
  Label,
  LoadingState,
  Page,
  PageHeader,
  Select,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useAuth, useAuthorization } from '../../../../platform/auth';
import {
  fetchOrganizationProfile,
  updateOrganizationProfile,
  type OrganizationProfile,
  type UpdateOrganizationProfilePayload,
} from '../../organization/api/organizationApi';

export interface OrganizationProfileFormValues {
  name: string;
  displayName: string;
  organizationType: string;
  industry: string;
  website: string;
  logoUrl: string | null;
  primaryEmail: string;
  phoneNumber: string;
  alternateEmail: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
}

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
  { value: 'India', label: '🇮🇳 India' },
  { value: 'United States', label: '🇺🇸 United States' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  { value: 'United Arab Emirates', label: '🇦🇪 United Arab Emirates' },
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'Japan', label: '🇯🇵 Japan' },
  { value: 'Other', label: '🌐 Other' },
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
  { value: 'Dadra and Nagar Haveli and Daman and Diu', label: 'Dadra and Nagar Haveli and Daman and Diu' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Jammu & Kashmir', label: 'Jammu & Kashmir' },
  { value: 'Ladakh', label: 'Ladakh' },
  { value: 'Lakshadweep', label: 'Lakshadweep' },
  { value: 'Puducherry', label: 'Puducherry' },
];

export function validateOrganizationProfile(form: OrganizationProfileFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) {
    errors.name = 'Organization name is required';
  } else if (form.name.trim().length > 255) {
    errors.name = 'Organization name must not exceed 255 characters';
  }

  if (form.displayName && form.displayName.trim().length > 255) {
    errors.displayName = 'Display name must not exceed 255 characters';
  }

  if (!form.organizationType.trim()) {
    errors.organizationType = 'Organization type is required';
  }

  if (form.website && form.website.trim()) {
    const websiteRegex = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
    if (!websiteRegex.test(form.website.trim())) {
      errors.website = 'Please enter a valid website URL (e.g. www.apj3d.com)';
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.primaryEmail.trim()) {
    errors.primaryEmail = 'Primary email is required';
  } else if (!emailRegex.test(form.primaryEmail.trim())) {
    errors.primaryEmail = 'Please enter a valid primary email address';
  }

  const phoneRegex = /^[\d+\-()\s.]{7,25}$/;
  if (form.phoneNumber && form.phoneNumber.trim()) {
    if (!phoneRegex.test(form.phoneNumber.trim())) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }
  }

  if (form.alternateEmail && form.alternateEmail.trim()) {
    if (!emailRegex.test(form.alternateEmail.trim())) {
      errors.alternateEmail = 'Please enter a valid alternate email address';
    }
  }

  if (form.alternatePhone && form.alternatePhone.trim()) {
    if (!phoneRegex.test(form.alternatePhone.trim())) {
      errors.alternatePhone = 'Please enter a valid alternate phone number';
    }
  }

  if (!form.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required';
  }

  if (!form.country.trim()) {
    errors.country = 'Country is required';
  }

  if (!form.state.trim()) {
    errors.state = 'State / Province is required';
  }

  if (!form.city.trim()) {
    errors.city = 'City is required';
  }

  if (!form.postalCode.trim()) {
    errors.postalCode = 'Postal code is required';
  } else {
    const isIndia = form.country.trim().toLowerCase() === 'india';
    if (isIndia && !/^\d{6}$/.test(form.postalCode.trim())) {
      errors.postalCode = 'PIN code must be a 6-digit number';
    } else if (!/^[a-zA-Z0-9\s-]{2,20}$/.test(form.postalCode.trim())) {
      errors.postalCode = 'Invalid postal code format';
    }
  }

  return errors;
}

export function profileRecordToForm(profile: OrganizationProfile): OrganizationProfileFormValues {
  return {
    name: profile.name ?? '',
    displayName: profile.displayName ?? '',
    organizationType: profile.organizationType ?? 'Private Limited',
    industry: profile.industry ?? 'IT Services',
    website: profile.website ?? '',
    logoUrl: profile.logoUrl ?? null,
    primaryEmail: profile.primaryEmail ?? '',
    phoneNumber: profile.phoneNumber ?? '',
    alternateEmail: profile.alternateEmail ?? '',
    alternatePhone: profile.alternatePhone ?? '',
    addressLine1: profile.addressLine1 ?? '',
    addressLine2: profile.addressLine2 ?? '',
    country: profile.country ?? 'India',
    state: profile.state ?? 'Tamil Nadu',
    city: profile.city ?? '',
    postalCode: profile.postalCode ?? '',
  };
}

export const PROFILE_FIELD_ORDER: (keyof OrganizationProfileFormValues)[] = [
  'name',
  'displayName',
  'organizationType',
  'industry',
  'website',
  'primaryEmail',
  'phoneNumber',
  'alternateEmail',
  'alternatePhone',
  'addressLine1',
  'addressLine2',
  'country',
  'state',
  'city',
  'postalCode',
];

export const PROFILE_FIELD_ELEMENT_IDS: Record<keyof OrganizationProfileFormValues, string> = {
  name: 'org-name',
  displayName: 'org-display-name',
  organizationType: 'org-type',
  industry: 'org-industry',
  website: 'org-website',
  logoUrl: 'org-logo-upload',
  primaryEmail: 'org-primary-email',
  phoneNumber: 'org-phone-number',
  alternateEmail: 'org-alternate-email',
  alternatePhone: 'org-alternate-phone',
  addressLine1: 'org-address-line-1',
  addressLine2: 'org-address-line-2',
  country: 'org-country',
  state: 'org-state',
  city: 'org-city',
  postalCode: 'org-postal-code',
};

const DEFAULT_FORM: OrganizationProfileFormValues = {
  name: '',
  displayName: '',
  organizationType: 'Private Limited',
  industry: 'IT Services',
  website: '',
  logoUrl: null,
  primaryEmail: '',
  phoneNumber: '',
  alternateEmail: '',
  alternatePhone: '',
  addressLine1: '',
  addressLine2: '',
  country: 'India',
  state: 'Tamil Nadu',
  city: '',
  postalCode: '',
};

export interface OrganizationProfileSectionProps {
  onBack?: () => void;
  initialProfile?: OrganizationProfile;
  onSaveSuccess?: (updated: OrganizationProfile) => void;
}

export function OrganizationProfileSection({
  onBack,
  initialProfile,
  onSaveSuccess,
}: OrganizationProfileSectionProps) {
  const { activeCompany } = useAuth();
  const { canAny, isCompanyAdmin } = useAuthorization();

  const canView =
    canAny([
      'hrms.organization.view',
      'hrms.organization.read',
      'hrms.settings.view',
      'hrms.settings.read',
      'company.profile.view',
      'company.profile.read',
    ]) || isCompanyAdmin;

  const canEdit =
    canAny([
      'hrms.organization.manage',
      'hrms.settings.manage',
      'company.profile.edit',
      'company.profile.update',
    ]) || isCompanyAdmin;

  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [logoBlockedNotice, setLogoBlockedNotice] = useState<string | null>(null);

  const [form, setForm] = useState<OrganizationProfileFormValues>(
    initialProfile ? profileRecordToForm(initialProfile) : DEFAULT_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const lastPersisted = useRef<OrganizationProfileFormValues>(
    initialProfile ? profileRecordToForm(initialProfile) : DEFAULT_FORM,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorNotice(null);
      const data = await fetchOrganizationProfile();
      const mapped = profileRecordToForm(data);
      setForm(mapped);
      lastPersisted.current = mapped;
      setIsDirty(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load organization profile';
      setErrorNotice(message);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    if (!initialProfile) {
      loadProfile();
    }
  }, [activeCompany?.companyId, initialProfile, loadProfile]);

  const updateField = (field: keyof OrganizationProfileFormValues, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSuccessNotice(null);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateCountry = (country: string) => {
    setForm((prev) => {
      const isInd = country.toLowerCase() === 'india';
      return {
        ...prev,
        country,
        state: isInd && !INDIAN_STATE_OPTIONS.some((s) => s.value === prev.state) ? 'Tamil Nadu' : prev.state,
      };
    });
    setIsDirty(true);
    setSuccessNotice(null);
    setFieldErrors((prev) => {
      if (!prev.country && !prev.state) return prev;
      const next = { ...prev };
      delete next.country;
      delete next.state;
      return next;
    });
  };

  const handleCancel = () => {
    setForm(lastPersisted.current);
    setFieldErrors({});
    setIsDirty(false);
    setErrorNotice(null);
    setSuccessNotice(null);
    setLogoBlockedNotice(null);
  };

  const handleSave = async () => {
    if (!canEdit) return;

    const errors = validateOrganizationProfile(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorNotice('Please resolve the validation errors before saving.');

      // Identify the FIRST invalid field in visual page order, scroll into view, and focus
      const firstInvalidField = PROFILE_FIELD_ORDER.find((f) => errors[f]);
      if (firstInvalidField) {
        const elementId = PROFILE_FIELD_ELEMENT_IDS[firstInvalidField];
        setTimeout(() => {
          const el = document.getElementById(elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus({ preventScroll: true });
          }
        }, 0);
      }
      return;
    }

    try {
      setSaving(true);
      setErrorNotice(null);
      setFieldErrors({});

      const payload: UpdateOrganizationProfilePayload = {
        name: form.name.trim(),
        displayName: form.displayName.trim() || null,
        organizationType: form.organizationType.trim(),
        industry: form.industry.trim() || null,
        website: form.website.trim() || null,
        logoUrl: form.logoUrl,
        primaryEmail: form.primaryEmail.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        alternateEmail: form.alternateEmail.trim() || null,
        alternatePhone: form.alternatePhone.trim() || null,
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || null,
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
      };

      const updated = await updateOrganizationProfile(payload);
      const mapped = profileRecordToForm(updated);
      setForm(mapped);
      lastPersisted.current = mapped;
      setIsDirty(false);
      setFieldErrors({});
      setErrorNotice(null);
      setSuccessNotice('Organization profile changes saved successfully.');
      onSaveSuccess?.(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update organization profile';
      setErrorNotice(message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChangeClick = () => {
    if (!canEdit) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In compliance with platform architecture:
    // If backend storage capability is not configured, do NOT fake persistence.
    // Report upload capability as blocked.
    setLogoBlockedNotice(
      'Binary logo storage service is currently unconfigured in this environment. File upload persistence is reported as blocked per AGENTS.md policy.',
    );
  };

  const handleRemoveLogo = () => {
    if (!canEdit) return;
    updateField('logoUrl', null);
    setLogoBlockedNotice(null);
  };

  if (!canView) {
    return (
      <Page maxWidth="default">
        <PageHeader
          title="Organization Profile"
          subtitle="Manage your organization's primary information and contact details."
          breadcrumbs={
            <Inline gap="xs" align="center">
              {onBack && (
                <Button variant="text" size="sm" onClick={onBack}>
                  Settings
                </Button>
              )}
              {!onBack && <span>Settings</span>}
              <BezentIcon name="chevronRight" size={14} color="var(--text-muted)" />
              <span>Organization</span>
              <BezentIcon name="chevronRight" size={14} color="var(--text-muted)" />
              <strong>Organization Profile</strong>
            </Inline>
          }
        />
        <Alert variant="danger" title="Access Denied">
          You do not have permission to view or manage organization settings for this company.
        </Alert>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page maxWidth="default">
        <LoadingState label="Loading organization profile…" fill />
      </Page>
    );
  }

  const isIndia = form.country.toLowerCase() === 'india';
  const orgInitial = form.name ? form.name.charAt(0).toUpperCase() : 'B';

  return (
    <Page maxWidth="default">
      <Stack gap="lg">
        {/* Page Header */}
        <PageHeader
          title="Organization Profile"
          subtitle="Manage your organization's primary information and contact details."
          breadcrumbs={
            <Inline gap="xs" align="center">
              {onBack && (
                <Button variant="text" size="sm" onClick={onBack}>
                  Settings
                </Button>
              )}
              {!onBack && <span>Settings</span>}
              <BezentIcon name="chevronRight" size={14} color="var(--text-muted)" />
              <span>Organization</span>
              <BezentIcon name="chevronRight" size={14} color="var(--text-muted)" />
              <strong>Organization Profile</strong>
            </Inline>
          }
          actions={
            <Inline gap="sm">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={!isDirty || saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!canEdit || saving || !isDirty}
              >
                Save Changes
              </Button>
            </Inline>
          }
        />

        {/* Status Notices */}
        {!canEdit && (
          <Alert variant="info" title="Read-Only Mode">
            You have view-only access to organization profile settings. Contact your Company Administrator to modify organization details.
          </Alert>
        )}

        {successNotice && (
          <Alert variant="success" title="Success" dismissible onDismiss={() => setSuccessNotice(null)}>
            {successNotice}
          </Alert>
        )}

        {errorNotice && (
          <Alert variant="danger" title="Notice" dismissible onDismiss={() => setErrorNotice(null)}>
            {errorNotice}
          </Alert>
        )}

        {logoBlockedNotice && (
          <Alert variant="warning" title="Upload Storage Policy" dismissible onDismiss={() => setLogoBlockedNotice(null)}>
            {logoBlockedNotice}
          </Alert>
        )}

        {/* Section 1: Basic Information */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide your organization&apos;s basic details.</CardDescription>
          </CardHeader>
          <CardBody>
            <Grid columns={2} gap="lg">
              {/* Left Column: Organization Logo */}
              <Stack gap="sm">
                <Label>Organization Logo</Label>
                <Inline gap="md" align="center">
                  <Avatar
                    initials={orgInitial}
                    shape="square"
                    size="xl"
                    src={form.logoUrl || undefined}
                    alt="Organization Logo"
                  />
                  <Stack gap="xs">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<BezentIcon name="upload" size={14} />}
                      onClick={handleLogoChangeClick}
                      disabled={!canEdit}
                    >
                      Change Logo
                    </Button>
                    <input
                      ref={fileInputRef}
                      id="org-logo-upload"
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
                      disabled={!canEdit || !form.logoUrl}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Inline>
                <span className="bezent-form-field__helper">
                  Recommended size: 200 x 200 px. PNG, JPG or SVG. Max 2 MB.
                </span>
              </Stack>

              {/* Right Column: Organization Details */}
              <Stack gap="md">
                <FormField
                  label="Organization Name"
                  required
                  error={fieldErrors.name}
                  htmlFor="org-name"
                >
                  <Input
                    id="org-name"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. APJ3D Design Solution Pvt Ltd"
                  />
                </FormField>

                <FormGrid columns={2} gap="md">
                  <FormField
                    label="Display Name"
                    error={fieldErrors.displayName}
                    htmlFor="org-display-name"
                  >
                    <Input
                      id="org-display-name"
                      value={form.displayName}
                      onChange={(e) => updateField('displayName', e.target.value)}
                      disabled={!canEdit}
                      placeholder="e.g. APJ3D"
                    />
                  </FormField>

                  <FormField
                    label="Organization Type"
                    required
                    error={fieldErrors.organizationType}
                    htmlFor="org-type"
                  >
                    <Select
                      id="org-type"
                      value={form.organizationType}
                      onChange={(e) => updateField('organizationType', e.target.value)}
                      disabled={!canEdit}
                      options={ORGANIZATION_TYPE_OPTIONS}
                    />
                  </FormField>

                  <FormField
                    label="Industry"
                    error={fieldErrors.industry}
                    htmlFor="org-industry"
                  >
                    <Select
                      id="org-industry"
                      value={form.industry}
                      onChange={(e) => updateField('industry', e.target.value)}
                      disabled={!canEdit}
                      options={INDUSTRY_OPTIONS}
                    />
                  </FormField>

                  <FormField
                    label="Website"
                    error={fieldErrors.website}
                    htmlFor="org-website"
                  >
                    <Input
                      id="org-website"
                      value={form.website}
                      onChange={(e) => updateField('website', e.target.value)}
                      disabled={!canEdit}
                      placeholder="www.apj3d.com"
                    />
                  </FormField>
                </FormGrid>
              </Stack>
            </Grid>
          </CardBody>
        </Card>

        {/* Section 2: Official Contact */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Official Contact</CardTitle>
            <CardDescription>Primary contact information for your organization.</CardDescription>
          </CardHeader>
          <CardBody>
            <FormGrid columns={2} gap="md">
              <FormField
                label="Primary Email"
                required
                error={fieldErrors.primaryEmail}
                htmlFor="org-primary-email"
              >
                <Input
                  id="org-primary-email"
                  leftIcon={<BezentIcon name="mail" size={16} />}
                  value={form.primaryEmail}
                  onChange={(e) => updateField('primaryEmail', e.target.value)}
                  disabled={!canEdit}
                  placeholder="hr@apj3d.com"
                />
              </FormField>

              <FormField
                label="Phone Number"
                error={fieldErrors.phoneNumber}
                htmlFor="org-phone-number"
              >
                <Input
                  id="org-phone-number"
                  leftIcon={<BezentIcon name="phone" size={16} />}
                  value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  disabled={!canEdit}
                  placeholder="+91 98765 43210"
                />
              </FormField>

              <FormField
                label="Alternate Email"
                error={fieldErrors.alternateEmail}
                htmlFor="org-alternate-email"
              >
                <Input
                  id="org-alternate-email"
                  leftIcon={<BezentIcon name="mail" size={16} />}
                  value={form.alternateEmail}
                  onChange={(e) => updateField('alternateEmail', e.target.value)}
                  disabled={!canEdit}
                  placeholder="admin@apj3d.com"
                />
              </FormField>

              <FormField
                label="Alternate Phone"
                error={fieldErrors.alternatePhone}
                htmlFor="org-alternate-phone"
              >
                <Input
                  id="org-alternate-phone"
                  leftIcon={<BezentIcon name="phone" size={16} />}
                  value={form.alternatePhone}
                  onChange={(e) => updateField('alternatePhone', e.target.value)}
                  disabled={!canEdit}
                  placeholder="+91 87654 32109"
                />
              </FormField>
            </FormGrid>
          </CardBody>
        </Card>

        {/* Section 3: Registered Address */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Registered Address</CardTitle>
            <CardDescription>Your organization&apos;s official registered address.</CardDescription>
          </CardHeader>
          <CardBody>
            <FormGrid columns={2} gap="md">
              <FormField
                label="Address Line 1"
                required
                error={fieldErrors.addressLine1}
                htmlFor="org-address-line-1"
              >
                <Input
                  id="org-address-line-1"
                  leftIcon={<BezentIcon name="pin" size={16} />}
                  value={form.addressLine1}
                  onChange={(e) => updateField('addressLine1', e.target.value)}
                  disabled={!canEdit}
                  placeholder="No. 123, Industrial Estate, SIPCOT Phase II"
                />
              </FormField>

              <FormField
                label="Address Line 2"
                error={fieldErrors.addressLine2}
                htmlFor="org-address-line-2"
              >
                <Input
                  id="org-address-line-2"
                  value={form.addressLine2}
                  onChange={(e) => updateField('addressLine2', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Hosur"
                />
              </FormField>

              <FormField
                label="Country"
                required
                error={fieldErrors.country}
                htmlFor="org-country"
              >
                <Select
                  id="org-country"
                  value={form.country}
                  onChange={(e) => updateCountry(e.target.value)}
                  disabled={!canEdit}
                  options={COUNTRY_OPTIONS}
                />
              </FormField>

              <FormField
                label="State / Province"
                required
                error={fieldErrors.state}
                htmlFor="org-state"
              >
                {isIndia ? (
                  <Select
                    id="org-state"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    disabled={!canEdit}
                    options={INDIAN_STATE_OPTIONS}
                  />
                ) : (
                  <Input
                    id="org-state"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    disabled={!canEdit}
                    placeholder="State / Province"
                  />
                )}
              </FormField>

              <FormField
                label="City"
                required
                error={fieldErrors.city}
                htmlFor="org-city"
              >
                <Input
                  id="org-city"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  disabled={!canEdit}
                  placeholder="Hosur"
                />
              </FormField>

              <FormField
                label="Postal Code"
                required
                error={fieldErrors.postalCode}
                htmlFor="org-postal-code"
              >
                <Input
                  id="org-postal-code"
                  value={form.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  disabled={!canEdit}
                  placeholder="635126"
                />
              </FormField>
            </FormGrid>
          </CardBody>
        </Card>
      </Stack>
    </Page>
  );
}

export default OrganizationProfileSection;
