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
  formatDate,
} from '../../employee-administration/model/actionCatalog';
import { getAvatarColor, getEmployeeAvatarId } from '../../employees/model/employeeModel';

export interface OffboardingTableProps {
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
  onInitiateOffboarding?: () => void;
  onClearFilters?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name[0] ?? '').toUpperCase();
}

export const OffboardingTable: React.FC<OffboardingTableProps> = ({
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
  onInitiateOffboarding,
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
    return <LoadingState label="Loading offboarding records…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <div className="bezent-table-error-state">
        <EmptyState
          variant="employees"
          title="Offboarding records could not be loaded"
          description={error ?? 'An unexpected error occurred while fetching offboarding records.'}
          primaryAction={{ label: 'Retry', onClick: onRetry }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="employees"
        title={filtered ? 'No matching offboarding records' : 'No Offboarding Records'}
        description={
          filtered
            ? 'No offboarding records match your search or filter criteria. Try adjusting or clearing your filters.'
            : 'Get started by recording a new employee resignation or termination exit case.'
        }
        primaryAction={
          filtered
            ? onClearFilters
              ? { label: 'Clear Filters', onClick: onClearFilters }
              : undefined
            : onInitiateOffboarding
              ? { label: 'Initiate Offboarding', onClick: onInitiateOffboarding }
              : undefined
        }
      />
    );
  }

  return (
    <div ref={tableRef}>
      <Table hoverable aria-label="Offboarding directory">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Employee ID</TableHeaderCell>
            <TableHeaderCell>Exit Type</TableHeaderCell>
            <TableHeaderCell>Last Working Day</TableHeaderCell>
            <TableHeaderCell>Notice Status</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((action, index) => {
            const isMenuOpen = activeMenuId === action.id;
            const isNearBottom = index >= items.length - 2 && items.length > 3;

            const isPending = action.status === 'pending';
            const canApply = isPending && action.effectiveDate <= today;
            const isServingNotice = isPending && action.effectiveDate > today;

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
                        aria-label={`Open offboarding details for ${action.employeeName}`}
                      >
                        {action.employeeName}
                      </button>
                      <span className="bezent-table-meta-subtitle">
                        {actionTypeLabel(action.actionType)}
                        {action.requestDate && (
                          <span className="bezent-table-meta-tag">
                            {` · Notice: ${formatDate(action.requestDate)}`}
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

                {/* Exit Type */}
                <TableCell>
                  <Badge
                    variant={action.actionType === 'resignation' ? 'info' : 'danger'}
                    size="sm"
                  >
                    {actionTypeLabel(action.actionType)}
                  </Badge>
                </TableCell>

                {/* Last Working Day */}
                <TableCell>
                  <span className="bezent-table-meta-date">{formatDate(action.effectiveDate)}</span>
                </TableCell>

                {/* Notice Status */}
                <TableCell>
                  {isServingNotice ? (
                    <Badge variant="warning" size="sm">
                      Serving Notice
                    </Badge>
                  ) : isPending ? (
                    <Badge variant="warning" size="sm">
                      Notice Complete · Due
                    </Badge>
                  ) : action.status === 'applied' ? (
                    <Badge variant="neutral" size="sm">
                      Separated
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Cancelled
                    </Badge>
                  )}
                </TableCell>

                {/* Overall Action Status Badge */}
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
                      aria-label={`Actions for offboarding of ${action.employeeName}`}
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
                        aria-label={`Actions for offboarding of ${action.employeeName}`}
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
                          View Offboarding Details
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
                            Complete Separation
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
                            Cancel Request
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
