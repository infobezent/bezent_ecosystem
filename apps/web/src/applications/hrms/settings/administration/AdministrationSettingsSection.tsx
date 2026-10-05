import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useInRouterContext, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  LoadingState,
  PageHeader,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { useOptionalAuth } from '../../../../platform/auth';
import {
  EmployeeRegistrationFormConfiguration,
  FormsLanding,
  type SystemFormId,
} from './forms/FormsSettings';
import { GeneralSettingsSection } from './onboarding/GeneralSettingsSection';
import { StagesSection } from './onboarding/StagesSection';
import { ChecklistsSection } from './onboarding/ChecklistsSection';
import { DocumentsSection } from './onboarding/DocumentsSection';
import { ConversionSection } from './onboarding/ConversionSection';
import { EmployeeConfigurationSection } from './employee-configuration/EmployeeConfigurationSection';
import {
  fetchChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  fetchDocumentRequirements,
  createDocumentRequirement,
  updateDocumentRequirement,
  deleteDocumentRequirement,
  fetchConversionSettings,
  updateConversionSettings,
} from '../api/onboardingSettingsApi';
import type {
  OnboardingGeneralSettings,
  OnboardingStageConfig,
  OnboardingChecklistTemplate,
  CreateOnboardingChecklistTemplateDto,
  UpdateOnboardingChecklistTemplateDto,
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
  OnboardingConversionSettings,
  UpdateOnboardingConversionSettingsDto,
} from '../types/settings';

export type AdministrationSettingsTab = 'forms' | 'onboarding' | 'employee-configuration';

/** Administration settings primary tabs: Forms, Onboarding, Employee Configuration. */
export const ADMINISTRATION_SETTINGS_TABS: {
  id: AdministrationSettingsTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'forms',
    label: 'Forms',
    icon: <BezentIcon name="document" size={18} />,
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    icon: <BezentIcon name="onboarding" size={18} />,
  },
  {
    id: 'employee-configuration',
    label: 'Employee Configuration',
    icon: <BezentIcon name="settings" size={18} />,
  },
];

export type OnboardingSecondarySection =
  'general' | 'stages' | 'checklists' | 'documents' | 'conversion';

/** Onboarding secondary navigation sections per architectural requirements. */
export const ONBOARDING_SECONDARY_SECTIONS: {
  id: OnboardingSecondarySection;
  label: string;
}[] = [
  { id: 'general', label: 'General' },
  { id: 'stages', label: 'Stages' },
  { id: 'checklists', label: 'Checklist Templates' },
  { id: 'documents', label: 'Document Requirements' },
  { id: 'conversion', label: 'Conversion' },
];

