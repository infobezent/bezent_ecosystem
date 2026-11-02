import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

// -----------------------------------------------------------------------------
// Backend Models & DTO Interfaces
// -----------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BackendJobRequisition {
  id: string;
  tenantId: string;
  companyId: string;
  requisitionNumber: string;
  requisitionCode: string;
  jobTitle: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designationId?: string | null;
  designationName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  workplaceType: 'on_site' | 'hybrid' | 'remote';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  openings: number;
  filledCount: number;
  description?: string | null;
  requirements?: string[];
  responsibilities?: string[];
  skills?: string[];
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: string | null;
  salaryMax?: string | null;
  currency: string;
  hiringManagerId?: string | null;
  hiringManagerName?: string | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'pending_approval' | 'open' | 'on_hold' | 'filled' | 'closed' | 'cancelled';
  targetCloseDate?: string | null;
  closedAt?: string | null;
  closedReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobRequisitionDto {
  jobTitle: string;
  departmentId?: string | null;
  departmentName?: string | null;
  designationId?: string | null;
  designationName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  workplaceType?: 'on_site' | 'hybrid' | 'remote';
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
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
  hiringManagerName?: string | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'draft' | 'open' | 'on_hold' | 'closed';
  targetCloseDate?: string | null;
}

export interface UpdateJobRequisitionDto extends Partial<CreateJobRequisitionDto> {
  closedReason?: string | null;
}

