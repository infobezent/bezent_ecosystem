import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Card,
  Grid,
  Stack,
  Inline,
  Badge,
  Button,
  Input,
  Select,
  Checkbox,
  Modal,
  Alert,
  LoadingState,
  Toolbar,
} from '../../../design-system/components';
import { BezentIcon } from '../../../design-system/icons';
import {
  superAdminApi,
  type PlanRecord,
  type PlanModuleEligibility,
  type Step3ModuleOverride,
  type Step1CompanyPayload,
  type Step2PrimaryAdminPayload,
  type Step3SubscriptionPayload,
  type TenantOrchestrationPayload,
  type TenantOrchestrationPreflightResult,
  type TenantOrchestrationResult,
} from '../api/superAdminApi';

// Top canonical IANA timezones with description
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York', label: 'America/New York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (Pacific Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
];

export interface CreateTenantPageProps {
  initialStep?: 1 | 2 | 3 | 4 | 5;
  initialCompanyData?: Partial<Step1CompanyPayload>;
  initialAdminData?: Partial<Step2PrimaryAdminPayload>;
  initialSelectedApps?: {
    hrms: boolean;
    crm: boolean;
    project_management: boolean;
  };
  initialPlans?: PlanRecord[];
  initialPreflightResult?: TenantOrchestrationPreflightResult | null;
  initialCreationResult?: TenantOrchestrationResult | null;
  initialEligibleModulesByApp?: Partial<{
    hrms: PlanModuleEligibility[];
    crm: PlanModuleEligibility[];
    project_management: PlanModuleEligibility[];
  }>;
  initialSelectedModulesByApp?: Partial<{
    hrms: string[];
    crm: string[];
    project_management: string[];
  }>;
  initialSubscriptionsConfig?: Partial<{
    hrms: Partial<{
      planId: string;
      accessMode: 'trial' | 'paid';
      licensedSeats: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      activationMode: 'immediate' | 'scheduled';
      scheduledDate: string;
    }>;
    crm: Partial<{
      planId: string;
      accessMode: 'trial' | 'paid';
      licensedSeats: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      activationMode: 'immediate' | 'scheduled';
      scheduledDate: string;
    }>;
    project_management: Partial<{
      planId: string;
      accessMode: 'trial' | 'paid';
      licensedSeats: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      activationMode: 'immediate' | 'scheduled';
      scheduledDate: string;
    }>;
  }>;
}

