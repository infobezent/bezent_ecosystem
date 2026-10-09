import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  Modal,
  Stack,
  Button,
  Input,
  Select,
  Badge,
  Alert,
  Inline,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { TenantAdminTenantSummary, TenantAdminCapacitySummary } from '../types/tenantAdmin.types';

export interface ProfileGeneralData {
  name: string;
  industry: string;
  country: string;
  state: string;
  city: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string | null;
  bannerUrl: string | null;
}

export interface EditTenantProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantAdminTenantSummary | null;
  capacity?: TenantAdminCapacitySummary | null;
  initialData: ProfileGeneralData;
  onSaveSuccess?: (updated: ProfileGeneralData) => void;
}

const INDUSTRY_OPTIONS = [
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Retail & E-commerce', label: 'Retail & E-commerce' },
  { value: 'Education', label: 'Education' },
  { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain' },
  { value: 'Consulting & Professional Services', label: 'Consulting & Professional Services' },
  { value: 'Other', label: 'Other' },
];

const COUNTRY_OPTIONS = [
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
  { value: 'United Kingdom', label: 'United Kingdom' },
  { value: 'Singapore', label: 'Singapore' },
  { value: 'Australia', label: 'Australia' },
  { value: 'Germany', label: 'Germany' },
  { value: 'Canada', label: 'Canada' },
  { value: 'United Arab Emirates', label: 'United Arab Emirates' },
  { value: 'Other', label: 'Other' },
];

function formatDate(val?: string | null): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(val);
  }
}

