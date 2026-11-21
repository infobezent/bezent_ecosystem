import React, { useState } from 'react';
import {
  Modal,
  Button,
  Input,
  Textarea,
  FormField,
  Inline,
  Stack,
  Alert,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { LetterFormatItem } from './types';

interface LetterFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: LetterFormatItem | null;
  onSave: (updated: LetterFormatItem) => void;
}

export function LetterFormatModal({ isOpen, onClose, letter, onSave }: LetterFormatModalProps) {
  if (!letter || !isOpen) return null;

  return (
    <LetterFormatModalInner isOpen={isOpen} onClose={onClose} letter={letter} onSave={onSave} />
  );
}

function LetterFormatModalInner({
  isOpen,
  onClose,
  letter,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  letter: LetterFormatItem;
  onSave: (updated: LetterFormatItem) => void;
}) {
  const [name, setName] = useState(letter.name);
  const [referencePattern, setReferencePattern] = useState(letter.referencePattern);
  const [authorizerRole, setAuthorizerRole] = useState(letter.authorizerRole);
  const [bodyContent, setBodyContent] = useState(letter.bodyContent);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleSave = () => {
    onSave({
      ...letter,
      name,
      referencePattern,
      authorizerRole,
      bodyContent,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 400);
  };

  const insertTag = (tag: string) => {
    setBodyContent((prev) => prev + ' ' + tag);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official Letter Format: ${letter.name}`}
      size="lg"
      footer={
        <Inline gap="sm" justify="between" align="center" className="w-full">
          <Button variant="secondary" onClick={handlePrint} type="button" disabled={isPrinting}>
            <BezentIcon name="documents" size={16} />
            {isPrinting ? 'Preparing PDF…' : 'Print / Download PDF'}
          </Button>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} type="button">
              <BezentIcon name="check" size={16} />
              Save Letter Format
            </Button>
          </Inline>
        </Inline>
      }
    >
      <Stack gap="md">
        {isSaved && (
          <Alert variant="success" title="Letter Format Saved">
            Official document structure and placeholder bindings have been saved successfully.
          </Alert>
        )}

        {/* Top Meta info */}
        <div className="bezent-template-meta-strip">
          <div className="bezent-template-meta-item">
            <span className="bezent-template-meta-label">Document Type:</span>
            <span className="bezent-template-meta-val bezent-template-meta-tag">{letter.type}</span>
          </div>
          <div className="bezent-template-meta-item">
            <span className="bezent-template-meta-label">Authorizing Signatory:</span>
            <span className="bezent-template-meta-val">{authorizerRole}</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <Inline gap="xs" justify="end">
          <Button
            size="sm"
            variant={!previewMode ? 'primary' : 'secondary'}
            onClick={() => setPreviewMode(false)}
            type="button"
          >
            Format Editor
          </Button>
          <Button
            size="sm"
            variant={previewMode ? 'primary' : 'secondary'}
            onClick={() => setPreviewMode(true)}
            type="button"
          >
            Letterhead Preview
          </Button>
        </Inline>

        {previewMode ? (
          <div className="bezent-letter-preview-sheet">
            {/* Corporate Letterhead */}
            <div className="bezent-letter-head">
              <div className="bezent-letter-head__brand">
                <h2 className="bezent-letter-head__company">BEZENT DEMO PRIVATE LIMITED</h2>
                <p className="bezent-letter-head__address">
                  Zentram Towers, Tech Corridor, OMR, Chennai, Tamil Nadu - 600096, India
                </p>
                <p className="bezent-letter-head__cin">
                  CIN: U72900TN2026PTC104523 | contact@bezent.com
                </p>
              </div>
            </div>

            <div className="bezent-letter-divider" />

            {/* Letter Content Preview */}
            <div className="bezent-letter-body">
              <pre className="bezent-letter-pre">{bodyContent}</pre>
            </div>

            {/* Formal Seal & Signatory Block */}
            <div className="bezent-letter-signature-block">
              <div className="bezent-letter-seal">
                <span className="bezent-letter-seal-circle">OFFICIAL CORPORATE SEAL</span>
              </div>
              <div className="bezent-letter-signature-line">
                <p className="bezent-letter-signatory-name">Authorized Signatory</p>
                <p className="bezent-letter-signatory-title">{authorizerRole}</p>
                <p className="bezent-letter-signatory-company">BEZENT Demo Pvt Ltd</p>
              </div>
            </div>
          </div>
        ) : (
          <Stack gap="md">
            <Inline gap="md" className="w-full">
              <div className="w-half">
                <FormField label="Letter Title / Identifier" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter letter title..."
                  />
                </FormField>
              </div>
              <div className="w-half">
                <FormField label="Reference Number Format" required>
                  <Input
                    value={referencePattern}
                    onChange={(e) => setReferencePattern(e.target.value)}
                    placeholder="e.g., REF: BEZ/OFF/{{year}}/{{seq}}"
                  />
                </FormField>
              </div>
            </Inline>

            <FormField label="Authorized Signatory Title" required>
              <Input
                value={authorizerRole}
                onChange={(e) => setAuthorizerRole(e.target.value)}
                placeholder="e.g. Managing Director & Chief Human Resources Officer"
              />
            </FormField>

            <div>
              <label className="bezent-template-tags-title">
                Available Document Placeholders (Click to insert):
              </label>
              <div className="bezent-template-tags-list">
                {letter.mergeTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="bezent-template-tag-chip bezent-template-tag-chip--purple"
                    onClick={() => insertTag(tag)}
                    title="Click to insert at cursor"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <FormField label="Official Letter Text & Clauses" required>
              <Textarea
                rows={12}
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                placeholder="Enter formal letter text..."
              />
            </FormField>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
