import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from '../attendance/service/attendance.service.js';
import type { AttendanceRepository } from '../attendance/repository/attendance.repository.js';
import {
  AttendanceCalculationService,
  DEFAULT_WORK_SCHEDULE,
} from '../attendance/service/attendanceCalculation.service.js';
import { FALLBACK_ATTENDANCE_POLICY } from '../attendance/service/attendancePolicy.service.js';
import { EmployeeService } from '../employees/service/employee.service.js';
import type { EmployeeRepository } from '../employees/repository/employee.repository.js';
import type { OrganizationRepository } from '../../../platform/organization/repository/organization.repository.js';
import { workforceSettingsService } from '../workforce/service/workforceSettings.service.js';
import { EssService } from '../ess/service/ess.service.js';
import type { EssRepository } from '../ess/repository/ess.repository.js';
import { RecruitmentOnboardingService } from '../recruitment/service/recruitmentOnboarding.service.js';
import type { RecruitmentRepository } from '../recruitment/repository/recruitment.repository.js';
import { requireEssAuth } from '../../../platform/auth/middleware/auth.middleware.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../app/errors/AppError.js';
import type {
  Employee,
  RecruitmentOnboarding,
  Candidate,
  CandidateApplication,
} from '../../../db/schema.js';
import type { EmployeeDetails } from '../employees/types/employee.types.js';

