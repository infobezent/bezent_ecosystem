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
import { EmployeeCartoonAvatar } from '../../../../design-system/components/EmployeeCartoonAvatar';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeDocument } from '../../documents/api/documentsApi';
import { formatDate } from '../../employees/model/employeeModel';
import {
  CATEGORY_LABELS,
  EXPIRY_LABELS,
  STATUS_LABELS,
  statusVariant,
} from '../../documents/model/documentModel';

export interface RecordsTableProps {
  status: 'loading' | 'error' | 'ready';
  documents: EmployeeDocument[];
  error?: string | null;
  filtered?: boolean;
  onRetry: () => void;
  onView: (documentId: string) => void;
  onOpenEmployee: (employeeId: string) => void;
}

/**
 * Workforce → Records Table
 * Displays employee records with document details, category, verification status, and employee linkage.
 */
export function RecordsTable({
  status,
  documents,
  error,
  filtered,
  onRetry,
  onView,
  onOpenEmployee,
}: RecordsTableProps) {
  if (status === 'loading') {
    return <LoadingState label="Loading employee records…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Employee records could not be loaded">
          {error ?? 'An unexpected error occurred while loading records.'}
        </Alert>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        size="compact"
        variant="documents"
        title={filtered ? 'No matching employee records' : 'No employee records yet'}
        description={
          filtered
            ? 'No employee records match the current search or filters. Try clearing them.'
            : 'Employee documents and credentials across the organization will appear here.'
        }
      />
    );
  }

  return (
    <Table hoverable aria-label="Employee records directory">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Record / Document Name</TableHeaderCell>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Department</TableHeaderCell>
          <TableHeaderCell>Uploaded Date</TableHeaderCell>
          <TableHeaderCell>Expiry Date</TableHeaderCell>
          <TableHeaderCell>Verification Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {documents.map((record) => (
          <TableRow key={record.id}>
            {/* Record / Document Name */}
            <TableCell>
              <Inline gap="xs" align="center">
                <BezentIcon
                  name="documents"
                  size={16}
                  color="var(--bezent-text-secondary, #6b7280)"
                />
                <Stack gap="none">
                  <span className="bezent-table-meta-title">{record.documentName}</span>
                  {record.documentNumber ? (
                    <span className="bezent-table-meta-subtitle">Ref: {record.documentNumber}</span>
                  ) : null}
                </Stack>
              </Inline>
            </TableCell>

            {/* Employee Name & ID */}
            <TableCell>
              <Inline gap="sm" align="center">
                <EmployeeCartoonAvatar employeeName={record.employeeName} size="sm" />
                <Stack gap="none">
                  <button
                    type="button"
                    onClick={() => onOpenEmployee(record.employeeId)}
                    className="bezent-table-meta-title"
                    aria-label={`Open profile of ${record.employeeName}`}
                  >
                    {record.employeeName}
                  </button>
                  <span className="bezent-table-meta-subtitle">{record.employeeNumber}</span>
                </Stack>
              </Inline>
            </TableCell>

            {/* Category */}
            <TableCell>{CATEGORY_LABELS[record.category] ?? record.category}</TableCell>

            {/* Department */}
            <TableCell>{record.departmentName ?? '—'}</TableCell>

            {/* Uploaded / Created Date */}
            <TableCell>{formatDate(record.createdAt)}</TableCell>

            {/* Expiry Date */}
            <TableCell>
              {record.expiryDate ? (
                <Inline gap="xs" align="center">
                  <span>{formatDate(record.expiryDate)}</span>
                  {record.expiryState === 'expired' || record.expiryState === 'expiring' ? (
                    <Badge
                      variant={record.expiryState === 'expired' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {EXPIRY_LABELS[record.expiryState]}
                    </Badge>
                  ) : null}
                </Inline>
              ) : (
                '—'
              )}
            </TableCell>

            {/* Verification Status */}
            <TableCell>
              <Badge variant={statusVariant(record.status)} size="sm">
                {STATUS_LABELS[record.status] ?? record.status}
              </Badge>
            </TableCell>

            {/* Actions */}
            <TableCell>
              <Inline gap="xs" align="center">
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => onView(record.id)}
                  aria-label={`View record details for ${record.documentName}`}
                >
                  View
                </Button>
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => onOpenEmployee(record.employeeId)}
                  aria-label={`View employee profile for ${record.employeeName}`}
                >
                  Profile
                </Button>
              </Inline>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
