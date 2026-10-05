import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FormField,
  FormGrid,
  FormSection,
  Inline,
  Input,
  Label,
  Pane,
  Select,
  Stack,
} from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type {
  FormCustomizationMetadata,
  ResolvedFormField,
  ResolvedFormSection,
} from '../../api/formsApi';
import { CHAPTER_METADATA, getGroupsForSection, type ChapterDefinition } from './types';

// ─── Public prop surface ────────────────────────────────────────────────────

export interface FormCanvasProps {
  sections: ResolvedFormSection[];
  activeSectionKey?: string;
  selectedFieldKey: string | null;
  selectedSubgroupKey?: string | null;
  sectionTitle?: string;
  sectionDescription?: string;
  metadata?: FormCustomizationMetadata;
  isDragging?: boolean;
  onSelectSection?: (sectionKey: string) => void;
  onSelectField: (fieldKey: string) => void;
  onSelectSubgroup?: (groupKey: string) => void;
  /** Fired when a custom field should be deleted. */
  onDeleteField: (fieldKey: string) => void;
  onQuickAddField?: (sectionKey: string, groupKey?: string) => void;
  onUpdateSubgroupTitle?: (groupKey: string, title: string) => void;
  onUpdateSubgroupDescription?: (groupKey: string, description: string) => void;
  onUpdateField?: (updated: ResolvedFormField) => void;
}

// ─── Sample data helpers ─────────────────────────────────────────────────────

function getSampleOptionsForField(fieldKey: string): Array<{ value: string; label: string }> {
  switch (fieldKey) {
    case 'general.employmentType':
      return [
        { value: 'full_time', label: 'Full Time' },
        { value: 'part_time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'intern', label: 'Intern' },
      ];
    case 'general.employmentStatus':
      return [
        { value: 'pending_activation', label: 'Pending Activation' },
        { value: 'active', label: 'Active' },
        { value: 'probation', label: 'Probation' },
      ];
    case 'general.department':
      return [
        { value: 'eng', label: 'Engineering' },
        { value: 'prod', label: 'Product' },
        { value: 'ops', label: 'Operations' },
        { value: 'hr', label: 'Human Resources' },
      ];
    case 'general.team':
      return [
        { value: 'product_dev', label: 'Product Development' },
        { value: 'core', label: 'Core Platform' },
        { value: 'qa', label: 'Quality Engineering' },
      ];
    case 'general.designation':
      return [
        { value: 'se', label: 'Software Engineer' },
        { value: 'sse', label: 'Senior Software Engineer' },
        { value: 'lead', label: 'Technical Lead' },
      ];
    case 'general.gradeLevel':
      return [
        { value: 'l1', label: 'L1 - Associate' },
        { value: 'l2', label: 'L2 - Mid Level' },
        { value: 'l3', label: 'L3 - Senior' },
      ];
    case 'general.reportingManager':
      return [
        { value: 'mgr1', label: 'Rakesh Kumar' },
        { value: 'mgr2', label: 'Priya Sharma' },
      ];
    case 'general.organisationUnit':
      return [
        { value: 'tech', label: 'Technology' },
        { value: 'operations', label: 'Operations' },
      ];
    case 'general.officeLocation':
      return [
        { value: 'chennai', label: 'Chennai - Main Office' },
        { value: 'blr', label: 'Bengaluru - Tech Hub' },
      ];
    case 'personal.gender':
      return [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'non_binary', label: 'Non-binary' },
      ];
    case 'personal.maritalStatus':
      return [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married' },
      ];
    case 'personal.bloodGroup':
      return [
        { value: 'o_pos', label: 'O+ Positive' },
        { value: 'a_pos', label: 'A+ Positive' },
        { value: 'b_pos', label: 'B+ Positive' },
        { value: 'ab_pos', label: 'AB+ Positive' },
      ];
    case 'personal.country':
      return [
        { value: 'in', label: 'India' },
        { value: 'us', label: 'United States' },
        { value: 'ae', label: 'United Arab Emirates' },
      ];
    case 'personal.city':
      return [
        { value: 'chennai', label: 'Chennai' },
        { value: 'bengaluru', label: 'Bengaluru' },
        { value: 'mumbai', label: 'Mumbai' },
      ];
    default:
      return [
        { value: 'opt1', label: 'Option 1' },
        { value: 'opt2', label: 'Option 2' },
      ];
  }
}

