import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Button,
  Card,
  LoadingState,
  Stack,
  Tabs,
} from '../../../../../design-system/components';
import { GeneralSettingsSection } from '../../administration/onboarding/GeneralSettingsSection';
import { StagesSection } from '../../administration/onboarding/StagesSection';
import { ChecklistsSection } from '../../administration/onboarding/ChecklistsSection';
import { DocumentsSection } from '../../administration/onboarding/DocumentsSection';
import { ConversionSection } from '../../administration/onboarding/ConversionSection';
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
} from '../../api/onboardingSettingsApi';
import type {
  OnboardingChecklistTemplate,
  CreateOnboardingChecklistTemplateDto,
  UpdateOnboardingChecklistTemplateDto,
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
  OnboardingConversionSettings,
  UpdateOnboardingConversionSettingsDto,
} from '../../types/settings';

export type OnboardingSubTab = 'stages' | 'checklists' | 'documents' | 'conversion' | 'timing';

export function OnboardingWorkflowsTab() {
  const [activeSubTab, setActiveSubTab] = useState<OnboardingSubTab>('stages');

  // Checklists state
  const [checklists, setChecklists] = useState<OnboardingChecklistTemplate[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  const [checklistsError, setChecklistsError] = useState<string | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<OnboardingDocumentRequirement[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

  // Conversion state
  const [conversionSettings, setConversionSettings] = useState<OnboardingConversionSettings | null>(
    null,
  );
  const [conversionLoading, setConversionLoading] = useState(false);
  const [conversionSaving, setConversionSaving] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const loadChecklists = useCallback(async () => {
    try {
      setChecklistsLoading(true);
      setChecklistsError(null);
      const data = await fetchChecklistTemplates();
      setChecklists(data);
    } catch (err) {
      setChecklistsError(err instanceof Error ? err.message : 'Failed to load checklists');
    } finally {
      setChecklistsLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      setDocumentsLoading(true);
      setDocumentsError(null);
      const data = await fetchDocumentRequirements();
      setDocuments(data);
    } catch (err) {
      setDocumentsError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  const loadConversion = useCallback(async () => {
    try {
      setConversionLoading(true);
      setConversionError(null);
      const data = await fetchConversionSettings();
      setConversionSettings(data);
    } catch (err) {
      setConversionError(err instanceof Error ? err.message : 'Failed to load conversion settings');
    } finally {
      setConversionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'checklists') loadChecklists();
    if (activeSubTab === 'documents') loadDocuments();
    if (activeSubTab === 'conversion') loadConversion();
  }, [activeSubTab, loadChecklists, loadDocuments, loadConversion]);

  const handleCreateChecklist = async (payload: CreateOnboardingChecklistTemplateDto) => {
    await createChecklistTemplate(payload);
    await loadChecklists();
  };

  const handleUpdateChecklist = async (
    id: string,
    payload: UpdateOnboardingChecklistTemplateDto,
  ) => {
    await updateChecklistTemplate(id, payload);
    await loadChecklists();
  };

  const handleDeleteChecklist = async (id: string) => {
    await deleteChecklistTemplate(id);
    await loadChecklists();
  };

  const handleCreateDocument = async (payload: CreateOnboardingDocumentRequirementDto) => {
    await createDocumentRequirement(payload);
    await loadDocuments();
  };

  const handleUpdateDocument = async (
    id: string,
    payload: UpdateOnboardingDocumentRequirementDto,
  ) => {
    await updateDocumentRequirement(id, payload);
    await loadDocuments();
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocumentRequirement(id);
    await loadDocuments();
  };

  const handleSaveConversion = async (payload: UpdateOnboardingConversionSettingsDto) => {
    setConversionSaving(true);
    try {
      const updated = await updateConversionSettings(payload);
      setConversionSettings(updated);
    } finally {
      setConversionSaving(false);
    }
  };

  const subTabs = [
    { id: 'stages', label: 'Pipeline Stages' },
    { id: 'checklists', label: 'Checklist Templates' },
    { id: 'documents', label: 'Document Requirements' },
    { id: 'conversion', label: 'Employee Conversion' },
    { id: 'timing', label: 'General Timing' },
  ];

  return (
    <Stack gap="lg">
      <Tabs
        items={subTabs}
        activeId={activeSubTab}
        onChange={(id) => setActiveSubTab(id as OnboardingSubTab)}
        variant="underline"
      />

      {activeSubTab === 'stages' && <StagesSection />}

      {activeSubTab === 'checklists' &&
        (checklistsLoading ? (
          <LoadingState label="Loading checklist templates..." />
        ) : checklistsError ? (
          <Card variant="flat" padding="lg">
            <Stack gap="md" align="center">
              <Alert variant="danger">{checklistsError}</Alert>
              <Button variant="secondary" size="sm" onClick={loadChecklists}>
                Retry
              </Button>
            </Stack>
          </Card>
        ) : (
          <ChecklistsSection
            checklists={checklists}
            onCreateChecklist={handleCreateChecklist}
            onUpdateChecklist={handleUpdateChecklist}
            onDeleteChecklist={handleDeleteChecklist}
          />
        ))}

      {activeSubTab === 'documents' &&
        (documentsLoading ? (
          <LoadingState label="Loading document requirements..." />
        ) : documentsError ? (
          <Card variant="flat" padding="lg">
            <Stack gap="md" align="center">
              <Alert variant="danger">{documentsError}</Alert>
              <Button variant="secondary" size="sm" onClick={loadDocuments}>
                Retry
              </Button>
            </Stack>
          </Card>
        ) : (
          <DocumentsSection
            documents={documents}
            onCreateDocument={handleCreateDocument}
            onUpdateDocument={handleUpdateDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        ))}

      {activeSubTab === 'conversion' &&
        (conversionLoading ? (
          <LoadingState label="Loading conversion settings..." />
        ) : conversionError ? (
          <Card variant="flat" padding="lg">
            <Stack gap="md" align="center">
              <Alert variant="danger">{conversionError}</Alert>
              <Button variant="secondary" size="sm" onClick={loadConversion}>
                Retry
              </Button>
            </Stack>
          </Card>
        ) : (
          <ConversionSection
            initialData={conversionSettings}
            onSave={handleSaveConversion}
            saving={conversionSaving}
          />
        ))}

      {activeSubTab === 'timing' && <GeneralSettingsSection />}
    </Stack>
  );
}
