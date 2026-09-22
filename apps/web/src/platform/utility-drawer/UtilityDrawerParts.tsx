import { useState, type ReactNode } from 'react';
import { BezentIcon, CompanionIcon, type BezentIconName } from '../../design-system/icons';
import './UtilityDrawerParts.css';

/**
 * Building blocks shared by every utility drawer (Tasks, Approvals,
 * Calendar, Notes — and the Notifications panel). They were repeated
 * near-verbatim in each old drawer (header, tab strip, filter panel,
 * "view all" footer). Generic: they receive labels and callbacks only.
 */

/* ── Header ─────────────────────────────────────────────────────────── */

export interface UtilityDrawerHeaderProps {
  title: string;
  description?: string;
  icon?: BezentIconName;
  /** Count pill next to the title (hidden at 0). */
  count?: number;
  /** Icon actions before the close button. */
  actions?: ReactNode;
  /** Optional full screen / open in full page action. */
  onFullScreen?: () => void;
  onClose: () => void;
}

export function UtilityDrawerHeader({
  title,
  description,
  icon,
  count,
  actions,
  onFullScreen,
  onClose,
}: UtilityDrawerHeaderProps) {
  return (
    <div className="ud-header">
      <div className="ud-header__text">
        <div className="ud-header__title">
          {icon && (
            <span className="ud-header__chip">
              <CompanionIcon name={icon} size={16} active />
            </span>
          )}
          <h2 className="ud-header__heading">{title}</h2>
          {count !== undefined && count > 0 && <span className="ud-header__count">{count}</span>}
        </div>
        {description && <div className="ud-header__desc">{description}</div>}
      </div>
      <div className="ud-header__actions">
        {actions}
        {onFullScreen && (
          <UtilityIconAction icon="openInNew" label="Full screen" onClick={onFullScreen} />
        )}
        <UtilityIconAction icon="close" label="Close" onClick={onClose} />
      </div>
    </div>
  );
}

/** 30px icon button used in drawer headers. Source: old `DrawerIconBtn`. */
export function UtilityIconAction({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: BezentIconName;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`ud-icon-action ${active ? 'is-active' : ''}`.trim()}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      onClick={onClick}
    >
      <BezentIcon name={icon} size={18} color="currentColor" active={active} />
    </button>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────── */

export function UtilityDrawerTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="ud-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          className={`ud-tabs__tab ${tab.id === value ? 'is-active' : ''}`.trim()}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── Filter panel (presentational, as in the old UI) ────────────────── */

export interface UtilityFilterGroup {
  label: string;
  options: readonly string[];
}

/**
 * Expandable chip filters. In the old approved UI these chips only kept
 * their own highlighted state and did not filter anything; that is
 * preserved (no invented filtering).
 */
export function UtilityDrawerFilterPanel({ groups }: { groups: readonly UtilityFilterGroup[] }) {
  return (
    <div className="ud-filters">
      {groups.map((group) => (
        <FilterRow key={group.label} group={group} />
      ))}
    </div>
  );
}

function FilterRow({ group }: { group: UtilityFilterGroup }) {
  const [selected, setSelected] = useState(group.options[0]);
  return (
    <div className="ud-filters__row">
      <span className="ud-filters__label">{group.label}</span>
      <div className="ud-filters__chips">
        {group.options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === selected}
            className={`ud-filters__chip ${option === selected ? 'is-selected' : ''}`.trim()}
            onClick={() => setSelected(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Footer, links, chips ───────────────────────────────────────────── */

export function UtilityDrawerFooter({ children }: { children: ReactNode }) {
  return <div className="ud-footer">{children}</div>;
}

/** The "View all …" footer action. */
export function UtilityFooterLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="ud-footer__link" onClick={onClick}>
      {children}
    </button>
  );
}

/** Inline text action inside rows ("Open →", "Review →"). */
export function UtilityLinkButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="ud-link"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export type ToneChipTone = 'danger' | 'warning' | 'success' | 'neutral';

/** Small toned pill (priority, status, urgent). Colours come from the --status-* tokens. */
export function ToneChip({
  tone,
  children,
  caps = false,
}: {
  tone: ToneChipTone;
  children: ReactNode;
  /** Uppercase, tighter variant used for priority badges. */
  caps?: boolean;
}) {
  return (
    <span className={`ud-chip ud-chip--${tone} ${caps ? 'ud-chip--caps' : ''}`.trim()}>
      {children}
    </span>
  );
}