// ─── Field input preview ──────────────────────────────────────────────────────

export function CanvasFieldControl({ field }: { field: ResolvedFormField }) {
  if (field.key === 'general.employeeId') {
    return null;
  }

  switch (field.type) {
    case 'dropdown':
    case 'select':
    case 'reference': {
      const opts = field.config?.options?.length
        ? field.config.options
        : getSampleOptionsForField(field.key);
      return (
        <Select
          size="sm"
          options={opts}
          value={opts[0]?.value ?? ''}
          tabIndex={-1}
          onChange={() => {}}
        />
      );
    }
    case 'checkbox':
      return <Checkbox label={field.label} checked={false} tabIndex={-1} onChange={() => {}} />;
    case 'radio': {
      const opts = field.config?.options?.length
        ? field.config.options.slice(0, 3)
        : [
            { value: 'opt1', label: 'Option 1' },
            { value: 'opt2', label: 'Option 2' },
          ];
      return (
        <Inline gap="md" align="center">
          {opts.map((opt, idx) => (
            <Inline key={idx} gap="xs" align="center">
              <input type="radio" checked={idx === 0} readOnly tabIndex={-1} />
              <Label as="span" size="sm">
                {opt.label}
              </Label>
            </Inline>
          ))}
        </Inline>
      );
    }
    case 'multi_select': {
      const opts = field.config?.options?.length
        ? field.config.options
        : [{ value: 'all', label: 'Select multiple items...' }];
      return <Select size="sm" options={opts} value="" tabIndex={-1} onChange={() => {}} />;
    }
    case 'date':
    case 'time':
    case 'datetime':
      return (
        <Input
          size="sm"
          readOnly
          value=""
          placeholder={field.type === 'date' ? 'YYYY-MM-DD' : field.type.toUpperCase()}
          leftIcon={<BezentIcon name="calendar" size={14} />}
          tabIndex={-1}
        />
      );
    case 'file_upload':
      return (
        <div className="bezent-canvas-file-preview">
          <BezentIcon name="documents" size={16} />
          <span>Upload file (max {field.config?.maxSizeMb ?? 10} MB)</span>
        </div>
      );
    default:
      return (
        <Input
          size="sm"
          readOnly
          value=""
          placeholder={
            field.type === 'email'
              ? 'name@company.com'
              : field.type === 'phone'
                ? '+91 98765 43210'
                : (field.description ?? `Enter ${field.label}...`)
          }
          tabIndex={-1}
        />
      );
  }
}

// ─── Sortable field card ──────────────────────────────────────────────────────

interface SortableCanvasFieldProps {
  field: ResolvedFormField;
  isSelected: boolean;
  groupKey?: string;
  sectionKey?: string;
  onSelect: () => void;
  onDelete: () => void;
}

/**
 * A single field card in the Form Canvas.
 *
 * The drag handle (⠿) is **always** rendered so users can drag without first
 * selecting a field. Up/Down arrow buttons have been removed; reordering is
 * done exclusively via drag-and-drop. The Delete button remains visible only
 * for selected custom (company-owned) fields, preserving system-field protection.
 */
