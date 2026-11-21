import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Button, Input } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type {
  ResolvedFormSection,
  ResolvedFormField,
  ConditionalRule,
  FieldPermissionRule,
} from '../../api/formsApi';
import { getGroupsForSection } from '../../administration/forms/types';

/** Reorders only the members of one group within the section's full field-key order. */
function reorderWithinGroup(
  allFieldKeysInOrder: string[],
  groupFieldKeys: string[],
  oldIndex: number,
  newIndex: number,
): string[] {
  const reorderedGroup = arrayMove(groupFieldKeys, oldIndex, newIndex);
  let cursor = 0;
  return allFieldKeysInOrder.map((key) =>
    groupFieldKeys.includes(key) ? reorderedGroup[cursor++]! : key,
  );
}

function fieldPlaceholder(field: ResolvedFormField): string {
  if (field.config?.placeholder) return field.config.placeholder as string;
  if (field.type === 'dropdown') return 'Select';
  if (field.type === 'date') return 'dd-mm-yyyy';
  if (field.type === 'number') return '0';
  return '';
}

interface SortableChapterTabProps {
  sectionKey: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SortableChapterTab({ sectionKey, label, isActive, onClick }: SortableChapterTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionKey,
  });

  // Live drag transform cannot be expressed as a static CSS class.
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <button
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax
      style={dragStyle}
      type="button"
      role="tab"
      aria-selected={isActive}
      className={`bezent-cif-canvas__chapter-tab ${
        isActive ? 'bezent-cif-canvas__chapter-tab--active' : ''
      } ${isDragging ? 'bezent-cif-canvas__chapter-tab--dragging' : ''}`}
      onClick={onClick}
      title={label}
    >
      <span className="bezent-cif-canvas__chapter-label">{label}</span>
    </button>
  );
}

interface SortableFieldCardProps {
  field: ResolvedFormField;
  isSelected: boolean;
  otherSections: { key: string; label: string }[];
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveToSection: (targetSectionKey: string) => void;
}

