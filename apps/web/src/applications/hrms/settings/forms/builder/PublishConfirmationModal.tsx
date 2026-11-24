import React from 'react';
import { Alert, Button, Inline, Modal, Stack } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';

export interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentVersion: number;
  newVersion: number;
  isPublishing: boolean;
  formName: string;
  /** Unsaved builder edits exist; publishing will save them first. */
  hasUnsavedChanges?: boolean;
}

export function PublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  currentVersion,
  newVersion,
  isPublishing,
  formName,
  hasUnsavedChanges,
}: PublishConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish Form & Create Immutable Version"
      size="md"
    >
      <Stack gap="md">
        <div className="bezent-cif-publish-modal__hero">
          <div className="bezent-cif-publish-modal__icon" aria-hidden="true">
            <BezentIcon name="check" size={28} />
          </div>
          <div className="bezent-cif-publish-modal__info">
            <h3 className="bezent-cif-publish-modal__title">
              Publish &ldquo;{formName}&rdquo; Version {newVersion}.0
            </h3>
            <p className="bezent-cif-publish-modal__desc">
              You are publishing a new version of this form.
            </p>
          </div>
        </div>

        <div className="bezent-cif-publish-modal__version-flow">
          <div className="bezent-cif-publish-modal__version-box">
            <span className="bezent-cif-publish-modal__version-label">Current Version</span>
            <span className="bezent-cif-publish-modal__version-value">v{currentVersion}.0</span>
          </div>
          <div className="bezent-cif-publish-modal__version-arrow">
            <BezentIcon name="arrowRight" size={18} />
          </div>
          <div className="bezent-cif-publish-modal__version-box bezent-cif-publish-modal__version-box--target">
            <span className="bezent-cif-publish-modal__version-label">New Published Version</span>
            <span className="bezent-cif-publish-modal__version-value">v{newVersion}.0</span>
          </div>
        </div>

        <Alert variant="info" title="Immutable Version Guarantee">
          <Stack gap="xs">
            <span>• Existing submissions will permanently retain version {currentVersion}.0.</span>
            <span>• All new submissions will immediately use version {newVersion}.0.</span>
            <span>• Your changes will be persisted to the immutable version audit log.</span>
          </Stack>
        </Alert>

        {hasUnsavedChanges && (
          <Alert variant="warning" title="Unsaved Changes">
            You have unsaved edits in the builder. Publishing will save them first, then include
            them in version {newVersion}.0.
          </Alert>
        )}

        <Inline gap="sm" justify="end">
          <Button variant="secondary" type="button" disabled={isPublishing} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            disabled={isPublishing}
            onClick={onConfirm}
            leftIcon={<BezentIcon name="check" size={14} />}
          >
            {isPublishing
              ? hasUnsavedChanges
                ? 'Saving & Publishing...'
                : 'Publishing Version...'
              : `Publish Version ${newVersion}.0`}
          </Button>
        </Inline>
      </Stack>
    </Modal>
  );
}

export default PublishConfirmationModal;
