import { ValidationError } from '../../../../app/errors/AppError.js';
import type {
  CreateJobRequisitionDto,
  UpdateJobRequisitionDto,
  CreateJobPostingDto,
  UpdateJobPostingDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  CreateApplicationDto,
  ChangeApplicationStageDto,
  RejectApplicationDto,
  WithdrawApplicationDto,
  ScheduleInterviewDto,
  RescheduleInterviewDto,
  CancelInterviewDto,
  RecordInterviewFeedbackDto,
  RecruitmentWorkplaceType,
  RecruitmentEmploymentType,
  RecruitmentExperienceLevel,
  RequisitionPriority,
  RequisitionStatus,
  JobPostingStatus,
  CandidateSource,
  CandidateStatus,
  InterviewType,
  InterviewRecommendation,
} from '../types/recruitment.types.js';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const VALID_WORKPLACE_TYPES: RecruitmentWorkplaceType[] = ['on_site', 'hybrid', 'remote'];
export const VALID_EMPLOYMENT_TYPES: RecruitmentEmploymentType[] = [
  'full_time',
  'part_time',
  'contract',
  'internship',
];
export const VALID_EXPERIENCE_LEVELS: RecruitmentExperienceLevel[] = [
  'entry',
  'mid',
  'senior',
  'lead',
  'executive',
];
export const VALID_REQUISITION_PRIORITIES: RequisitionPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
];
export const VALID_REQUISITION_STATUSES: RequisitionStatus[] = [
  'draft',
  'pending_approval',
  'open',
  'on_hold',
  'filled',
  'closed',
  'cancelled',
];
export const VALID_POSTING_STATUSES: JobPostingStatus[] = [
  'draft',
  'published',
  'paused',
  'closed',
];
export const VALID_CANDIDATE_SOURCES: CandidateSource[] = [
  'linkedin',
  'career_page',
  'referral',
  'agency',
  'naukri',
  'campus',
  'direct',
  'other',
];
export const VALID_CANDIDATE_STATUSES: CandidateStatus[] = ['active', 'archived', 'blacklisted'];
export const VALID_INTERVIEW_TYPES: InterviewType[] = [
  'screening',
  'technical',
  'system_design',
  'managerial',
  'cultural_fit',
  'hr',
];
export const VALID_INTERVIEW_RECOMMENDATIONS: InterviewRecommendation[] = [
  'strong_hire',
  'hire',
  'lean_hire',
  'lean_no_hire',
  'no_hire',
];

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function validateCreateJobRequisition(input: unknown): CreateJobRequisitionDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (!input.jobTitle || typeof input.jobTitle !== 'string' || !input.jobTitle.trim()) {
    errors.jobTitle = 'Job title is required';
  }

  if (
    input.workplaceType !== undefined &&
    !VALID_WORKPLACE_TYPES.includes(input.workplaceType as RecruitmentWorkplaceType)
  ) {
    errors.workplaceType = `Workplace type must be one of: ${VALID_WORKPLACE_TYPES.join(', ')}`;
  }

  if (
    input.employmentType !== undefined &&
    !VALID_EMPLOYMENT_TYPES.includes(input.employmentType as RecruitmentEmploymentType)
  ) {
    errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
  }

  if (
    input.experienceLevel !== undefined &&
    !VALID_EXPERIENCE_LEVELS.includes(input.experienceLevel as RecruitmentExperienceLevel)
  ) {
    errors.experienceLevel = `Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}`;
  }

  if (input.openings !== undefined) {
    const openings = Number(input.openings);
    if (isNaN(openings) || openings < 1 || !Number.isInteger(openings)) {
      errors.openings = 'Openings must be a positive integer';
    }
  }

  if (input.salaryMin !== undefined && input.salaryMin !== null) {
    const min = Number(input.salaryMin);
    if (isNaN(min) || min < 0) {
      errors.salaryMin = 'Salary min must be non-negative';
    }
  }

  if (input.salaryMax !== undefined && input.salaryMax !== null) {
    const max = Number(input.salaryMax);
    if (isNaN(max) || max < 0) {
      errors.salaryMax = 'Salary max must be non-negative';
    }
  }

  if (
    input.salaryMin !== undefined &&
    input.salaryMin !== null &&
    input.salaryMax !== undefined &&
    input.salaryMax !== null
  ) {
    if (Number(input.salaryMax) < Number(input.salaryMin)) {
      errors.salaryMax = 'Salary max cannot be less than salary min';
    }
  }

  if (input.targetCloseDate) {
    if (
      typeof input.targetCloseDate !== 'string' ||
      !DATE_REGEX.test(input.targetCloseDate.trim())
    ) {
      errors.targetCloseDate = 'Target close date must be in YYYY-MM-DD format';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    jobTitle: (input.jobTitle as string).trim(),
    departmentId: input.departmentId ? String(input.departmentId).trim() : null,
    designationId: input.designationId ? String(input.designationId).trim() : null,
    locationId: input.locationId ? String(input.locationId).trim() : null,
    locationName: input.locationName ? String(input.locationName).trim() : null,
    workplaceType: (input.workplaceType as RecruitmentWorkplaceType) ?? 'on_site',
    employmentType: (input.employmentType as RecruitmentEmploymentType) ?? 'full_time',
    experienceLevel: (input.experienceLevel as RecruitmentExperienceLevel) ?? 'mid',
    openings: input.openings !== undefined ? Number(input.openings) : 1,
    description: input.description ? String(input.description).trim() : null,
    requirements: Array.isArray(input.requirements) ? input.requirements.map(String) : [],
    responsibilities: Array.isArray(input.responsibilities)
      ? input.responsibilities.map(String)
      : [],
    skills: Array.isArray(input.skills) ? input.skills.map(String) : [],
    experienceMin:
      input.experienceMin !== undefined && input.experienceMin !== null
        ? Number(input.experienceMin)
        : null,
    experienceMax:
      input.experienceMax !== undefined && input.experienceMax !== null
        ? Number(input.experienceMax)
        : null,
    salaryMin:
      input.salaryMin !== undefined && input.salaryMin !== null ? Number(input.salaryMin) : null,
    salaryMax:
      input.salaryMax !== undefined && input.salaryMax !== null ? Number(input.salaryMax) : null,
    currency: input.currency ? String(input.currency).trim().toUpperCase() : 'INR',
    hiringManagerId: input.hiringManagerId ? String(input.hiringManagerId).trim() : null,
    recruiterId: input.recruiterId ? String(input.recruiterId).trim() : null,
    priority: (input.priority as RequisitionPriority) ?? 'medium',
    status: (input.status as RequisitionStatus) ?? 'draft',
    targetCloseDate: input.targetCloseDate ? String(input.targetCloseDate).trim() : null,
  };
}