function SortableFieldCard({
  field,
  isSelected,
  otherSections,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveToSection,
}: SortableFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.key,
  });

  // Live drag transform cannot be expressed as a static CSS class.
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const placeholderText = fieldPlaceholder(field);

  return (
    <div
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax
      style={dragStyle}
      className={`bezent-cif-canvas-field ${
        field.width === 'half' ? 'bezent-cif-canvas-field--half' : ''
      } ${isSelected ? 'bezent-cif-canvas-field--selected' : ''} ${
        isDragging ? 'bezent-cif-canvas-field--dragging' : ''
      }`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === 'Enter') onSelect();
      }}
      aria-label={`Field: ${field.label}`}
    >
      {/* Left: Authentic Form Label */}
      <div className="bezent-cif-form-field-label">
        <span>{field.label}</span>
        {field.protected ? (
          <Badge variant="neutral" size="sm">
            System Assigned
          </Badge>
        ) : (
          field.required && <span className="bezent-cif-form-field-req">*</span>
        )}
      </div>

      {/* Right: honest system-assigned note (no fake editable input), or Authentic Input Mock */}
      {field.protected ? (
        <div className="bezent-cif-form-input-mock bezent-cif-form-input-mock--disabled">
          <span className="bezent-cif-input-mock-text">
            {field.protectedReason || 'Generated automatically'}
          </span>
        </div>
      ) : (
        <div
          className={`bezent-cif-form-input-mock ${
            field.config?.readOnly ? 'bezent-cif-form-input-mock--disabled' : ''
          }`}
        >
          <span className="bezent-cif-input-mock-text">
            {(field.config?.defaultValue as string) || placeholderText}
          </span>

          {field.type === 'email' && (
            <span className="bezent-cif-form-input-mock__icon">
              <BezentIcon name="mail" size={14} />
            </span>
          )}
          {field.type === 'date' && (
            <span className="bezent-cif-form-input-mock__icon">
              <BezentIcon name="calendar" size={14} />
            </span>
          )}
          {field.type === 'dropdown' && (
            <span className="bezent-cif-form-input-mock__icon">
              <BezentIcon name="chevronDown" size={13} />
            </span>
          )}
        </div>
      )}

      {/* Hover Actions (Only visible on hover/selected) */}
      <div className="bezent-cif-field-hover-actions" onClick={(e) => e.stopPropagation()}>
        {field.origin === 'custom' && otherSections.length > 0 && (
          <select
            className="bezent-cif-mini-action-select"
            aria-label={`Move ${field.label} to another section`}
            title="Move to section"
            value=""
            onChange={(e) => {
              if (e.target.value) onMoveToSection(e.target.value);
            }}
          >
            <option value="" disabled>
              Move to…
            </option>
            {otherSections.map((sec) => (
              <option key={sec.key} value={sec.key}>
                {sec.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          className="bezent-cif-mini-action-btn"
          onClick={onDuplicate}
          title="Duplicate field"
          aria-label={`Duplicate ${field.label}`}
        >
          <BezentIcon name="copy" size={12} />
        </button>
        {!field.protected && (
          <button
            type="button"
            className="bezent-cif-mini-action-btn bezent-cif-mini-action-btn--delete"
            onClick={onDelete}
            title="Delete field"
            aria-label={`Delete ${field.label}`}
          >
            <BezentIcon name="delete" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export interface BuilderFormCanvasProps {
  formTitle: string;
  formDescription: string;
  sections: ResolvedFormSection[];
  selectedSectionKey: string | null;
  selectedFieldKey: string | null;
  fieldRules?: Record<string, ConditionalRule[]>;
  fieldPermissions?: Record<string, FieldPermissionRule>;
  subgroupTitles?: Record<string, string>;
  onRenameGroup: (groupKey: string, title: string) => void;
  onSelectSection: (sectionKey: string) => void;
  onSelectField: (sectionKey: string, fieldKey: string) => void;
  onReorderSections: (orderedSectionKeys: string[]) => void;
  onDeleteSection: (sectionKey: string) => void;
  onReorderFields: (sectionKey: string, orderedFieldKeys: string[]) => void;
  onMoveFieldToSection: (fromSectionKey: string, fieldKey: string, toSectionKey: string) => void;
  onDuplicateField: (sectionKey: string, fieldKey: string) => void;
  onDeleteField: (sectionKey: string, fieldKey: string) => void;
  onOpenAddField: (sectionKey: string) => void;
  onOpenAddSection: () => void;
  onOpenManageSections: () => void;
}

export function BuilderFormCanvas({
  formTitle,
  formDescription,
  sections,
  selectedSectionKey,
  selectedFieldKey,
  subgroupTitles,
  onRenameGroup,
  onSelectSection,
  onSelectField,
  onReorderSections,
  onDeleteSection,
  onReorderFields,
  onMoveFieldToSection,
  onDuplicateField,
  onDeleteField,
  onOpenAddField,
  onOpenAddSection,
  onOpenManageSections,
}: BuilderFormCanvasProps) {
  const [editingGroupKey, setEditingGroupKey] = React.useState<string | null>(null);
  const [draftGroupTitle, setDraftGroupTitle] = React.useState('');

  const commitGroupRename = () => {
    if (editingGroupKey && draftGroupTitle.trim()) {
      onRenameGroup(editingGroupKey, draftGroupTitle.trim());
    }
    setEditingGroupKey(null);
  };

  const [activeSectionFilter, setActiveSectionFilter] = React.useState<string>(
    selectedSectionKey || sections[0]?.key || '',
  );

  React.useEffect(() => {
    if (selectedSectionKey) {
      setActiveSectionFilter(selectedSectionKey);
    } else if (!activeSectionFilter && sections[0]?.key) {
      setActiveSectionFilter(sections[0].key);
    }
  }, [selectedSectionKey, sections, activeSectionFilter]);

  const displayedSections = React.useMemo(() => {
    const match = sections.filter((s) => s.key === activeSectionFilter);
    return match.length > 0 ? match : sections.slice(0, 1);
  }, [sections, activeSectionFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleChapterDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const keys = sections.map((s) => s.key);
    const oldIndex = keys.indexOf(String(active.id));
    const newIndex = keys.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderSections(arrayMove(keys, oldIndex, newIndex));
  };

  return (
    <main className="bezent-cif-canvas" aria-label="Form Canvas Workspace">
      {/* Hidden Accessible Form Title for Tests and Screen Readers */}
      <div className="bezent-sr-only">
        <h2>{formTitle}</h2>
        <p>{formDescription}</p>
      </div>

      {/* Chapter / Section Navigation Tabs Bar — drag to reorder tabs */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleChapterDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.key)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="bezent-cif-canvas__chapter-bar" role="tablist" aria-label="Form Chapters">
            {sections.map((sec) => (
              <SortableChapterTab
                key={sec.key}
                sectionKey={sec.key}
                label={sec.label}
                isActive={activeSectionFilter === sec.key}
                onClick={() => {
                  setActiveSectionFilter(sec.key);
                  onSelectSection(sec.key);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Sections List */}
      <div className="bezent-cif-canvas__sections">
        {displayedSections.map((section) => {
          const isSectionSelected = selectedSectionKey === section.key && !selectedFieldKey;
          const groupsMetadata = subgroupTitles
            ? {
                subgroups: Object.fromEntries(
                  Object.entries(subgroupTitles).map(([key, title]) => [key, { title }]),
                ),
              }
            : undefined;
          const groups = getGroupsForSection(section.key, section.fields, groupsMetadata);
          const sectionFieldKeysInOrder = section.fields.map((f) => f.key);

          const handleGroupDragEnd = (groupFieldKeys: string[]) => (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = groupFieldKeys.indexOf(String(active.id));
            const newIndex = groupFieldKeys.indexOf(String(over.id));
            if (oldIndex === -1 || newIndex === -1) return;
            onReorderFields(
              section.key,
              reorderWithinGroup(sectionFieldKeysInOrder, groupFieldKeys, oldIndex, newIndex),
            );
          };

          return (
            <div
              key={section.key}
              className={`bezent-cif-canvas-section ${
                isSectionSelected ? 'bezent-cif-canvas-section--selected' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelectSection(section.key);
              }}
              role="region"
              aria-label={`Section: ${section.label}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectSection(section.key);
              }}
            >
              {/* Section header with inline management actions */}
              <div className="bezent-cif-canvas-section__header">
                <div className="bezent-cif-canvas-section__header-left">
                  <h3 className="bezent-cif-canvas-section__title">
                    {section.label}
                    <button
                      type="button"
                      className="bezent-cif-canvas-group__edit-btn"
                      title="Rename in the Section Inspector"
                      aria-label={`Rename section ${section.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSection(section.key);
                      }}
                    >
                      <BezentIcon name="edit" size={13} />
                    </button>
                  </h3>
                  {section.fields.length > 0 && (
                    <span className="bezent-cif-canvas-section__count">
                      ({section.fields.length} {section.fields.length === 1 ? 'Field' : 'Fields'})
                    </span>
                  )}
                </div>

                <div
                  className="bezent-cif-canvas-section__actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="bezent-cif-manage-sections-btn"
                    onClick={onOpenManageSections}
                    title="Reorder, rename, show/hide or remove sections"
                  >
                    Manage Sections
                    <BezentIcon name="chevronDown" size={12} />
                  </button>

                  {section.origin === 'custom' && (
                    <button
                      type="button"
                      className="bezent-cif-section-more-btn"
                      onClick={() => onDeleteSection(section.key)}
                      aria-label={`Delete ${section.label}`}
                      title="Delete section"
                    >
                      <BezentIcon name="delete" size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grouped, WYSIWYG Form Fields Grid — matching the live registration layout */}
              {groups.map((group) => {
                const groupFieldKeys = group.fields.map((f) => f.key);
                return (
                  <div key={group.key} className="bezent-cif-canvas-group">
                    {groups.length > 1 &&
                      (editingGroupKey === group.key ? (
                        <div className="bezent-cif-canvas-group__title-edit">
                          <Input
                            type="text"
                            value={draftGroupTitle}
                            autoFocus
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setDraftGroupTitle(e.target.value)
                            }
                            onBlur={commitGroupRename}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') commitGroupRename();
                              if (e.key === 'Escape') setEditingGroupKey(null);
                            }}
                          />
                        </div>
                      ) : (
                        <h4 className="bezent-cif-canvas-group__title">
                          {group.title}
                          <button
                            type="button"
                            className="bezent-cif-canvas-group__edit-btn"
                            title="Rename this heading"
                            aria-label={`Rename heading ${group.title}`}
                            onClick={() => {
                              setDraftGroupTitle(group.title);
                              setEditingGroupKey(group.key);
                            }}
                          >
                            <BezentIcon name="edit" size={12} />
                          </button>
                        </h4>
                      ))}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleGroupDragEnd(groupFieldKeys)}
                    >
                      <SortableContext items={groupFieldKeys} strategy={rectSortingStrategy}>
                        <div className="bezent-cif-canvas-fields">
                          {group.fields.map((field) => (
                            <SortableFieldCard
                              key={field.key}
                              field={field}
                              isSelected={selectedFieldKey === field.key}
                              otherSections={sections
                                .filter((s) => s.key !== section.key)
                                .map((s) => ({ key: s.key, label: s.label }))}
                              onSelect={() => onSelectField(section.key, field.key)}
                              onDuplicate={() => onDuplicateField(section.key, field.key)}
                              onDelete={() => onDeleteField(section.key, field.key)}
                              onMoveToSection={(targetKey) =>
                                onMoveFieldToSection(section.key, field.key, targetKey)
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })}

              {section.fields.length === 0 && (
                <div className="bezent-cif-canvas-empty-section">
                  <span>No fields in this section yet.</span>
                </div>
              )}

              {/* Add Field Button */}
              <div
                className="bezent-cif-canvas-section__footer"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="bezent-cif-canvas-add-field-btn"
                  onClick={() => onOpenAddField(section.key)}
                >
                  <BezentIcon name="add" size={13} />
                  Add Field to {section.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Section Action */}
      <div className="bezent-cif-canvas__add-section-wrap">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={onOpenAddSection}
          leftIcon={<BezentIcon name="add" size={14} />}
        >
          Add New Section
        </Button>
      </div>
    </main>
  );
}

export default BuilderFormCanvas;
