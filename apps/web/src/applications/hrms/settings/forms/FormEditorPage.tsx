import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  Alert,
  Badge,
  Button,
  Inline,
  LoadingState,
  Page,
  Stack,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchResolvedForm,
  saveFormDefinition,
  type CustomFieldType,
  type ResolvedForm,
  type ResolvedFormField,
  type ResolvedFormSection,
  type SaveFormDefinitionDto,
} from '../api/formsApi';
import { createNewCustomField } from './types';
import { FieldToolbox } from './FieldToolbox';
import { FormCanvas } from './FormCanvas';
import { FieldProperties } from './FieldProperties';

export const FORM_EDITOR_TABS = [
  { id: 'customize', label: 'Customize', disabled: false },
  { id: 'access-control', label: 'Access Control', disabled: true },
  { id: 'preview', label: 'Preview', disabled: true },
] as const;

export function FormEditorPage() {
  const { formKey: rawFormKey } = useParams<{ formKey?: string }>();
  const formKey = rawFormKey || 'employee-registration';
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persistedForm, setPersistedForm] = useState<ResolvedForm | null>(null);
  const [draftSections, setDraftSections] = useState<ResolvedFormSection[]>([]);
  const [activeSectionKey, setActiveSectionKey] = useState<string>('general');
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'customize' | 'access-control' | 'preview'>(
    'customize',
  );

  // Load Form Definition
  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchResolvedForm(formKey);
      setPersistedForm(data);
      setDraftSections(JSON.parse(JSON.stringify(data.sections)));
      // Select first configurable section and field by default if available
      const firstConfigurable = data.sections.find((s) => s.configurable);
      if (firstConfigurable) {
        setActiveSectionKey(firstConfigurable.key);
        if (firstConfigurable.fields[0]) {
          setSelectedFieldKey(firstConfigurable.fields[0].key);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load form definition.');
    } finally {
      setLoading(false);
    }
  }, [formKey]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  // Determine if draft is dirty
  const isDirty = useMemo(() => {
    if (!persistedForm) return false;
    return JSON.stringify(persistedForm.sections) !== JSON.stringify(draftSections);
  }, [persistedForm, draftSections]);

  // Active section object
  const activeSection = useMemo(() => {
    return (
      draftSections.find((s) => s.key === activeSectionKey) ??
      draftSections.find((s) => s.fields.some((f) => f.key === selectedFieldKey)) ??
      draftSections.find((s) => s.configurable) ??
      draftSections[0] ??
      null
    );
  }, [draftSections, activeSectionKey, selectedFieldKey]);

  // Selected field object
  const selectedField = useMemo(() => {
    if (!selectedFieldKey) return null;
    for (const sec of draftSections) {
      const match = sec.fields.find((f) => f.key === selectedFieldKey);
      if (match) return match;
    }
    return null;
  }, [draftSections, selectedFieldKey]);

  // Select section handler
  const handleSelectSection = useCallback(
    (secKey: string) => {
      setActiveSectionKey(secKey);
      const targetSec = draftSections.find((s) => s.key === secKey);
      if (targetSec) {
        const hasField = targetSec.fields.some((f) => f.key === selectedFieldKey);
        if (!hasField) {
          setSelectedFieldKey(targetSec.fields[0]?.key ?? null);
        }
      }
    },
    [draftSections, selectedFieldKey],
  );

  // Select field handler
  const handleSelectField = useCallback(
    (fieldKey: string) => {
      setSelectedFieldKey(fieldKey);
      for (const sec of draftSections) {
        if (sec.fields.some((f) => f.key === fieldKey)) {
          setActiveSectionKey(sec.key);
          break;
        }
      }
    },
    [draftSections],
  );

  // Drag sensors with distance activation to distinguish clicks from drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  // Field manipulation helpers
  const handleUpdateField = useCallback((updated: ResolvedFormField) => {
    setDraftSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        fields: sec.fields.map((f) => (f.key === updated.key ? updated : f)),
      })),
    );
  }, []);

  const handleDeleteField = useCallback((fieldKey: string) => {
    setDraftSections((prev) =>
      prev.map((sec) => ({
        ...sec,
        fields: sec.fields.filter((f) => f.key !== fieldKey),
      })),
    );
    setSelectedFieldKey((current) => (current === fieldKey ? null : current));
  }, []);

  const handleAddField = useCallback(
    (type: CustomFieldType, customLabel?: string, targetSectionKey?: string) => {
      setDraftSections((prev) => {
        const targetKey = targetSectionKey || activeSectionKey || 'general';
        let targetSec = prev.find((s) => s.key === targetKey && s.configurable);

        if (!targetSec) {
          targetSec = prev.find((s) => s.configurable);
        }

        if (!targetSec) return prev;

        const newField = createNewCustomField(
          type,
          customLabel ?? `New ${type.replace(/_/g, ' ')}`,
          targetSec.fields.length + 1,
        );

        setSelectedFieldKey(newField.key);
        setActiveSectionKey(targetSec.key);

        return prev.map((sec) =>
          sec.key === targetSec!.key ? { ...sec, fields: [...sec.fields, newField] } : sec,
        );
      });
    },
    [activeSectionKey],
  );

  const handleMoveField = useCallback((fieldKey: string, direction: 'up' | 'down') => {
    setDraftSections((prev) =>
      prev.map((sec) => {
        const idx = sec.fields.findIndex((f) => f.key === fieldKey);
        if (idx === -1) return sec;

        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= sec.fields.length) return sec;

        const fields = [...sec.fields];
        const moved = fields.splice(idx, 1)[0];
        if (moved) {
          fields.splice(newIdx, 0, moved);
        }

        // re-index order
        return {
          ...sec,
          fields: fields.map((f, i) => ({ ...f, order: i + 1 })),
        };
      }),
    );
  }, []);

  const handleMoveToSection = useCallback((fieldKey: string, targetSectionKey: string) => {
    setDraftSections((prev) => {
      let fieldToMove: ResolvedFormField | null = null;

      // Extract field from its source section
      const stripped = prev.map((sec) => {
        const found = sec.fields.find((f) => f.key === fieldKey);
        if (found) {
          fieldToMove = found;
          return {
            ...sec,
            fields: sec.fields.filter((f) => f.key !== fieldKey),
          };
        }
        return sec;
      });

      if (!fieldToMove) return prev;

      // Add to target section
      return stripped.map((sec) => {
        if (sec.key === targetSectionKey) {
          return {
            ...sec,
            fields: [...sec.fields, { ...fieldToMove!, order: sec.fields.length + 1 }],
          };
        }
        return sec;
      });
    });
  }, []);

  // Drag & drop end handler
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as
        | {
            isToolbox?: boolean;
            type?: CustomFieldType;
            label?: string;
            isField?: boolean;
            fieldKey?: string;
          }
        | undefined;

      const overData = over.data.current as
        | {
            sectionKey?: string;
            isField?: boolean;
            fieldKey?: string;
          }
        | undefined;

      // Drop from toolbox to section
      if (activeData?.isToolbox && activeData.type) {
        const targetSectionKey =
          overData?.sectionKey ||
          (String(over.id).startsWith('section-')
            ? String(over.id).replace('section-', '')
            : undefined);

        if (targetSectionKey) {
          handleAddField(activeData.type, activeData.label, targetSectionKey);
        }
        return;
      }

      // Drop field to reorder
      if (activeData?.isField && overData?.isField && activeData.fieldKey && overData.fieldKey) {
        if (activeData.fieldKey !== overData.fieldKey) {
          // Reorder: place active field at the position of over field
          setDraftSections((prev) =>
            prev.map((sec) => {
              const activeIdx = sec.fields.findIndex((f) => f.key === activeData.fieldKey);
              const overIdx = sec.fields.findIndex((f) => f.key === overData.fieldKey);
              if (activeIdx === -1 || overIdx === -1) return sec;

              const fields = [...sec.fields];
              const moved = fields.splice(activeIdx, 1)[0];
              if (moved) {
                fields.splice(overIdx, 0, moved);
              }

              return {
                ...sec,
                fields: fields.map((f, i) => ({ ...f, order: i + 1 })),
              };
            }),
          );
        }
      }
    },
    [handleAddField],
  );

  // Discard changes
  const handleDiscard = useCallback(() => {
    if (!persistedForm) return;
    setDraftSections(JSON.parse(JSON.stringify(persistedForm.sections)));
    setSaveError(null);
    setConcurrencyConflict(false);
    setSaveSuccess(false);
  }, [persistedForm]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!persistedForm) return;

    // Validate draft
    for (const sec of draftSections) {
      if (!sec.configurable) continue;
      for (const field of sec.fields) {
        if (!field.label.trim()) {
          setSaveError(`Field label in "${sec.label}" cannot be empty.`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setConcurrencyConflict(false);
      setSaveSuccess(false);

      const dto: SaveFormDefinitionDto = {
        version: persistedForm.form.version,
        sections: draftSections
          .filter((s) => s.configurable)
          .map((sec) => ({
            key: sec.key,
            fields: sec.fields.map((f) => ({
              key: f.key,
              origin: f.origin,
              label: f.label,
              description: f.description,
              enabled: f.enabled,
              required: f.required,
              width: f.width,
              type: f.origin === 'custom' ? (f.type as CustomFieldType) : undefined,
              config: f.origin === 'custom' ? f.config : undefined,
            })),
          })),
      };

      const updated = await saveFormDefinition(formKey, dto);
      setPersistedForm(updated);
      setDraftSections(JSON.parse(JSON.stringify(updated.sections)));
      setSaveSuccess(true);
    } catch (err: unknown) {
      const is409 =
        (err as { status?: number })?.status === 409 ||
        (err instanceof Error && err.message.toLowerCase().includes('conflict'));

      if (is409) {
        setConcurrencyConflict(true);
        setSaveError(
          'Version Conflict: This form was modified in another session. Please discard and reload the latest version before saving.',
        );
      } else {
        setSaveError(err instanceof Error ? err.message : 'Failed to save form definition.');
      }
    } finally {
      setIsSaving(false);
    }
  }, [persistedForm, draftSections, formKey]);

  const handleBack = useCallback(() => {
    navigate('/hrms/settings');
  }, [navigate]);

  if (loading) {
    return (
      <Page title="Loading Form Editor">
        <LoadingState label="Loading form definition..." />
      </Page>
    );
  }

  if (error || !persistedForm) {
    return (
      <Page title="Form Editor Error">
        <Stack gap="md">
          <Alert variant="danger" title="Failed to load form">
            {error ?? 'Unknown error occurred'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/hrms/settings')}>
            Return to Settings
          </Button>
        </Stack>
      </Page>
    );
  }

  return (
    <div className="bezent-editor-shell">
      {/* 1. Compact Editor Header */}
      <header className="bezent-editor-header">
        <div className="bezent-editor-header__left">
          <Button
            variant="text"
            size="sm"
            leftIcon={<BezentIcon name="arrowLeft" size={14} />}
            onClick={handleBack}
          >
            Forms
          </Button>

          <div className="bezent-editor-header__divider" aria-hidden="true" />

          <div className="bezent-editor-header__title-group">
            <div className="bezent-editor-header__title-row">
              <h1 className="bezent-editor-header__title">{persistedForm.form.name}</h1>
              <Badge variant="neutral" size="sm">
                System Form
              </Badge>
              {isDirty && (
                <Badge variant="warning" size="sm">
                  Unsaved Changes
                </Badge>
              )}
            </div>

            <div className="bezent-editor-header__tabs">
              <Tabs
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as typeof activeTab)}
                items={FORM_EDITOR_TABS.map((item) => ({
                  id: item.id,
                  label: item.label,
                  disabled: item.disabled,
                }))}
              />
            </div>
          </div>
        </div>

        <div className="bezent-editor-header__right">
          <Button
            variant="outline"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleDiscard}
          >
            Discard Changes
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!isDirty || isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </header>

      {/* Notification Alerts */}
      {(concurrencyConflict || (!concurrencyConflict && saveError) || saveSuccess) && (
        <div className="bezent-editor-alerts">
          {concurrencyConflict && (
            <Alert variant="danger" title="Optimistic Concurrency Conflict">
              {saveError}
              <Inline gap="sm" align="center">
                <Button variant="outline" size="sm" onClick={loadForm}>
                  Reload Latest Version
                </Button>
              </Inline>
            </Alert>
          )}

          {!concurrencyConflict && saveError && (
            <Alert
              variant="danger"
              title="Save Error"
              dismissible
              onDismiss={() => setSaveError(null)}
            >
              {saveError}
            </Alert>
          )}

          {saveSuccess && (
            <Alert
              variant="success"
              title="Changes Saved"
              dismissible
              onDismiss={() => setSaveSuccess(false)}
            >
              Form definition saved successfully (Version {persistedForm.form.version}).
            </Alert>
          )}
        </div>
      )}

      {/* 2. Full-Viewport Editor Workspace */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="bezent-editor-workspace">
          {/* Left Toolbox */}
          <FieldToolbox
            onAddField={(type, label) => handleAddField(type, label, activeSectionKey)}
            activeSectionLabel={activeSection?.label}
            isConfigurable={activeSection?.configurable ?? true}
          />

          {/* Center Canvas */}
          <FormCanvas
            sections={draftSections}
            activeSectionKey={activeSectionKey}
            selectedFieldKey={selectedFieldKey}
            onSelectSection={handleSelectSection}
            onSelectField={handleSelectField}
            onMoveField={handleMoveField}
            onMoveToSection={handleMoveToSection}
            onDeleteField={handleDeleteField}
          />

          {/* Right Inspector */}
          <FieldProperties
            field={selectedField}
            form={persistedForm.form}
            activeSection={activeSection}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onDeselectField={() => setSelectedFieldKey(null)}
          />
        </div>
      </DndContext>
    </div>
  );
}