export function validateUpdateJobRequisition(input: unknown): UpdateJobRequisitionDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (input.jobTitle !== undefined) {
    if (typeof input.jobTitle !== 'string' || !input.jobTitle.trim()) {
      errors.jobTitle = 'Job title cannot be empty';
    }
  }

  if (
    input.workplaceType !== undefined &&
    !VALID_WORKPLACE_TYPES.includes(input.workplaceType as RecruitmentWorkplaceType)
  ) {
    errors.workplaceType = `Workplace type must be one of: ${VALID_WORKPLACE_TYPES.join(', ')}`;
  }

  if (
    input.employmentType !== undefined &&
    !VALID_EMPLOYMENT_TYPES.includes(input.employmentType as RecruitmentEmploymentType)
  ) {
    errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
  }

  if (
    input.experienceLevel !== undefined &&
    !VALID_EXPERIENCE_LEVELS.includes(input.experienceLevel as RecruitmentExperienceLevel)
  ) {
    errors.experienceLevel = `Experience level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}`;
  }

  if (
    input.priority !== undefined &&
    !VALID_REQUISITION_PRIORITIES.includes(input.priority as RequisitionPriority)
  ) {
    errors.priority = `Priority must be one of: ${VALID_REQUISITION_PRIORITIES.join(', ')}`;
  }

  if (
    input.status !== undefined &&
    !VALID_REQUISITION_STATUSES.includes(input.status as RequisitionStatus)
  ) {
    errors.status = `Status must be one of: ${VALID_REQUISITION_STATUSES.join(', ')}`;
  }

  if (input.openings !== undefined) {
    const openings = Number(input.openings);
    if (isNaN(openings) || openings < 1 || !Number.isInteger(openings)) {
      errors.openings = 'Openings must be a positive integer';
    }
  }

  if (input.targetCloseDate) {
    if (
      typeof input.targetCloseDate !== 'string' ||
      !DATE_REGEX.test(input.targetCloseDate.trim())
    ) {
      errors.targetCloseDate = 'Target close date must be in YYYY-MM-DD format';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  const dto: UpdateJobRequisitionDto = {};
  if (input.jobTitle !== undefined) dto.jobTitle = String(input.jobTitle).trim();
  if (input.departmentId !== undefined)
    dto.departmentId = input.departmentId ? String(input.departmentId).trim() : null;
  if (input.designationId !== undefined)
    dto.designationId = input.designationId ? String(input.designationId).trim() : null;
  if (input.locationId !== undefined)
    dto.locationId = input.locationId ? String(input.locationId).trim() : null;
  if (input.locationName !== undefined)
    dto.locationName = input.locationName ? String(input.locationName).trim() : null;
  if (input.workplaceType !== undefined)
    dto.workplaceType = input.workplaceType as RecruitmentWorkplaceType;
  if (input.employmentType !== undefined)
    dto.employmentType = input.employmentType as RecruitmentEmploymentType;
  if (input.experienceLevel !== undefined)
    dto.experienceLevel = input.experienceLevel as RecruitmentExperienceLevel;
  if (input.openings !== undefined) dto.openings = Number(input.openings);
  if (input.filledCount !== undefined) dto.filledCount = Number(input.filledCount);
  if (input.description !== undefined)
    dto.description = input.description ? String(input.description).trim() : null;
  if (Array.isArray(input.requirements)) dto.requirements = input.requirements.map(String);
  if (Array.isArray(input.responsibilities))
    dto.responsibilities = input.responsibilities.map(String);
  if (Array.isArray(input.skills)) dto.skills = input.skills.map(String);
  if (input.experienceMin !== undefined)
    dto.experienceMin = input.experienceMin !== null ? Number(input.experienceMin) : null;
  if (input.experienceMax !== undefined)
    dto.experienceMax = input.experienceMax !== null ? Number(input.experienceMax) : null;
  if (input.salaryMin !== undefined)
    dto.salaryMin = input.salaryMin !== null ? Number(input.salaryMin) : null;
  if (input.salaryMax !== undefined)
    dto.salaryMax = input.salaryMax !== null ? Number(input.salaryMax) : null;
  if (input.currency !== undefined) dto.currency = String(input.currency).trim().toUpperCase();
  if (input.hiringManagerId !== undefined)
    dto.hiringManagerId = input.hiringManagerId ? String(input.hiringManagerId).trim() : null;
  if (input.recruiterId !== undefined)
    dto.recruiterId = input.recruiterId ? String(input.recruiterId).trim() : null;
  if (input.priority !== undefined) dto.priority = input.priority as RequisitionPriority;
  if (input.status !== undefined) dto.status = input.status as RequisitionStatus;
  if (input.targetCloseDate !== undefined)
    dto.targetCloseDate = input.targetCloseDate ? String(input.targetCloseDate).trim() : null;
  if (input.closedReason !== undefined)
    dto.closedReason = input.closedReason ? String(input.closedReason).trim() : null;

  return dto;
}

export function validateCreateJobPosting(input: unknown): CreateJobPostingDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (
    !input.requisitionId ||
    typeof input.requisitionId !== 'string' ||
    !input.requisitionId.trim()
  ) {
    errors.requisitionId = 'Requisition ID is required';
  }

  if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
    errors.title = 'Title is required';
  }

  if (!input.description || typeof input.description !== 'string' || !input.description.trim()) {
    errors.description = 'Description is required';
  }

  if (!input.location || typeof input.location !== 'string' || !input.location.trim()) {
    errors.location = 'Location is required';
  }

  if (
    input.workplaceType !== undefined &&
    !VALID_WORKPLACE_TYPES.includes(input.workplaceType as RecruitmentWorkplaceType)
  ) {
    errors.workplaceType = `Workplace type must be one of: ${VALID_WORKPLACE_TYPES.join(', ')}`;
  }

  if (
    input.employmentType !== undefined &&
    !VALID_EMPLOYMENT_TYPES.includes(input.employmentType as RecruitmentEmploymentType)
  ) {
    errors.employmentType = `Employment type must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`;
  }

  if (
    input.status !== undefined &&
    !VALID_POSTING_STATUSES.includes(input.status as JobPostingStatus)
  ) {
    errors.status = `Status must be one of: ${VALID_POSTING_STATUSES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    requisitionId: String(input.requisitionId).trim(),
    postingCode: input.postingCode ? String(input.postingCode).trim() : undefined,
    title: String(input.title).trim(),
    description: String(input.description).trim(),
    location: String(input.location).trim(),
    workplaceType: (input.workplaceType as RecruitmentWorkplaceType) ?? 'on_site',
    employmentType: (input.employmentType as RecruitmentEmploymentType) ?? 'full_time',
    publishedAt: input.publishedAt ? String(input.publishedAt) : null,
    expiresAt: input.expiresAt ? String(input.expiresAt) : null,
    status: (input.status as JobPostingStatus) ?? 'draft',
  };
}

export function validateCreateCandidate(input: unknown): CreateCandidateDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (!input.firstName || typeof input.firstName !== 'string' || !input.firstName.trim()) {
    errors.firstName = 'First name is required';
  }

  if (!input.lastName || typeof input.lastName !== 'string' || !input.lastName.trim()) {
    errors.lastName = 'Last name is required';
  }

  if (!input.email || typeof input.email !== 'string' || !EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Valid email is required';
  }

  if (
    input.source !== undefined &&
    !VALID_CANDIDATE_SOURCES.includes(input.source as CandidateSource)
  ) {
    errors.source = `Source must be one of: ${VALID_CANDIDATE_SOURCES.join(', ')}`;
  }

  if (input.totalExperienceYears !== undefined && input.totalExperienceYears !== null) {
    const exp = Number(input.totalExperienceYears);
    if (isNaN(exp) || exp < 0) {
      errors.totalExperienceYears = 'Total experience years must be non-negative';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    firstName: String(input.firstName).trim(),
    lastName: String(input.lastName).trim(),
    email: String(input.email).trim().toLowerCase(),
    phone: input.phone ? String(input.phone).trim() : null,
    location: input.location ? String(input.location).trim() : null,
    currentCompany: input.currentCompany ? String(input.currentCompany).trim() : null,
    currentDesignation: input.currentDesignation ? String(input.currentDesignation).trim() : null,
    totalExperienceYears:
      input.totalExperienceYears !== undefined && input.totalExperienceYears !== null
        ? Number(input.totalExperienceYears)
        : 0,
    relevantExperienceYears:
      input.relevantExperienceYears !== undefined && input.relevantExperienceYears !== null
        ? Number(input.relevantExperienceYears)
        : 0,
    noticePeriodDays: input.noticePeriodDays ? Number(input.noticePeriodDays) : 0,
    currentCtcLpa:
      input.currentCtcLpa !== undefined && input.currentCtcLpa !== null
        ? Number(input.currentCtcLpa)
        : null,
    expectedCtcLpa:
      input.expectedCtcLpa !== undefined && input.expectedCtcLpa !== null
        ? Number(input.expectedCtcLpa)
        : null,
    skills: Array.isArray(input.skills) ? input.skills.map(String) : [],
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    source: (input.source as CandidateSource) ?? 'direct',
    referredBy: input.referredBy ? String(input.referredBy).trim() : null,
    resumeUrl: input.resumeUrl ? String(input.resumeUrl).trim() : null,
    resumeFileName: input.resumeFileName ? String(input.resumeFileName).trim() : null,
    summary: input.summary ? String(input.summary).trim() : null,
  };
}

export function validateUpdateCandidate(input: unknown): UpdateCandidateDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (input.email !== undefined) {
    if (typeof input.email !== 'string' || !EMAIL_REGEX.test(input.email.trim())) {
      errors.email = 'Valid email is required';
    }
  }

  if (
    input.source !== undefined &&
    !VALID_CANDIDATE_SOURCES.includes(input.source as CandidateSource)
  ) {
    errors.source = `Source must be one of: ${VALID_CANDIDATE_SOURCES.join(', ')}`;
  }

  if (
    input.status !== undefined &&
    !VALID_CANDIDATE_STATUSES.includes(input.status as CandidateStatus)
  ) {
    errors.status = `Status must be one of: ${VALID_CANDIDATE_STATUSES.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  const dto: UpdateCandidateDto = {};
  if (input.firstName !== undefined) dto.firstName = String(input.firstName).trim();
  if (input.lastName !== undefined) dto.lastName = String(input.lastName).trim();
  if (input.email !== undefined) dto.email = String(input.email).trim().toLowerCase();
  if (input.phone !== undefined) dto.phone = input.phone ? String(input.phone).trim() : null;
  if (input.location !== undefined)
    dto.location = input.location ? String(input.location).trim() : null;
  if (input.currentCompany !== undefined)
    dto.currentCompany = input.currentCompany ? String(input.currentCompany).trim() : null;
  if (input.currentDesignation !== undefined)
    dto.currentDesignation = input.currentDesignation
      ? String(input.currentDesignation).trim()
      : null;
  if (input.totalExperienceYears !== undefined)
    dto.totalExperienceYears =
      input.totalExperienceYears !== null ? Number(input.totalExperienceYears) : 0;
  if (input.relevantExperienceYears !== undefined)
    dto.relevantExperienceYears =
      input.relevantExperienceYears !== null ? Number(input.relevantExperienceYears) : 0;
  if (input.noticePeriodDays !== undefined)
    dto.noticePeriodDays = input.noticePeriodDays !== null ? Number(input.noticePeriodDays) : 0;
  if (input.currentCtcLpa !== undefined)
    dto.currentCtcLpa = input.currentCtcLpa !== null ? Number(input.currentCtcLpa) : null;
  if (input.expectedCtcLpa !== undefined)
    dto.expectedCtcLpa = input.expectedCtcLpa !== null ? Number(input.expectedCtcLpa) : null;
  if (Array.isArray(input.skills)) dto.skills = input.skills.map(String);
  if (Array.isArray(input.tags)) dto.tags = input.tags.map(String);
  if (input.source !== undefined) dto.source = input.source as CandidateSource;
  if (input.referredBy !== undefined)
    dto.referredBy = input.referredBy ? String(input.referredBy).trim() : null;
  if (input.resumeUrl !== undefined)
    dto.resumeUrl = input.resumeUrl ? String(input.resumeUrl).trim() : null;
  if (input.resumeFileName !== undefined)
    dto.resumeFileName = input.resumeFileName ? String(input.resumeFileName).trim() : null;
  if (input.summary !== undefined)
    dto.summary = input.summary ? String(input.summary).trim() : null;
  if (input.status !== undefined) dto.status = input.status as CandidateStatus;

  return dto;
}

export function validateCreateApplication(input: unknown): CreateApplicationDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (!input.candidateId || typeof input.candidateId !== 'string' || !input.candidateId.trim()) {
    errors.candidateId = 'Candidate ID is required';
  }

  if (
    !input.requisitionId ||
    typeof input.requisitionId !== 'string' ||
    !input.requisitionId.trim()
  ) {
    errors.requisitionId = 'Requisition ID is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    candidateId: String(input.candidateId).trim(),
    requisitionId: String(input.requisitionId).trim(),
    jobPostingId: input.jobPostingId ? String(input.jobPostingId).trim() : null,
    assignedRecruiterId: input.assignedRecruiterId
      ? String(input.assignedRecruiterId).trim()
      : null,
    initialStage: input.initialStage ? String(input.initialStage).trim() : 'applied',
  };
}

