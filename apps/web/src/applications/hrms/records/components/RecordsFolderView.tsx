import { useMemo } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { EmployeeDocument } from '../../documents/api/documentsApi';
import { formatDate, getAvatarColor, getInitials } from '../../employees/model/employeeModel';
import {
  CATEGORY_LABELS,
  EXPIRY_LABELS,
  STATUS_LABELS,
  statusVariant,
} from '../../documents/model/documentModel';

export interface EmployeeFolder {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string | null;
  documents: EmployeeDocument[];
  verified: number;
  needsReview: number;
  expiryIssues: number;
}

/**
 * Groups documents into one folder per employee, sorted by employee ID
 * (EMP-0002 before EMP-0010).
 */
export function groupDocumentsByEmployee(documents: EmployeeDocument[]): EmployeeFolder[] {
  const map = new Map<string, EmployeeFolder>();
  for (const doc of documents) {
    const key = doc.employeeId || doc.employeeNumber;
    let folder = map.get(key);
    if (!folder) {
      folder = {
        employeeId: doc.employeeId,
        employeeNumber: doc.employeeNumber,
        employeeName: doc.employeeName,
        departmentName: doc.departmentName,
        documents: [],
        verified: 0,
        needsReview: 0,
        expiryIssues: 0,
      };
      map.set(key, folder);
    }
    folder.documents.push(doc);
    if (doc.status === 'verified') folder.verified += 1;
    if (doc.status === 'pending' || doc.status === 'under_review') folder.needsReview += 1;
    if (doc.expiryState === 'expired' || doc.expiryState === 'expiring') folder.expiryIssues += 1;
  }
  return [...map.values()].sort((a, b) =>
    a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true }),
  );
}

export interface RecordsFolderViewProps {
  status: 'loading' | 'error' | 'ready';
  documents: EmployeeDocument[];
  error?: string | null;
  filtered?: boolean;
  openFolderId: string | null;
  onOpenFolder: (employeeId: string | null) => void;
  onRetry: () => void;
  onView: (documentId: string) => void;
  onOpenEmployee: (employeeId: string) => void;
}

