import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Alert, Badge, Input, Pane } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';
import { CHAPTER_METADATA, type ToolboxItem } from './types';
import type { CustomFieldType, ResolvedFormSection } from '../../api/formsApi';

export interface FieldToolboxProps {
  onAddField: (type: CustomFieldType, label: string) => void;
  activeSectionLabel?: string;
  isConfigurable?: boolean;
  guidanceNotice?: string | null;
  onClearGuidanceNotice?: () => void;
  /** V2: Current panel mode: 'structure' (Form Structure) or 'fields' (Field Toolbox) */
  mode?: 'structure' | 'fields';
  onModeChange?: (mode: 'structure' | 'fields') => void;
  sections?: readonly ResolvedFormSection[];
  activeSectionKey?: string;
  onSelectSection?: (sectionKey: string) => void;
  onMoveSectionUp?: (sectionKey: string) => void;
  onMoveSectionDown?: (sectionKey: string) => void;
  onToggleSectionVisibility?: (sectionKey: string) => void;
  onQuickAddCustomField?: () => void;
  /** Called when the user clicks the form root row to select the form entity */
  onSelectForm?: () => void;
  /** Which entity is currently selected — used to highlight form root row */
  selectedEntity?: 'form' | 'chapter' | 'section' | 'field' | null;
}

const CATEGORY_TITLES: Record<ToolboxItem['category'], string> = {
  text: 'Text & Input',
  choice: 'Selection & Choices',
  date: 'Date & Time',
  advanced: 'Advanced & Numbers',
};

const CATEGORIES: readonly ToolboxItem['category'][] = ['text', 'choice', 'date', 'advanced'];

// Supported V2 Toolbox layout categories with visual display aliases
interface ExtendedToolboxItem {
  type: CustomFieldType;
  label: string;
  subLabel?: string;
  category: 'text' | 'choice' | 'date' | 'advanced' | 'layout';
  icon: string;
  disabled?: boolean;
  badge?: string;
}

const V2_TOOLBOX_ITEMS: readonly ExtendedToolboxItem[] = [
  // Text & Input
  {
    type: 'single_line',
    label: 'Single Line',
    subLabel: 'Short Text',
    category: 'text',
    icon: 'edit',
  },
  {
    type: 'multi_line',
    label: 'Multi Line',
    subLabel: 'Paragraph',
    category: 'text',
    icon: 'edit',
  },
  { type: 'email', label: 'Email', category: 'text', icon: 'email' },
  { type: 'phone', label: 'Phone', category: 'text', icon: 'phone' },
  {
    type: 'number',
    label: 'Number',
    subLabel: 'Numeric Input',
    category: 'advanced',
    icon: 'sparkles',
  },
  { type: 'decimal', label: 'Decimal', category: 'advanced', icon: 'sparkles' },
  { type: 'date', label: 'Date', subLabel: 'Date Picker', category: 'date', icon: 'calendar' },
  { type: 'time', label: 'Time', category: 'date', icon: 'calendar' },
  { type: 'datetime', label: 'Date-Time', category: 'date', icon: 'calendar' },
  {
    type: 'file_upload',
    label: 'File Upload',
    subLabel: 'Image / Attachment',
    category: 'advanced',
    icon: 'documents',
  },

  // Selection & Choices
  {
    type: 'dropdown',
    label: 'Dropdown',
    subLabel: 'Dropdown Menu',
    category: 'choice',
    icon: 'filter',
  },
  { type: 'radio', label: 'Radio', category: 'choice', icon: 'filter' },
  {
    type: 'checkbox',
    label: 'Checkbox',
    subLabel: 'Toggle / Checkbox',
    category: 'choice',
    icon: 'check',
  },
  {
    type: 'multi_select',
    label: 'Multi Select',
    subLabel: 'Checklist Group',
    category: 'choice',
    icon: 'filter',
  },

  // Coming Soon Placeholders (Disabled to communicate roadmap honestly)
  {
    type: 'number',
    label: 'Range Slider',
    category: 'choice',
    icon: 'settings',
    disabled: true,
    badge: 'Coming Soon',
  },
  {
    type: 'single_line',
    label: 'Section Break',
    category: 'layout',
    icon: 'more',
    disabled: true,
    badge: 'Coming Soon',
  },
  {
    type: 'single_line',
    label: 'Data Table',
    category: 'layout',
    icon: 'table',
    disabled: true,
    badge: 'Coming Soon',
  },
];