export interface BackendJobPosting {
  id: string;
  tenantId: string;
  companyId: string;
  requisitionId: string;
  postingCode: string;
  title: string;
  description: string;
  location: string;
  workplaceType: 'on_site' | 'hybrid' | 'remote';
  employmentType: 'full_time' | 'part_time' | 'contract' | 'internship';
  publishedAt?: string | null;
  expiresAt?: string | null;
  status: 'draft' | 'published' | 'paused' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPostingDto {
  requisitionId: string;
  postingCode?: string;
  title: string;
  description: string;
  location: string;
  workplaceType?: 'on_site' | 'hybrid' | 'remote';
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship';
  publishedAt?: string | null;
  expiresAt?: string | null;
  status?: 'draft' | 'published' | 'paused' | 'closed';
}

export interface BackendCandidate {
  id: string;
  tenantId: string;
  candidateNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  currentCompany?: string | null;
  currentDesignation?: string | null;
  totalExperienceYears: number;
  relevantExperienceYears: number;
  noticePeriodDays: number;
  currentCtcLpa?: string | null;
  expectedCtcLpa?: string | null;
  skills?: string[];
  tags?: string[];
  source?: string;
  referredBy?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  summary?: string | null;
  status: 'active' | 'archived' | 'blacklisted';
  createdAt: string;
  updatedAt: string;
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
  source?: string;
  referredBy?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  summary?: string | null;
}

export interface UpdateCandidateDto extends Partial<CreateCandidateDto> {
  status?: 'active' | 'archived' | 'blacklisted';
}

export interface BackendApplication {
  id: string;
  tenantId: string;
  companyId: string;
  applicationNumber: string;
  candidateId: string;
  requisitionId: string;
  jobPostingId?: string | null;
  currentStageId?: string | null;
  stage: string;
  status: 'active' | 'hired' | 'rejected' | 'withdrawn';
  rating: number;
  rejectionReason?: string | null;
  appliedAt: string;
  hiredAt?: string | null;
  rejectedAt?: string | null;
  withdrawnAt?: string | null;
  assignedRecruiterId?: string | null;
  candidate?: BackendCandidate | null;
  requisition?: BackendJobRequisition | null;
  posting?: BackendJobPosting | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationDto {
  candidateId: string;
  requisitionId: string;
  jobPostingId?: string | null;
  assignedRecruiterId?: string | null;
  initialStage?: string;
}

export interface BackendInterviewInterviewer {
  id: string;
  interviewId: string;
  employeeId?: string | null;
  interviewerName: string;
  interviewerEmail?: string | null;
  interviewerRole?: string | null;
}

export interface BackendInterview {
  id: string;
  tenantId: string;
  companyId: string;
  interviewNumber: string;
  applicationId: string;
  roundName: string;
  interviewType: 'screening' | 'technical' | 'system_design' | 'managerial' | 'cultural_fit' | 'hr';
  status: 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'cancelled';
  scheduledDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  timezone?: string;
  locationOrLink?: string | null;
  rescheduleReason?: string | null;
  cancellationReason?: string | null;
  feedbackStatus?: 'pending' | 'submitted';
  feedbackRecommendation?: 'strong_hire' | 'hire' | 'lean_hire' | 'lean_no_hire' | 'no_hire' | null;
  feedbackScore?: number | null;
  feedbackNotes?: string | null;
  feedbackSubmittedAt?: string | null;
  panel?: BackendInterviewInterviewer[];
  application?: BackendApplication | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInterviewDto {
  applicationId: string;
  roundName: string;
  interviewType?: 'screening' | 'technical' | 'system_design' | 'managerial' | 'cultural_fit' | 'hr';
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  locationOrLink?: string | null;
  panel: Array<{
    employeeId?: string | null;
    interviewerName: string;
    interviewerEmail?: string | null;
    interviewerRole?: string | null;
  }>;
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

export interface RecordInterviewFeedbackDto {
  recommendation: 'strong_hire' | 'hire' | 'lean_hire' | 'lean_no_hire' | 'no_hire';
  score?: number;
  notes: string;
}

export interface BackendStage {
  id: string;
  code: string;
  name: string;
  stageType: 'active' | 'terminal_success' | 'terminal_rejection' | 'terminal_withdrawal';
  displayOrder: number;
  isSystem: boolean;
}

export interface BackendActivity {
  id: string;
  applicationId: string;
  candidateId: string;
  actorUserId?: string | null;
  actorName: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
}

// -----------------------------------------------------------------------------
// Helper Handler
// -----------------------------------------------------------------------------

async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    const message = errorJson.error?.message || defaultErrorMsg;
    throw new Error(message);
  }
  const json = await res.json();
  return json.data as T;
}

const API_BASE = `${appConfig.apiBaseUrl}/hrms/recruitment`;

// -----------------------------------------------------------------------------
// API Client Methods
// -----------------------------------------------------------------------------

// Pipeline Stages
export async function fetchRecruitmentStages(): Promise<BackendStage[]> {
  const res = await authorizedFetch(`${API_BASE}/stages`);
  return handleResponse<BackendStage[]>(res, 'Failed to fetch recruitment stages');
}

// Job Requisitions
export async function fetchJobRequisitions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  departmentId?: string;
  workplaceType?: string;
  search?: string;
}): Promise<PaginatedResponse<BackendJobRequisition>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.departmentId && params.departmentId !== 'all') query.set('departmentId', params.departmentId);
  if (params?.workplaceType && params.workplaceType !== 'all') query.set('workplaceType', params.workplaceType);
  if (params?.search) query.set('search', params.search);

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/requisitions${qs ? `?${qs}` : ''}`);
  return handleResponse<PaginatedResponse<BackendJobRequisition>>(res, 'Failed to fetch job requisitions');
}

export async function fetchJobRequisitionById(id: string): Promise<BackendJobRequisition> {
  const res = await authorizedFetch(`${API_BASE}/requisitions/${encodeURIComponent(id)}`);
  return handleResponse<BackendJobRequisition>(res, 'Failed to fetch requisition details');
}

export async function createJobRequisition(dto: CreateJobRequisitionDto): Promise<BackendJobRequisition> {
  const res = await authorizedFetch(`${API_BASE}/requisitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendJobRequisition>(res, 'Failed to create job requisition');
}

