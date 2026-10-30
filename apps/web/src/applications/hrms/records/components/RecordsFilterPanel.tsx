import React, { useState, useEffect, useRef } from 'react';
import { BezentIcon } from '../../../../design-system/icons';
import type { OrganizationMasters } from '../../api/organizationMastersApi';
import type {
  DocumentCategory,
  DocumentStatus,
  DocumentView,
} from '../../documents/api/documentsApi';
import { CATEGORY_LABELS, STATUS_LABELS } from '../../documents/model/documentModel';

export interface RecordsFilterState {
  category: DocumentCategory | '';
  status: DocumentStatus | '';
  view: DocumentView;
  departmentId: string;
}

export const EMPTY_RECORDS_FILTER_STATE: RecordsFilterState = {
  category: '',
  status: '',
  view: 'all',
  departmentId: '',
};

export function countActiveRecordsFilters(filters: RecordsFilterState): number {
  let count = 0;
  if (filters.category) count += 1;
  if (filters.status) count += 1;
  if (filters.view && filters.view !== 'all') count += 1;
  if (filters.departmentId) count += 1;
  return count;
}

interface RecordsFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  appliedFilters: RecordsFilterState;
  onApply: (filters: RecordsFilterState) => void;
  masters: OrganizationMasters | null;
}

export const RecordsFilterPanel: React.FC<RecordsFilterPanelProps> = ({
  isOpen,
  onClose,
  appliedFilters,
  onApply,
  masters,
}) => {
  const [draft, setDraft] = useState<RecordsFilterState>(appliedFilters);
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
    onApply(draft);
    onClose();
  };

  const handleClearDraft = () => {
    setDraft(EMPTY_RECORDS_FILTER_STATE);
  };

  const departments = masters?.departments ?? [];

  return (
    <div
      ref={panelRef}
      className="bezent-filter-panel"
      role="dialog"
      aria-label="Filter Records"
      aria-modal="false"
    >
      {/* 1. Panel Header */}
      <div className="bezent-filter-panel__header">
        <div className="bezent-filter-panel__title-group">
          <BezentIcon name="filter" size={16} />
          <h3 className="bezent-filter-panel__title">Filter Records</h3>
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
        {/* Row 1: Category & Status */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="records-filter-category">
              Record Category
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="records-filter-category"
                className="bezent-filter-select-control"
                value={draft.category}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    category: e.target.value as DocumentCategory | '',
                  }))
                }
              >
                <option value="">All Categories</option>
                {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>

          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="records-filter-status">
              Verification Status
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="records-filter-status"
                className="bezent-filter-select-control"
                value={draft.status}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: e.target.value as DocumentStatus | '',
                  }))
                }
              >
                <option value="">All Statuses</option>
                {(Object.keys(STATUS_LABELS) as DocumentStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Lifecycle View & Department */}
        <div className="bezent-filter-form-grid">
          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="records-filter-view">
              Lifecycle View
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="records-filter-view"
                className="bezent-filter-select-control"
                value={draft.view}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    view: e.target.value as DocumentView,
                  }))
                }
              >
                <option value="all">All Records</option>
                <option value="pending_review">Pending Review</option>
                <option value="expiring">Expiring Soon (30 Days)</option>
                <option value="expired">Expired</option>
              </select>
              <span className="bezent-filter-select-chevron">
                <BezentIcon name="chevronDown" size={16} />
              </span>
            </div>
          </div>

          <div className="bezent-filter-form-group">
            <label className="bezent-filter-label" htmlFor="records-filter-department">
              Department
            </label>
            <div className="bezent-filter-select-wrap">
              <select
                id="records-filter-department"
                className="bezent-filter-select-control"
                value={draft.departmentId}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    departmentId: e.target.value,
                  }))
                }
                disabled={departments.length === 0}
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
