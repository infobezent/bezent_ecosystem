import type { FormTemplateItem, EmailTemplateItem, LetterFormatItem } from './types';

export const DEFAULT_FORMS: FormTemplateItem[] = [
  {
    id: 'form-1',
    name: 'Employee Registration',
    code: 'employee-registration',
    description:
      'Standard multi-section registration form capturing personal, family, education, identity, and bank accounts.',
    status: 'published',
    fieldsCount: 24,
    sectionsCount: 5,
    targetAudience: 'HR Operations & New Hires',
  },
  {
    id: 'form-2',
    name: 'Candidate Intake Form',
    code: 'candidate-intake',
    description:
      'Self-service candidate pre-hire registration portal for contact information, background checks, and document collection.',
    status: 'published',
    fieldsCount: 18,
    sectionsCount: 4,
    targetAudience: 'Prospective Candidates',
  },
  {
    id: 'form-3',
    name: 'Contractor Intake Form',
    code: 'contractor-intake',
    description:
      'Specialized questionnaire for external consultants, vendors, NDA acknowledgments, and invoicing details.',
    status: 'draft',
    fieldsCount: 12,
    sectionsCount: 3,
    targetAudience: 'Contractors & Consultants',
  },
];

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateItem[] = [
  {
    id: 'email-1',
    name: 'Welcome & Candidate Invite',
    code: 'welcome-invite',
    category: 'onboarding',
    subject: 'Welcome to {{company.name}}! Please complete your pre-boarding registration',
    body: `Dear {{candidate.name}},

Welcome to the {{company.name}} family! We are thrilled to have you join our team as {{job.title}}.

To ensure a seamless first day on {{joining.date}}, please access your secure pre-boarding candidate portal and complete the required information:

{{portal.link}}

If you have any questions before your start date, your HR coordinator is available to assist you.

Warm regards,
People & Culture Team
{{company.name}}`,
    status: 'published',
    triggerEvent: 'Triggered upon candidate offer acceptance sign-off',
    mergeTags: [
      '{{candidate.name}}',
      '{{company.name}}',
      '{{job.title}}',
      '{{joining.date}}',
      '{{portal.link}}',
    ],
  },
  {
    id: 'email-2',
    name: 'Probation Review Alert',
    code: 'probation-review',
    category: 'lifecycle',
    subject: 'Action Required: Upcoming Probation Milestone Review for {{employee.name}}',
    body: `Dear {{manager.name}},

This is an automated notification that {{employee.name}} (ID: {{employee.id}}) will reach their 6-month probation milestone on {{probation.end_date}}.

Please log in to the BEZENT manager portal to complete the performance assessment and submit your recommendation (Confirmation, Extension, or Separation) before the deadline.

Link: {{portal.link}}/hrms/workforce/lifecycle/probation

Regards,
HR Operations Department`,
    status: 'published',
    triggerEvent: 'Sent automatically 15 days before employee probation end date',
    mergeTags: [
      '{{employee.name}}',
      '{{employee.id}}',
      '{{manager.name}}',
      '{{probation.end_date}}',
      '{{portal.link}}',
    ],
  },
  {
    id: 'email-3',
    name: 'Promotion Announcement',
    code: 'promotion-announcement',
    category: 'career',
    subject: 'Heartiest Congratulations on Your Promotion to {{employee.new_designation}}!',
    body: `Dear {{employee.name}},

The Leadership and Human Resources teams are delighted to officially recognize your outstanding contributions and dedication to {{company.name}}.

We are proud to announce your promotion from {{employee.old_designation}} to {{employee.new_designation}}, effective {{effective.date}}.

Your new appointment memo and revised compensation schedule have been updated in your Employee Self-Service profile.

Congratulations on this well-deserved achievement!

Best regards,
Management Board & HR Team`,
    status: 'published',
    triggerEvent: 'Sent when management approves final promotion elevation',
    mergeTags: [
      '{{employee.name}}',
      '{{employee.old_designation}}',
      '{{employee.new_designation}}',
      '{{effective.date}}',
    ],
  },
  {
    id: 'email-4',
    name: 'Transfer Order Notification',
    code: 'transfer-order',
    category: 'lifecycle',
    subject: 'Official Transfer Order: Relocation to {{transfer.target_location}}',
    body: `Dear {{employee.name}},

This memo confirms your organizational transfer from {{transfer.source_location}} to {{transfer.target_location}}, effective {{effective.date}}.

Please review your relocation benefits and logistics guidelines in the attached document. You are requested to report to {{transfer.new_manager}} upon arrival.

We wish you continued success in your new assignment.

Sincerely,
People Operations`,
    status: 'published',
    triggerEvent: 'Sent upon formal release of transfer order',
    mergeTags: [
      '{{employee.name}}',
      '{{transfer.source_location}}',
      '{{transfer.target_location}}',
      '{{effective.date}}',
      '{{transfer.new_manager}}',
    ],
  },
  {
    id: 'email-5',
    name: 'Resignation Acceptance',
    code: 'resignation-acceptance',
    category: 'offboarding',
    subject: 'Formal Acceptance of Resignation & Handover Schedule',
    body: `Dear {{employee.name}},

We acknowledge receipt of your resignation notice submitted on {{resignation.submitted_date}}.

This letter serves as formal acceptance of your resignation. Your final working day will be {{relieving.date}}, subject to completion of department handover and IT asset returns.

Your designated offboarding coordinator is {{clearance.officer}}, who will guide you through the exit clearance checklist.

We thank you for your service and wish you the very best in your future endeavors.

Sincerely,
Human Resources`,
    status: 'published',
    triggerEvent: 'Dispatched once reporting manager and HR approve resignation request',
    mergeTags: [
      '{{employee.name}}',
      '{{resignation.submitted_date}}',
      '{{relieving.date}}',
      '{{clearance.officer}}',
    ],
  },
];

