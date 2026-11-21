export type TemplateCategory = 'forms' | 'emails' | 'letters';

export interface FormTemplateItem {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'published' | 'draft';
  fieldsCount: number;
  sectionsCount: number;
  targetAudience: string;
}

export interface EmailTemplateItem {
  id: string;
  name: string;
  code: string;
  category: 'onboarding' | 'lifecycle' | 'offboarding' | 'career';
  subject: string;
  body: string;
  status: 'published' | 'draft';
  triggerEvent: string;
  mergeTags: string[];
}

export interface LetterFormatItem {
  id: string;
  name: string;
  code: string;
  type:
    | 'offer_letter'
    | 'confirmation_letter'
    | 'promotion_letter'
    | 'transfer_letter'
    | 'experience_letter';
  description: string;
  status: 'published' | 'draft';
  referencePattern: string;
  authorizerRole: string;
  bodyContent: string;
  mergeTags: string[];
}