function DraggableToolboxItem({
  item,
  disabled,
  onAdd,
}: {
  item: ExtendedToolboxItem;
  disabled?: boolean;
  onAdd: () => void;
}) {
  const isItemDisabled = disabled || item.disabled;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${item.type}-${item.label.replace(/\s+/g, '-').toLowerCase()}`,
    disabled: isItemDisabled,
    data: {
      isToolbox: true,
      type: item.type,
      label: item.label,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bezent-toolbox-item ${isItemDisabled ? 'is-disabled' : ''} ${isDragging ? 'is-dragging' : ''}`.trim()}
      onClick={isItemDisabled ? undefined : onAdd}
      title={
        isItemDisabled
          ? item.badge
            ? `${item.label} (${item.badge})`
            : 'Fields cannot be added to this chapter'
          : `Drag to section or click to add ${item.label}`
      }
    >
      <div className="bezent-toolbox-item__left">
        <span className="bezent-toolbox-item__handle" aria-hidden="true">
          <BezentIcon name="more" size={14} />
        </span>
        <BezentIcon name={item.icon} size={14} />
        <span className="bezent-toolbox-item__label">
          {item.label}
          {item.subLabel && <span className="bezent-toolbox-sublabel"> ({item.subLabel})</span>}
        </span>
      </div>
      {item.badge ? (
        <Badge variant="neutral" size="sm">
          {item.badge}
        </Badge>
      ) : !isItemDisabled ? (
        <span className="bezent-toolbox-item__add" aria-hidden="true">
          <BezentIcon name="add" size={12} />
        </span>
      ) : null}
    </div>
  );
}

