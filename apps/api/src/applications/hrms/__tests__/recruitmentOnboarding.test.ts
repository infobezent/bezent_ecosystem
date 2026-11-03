import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { RecruitmentOnboardingService } from '../recruitment/service/recruitmentOnboarding.service.js';
import type { RecruitmentRepository } from '../recruitment/repository/recruitment.repository.js';
import type { EmployeeService } from '../employees/service/employee.service.js';
import { AuditService } from '../../../platform/audit/service/audit.service.js';
import type { AuditRepository } from '../../../platform/audit/repository/audit.repository.js';
import {
  ConflictError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from '../../../app/errors/AppError.js';
import { recruitmentRouter } from '../recruitment/routes/recruitment.routes.js';
import { errorHandler } from '../../../app/errors/errorHandler.js';
import type {
  Candidate,
  CandidateApplication,
  JobRequisition,
  RecruitmentOnboarding,
  Employee,
} from '../../../db/schema.js';
import type { EmployeeDetails } from '../employees/types/employee.types.js';

describe('BEZENT HRMS — Phase 3.3: Recruitment → Workforce Onboarding Handoff Suite', () => {
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const otherTenantId = 'tenant_demo_02';
  const otherCompanyId = 'comp_demo_02';

  let mockRepo: Partial<RecruitmentRepository>;
  let mockEmployeeService: Partial<EmployeeService>;
  let mockAuditRepo: Partial<AuditRepository>;
  let auditService: AuditService;
  let service: RecruitmentOnboardingService;

  const sampleCandidate: Candidate = {
    id: 'cand_101',
    tenantId,
    candidateNumber: 'CAN-2026-0001',
    firstName: 'Shreya',
    lastName: 'Sengupta',
    email: 'shreya.sengupta@example.com',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    currentCompany: 'FinTech Labs',
    currentDesignation: 'Senior Frontend Engineer',
    totalExperienceYears: '5.5',
    relevantExperienceYears: '4.0',
    noticePeriodDays: 30,
    currentCtcLpa: '22.00',
    expectedCtcLpa: '28.00',
    skills: ['React', 'TypeScript', 'Design Systems'],
    tags: ['immediate_joiner', 'strong_fit'],
    source: 'linkedin',
    referredBy: null,
    resumeUrl: null,
    resumeFileName: null,
    summary: 'Senior developer with strong UI skills.',
    status: 'active',
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
  };

  const sampleRequisition: JobRequisition = {
    id: 'req_201',
    tenantId,
    companyId,
    requisitionNumber: 'REQ-2026-0001',
    jobTitle: 'Senior Frontend Engineer',
    departmentId: 'dept_eng',
    designationId: 'desig_sr_fe',
    locationId: 'loc_blr',
    locationName: 'Bangalore HQ',
    workplaceType: 'hybrid',
    employmentType: 'full_time',
    experienceLevel: 'senior',
    openings: 2,
    filledCount: 0,
    description: 'Looking for a Senior Frontend Engineer.',
    requirements: ['React', 'TypeScript'],
    responsibilities: ['Build UI components'],
    skills: ['React', 'TypeScript'],
    experienceMin: 5,
    experienceMax: 8,
    salaryMin: '24.00',
    salaryMax: '30.00',
    currency: 'INR',
    hiringManagerId: 'emp_mgr_01',
    recruiterId: 'emp_rec_01',
    priority: 'high',
    status: 'open',
    targetCloseDate: '2026-11-30',
    approvedAt: new Date('2026-10-01'),
    approvedByUserId: 'usr_admin',
    closedAt: null,
    closedReason: null,
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const sampleHiredApplication: CandidateApplication = {
    id: 'app_301',
    tenantId,
    companyId,
    candidateId: sampleCandidate.id,
    requisitionId: sampleRequisition.id,
    jobPostingId: null,
    currentStageId: 'stage_hired',
    stage: 'hired',
    status: 'hired',
    appliedAt: new Date('2026-10-05T10:00:00Z'),
    assignedRecruiterId: 'emp_rec_01',
    rating: 5,
    rejectionReason: null,
    rejectedAt: null,
    withdrawnAt: null,
    withdrawalReason: null,
    hiredAt: new Date('2026-10-25T15:00:00Z'),
    createdAt: new Date('2026-10-05T10:00:00Z'),
    updatedAt: new Date('2026-10-25T15:00:00Z'),
  };

  const sampleActiveApplication: CandidateApplication = {
    ...sampleHiredApplication,
    id: 'app_302',
    stage: 'interview',
    status: 'active',
    hiredAt: null,
  };

  const sampleOnboarding: RecruitmentOnboarding = {
    id: 'onb_401',
    tenantId,
    companyId,
    candidateId: sampleCandidate.id,
    applicationId: sampleHiredApplication.id,
    createdEmployeeId: null,
    status: 'pending_review',
    targetJoiningDate: '2026-11-15',
    departmentId: 'dept_eng',
    designationId: 'desig_sr_fe',
    locationId: 'loc_blr',
    reportingManagerId: 'emp_mgr_01',
    employmentType: 'full_time',
    workflowTemplate: 'Engineering Standard Pre-Boarding',
    assignedPartner: 'Priya Sundaram',
    notes: 'Signed offer received and verified.',
    reviewedByUserId: null,
    reviewedAt: null,
    confirmedByUserId: null,
    confirmedAt: null,
    cancelledByUserId: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date('2026-10-26T10:00:00Z'),
    updatedAt: new Date('2026-10-26T10:00:00Z'),
  };

  const sampleCreatedEmployee: EmployeeDetails = {
    id: 'emp_new_501',
    tenantId,
    companyId,
    employeeNumber: 'EMP-1005',
    userId: null,
    firstName: 'Shreya',
    lastName: 'Sengupta',
    fullName: 'Shreya Sengupta',
    email: 'shreya.sengupta@example.com',
    phone: '+91 98765 43210',
    departmentId: 'dept_eng',
    departmentName: 'Engineering',
    designationId: 'desig_sr_fe',
    designationName: 'Senior Frontend Engineer',
    locationId: 'loc_blr',
    locationName: 'Bangalore HQ',
    reportingManagerId: 'emp_mgr_01',
    reportingManagerName: 'Ramesh Gupta',
    referralCode: 'REF-EMP1005',
    referredByEmployeeId: null,
    referredByName: null,
    employmentStatus: 'probation',
    joiningDate: '2026-11-15',
    probationEndDate: '2027-02-13',
    confirmedJoiningDate: null,
    confirmationDate: null,
    lastWorkingDate: null,
    contractEndDate: null,
    noticePeriodDays: null,
    employmentType: 'full_time',
    sourceOfHire: null,
    createdAt: new Date('2026-11-02T10:00:00Z'),
    updatedAt: new Date('2026-11-02T10:00:00Z'),
  };

  beforeEach(() => {
    const onboardingsStore = new Map<string, any>();
    onboardingsStore.set(sampleOnboarding.id, sampleOnboarding);

    mockAuditRepo = {
      record: vi.fn().mockImplementation(async (data) => ({
        id: 'aud_1',
        createdAt: new Date(),
        ...data,
      })),
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    auditService = new AuditService(mockAuditRepo as any);

    mockRepo = {
      transaction: vi.fn().mockImplementation(async (cb) => cb({})),
      getApplicationById: vi.fn().mockImplementation(async (_t, _c, id) => {
        if (id === sampleHiredApplication.id) return sampleHiredApplication;
        if (id === sampleActiveApplication.id) return sampleActiveApplication;
        return null;
      }),
      getCandidateById: vi.fn().mockImplementation(async (_t, id) => {
        if (id === sampleCandidate.id) return sampleCandidate;
        return null;
      }),
      getRequisitionById: vi.fn().mockImplementation(async (_t, _c, id) => {
        if (id === sampleRequisition.id) return sampleRequisition;
        return null;
      }),
      createOnboarding: vi.fn().mockImplementation(async (data) => {
        const rec = { ...data, createdAt: new Date(), updatedAt: new Date() };
        onboardingsStore.set(data.id, rec);
        return rec;
      }),
      getOnboardingById: vi.fn().mockImplementation(async (_t, _c, id) => {
        return onboardingsStore.get(id) ?? null;
      }),
      getOnboardingByApplicationId: vi.fn().mockResolvedValue(null),
      updateOnboarding: vi.fn().mockImplementation(async (_t, _c, id, data) => {
        const existing = onboardingsStore.get(id) ?? sampleOnboarding;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        onboardingsStore.set(id, updated);
        return updated;
      }),
      listOnboardings: vi.fn().mockResolvedValue({
        items: [sampleOnboarding],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
      getEmployee: vi.fn().mockResolvedValue(null),
      getEmployeeByEmail: vi.fn().mockResolvedValue(null),
      getEmployeeByPhone: vi.fn().mockResolvedValue(null),
      getEmployeesByName: vi.fn().mockResolvedValue([]),
      getDepartment: vi.fn().mockResolvedValue({ id: 'dept_eng', name: 'Engineering' }),
      getDesignation: vi
        .fn()
        .mockResolvedValue({ id: 'desig_sr_fe', name: 'Senior Frontend Engineer' }),
      getLocation: vi.fn().mockResolvedValue({ id: 'loc_blr', name: 'Bangalore HQ' }),
      createActivity: vi.fn().mockResolvedValue({ id: 'act_1' }),
    };

    mockEmployeeService = {
      createEmployee: vi.fn().mockResolvedValue(sampleCreatedEmployee),
    };

    service = new RecruitmentOnboardingService(
      mockRepo as any,
      mockEmployeeService as any,
      auditService,
      { getMasters: vi.fn() } as any,
    );
  });

  // ===========================================================================
  // 1. Initiation Workflows
  // ===========================================================================
  describe('1. Initiation Workflows', () => {
    it('1.1 allows an eligible Hired application to initiate onboarding', async () => {
      const result = await service.initiateOnboarding(
        tenantId,
        companyId,
        sampleHiredApplication.id,
        {
          targetJoiningDate: '2026-11-20',
          notes: 'Candidate accepted offer letter.',
        },
      );

      expect(mockRepo.createOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          companyId,
          candidateId: sampleCandidate.id,
          applicationId: sampleHiredApplication.id,
          status: 'pending_review',
          targetJoiningDate: '2026-11-20',
        }),
      );
      expect(result.status).toBe('pending_review');
      expect(result.candidate.email).toBe(sampleCandidate.email);
    });

    it('1.2 rejects onboarding initiation for a non-Hired application', async () => {
      await expect(
        service.initiateOnboarding(tenantId, companyId, sampleActiveApplication.id, {}),
      ).rejects.toThrow(BadRequestError);
      expect(mockRepo.createOnboarding).not.toHaveBeenCalled();
    });

    it('1.3 throws NotFoundError when application does not exist or does not belong to company', async () => {
      await expect(
        service.initiateOnboarding(tenantId, companyId, 'non_existent_app', {}),
      ).rejects.toThrow(NotFoundError);
    });

    it('1.4 rejects initiation if onboarding for this application is already completed', async () => {
      vi.mocked(mockRepo.getOnboardingByApplicationId!).mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'completed',
        createdEmployeeId: 'emp_existing_1',
      });

      await expect(
        service.initiateOnboarding(tenantId, companyId, sampleHiredApplication.id, {}),
      ).rejects.toThrow(ConflictError);
    });

    it('1.5 returns existing onboarding record idempotently if already initiated', async () => {
      vi.mocked(mockRepo.getOnboardingByApplicationId!).mockResolvedValueOnce(sampleOnboarding);

      const result = await service.initiateOnboarding(
        tenantId,
        companyId,
        sampleHiredApplication.id,
        {},
      );

      expect(mockRepo.createOnboarding).not.toHaveBeenCalled();
      expect(result.id).toBe(sampleOnboarding.id);
    });
  });

  // ===========================================================================
  // 2. Review & Duplicate Conflict Checking
  // ===========================================================================
  describe('2. Review & Duplicate Conflict Checking', () => {
    it('2.1 flags duplicate employee email conflict with blocking severity', async () => {
      vi.mocked(mockRepo.getEmployeeByEmail!).mockResolvedValueOnce({
        id: 'emp_conflict_01',
        employeeNumber: 'EMP-0010',
        firstName: 'Shreya',
        lastName: 'Sengupta',
        email: sampleCandidate.email,
      } as any);

      const check = await service.checkDuplicates(tenantId, companyId, sampleCandidate.id);
      expect(check.hasConflict).toBe(true);
      expect(check.conflictSeverity).toBe('blocking');
      expect(check.conflictType).toBe('email_exists');
      expect(check.conflictingEmployeeNumber).toBe('EMP-0010');
    });

    it('2.2 flags phone number match with warning severity', async () => {
      vi.mocked(mockRepo.getEmployeeByPhone!).mockResolvedValueOnce({
        id: 'emp_phone_01',
        employeeNumber: 'EMP-0015',
        firstName: 'Different',
        lastName: 'Name',
        phone: sampleCandidate.phone,
      } as any);

      const check = await service.checkDuplicates(tenantId, companyId, sampleCandidate.id);
      expect(check.hasConflict).toBe(true);
      expect(check.conflictSeverity).toBe('warning');
      expect(check.conflictType).toBe('phone_exists');
    });

    it('2.3 allows authorized HR user to review and update onboarding parameters', async () => {
      const reviewed = await service.reviewOnboarding(
        tenantId,
        companyId,
        sampleOnboarding.id,
        {
          targetJoiningDate: '2026-12-01',
          workflowTemplate: 'Executive & Leadership Onboarding',
          assignedPartner: 'Arun Kumar',
          notes: 'Joining postponed by candidate request.',
          status: 'ready_for_confirmation',
        },
        { userId: 'usr_hr_lead', email: 'hrlead@bezent.com', name: 'HR Lead' },
      );

      expect(mockRepo.updateOnboarding).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleOnboarding.id,
        expect.objectContaining({
          targetJoiningDate: '2026-12-01',
          workflowTemplate: 'Executive & Leadership Onboarding',
          assignedPartner: 'Arun Kumar',
          status: 'ready_for_confirmation',
          reviewedByUserId: 'usr_hr_lead',
        }),
      );
      expect(reviewed).toBeDefined();
    });

    it('2.4 rejects review with invalid department or designation', async () => {
      vi.mocked(mockRepo.getDepartment!).mockResolvedValueOnce(null);

      await expect(
        service.reviewOnboarding(tenantId, companyId, sampleOnboarding.id, {
          departmentId: 'dept_invalid',
        }),
      ).rejects.toThrow(BadRequestError);
    });
  });

  // ===========================================================================
  // 3. Confirmation & Employee Creation (Atomic Handoff)
  // ===========================================================================
  describe('3. Confirmation & Employee Creation', () => {
    it('3.1 confirmed onboarding creates Workforce Employee record via EmployeeService and completes handoff', async () => {
      const result = await service.confirmOnboarding(
        tenantId,
        companyId,
        sampleOnboarding.id,
        { notes: 'All prerequisites verified. Creating employee.' },
        { userId: 'usr_hr_approver', email: 'approver@bezent.com', name: 'HR Approver' },
      );

      // Verify EmployeeService was called with canonical candidate data
      expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith(
        tenantId,
        companyId,
        expect.objectContaining({
          firstName: sampleCandidate.firstName,
          lastName: sampleCandidate.lastName,
          email: sampleCandidate.email,
          phone: sampleCandidate.phone,
          employmentType: 'full_time',
          employmentStatus: 'probation',
          joiningDate: sampleOnboarding.targetJoiningDate,
        }),
        expect.anything(), // Inside db transaction
      );

      // Verify onboarding record marked completed with createdEmployeeId
      expect(mockRepo.updateOnboarding).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleOnboarding.id,
        expect.objectContaining({
          createdEmployeeId: sampleCreatedEmployee.id,
          status: 'completed',
          confirmedByUserId: 'usr_hr_approver',
        }),
        expect.anything(),
      );

      // Verify business activity created
      expect(mockRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: sampleHiredApplication.id,
          candidateId: sampleCandidate.id,
          type: 'status_change',
          title: 'Workforce Onboarding Handoff Completed',
        }),
        expect.anything(),
      );

      // Verify audit event recorded
      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recruitment_onboarding_confirmed',
          targetId: sampleOnboarding.id,
        }),
        expect.anything(),
      );
    });

    it('3.2 blocks confirmation and throws ConflictError when duplicate email conflict exists', async () => {
      vi.mocked(mockRepo.getEmployeeByEmail!).mockResolvedValueOnce({
        id: 'emp_existing_email',
        employeeNumber: 'EMP-0099',
        email: sampleCandidate.email,
      } as any);

      await expect(
        service.confirmOnboarding(tenantId, companyId, sampleOnboarding.id, {}),
      ).rejects.toThrow(ConflictError);

      expect(mockEmployeeService.createEmployee).not.toHaveBeenCalled();
      expect(mockRepo.updateOnboarding).not.toHaveBeenCalled();
    });

    it('3.3 prevents duplicate employee creation on repeated confirmation (idempotency guard)', async () => {
      vi.mocked(mockRepo.getOnboardingById!).mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'completed',
        createdEmployeeId: 'emp_already_created',
      });

      await expect(
        service.confirmOnboarding(tenantId, companyId, sampleOnboarding.id, {}),
      ).rejects.toThrow(ConflictError);

      expect(mockEmployeeService.createEmployee).not.toHaveBeenCalled();
    });

    it('3.4 cannot confirm a cancelled onboarding record', async () => {
      vi.mocked(mockRepo.getOnboardingById!).mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'cancelled',
        cancellationReason: 'Candidate declined offer',
      });

      await expect(
        service.confirmOnboarding(tenantId, companyId, sampleOnboarding.id, {}),
      ).rejects.toThrow(BadRequestError);

      expect(mockEmployeeService.createEmployee).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 4. Cancellation Workflows
  // ===========================================================================
  describe('4. Cancellation Workflows', () => {
    it('4.1 successfully cancels pending onboarding with reason and actor metadata', async () => {
      await service.cancelOnboarding(
        tenantId,
        companyId,
        sampleOnboarding.id,
        { reason: 'Candidate withdrew acceptance due to relocation.' },
        { userId: 'usr_actor', email: 'actor@bezent.com', name: 'HR Admin' },
      );

      expect(mockRepo.updateOnboarding).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleOnboarding.id,
        expect.objectContaining({
          status: 'cancelled',
          cancellationReason: 'Candidate withdrew acceptance due to relocation.',
          cancelledByUserId: 'usr_actor',
        }),
      );

      expect(mockAuditRepo.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recruitment_onboarding_cancelled',
          targetId: sampleOnboarding.id,
        }),
        undefined,
      );
    });

    it('4.2 cannot cancel an already completed onboarding record', async () => {
      vi.mocked(mockRepo.getOnboardingById!).mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'completed',
        createdEmployeeId: 'emp_created_01',
      });

      await expect(
        service.cancelOnboarding(tenantId, companyId, sampleOnboarding.id, {
          reason: 'Attempt late cancel',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('4.3 requires a non-empty cancellation reason', async () => {
      await expect(
        service.cancelOnboarding(tenantId, companyId, sampleOnboarding.id, { reason: '' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // 5. Route Layer, RBAC & Isolation
  // ===========================================================================
  describe('5. Route Layer, RBAC & Isolation', () => {
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
            'hrms.recruitment.onboarding_view',
            'hrms.recruitment.onboarding_manage',
            'hrms.recruitment.onboarding_confirm',
          ],
        } as any;
        next();
      });

      app.use('/api/v1', recruitmentRouter);
      app.use(errorHandler);
    });

    it('5.1 GET /hrms/recruitment/onboarding returns 200 and list', async () => {
      vi.spyOn(RecruitmentOnboardingService.prototype, 'listOnboardings').mockResolvedValueOnce({
        items: [
          {
            ...sampleOnboarding,
            candidate: sampleCandidate,
            application: sampleHiredApplication,
            requisition: sampleRequisition,
            createdEmployee: null,
            duplicateCheck: { hasConflict: false, conflictSeverity: 'none' },
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const res = await request(app).get('/api/v1/hrms/recruitment/onboarding');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('5.2 POST /hrms/recruitment/applications/:id/initiate-onboarding returns 201', async () => {
      vi.spyOn(RecruitmentOnboardingService.prototype, 'initiateOnboarding').mockResolvedValueOnce({
        ...sampleOnboarding,
        candidate: sampleCandidate,
        application: sampleHiredApplication,
        requisition: sampleRequisition,
        createdEmployee: null,
        duplicateCheck: { hasConflict: false, conflictSeverity: 'none' },
      });

      const res = await request(app)
        .post(
          `/api/v1/hrms/recruitment/applications/${sampleHiredApplication.id}/initiate-onboarding`,
        )
        .send({ targetJoiningDate: '2026-11-20' });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(sampleOnboarding.id);
    });

    it('5.3 POST /hrms/recruitment/onboarding/:id/confirm returns 200 on success', async () => {
      vi.spyOn(RecruitmentOnboardingService.prototype, 'confirmOnboarding').mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'completed',
        createdEmployeeId: sampleCreatedEmployee.id,
        createdEmployee: sampleCreatedEmployee,
        candidate: sampleCandidate,
        application: sampleHiredApplication,
        requisition: sampleRequisition,
        duplicateCheck: { hasConflict: false, conflictSeverity: 'none' },
      });

      const res = await request(app)
        .post(`/api/v1/hrms/recruitment/onboarding/${sampleOnboarding.id}/confirm`)
        .send({ notes: 'Confirmed.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.createdEmployee.employeeNumber).toBe('EMP-1005');
    });

    it('5.4 unauthorized user without hrms.recruitment.onboarding_confirm is rejected with 403', async () => {
      const unauthorizedApp = express();
      unauthorizedApp.use(express.json());
      unauthorizedApp.use((req, _res, next) => {
        req.user = { id: 'usr_viewer', email: 'viewer@company.com' } as any;
        req.companyContext = { tenantId, companyId } as any;
        req.access = {
          tenantId,
          companyId,
          roles: ['viewer'],
          permissions: ['hrms.recruitment.onboarding_view'], // only view, lacks confirm!
        } as any;
        next();
      });
      unauthorizedApp.use('/api/v1', recruitmentRouter);
      unauthorizedApp.use(errorHandler);

      const res = await request(unauthorizedApp)
        .post(`/api/v1/hrms/recruitment/onboarding/${sampleOnboarding.id}/confirm`)
        .send({});

      expect(res.status).toBe(403);
    });
  });
});
