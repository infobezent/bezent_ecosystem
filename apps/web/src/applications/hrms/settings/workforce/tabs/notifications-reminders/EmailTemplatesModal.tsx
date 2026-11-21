import React, { useState, useRef } from 'react';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Input } from '../../../../../../design-system/components/Input/Input';
import { Textarea } from '../../../../../../design-system/components/Input/Textarea';
import { Select } from '../../../../../../design-system/components/Select/Select';
import { Switch } from '../../../../../../design-system/components/Switch/Switch';
import { Stack } from '../../../../../../design-system/components/Stack/Stack';
import { Inline } from '../../../../../../design-system/components/Inline/Inline';
import { Badge } from '../../../../../../design-system/components/Badge/Badge';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import { BezentIcon } from '../../../../../../design-system/icons';
import type { EmailTemplate } from '../../../types/notificationSettings.types';
import {
  previewEmailTemplate,
  sendTestEmail,
} from '../../../api/notificationSettingsApi';

interface EmailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: EmailTemplate[];
  onCreateTemplate: (tpl: Partial<EmailTemplate>) => Promise<EmailTemplate>;
  onUpdateTemplate: (id: string, tpl: Partial<EmailTemplate>) => Promise<EmailTemplate>;
  onDuplicateTemplate: (id: string) => Promise<EmailTemplate>;
  onDeleteTemplate: (id: string) => Promise<void>;
  initialEditTemplateId?: string | null;
}

const MERGE_FIELDS_DATA: Record<string, { label: string; tag: string }[]> = {
  Candidate: [
    { label: 'Candidate Name', tag: '{{candidate_name}}' },
    { label: 'Candidate Email', tag: '{{candidate_email}}' },
    { label: 'First Name', tag: '${First_Name}' },
    { label: 'Position / Designation', tag: '{{position_name}}' },
    { label: 'Joining Date', tag: '{{joining_date}}' },
    { label: 'Employee Name', tag: '{{employee_name}}' },
  ],
  Company: [
    { label: 'Company Name', tag: '{{company_name}}' },
    { label: 'Company Domain', tag: '{{company_domain}}' },
    { label: 'HR Support Email', tag: '{{hr_email}}' },
  ],
  Onboarding: [
    { label: 'Intake Portal Link', tag: '{{registration_link}}' },
    { label: 'Document Name', tag: '{{document_name}}' },
    { label: 'Stage Name', tag: '{{stage_name}}' },
  ],
  System: [
    { label: 'Person Performing Action', tag: '${Person performing this action}' },
    { label: 'Current Date', tag: '{{current_date}}' },
  ],
};