function SortableCanvasField({
  field,
  isSelected,
  groupKey,
  sectionKey,
  onSelect,
  onDelete,
}: SortableCanvasFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: field.key,
      data: {
        isField: true,
        fieldKey: field.key,
        groupKey,
        sectionKey,
      },
    });

  // UI-RULES Rule 1 exception: live drag transform — cannot be expressed as a
  // static CSS class. `transition` animates other fields smoothly into their
  // new positions while dragging and after a drop.
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax
      style={dragStyle}
      className={[
        'bezent-canvas-field-wrapper',
        isSelected ? 'is-selected' : '',
        isDragging ? 'is-dragging' : '',
        isOver ? 'is-drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <FormField
        labelNode={
          <Inline gap="xs" align="center">
            <span>{field.label}</span>
            {field.key === 'general.employeeId' ? (
              <Badge variant="neutral" size="sm">
                System Assigned
              </Badge>
            ) : field.required ? (
              <span className="bezent-label__required" aria-hidden="true">
                *
              </span>
            ) : null}
            {!field.enabled && (
              <Badge variant="neutral" size="sm">
                Disabled
              </Badge>
            )}
          </Inline>
        }
        selectable
        selected={isSelected}
        span={field.width === 'full' ? 'full' : 1}
        helperText={
          field.key === 'general.employeeId'
            ? 'Generated automatically'
            : (field.description ?? undefined)
        }
        onClick={(e?: React.MouseEvent) => {
          e?.stopPropagation();
          onSelect();
        }}
      >
        <CanvasFieldControl field={field} />
      </FormField>

      {/*
       * Drag handle — always visible so users do not need to select a field
       * before grabbing it. The `.bezent-canvas-field-handle` class positions
       * this absolutely inside the wrapper.
       */}
      <button
        type="button"
        className="bezent-canvas-field-handle"
        {...listeners}
        {...attributes}
        title="Drag to reorder"
        aria-label="Drag handle"
        tabIndex={0}
      >
        <BezentIcon name="more" size={14} />
      </button>

      {/*
       * Contextual action toolbar — only shown when the field is selected.
       * No Up/Down buttons; ordering is done via the drag handle above.
       * Delete is restricted to custom (company-owned) fields; system and
       * protected fields are never deletable.
       */}
      {isSelected && field.origin === 'custom' && (
        <div className="bezent-canvas-field-toolbar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="bezent-canvas-field-btn bezent-canvas-field-btn--danger"
            onClick={onDelete}
            title="Delete custom field"
            aria-label="Delete field"
          >
            <BezentIcon name="delete" size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Inline editable section title with pencil icon and double-click triggers.
 */
function InlineSectionTitle({
  title,
  onSave,
}: {
  title: string;
  onSave?: (newTitle: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  const handleConfirm = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title && onSave) {
      onSave(trimmed);
    } else {
      setDraft(title);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <span className="bezent-inline-edit-wrapper" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          className="bezent-inline-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancel();
            }
          }}
          autoFocus
          aria-label="Edit section title"
        />
        <button
          type="button"
          className="bezent-inline-edit-btn bezent-inline-edit-btn--confirm"
          onClick={handleConfirm}
          title="Save section title (Enter)"
          aria-label="Save section title"
        >
          <BezentIcon name="check" size={14} />
        </button>
        <button
          type="button"
          className="bezent-inline-edit-btn bezent-inline-edit-btn--cancel"
          onClick={handleCancel}
          title="Cancel editing (Esc)"
          aria-label="Cancel editing"
        >
          <BezentIcon name="close" size={14} />
        </button>
      </span>
    );
  }

  return (
    <span
      className="bezent-inline-edit-display"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Double click or click pencil to edit title"
    >
      <span>{title}</span>
      <button
        type="button"
        className="bezent-inline-edit-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="Edit section title"
        aria-label="Edit section title"
      >
        <BezentIcon name="edit" size={12} />
      </button>
    </span>
  );
}

/**
 * Inline editable section description with pencil icon and double-click triggers.
 */
function InlineSectionDescription({
  description,
  onSave,
}: {
  description: string;
  onSave?: (newDescription: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description);

  useEffect(() => {
    setDraft(description);
  }, [description]);

  const handleConfirm = () => {
    const trimmed = draft.trim();
    if (trimmed !== description && onSave) {
      onSave(trimmed);
    } else {
      setDraft(description);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(description);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <span className="bezent-inline-edit-wrapper" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          className="bezent-inline-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancel();
            }
          }}
          autoFocus
          aria-label="Edit section description"
        />
        <button
          type="button"
          className="bezent-inline-edit-btn bezent-inline-edit-btn--confirm"
          onClick={handleConfirm}
          title="Save section description (Enter)"
          aria-label="Save section description"
        >
          <BezentIcon name="check" size={14} />
        </button>
        <button
          type="button"
          className="bezent-inline-edit-btn bezent-inline-edit-btn--cancel"
          onClick={handleCancel}
          title="Cancel editing (Esc)"
          aria-label="Cancel editing"
        >
          <BezentIcon name="close" size={14} />
        </button>
      </span>
    );
  }

  return (
    <span
      className="bezent-inline-edit-display"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      title="Double click or click pencil to edit description"
    >
      <span>{description}</span>
      <button
        type="button"
        className="bezent-inline-edit-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        title="Edit section description"
        aria-label="Edit section description"
      >
        <BezentIcon name="edit" size={12} />
      </button>
    </span>
  );
}

