import type { CandidateStage } from './candidate';

export interface PipelineStageConfig {
  id: CandidateStage;
  label: string;
  description: string;
  badgeVariant: 'neutral' | 'info' | 'warning' | 'success' | 'danger';
  order: number;
  isTerminal?: boolean;
}

export const ACTIVE_PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: 'applied',
    label: 'Applied',
    description: 'New inbound applications awaiting recruiter review',
    badgeVariant: 'neutral',
    order: 1,
  },
  {
    id: 'screening',
    label: 'Screening',
    description: 'Phone screen and qualification check',
    badgeVariant: 'info',
    order: 2,
  },
  {
    id: 'shortlisted',
    label: 'Shortlisted',
    description: 'Hiring manager clearance for interview loop',
    badgeVariant: 'info',
    order: 3,
  },
  {
    id: 'interview',
    label: 'Interview',
    description: 'Active technical and behavioral interview rounds',
    badgeVariant: 'info',
    order: 4,
  },
  {
    id: 'assessment',
    label: 'Assessment',
    description: 'Practical technical or domain evaluation test',
    badgeVariant: 'warning',
    order: 5,
  },
  {
    id: 'selected',
    label: 'Selected',
    description: 'Interview loop cleared, ready for offer generation',
    badgeVariant: 'success',
    order: 6,
  },
  {
    id: 'offer',
    label: 'Offer',
    description: 'Offer letter extended and under review',
    badgeVariant: 'success',
    order: 7,
  },
  {
    id: 'hired',
    label: 'Hired',
    description: 'Offer accepted, ready for Onboarding Handoff',
    badgeVariant: 'success',
    order: 8,
    isTerminal: true,
  },
];

export const TERMINAL_PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    id: 'rejected',
    label: 'Rejected',
    description: 'Candidates not proceeding further for this opening',
    badgeVariant: 'danger',
    order: 9,
    isTerminal: true,
  },
  {
    id: 'withdrawn',
    label: 'Withdrawn',
    description: 'Candidates who withdrew their applications',
    badgeVariant: 'neutral',
    order: 10,
    isTerminal: true,
  },
];
