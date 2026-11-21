import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TemplatesSettingsSection } from '../TemplatesSettingsSection';
import { EmailTemplateModal } from '../EmailTemplateModal';
import { LetterFormatModal } from '../LetterFormatModal';
import { CreateTemplateModal } from '../CreateTemplateModal';
import {
  DEFAULT_FORMS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_LETTER_FORMATS,
} from '../mockTemplatesData';

describe('TemplatesSettingsSection UI Tests', () => {
  it('renders top toolbar with Back button and Settings / Templates breadcrumb', () => {
    const onBack = vi.fn();
    const html = renderToStaticMarkup(<TemplatesSettingsSection onBack={onBack} />);

    expect(html).toContain('Back');
    expect(html).toContain('Settings');
    expect(html).toContain('Templates');
    expect(html).toContain(
      'Configure employee forms, automated email notifications, and official company letter formats.',
    );
  });

  it('renders all 3 stacked section cards: Forms, Email Templates, and Letter Formats', () => {
    const html = renderToStaticMarkup(<TemplatesSettingsSection />);

    expect(html).toContain('Forms');
    expect(html).toContain('Email Templates');
    expect(html).toContain('Letter Formats');

    // Section descriptions
    expect(html).toContain(
      'Pre-hire intake forms, employee registration forms, and vendor agreements.',
    );
    expect(html).toContain(
      'Automated system notification emails, lifecycle alerts, and employee announcements.',
    );
    expect(html).toContain(
      'Corporate letterheads, appointment letters, promotion memos, and service certificates.',
    );
  });

  it('renders the default Forms and Add card', () => {
    const html = renderToStaticMarkup(<TemplatesSettingsSection />);

    expect(html).toContain('Employee Registration');
    expect(html).toContain('Candidate Intake Form');
    expect(html).toContain('Contractor Intake Form');
    expect(html).toContain('Add New Form');
  });

  it('renders the default Email Templates and Add card', () => {
    const html = renderToStaticMarkup(<TemplatesSettingsSection />);

    expect(html).toContain('Welcome &amp; Candidate Invite');
    expect(html).toContain('Probation Review Alert');
    expect(html).toContain('Promotion Announcement');
    expect(html).toContain('Transfer Order Notification');
    expect(html).toContain('Resignation Acceptance');
    expect(html).toContain('Add New Email Template');
  });

  it('renders the default Official Letter Formats and Add card', () => {
    const html = renderToStaticMarkup(<TemplatesSettingsSection />);

    expect(html).toContain('Offer Letter &amp; Annexure');
    expect(html).toContain('Probation Confirmation Letter');
    expect(html).toContain('Promotion &amp; Increment Letter');
    expect(html).toContain('Transfer &amp; Deputation Order');
    expect(html).toContain('Relieving &amp; Experience Certificate');
    expect(html).toContain('Add New Letter Format');
  });

  it('EmailTemplateModal renders subject, body, and merge tags', () => {
    const template = DEFAULT_EMAIL_TEMPLATES[0]!;
    const html = renderToStaticMarkup(
      <EmailTemplateModal isOpen={true} onClose={vi.fn()} template={template} onSave={vi.fn()} />,
    );

    expect(html).toContain('Email Template:');
    expect(html).toContain('Welcome &amp; Candidate Invite');
    expect(html).toContain('Email Subject Line');
    expect(html).toContain('Available Dynamic Merge Tags');
    expect(html).toContain('Send Test Preview');
    expect(html).toContain('Save Template');
  });

  it('LetterFormatModal renders corporate letterhead and reference format', () => {
    const letter = DEFAULT_LETTER_FORMATS[0]!;
    const html = renderToStaticMarkup(
      <LetterFormatModal isOpen={true} onClose={vi.fn()} letter={letter} onSave={vi.fn()} />,
    );

    expect(html).toContain('Official Letter Format:');
    expect(html).toContain('Offer Letter &amp; Annexure');
    expect(html).toContain('Reference Number Format');
    expect(html).toContain('Authorized Signatory Title');
    expect(html).toContain('Available Document Placeholders');
    expect(html).toContain('Save Letter Format');
  });

  it('CreateTemplateModal renders form for chosen category', () => {
    const html = renderToStaticMarkup(
      <CreateTemplateModal isOpen={true} onClose={vi.fn()} category="emails" onCreate={vi.fn()} />,
    );

    expect(html).toContain('Create New Email Notification Template');
    expect(html).toContain('Template Title');
    expect(html).toContain('Lifecycle Category');
  });
});
