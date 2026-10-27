import React, { useState, useEffect, useRef } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import type { OrganizationMasters } from '../../api/organizationMastersApi';
import type {
  EmployeeActionStatus,
  EmployeeActionType,
} from '../../employee-administration/api/employeeAdministrationApi';

export interface PromotionsFilterState {
  status: EmployeeActionStatus | '';
  actionType: EmployeeActionType | '';
  departmentId: string;
  effectiveDateFrom: string;
  effectiveDateTo: string;
}

export const EMPTY_PROMOTIONS_FILTER_STATE: PromotionsFilterState = {
  status: '',
  actionType: '',
  departmentId: '',
  effectiveDateFrom: '',
  effectiveDateTo: '',
};

export function countActivePromotionsFilters(filters: PromotionsFilterState): number {
  let count = 0;
  if (filters.status) count += 1;
  if (filters.actionType) count += 1;
  if (filters.departmentId) count += 1;
  if (filters.effectiveDateFrom || filters.effectiveDateTo) count += 1;
  return count;
}

interface PromotionsFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: PromotionsFilterState;
  onApply: (filters: PromotionsFilterState) => void;
  masters: OrganizationMasters | null;
}

export const PromotionsFilterPanel: React.FC<PromotionsFilterPanelProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
  masters,
}) => {
  const [draft, setDraft] = useState<PromotionsFilterState>(appliedFilters);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(appliedFilters);
    }
  }, [isOpen, appliedFilters]);

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
      draft.effectiveDateFrom &&
      draft.effectiveDateTo &&
      draft.effectiveDateFrom > draft.effectiveDateTo
    ) {
      alert('Effective date "From date" cannot be after "To date".');
      return;
    }
    onApply(draft);
    onClose();
  };

  const handleClearDraft = () => {
    setDraft(EMPTY_PROMOTIONS_FILTER_STATE);
  };

  const departments = masters?.departments ?? [];

  return (
    <div
      ref={panelRef}
      className="bezent-filter-panel"
      role="dialog"
      aria-label="Filter Promotions"
      aria-modal="false"
    >
      {/* 1. Panel Header */}
      <div className="bezent-filter-panel__header">
        <div className="bezent-filter-panel__title-group">
          <BezentIcon name="filter" size={16} />
          <h3 className="bezent-filter-panel__title">Filter Promotions</h3>
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

      {/* 2. Compact Form Body */}
      <div className="bezent-filter-panel__body-compact">
        {/* Row 1: Status & Promotion Type */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="promotions-filter-status">
              Promotion Status
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="promotions-filter-status"
                className="bezent-filter-select-control"
                value={draft.status}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: e.target.value as EmployeeActionStatus | '',
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="applied">Applied / Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>

          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="promotions-filter-type">
              Promotion Type
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="promotions-filter-type"
                className="bezent-filter-select-control"
                value={draft.actionType}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    actionType: e.target.value as EmployeeActionType | '',
                  }))
                }
              >
                <option value="">All Promotion Types</option>
                <option value="designation_change">Designation Upgrade / Promotion</option>
                <option value="department_change">Department & Role Promotion</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Department */}
        <div className="bezent-filter-form-group--full">
          <label className="bezent-filter-label" htmlFor="promotions-filter-department">
            Department
          </label>
          <div className="bezent-filter-select-wrap">
            <select
              id="promotions-filter-department"
              className="bezent-filter-select-control"
              value={draft.departmentId}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  departmentId: e.target.value,
                }))
              }
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <span className="bezent-filter-select-chevron">
              <BezentIcon name="chevronDown" size={16} />
            </span>
          </div>
        </div>

        {/* Row 3: Effective Date Range */}
        <div className="bezent-filter-form-group--full">
          <label className="bezent-filter-label">Effective Date Range</label>
          <div className="bezent-filter-dates-grid">
            <div className="bezent-filter-date-field">
              <span className="bezent-filter-date-icon">
                <BezentIcon name="calendar" size={15} />
              </span>
              <input
                id="promotions-filter-date-from"
                type="date"
                className="bezent-filter-date-native-input"
                aria-label="From date"
                placeholder="From date"
                value={draft.effectiveDateFrom}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    effectiveDateFrom: e.target.value,
                  }))
                }
              />
            </div>

            <div className="bezent-filter-date-field">
              <span className="bezent-filter-date-icon">
                <BezentIcon name="calendar" size={15} />
              </span>
              <input
                id="promotions-filter-date-to"
                type="date"
                className="bezent-filter-date-native-input"
                aria-label="To date"
                placeholder="To date"
                value={draft.effectiveDateTo}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    effectiveDateTo: e.target.value,
                  }))
                }
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
