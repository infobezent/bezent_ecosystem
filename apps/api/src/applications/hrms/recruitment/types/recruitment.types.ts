import type {
  JobRequisition,
  JobPosting,
  Candidate,
  CandidateApplication,
  RecruitmentStage,
  RecruitmentActivity,
  RecruitmentInterview,
  RecruitmentInterviewInterviewer,
} from '../../../../db/schema.js';

export type RecruitmentWorkplaceType = 'on_site' | 'hybrid' | 'remote';
export type RecruitmentEmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type RecruitmentExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type RequisitionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RequisitionStatus =
  'draft' | 'pending_approval' | 'open' | 'on_hold' | 'filled' | 'closed' | 'cancelled';

export type JobPostingStatus = 'draft' | 'published' | 'paused' | 'closed';

export type CandidateSource =
  'linkedin' | 'career_page' | 'referral' | 'agency' | 'naukri' | 'campus' | 'direct' | 'other';

export type CandidateStatus = 'active' | 'archived' | 'blacklisted';
export type ApplicationStatus = 'active' | 'hired' | 'rejected' | 'withdrawn';

export type RecruitmentActivityType =
  | 'note'
  | 'stage_change'
  | 'status_change'
  | 'recruiter_assigned'
  | 'interview_scheduled'
  | 'interview_rescheduled'
  | 'interview_cancelled'
  | 'interview_completed'
  | 'rejection'
  | 'withdrawal';

export type InterviewType =
  'screening' | 'technical' | 'system_design' | 'managerial' | 'cultural_fit' | 'hr';

export type InterviewStatus =
  'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'cancelled';

export type InterviewRecommendation =
  'strong_hire' | 'hire' | 'lean_hire' | 'lean_no_hire' | 'no_hire';

export type FeedbackStatus = 'pending' | 'submitted';

export type StageType =
  'active' | 'terminal_success' | 'terminal_rejection' | 'terminal_withdrawal';

export interface RecruitmentActorContext {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateJobRequisitionDto {
  jobTitle: string;
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  workplaceType?: RecruitmentWorkplaceType;
  employmentType?: RecruitmentEmploymentType;
  experienceLevel?: RecruitmentExperienceLevel;
  openings?: number;
  description?: string | null;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  hiringManagerId?: string | null;
  recruiterId?: string | null;
  priority?: RequisitionPriority;
  status?: RequisitionStatus;
  targetCloseDate?: string | null;
}

export interface UpdateJobRequisitionDto {
  jobTitle?: string;
  departmentId?: string | null;
  designationId?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  workplaceType?: RecruitmentWorkplaceType;
  employmentType?: RecruitmentEmploymentType;
  experienceLevel?: RecruitmentExperienceLevel;
  openings?: number;
  filledCount?: number;
  description?: string | null;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  hiringManagerId?: string | null;
  recruiterId?: string | null;
  priority?: RequisitionPriority;
  status?: RequisitionStatus;
  targetCloseDate?: string | null;
  closedReason?: string | null;
}

export interface RequisitionFilterQuery {
  page?: number;
  limit?: number;
  status?: RequisitionStatus | 'all';
  departmentId?: string;
  workplaceType?: RecruitmentWorkplaceType;
  search?: string;
}

export interface CreateJobPostingDto {
  requisitionId: string;
  postingCode?: string;
  title: string;
  description: string;
  location: string;
  workplaceType?: RecruitmentWorkplaceType;
  employmentType?: RecruitmentEmploymentType;
  publishedAt?: string | null;
  expiresAt?: string | null;
  status?: JobPostingStatus;
}

export interface UpdateJobPostingDto {
  title?: string;
  description?: string;
  location?: string;
  workplaceType?: RecruitmentWorkplaceType;
  employmentType?: RecruitmentEmploymentType;
  publishedAt?: string | null;
  expiresAt?: string | null;
  status?: JobPostingStatus;
}

export interface CreateCandidateDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  totalExperienceYears?: number;
  relevantExperienceYears?: number;
  noticePeriodDays?: number;
  currentCtcLpa?: number | null;
  expectedCtcLpa?: number | null;
  skills?: string[];
  tags?: string[];
  source?: CandidateSource;
  referredBy?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  summary?: string | null;
}

export interface UpdateCandidateDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  totalExperienceYears?: number;
  relevantExperienceYears?: number;
  noticePeriodDays?: number;
  currentCtcLpa?: number | null;
  expectedCtcLpa?: number | null;
  skills?: string[];
  tags?: string[];
  source?: CandidateSource;
  referredBy?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  summary?: string | null;
  status?: CandidateStatus;
}

export interface CandidateFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: CandidateSource;
  status?: CandidateStatus;
  skill?: string;
}

export interface CreateApplicationDto {
  candidateId: string;
  requisitionId: string;
  jobPostingId?: string | null;
  assignedRecruiterId?: string | null;
  initialStage?: string;
}

export interface ChangeApplicationStageDto {
  stage: string;
  notes?: string;
}

export interface RejectApplicationDto {
  reason: string;
  notes?: string;
}

export interface WithdrawApplicationDto {
  reason?: string;
  notes?: string;
}

export interface AssignRecruiterDto {
  recruiterId: string;
}

export interface ApplicationFilterQuery {
  page?: number;
  limit?: number;
  requisitionId?: string;
  candidateId?: string;
  stage?: string;
  status?: ApplicationStatus;
}

export interface AddActivityNoteDto {
  title?: string;
  content: string;
}

export interface InterviewPanelMemberInput {
  employeeId?: string | null;
  interviewerName: string;
  interviewerEmail?: string | null;
  interviewerRole?: string | null;
}

export interface ScheduleInterviewDto {
  applicationId: string;
  roundName: string;
  interviewType?: InterviewType;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  timezone?: string;
  locationOrLink?: string | null;
  panel: InterviewPanelMemberInput[];
  notes?: string;
}

export interface RescheduleInterviewDto {
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  locationOrLink?: string | null;
  reason: string;
}

export interface CancelInterviewDto {
  reason: string;
}

export interface RecordInterviewFeedbackDto {
  recommendation: InterviewRecommendation;
  score?: number; // 1-5
  notes: string;
}

export interface InterviewFilterQuery {
  page?: number;
  limit?: number;
  applicationId?: string;
  candidateId?: string;
  status?: InterviewStatus;
  scheduledDate?: string;
}

export interface CandidateApplicationDetail extends CandidateApplication {
  candidate?: Candidate | null;
  requisition?: JobRequisition | null;
  posting?: JobPosting | null;
  interviews?: RecruitmentInterviewWithPanel[];
  activities?: RecruitmentActivity[];
}

export interface RecruitmentInterviewWithPanel extends RecruitmentInterview {
  panel?: RecruitmentInterviewInterviewer[];
}
