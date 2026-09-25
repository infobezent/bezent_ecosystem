import {
  Alert,
  Badge,
  Button,
  Grid,
  Section,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeActionDetail as EmployeeActionDetailData } from '../api/employeeAdministrationApi';
import {
  ACTION_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  FIELD_LABELS,
  actionStatusVariant,
  actionTypeLabel,
  changeValueLabel,
  employmentStatusVariant,
  formatDate,
} from '../model/actionCatalog';
import { DetailItem } from '../../employees/components/DetailItem';

const HISTORY_EVENT_LABELS: Record<EmployeeActionDetailData['history'][number]['event'], string> = {
  created: 'Action created',
  updated: 'Action updated',
  applied: 'Action applied',
  cancelled: 'Action cancelled',
};

export interface EmployeeActionDetailProps {
  action: EmployeeActionDetailData;
  /** Today's date (YYYY-MM-DD), to explain when a pending action can be applied. */
  today: string;
  /** Navigates to the canonical Employee Profile. */
  onOpenEmployee?: (employeeId: string) => void;
}

/** Read-only detail of one employee action: employee, change, status, and history. */
export function EmployeeActionDetail({ action, today, onOpenEmployee }: EmployeeActionDetailProps) {
  const { employee } = action;
  const isSeparation = action.category === 'separation';

  return (
    <Stack gap="lg">
      {action.status === 'pending' && action.effectiveDate > today && (
        <Alert variant="info" title="Scheduled">
          This action becomes effective on {formatDate(action.effectiveDate)} and can be applied
          from that date.
        </Alert>
      )}

      <Section title="Employee" variant="plain">
        <Grid columns={3} gap="md">
          <DetailItem label="Employee">
            {onOpenEmployee ? (
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(employee.id)}
                aria-label={`Open profile of ${employee.fullName}`}
              >
                {employee.fullName}
              </Button>
            ) : (
              employee.fullName
            )}
          </DetailItem>
          <DetailItem label="Employee ID">{employee.employeeNumber}</DetailItem>
          <DetailItem label="Employment Status">
            <Badge variant={employmentStatusVariant(employee.employmentStatus)} size="sm">
              {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]}
            </Badge>
          </DetailItem>
          <DetailItem label="Department">{employee.departmentName ?? 'Not set'}</DetailItem>
          <DetailItem label="Designation">{employee.designationName ?? 'Not set'}</DetailItem>
          <DetailItem label="Location">{employee.locationName ?? 'Not set'}</DetailItem>
        </Grid>
      </Section>

      <Section title={`Change · ${actionTypeLabel(action.actionType)}`} variant="plain">
        <Table compact aria-label="Requested change">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Field</TableHeaderCell>
              <TableHeaderCell>Current Value</TableHeaderCell>
              <TableHeaderCell aria-label="changes to" />
              <TableHeaderCell>New Value</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {action.changes.map((change) => (
              <TableRow key={change.field}>
                <TableCell>{FIELD_LABELS[change.field]}</TableCell>
                <TableCell>{changeValueLabel(change, 'from')}</TableCell>
                <TableCell aria-hidden="true">
                  <BezentIcon name="arrowRight" size={14} />
                </TableCell>
                <TableCell>{changeValueLabel(change, 'to')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Request" variant="plain">
        <Grid columns={3} gap="md">
          <DetailItem label="Status">
            <Badge variant={actionStatusVariant(action.status)} size="sm">
              {ACTION_STATUS_LABELS[action.status]}
            </Badge>
          </DetailItem>
          <DetailItem label="Effective Date">{formatDate(action.effectiveDate)}</DetailItem>
          {isSeparation && (
            <DetailItem
              label={action.actionType === 'resignation' ? 'Resignation Date' : 'Notice Date'}
            >
              {formatDate(action.requestDate)}
            </DetailItem>
          )}
          <DetailItem label="Requested By">{action.requestedBy ?? 'Not recorded'}</DetailItem>
          <DetailItem label="Requested On">{formatDate(action.createdAt)}</DetailItem>
          {action.appliedAt && (
            <DetailItem label="Applied On">{formatDate(action.appliedAt)}</DetailItem>
          )}
          {action.cancelledAt && (
            <DetailItem label="Cancelled On">{formatDate(action.cancelledAt)}</DetailItem>
          )}
        </Grid>
        <Stack gap="md">
          <DetailItem label="Reason">{action.reason}</DetailItem>
          {action.cancellationReason && (
            <DetailItem label="Cancellation Reason">{action.cancellationReason}</DetailItem>
          )}
        </Stack>
      </Section>

      <Section title="History" variant="plain">
        <Table compact aria-label="Action history">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Event</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>Notes</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {action.history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{HISTORY_EVENT_LABELS[entry.event]}</TableCell>
                <TableCell>
                  {entry.fromStatus && entry.fromStatus !== entry.toStatus
                    ? `${entry.fromStatus} → ${entry.toStatus}`
                    : entry.toStatus}
                </TableCell>
                <TableCell>{entry.actor ?? 'Not recorded'}</TableCell>
                <TableCell>{formatDate(entry.createdAt)}</TableCell>
                <TableCell>{entry.notes ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </Stack>
  );
}
