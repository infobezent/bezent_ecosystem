import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  Modal,
  Stack,
  Button,
  Input,
  Select,
  Alert,
  Inline,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { tenantAdminApi } from '../api/tenantAdminApi';
import type { TenantAdminCompanySummary } from '../types/tenantAdmin.types';

export interface CompanyMasterFormData {
  legalName: string;
  displayName: string;
  code: string;
  organizationType: string;
  industry: string;
  registrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  businessEmail: string;
  contactPhone: string;
  website: string;
  timeZone: string;
  currency: string;
  locale: string;
  dateFormat: string;
  logoUrl: string | null;
}

export interface EditCompanyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  company: TenantAdminCompanySummary;
  onSaveSuccess?: (updated: TenantAdminCompanySummary) => void;
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

const ORGANIZATION_TYPE_OPTIONS = [
  { value: 'Private Limited', label: 'Private Limited Company' },
  { value: 'Public Limited', label: 'Public Limited Company' },
  { value: 'Limited Liability Partnership', label: 'Limited Liability Partnership (LLP)' },
  { value: 'Partnership', label: 'Partnership' },
  { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
  { value: 'Non-Profit Organization', label: 'Non-Profit / Section 8' },
  { value: 'Government / Public Sector', label: 'Government / Public Sector' },
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

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+05:30)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+00:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+08:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+04:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10:00)' },
];

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
  { value: 'SGD', label: 'SGD ($) - Singapore Dollar' },
  { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { value: 'AUD', label: 'AUD ($) - Australian Dollar' },
];