export function validateScheduleInterview(input: unknown): ScheduleInterviewDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (
    !input.applicationId ||
    typeof input.applicationId !== 'string' ||
    !input.applicationId.trim()
  ) {
    errors.applicationId = 'Application ID is required';
  }

  if (!input.roundName || typeof input.roundName !== 'string' || !input.roundName.trim()) {
    errors.roundName = 'Round name is required';
  }

  if (
    !input.scheduledDate ||
    typeof input.scheduledDate !== 'string' ||
    !DATE_REGEX.test(input.scheduledDate.trim())
  ) {
    errors.scheduledDate = 'Scheduled date is required and must be in YYYY-MM-DD format';
  }

  if (
    !input.startTime ||
    typeof input.startTime !== 'string' ||
    !TIME_REGEX.test(input.startTime.trim())
  ) {
    errors.startTime = 'Start time is required and must be in HH:MM format';
  }

  if (
    !input.endTime ||
    typeof input.endTime !== 'string' ||
    !TIME_REGEX.test(input.endTime.trim())
  ) {
    errors.endTime = 'End time is required and must be in HH:MM format';
  }

  if (
    input.startTime &&
    input.endTime &&
    TIME_REGEX.test(String(input.startTime)) &&
    TIME_REGEX.test(String(input.endTime))
  ) {
    if (String(input.endTime) <= String(input.startTime)) {
      errors.endTime = 'Interview end time must be after start time';
    }
  }

  if (
    input.interviewType !== undefined &&
    !VALID_INTERVIEW_TYPES.includes(input.interviewType as InterviewType)
  ) {
    errors.interviewType = `Interview type must be one of: ${VALID_INTERVIEW_TYPES.join(', ')}`;
  }

  if (!Array.isArray(input.panel) || input.panel.length === 0) {
    errors.panel = 'At least one interviewer panel member is required';
  } else {
    for (let i = 0; i < input.panel.length; i++) {
      const p = input.panel[i];
      if (!isObject(p) || !p.interviewerName || typeof p.interviewerName !== 'string') {
        errors[`panel[${i}]`] = 'Interviewer name is required for all panel members';
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    applicationId: String(input.applicationId).trim(),
    roundName: String(input.roundName).trim(),
    interviewType: (input.interviewType as InterviewType) ?? 'technical',
    scheduledDate: String(input.scheduledDate).trim(),
    startTime: String(input.startTime).trim(),
    endTime: String(input.endTime).trim(),
    timezone: input.timezone ? String(input.timezone).trim() : 'Asia/Kolkata',
    locationOrLink: input.locationOrLink ? String(input.locationOrLink).trim() : null,
    panel: (input.panel as Array<Record<string, unknown>>).map((p) => ({
      employeeId: p.employeeId ? String(p.employeeId).trim() : null,
      interviewerName: String(p.interviewerName).trim(),
      interviewerEmail: p.interviewerEmail ? String(p.interviewerEmail).trim() : null,
      interviewerRole: p.interviewerRole ? String(p.interviewerRole).trim() : null,
    })),
    notes: input.notes ? String(input.notes).trim() : undefined,
  };
}

export function validateRescheduleInterview(input: unknown): RescheduleInterviewDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (
    !input.scheduledDate ||
    typeof input.scheduledDate !== 'string' ||
    !DATE_REGEX.test(input.scheduledDate.trim())
  ) {
    errors.scheduledDate = 'Scheduled date must be in YYYY-MM-DD format';
  }

  if (
    !input.startTime ||
    typeof input.startTime !== 'string' ||
    !TIME_REGEX.test(input.startTime.trim())
  ) {
    errors.startTime = 'Start time must be in HH:MM format';
  }

  if (
    !input.endTime ||
    typeof input.endTime !== 'string' ||
    !TIME_REGEX.test(input.endTime.trim())
  ) {
    errors.endTime = 'End time must be in HH:MM format';
  }

  if (
    input.startTime &&
    input.endTime &&
    TIME_REGEX.test(String(input.startTime)) &&
    TIME_REGEX.test(String(input.endTime))
  ) {
    if (String(input.endTime) <= String(input.startTime)) {
      errors.endTime = 'Interview end time must be after start time';
    }
  }

  if (!input.reason || typeof input.reason !== 'string' || !input.reason.trim()) {
    errors.reason = 'Reschedule reason is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    scheduledDate: String(input.scheduledDate).trim(),
    startTime: String(input.startTime).trim(),
    endTime: String(input.endTime).trim(),
    timezone: input.timezone ? String(input.timezone).trim() : 'Asia/Kolkata',
    locationOrLink: input.locationOrLink ? String(input.locationOrLink).trim() : null,
    reason: String(input.reason).trim(),
  };
}