export async function updateJobRequisition(id: string, dto: UpdateJobRequisitionDto): Promise<BackendJobRequisition> {
  const res = await authorizedFetch(`${API_BASE}/requisitions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendJobRequisition>(res, 'Failed to update job requisition');
}

export async function closeJobRequisition(id: string, reason?: string): Promise<BackendJobRequisition> {
  const res = await authorizedFetch(`${API_BASE}/requisitions/${encodeURIComponent(id)}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason || 'Requisition closed' }),
  });
  return handleResponse<BackendJobRequisition>(res, 'Failed to close job requisition');
}

// Job Postings
export async function fetchJobPostings(params?: {
  page?: number;
  limit?: number;
  status?: string;
  requisitionId?: string;
}): Promise<PaginatedResponse<BackendJobPosting>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.requisitionId) query.set('requisitionId', params.requisitionId);

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/postings${qs ? `?${qs}` : ''}`);
  return handleResponse<PaginatedResponse<BackendJobPosting>>(res, 'Failed to fetch job postings');
}

export async function createJobPosting(dto: CreateJobPostingDto): Promise<BackendJobPosting> {
  const res = await authorizedFetch(`${API_BASE}/postings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendJobPosting>(res, 'Failed to create job posting');
}

export async function publishJobPosting(id: string): Promise<BackendJobPosting> {
  const res = await authorizedFetch(`${API_BASE}/postings/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
  });
  return handleResponse<BackendJobPosting>(res, 'Failed to publish job posting');
}

export async function closeJobPosting(id: string): Promise<BackendJobPosting> {
  const res = await authorizedFetch(`${API_BASE}/postings/${encodeURIComponent(id)}/close`, {
    method: 'POST',
  });
  return handleResponse<BackendJobPosting>(res, 'Failed to close job posting');
}

// Candidates
export async function fetchCandidates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  status?: string;
  skill?: string;
}): Promise<PaginatedResponse<BackendCandidate>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.source && params.source !== 'all') query.set('source', params.source);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.skill) query.set('skill', params.skill);

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/candidates${qs ? `?${qs}` : ''}`);
  return handleResponse<PaginatedResponse<BackendCandidate>>(res, 'Failed to fetch candidates');
}

export async function fetchCandidateById(id: string): Promise<BackendCandidate> {
  const res = await authorizedFetch(`${API_BASE}/candidates/${encodeURIComponent(id)}`);
  return handleResponse<BackendCandidate>(res, 'Failed to fetch candidate details');
}

export async function createCandidate(dto: CreateCandidateDto): Promise<BackendCandidate> {
  const res = await authorizedFetch(`${API_BASE}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendCandidate>(res, 'Failed to create candidate');
}

export async function updateCandidate(id: string, dto: UpdateCandidateDto): Promise<BackendCandidate> {
  const res = await authorizedFetch(`${API_BASE}/candidates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendCandidate>(res, 'Failed to update candidate');
}

// Candidate Applications
export async function fetchApplications(params?: {
  page?: number;
  limit?: number;
  requisitionId?: string;
  candidateId?: string;
  stage?: string;
  status?: string;
}): Promise<PaginatedResponse<BackendApplication>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.requisitionId && params.requisitionId !== 'all') query.set('requisitionId', params.requisitionId);
  if (params?.candidateId) query.set('candidateId', params.candidateId);
  if (params?.stage && params.stage !== 'all') query.set('stage', params.stage);
  if (params?.status && params.status !== 'all') query.set('status', params.status);

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/applications${qs ? `?${qs}` : ''}`);
  return handleResponse<PaginatedResponse<BackendApplication>>(res, 'Failed to fetch candidate applications');
}

export async function fetchApplicationById(id: string): Promise<BackendApplication> {
  const res = await authorizedFetch(`${API_BASE}/applications/${encodeURIComponent(id)}`);
  return handleResponse<BackendApplication>(res, 'Failed to fetch application details');
}

export async function createApplication(dto: CreateApplicationDto): Promise<BackendApplication> {
  const res = await authorizedFetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendApplication>(res, 'Failed to create application');
}

export async function changeApplicationStage(
  id: string,
  stage: string,
  notes?: string,
): Promise<BackendApplication> {
  const res = await authorizedFetch(`${API_BASE}/applications/${encodeURIComponent(id)}/stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, notes }),
  });
  return handleResponse<BackendApplication>(res, 'Failed to change application stage');
}

