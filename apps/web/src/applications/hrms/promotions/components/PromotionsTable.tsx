import React, { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  EmptyState,
  Grid,
  Inline,
  LoadingState,
  Stack,
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
import { getAvatarColor } from '../../employees/model/employeeModel';

export interface PromotionsTableProps {
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
  onInitiatePromotion?: () => void;
  onClearFilters?: () => void;
  viewMode?: 'list' | 'grid';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name[0] ?? '').toUpperCase();
}

export const PromotionsTable: React.FC<PromotionsTableProps> = ({
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
  onInitiatePromotion,
  onClearFilters,
  viewMode = 'list',
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
    return <LoadingState label="Loading promotion records…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <div className="bezent-table-error-state">
        <EmptyState
          variant="employees"
          title="Promotions could not be loaded"
          description={error ?? 'An unexpected error occurred while fetching promotion records.'}
          primaryAction={{ label: 'Retry', onClick: onRetry }}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="employees"
        title={filtered ? 'No matching promotion records' : 'No Promotions Found'}
        description={
          filtered
            ? 'No promotion records match your search or filter criteria. Try adjusting or clearing your filters.'
            : 'Get started by initiating a new employee role promotion or designation upgrade.'
        }
        primaryAction={
          filtered
            ? onClearFilters
              ? { label: 'Clear Filters', onClick: onClearFilters }
              : undefined
            : onInitiatePromotion
              ? { label: 'Initiate Promotion', onClick: onInitiatePromotion }
              : undefined
        }
      />
    );
  }

  // Grid View Mode matching Employee Directory / Candidates layout
  if (viewMode === 'grid') {
    return (
      <Grid columns={3} gap="md" aria-label="Promotions Grid View">
        {items.map((action) => {
          const isMenuOpen = activeMenuId === action.id;
          const avatarColor = getAvatarColor(action.employeeId || action.employeeNumber);
          const initials = getInitials(action.employeeName);
          const roleChange = action.changes.find((c) => c.field === 'designationId');
          const deptChange = action.changes.find((c) => c.field === 'departmentId');
          const isPending = action.status === 'pending';
          const canApply = isPending && action.effectiveDate <= today;

          return (
            <Card
              key={action.id}
              variant="default"
              padding="md"
              hoverable
              onClick={() => onOpenAction(action.id)}
            >
              <CardBody>
                <Stack gap="sm">
                  {/* Top: Avatar + Name & ID + Context Action */}
                  <Inline justify="between" align="start">
                    <Inline align="center" gap="sm">
                      <Avatar
                        initials={initials}
                        size="md"
                        color={avatarColor}
                        alt={action.employeeName}
                      />
                      <Stack gap="none">
                        <button
                          type="button"
                          className="bezent-table-meta-title"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAction(action.id);
                          }}
                          aria-label={`Open promotion details for ${action.employeeName}`}
                        >
                          {action.employeeName}
                        </button>
                        <span className="bezent-table-meta-subtitle font-mono">
                          {action.employeeNumber}
                        </span>
                      </Stack>
                    </Inline>
                    <div className="bezent-table-action-menu">
                      <button
                        type="button"
                        className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId((prev) => (prev === action.id ? null : action.id));
                        }}
                        title="Actions"
                        aria-label={`Actions for promotion of ${action.employeeName}`}
                      >
                        <BezentIcon name="more" size={16} />
                      </button>
                      {isMenuOpen && (
                        <div
                          className="bezent-table-action-menu__dropdown"
                          role="menu"
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
                            View Promotion Details
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
                              Apply Promotion
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
                              Cancel Promotion
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
                  </Inline>

                  {/* Role Transition */}
                  <Stack gap="none">
                    <span className="bezent-table-meta-title">
                      {roleChange
                        ? `${changeValueLabel(roleChange, 'from')} → ${changeValueLabel(roleChange, 'to')}`
                        : actionTypeLabel(action.actionType)}
                    </span>
                    {deptChange ? (
                      <span className="bezent-table-meta-subtitle">
                        {`${changeValueLabel(deptChange, 'from')} → ${changeValueLabel(deptChange, 'to')}`}
                      </span>
                    ) : null}
                  </Stack>

                  {/* Footer: Status Badge + Effective Date */}
                  <Inline justify="between" align="center">
                    <Badge variant={actionStatusVariant(action.status)} size="sm">
                      {ACTION_STATUS_LABELS[action.status]}
                    </Badge>
                    <span className="bezent-table-meta-dim">
                      {formatDate(action.effectiveDate)}
                    </span>
                  </Inline>
                </Stack>
              </CardBody>
            </Card>
          );
        })}
      </Grid>
    );
  }

  return (
    <div ref={tableRef}>
      <Table hoverable aria-label="Promotions directory">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Employee ID</TableHeaderCell>
            <TableHeaderCell>Current Role → Proposed Role</TableHeaderCell>
            <TableHeaderCell>Department</TableHeaderCell>
            <TableHeaderCell>Effective Date</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((action, index) => {
            const isMenuOpen = activeMenuId === action.id;
            const isNearBottom = index >= items.length - 2 && items.length > 3;

            // Extract role (designation), department, and reporting manager changes
            const roleChange = action.changes.find((c) => c.field === 'designationId');
            const deptChange = action.changes.find((c) => c.field === 'departmentId');
            const managerChange = action.changes.find((c) => c.field === 'reportingManagerId');

            const isPending = action.status === 'pending';
            const canApply = isPending && action.effectiveDate <= today;

            const avatarColor = getAvatarColor(action.employeeId || action.employeeNumber);

            return (
              <TableRow key={action.id} className={isMenuOpen ? 'is-menu-open' : ''}>
                {/* Employee Name + Avatar */}
                <TableCell>
                  <div className="bezent-table-cell--avatar-meta">
                    <Avatar
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
                        aria-label={`Open promotion details for ${action.employeeName}`}
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
                    className="bezent-table-meta-subtitle font-mono"
                    onClick={() => onOpenEmployee(action.employeeId)}
                    aria-label={`Open profile of employee ${action.employeeNumber}`}
                  >
                    {action.employeeNumber}
                  </button>
                </TableCell>

                {/* Current Role → Proposed Role */}
                <TableCell>
                  {roleChange ? (
                    <div className="bezent-table-meta-group">
                      <span className="bezent-transfer-transition">
                        <span className="bezent-transfer-from">
                          {changeValueLabel(roleChange, 'from')}
                        </span>
                        <span className="bezent-transfer-arrow" aria-hidden="true">
                          →
                        </span>
                        <span className="bezent-transfer-to">
                          {changeValueLabel(roleChange, 'to')}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="bezent-table-meta-dim">—</span>
                  )}
                </TableCell>

                {/* Department */}
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

                {/* Effective Date */}
                <TableCell>
                  <span className="bezent-table-meta-date">{formatDate(action.effectiveDate)}</span>
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <span
                    className={`bezent-status-pill bezent-status-pill--${actionStatusVariant(action.status)}`}
                  >
                    <span className="bezent-status-pill__dot" aria-hidden="true" />
                    <span>{ACTION_STATUS_LABELS[action.status]}</span>
                  </span>
                </TableCell>

                {/* Actions Menu */}
                <TableCell align="right" className="bezent-table-col--actions">
                  <div className="bezent-table-action-menu">
                    <button
                      type="button"
                      className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                      aria-label={`Actions for promotion of ${action.employeeName}`}
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
                        aria-label={`Actions for promotion of ${action.employeeName}`}
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
                          View Promotion Details
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
                            Apply Promotion
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
                            Cancel Promotion
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