export function FieldToolbox({
  onAddField,
  activeSectionLabel,
  isConfigurable = true,
  guidanceNotice,
  onClearGuidanceNotice,
  mode: controlledMode,
  onModeChange,
  sections,
  activeSectionKey,
  onSelectSection,
  onMoveSectionUp: _onMoveSectionUp,
  onMoveSectionDown: _onMoveSectionDown,
  onToggleSectionVisibility,
  onQuickAddCustomField,
  onSelectForm,
  selectedEntity,
}: FieldToolboxProps) {
  // If sections is supplied, default to 'structure' mode as required by prompt Section 5
  // If not supplied (like in initial unit tests), default to 'fields' mode
  const defaultMode = sections && sections.length > 0 ? 'structure' : 'fields';
  const [internalMode, setInternalMode] = useState<'structure' | 'fields'>(defaultMode);
  const activeMode = controlledMode ?? internalMode;

  const handleModeToggle = (next: 'structure' | 'fields') => {
    setInternalMode(next);
    onModeChange?.(next);
  };

  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return V2_TOOLBOX_ITEMS;
    const q = search.toLowerCase().trim();
    return V2_TOOLBOX_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q),
    );
  }, [search]);

  // Mandatory system chapters that cannot be moved or hidden
  const MANDATORY_KEYS = ['general', 'personal', 'online_access', 'review'];

  return (
    <Pane
      size="toolbox"
      surface="neutral"
      border="right"
      scroll="y"
      aria-label="Form Structure and Field Toolbox"
    >
      {/* 1. Header */}
      <div className="bezent-pane-header">
        <span className="bezent-pane-header__title">
          {activeMode === 'fields' ? 'Add Field' : 'Form Structure'}
        </span>
        <Badge variant="neutral" size="sm">
          {activeMode === 'structure' ? (sections?.length ?? 10) : filteredItems.length}
        </Badge>
      </div>

      {/* 2. Top Segmented Mode Switcher: [ Structure ] [ Fields ] */}
      <div className="bezent-left-modes" role="tablist" aria-label="Editor left panel modes">
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'structure'}
          className={`bezent-left-mode-btn ${activeMode === 'structure' ? 'is-active' : ''}`}
          onClick={() => handleModeToggle('structure')}
        >
          <BezentIcon name="table" size={14} />
          <span>Structure</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'fields'}
          className={`bezent-left-mode-btn ${activeMode === 'fields' ? 'is-active' : ''}`}
          onClick={() => handleModeToggle('fields')}
        >
          <BezentIcon name="edit" size={14} />
          <span>Fields</span>
        </button>
      </div>

      {/* 3A. MODE 1: STRUCTURE PANEL */}
      {activeMode === 'structure' && (
        <div className="bezent-structure-panel">
          {/* Form Root Row — clicking selects the form entity in the inspector */}
          <div
            className={`bezent-structure-form-root ${selectedEntity === 'form' ? 'is-active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelectForm?.()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelectForm?.();
            }}
            title="Employee Registration (System Form) — click to view Form Settings"
            aria-label="Employee Registration System Form — click to select"
          >
            <span className="bezent-structure-form-root__label">Employee Registration</span>
            <Badge variant="neutral" size="sm">
              System Form
            </Badge>
          </div>

          <div className="bezent-structure-header">
            <span className="bezent-structure-title">CHAPTERS</span>
            <span className="bezent-toolbox-sub">
              {sections ? `${sections.length} Chapters` : '10 Chapters'}
            </span>
          </div>

          <div className="bezent-structure-list" role="list">
            {(sections ?? CHAPTER_METADATA).map((sec, idx) => {
              const secKey = sec.key;
              const chapterMeta = CHAPTER_METADATA.find((c) => c.key === secKey);
              const label = sec.label || chapterMeta?.label || secKey;
              const isSelected = activeSectionKey === secKey;
              const isLocked = secKey === 'review';
              const isMandatory = MANDATORY_KEYS.includes(secKey);
              const isVisible = 'visible' in sec ? sec.visible !== false : true;
              const displayNum = String(idx + 1).padStart(2, '0');

              return (
                <div
                  key={secKey}
                  role="listitem"
                  className={`bezent-structure-item ${isSelected ? 'is-active' : ''} ${isLocked ? 'is-locked' : ''}`}
                  onClick={() => onSelectSection?.(secKey)}
                  title={`Chapter ${displayNum}: ${label}${isLocked ? ' (Protected Final Step)' : ''}`}
                >
                  <div className="bezent-structure-item__left">
                    <span className="bezent-structure-handle" aria-hidden="true">
                      {isLocked ? (
                        <BezentIcon name="lock" size={14} />
                      ) : (
                        <BezentIcon name="more" size={14} />
                      )}
                    </span>
                    <span className="bezent-structure-num">{displayNum}</span>
                    <span className="bezent-structure-name">{label}</span>
                  </div>

                  <div className="bezent-structure-item__right">
                    {/* Visibility status */}
                    <button
                      type="button"
                      className="bezent-structure-icon-btn"
                      disabled={isMandatory}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isMandatory) onToggleSectionVisibility?.(secKey);
                      }}
                      title={
                        isMandatory
                          ? 'Mandatory system chapter cannot be hidden'
                          : isVisible
                            ? 'Visible in employee registration'
                            : 'Hidden from employee registration'
                      }
                      aria-label={`${label} visibility: ${isVisible ? 'Visible' : 'Hidden'}`}
                    >
                      <BezentIcon name={isVisible ? 'visibility' : 'visibilityOff'} size={14} />
                    </button>

                    {/* Navigation arrow or lock */}
                    {isLocked ? (
                      <span
                        title="Review & Finalize (Protected final step)"
                        aria-label="Review & Finalize (Protected final step)"
                      >
                        <BezentIcon name="lock" size={12} />
                      </span>
                    ) : (
                      <BezentIcon name="chevronRight" size={12} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Custom Field Action */}
          <button
            type="button"
            className="bezent-add-custom-field-btn"
            onClick={() => {
              if (onQuickAddCustomField) {
                onQuickAddCustomField();
              } else {
                handleModeToggle('fields');
              }
            }}
          >
            <BezentIcon name="add" size={14} />
            <span>Add Custom Field</span>
          </button>
        </div>
      )}

      {/* 3B. MODE 2: FIELDS TOOLBOX */}
      {activeMode === 'fields' && (
        <>
          <div className="bezent-toolbox-search">
            <Input
              size="sm"
              placeholder="Search field type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<BezentIcon name="search" size={14} />}
            />
          </div>

          <div className="bezent-toolbox-content">
            {guidanceNotice && (
              <Alert
                variant="warning"
                dismissible={Boolean(onClearGuidanceNotice)}
                onDismiss={onClearGuidanceNotice}
              >
                {guidanceNotice}
              </Alert>
            )}
            <div className="bezent-toolbox-sub">
              {isConfigurable ? (
                <span>
                  Click or drag a field to add to <strong>{activeSectionLabel ?? 'canvas'}</strong>.
                </span>
              ) : (
                <span>This chapter is managed by the platform workflow and is fixed.</span>
              )}
            </div>

            {/* Standard Text, Choice, Date, Advanced Groups */}
            {CATEGORIES.map((category) => {
              const items = filteredItems.filter((i) => i.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="bezent-toolbox-group">
                  <div className="bezent-toolbox-heading">
                    {CATEGORY_TITLES[category].toUpperCase()}
                  </div>
                  <div className="bezent-toolbox-list">
                    {items.map((item) => (
                      <DraggableToolboxItem
                        key={`${item.type}-${item.label}`}
                        item={item}
                        disabled={!isConfigurable}
                        onAdd={() => onAddField(item.type, item.label)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Layout & Structure Group (Future Roadmap) */}
            {filteredItems.some((i) => i.category === 'layout') && (
              <div className="bezent-toolbox-group">
                <div className="bezent-toolbox-heading">LAYOUT & STRUCTURE</div>
                <div className="bezent-toolbox-list">
                  {filteredItems
                    .filter((i) => i.category === 'layout')
                    .map((item) => (
                      <DraggableToolboxItem
                        key={`${item.type}-${item.label}`}
                        item={item}
                        disabled={true}
                        onAdd={() => {}}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Pane>
  );
}
