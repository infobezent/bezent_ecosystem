import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as sessionModule from '../../../../platform/auth/session';
import {
  fetchRecruitmentStages,
  fetchJobRequisitions,
  fetchJobRequisitionById,
  createJobRequisition,
  updateJobRequisition,
  closeJobRequisition,
  fetchJobPostings,
  createJobPosting,
  publishJobPosting,
  closeJobPosting,
  fetchCandidates,
  fetchCandidateById,
  createCandidate,
  updateCandidate,
  fetchApplications,
  fetchApplicationById,
  createApplication,
  changeApplicationStage,
  rejectApplication,
  withdrawApplication,
  assignRecruiter,
  addApplicationNote,
  fetchApplicationActivities,
  fetchInterviews,
  fetchInterviewById,
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  recordInterviewFeedback,
} from '../api/recruitmentApi';
import {
  adaptRequisitionToJobOpening,
  adaptCandidateToFrontend,
  adaptInterviewToSchedule,
  adaptFrontendToCreateJobDto,
  adaptFrontendToCreateCandidateDto,
  adaptFrontendToScheduleInterviewDto,
  adaptBackendStatusToJobStatus,
} from '../api/recruitmentAdapters';

describe('Recruitment Frontend Integration — Phase 3.2', () => {
  let authorizedFetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Data Adapters Unit Verification
  // ---------------------------------------------------------------------------
  describe('Recruitment Data Adapters', () => {
    it('adapts backend requisition to frontend JobOpening with computed stats', () => {
      const backendReq: any = {
        id: 'req-101',
        tenantId: 't-1',
        companyId: 'c-1',
        requisitionNumber: 'REQ-2026-101',
        requisitionCode: 'JOB-2026-101',
        jobTitle: 'Lead Cloud Architect',
        departmentName: 'Infrastructure',
        locationName: 'Bangalore Tech Park',
        workplaceType: 'hybrid',
        employmentType: 'full_time',
        experienceLevel: 'lead',
        openings: 3,
        filledCount: 1,
        salaryMin: '2500000',
        salaryMax: '4000000',
        currency: 'INR',
        status: 'open',
        hiringManagerName: 'Devika Sharma',
        recruiterName: 'Vikram Seth',
        skills: ['AWS', 'Kubernetes', 'Terraform'],
        description: 'Lead enterprise cloud modernization.',
        requirements: ['7+ years distributed systems'],
        responsibilities: ['Architecture oversight'],
        createdAt: '2026-10-15T10:00:00.000Z',
        targetCloseDate: '2026-12-15',
      };

      const adapted = adaptRequisitionToJobOpening(backendReq, {
        totalApplicants: 12,
        pipeline: { applied: 5, screening: 3, interview: 4 },
      });

      expect(adapted.id).toBe('req-101');
      expect(adapted.jobCode).toBe('JOB-2026-101');
      expect(adapted.title).toBe('Lead Cloud Architect');
      expect(adapted.department).toBe('Infrastructure');
      expect(adapted.positionsCount).toBe(3);
      expect(adapted.filledCount).toBe(1);
      expect(adapted.totalApplicants).toBe(12);
      expect(adapted.salaryMin).toBe(2500000);
      expect(adapted.salaryMax).toBe(4000000);
      expect(adapted.status).toBe('open');
      expect(adapted.pipeline.screening).toBe(3);
      expect(adapted.hiringManager.name).toBe('Devika Sharma');
    });

    it('correctly maps status variants across backend and frontend models', () => {
      expect(adaptBackendStatusToJobStatus('open')).toBe('open');
      expect(adaptBackendStatusToJobStatus('draft')).toBe('draft');
      expect(adaptBackendStatusToJobStatus('pending_approval')).toBe('draft');
      expect(adaptBackendStatusToJobStatus('on_hold')).toBe('on_hold');
      expect(adaptBackendStatusToJobStatus('closed')).toBe('closed');
      expect(adaptBackendStatusToJobStatus('filled')).toBe('closed');
      expect(adaptBackendStatusToJobStatus('cancelled')).toBe('closed');
    });

    it('adapts backend candidate and application to frontend Candidate', () => {
      const backendCand: any = {
        id: 'cand-50',
        candidateNumber: 'CND-2026-050',
        firstName: 'Ananya',
        lastName: 'Deshmukh',
        email: 'ananya.deshmukh@example.com',
        phone: '+91 98765 43210',
        location: 'Pune',
        currentCompany: 'FinTech Dynamics',
        currentDesignation: 'Senior Backend Engineer',
        totalExperienceYears: 6.5,
        relevantExperienceYears: 5.0,
        noticePeriodDays: 30,
        currentCtcLpa: '22',
        expectedCtcLpa: '30',
        skills: ['Node.js', 'PostgreSQL', 'Kafka'],
        tags: ['Immediate Joiner', 'High Rating'],
        source: 'linkedin',
        summary: 'Experienced distributed systems engineer.',
        createdAt: '2026-10-18T10:00:00.000Z',
      };

      const backendApp: any = {
        id: 'app-999',
        requisitionId: 'req-101',
        stage: 'interview',
        rating: 5,
        appliedAt: '2026-10-19T09:00:00.000Z',
        requisition: {
          jobTitle: 'Lead Cloud Architect',
          requisitionCode: 'JOB-2026-101',
          departmentName: 'Infrastructure',
        },
      };

      const adapted = adaptCandidateToFrontend(backendCand, backendApp);

      expect(adapted.id).toBe('cand-50');
      expect(adapted.fullName).toBe('Ananya Deshmukh');
      expect(adapted.email).toBe('ananya.deshmukh@example.com');
      expect(adapted.currentStage).toBe('interview');
      expect(adapted.appliedJobTitle).toBe('Lead Cloud Architect');
      expect(adapted.appliedJobCode).toBe('JOB-2026-101');
      expect(adapted.rating).toBe(5);
      expect(adapted.experienceHistory[0]?.company).toBe('FinTech Dynamics');
      expect(adapted.applicationHistory[0]?.id).toBe('app-999');
    });

    it('adapts backend interview to frontend InterviewSchedule', () => {
      const backendInt: any = {
        id: 'int-77',
        interviewNumber: 'INT-2026-077',
        roundName: 'Round 3: System Design',
        interviewType: 'system_design',
        status: 'scheduled',
        scheduledDate: '2026-11-05',
        startTime: '15:00',
        endTime: '16:00',
        durationMinutes: 60,
        locationOrLink: 'https://meet.google.com/bez-sys-design',
        panel: [
          {
            id: 'p-1',
            interviewId: 'int-77',
            interviewerName: 'Rajesh K',
            interviewerEmail: 'rajesh.k@bezent.internal',
            interviewerRole: 'Staff Architect',
          },
        ],
      };

      const adapted = adaptInterviewToSchedule(backendInt, {
        candidateName: 'Ananya Deshmukh',
        candidateNumber: 'CND-2026-050',
        candidateEmail: 'ananya@example.com',
        jobTitle: 'Lead Cloud Architect',
        jobCode: 'JOB-2026-101',
        jobId: 'req-101',
      });

      expect(adapted.id).toBe('int-77');
      expect(adapted.candidateName).toBe('Ananya Deshmukh');
      expect(adapted.roundName).toBe('Round 3: System Design');
      expect(adapted.interviewType).toBe('system_design');
      expect(adapted.meetingLink).toBe('https://meet.google.com/bez-sys-design');
      expect(adapted.panel[0]?.name).toBe('Rajesh K');
    });

    it('adapts frontend inputs into backend DTOs', () => {
      const jobDto = adaptFrontendToCreateJobDto({
        title: 'Security Engineer',
        department: 'Security',
        location: 'HQ - Chennai',
        workplaceType: 'remote',
        employmentType: 'full_time',
        experienceLevel: 'senior',
        status: 'open',
        positionsCount: 2,
        targetCloseDate: '2026-12-31',
        salaryMin: 2000000,
        salaryMax: 3000000,
        currency: 'INR',
        hiringManagerName: 'Alok Nath',
        hiringManagerRole: 'CISO',
        recruiterName: 'Maya Sen',
        skillsRaw: 'OAuth, Penetration Testing, IAM',
        description: 'Safeguard enterprise cloud assets.',
        responsibilitiesRaw: 'Security audits\nThreat modeling',
        requirementsRaw: '5+ years security exp',
      });

      expect(jobDto.jobTitle).toBe('Security Engineer');
      expect(jobDto.skills).toEqual(['OAuth', 'Penetration Testing', 'IAM']);
      expect(jobDto.responsibilities).toHaveLength(2);
      expect(jobDto.openings).toBe(2);

      const candDto = adaptFrontendToCreateCandidateDto({
        fullName: 'Rahul Verma',
        email: 'rahul.verma@example.com',
        phone: '+91 99887 76655',
        location: 'Mumbai',
        appliedJobId: 'job-1',
        totalExperienceYears: 4,
        source: 'career_page',
        noticePeriodDays: 15,
        skillsRaw: 'Python, FastAPI, Docker',
        tagsRaw: 'Quick Joiner',
        summary: 'Backend developer specializing in microservices.',
      });

      expect(candDto.firstName).toBe('Rahul');
      expect(candDto.lastName).toBe('Verma');
      expect(candDto.skills).toEqual(['Python', 'FastAPI', 'Docker']);
      expect(candDto.tags).toEqual(['Quick Joiner']);

      const intDto = adaptFrontendToScheduleInterviewDto(
        {
          candidateId: 'cand-1',
          roundName: 'Round 1: Screening',
          interviewType: 'screening',
          scheduledDate: '2026-11-10',
          startTime: '10:00',
          endTime: '10:45',
          meetingLink: 'https://meet.google.com/test',
          panelNamesRaw: 'Vikram Seth, Maya Sen',
          notes: 'Candidate screening round',
        },
        'app-1',
      );

      expect(intDto.applicationId).toBe('app-1');
      expect(intDto.panel).toHaveLength(2);
      expect(intDto.panel[0]?.interviewerName).toBe('Vikram Seth');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. API Client Endpoint Method Verification
  // ---------------------------------------------------------------------------
  describe('Recruitment API Client Methods', () => {
    function mockApiResponse(data: any, status = 200) {
      return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => (status >= 200 && status < 300 ? { data } : { error: { message: data } }),
      } as unknown as Response);
    }

    it('fetches pipeline stages via GET /hrms/recruitment/stages', async () => {
      const mockStages = [
        { id: 'stg-1', code: 'applied', name: 'Applied', stageType: 'active', displayOrder: 1 },
      ];
      authorizedFetchSpy = vi
        .spyOn(sessionModule, 'authorizedFetch')
        .mockImplementation(mockApiResponse(mockStages));

      const res = await fetchRecruitmentStages();
      expect(res).toEqual(mockStages);
      expect(authorizedFetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/hrms/recruitment/stages'),
      );
    });

    it('fetches requisitions and creates requisition via POST', async () => {
      const mockList = {
        items: [{ id: 'req-1', jobTitle: 'Full-Stack Lead' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      authorizedFetchSpy = vi
        .spyOn(sessionModule, 'authorizedFetch')
        .mockImplementation(mockApiResponse(mockList));

      const listRes = await fetchJobRequisitions({ search: 'Full-Stack', page: 1 });
      expect(listRes.items[0]?.jobTitle).toBe('Full-Stack Lead');

      // Create requisition
      const mockCreated = { id: 'req-2', jobTitle: 'QA Lead' };
      authorizedFetchSpy.mockImplementation(mockApiResponse(mockCreated, 201));

      const created = await createJobRequisition({ jobTitle: 'QA Lead' });
      expect(created.jobTitle).toBe('QA Lead');

      // Close requisition
      authorizedFetchSpy.mockImplementation(mockApiResponse({ ...mockCreated, status: 'closed' }));
      const closed = await closeJobRequisition('req-2', 'Position filled');
      expect(closed.status).toBe('closed');
    });

    it('fetches candidates, creates candidate, and updates candidate', async () => {
      const mockCand = { id: 'c-1', firstName: 'Meera', lastName: 'Nair' };
      authorizedFetchSpy = vi
        .spyOn(sessionModule, 'authorizedFetch')
        .mockImplementation(mockApiResponse({ items: [mockCand], pagination: { total: 1 } }));

      const listRes = await fetchCandidates({ search: 'Meera' });
      expect(listRes.items[0]?.firstName).toBe('Meera');

      authorizedFetchSpy.mockImplementation(mockApiResponse(mockCand, 201));
      const created = await createCandidate({
        firstName: 'Meera',
        lastName: 'Nair',
        email: 'meera@example.com',
      });
      expect(created.firstName).toBe('Meera');

      authorizedFetchSpy.mockImplementation(mockApiResponse({ ...mockCand, location: 'Cochin' }));
      const updated = await updateCandidate('c-1', { location: 'Cochin' });
      expect(updated.location).toBe('Cochin');
    });

    it('advances application stage and records interview feedback', async () => {
      const mockApp = { id: 'app-1', stage: 'interview', status: 'active' };
      authorizedFetchSpy = vi
        .spyOn(sessionModule, 'authorizedFetch')
        .mockImplementation(mockApiResponse(mockApp));

      const stageRes = await changeApplicationStage('app-1', 'selected', 'Cleared rounds');
      expect(stageRes.stage).toBe('interview');

      // Record feedback
      const mockInterview = { id: 'int-1', status: 'completed', feedbackRecommendation: 'hire' };
      authorizedFetchSpy.mockImplementation(mockApiResponse(mockInterview));

      const feedbackRes = await recordInterviewFeedback('int-1', {
        recommendation: 'hire',
        score: 5,
        notes: 'Outstanding candidate',
      });
      expect(feedbackRes.feedbackRecommendation).toBe('hire');
    });

    it('throws descriptive error on API rejection', async () => {
      authorizedFetchSpy = vi
        .spyOn(sessionModule, 'authorizedFetch')
        .mockImplementation(mockApiResponse('Unauthorized requisition access', 403));

      await expect(fetchJobRequisitions()).rejects.toThrow('Unauthorized requisition access');
    });
  });
});
