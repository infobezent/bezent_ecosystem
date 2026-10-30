import React, { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  Badge,
  EmptyState,
  LoadingState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  actionStatusVariant,
  actionTypeLabel,
  changeValueLabel,
  formatDate,
} from '../../employee-administration/model/actionCatalog';
import { getAvatarColor, getEmployeeAvatarId } from '../../employees/model/employeeModel';

export interface TransfersTableProps {
  status: 'loading' | 'error' | 'ready';
  items: EmployeeActionListItem[];
  error?: string | null;
  filtered?: boolean;
  today: string;
  onRetry: () => void;
  onOpenAction: (actionId: string) => void;
  onApplyAction: (action: EmployeeActionListItem) => void;
  onCancelAction: (action: EmployeeActionListItem) => void;
  onOpenEmployee: (employeeId: string) => void;
  onInitiateTransfer?: () => void;
  onClearFilters?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name[0] ?? '').toUpperCase();
}

export const TransfersTable: React.FC<TransfersTableProps> = ({
  status,
  items,
  error,
  filtered,
  today,
  onRetry,
  onOpenAction,
  onApplyAction,
  onCancelAction,
  onOpenEmployee,
  onInitiateTransfer,
  onClearFilters,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Close action menu on click outside or escape key
  useEffect(() => {
    if (!activeMenuId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId]);

  if (status === 'loading') {
    return <LoadingState label="Loading transfer records…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <div className="bezent-table-error-state">
        <EmptyState
          variant="employees"
          title="Transfers could not be loaded"
          description={error ?? 'An unexpected error occurred while fetching transfer records.'}
          primaryAction={{ label: 'Retry', onClick: onRetry }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="employees"
        title={filtered ? 'No matching transfer records' : 'No Transfers Found'}
        description={
          filtered
            ? 'No transfer records match your search or filter criteria. Try adjusting or clearing your filters.'
            : 'Get started by initiating a new department, location, or reporting transfer.'
        }
        primaryAction={
          filtered
            ? onClearFilters
              ? { label: 'Clear Filters', onClick: onClearFilters }
              : undefined
            : onInitiateTransfer
              ? { label: '+ Initiate Transfer', onClick: onInitiateTransfer }
              : undefined
        }
      />
    );
  }

  return (
    <div ref={tableRef}>
      <Table hoverable aria-label="Transfers directory">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Employee ID</TableHeaderCell>
            <TableHeaderCell>Current → New Department</TableHeaderCell>
            <TableHeaderCell>Current → New Location</TableHeaderCell>
            <TableHeaderCell>Effective Date</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((action, index) => {
            const isMenuOpen = activeMenuId === action.id;
            const isNearBottom = index >= items.length - 2 && items.length > 3;

            // Extract department, location, and reporting manager changes
            const deptChange = action.changes.find((c) => c.field === 'departmentId');
            const locChange = action.changes.find((c) => c.field === 'locationId');
            const managerChange = action.changes.find((c) => c.field === 'reportingManagerId');

            const isPending = action.status === 'pending';
            const canApply = isPending && action.effectiveDate <= today;

            const avatarColor = getAvatarColor(action.employeeId || action.employeeNumber);
            const avatarId = getEmployeeAvatarId(action.employeeId || action.employeeNumber);

            return (
              <TableRow key={action.id}>
                {/* Employee Name + Avatar */}
                <TableCell>
                  <div className="bezent-table-cell--avatar-meta">
                    <Avatar
                      avatarId={avatarId}
                      initials={getInitials(action.employeeName)}
                      color={avatarColor}
                      size="md"
                      alt={action.employeeName}
                    />
                    <div className="bezent-table-meta-group">
                      <button
                        type="button"
                        className="bezent-table-meta-title"
                        onClick={() => onOpenAction(action.id)}
                        aria-label={`Open transfer details for ${action.employeeName}`}
                      >
                        {action.employeeName}
                      </button>
                      <span className="bezent-table-meta-subtitle">
                        {actionTypeLabel(action.actionType)}
                        {managerChange && (
                          <span className="bezent-table-meta-tag">
                            {` · Mgr: ${changeValueLabel(managerChange, 'to')}`}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Employee ID */}
                <TableCell>
                  <button
                    type="button"
                    className="bezent-table-meta-subtitle"
                    onClick={() => onOpenEmployee(action.employeeId)}
                    aria-label={`Open profile of employee ${action.employeeNumber}`}
                  >
                    {action.employeeNumber}
                  </button>
                </TableCell>

                {/* Current → New Department */}
                <TableCell>
                  {deptChange ? (
                    <div className="bezent-table-meta-group">
                      <span className="bezent-transfer-transition">
                        <span className="bezent-transfer-from">
                          {changeValueLabel(deptChange, 'from')}
                        </span>
                        <span className="bezent-transfer-arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="bezent-transfer-to">
                          {changeValueLabel(deptChange, 'to')}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="bezent-table-meta-dim">—</span>
                  )}
                </TableCell>

                {/* Current → New Location */}
                <TableCell>
                  {locChange ? (
                    <div className="bezent-table-meta-group">
                      <span className="bezent-transfer-transition">
                        <span className="bezent-transfer-from">
                          {changeValueLabel(locChange, 'from')}
                        </span>
                        <span className="bezent-transfer-arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="bezent-transfer-to">
                          {changeValueLabel(locChange, 'to')}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="bezent-table-meta-dim">—</span>
                  )}
                </TableCell>

                {/* Effective Date */}
                <TableCell>
                  <span className="bezent-table-meta-date">{formatDate(action.effectiveDate)}</span>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <Badge variant={actionStatusVariant(action.status)} size="sm">
                    {ACTION_STATUS_LABELS[action.status]}
                  </Badge>
                </TableCell>

                {/* Actions Menu */}
                <TableCell align="right" className="bezent-table-col--actions">
                  <div className="bezent-table-action-menu">
                    <button
                      type="button"
                      className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                      aria-label={`Actions for transfer of ${action.employeeName}`}
                      aria-expanded={isMenuOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId((prev) => (prev === action.id ? null : action.id));
                      }}
                    >
                      <BezentIcon name="more" size={18} />
                    </button>

                    {isMenuOpen && (
                      <div
                        className={`bezent-table-action-menu__dropdown ${
                          isNearBottom ? 'bezent-table-action-menu__dropdown--upwards' : ''
                        }`}
                        role="menu"
                        aria-label={`Actions for transfer of ${action.employeeName}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="bezent-table-action-menu__item"
                          onClick={() => {
                            setActiveMenuId(null);
                            onOpenAction(action.id);
                          }}
                        >
                          <BezentIcon name="eye" size={16} />
                          View Transfer Details
                        </button>

                        {canApply && (
                          <button
                            type="button"
                            role="menuitem"
                            className="bezent-table-action-menu__item"
                            onClick={() => {
                              setActiveMenuId(null);
                              onApplyAction(action);
                            }}
                          >
                            <BezentIcon name="checkCircle" size={16} />
                            Apply Transfer
                          </button>
                        )}

                        {isPending && (
                          <button
                            type="button"
                            role="menuitem"
                            className="bezent-table-action-menu__item bezent-table-action-menu__item--danger"
                            onClick={() => {
                              setActiveMenuId(null);
                              onCancelAction(action);
                            }}
                          >
                            <BezentIcon name="close" size={16} />
                            Cancel Transfer
                          </button>
                        )}

                        <button
                          type="button"
                          role="menuitem"
                          className="bezent-table-action-menu__item"
                          onClick={() => {
                            setActiveMenuId(null);
                            onOpenEmployee(action.employeeId);
                          }}
                        >
                          <BezentIcon name="employees" size={16} />
                          View Employee Profile
                        </button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