export async function rejectApplication(
  id: string,
  reason: string,
  notes?: string,
): Promise<BackendApplication> {
  const res = await authorizedFetch(`${API_BASE}/applications/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, notes }),
  });
  return handleResponse<BackendApplication>(res, 'Failed to reject application');
}

export async function withdrawApplication(
  id: string,
  reason?: string,
  notes?: string,
): Promise<BackendApplication> {
  const res = await authorizedFetch(`${API_BASE}/applications/${encodeURIComponent(id)}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, notes }),
  });
  return handleResponse<BackendApplication>(res, 'Failed to withdraw application');
}

export async function assignRecruiter(
  id: string,
  recruiterId: string,
): Promise<BackendApplication> {
  const res = await authorizedFetch(`${API_BASE}/applications/${encodeURIComponent(id)}/recruiter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recruiterId }),
  });
  return handleResponse<BackendApplication>(res, 'Failed to assign recruiter');
}

export async function addApplicationNote(
  applicationId: string,
  content: string,
  title?: string,
): Promise<BackendActivity> {
  const res = await authorizedFetch(
    `${API_BASE}/applications/${encodeURIComponent(applicationId)}/notes`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }),
    },
  );
  return handleResponse<BackendActivity>(res, 'Failed to add application note');
}

export async function fetchApplicationActivities(
  applicationId: string,
): Promise<BackendActivity[]> {
  const res = await authorizedFetch(
    `${API_BASE}/applications/${encodeURIComponent(applicationId)}/activities`,
  );
  return handleResponse<BackendActivity[]>(res, 'Failed to fetch application activities');
}

// Interviews
export async function fetchInterviews(params?: {
  page?: number;
  limit?: number;
  applicationId?: string;
  candidateId?: string;
  status?: string;
  scheduledDate?: string;
}): Promise<PaginatedResponse<BackendInterview>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.applicationId) query.set('applicationId', params.applicationId);
  if (params?.candidateId) query.set('candidateId', params.candidateId);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.scheduledDate) query.set('scheduledDate', params.scheduledDate);

  const qs = query.toString();
  const res = await authorizedFetch(`${API_BASE}/interviews${qs ? `?${qs}` : ''}`);
  return handleResponse<PaginatedResponse<BackendInterview>>(res, 'Failed to fetch interviews');
}

export async function fetchInterviewById(id: string): Promise<BackendInterview> {
  const res = await authorizedFetch(`${API_BASE}/interviews/${encodeURIComponent(id)}`);
  return handleResponse<BackendInterview>(res, 'Failed to fetch interview details');
}

export async function scheduleInterview(dto: ScheduleInterviewDto): Promise<BackendInterview> {
  const res = await authorizedFetch(`${API_BASE}/interviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendInterview>(res, 'Failed to schedule interview');
}

export async function rescheduleInterview(
  id: string,
  dto: RescheduleInterviewDto,
): Promise<BackendInterview> {
  const res = await authorizedFetch(`${API_BASE}/interviews/${encodeURIComponent(id)}/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendInterview>(res, 'Failed to reschedule interview');
}

export async function cancelInterview(id: string, reason: string): Promise<BackendInterview> {
  const res = await authorizedFetch(`${API_BASE}/interviews/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<BackendInterview>(res, 'Failed to cancel interview');
}

export async function recordInterviewFeedback(
  id: string,
  dto: RecordInterviewFeedbackDto,
): Promise<BackendInterview> {
  const res = await authorizedFetch(`${API_BASE}/interviews/${encodeURIComponent(id)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return handleResponse<BackendInterview>(res, 'Failed to record interview feedback');
}