function formatEventLabel(eventKey: string): string {
  if (!eventKey) return '';
  return eventKey
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function EmailTemplatesModal({
  isOpen,
  onClose,
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  initialEditTemplateId,
}: EmailTemplatesModalProps) {
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    initialEditTemplateId || null,
  );
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states (Zoho-style structured fields)
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplCategory, setTplCategory] = useState('Invitation');
  const [tplEvent, setTplEvent] = useState('candidate_invited');
  const [tplFrom, setTplFrom] = useState('Person performing this action');
  const [tplTo, setTplTo] = useState('Email ID');
  const [tplReplyTo, setTplReplyTo] = useState('');
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplActive, setTplActive] = useState(true);
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  // Zoho Merge Fields & Rich Text states
  const [mergeCategory, setMergeCategory] = useState<string>('Candidate');
  const [selectedField, setSelectedField] = useState<string>('{{candidate_name}}');
  const [fieldValue, setFieldValue] = useState<string>('{{candidate_name}}');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Variable insertion & focus tracking
  const [lastFocusedField, setLastFocusedField] = useState<'subject' | 'body' | 'to' | 'replyTo'>('body');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview & Test states
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [renderedPreview, setRenderedPreview] = useState<{ subject: string; body: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Test Email state
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testSending, setTestSending] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const startEdit = (tpl: EmailTemplate) => {
    setIsAddingNew(false);
    setEditingTemplateId(tpl.id);
    setTplName(tpl.name);
    setTplDescription(
      tpl.category === 'Invitation'
        ? 'Automated email notification triggered to invite candidates to complete onboarding registration'
        : `Email notification alert for ${formatEventLabel(tpl.relatedEvent)}`,
    );
    setTplCategory(tpl.category);
    setTplEvent(tpl.relatedEvent);
    setTplFrom('Person performing this action');
    setTplTo('Email ID');
    setTplReplyTo('');
    setTplSubject(tpl.subject);
    setTplBody(tpl.body);
    setTplActive(tpl.isActive);
    setIsPreviewMode(false);
    setRenderedPreview(null);
    setError(null);
  };

  const startAddNew = () => {
    setEditingTemplateId(null);
    setIsAddingNew(true);
    setTplName('');
    setTplDescription('');
    setTplCategory('Invitation');
    setTplEvent('candidate_invited');
    setTplFrom('Person performing this action');
    setTplTo('Email ID');
    setTplReplyTo('');
    setTplSubject('Welcome to {{company_name}} - Action Required');
    setTplBody(
      'Dear ${First_Name},\n\nWarm greetings from the ${companyName} team!\n\nTo kickstart your onboarding process, please take a moment to set up your account by clicking on the following link to create your password and gain access to our portal: link\n\nOnce you\'ve successfully set up your account, you\'ll be ready to dive into our comprehensive onboarding process.\n\nFor subsequent logins, access the portal through this link.\n\nWe look forward to working with you and making your transition into our team seamless and enjoyable.\n\nBest Regards,\n${Person performing this action}',
    );
    setTplActive(true);
    setIsPreviewMode(false);
    setRenderedPreview(null);
    setError(null);
  };

  const closeEditor = () => {
    setEditingTemplateId(null);
    setIsAddingNew(false);
    setIsPreviewMode(false);
    setRenderedPreview(null);
    setShowTestDialog(false);
    setError(null);
  };

  const handleCategoryChange = (cat: string) => {
    setMergeCategory(cat);
    const first = MERGE_FIELDS_DATA[cat]?.[0];
    if (first) {
      setSelectedField(first.tag);
      setFieldValue(first.tag);
    }
  };

  const handleFieldChange = (tag: string) => {
    setSelectedField(tag);
    setFieldValue(tag);
  };

  const insertVariableRaw = (tag: string) => {
    if (lastFocusedField === 'subject') {
      setTplSubject((prev) => `${prev} ${tag}`.trim());
    } else {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? tplBody.length;
        const end = textarea.selectionEnd ?? tplBody.length;
        const newBody = tplBody.substring(0, start) + tag + tplBody.substring(end);
        setTplBody(newBody);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
      } else {
        setTplBody((prev) => `${prev} ${tag}`);
      }
    }
  };

  const handleInsertMergeField = () => {
    if (!fieldValue) return;
    insertVariableRaw(fieldValue);
  };

  const handleFormat = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? tplBody.length;
    const end = textarea.selectionEnd ?? tplBody.length;
    const sel = tplBody.substring(start, end) || 'text';
    const newText = prefix + sel + suffix;
    const newBody = tplBody.substring(0, start) + newText + tplBody.substring(end);
    setTplBody(newBody);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + sel.length);
    }, 0);
  };

  const handleGeneratePreview = async () => {
    if (isPreviewMode) {
      setIsPreviewMode(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await previewEmailTemplate({
        templateId: editingTemplateId || undefined,
        subject: tplSubject,
        body: tplBody,
      });
      setRenderedPreview(res);
      setIsPreviewMode(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to render template preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      setError('Please provide a recipient email address for testing');
      return;
    }
    setTestSending(true);
    setError(null);
    try {
      const res = await sendTestEmail({
        templateId: editingTemplateId || templates[0]?.id || 'tpl_candidate_invitation',
        recipientEmail: testEmailAddress.trim(),
      });
      if (res.success) {
        setSuccessMsg(res.message);
        setShowTestDialog(false);
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send test email');
    } finally {
      setTestSending(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) {
      setError('Email alert name is required');
      return;
    }
    if (!tplSubject.trim()) {
      setError('Email subject is required');
      return;
    }
    if (!tplBody.trim()) {
      setError('Email body is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Partial<EmailTemplate> = {
        name: tplName.trim(),
        category: tplCategory.trim(),
        relatedEvent: tplEvent,
        subject: tplSubject.trim(),
        body: tplBody.trim(),
        isActive: tplActive,
      };

      if (isAddingNew) {
        await onCreateTemplate(payload);
        setSuccessMsg('Email alert template created successfully');
      } else if (editingTemplateId) {
        await onUpdateTemplate(editingTemplateId, payload);
        setSuccessMsg('Email alert template updated successfully');
      }

      closeEditor();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save email template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tpl: EmailTemplate, nextActive: boolean) => {
    try {
      await onUpdateTemplate(tpl.id, { isActive: nextActive });
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle template status');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await onDuplicateTemplate(id);
      setSuccessMsg('Template duplicated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to duplicate template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this custom template?')) return;
    try {
      await onDeleteTemplate(id);
      setSuccessMsg('Template deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete template');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0].name);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={editingTemplateId || isAddingNew ? closeEditor : onClose}
      title={
        editingTemplateId || isAddingNew
          ? isAddingNew
            ? 'Create Email Alert'
            : 'Edit Email Alert'
          : 'Email Template Management'
      }
      size="2xl"
      className={`bezent-templates-modal bezent-zoho-email-modal ${
        isEditorExpanded ? 'bezent-zoho-email-modal--expanded' : ''
      }`}
      footer={
        <div className="bezent-zoho-modal-footer">
          {editingTemplateId || isAddingNew ? (
            <>
              <div className="bezent-zoho-footer-left">
                <Button variant="primary" onClick={handleSaveTemplate} loading={saving}>
                  Save Template
                </Button>
                <Button variant="secondary" onClick={closeEditor}>
                  Cancel
                </Button>
              </div>

              <div className="bezent-zoho-footer-right">
                <Button
                  variant="secondary"
                  onClick={() => setShowTestDialog(true)}
                  title="Send a test email to verify rendering"
                >
                  Send Test Email
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGeneratePreview}
                  loading={previewLoading}
                >
                  {isPreviewMode ? 'Edit Source' : 'Preview Template'}
                </Button>
              </div>
            </>
          ) : (
            <div className="bezent-notifrem-rules-footer">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={startAddNew}>
                + Create Template
              </Button>
            </div>
          )}
        </div>
      }
    >
      <Stack gap="md" className="bezent-notifrem-templates-container">
        {error && <Alert variant="danger" title="Error">{error}</Alert>}
        {successMsg && <Alert variant="success" title="Success">{successMsg}</Alert>}

        {/* Test Email Dialog Modal */}
        {showTestDialog && (
          <div className="bezent-templates-test-dialog" role="dialog" aria-label="Send Test Email Dialog">
            <div className="bezent-templates-test-header">
              <div className="bezent-templates-test-title-wrap">
                <div className="bezent-templates-test-icon">
                  <BezentIcon name="send" size={16} />
                </div>
                <div>
                  <h4 className="bezent-templates-test-title">Send Test Email</h4>
                  <p className="bezent-templates-test-desc">
                    Send a test copy with simulated dynamic variables to verify inbox rendering.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="bezent-notifrem-icon-btn bezent-notifrem-icon-btn--sm"
                onClick={() => setShowTestDialog(false)}
                aria-label="Close test dialog"
              >
                <BezentIcon name="close" size={14} />
              </button>
            </div>
            <div className="bezent-templates-test-body">
              <Input
                label="Recipient Email Address"
                type="email"
                placeholder="you@company.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                required
              />
              <div className="bezent-templates-test-footer">
                <Button variant="secondary" size="sm" onClick={() => setShowTestDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendTestEmail}
                  loading={testSending}
                >
                  Send Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Clean, Neat Zoho-Style Template Editor */}
        {editingTemplateId || isAddingNew ? (
          isPreviewMode ? (
            /* Live Preview Window */
            <div className="bezent-templates-preview-window">
              <div className="bezent-templates-preview-chrome">
                <div className="bezent-templates-preview-dots">
                  <span className="bezent-templates-dot bezent-templates-dot--red" />
                  <span className="bezent-templates-dot bezent-templates-dot--yellow" />
                  <span className="bezent-templates-dot bezent-templates-dot--green" />
                </div>
                <span className="bezent-templates-preview-chrome-title">
                  BEZENT Email Alert Preview &bull; {tplName || 'Untitled Alert'}
                </span>
                <Badge variant="neutral">Desktop Client</Badge>
              </div>

              <div className="bezent-templates-preview-envelope">
                <div className="bezent-templates-preview-field">
                  <span className="bezent-templates-preview-label">From:</span>
                  <span className="bezent-templates-preview-val">{tplFrom}</span>
                </div>
                <div className="bezent-templates-preview-field">
                  <span className="bezent-templates-preview-label">To:</span>
                  <span className="bezent-templates-preview-val bezent-templates-preview-val--recipient">
                    {tplTo} &lt;alex.johnson@example.com&gt;
                  </span>
                </div>
                <div className="bezent-templates-preview-field">
                  <span className="bezent-templates-preview-label">Subject:</span>
                  <span className="bezent-templates-preview-subject">
                    {renderedPreview?.subject || tplSubject || '(No subject provided)'}
                  </span>
                </div>
              </div>

              <div className="bezent-templates-preview-body-container">
                <div className="bezent-templates-preview-paper">
                  <pre className="bezent-templates-preview-text">
                    {renderedPreview?.body || tplBody || '(No email content drafted)'}
                  </pre>
                </div>
              </div>

              <div className="bezent-templates-preview-hint">
                <BezentIcon name="info" size={14} />
                <span>Simulated preview replacing merge tags with candidate registration data.</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveTemplate} className="bezent-zoho-editor-form">
              <Stack gap="md">
                {/* CARD 1: General Details */}
                <div className="bezent-zoho-card">
                  <div className="bezent-zoho-card-body">
                    <div className="bezent-zoho-field">
                      <label className="bezent-zoho-field-label">
                        Email alert name <span className="bezent-zoho-req">*</span>
                      </label>
                      <Input
                        value={tplName}
                        onChange={(e) => setTplName(e.target.value)}
                        placeholder="e.g. Welcome template for Candidates"
                        required
                      />
                    </div>

                    <div className="bezent-zoho-field">
                      <label className="bezent-zoho-field-label">Description</label>
                      <Textarea
                        value={tplDescription}
                        onChange={(e) => setTplDescription(e.target.value)}
                        rows={2}
                        placeholder="Specify when and why this email alert is triggered..."
                      />
                    </div>

                    <div className="bezent-zoho-meta-row">
                      <div className="bezent-zoho-field bezent-zoho-field--half">
                        <label className="bezent-zoho-field-label">Category</label>
                        <Select
                          value={tplCategory}
                          onChange={(e) => setTplCategory(e.target.value)}
                          options={[
                            { value: 'Invitation', label: 'Invitation' },
                            { value: 'Reminder', label: 'Reminder' },
                            { value: 'Document', label: 'Document' },
                            { value: 'Progress', label: 'Progress' },
                            { value: 'Checklist', label: 'Checklist' },
                            { value: 'Milestone', label: 'Milestone' },
                            { value: 'Custom', label: 'Custom' },
                          ]}
                        />
                      </div>
                      <div className="bezent-zoho-field bezent-zoho-field--half">
                        <label className="bezent-zoho-field-label">Trigger Event</label>
                        <Select
                          value={tplEvent}
                          onChange={(e) => setTplEvent(e.target.value)}
                          options={[
                            { value: 'candidate_invited', label: 'Candidate Invited' },
                            { value: 'registration_submitted', label: 'Registration Submitted' },
                            { value: 'candidate_stage_changed', label: 'Candidate Stage Changed' },
                            { value: 'document_rejected', label: 'Document Rejected' },
                            { value: 'checklist_assigned', label: 'Checklist Assigned' },
                            { value: 'conversion_completed', label: 'Onboarding Completed' },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 2: Message Configuration with Zoho Merge Fields & Rich Editor */}
                <div className="bezent-zoho-card">
                  <div className="bezent-zoho-card-header">
                    <h4 className="bezent-zoho-card-title">Message</h4>
                  </div>
                  <div className="bezent-zoho-card-body">
                    {/* From Row */}
                    <div className="bezent-zoho-form-row">
                      <label className="bezent-zoho-row-label">
                        From <span className="bezent-zoho-req">*</span>
                      </label>
                      <div className="bezent-zoho-row-control">
                        <Select
                          value={tplFrom}
                          onChange={(e) => setTplFrom(e.target.value)}
                          options={[
                            { value: 'Person performing this action', label: 'Person performing this action' },
                            { value: 'BEZENT System Dispatch <notifications@bezent.internal>', label: 'BEZENT System Dispatch <notifications@bezent.internal>' },
                            { value: 'Assigned HR Team', label: 'Assigned HR Team' },
                            { value: 'Reporting Manager', label: 'Reporting Manager' },
                          ]}
                        />
                      </div>
                    </div>

                    {/* To Row */}
                    <div className="bezent-zoho-form-row">
                      <label className="bezent-zoho-row-label">
                        To <span className="bezent-zoho-req">*</span>
                      </label>
                      <div className="bezent-zoho-row-control bezent-zoho-recipient-box">
                        <div className="bezent-zoho-recipient-chips">
                          <span className="bezent-zoho-recipient-tag">
                            <span>{tplTo}</span>
                            <button
                              type="button"
                              className="bezent-zoho-tag-close"
                              onClick={() => setTplTo('Candidate Email')}
                              aria-label="Remove recipient"
                            >
                              &times;
                            </button>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="bezent-zoho-var-btn"
                          title="Insert dynamic field"
                          onClick={() => insertVariableRaw('{{candidate_email}}')}
                          aria-label="Insert dynamic recipient field"
                        >
                          <BezentIcon name="edit" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Reply To Row */}
                    <div className="bezent-zoho-form-row">
                      <label className="bezent-zoho-row-label">Reply To</label>
                      <div className="bezent-zoho-row-control bezent-zoho-input-with-action">
                        <Input
                          value={tplReplyTo}
                          onChange={(e) => setTplReplyTo(e.target.value)}
                          onFocus={() => setLastFocusedField('replyTo')}
                          placeholder="hr-support@company.com"
                        />
                        <button
                          type="button"
                          className="bezent-zoho-var-btn"
                          title="Insert dynamic field"
                          onClick={() => insertVariableRaw('{{company_name}}')}
                          aria-label="Insert dynamic reply to field"
                        >
                          <BezentIcon name="edit" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Subject Row */}
                    <div className="bezent-zoho-form-row">
                      <label className="bezent-zoho-row-label">
                        Subject <span className="bezent-zoho-req">*</span>
                      </label>
                      <div className="bezent-zoho-row-control bezent-zoho-input-with-action">
                        <Input
                          value={tplSubject}
                          onChange={(e) => setTplSubject(e.target.value)}
                          onFocus={() => setLastFocusedField('subject')}
                          placeholder="Welcome to the Candidate Onboarding Process"
                          required
                        />
                        <button
                          type="button"
                          className="bezent-zoho-var-btn"
                          title="Insert variable into Subject"
                          onClick={() => insertVariableRaw('{{company_name}}')}
                          aria-label="Insert dynamic field into subject"
                        >
                          <BezentIcon name="edit" size={14} />
                        </button>
                      </div>
                    </div>

                    {/* ZOHO UNIFIED EDITOR CONTAINER (Merge Fields Bar + Rich Toolbar + Textarea) */}
                    <div className="bezent-zoho-editor-container">
                      {/* Top Merge Fields Row */}
                      <div className="bezent-zoho-merge-bar">
                        <div className="bezent-zoho-merge-col bezent-zoho-merge-col--category">
                          <label htmlFor="zoho-merge-category" className="bezent-zoho-merge-label">
                            Available merge fields &amp; Dynamic Variables
                          </label>
                          <select
                            id="zoho-merge-category"
                            className="bezent-zoho-merge-select"
                            value={mergeCategory}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                          >
                            {Object.keys(MERGE_FIELDS_DATA).map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="bezent-zoho-merge-col bezent-zoho-merge-col--field">
                          <label htmlFor="zoho-merge-field" className="bezent-zoho-merge-label">
                            Select Field
                          </label>
                          <select
                            id="zoho-merge-field"
                            className="bezent-zoho-merge-select"
                            value={selectedField}
                            onChange={(e) => handleFieldChange(e.target.value)}
                          >
                            {Object.entries(MERGE_FIELDS_DATA).map(([catName, fields]) => (
                              <optgroup key={catName} label={catName}>
                                {fields.map((f) => (
                                  <option key={f.tag} value={f.tag}>
                                    {f.label} ({f.tag})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div className="bezent-zoho-merge-col bezent-zoho-merge-col--val">
                          <label htmlFor="zoho-field-val" className="bezent-zoho-merge-label">
                            Field value
                          </label>
                          <input
                            id="zoho-field-val"
                            type="text"
                            className="bezent-zoho-merge-input"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            placeholder="Merge tag preview..."
                          />
                        </div>

                        <div className="bezent-zoho-merge-col bezent-zoho-merge-col--action">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleInsertMergeField}
                          >
                            Insert
                          </Button>
                          <button
                            type="button"
                            className="bezent-zoho-expand-btn"
                            title={isEditorExpanded ? 'Minimize editor' : 'Expand editor full width'}
                            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                            aria-label="Toggle full width editor"
                          >
                            <BezentIcon name="fullscreen" size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Middle Rich Text Formatting Toolbar */}
                      <div className="bezent-zoho-toolbar" role="toolbar" aria-label="Formatting toolbar">
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn bezent-zoho-tb-btn--bold"
                          title="Bold"
                          onClick={() => handleFormat('**', '**')}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn bezent-zoho-tb-btn--italic"
                          title="Italic"
                          onClick={() => handleFormat('*', '*')}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn bezent-zoho-tb-btn--underline"
                          title="Underline"
                          onClick={() => handleFormat('<u>', '</u>')}
                        >
                          U
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn bezent-zoho-tb-btn--strike"
                          title="Strikethrough"
                          onClick={() => handleFormat('~~', '~~')}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn bezent-zoho-tb-btn--font"
                          title="Font Family"
                          onClick={() => {}}
                        >
                          F
                        </button>
                        <select className="bezent-zoho-tb-select" title="Font size" defaultValue="12">
                          <option value="10">10</option>
                          <option value="11">11</option>
                          <option value="12">12</option>
                          <option value="14">14</option>
                          <option value="16">16</option>
                          <option value="18">18</option>
                        </select>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Text color"
                          onClick={() => {}}
                        >
                          <span className="bezent-zoho-tb-color">
                            A
                            <span className="bezent-zoho-color-bar" />
                          </span>
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Highlight color"
                          onClick={() => {}}
                        >
                          <span className="bezent-zoho-tb-color">
                            A
                            <span className="bezent-zoho-highlight-bar" />
                          </span>
                        </button>

                        <span className="bezent-zoho-tb-divider" />

                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Align"
                          onClick={() => {}}
                        >
                          <BezentIcon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Bullet list"
                          onClick={() => handleFormat('\n• ')}
                        >
                          •≡
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Numbered list"
                          onClick={() => handleFormat('\n1. ')}
                        >
                          1.≡
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Decrease indent"
                          onClick={() => {}}
                        >
                          ⇤
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Increase indent"
                          onClick={() => {}}
                        >
                          ⇥
                        </button>

                        <span className="bezent-zoho-tb-divider" />

                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Insert Image"
                          onClick={() => handleFormat('![Image](', ')')}
                        >
                          🖼
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Insert Link"
                          onClick={() => handleFormat('[link text](', ')')}
                        >
                          🔗
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Insert Table"
                          onClick={() => handleFormat('\n| Header 1 | Header 2 |\n| --- | --- |\n| Value 1 | Value 2 |\n')}
                        >
                          田
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Code View"
                          onClick={() => handleFormat('`', '`')}
                        >
                          &lt;/&gt;
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Quote"
                          onClick={() => handleFormat('\n> ')}
                        >
                          &ldquo;
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Clear format"
                          onClick={() => {}}
                        >
                          T<sub>x</sub>
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Horizontal Rule"
                          onClick={() => handleFormat('\n---\n')}
                        >
                          ⌸
                        </button>
                        <button
                          type="button"
                          className="bezent-zoho-tb-btn"
                          title="Insert Emoji"
                          onClick={() => insertVariableRaw(' 😊 ')}
                        >
                          😊
                        </button>
                      </div>

                      {/* Bottom Content Area */}
                      <textarea
                        ref={textareaRef}
                        className="bezent-zoho-editor-textarea"
                        value={tplBody}
                        onChange={(e) => setTplBody(e.target.value)}
                        onFocus={() => setLastFocusedField('body')}
                        rows={isEditorExpanded ? 20 : 12}
                        placeholder="Draft the email content here. Use dynamic tags to personalize..."
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* CARD 3: Attachments Card */}
                <div className="bezent-zoho-card">
                  <div className="bezent-zoho-card-header">
                    <h4 className="bezent-zoho-card-title">Attachments</h4>
                  </div>
                  <div className="bezent-zoho-card-body">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="bezent-sr-only"
                      onChange={handleFileUpload}
                    />
                    <div className="bezent-zoho-dropzone">
                      <div className="bezent-zoho-dropzone-icon">
                        <BezentIcon name="document" size={26} />
                      </div>
                      <div className="bezent-zoho-dropzone-text">
                        <span>Upload from</span>{' '}
                        <button
                          type="button"
                          className="bezent-zoho-link-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Desktop
                        </button>{' '}
                        /{' '}
                        <button
                          type="button"
                          className="bezent-zoho-link-btn"
                          onClick={() => alert('Cloud Storage: Select file from Cloud')}
                        >
                          Cloud
                        </button>{' '}
                        /{' '}
                        <button
                          type="button"
                          className="bezent-zoho-link-btn"
                          onClick={() => alert('Standard Templates: Select company attachment template')}
                        >
                          Select Templates
                        </button>
                      </div>
                      <span className="bezent-zoho-dropzone-hint">
                        Supported file format: .CSV, .DOC, .PDF, .XLS, .XLSX, .ZIP, .JPG, .JPEG, .PNG.
                      </span>

                      {attachedFile && (
                        <div className="bezent-zoho-attachment-pill">
                          <BezentIcon name="attachment" size={14} />
                          <span>{attachedFile}</span>
                          <button
                            type="button"
                            className="bezent-zoho-remove-attach"
                            onClick={() => setAttachedFile(null)}
                            aria-label="Remove attachment"
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Switch */}
                <div className="bezent-genpref-switches-card">
                  <div className="bezent-genpref-switch-row">
                    <div className="bezent-genpref-toggle-info">
                      <span className="bezent-genpref-toggle-title">Active Email Alert</span>
                      <span className="bezent-genpref-toggle-desc">
                        Enable this template for automated candidate notification dispatches
                      </span>
                    </div>
                    <Switch
                      checked={tplActive}
                      onChange={(e) => setTplActive(e.target.checked)}
                      aria-label="Active Template"
                    />
                  </div>
                </div>
              </Stack>
            </form>
          )
        ) : (
          /* Templates Management List */
          <div className="bezent-notifrem-table-container">
            <table className="bezent-notifrem-table" aria-label="Email templates table">
              <thead>
                <tr>
                  <th scope="col" className="bezent-notifrem-th bezent-templates-th--name">Template Name</th>
                  <th scope="col" className="bezent-notifrem-th bezent-templates-th--category">Category / Event</th>
                  <th scope="col" className="bezent-notifrem-th bezent-templates-th--status">Status</th>
                  <th scope="col" className="bezent-notifrem-th bezent-templates-th--actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="bezent-notifrem-tr">
                    <td className="bezent-notifrem-td">
                      <div className="bezent-notifrem-cell-stack">
                        <Inline gap="xs" align="center">
                          <span className="bezent-notifrem-event-name">{tpl.name}</span>
                          {tpl.isSystem ? (
                            <Badge variant="neutral">System</Badge>
                          ) : (
                            <Badge variant="info">Custom</Badge>
                          )}
                        </Inline>
                        <span className="bezent-notifrem-event-desc">
                          v{tpl.version} &bull; Updated {new Date(tpl.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="bezent-notifrem-td">
                      <div className="bezent-notifrem-cell-stack">
                        <span className="bezent-notifrem-badge-label">{tpl.category}</span>
                        <span className="bezent-notifrem-event-desc">{formatEventLabel(tpl.relatedEvent)}</span>
                      </div>
                    </td>
                    <td className="bezent-notifrem-td bezent-notifrem-td--center">
                      <Switch
                        checked={tpl.isActive}
                        onChange={(e) => handleToggleActive(tpl, e.target.checked)}
                        aria-label={`Toggle active for ${tpl.name}`}
                      />
                    </td>
                    <td className="bezent-notifrem-td bezent-templates-td--actions">
                      <div className="bezent-templates-actions-group">
                        <button
                          type="button"
                          className="bezent-notifrem-icon-btn bezent-notifrem-icon-btn--sm"
                          title="Edit template"
                          aria-label={`Edit ${tpl.name}`}
                          onClick={() => startEdit(tpl)}
                        >
                          <BezentIcon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          className="bezent-notifrem-icon-btn bezent-notifrem-icon-btn--sm"
                          title="Duplicate template"
                          aria-label={`Duplicate ${tpl.name}`}
                          onClick={() => handleDuplicate(tpl.id)}
                        >
                          <BezentIcon name="sync" size={14} />
                        </button>
                        {!tpl.isSystem && (
                          <button
                            type="button"
                            className="bezent-notifrem-icon-btn bezent-notifrem-icon-btn--sm bezent-notifrem-icon-btn--danger"
                            title="Delete template"
                            aria-label={`Delete ${tpl.name}`}
                            onClick={() => handleDelete(tpl.id)}
                          >
                            <BezentIcon name="delete" size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Stack>
    </Modal>
  );
}
