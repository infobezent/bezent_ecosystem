import React, { useState, useEffect, useRef } from 'react';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  EmptyState,
  Grid,
  IconButton,
  Inline,
  LoadingState,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSkeleton,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  actionStatusVariant,
  actionTypeLabel,
  formatDate,
} from '../../employee-administration/model/actionCatalog';
import { getAvatarColor } from '../../employees/model/employeeModel';

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
  viewMode?: 'list' | 'grid';
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
    return (
      <Table hoverable aria-label="Offboarding directory">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Employee ID</TableHeaderCell>
            <TableHeaderCell>Exit Type</TableHeaderCell>
            <TableHeaderCell>Last Working Day</TableHeaderCell>
            <TableHeaderCell>Notice Status</TableHeaderCell>
            <TableHeaderCell>Clearance</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell align="right">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableSkeleton rows={8} columns={8} label="Loading offboarding records…" />
      </Table>
    );
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

  // Grid View Mode matching Employee Directory / Candidates layout
  if (viewMode === 'grid') {
    return (
      <Grid columns={3} gap="md" aria-label="Offboarding Grid View">
        {items.map((action) => {
          const isMenuOpen = activeMenuId === action.id;
          const avatarColor = getAvatarColor(action.employeeId || action.employeeNumber);
          const initials = getInitials(action.employeeName);
          const isPending = action.status === 'pending';
          const canApply = isPending && action.effectiveDate <= today;
          const isServingNotice = isPending && action.effectiveDate > today;

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
                          aria-label={`Open offboarding details for ${action.employeeName}`}
                        >
                          {action.employeeName}
                        </button>
                        <span className="bezent-table-meta-subtitle font-mono">
                          {action.employeeNumber}
                        </span>
                      </Stack>
                    </Inline>
                    <div className="bezent-table-row-actions">
                      <IconButton
                        label="View Details"
                        variant="ghost"
                        tooltipDirection="left"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAction(action.id);
                        }}
                        aria-label={`View offboarding details for ${action.employeeName}`}
                      >
                        <BezentIcon name="eye" size={16} />
                      </IconButton>
                      {canApply && (
                        <IconButton
                          label="Complete Separation"
                          variant="ghost"
                          tooltipDirection="left"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplyAction(action);
                          }}
                          aria-label={`Complete separation for ${action.employeeName}`}
                        >
                          <BezentIcon name="checkCircle" size={16} />
                        </IconButton>
                      )}
                      {isPending && (
                        <IconButton
                          label="Cancel Request"
                          variant="ghost"
                          tooltipDirection="left"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelAction(action);
                          }}
                          aria-label={`Cancel request for ${action.employeeName}`}
                        >
                          <BezentIcon name="close" size={16} />
                        </IconButton>
                      )}
                      <IconButton
                        label="View Profile"
                        variant="ghost"
                        tooltipDirection="left"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEmployee(action.employeeId);
                        }}
                        aria-label={`View profile of ${action.employeeName}`}
                      >
                        <BezentIcon name="employees" size={16} />
                      </IconButton>
                    </div>
                  </Inline>

                  {/* Exit Type & Notice */}
                  <Stack gap="none">
                    <span className="bezent-table-meta-title">
                      {actionTypeLabel(action.actionType)}
                    </span>
                    <span className="bezent-table-meta-subtitle">
                      {action.reason || 'Exit formalities in progress'}
                    </span>
                  </Stack>

                  {/* Notice Status Pill */}
                  <Inline justify="between" align="center">
                    <span className="bezent-table-meta-subtitle">Notice Status:</span>
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
                  </Inline>

                  {/* Footer: Status Badge + LWD */}
                  <Inline justify="between" align="center">
                    <Badge variant={actionStatusVariant(action.status)} size="sm">
                      {ACTION_STATUS_LABELS[action.status]}
                    </Badge>
                    <span className="bezent-table-meta-dim">
                      {`LWD: ${formatDate(action.effectiveDate)}`}
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
      <Table hoverable aria-label="Offboarding directory">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Employee</TableHeaderCell>
            <TableHeaderCell>Employee ID</TableHeaderCell>
            <TableHeaderCell>Exit Type</TableHeaderCell>
            <TableHeaderCell>Last Working Day</TableHeaderCell>
            <TableHeaderCell>Notice Status</TableHeaderCell>
            <TableHeaderCell>Clearance</TableHeaderCell>
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
                    className="bezent-table-meta-subtitle font-mono"
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

                {/* Clearance progress (Settings checklist) */}
                <TableCell>
                  {action.clearance && action.clearance.total > 0 ? (
                    <span className="bezent-table-meta-date">
                      {action.clearance.cleared}/{action.clearance.total} cleared
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>

                {/* Overall Action Status Badge */}
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
                  <div className="bezent-table-row-actions">
                    <IconButton
                      label="View Details"
                      variant="ghost"
                      tooltipDirection="left"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAction(action.id);
                      }}
                      aria-label={`View offboarding details for ${action.employeeName}`}
                    >
                      <BezentIcon name="eye" size={16} />
                    </IconButton>
                    {canApply && (
                      <IconButton
                        label="Complete Separation"
                        variant="ghost"
                        tooltipDirection="left"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApplyAction(action);
                        }}
                        aria-label={`Complete separation for ${action.employeeName}`}
                      >
                        <BezentIcon name="checkCircle" size={16} />
                      </IconButton>
                    )}
                    {isPending && (
                      <IconButton
                        label="Cancel Request"
                        variant="ghost"
                        tooltipDirection="left"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelAction(action);
                        }}
                        aria-label={`Cancel request for ${action.employeeName}`}
                      >
                        <BezentIcon name="close" size={16} />
                      </IconButton>
                    )}
                    <IconButton
                      label="View Profile"
                      variant="ghost"
                      tooltipDirection="left"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEmployee(action.employeeId);
                      }}
                      aria-label={`View profile of ${action.employeeName}`}
                    >
                      <BezentIcon name="employees" size={16} />
                    </IconButton>
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
