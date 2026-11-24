import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useNavigate,
  useParams,
  useInRouterContext,
  type NavigateFunction,
} from 'react-router-dom';
import {
  Alert,
  Button,
  FormField,
  Inline,
  Input,
  LoadingState,
  Modal,
  Select,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchResolvedForm,
  saveFormDefinition,
  publishForm,
  FormsApiError,
  type ResolvedFormSection,
  type ResolvedFormField,
  type FormSectionInput,
  type FormFieldInput,
  type CandidateIntakeConfig,
  type ConditionalRule,
  type FieldPermissionRule,
  type FieldValidationRule,
  type CustomFieldType,
} from '../api/formsApi';
import { BuilderFieldToolbox } from './builder/BuilderFieldToolbox';
import { BuilderFormCanvas } from './builder/BuilderFormCanvas';
import { BuilderPropertiesPanel } from './builder/BuilderPropertiesPanel';
import { PublishConfirmationModal } from './builder/PublishConfirmationModal';
import { FormPreviewModal } from './builder/FormPreviewModal';
import { ManageSectionsModal } from './builder/ManageSectionsModal';

/** A 32-hex-char id matching the backend's required `custom.[a-f0-9]{32}` key pattern. */
function generateCustomFieldKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `custom.${hex}`;
}

const EMPTY_CONFIG: CandidateIntakeConfig = {
  formName: '',
  formDescription: '',
  hrManualEntryEnabled: true,
  candidateSelfServiceEnabled: true,
  allowSaveDraft: true,
  candidateEditingAfterSubmission: false,
  status: 'draft',
  publishedVersion: 0,
};

interface FormBuilderPageInnerProps {
  navigate: NavigateFunction | ((to: string) => void);
  formKey?: string;
}