export function CreateTenantPage({
  initialStep = 1,
  initialCompanyData,
  initialAdminData,
  initialSelectedApps,
  initialPlans,
  initialPreflightResult = null,
  initialCreationResult = null,
  initialEligibleModulesByApp,
  initialSelectedModulesByApp,
  initialSubscriptionsConfig,
}: CreateTenantPageProps = {}) {
  const navigate = useNavigate();

  // Wizard Step Management (1: Company, 2: Primary Admin, 3: Applications, 4: Review, 5: Success)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(initialStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (let i = 1; i < initialStep; i++) {
      s.add(i);
    }
    return s;
  });

  // Available Plan Catalog
  const [availablePlans, setAvailablePlans] = useState<PlanRecord[]>(initialPlans || []);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(!initialPlans);

  // Form State: Step 1 (Company Information)
  const [companyData, setCompanyData] = useState<Step1CompanyPayload>({
    legalName: initialCompanyData?.legalName || '',
    displayName: initialCompanyData?.displayName || '',
    businessEmail: initialCompanyData?.businessEmail || '',
    country: initialCompanyData?.country || 'United States',
    timeZone: initialCompanyData?.timeZone || 'America/New_York',
    contactPhone: initialCompanyData?.contactPhone || '',
    website: initialCompanyData?.website || '',
    industry: initialCompanyData?.industry || '',
    companySize: initialCompanyData?.companySize || '11-50',
    state: initialCompanyData?.state || '',
    city: initialCompanyData?.city || '',
    postalCode: initialCompanyData?.postalCode || '',
    address: initialCompanyData?.address || '',
    registrationNumber: initialCompanyData?.registrationNumber || '',
    taxIdentifier: initialCompanyData?.taxIdentifier || '',
    logoUrl: initialCompanyData?.logoUrl || null,
  });
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

  // Form State: Step 2 (Primary Administrator)
  const [adminData, setAdminData] = useState<Step2PrimaryAdminPayload>({
    fullName: initialAdminData?.fullName || '',
    workEmail: initialAdminData?.workEmail || '',
    phone: initialAdminData?.phone || '',
    jobTitle: initialAdminData?.jobTitle || '',
  });
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});

  // Form State: Step 3 (Applications & Subscriptions)
  const [selectedApps, setSelectedApps] = useState<{
    hrms: boolean;
    crm: boolean;
    project_management: boolean;
  }>({
    hrms: initialSelectedApps ? initialSelectedApps.hrms : true,
    crm: initialSelectedApps ? initialSelectedApps.crm : false,
    project_management: initialSelectedApps ? initialSelectedApps.project_management : false,
  });

  const [subscriptionsConfig, setSubscriptionsConfig] = useState<{
    hrms: {
      planId: string;
      accessMode: 'trial' | 'paid';
      licensedSeats: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      activationMode: 'immediate' | 'scheduled';
      scheduledDate: string;
    };
    crm: {
      planId: string;
      accessMode: 'trial' | 'paid';
      licensedSeats: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      activationMode: 'immediate' | 'scheduled';
      scheduledDate: string;
    };
    project_management: {
      planId: string;
      accessMode: 'trial' | 'paid';
      licensedSeats: number;
      billingCycle: 'monthly' | 'quarterly' | 'annual';
      activationMode: 'immediate' | 'scheduled';
      scheduledDate: string;
    };
  }>({
    hrms: {
      planId: initialSubscriptionsConfig?.hrms?.planId || '',
      accessMode: initialSubscriptionsConfig?.hrms?.accessMode || 'paid',
      licensedSeats: initialSubscriptionsConfig?.hrms?.licensedSeats ?? 25,
      billingCycle: initialSubscriptionsConfig?.hrms?.billingCycle || 'monthly',
      activationMode: initialSubscriptionsConfig?.hrms?.activationMode || 'immediate',
      scheduledDate: initialSubscriptionsConfig?.hrms?.scheduledDate || '',
    },
    crm: {
      planId: initialSubscriptionsConfig?.crm?.planId || '',
      accessMode: initialSubscriptionsConfig?.crm?.accessMode || 'paid',
      licensedSeats: initialSubscriptionsConfig?.crm?.licensedSeats ?? 15,
      billingCycle: initialSubscriptionsConfig?.crm?.billingCycle || 'monthly',
      activationMode: initialSubscriptionsConfig?.crm?.activationMode || 'immediate',
      scheduledDate: initialSubscriptionsConfig?.crm?.scheduledDate || '',
    },
    project_management: {
      planId: initialSubscriptionsConfig?.project_management?.planId || '',
      accessMode: initialSubscriptionsConfig?.project_management?.accessMode || 'paid',
      licensedSeats: initialSubscriptionsConfig?.project_management?.licensedSeats ?? 20,
      billingCycle: initialSubscriptionsConfig?.project_management?.billingCycle || 'monthly',
      activationMode: initialSubscriptionsConfig?.project_management?.activationMode || 'immediate',
      scheduledDate: initialSubscriptionsConfig?.project_management?.scheduledDate || '',
    },
  });
  const [subscriptionsErrors, setSubscriptionsErrors] = useState<Record<string, string>>({});

  // Module Entitlements & Overrides State per Application
  const [eligibleModulesByApp, setEligibleModulesByApp] = useState<{
    hrms: PlanModuleEligibility[];
    crm: PlanModuleEligibility[];
    project_management: PlanModuleEligibility[];
  }>({
    hrms: initialEligibleModulesByApp?.hrms || [],
    crm: initialEligibleModulesByApp?.crm || [],
    project_management: initialEligibleModulesByApp?.project_management || [],
  });

  const [selectedModulesByApp, setSelectedModulesByApp] = useState<{
    hrms: string[];
    crm: string[];
    project_management: string[];
  }>({
    hrms: initialSelectedModulesByApp?.hrms || [],
    crm: initialSelectedModulesByApp?.crm || [],
    project_management: initialSelectedModulesByApp?.project_management || [],
  });

  const [moduleOverridesByApp, setModuleOverridesByApp] = useState<{
    hrms: Step3ModuleOverride[];
    crm: Step3ModuleOverride[];
    project_management: Step3ModuleOverride[];
  }>({
    hrms: [],
    crm: [],
    project_management: [],
  });

  const [commercialAgreementNotesByApp, setCommercialAgreementNotesByApp] = useState<{
    hrms: string;
    crm: string;
    project_management: string;
  }>({
    hrms: '',
    crm: '',
    project_management: '',
  });

  // Override Authorize Modal State
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean;
    appCode: 'hrms' | 'crm' | 'project_management';
    moduleKey: string;
    moduleName: string;
    reason: string;
    error: string | null;
  }>({
    isOpen: false,
    appCode: 'hrms',
    moduleKey: '',
    moduleName: '',
    reason: '',
    error: null,
  });

  // Fetch plan-eligible modules with server defaults
  const fetchEligibleModules = useCallback(
    (appCode: 'hrms' | 'crm' | 'project_management', planId: string) => {
      if (!planId) {
        setEligibleModulesByApp((prev) => ({ ...prev, [appCode]: [] }));
        setSelectedModulesByApp((prev) => ({ ...prev, [appCode]: [] }));
        setModuleOverridesByApp((prev) => ({ ...prev, [appCode]: [] }));
        return;
      }
      if (typeof superAdminApi.getPlanModules === 'function') {
        superAdminApi
          .getPlanModules(planId)
          .then((modules) => {
            if (Array.isArray(modules)) {
              setEligibleModulesByApp((prev) => ({ ...prev, [appCode]: modules }));
              const defaultSelected = modules
                .filter((m) => m.defaultEnabled || m.isMandatory)
                .map((m) => m.moduleKey);
              setSelectedModulesByApp((prev) => ({ ...prev, [appCode]: defaultSelected }));
              setModuleOverridesByApp((prev) => ({ ...prev, [appCode]: [] }));
            }
          })
          .catch(() => {
            // Non-blocking fallback
          });
      }
    },
    [],
  );

  // Preflight State
  const [preflightLoading, setPreflightLoading] = useState<boolean>(false);
  const [preflightResult, setPreflightResult] = useState<TenantOrchestrationPreflightResult | null>(initialPreflightResult);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  // Final Submission & Idempotency
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => `sa-tnt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<TenantOrchestrationResult | null>(initialCreationResult);

  // Load plans from catalog
  useEffect(() => {
    superAdminApi
      .listPlans()
      .then((plans) => {
        setAvailablePlans(plans || []);
        // Set default plan for HRMS if available
        const defaultHrmsPlan = plans?.find((p) => p.applicationCode === 'hrms');
        if (defaultHrmsPlan) {
          setSubscriptionsConfig((prev) => ({
            ...prev,
            hrms: { ...prev.hrms, planId: defaultHrmsPlan.id },
          }));
          fetchEligibleModules('hrms', defaultHrmsPlan.id);
        }
      })
      .catch(() => {
        // Non-blocking fallback
      })
      .finally(() => {
        setLoadingPlans(false);
      });
  }, [fetchEligibleModules]);

  // Filter plans by application
  const hrmsPlans = useMemo(() => availablePlans.filter((p) => p.applicationCode === 'hrms'), [availablePlans]);
  const crmPlans = useMemo(() => availablePlans.filter((p) => p.applicationCode === 'crm'), [availablePlans]);
  const pmPlans = useMemo(() => availablePlans.filter((p) => p.applicationCode === 'project_management'), [availablePlans]);

  // Construct canonical payload
  const buildPayload = useCallback((): TenantOrchestrationPayload => {
    const subscriptions: Step3SubscriptionPayload[] = [];

    if (selectedApps.hrms && subscriptionsConfig.hrms.planId) {
      subscriptions.push({
        applicationCode: 'hrms',
        planId: subscriptionsConfig.hrms.planId,
        accessMode: subscriptionsConfig.hrms.accessMode,
        licensedSeats: subscriptionsConfig.hrms.licensedSeats,
        billingCycle: subscriptionsConfig.hrms.billingCycle,
        commercialAgreementNotes: commercialAgreementNotesByApp.hrms.trim() || null,
        selectedModules: selectedModulesByApp.hrms.length > 0 ? selectedModulesByApp.hrms : undefined,
        moduleOverrides: moduleOverridesByApp.hrms.length > 0 ? moduleOverridesByApp.hrms : undefined,
        scheduledActivationAt:
          subscriptionsConfig.hrms.activationMode === 'scheduled' && subscriptionsConfig.hrms.scheduledDate
            ? new Date(subscriptionsConfig.hrms.scheduledDate).toISOString()
            : null,
      });
    }

    if (selectedApps.crm && subscriptionsConfig.crm.planId) {
      subscriptions.push({
        applicationCode: 'crm',
        planId: subscriptionsConfig.crm.planId,
        accessMode: subscriptionsConfig.crm.accessMode,
        licensedSeats: subscriptionsConfig.crm.licensedSeats,
        billingCycle: subscriptionsConfig.crm.billingCycle,
        commercialAgreementNotes: commercialAgreementNotesByApp.crm.trim() || null,
        selectedModules: selectedModulesByApp.crm.length > 0 ? selectedModulesByApp.crm : undefined,
        moduleOverrides: moduleOverridesByApp.crm.length > 0 ? moduleOverridesByApp.crm : undefined,
        scheduledActivationAt:
          subscriptionsConfig.crm.activationMode === 'scheduled' && subscriptionsConfig.crm.scheduledDate
            ? new Date(subscriptionsConfig.crm.scheduledDate).toISOString()
            : null,
      });
    }

    if (selectedApps.project_management && subscriptionsConfig.project_management.planId) {
      subscriptions.push({
        applicationCode: 'project_management',
        planId: subscriptionsConfig.project_management.planId,
        accessMode: subscriptionsConfig.project_management.accessMode,
        licensedSeats: subscriptionsConfig.project_management.licensedSeats,
        billingCycle: subscriptionsConfig.project_management.billingCycle,
        commercialAgreementNotes: commercialAgreementNotesByApp.project_management.trim() || null,
        selectedModules: selectedModulesByApp.project_management.length > 0 ? selectedModulesByApp.project_management : undefined,
        moduleOverrides: moduleOverridesByApp.project_management.length > 0 ? moduleOverridesByApp.project_management : undefined,
        scheduledActivationAt:
          subscriptionsConfig.project_management.activationMode === 'scheduled' && subscriptionsConfig.project_management.scheduledDate
            ? new Date(subscriptionsConfig.project_management.scheduledDate).toISOString()
            : null,
      });
    }

    return {
      company: {
        legalName: companyData.legalName.trim(),
        displayName: companyData.displayName.trim(),
        businessEmail: companyData.businessEmail.trim().toLowerCase(),
        country: companyData.country.trim(),
        timeZone: companyData.timeZone.trim(),
        contactPhone: companyData.contactPhone?.trim() || null,
        website: companyData.website?.trim() || null,
        industry: companyData.industry?.trim() || null,
        companySize: companyData.companySize?.trim() || null,
        state: companyData.state?.trim() || null,
        city: companyData.city?.trim() || null,
        postalCode: companyData.postalCode?.trim() || null,
        address: companyData.address?.trim() || null,
        registrationNumber: companyData.registrationNumber?.trim() || null,
        taxIdentifier: companyData.taxIdentifier?.trim() || null,
        logoUrl: companyData.logoUrl || null,
      },
      admin: {
        fullName: adminData.fullName.trim(),
        workEmail: adminData.workEmail.trim().toLowerCase(),
        phone: adminData.phone?.trim() || null,
        jobTitle: adminData.jobTitle?.trim() || null,
      },
      subscriptions,
    };
  }, [companyData, adminData, selectedApps, subscriptionsConfig]);

  // Execute Preflight Validation
  const runPreflight = useCallback(async () => {
    setPreflightLoading(true);
    setPreflightError(null);
    try {
      const payload = buildPayload();
      const result = await superAdminApi.preflightTenantOrchestration(payload);
      setPreflightResult(result);
    } catch (err: unknown) {
      setPreflightError(err instanceof Error ? err.message : 'Server preflight validation failed');
      setPreflightResult(null);
    } finally {
      setPreflightLoading(false);
    }
  }, [buildPayload]);

  // Invalidate preflight whenever inputs change
  const invalidatePreflight = () => {
    setPreflightResult(null);
    setPreflightError(null);
    // Regenerate idempotency key when payload changes
    setIdempotencyKey(`sa-tnt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  };

  // Step 1 Validation & Progression
  const handleValidateStep1 = () => {
    const errors: Record<string, string> = {};
    if (!companyData.legalName.trim() || companyData.legalName.trim().length < 2) {
      errors.legalName = 'Legal company name is required (min 2 characters)';
    }
    if (!companyData.displayName.trim() || companyData.displayName.trim().length < 2) {
      errors.displayName = 'Display name is required (min 2 characters)';
    }
    if (!companyData.businessEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.businessEmail.trim())) {
      errors.businessEmail = 'A valid business email address is required';
    }
    if (!companyData.country.trim()) {
      errors.country = 'Country is required';
    }
    if (!companyData.timeZone.trim()) {
      errors.timeZone = 'IANA Timezone is required';
    }

    setCompanyErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCompletedSteps((prev) => new Set(prev).add(1));
      setCurrentStep(2);
    }
  };

  // Step 2 Validation & Progression
  const handleValidateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!adminData.fullName.trim() || adminData.fullName.trim().length < 2) {
      errors.fullName = 'Administrator full name is required (min 2 characters)';
    }
    if (!adminData.workEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.workEmail.trim())) {
      errors.workEmail = 'A valid work email address is required';
    }

    setAdminErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCompletedSteps((prev) => new Set(prev).add(2));
      setCurrentStep(3);
    }
  };

  // Module Selection & Overrides Handlers
  const handleToggleModule = (
    appCode: 'hrms' | 'crm' | 'project_management',
    moduleKey: string,
  ) => {
    const modules = eligibleModulesByApp[appCode];
    const mod = modules.find((m) => m.moduleKey === moduleKey);
    if (!mod || mod.isMandatory) return; // Mandatory modules cannot be deselected

    const currentSelected = selectedModulesByApp[appCode];
    const isSelected = currentSelected.includes(moduleKey);

    if (isSelected) {
      // Check if other selected modules depend on this one
      const dependents = modules.filter(
        (m) => currentSelected.includes(m.moduleKey) && m.dependencies?.includes(moduleKey),
      );
      if (dependents.length > 0) {
        const depNames = dependents.map((d) => d.name).join(', ');
        setSubscriptionsErrors((prev) => ({
          ...prev,
          [`${appCode}Modules`]: `Cannot deselect '${mod.name}' because ${depNames} depend on it.`,
        }));
        return;
      }

      setSelectedModulesByApp((prev) => ({
        ...prev,
        [appCode]: prev[appCode].filter((k) => k !== moduleKey),
      }));
    } else {
      // Selecting: ensure all dependencies are also added
      const missingDeps = (mod.dependencies || []).filter(
        (depKey) => !currentSelected.includes(depKey),
      );
      setSelectedModulesByApp((prev) => ({
        ...prev,
        [appCode]: Array.from(new Set([...prev[appCode], moduleKey, ...missingDeps])),
      }));
    }

    setSubscriptionsErrors((prev) => {
      const copy = { ...prev };
      delete copy[`${appCode}Modules`];
      return copy;
    });
    invalidatePreflight();
  };

  const handleSelectAllEligible = (appCode: 'hrms' | 'crm' | 'project_management') => {
    const modules = eligibleModulesByApp[appCode];
    const eligibleKeys = modules
      .filter(
        (m) =>
          m.isIncludedInPlan ||
          moduleOverridesByApp[appCode].some(
            (o) => o.moduleCode === m.moduleKey && o.overrideType === 'enable',
          ),
      )
      .map((m) => m.moduleKey);

    setSelectedModulesByApp((prev) => ({
      ...prev,
      [appCode]: eligibleKeys,
    }));
    setSubscriptionsErrors((prev) => {
      const copy = { ...prev };
      delete copy[`${appCode}Modules`];
      return copy;
    });
    invalidatePreflight();
  };

  const handleOpenOverride = (
    appCode: 'hrms' | 'crm' | 'project_management',
    moduleKey: string,
    moduleName: string,
  ) => {
    const existingOverride = moduleOverridesByApp[appCode].find((o) => o.moduleCode === moduleKey);
    setOverrideModal({
      isOpen: true,
      appCode,
      moduleKey,
      moduleName,
      reason: existingOverride?.reason || '',
      error: null,
    });
  };

  const handleSaveOverride = () => {
    if (!overrideModal.reason || overrideModal.reason.trim().length < 3) {
      setOverrideModal((prev) => ({
        ...prev,
        error: 'Authorized override reason is required (minimum 3 characters).',
      }));
      return;
    }

    const { appCode, moduleKey, reason } = overrideModal;
    setModuleOverridesByApp((prev) => {
      const filtered = prev[appCode].filter((o) => o.moduleCode !== moduleKey);
      return {
        ...prev,
        [appCode]: [
          ...filtered,
          { moduleCode: moduleKey, overrideType: 'enable', reason: reason.trim() },
        ],
      };
    });

    // Also select the module and its dependencies
    const mod = eligibleModulesByApp[appCode].find((m) => m.moduleKey === moduleKey);
    const missingDeps = (mod?.dependencies || []).filter(
      (depKey) => !selectedModulesByApp[appCode].includes(depKey),
    );
    setSelectedModulesByApp((prev) => ({
      ...prev,
      [appCode]: Array.from(new Set([...prev[appCode], moduleKey, ...missingDeps])),
    }));

    setOverrideModal({
      isOpen: false,
      appCode: 'hrms',
      moduleKey: '',
      moduleName: '',
      reason: '',
      error: null,
    });
    invalidatePreflight();
  };

  const handleRemoveOverride = (
    appCode: 'hrms' | 'crm' | 'project_management',
    moduleKey: string,
  ) => {
    setModuleOverridesByApp((prev) => ({
      ...prev,
      [appCode]: prev[appCode].filter((o) => o.moduleCode !== moduleKey),
    }));
    setSelectedModulesByApp((prev) => ({
      ...prev,
      [appCode]: prev[appCode].filter((k) => k !== moduleKey),
    }));
    invalidatePreflight();
  };

  // Step 3 Validation & Progression
  const handleValidateStep3 = () => {
    const errors: Record<string, string> = {};

    const checkApp = (appCode: 'hrms' | 'crm' | 'project_management', label: string) => {
      const cfg = subscriptionsConfig[appCode];
      if (!cfg.planId) {
        errors[`${appCode}Plan`] = `Plan is required for ${label}`;
        return;
      }
      if (!cfg.licensedSeats || cfg.licensedSeats < 1) {
        errors[`${appCode}Seats`] = 'Licensed seats must be at least 1';
      }

      const plan = availablePlans.find((p) => p.id === cfg.planId);
      if (cfg.accessMode === 'trial') {
        if (plan && !plan.trialEligible) {
          errors[`${appCode}Trial`] = `Plan '${plan.name}' is not eligible for trial access. Please switch to Paid mode.`;
        }
      } else {
        // Paid mode: check if price is approved or notes provided
        const activePrice = plan?.prices?.find((pr) => pr.billingCycle === cfg.billingCycle);
        const hasApprovedPrice = Boolean(
          activePrice && activePrice.amount > 0 && activePrice.status === 'active',
        );
        if (!hasApprovedPrice && !commercialAgreementNotesByApp[appCode]?.trim()) {
          errors[`${appCode}Agreement`] = `Commercial Agreement Notes are required for '${plan?.name || label}' because standard pricing is not yet approved.`;
        }
      }

      // Check module dependencies & mandatory modules if modules are loaded
      const modules = eligibleModulesByApp[appCode];
      const selected = selectedModulesByApp[appCode];
      if (modules.length > 0 && selected.length > 0) {
        const mandatory = modules.filter((m) => m.isMandatory);
        for (const mand of mandatory) {
          if (!selected.includes(mand.moduleKey)) {
            errors[`${appCode}Modules`] = `Mandatory module '${mand.name}' must remain selected for ${label}.`;
            break;
          }
        }
        for (const modKey of selected) {
          const modDef = modules.find((m) => m.moduleKey === modKey);
          if (modDef && modDef.dependencies && modDef.dependencies.length > 0) {
            for (const dep of modDef.dependencies) {
              if (!selected.includes(dep)) {
                const depDef = modules.find((m) => m.moduleKey === dep);
                errors[`${appCode}Modules`] = `Module '${modDef.name}' requires dependency '${depDef?.name || dep}', which is not selected.`;
                break;
              }
            }
          }
        }
      }
    };

    if (selectedApps.hrms) checkApp('hrms', 'HRMS');
    if (selectedApps.crm) checkApp('crm', 'CRM');
    if (selectedApps.project_management) checkApp('project_management', 'Project Management');

    setSubscriptionsErrors(errors);
    if (Object.keys(errors).length === 0) {
      setCompletedSteps((prev) => new Set(prev).add(3));
      setCurrentStep(4);
      runPreflight();
    }
  };

  // Step 4 Final Submission
  const handleFinalSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildPayload();
      const result = await superAdminApi.orchestrateTenantCreation(payload, idempotencyKey);
      setCreationResult(result);
      setCompletedSteps((prev) => new Set(prev).add(4));
      setCurrentStep(5); // Success step
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Tenant creation failed. You can safely retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Application Subscription & Module Entitlements Card (Step 3)
  const renderAppSubscriptionCard = (
    appCode: 'hrms' | 'crm' | 'project_management',
    appTitle: string,
    appDescription: string,
    iconName: string,
    plans: PlanRecord[],
  ) => {
    const isAppEnabled = selectedApps[appCode];
    const cfg = subscriptionsConfig[appCode];
    const plan = availablePlans.find((p) => p.id === cfg.planId);
    const isTrialMode = cfg.accessMode === 'trial';
    const isTrialEligible = plan?.trialEligible ?? false;
    const activePrice = plan?.prices?.find((pr) => pr.billingCycle === cfg.billingCycle);
    const hasApprovedPrice = Boolean(
      activePrice && activePrice.amount > 0 && activePrice.status === 'active',
    );
    const requiresCommercialAgreement = !isTrialMode && Boolean(plan) && !hasApprovedPrice;

    const eligibleModules = eligibleModulesByApp[appCode];
    const selectedModules = selectedModulesByApp[appCode];
    const overrides = moduleOverridesByApp[appCode];

    return (
      <Card key={appCode} variant={isAppEnabled ? 'default' : 'flat'} padding="md">
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <BezentIcon name={iconName as Parameters<typeof BezentIcon>[0]['name']} size={24} color="currentColor" />
              <Stack gap="xs">
                <strong>{appTitle}</strong>
                <span className="bezent-caption">{appDescription}</span>
              </Stack>
            </Inline>
            <Button
              variant={isAppEnabled ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                setSelectedApps({ ...selectedApps, [appCode]: !isAppEnabled });
                invalidatePreflight();
              }}
            >
              {isAppEnabled ? `Disable ${appCode.toUpperCase()}` : `Enable ${appCode.toUpperCase()}`}
            </Button>
          </Inline>

          {isAppEnabled && (
            <Stack gap="md">
              {/* 1. Subscription Configuration */}
              <Grid columns={3} gap="md">
                <Select
                  label={`${appTitle.split(' ')[0]} Plan *`}
                  value={cfg.planId}
                  onChange={(e) => {
                    const newPlanId = e.target.value;
                    const newPlan = availablePlans.find((p) => p.id === newPlanId);
                    setSubscriptionsConfig((prev) => ({
                      ...prev,
                      [appCode]: {
                        ...prev[appCode],
                        planId: newPlanId,
                        accessMode:
                          newPlan?.trialEligible === false ? 'paid' : prev[appCode].accessMode,
                      },
                    }));
                    fetchEligibleModules(appCode, newPlanId);
                    invalidatePreflight();
                  }}
                  error={subscriptionsErrors[`${appCode}Plan`]}
                  options={[
                    { value: '', label: `Select a ${appTitle.split(' ')[0]} Plan` },
                    ...plans.map((p) => ({ value: p.id, label: `${p.name} (${p.tier})` })),
                  ]}
                />
                <Select
                  label="Access Mode"
                  value={cfg.accessMode}
                  onChange={(e) => {
                    setSubscriptionsConfig((prev) => ({
                      ...prev,
                      [appCode]: {
                        ...prev[appCode],
                        accessMode: e.target.value as 'trial' | 'paid',
                      },
                    }));
                    invalidatePreflight();
                  }}
                  options={[
                    { value: 'paid', label: 'Commercial Paid License' },
                    {
                      value: 'trial',
                      label:
                        plan && !isTrialEligible
                          ? `14-Day Evaluation Trial (Not trial-eligible)`
                          : `14-Day Evaluation Trial`,
                    },
                  ]}
                />
                <Input
                  label="Licensed Seats *"
                  type="number"
                  min={1}
                  value={cfg.licensedSeats}
                  onChange={(e) => {
                    setSubscriptionsConfig((prev) => ({
                      ...prev,
                      [appCode]: {
                        ...prev[appCode],
                        licensedSeats: parseInt(e.target.value, 10) || 1,
                      },
                    }));
                    invalidatePreflight();
                  }}
                  error={subscriptionsErrors[`${appCode}Seats`]}
                />
                <Select
                  label="Billing Cycle"
                  value={cfg.billingCycle}
                  onChange={(e) => {
                    setSubscriptionsConfig((prev) => ({
                      ...prev,
                      [appCode]: {
                        ...prev[appCode],
                        billingCycle: e.target.value as 'monthly' | 'quarterly' | 'annual',
                      },
                    }));
                    invalidatePreflight();
                  }}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'annual', label: 'Annual (Billed upfront)' },
                  ]}
                />
                <Select
                  label="Activation Schedule"
                  value={cfg.activationMode}
                  onChange={(e) => {
                    setSubscriptionsConfig((prev) => ({
                      ...prev,
                      [appCode]: {
                        ...prev[appCode],
                        activationMode: e.target.value as 'immediate' | 'scheduled',
                      },
                    }));
                    invalidatePreflight();
                  }}
                  options={[
                    { value: 'immediate', label: 'Immediate Activation' },
                    { value: 'scheduled', label: 'Scheduled Activation' },
                  ]}
                />
                {cfg.activationMode === 'scheduled' && (
                  <Input
                    label="Activation Date (Customer Timezone)"
                    type="date"
                    value={cfg.scheduledDate}
                    onChange={(e) => {
                      setSubscriptionsConfig((prev) => ({
                        ...prev,
                        [appCode]: {
                          ...prev[appCode],
                          scheduledDate: e.target.value,
                        },
                      }));
                      invalidatePreflight();
                    }}
                  />
                )}
              </Grid>

              {/* 2. Pricing & Trial Business Validation Alerts */}
              {isTrialMode && plan && !isTrialEligible && (
                <Alert variant="warning" title="Evaluation Trial Ineligible">
                  Plan &apos;{plan.name}&apos; ({plan.tier}) does not support self-serve evaluation
                  trials. Please switch Access Mode to Commercial Paid License.
                </Alert>
              )}

              {requiresCommercialAgreement && (
                <Alert variant="warning" title="Authorized Commercial Agreement Required">
                  <Stack gap="xs">
                    <span>
                      Standard catalog pricing is not yet approved or configured for plan &apos;
                      {plan?.name ?? 'selected plan'}&apos;. An authorized commercial agreement reference is required to
                      activate.
                    </span>
                    <Input
                      label="Commercial Agreement Notes *"
                      placeholder="e.g. Approved Contract #2026-098 / Signed Order Form"
                      value={commercialAgreementNotesByApp[appCode]}
                      onChange={(e) => {
                        setCommercialAgreementNotesByApp((prev) => ({
                          ...prev,
                          [appCode]: e.target.value,
                        }));
                        invalidatePreflight();
                      }}
                      error={subscriptionsErrors[`${appCode}Agreement`]}
                      required
                    />
                  </Stack>
                </Alert>
              )}

              {/* 3. Module Access & Entitlements Section */}
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <Inline gap="sm" align="center">
                    <strong>Module Entitlements</strong>
                    <Badge variant="neutral" size="sm">
                      {selectedModules.length} of {eligibleModules.length} selected
                    </Badge>
                    {overrides.length > 0 && (
                      <Badge variant="warning" size="sm">
                        {overrides.length} Authorized Override(s)
                      </Badge>
                    )}
                  </Inline>
                  {eligibleModules.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSelectAllEligible(appCode)}
                    >
                      Select All Eligible
                    </Button>
                  )}
                </Inline>

                {eligibleModules.length === 0 ? (
                  <span className="bezent-caption">
                    Select a plan above to view and configure eligible modules.
                  </span>
                ) : (
                  <Grid columns={2} gap="sm">
                    {eligibleModules.map((mod) => {
                      const isSelected = selectedModules.includes(mod.moduleKey);
                      const isMandatory = mod.isMandatory;
                      const isIncluded = mod.isIncludedInPlan;
                      const override = overrides.find(
                        (o) => o.moduleCode === mod.moduleKey && o.overrideType === 'enable',
                      );

                      return (
                        <Card key={mod.moduleKey} variant="flat" padding="sm">
                          <Stack gap="xs">
                            <Inline justify="between" align="center">
                              <Checkbox
                                checked={isSelected}
                                disabled={isMandatory || (!isIncluded && !override)}
                                onChange={() => handleToggleModule(appCode, mod.moduleKey)}
                                label={mod.name}
                              />
                              <Inline gap="xs" align="center">
                                {isMandatory && (
                                  <Badge variant="info" size="sm">
                                    Mandatory
                                  </Badge>
                                )}
                                {override && (
                                  <Badge variant="warning" size="sm">
                                    Authorized Override
                                  </Badge>
                                )}
                                {!override && isIncluded && (
                                  <Badge variant="success" size="sm">
                                    Included in Plan
                                  </Badge>
                                )}
                                {!override && !isIncluded && (
                                  <Badge variant="neutral" size="sm">
                                    Not in Plan
                                  </Badge>
                                )}
                              </Inline>
                            </Inline>
                            <span className="bezent-caption">{mod.description}</span>
                            {mod.dependencies?.length > 0 && (
                              <span className="bezent-caption">
                                Requires:{' '}
                                {mod.dependencies
                                  .map(
                                    (d) =>
                                      eligibleModules.find((m) => m.moduleKey === d)?.name || d,
                                  )
                                  .join(', ')}
                              </span>
                            )}
                            {!isIncluded && (
                              <Inline justify="between" align="center">
                                {!override ? (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      handleOpenOverride(appCode, mod.moduleKey, mod.name)
                                    }
                                  >
                                    + Authorize Override
                                  </Button>
                                ) : (
                                  <Inline gap="xs" align="center">
                                    <span className="bezent-caption">
                                      Reason: &quot;<strong>{override.reason}</strong>&quot;
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        handleOpenOverride(appCode, mod.moduleKey, mod.name)
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() =>
                                        handleRemoveOverride(appCode, mod.moduleKey)
                                      }
                                    >
                                      Revoke
                                    </Button>
                                  </Inline>
                                )}
                              </Inline>
                            )}
                          </Stack>
                        </Card>
                      );
                    })}
                  </Grid>
                )}
              </Stack>

              {/* Application-Specific Error Notices */}
              {subscriptionsErrors[`${appCode}Plan`] && (
                <Alert variant="error">{subscriptionsErrors[`${appCode}Plan`]}</Alert>
              )}
              {subscriptionsErrors[`${appCode}Seats`] && (
                <Alert variant="error">{subscriptionsErrors[`${appCode}Seats`]}</Alert>
              )}
              {subscriptionsErrors[`${appCode}Trial`] && (
                <Alert variant="error">{subscriptionsErrors[`${appCode}Trial`]}</Alert>
              )}
              {subscriptionsErrors[`${appCode}Agreement`] && (
                <Alert variant="error">{subscriptionsErrors[`${appCode}Agreement`]}</Alert>
              )}
              {subscriptionsErrors[`${appCode}Modules`] && (
                <Alert variant="error">{subscriptionsErrors[`${appCode}Modules`]}</Alert>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    );
  };

  // Stepper Header renderer
  const renderStepper = () => {
    const steps = [
      { num: 1, label: 'Company Info', fullLabel: 'Company Information' },
      { num: 2, label: 'Primary Admin', fullLabel: 'Primary Administrator' },
      { num: 3, label: 'Applications', fullLabel: 'Applications & Subscriptions' },
      { num: 4, label: 'Review', fullLabel: 'Review & Create' },
    ];

    return (
      <nav aria-label="Tenant Creation Steps">
        <Stack gap="xs">
          <span className="bezent-caption" aria-live="polite">
            Step {currentStep} of 4 — {steps[Math.min(currentStep - 1, 3)]?.fullLabel}
          </span>
          <Inline gap="md" align="center" justify="between">
            {steps.map((s) => {
              const isActive = currentStep === s.num;
              const isDone = completedSteps.has(s.num);
              const canNavigate = isDone || s.num < currentStep;

              return (
                <Inline
                  key={s.num}
                  gap="xs"
                  align="center"
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${s.num} of 4: ${s.fullLabel}`}
                  onClick={() => {
                    if (canNavigate && currentStep !== 5) {
                      setCurrentStep(s.num as 1 | 2 | 3 | 4);
                    }
                  }}
                >
                  <Badge
                    variant={isActive ? 'info' : isDone ? 'success' : 'neutral'}
                    size="md"
                  >
                    {isDone ? '✓' : String(s.num)}
                  </Badge>
                  <span className={isActive ? 'bezent-heading-sm' : 'bezent-caption'}>
                    {s.label}
                  </span>
                </Inline>
              );
            })}
          </Inline>
        </Stack>
      </nav>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Create Tenant"
        subtitle="Set up a new customer organization, administrator, and application access."
        actions={
          currentStep !== 5 ? (
            <Button
              variant="secondary"
              onClick={() => navigate('/super-admin/tenants')}
            >
              Cancel
            </Button>
          ) : null
        }
      />

      {currentStep !== 5 && (
        <Card variant="flat" padding="sm">
          {renderStepper()}
        </Card>
      )}

      {/* ── STEP 1: COMPANY INFORMATION ─────────────────────────────────── */}
      {currentStep === 1 && (
        <Card>
          <Stack gap="lg">
            <Stack gap="xs">
              <h2 className="bezent-heading-md">Step 1 — Company Information</h2>
              <span className="bezent-caption">
                Specify legal entity details, primary location, and business contact information.
              </span>
            </Stack>

            <Alert variant="info" title="Tenant ID will be generated automatically.">
              Tenant ID will be generated automatically. Immutable system identifier assigned by the platform backend upon creation. A designated Primary Company will be created inside this new customer tenant.
            </Alert>

            {/* Section A: Company Identity */}
            <Stack gap="md">
              <h3 className="bezent-heading-sm">Company Identity</h3>
              <Grid columns={2} gap="md">
                <Input
                  label="Legal Company Name *"
                  placeholder="e.g. Acme Corporation Pvt Ltd"
                  value={companyData.legalName}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, legalName: e.target.value });
                    invalidatePreflight();
                  }}
                  error={companyErrors.legalName}
                  required
                />
                <Input
                  label="Display Name *"
                  placeholder="e.g. Acme Corp"
                  value={companyData.displayName}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, displayName: e.target.value });
                    invalidatePreflight();
                  }}
                  error={companyErrors.displayName}
                  required
                />
                <Input
                  label="Business Email *"
                  type="email"
                  placeholder="admin@acme.com"
                  value={companyData.businessEmail}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, businessEmail: e.target.value });
                    invalidatePreflight();
                  }}
                  error={companyErrors.businessEmail}
                  required
                />
                <Input
                  label="Contact Phone"
                  type="tel"
                  placeholder="+1-555-0100"
                  value={companyData.contactPhone || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, contactPhone: e.target.value });
                    invalidatePreflight();
                  }}
                />
                <Input
                  label="Website URL"
                  type="url"
                  placeholder="https://acme.com"
                  value={companyData.website || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, website: e.target.value });
                    invalidatePreflight();
                  }}
                />
                <Select
                  label="Company Size"
                  value={companyData.companySize || '11-50'}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, companySize: e.target.value });
                    invalidatePreflight();
                  }}
                  options={[
                    { value: '1-10', label: '1–10 employees' },
                    { value: '11-50', label: '11–50 employees' },
                    { value: '51-200', label: '51–200 employees' },
                    { value: '201-500', label: '201–500 employees' },
                    { value: '501-1000', label: '501–1,000 employees' },
                    { value: '1000+', label: '1,000+ enterprise employees' },
                  ]}
                />
              </Grid>
            </Stack>

            {/* Section B: Location & Timezone */}
            <Stack gap="md">
              <h3 className="bezent-heading-sm">Location & Regional Settings</h3>
              <Grid columns={2} gap="md">
                <Input
                  label="Country *"
                  placeholder="e.g. United States, India, Germany"
                  value={companyData.country}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, country: e.target.value });
                    invalidatePreflight();
                  }}
                  error={companyErrors.country}
                  required
                />
                <Select
                  label="IANA Timezone *"
                  value={companyData.timeZone}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, timeZone: e.target.value });
                    invalidatePreflight();
                  }}
                  error={companyErrors.timeZone}
                  options={COMMON_TIMEZONES}
                />
                <Input
                  label="City"
                  placeholder="e.g. New York, Chennai"
                  value={companyData.city || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, city: e.target.value });
                    invalidatePreflight();
                  }}
                />
                <Input
                  label="State / Province"
                  placeholder="e.g. California, Tamil Nadu"
                  value={companyData.state || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, state: e.target.value });
                    invalidatePreflight();
                  }}
                />
                <Input
                  label="Address Line 1"
                  placeholder="Street address or building"
                  value={companyData.address || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, address: e.target.value });
                    invalidatePreflight();
                  }}
                />
                <Input
                  label="Postal Code"
                  placeholder="e.g. 10001, 600001"
                  value={companyData.postalCode || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, postalCode: e.target.value });
                    invalidatePreflight();
                  }}
                />
              </Grid>
            </Stack>

            {/* Section C: Registration & Tax Numbers */}
            <Stack gap="md">
              <h3 className="bezent-heading-sm">Corporate Identifiers</h3>
              <Grid columns={2} gap="md">
                <Input
                  label="Registration Number"
                  placeholder="CIN / Commercial registration identifier"
                  value={companyData.registrationNumber || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, registrationNumber: e.target.value });
                    invalidatePreflight();
                  }}
                />
                <Input
                  label="Tax Identifier (GSTIN / EIN / VAT)"
                  placeholder="Corporate tax number"
                  value={companyData.taxIdentifier || ''}
                  onChange={(e) => {
                    setCompanyData({ ...companyData, taxIdentifier: e.target.value });
                    invalidatePreflight();
                  }}
                />
              </Grid>
            </Stack>

            {/* Step Navigation Actions */}
            <Toolbar
              right={
                <Inline gap="sm">
                  <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleValidateStep1}>
                    Continue to Primary Administrator →
                  </Button>
                </Inline>
              }
            />
          </Stack>
        </Card>
      )}

      {/* ── STEP 2: PRIMARY ADMINISTRATOR ───────────────────────────────── */}
      {currentStep === 2 && (
        <Card>
          <Stack gap="lg">
            <Stack gap="xs">
              <h2 className="bezent-heading-md">Step 2 — Primary Administrator</h2>
              <span className="bezent-caption">
                Invite the person who will manage this customer&apos;s company and application access.
              </span>
            </Stack>

            <Alert variant="info" title="Passwordless Email OTP Security (72-Hour Validity)">
              An invitation will be sent to this email address after the tenant is created. The administrator must sign in and accept the invitation before receiving access. Invitation validity: 72 hours. No temporary passwords are used.
            </Alert>

            <Grid columns={2} gap="md">
              <Input
                label="Full Name *"
                placeholder="e.g. Jane Doe"
                value={adminData.fullName}
                onChange={(e) => {
                  setAdminData({ ...adminData, fullName: e.target.value });
                  invalidatePreflight();
                }}
                error={adminErrors.fullName}
                required
              />
              <Input
                label="Work Email Address *"
                type="email"
                placeholder="admin@acme.com"
                value={adminData.workEmail}
                onChange={(e) => {
                  setAdminData({ ...adminData, workEmail: e.target.value });
                  invalidatePreflight();
                }}
                error={adminErrors.workEmail}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1-555-0100"
                value={adminData.phone || ''}
                onChange={(e) => {
                  setAdminData({ ...adminData, phone: e.target.value });
                  invalidatePreflight();
                }}
              />
              <Input
                label="Job Title"
                placeholder="e.g. VP of Human Resources, Managing Director"
                value={adminData.jobTitle || ''}
                onChange={(e) => {
                  setAdminData({ ...adminData, jobTitle: e.target.value });
                  invalidatePreflight();
                }}
              />
            </Grid>

            {/* Step Navigation Actions */}
            <Toolbar
              left={
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                  ← Back to Company Info
                </Button>
              }
              right={
                <Inline gap="sm">
                  <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleValidateStep2}>
                    Continue to Applications & Subscriptions →
                  </Button>
                </Inline>
              }
            />
          </Stack>
        </Card>
      )}

      {/* ── STEP 3: APPLICATIONS & SUBSCRIPTIONS ─────────────────────────── */}
      {currentStep === 3 && (
        <Card>
          <Stack gap="lg">
            <Stack gap="xs">
              <h2 className="bezent-heading-md">Step 3 — Applications & Subscriptions</h2>
              <span className="bezent-caption">
                Choose which BEZENT Applications this customer can access and configure their subscriptions.
              </span>
            </Stack>

            {!selectedApps.hrms && !selectedApps.crm && !selectedApps.project_management && (
              <Alert variant="warning" title="No Applications Selected">
                You can create this tenant without enabling applications. Applications can be configured later. The customer tenant will remain in Pending Setup state.
              </Alert>
            )}

            {loadingPlans && <LoadingState label="Loading commercial plan catalog..." />}

            {!loadingPlans && (
              <Stack gap="md">
                {renderAppSubscriptionCard(
                  'hrms',
                  'Human Resource Management System (HRMS)',
                  'Workforce directories, attendance, leave, dynamic onboarding, and employee self-service.',
                  'organization',
                  hrmsPlans,
                )}
                {renderAppSubscriptionCard(
                  'crm',
                  'Customer Relationship Management (CRM)',
                  'Pipelines, deal tracking, lead lifecycle, customer contacts, and account executives.',
                  'users',
                  crmPlans,
                )}
                {renderAppSubscriptionCard(
                  'project_management',
                  'Project Management (PM)',
                  'Task boards, milestone planning, sprint allocation, project budgets, and burndowns.',
                  'checklist',
                  pmPlans,
                )}
              </Stack>
            )}

            {/* Step Navigation Actions */}
            <Toolbar
              left={
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  ← Back to Primary Admin
                </Button>
              }
              right={
                <Inline gap="sm">
                  <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleValidateStep3}>
                    Review & Preflight Validation →
                  </Button>
                </Inline>
              }
            />
          </Stack>
        </Card>
      )}

      {/* ── STEP 4: REVIEW & CREATE ─────────────────────────────────────── */}
      {currentStep === 4 && (
        <Card>
          <Stack gap="lg">
            <Stack gap="xs">
              <h2 className="bezent-heading-md">Step 4 — Review & Create</h2>
              <span className="bezent-caption">
                Review the customer setup, server preflight validation, and transactional provisioning details.
              </span>
            </Stack>

            {/* Server Preflight Alert Area */}
            {preflightLoading && <LoadingState label="Executing server-side preflight validation..." />}

            {preflightError && !submitError && (
              <Alert variant="error" title="Preflight Validation Failed" onDismiss={() => setPreflightError(null)}>
                {preflightError}
              </Alert>
            )}

            {preflightResult && (
              <Alert
                variant={preflightResult.valid ? 'success' : 'warning'}
                title={preflightResult.valid ? 'Preflight Verification Passed' : 'Preflight Warnings'}
              >
                {preflightResult.warnings.length > 0 ? (
                  <Stack gap="xs">
                    {preflightResult.warnings.map((w, i) => (
                      <span key={i}>• {w}</span>
                    ))}
                  </Stack>
                ) : (
                  'All company, administrator, subscription, and tenant boundary constraints verified successfully.'
                )}
              </Alert>
            )}

            {submitError && (
              <Alert variant="error" title="Creation Error" onDismiss={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}

            {/* Section 1: Company Review */}
            <Card variant="flat" padding="md">
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">1. Company Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                    Edit Company
                  </Button>
                </Inline>
                <Grid columns={3} gap="sm">
                  <div>
                    <span className="bezent-caption">Legal Name:</span>
                    <div><strong>{companyData.legalName}</strong></div>
                  </div>
                  <div>
                    <span className="bezent-caption">Display Name:</span>
                    <div><strong>{companyData.displayName}</strong></div>
                  </div>
                  <div>
                    <span className="bezent-caption">Business Email:</span>
                    <div><strong>{companyData.businessEmail}</strong></div>
                  </div>
                  <div>
                    <span className="bezent-caption">Country & Timezone:</span>
                    <div>{companyData.country} ({companyData.timeZone})</div>
                  </div>
                  <div>
                    <span className="bezent-caption">Company Size:</span>
                    <div>{companyData.companySize || 'Not specified'}</div>
                  </div>
                  <div>
                    <span className="bezent-caption">Tenant ID:</span>
                    <div><em>Server-generated automatically</em></div>
                  </div>
                </Grid>
              </Stack>
            </Card>

            {/* Section 2: Primary Admin Review */}
            <Card variant="flat" padding="md">
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">2. Primary Administrator</h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                    Edit Administrator
                  </Button>
                </Inline>
                <Grid columns={3} gap="sm">
                  <div>
                    <span className="bezent-caption">Administrator:</span>
                    <div><strong>{adminData.fullName}</strong></div>
                  </div>
                  <div>
                    <span className="bezent-caption">Work Email:</span>
                    <div><strong>{adminData.workEmail}</strong></div>
                  </div>
                  <div>
                    <span className="bezent-caption">Invitation Validity:</span>
                    <div>72 Hours (Passwordless OTP)</div>
                  </div>
                </Grid>
              </Stack>
            </Card>

            {/* Section 3: Applications & Subscriptions Review */}
            <Card variant="flat" padding="md">
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <h3 className="bezent-heading-sm">3. Applications & Subscriptions</h3>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                    Edit Applications
                  </Button>
                </Inline>

                {!selectedApps.hrms && !selectedApps.crm && !selectedApps.project_management ? (
                  <span className="bezent-caption">Zero applications selected (Tenant will require setup later)</span>
                ) : (
                  <Stack gap="md">
                    {(['hrms', 'crm', 'project_management'] as const).map((appCode) => {
                      if (!selectedApps[appCode]) return null;
                      const cfg = subscriptionsConfig[appCode];
                      const plan = availablePlans.find((p) => p.id === cfg.planId);
                      const agreementNotes = commercialAgreementNotesByApp[appCode];
                      const selectedMods = selectedModulesByApp[appCode];
                      const eligibleMods = eligibleModulesByApp[appCode];
                      const overrides = moduleOverridesByApp[appCode];

                      return (
                        <Card key={appCode} variant="flat" padding="sm">
                          <Stack gap="xs">
                            <Inline justify="between" align="center">
                              <Inline gap="sm" align="center">
                                <Badge variant={appCode === 'hrms' ? 'info' : 'neutral'}>
                                  {appCode === 'hrms' ? 'HRMS' : appCode === 'crm' ? 'CRM' : 'PM'}
                                </Badge>
                                <strong>{plan?.name || cfg.planId}</strong>
                                <Badge variant="neutral" size="sm">{plan?.tier || 'Standard'}</Badge>
                              </Inline>
                              <Inline gap="md" align="center">
                                <span>Seats: <strong>{cfg.licensedSeats}</strong></span>
                                <span>Mode: <strong>{cfg.accessMode.toUpperCase()}</strong></span>
                                <span>Billing: {cfg.billingCycle}</span>
                              </Inline>
                            </Inline>

                            {agreementNotes && (
                              <span className="bezent-caption">
                                Commercial Agreement: <em>&quot;{agreementNotes}&quot;</em>
                              </span>
                            )}

                            {selectedMods.length > 0 && (
                              <Stack gap="xs">
                                <span className="bezent-caption">
                                  <strong>Selected Modules ({selectedMods.length}):</strong>
                                </span>
                                <Inline gap="xs" wrap>
                                  {selectedMods.map((modKey) => {
                                    const modDef = eligibleMods.find((m) => m.moduleKey === modKey);
                                    const isMandatory = modDef?.isMandatory;
                                    const isOverride = overrides.some((o) => o.moduleCode === modKey);
                                    return (
                                      <Badge
                                        key={modKey}
                                        variant={isMandatory ? 'info' : isOverride ? 'warning' : 'success'}
                                        size="sm"
                                      >
                                        {modDef?.name || modKey}{isOverride ? ' (Override)' : ''}
                                      </Badge>
                                    );
                                  })}
                                </Inline>
                              </Stack>
                            )}

                            {overrides.length > 0 && (
                              <Stack gap="xs">
                                <span className="bezent-caption">
                                  <strong>Authorized Overrides ({overrides.length}):</strong>
                                </span>
                                {overrides.map((ovr) => {
                                  const modDef = eligibleMods.find((m) => m.moduleKey === ovr.moduleCode);
                                  return (
                                    <span key={ovr.moduleCode} className="bezent-caption">
                                      • <strong>{modDef?.name || ovr.moduleCode}</strong>: {ovr.overrideType.toUpperCase()} — &quot;{ovr.reason}&quot;
                                    </span>
                                  );
                                })}
                              </Stack>
                            )}
                          </Stack>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Card>

            {/* Section 4: Transactional Provisioning Summary */}
            <Card variant="flat" padding="md">
              <Stack gap="xs">
                <h3 className="bezent-heading-sm">4. Transactional Commitment Notice</h3>
                <span className="bezent-caption">
                  Clicking &quot;Create Tenant&quot; executes an atomic transaction. Tenant, Primary Company, Subscriptions, Outbox invitation, and initial provisioning jobs are created concurrently. No plaintext passwords or raw tokens are stored.
                </span>
              </Stack>
            </Card>

            {/* Step Navigation Actions */}
            <Toolbar
              left={
                <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                  ← Back to Subscriptions
                </Button>
              }
              right={
                <Inline gap="sm">
                  <Button variant="secondary" onClick={() => navigate('/super-admin/tenants')}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={isSubmitting || preflightLoading || (Boolean(preflightResult) && !preflightResult?.valid)}
                    onClick={handleFinalSubmit}
                  >
                    {isSubmitting ? 'Creating Tenant...' : 'Create Tenant'}
                  </Button>
                </Inline>
              }
            />
          </Stack>
        </Card>
      )}

      {/* ── STEP 5: SUCCESS STATE ───────────────────────────────────────── */}
      {currentStep === 5 && creationResult && (
        <Card>
          <Stack gap="lg" align="center">
            <BezentIcon name="check" size={48} color="#0d9488" />
            <Stack gap="xs" align="center">
              <h2 className="bezent-heading-lg">Tenant Created Successfully</h2>
              <span className="bezent-caption">
                Customer organization has been atomically provisioned in the BEZENT ecosystem.
              </span>
            </Stack>

            <Card variant="flat" padding="md">
              <Grid columns={2} gap="md">
                <div>
                  <span className="bezent-caption">Tenant ID:</span>
                  <div><code>{creationResult.tenantId}</code></div>
                </div>
                <div>
                  <span className="bezent-caption">Tenant Code:</span>
                  <div><strong>{creationResult.tenantCode}</strong></div>
                </div>
                <div>
                  <span className="bezent-caption">Primary Company ID:</span>
                  <div><code>{creationResult.primaryCompanyId}</code></div>
                </div>
                <div>
                  <span className="bezent-caption">Setup State:</span>
                  <div>
                    <Badge variant="info">
                      {creationResult.businessSetupState === 'pending_setup' ? 'Pending Setup' : 'Pending Admin Acceptance'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="bezent-caption">Primary Administrator:</span>
                  <div><strong>{creationResult.invitation.email}</strong></div>
                </div>
                <div>
                  <span className="bezent-caption">Invitation Status:</span>
                  <div>
                    <Badge variant="warning">Queued (72-hour validity)</Badge>
                  </div>
                </div>
                <div>
                  <span className="bezent-caption">Provisioning Job:</span>
                  <div>
                    <Badge variant="neutral">Pending Asynchronous Worker</Badge>
                  </div>
                </div>
                <div>
                  <span className="bezent-caption">Active Subscriptions:</span>
                  <div>{creationResult.subscriptions.length} Application(s)</div>
                </div>
              </Grid>
            </Card>

            <Alert variant="info" title="Next Steps">
              The primary administrator invitation email has been enqueued in the transactional outbox. Once the administrator verifies their email via OTP, their Company Admin workspace access will be unlocked.
            </Alert>

            <Inline gap="md" justify="center">
              <Button
                variant="primary"
                onClick={() => navigate('/super-admin/tenants')}
              >
                Back to All Tenants
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/super-admin/tenants/${creationResult.tenantId}`)}
              >
                View Tenant Details
              </Button>
            </Inline>
          </Stack>
        </Card>
      )}

      {/* ── AUTHORIZED MODULE OVERRIDE MODAL ────────────────────────────── */}
      {overrideModal.isOpen && (
        <Modal
          isOpen={overrideModal.isOpen}
          onClose={() => setOverrideModal((prev) => ({ ...prev, isOpen: false, error: null }))}
          title={`Authorize Override: ${overrideModal.moduleName}`}
          footer={
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                onClick={() =>
                  setOverrideModal((prev) => ({ ...prev, isOpen: false, error: null }))
                }
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveOverride}>
                Grant Authorized Override
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <Alert variant="warning" title="Privileged Super Admin Action">
              This module is not included in the customer&apos;s selected subscription plan tier.
              Granting access requires Super Admin authorization, a valid commercial or technical
              reason, and will be logged in permanent audit history.
            </Alert>
            <Input
              label="Authorized Reason (Required) *"
              placeholder="e.g. Approved pilot feature by VP Sales, addendum contract #981"
              value={overrideModal.reason}
              onChange={(e) =>
                setOverrideModal((prev) => ({ ...prev, reason: e.target.value, error: null }))
              }
              error={overrideModal.error || undefined}
              required
            />
          </Stack>
        </Modal>
      )}
    </Page>
  );
}
export default CreateTenantPage;
