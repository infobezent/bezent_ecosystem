import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import { useDevContext } from '../../../../platform/context/DevContext';
import {
  fetchAggregateSettings,
  initializeSettings,
  updateGeneralSettings,
  updateStageConfig,
  updateFieldConfig,
  createDocumentRequirement,
  updateDocumentRequirement,
  deleteDocumentRequirement,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  updateConversionSettings,
} from '../api/onboardingSettingsApi';
import type {
  OnboardingSettingsAggregate,
  UpdateOnboardingGeneralSettingsDto,
  UpdateOnboardingStageConfigDto,
  UpdateOnboardingFieldConfigDto,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
  CreateOnboardingChecklistTemplateDto,
  UpdateOnboardingChecklistTemplateDto,
  UpdateOnboardingConversionSettingsDto,
} from '../types/settings';
import { GeneralSettingsSection } from '../components/GeneralSettingsSection';
import { StagesSection } from '../components/StagesSection';
import { FieldsSection } from '../components/FieldsSection';
import { DocumentsSection } from '../components/DocumentsSection';
import { ChecklistsSection } from '../components/ChecklistsSection';
import { ConversionSection } from '../components/ConversionSection';
import './SettingsPage.css';

export type SettingsSectionId =
  'general' | 'stages' | 'fields' | 'documents' | 'checklists' | 'conversion';

interface TabItem {
  id: SettingsSectionId;
  label: string;
  icon: string;
}

const TABS: TabItem[] = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'stages', label: 'Stages', icon: 'onboarding' },
  { id: 'fields', label: 'Fields', icon: 'edit' },
  { id: 'documents', label: 'Documents', icon: 'documents' },
  { id: 'checklists', label: 'Checklists', icon: 'tasks' },
  { id: 'conversion', label: 'Employee Conversion', icon: 'employees' },
];

export function SettingsPage() {
  const devContext = useDevContext();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const [settings, setSettings] = useState<OnboardingSettingsAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAggregateSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleInitialize = async () => {
    setInitializing(true);
    setError(null);
    try {
      const data = await initializeSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize default settings');
    } finally {
      setInitializing(false);
    }
  };

  // General Save
  const handleSaveGeneral = async (payload: UpdateOnboardingGeneralSettingsDto) => {
    setSaving(true);
    try {
      const updated = await updateGeneralSettings(payload);
      setSettings((prev) => (prev ? { ...prev, general: updated } : prev));
    } finally {
      setSaving(false);
    }
  };

  // Stage Update
  const handleUpdateStage = async (stageKey: string, payload: UpdateOnboardingStageConfigDto) => {
    const updated = await updateStageConfig(stageKey, payload);
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stages: prev.stages.map((s) => (s.stageKey === stageKey ? updated : s)),
      };
    });
  };

  // Field Update
  const handleUpdateField = async (fieldKey: string, payload: UpdateOnboardingFieldConfigDto) => {
    const updated = await updateFieldConfig(fieldKey, payload);
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.fieldKey === fieldKey ? updated : f)),
      };
    });
  };

  // Document CRUD
  const handleCreateDocument = async (payload: CreateOnboardingDocumentRequirementDto) => {
    const created = await createDocumentRequirement(payload);
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, documents: [...prev.documents, created] };
    });
  };

  const handleUpdateDocument = async (
    id: string,
    payload: UpdateOnboardingDocumentRequirementDto,
  ) => {
    const updated = await updateDocumentRequirement(id, payload);
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        documents: prev.documents.map((d) => (d.id === id ? updated : d)),
      };
    });
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocumentRequirement(id);
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, documents: prev.documents.filter((d) => d.id !== id) };
    });
  };

  // Checklist CRUD
  const handleCreateChecklist = async (payload: CreateOnboardingChecklistTemplateDto) => {
    const created = await createChecklistTemplate(payload);
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, checklists: [...prev.checklists, created] };
    });
  };

  const handleUpdateChecklist = async (
    id: string,
    payload: UpdateOnboardingChecklistTemplateDto,
  ) => {
    const updated = await updateChecklistTemplate(id, payload);
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklists: prev.checklists.map((c) => (c.id === id ? updated : c)),
      };
    });
  };

  const handleDeleteChecklist = async (id: string) => {
    await deleteChecklistTemplate(id);
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, checklists: prev.checklists.filter((c) => c.id !== id) };
    });
  };

  // Conversion Save
  const handleSaveConversion = async (payload: UpdateOnboardingConversionSettingsDto) => {
    setSaving(true);
    try {
      const updated = await updateConversionSettings(payload);
      setSettings((prev) => (prev ? { ...prev, conversion: updated } : prev));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      {/* Header */}
      <header className="settings-page__header">
        <div className="settings-page__title-group">
          <div className="settings-page__title-row">
            <h1 className="settings-page__title">HR Settings</h1>
            <span className="settings-page__company-badge">
              <BezentIcon name="hrSettings" size={14} />
              {devContext.companyName}
            </span>
          </div>
          <p className="settings-page__subtitle">
            Configure system rules, candidate onboarding workflows, verification criteria, and
            defaults.
          </p>
        </div>
      </header>

      {/* Navigation Sub-Tabs */}
      <nav className="settings-page__domain-nav" aria-label="Settings Sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeSection === tab.id}
            className={`settings-page__domain-tab ${
              activeSection === tab.id ? 'settings-page__domain-tab--active' : ''
            }`}
            onClick={() => setActiveSection(tab.id)}
          >
            <BezentIcon name={tab.icon} size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Error state */}
      {error && (
        <div className="settings-alert settings-alert--error" role="alert">
          <BezentIcon name="warning" size={16} />
          <span>{error}</span>
          <Button variant="primary" type="button" onClick={loadSettings}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="settings-page__loading">Loading onboarding settings...</div>
      ) : !settings ? (
        <div className="settings-page__uninitialized">
          <BezentIcon name="hrSettings" size={48} />
          <h2 className="settings-page__uninit-title">No Settings Initialized</h2>
          <p className="settings-page__uninit-desc">
            Your company has not configured onboarding settings yet. Initialize the default stages,
            system fields, document requirements, and checklist templates to get started.
          </p>
          <Button
            variant="primary"
            type="button"
            disabled={initializing}
            onClick={handleInitialize}
          >
            {initializing ? 'Initializing Defaults...' : 'Initialize Onboarding Defaults'}
          </Button>
        </div>
      ) : (
        <main>
          {activeSection === 'general' && (
            <GeneralSettingsSection
              initialData={settings.general}
              onSave={handleSaveGeneral}
              saving={saving}
            />
          )}

          {activeSection === 'stages' && (
            <StagesSection stages={settings.stages} onUpdateStage={handleUpdateStage} />
          )}

          {activeSection === 'fields' && (
            <FieldsSection fields={settings.fields} onUpdateField={handleUpdateField} />
          )}

          {activeSection === 'documents' && (
            <DocumentsSection
              documents={settings.documents}
              onCreateDocument={handleCreateDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeSection === 'checklists' && (
            <ChecklistsSection
              checklists={settings.checklists}
              onCreateChecklist={handleCreateChecklist}
              onUpdateChecklist={handleUpdateChecklist}
              onDeleteChecklist={handleDeleteChecklist}
            />
          )}

          {activeSection === 'conversion' && (
            <ConversionSection
              initialData={settings.conversion}
              onSave={handleSaveConversion}
              saving={saving}
            />
          )}
        </main>
      )}
    </div>
  );
}

export default SettingsPage;
