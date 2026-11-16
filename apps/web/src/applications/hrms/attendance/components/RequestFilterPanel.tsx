import React, { useState, useEffect, useRef } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export type RequestFilterValues = Record<string, string>;

export interface RequestFilterField {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

export interface RequestFilterDateRange {
  label: string;
  fromKey: string;
  toKey: string;
}

/** Number of filters that differ from their empty/default value (a date range counts once). */
export function countActiveRequestFilters(
  values: RequestFilterValues,
  defaults: RequestFilterValues,
  dateRange?: RequestFilterDateRange,
): number {
  let count = 0;
  for (const key of Object.keys(defaults)) {
    if (dateRange && (key === dateRange.fromKey || key === dateRange.toKey)) continue;
    if ((values[key] ?? defaults[key]) !== defaults[key]) count += 1;
  }
  if (dateRange && (values[dateRange.fromKey] || values[dateRange.toKey])) count += 1;
  return count;
}

interface RequestFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: RequestFilterField[];
  dateRange?: RequestFilterDateRange;
  appliedValues: RequestFilterValues;
  defaults: RequestFilterValues;
  onApply: (values: RequestFilterValues) => void;
}

/**
 * Floating filter popover shared by the Attendance request pages.
 * Same look as the Employee and Daily Attendance filter panels: two-column fields,
 * Clear all, Cancel and Apply Filters.
 */
export const RequestFilterPanel: React.FC<RequestFilterPanelProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  dateRange,
  appliedValues,
  defaults,
  onApply,
}) => {
  const [draft, setDraft] = useState<RequestFilterValues>(appliedValues);
  const panelRef = useRef<HTMLDivElement>(null);

  // Start from the applied filters every time the panel opens
  useEffect(() => {
    if (isOpen) setDraft(appliedValues);
  }, [isOpen, appliedValues]);

  // Close on Escape or outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rows: RequestFilterField[][] = [];
  for (let i = 0; i < fields.length; i += 2) rows.push(fields.slice(i, i + 2));

  return (
    <div
      ref={panelRef}
      className="bezent-filter-panel"
      role="dialog"
      aria-label={title}
      aria-modal="false"
    >
      <div className="bezent-filter-panel__header">
        <div className="bezent-filter-panel__title-group">
          <BezentIcon name="filter" size={16} />
          <h3 className="bezent-filter-panel__title">{title}</h3>
        </div>
        <button
          type="button"
          className="bezent-filter-panel__close-btn"
          aria-label="Close filter panel"
          onClick={onClose}
        >
          <BezentIcon name="close" size={18} />
        </button>
      </div>

      <div className="bezent-filter-panel__body-compact">
        {rows.map((row) => (
          <div className="bezent-filter-form-grid" key={row.map((f) => f.key).join('-')}>
            {row.map((field) => (
              <div className="bezent-filter-form-group" key={field.key}>
                <label className="bezent-filter-label" htmlFor={`req-filter-${field.key}`}>
                  {field.label}
                </label>
                <div className="bezent-filter-select-wrap">
                  <select
                    id={`req-filter-${field.key}`}
                    className="bezent-filter-select-control"
                    value={draft[field.key] ?? defaults[field.key]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft((prev) => ({ ...prev, [field.key]: val }));
                    }}
                  >
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="bezent-filter-select-chevron">
                    <BezentIcon name="chevronDown" size={16} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}

        {dateRange && (
          <div className="bezent-filter-form-group--full">
            <label className="bezent-filter-label">{dateRange.label}</label>
            <div className="bezent-filter-dates-grid">
              <div className="bezent-filter-date-field">
                <span className="bezent-filter-date-icon">
                  <BezentIcon name="calendar" size={15} />
                </span>
                <input
                  type="date"
                  className="bezent-filter-date-native-input"
                  aria-label={`${dateRange.label} from`}
                  value={draft[dateRange.fromKey] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft((prev) => ({ ...prev, [dateRange.fromKey]: val }));
                  }}
                />
              </div>
              <div className="bezent-filter-date-field">
                <span className="bezent-filter-date-icon">
                  <BezentIcon name="calendar" size={15} />
                </span>
                <input
                  type="date"
                  className="bezent-filter-date-native-input"
                  aria-label={`${dateRange.label} to`}
                  value={draft[dateRange.toKey] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraft((prev) => ({ ...prev, [dateRange.toKey]: val }));
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bezent-filter-panel__footer-compact">
        <button
          type="button"
          className="bezent-filter-panel__clear-btn"
          onClick={() => setDraft({ ...defaults })}
        >
          Clear all
        </button>
        <div className="bezent-filter-panel__footer-actions">
          <button
            type="button"
            className="bezent-btn bezent-btn--outline bezent-btn--pill bezent-btn--md"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bezent-btn bezent-btn--primary bezent-btn--pill bezent-btn--md"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
