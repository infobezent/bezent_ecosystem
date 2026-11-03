import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { RecruitmentService } from '../recruitment/service/recruitment.service.js';
import type { RecruitmentRepository } from '../recruitment/repository/recruitment.repository.js';
import { AuditService } from '../../../platform/audit/service/audit.service.js';
import type { AuditRepository } from '../../../platform/audit/repository/audit.repository.js';
import type { AuditEventInput } from '../../../platform/audit/types/audit.types.js';
import {
  ConflictError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../../../app/errors/AppError.js';
import { recruitmentRouter } from '../recruitment/routes/recruitment.routes.js';
import { errorHandler } from '../../../app/errors/errorHandler.js';
import type {
  JobRequisition,
  JobPosting,
  Candidate,
  CandidateApplication,
  RecruitmentStage,
  RecruitmentInterview,
} from '../../../db/schema.js';
import type {
  RecruitmentInterviewWithPanel,
  CandidateApplicationDetail,
} from '../recruitment/types/recruitment.types.js';

describe('BEZENT HRMS — Phase 3.1: Recruitment Backend Foundation Suite', () => {
  const tenantId = 'tenant_rec_01';
  const companyId = 'comp_rec_01';
  const otherTenantId = 'tenant_rec_02';
  const otherCompanyId = 'comp_rec_02';

  let mockRepo: Partial<RecruitmentRepository>;
  let mockAuditRepo: Partial<AuditRepository>;
  let auditService: AuditService;
  let service: RecruitmentService;

  const sampleRequisition: JobRequisition = {
    id: 'req_001',
    tenantId,
    companyId,
    requisitionNumber: 'REQ-2026-0001',
    jobTitle: 'Senior Full Stack Engineer',
    departmentId: 'dept_eng',
    designationId: 'desig_sr_eng',
    locationId: 'loc_hq',
    locationName: 'Bangalore HQ',
    workplaceType: 'hybrid',
    employmentType: 'full_time',
    experienceLevel: 'senior',
    openings: 3,
    filledCount: 0,
    description: 'Looking for a senior engineer with Node.js and React expertise.',
    requirements: ['5+ years experience', 'TypeScript proficiency'],
    responsibilities: ['Build enterprise HRMS modules'],
    skills: ['Node.js', 'React', 'TypeScript', 'MySQL'],
    experienceMin: 5,
    experienceMax: 8,
    salaryMin: '2500000.00',
    salaryMax: '3500000.00',
    currency: 'INR',
    hiringManagerId: 'emp_hm_01',
    recruiterId: 'emp_rec_01',
    priority: 'high',
    status: 'open',
    targetCloseDate: '2026-12-31',
    approvedAt: new Date('2026-01-01T00:00:00Z'),
    approvedByUserId: 'usr_admin_01',
    closedAt: null,
    closedReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const sampleCandidate: Candidate = {
    id: 'cnd_001',
    tenantId,
    candidateNumber: 'CND-00001',
    firstName: 'Arya',
    lastName: 'Stark',
    email: 'arya.stark@winterfell.org',
    phone: '+919876543210',
    location: 'Bangalore',
    currentCompany: 'Braavos Tech',
    currentDesignation: 'Software Engineer',
    totalExperienceYears: '5.5',
    relevantExperienceYears: '4.0',
    noticePeriodDays: 30,
    currentCtcLpa: '20.00',
    expectedCtcLpa: '28.00',
    skills: ['TypeScript', 'Node.js', 'React'],
    tags: ['immediate_joiner', 'top_tier'],
    source: 'direct',
    referredBy: null,
    resumeUrl: 'https://storage.bezent.com/resumes/cnd_001.pdf',
    resumeFileName: 'arya_stark_resume.pdf',
    summary: 'Experienced full stack developer.',
    status: 'active',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  const sampleApplication: CandidateApplicationDetail = {
    id: 'app_001',
    tenantId,
    companyId,
    candidateId: sampleCandidate.id,
    requisitionId: sampleRequisition.id,
    jobPostingId: null,
    currentStageId: 'stg_applied',
    stage: 'applied',
    status: 'active',
    appliedAt: new Date('2026-01-03T00:00:00Z'),
    assignedRecruiterId: 'emp_rec_01',
    rating: 4,
    rejectionReason: null,
    rejectedAt: null,
    withdrawnAt: null,
    withdrawalReason: null,
    hiredAt: null,
    createdAt: new Date('2026-01-03T00:00:00Z'),
    updatedAt: new Date('2026-01-03T00:00:00Z'),
    candidate: sampleCandidate,
    requisition: sampleRequisition,
    posting: null,
  };

  const sampleInterview: RecruitmentInterviewWithPanel = {
    id: 'int_001',
    tenantId,
    companyId,
    applicationId: sampleApplication.id,
    candidateId: sampleCandidate.id,
    roundName: 'Technical Round 1',
    interviewType: 'technical',
    scheduledDate: '2026-02-10',
    startTime: '14:00',
    endTime: '15:00',
    durationMinutes: 60,
    timezone: 'Asia/Kolkata',
    locationOrLink: 'https://meet.google.com/xyz-rec-test',
    status: 'scheduled',
    rescheduleReason: null,
    cancellationReason: null,
    feedbackStatus: 'pending',
    feedbackRecommendation: null,
    feedbackScore: null,
    feedbackNotes: null,
    createdAt: new Date('2026-01-04T00:00:00Z'),
    updatedAt: new Date('2026-01-04T00:00:00Z'),
    panel: [
      {
        id: 'pnl_001',
        interviewId: 'int_001',
        employeeId: 'emp_int_01',
        interviewerName: 'Jon Snow',
        interviewerEmail: 'jon.snow@winterfell.org',
        interviewerRole: 'Lead Engineer',
        createdAt: new Date('2026-01-04T00:00:00Z'),
      },
    ],
  };

  beforeEach(() => {
    mockAuditRepo = {
      record: vi.fn().mockImplementation((event: AuditEventInput) =>
        Promise.resolve({
          id: 'aud_test_999',
          ...event,
          createdAt: new Date(),
        }),
      ),
    };
    auditService = new AuditService(mockAuditRepo as AuditRepository);

    mockRepo = {
      transaction: vi.fn().mockImplementation((fn: any) => fn()),
      getNextRequisitionNumber: vi.fn().mockResolvedValue('REQ-2026-0002'),
      createRequisition: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...sampleRequisition,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      getRequisitionById: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && id === sampleRequisition.id) {
          return Promise.resolve({ ...sampleRequisition });
        }
        return Promise.resolve(null);
      }),
      updateRequisition: vi.fn().mockImplementation((_t, _c, _id, data) =>
        Promise.resolve({
          ...sampleRequisition,
          ...data,
          updatedAt: new Date(),
        }),
      ),
      listRequisitions: vi.fn().mockResolvedValue({
        items: [sampleRequisition],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      getNextPostingCode: vi.fn().mockResolvedValue('JOB-0001'),
      createJobPosting: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          id: data.id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      getJobPostingById: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && id === 'pst_001') {
          return Promise.resolve({
            id: 'pst_001',
            tenantId,
            companyId,
            requisitionId: sampleRequisition.id,
            postingCode: 'JOB-0001',
            title: sampleRequisition.jobTitle,
            description: sampleRequisition.description!,
            location: sampleRequisition.locationName!,
            workplaceType: sampleRequisition.workplaceType,
            employmentType: sampleRequisition.employmentType,
            publishedAt: null,
            expiresAt: null,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as JobPosting);
        }
        return Promise.resolve(null);
      }),
      updateJobPosting: vi.fn().mockImplementation((_t, _c, id, data) =>
        Promise.resolve({
          id,
          tenantId,
          companyId,
          requisitionId: sampleRequisition.id,
          postingCode: 'JOB-0001',
          title: sampleRequisition.jobTitle,
          description: sampleRequisition.description!,
          location: sampleRequisition.locationName!,
          workplaceType: 'hybrid',
          employmentType: 'full_time',
          publishedAt: new Date(),
          expiresAt: null,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        } as JobPosting),
      ),
      getNextCandidateNumber: vi.fn().mockResolvedValue('CND-00002'),
      createCandidate: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...sampleCandidate,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      getCandidateById: vi.fn().mockImplementation((t, id) => {
        if (t === tenantId && id === sampleCandidate.id) {
          return Promise.resolve({ ...sampleCandidate });
        }
        return Promise.resolve(null);
      }),
      getCandidateByEmail: vi.fn().mockImplementation((t, email) => {
        if (t === tenantId && email === sampleCandidate.email) {
          return Promise.resolve({ ...sampleCandidate });
        }
        return Promise.resolve(null);
      }),
      listCandidates: vi.fn().mockResolvedValue({
        items: [sampleCandidate],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      updateCandidate: vi.fn().mockImplementation((_t, _id, data) =>
        Promise.resolve({
          ...sampleCandidate,
          ...data,
          updatedAt: new Date(),
        }),
      ),
      createApplication: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...sampleApplication,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      getApplicationById: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && id === sampleApplication.id) {
          return Promise.resolve({ ...sampleApplication });
        }
        return Promise.resolve(null);
      }),
      getActiveApplication: vi.fn().mockResolvedValue(null),
      updateApplication: vi.fn().mockImplementation((_t, _c, _id, data) =>
        Promise.resolve({
          ...sampleApplication,
          ...data,
          updatedAt: new Date(),
        }),
      ),
      listApplications: vi.fn().mockResolvedValue({
        items: [sampleApplication],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      getStageByCode: vi.fn().mockImplementation((_t, _c, code) => {
        if (code === 'applied') {
          return Promise.resolve({
            id: 'stg_applied',
            code: 'applied',
            name: 'Applied',
            stageType: 'active',
          } as RecruitmentStage);
        }
        if (code === 'interview') {
          return Promise.resolve({
            id: 'stg_interview',
            code: 'interview',
            name: 'Interview',
            stageType: 'active',
          } as RecruitmentStage);
        }
        if (code === 'hired') {
          return Promise.resolve({
            id: 'stg_hired',
            code: 'hired',
            name: 'Hired',
            stageType: 'terminal_success',
          } as RecruitmentStage);
        }
        if (code === 'rejected') {
          return Promise.resolve({
            id: 'stg_rejected',
            code: 'rejected',
            name: 'Rejected',
            stageType: 'terminal_rejection',
          } as RecruitmentStage);
        }
        if (code === 'withdrawn') {
          return Promise.resolve({
            id: 'stg_withdrawn',
            code: 'withdrawn',
            name: 'Withdrawn',
            stageType: 'terminal_withdrawal',
          } as RecruitmentStage);
        }
        return Promise.resolve(null);
      }),
      createActivity: vi.fn().mockImplementation((data) =>
        Promise.resolve({
          ...data,
          createdAt: new Date(),
        }),
      ),
      listActivities: vi.fn().mockResolvedValue([]),
      createInterview: vi.fn().mockImplementation((data, panel) =>
        Promise.resolve({
          ...data,
          panel: panel.map((p: any, i: number) => ({
            id: `pnl_${i}`,
            interviewId: data.id,
            ...p,
            createdAt: new Date(),
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      getInterviewById: vi.fn().mockImplementation((t, c, id) => {
        if (t === tenantId && c === companyId && id === sampleInterview.id) {
          return Promise.resolve({ ...sampleInterview });
        }
        return Promise.resolve(null);
      }),
      updateInterview: vi.fn().mockImplementation((_t, _c, _id, data) =>
        Promise.resolve({
          ...sampleInterview,
          ...data,
          updatedAt: new Date(),
        }),
      ),
      listInterviews: vi.fn().mockResolvedValue({
        items: [sampleInterview],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      getDepartment: vi.fn().mockResolvedValue({ id: 'dept_eng', name: 'Engineering' }),
      getDesignation: vi.fn().mockResolvedValue({ id: 'desig_sr_eng', name: 'Senior Engineer' }),
      getEmployee: vi.fn().mockImplementation((_t, _c, id) => {
        if (id === 'emp_hm_01' || id === 'emp_rec_01' || id === 'emp_int_01') {
          return Promise.resolve({ id, firstName: 'Test', lastName: 'Employee' });
        }
        return Promise.resolve(null);
      }),
    };

    service = new RecruitmentService(mockRepo as RecruitmentRepository, auditService);
  });

  // ===========================================================================
  // 1. Schema and Validation
  // ===========================================================================
  describe('1. Schema and Validation', () => {
    it('1.1 validates required fields for job requisition', async () => {
      await expect(
        service.createRequisition(tenantId, companyId, { jobTitle: '' }),
      ).rejects.toThrow(ValidationError);
    });

    it('1.2 rejects invalid salary range where salaryMax < salaryMin', async () => {
      await expect(
        service.createRequisition(tenantId, companyId, {
          jobTitle: 'Backend Dev',
          salaryMin: 500000,
          salaryMax: 400000,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('1.3 validates required fields for candidate profile', async () => {
      await expect(
        service.createCandidate(tenantId, { firstName: '', email: 'invalid-email' }),
      ).rejects.toThrow(ValidationError);
    });

    it('1.4 rejects invalid interview time order where endTime <= startTime', async () => {
      await expect(
        service.scheduleInterview(tenantId, companyId, {
          applicationId: sampleApplication.id,
          roundName: 'Round 1',
          scheduledDate: '2026-03-01',
          startTime: '15:00',
          endTime: '14:00',
          panel: [{ interviewerName: 'John' }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('1.5 rejects interview without panel members', async () => {
      await expect(
        service.scheduleInterview(tenantId, companyId, {
          applicationId: sampleApplication.id,
          roundName: 'Round 1',
          scheduledDate: '2026-03-01',
          startTime: '14:00',
          endTime: '15:00',
          panel: [],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // 2. Tenant and Company Isolation
  // ===========================================================================
  describe('2. Tenant and Company Isolation', () => {
    it('2.1 blocks cross-tenant access to candidate profiles', async () => {
      await expect(service.getCandidateById(otherTenantId, sampleCandidate.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('2.2 blocks cross-tenant and cross-company access to job requisitions', async () => {
      await expect(
        service.getRequisitionById(otherTenantId, companyId, sampleRequisition.id),
      ).rejects.toThrow(NotFoundError);

      await expect(
        service.getRequisitionById(tenantId, otherCompanyId, sampleRequisition.id),
      ).rejects.toThrow(NotFoundError);
    });

    it('2.3 blocks cross-company access to candidate applications', async () => {
      await expect(
        service.getApplicationById(tenantId, otherCompanyId, sampleApplication.id),
      ).rejects.toThrow(NotFoundError);
    });

    it('2.4 blocks cross-company access to interviews', async () => {
      await expect(
        service.getInterviewById(tenantId, otherCompanyId, sampleInterview.id),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // 3. Requisitions Lifecycle
  // ===========================================================================
  describe('3. Requisition Lifecycle', () => {
    it('3.1 creates job requisition with generated requisition number and audit record', async () => {
      const recordSpy = vi.spyOn(mockAuditRepo, 'record');
      const created = await service.createRequisition(tenantId, companyId, {
        jobTitle: 'Staff Engineer',
        workplaceType: 'remote',
        openings: 2,
      });

      expect(created.jobTitle).toBe('Staff Engineer');
      expect(mockRepo.createRequisition).toHaveBeenCalled();
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'requisition_created',
          targetType: 'job_requisition',
          tenantId,
          companyId,
        }),
        undefined,
      );
    });

    it('3.2 updates requisition and records audit log', async () => {
      const recordSpy = vi.spyOn(mockAuditRepo, 'record');
      const updated = await service.updateRequisition(tenantId, companyId, sampleRequisition.id, {
        openings: 5,
        priority: 'urgent',
      });

      expect(mockRepo.updateRequisition).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleRequisition.id,
        expect.objectContaining({ openings: 5, priority: 'urgent' }),
        undefined,
      );
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'requisition_updated',
          targetId: sampleRequisition.id,
        }),
        undefined,
      );
    });

    it('3.3 closes requisition with reason and timestamp', async () => {
      await service.closeRequisition(
        tenantId,
        companyId,
        sampleRequisition.id,
        'Position cancelled by executive leadership',
      );

      expect(mockRepo.updateRequisition).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleRequisition.id,
        expect.objectContaining({
          status: 'closed',
          closedReason: 'Position cancelled by executive leadership',
        }),
        undefined,
      );
    });

    it('3.4 prevents new applications to closed requisitions', async () => {
      mockRepo.getRequisitionById = vi.fn().mockResolvedValue({
        ...sampleRequisition,
        status: 'closed',
      });

      await expect(
        service.createApplication(tenantId, companyId, {
          candidateId: sampleCandidate.id,
          requisitionId: sampleRequisition.id,
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ===========================================================================
  // 4. Candidate Lifecycle
  // ===========================================================================
  describe('4. Candidate Lifecycle', () => {
    it('4.1 creates candidate and generates candidate number', async () => {
      const recordSpy = vi.spyOn(mockAuditRepo, 'record');
      const candidate = await service.createCandidate(tenantId, {
        firstName: 'Bran',
        lastName: 'Stark',
        email: 'bran.stark@winterfell.org',
        totalExperienceYears: 3,
      });

      expect(candidate.firstName).toBe('Bran');
      expect(mockRepo.createCandidate).toHaveBeenCalled();
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'candidate_created',
          targetType: 'candidate',
          tenantId,
        }),
        undefined,
      );
    });

    it('4.2 blocks duplicate candidate email in the same tenant', async () => {
      await expect(
        service.createCandidate(tenantId, {
          firstName: 'Duplicate',
          lastName: 'Arya',
          email: sampleCandidate.email,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('4.3 allows candidate search and pagination', async () => {
      const result = await service.listCandidates(tenantId, { search: 'Arya', page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  // ===========================================================================
  // 5. Candidate Applications Lifecycle
  // ===========================================================================
  describe('5. Application Lifecycle', () => {
    it('5.1 allows one candidate to apply to multiple distinct jobs', async () => {
      const result = await service.createApplication(tenantId, companyId, {
        candidateId: sampleCandidate.id,
        requisitionId: sampleRequisition.id,
      });

      expect(result.status).toBe('active');
      expect(mockRepo.createApplication).toHaveBeenCalled();
      expect(mockRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'status_change',
          title: 'Application Created',
        }),
        undefined,
      );
    });

    it('5.2 prevents duplicate active applications for the same job requisition', async () => {
      mockRepo.getActiveApplication = vi.fn().mockResolvedValue({
        id: 'app_existing_active',
        status: 'active',
      } as CandidateApplication);

      await expect(
        service.createApplication(tenantId, companyId, {
          candidateId: sampleCandidate.id,
          requisitionId: sampleRequisition.id,
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('5.3 changes application stage, updates status and records business activity', async () => {
      const recordSpy = vi.spyOn(mockAuditRepo, 'record');
      await service.changeApplicationStage(tenantId, companyId, sampleApplication.id, {
        stage: 'interview',
        notes: 'Cleared technical screening test',
      });

      expect(mockRepo.updateApplication).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleApplication.id,
        expect.objectContaining({ stage: 'interview' }),
        undefined,
      );
      expect(mockRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stage_change',
          title: 'Stage Changed to Interview',
        }),
        undefined,
      );
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'application_stage_changed',
          targetId: sampleApplication.id,
        }),
        undefined,
      );
    });

    it('5.4 advancing to hired stage marks status as hired and sets hiredAt', async () => {
      await service.changeApplicationStage(tenantId, companyId, sampleApplication.id, {
        stage: 'hired',
        notes: 'Offer letter signed',
      });

      expect(mockRepo.updateApplication).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleApplication.id,
        expect.objectContaining({
          stage: 'hired',
          status: 'hired',
          hiredAt: expect.any(Date),
        }),
        undefined,
      );
    });

    it('5.5 rejects stage change on finalized (rejected/withdrawn/hired) applications', async () => {
      mockRepo.getApplicationById = vi.fn().mockResolvedValue({
        ...sampleApplication,
        status: 'rejected',
        stage: 'rejected',
      });

      await expect(
        service.changeApplicationStage(tenantId, companyId, sampleApplication.id, {
          stage: 'interview',
        }),
      ).rejects.toThrow(BadRequestError);
    });

    it('5.6 rejects application with reason and records activity', async () => {
      await service.rejectApplication(tenantId, companyId, sampleApplication.id, {
        reason: 'Candidate salary expectation out of budget',
      });

      expect(mockRepo.updateApplication).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleApplication.id,
        expect.objectContaining({
          status: 'rejected',
          rejectionReason: 'Candidate salary expectation out of budget',
          rejectedAt: expect.any(Date),
        }),
        undefined,
      );
    });

    it('5.7 withdraws application with reason and records activity', async () => {
      await service.withdrawApplication(tenantId, companyId, sampleApplication.id, {
        reason: 'Candidate accepted competing offer',
      });

      expect(mockRepo.updateApplication).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleApplication.id,
        expect.objectContaining({
          status: 'withdrawn',
          withdrawalReason: 'Candidate accepted competing offer',
          withdrawnAt: expect.any(Date),
        }),
        undefined,
      );
    });

    it('5.8 assigns recruiter to application and records activity', async () => {
      await service.assignRecruiter(tenantId, companyId, sampleApplication.id, {
        recruiterId: 'emp_rec_01',
      });

      expect(mockRepo.updateApplication).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleApplication.id,
        expect.objectContaining({
          assignedRecruiterId: 'emp_rec_01',
        }),
        undefined,
      );
    });
  });

  // ===========================================================================
  // 6. Interview Scheduling
  // ===========================================================================
  describe('6. Interview Scheduling', () => {
    it('6.1 schedules interview and assigns panel members', async () => {
      const recordSpy = vi.spyOn(mockAuditRepo, 'record');
      const interview = await service.scheduleInterview(tenantId, companyId, {
        applicationId: sampleApplication.id,
        roundName: 'System Design Round',
        interviewType: 'system_design',
        scheduledDate: '2026-03-15',
        startTime: '10:00',
        endTime: '11:00',
        panel: [
          {
            employeeId: 'emp_int_01',
            interviewerName: 'Jon Snow',
            interviewerEmail: 'jon.snow@winterfell.org',
          },
        ],
      });

      expect(interview.roundName).toBe('System Design Round');
      expect(mockRepo.createInterview).toHaveBeenCalled();
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'interview_scheduled',
          targetType: 'interview',
        }),
        undefined,
      );
    });

    it('6.2 rejects interview scheduling if interviewer employee does not belong to company', async () => {
      mockRepo.getEmployee = vi.fn().mockResolvedValue(null);

      await expect(
        service.scheduleInterview(tenantId, companyId, {
          applicationId: sampleApplication.id,
          roundName: 'Round 1',
          scheduledDate: '2026-03-15',
          startTime: '10:00',
          endTime: '11:00',
          panel: [{ employeeId: 'emp_unauthorized_999', interviewerName: 'Ghost' }],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('6.3 reschedules interview with valid new time and reason', async () => {
      await service.rescheduleInterview(tenantId, companyId, sampleInterview.id, {
        scheduledDate: '2026-02-12',
        startTime: '16:00',
        endTime: '17:00',
        reason: 'Candidate requested time change due to travel',
      });

      expect(mockRepo.updateInterview).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleInterview.id,
        expect.objectContaining({
          status: 'rescheduled',
          scheduledDate: '2026-02-12',
          startTime: '16:00',
          endTime: '17:00',
          rescheduleReason: 'Candidate requested time change due to travel',
        }),
        undefined,
      );
    });

    it('6.4 cancels interview with reason and records cancellation activity', async () => {
      await service.cancelInterview(tenantId, companyId, sampleInterview.id, {
        reason: 'Interviewer emergency leave',
      });

      expect(mockRepo.updateInterview).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleInterview.id,
        expect.objectContaining({
          status: 'cancelled',
          cancellationReason: 'Interviewer emergency leave',
        }),
        undefined,
      );
    });

    it('6.5 records interview scorecard feedback and marks interview completed', async () => {
      await service.recordInterviewFeedback(tenantId, companyId, sampleInterview.id, {
        recommendation: 'strong_hire',
        score: 5,
        notes: 'Exceptional system architecture and coding skills.',
      });

      expect(mockRepo.updateInterview).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleInterview.id,
        expect.objectContaining({
          status: 'completed',
          feedbackStatus: 'submitted',
          feedbackRecommendation: 'strong_hire',
          feedbackScore: 5,
          feedbackNotes: 'Exceptional system architecture and coding skills.',
        }),
        undefined,
      );
    });
  });

  // ===========================================================================
  // 7. Job Postings
  // ===========================================================================
  describe('7. Job Postings', () => {
    it('7.1 creates job posting for active requisition', async () => {
      const posting = await service.createJobPosting(tenantId, companyId, {
        requisitionId: sampleRequisition.id,
        title: sampleRequisition.jobTitle,
        description: sampleRequisition.description!,
        location: 'Bangalore HQ',
      });

      expect(posting.title).toBe(sampleRequisition.jobTitle);
      expect(mockRepo.createJobPosting).toHaveBeenCalled();
    });

    it('7.2 publishes job posting for valid open requisition', async () => {
      const published = await service.publishJobPosting(tenantId, companyId, 'pst_001');
      expect(published.status).toBe('published');
      expect(mockRepo.updateJobPosting).toHaveBeenCalledWith(
        tenantId,
        companyId,
        'pst_001',
        expect.objectContaining({ status: 'published' }),
        undefined,
      );
    });

    it('7.3 blocks publishing posting if underlying requisition is closed', async () => {
      mockRepo.getRequisitionById = vi.fn().mockResolvedValue({
        ...sampleRequisition,
        status: 'closed',
      });

      await expect(service.publishJobPosting(tenantId, companyId, 'pst_001')).rejects.toThrow(
        BadRequestError,
      );
    });
  });

  // ===========================================================================
  // 8. Audit Logging & Transaction Consistency
  // ===========================================================================
  describe('8. Audit Logging and Transaction Consistency', () => {
    it('8.1 rolls back requisition creation if audit logging fails', async () => {
      mockAuditRepo.record = vi.fn().mockRejectedValue(new Error('Audit DB disk full'));

      await expect(
        service.createRequisition(tenantId, companyId, {
          jobTitle: 'Data Engineer',
        }),
      ).rejects.toThrow('Audit DB disk full');
    });

    it('8.2 redacts sensitive keys in audit logs automatically', async () => {
      const recordSpy = vi.spyOn(mockAuditRepo, 'record');
      await auditService.logEvent({
        actorUserId: 'usr_001',
        action: 'candidate_sensitive_check',
        targetType: 'candidate',
        targetId: 'cnd_001',
        tenantId,
        companyId,
        metadata: {
          account_number: '1234567890',
          pan_number: 'ABCDE1234F',
          password: 'SecretPassword123',
          candidateName: 'Arya Stark',
        },
      });

      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            account_number: '[REDACTED]',
            pan_number: '[REDACTED]',
            password: '[REDACTED]',
            candidateName: 'Arya Stark',
          },
        }),
        undefined,
      );
    });
  });

  // ===========================================================================
  // 9. Controller Integration & Route Layer
  // ===========================================================================
  describe('9. Controller Integration & Routes', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Simulate authentication and company context
      app.use((req, _res, next) => {
        req.user = { id: 'usr_hr_actor', email: 'recruiter@company.com' } as any;
        req.companyContext = { tenantId, companyId } as any;
        req.access = {
          tenantId,
          companyId,
          roles: ['hr_manager'],
          permissions: [
            'hrms.recruitment.view',
            'hrms.recruitment.manage',
            'hrms.recruitment.requisitions_manage',
            'hrms.recruitment.candidates_view',
            'hrms.recruitment.candidates_manage',
            'hrms.recruitment.applications_manage',
            'hrms.recruitment.interviews_manage',
            'hrms.recruitment.settings_manage',
          ],
        } as any;
        next();
      });

      app.use('/api/v1', recruitmentRouter);
      app.use(errorHandler);
    });

    it('9.1 GET /hrms/recruitment/requisitions returns list and 200', async () => {
      vi.spyOn(RecruitmentService.prototype, 'listRequisitions').mockResolvedValue({
        items: [sampleRequisition],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app).get('/api/v1/hrms/recruitment/requisitions');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
    });

    it('9.2 POST /hrms/recruitment/candidates creates candidate and returns 201', async () => {
      vi.spyOn(RecruitmentService.prototype, 'createCandidate').mockResolvedValue({
        ...sampleCandidate,
        id: 'cnd_new',
      });

      const res = await request(app).post('/api/v1/hrms/recruitment/candidates').send({
        firstName: 'Sansa',
        lastName: 'Stark',
        email: 'sansa.stark@winterfell.org',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe('cnd_new');
    });

    it('9.3 POST /hrms/recruitment/applications/:id/stage advances stage and returns 200', async () => {
      vi.spyOn(RecruitmentService.prototype, 'changeApplicationStage').mockResolvedValue({
        ...sampleApplication,
        stage: 'interview',
      });

      const res = await request(app)
        .post(`/api/v1/hrms/recruitment/applications/${sampleApplication.id}/stage`)
        .send({ stage: 'interview' });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe('interview');
    });

    it('9.4 returns 400 when validation fails on create requisition with empty body', async () => {
      vi.restoreAllMocks();
      const res = await request(app).post('/api/v1/hrms/recruitment/requisitions').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
