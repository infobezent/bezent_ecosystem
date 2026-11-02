import type {
  Candidate,
  CandidateSource,
  CandidateStage,
  AddCandidateInput,
} from '../types/candidate';
import type {
  JobOpening,
  JobStatus,
  WorkplaceType,
  EmploymentType,
  ExperienceLevel,
  CreateJobInput,
} from '../types/jobOpening';
import type {
  InterviewSchedule,
  InterviewType,
  InterviewStatus,
  InterviewRecommendation,
  ScheduleInterviewInput,
} from '../types/interview';
import type {
  BackendJobRequisition,
  BackendCandidate,
  BackendApplication,
  BackendInterview,
  CreateJobRequisitionDto,
  CreateCandidateDto,
  ScheduleInterviewDto,
} from './recruitmentApi';

// -----------------------------------------------------------------------------
// Job Requisition Adapter
// -----------------------------------------------------------------------------

export function adaptBackendStatusToJobStatus(status: BackendJobRequisition['status']): JobStatus {
  switch (status) {
    case 'open':
      return 'open';
    case 'draft':
    case 'pending_approval':
      return 'draft';
    case 'on_hold':
      return 'on_hold';
    case 'filled':
    case 'closed':
    case 'cancelled':
    default:
      return 'closed';
  }
}

export function adaptJobStatusToBackend(status: JobStatus): BackendJobRequisition['status'] {
  return status;
}

