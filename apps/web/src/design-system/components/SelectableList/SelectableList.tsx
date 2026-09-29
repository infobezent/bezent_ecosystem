import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import './SelectableList.css';

/**
 * SelectableList — a vertical, single-select list (WAI-ARIA listbox).
 *
 * - `role="listbox"` with `role="option"` items and `aria-selected`.
 * - Roving tab stop: only the selected (or first enabled) item is tabbable.
 * - ArrowUp/ArrowDown/Home/End move focus AND selection (selection follows
 *   focus), skipping disabled items; Enter/Space select the focused item.
 * - Disabled items are `aria-disabled` and cannot be selected.
 *
 * Items should not contain interactive controls (buttons/inputs); put
 * actions next to the list instead.
 */

interface SelectableListContextValue {
  selectedId: string | null;
  tabStopId: string | null;
  size: 'sm' | 'md';
  onSelect: (id: string) => void;
}

const SelectableListContext = createContext<SelectableListContextValue | null>(null);

export interface SelectableListProps {
  /** Accessible name of the list (required: the list has no visible heading of its own). */
  'aria-label': string;
  selectedId?: string | null;
  onSelect: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}

function itemIdsOf(children: ReactNode): { id: string; disabled: boolean }[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => child.props as Partial<SelectableListItemProps>)
    .filter((props): props is SelectableListItemProps => typeof props.id === 'string')
    .map((props) => ({ id: props.id, disabled: Boolean(props.disabled) }));
}

export function SelectableList({
  'aria-label': ariaLabel,
  selectedId = null,
  onSelect,
  size = 'md',
  className,
  children,
}: SelectableListProps) {
  const items = itemIdsOf(children);
  const enabled = items.filter((item) => !item.disabled);
  const selectedIsEnabled = enabled.some((item) => item.id === selectedId);
  const tabStopId = selectedIsEnabled ? selectedId : (enabled[0]?.id ?? null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (enabled.length === 0) return;
    const current = enabled.findIndex(
      (item) => item.id === (event.target as HTMLElement).dataset.itemId,
    );

    let nextIndex: number | null = null;
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = current < 0 ? 0 : Math.min(current + 1, enabled.length - 1);
        break;
      case 'ArrowUp':
        nextIndex = current < 0 ? 0 : Math.max(current - 1, 0);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = enabled.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (current >= 0) {
          event.preventDefault();
          onSelect(enabled[current]!.id);
        }
        return;
      default:
        return;
    }

    event.preventDefault();
    const next = enabled[nextIndex]!;
    onSelect(next.id);
    // Compare ids directly (no selector escaping needed for arbitrary ids).
    const options = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
    );
    options.find((option) => option.dataset.itemId === next.id)?.focus();
  }

  return (
    <SelectableListContext.Provider value={{ selectedId, tabStopId, size, onSelect }}>
      <div
        role="listbox"
        aria-label={ariaLabel}
        className={`bezent-selectable-list bezent-selectable-list--${size} ${className || ''}`.trim()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </SelectableListContext.Provider>
  );
}

export interface SelectableListItemProps {
  /** Stable identifier reported to `onSelect`. */
  id: string;
  /** Primary label. */
  children: ReactNode;
  /** Secondary line under the label. */
  description?: ReactNode;
  /** Right-aligned, non-interactive content (e.g. a Badge). */
  trailing?: ReactNode;
  disabled?: boolean;
}

export function SelectableListItem({
  id,
  children,
  description,
  trailing,
  disabled = false,
}: SelectableListItemProps) {
  const context = useContext(SelectableListContext);
  if (!context) {
    throw new Error('SelectableListItem must be used within a SelectableList');
  }
  const selected = context.selectedId === id;

  return (
    <div
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={!disabled && context.tabStopId === id ? 0 : -1}
      data-item-id={id}
      className={[
        'bezent-selectable-list__item',
        `bezent-selectable-list__item--${context.size}`,
        selected ? 'is-selected' : '',
        disabled ? 'is-disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => {
        if (!disabled) context.onSelect(id);
      }}
    >
      <span className="bezent-selectable-list__content">
        <span className="bezent-selectable-list__label">{children}</span>
        {description && <span className="bezent-selectable-list__description">{description}</span>}
      </span>
      {trailing && <span className="bezent-selectable-list__trailing">{trailing}</span>}
    </div>
  );
}

export default SelectableList;
