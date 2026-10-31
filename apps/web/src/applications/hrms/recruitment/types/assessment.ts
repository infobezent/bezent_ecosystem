export type AssessmentType =
  | 'coding_challenge'
  | 'design_project'
  | 'take_home_assignment'
  | 'aptitude_cognitive'
  | 'domain_case_study';

export type AssessmentStatus =
  'assigned' | 'in_progress' | 'submitted' | 'under_review' | 'evaluated' | 'expired';

export type AssessmentDecision = 'passed' | 'failed' | 'needs_follow_up';

export interface AssessmentCriteriaScore {
  id: string;
  name: string;
  score: number; // 0 - 25 or similar
  maxScore: number;
  notes?: string;
}

export interface AssessmentAssignment {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateNumber: string;
  candidateEmail: string;
  candidateAvatarColor?: 'blue' | 'purple' | 'green' | 'pink' | 'amber';
  jobId: string;
  jobTitle: string;
  jobCode: string;
  title: string;
  type: AssessmentType;
  status: AssessmentStatus;
  platform: string;
  testLink?: string;
  assignedDate: string;
  dueDate: string;
  submittedDate?: string;
  submissionUrl?: string;
  submissionNotes?: string;
  evaluatorName?: string;
  evaluatorRole?: string;
  score?: number; // 0 to 100
  maxScore: number;
  decision?: AssessmentDecision;
  criteriaScores?: AssessmentCriteriaScore[];
  evaluatorFeedback?: string;
  evaluatedDate?: string;
}

export interface AssignAssessmentInput {
  candidateId: string;
  title: string;
  type: AssessmentType;
  platform: string;
  testLink?: string;
  dueDate: string;
  evaluatorName: string;
  evaluatorRole: string;
  instructions?: string;
}
