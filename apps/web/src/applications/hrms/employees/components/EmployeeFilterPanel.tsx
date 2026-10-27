import React, { useState, useEffect, useRef } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import type { OrganizationMasters } from '../../api/organizationMastersApi';
import type { EmploymentType, EmploymentStatus } from '../api/employeesApi';

export interface EmployeeFilterState {
  departmentId: string;
  departmentIds: string[];
  locationId: string;
  locationIds: string[];
  employmentType: string;
  employmentStatus: string;
  joiningDateFrom: string;
  joiningDateTo: string;
}

export const EMPTY_FILTER_STATE: EmployeeFilterState = {
  departmentId: '',
  departmentIds: [],
  locationId: '',
  locationIds: [],
  employmentType: '',
  employmentStatus: '',
  joiningDateFrom: '',
  joiningDateTo: '',
};

export function countActiveFilters(filters: EmployeeFilterState): number {
  let count = 0;
  if (filters.departmentId || filters.departmentIds.length > 0) count += 1;
  if (filters.locationId || filters.locationIds.length > 0) count += 1;
  if (filters.employmentType) count += 1;
  if (filters.employmentStatus) count += 1;
  if (filters.joiningDateFrom || filters.joiningDateTo) count += 1;
  return count;
}

interface EmployeeFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: EmployeeFilterState;
  onApply: (filters: EmployeeFilterState) => void;
  masters: OrganizationMasters | null;
}

export const EmployeeFilterPanel: React.FC<EmployeeFilterPanelProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
  masters,
}) => {
  const [draft, setDraft] = useState<EmployeeFilterState>(appliedFilters);
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
    if (
      draft.joiningDateFrom &&
      draft.joiningDateTo &&
      draft.joiningDateFrom > draft.joiningDateTo
    ) {
      alert('Joining date "From date" cannot be after "To date".');
      return;
    }
    onApply(draft);
    onClose();
  };

  const handleClearDraft = () => {
    setDraft(EMPTY_FILTER_STATE);
  };

  const departments = masters?.departments ?? [];
  const locations = masters?.locations ?? [];

  return (
    <div
      ref={panelRef}
      className="bezent-filter-panel"
      role="dialog"
      aria-label="Filter Employees"
      aria-modal="false"
    >
      {/* 1. Panel Header */}
      <div className="bezent-filter-panel__header">
        <div className="bezent-filter-panel__title-group">
          <BezentIcon name="filter" size={16} />
          <h3 className="bezent-filter-panel__title">Filter Employees</h3>
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
        {/* Row 1: Department | Location */}
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
                  setDraft((prev) => ({
                    ...prev,
                    departmentId: val,
                    departmentIds: val ? [val] : [],
                  }));
                }}
              >
                <option value="">All departments</option>
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
            <label className="bezent-filter-label" htmlFor="filter-location">
              Location
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-location"
                className="bezent-filter-select-control"
                value={draft.locationId}
                onChange={(e) => {
                  const val = e.target.value;
                  setDraft((prev) => ({
                    ...prev,
                    locationId: val,
                    locationIds: val ? [val] : [],
                  }));
                }}
              >
                <option value="">All locations</option>
                {locations.map((l) => (
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

        {/* Row 2: Employment Type | Status */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="filter-employment-type">
              Employment Type
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="filter-employment-type"
                className="bezent-filter-select-control"
                value={draft.employmentType}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    employmentType: e.target.value as EmploymentType,
                  }))
                }
              >
                <option value="">All types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
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
                value={draft.employmentStatus}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    employmentStatus: e.target.value as EmploymentStatus,
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="notice">Notice</option>
                <option value="terminated">Terminated</option>
                <option value="suspended">Suspended</option>
                <option value="resigned">Resigned</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Joining Date Range */}
        <div className="bezent-filter-form-group--full">
          <label className="bezent-filter-label">Joining Date</label>
          <div className="bezent-filter-dates-grid">
            <div className="bezent-filter-date-field">
              <span className="bezent-filter-date-icon">
                <BezentIcon name="calendar" size={15} />
              </span>
              <input
                type="date"
                className="bezent-filter-date-native-input"
                aria-label="From date"
                placeholder="From date"
                value={draft.joiningDateFrom}
                onChange={(e) => setDraft((prev) => ({ ...prev, joiningDateFrom: e.target.value }))}
              />
            </div>

            <div className="bezent-filter-date-field">
              <span className="bezent-filter-date-icon">
                <BezentIcon name="calendar" size={15} />
              </span>
              <input
                type="date"
                className="bezent-filter-date-native-input"
                aria-label="To date"
                placeholder="To date"
                value={draft.joiningDateTo}
                onChange={(e) => setDraft((prev) => ({ ...prev, joiningDateTo: e.target.value }))}
              />
            </div>
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
