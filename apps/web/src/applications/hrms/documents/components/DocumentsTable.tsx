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
import type { EmployeeDocument } from '../api/documentsApi';
import { formatDate } from '../../employees/model/employeeModel';
import {
  CATEGORY_LABELS,
  EXPIRY_LABELS,
  STATUS_LABELS,
  statusVariant,
} from '../model/documentModel';

export interface DocumentsTableProps {
  status: 'loading' | 'error' | 'ready';
  documents: EmployeeDocument[];
  error?: string | null;
  /** True when search, filters or a non-default view narrowed the list. */
  filtered?: boolean;
  onRetry: () => void;
  onView: (documentId: string) => void;
  onOpenEmployee: (employeeId: string) => void;
}

/** Operational list of employee documents (metadata only). */
export function DocumentsTable({
  status,
  documents,
  error,
  filtered,
  onRetry,
  onView,
  onOpenEmployee,
}: DocumentsTableProps) {
  if (status === 'loading') {
    return <LoadingState label="Loading documents…" minHeight="md" />;
  }

  if (status === 'error') {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Documents could not be loaded">
          {error ?? 'An unexpected error occurred.'}
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
        title={filtered ? 'No matching documents' : 'No employee documents yet'}
        description={
          filtered
            ? 'No documents match the current view, search or filters. Try clearing them.'
            : 'Employee documents collected across the employee lifecycle will appear here.'
        }
      />
    );
  }

  return (
    <Table hoverable aria-label="Employee documents">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Employee</TableHeaderCell>
          <TableHeaderCell>Document</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Department</TableHeaderCell>
          <TableHeaderCell>Expiry</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {documents.map((document) => (
          <TableRow key={document.id}>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onOpenEmployee(document.employeeId)}
                aria-label={`Open profile of ${document.employeeName}`}
              >
                {document.employeeName}
              </Button>
            </TableCell>
            <TableCell>{document.documentName}</TableCell>
            <TableCell>{CATEGORY_LABELS[document.category]}</TableCell>
            <TableCell>{document.departmentName ?? '—'}</TableCell>
            <TableCell>
              {document.expiryDate ? (
                <Inline gap="xs" align="center">
                  <span>{formatDate(document.expiryDate)}</span>
                  {document.expiryState === 'expired' || document.expiryState === 'expiring' ? (
                    <Badge
                      variant={document.expiryState === 'expired' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {EXPIRY_LABELS[document.expiryState]}
                    </Badge>
                  ) : null}
                </Inline>
              ) : (
                '—'
              )}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(document.status)} size="sm">
                {STATUS_LABELS[document.status]}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(document.updatedAt)}</TableCell>
            <TableCell>
              <Button
                variant="text"
                size="sm"
                onClick={() => onView(document.id)}
                aria-label={`View ${document.documentName} for ${document.employeeName}`}
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
