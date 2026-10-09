import { useState, useMemo, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Stack,
  Inline,
  Badge,
  Button,
  Input,
  Select,
  Alert,
  LoadingState,
  ProgressBar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import { useTenantAdmin } from '../context/TenantAdminContext';
import { tenantAdminApi, TenantAdminApiError } from '../api/tenantAdminApi';
import type { TenantApplicationSummary, TenantAdminCompanySummary } from '../types/tenantAdmin.types';
import {
  referenceDataApi,
  type CountryOption,
  type RegionOption,
  type CurrencyOption,
  type TimezoneOption,
  type LocaleOption,
  type DateFormatOption,
  type WeekStartOption,
  type IndustryOption,
  type OrganizationTypeOption,
  type AddressRules,
} from '../../../platform/data';

// Steps definition
const WIZARD_STEPS = [
  { step: 1, label: 'Company' },
  { step: 2, label: 'Address' },
  { step: 3, label: 'Regional' },
  { step: 4, label: 'Applications' },
  { step: 5, label: 'Review' },
] as const;

type LogoMode = 'upload' | 'tenant' | 'initials';

const FINANCIAL_YEAR_OPTIONS = [
  { value: '04-01', label: 'April 1 (April - March)' },
  { value: '01-01', label: 'January 1 (January - December)' },
  { value: '07-01', label: 'July 1 (July - June)' },
  { value: '10-01', label: 'October 1 (October - September)' },
];

export function CreateCompanyPage() {
  const navigate = useNavigate();
  const { tenant, capacity, refresh, selectCompany } = useTenantAdmin();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);

  // Reference Data State
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [industries, setIndustries] = useState<IndustryOption[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<OrganizationTypeOption[]>([]);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [locales, setLocales] = useState<LocaleOption[]>([]);
  const [dateFormats, setDateFormats] = useState<DateFormatOption[]>([]);
  const [weekStartDays, setWeekStartDays] = useState<WeekStartOption[]>([]);
  const [isRefDataLoading, setIsRefDataLoading] = useState(false);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // Address Rules & Regions for Selected Country
  const [addressRules, setAddressRules] = useState<AddressRules>({
    countryCode: 'IN',
    postalLabel: 'Postal / PIN Code',
    postalRequired: true,
    postalExample: '560001',
    postalPatternDescription: '6-digit number (e.g. 560001)',
    regionLabel: 'State / Region',
    regionRequired: true,
    cityLabel: 'City',
    localityLabel: 'Locality / Area',
    hasSubdivisions: true,
  });
  const [availableRegions, setAvailableRegions] = useState<RegionOption[]>([]);
  const [isPostalSearching, setIsPostalSearching] = useState(false);

  // Step 1: Basic Information
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [industry, setIndustry] = useState('Manufacturing');
  const [organizationType, setOrganizationType] = useState('Private Limited');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [contactName, setContactName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Logo state
  const [logoMode, setLogoMode] = useState<LogoMode>('initials');
  const [uploadedLogoPreview, setUploadedLogoPreview] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Registered Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [country, setCountry] = useState('IN');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Step 3: Regional Settings
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [locale, setLocale] = useState('en-IN');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [weekStartsOn, setWeekStartsOn] = useState('monday');
  const [financialYearStart, setFinancialYearStart] = useState('04-01');

  // Step 4: Application Access
  const [entitledApps, setEntitledApps] = useState<TenantApplicationSummary[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>(['hrms']);
  const [isAppsLoading, setIsAppsLoading] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdCompany, setCreatedCompany] = useState<TenantAdminCompanySummary | null>(null);
  const [distributionWarning, setDistributionWarning] = useState<string | null>(null);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate company code suggestion based on display/legal name
  const [userEditedCode, setUserEditedCode] = useState(false);

  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (!userEditedCode) {
      const generated = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8);
      setCode(generated ? `${generated}-01` : '');
    }
  };

  // 1. Fetch Reference Data from Canonical Common Data Engine
  const loadReferenceData = useCallback(() => {
    let active = true;
    setIsRefDataLoading(true);
    setRefDataError(null);

    Promise.all([
      referenceDataApi.getCountries(),
      referenceDataApi.getIndustries(),
      referenceDataApi.getOrganizationTypes(),
      referenceDataApi.getTimezones(),
      referenceDataApi.getCurrencies(),
      referenceDataApi.getLocales(),
      referenceDataApi.getDateFormats(),
      referenceDataApi.getWeekStartDays(),
    ])
      .then(([cntrs, inds, orgs, tzs, currs, locs, dfs, wks]) => {
        if (!active) return;
        setCountries(cntrs);
        setIndustries(inds);
        setOrganizationTypes(orgs);
        setTimezones(tzs);
        setCurrencies(currs);
        setLocales(locs);
        setDateFormats(dfs);
        setWeekStartDays(wks);

        setIndustry((prev) => prev || inds[0]?.id || 'Manufacturing');
        setOrganizationType((prev) => prev || orgs[0]?.id || 'Private Limited');
      })
      .catch((err) => {
        if (!active) return;
        setRefDataError(err instanceof Error ? err.message : 'Failed to load reference data from platform');
      })
      .finally(() => {
        if (active) setIsRefDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return loadReferenceData();
  }, [loadReferenceData]);

  // 2. Fetch country address rules & regions when country changes
  useEffect(() => {
    let active = true;
    const countryToFetch = country || 'IN';

    Promise.all([
      referenceDataApi.getAddressRules(countryToFetch),
      referenceDataApi.getRegions(countryToFetch),
    ])
      .then(([rules, regions]) => {
        if (!active) return;
        setAddressRules(rules);
        setAvailableRegions(regions);
      })
      .catch(() => {
        // Fallback gracefully to default address rules
      });

    return () => {
      active = false;
    };
  }, [country]);

  // Handle Country selection change with automatic default suggestions
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setState('');
    setPostalCode('');

    const matched = countries.find((c) => c.code === newCountry || c.name.toLowerCase() === newCountry.toLowerCase());
    if (matched) {
      if (matched.defaultCurrency) setCurrency(matched.defaultCurrency);
      if (matched.defaultTimezone) setTimeZone(matched.defaultTimezone);
      if (matched.code === 'IN') {
        setLocale('en-IN');
        setFinancialYearStart('04-01');
        setDateFormat('DD/MM/YYYY');
      } else if (matched.code === 'US') {
        setLocale('en-US');
        setFinancialYearStart('01-01');
        setDateFormat('MM/DD/YYYY');
      } else if (matched.code === 'GB') {
        setLocale('en-GB');
        setFinancialYearStart('04-01');
        setDateFormat('DD/MM/YYYY');
      }
    }
  };

  // Handle Postal Lookup (Autofill city & region if available)
  const handlePostalLookup = async () => {
    if (!postalCode.trim() || !country.trim()) return;
    setIsPostalSearching(true);
    try {
      const res = await referenceDataApi.postalLookup(country, postalCode.trim());
      if (res.supported && res.matches && res.matches.length > 0) {
        const match = res.matches[0];
        if (match?.city) setCity(match.city);
        if (match?.region) setState(match.region);
      }
    } catch {
      // Gracefully ignore error, user can enter manually
    } finally {
      setIsPostalSearching(false);
    }
  };

  // 3. Fetch tenant application entitlements for Step 4
  useEffect(() => {
    let active = true;
    setIsAppsLoading(true);

    tenantAdminApi
      .listApplications()
      .then((apps) => {
        if (!active) return;
        const entitled = apps.filter(
          (app) => app.tenantEntitled === true || app.status === 'active',
        );
        setEntitledApps(entitled);
        if (entitled.some((a) => a.code === 'hrms' || a.moduleCode === 'hrms')) {
          setSelectedApps(['hrms']);
        } else if (entitled.length > 0) {
          const firstCode = entitled[0]?.code || entitled[0]?.moduleCode;
          if (firstCode) setSelectedApps([firstCode]);
        }
      })
      .catch(() => {
        if (!active) return;
        setEntitledApps([
          {
            id: 'hrms',
            code: 'hrms',
            moduleCode: 'hrms',
            name: 'HRMS',
            description: 'Human Resource Management System & Employee Self-Service',
            tenantEntitled: true,
            status: 'active',
            enabledCompaniesCount: 0,
            totalCompaniesCount: 0,
          },
          {
            id: 'crm',
            code: 'crm',
            moduleCode: 'crm',
            name: 'CRM',
            description: 'Customer Relationship Management & Pipeline Tracking',
            tenantEntitled: true,
            status: 'active',
            enabledCompaniesCount: 0,
            totalCompaniesCount: 0,
          },
          {
            id: 'project_management',
            code: 'project_management',
            moduleCode: 'project_management',
            name: 'Project Management',
            description: 'Tasks, Workflows, Milestones & Team Collaboration',
            tenantEntitled: true,
            status: 'active',
            enabledCompaniesCount: 0,
            totalCompaniesCount: 0,
          },
        ]);
      })
      .finally(() => {
        if (active) setIsAppsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Capacity calculations
  const capacityUsed = capacity?.used ?? capacity?.currentCompanies ?? 0;
  const capacityMax = capacity?.max ?? capacity?.maxCompanies ?? 5;
  const capacityRemaining = capacity?.remaining ?? capacity?.availableCapacity ?? Math.max(0, capacityMax - capacityUsed);
  const isAtCapacity =
    capacity?.canCreateCompany === false ||
    (capacity?.isAtCapacity !== undefined ? capacity.isAtCapacity : capacityUsed >= capacityMax);

  // Logo file selection handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        setErrors((prev) => ({ ...prev, logo: 'Logo file size exceeds 1MB limit' }));
        return;
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next.logo;
        return next;
      });
      setSelectedLogoFile(file);
      const url = URL.createObjectURL(file);
      setUploadedLogoPreview(url);
      setLogoMode('upload');
    }
  };

  const handleRemoveLogo = () => {
    if (uploadedLogoPreview) {
      URL.revokeObjectURL(uploadedLogoPreview);
    }
    setUploadedLogoPreview(null);
    setSelectedLogoFile(null);
    setLogoMode('initials');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compute initials fallback
  const companyInitials = useMemo(() => {
    const target = displayName.trim() || legalName.trim();
    if (!target) return 'NC';
    const words = target.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'NC';
    if (words.length === 1) return (words[0] || '').slice(0, 2).toUpperCase();
    return (((words[0]?.[0]) || '') + ((words[1]?.[0]) || '')).toUpperCase() || 'NC';
  }, [displayName, legalName]);

  // Step Validation
  const validateStep = (stepNumber: number): boolean => {
    const errs: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!legalName.trim()) {
        errs.legalName = 'Legal Company Name is required';
      } else if (legalName.trim().length < 2 || legalName.trim().length > 150) {
        errs.legalName = 'Legal Company Name must be between 2 and 150 characters';
      }

      if (!displayName.trim()) {
        errs.displayName = 'Display / Short Name is required';
      } else if (displayName.trim().length < 2 || displayName.trim().length > 80) {
        errs.displayName = 'Display / Short Name must be between 2 and 80 characters';
      }

      if (!code.trim()) {
        errs.code = 'Company Code is required';
      } else if (!/^[A-Za-z0-9_-]+$/.test(code.trim())) {
        errs.code = 'Company Code can only contain alphanumeric characters, hyphens, and underscores';
      } else if (code.trim().length > 50) {
        errs.code = 'Company Code cannot exceed 50 characters';
      }

      if (!industry.trim()) errs.industry = 'Industry is required';
      if (businessEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())) {
        errs.businessEmail = 'Invalid business email format';
      }
      if (registrationNumber.trim() && registrationNumber.trim().length > 100) {
        errs.registrationNumber = 'Registration Number cannot exceed 100 characters';
      }
    } else if (stepNumber === 2) {
      if (!addressLine1.trim()) errs.addressLine1 = 'Address Line 1 is required';
      if (!country.trim()) errs.country = 'Country is required';
      if (addressRules.regionRequired && !state.trim()) {
        errs.state = `${addressRules.regionLabel} is required`;
      }
      if (!city.trim()) errs.city = 'City is required';
      if (addressRules.postalRequired && !postalCode.trim()) {
        errs.postalCode = `${addressRules.postalLabel} is required`;
      } else if (postalCode.trim()) {
        // Country-specific postal validation
        const cleanCountry = country.toUpperCase();
        if (cleanCountry === 'IN' && !/^\d{6}$/.test(postalCode.trim())) {
          errs.postalCode = 'PIN code must be a 6-digit number';
        } else if (cleanCountry === 'US' && !/^\d{5}(-\d{4})?$/.test(postalCode.trim())) {
          errs.postalCode = 'ZIP code must be 5 digits (e.g. 94103)';
        }
      }
    } else if (stepNumber === 3) {
      if (!timeZone.trim()) errs.timeZone = 'Time Zone is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goToNextStep = () => {
    if (!validateStep(currentStep)) return;
    const next = currentStep + 1;
    setCurrentStep(next);
    if (!visitedSteps.includes(next)) {
      setVisitedSteps((prev) => [...prev, next]);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNum: number) => {
    if (stepNum < currentStep || visitedSteps.includes(stepNum)) {
      if (validateStep(currentStep) || stepNum < currentStep) {
        setCurrentStep(stepNum);
      }
    }
  };

  const toggleApplication = (modCode: string) => {
    setSelectedApps((prev) =>
      prev.includes(modCode) ? prev.filter((c) => c !== modCode) : [...prev, modCode],
    );
  };

  // Step 5: Final Submission
  const handleCreateCompany = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(null);
    setDistributionWarning(null);

    try {
      // 1. Create company record with complete persisted fields (logo not stored as preview URL)
      const payload = {
        name: displayName.trim(),
        displayName: displayName.trim(),
        legalName: legalName.trim(),
        code: code.trim().toUpperCase(),
        organizationType: organizationType.trim() || null,
        industry: industry.trim() || null,
        registrationNumber: registrationNumber.trim() || null,
        businessEmail: businessEmail.trim() || null,
        contactPhone: contactPhone.trim() || null,
        country: country.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        timeZone: timeZone.trim(),
        currency: currency.trim() || null,
        locale: locale.trim() || null,
        dateFormat: dateFormat.trim() || null,
        weekStartsOn: weekStartsOn.trim() || null,
        financialYearStart: financialYearStart.trim() || null,
        logoUrl: null,
      };

      const result = await tenantAdminApi.createCompany(payload);
      setCreatedCompany(result);

      const postCreationWarnings: string[] = [];

      // 2. Upload logo or configure branding against canonical company ID
      if (logoMode === 'upload' && selectedLogoFile && result.id) {
        try {
          const uploadRes = await tenantAdminApi.uploadCompanyLogo(result.id, selectedLogoFile);
          result.logoUrl = uploadRes.url;
        } catch (logoErr) {
          const msg = logoErr instanceof Error ? logoErr.message : String(logoErr);
          postCreationWarnings.push(`Company logo upload failed (${msg}). You can upload it later from Company Details.`);
        }
      } else if (logoMode === 'tenant' && result.id) {
        try {
          const brandRes = await tenantAdminApi.updateCompanyBranding(result.id, 'tenant_logo');
          result.logoUrl = brandRes.logoUrl;
        } catch (brandErr) {
          const msg = brandErr instanceof Error ? brandErr.message : String(brandErr);
          postCreationWarnings.push(`Tenant Logo branding could not be applied (${msg}).`);
        }
      }

      // 3. Distribute entitled applications if selected
      if (selectedApps.length > 0 && result.id) {
        const distributionErrors: string[] = [];
        for (const modCode of selectedApps) {
          try {
            await tenantAdminApi.enableCompanyApplication(result.id, modCode);
          } catch (appErr) {
            const msg = appErr instanceof Error ? appErr.message : String(appErr);
            distributionErrors.push(`${modCode.toUpperCase()}: ${msg}`);
          }
        }

        if (distributionErrors.length > 0) {
          postCreationWarnings.push(
            `Some applications could not be enabled: ${distributionErrors.join(', ')}`,
          );
        }
      }

      if (postCreationWarnings.length > 0) {
        setDistributionWarning(
          `Company created successfully, but please note: ${postCreationWarnings.join(' | ')}`,
        );
      }

      // 3. Refresh tenant capacity & context
      void refresh();
    } catch (err) {
      if (err instanceof TenantAdminApiError) {
        if (err.status === 409) {
          setSubmissionError(
            err.code === 'COMPANY_CAPACITY_REACHED'
              ? 'Company capacity ceiling reached for this tenant. Cannot create more companies.'
              : err.code === 'COMPANY_CODE_ALREADY_EXISTS'
                ? `Company Code '${code}' already exists under this tenant. Please choose a different code.`
                : err.message,
          );
        } else {
          setSubmissionError(err.message);
        }
      } else {
        setSubmissionError(err instanceof Error ? err.message : 'Failed to create company.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (createdCompany) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={
            <Inline gap="xs" align="center">
              <BezentIcon name="organization" size={14} />
              <span>Tenant</span>
              <span>&gt;</span>
              <span>Companies</span>
              <span>&gt;</span>
              <strong>Success</strong>
            </Inline>
          }
          title="Company Created"
          subtitle={`${createdCompany.name || displayName} (${createdCompany.code || code}) is now active.`}
        />

        <div className="bezent-wizard-layout">
          <div className="bezent-wizard-card">
            <Stack gap="xl" align="center">
              <div className="bezent-wizard-success-icon" aria-hidden="true">
                <BezentIcon name="checkCircle" size={48} />
              </div>

              <div className="bezent-wizard-success-meta">
                <h2>{createdCompany.name || displayName}</h2>
                <p>Company Code: <strong>{createdCompany.code || code}</strong></p>
                <Badge variant="success">Active</Badge>
              </div>

              {distributionWarning && (
                <Alert variant="warning">{distributionWarning}</Alert>
              )}

              <div className="bezent-wizard-success-summary">
                <div className="bezent-review-block">
                  <h4>Setup Details</h4>
                  <p><strong>Legal Name:</strong> {createdCompany.legalName || legalName || '—'}</p>
                  <p><strong>Industry:</strong> {createdCompany.industry || industry || '—'}</p>
                  <p><strong>Location:</strong> {createdCompany.city || city}, {createdCompany.country || country}</p>
                  <p><strong>Timezone:</strong> {createdCompany.timeZone || timeZone}</p>
                  <p><strong>Currency:</strong> {createdCompany.currency || currency || '—'}</p>
                  <p><strong>Enabled Applications:</strong> {selectedApps.join(', ').toUpperCase() || 'None'}</p>
                </div>
              </div>

              <Inline gap="md">
                <Button
                  variant="primary"
                  onClick={() => {
                    selectCompany(createdCompany.id);
                    navigate(`/tenant-admin/tenant/companies/${encodeURIComponent(createdCompany.id)}/overview`);
                  }}
                >
                  Go to Company
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/tenant-admin/tenant/companies')}
                >
                  Back to Companies
                </Button>
              </Inline>
            </Stack>
          </div>
        </div>
      </Page>
    );
  }

  // CAPACITY REACHED STATE
  if (isAtCapacity) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={
            <Inline gap="xs" align="center">
              <BezentIcon name="organization" size={14} />
              <span>Tenant</span>
              <span>&gt;</span>
              <span>Companies</span>
              <span>&gt;</span>
              <strong>Add Company</strong>
            </Inline>
          }
          title="Add Company"
          subtitle="Create a legal entity under this tenant."
        />

        <div className="bezent-wizard-layout">
          <div className="bezent-wizard-card">
            <Stack gap="xl" align="center">
              <div className="bezent-wizard-capacity-icon" aria-hidden="true">
                <BezentIcon name="alertTriangle" size={48} />
              </div>

              <Stack gap="xs" align="center">
                <h2>Company Capacity Reached</h2>
                <p>
                  Your tenant has configured {capacityUsed} of {capacityMax} permitted companies.
                </p>
                <p>
                  To add more companies, contact your Super Administrator to increase your tenant company capacity ceiling.
                </p>
              </Stack>

              <Inline gap="md">
                <Button
                  variant="primary"
                  onClick={() => navigate('/tenant-admin/tenant/companies')}
                >
                  Return to Companies Directory
                </Button>
              </Inline>
            </Stack>
          </div>
        </div>
      </Page>
    );
  }

  // Prepared dynamic dropdown options
  const countryOptions = countries.length > 0
    ? countries.map((c) => ({
        value: c.code,
        label: `${c.flagEmoji ? c.flagEmoji + ' ' : ''}${c.name}`,
      }))
    : [
        { value: 'IN', label: '🇮🇳 India' },
        { value: 'US', label: '🇺🇸 United States' },
        { value: 'GB', label: '🇬🇧 United Kingdom' },
        { value: 'SG', label: '🇸🇬 Singapore' },
        { value: 'AE', label: '🇦🇪 United Arab Emirates' },
        { value: 'DE', label: '🇩🇪 Germany' },
        { value: 'AU', label: '🇦🇺 Australia' },
        { value: 'CA', label: '🇨🇦 Canada' },
      ];

  const industryOptions = industries.length > 0
    ? industries.map((i) => ({ value: i.id, label: i.label }))
    : [
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'IT Services', label: 'IT Services' },
        { value: 'Software Development', label: 'Software Development' },
        { value: 'Automotive', label: 'Automotive' },
        { value: 'Healthcare', label: 'Healthcare' },
        { value: 'Financial Services', label: 'Financial Services' },
        { value: 'Retail & E-Commerce', label: 'Retail & E-Commerce' },
        { value: 'Other', label: 'Other' },
      ];

  const orgTypeOptions = organizationTypes.length > 0
    ? organizationTypes.map((ot) => ({ value: ot.id, label: ot.label }))
    : [
        { value: 'Private Limited', label: 'Private Limited' },
        { value: 'Public Limited', label: 'Public Limited' },
        { value: 'Partnership', label: 'Partnership' },
        { value: 'Sole Proprietorship', label: 'Sole Proprietorship' },
        { value: 'Limited Liability Partnership (LLP)', label: 'Limited Liability Partnership (LLP)' },
        { value: 'Non-Profit / NGO', label: 'Non-Profit / NGO' },
      ];

  const timezoneOptions = timezones.length > 0
    ? timezones.map((tz) => ({ value: tz.id, label: tz.label }))
    : [
        { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
        { value: 'America/New_York', label: 'America/New_York (EST -5:00)' },
        { value: 'Europe/London', label: 'Europe/London (GMT +0:00)' },
        { value: 'UTC', label: 'UTC' },
      ];

  const currencyOptions = currencies.length > 0
    ? currencies.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))
    : [
        { value: 'INR', label: 'INR (₹)' },
        { value: 'USD', label: 'USD ($)' },
        { value: 'EUR', label: 'EUR (€)' },
        { value: 'GBP', label: 'GBP (£)' },
      ];

  const localeOptions = locales.length > 0
    ? locales.map((l) => ({ value: l.code, label: `${l.name} (${l.code})` }))
    : [
        { value: 'en-IN', label: 'English (India)' },
        { value: 'en-US', label: 'English (United States)' },
        { value: 'en-GB', label: 'English (United Kingdom)' },
      ];

  const dateFormatOptions = dateFormats.length > 0
    ? dateFormats.map((df) => ({ value: df.id, label: df.label }))
    : [
        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
      ];

  const weekStartOptions = weekStartDays.length > 0
    ? weekStartDays.map((ws) => ({ value: ws.id, label: ws.label }))
    : [
        { value: 'monday', label: 'Monday' },
        { value: 'sunday', label: 'Sunday' },
      ];

  const regionOptions = availableRegions.map((r) => ({
    value: r.name,
    label: `${r.name} (${r.type})`,
  }));

  // WIZARD NORMAL VIEW
  return (
    <Page>
      {/* 1. HEADER & BREADCRUMBS */}
      <PageHeader
        breadcrumbs={
          <Inline gap="xs" align="center">
            <BezentIcon name="organization" size={14} />
            <span>Tenant</span>
            <span>&gt;</span>
            <span>Companies</span>
            <span>&gt;</span>
            <strong>Add Company</strong>
          </Inline>
        }
        title="Add Company"
        subtitle="Create a legal entity under this tenant and configure its organization, regional settings, and application access."
      />

      <Stack gap="xl">
        {/* 2. HORIZONTAL 5-STEP STEPPER */}
        <div className="bezent-wizard-stepper">
          {WIZARD_STEPS.map((s, idx) => {
            const isCompleted = visitedSteps.includes(s.step) && s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <Fragment key={s.step}>
                <button
                  type="button"
                  className={`bezent-wizard-stepper__step ${
                    isCurrent ? 'bezent-wizard-stepper__step--active' : ''
                  } ${isCompleted ? 'bezent-wizard-stepper__step--completed' : ''}`}
                  onClick={() => handleStepClick(s.step)}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div className="bezent-wizard-stepper__circle">
                    {isCompleted ? (
                      <BezentIcon name="checkCircle" size={16} />
                    ) : (
                      <span>{s.step}</span>
                    )}
                  </div>
                  <span className="bezent-wizard-stepper__label">{s.label}</span>
                </button>

                {idx < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`bezent-wizard-stepper__line ${
                      isCompleted
                        ? 'bezent-wizard-stepper__line--completed'
                        : isCurrent
                          ? 'bezent-wizard-stepper__line--active'
                          : ''
                    }`}
                    aria-hidden="true"
                  />
                )}
              </Fragment>
            );
          })}
        </div>

        {refDataError && (
          <Alert variant="warning">
            <Inline gap="sm" align="center" justify="between">
              <span>{refDataError}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={isRefDataLoading}
                onClick={loadReferenceData}
              >
                {isRefDataLoading ? 'Loading...' : 'Retry'}
              </Button>
            </Inline>
          </Alert>
        )}

        {submissionError && (
          <Alert variant="error">{submissionError}</Alert>
        )}

        {/* 3. WIZARD MAIN + RIGHT CONTEXT LAYOUT */}
        <div className="bezent-wizard-layout">
          {/* MAIN WIZARD CARD */}
          <div className="bezent-wizard-card">
            {/* ============================================================== */}
            {/* STEP 1: BASIC INFORMATION */}
            {/* ============================================================== */}
            {currentStep === 1 && (
              <Stack gap="lg">
                <div className="bezent-wizard-section-header">
                  <div className="bezent-wizard-section-header__icon" aria-hidden="true">
                    <BezentIcon name="organization" size={22} />
                  </div>
                  <h3 className="bezent-wizard-section-header__title">Basic Information</h3>
                </div>

                {/* Company Logo Section */}
                <Stack gap="xs">
                  <label className="bezent-logo-setup__label">Company Logo (Optional)</label>
                  <div className="bezent-logo-compact">
                    <div className="bezent-logo-compact__preview">
                      {logoMode === 'upload' && uploadedLogoPreview ? (
                        <img
                          src={uploadedLogoPreview}
                          alt="Logo preview"
                          className="bezent-logo-compact__img"
                        />
                      ) : logoMode === 'tenant' && tenant?.logoUrl ? (
                        <img
                          src={tenant.logoUrl}
                          alt="Tenant logo preview"
                          className="bezent-logo-compact__img"
                        />
                      ) : (
                        <span>{companyInitials}</span>
                      )}
                    </div>

                    <div className="bezent-logo-compact__controls">
                      <Inline gap="xs" align="center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="bezent-sr-only"
                          onChange={handleLogoUpload}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          aria-label="Upload Company Logo"
                        >
                          <Inline gap="xs" align="center">
                            <BezentIcon name="plusSign" size={14} />
                            <span>Upload Logo</span>
                          </Inline>
                        </Button>
                        {uploadedLogoPreview && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleRemoveLogo}
                          >
                            Remove
                          </Button>
                        )}
                      </Inline>
                      <span className="bezent-logo-compact__hint">PNG, JPG, WebP (Max 1MB)</span>

                      <div className="bezent-logo-compact__radios">
                        <label className="bezent-logo-compact__radio-label">
                          <input
                            type="radio"
                            name="logoMode"
                            checked={logoMode === 'initials'}
                            onChange={() => setLogoMode('initials')}
                          />
                          <span>Use Company Initials</span>
                        </label>

                        <label className="bezent-logo-compact__radio-label">
                          <input
                            type="radio"
                            name="logoMode"
                            checked={logoMode === 'tenant'}
                            onChange={() => setLogoMode('tenant')}
                            disabled={!tenant?.logoUrl}
                          />
                          <span>Use Tenant Logo</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  {errors.logo && <Alert variant="error">{errors.logo}</Alert>}
                </Stack>

                {/* Form Fields Grid */}
                <div className="bezent-wizard-form-grid">
                  <Input
                    label="Legal Company Name *"
                    placeholder=""
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    error={errors.legalName}
                  />

                  <Input
                    label="Display / Short Name *"
                    placeholder=""
                    value={displayName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    error={errors.displayName}
                  />

                  <Input
                    label="Company Code *"
                    placeholder=""
                    value={code}
                    onChange={(e) => {
                      setUserEditedCode(true);
                      setCode(e.target.value);
                    }}
                    error={errors.code}
                  />

                  <Select
                    label="Industry *"
                    options={industryOptions}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    error={errors.industry}
                  />

                  <Select
                    label="Company Type"
                    options={orgTypeOptions}
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                  />

                  <Input
                    label="Registration Number (Optional)"
                    placeholder=""
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    error={errors.registrationNumber}
                  />
                </div>

                {/* Primary Contact Subsection */}
                <div className="bezent-wizard-sub-section">
                  <div className="bezent-wizard-sub-section__header">
                    <div className="bezent-wizard-sub-section__icon" aria-hidden="true">
                      <BezentIcon name="user" size={18} />
                    </div>
                    <h4 className="bezent-wizard-sub-section__title">Primary Contact for this Company</h4>
                  </div>

                  <div className="bezent-wizard-form-grid">
                    <Input
                      label="Contact Name"
                      placeholder=""
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />

                    <Input
                      label="Business Email"
                      placeholder=""
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      error={errors.businessEmail}
                    />

                    <Input
                      label="Phone Number"
                      placeholder=""
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              </Stack>
            )}

            {/* ============================================================== */}
            {/* STEP 2: REGISTERED ADDRESS */}
            {/* ============================================================== */}
            {currentStep === 2 && (
              <Stack gap="lg">
                <div className="bezent-wizard-section-header">
                  <div className="bezent-wizard-section-header__icon" aria-hidden="true">
                    <BezentIcon name="organization" size={22} />
                  </div>
                  <h3 className="bezent-wizard-section-header__title">Registered Address</h3>
                </div>

                <div className="bezent-wizard-form-grid">
                  <Input
                    label="Address Line 1 *"
                    placeholder=""
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    error={errors.addressLine1}
                  />

                  <Input
                    label="Address Line 2"
                    placeholder=""
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                  />

                  <Select
                    label="Country *"
                    options={countryOptions}
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    error={errors.country}
                  />

                  {availableRegions.length > 0 ? (
                    <Select
                      label={`${addressRules.regionLabel}${addressRules.regionRequired ? ' *' : ''}`}
                      options={regionOptions}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      error={errors.state}
                    />
                  ) : (
                    <Input
                      label={`${addressRules.regionLabel}${addressRules.regionRequired ? ' *' : ''}`}
                      placeholder=""
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      error={errors.state}
                    />
                  )}

                  <Input
                    label={`${addressRules.cityLabel} *`}
                    placeholder=""
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    error={errors.city}
                  />

                  <div>
                    <Input
                      label={`${addressRules.postalLabel}${addressRules.postalRequired ? ' *' : ''}`}
                      placeholder=""
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      onBlur={handlePostalLookup}
                      error={errors.postalCode}
                    />
                    <span className="bezent-field-hint">
                      <Inline gap="xs" align="center">
                        <BezentIcon name="info" size={12} />
                        <span>{addressRules.postalPatternDescription}</span>
                        {isPostalSearching && <span>(checking...)</span>}
                      </Inline>
                    </span>
                  </div>
                </div>
              </Stack>
            )}

            {/* ============================================================== */}
            {/* STEP 3: REGIONAL SETTINGS */}
            {/* ============================================================== */}
            {currentStep === 3 && (
              <Stack gap="lg">
                <div className="bezent-wizard-section-header">
                  <div className="bezent-wizard-section-header__icon" aria-hidden="true">
                    <BezentIcon name="settings" size={22} />
                  </div>
                  <h3 className="bezent-wizard-section-header__title">Regional Settings</h3>
                </div>

                <div className="bezent-wizard-form-grid">
                  <Select
                    label="Time Zone *"
                    options={timezoneOptions}
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    error={errors.timeZone}
                  />

                  <Select
                    label="Currency"
                    options={currencyOptions}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />

                  <Select
                    label="Locale"
                    options={localeOptions}
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                  />

                  <Select
                    label="Date Format"
                    options={dateFormatOptions}
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  />

                  <Select
                    label="Week Starts On"
                    options={weekStartOptions}
                    value={weekStartsOn}
                    onChange={(e) => setWeekStartsOn(e.target.value)}
                  />

                  <Select
                    label="Financial Year Start"
                    options={FINANCIAL_YEAR_OPTIONS}
                    value={financialYearStart}
                    onChange={(e) => setFinancialYearStart(e.target.value)}
                  />
                </div>
              </Stack>
            )}

            {/* ============================================================== */}
            {/* STEP 4: APPLICATION ACCESS */}
            {/* ============================================================== */}
            {currentStep === 4 && (
              <Stack gap="lg">
                <div className="bezent-wizard-section-header">
                  <div className="bezent-wizard-section-header__icon" aria-hidden="true">
                    <BezentIcon name="dashboard" size={22} />
                  </div>
                  <h3 className="bezent-wizard-section-header__title">Application Access</h3>
                </div>

                {isAppsLoading ? (
                  <LoadingState label="Loading tenant entitlements..." />
                ) : entitledApps.length === 0 ? (
                  <Alert variant="warning">
                    No application entitlements found for this tenant. You can continue creating the company and distribute applications later.
                  </Alert>
                ) : (
                  <div className="bezent-app-selection-list">
                    {entitledApps.map((app) => {
                      const modCode = app.code || app.moduleCode || '';
                      const isEnabled = selectedApps.includes(modCode);
                      const iconClass =
                        modCode === 'hrms'
                          ? 'bezent-app-selection-card__icon--hrms'
                          : modCode === 'crm'
                            ? 'bezent-app-selection-card__icon--crm'
                            : 'bezent-app-selection-card__icon--pm';

                      return (
                        <div
                          key={app.id || modCode}
                          className={`bezent-app-selection-card ${
                            isEnabled ? 'bezent-app-selection-card--selected' : ''
                          }`}
                        >
                          <div className={`bezent-app-selection-card__icon ${iconClass}`}>
                            <BezentIcon
                              name={
                                modCode === 'hrms'
                                    ? 'organization'
                                  : modCode === 'crm'
                                    ? 'user'
                                    : 'tasks'
                              }
                              size={20}
                            />
                          </div>

                          <div className="bezent-app-selection-card__info">
                            <span className="bezent-app-selection-card__name">
                              {app.name || modCode.toUpperCase()}
                            </span>
                            <span className="bezent-app-selection-card__desc">
                              {app.description || `${app.name} capability for your business`}
                            </span>
                          </div>

                          <Button
                            variant={isEnabled ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => toggleApplication(modCode)}
                          >
                            {isEnabled ? 'Enabled' : 'Enable'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Stack>
            )}

            {/* ============================================================== */}
            {/* STEP 5: REVIEW & CREATE */}
            {/* ============================================================== */}
            {currentStep === 5 && (
              <Stack gap="lg">
                <div className="bezent-wizard-section-header">
                  <div className="bezent-wizard-section-header__icon" aria-hidden="true">
                    <BezentIcon name="checkCircle" size={22} />
                  </div>
                  <h3 className="bezent-wizard-section-header__title">Review & Create</h3>
                </div>

                <div className="bezent-review-container">
                  {/* Basic Info Block */}
                  <div className="bezent-review-block">
                    <div className="bezent-review-block__header">
                      <BezentIcon name="organization" size={16} />
                      <h4>Company Identity</h4>
                    </div>
                    <div className="bezent-review-grid">
                      <div><span>Legal Name:</span><strong>{legalName || '—'}</strong></div>
                      <div><span>Display Name:</span><strong>{displayName || '—'}</strong></div>
                      <div><span>Company Code:</span><strong>{code || '—'}</strong></div>
                      <div><span>Industry:</span><strong>{industry || '—'}</strong></div>
                      <div><span>Company Type:</span><strong>{organizationType || '—'}</strong></div>
                      <div><span>Registration Number:</span><strong>{registrationNumber || '—'}</strong></div>
                      <div><span>Logo Mode:</span>
                        <strong>
                          {logoMode === 'upload'
                            ? 'Uploaded (local preview; cloud storage pending)'
                            : logoMode === 'tenant'
                              ? 'Tenant Logo'
                              : 'Initials Fallback'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Registered Address Block */}
                  <div className="bezent-review-block">
                    <div className="bezent-review-block__header">
                      <BezentIcon name="organization" size={16} />
                      <h4>Registered Address</h4>
                    </div>
                    <div className="bezent-review-grid">
                      <div><span>Address Line 1:</span><strong>{addressLine1 || '—'}</strong></div>
                      <div><span>Address Line 2:</span><strong>{addressLine2 || '—'}</strong></div>
                      <div><span>Country:</span><strong>{country || '—'}</strong></div>
                      <div><span>State / Region:</span><strong>{state || '—'}</strong></div>
                      <div><span>City:</span><strong>{city || '—'}</strong></div>
                      <div><span>Postal Code:</span><strong>{postalCode || '—'}</strong></div>
                    </div>
                  </div>

                  {/* Regional Settings Block */}
                  <div className="bezent-review-block">
                    <div className="bezent-review-block__header">
                      <BezentIcon name="settings" size={16} />
                      <h4>Regional Settings</h4>
                    </div>
                    <div className="bezent-review-grid">
                      <div><span>Time Zone:</span><strong>{timeZone || '—'}</strong></div>
                      <div><span>Currency:</span><strong>{currency || '—'}</strong></div>
                      <div><span>Locale:</span><strong>{locale || '—'}</strong></div>
                      <div><span>Date Format:</span><strong>{dateFormat || '—'}</strong></div>
                      <div><span>Week Starts On:</span><strong>{weekStartsOn || '—'}</strong></div>
                      <div><span>Financial Year:</span><strong>{financialYearStart || '—'}</strong></div>
                    </div>
                  </div>

                  {/* Enabled Applications Block */}
                  <div className="bezent-review-block">
                    <div className="bezent-review-block__header">
                      <BezentIcon name="dashboard" size={16} />
                      <h4>Enabled Applications</h4>
                    </div>
                    <Inline gap="xs">
                      {selectedApps.length > 0 ? (
                        selectedApps.map((a) => (
                          <Badge key={a} variant="info">
                            {a.toUpperCase()}
                          </Badge>
                        ))
                      ) : (
                        <span>No applications selected</span>
                      )}
                    </Inline>
                  </div>

                  {/* Capacity Impact Block */}
                  <div className="bezent-review-block bezent-review-block--capacity">
                    <div className="bezent-review-block__header">
                      <BezentIcon name="info" size={16} />
                      <h4>Tenant Capacity Impact</h4>
                    </div>
                    <div className="bezent-review-capacity-stats">
                      <div><span>Current:</span><strong>{capacityUsed} / {capacityMax}</strong></div>
                      <div><span>After Creation:</span><strong>{capacityUsed + 1} / {capacityMax}</strong></div>
                      <div><span>Remaining:</span><strong>{Math.max(0, capacityRemaining - 1)}</strong></div>
                    </div>
                  </div>
                </div>
              </Stack>
            )}

            {/* ============================================================== */}
            {/* WIZARD FOOTER NAVIGATION */}
            {/* ============================================================== */}
            <div className="bezent-wizard-footer">
              <Inline gap="sm">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/tenant-admin/tenant/companies')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                {currentStep > 1 && (
                  <Button
                    variant="secondary"
                    onClick={goToPrevStep}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                )}
              </Inline>

              <div>
                {currentStep < 5 ? (
                  <Button variant="primary" onClick={goToNextStep}>
                    <Inline gap="xs" align="center">
                      <span>Next</span>
                      <BezentIcon name="arrowRight" size={14} />
                    </Inline>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleCreateCompany}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Inline gap="xs" align="center">
                        <BezentIcon name="clock" size={14} />
                        <span>Creating company...</span>
                      </Inline>
                    ) : (
                      'Create Company'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT-SIDE CONTEXTUAL GUIDANCE & PREVIEW */}
          <div className="bezent-wizard-side-cards">
            {/* Company Live Preview Card */}
            <div className="bezent-company-preview-card">
              <div className="bezent-company-preview-header">
                <span className="bezent-company-preview-title">Company Preview</span>
                <Badge variant="success">Draft</Badge>
              </div>

              <div className="bezent-company-preview-identity">
                <div className="bezent-company-preview-avatar">
                  {logoMode === 'upload' && uploadedLogoPreview ? (
                    <img src={uploadedLogoPreview} alt="Logo" className="bezent-logo-compact__img" />
                  ) : logoMode === 'tenant' && tenant?.logoUrl ? (
                    <img src={tenant.logoUrl} alt="Tenant logo" className="bezent-logo-compact__img" />
                  ) : (
                    <span>{companyInitials}</span>
                  )}
                </div>

                <div className="bezent-company-preview-names">
                  <span className="bezent-company-preview-name">
                    {displayName.trim() || legalName.trim() || 'New Company'}
                  </span>
                  <span className="bezent-company-preview-code">
                    {code.trim() || '—'}
                  </span>
                </div>
              </div>

              {(industry.trim() || organizationType.trim() || contactName.trim() || businessEmail.trim() || contactPhone.trim()) ? (
                <div className="bezent-company-preview-details">
                  {industry.trim() && (
                    <div className="bezent-company-preview-row">
                      <span className="bezent-company-preview-row__icon">
                        <BezentIcon name="organization" size={14} />
                      </span>
                      <span>{industry}</span>
                    </div>
                  )}

                  {organizationType.trim() && (
                    <div className="bezent-company-preview-row">
                      <span className="bezent-company-preview-row__icon">
                        <BezentIcon name="organization" size={14} />
                      </span>
                      <span>{organizationType}</span>
                    </div>
                  )}

                  {(contactName.trim() || businessEmail.trim() || contactPhone.trim()) && (
                    <div className="bezent-company-preview-row">
                      <span className="bezent-company-preview-row__icon">
                        <BezentIcon name="user" size={14} />
                      </span>
                      <div className="bezent-company-preview-contact">
                        {contactName.trim() && (
                          <span className="bezent-company-preview-contact-item">{contactName}</span>
                        )}
                        {businessEmail.trim() && (
                          <span className="bezent-company-preview-contact-sub">{businessEmail}</span>
                        )}
                        {contactPhone.trim() && (
                          <span className="bezent-company-preview-contact-sub">{contactPhone}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Setup Progress Card */}
            <div className="bezent-wizard-progress-card">
              <span className="bezent-wizard-progress-header">Setup Progress</span>
              <div className="bezent-wizard-progress-meta">
                <span>Step {currentStep} of 5</span>
                <span>{Math.round((currentStep / 5) * 100)}%</span>
              </div>
              <ProgressBar value={Math.round((currentStep / 5) * 100)} max={100} size="sm" />
            </div>
          </div>
        </div>
      </Stack>
    </Page>
  );
}
