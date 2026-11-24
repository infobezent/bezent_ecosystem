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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input, Modal, Switch } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import type { ResolvedFormSection } from '../../api/formsApi';

/** Sections every company must keep visible (mirrors the backend's save validation). */
const MANDATORY_SECTION_KEYS = new Set(['general', 'personal', 'online_access', 'review']);

interface SortableSectionRowProps {
  section: ResolvedFormSection;
  onRename: (label: string) => void;
  onToggleVisible: (visible: boolean) => void;
  onDelete: () => void;
}

function SortableSectionRow({
  section,
  onRename,
  onToggleVisible,
  onDelete,
}: SortableSectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.key,
  });

  // Live drag transform cannot be expressed as a static CSS class.
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax
      style={dragStyle}
      className={`bezent-cif-manage-sections__row ${isDragging ? 'bezent-cif-manage-sections__row--dragging' : ''}`}
    >
      <button
        type="button"
        className="bezent-cif-field-drag-handle"
        title="Drag to reorder"
        aria-label={`Drag ${section.label} to reorder`}
        {...attributes}
        {...listeners}
      >
        <BezentIcon name="drag" size={14} />
      </button>

      <Input
        type="text"
        value={section.label}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onRename(e.target.value)}
        aria-label={`Section name: ${section.label}`}
      />

      <div
        className="bezent-cif-manage-sections__visibility"
        title={
          MANDATORY_SECTION_KEYS.has(section.key)
            ? 'Every company must keep this section visible.'
            : undefined
        }
      >
        <Switch
          checked={section.visible !== false}
          disabled={MANDATORY_SECTION_KEYS.has(section.key)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggleVisible(e.target.checked)}
        />
        <span>Visible</span>
      </div>

      {section.origin === 'custom' ? (
        <button
          type="button"
          className="bezent-cif-mini-action-btn bezent-cif-mini-action-btn--delete"
          onClick={onDelete}
          title="Delete section"
          aria-label={`Delete ${section.label}`}
        >
          <BezentIcon name="delete" size={14} />
        </button>
      ) : (
        <span className="bezent-cif-manage-sections__system-tag">System</span>
      )}
    </div>
  );
}

export interface ManageSectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ResolvedFormSection[];
  onReorderSections: (orderedSectionKeys: string[]) => void;
  onUpdateSection: (sectionKey: string, updates: Partial<ResolvedFormSection>) => void;
  onDeleteSection: (sectionKey: string) => void;
  onOpenAddSection: () => void;
}

export function ManageSectionsModal({
  isOpen,
  onClose,
  sections,
  onReorderSections,
  onUpdateSection,
  onDeleteSection,
  onOpenAddSection,
}: ManageSectionsModalProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const keys = sections.map((s) => s.key);
    const oldIndex = keys.indexOf(String(active.id));
    const newIndex = keys.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderSections(arrayMove(keys, oldIndex, newIndex));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Sections" size="md">
      <p className="bezent-cif-manage-sections__hint">
        Drag to reorder, rename, show/hide, or remove sections. System sections can&apos;t be
        removed, only reordered, renamed and hidden.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.key)} strategy={verticalListSortingStrategy}>
          <div className="bezent-cif-manage-sections__list">
            {sections.map((section) => (
              <SortableSectionRow
                key={section.key}
                section={section}
                onRename={(label) => onUpdateSection(section.key, { label })}
                onToggleVisible={(visible) => onUpdateSection(section.key, { visible })}
                onDelete={() => onDeleteSection(section.key)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button type="button" className="bezent-cif-canvas-add-field-btn" onClick={onOpenAddSection}>
        <BezentIcon name="add" size={13} />
        Add New Section
      </button>
    </Modal>
  );
}

export default ManageSectionsModal;