function FormBuilderPageInner({
  navigate,
  formKey = 'employee-registration',
}: FormBuilderPageInnerProps) {
  // Loading & sync state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);

  // Form Structure & Configuration (always loaded from the server; see formsApi.ts)
  const [sections, setSections] = useState<ResolvedFormSection[]>([]);
  const [formVersion, setFormVersion] = useState(0);
  const [config, setConfig] = useState<CandidateIntakeConfig>(EMPTY_CONFIG);

  // Conditional Logic & Permissions Rules
  const [fieldRules, setFieldRules] = useState<Record<string, ConditionalRule[]>>({});
  const [fieldPermissions, setFieldPermissions] = useState<Record<string, FieldPermissionRule>>({});
  const [fieldValidations, setFieldValidations] = useState<Record<string, FieldValidationRule>>({});
  const [subgroupTitles, setSubgroupTitles] = useState<Record<string, string>>({});

  // Selection state
  const [selectedSectionKey, setSelectedSectionKey] = useState<string | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);

  // Modals state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [manageSectionsModalOpen, setManageSectionsModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addFieldModalOpen, setAddFieldModalOpen] = useState<{ sectionKey: string } | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('single_line');

  // Load Form Definition
  const loadFormData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchResolvedForm(formKey);
      const metadata = data.form.metadata;
      const backendConfig = metadata?.intakeConfig;

      setSections(data.sections);
      setFormVersion(data.form.version);
      setConfig({
        formName: backendConfig?.formName || data.form.name,
        formDescription: backendConfig?.formDescription || data.form.description,
        hrManualEntryEnabled: backendConfig?.hrManualEntryEnabled ?? true,
        candidateSelfServiceEnabled: backendConfig?.candidateSelfServiceEnabled ?? true,
        allowSaveDraft: backendConfig?.allowSaveDraft ?? true,
        candidateEditingAfterSubmission: backendConfig?.candidateEditingAfterSubmission ?? false,
        status: backendConfig?.status ?? 'draft',
        publishedVersion: backendConfig?.publishedVersion ?? 0,
        publishedAt: backendConfig?.publishedAt,
        publishedBy: backendConfig?.publishedBy,
      });
      setFieldRules(metadata?.fieldRules ?? {});
      setFieldPermissions(metadata?.fieldPermissions ?? {});
      setFieldValidations(metadata?.fieldValidation ?? {});
      setSubgroupTitles(
        Object.fromEntries(
          Object.entries(metadata?.subgroups ?? {})
            .filter(([, v]) => v.title)
            .map(([key, v]) => [key, v.title as string]),
        ),
      );
      setSelectedSectionKey(data.sections[0]?.key ?? null);
      setSelectedFieldKey(null);
      setHasDraftChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load this form.');
    } finally {
      setLoading(false);
    }
  }, [formKey]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  // Derived selected elements
  const selectedSection = useMemo(() => {
    return sections.find((s) => s.key === selectedSectionKey) ?? null;
  }, [sections, selectedSectionKey]);

  const selectedField = useMemo(() => {
    if (!selectedFieldKey) return null;
    for (const sec of sections) {
      const match = sec.fields.find((f: ResolvedFormField) => f.key === selectedFieldKey);
      if (match) return match;
    }
    return null;
  }, [sections, selectedFieldKey]);

  // Selection Handlers
  const handleSelectSection = useCallback((secKey: string) => {
    setSelectedSectionKey(secKey);
    setSelectedFieldKey(null);
  }, []);

  const handleSelectField = useCallback((secKey: string, fKey: string) => {
    setSelectedSectionKey(secKey);
    setSelectedFieldKey(fKey);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedFieldKey(null);
  }, []);

  // Section Ordering — drag-and-drop reports the full new key order directly.
  const handleReorderSections = useCallback((orderedSectionKeys: string[]) => {
    setSections((prev) => {
      const byKey = new Map(prev.map((s) => [s.key, s]));
      return orderedSectionKeys.map((key, i) => ({ ...byKey.get(key)!, order: i + 1 }));
    });
    setHasDraftChanges(true);
  }, []);

  const handleDeleteSection = useCallback(
    (secKey: string) => {
      const sec = sections.find((s) => s.key === secKey);
      if (!sec || sec.origin === 'system') return;
      const updated = sections.filter((s) => s.key !== secKey);
      setSections(updated.map((s, i) => ({ ...s, order: i + 1 })));
      if (selectedSectionKey === secKey) {
        setSelectedSectionKey(updated[0]?.key ?? null);
        setSelectedFieldKey(null);
      }
      setHasDraftChanges(true);
    },
    [sections, selectedSectionKey],
  );

  // Field Ordering — drag-and-drop reports the full new key order for the section directly.
  const handleReorderFields = useCallback((secKey: string, orderedFieldKeys: string[]) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.key !== secKey) return sec;
        const byKey = new Map(sec.fields.map((f) => [f.key, f]));
        return {
          ...sec,
          fields: orderedFieldKeys.map((key, i) => ({ ...byKey.get(key)!, order: i + 1 })),
        };
      }),
    );
    setHasDraftChanges(true);
  }, []);

  const handleDeleteField = useCallback(
    (secKey: string, fKey: string) => {
      const secIdx = sections.findIndex((s) => s.key === secKey);
      if (secIdx === -1) return;
      const sec = sections[secIdx]!;
      const targetField = sec.fields.find((f) => f.key === fKey);
      if (targetField?.protected) return; // Prevent deleting protected fields

      const updatedSec: ResolvedFormSection = {
        ...sec,
        fields: sec.fields.filter((f) => f.key !== fKey).map((f, i) => ({ ...f, order: i + 1 })),
      };

      const updatedSections = [...sections];
      updatedSections[secIdx] = updatedSec;
      setSections(updatedSections);
      if (selectedFieldKey === fKey) {
        setSelectedFieldKey(null);
      }
      setHasDraftChanges(true);
    },
    [sections, selectedFieldKey],
  );

  // Cross-section field moves are only offered for custom fields: a system field's key is
  // namespaced to its canonical section (e.g. `general.department`), so relocating it would
  // desync the key from its section and break the Form Engine's resolution of that field.
  const handleMoveFieldToSection = useCallback(
    (fromSecKey: string, fKey: string, toSecKey: string) => {
      if (fromSecKey === toSecKey) return;
      setSections((prev) => {
        const fromSec = prev.find((s) => s.key === fromSecKey);
        const movedField = fromSec?.fields.find((f) => f.key === fKey);
        if (!movedField || movedField.origin !== 'custom') return prev;

        return prev.map((sec) => {
          if (sec.key === fromSecKey) {
            return {
              ...sec,
              fields: sec.fields
                .filter((f) => f.key !== fKey)
                .map((f, i) => ({ ...f, order: i + 1 })),
            };
          }
          if (sec.key === toSecKey) {
            return {
              ...sec,
              fields: [...sec.fields, { ...movedField, order: sec.fields.length + 1 }],
            };
          }
          return sec;
        });
      });
      setSelectedSectionKey(toSecKey);
      setSelectedFieldKey(fKey);
      setHasDraftChanges(true);
    },
    [],
  );

  const handleDuplicateField = useCallback(
    (secKey: string, fKey: string) => {
      const secIdx = sections.findIndex((s) => s.key === secKey);
      if (secIdx === -1) return;
      const sec = sections[secIdx]!;
      const sourceField = sec.fields.find((f) => f.key === fKey);
      if (!sourceField) return;

      const newKey = generateCustomFieldKey();
      const duplicatedField: ResolvedFormField = {
        ...sourceField,
        key: newKey,
        label: `${sourceField.label} (Copy)`,
        origin: 'custom',
        protected: false,
        protectedReason: null,
        order: sec.fields.length + 1,
        overridden: false,
      };

      const updatedSec: ResolvedFormSection = {
        ...sec,
        fields: [...sec.fields, duplicatedField],
      };

      const updatedSections = [...sections];
      updatedSections[secIdx] = updatedSec;
      setSections(updatedSections);
      setSelectedFieldKey(newKey);
      setHasDraftChanges(true);
    },
    [sections],
  );

  // Add Field from Left Toolbox
  const handleAddFieldFromToolbox = useCallback(
    (type: CustomFieldType, label: string) => {
      const targetSecKey = selectedSectionKey || sections[0]?.key;
      if (!targetSecKey) return;
      const secIdx = sections.findIndex((s) => s.key === targetSecKey);
      if (secIdx === -1) return;
      const sec = sections[secIdx]!;

      const newKey = generateCustomFieldKey();
      const newField: ResolvedFormField = {
        key: newKey,
        type,
        label,
        description: null,
        origin: 'custom',
        protected: false,
        protectedReason: null,
        configurable: true,
        enabled: true,
        required: false,
        order: sec.fields.length + 1,
        width: type === 'address' ? 'full' : 'half',
        config: {},
        defaults: null,
        overridden: false,
      };

      const updatedSec: ResolvedFormSection = {
        ...sec,
        fields: [...sec.fields, newField],
      };

      const updatedSections = [...sections];
      updatedSections[secIdx] = updatedSec;
      setSections(updatedSections);
      setSelectedSectionKey(targetSecKey);
      setSelectedFieldKey(newKey);
      setHasDraftChanges(true);
    },
    [sections, selectedSectionKey],
  );

  // Property Panel Updates
  const handleUpdateField = useCallback((fKey: string, updates: Partial<ResolvedFormField>) => {
    setSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => {
          if (f.key !== fKey) return f;
          if (f.protected && updates.required !== undefined) {
            updates.required = true;
          }
          return { ...f, ...updates };
        }),
      })),
    );
    setHasDraftChanges(true);
  }, []);

  const handleUpdateSection = useCallback(
    (secKey: string, updates: Partial<ResolvedFormSection>) => {
      setSections((prev) => prev.map((sec) => (sec.key === secKey ? { ...sec, ...updates } : sec)));
      setHasDraftChanges(true);
    },
    [],
  );

  const handleUpdateFormConfig = useCallback((newConfig: Partial<CandidateIntakeConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
    setHasDraftChanges(true);
  }, []);

  const handleUpdateFieldRules = useCallback((fKey: string, rules: ConditionalRule[]) => {
    setFieldRules((prev) => ({ ...prev, [fKey]: rules }));
    setHasDraftChanges(true);
  }, []);

  const handleUpdateFieldPermission = useCallback((fKey: string, perm: FieldPermissionRule) => {
    setFieldPermissions((prev) => ({ ...prev, [fKey]: perm }));
    setHasDraftChanges(true);
  }, []);

  const handleUpdateFieldValidation = useCallback((fKey: string, val: FieldValidationRule) => {
    setFieldValidations((prev) => ({ ...prev, [fKey]: val }));
    setHasDraftChanges(true);
  }, []);

  const handleRenameGroup = useCallback((groupKey: string, title: string) => {
    setSubgroupTitles((prev) => ({ ...prev, [groupKey]: title }));
    setHasDraftChanges(true);
  }, []);

  /** The save API only accepts `type`/`config` for custom fields; system fields must omit them. */
  const toSaveSections = (sectionsToSave: ResolvedFormSection[]): FormSectionInput[] =>
    sectionsToSave.map((sec) => ({
      key: sec.key,
      label: sec.label,
      description: sec.description ?? null,
      visible: sec.visible,
      order: sec.order,
      fields: sec.fields.map((f): FormFieldInput => ({
        key: f.key,
        origin: f.origin,
        label: f.label,
        description: f.description,
        enabled: f.enabled,
        required: f.required,
        width: f.width,
        ...(f.origin === 'custom' ? { type: f.type, config: f.config } : {}),
      })),
    }));

  // Save & Publish
  /** Persists the current builder state. Returns whether it succeeded. */
  const saveDraft = async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await saveFormDefinition(formKey, {
        version: formVersion,
        sections: toSaveSections(sections),
        metadata: {
          intakeConfig: config,
          fieldRules,
          fieldPermissions,
          fieldValidation: fieldValidations,
          subgroups: Object.fromEntries(
            Object.entries(subgroupTitles).map(([key, title]) => [key, { title }]),
          ),
          // The resolver reorders sections from this key order, not from each
          // section's own `order` field in the `sections` array below.
          sectionOrder: sections.map((sec) => sec.key),
          // The resolver only recognises a custom (non-system) section as
          // configurable when it's declared here — the `sections[]` entry
          // alone (below) isn't enough, the same way a custom field needs
          // `origin: 'custom'` plus its own type/config.
          customSections: sections
            .filter((sec) => sec.origin === 'custom')
            .map((sec) => ({
              key: sec.key,
              title: sec.label,
              description: sec.description ?? null,
              visible: sec.visible !== false,
              order: sec.order,
            })),
        },
      });
      setFormVersion(updated.form.version);
      setHasDraftChanges(false);
      return true;
    } catch (err) {
      if (err instanceof FormsApiError && err.status === 409) {
        setError(
          'Someone else saved changes to this form in the meantime. Reload the page to see their changes before saving yours.',
        );
      } else {
        setError(err instanceof Error ? err.message : 'Failed to save this form draft.');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const ok = await saveDraft();
    if (ok) {
      setSaveSuccess('Form draft saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Publish always acts on the latest edits: the backend snapshots whatever was
  // last saved, so unsaved changes must be saved first or they'd be silently
  // left out of the published version.
  const handlePublishConfirm = async () => {
    if (hasDraftChanges) {
      const saved = await saveDraft();
      if (!saved) return;
    }
    setIsPublishing(true);
    setError(null);
    try {
      const result = await publishForm(formKey);
      setConfig((prev) => ({ ...prev, status: 'published', publishedVersion: result.version }));
      setHasDraftChanges(false);
      setIsPublishModalOpen(false);
      setSaveSuccess(`Version ${result.version}.0 published successfully.`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish this form.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Add Custom Section
  const handleCreateSectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    const newKey = `custom_sec_${Date.now()}`;
    const newSection: ResolvedFormSection = {
      key: newKey,
      label: newSectionTitle.trim(),
      description: null,
      order: sections.length + 1,
      origin: 'custom',
      configurable: true,
      visible: true,
      fields: [],
    };
    setSections([...sections, newSection]);
    setSelectedSectionKey(newKey);
    setSelectedFieldKey(null);
    setNewSectionTitle('');
    setAddSectionModalOpen(false);
    setHasDraftChanges(true);
  };

  // Add Custom Field via Modal
  const handleCreateFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFieldModalOpen || !newFieldLabel.trim()) return;
    handleAddFieldFromToolbox(newFieldType, newFieldLabel.trim());
    setNewFieldLabel('');
    setAddFieldModalOpen(null);
  };

  if (loading) {
    return (
      <div className="bezent-cif-builder-loading">
        <LoadingState label="Loading form builder..." />
      </div>
    );
  }

  if (error && sections.length === 0) {
    return (
      <div className="bezent-cif-builder-loading">
        <Alert variant="danger" title="Couldn't load this form">
          {error}
        </Alert>
        <Inline gap="sm">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/hrms/settings?module=templates')}
          >
            Back to Templates
          </Button>
          <Button variant="primary" type="button" onClick={loadFormData}>
            Retry
          </Button>
        </Inline>
      </div>
    );
  }

  return (
    <div className="bezent-cif-builder">
      {/* ── TOP HEADER BAR ── */}
      <header className="bezent-cif-builder-header">
        <div className="bezent-cif-builder-header__left">
          <button
            type="button"
            className="bezent-cif-builder-header__back-btn"
            onClick={() => navigate('/hrms/settings?module=templates')}
            title="Back to Templates"
          >
            <BezentIcon name="arrowLeft" size={16} />
            <span>{config.formName || 'Back to Templates'}</span>
          </button>
        </div>

        {/* 3-Step Process Stepper */}
        <nav className="bezent-cif-stepper" aria-label="Builder Process">
          <button
            type="button"
            className={`bezent-cif-step ${!isPreviewOpen ? 'bezent-cif-step--active' : ''}`}
            onClick={() => setIsPreviewOpen(false)}
          >
            <span className="bezent-cif-step__circle">1</span>
            <span className="bezent-cif-step__label">Customization</span>
          </button>

          <button
            type="button"
            className="bezent-cif-step"
            onClick={() =>
              handleSelectField(sections[0]?.key || '', sections[0]?.fields[0]?.key || '')
            }
            title="Access Control & Permissions"
          >
            <span className="bezent-cif-step__circle">2</span>
            <span className="bezent-cif-step__label">Access Control</span>
          </button>

          <button
            type="button"
            className={`bezent-cif-step ${isPreviewOpen ? 'bezent-cif-step--active' : ''}`}
            onClick={() => setIsPreviewOpen(true)}
            title="Preview Form"
          >
            <span className="bezent-cif-step__circle">3</span>
            <span className="bezent-cif-step__label">Preview</span>
          </button>
        </nav>

        <div className="bezent-cif-builder-header__right">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            disabled={!hasDraftChanges || isSaving}
            onClick={handleSaveDraft}
            leftIcon={<BezentIcon name="save" size={13} />}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={isPublishing}
            onClick={() => setIsPublishModalOpen(true)}
            leftIcon={<BezentIcon name="check" size={13} />}
          >
            Publish
          </Button>

          <button
            type="button"
            className="bezent-cif-close-btn"
            onClick={() => navigate('/hrms/settings?module=templates')}
            title="Close"
            aria-label="Close"
          >
            <BezentIcon name="close" size={14} />
          </button>
        </div>
      </header>

      {/* Alerts */}
      {(error || saveSuccess) && (
        <div className="bezent-cif-builder-alerts">
          {error && (
            <Alert variant="danger" title="Notice" dismissible onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}
          {saveSuccess && (
            <Alert
              variant="success"
              title="Success"
              dismissible
              onDismiss={() => setSaveSuccess(null)}
            >
              {saveSuccess}
            </Alert>
          )}
        </div>
      )}

      {/* ── 3-PANEL BUILDER BODY ── */}
      <div className="bezent-cif-builder-body">
        {/* PANEL 1: Left Toolbox */}
        <BuilderFieldToolbox
          onAddField={handleAddFieldFromToolbox}
          activeSectionLabel={selectedSection?.label}
        />

        {/* PANEL 2: Center Interactive Form Canvas */}
        <BuilderFormCanvas
          formTitle={config.formName}
          formDescription={config.formDescription}
          sections={sections}
          selectedSectionKey={selectedSectionKey}
          selectedFieldKey={selectedFieldKey}
          fieldRules={fieldRules}
          fieldPermissions={fieldPermissions}
          subgroupTitles={subgroupTitles}
          onRenameGroup={handleRenameGroup}
          onSelectSection={handleSelectSection}
          onSelectField={handleSelectField}
          onReorderSections={handleReorderSections}
          onDeleteSection={handleDeleteSection}
          onReorderFields={handleReorderFields}
          onMoveFieldToSection={handleMoveFieldToSection}
          onDuplicateField={handleDuplicateField}
          onDeleteField={handleDeleteField}
          onOpenAddField={(secKey) => setAddFieldModalOpen({ sectionKey: secKey })}
          onOpenAddSection={() => setAddSectionModalOpen(true)}
          onOpenManageSections={() => setManageSectionsModalOpen(true)}
        />

        {/* PANEL 3: Right Properties Inspector */}
        <BuilderPropertiesPanel
          selectedField={selectedField}
          selectedSection={selectedSection}
          allSections={sections}
          formConfig={config}
          fieldRules={selectedField ? fieldRules[selectedField.key] : undefined}
          fieldPermission={selectedField ? fieldPermissions[selectedField.key] : undefined}
          fieldValidation={selectedField ? fieldValidations[selectedField.key] : undefined}
          onUpdateFormConfig={handleUpdateFormConfig}
          onUpdateSection={handleUpdateSection}
          onUpdateField={handleUpdateField}
          onUpdateFieldRules={handleUpdateFieldRules}
          onUpdateFieldPermission={handleUpdateFieldPermission}
          onUpdateFieldValidation={handleUpdateFieldValidation}
          onDeselect={handleDeselect}
        />
      </div>

      {/* ── MODALS ── */}

      {/* Publish Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublishConfirm}
        currentVersion={config.publishedVersion ?? 1}
        newVersion={(config.publishedVersion ?? 1) + 1}
        isPublishing={isPublishing}
        formName={config.formName}
        hasUnsavedChanges={hasDraftChanges}
      />

      {/* Preview Modal */}
      {isPreviewOpen && (
        <FormPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          form={{
            form: {
              key: formKey,
              name: config.formName,
              description: config.formDescription,
              kind: 'system',
              status: 'active',
              version: formVersion,
              metadata: { intakeConfig: config, fieldRules, fieldPermissions },
            },
            sections,
          }}
        />
      )}

      {/* Manage Sections Modal */}
      <ManageSectionsModal
        isOpen={manageSectionsModalOpen}
        onClose={() => setManageSectionsModalOpen(false)}
        sections={sections}
        onReorderSections={handleReorderSections}
        onUpdateSection={handleUpdateSection}
        onDeleteSection={handleDeleteSection}
        onOpenAddSection={() => {
          setManageSectionsModalOpen(false);
          setAddSectionModalOpen(true);
        }}
      />

      {/* Add Custom Section Modal */}
      <Modal
        isOpen={addSectionModalOpen}
        onClose={() => setAddSectionModalOpen(false)}
        title="Add New Section to Form"
        size="sm"
      >
        <form onSubmit={handleCreateSectionSubmit}>
          <Stack gap="md">
            <FormField label="Section Title" required>
              <Input
                type="text"
                placeholder="e.g. Uniform & Kit Details"
                value={newSectionTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewSectionTitle(e.target.value)
                }
                autoFocus
              />
            </FormField>
            <Inline gap="sm" justify="end">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Section
              </Button>
            </Inline>
          </Stack>
        </form>
      </Modal>

      {/* Add Custom Field Modal */}
      <Modal
        isOpen={Boolean(addFieldModalOpen)}
        onClose={() => setAddFieldModalOpen(null)}
        title="Add Field to Section"
        size="sm"
      >
        <form onSubmit={handleCreateFieldSubmit}>
          <Stack gap="md">
            <FormField label="Field Label" required>
              <Input
                type="text"
                placeholder="e.g. LinkedIn Profile URL"
                value={newFieldLabel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewFieldLabel(e.target.value)
                }
                autoFocus
              />
            </FormField>

            <FormField label="Field Type" required>
              <Select
                value={newFieldType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNewFieldType(e.target.value as CustomFieldType)
                }
                options={[
                  { value: 'single_line', label: 'Single Line Text' },
                  { value: 'multi_line', label: 'Multi Line Text' },
                  { value: 'email', label: 'Email Address' },
                  { value: 'phone', label: 'Phone Number' },
                  { value: 'number', label: 'Number' },
                  { value: 'decimal', label: 'Decimal / Currency' },
                  { value: 'date', label: 'Date Picker' },
                  { value: 'time', label: 'Time Picker' },
                  { value: 'dropdown', label: 'Dropdown List' },
                  { value: 'multi_select', label: 'Multi-Select' },
                  { value: 'radio', label: 'Radio Choices' },
                  { value: 'checkbox', label: 'Checkbox' },
                  { value: 'toggle_switch', label: 'Toggle Switch' },
                  { value: 'file_upload', label: 'File Upload' },
                  { value: 'image_upload', label: 'Image Upload' },
                  { value: 'signature', label: 'Digital Signature' },
                  { value: 'address', label: 'Complete Address Block' },
                  { value: 'rating', label: 'Star Rating' },
                  { value: 'tags', label: 'Tags / Chips' },
                ]}
              />
            </FormField>

            <Inline gap="sm" justify="end">
              <Button variant="secondary" type="button" onClick={() => setAddFieldModalOpen(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Add Field
              </Button>
            </Inline>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}

function RoutedFormBuilderPage() {
  const { formKey: routeFormKey } = useParams<{ formKey?: string }>();
  const navigate = useNavigate();
  return <FormBuilderPageInner navigate={navigate} formKey={routeFormKey} />;
}

export function FormBuilderPage() {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <RoutedFormBuilderPage />;
  }
  return <FormBuilderPageInner navigate={() => {}} formKey="employee-registration" />;
}

export default FormBuilderPage;
