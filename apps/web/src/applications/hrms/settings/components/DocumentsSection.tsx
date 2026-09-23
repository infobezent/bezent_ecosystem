import { useState } from 'react';
import {
  Button,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Badge,
  Alert,
  EmptyState,
  Toolbar,
  Actions,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
} from '../types/settings';
import { DocumentModal } from './DocumentModal';

interface DocumentsSectionProps {
  documents: OnboardingDocumentRequirement[];
  onCreateDocument: (payload: CreateOnboardingDocumentRequirementDto) => Promise<void>;
  onUpdateDocument: (id: string, payload: UpdateOnboardingDocumentRequirementDto) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
}

export function DocumentsSection({
  documents,
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument,
}: DocumentsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<OnboardingDocumentRequirement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const openCreateModal = () => {
    setSelectedDoc(null);
    setModalOpen(true);
    setError(null);
  };

  const openEditModal = (doc: OnboardingDocumentRequirement) => {
    setSelectedDoc(doc);
    setModalOpen(true);
    setError(null);
  };

  const handleDelete = async (doc: OnboardingDocumentRequirement) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.name}" requirement?`)) {
      return;
    }

    setDeletingId(doc.id);
    setError(null);
    try {
      await onDeleteDocument(doc.id);
      setSuccess(`Document requirement "${doc.name}" removed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document requirement');
    } finally {
      setDeletingId(null);
    }
  };

  const sortedDocs = [...documents].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <Card padding="lg">
      <Stack gap="lg">
        <Toolbar
          left={
            <div>
              <h2 className="bezent-card__title">Document Requirements</h2>
              <p className="bezent-card__desc">
                Define required proofs, certificates, and compliance forms candidates must submit.
              </p>
            </div>
          }
          right={
            <Button variant="primary" type="button" onClick={openCreateModal}>
              <BezentIcon name="plusSign" size={14} />
              Add Requirement
            </Button>
          }
        />

        {success && <Alert variant="success">{success}</Alert>}

        {error && <Alert variant="danger">{error}</Alert>}

        {sortedDocs.length === 0 ? (
          <EmptyState
            title="No document requirements defined yet."
            description="Add requirements to request mandatory or optional documents during candidate onboarding."
            primaryAction={{ label: 'Add First Document', onClick: openCreateModal }}
          />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Document Type</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Validation Flags</TableHeaderCell>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge variant="neutral">{doc.documentType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <strong>{doc.name}</strong>
                      {doc.description && <p className="bezent-card__desc">{doc.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Inline gap="xs" wrap>
                      {doc.isRequired && (
                        <Badge variant="warning" size="sm">
                          Mandatory
                        </Badge>
                      )}
                      {doc.verificationRequired && (
                        <Badge variant="info" size="sm">
                          Verification
                        </Badge>
                      )}
                      {doc.expiryTracking && (
                        <Badge variant="neutral" size="sm">
                          Expiry Tracked
                        </Badge>
                      )}
                    </Inline>
                  </TableCell>
                  <TableCell>{doc.displayOrder}</TableCell>
                  <TableCell>
                    <Badge status={doc.isActive ? 'active' : 'inactive'} size="sm">
                      {doc.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Actions align="start" gap="xs">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(doc)}
                      >
                        <BezentIcon name="edit" size={13} />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        aria-label={`Delete ${doc.name}`}
                      >
                        <BezentIcon name="delete" size={13} />
                        Delete
                      </Button>
                    </Actions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      <DocumentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        document={selectedDoc}
        onSubmitCreate={onCreateDocument}
        onSubmitUpdate={onUpdateDocument}
      />
    </Card>
  );
}

export default DocumentsSection;
