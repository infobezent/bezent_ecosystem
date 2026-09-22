import type { ReactNode } from 'react';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items?: TabItem[];
  activeId?: string;
  onChange?: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
  children?: ReactNode;
}

export interface TabProps {
  id: string;
  active?: boolean;
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

/** Individual Tab button with keyboard accessibility and optional count badge */
export function Tab({
  id,
  active = false,
  count,
  icon,
  disabled = false,
  onClick,
  children,
  className,
}: TabProps) {
  return (
    <button
      id={`tab-${id}`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`panel-${id}`}
      disabled={disabled}
      tabIndex={active ? 0 : -1}
      className={`bezent-tab ${active ? 'is-active' : ''} ${className || ''}`.trim()}
      onClick={onClick}
    >
      {icon && (
        <span className="bezent-tab__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="bezent-tab__label">{children}</span>
      {typeof count === 'number' && <span className="bezent-tab__count">{count}</span>}
    </button>
  );
}

/**
 * Standard BEZENT Tabs bar. Fully keyboard-accessible tablist,
 * active indicator, optional count badge, and zero inline CSS.
 */
export function Tabs({
  items,
  activeId,
  onChange,
  variant = 'underline',
  className,
  children,
}: TabsProps) {
  return (
    <div role="tablist" className={`bezent-tabs bezent-tabs--${variant} ${className || ''}`.trim()}>
      {items
        ? items.map((item) => (
            <Tab
              key={item.id}
              id={item.id}
              active={item.id === activeId}
              count={item.count}
              icon={item.icon}
              disabled={item.disabled}
              onClick={() => onChange?.(item.id)}
            >
              {item.label}
            </Tab>
          ))
        : children}
    </div>
  );
}

export default Tabs;
