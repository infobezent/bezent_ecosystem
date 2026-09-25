import { useEffect, useState } from 'react';
import {
  Actions,
  Alert,
  Badge,
  Button,
  Grid,
  LoadingState,
  Modal,
  Stack,
} from '../../../../design-system/components';
import { fetchDocument, type EmployeeDocument } from '../api/documentsApi';
import { formatDate } from '../../employees/model/employeeModel';
import { DetailItem } from '../../employees/components/DetailItem';
import {
  CATEGORY_LABELS,
  EXPIRY_LABELS,
  STATUS_LABELS,
  statusVariant,
} from '../model/documentModel';

/** Read-only document metadata. No preview/download: no stored file exists yet. */
export function DocumentDetail({ document }: { document: EmployeeDocument }) {
  return (
    <Stack gap="lg">
      {!document.fileAvailable && (
        <Alert variant="info" title="No file stored">
          Document file storage is not available yet. This record holds the document details and
          verification status only.
        </Alert>
      )}
      <Grid columns={2} gap="md">
        <DetailItem label="Employee">{`${document.employeeName} (${document.employeeNumber})`}</DetailItem>
        <DetailItem label="Department">{document.departmentName ?? '—'}</DetailItem>
        <DetailItem label="Document">{document.documentName}</DetailItem>
        <DetailItem label="Category">{CATEGORY_LABELS[document.category]}</DetailItem>
        <DetailItem label="Document Number">{document.documentNumber ?? '—'}</DetailItem>
        <DetailItem label="Status">
          <Badge variant={statusVariant(document.status)} size="sm">
            {STATUS_LABELS[document.status]}
          </Badge>
        </DetailItem>
        <DetailItem label="Expiry Date">
          {document.expiryDate ? formatDate(document.expiryDate) : 'No expiry'}
          {document.expiryState === 'expired' || document.expiryState === 'expiring'
            ? ` · ${EXPIRY_LABELS[document.expiryState]}`
            : ''}
        </DetailItem>
        <DetailItem label="Last Updated">{formatDate(document.updatedAt)}</DetailItem>
      </Grid>
      {document.verificationRemarks && (
        <DetailItem label="Verification Remarks">{document.verificationRemarks}</DetailItem>
      )}
    </Stack>
  );
}

export interface DocumentDetailModalProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentDetailModal({ documentId, onClose }: DocumentDetailModalProps) {
  const [document, setDocument] = useState<EmployeeDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    let active = true;
    setDocument(null);
    setError(null);
    fetchDocument(documentId)
      .then((data) => active && setDocument(data))
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load document');
      });
    return () => {
      active = false;
    };
  }, [documentId]);

  return (
    <Modal
      isOpen={documentId !== null}
      onClose={onClose}
      size="lg"
      title={document ? document.documentName : 'Document'}
      footer={
        <Actions align="end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Actions>
      }
    >
      {error ? (
        <Alert variant="error" title="The document could not be loaded">
          {error}
        </Alert>
      ) : document ? (
        <DocumentDetail document={document} />
      ) : (
        <LoadingState label="Loading document…" minHeight="sm" />
      )}
    </Modal>
  );
}
