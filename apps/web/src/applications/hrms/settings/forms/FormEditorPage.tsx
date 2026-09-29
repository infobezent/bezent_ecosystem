import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
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
  type FormCustomizationMetadata,
  type ResolvedForm,
  type ResolvedFormField,
  type ResolvedFormSection,
  type SaveFormDefinitionDto,
} from '../api/formsApi';
import { createNewCustomField, getSubgroupForField, KNOWN_SECTION_GROUPS } from './types';
import { FieldToolbox } from './FieldToolbox';
import { FormCanvas } from './FormCanvas';
import { FieldProperties } from './FieldProperties';

export const FORM_EDITOR_TABS = [
  { id: 'customize', label: 'Customize', disabled: false },
  { id: 'access-control', label: 'Access Control', disabled: true },
  { id: 'preview', label: 'Preview', disabled: true },
] as const;

const MANDATORY_SECTION_KEYS = ['general', 'personal', 'online_access', 'review'];

export function FormEditorPage() {
  const { formKey: rawFormKey } = useParams<{ formKey?: string }>();
  const formKey = rawFormKey || 'employee-registration';
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [persistedForm, setPersistedForm] = useState<ResolvedForm | null>(null);
  const [draftSections, setDraftSections] = useState<ResolvedFormSection[]>([]);
  const [metadata, setMetadata] = useState<FormCustomizationMetadata>({});
  const [activeSectionKey, setActiveSectionKey] = useState<string>('general');
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [selectedSubgroupKey, setSelectedSubgroupKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'customize' | 'access-control' | 'preview'>(
    'customize',
  );
  // Tracks the field key being dragged — used to render the DragOverlay ghost.
  const [activeDragFieldKey, setActiveDragFieldKey] = useState<string | null>(null);
  // Tracks the toolbox item being dragged — used to render the DragOverlay ghost.
  const [activeDragToolboxItem, setActiveDragToolboxItem] = useState<{
    type: CustomFieldType;
    label: string;
  } | null>(null);

  // Load Form Definition
  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchResolvedForm(formKey);
      setPersistedForm(data);
      setDraftSections(JSON.parse(JSON.stringify(data.sections)));
      setMetadata(JSON.parse(JSON.stringify(data.form.metadata ?? {})));
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
    const sectionsChanged =
      JSON.stringify(persistedForm.sections) !== JSON.stringify(draftSections);
    const metaChanged =
      JSON.stringify(persistedForm.form.metadata ?? {}) !== JSON.stringify(metadata);
    return sectionsChanged || metaChanged;
  }, [persistedForm, draftSections, metadata]);

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

  // Section title & description derived from metadata with fallback to definition
  const currentSectionTitle = useMemo(() => {
    if (!activeSection) return undefined;
    return metadata.sections?.[activeSection.key]?.title ?? activeSection.label;
  }, [activeSection, metadata]);

  const currentSectionDescription = useMemo(() => {
    if (!activeSection) return undefined;
    return (
      metadata.sections?.[activeSection.key]?.description ??
      activeSection.description ??
      undefined
    );
  }, [activeSection, metadata]);

  // Selected subgroup data
  const selectedSubgroupData = useMemo(() => {
    if (!selectedSubgroupKey || !activeSection) return null;
    const definedGroups = KNOWN_SECTION_GROUPS[activeSection.key] ?? [];
    const groupDef = definedGroups.find((g) => g.key === selectedSubgroupKey) ?? {
      key: selectedSubgroupKey,
      title: selectedSubgroupKey.replace(/_/g, ' ').toUpperCase(),
      description: undefined,
    };
    const customMeta = metadata.subgroups?.[selectedSubgroupKey];
    return {
      key: selectedSubgroupKey,
      sectionKey: activeSection.key,
      title: customMeta?.title || groupDef.title,
      description:
        customMeta?.description !== undefined ? customMeta.description : groupDef.description,
    };
  }, [selectedSubgroupKey, activeSection, metadata]);

  // Section & subgroup editing handlers
  const handleUpdateSectionTitle = useCallback(
    (secKey: string, title: string) => {
      setMetadata((prev) => ({
        ...prev,
        customSections: prev.customSections?.map((cs) =>
          cs.key === secKey ? { ...cs, title } : cs,
        ),
        sections: {
          ...prev.sections,
          [secKey]: {
            ...prev.sections?.[secKey],
            title,
          },
        },
      }));
      setDraftSections((prev) =>
        prev.map((s) => (s.key === secKey ? { ...s, label: title } : s)),
      );
    },
    [],
  );

  const handleUpdateSectionDescription = useCallback(
    (secKey: string, description: string) => {
      setMetadata((prev) => ({
        ...prev,
        customSections: prev.customSections?.map((cs) =>
          cs.key === secKey ? { ...cs, description } : cs,
        ),
        sections: {
          ...prev.sections,
          [secKey]: {
            ...prev.sections?.[secKey],
            description,
          },
        },
      }));
      setDraftSections((prev) =>
        prev.map((s) => (s.key === secKey ? { ...s, description } : s)),
      );
    },
    [],
  );

  const handleUpdateSectionVisibility = useCallback(
    (secKey: string, visible: boolean) => {
      if (!visible && MANDATORY_SECTION_KEYS.includes(secKey)) {
        return;
      }
      setMetadata((prev) => ({
        ...prev,
        sections: {
          ...prev.sections,
          [secKey]: {
            ...prev.sections?.[secKey],
            visible,
          },
        },
      }));
      setDraftSections((prev) =>
        prev.map((s) => (s.key === secKey ? { ...s, visible } : s)),
      );
    },
    [],
  );

  const handleMoveSectionUp = useCallback(
    (secKey: string) => {
      setDraftSections((prev) => {
        const idx = prev.findIndex((s) => s.key === secKey);
        if (idx <= 0) return prev;
        const reordered = arrayMove(prev, idx, idx - 1);
        setMetadata((metaPrev) => ({
          ...metaPrev,
          sectionOrder: reordered.map((s) => s.key),
        }));
        return reordered;
      });
    },
    [],
  );

  const handleMoveSectionDown = useCallback(
    (secKey: string) => {
      setDraftSections((prev) => {
        const idx = prev.findIndex((s) => s.key === secKey);
        if (idx === -1 || idx >= prev.length - 1) return prev;
        const reordered = arrayMove(prev, idx, idx + 1);
        setMetadata((metaPrev) => ({
          ...metaPrev,
          sectionOrder: reordered.map((s) => s.key),
        }));
        return reordered;
      });
    },
    [],
  );

  const handleAddSection = useCallback(
    (title: string, description?: string) => {
      const newKey = `custom_sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setDraftSections((prev) => {
        const newSection: ResolvedFormSection = {
          key: newKey,
          label: title,
          description: description ?? null,
          configurable: true,
          origin: 'custom',
          protected: false,
          visible: true,
          order: prev.length + 1,
          fields: [],
        };
        const next = [...prev, newSection];
        setMetadata((metaPrev) => ({
          ...metaPrev,
          customSections: [
            ...(metaPrev.customSections ?? []),
            {
              key: newKey,
              title,
              description: description || undefined,
              order: next.length,
            },
          ],
          sections: {
            ...metaPrev.sections,
            [newKey]: {
              title,
              description: description || undefined,
              visible: true,
            },
          },
          sectionOrder: next.map((s) => s.key),
        }));
        return next;
      });

      setActiveSectionKey(newKey);
      setSelectedFieldKey(null);
      setSelectedSubgroupKey(null);
    },
    [],
  );

  const handleDeleteSection = useCallback(
    (secKey: string) => {
      setDraftSections((prev) => {
        const target = prev.find((s) => s.key === secKey);
        if (!target || target.origin !== 'custom' || target.protected) {
          return prev;
        }
        const filtered = prev.filter((s) => s.key !== secKey);
        setMetadata((metaPrev) => {
          const nextSections = { ...metaPrev.sections };
          delete nextSections[secKey];
          return {
            ...metaPrev,
            customSections: (metaPrev.customSections ?? []).filter((cs) => cs.key !== secKey),
            sections: nextSections,
            sectionOrder: filtered.map((s) => s.key),
          };
        });
        return filtered;
      });

      setActiveSectionKey('general');
      setSelectedFieldKey(null);
      setSelectedSubgroupKey(null);
    },
    [],
  );

  const handleUpdateSubgroupTitle = useCallback((groupKey: string, title: string) => {
    setMetadata((prev) => ({
      ...prev,
      subgroups: {
        ...prev.subgroups,
        [groupKey]: {
          ...prev.subgroups?.[groupKey],
          title,
        },
      },
    }));
  }, []);

  const handleUpdateSubgroupDescription = useCallback((groupKey: string, description: string) => {
    setMetadata((prev) => ({
      ...prev,
      subgroups: {
        ...prev.subgroups,
        [groupKey]: {
          ...prev.subgroups?.[groupKey],
          description,
        },
      },
    }));
  }, []);

  const handleSelectSubgroup = useCallback((groupKey: string) => {
    setSelectedSubgroupKey(groupKey);
    setSelectedFieldKey(null);
  }, []);

  // Select section handler: selects active section and clears field/subgroup selection
  // so Form Properties tab is displayed immediately.
  const handleSelectSection = useCallback(
    (secKey: string) => {
      setActiveSectionKey(secKey);
      setSelectedSubgroupKey(null);
      setSelectedFieldKey(null);
    },
    [],
  );

  // Select field handler
  const handleSelectField = useCallback(
    (fieldKey: string) => {
      setSelectedFieldKey(fieldKey);
      for (const sec of draftSections) {
        const found = sec.fields.find((f) => f.key === fieldKey);
        if (found) {
          setActiveSectionKey(sec.key);
          const subgroup = getSubgroupForField(sec.key, found, metadata);
          setSelectedSubgroupKey(subgroup);
          break;
        }
      }
    },
    [draftSections, metadata],
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

  /**
   * Adds a new custom field at an explicit position:
   * - 'before': immediately preceding targetFieldKey
   * - 'after': immediately following targetFieldKey
   * - 'end_of_subgroup': at the end of the specified targetGroupKey
   * - default: at the end of the section
   *
   * Automatically selects the new field so its properties appear in the inspector.
   */
  const handleAddFieldAtPosition = useCallback(
    ({
      type,
      label,
      sectionKey,
      targetFieldKey,
      position = 'after',
      targetGroupKey,
    }: {
      type: CustomFieldType;
      label?: string;
      sectionKey?: string;
      targetFieldKey?: string;
      position?: 'before' | 'after' | 'end_of_subgroup';
      targetGroupKey?: string;
    }) => {
      let createdFieldKey: string | null = null;
      let targetSectionResultKey: string = 'general';
      let assignedSubgroup: string = targetGroupKey || 'additional_info';

      setDraftSections((prev) => {
        const targetSecKey = sectionKey || activeSectionKey || 'general';
        let targetSec = prev.find((s) => s.key === targetSecKey && s.configurable);

        if (!targetSec) {
          targetSec = prev.find((s) => s.configurable);
        }

        if (!targetSec) return prev;

        targetSectionResultKey = targetSec.key;
        const sortedFields = [...targetSec.fields].sort((a, b) => a.order - b.order);

        let insertIndex = sortedFields.length;
        let effectiveGroupKey = targetGroupKey || 'additional_info';

        if (targetFieldKey) {
          const targetIdx = sortedFields.findIndex((f) => f.key === targetFieldKey);
          if (targetIdx !== -1 && sortedFields[targetIdx]) {
            const targetField = sortedFields[targetIdx]!;
            effectiveGroupKey =
              targetGroupKey || getSubgroupForField(targetSec.key, targetField, metadata);
            insertIndex = position === 'before' ? targetIdx : targetIdx + 1;
          }
        } else if (targetGroupKey) {
          effectiveGroupKey = targetGroupKey;
          // Find all fields currently belonging to this group
          const groupFields = sortedFields.filter(
            (f) => getSubgroupForField(targetSec.key, f, metadata) === targetGroupKey,
          );
          if (groupFields.length > 0 && groupFields[groupFields.length - 1]) {
            const lastField = groupFields[groupFields.length - 1]!;
            const lastIdx = sortedFields.findIndex((f) => f.key === lastField.key);
            insertIndex = lastIdx !== -1 ? lastIdx + 1 : sortedFields.length;
          } else {
            // Empty group: find relative position of targetGroupKey among KNOWN_SECTION_GROUPS
            const definedGroups = KNOWN_SECTION_GROUPS[targetSec.key] ?? [];
            const groupDefIndex = definedGroups.findIndex((g) => g.key === targetGroupKey);
            if (groupDefIndex !== -1) {
              const subsequentGroupKeys = new Set(
                definedGroups.slice(groupDefIndex + 1).map((g) => g.key),
              );
              const firstSubsequentIdx = sortedFields.findIndex((f) =>
                subsequentGroupKeys.has(getSubgroupForField(targetSec.key, f, metadata)),
              );
              insertIndex = firstSubsequentIdx !== -1 ? firstSubsequentIdx : sortedFields.length;
            } else {
              insertIndex = sortedFields.length;
            }
          }
        }

        assignedSubgroup = effectiveGroupKey;

        const newField = createNewCustomField(
          type,
          label ?? `New ${type.replace(/_/g, ' ')}`,
          insertIndex + 1,
          effectiveGroupKey,
        );

        createdFieldKey = newField.key;
        sortedFields.splice(insertIndex, 0, newField);
        const reindexed = sortedFields.map((f, i) => ({ ...f, order: i + 1 }));

        return prev.map((sec) =>
          sec.key === targetSec!.key ? { ...sec, fields: reindexed } : sec,
        );
      });

      if (createdFieldKey) {
        const newKey = createdFieldKey;
        const newSubgroup = assignedSubgroup;
        setMetadata((prev) => ({
          ...prev,
          fieldSubgroups: {
            ...prev.fieldSubgroups,
            [newKey]: newSubgroup,
          },
        }));
        setSelectedFieldKey(newKey);
        setSelectedSubgroupKey(newSubgroup);
        setActiveSectionKey(targetSectionResultKey);
      }
    },
    [activeSectionKey, metadata],
  );

  /**
   * Moves a field to a specific subgroup within the same section.
   * Updates subgroup membership and field ordering.
   */
  const handleMoveFieldToSubgroup = useCallback(
    (fieldKey: string, sectionKey: string, targetGroupKey: string) => {
      setMetadata((prev) => ({
        ...prev,
        fieldSubgroups: {
          ...prev.fieldSubgroups,
          [fieldKey]: targetGroupKey,
        },
      }));

      setDraftSections((prev) =>
        prev.map((sec) => {
          if (sec.key !== sectionKey) return sec;
          const sorted = [...sec.fields].sort((a, b) => a.order - b.order);
          const fromIdx = sorted.findIndex((f) => f.key === fieldKey);
          if (fromIdx === -1) return sec;

          const [fieldToMove] = sorted.splice(fromIdx, 1);
          if (!fieldToMove) return sec;

          // Find insert position at end of targetGroupKey
          const groupFields = sorted.filter(
            (f) => getSubgroupForField(sec.key, f, metadata) === targetGroupKey,
          );
          let insertIdx = sorted.length;
          if (groupFields.length > 0 && groupFields[groupFields.length - 1]) {
            const lastField = groupFields[groupFields.length - 1]!;
            const lastIdx = sorted.findIndex((f) => f.key === lastField.key);
            insertIdx = lastIdx !== -1 ? lastIdx + 1 : sorted.length;
          } else {
            const definedGroups = KNOWN_SECTION_GROUPS[sec.key] ?? [];
            const groupDefIndex = definedGroups.findIndex((g) => g.key === targetGroupKey);
            if (groupDefIndex !== -1) {
              const subsequentGroupKeys = new Set(
                definedGroups.slice(groupDefIndex + 1).map((g) => g.key),
              );
              const firstSubsequentIdx = sorted.findIndex((f) =>
                subsequentGroupKeys.has(getSubgroupForField(sec.key, f, metadata)),
              );
              insertIdx = firstSubsequentIdx !== -1 ? firstSubsequentIdx : sorted.length;
            }
          }

          const updatedField = {
            ...fieldToMove,
            config:
              fieldToMove.origin === 'custom'
                ? { ...fieldToMove.config, groupKey: targetGroupKey }
                : fieldToMove.config,
          };
          sorted.splice(insertIdx, 0, updatedField);

          return {
            ...sec,
            fields: sorted.map((f, i) => ({ ...f, order: i + 1 })),
          };
        }),
      );

      setSelectedFieldKey(fieldKey);
      setSelectedSubgroupKey(targetGroupKey);
    },
    [metadata],
  );

  /** Reorders two fields within the same section using the canonical arrayMove
   * helper. Field `order` values are re-indexed after every move so the
   * persisted form definition always reflects the visual sequence.
   */
  const handleReorderFields = useCallback(
    (fromKey: string, toKey: string) => {
      let destGroup: string | null = null;
      setDraftSections((prev) =>
        prev.map((sec) => {
          // ROOT-CAUSE FIX: sort by `order` before computing indices.
          // FormCanvas renders fields sorted by `order`; without sorting here,
          // findIndex returns raw array positions that may not match the visual
          // sequence, causing arrayMove to reorder fields at the wrong indices.
          const sorted = [...sec.fields].sort((a, b) => a.order - b.order);
          const fromIdx = sorted.findIndex((f) => f.key === fromKey);
          const toIdx = sorted.findIndex((f) => f.key === toKey);
          // Both fields must be in the same section; cross-section drags are ignored.
          if (fromIdx === -1 || toIdx === -1 || !sorted[toIdx]) return sec;

          const toField = sorted[toIdx]!;
          destGroup = getSubgroupForField(sec.key, toField, metadata);
          const reordered = arrayMove(sorted, fromIdx, toIdx);

          return {
            ...sec,
            fields: reordered.map((f, i) => {
              const updated = { ...f, order: i + 1 };
              if (f.key === fromKey && f.origin === 'custom') {
                updated.config = { ...updated.config, groupKey: destGroup! };
              }
              return updated;
            }),
          };
        }),
      );

      if (destGroup) {
        const group: string = destGroup;
        setMetadata((prev) => ({
          ...prev,
          fieldSubgroups: {
            ...prev.fieldSubgroups,
            [fromKey]: group,
          },
        }));
        setSelectedSubgroupKey(group);
      }
    },
    [metadata],
  );

  // ─── Drag orchestration ──────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as
      | {
          isField?: boolean;
          fieldKey?: string;
          isToolbox?: boolean;
          type?: CustomFieldType;
          label?: string;
        }
      | undefined;

    if (data?.isField && data.fieldKey) {
      setActiveDragFieldKey(data.fieldKey);
      setActiveDragToolboxItem(null);
    } else if (data?.isToolbox && data.type && data.label) {
      setActiveDragToolboxItem({ type: data.type, label: data.label });
      setActiveDragFieldKey(null);
    }
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveDragFieldKey(null);
    setActiveDragToolboxItem(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragFieldKey(null);
      setActiveDragToolboxItem(null);
      const { active, over } = event;
      if (!over || active.id === over.id || String(over.id).startsWith('toolbox-')) return;

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
            groupKey?: string;
            isField?: boolean;
            fieldKey?: string;
            isSubgroupEnd?: boolean;
            isSubgroupEmpty?: boolean;
            dropPosition?: 'before' | 'after';
          }
        | undefined;

      // ── Toolbox → canvas ──────────────────────────────────────────────────
      if (activeData?.isToolbox && activeData.type) {
        // Resolve target section
        let targetSectionKey =
          overData?.sectionKey ||
          (String(over.id).startsWith('subgroup-end:')
            ? String(over.id).split(':')[1]
            : String(over.id).startsWith('section-')
              ? String(over.id).replace('section-', '')
              : draftSections.find((sec) =>
                  sec.fields.some((f) => f.key === String(over.id)),
                )?.key);

        if (!targetSectionKey) {
          targetSectionKey = activeSectionKey || 'general';
        }

        // Case 1: Dropped at the end of a subgroup or on an empty subgroup
        if (
          overData?.isSubgroupEnd ||
          String(over.id).startsWith('subgroup-end:') ||
          overData?.isSubgroupEmpty ||
          String(over.id).startsWith('subgroup-empty:')
        ) {
          const groupKey =
            overData?.groupKey || String(over.id).split(':')[2];
          handleAddFieldAtPosition({
            type: activeData.type,
            label: activeData.label,
            sectionKey: targetSectionKey,
            position: 'end_of_subgroup',
            targetGroupKey: groupKey,
          });
          return;
        }

        // Case 2: Dropped over an existing field (before or after)
        const targetFieldKey =
          overData?.fieldKey ||
          (!String(over.id).startsWith('section-') &&
            !String(over.id).startsWith('subgroup-end:') &&
            !String(over.id).startsWith('subgroup-empty:')
            ? String(over.id)
            : undefined);

        if (targetFieldKey) {
          const overRect = over.rect;
          const activeRect = active.rect.current.translated;
          let isAfter = false;
          if (activeRect && overRect && overRect.height > 0) {
            const activeCenterY = activeRect.top + activeRect.height / 2;
            const overCenterY = overRect.top + overRect.height / 2;
            isAfter = activeCenterY > overCenterY;
          }
          const position = overData?.dropPosition || (isAfter ? 'after' : 'before');

          handleAddFieldAtPosition({
            type: activeData.type,
            label: activeData.label,
            sectionKey: targetSectionKey,
            targetFieldKey,
            position,
            targetGroupKey: overData?.groupKey,
          });
          return;
        }

        // Case 3: Dropped on the general section canvas body
        handleAddFieldAtPosition({
          type: activeData.type,
          label: activeData.label,
          sectionKey: targetSectionKey,
        });
        return;
      }

      // ── Field → field (sortable reorder or subgroup move) ─────────────────
      if (activeData?.isField) {
        const fromKey = String(active.id);
        if (
          overData?.isSubgroupEnd ||
          String(over.id).startsWith('subgroup-end:') ||
          overData?.isSubgroupEmpty ||
          String(over.id).startsWith('subgroup-empty:')
        ) {
          const targetGroup = overData?.groupKey || String(over.id).split(':')[2];
          const targetSec =
            overData?.sectionKey || String(over.id).split(':')[1] || activeSectionKey;
          if (targetGroup) {
            handleMoveFieldToSubgroup(fromKey, targetSec, targetGroup);
          }
          return;
        }

        if (
          overData?.isField ||
          (!String(over.id).startsWith('section-') &&
            !String(over.id).startsWith('subgroup-end:') &&
            !String(over.id).startsWith('subgroup-empty:'))
        ) {
          handleReorderFields(fromKey, String(over.id));
        }
      }
    },
    [
      handleAddFieldAtPosition,
      handleMoveFieldToSubgroup,
      handleReorderFields,
      draftSections,
      activeSectionKey,
    ],
  );

  /**
   * Collision detection strategy:
   * Prioritizes pointer-within for specific field cards and subgroup drop targets
   * before falling back to rect intersection and closest center.
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        const specific = pointerCollisions.find(
          (c) => c.id !== `section-${activeSectionKey}` && !String(c.id).startsWith('section-'),
        );
        if (specific) {
          return [specific, ...pointerCollisions.filter((c) => c.id !== specific.id)];
        }
        return pointerCollisions;
      }

      const rectCollisions = rectIntersection(args);
      if (rectCollisions.length > 0) {
        const specific = rectCollisions.find(
          (c) => c.id !== `section-${activeSectionKey}` && !String(c.id).startsWith('section-'),
        );
        if (specific) {
          return [specific, ...rectCollisions.filter((c) => c.id !== specific.id)];
        }
        return rectCollisions;
      }

      return closestCenter(args);
    },
    [activeSectionKey],
  );

  // Discard changes
  const handleDiscard = useCallback(() => {
    if (!persistedForm) return;
    setDraftSections(JSON.parse(JSON.stringify(persistedForm.sections)));
    setMetadata(JSON.parse(JSON.stringify(persistedForm.form.metadata ?? {})));
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
        metadata,
        sections: draftSections
          .filter((s) => s.configurable)
          .map((sec) => ({
            key: sec.key,
            visible: metadata.sections?.[sec.key]?.visible ?? sec.visible ?? true,
            order: metadata.sectionOrder ? metadata.sectionOrder.indexOf(sec.key) + 1 : undefined,
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
      setMetadata(JSON.parse(JSON.stringify(updated.form.metadata ?? {})));
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
  }, [persistedForm, draftSections, metadata, formKey]);

  const handleBack = useCallback(() => {
    navigate('/hrms/settings');
  }, [navigate]);

  const isMandatorySection = Boolean(
    activeSection &&
      (activeSection.protected || MANDATORY_SECTION_KEYS.includes(activeSection.key)),
  );

  const sectionOrderIndex = activeSection
    ? draftSections.findIndex((s) => s.key === activeSection.key)
    : -1;

  const totalSections = draftSections.length;

  const currentSectionVisible = activeSection
    ? (metadata.sections?.[activeSection.key]?.visible ?? activeSection.visible !== false)
    : true;

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
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="bezent-editor-workspace">
          {/* Left Toolbox */}
          <FieldToolbox
            onAddField={(type, label) =>
              handleAddFieldAtPosition({ type, label, sectionKey: activeSectionKey })
            }
            activeSectionLabel={activeSection?.label}
            isConfigurable={activeSection?.configurable ?? true}
          />

          {/* Center Canvas */}
          <FormCanvas
            sections={draftSections}
            activeSectionKey={activeSectionKey}
            selectedFieldKey={selectedFieldKey}
            selectedSubgroupKey={selectedSubgroupKey}
            sectionTitle={currentSectionTitle}
            sectionDescription={currentSectionDescription}
            metadata={metadata}
            onSelectSection={handleSelectSection}
            onSelectField={handleSelectField}
            onSelectSubgroup={handleSelectSubgroup}
            onDeleteField={handleDeleteField}
          />

          {/* Right Inspector */}
          <FieldProperties
            field={selectedField}
            form={persistedForm.form}
            activeSection={activeSection}
            sectionTitle={currentSectionTitle}
            sectionDescription={currentSectionDescription}
            sectionVisible={currentSectionVisible}
            sectionOrderIndex={sectionOrderIndex}
            totalSections={totalSections}
            isMandatorySection={isMandatorySection}
            selectedSubgroup={selectedSubgroupData}
            onUpdateSectionTitle={handleUpdateSectionTitle}
            onUpdateSectionDescription={handleUpdateSectionDescription}
            onUpdateSectionVisibility={handleUpdateSectionVisibility}
            onMoveSectionUp={handleMoveSectionUp}
            onMoveSectionDown={handleMoveSectionDown}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
            onUpdateSubgroupTitle={handleUpdateSubgroupTitle}
            onUpdateSubgroupDescription={handleUpdateSubgroupDescription}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onDeselectField={() => setSelectedFieldKey(null)}
          />
        </div>

        {/*
         * DragOverlay renders a floating ghost card that follows the cursor
         * while a field or toolbox item is being dragged.
         */}
        <DragOverlay>
          {activeDragFieldKey !== null && (() => {
            const field = draftSections
              .flatMap((s) => s.fields)
              .find((f) => f.key === activeDragFieldKey);
            if (!field) return null;
            return (
              <div className="bezent-drag-overlay-chip">
                <BezentIcon name="more" size={14} />
                <span>{field.label}</span>
              </div>
            );
          })()}
          {activeDragToolboxItem !== null && (
            <div className="bezent-drag-overlay-chip">
              <BezentIcon name="add" size={14} />
              <span>{activeDragToolboxItem.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
