import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../../../../design-system/components/Button';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  OnboardingDocumentRequirement,
  CreateOnboardingDocumentRequirementDto,
  UpdateOnboardingDocumentRequirementDto,
} from '../types/settings';
import './DocumentModal.css';

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

  if (!isOpen) return null;

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
    <div className="settings-modal-backdrop" role="dialog" aria-modal="true">
      <div className="settings-modal">
        <div className="settings-modal__header">
          <h3 className="settings-modal__title">
            {isEditing ? 'Edit Document Requirement' : 'Add Document Requirement'}
          </h3>
          <button
            type="button"
            className="settings-modal__close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <BezentIcon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-modal__body">
            {errorMessage && (
              <div className="settings-alert settings-alert--error" role="alert">
                <BezentIcon name="warning" size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {!isEditing && (
              <div className="settings-form__row">
                <label htmlFor="doc-type-input" className="settings-form__label">
                  Document Type Key *
                </label>
                <span className="settings-form__hint">
                  Unique lowercase identifier (e.g., id_card, degree_cert, tax_form)
                </span>
                <input
                  id="doc-type-input"
                  type="text"
                  className="settings-form__input"
                  placeholder="e.g. aadhaar_card"
                  value={documentType}
                  pattern="^[a-z0-9_]{2,50}$"
                  title="2-50 lowercase letters, numbers, and underscores"
                  required
                  onChange={(e) => setDocumentType(e.target.value)}
                />
              </div>
            )}

            <div className="settings-form__row">
              <label htmlFor="doc-name-input" className="settings-form__label">
                Document Display Name *
              </label>
              <input
                id="doc-name-input"
                type="text"
                className="settings-form__input"
                placeholder="e.g. Government ID Proof"
                value={name}
                maxLength={100}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="settings-form__row">
              <label htmlFor="doc-desc-input" className="settings-form__label">
                Description / Guidance
              </label>
              <input
                id="doc-desc-input"
                type="text"
                className="settings-form__input"
                placeholder="e.g. Scanned copy of passport or national identity"
                value={description}
                maxLength={255}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="settings-form__row">
              <label htmlFor="doc-order-input" className="settings-form__label">
                Display Order
              </label>
              <input
                id="doc-order-input"
                type="number"
                min={0}
                className="settings-form__input"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>

            <label className="settings-form__row--toggle">
              <div className="settings-form__toggle-info">
                <span className="settings-form__label">Mandatory Submission</span>
                <span className="settings-form__hint">
                  Candidate cannot finish without uploading
                </span>
              </div>
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
            </label>

            <label className="settings-form__row--toggle">
              <div className="settings-form__toggle-info">
                <span className="settings-form__label">HR Verification Required</span>
                <span className="settings-form__hint">HR must approve uploaded document</span>
              </div>
              <input
                type="checkbox"
                checked={verificationRequired}
                onChange={(e) => setVerificationRequired(e.target.checked)}
              />
            </label>

            <label className="settings-form__row--toggle">
              <div className="settings-form__toggle-info">
                <span className="settings-form__label">Track Expiration Date</span>
                <span className="settings-form__hint">Record document validity dates</span>
              </div>
              <input
                type="checkbox"
                checked={expiryTracking}
                onChange={(e) => setExpiryTracking(e.target.checked)}
              />
            </label>

            <label className="settings-form__row--toggle">
              <div className="settings-form__toggle-info">
                <span className="settings-form__label">Active Status</span>
                <span className="settings-form__hint">
                  Document requirement active in onboarding
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </label>
          </div>

          <div className="settings-modal__footer">
            <button
              type="button"
              className="stage-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update Requirement' : 'Create Requirement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
