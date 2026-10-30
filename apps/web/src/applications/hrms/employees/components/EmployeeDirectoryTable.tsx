import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Stack,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeRecord } from '../api/employeesApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  employmentStatusVariant,
  employmentTypeLabel,
  formatDate,
  getAvatarColor,
  getEmployeeAvatarId,
  getInitials,
} from '../model/employeeModel';

export type SortColumn = 'employee' | 'department' | 'employment' | 'joinedDate' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface EmployeeDirectoryTableProps {
  status: 'loading' | 'error' | 'ready';
  employees: EmployeeRecord[];
  error?: string | null;
  /** Optional active action menu ID */
  activeMenuId?: string | null;
  onToggleMenu?: (employeeId: string) => void;
  /** True when search/filters narrowed the list — changes the empty-state copy. */
  filtered?: boolean;
  onRetry: () => void;
  onOpenEmployee: (employeeId: string) => void;
  /** Optional callback to edit employee details */
  onEditEmployee?: (employeeId: string) => void;
  /** Callback to clear active filters when empty results are shown */
  onClearFilters?: () => void;
  /** Currently active sort column */
  sortColumn?: SortColumn | null;
  /** Currently active sort direction */
  sortDirection?: SortDirection;
  /** Callback when a sortable column header is clicked */
  onSort?: (column: SortColumn) => void;
}

/** Canonical Employee Directory table. */
export function EmployeeDirectoryTable({
  status,
  employees,
  error,
  activeMenuId = null,
  onToggleMenu,
  filtered,
  onRetry,
  onOpenEmployee,
  onEditEmployee,
  onClearFilters,
  sortColumn = null,
  sortDirection = 'asc',
  onSort,
}: EmployeeDirectoryTableProps) {
  const toggleMenu = (id: string) => {
    onToggleMenu?.(id);
  };

  const renderSortHeader = (column: SortColumn, label: string) => {
    const isActive = sortColumn === column;
    const arrow = isActive ? (sortDirection === 'asc' ? '↑' : '↓') : '↑';
    const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <TableHeaderCell aria-sort={ariaSort}>
        {onSort ? (
          <button
            type="button"
            className={`bezent-table-th-sortable ${isActive ? 'bezent-table-th-sortable--active' : ''}`}
            onClick={() => onSort(column)}
            aria-label={`Sort by ${label} ${isActive && sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          >
            <span>{label}</span>
            <span
              className={`bezent-table-sort-arrow ${isActive ? 'bezent-table-sort-arrow--active' : ''}`}
              aria-hidden="true"
            >
              {arrow}
            </span>
          </button>
        ) : (
          <span className="bezent-table-th-sortable">
            <span>{label}</span>
          </span>
        )}
      </TableHeaderCell>
    );
  };

  if (status === 'loading') {
    return <LoadingState label="Loading employees…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Employees could not be loaded">
          {error ?? 'An unexpected error occurred.'}
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (employees.length === 0) {
    return (
      <EmptyState
        size="compact"
        variant="employees"
        title={filtered ? 'No matching employees' : 'No employees yet'}
        description={
          filtered
            ? 'No employees match the current search or filters. Try clearing them.'
            : 'Employee records will appear here once people join your organization.'
        }
        primaryAction={
          filtered && onClearFilters
            ? {
                label: 'Clear filters',
                onClick: onClearFilters,
              }
            : undefined
        }
      />
    );
  }

  return (
    <Table hoverable aria-label="Employees">
      <TableHead>
        <TableRow>
          {renderSortHeader('employee', 'Employee')}
          {renderSortHeader('department', 'Department')}
          {renderSortHeader('employment', 'Employment')}
          {renderSortHeader('joinedDate', 'Joined Date')}
          {renderSortHeader('status', 'Status')}
          <TableHeaderCell className="bezent-table-col--actions">Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {employees.map((employee, index) => {
          const statusVariant = employmentStatusVariant(employee.employmentStatus);
          const statusText = EMPLOYMENT_STATUS_LABELS[employee.employmentStatus];
          const isMenuOpen = activeMenuId === employee.id;
          const avatarColor = getAvatarColor(employee.id || employee.employeeNumber);
          const avatarId = getEmployeeAvatarId(employee.id || employee.employeeNumber);
          const isNearBottom = index >= employees.length - 2 && employees.length > 2;

          return (
            <TableRow key={employee.id} className={isMenuOpen ? 'is-menu-open' : ''}>
              {/* Employee avatar + name + ID & designation */}
              <TableCell>
                <div className="bezent-table-cell--avatar-meta">
                  <Avatar
                    avatarId={avatarId}
                    initials={getInitials(employee.fullName)}
                    color={avatarColor}
                    size="md"
                    alt={employee.fullName}
                  />
                  <div className="bezent-table-meta-group">
                    <button
                      type="button"
                      className="bezent-table-meta-title"
                      onClick={() => onOpenEmployee(employee.id)}
                      aria-label={`Open profile of ${employee.fullName}`}
                    >
                      {employee.fullName}
                    </button>
                    <span className="bezent-table-meta-subtitle">
                      <button
                        type="button"
                        className="bezent-table-meta-subtitle"
                        onClick={() => onOpenEmployee(employee.id)}
                        aria-label={`Open profile of employee ${employee.employeeNumber}`}
                      >
                        {employee.employeeNumber}
                      </button>
                      {employee.designationName ? ` • ${employee.designationName}` : ''}
                    </span>
                  </div>
                </div>
              </TableCell>

              {/* Department */}
              <TableCell>{employee.departmentName ?? '—'}</TableCell>

              {/* Employment Type */}
              <TableCell>{employmentTypeLabel(employee.employmentType)}</TableCell>

              {/* Joined Date */}
              <TableCell>{formatDate(employee.joiningDate)}</TableCell>

              {/* Status Pill with dot */}
              <TableCell>
                <StatusBadge status={employee.employmentStatus} size="sm" />
              </TableCell>

              {/* Actions */}
              <TableCell className="bezent-table-col--actions">
                <div className="bezent-table-action-menu">
                  <button
                    type="button"
                    className={`bezent-table-action-btn ${isMenuOpen ? 'is-active' : ''}`}
                    aria-label={`Actions for ${employee.fullName}`}
                    aria-expanded={isMenuOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(employee.id);
                    }}
                  >
                    <BezentIcon name="more" size={18} />
                  </button>

                  {isMenuOpen && (
                    <div
                      className={`bezent-table-action-menu__dropdown ${isNearBottom ? 'bezent-table-action-menu__dropdown--upwards' : ''}`}
                      role="menu"
                      aria-label={`Actions for ${employee.fullName}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="bezent-table-action-menu__item"
                        onClick={() => {
                          toggleMenu(employee.id);
                          onOpenEmployee(employee.id);
                        }}
                      >
                        <BezentIcon name="employees" size={16} />
                        View Profile
                      </button>
                      {onEditEmployee && (
                        <button
                          type="button"
                          role="menuitem"
                          className="bezent-table-action-menu__item"
                          onClick={() => {
                            toggleMenu(employee.id);
                            onEditEmployee(employee.id);
                          }}
                        >
                          <BezentIcon name="edit" size={16} />
                          Edit Details
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
