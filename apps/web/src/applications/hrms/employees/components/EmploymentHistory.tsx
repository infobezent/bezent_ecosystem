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
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  actionStatusVariant,
  actionTypeLabel,
  summarizeChange,
} from '../../employee-administration/model/actionCatalog';
import { formatDate } from '../model/employeeModel';

export interface EmploymentHistoryProps {
  status: 'loading' | 'error' | 'ready';
  actions: EmployeeActionListItem[];
  error?: string | null;
  onRetry: () => void;
  /** Opens the existing Employee Administration Action Detail. */
  onOpenAction: (actionId: string) => void;
}

/**
 * Read-only employment history of one employee, sourced from the persisted
 * Employee Administration actions. Actions themselves are managed in
 * Employee Administration.
 */
export function EmploymentHistory({
  status,
  actions,
  error,
  onRetry,
  onOpenAction,
}: EmploymentHistoryProps) {
  if (status === 'loading') {
    return <LoadingState label="Loading employment history…" minHeight="sm" />;
  }

  if (status === 'error') {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Employment history could not be loaded">
          {error ?? 'An unexpected error occurred.'}
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        size="compact"
        hideIllustration
        title="No employment activity yet"
        description="Job changes, confirmations, transfers, status changes and separations recorded in Employee Administration will appear here."
      />
    );
  }

  return (
    <Table hoverable aria-label="Employment history">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Action</TableHeaderCell>
          <TableHeaderCell>Previous → New</TableHeaderCell>
          <TableHeaderCell>Effective Date</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {actions.map((action) => (
          <TableRow key={action.id}>
            <TableCell>
              <Button variant="text" size="sm" onClick={() => onOpenAction(action.id)}>
                {actionTypeLabel(action.actionType)}
              </Button>
            </TableCell>
            <TableCell>{summarizeChange(action.changes)}</TableCell>
            <TableCell>{formatDate(action.effectiveDate)}</TableCell>
            <TableCell>
              <Badge variant={actionStatusVariant(action.status)} size="sm">
                {ACTION_STATUS_LABELS[action.status]}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(action.appliedAt ?? action.updatedAt)}</TableCell>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenAction(action.id)}
                aria-label={`View ${actionTypeLabel(action.actionType)}`}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