export function RecordsFolderView({
  status,
  documents,
  error,
  filtered,
  openFolderId,
  onOpenFolder,
  onRetry,
  onView,
  onOpenEmployee,
}: RecordsFolderViewProps) {
  const folders = useMemo(() => groupDocumentsByEmployee(documents), [documents]);

  if (status === 'loading') {
    return (
      <div
        className="bezent-rec-folder-grid"
        aria-busy="true"
        aria-label="Loading employee folders…"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="bezent-rec-folder bezent-rec-folder--skeleton" />
        ))}
        <span className="bezent-sr-only">Loading employee folders…</span>
      </div>
    );
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

  if (folders.length === 0) {
    return (
      <EmptyState
        size="compact"
        variant="documents"
        title={filtered ? 'No matching employee records' : 'No employee records yet'}
        description={
          filtered
            ? 'No employee records match the current search or filters. Try clearing them.'
            : 'Each employee gets a folder here as soon as a document is added.'
        }
      />
    );
  }

  const openFolder = openFolderId
    ? folders.find((f) => (f.employeeId || f.employeeNumber) === openFolderId)
    : undefined;

  // ── Inside one employee's folder ───────────────────────────────────────────
  if (openFolder) {
    return (
      <div className="bezent-rec-open" aria-label={`Documents of ${openFolder.employeeName}`}>
        <div className="bezent-rec-open__bar">
          <nav className="bezent-rec-crumbs" aria-label="Folder path">
            <button
              type="button"
              className="bezent-rec-crumbs__link"
              onClick={() => onOpenFolder(null)}
            >
              All folders
            </button>
            <BezentIcon name="chevron_right" size={14} />
            <span className="bezent-rec-crumbs__current">
              {openFolder.employeeNumber} · {openFolder.employeeName}
            </span>
          </nav>
          <Inline gap="xs" align="center">
            <span className="bezent-records-badge">
              {openFolder.documents.length}{' '}
              {openFolder.documents.length === 1 ? 'document' : 'documents'}
            </span>
            <Button
              variant="outline"
              size="sm"
              shape="rounded"
              onClick={() => onOpenEmployee(openFolder.employeeId)}
            >
              Open profile
            </Button>
          </Inline>
        </div>

        <Table hoverable aria-label={`Documents of ${openFolder.employeeName}`}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Document</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Uploaded</TableHeaderCell>
              <TableHeaderCell>Expiry</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {openFolder.documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="bezent-table-cell--avatar-meta">
                    <Avatar
                      icon={<BezentIcon name="documents" size={16} />}
                      size="sm"
                      color="default"
                      alt={doc.documentName}
                    />
                    <div className="bezent-table-meta-group">
                      <button
                        type="button"
                        className="bezent-table-meta-title"
                        onClick={() => onView(doc.id)}
                        aria-label={`View document ${doc.documentName}`}
                      >
                        {doc.documentName}
                      </button>
                      {doc.documentNumber ? (
                        <span className="bezent-table-meta-subtitle font-mono">
                          Ref: {doc.documentNumber}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{CATEGORY_LABELS[doc.category] ?? doc.category}</TableCell>
                <TableCell>{formatDate(doc.createdAt)}</TableCell>
                <TableCell>
                  {doc.expiryDate ? (
                    <Inline gap="xs" align="center">
                      <span>{formatDate(doc.expiryDate)}</span>
                      {doc.expiryState === 'expired' || doc.expiryState === 'expiring' ? (
                        <Badge
                          variant={doc.expiryState === 'expired' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {EXPIRY_LABELS[doc.expiryState]}
                        </Badge>
                      ) : null}
                    </Inline>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`bezent-status-pill bezent-status-pill--${statusVariant(doc.status)}`}
                  >
                    <span className="bezent-status-pill__dot" aria-hidden="true" />
                    <span>{STATUS_LABELS[doc.status] ?? doc.status}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => onView(doc.id)}
                    aria-label={`View record details for ${doc.documentName}`}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Folder grid: one folder per employee, in employee ID order ────────────
  return (
    <div className="bezent-rec-folder-grid" role="list" aria-label="Employee record folders">
      {folders.map((folder) => {
        const key = folder.employeeId || folder.employeeNumber;
        return (
          <button
            key={key}
            type="button"
            role="listitem"
            className="bezent-rec-folder"
            onClick={() => onOpenFolder(key)}
            aria-label={`Open folder ${folder.employeeNumber} ${folder.employeeName}, ${folder.documents.length} documents`}
          >
            <span className="bezent-rec-folder__icon" aria-hidden="true">
              <BezentIcon name="folder" size={26} />
            </span>
            <span className="bezent-rec-folder__text">
              <span className="bezent-rec-folder__id">{folder.employeeNumber}</span>
              <span className="bezent-rec-folder__name" title={folder.employeeName}>
                {folder.employeeName}
              </span>
              <span className="bezent-rec-folder__meta">
                {folder.departmentName ?? 'No department'} · {folder.documents.length}{' '}
                {folder.documents.length === 1 ? 'document' : 'documents'}
              </span>
            </span>
            <span className="bezent-rec-folder__chips">
              {folder.verified > 0 && (
                <span className="bezent-status-pill bezent-status-pill--success">
                  <span className="bezent-status-pill__dot" aria-hidden="true" />
                  {folder.verified} verified
                </span>
              )}
              {folder.needsReview > 0 && (
                <span className="bezent-status-pill bezent-status-pill--info">
                  <span className="bezent-status-pill__dot" aria-hidden="true" />
                  {folder.needsReview} in review
                </span>
              )}
              {folder.expiryIssues > 0 && (
                <span className="bezent-status-pill bezent-status-pill--warning">
                  <span className="bezent-status-pill__dot" aria-hidden="true" />
                  {folder.expiryIssues} expiring
                </span>
              )}
            </span>
            <span className="bezent-rec-folder__avatar" aria-hidden="true">
              <Avatar
                initials={getInitials(folder.employeeName)}
                color={getAvatarColor(folder.employeeId || folder.employeeNumber)}
                size="sm"
                alt={folder.employeeName}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
