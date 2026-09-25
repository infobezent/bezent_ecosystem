import {
  Alert,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import type { EmployeeRecord } from '../api/employeesApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  employmentStatusVariant,
  employmentTypeLabel,
  formatDate,
} from '../model/employeeModel';

export interface EmployeeDirectoryTableProps {
  status: 'loading' | 'error' | 'ready';
  employees: EmployeeRecord[];
  error?: string | null;
  /** True when search/filters narrowed the list — changes the empty-state copy. */
  filtered?: boolean;
  onRetry: () => void;
  onOpenEmployee: (employeeId: string) => void;
}

/** Canonical Employee Directory table. */
export function EmployeeDirectoryTable({
  status,
  employees,
  error,
  filtered,
  onRetry,
  onOpenEmployee,
}: EmployeeDirectoryTableProps) {
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
      />
    );
  }

  return (
    <Table hoverable aria-label="Employees">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Employee ID</TableHeaderCell>
          <TableHeaderCell>Department</TableHeaderCell>
          <TableHeaderCell>Designation</TableHeaderCell>
          <TableHeaderCell>Location</TableHeaderCell>
          <TableHeaderCell>Reporting Manager</TableHeaderCell>
          <TableHeaderCell>Employment Type</TableHeaderCell>
          <TableHeaderCell>Joining Date</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(employee.id)}
                aria-label={`Open profile of ${employee.fullName}`}
              >
                {employee.fullName}
              </Button>
            </TableCell>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(employee.id)}
                aria-label={`Open profile of employee ${employee.employeeNumber}`}
              >
                {employee.employeeNumber}
              </Button>
            </TableCell>
            <TableCell>{employee.departmentName ?? '—'}</TableCell>
            <TableCell>{employee.designationName ?? '—'}</TableCell>
            <TableCell>{employee.locationName ?? '—'}</TableCell>
            <TableCell>{employee.reportingManagerName ?? '—'}</TableCell>
            <TableCell>{employmentTypeLabel(employee.employmentType)}</TableCell>
            <TableCell>{formatDate(employee.joiningDate)}</TableCell>
            <TableCell>
              <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
                {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