export function adaptRequisitionToJobOpening(
  req: BackendJobRequisition,
  applicationStats?: { totalApplicants?: number; pipeline?: Record<string, number> },
): JobOpening {
  const salaryMin = req.salaryMin ? Number(req.salaryMin) : undefined;
  const salaryMax = req.salaryMax ? Number(req.salaryMax) : undefined;

  const pipelineCounts = {
    applied: applicationStats?.pipeline?.applied ?? 0,
    screening: applicationStats?.pipeline?.screening ?? 0,
    interview: applicationStats?.pipeline?.interview ?? 0,
    assessment: applicationStats?.pipeline?.assessment ?? 0,
    offer: applicationStats?.pipeline?.offer ?? 0,
    hired: req.filledCount ?? applicationStats?.pipeline?.hired ?? 0,
  };

  return {
    id: req.id,
    jobCode: req.requisitionCode || req.requisitionNumber,
    title: req.jobTitle,
    department: req.departmentName || 'Engineering',
    location: req.locationName || 'HQ - Chennai',
    workplaceType: (req.workplaceType as WorkplaceType) || 'hybrid',
    employmentType: (req.employmentType as EmploymentType) || 'full_time',
    experienceLevel: (req.experienceLevel as ExperienceLevel) || 'mid',
    status: adaptBackendStatusToJobStatus(req.status),
    positionsCount: req.openings || 1,
    filledCount: req.filledCount || 0,
    totalApplicants: applicationStats?.totalApplicants ?? 0,
    postedDate: (req.createdAt ? req.createdAt.split('T')[0] : '2026-10-01') || '2026-10-01',
    targetCloseDate: req.targetCloseDate || '2026-11-30',
    salaryMin: Number.isFinite(salaryMin) ? salaryMin : undefined,
    salaryMax: Number.isFinite(salaryMax) ? salaryMax : undefined,
    currency: req.currency || 'INR',
    hiringManager: {
      name: req.hiringManagerName || 'Priya Sundaram',
      role: 'Engineering Manager',
      email: `${(req.hiringManagerName || 'priya.sundaram').toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
      avatarColor: 'purple',
    },
    recruiter: {
      name: req.recruiterName || 'Karthik Raja',
      role: 'Talent Acquisition',
      email: `${(req.recruiterName || 'karthik.raja').toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
      avatarColor: 'blue',
    },
    interviewers: [],
    skills: req.skills || [],
    description:
      req.description ||
      'We are seeking a high-caliber professional to join our expanding enterprise development squad.',
    requirements: req.requirements || [
      'Bachelor degree in Computer Science or equivalent practical experience.',
      '3+ years of relevant industry experience in enterprise software.',
    ],
    responsibilities: req.responsibilities || [
      'Architect and implement scalable business features.',
      'Collaborate with UX and product designers.',
    ],
    pipeline: pipelineCounts,
  };
}

export function adaptFrontendToCreateJobDto(input: CreateJobInput): CreateJobRequisitionDto {
  const skills = input.skillsRaw
    ? input.skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const responsibilities = input.responsibilitiesRaw
    ? input.responsibilitiesRaw
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

  const requirements = input.requirementsRaw
    ? input.requirementsRaw
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

  return {
    jobTitle: input.title.trim(),
    departmentName: input.department.trim(),
    locationName: input.location.trim(),
    workplaceType: input.workplaceType,
    employmentType: input.employmentType,
    experienceLevel: input.experienceLevel,
    openings: input.positionsCount || 1,
    targetCloseDate: input.targetCloseDate || null,
    salaryMin: input.salaryMin ? Number(input.salaryMin) : null,
    salaryMax: input.salaryMax ? Number(input.salaryMax) : null,
    currency: input.currency || 'INR',
    hiringManagerName: input.hiringManagerName.trim(),
    recruiterName: input.recruiterName.trim(),
    skills,
    description: input.description.trim(),
    responsibilities,
    requirements,
    status: input.status,
  };
}

// -----------------------------------------------------------------------------
// Candidate Adapter
// -----------------------------------------------------------------------------

export function adaptCandidateToFrontend(
  cand: BackendCandidate,
  application?: BackendApplication | null,
): Candidate {
  const fullName = `${cand.firstName} ${cand.lastName}`.trim();
  const currentCtc = cand.currentCtcLpa ? Number(cand.currentCtcLpa) : undefined;
  const expectedCtc = cand.expectedCtcLpa ? Number(cand.expectedCtcLpa) : undefined;

  const currentStage = (application?.stage as CandidateStage) || 'applied';

  const experienceHistory = cand.currentCompany
    ? [
        {
          company: cand.currentCompany,
          role: cand.currentDesignation || 'Software Engineer',
          duration: `${cand.totalExperienceYears || 1} yrs`,
          current: true,
        },
      ]
    : [];

  const educationHistory = [
    {
      degree: 'B.Tech / B.E.',
      institution: 'Anna University',
      year: '2020',
    },
  ];

  const applicationHistory = application
    ? [
        {
          id: application.id,
          jobTitle: application.requisition?.jobTitle || 'Software Engineer',
          jobCode: application.requisition?.requisitionCode || 'REQ-001',
          department: application.requisition?.departmentName || 'Engineering',
          appliedDate:
            (application.appliedAt ? application.appliedAt.split('T')[0] : '2026-10-01') ||
            '2026-10-01',
          stage: currentStage,
          rating: application.rating || 4,
          feedbackNotes: 'Application registered in pipeline',
        },
      ]
    : [];

  return {
    id: cand.id,
    candidateNumber: cand.candidateNumber,
    fullName,
    email: cand.email,
    phone: cand.phone || '',
    location: cand.location || 'HQ - Chennai',
    nationality: 'Indian',
    nationalityCountryCode: 'in',
    locationCountryCode: 'in',
    genderGlyph: '♂',
    isFavorite: false,
    currentCompany: cand.currentCompany || undefined,
    currentDesignation: cand.currentDesignation || undefined,
    totalExperienceYears: cand.totalExperienceYears ?? 0,
    relevantExperienceYears: cand.relevantExperienceYears ?? 0,
    source: (cand.source as CandidateSource) || 'direct',
    referredBy: cand.referredBy || undefined,
    tags: cand.tags || [],
    skills: cand.skills || [],
    appliedJobId: application?.requisitionId || '',
    appliedJobTitle: application?.requisition?.jobTitle || 'General Opening',
    appliedJobCode: application?.requisition?.requisitionCode || '',
    currentStage,
    rating: application?.rating || 4,
    appliedDate:
      (application?.appliedAt
        ? application.appliedAt.split('T')[0]
        : cand.createdAt
          ? cand.createdAt.split('T')[0]
          : '2026-10-01') || '2026-10-01',
    resumeFileName: cand.resumeFileName || `${cand.firstName}_Resume.pdf`,
    summary:
      cand.summary ||
      'Strong professional looking to contribute to scalable cloud enterprise platforms.',
    noticePeriodDays: cand.noticePeriodDays ?? 30,
    currentCtcLpa: Number.isFinite(currentCtc) ? currentCtc : undefined,
    expectedCtcLpa: Number.isFinite(expectedCtc) ? expectedCtc : undefined,
    experienceHistory,
    educationHistory,
    applicationHistory,
    hiringNotes: [],
  };
}

export function adaptFrontendToCreateCandidateDto(input: AddCandidateInput): CreateCandidateDto {
  const parts = input.fullName.trim().split(/\s+/);
  const firstName = parts[0] || 'Unknown';
  const lastName = parts.slice(1).join(' ') || 'Candidate';

  const skills = input.skillsRaw
    ? input.skillsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const tags = input.tagsRaw
    ? input.tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return {
    firstName,
    lastName,
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    location: input.location?.trim() || null,
    currentCompany: input.currentCompany?.trim() || null,
    currentDesignation: input.currentDesignation?.trim() || null,
    totalExperienceYears: Number(input.totalExperienceYears) || 0,
    relevantExperienceYears: Number(input.totalExperienceYears) || 0,
    noticePeriodDays: Number(input.noticePeriodDays) || 30,
    currentCtcLpa: input.currentCtcLpa ? Number(input.currentCtcLpa) : null,
    expectedCtcLpa: input.expectedCtcLpa ? Number(input.expectedCtcLpa) : null,
    skills,
    tags,
    source: input.source,
    referredBy: input.referredBy?.trim() || null,
    summary: input.summary?.trim() || null,
    resumeFileName: input.resumeFileName || `${firstName}_Resume.pdf`,
  };
}

// -----------------------------------------------------------------------------
// Interview Adapter
// -----------------------------------------------------------------------------

export function adaptInterviewToSchedule(
  interview: BackendInterview,
  context?: {
    candidateName?: string;
    candidateNumber?: string;
    candidateEmail?: string;
    jobTitle?: string;
    jobCode?: string;
    jobId?: string;
  },
): InterviewSchedule {
  const candidate = interview.application?.candidate;
  const requisition = interview.application?.requisition;

  const candidateName =
    context?.candidateName ||
    (candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : 'Candidate');
  const candidateNumber = context?.candidateNumber || candidate?.candidateNumber || 'CND-2026-000';
  const candidateEmail = context?.candidateEmail || candidate?.email || 'cand@bezent.internal';

  const jobId = context?.jobId || requisition?.id || interview.application?.requisitionId || '';
  const jobTitle = context?.jobTitle || requisition?.jobTitle || 'Engineering Role';
  const jobCode =
    context?.jobCode || requisition?.requisitionCode || requisition?.requisitionNumber || 'JOB-001';

  const panel = (interview.panel || []).map((p, idx) => ({
    name: p.interviewerName,
    role: p.interviewerRole || 'Interviewer',
    email:
      p.interviewerEmail ||
      `${p.interviewerName.toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
    avatarColor: (['purple', 'blue', 'green', 'pink', 'amber'] as const)[idx % 5],
  }));

  const scorecard = interview.feedbackNotes
    ? {
        interviewerName: panel[0]?.name || 'Panel Lead',
        interviewerRole: panel[0]?.role || 'Senior Engineer',
        submittedAt: interview.feedbackSubmittedAt || interview.updatedAt || '2026-10-30',
        overallScore: interview.feedbackScore ?? 4,
        recommendation: (interview.feedbackRecommendation as InterviewRecommendation) || 'hire',
        criteria: [
          {
            id: 'c1',
            name: 'Problem Decomposition & Architecture',
            score: interview.feedbackScore ?? 4,
            maxScore: 5,
          },
          {
            id: 'c2',
            name: 'Code Cleanliness & Maintainability',
            score: interview.feedbackScore ?? 4,
            maxScore: 5,
          },
        ],
        strengths: ['Clear reasoning', 'Domain proficiency'],
        areasForImprovement: ['Deeper distributed systems experience'],
        summaryNotes: interview.feedbackNotes,
      }
    : undefined;

  return {
    id: interview.id,
    candidateId: interview.application?.candidateId || candidate?.id || '',
    candidateName,
    candidateNumber,
    candidateEmail,
    candidateAvatarColor: 'blue',
    jobId,
    jobTitle,
    jobCode,
    roundName: interview.roundName,
    interviewType: interview.interviewType as InterviewType,
    status: interview.status as InterviewStatus,
    scheduledDate: interview.scheduledDate,
    startTime: interview.startTime,
    endTime: interview.endTime,
    durationMinutes: interview.durationMinutes || 60,
    meetingLink: interview.locationOrLink || 'https://meet.google.com/bez-interview',
    panel,
    scorecard,
    rescheduleReason: interview.rescheduleReason || undefined,
    cancellationReason: interview.cancellationReason || undefined,
  };
}

export function adaptFrontendToScheduleInterviewDto(
  input: ScheduleInterviewInput,
  applicationId: string,
): ScheduleInterviewDto {
  const panelNames = input.panelNamesRaw
    ? input.panelNamesRaw
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    : ['Priya Sundaram'];

  const panel = panelNames.map((name) => ({
    interviewerName: name,
    interviewerEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@bezent.internal`,
    interviewerRole: 'Interviewer',
  }));

  return {
    applicationId,
    roundName: input.roundName.trim(),
    interviewType: input.interviewType,
    scheduledDate: input.scheduledDate,
    startTime: input.startTime,
    endTime: input.endTime,
    locationOrLink: input.meetingLink.trim(),
    panel,
    notes: input.notes?.trim(),
  };
}
