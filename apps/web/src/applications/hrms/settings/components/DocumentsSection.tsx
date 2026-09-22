import { useState } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
} from '../types/settings';
import { DocumentModal } from './DocumentModal';
import './DocumentsSection.css';

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
    <div className="settings-card">
      <div className="settings-card__header">
        <div className="docs-toolbar">
          <div>
            <h2 className="settings-card__title">Document Requirements</h2>
            <p className="settings-card__subtitle">
              Define required proofs, certificates, and compliance forms candidates must submit.
            </p>
          </div>
          <Button variant="primary" type="button" onClick={openCreateModal}>
            <BezentIcon name="plusSign" size={14} />
            Add Requirement
          </Button>
        </div>
      </div>

      {success && (
        <div className="settings-alert settings-alert--success" role="alert">
          <BezentIcon name="check" size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="settings-alert settings-alert--error" role="alert">
          <BezentIcon name="warning" size={16} />
          <span>{error}</span>
        </div>
      )}

      {sortedDocs.length === 0 ? (
        <div className="docs-empty">
          <BezentIcon name="documents" size={36} />
          <span>No document requirements defined yet.</span>
          <Button variant="primary" type="button" onClick={openCreateModal}>
            Add First Document
          </Button>
        </div>
      ) : (
        <div className="fields-table-container">
          <table className="fields-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Name</th>
                <th>Validation Flags</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span className="fields-key">{doc.documentType}</span>
                  </td>
                  <td>
                    <div>
                      <strong>{doc.name}</strong>
                      {doc.description && <p className="stage-item__desc">{doc.description}</p>}
                    </div>
                  </td>
                  <td>
                    <div className="docs-badge-cell">
                      {doc.isRequired && (
                        <span className="stage-pill stage-pill--required">Mandatory</span>
                      )}
                      {doc.verificationRequired && (
                        <span className="stage-pill stage-pill--protected">Verification</span>
                      )}
                      {doc.expiryTracking && (
                        <span className="stage-pill stage-pill--optional">Expiry Tracked</span>
                      )}
                    </div>
                  </td>
                  <td>{doc.displayOrder}</td>
                  <td>
                    <span
                      className={`stage-pill ${
                        doc.isActive ? 'stage-pill--protected' : 'stage-pill--optional'
                      }`}
                    >
                      {doc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="stage-item__actions">
                      <button
                        type="button"
                        className="stage-btn-secondary"
                        onClick={() => openEditModal(doc)}
                      >
                        <BezentIcon name="edit" size={13} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="stage-btn-secondary btn-danger-icon"
                        onClick={() => handleDelete(doc)}
                        disabled={deletingId === doc.id}
                        aria-label={`Delete ${doc.name}`}
                      >
                        <BezentIcon name="delete" size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        document={selectedDoc}
        onSubmitCreate={onCreateDocument}
        onSubmitUpdate={onUpdateDocument}
      />
    </div>
  );
}
