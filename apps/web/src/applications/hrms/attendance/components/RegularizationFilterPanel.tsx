import React, { useState, useEffect, useRef } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export interface RegularizationFilterState {
  approvalStatus: string;
  requestType: string;
  applicationStatus: string;
  source: string;
  assignedTo: string;
  relatedException: string;
  submittedFrom: string;
  submittedTo: string;
}

export const EMPTY_REGULARIZATION_FILTER_STATE: RegularizationFilterState = {
  approvalStatus: 'all',
  requestType: 'all',
  applicationStatus: 'all',
  source: 'all',
  assignedTo: 'all',
  relatedException: 'all',
  submittedFrom: '',
  submittedTo: '',
};

export function countActiveRegularizationFilters(filters: RegularizationFilterState): number {
  let count = 0;
  if (filters.approvalStatus !== 'all') count += 1;
  if (filters.requestType !== 'all') count += 1;
  if (filters.applicationStatus !== 'all') count += 1;
  if (filters.source !== 'all') count += 1;
  if (filters.assignedTo !== 'all') count += 1;
  if (filters.relatedException !== 'all') count += 1;
  if (filters.submittedFrom || filters.submittedTo) count += 1;
  return count;
}

interface FieldOption {
  value: string;
  label: string;
}

const APPROVAL_OPTIONS: FieldOption[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Pending Review' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'awaiting_info', label: 'Awaiting Info' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS: FieldOption[] = [
  { value: 'all', label: 'All types' },
  { value: 'missing_in', label: 'Missing IN Punch' },
  { value: 'missing_out', label: 'Missing OUT Punch' },
  { value: 'incorrect_time', label: 'Incorrect Punch Time' },
  { value: 'status_correction', label: 'Status Correction' },
  { value: 'worked_hours', label: 'Worked Hours' },
  { value: 'both_missing', label: 'Both Punches Missing' },
  { value: 'wrong_direction', label: 'Wrong Punch Direction' },
];

const APPLICATION_OPTIONS: FieldOption[] = [
  { value: 'all', label: 'All states' },
  { value: 'not_applicable', label: 'Not Applied' },
  { value: 'pending_application', label: 'Pending' },
  { value: 'applied', label: 'Applied' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
];

const SOURCE_OPTIONS: FieldOption[] = [
  { value: 'all', label: 'All sources' },
  { value: 'web', label: 'Web HR Admin' },
  { value: 'ess', label: 'Employee Self-Service' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'biometric', label: 'Biometric Auto' },
];

const ASSIGNED_OPTIONS: FieldOption[] = [
  { value: 'all', label: 'All reviewers' },
  { value: 'unassigned', label: 'Unassigned' },
];

const EXCEPTION_OPTIONS: FieldOption[] = [
  { value: 'all', label: 'All cases' },
  { value: 'has_exception', label: 'Has linked exception' },
];

interface RegularizationFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: RegularizationFilterState;
  onApply: (filters: RegularizationFilterState) => void;
}

export const RegularizationFilterPanel: React.FC<RegularizationFilterPanelProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
}) => {
  const [draft, setDraft] = useState<RegularizationFilterState>(appliedFilters);
  const panelRef = useRef<HTMLDivElement>(null);

  // Start from the applied filters every time the panel opens
  useEffect(() => {
    if (isOpen) setDraft(appliedFilters);
  }, [isOpen, appliedFilters]);

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

  const renderSelect = (
    id: string,
    label: string,
    field: keyof RegularizationFilterState,
    options: FieldOption[],
  ) => (
    <div className="bezent-filter-form-group">
      <label className="bezent-filter-label" htmlFor={id}>
        {label}
      </label>
      <div className="bezent-filter-select-wrap">
        <select
          id={id}
          className="bezent-filter-select-control"
          value={draft[field]}
          onChange={(e) => {
            const val = e.target.value;
            setDraft((prev) => ({ ...prev, [field]: val }));
          }}
        >
          {options.map((o) => (
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
  );

  return (
    <div
      ref={panelRef}
      className="bezent-filter-panel"
      role="dialog"
      aria-label="Filter Requests"
      aria-modal="false"
    >
      <div className="bezent-filter-panel__header">
        <div className="bezent-filter-panel__title-group">
          <BezentIcon name="filter" size={16} />
          <h3 className="bezent-filter-panel__title">Filter Requests</h3>
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
        <div className="bezent-filter-form-grid">
          {renderSelect(
            'reg-filter-approval',
            'Approval Status',
            'approvalStatus',
            APPROVAL_OPTIONS,
          )}
          {renderSelect('reg-filter-type', 'Request Type', 'requestType', TYPE_OPTIONS)}
        </div>

        <div className="bezent-filter-form-grid">
          {renderSelect(
            'reg-filter-application',
            'Application State',
            'applicationStatus',
            APPLICATION_OPTIONS,
          )}
          {renderSelect('reg-filter-source', 'Request Source', 'source', SOURCE_OPTIONS)}
        </div>

        <div className="bezent-filter-form-grid">
          {renderSelect('reg-filter-assigned', 'Assigned To', 'assignedTo', ASSIGNED_OPTIONS)}
          {renderSelect(
            'reg-filter-exception',
            'Related Exception',
            'relatedException',
            EXCEPTION_OPTIONS,
          )}
        </div>

        <div className="bezent-filter-form-group--full">
          <label className="bezent-filter-label">Submitted Date</label>
          <div className="bezent-filter-dates-grid">
            <div className="bezent-filter-date-field">
              <span className="bezent-filter-date-icon">
                <BezentIcon name="calendar" size={15} />
              </span>
              <input
                type="date"
                className="bezent-filter-date-native-input"
                aria-label="Submitted from date"
                value={draft.submittedFrom}
                onChange={(e) => setDraft((prev) => ({ ...prev, submittedFrom: e.target.value }))}
              />
            </div>
            <div className="bezent-filter-date-field">
              <span className="bezent-filter-date-icon">
                <BezentIcon name="calendar" size={15} />
              </span>
              <input
                type="date"
                className="bezent-filter-date-native-input"
                aria-label="Submitted to date"
                value={draft.submittedTo}
                onChange={(e) => setDraft((prev) => ({ ...prev, submittedTo: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bezent-filter-panel__footer-compact">
        <button
          type="button"
          className="bezent-filter-panel__clear-btn"
          onClick={() => setDraft(EMPTY_REGULARIZATION_FILTER_STATE)}
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
