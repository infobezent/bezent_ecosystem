import { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Badge, Input, Pane } from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { TOOLBOX_ITEMS, type ToolboxItem } from './types';
import type { CustomFieldType } from '../api/formsApi';

export interface FieldToolboxProps {
  onAddField: (type: CustomFieldType, label: string) => void;
  activeSectionLabel?: string;
  isConfigurable?: boolean;
}

const CATEGORY_TITLES: Record<ToolboxItem['category'], string> = {
  text: 'Text Fields',
  choice: 'Choice & Selection',
  date: 'Date & Time',
  advanced: 'Advanced & Numbers',
};

const CATEGORIES: readonly ToolboxItem['category'][] = ['text', 'choice', 'date', 'advanced'];

function DraggableToolboxItem({
  item,
  disabled,
  onAdd,
}: {
  item: ToolboxItem;
  disabled?: boolean;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `toolbox-${item.type}`,
    disabled,
    data: {
      isToolbox: true,
      type: item.type,
      label: item.label,
    },
  });

  // UI-RULES Rule 1 exception: live runtime transform during drag
  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.6 : 1,
        zIndex: 999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      // eslint-disable-next-line no-restricted-syntax
      style={dragStyle}
      className={`bezent-toolbox-item ${disabled ? 'is-disabled' : ''}`.trim()}
      onClick={disabled ? undefined : onAdd}
      title={
        disabled
          ? 'Fields cannot be added to this chapter'
          : `Drag to section or click to add ${item.label}`
      }
    >
      <div className="bezent-toolbox-item__left">
        <span className="bezent-toolbox-item__handle" aria-hidden="true">
          <BezentIcon name="more" size={14} />
        </span>
        <BezentIcon name={item.icon} size={14} />
        <span className="bezent-toolbox-item__label">{item.label}</span>
      </div>
      {!disabled && (
        <span className="bezent-toolbox-item__add" aria-hidden="true">
          <BezentIcon name="add" size={12} />
        </span>
      )}
    </div>
  );
}

export function FieldToolbox({
  onAddField,
  activeSectionLabel,
  isConfigurable = true,
}: FieldToolboxProps) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return TOOLBOX_ITEMS;
    const q = search.toLowerCase().trim();
    return TOOLBOX_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        CATEGORY_TITLES[item.category].toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <Pane
      size="toolbox"
      surface="neutral"
      border="right"
      scroll="y"
      aria-label="Add Field Toolbox"
    >
      <div className="bezent-pane-header">
        <span className="bezent-pane-header__title">Add Field</span>
        <Badge variant="neutral" size="sm">
          {filteredItems.length}
        </Badge>
      </div>

      <div className="bezent-toolbox-search">
        <Input
          size="sm"
          placeholder="Search fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<BezentIcon name="search" size={14} />}
        />
      </div>

      <div className="bezent-toolbox-content">
        <div className="bezent-toolbox-sub">
          {isConfigurable ? (
            <span>
              Click or drag a field to add to <strong>{activeSectionLabel ?? 'canvas'}</strong>.
            </span>
          ) : (
            <span>This chapter is managed by the platform workflow and is fixed.</span>
          )}
        </div>

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
                    key={item.type}
                    item={item}
                    disabled={!isConfigurable}
                    onAdd={() => onAddField(item.type, item.label)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Pane>
  );
}


