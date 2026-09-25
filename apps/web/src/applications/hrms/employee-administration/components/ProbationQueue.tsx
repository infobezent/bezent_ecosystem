import {
  Alert,
  Badge,
  Button,
  EmptyState,
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
import type { EmployeeRecord } from '../api/employeeAdministrationApi';
import {
  EMPLOYMENT_STATUS_LABELS,
  employmentStatusVariant,
  formatDate,
} from '../model/actionCatalog';
import type { LoadStatus } from './ActionQueue';

export interface ProbationQueueProps {
  status: LoadStatus;
  employees: EmployeeRecord[];
  error?: string | null;
  onRetry: () => void;
  onConfirm: (employee: EmployeeRecord) => void;
  onExtend: (employee: EmployeeRecord) => void;
  /** Navigates to the canonical Employee Profile. */
  onOpenEmployee: (employeeId: string) => void;
}

/** Employees currently on probation, with their confirmation due dates. */
export function ProbationQueue({
  status,
  employees,
  error,
  onRetry,
  onConfirm,
  onExtend,
  onOpenEmployee,
}: ProbationQueueProps) {
  if (status === 'loading') {
    return <LoadingState label="Loading employees on probation…" minHeight="sm" />;
  }

  if (status === 'error') {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Employees on probation could not be loaded">
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
        hideIllustration
        title="No confirmations due"
        description="Employees on probation will appear here with their confirmation due dates."
      />
    );
  }

  return (
    <Table hoverable aria-label="Employees on probation">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Employee ID</TableHeaderCell>
          <TableHeaderCell>Joining Date</TableHeaderCell>
          <TableHeaderCell>Confirmation Due Date</TableHeaderCell>
          <TableHeaderCell>Reporting Manager</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
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
            <TableCell>{employee.employeeNumber}</TableCell>
            <TableCell>{formatDate(employee.joiningDate)}</TableCell>
            <TableCell>
              {employee.probationEndDate ? formatDate(employee.probationEndDate) : 'Not set'}
            </TableCell>
            <TableCell>{employee.reportingManagerName ?? 'Not assigned'}</TableCell>
            <TableCell>
              <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
                {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
              </Badge>
            </TableCell>
            <TableCell>
              <Inline gap="xs">
                <Button variant="text" size="sm" onClick={() => onConfirm(employee)}>
                  Confirm
                </Button>
                <Button variant="text" size="sm" onClick={() => onExtend(employee)}>
                  Extend
                </Button>
              </Inline>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
