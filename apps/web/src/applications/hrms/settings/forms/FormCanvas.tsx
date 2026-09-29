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
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  FormCustomizationMetadata,
  ResolvedFormField,
  ResolvedFormSection,
} from '../api/formsApi';
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
  onSelectSection?: (sectionKey: string) => void;
  onSelectField: (fieldKey: string) => void;
  onSelectSubgroup?: (groupKey: string) => void;
  /** Fired when a custom field should be deleted. */
  onDeleteField: (fieldKey: string) => void;
  onQuickAddField?: (sectionKey: string) => void;
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
    return (
      <Input
        size="sm"
        readOnly
        value="EMP2026001"
        placeholder="EMP2026001"
        rightIcon={
          <Button variant="secondary" size="sm" type="button" tabIndex={-1}>
            Auto
          </Button>
        }
      />
    );
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

  const labelNode = (
    <Inline gap="xs" align="center">
      <span>{field.label}</span>
      {field.required && (
        <span className="bezent-label__required" aria-hidden="true">
          *
        </span>
      )}
      {!field.enabled && (
        <Badge variant="neutral" size="sm">
          Disabled
        </Badge>
      )}
    </Inline>
  );

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
    >
      <FormField
        labelNode={labelNode}
        selectable
        selected={isSelected}
        span={field.width === 'full' ? 'full' : 1}
        helperText={field.description ?? undefined}
        onClick={onSelect}
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
 * Drop target positioned at the end of a subgroup. Allows dropping toolbox items
 * or dragging fields directly to the end of this subgroup.
 */
export function SubgroupDropZone({
  sectionKey,
  groupKey,
  groupTitle,
}: {
  sectionKey: string;
  groupKey: string;
  groupTitle: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `subgroup-end:${sectionKey}:${groupKey}`,
    data: {
      isSubgroupEnd: true,
      sectionKey,
      groupKey,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bezent-subgroup-dropzone ${isOver ? 'is-over' : ''}`.trim()}
      data-testid={`dropzone-${groupKey}`}
      title={`Drop field here to place at end of ${groupTitle}`}
    >
      <span className="bezent-subgroup-dropzone__label">
        <BezentIcon name="add" size={12} />
        {isOver ? `Drop at end of ${groupTitle}` : `Add to ${groupTitle}`}
      </span>
    </div>
  );
}

export function SubgroupEmptyDropZone({
  sectionKey,
  groupKey,
  groupTitle,
}: {
  sectionKey: string;
  groupKey: string;
  groupTitle: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `subgroup-empty:${sectionKey}:${groupKey}`,
    data: {
      isSubgroupEmpty: true,
      sectionKey,
      groupKey,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bezent-subgroup-dropzone bezent-subgroup-dropzone--empty ${isOver ? 'is-over' : ''}`.trim()}
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
  onSelectSection,
  onSelectField,
  onSelectSubgroup,
  onDeleteField,
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
      {/* 1. Section Selector Bar */}
      <div className="bezent-canvas-section-bar">
        <div className="bezent-canvas-section-selector">
          <Label as="span" size="sm">
            <strong>Section</strong>
          </Label>
          <div className="bezent-canvas-section-select-wrap">
            <Select
              size="sm"
              value={effectiveSectionKey}
              onChange={(e) => onSelectSection?.(e.target.value)}
              options={sections.map((s) => {
                const meta = CHAPTER_METADATA.find((c) => c.key === s.key);
                const customSecTitle = metadata?.sections?.[s.key]?.title;
                const isHidden =
                  metadata?.sections?.[s.key]?.visible === false ||
                  (s.visible === false && metadata?.sections?.[s.key]?.visible !== true);
                const baseTitle = customSecTitle || meta?.label || s.label;
                return {
                  value: s.key,
                  label: isHidden ? `${baseTitle} (Hidden)` : baseTitle,
                };
              })}
            />
          </div>
        </div>

        <div className="bezent-canvas-section-meta">
          <Badge variant={currentSection?.configurable ? 'success' : 'neutral'} size="sm">
            {currentSection?.configurable ? 'Configurable Form' : 'Standard Workflow'}
          </Badge>
          <Badge variant="neutral" size="sm">
            {sectionFields.length} {sectionFields.length === 1 ? 'field' : 'fields'}
          </Badge>
        </div>
      </div>

      {/* 2. Scrollable Canvas Body */}
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
                    const isSubgroupSelected = selectedSubgroupKey === group.key;
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
                          title={group.title}
                          description={group.description}
                          actions={
                            <Inline gap="xs" align="center">
                              {isSubgroupSelected && (
                                <Badge variant="info" size="sm">
                                  Selected Subgroup
                                </Badge>
                              )}
                              <Button
                                variant={isSubgroupSelected ? 'secondary' : 'text'}
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSubgroup?.(group.key);
                                }}
                                title="Edit subgroup properties"
                                aria-label={`Edit ${group.title}`}
                              >
                                <BezentIcon name="edit" size={12} />
                                {isSubgroupSelected ? 'Editing' : 'Edit Subgroup'}
                              </Button>
                            </Inline>
                          }
                        >
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
                            />
                          )}
                          <SubgroupDropZone
                            sectionKey={effectiveSectionKey}
                            groupKey={group.key}
                            groupTitle={group.title}
                          />
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
