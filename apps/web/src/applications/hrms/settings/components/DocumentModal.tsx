import { useState, useEffect, type FormEvent } from 'react';
import {
  Button,
  Modal,
  Input,
  Switch,
  Alert,
  Stack,
  Actions,
} from '../../../../design-system/components';
import type {
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
} from '../types/settings';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: OnboardingDocumentRequirement | null;
  onSubmitCreate: (payload: CreateOnboardingDocumentRequirementDto) => Promise<void>;
  onSubmitUpdate: (id: string, payload: UpdateOnboardingDocumentRequirementDto) => Promise<void>;
}

export function DocumentModal({
  isOpen,
  onClose,
  document,
  onSubmitCreate,
  onSubmitUpdate,
}: DocumentModalProps) {
  const isEditing = Boolean(document);
  const [documentType, setDocumentType] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [verificationRequired, setVerificationRequired] = useState(true);
  const [expiryTracking, setExpiryTracking] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setDocumentType(document.documentType);
      setName(document.name);
      setDescription(document.description || '');
      setIsRequired(document.isRequired);
      setVerificationRequired(document.verificationRequired);
      setExpiryTracking(document.expiryTracking);
      setDisplayOrder(document.displayOrder);
      setIsActive(document.isActive);
    } else {
      setDocumentType('');
      setName('');
      setDescription('');
      setIsRequired(true);
      setVerificationRequired(true);
      setExpiryTracking(false);
      setDisplayOrder(0);
      setIsActive(true);
    }
    setErrorMessage(null);
  }, [document, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Document name is required');
      return;
    }

    if (!isEditing && !documentType.trim()) {
      setErrorMessage('Document type code is required');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && document) {
        await onSubmitUpdate(document.id, {
          name: name.trim(),
          description: description.trim() || null,
          isRequired,
          verificationRequired,
          expiryTracking,
          displayOrder,
          isActive,
        });
      } else {
        await onSubmitCreate({
          documentType: documentType.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim() || null,
          isRequired,
          verificationRequired,
          expiryTracking,
          displayOrder,
          isActive,
        });
      }
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save document requirement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Document Requirement' : 'Add Document Requirement'}
      footer={
        <Actions align="end" gap="sm">
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting} form="document-modal-form">
            {submitting ? 'Saving...' : isEditing ? 'Update Requirement' : 'Create Requirement'}
          </Button>
        </Actions>
      }
    >
      <form id="document-modal-form" onSubmit={handleSubmit}>
        <Stack gap="md">
          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

          {!isEditing && (
            <Input
              id="doc-type-input"
              label="Document Type Key *"
              helperText="Unique lowercase identifier (e.g., id_card, degree_cert, tax_form)"
              placeholder="e.g. aadhaar_card"
              value={documentType}
              pattern="^[a-z0-9_]{2,50}$"
              title="2-50 lowercase letters, numbers, and underscores"
              required
              onChange={(e) => setDocumentType(e.target.value)}
            />
          )}

          <Input
            id="doc-name-input"
            label="Document Display Name *"
            placeholder="e.g. Government ID Proof"
            value={name}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            id="doc-desc-input"
            label="Description / Guidance"
            placeholder="e.g. Scanned copy of passport or national identity"
            value={description}
            maxLength={255}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            id="doc-order-input"
            label="Display Order"
            type="number"
            min={0}
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
          />

          <Switch
            id="doc-required-switch"
            label="Mandatory Submission"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />

          <Switch
            id="doc-verify-switch"
            label="HR Verification Required"
            checked={verificationRequired}
            onChange={(e) => setVerificationRequired(e.target.checked)}
          />

          <Switch
            id="doc-expiry-switch"
            label="Track Expiration Date"
            checked={expiryTracking}
            onChange={(e) => setExpiryTracking(e.target.checked)}
          />

          <Switch
            id="doc-active-switch"
            label="Active Status"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </Stack>
      </form>
    </Modal>
  );
}

export default DocumentModal;
