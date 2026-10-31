import type { AvatarColor } from '../../../../design-system/components';

export type ConsentStatus =
  'active_consent' | 'consent_expiring_soon' | 'consent_expired' | 'revoked';

export type TalentStatus = 'available' | 'passive' | 'do_not_contact' | 're_engaged';

export type TalentSourceType =
  'silver_medalist' | 'past_applicant' | 'alumni' | 'referral' | 'campus';

export interface EngagementTouchpoint {
  id: string;
  date: string;
  type: 'email' | 'call' | 'invitation' | 'note';
  summary: string;
  contactedBy: string;
}

export interface TalentProfile {
  id: string;
  talentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  avatarColor: AvatarColor;
  primaryRole: string;
  currentCompany: string;
  currentTitle: string;
  location: string;
  experienceYears: number;
  skills: string[];
  previousApplication: {
    jobId: string;
    jobTitle: string;
    appliedDate: string;
    lastStageReached: string;
    notes?: string;
  };
  source: TalentSourceType;
  tags: string[];
  rating: number; // 1-5
  status: TalentStatus;
  consentStatus: ConsentStatus;
  consentExpiryDate: string;
  retentionPolicy: string;
  engagementHistory: EngagementTouchpoint[];
  notes?: string;
}

export interface ReEngageInput {
  talentId: string;
  targetJobId: string;
  fastTrackStage: 'applied' | 'screening' | 'shortlisted' | 'interview';
  outreachChannel: 'email' | 'phone';
  message: string;
}