/**
 * Drop target positioned at the end of a subgroup. Allows dropping toolbox items
 * or dragging fields directly to the end of this subgroup.
 */
export function SubgroupDropZone({
  sectionKey,
  groupKey,
  groupTitle,
  isDragging,
}: {
  sectionKey: string;
  groupKey: string;
  groupTitle: string;
  isDragging?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `subgroup-end:${sectionKey}:${groupKey}`,
    data: {
      isSubgroupEnd: true,
      sectionKey,
      groupKey,
    },
  });

  const active = isDragging || isOver;

  return (
    <div
      ref={setNodeRef}
      className={`bezent-subgroup-dropzone ${active ? 'is-active-drag' : 'is-idle'} ${isOver ? 'is-over' : ''}`.trim()}
      data-testid={`dropzone-${groupKey}`}
      title={`Drop field here to place at end of ${groupTitle}`}
    >
      <span className="bezent-subgroup-dropzone__label">
        <BezentIcon name="add" size={12} />
        {isOver ? `Drop at end of ${groupTitle}` : `Drop field here`}
      </span>
    </div>
  );
}

export function SubgroupEmptyDropZone({
  sectionKey,
  groupKey,
  groupTitle,
  isDragging,
}: {
  sectionKey: string;
  groupKey: string;
  groupTitle: string;
  isDragging?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `subgroup-empty:${sectionKey}:${groupKey}`,
    data: {
      isSubgroupEmpty: true,
      sectionKey,
      groupKey,
    },
  });

  const active = isDragging || isOver;

  return (
    <div
      ref={setNodeRef}
      className={`bezent-subgroup-dropzone bezent-subgroup-dropzone--empty ${active ? 'is-active-drag' : ''} ${isOver ? 'is-over' : ''}`.trim()}
      data-testid={`dropzone-empty-${groupKey}`}
      title={`Drop field here into empty subgroup ${groupTitle}`}
    >
      <span className="bezent-subgroup-dropzone__label">
        <BezentIcon name="add" size={12} />
        {isOver ? `Drop into ${groupTitle}` : `Empty Subgroup: Drop fields here`}
      </span>
    </div>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export function FormCanvas({
  sections,
  activeSectionKey,
  selectedFieldKey,
  selectedSubgroupKey,
  sectionTitle,
  sectionDescription,
  metadata,
  isDragging,
  onSelectSection: _onSelectSection,
  onSelectField,
  onSelectSubgroup,
  onDeleteField,
  onQuickAddField: _onQuickAddField,
  onUpdateSubgroupTitle,
  onUpdateSubgroupDescription,
  onUpdateField: _onUpdateField,
}: FormCanvasProps) {
  // Determine effective active section key
  const effectiveSectionKey =
    activeSectionKey ||
    sections.find((s) => s.fields.some((f) => f.key === selectedFieldKey))?.key ||
    sections.find((s) => s.configurable)?.key ||
    sections[0]?.key ||
    'general';

  const currentSection =
    sections.find((s) => s.key === effectiveSectionKey) ??
    sections.find((s) => s.configurable) ??
    sections[0];

  const chapterMeta: ChapterDefinition = CHAPTER_METADATA.find(
    (c) => c.key === effectiveSectionKey,
  ) || {
    key: effectiveSectionKey,
    stepNumber: '01',
    label: currentSection?.label || 'General',
    title: (currentSection?.label || 'GENERAL INFORMATION').toUpperCase(),
    description: 'Registration form attributes and layout configuration',
    kicker: 'CHAPTER // 01',
  };

  // Droppable zone for the active section — used by toolbox items dragged from
  // the Field Toolbox panel on the left. Field-to-field reordering uses
  // SortableContext (below) instead.
  const { setNodeRef } = useDroppable({
    id: `section-${effectiveSectionKey}`,
    data: {
      sectionKey: effectiveSectionKey,
    },
  });

  const sectionFields = currentSection?.fields ?? [];

  // ROOT-CAUSE FIX: getGroupsForSection assigns fields to groups using the
  // *static* KNOWN_SECTION_GROUPS.fieldKeys order, ignoring the `order`
  // property entirely. After each drag, arrayMove updates `order` values in
  // React state — but without re-sorting here, getGroupsForSection would
  // re-render fields in the original static sequence every time, making the
  // reorder appear invisible to the user.
  //
  // Fix: after grouping (which determines GROUP MEMBERSHIP), sort each
  // group's fields by their `order` property (which determines POSITION
  // within the group). This is the only place where `order` is consumed
  // for rendering; the rest of the pipeline already writes it correctly.
  const groups = currentSection
    ? getGroupsForSection(currentSection.key, sectionFields, metadata).map((group) => ({
        ...group,
        fields: [...group.fields].sort((a, b) => a.order - b.order),
      }))
    : [];

  // Flat list of field IDs in their exact rendered sequence — groups are
  // concatenated in definition order, fields within each group are sorted by
  // `order`. SortableContext items MUST match this rendered order for
  // verticalListSortingStrategy to compute correct drop positions.
  const sortableIds = groups.flatMap((g) => g.fields.map((f) => f.key));

  return (
    <Pane size="fluid" surface="canvas" aria-label="Form Canvas">
      {/* 1. Scrollable Canvas Body */}
      <div className="bezent-canvas-body" ref={setNodeRef}>
        <div className="bezent-canvas-paper">
          {/* Section Hidden Alert */}
          {(metadata?.sections?.[effectiveSectionKey]?.visible === false ||
            (currentSection?.visible === false &&
              metadata?.sections?.[effectiveSectionKey]?.visible !== true)) && (
            <Alert variant="warning" title="Hidden Section">
              This section is currently hidden from employee registration. Its configuration and
              custom fields remain preserved.
            </Alert>
          )}

          {/* Section Header */}
          <div className="bezent-canvas-header-clean">
            <h2 className="bezent-canvas-title-clean">{sectionTitle || chapterMeta.title}</h2>
            <p className="bezent-canvas-desc-clean">
              {sectionDescription ?? chapterMeta.description}
            </p>
          </div>

          {/* Form Content: Actual Registration Appearance */}
          {currentSection && currentSection.configurable ? (
            sectionFields.length === 0 ? (
              <EmptyState
                size="compact"
                hideIllustration
                title="No fields in section"
                description="Click or drag fields from the Field Toolbox on the left to add them to this section."
              />
            ) : (
              /*
               * SortableContext owns the flat ordered list of all fields in this
               * section. Each SortableCanvasField registers itself via useSortable
               * with the same ID. When the user releases a drag, FormEditorPage
               * calls arrayMove and re-indexes the `order` property so the new
               * sequence is persisted on Save.
               */
              <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                <Stack gap="xl">
                  {groups.map((group) => {
                    const isSubgroupSelected =
                      !selectedFieldKey && selectedSubgroupKey === group.key;
                    return (
                      <div
                        key={group.key}
                        className={`bezent-canvas-subgroup ${isSubgroupSelected ? 'is-selected' : ''}`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.bezent-canvas-field-wrapper'))
                            return;
                          onSelectSubgroup?.(group.key);
                        }}
                      >
                        <FormSection
                          title={
                            <InlineSectionTitle
                              title={group.title}
                              onSave={(newTitle) => onUpdateSubgroupTitle?.(group.key, newTitle)}
                            />
                          }
                          description={
                            <InlineSectionDescription
                              description={group.description || ''}
                              onSave={(newDesc) =>
                                onUpdateSubgroupDescription?.(group.key, newDesc)
                              }
                            />
                          }
                        >
                          <Stack gap="md">
                            {effectiveSectionKey === 'personal' &&
                              group.key === 'personal_details' && (
                                <div
                                  className={`bezent-canvas-field-wrapper bezent-canvas-specialized-control ${selectedFieldKey === 'personal.profilePhoto' ? 'is-selected' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectField('personal.profilePhoto');
                                  }}
                                >
                                  <FormField
                                    labelNode={
                                      <Inline gap="xs" align="center">
                                        <span>Profile Photo</span>
                                        <Badge variant="neutral" size="sm">
                                          System Control
                                        </Badge>
                                      </Inline>
                                    }
                                    selectable
                                    selected={selectedFieldKey === 'personal.profilePhoto'}
                                    span="full"
                                    helperText="JPG / PNG • Max 5 MB"
                                  >
                                    <div className="bezent-photo-uploader-preview">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        type="button"
                                        tabIndex={-1}
                                      >
                                        Upload Photo
                                      </Button>
                                    </div>
                                  </FormField>
                                </div>
                              )}
                            {group.fields.length > 0 ? (
                              <FormGrid columns={2} layout="horizontal" labelWidth="md">
                                {group.fields.map((field) => (
                                  <SortableCanvasField
                                    key={field.key}
                                    field={field}
                                    groupKey={group.key}
                                    sectionKey={effectiveSectionKey}
                                    isSelected={selectedFieldKey === field.key}
                                    onSelect={() => onSelectField(field.key)}
                                    onDelete={() => onDeleteField(field.key)}
                                  />
                                ))}
                              </FormGrid>
                            ) : (
                              <SubgroupEmptyDropZone
                                sectionKey={effectiveSectionKey}
                                groupKey={group.key}
                                groupTitle={group.title}
                                isDragging={isDragging}
                              />
                            )}
                            <SubgroupDropZone
                              sectionKey={effectiveSectionKey}
                              groupKey={group.key}
                              groupTitle={group.title}
                              isDragging={isDragging}
                            />
                          </Stack>
                        </FormSection>
                      </div>
                    );
                  })}
                </Stack>
              </SortableContext>
            )
          ) : (
            <Stack gap="md">
              {sectionFields.length > 0 && (
                <FormSection
                  title={`${chapterMeta.label.toUpperCase()} FIELDS`}
                  description="Standard platform attributes defined for this chapter"
                >
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    <FormGrid columns={2} layout="horizontal" labelWidth="md">
                      {[...sectionFields]
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <SortableCanvasField
                            key={field.key}
                            field={field}
                            isSelected={selectedFieldKey === field.key}
                            onSelect={() => onSelectField(field.key)}
                            onDelete={() => onDeleteField(field.key)}
                          />
                        ))}
                    </FormGrid>
                  </SortableContext>
                </FormSection>
              )}

              <EmptyState
                size="compact"
                hideIllustration
                title="Standard Platform Chapter"
                description="This registration chapter executes a predefined platform workflow. Form customization, layout editing, and custom field assignment are supported for General and Personal Information chapters."
              />
            </Stack>
          )}
        </div>
      </div>
    </Pane>
  );
}