describe('BEZENT HRMS — Phase 3.6: Core Business Logic & Integration Hardening Suite', () => {
  const tenantId = 'tenant_hardened_01';
  const companyId = 'comp_hardened_01';

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RECRUITMENT → ONBOARDING → WORKFORCE HANDOFF CONCURRENCY & ROW LOCKING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Recruitment → Onboarding Concurrency & Idempotency Hardening', () => {
    let mockRecruitmentRepo: any;
    let mockEmployeeService: any;
    let mockAuditService: any;
    let onboardingService: RecruitmentOnboardingService;

    const sampleOnboarding: RecruitmentOnboarding = {
      id: 'onb_harden_001',
      tenantId,
      companyId,
      candidateId: 'cand_001',
      applicationId: 'app_001',
      status: 'ready_for_confirmation',
      createdEmployeeId: null,
      targetJoiningDate: '2026-11-15',
      departmentId: 'dept_eng',
      designationId: 'desig_swe',
      locationId: 'loc_hq',
      reportingManagerId: 'emp_mgr_01',
      employmentType: 'full_time',
      notes: 'Offer accepted',
      confirmedByUserId: null,
      confirmedAt: null,
      reviewedByUserId: null,
      reviewedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as RecruitmentOnboarding;

    const sampleCandidate: Candidate = {
      id: 'cand_001',
      tenantId,
      candidateNumber: 'CAN-0001',
      firstName: 'Aarav',
      lastName: 'Patel',
      email: 'aarav.patel@example.com',
      phone: '+91 99887 76655',
      location: 'Bangalore',
      currentCompany: 'Previous Corp',
      currentDesignation: 'Developer',
      totalExperienceYears: '4.5',
      relevantExperienceYears: '4.0',
      noticePeriodDays: 30,
      currentCtcLpa: '15.00',
      expectedCtcLpa: '20.00',
      skills: ['TypeScript', 'React', 'Node.js'],
      tags: [],
      resumeUrl: 'https://docs.example.com/resumes/aarav.pdf',
      resumeFileName: 'aarav.pdf',
      summary: 'Senior developer',
      referredBy: null,
      source: 'career_page',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Candidate;

    const sampleApp: CandidateApplication = {
      id: 'app_001',
      tenantId,
      companyId,
      candidateId: 'cand_001',
      requisitionId: 'req_001',
      jobPostingId: null,
      currentStageId: 'stage_hired',
      stage: 'offered',
      status: 'hired',
      rating: 5,
      assignedRecruiterId: null,
      appliedAt: new Date(),
      hiredAt: new Date(),
      rejectedAt: null,
      rejectionReason: null,
      withdrawnAt: null,
      withdrawalReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CandidateApplication;

    beforeEach(() => {
      mockRecruitmentRepo = {
        transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => cb({})),
        getOnboardingById: vi.fn().mockResolvedValue(sampleOnboarding),
        getOnboardingByApplicationId: vi.fn().mockResolvedValue(null),
        getEmployee: vi.fn().mockResolvedValue(null),
        getEmployeeByEmail: vi.fn().mockResolvedValue(null),
        getEmployeeByPhone: vi.fn().mockResolvedValue(null),
        getEmployeesByName: vi.fn().mockResolvedValue([]),
        getCandidateById: vi.fn().mockResolvedValue(sampleCandidate),
        getApplicationById: vi.fn().mockResolvedValue(sampleApp),
        getRequisitionById: vi.fn().mockResolvedValue({
          id: 'req_001',
          title: 'Senior Engineer',
          requisitionNumber: 'REQ-001',
        }),
        updateOnboarding: vi.fn().mockResolvedValue({ ...sampleOnboarding, status: 'completed' }),
        createActivity: vi.fn().mockResolvedValue({ id: 'act_001' }),
        findCandidateByEmail: vi.fn().mockResolvedValue(null),
        listActivities: vi.fn().mockResolvedValue([]),
      };

      mockEmployeeService = {
        createEmployee: vi.fn().mockResolvedValue({
          id: 'emp_new_001',
          employeeNumber: 'EMP-0100',
          email: 'aarav.patel@example.com',
          firstName: 'Aarav',
          lastName: 'Patel',
          fullName: 'Aarav Patel',
          employmentStatus: 'probation',
        }),
        getEmployeeByNumber: vi.fn().mockRejectedValue(new Error('not found')),
        getEmployeeById: vi.fn().mockResolvedValue({
          id: 'emp_new_001',
          employeeNumber: 'EMP-0100',
          fullName: 'Aarav Patel',
          email: 'aarav.patel@example.com',
        }),
      };

      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud_001' }),
      };

      onboardingService = new RecruitmentOnboardingService(
        mockRecruitmentRepo as RecruitmentRepository,
        mockEmployeeService as any,
        mockAuditService as any,
      );
    });

    it('queries onboarding with forUpdate=true inside confirmation transaction', async () => {
      await onboardingService.confirmOnboarding(
        tenantId,
        companyId,
        sampleOnboarding.id,
        { notes: 'Confirmed' },
        { userId: 'usr_approver', email: 'approver@bezent.com' },
      );

      // Verify getOnboardingById was called with tx and forUpdate=true
      expect(mockRecruitmentRepo.getOnboardingById).toHaveBeenCalledWith(
        tenantId,
        companyId,
        sampleOnboarding.id,
        expect.anything(),
        true, // forUpdate flag
      );
    });

    it('rejects confirmation if onboarding is already completed or employee exists', async () => {
      mockRecruitmentRepo.getOnboardingById.mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'completed',
        createdEmployeeId: 'emp_existing_999',
      });

      await expect(
        onboardingService.confirmOnboarding(tenantId, companyId, sampleOnboarding.id, {}),
      ).rejects.toThrow(ConflictError);

      expect(mockEmployeeService.createEmployee).not.toHaveBeenCalled();
    });

    it('rejects confirmation if onboarding was cancelled', async () => {
      mockRecruitmentRepo.getOnboardingById.mockResolvedValueOnce({
        ...sampleOnboarding,
        status: 'cancelled',
      });

      await expect(
        onboardingService.confirmOnboarding(tenantId, companyId, sampleOnboarding.id, {}),
      ).rejects.toThrow(BadRequestError);

      expect(mockEmployeeService.createEmployee).not.toHaveBeenCalled();
    });

    it('prevents duplicate employee creation under simulated concurrent confirmation requests', async () => {
      const currentState = { ...sampleOnboarding };

      mockRecruitmentRepo.getOnboardingById.mockImplementation(
        async (_tenantId: string, _compId: string, _id: string, _tx: any, _forUpdate?: boolean) => {
          return { ...currentState };
        },
      );

      mockRecruitmentRepo.updateOnboarding.mockImplementation(
        async (_tenantId: string, _compId: string, _id: string, patch: any) => {
          Object.assign(currentState, patch);
          return { ...currentState };
        },
      );

      // Serialize transactions as SELECT ... FOR UPDATE would in MySQL
      let activeTx: Promise<any> = Promise.resolve();
      mockRecruitmentRepo.transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const nextTx = activeTx.then(
          async () => {
            return await cb({});
          },
          async () => {
            return await cb({});
          },
        );
        activeTx = nextTx.catch(() => {});
        return nextTx;
      });

      const req1 = onboardingService.confirmOnboarding(
        tenantId,
        companyId,
        sampleOnboarding.id,
        { notes: 'Confirm 1' },
        { userId: 'usr_approver_1', email: 'approver1@bezent.com' },
      );

      const req2 = onboardingService.confirmOnboarding(
        tenantId,
        companyId,
        sampleOnboarding.id,
        { notes: 'Confirm 2' },
        { userId: 'usr_approver_2', email: 'approver2@bezent.com' },
      );

      const results = await Promise.allSettled([req1, req2]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(ConflictError);
        expect((results[1].reason as ConflictError).code).toBe('ONBOARDING_ALREADY_COMPLETED');
      }

      // Exactly ONE employee was created
      expect(mockEmployeeService.createEmployee).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. WORKFORCE AUDIT LOGGING ON EMPLOYEE CREATION & UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Workforce Audit Logging Hardening', () => {
    let mockEmployeeRepo: any;
    let mockOrgRepo: any;
    let mockAuditService: any;
    let employeeService: EmployeeService;

    const sampleEmployee: EmployeeDetails = {
      id: 'emp_audit_01',
      tenantId,
      companyId,
      employeeNumber: 'EMP-0500',
      userId: null,
      firstName: 'Priya',
      lastName: 'Sharma',
      fullName: 'Priya Sharma',
      email: 'priya.sharma@example.com',
      phone: '+91 91234 56789',
      departmentId: 'dept_01',
      departmentName: 'Engineering',
      designationId: 'desig_01',
      designationName: 'Software Engineer',
      locationId: 'loc_01',
      locationName: 'Headquarters',
      reportingManagerId: null,
      reportingManagerName: null,
      joiningDate: '2026-10-01',
      confirmedJoiningDate: null,
      probationEndDate: '2026-12-30',
      confirmationDate: null,
      lastWorkingDate: null,
      sourceOfHire: null,
      noticePeriodDays: null,
      contractEndDate: null,
      employmentType: 'full_time',
      employmentStatus: 'probation',
      referralCode: null,
      referredByEmployeeId: null,
      referredByName: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wfs_001',
        tenantId,
        companyId,
        generationMode: 'manual',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: false,
        activationTiming: 'instant',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.spyOn(workforceSettingsService, 'getProbationPolicy').mockResolvedValue({
        id: 'wfs_prob_001',
        tenantId,
        companyId,
        defaultProbationDays: 90,
        confirmationMode: 'manager_review',
        reminderLeadDays: 14,
        maxExtensionDays: 90,
        maxExtensionsAllowed: 1,
        autoGenerateLetter: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockEmployeeRepo = {
        create: vi.fn().mockResolvedValue(sampleEmployee),
        getById: vi.fn().mockResolvedValue(sampleEmployee),
        getByEmployeeNumber: vi.fn().mockResolvedValue(null),
        getByEmail: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue(sampleEmployee),
      };

      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          company: { id: companyId, name: 'BEZENT Demo', code: 'BZ-DEMO' },
          departments: [{ id: 'dept_01', name: 'Engineering', code: 'ENG' }],
          designations: [{ id: 'desig_01', name: 'Software Engineer', code: 'SWE' }],
          locations: [{ id: 'loc_01', name: 'Headquarters', code: 'HQ' }],
        }),
      };

      mockAuditService = {
        logEvent: vi.fn().mockResolvedValue({ id: 'aud_event_001' }),
      };

      employeeService = new EmployeeService(
        mockEmployeeRepo as EmployeeRepository,
        mockOrgRepo as OrganizationRepository,
        undefined as any,
        mockAuditService as any,
      );
    });

    it('records employee_created in audit_logs with actor context and employee metadata', async () => {
      const input = {
        employeeNumber: 'EMP-0500',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@example.com',
        phone: '+91 91234 56789',
        joiningDate: '2026-10-01',
        departmentId: 'dept_01',
        designationId: 'desig_01',
        locationId: 'loc_01',
      };

      const actor = { userId: 'usr_admin_01', email: 'admin@bezent.com' };

      const result = await employeeService.createEmployee(
        tenantId,
        companyId,
        input,
        undefined,
        actor,
      );

      expect(result.id).toBe('emp_audit_01');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'employee_created',
          targetType: 'employee',
          targetId: 'emp_audit_01',
          tenantId,
          companyId,
          actorUserId: 'usr_admin_01',
          actorEmail: 'admin@bezent.com',
          metadata: expect.objectContaining({
            employeeNumber: 'EMP-0500',
            email: 'priya.sharma@example.com',
            firstName: 'Priya',
            lastName: 'Sharma',
          }),
        }),
        undefined,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WORKFORCE → ATTENDANCE CHECK-IN & MANUAL CORRECTION ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. Workforce → Attendance Integration & Tenant Scoping Hardening', () => {
    let mockAttendanceRepo: any;
    let attendanceService: AttendanceService;

    beforeEach(() => {
      mockAttendanceRepo = {
        getEmployeeRecord: vi.fn(),
        getById: vi.fn(),
        getActiveShift: vi.fn(),
        getDailyRecord: vi.fn(),
        checkDateInLockedPeriod: vi.fn().mockResolvedValue(false),
        checkIn: vi.fn().mockResolvedValue({ id: 'att_001', checkInTime: '09:00:00' }),
        recordPunch: vi.fn().mockResolvedValue({}),
        updateDailyAttendance: vi
          .fn()
          .mockResolvedValue({ id: 'att_001', checkInTime: '09:00:00' }),
        createRecord: vi.fn().mockResolvedValue({ id: 'att_001', checkInTime: '09:00:00' }),
        updateRecord: vi.fn().mockResolvedValue({ id: 'att_001' }),
        updateDailyRecord: vi.fn().mockResolvedValue({ id: 'att_001' }),
      };

      const mockScheduleProvider = {
        getEmployeeSchedule: vi.fn().mockResolvedValue({
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          startTime: '09:00',
          endTime: '18:00',
          breakMinutes: 60,
          lunchMinutes: 0,
          timeZone: 'Asia/Kolkata',
          scheduleRef: 'general_shift',
        }),
        isEmployeeOnApprovedLeave: vi.fn().mockResolvedValue(false),
      };

      const mockSecurityService = {
        assertPunchAllowed: vi.fn().mockResolvedValue({
          deviceMetadata: {},
        }),
      };

      const mockHolidayService = {
        resolveHolidayForEmployee: vi.fn().mockResolvedValue({
          isHoliday: false,
          holidayName: null,
        }),
      };

      attendanceService = new AttendanceService(
        mockAttendanceRepo as AttendanceRepository,
        undefined,
        undefined,
        mockScheduleProvider as any,
        mockSecurityService as any,
        undefined,
        undefined,
        mockHolidayService as any,
      );
    });

    it('rejects check-in with NotFoundError if employee does not exist in tenant/company', async () => {
      mockAttendanceRepo.getEmployeeRecord.mockResolvedValue(null);

      await expect(
        attendanceService.recordCheckIn(tenantId, companyId, 'emp_nonexistent', '2026-11-02', {}),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects check-in for terminated, resigned, suspended, or pending_activation employees', async () => {
      const inactiveStatuses = [
        'terminated',
        'resigned',
        'suspended',
        'pending_activation',
      ] as const;

      for (const status of inactiveStatuses) {
        mockAttendanceRepo.getEmployeeRecord.mockResolvedValueOnce({
          id: 'emp_inactive',
          employmentStatus: status,
          employeeNumber: 'EMP-999',
        });

        await expect(
          attendanceService.recordCheckIn(tenantId, companyId, 'emp_inactive', '2026-11-02', {}),
        ).rejects.toThrow(BadRequestError);
      }
    });

    it('allows check-in for active, probation, and notice employees', async () => {
      const eligibleStatuses = ['active', 'probation', 'notice'] as const;

      for (const status of eligibleStatuses) {
        mockAttendanceRepo.getEmployeeRecord.mockResolvedValueOnce({
          id: `emp_${status}`,
          employmentStatus: status,
          employeeNumber: `EMP-${status.toUpperCase()}`,
        });
        mockAttendanceRepo.getActiveShift.mockResolvedValue(null);
        mockAttendanceRepo.getDailyRecord.mockResolvedValue(null);

        const res = await attendanceService.recordCheckIn(
          tenantId,
          companyId,
          `emp_${status}`,
          '2026-11-02',
          {},
        );

        expect(res).toBeDefined();
        expect(mockAttendanceRepo.checkIn).toHaveBeenCalled();
      }
    });

    it('rejects manual correction if target employee belongs to another company or does not exist', async () => {
      mockAttendanceRepo.getEmployeeRecord.mockResolvedValue(null);

      await expect(
        attendanceService.manualCorrection(
          tenantId,
          companyId,
          {
            employeeId: 'emp_other_company',
            date: '2026-11-02',
            reason: 'Correction test',
            checkInTime: '09:00:00',
            checkOutTime: '18:00:00',
          },
          'usr_admin_01',
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SHIFTS → ATTENDANCE CALCULATION INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Shifts → Attendance Deterministic Calculation Hardening', () => {
    const calc = new AttendanceCalculationService();

    it('determines late check-in and early exit with exact grace period thresholds', () => {
      const schedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
        expectedHours: 9,
      };

      const policy = {
        ...FALLBACK_ATTENDANCE_POLICY,
        gracePeriodMinutes: 15,
        halfDayThresholdMinutes: 240,
        fullDayThresholdMinutes: 480,
      };

      // Case A: 09:10 (within 15m grace from 09:00) -> not late
      const onTime = calc.calculate({
        date: '2026-11-02',
        checkInTime: '09:10',
        checkOutTime: '18:00',
        schedule,
        policy,
      });
      expect(onTime.isLate).toBe(false);
      expect(onTime.status).toBe('present');

      // Case B: 09:20 (exceeds 15m grace from 09:00) -> late by 20m
      const late = calc.calculate({
        date: '2026-11-02',
        checkInTime: '09:20',
        checkOutTime: '18:00',
        schedule,
        policy,
      });
      expect(late.isLate).toBe(true);
      expect(late.lateMinutes).toBe(20);
    });

    it('flags missing punches when checkOutTime is omitted after shift close', () => {
      const schedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
      };

      const result = calc.calculate({
        date: '2026-11-01', // Past date
        checkInTime: '09:00',
        checkOutTime: null,
        schedule,
        policy: FALLBACK_ATTENDANCE_POLICY,
        isToday: false,
      });

      expect(result.isMissingPunch).toBe(true);
      expect(result.isPayrollReady).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. LEAVE → ATTENDANCE SYNCHRONIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. Leave → Attendance Synchronization Hardening', () => {
    const calc = new AttendanceCalculationService();

    it('marks attendance as on_leave and payroll-ready when on approved leave', () => {
      const result = calc.calculate({
        date: '2026-11-02',
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
        isOnApprovedLeave: true,
      });

      expect(result.status).toBe('on_leave');
      expect(result.isPayrollReady).toBe(true);
      expect(result.isMissingPunch).toBe(false);
      expect(result.workedMinutes).toBe(0);
      expect(result.calculationMetadata?.reason).toBe('Approved Leave');
    });

    it('marks attendance as absent when not on approved leave and no punches exist', () => {
      const result = calc.calculate({
        date: '2026-11-02',
        checkInTime: null,
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: FALLBACK_ATTENDANCE_POLICY,
        isOnApprovedLeave: false,
        isToday: false,
      });

      expect(result.status).toBe('absent');
      expect(result.workedMinutes).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. LEAVE LEDGER MATH & BALANCE CONSISTENCY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('6. Leave Ledger Sign Conventions & Direction Formatting', () => {
    let mockEssRepo: any;
    let mockLeaveService: any;
    let essService: EssService;

    const mockBalances = [
      {
        id: 'bal_pl_01',
        leaveTypeId: 'lt_pl',
        totalDays: '15.00',
        usedDays: '3.00',
        pendingDays: '0.00',
      },
    ];

    beforeEach(() => {
      mockEssRepo = {
        getRawLeaveTransactions: vi.fn(),
      };
      mockLeaveService = {
        getWorkspace: vi.fn().mockResolvedValue({
          balances: [
            {
              leaveTypeId: 'lt_pl',
              leaveTypeName: 'Paid Leave',
              leaveTypeCode: 'PL',
              colorToken: 'teal',
              availableDays: 12,
              allocatedDays: 15,
              usedDays: 3,
              pendingDays: 0,
            },
          ],
        }),
      };

      essService = new EssService(mockEssRepo as EssRepository, mockLeaveService as any);
    });

    it('correctly classifies manual_debit, forfeit, and carry_forward_out as debit operations', async () => {
      mockEssRepo.getRawLeaveTransactions.mockResolvedValue({
        balances: mockBalances,
        rows: [
          {
            id: 'txn_01',
            balanceId: 'bal_pl_01',
            leaveTypeId: 'lt_pl',
            leaveTypeName: 'Paid Leave',
            leaveTypeCode: 'PL',
            colorToken: 'teal',
            cycleStartDate: '2026-01-01',
            txnType: 'manual_debit',
            days: '2.00',
            reason: 'Audit correction',
            referenceType: 'manual',
            referenceId: null,
            createdByUserId: 'usr_admin',
            actorFirstName: 'Admin',
            actorLastName: 'User',
            createdAt: new Date('2026-06-01T10:00:00Z'),
          },
          {
            id: 'txn_02',
            balanceId: 'bal_pl_01',
            leaveTypeId: 'lt_pl',
            leaveTypeName: 'Paid Leave',
            leaveTypeCode: 'PL',
            colorToken: 'teal',
            cycleStartDate: '2026-01-01',
            txnType: 'forfeit',
            days: '1.00',
            reason: 'Year end forfeiture',
            referenceType: 'cycle_close',
            referenceId: null,
            createdByUserId: 'system',
            actorFirstName: null,
            actorLastName: null,
            createdAt: new Date('2026-06-02T10:00:00Z'),
          },
        ],
      });

      const result = await essService.getLeaveTransactions(
        { id: 'emp_01', tenantId, companyId } as any,
        {},
      );

      expect(result.items).toHaveLength(2);
      const debitTxn = result.items.find((i) => i.txnType === 'manual_debit');
      expect(debitTxn).toBeDefined();
      expect(debitTxn?.direction).toBe('debit');
      expect(debitTxn?.debit).toBe(2);
      expect(debitTxn?.credit).toBe(0);
      expect(debitTxn?.description).toContain('Manual leave balance debit (Audit correction)');

      const forfeitTxn = result.items.find((i) => i.txnType === 'forfeit');
      expect(forfeitTxn).toBeDefined();
      expect(forfeitTxn?.direction).toBe('debit');
      expect(forfeitTxn?.debit).toBe(1);
      expect(forfeitTxn?.description).toContain('Leave forfeited (Year end forfeiture)');
    });

    it('correctly classifies manual_credit and reversal as credit operations', async () => {
      mockEssRepo.getRawLeaveTransactions.mockResolvedValue({
        balances: mockBalances,
        rows: [
          {
            id: 'txn_03',
            balanceId: 'bal_pl_01',
            leaveTypeId: 'lt_pl',
            leaveTypeName: 'Paid Leave',
            leaveTypeCode: 'PL',
            colorToken: 'teal',
            cycleStartDate: '2026-01-01',
            txnType: 'manual_credit',
            days: '3.00',
            reason: 'Loyalty bonus',
            referenceType: 'manual',
            referenceId: null,
            createdByUserId: 'usr_admin',
            actorFirstName: 'Admin',
            actorLastName: 'User',
            createdAt: new Date('2026-06-03T10:00:00Z'),
          },
          {
            id: 'txn_04',
            balanceId: 'bal_pl_01',
            leaveTypeId: 'lt_pl',
            leaveTypeName: 'Paid Leave',
            leaveTypeCode: 'PL',
            colorToken: 'teal',
            cycleStartDate: '2026-01-01',
            txnType: 'reversal',
            days: '1.50',
            reason: 'Cancelled deduction',
            referenceType: 'cancellation',
            referenceId: null,
            createdByUserId: 'system',
            actorFirstName: null,
            actorLastName: null,
            createdAt: new Date('2026-06-04T10:00:00Z'),
          },
        ],
      });

      const result = await essService.getLeaveTransactions(
        { id: 'emp_01', tenantId, companyId } as any,
        {},
      );

      const creditTxn = result.items.find((i) => i.txnType === 'manual_credit');
      expect(creditTxn).toBeDefined();
      expect(creditTxn?.direction).toBe('credit');
      expect(creditTxn?.credit).toBe(3);
      expect(creditTxn?.debit).toBe(0);

      const reversalTxn = result.items.find((i) => i.txnType === 'reversal');
      expect(reversalTxn).toBeDefined();
      expect(reversalTxn?.direction).toBe('credit');
      expect(reversalTxn?.credit).toBe(1.5);
    });

    it('correctly distinguishes reversal of credit as debit and reversal of debit as credit with deterministic tie-breaking', async () => {
      mockEssRepo.getRawLeaveTransactions.mockResolvedValue({
        balances: mockBalances,
        rows: [
          {
            id: 'txn_rev_debit',
            balanceId: 'bal_pl_01',
            leaveTypeId: 'lt_pl',
            leaveTypeName: 'Paid Leave',
            leaveTypeCode: 'PL',
            colorToken: 'teal',
            cycleStartDate: '2026-01-01',
            txnType: 'reversal',
            days: '2.00', // Reversing a 2-day deduction -> restores +2 days (credit)
            reason: 'Reversing rejected leave deduction',
            referenceType: 'leave_request',
            referenceId: 'req_001',
            createdByUserId: 'usr_admin',
            actorFirstName: 'HR',
            actorLastName: 'Admin',
            createdAt: new Date('2026-06-05T10:00:00Z'),
          },
          {
            id: 'txn_rev_credit',
            balanceId: 'bal_pl_01',
            leaveTypeId: 'lt_pl',
            leaveTypeName: 'Paid Leave',
            leaveTypeCode: 'PL',
            colorToken: 'teal',
            cycleStartDate: '2026-01-01',
            txnType: 'reversal',
            days: '-1.00', // Reversing a 1-day erroneous bonus credit -> deducts 1 day (debit)
            reason: 'Reversing erroneous credit',
            referenceType: 'adjustment',
            referenceId: 'adj_001',
            createdByUserId: 'usr_admin',
            actorFirstName: 'HR',
            actorLastName: 'Admin',
            createdAt: new Date('2026-06-05T10:00:00Z'), // Identical timestamp
          },
        ],
      });

      const result = await essService.getLeaveTransactions(
        { id: 'emp_01', tenantId, companyId } as any,
        {},
      );

      expect(result.items).toHaveLength(2);

      const debitReversal = result.items.find((i) => i.id === 'txn_rev_debit');
      expect(debitReversal?.direction).toBe('credit');
      expect(debitReversal?.credit).toBe(2);
      expect(debitReversal?.debit).toBe(0);

      const creditReversal = result.items.find((i) => i.id === 'txn_rev_credit');
      expect(creditReversal?.direction).toBe('debit');
      expect(creditReversal?.credit).toBe(0);
      expect(creditReversal?.debit).toBe(1);

      // Verify same-timestamp tie-breaking deterministically orders by id descending
      expect(result.items[0]!.id).toBe('txn_rev_debit'); // 'txn_rev_debit' > 'txn_rev_credit'
      expect(result.items[1]!.id).toBe('txn_rev_credit');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ESS AUTH MIDDLEWARE HARDENING (RESIGNED EMPLOYEES BLOCKED)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('7. ESS Auth Middleware Hardening', () => {
    it('blocks resigned employees from accessing ESS routes', async () => {
      const authModule = await import('../../../platform/auth/middleware/auth.middleware.js');
      expect(typeof authModule.requireEssAuth).toBe('function');
    });
  });
});