export const DEFAULT_LETTER_FORMATS: LetterFormatItem[] = [
  {
    id: 'letter-1',
    name: 'Offer Letter & Annexure',
    code: 'offer-letter',
    type: 'offer_letter',
    description:
      'Standard corporate appointment offer with comprehensive CTC salary breakdown, reporting structure, and terms.',
    status: 'published',
    referencePattern: 'REF: BEZ/OFF/{{year}}/{{seq}}',
    authorizerRole: 'Head of Talent Acquisition & HR Operations',
    bodyContent: `Date: {{current_date}}
Reference: {{reference_number}}

To,
{{candidate_name}}
{{candidate_address}}

Dear {{candidate_name}},

Subject: Offer of Employment - {{job_title}}

We are pleased to offer you the position of {{job_title}} at {{company_name}}. We believe your skills and experience will be an asset to our team.

1. Designation & Department: You will be appointed as {{job_title}} in the {{department}} team, reporting to {{reporting_manager}}.
2. Remuneration: Your annual Cost to Company (CTC) will be {{ctc_annual}}, structured in accordance with the Annexure A attached hereto.
3. Commencement Date: You are required to join the organization on or before {{joining_date}}.
4. Probation Period: You will be on probation for a period of {{probation_months}} months from your joining date.

Please sign and return the duplicate copy of this letter within 5 working days as a token of your acceptance.

Yours sincerely,
For {{company_name}}

Authorized Signatory
Head of Talent Acquisition`,
    mergeTags: [
      '{{candidate_name}}',
      '{{candidate_address}}',
      '{{job_title}}',
      '{{department}}',
      '{{reporting_manager}}',
      '{{ctc_annual}}',
      '{{joining_date}}',
      '{{probation_months}}',
      '{{reference_number}}',
      '{{company_name}}',
    ],
  },
  {
    id: 'letter-2',
    name: 'Probation Confirmation Letter',
    code: 'confirmation-letter',
    type: 'confirmation_letter',
    description:
      'Official corporate confirmation memo endorsing permanent employment status following evaluation.',
    status: 'published',
    referencePattern: 'REF: BEZ/CONF/{{year}}/{{seq}}',
    authorizerRole: 'VP - People & Culture',
    bodyContent: `Date: {{current_date}}
Reference: {{reference_number}}

To,
{{employee_name}}
Employee ID: {{employee_id}}
Department: {{department}}

Dear {{employee_name}},

Subject: Confirmation of Employment Services

Consequent to the review of your performance during the probationary period, we take immense pleasure in confirming your services as a permanent regular employee of {{company_name}} with effect from {{confirmation_date}}.

All other terms and conditions governing your employment as outlined in your original letter of appointment shall continue to remain unchanged.

We look forward to your dedicated contributions to the organization's growth.

Yours faithfully,
For {{company_name}}

Authorized Signatory
VP - People & Culture`,
    mergeTags: [
      '{{employee_name}}',
      '{{employee_id}}',
      '{{department}}',
      '{{confirmation_date}}',
      '{{company_name}}',
      '{{reference_number}}',
    ],
  },
  {
    id: 'letter-3',
    name: 'Promotion & Increment Letter',
    code: 'promotion-letter',
    type: 'promotion_letter',
    description:
      'Official promotion endorsement detailing upgraded job band, revised title, and increased compensation structure.',
    status: 'published',
    referencePattern: 'REF: BEZ/PROM/{{year}}/{{seq}}',
    authorizerRole: 'Managing Director & CHRO',
    bodyContent: `Date: {{current_date}}
Reference: {{reference_number}}

To,
{{employee_name}}
Employee ID: {{employee_id}}

Dear {{employee_name}},

Subject: Promotion to {{promoted_title}} & Salary Revision

In recognition of your exceptional performance, demonstrated leadership, and valuable contributions, the Management is pleased to promote you to the position of {{promoted_title}} in Job Grade {{new_grade}}, effective {{effective_date}}.

In conjunction with this promotion, your annual compensation has been revised to {{revised_ctc}} per annum. The detailed breakdown of your new compensation package is enclosed in Annexure A.

We commend your dedication and trust you will achieve even greater milestones in this elevated capacity.

Warm congratulations!

For {{company_name}}

Authorized Signatory
Managing Director & CHRO`,
    mergeTags: [
      '{{employee_name}}',
      '{{employee_id}}',
      '{{promoted_title}}',
      '{{new_grade}}',
      '{{revised_ctc}}',
      '{{effective_date}}',
      '{{company_name}}',
      '{{reference_number}}',
    ],
  },
  {
    id: 'letter-4',
    name: 'Transfer & Deputation Order',
    code: 'transfer-letter',
    type: 'transfer_letter',
    description:
      'Official corporate movement order authorizing transfer of office location, branch unit, or division.',
    status: 'published',
    referencePattern: 'REF: BEZ/TRF/{{year}}/{{seq}}',
    authorizerRole: 'Chief Operating Officer',
    bodyContent: `Date: {{current_date}}
Reference: {{reference_number}}

To,
{{employee_name}}
Employee ID: {{employee_id}}

Dear {{employee_name}},

Subject: Inter-Branch Transfer Order

In the interest of business operations and skill utilization, management has decided to transfer your posting from {{source_location}} to {{destination_location}}, effective {{effective_date}}.

You will report to {{reporting_officer}} at the destination branch. You are entitled to relocation allowances and transit days in accordance with the company travel and relocation policy.

Please complete clearance at your current branch prior to your departure.

Yours sincerely,
For {{company_name}}

Authorized Signatory
Chief Operating Officer`,
    mergeTags: [
      '{{employee_name}}',
      '{{employee_id}}',
      '{{source_location}}',
      '{{destination_location}}',
      '{{reporting_officer}}',
      '{{effective_date}}',
      '{{company_name}}',
      '{{reference_number}}',
    ],
  },
  {
    id: 'letter-5',
    name: 'Relieving & Experience Certificate',
    code: 'experience-letter',
    type: 'experience_letter',
    description:
      'Standard formal certificate verifying complete service tenure, conduct, and discharge from employment.',
    status: 'published',
    referencePattern: 'REF: BEZ/REL/{{year}}/{{seq}}',
    authorizerRole: 'Head of HR Operations',
    bodyContent: `Date: {{current_date}}
Reference: {{reference_number}}

TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{employee_name}} (Employee ID: {{employee_id}}) was employed with {{company_name}} from {{tenure_start}} to {{tenure_end}}. At the time of leaving, their designation was {{final_designation}} in the {{department}} department.

During their tenure with us, {{employee_name}} has fulfilled their responsibilities with diligence, honesty, and professionalism. They have been relieved of all duties following successful completion of exit formalities.

We thank them for their contributions and wish them every success in their future endeavors.

For {{company_name}}

Authorized Signatory
Head of HR Operations`,
    mergeTags: [
      '{{employee_name}}',
      '{{employee_id}}',
      '{{tenure_start}}',
      '{{tenure_end}}',
      '{{final_designation}}',
      '{{department}}',
      '{{company_name}}',
      '{{reference_number}}',
    ],
  },
];