function ChecklistsWorkspace() {
  const [checklists, setChecklists] = useState<OnboardingChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchChecklistTemplates();
      setChecklists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (payload: CreateOnboardingChecklistTemplateDto) => {
    await createChecklistTemplate(payload);
    await loadData();
  };

  const handleUpdate = async (id: string, payload: UpdateOnboardingChecklistTemplateDto) => {
    await updateChecklistTemplate(id, payload);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteChecklistTemplate(id);
    await loadData();
  };

  if (loading) {
    return <LoadingState label="Loading checklist templates..." />;
  }

  if (error) {
    return (
      <Card variant="flat" padding="lg">
        <Stack gap="md" align="center">
          <Alert variant="danger">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={loadData} type="button">
            Retry
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <ChecklistsSection
      checklists={checklists}
      onCreateChecklist={handleCreate}
      onUpdateChecklist={handleUpdate}
      onDeleteChecklist={handleDelete}
    />
  );
}

function DocumentsWorkspace() {
  const [documents, setDocuments] = useState<OnboardingDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDocumentRequirements();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document requirements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (payload: CreateOnboardingDocumentRequirementDto) => {
    await createDocumentRequirement(payload);
    await loadData();
  };

  const handleUpdate = async (id: string, payload: UpdateOnboardingDocumentRequirementDto) => {
    await updateDocumentRequirement(id, payload);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteDocumentRequirement(id);
    await loadData();
  };

  if (loading) {
    return <LoadingState label="Loading document requirements..." />;
  }

  if (error) {
    return (
      <Card variant="flat" padding="lg">
        <Stack gap="md" align="center">
          <Alert variant="danger">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={loadData} type="button">
            Retry
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <DocumentsSection
      documents={documents}
      onCreateDocument={handleCreate}
      onUpdateDocument={handleUpdate}
      onDeleteDocument={handleDelete}
    />
  );
}

function ConversionWorkspace() {
  const [conversionSettings, setConversionSettings] = useState<OnboardingConversionSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConversionSettings();
      setConversionSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversion settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (payload: UpdateOnboardingConversionSettingsDto) => {
    setSaving(true);
    try {
      const updated = await updateConversionSettings(payload);
      setConversionSettings(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading conversion settings..." />;
  }

  if (error) {
    return (
      <Card variant="flat" padding="lg">
        <Stack gap="md" align="center">
          <Alert variant="danger">{error}</Alert>
          <Button variant="secondary" size="sm" onClick={loadData} type="button">
            Retry
          </Button>
        </Stack>
      </Card>
    );
  }

  return <ConversionSection initialData={conversionSettings} onSave={handleSave} saving={saving} />;
}

export interface AdministrationSettingsSectionProps {
  onBack?: () => void;
  onNavigate?: ((path: string) => void) | null;
  initialTab?: AdministrationSettingsTab;
  initialSecondarySection?: OnboardingSecondarySection;
  onTabChange?: (tab: AdministrationSettingsTab) => void;
  onSecondarySectionChange?: (section: OnboardingSecondarySection) => void;
  initialOnboardingSettings?: OnboardingGeneralSettings | null;
  initialStages?: OnboardingStageConfig[];
}

export function AdministrationSettingsSectionInner({
  onBack,
  onNavigate,
  initialTab,
  initialSecondarySection,
  onTabChange,
  onSecondarySectionChange,
  initialOnboardingSettings,
  initialStages,
}: AdministrationSettingsSectionProps) {
  const auth = useOptionalAuth();
  const activeCompany = auth?.activeCompany ?? null;
  const [tab, setTab] = useState<AdministrationSettingsTab>(initialTab ?? 'forms');
  const [secondarySection, setSecondarySection] = useState<OnboardingSecondarySection>(
    initialSecondarySection ?? 'general',
  );
  const [openForm, setOpenForm] = useState<SystemFormId | null>(null);

  const handleConfigure = (formId: SystemFormId) => {
    if (onNavigate) {
      onNavigate(`/hrms/settings/forms/${formId}`);
    } else {
      setOpenForm(formId);
    }
  };

  const handleTabChange = (newTab: AdministrationSettingsTab) => {
    setTab(newTab);
    setOpenForm(null);
    onTabChange?.(newTab);
  };

  const handleSecondarySectionChange = (section: OnboardingSecondarySection) => {
    setSecondarySection(section);
    onSecondarySectionChange?.(section);
  };

  return (
    <Stack gap="lg">
      {/* Top Utility Row */}
      <Toolbar
        left={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BezentIcon name="arrowLeft" size={14} />}
            onClick={onBack ?? (() => {})}
            aria-label="Back to Settings"
          >
            Back to Settings
          </Button>
        }
        right={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<BezentIcon name="accounts" size={14} />}
            rightIcon={<BezentIcon name="chevronDown" size={14} />}
            aria-label={`Current company: ${activeCompany?.companyName ?? 'No company selected'}`}
            type="button"
          >
            {activeCompany?.companyName ?? 'No company selected'}
          </Button>
        }
      />

      {/* Primary Administration Header */}
      <PageHeader
        title="Administration"
        subtitle="Configure employee administration and onboarding settings."
      />

      {/* Primary Administration Tabs */}
      <Tabs
        variant="underline"
        activeId={tab}
        onChange={(id) => handleTabChange(id as AdministrationSettingsTab)}
        items={ADMINISTRATION_SETTINGS_TABS}
      />

      {/* Tab 1: Forms Workspace */}
      {tab === 'forms' &&
        (openForm === 'employee-registration' ? (
          <EmployeeRegistrationFormConfiguration onBack={() => setOpenForm(null)} />
        ) : (
          <FormsLanding onConfigure={handleConfigure} />
        ))}

      {/* Tab 2: Onboarding Workspace with Secondary Navigation */}
      {tab === 'onboarding' && (
        <Stack gap="lg">
          {/* Secondary Navigation under Onboarding per Section 3 */}
          <Tabs
            variant="underline"
            activeId={secondarySection}
            onChange={(id) => handleSecondarySectionChange(id as OnboardingSecondarySection)}
            items={ONBOARDING_SECONDARY_SECTIONS}
          />

          {/* Secondary Content Area */}
          {secondarySection === 'general' && (
            <GeneralSettingsSection initialData={initialOnboardingSettings} />
          )}

          {secondarySection === 'stages' && <StagesSection initialStages={initialStages} />}

          {secondarySection === 'checklists' && <ChecklistsWorkspace />}

          {secondarySection === 'documents' && <DocumentsWorkspace />}

          {secondarySection === 'conversion' && <ConversionWorkspace />}
        </Stack>
      )}

      {/* Tab 3: Employee Configuration Safe Placeholder */}
      {tab === 'employee-configuration' && <EmployeeConfigurationSection />}
    </Stack>
  );
}

function RoutedAdministrationSettingsSection({
  onBack,
  onNavigate: explicitNavigate,
  initialTab,
  initialSecondarySection,
  initialOnboardingSettings,
  initialStages,
}: AdministrationSettingsSectionProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawSubParam = searchParams.get('sub');
  const tabParam = searchParams.get('tab') as AdministrationSettingsTab | null;

  const validTabs: AdministrationSettingsTab[] = ['forms', 'onboarding', 'employee-configuration'];
  const validSubs: OnboardingSecondarySection[] = [
    'general',
    'stages',
    'checklists',
    'documents',
    'conversion',
  ];
  const validEmployeeConfigSubs = ['numbering', 'designations', 'job-levels'];

  const isEmpConfigSub = rawSubParam && validEmployeeConfigSubs.includes(rawSubParam);
  const isOnboardingSub =
    rawSubParam && validSubs.includes(rawSubParam as OnboardingSecondarySection);

  const resolvedInitialTab: AdministrationSettingsTab =
    initialTab ??
    (isEmpConfigSub
      ? 'employee-configuration'
      : isOnboardingSub
        ? 'onboarding'
        : tabParam && validTabs.includes(tabParam)
          ? tabParam
          : 'forms');

  const resolvedInitialSecondary: OnboardingSecondarySection =
    initialSecondarySection ??
    (isOnboardingSub ? (rawSubParam as OnboardingSecondarySection) : 'general');

  const handleBack = onBack ?? (() => navigate('/hrms/settings'));
  const handleNavigate = explicitNavigate ?? ((path: string) => navigate(path));

  const handleTabChange = (newTab: AdministrationSettingsTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', newTab);
        if (newTab !== 'onboarding' && newTab !== 'employee-configuration') {
          next.delete('sub');
        }
        return next;
      },
      { replace: true },
    );
  };

  const handleSecondarySectionChange = (section: OnboardingSecondarySection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'onboarding');
        next.set('sub', section);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <AdministrationSettingsSectionInner
      onBack={handleBack}
      onNavigate={handleNavigate}
      initialTab={resolvedInitialTab}
      initialSecondarySection={resolvedInitialSecondary}
      onTabChange={handleTabChange}
      onSecondarySectionChange={handleSecondarySectionChange}
      initialOnboardingSettings={initialOnboardingSettings}
      initialStages={initialStages}
    />
  );
}

export function AdministrationSettingsSection({
  onBack,
  onNavigate,
  initialTab,
  initialSecondarySection,
  onTabChange,
  onSecondarySectionChange,
  initialOnboardingSettings,
  initialStages,
}: AdministrationSettingsSectionProps = {}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <RoutedAdministrationSettingsSection
        onBack={onBack}
        onNavigate={onNavigate}
        initialTab={initialTab}
        initialSecondarySection={initialSecondarySection}
        initialOnboardingSettings={initialOnboardingSettings}
        initialStages={initialStages}
      />
    );
  }
  return (
    <AdministrationSettingsSectionInner
      onBack={onBack}
      onNavigate={onNavigate ?? null}
      initialTab={initialTab}
      initialSecondarySection={initialSecondarySection}
      onTabChange={onTabChange}
      onSecondarySectionChange={onSecondarySectionChange}
      initialOnboardingSettings={initialOnboardingSettings}
      initialStages={initialStages}
    />
  );
}
