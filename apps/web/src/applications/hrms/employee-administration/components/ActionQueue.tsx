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
import type { EmployeeActionListItem } from '../api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  actionStatusVariant,
  actionTypeLabel,
  formatDate,
  summarizeChange,
} from '../model/actionCatalog';

export type LoadStatus = 'loading' | 'error' | 'ready';

export interface ActionQueueProps {
  status: LoadStatus;
  items: EmployeeActionListItem[];
  error?: string | null;
  /** True when a search/filter narrowed the queue — changes the empty-state copy. */
  filtered?: boolean;
  onRetry: () => void;
  /** Opens the Employee Action Detail. */
  onOpen: (actionId: string) => void;
  /** Navigates to the canonical Employee Profile. */
  onOpenEmployee: (employeeId: string) => void;
  onCreate?: () => void;
}

/** Operational queue of employee actions. */
export function ActionQueue({
  status,
  items,
  error,
  filtered,
  onRetry,
  onOpen,
  onOpenEmployee,
  onCreate,
}: ActionQueueProps) {
  if (status === 'loading') {
    return <LoadingState label="Loading employee actions…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Employee actions could not be loaded">
          {error ?? 'An unexpected error occurred.'}
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        size="compact"
        title={filtered ? 'No matching employee actions' : 'No employee actions yet.'}
        description={
          filtered
            ? 'No employee actions match the current view. Try another tab or clear the search.'
            : 'Job changes, confirmations, transfers, status changes and separations will appear here once they are requested.'
        }
        primaryAction={
          !filtered && onCreate ? { label: 'New Employee Action', onClick: onCreate } : undefined
        }
      />
    );
  }

  return (
    <Table hoverable aria-label="Employee actions">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Employee ID</TableHeaderCell>
          <TableHeaderCell>Action Type</TableHeaderCell>
          <TableHeaderCell>Current → New</TableHeaderCell>
          <TableHeaderCell>Effective Date</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Requested By</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((action) => (
          <TableRow key={action.id}>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(action.employeeId)}
                aria-label={`Open profile of ${action.employeeName}`}
              >
                {action.employeeName}
              </Button>
            </TableCell>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(action.employeeId)}
                aria-label={`Open profile of employee ${action.employeeNumber}`}
              >
                {action.employeeNumber}
              </Button>
            </TableCell>
            <TableCell>
              <Button variant="text" size="sm" onClick={() => onOpen(action.id)}>
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
            <TableCell>{action.requestedBy ?? '—'}</TableCell>
            <TableCell>{formatDate(action.updatedAt)}</TableCell>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpen(action.id)}
                aria-label={`View ${actionTypeLabel(action.actionType)} for ${action.employeeName}`}
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