export function EditCompanyDrawer({
  isOpen,
  onClose,
  company,
  onSaveSuccess,
}: EditCompanyDrawerProps) {
  const mapCompanyToFormData = (comp: TenantAdminCompanySummary): CompanyMasterFormData => ({
    legalName: comp.legalName || comp.name || '',
    displayName: comp.displayName || comp.name || '',
    code: comp.code || '',
    organizationType: comp.organizationType || 'Private Limited',
    industry: comp.industry || 'Manufacturing',
    registrationNumber: comp.registrationNumber || '',
    addressLine1: comp.addressLine1 || '',
    addressLine2: comp.addressLine2 || '',
    city: comp.city || '',
    state: comp.state || '',
    postalCode: comp.postalCode || '',
    country: comp.country || 'India',
    businessEmail: comp.businessEmail || '',
    contactPhone: comp.contactPhone || '',
    website: comp.website || '',
    timeZone: comp.timeZone || 'Asia/Kolkata',
    currency: comp.currency || 'INR',
    locale: comp.locale || 'en-IN',
    dateFormat: comp.dateFormat || 'DD/MM/YYYY',
    logoUrl: comp.logoUrl || null,
  });

  const [formData, setFormData] = useState<CompanyMasterFormData>(() => mapCompanyToFormData(company));
  const [initialSnapshot, setInitialSnapshot] = useState<CompanyMasterFormData>(() => mapCompanyToFormData(company));
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = mapCompanyToFormData(company);
      setFormData(initial);
      setInitialSnapshot(initial);
      setSelectedLogoFile(null);
      setIsLogoRemoved(false);
      setErrorMessage(null);
      setLogoError(null);
      setNameError(null);
    }
  }, [isOpen, company]);

  const isDirty =
    formData.legalName !== initialSnapshot.legalName ||
    formData.displayName !== initialSnapshot.displayName ||
    formData.organizationType !== initialSnapshot.organizationType ||
    formData.industry !== initialSnapshot.industry ||
    formData.registrationNumber !== initialSnapshot.registrationNumber ||
    formData.addressLine1 !== initialSnapshot.addressLine1 ||
    formData.addressLine2 !== initialSnapshot.addressLine2 ||
    formData.city !== initialSnapshot.city ||
    formData.state !== initialSnapshot.state ||
    formData.postalCode !== initialSnapshot.postalCode ||
    formData.country !== initialSnapshot.country ||
    formData.businessEmail !== initialSnapshot.businessEmail ||
    formData.contactPhone !== initialSnapshot.contactPhone ||
    formData.website !== initialSnapshot.website ||
    formData.timeZone !== initialSnapshot.timeZone ||
    formData.currency !== initialSnapshot.currency ||
    formData.locale !== initialSnapshot.locale ||
    formData.dateFormat !== initialSnapshot.dateFormat ||
    selectedLogoFile !== null ||
    isLogoRemoved;

  const handleFieldChange = (field: keyof CompanyMasterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'legalName' && nameError) setNameError(null);
  };

  const handleLogoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Logo must be a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo file size must be less than 2MB.');
      return;
    }

    setSelectedLogoFile(file);
    setIsLogoRemoved(false);
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, logoUrl: previewUrl }));
  };

  const handleRemoveLogo = () => {
    setSelectedLogoFile(null);
    setIsLogoRemoved(true);
    setFormData((prev) => ({ ...prev, logoUrl: null }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSave = async () => {
    if (!formData.legalName.trim()) {
      setNameError('Legal company name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: Partial<TenantAdminCompanySummary> = {
        name: formData.displayName.trim() || formData.legalName.trim(),
        legalName: formData.legalName.trim() || null,
        displayName: formData.displayName.trim() || null,
        organizationType: formData.organizationType.trim() || null,
        industry: formData.industry.trim() || null,
        registrationNumber: formData.registrationNumber.trim() || null,
        addressLine1: formData.addressLine1.trim() || null,
        addressLine2: formData.addressLine2.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postalCode: formData.postalCode.trim() || null,
        country: formData.country.trim() || null,
        businessEmail: formData.businessEmail.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        website: formData.website.trim() || null,
        timeZone: formData.timeZone.trim() || null,
        currency: formData.currency.trim() || null,
        locale: formData.locale.trim() || null,
        dateFormat: formData.dateFormat.trim() || null,
      };

      let updatedCompany = await tenantAdminApi.updateCompanyProfile(company.id, payload);

      if (selectedLogoFile) {
        try {
          const logoResult = await tenantAdminApi.uploadCompanyLogo(company.id, selectedLogoFile);
          updatedCompany = { ...updatedCompany, logoUrl: logoResult.url };
        } catch (logoErr: unknown) {
          const errMsg = logoErr instanceof Error ? logoErr.message : 'Logo upload failed';
          setErrorMessage(`Company details saved, but logo could not be uploaded: ${errMsg}`);
          onSaveSuccess?.(updatedCompany);
          return;
        }
      } else if (isLogoRemoved) {
        try {
          await tenantAdminApi.removeCompanyLogo(company.id);
          updatedCompany = { ...updatedCompany, logoUrl: null };
        } catch {
          // Gracefully continue
        }
      }

      onSaveSuccess?.(updatedCompany);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update company master information.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="drawer"
      title="Edit Company"
      description="Update company identity, corporate registration, registered address, and defaults."
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

        {/* 1. BASIC INFORMATION */}
        <section className="bezent-drawer-section" aria-label="Basic Information">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="organization" size={16} />
            </span>
            <span>Basic Information</span>
          </div>

          <Stack gap="md">
            {/* Company Logo */}
            <div className="bezent-branding-group">
              <label className="bezent-branding-group__label">Company Logo</label>
              <div className="bezent-logo-preview-row">
                <div className="bezent-logo-preview-square">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Company logo preview"
                      className="bezent-logo-preview-img"
                    />
                  ) : (
                    <span className="bezent-profile-logo-fallback">
                      {formData.legalName.slice(0, 2).toUpperCase() || 'CO'}
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
                    PNG, JPG, WebP (Max 2MB). Recommended square aspect ratio.
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
                aria-label="Upload company logo"
              />
            </div>

            <Input
              label="Legal Company Name"
              value={formData.legalName}
              onChange={(e) => handleFieldChange('legalName', e.target.value)}
              error={nameError || undefined}
              placeholder="e.g. APJ3D Manufacturing Private Limited"
            />

            <Input
              label="Display Name / Trade Name"
              value={formData.displayName}
              onChange={(e) => handleFieldChange('displayName', e.target.value)}
              placeholder="e.g. APJ3D"
            />

            <div>
              <Input
                label="Company Code"
                value={formData.code}
                disabled
                placeholder="e.g. APJ3D-01"
              />
              <p className="bezent-branding-group__help">
                Company code is a stable system identifier and cannot be changed casually.
              </p>
            </div>

            <Select
              label="Company Type"
              value={formData.organizationType}
              onChange={(e) => handleFieldChange('organizationType', e.target.value)}
              options={ORGANIZATION_TYPE_OPTIONS}
            />

            <Select
              label="Industry"
              value={formData.industry}
              onChange={(e) => handleFieldChange('industry', e.target.value)}
              options={INDUSTRY_OPTIONS}
            />
          </Stack>
        </section>

        {/* 2. CORPORATE REGISTRATION & TAX */}
        <section className="bezent-drawer-section" aria-label="Corporate Registration & Tax">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="document" size={16} />
            </span>
            <span>Registration & Tax</span>
          </div>

          <Stack gap="md">
            <Input
              label="Registration Number / CIN"
              value={formData.registrationNumber}
              onChange={(e) => handleFieldChange('registrationNumber', e.target.value)}
              placeholder="e.g. U29300TN2024PTC123456"
            />
          </Stack>
        </section>

        {/* 3. REGISTERED OFFICE ADDRESS */}
        <section className="bezent-drawer-section" aria-label="Registered Office Address">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="pin" size={16} />
            </span>
            <span>Registered Office Address</span>
          </div>

          <Stack gap="md">
            <span className="bezent-branding-group__help">
              Registered Office is the legal entity address. Operational branches, offices, and plants are managed in Organization → Work Locations.
            </span>

            <Input
              label="Address Line 1"
              value={formData.addressLine1}
              onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
              placeholder="e.g. 123 Tech Innovation Park"
            />

            <Input
              label="Address Line 2"
              value={formData.addressLine2}
              onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
              placeholder="e.g. Suite 400"
            />

            <Inline gap="md">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                placeholder="e.g. Chennai"
              />
              <Input
                label="State / Province"
                value={formData.state}
                onChange={(e) => handleFieldChange('state', e.target.value)}
                placeholder="e.g. Tamil Nadu"
              />
            </Inline>

            <Inline gap="md">
              <Input
                label="Postal / PIN Code"
                value={formData.postalCode}
                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                placeholder="e.g. 600001"
              />
              <Select
                label="Country"
                value={formData.country}
                onChange={(e) => handleFieldChange('country', e.target.value)}
                options={COUNTRY_OPTIONS}
              />
            </Inline>
          </Stack>
        </section>

        {/* 4. CONTACT INFORMATION */}
        <section className="bezent-drawer-section" aria-label="Contact Information">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="email" size={16} />
            </span>
            <span>Contact Information</span>
          </div>

          <Stack gap="md">
            <Input
              label="Primary Business Email"
              type="email"
              value={formData.businessEmail}
              onChange={(e) => handleFieldChange('businessEmail', e.target.value)}
              placeholder="e.g. contact@apj3d.example"
            />

            <Input
              label="Primary Contact Phone"
              value={formData.contactPhone}
              onChange={(e) => handleFieldChange('contactPhone', e.target.value)}
              placeholder="e.g. +91 44 2345 6789"
            />

            <Input
              label="Company Website"
              value={formData.website}
              onChange={(e) => handleFieldChange('website', e.target.value)}
              placeholder="e.g. https://apj3d.example"
            />
          </Stack>
        </section>

        {/* 5. REGIONAL DEFAULTS */}
        <section className="bezent-drawer-section" aria-label="Regional Defaults">
          <div className="bezent-drawer-section__header">
            <span className="bezent-drawer-section__icon">
              <BezentIcon name="settings" size={16} />
            </span>
            <span>Regional Defaults</span>
          </div>

          <Stack gap="md">
            <Select
              label="Time Zone"
              value={formData.timeZone}
              onChange={(e) => handleFieldChange('timeZone', e.target.value)}
              options={TIMEZONE_OPTIONS}
            />

            <Select
              label="Default Currency"
              value={formData.currency}
              onChange={(e) => handleFieldChange('currency', e.target.value)}
              options={CURRENCY_OPTIONS}
            />
          </Stack>
        </section>
      </Stack>
    </Modal>
  );
}
