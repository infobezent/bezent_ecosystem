import React, { useState } from 'react';
import { useNavigate, useInRouterContext } from 'react-router-dom';
import {
  Alert,
  Button,
  Inline,
  Modal,
  PageHeader,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  FormTemplateItem,
  EmailTemplateItem,
  LetterFormatItem,
  TemplateCategory,
} from './types';
import {
  DEFAULT_FORMS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_LETTER_FORMATS,
} from './mockTemplatesData';
import { EmailTemplateModal } from './EmailTemplateModal';
import { LetterFormatModal } from './LetterFormatModal';
import { CreateTemplateModal } from './CreateTemplateModal';

export interface TemplatesSettingsSectionProps {
  onBack?: () => void;
}

export function TemplatesSettingsSection({ onBack }: TemplatesSettingsSectionProps) {
  const inRouter = useInRouterContext();
  const navigate = inRouter ? useNavigate() : undefined;

  const [forms, setForms] = useState<FormTemplateItem[]>(DEFAULT_FORMS);
  const [emailTemplates, setEmailTemplates] =
    useState<EmailTemplateItem[]>(DEFAULT_EMAIL_TEMPLATES);
  const [letterFormats, setLetterFormats] = useState<LetterFormatItem[]>(DEFAULT_LETTER_FORMATS);

  const [activeForm, setActiveForm] = useState<FormTemplateItem | null>(null);
  const [activeEmail, setActiveEmail] = useState<EmailTemplateItem | null>(null);
  const [activeLetter, setActiveLetter] = useState<LetterFormatItem | null>(null);
  const [createCategory, setCreateCategory] = useState<TemplateCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredForms = forms.filter(
    (f) => !q || f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
  );
  const filteredEmails = emailTemplates.filter(
    (e) => !q || e.name.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q),
  );
  const filteredLetters = letterFormats.filter(
    (l) => !q || l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
  );

  const handleCreateTemplate = (name: string, description: string, typeOrCategory: string) => {
    if (createCategory === 'forms') {
      const formCode = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newForm: FormTemplateItem = {
        id: `form-${Date.now()}`,
        name,
        code: formCode,
        description: description || 'Custom employee form template.',
        status: 'draft',
        fieldsCount: 0,
        sectionsCount: 1,
        targetAudience: 'Employees',
      };
      setForms((prev) => [...prev, newForm]);
      showNotice(`Form "${name}" created in draft mode.`);
      if (navigate) {
        navigate(`/hrms/settings/forms/${formCode}`);
      }
    } else if (createCategory === 'emails') {
      const newEmail: EmailTemplateItem = {
        id: `email-${Date.now()}`,
        name,
        code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: (typeOrCategory as any) || 'lifecycle',
        subject: `Notification: ${name}`,
        body: `Dear {{employee.name}},\n\nThis is a notification regarding ${name}.\n\nWarm regards,\nPeople Team`,
        status: 'draft',
        triggerEvent: 'Configurable event trigger',
        mergeTags: ['{{employee.name}}', '{{company.name}}', '{{effective.date}}'],
      };
      setEmailTemplates((prev) => [...prev, newEmail]);
      showNotice(`Email Template "${name}" added.`);
    } else if (createCategory === 'letters') {
      const newLetter: LetterFormatItem = {
        id: `letter-${Date.now()}`,
        name,
        code: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        type: (typeOrCategory as any) || 'offer_letter',
        description: description || 'Official company letterhead format.',
        status: 'draft',
        referencePattern: 'REF: BEZ/DOC/{{year}}/{{seq}}',
        authorizerRole: 'Authorized Signatory',
        bodyContent: `Date: {{current_date}}\nReference: {{reference_number}}\n\nTo,\n{{employee_name}}\n\nDear {{employee_name}},\n\nThis is an official document regarding ${name}.\n\nYours faithfully,\nFor {{company_name}}\n\nAuthorized Signatory`,
        mergeTags: [
          '{{employee_name}}',
          '{{company_name}}',
          '{{reference_number}}',
          '{{current_date}}',
        ],
      };
      setLetterFormats((prev) => [...prev, newLetter]);
      showNotice(`Letter Format "${name}" registered.`);
    }
  };

  return (
    <div className="bezent-templates-workspace">
      {/* Top Navigation & Breadcrumbs */}
      <Toolbar
        left={
          <Button variant="secondary" type="button" onClick={onBack}>
            <BezentIcon name="chevronLeft" size={16} />
            Back
          </Button>
        }
        right={
          <Inline gap="xs" align="center" className="bezent-templates-breadcrumbs">
            <span>Settings</span>
            <span>/</span>
            <strong>Templates</strong>
          </Inline>
        }
      />

      {feedbackNotice && (
        <Alert variant="success" title="Success">
          {feedbackNotice}
        </Alert>
      )}

      {/* Header with Title and Search */}
      <div className="bezent-templates-hub-header">
        <PageHeader
          title="Templates"
          subtitle="Configure employee forms, automated email notifications, and official company letter formats."
        />

        <div className="bezent-templates-search-wrapper">
          <div className="bezent-settings-zoho-search-box">
            <BezentIcon name="search" size={16} />
            <input
              type="text"
              placeholder="Search forms, emails & letters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bezent-settings-zoho-search-input"
              aria-label="Search templates"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="bezent-settings-zoho-search-clear"
                aria-label="Clear search"
              >
                <BezentIcon name="close" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <Stack gap="xl">
        {/* SECTION 1: Candidate & Employee Forms */}
        <div className="bezent-templates-section-card">
          <div className="bezent-templates-section-header">
            <div className="bezent-templates-section-title-wrap">
              <div className="bezent-templates-section-icon bezent-templates-section-icon--forms">
                <BezentIcon name="documents" size={18} />
              </div>
              <h3 className="bezent-templates-section-title">Forms</h3>
              <span className="bezent-templates-count-badge">{filteredForms.length}</span>
            </div>
            <p className="bezent-templates-section-desc">
              Pre-hire intake forms, employee registration forms, and vendor agreements.
            </p>
          </div>

          <div className="bezent-cif-cards-grid">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="bezent-cif-card"
                onClick={() => setActiveForm(form)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveForm(form)}
                title={`Configure ${form.name}`}
                aria-label={`Configure ${form.name}`}
              >
                <div className="bezent-cif-card__status-capsule" title={`Status: ${form.status}`}>
                  <span
                    className={`bezent-cif-card__status-dot bezent-cif-card__status-dot--${form.status}`}
                    aria-label={`Status: ${form.status}`}
                  />
                </div>

                <div
                  className="bezent-cif-card__icon bezent-cif-card__icon--forms"
                  aria-hidden="true"
                >
                  <BezentIcon name="documents" size={22} />
                </div>

                <h4 className="bezent-cif-card__name">{form.name}</h4>
              </div>
            ))}

            <div
              className="bezent-cif-card bezent-cif-card--add"
              onClick={() => setCreateCategory('forms')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setCreateCategory('forms')}
              title="Add New Form"
              aria-label="Add New Form"
            >
              <BezentIcon name="add" size={24} />
            </div>
          </div>
        </div>

        {/* SECTION 2: Lifecycle Email Templates */}
        <div className="bezent-templates-section-card">
          <div className="bezent-templates-section-header">
            <div className="bezent-templates-section-title-wrap">
              <div className="bezent-templates-section-icon bezent-templates-section-icon--emails">
                <BezentIcon name="mail" size={18} />
              </div>
              <h3 className="bezent-templates-section-title">Email Templates</h3>
              <span className="bezent-templates-count-badge">{filteredEmails.length}</span>
            </div>
            <p className="bezent-templates-section-desc">
              Automated system notification emails, lifecycle alerts, and employee announcements.
            </p>
          </div>

          <div className="bezent-cif-cards-grid">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                className="bezent-cif-card"
                onClick={() => setActiveEmail(email)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveEmail(email)}
                title={`Edit Email Template: ${email.name}`}
                aria-label={`Edit Email Template: ${email.name}`}
              >
                <div className="bezent-cif-card__status-capsule" title={`Status: ${email.status}`}>
                  <span
                    className={`bezent-cif-card__status-dot bezent-cif-card__status-dot--${email.status}`}
                    aria-label={`Status: ${email.status}`}
                  />
                </div>

                <div
                  className="bezent-cif-card__icon bezent-cif-card__icon--emails"
                  aria-hidden="true"
                >
                  <BezentIcon name="mail" size={22} />
                </div>

                <h4 className="bezent-cif-card__name">{email.name}</h4>
              </div>
            ))}

            <div
              className="bezent-cif-card bezent-cif-card--add"
              onClick={() => setCreateCategory('emails')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setCreateCategory('emails')}
              title="Add New Email Template"
              aria-label="Add New Email Template"
            >
              <BezentIcon name="add" size={24} />
            </div>
          </div>
        </div>

        {/* SECTION 3: Official Letter Formats */}
        <div className="bezent-templates-section-card">
          <div className="bezent-templates-section-header">
            <div className="bezent-templates-section-title-wrap">
              <div className="bezent-templates-section-icon bezent-templates-section-icon--letters">
                <BezentIcon name="offers" size={18} />
              </div>
              <h3 className="bezent-templates-section-title">Letter Formats</h3>
              <span className="bezent-templates-count-badge">{filteredLetters.length}</span>
            </div>
            <p className="bezent-templates-section-desc">
              Corporate letterheads, appointment letters, promotion memos, and service certificates.
            </p>
          </div>

          <div className="bezent-cif-cards-grid">
            {filteredLetters.map((letter) => (
              <div
                key={letter.id}
                className="bezent-cif-card"
                onClick={() => setActiveLetter(letter)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setActiveLetter(letter)}
                title={`Configure Letter Format: ${letter.name}`}
                aria-label={`Configure Letter Format: ${letter.name}`}
              >
                <div className="bezent-cif-card__status-capsule" title={`Status: ${letter.status}`}>
                  <span
                    className={`bezent-cif-card__status-dot bezent-cif-card__status-dot--${letter.status}`}
                    aria-label={`Status: ${letter.status}`}
                  />
                </div>

                <div
                  className="bezent-cif-card__icon bezent-cif-card__icon--letters"
                  aria-hidden="true"
                >
                  <BezentIcon name="offers" size={22} />
                </div>

                <h4 className="bezent-cif-card__name">{letter.name}</h4>
              </div>
            ))}

            <div
              className="bezent-cif-card bezent-cif-card--add"
              onClick={() => setCreateCategory('letters')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') && setCreateCategory('letters')
              }
              title="Add New Letter Format"
              aria-label="Add New Letter Format"
            >
              <BezentIcon name="add" size={24} />
            </div>
          </div>
        </div>
      </Stack>

      {/* Interactive Email Template Modal */}
      <EmailTemplateModal
        isOpen={Boolean(activeEmail)}
        onClose={() => setActiveEmail(null)}
        template={activeEmail}
        onSave={(updated) => {
          setEmailTemplates((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          showNotice(`Email template "${updated.name}" updated successfully.`);
        }}
      />

      {/* Interactive Letter Format Modal */}
      <LetterFormatModal
        isOpen={Boolean(activeLetter)}
        onClose={() => setActiveLetter(null)}
        letter={activeLetter}
        onSave={(updated) => {
          setLetterFormats((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          showNotice(`Letter format "${updated.name}" updated successfully.`);
        }}
      />

      {/* Form Details Preview Modal */}
      {activeForm && (
        <Modal
          isOpen={Boolean(activeForm)}
          onClose={() => setActiveForm(null)}
          title={`Form: ${activeForm.name}`}
          size="md"
          footer={
            <Inline gap="sm" justify="end">
              <Button variant="secondary" onClick={() => setActiveForm(null)} type="button">
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (navigate) {
                    navigate(`/hrms/settings/forms/${activeForm.code}`);
                  }
                  setActiveForm(null);
                }}
                type="button"
              >
                <BezentIcon name="edit" size={16} />
                Open in Form Builder
              </Button>
            </Inline>
          }
        >
          <Stack gap="md">
            <div className="bezent-template-meta-strip">
              <div className="bezent-template-meta-item">
                <span className="bezent-template-meta-label">Status:</span>
                <span className="bezent-template-meta-val bezent-template-meta-tag">
                  {activeForm.status}
                </span>
              </div>
              <div className="bezent-template-meta-item">
                <span className="bezent-template-meta-label">Sections:</span>
                <span className="bezent-template-meta-val">
                  {activeForm.sectionsCount} Sections
                </span>
              </div>
              <div className="bezent-template-meta-item">
                <span className="bezent-template-meta-label">Fields:</span>
                <span className="bezent-template-meta-val">
                  {activeForm.fieldsCount} Active Fields
                </span>
              </div>
            </div>

            <p>{activeForm.description}</p>

            <Alert variant="info" title="Form Configuration">
              This form is governed by the BEZENT Form Builder Engine. Field attributes,
              validations, and intake access controls can be visually customized in the Form Builder.
            </Alert>
          </Stack>
        </Modal>
      )}

      {/* Create New Template Modal */}
      {createCategory && (
        <CreateTemplateModal
          isOpen={Boolean(createCategory)}
          onClose={() => setCreateCategory(null)}
          category={createCategory}
          onCreate={handleCreateTemplate}
        />
      )}
    </div>
  );
}
