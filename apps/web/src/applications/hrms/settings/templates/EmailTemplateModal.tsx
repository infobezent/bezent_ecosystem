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
import type { EmailTemplateItem } from './types';

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplateItem | null;
  onSave: (updated: EmailTemplateItem) => void;
}

export function EmailTemplateModal({ isOpen, onClose, template, onSave }: EmailTemplateModalProps) {
  if (!template || !isOpen) return null;

  return (
    <EmailTemplateModalInner
      isOpen={isOpen}
      onClose={onClose}
      template={template}
      onSave={onSave}
    />
  );
}

function EmailTemplateModalInner({
  isOpen,
  onClose,
  template,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplateItem;
  onSave: (updated: EmailTemplateItem) => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [previewMode, setPreviewMode] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onSave({
      ...template,
      subject,
      body,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const handleSendTest = () => {
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const insertTag = (tag: string) => {
    setBody((prev) => prev + ' ' + tag);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Email Template: ${template.name}`}
      size="lg"
      footer={
        <Inline gap="sm" justify="between" align="center" className="w-full">
          <Button variant="secondary" onClick={handleSendTest} type="button">
            <BezentIcon name="mail" size={16} />
            Send Test Preview
          </Button>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} type="button">
              <BezentIcon name="check" size={16} />
              Save Template
            </Button>
          </Inline>
        </Inline>
      }
    >
      <Stack gap="md">
        {testSent && (
          <Alert variant="info" title="Test Email Dispatched">
            Sample test notification with populated dummy values has been sent to your administrator
            email address.
          </Alert>
        )}

        {isSaved && (
          <Alert variant="success" title="Saved Successfully">
            Template updates have been stored and will apply to future system events.
          </Alert>
        )}

        {/* Trigger Event Banner */}
        <div className="bezent-template-meta-strip">
          <div className="bezent-template-meta-item">
            <span className="bezent-template-meta-label">Trigger Event:</span>
            <span className="bezent-template-meta-val">{template.triggerEvent}</span>
          </div>
          <div className="bezent-template-meta-item">
            <span className="bezent-template-meta-label">Category:</span>
            <span className="bezent-template-meta-val bezent-template-meta-tag">
              {template.category}
            </span>
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
            Editor
          </Button>
          <Button
            size="sm"
            variant={previewMode ? 'primary' : 'secondary'}
            onClick={() => setPreviewMode(true)}
            type="button"
          >
            Live Preview
          </Button>
        </Inline>

        {previewMode ? (
          <div className="bezent-email-preview-container">
            <div className="bezent-email-preview-header">
              <div className="bezent-email-preview-field">
                <strong>From:</strong> People &amp; Culture Team &lt;hr-notifications@bezent.com&gt;
              </div>
              <div className="bezent-email-preview-field">
                <strong>Subject:</strong> {subject}
              </div>
            </div>
            <div className="bezent-email-preview-body">
              <div className="bezent-email-preview-card">
                <div className="bezent-email-preview-brand">
                  <span className="bezent-email-brand-text">BEZENT HRMS</span>
                </div>
                <div className="bezent-email-preview-text">
                  <pre className="bezent-email-pre">{body}</pre>
                </div>
                <div className="bezent-email-preview-footer">
                  <p>&copy; 2026 BEZENT Business Ecosystem Zentram. All rights reserved.</p>
                  <p>This is an automated system notification. Please do not reply directly.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Stack gap="md">
            <FormField label="Email Subject Line" required>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject line..."
              />
            </FormField>

            <div>
              <label className="bezent-template-tags-title">
                Available Dynamic Merge Tags (Click to insert):
              </label>
              <div className="bezent-template-tags-list">
                {template.mergeTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="bezent-template-tag-chip"
                    onClick={() => insertTag(tag)}
                    title="Click to insert at cursor"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <FormField label="Email Body (Markdown / Plaintext)" required>
              <Textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Compose template message..."
              />
            </FormField>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