export function validateCancelInterview(input: unknown): CancelInterviewDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  if (!input.reason || typeof input.reason !== 'string' || !input.reason.trim()) {
    throw new ValidationError('Validation failed', { reason: 'Cancellation reason is required' });
  }

  return {
    reason: String(input.reason).trim(),
  };
}

export function validateRecordInterviewFeedback(input: unknown): RecordInterviewFeedbackDto {
  if (!isObject(input)) {
    throw new ValidationError('Invalid payload: expected an object');
  }

  const errors: Record<string, string> = {};

  if (
    !input.recommendation ||
    !VALID_INTERVIEW_RECOMMENDATIONS.includes(input.recommendation as InterviewRecommendation)
  ) {
    errors.recommendation = `Recommendation must be one of: ${VALID_INTERVIEW_RECOMMENDATIONS.join(', ')}`;
  }

  if (input.score !== undefined && input.score !== null) {
    const s = Number(input.score);
    if (isNaN(s) || s < 1 || s > 5) {
      errors.score = 'Score must be between 1 and 5';
    }
  }

  if (!input.notes || typeof input.notes !== 'string' || !input.notes.trim()) {
    errors.notes = 'Feedback notes are required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    recommendation: input.recommendation as InterviewRecommendation,
    score: input.score !== undefined && input.score !== null ? Number(input.score) : undefined,
    notes: String(input.notes).trim(),
  };
}
