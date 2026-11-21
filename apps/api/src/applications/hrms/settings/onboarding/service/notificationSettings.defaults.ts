/**
 * Default Seeds for Onboarding Notifications & Reminders V1
 */

import type {
  EventNotificationConfig,
  ReminderRule,
  EmailTemplate,
} from '../types/notificationSettings.types.js';

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_candidate_invitation',
    name: 'Candidate Invitation',
    category: 'Invitation',
    relatedEvent: 'candidate_invited',
    subject: 'Welcome to {{company_name}} – Please Complete Your Pre-Onboarding Registration',
    body: `Dear {{candidate_name}},

Welcome to {{company_name}}! We are delighted to invite you to begin your onboarding journey for the position of {{position_name}}.

Please click the link below to access your pre-hire registration portal and submit your details:
{{registration_link}}

Expected Date of Joining: {{joining_date}}

If you have any questions or require assistance, please contact the HR team.

Warm regards,
{{company_name}} Human Resources`,
    availableVariables: [
      'candidate_name',
      'candidate_email',
      'company_name',
      'position_name',
      'joining_date',
      'registration_link',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_registration_reminder',
    name: 'Registration Reminder',
    category: 'Reminder',
    relatedEvent: 'registration_submitted',
    subject: 'Reminder: Complete Your Onboarding Registration with {{company_name}}',
    body: `Dear {{candidate_name}},

This is a friendly reminder that your onboarding registration for the position of {{position_name}} at {{company_name}} is pending completion.

Please use the secure link below to complete and submit your information at your earliest convenience:
{{registration_link}}

Expected Date of Joining: {{joining_date}}

Thank you,
{{company_name}} HR Team`,
    availableVariables: [
      'candidate_name',
      'candidate_email',
      'company_name',
      'position_name',
      'joining_date',
      'registration_link',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_document_request',
    name: 'Document Request',
    category: 'Document',
    relatedEvent: 'candidate_stage_changed',
    subject: 'Action Required: Please Upload {{document_name}} for {{company_name}}',
    body: `Dear {{candidate_name}},

As part of your onboarding verification for {{position_name}}, please upload the following credential: {{document_name}}.

Upload Portal:
{{registration_link}}

Timely verification ensures your employee account and onboarding are processed smoothly before {{joining_date}}.

Best regards,
{{company_name}} Verification Team`,
    availableVariables: [
      'candidate_name',
      'company_name',
      'position_name',
      'joining_date',
      'document_name',
      'registration_link',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_document_rejection',
    name: 'Document Rejection & Re-upload Request',
    category: 'Document',
    relatedEvent: 'document_rejected',
    subject: 'Update Needed: Re-upload {{document_name}} for {{company_name}}',
    body: `Dear {{candidate_name}},

The document "{{document_name}}" submitted for your onboarding verification could not be approved and requires a re-upload.

Please review the notes and upload a clear, valid copy:
{{registration_link}}

Warm regards,
{{company_name}} HR Team`,
    availableVariables: [
      'candidate_name',
      'company_name',
      'document_name',
      'registration_link',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_stage_update',
    name: 'Stage Update',
    category: 'Progress',
    relatedEvent: 'candidate_stage_changed',
    subject: 'Onboarding Progress: You have moved to {{stage_name}}',
    body: `Dear {{candidate_name}},

Congratulations! Your onboarding progression at {{company_name}} has reached: {{stage_name}}.

You can view upcoming items and track status in your onboarding portal:
{{registration_link}}

Best regards,
{{company_name}} People Operations`,
    availableVariables: [
      'candidate_name',
      'company_name',
      'stage_name',
      'joining_date',
      'registration_link',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_checklist_assignment',
    name: 'Checklist Task Assignment',
    category: 'Checklist',
    relatedEvent: 'checklist_assigned',
    subject: 'New Onboarding Task Assigned: {{company_name}}',
    body: `Hello,

A new onboarding task has been assigned for candidate {{candidate_name}} (Position: {{position_name}}).

Please review your task list and ensure timely completion prior to the joining date ({{joining_date}}).

Thank you,
BEZENT Operations Team`,
    availableVariables: [
      'candidate_name',
      'company_name',
      'position_name',
      'joining_date',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_onboarding_completion',
    name: 'Onboarding Completion',
    category: 'Milestone',
    relatedEvent: 'conversion_completed',
    subject: 'Congratulations on Completing Onboarding at {{company_name}}!',
    body: `Dear {{candidate_name}},

Congratulations! All pre-onboarding formalities and requirements for your role as {{position_name}} at {{company_name}} have been completed successfully.

We are excited to welcome you on your first day: {{joining_date}}.

Warm regards,
{{company_name}} Onboarding Team`,
    availableVariables: [
      'candidate_name',
      'company_name',
      'position_name',
      'joining_date',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tpl_conversion_confirmation',
    name: 'Employee Conversion Confirmation',
    category: 'Conversion',
    relatedEvent: 'conversion_completed',
    subject: 'Welcome to the Team, {{employee_name}}! Employee Profile Activated',
    body: `Dear {{employee_name}},

Your profile has been converted to an active employee record at {{company_name}}.

You can now log in to the BEZENT Employee Self-Service (ESS) portal using your company credentials to view attendance, leaves, and team resources.

Welcome aboard!
{{company_name}}`,
    availableVariables: [
      'employee_name',
      'company_name',
      'position_name',
      'joining_date',
    ],
    isActive: true,
    isSystem: true,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_EVENT_CONFIGS: EventNotificationConfig[] = [
  {
    id: 'evc_candidate_invited',
    eventKey: 'candidate_invited',
    name: 'Candidate invited',
    description: 'Triggered when a new hire is sent an invitation to complete pre-onboarding intake.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: false,
    recipients: ['candidate'],
    templateId: 'tpl_candidate_invitation',
  },
  {
    id: 'evc_registration_submitted',
    eventKey: 'registration_submitted',
    name: 'Registration submitted',
    description: 'Triggered when a candidate completes and submits the intake registration form.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['hr_team'],
    templateId: 'tpl_registration_reminder',
  },
  {
    id: 'evc_candidate_details_updated',
    eventKey: 'candidate_details_updated',
    name: 'Candidate details updated',
    description: 'Triggered when candidate personal or professional information is updated.',
    enabled: true,
    emailEnabled: false,
    inAppEnabled: true,
    recipients: ['assigned_hr'],
    templateId: 'tpl_stage_update',
  },
  {
    id: 'evc_candidate_stage_changed',
    eventKey: 'candidate_stage_changed',
    name: 'Candidate stage changed',
    description: 'Triggered when an onboarding case moves from one pipeline stage to the next.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['candidate', 'hr_team'],
    templateId: 'tpl_stage_update',
  },
  {
    id: 'evc_checklist_assigned',
    eventKey: 'checklist_assigned',
    name: 'Checklist assigned',
    description: 'Triggered when checklist tasks are instantiated and assigned to team members.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['task_owner'],
    templateId: 'tpl_checklist_assignment',
  },
  {
    id: 'evc_checklist_task_overdue',
    eventKey: 'checklist_task_overdue',
    name: 'Checklist task overdue',
    description: 'Triggered when an assigned onboarding checklist task passes its target due date.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['task_owner', 'hr_team'],
    templateId: 'tpl_checklist_assignment',
  },
  {
    id: 'evc_document_uploaded',
    eventKey: 'document_uploaded',
    name: 'Document uploaded',
    description: 'Triggered when a candidate uploads a required document credential.',
    enabled: true,
    emailEnabled: false,
    inAppEnabled: true,
    recipients: ['hr_team'],
    templateId: 'tpl_document_request',
  },
  {
    id: 'evc_document_rejected',
    eventKey: 'document_rejected',
    name: 'Document rejected',
    description: 'Triggered when HR marks a submitted credential as rejected and requests a re-upload.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['candidate'],
    templateId: 'tpl_document_rejection',
  },
  {
    id: 'evc_document_approved',
    eventKey: 'document_approved',
    name: 'Document approved',
    description: 'Triggered when HR verifies and approves a candidate document.',
    enabled: true,
    emailEnabled: false,
    inAppEnabled: true,
    recipients: ['candidate'],
    templateId: 'tpl_document_request',
  },
  {
    id: 'evc_conversion_completed',
    eventKey: 'conversion_completed',
    name: 'Employee conversion completed',
    description: 'Triggered when an onboarding case is converted to an active employee profile.',
    enabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['hr_team', 'reporting_manager'],
    templateId: 'tpl_conversion_confirmation',
  },
];

export const DEFAULT_REMINDER_RULES: ReminderRule[] = [
  {
    id: 'rem_reg_incomplete',
    name: 'Candidate registration incomplete',
    relatedEvent: 'candidate_invited',
    isActive: true,
    triggerType: 'after_inactivity',
    delayAmount: 24,
    delayUnit: 'hours',
    repeatInterval: 24,
    maxReminderCount: 3,
    dayType: 'calendar_days',
    emailEnabled: true,
    inAppEnabled: false,
    recipients: ['candidate'],
    escalationEnabled: true,
    escalateAfterCount: 3,
    escalationRecipient: 'assigned_hr',
    maxEscalationAttempts: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rem_form_not_submitted',
    name: "Candidate hasn't submitted the form",
    relatedEvent: 'candidate_invited',
    isActive: true,
    triggerType: 'after_inactivity',
    delayAmount: 48,
    delayUnit: 'hours',
    repeatInterval: 24,
    maxReminderCount: 3,
    dayType: 'calendar_days',
    emailEnabled: true,
    inAppEnabled: false,
    recipients: ['candidate'],
    escalationEnabled: true,
    escalateAfterCount: 3,
    escalationRecipient: 'hr_team',
    maxEscalationAttempts: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rem_doc_pending',
    name: 'Required document pending',
    relatedEvent: 'candidate_stage_changed',
    isActive: true,
    triggerType: 'after_inactivity',
    delayAmount: 2,
    delayUnit: 'days',
    repeatInterval: 1,
    maxReminderCount: 3,
    dayType: 'business_days',
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['candidate'],
    escalationEnabled: true,
    escalateAfterCount: 3,
    escalationRecipient: 'assigned_hr',
    maxEscalationAttempts: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rem_doc_verification_overdue',
    name: 'Document verification overdue',
    relatedEvent: 'document_uploaded',
    isActive: true,
    triggerType: 'after_due_date',
    delayAmount: 1,
    delayUnit: 'days',
    repeatInterval: 1,
    maxReminderCount: 2,
    dayType: 'business_days',
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['assigned_hr', 'hr_team'],
    escalationEnabled: true,
    escalateAfterCount: 2,
    escalationRecipient: 'role:hr_manager',
    maxEscalationAttempts: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rem_task_approaching_due',
    name: 'Checklist task approaching due date',
    relatedEvent: 'checklist_assigned',
    isActive: true,
    triggerType: 'before_due_date',
    delayAmount: 1,
    delayUnit: 'days',
    repeatInterval: 0,
    maxReminderCount: 1,
    dayType: 'business_days',
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['task_owner'],
    escalationEnabled: false,
    escalateAfterCount: 0,
    escalationRecipient: '',
    maxEscalationAttempts: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rem_task_overdue',
    name: 'Checklist task overdue',
    relatedEvent: 'checklist_assigned',
    isActive: true,
    triggerType: 'after_due_date',
    delayAmount: 1,
    delayUnit: 'days',
    repeatInterval: 1,
    maxReminderCount: 3,
    dayType: 'business_days',
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['task_owner', 'hr_team'],
    escalationEnabled: true,
    escalateAfterCount: 2,
    escalationRecipient: 'reporting_manager',
    maxEscalationAttempts: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rem_awaiting_hr_review',
    name: 'Candidate awaiting HR review',
    relatedEvent: 'registration_submitted',
    isActive: true,
    triggerType: 'after_inactivity',
    delayAmount: 24,
    delayUnit: 'hours',
    repeatInterval: 24,
    maxReminderCount: 2,
    dayType: 'business_days',
    emailEnabled: true,
    inAppEnabled: true,
    recipients: ['assigned_hr', 'hr_team'],
    escalationEnabled: true,
    escalateAfterCount: 2,
    escalationRecipient: 'role:hr_manager',
    maxEscalationAttempts: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