export function EditTenantProfileDrawer({
  isOpen,
  onClose,
  tenant,
  capacity,
  initialData,
  onSaveSuccess,
}: EditTenantProfileDrawerProps) {
  const [formData, setFormData] = useState<ProfileGeneralData>(initialData);
  const [initialSnapshot, setInitialSnapshot] = useState<ProfileGeneralData>(initialData);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isBannerRemoved, setIsBannerRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setInitialSnapshot(initialData);
      setSelectedLogoFile(null);
      setIsLogoRemoved(false);
      setSelectedBannerFile(null);
      setIsBannerRemoved(false);
      setErrorMessage(null);
      setLogoError(null);
      setBannerError(null);
      setEmailError(null);
      setNameError(null);
    }
  }, [isOpen, initialData]);

  // Check dirty state
  const isDirty =
    formData.name !== initialSnapshot.name ||
    formData.industry !== initialSnapshot.industry ||
    formData.country !== initialSnapshot.country ||
    formData.state !== initialSnapshot.state ||
    formData.city !== initialSnapshot.city ||
    formData.contactName !== initialSnapshot.contactName ||
    formData.contactEmail !== initialSnapshot.contactEmail ||
    formData.contactPhone !== initialSnapshot.contactPhone ||
    selectedLogoFile !== null ||
    isLogoRemoved ||
    selectedBannerFile !== null ||
    isBannerRemoved;

  const handleFieldChange = (field: keyof ProfileGeneralData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && nameError) setNameError(null);
    if (field === 'contactEmail' && emailError) setEmailError(null);
  };

  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: PNG, JPG, WebP
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Logo must be a PNG, JPG, or WebP image.');
      return;
    }

    // Validate size: max 1MB
    if (file.size > 1024 * 1024) {
      setLogoError('Logo file size exceeds the 1MB limit.');
      return;
    }

    setSelectedLogoFile(file);
    setIsLogoRemoved(false);
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, logoUrl: previewUrl }));
  };

  const handleBannerFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBannerError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: PNG, JPG, WebP
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setBannerError('Cover image must be a PNG, JPG, or WebP image.');
      return;
    }

    // Validate size: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      setBannerError('Cover file size exceeds the 2MB limit.');
      return;
    }

    setSelectedBannerFile(file);
    setIsBannerRemoved(false);
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, bannerUrl: previewUrl }));
  };

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null);
    setIsLogoRemoved(true);
    setFormData((prev) => ({ ...prev, logoUrl: null }));
    setLogoError(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleRemoveBanner = () => {
    setSelectedBannerFile(null);
    setIsBannerRemoved(true);
    setFormData((prev) => ({ ...prev, bannerUrl: null }));
    setBannerError(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'You have unsaved profile changes. Are you sure you want to discard them?',
      );
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleSave = async () => {
    setErrorMessage(null);
    let hasValidationError = false;

    if (!formData.name.trim()) {
      setNameError('Tenant Name is required.');
      hasValidationError = true;
    }

    if (!formData.contactEmail.trim()) {
      setEmailError('Contact Email is required.');
      hasValidationError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      setEmailError('Please enter a valid email address.');
      hasValidationError = true;
    }

    if (hasValidationError) return;

    setIsSubmitting(true);
    try {
      // 1. Attempt backend text update
      await tenantAdminApi.updateTenantDetails({
        name: formData.name.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || null,
      });

      const updatedFormData = { ...formData };
      const warnings: string[] = [];

      // 2. Logo upload or remove
      if (selectedLogoFile) {
        try {
          const logoResult = await tenantAdminApi.uploadTenantLogo(selectedLogoFile);
          updatedFormData.logoUrl = logoResult.url;
        } catch (logoErr: unknown) {
          const errMsg = logoErr instanceof Error ? logoErr.message : 'Logo upload failed';
          warnings.push(`Logo could not be saved: ${errMsg}`);
        }
      } else if (isLogoRemoved) {
        try {
          await tenantAdminApi.removeTenantLogo();
          updatedFormData.logoUrl = null;
        } catch (removeErr: unknown) {
          const errMsg = removeErr instanceof Error ? removeErr.message : 'Logo removal failed';
          warnings.push(`Logo could not be removed: ${errMsg}`);
        }
      }

      // 3. Banner upload or remove
      if (selectedBannerFile) {
        try {
          const bannerResult = await tenantAdminApi.uploadTenantBanner(selectedBannerFile);
          updatedFormData.bannerUrl = bannerResult.url;
        } catch (bannerErr: unknown) {
          const errMsg = bannerErr instanceof Error ? bannerErr.message : 'Cover upload failed';
          warnings.push(`Cover could not be saved: ${errMsg}`);
        }
      } else if (isBannerRemoved) {
        try {
          await tenantAdminApi.removeTenantBanner();
          updatedFormData.bannerUrl = null;
        } catch (removeBannerErr: unknown) {
          const errMsg = removeBannerErr instanceof Error ? removeBannerErr.message : 'Cover removal failed';
          warnings.push(`Cover could not be removed: ${errMsg}`);
        }
      }

      if (warnings.length > 0) {
        setErrorMessage(warnings.join(' | '));
        if (onSaveSuccess) {
          onSaveSuccess(updatedFormData);
        }
        return;
      }

      if (onSaveSuccess) {
        onSaveSuccess(updatedFormData);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to save profile changes. Please try again.';
      setErrorMessage(msg);
      // DO NOT close drawer on failed save
    } finally {
      setIsSubmitting(false);
    }
  };

  // Platform managed read-only values
  const tenantCode = tenant?.code || 'ACME-IN-01';
  const tenantId = tenant?.id || 'TEN-ACME-001';
  const tenantStatus = tenant?.status || 'active';
  const capacityMax = capacity?.max ?? 5;
  const capacityUsed = capacity?.used ?? 3;
  const createdAtFormatted = tenant?.createdAt ? formatDate(tenant.createdAt) : '18 Sep 2026';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="drawer"
      title="Edit Tenant Profile"
      description="Update your tenant information and branding."
      footer={
        <Inline justify="between" align="center">
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Inline>
      }
    >
      <Stack gap="lg">
        {errorMessage && (
          <Alert variant="error" onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* 1. BRANDING */}
        <section className="bezent-drawer-section" aria-label="Branding">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="settings" size={16} />
            </span>
            <span>Branding</span>
          </div>

          {/* Tenant Logo */}
          <div className="bezent-branding-group">
            <label className="bezent-branding-group__label">Tenant Logo</label>
            <div className="bezent-logo-preview-row">
              <div className="bezent-logo-preview-square">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Tenant logo preview"
                    className="bezent-logo-preview-img"
                  />
                ) : (
                  <span className="bezent-profile-logo-fallback">
                    {formData.name.slice(0, 2).toUpperCase() || 'TN'}
                  </span>
                )}
              </div>
              <Stack gap="xs">
                <Inline gap="xs" align="center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    Change Logo
                  </Button>
                  {formData.logoUrl && (
                    <Button variant="secondary" size="sm" onClick={handleRemoveLogo}>
                      Remove
                    </Button>
                  )}
                </Inline>
                <span className="bezent-branding-group__help">
                  Square image (min 240×240) PNG, JPG, WebP (Max 1MB)
                </span>
                {logoError && <Alert variant="error">{logoError}</Alert>}
              </Stack>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoFileChange}
              hidden
              aria-label="Upload tenant logo"
            />
          </div>

          {/* Cover / Banner Image */}
          <div className="bezent-branding-group">
            <label className="bezent-branding-group__label">Cover / Banner Image</label>
            <div className="bezent-cover-preview-box">
              {formData.bannerUrl ? (
                <img
                  src={formData.bannerUrl}
                  alt="Tenant cover preview"
                  className="bezent-cover-preview-img"
                />
              ) : null}
            </div>
            <Inline gap="xs" align="center">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
              >
                Change Cover
              </Button>
              {formData.bannerUrl && (
                <Button variant="secondary" size="sm" onClick={handleRemoveBanner}>
                  Remove
                </Button>
              )}
            </Inline>
            <span className="bezent-branding-group__help">
              Recommended size: 1440×400 (3:1) PNG, JPG, WebP (Max 2MB)
            </span>
            {bannerError && <Alert variant="error">{bannerError}</Alert>}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleBannerFileChange}
              hidden
              aria-label="Upload tenant banner"
            />
          </div>
        </section>

        {/* 2. GENERAL INFORMATION */}
        <section className="bezent-drawer-section" aria-label="General Information">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="organization" size={16} />
            </span>
            <span>General Information</span>
          </div>

          <Stack gap="md">
            <Input
              label="Tenant / Customer Display Name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              error={nameError || undefined}
              placeholder="e.g. Acme Technologies Pvt Ltd"
            />

            <Select
              label="Industry"
              value={formData.industry}
              onChange={(e) => handleFieldChange('industry', e.target.value)}
              options={INDUSTRY_OPTIONS}
            />

            <Select
              label="Country"
              value={formData.country}
              onChange={(e) => handleFieldChange('country', e.target.value)}
              options={COUNTRY_OPTIONS}
            />

            <Input
              label="State / Region"
              value={formData.state}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              placeholder="e.g. Karnataka"
            />

            <Input
              label="City"
              value={formData.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="e.g. Bengaluru"
            />
          </Stack>
        </section>

        {/* 3. PRIMARY CONTACT */}
        <section className="bezent-drawer-section" aria-label="Primary Contact">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="user" size={16} />
            </span>
            <span>Primary Contact</span>
          </div>

          <Stack gap="md">
            <Input
              label="Contact Name"
              value={formData.contactName}
              onChange={(e) => handleFieldChange('contactName', e.target.value)}
              placeholder="e.g. Arjun Kumar"
            />

            <Input
              label="Primary Contact Email"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
              error={emailError || undefined}
              placeholder="e.g. arjun@acme.com"
            />

            <Input
              label="Primary Contact Phone"
              value={formData.contactPhone}
              onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
              placeholder="e.g. +91 98xxxxxx21"
            />
          </Stack>
        </section>

        {/* 4. PLATFORM MANAGED (READ ONLY) */}
        <section className="bezent-drawer-section" aria-label="Platform Information (Super Admin Governed)">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="lock" size={16} />
            </span>
            <span>Platform Managed (Read Only)</span>
          </div>

          <div className="bezent-readonly-card">
            <div className="bezent-readonly-row">
              <span className="bezent-readonly-label">Tenant Code (Read-Only)</span>
              <span className="bezent-readonly-value-box">
                <span>{tenantCode}</span>
                <span className="bezent-readonly-lock">
                  <BezentIcon name="lock" size={14} />
                </span>
              </span>
            </div>

            <div className="bezent-readonly-row">
              <span className="bezent-readonly-label">Tenant ID</span>
              <span className="bezent-readonly-value-box">
                <span>{tenantId}</span>
                <span className="bezent-readonly-lock">
                  <BezentIcon name="lock" size={14} />
                </span>
              </span>
            </div>

            <div className="bezent-readonly-row">
              <span className="bezent-readonly-label">Status</span>
              <span className="bezent-readonly-value-box">
                <Badge variant={tenantStatus === 'active' ? 'success' : 'neutral'} showDot>
                  {tenantStatus.charAt(0).toUpperCase() + tenantStatus.slice(1)}
                </Badge>
                <span className="bezent-readonly-lock">
                  <BezentIcon name="lock" size={14} />
                </span>
              </span>
            </div>

            <div className="bezent-readonly-row">
              <span className="bezent-readonly-label">Company Capacity (Read-Only)</span>
              <span className="bezent-readonly-value-box">
                <span>
                  {capacityMax} Companies ({capacityUsed} used)
                </span>
                <span className="bezent-readonly-lock">
                  <BezentIcon name="lock" size={14} />
                </span>
              </span>
            </div>

            <div className="bezent-readonly-row">
              <span className="bezent-readonly-label">Account Created</span>
              <span className="bezent-readonly-value-box">
                <span>{createdAtFormatted}</span>
                <span className="bezent-readonly-lock">
                  <BezentIcon name="lock" size={14} />
                </span>
              </span>
            </div>
          </div>
        </section>
      </Stack>
    </Modal>
  );
}

export default EditTenantProfileDrawer;
