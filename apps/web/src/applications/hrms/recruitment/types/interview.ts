export type InterviewType =
  | 'screening'
  | 'technical'
  | 'system_design'
  | 'managerial'
  | 'cultural_fit'
  | 'hr';

export type InterviewStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'rescheduled'
  | 'cancelled';

export type InterviewRecommendation =
  | 'strong_hire'
  | 'hire'
  | 'lean_hire'
  | 'lean_no_hire'
  | 'no_hire';

export interface ScorecardCriterion {
  id: string;
  name: string;
  score: number; // 1 to 5
  maxScore: number;
  notes?: string;
}

export interface InterviewFeedback {
  interviewerName: string;
  interviewerRole: string;
  submittedAt: string;
  overallScore: number; // 1 to 5
  recommendation: InterviewRecommendation;
  criteria: ScorecardCriterion[];
  strengths: string[];
  areasForImprovement: string[];
  summaryNotes: string;
}

export interface InterviewPanelMember {
  name: string;
  role: string;
  email: string;
  avatarColor?: 'default' | 'blue' | 'pink' | 'purple' | 'amber' | 'green' | 'cyan';
}

export interface InterviewSchedule {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateNumber: string;
  candidateEmail: string;
  candidateAvatarColor?: 'blue' | 'purple' | 'green' | 'pink' | 'amber';
  jobId: string;
  jobTitle: string;
  jobCode: string;
  roundName: string;
  interviewType: InterviewType;
  status: InterviewStatus;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  meetingLink: string;
  panel: InterviewPanelMember[];
  scorecard?: InterviewFeedback;
  rescheduleReason?: string;
  cancellationReason?: string;
}

export interface ScheduleInterviewInput {
  candidateId: string;
  roundName: string;
  interviewType: InterviewType;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  panelNamesRaw: string;
  notes?: string;
}
