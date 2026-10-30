import React, { useState, useEffect, useRef } from 'react';
import { BezentIcon } from '../../../../design-system/icons';

export interface AttendanceFilterState {
  departmentId: string;
  status: string;
  shiftRef: string;
  locationId: string;
  processingState: string;
  indicator: string;
  punchSource: string;
}

export const EMPTY_ATTENDANCE_FILTER_STATE: AttendanceFilterState = {
  departmentId: '',
  status: '',
  shiftRef: '',
  locationId: '',
  processingState: '',
  indicator: '',
  punchSource: '',
};

export function countActiveAttendanceFilters(filters: AttendanceFilterState): number {
  let count = 0;
  if (filters.departmentId) count += 1;
  if (filters.status) count += 1;
  if (filters.shiftRef) count += 1;
  if (filters.locationId) count += 1;
  if (filters.processingState) count += 1;
  if (filters.indicator) count += 1;
  if (filters.punchSource) count += 1;
  return count;
}

interface AttendanceFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: AttendanceFilterState;
  onApply: (filters: AttendanceFilterState) => void;
  departments: Array<{ id: string; name: string }>;
  workLocations: Array<{ id: string; name: string }>;
}

export const AttendanceFilterPanel: React.FC<AttendanceFilterPanelProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
  departments,
  workLocations,
}) => {
  const [draft, setDraft] = useState<AttendanceFilterState>(appliedFilters);
  const panelRef = useRef<HTMLDivElement>(null);

  // Synchronize draft filters with appliedFilters whenever panel opens
  useEffect(() => {
    if (isOpen) {
      setDraft(appliedFilters);
    }
  }, [isOpen, appliedFilters]);

  // Click outside and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClearDraft = () => {
    setDraft(EMPTY_ATTENDANCE_FILTER_STATE);
  };

  return (
    <div
      ref={panelRef}
      className="bezent-filter-panel"
      role="dialog"
      aria-label="Filter Attendance"
      aria-modal="false"
    >
      {/* 1. Panel Header */}
      <div className="bezent-filter-panel__header">
        <div className="bezent-filter-panel__title-group">
          <BezentIcon name="filter" size={16} />
          <h3 className="bezent-filter-panel__title">Filter Attendance</h3>
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

      {/* 2. Compact 2-Column Form Body */}
      <div className="bezent-filter-panel__body-compact">
        {/* Row 1: Department | Status */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-department">
              Department
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-department"
                className="bezent-filter-select-control"
                value={draft.departmentId}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, departmentId: val }));
                }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>

          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-status">
              Status
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-status"
                className="bezent-filter-select-control"
                value={draft.status}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, status: val }));
                }}
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="weekly_off">Weekly Off</option>
                <option value="holiday">Holiday</option>
                <option value="on_leave">On Leave</option>
                <option value="work_from_home">Work From Home</option>
                <option value="on_duty">On Duty</option>
                <option value="missing_punch">Missed Punch</option>
                <option value="pending">Pending</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Shift | Location */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-shift">
              Shift
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-shift"
                className="bezent-filter-select-control"
                value={draft.shiftRef}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, shiftRef: val }));
                }}
              >
                <option value="">All Shifts</option>
                <option value="General">General</option>
                <option value="Morning">Morning</option>
                <option value="Night">Night</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>

          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-location">
              Work Location
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-location"
                className="bezent-filter-select-control"
                value={draft.locationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, locationId: val }));
                }}
              >
                <option value="">All Work Locations</option>
                {workLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Processing State | Indicators */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-processing-state">
              Processing State
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-processing-state"
                className="bezent-filter-select-control"
                value={draft.processingState}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, processingState: val }));
                }}
              >
                <option value="">All Processing States</option>
                <option value="provisional">Provisional</option>
                <option value="pending_processing">Pending Processing</option>
                <option value="incomplete">Incomplete</option>
                <option value="pending_review">Pending Review</option>
                <option value="finalized">Finalized</option>
                <option value="locked">Locked</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>

          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-indicator">
              Indicator
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-indicator"
                className="bezent-filter-select-control"
                value={draft.indicator}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({ ...prev, indicator: val }));
                }}
              >
                <option value="">All Indicators</option>
                <option value="late">Late Arrival</option>
                <option value="early_exit">Early Exit</option>
                <option value="missing_punch_in">Missed Punch In</option>
                <option value="missing_punch_out">Missed Punch Out</option>
                <option value="insufficient_hours">Short Hours</option>
                <option value="regularized">Adjusted / Regularized</option>
                <option value="device_sync_pending">Device Sync Pending</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Row 4: Punch Source */}
        <div className="bezent-filter-form-group--full">
          <label className="bezent-filter-label" htmlFor="filter-punch-source">
            Punch Source
          </label>
          <div className="bezent-filter-select-wrap">
            <select
              id="filter-punch-source"
              className="bezent-filter-select-control"
              value={draft.punchSource}
              onChange={(e) => {
                const val = e.target.value;
                setDraft((prev) => ({ ...prev, punchSource: val }));
              }}
            >
              <option value="">All Punch Sources</option>
              <option value="biometric">Biometric Device</option>
              <option value="web">Web Portal</option>
              <option value="mobile">Mobile App</option>
              <option value="manual">Manual Entry</option>
              <option value="api">API / Import</option>
            </select>
            <span className="bezent-filter-select-chevron">
              <BezentIcon name="chevronDown" size={16} />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Footer Actions */}
      <div className="bezent-filter-panel__footer-compact">
        <button type="button" className="bezent-filter-panel__clear-btn" onClick={handleClearDraft}>
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
            onClick={handleApply}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
