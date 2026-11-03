import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AttendanceCalculationService,
  DEFAULT_WORK_SCHEDULE,
} from '../attendance/service/attendanceCalculation.service.js';
import { AttendanceSettingsService } from '../attendance/service/attendanceSettings.service.js';
import type { AttendanceSettingsRepository } from '../attendance/repository/attendanceSettings.repository.js';
import type { AttendanceRepository } from '../attendance/repository/attendance.repository.js';
import { FALLBACK_ATTENDANCE_POLICY } from '../attendance/service/attendancePolicy.service.js';
import type { AttendancePolicy, ShiftSchedule } from '../attendance/types/attendance.types.js';
import { EmployeeService } from '../employees/service/employee.service.js';
import {
  WorkforceSettingsService,
  workforceSettingsService,
} from '../workforce/service/workforceSettings.service.js';
import type { WorkforceSettingsRepository } from '../workforce/repository/workforceSettings.repository.js';
import { LeaveGeneralSettingsService } from '../leave/service/leaveGeneralSettings.service.js';
import type { LeaveGeneralSettingsRepository } from '../leave/repository/leaveGeneralSettings.repository.js';
import { LeaveAccrualService } from '../leave/service/leaveAccrual.service.js';
import type { LeaveAccrualRepository } from '../leave/repository/leaveAccrual.repository.js';
import { planApprovalSteps } from '../leave/rules/leaveApproval.js';
import { BadRequestError, ConflictError, ForbiddenError } from '../../../app/errors/AppError.js';
import type { Employee, LeaveApprovalLevel, LeaveGeneralSettings } from '../../../db/schema.js';

describe('BEZENT HRMS — Phase 1 Business Correctness Suite', () => {
  const tenantId = 'tenant_phase1_test';
  const companyId = 'comp_phase1_test';

  // ═════════════════════════════════════════════════════════════════════════════
  // WORKFORCE: W1 & W2 — Atomic Employee ID & No Silent Fallbacks
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Workforce: W1 & W2 — Employee ID Reservation & Validation Integrity', () => {
    let mockWorkforceRepo: any;
    let workforceService: WorkforceSettingsService;
    let mockEmployeeRepo: any;
    let mockOrgRepo: any;
    let mockProfileService: any;
    let employeeService: EmployeeService;

    beforeEach(() => {
      let counter = 100;
      mockWorkforceRepo = {
        getEmployeeIdSettings: vi.fn().mockResolvedValue({
          id: 'wfs_num',
          tenantId,
          companyId,
          prefix: 'EMP',
          suffix: 'HQ',
          minDigits: 4,
          currentSequence: 100,
        }),
        getNextSequenceAndIncrement: vi.fn().mockImplementation(async () => {
          counter++;
          return {
            nextId: `EMP-${counter.toString().padStart(4, '0')}-HQ`,
            sequenceNumber: counter,
            prefix: 'EMP',
            suffix: 'HQ',
          };
        }),
      };
      workforceService = new WorkforceSettingsService(
        mockWorkforceRepo as WorkforceSettingsRepository,
      );

      mockEmployeeRepo = {
        getByEmail: vi.fn().mockResolvedValue(null),
        getByEmployeeNumber: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async (data) => ({
          ...data,
          id: 'emp_created_1',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findDetailsById: vi.fn().mockResolvedValue({
          id: 'emp_created_1',
          tenantId,
          companyId,
          employeeNumber: 'EMP-0101-HQ',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
        }),
      };

      mockOrgRepo = {
        getMasters: vi.fn().mockResolvedValue({
          departments: [{ id: 'dept_1', name: 'Eng' }],
          designations: [{ id: 'desig_1', name: 'Dev' }],
          locations: [{ id: 'loc_1', name: 'HQ' }],
        }),
      };

      mockProfileService = {};

      vi.spyOn(workforceSettingsService, 'getGeneralSettings').mockResolvedValue({
        id: 'wfs_gen_1',
        tenantId,
        companyId,
        generationMode: 'automatic',
        idPrefix: 'EMP-',
        idSuffix: null,
        sequenceLength: 4,
        startingNumber: 1001,
        currentCounter: 1000,
        resetFrequency: 'never',
        allowManualOverride: true,
        preventIdReuse: true,
        autoProvisionUser: true,
        activationTiming: 'instant',
        createdAt: new Date(),
        updatedAt: new Date(),
        nextSuggestedId: 'EMP-1001',
      });

      employeeService = new EmployeeService(mockEmployeeRepo, mockOrgRepo, mockProfileService);
    });

    it('W1: reserves atomic, zero-padded, formatted employee IDs adhering to config', async () => {
      const res1 = await workforceService.reserveNextEmployeeId(tenantId, companyId);
      expect(res1.nextId).toBe('EMP-0101-HQ');
      expect(res1.sequenceNumber).toBe(101);

      const res2 = await workforceService.reserveNextEmployeeId(tenantId, companyId);
      expect(res2.nextId).toBe('EMP-0102-HQ');
      expect(res2.sequenceNumber).toBe(102);
    });

    it('W1: concurrent reservation requests receive strictly unique, non-colliding IDs', async () => {
      const promises = Array.from({ length: 25 }, () =>
        workforceService.reserveNextEmployeeId(tenantId, companyId),
      );
      const results = await Promise.all(promises);
      const idSet = new Set(results.map((r) => r.nextId));
      expect(idSet.size).toBe(25);
    });

    it('W2: validation failure in createEmployee does NOT consume sequence counter', async () => {
      mockEmployeeRepo.getByEmail = vi.fn().mockResolvedValue({ id: 'existing_emp' } as Employee);

      await expect(
        employeeService.createEmployee(tenantId, companyId, {
          firstName: 'Duplicate',
          lastName: 'User',
          email: 'duplicate@example.com',
          departmentId: 'dept_1',
          designationId: 'desig_1',
          locationId: 'loc_1',
          joiningDate: '2026-10-01',
          employmentType: 'full_time',
        }),
      ).rejects.toThrow(ConflictError);

      // Sequence reservation was not called because validation failed first
      expect(mockWorkforceRepo.getNextSequenceAndIncrement).not.toHaveBeenCalled();
    });

    it('W2: database sequence failure propagates meaningful error and NEVER falls back to EMP-XXXX', async () => {
      // Mock workforceSettingsService inside employee.service to fail
      const workforceModule = await import('../workforce/service/workforceSettings.service.js');
      vi.spyOn(
        workforceModule.workforceSettingsService,
        'reserveNextEmployeeId',
      ).mockRejectedValueOnce(new Error('Deadlock / Connection error'));

      await expect(
        employeeService.createEmployee(tenantId, companyId, {
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          departmentId: 'dept_1',
          designationId: 'desig_1',
          locationId: 'loc_1',
          joiningDate: '2026-10-01',
          employmentType: 'full_time',
        }),
      ).rejects.toThrow('Deadlock / Connection error');

      // Crucial: Employee creation must NOT have been called with a fallback EMP-XXXX number!
      expect(mockEmployeeRepo.create).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // ATTENDANCE: A2, A3, X5 — Policies & Public Holiday Integration
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Attendance: A2, A3, X5 — Policy Immutability & Shared Holiday Resolution', () => {
    let mockSettingsRepo: any;
    let mockAttRepo: any;
    let settingsService: AttendanceSettingsService;
    let calculationService: AttendanceCalculationService;

    const publishedPolicy1: AttendancePolicy = {
      ...FALLBACK_ATTENDANCE_POLICY,
      id: 'pol_1',
      tenantId,
      companyId,
      policyName: 'Standard Policy V1',
      version: 1,
      status: 'published',
      scope: 'company',
      scopeId: null,
      overridesPriority: 0,
      effectiveFrom: '2026-01-01',
      halfDayThresholdHours: '4.00',
      fullDayThresholdHours: '8.00',
    };

    const publishedPolicy2: AttendancePolicy = {
      ...FALLBACK_ATTENDANCE_POLICY,
      id: 'pol_2',
      tenantId,
      companyId,
      policyName: 'Winter Policy V2',
      version: 2,
      status: 'published',
      scope: 'company',
      scopeId: null,
      overridesPriority: 0,
      effectiveFrom: '2026-12-01',
      halfDayThresholdHours: '4.50',
      fullDayThresholdHours: '8.50',
    };

    beforeEach(() => {
      mockSettingsRepo = {
        getPolicyById: vi.fn().mockImplementation(async (_t, _c, id) => {
          if (id === 'pol_1') return publishedPolicy1;
          if (id === 'pol_2') return publishedPolicy2;
          if (id === 'pol_draft')
            return { ...publishedPolicy1, id: 'pol_draft', status: 'draft', version: 3 };
          return null;
        }),
        getEmployeeDepartmentId: vi.fn().mockResolvedValue(null),
        listPolicies: vi.fn().mockImplementation(async (_t, _c, filter) => {
          const list = [publishedPolicy2, publishedPolicy1];
          if (filter?.effectiveBefore) {
            return list.filter((p) => p.effectiveFrom <= filter.effectiveBefore);
          }
          return list;
        }),
        updatePolicy: vi.fn().mockResolvedValue(publishedPolicy1),
        findDuplicatePolicyByEffectiveDate: vi.fn().mockResolvedValue(null),
      };
      mockAttRepo = {};

      settingsService = new AttendanceSettingsService(
        mockSettingsRepo as AttendanceSettingsRepository,
        mockAttRepo as AttendanceRepository,
      );
      calculationService = new AttendanceCalculationService();
    });

    it('A2: resolves correct effective policy across future-effective timeline without gap', async () => {
      const octRes = await settingsService.resolveEffectivePolicy(
        tenantId,
        companyId,
        undefined,
        undefined,
        '2026-10-15',
      );
      expect(octRes.policy.id).toBe('pol_1');
      expect(octRes.policy.version).toBe(1);

      const decRes = await settingsService.resolveEffectivePolicy(
        tenantId,
        companyId,
        undefined,
        undefined,
        '2026-12-15',
      );
      expect(decRes.policy.id).toBe('pol_2');
      expect(decRes.policy.version).toBe(2);
    });

    it('A3: rejects direct edits to published or archived policies with POLICY_IMMUTABLE', async () => {
      await expect(
        settingsService.updatePolicy(
          tenantId,
          companyId,
          'pol_1',
          { policyName: 'Mutated Policy' },
          'user_1',
        ),
      ).rejects.toThrow('immutable');
    });

    it('A3: validates threshold hours against merged config on policy update', async () => {
      // Trying to set halfDayThresholdHours (9.00) higher than fullDayThresholdHours (8.00)
      await expect(
        settingsService.updatePolicy(
          tenantId,
          companyId,
          'pol_draft',
          { halfDayThresholdHours: '9.00' },
          'user_1',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('X5: shared holiday resolution distinguishes holiday from weekly_off and absent', () => {
      const schedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      };

      // Case 1: Weekend non-working day without punches -> weekly_off
      const weeklyOffResult = calculationService.calculate({
        date: '2026-10-18', // Sunday
        checkInTime: null,
        checkOutTime: null,
        schedule,
        policy: publishedPolicy1,
        isHoliday: false,
      });
      expect(weeklyOffResult.status).toBe('weekly_off');

      // Case 2: Weekday public holiday without punches -> holiday (NOT absent, NOT weekly_off)
      const holidayResult = calculationService.calculate({
        date: '2026-10-20', // Tuesday, configured holiday
        checkInTime: null,
        checkOutTime: null,
        schedule,
        policy: publishedPolicy1,
        isHoliday: true,
        holidayName: 'Diwali',
      });
      expect(holidayResult.status).toBe('holiday');

      // Case 3: Normal working day without punches -> absent
      const absentResult = calculationService.calculate({
        date: '2026-10-21', // Wednesday, working day
        checkInTime: null,
        checkOutTime: null,
        schedule,
        policy: publishedPolicy1,
        isHoliday: false,
      });
      expect(absentResult.status).toBe('absent');

      // Case 4: Working on a public holiday credits work as present
      const workedHolidayResult = calculationService.calculate({
        date: '2026-10-20', // Tuesday holiday, worked full day
        checkInTime: '09:00:00',
        checkOutTime: '18:30:00',
        schedule,
        policy: publishedPolicy1,
        isHoliday: true,
        holidayName: 'Diwali',
      });
      expect(workedHolidayResult.status).toBe('present');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // LEAVE: L1, L2, L4 — Activation, Year-End Sweep, Approval Fallback
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Leave: L1, L2, L4 — Lifecycle, Sweep & Routing Correctness', () => {
    let mockGeneralRepo: Partial<LeaveGeneralSettingsRepository>;
    let leaveGeneralService: LeaveGeneralSettingsService;
    let mockAccrualRepo: any;
    let leaveAccrualService: LeaveAccrualService;

    const baseLeaveSettings: LeaveGeneralSettings = {
      id: 'lvgs_test',
      tenantId,
      companyId,
      leaveYearCycle: 'calendar_year',
      customYearStartDate: null,
      goLiveDate: '2024-01-01',
      dayCountingMethod: 'working_days',
      balancePrecision: 'two_decimals',
      balanceRoundingRule: 'nearest',
      maxBackdatedDays: 7,
      maxAdvanceBookingDays: 180,
      currentVersionNumber: 1,
      status: 'pre_activation',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockGeneralRepo = {
        ensureDefaultSettings: vi.fn().mockResolvedValue(baseLeaveSettings),
        getSettings: vi.fn().mockResolvedValue(baseLeaveSettings),
        hasLiveLeaveRecords: vi.fn().mockResolvedValue(false),
        getCompanyProfile: vi.fn().mockResolvedValue({
          timeZone: 'Asia/Kolkata',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        }),
        publishNewVersion: vi.fn().mockImplementation(async (_t, _c, input) => ({
          settings: {
            ...baseLeaveSettings,
            ...input,
            currentVersionNumber: 2,
          },
          version: {
            id: 'ver_phase1_1',
            versionNumber: 2,
            effectiveFrom: new Date(),
            changeReason: input.changeReason,
          },
        })),
        getActiveVersionAtTimestamp: vi.fn().mockResolvedValue(null),
        getLatestPublishedVersion: vi.fn().mockResolvedValue(null),
        getVersionHistory: vi.fn().mockResolvedValue([]),
      };

      leaveGeneralService = new LeaveGeneralSettingsService(
        mockGeneralRepo as LeaveGeneralSettingsRepository,
        { logEvent: vi.fn().mockResolvedValue(undefined) },
      );

      mockAccrualRepo = {
        listBalancesForCycle: vi.fn().mockResolvedValue([]),
        listRules: vi.fn().mockResolvedValue([]),
        findRuleFor: vi.fn().mockResolvedValue(null),
        findCloseRun: vi.fn().mockResolvedValue(null),
        recordPendingCycleClose: vi.fn().mockResolvedValue('run_pending_1'),
        markRunReviewed: vi.fn().mockResolvedValue(undefined),
        commitCycleClose: vi.fn().mockResolvedValue('run_committed_1'),
        listCompaniesWithPolicies: vi
          .fn()
          .mockResolvedValue([{ tenantId, companyId, timeZone: 'Asia/Kolkata' }]),
      };

      leaveAccrualService = new LeaveAccrualService(
        mockAccrualRepo as LeaveAccrualRepository,
        {} as any,
        {} as any,
        {} as any,
        leaveGeneralService,
        { logEvent: vi.fn().mockResolvedValue(undefined) },
      );
    });

    it('L1: pre-activation company can configure financial_year cycle', async () => {
      // For pre-activation, no persisted settings and no live records
      mockGeneralRepo.getSettings = vi.fn().mockResolvedValue(null);
      mockGeneralRepo.hasLiveLeaveRecords = vi.fn().mockResolvedValue(false);

      const res = await leaveGeneralService.updateSettings(
        tenantId,
        companyId,
        {
          leaveYearCycle: 'financial_year',
          goLiveDate: '2026-11-15',
          dayCountingMethod: 'calendar_days',
          balancePrecision: 'two_decimals',
          balanceRoundingRule: 'nearest',
          maxBackdatedDays: 14,
          maxAdvanceBookingDays: 90,
          expectedCurrentVersionNumber: 1,
          changeReason: 'Configured financial year cycle for pre-activation company.',
        },
        'user_1',
      );
      expect(res.settings.leaveYearCycle).toBe('financial_year');
    });

    it('L1: activated company with live records cannot alter leaveYearCycle', async () => {
      mockGeneralRepo.hasLiveLeaveRecords = vi.fn().mockResolvedValue(true);
      mockGeneralRepo.getSettings = vi.fn().mockResolvedValue({
        ...baseLeaveSettings,
        status: 'activated',
        goLiveDate: '2024-01-01',
      });

      await expect(
        leaveGeneralService.updateSettings(
          tenantId,
          companyId,
          {
            leaveYearCycle: 'financial_year',
            goLiveDate: '2024-01-01',
            dayCountingMethod: 'calendar_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            expectedCurrentVersionNumber: 1,
            changeReason: 'Attempting invalid financial year transition after activation.',
          },
          'user_1',
        ),
      ).rejects.toThrow('Leave year cycle cannot be altered after company activation');
    });

    it('L2: background year-end sweep creates pending run and never commits balances', async () => {
      const sweepResult = await leaveAccrualService.runYearEndSweep(
        new Date('2026-06-01T00:00:00Z'),
      );
      expect(sweepResult.pending).toBe(1);
      expect(sweepResult.closed).toBe(0);

      // Verify repo recorded a pending run, but NEVER committed balances
      expect(mockAccrualRepo.recordPendingCycleClose).toHaveBeenCalled();
      expect(mockAccrualRepo.commitCycleClose).not.toHaveBeenCalled();
    });

    it('L2: automated sweeps cannot commit; HR authorization is required', async () => {
      // System user is prohibited from committing
      await expect(
        leaveAccrualService.commitCycleClose(
          tenantId,
          companyId,
          '2025-01-01',
          'system',
          '2026-06-01',
        ),
      ).rejects.toThrow(ForbiddenError);

      // Authorized HR user can commit
      const commitRes = await leaveAccrualService.commitCycleClose(
        tenantId,
        companyId,
        '2025-01-01',
        'hr_admin_1',
        '2026-06-01',
      );
      expect(commitRes.runId).toBe('run_committed_1');
      expect(mockAccrualRepo.commitCycleClose).toHaveBeenCalled();
    });

    it('L2: HR can review a pending year-end run, while system cannot review', async () => {
      mockAccrualRepo.findCloseRun = vi.fn().mockResolvedValue({
        id: 'run_pending_1',
        status: 'pending',
      });

      // System user prohibited
      await expect(
        leaveAccrualService.reviewCycleClose(tenantId, companyId, '2025-01-01', 'system'),
      ).rejects.toThrow(ForbiddenError);

      // HR user succeeds
      const reviewRes = await leaveAccrualService.reviewCycleClose(
        tenantId,
        companyId,
        '2025-01-01',
        'hr_user_1',
      );
      expect(reviewRes.status).toBe('reviewed');
      expect(mockAccrualRepo.markRunReviewed).toHaveBeenCalledWith(
        companyId,
        '2025-01-01',
        'hr_user_1',
      );
    });

    it('L4: skipping self-approver routes to fallback role and NEVER auto-approves', () => {
      const now = new Date('2026-10-31T10:00:00Z');
      const levels: LeaveApprovalLevel[] = [
        {
          approverType: 'reporting_manager',
          approverRef: null,
          slaHours: 24,
          onSlaBreach: 'escalate_to_next',
        },
      ];
      const plan = planApprovalSteps({
        levels,
        approvers: [{ employeeId: 'emp_applicant', roleId: null }],
        applicantEmployeeId: 'emp_applicant',
        skipIfApproverIsApplicant: true,
        autoApproveUpToDays: null,
        totalDays: 3,
        now,
        fallbackApproverRoleId: 'role_hr_dept',
      });

      // MUST NOT auto approve!
      expect(plan.autoApprove).toBe(false);
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0]?.action).toBe('skipped');
      // Second step routed to fallbackApproverRoleId
      expect(plan.steps[1]?.action).toBe('pending');
      expect(plan.steps[1]?.approverRoleId).toBe('role_hr_dept');
    });

    it('L4: HR self-approval is permitted when explicitly authorized', () => {
      const now = new Date('2026-10-31T10:00:00Z');
      const levels: LeaveApprovalLevel[] = [
        {
          approverType: 'reporting_manager',
          approverRef: null,
          slaHours: 24,
          onSlaBreach: 'escalate_to_next',
        },
      ];
      const plan = planApprovalSteps({
        levels,
        approvers: [{ employeeId: 'emp_hr_user', roleId: null }],
        applicantEmployeeId: 'emp_hr_user',
        skipIfApproverIsApplicant: true,
        autoApproveUpToDays: null,
        totalDays: 3,
        now,
        allowSelfApprovalForHr: true,
        isApplicantHr: true,
      });

      expect(plan.autoApprove).toBe(false);
      expect(plan.steps).toHaveLength(1);
      expect(plan.steps[0]?.action).toBe('pending');
      expect(plan.steps[0]?.approverEmployeeId).toBe('emp_hr_user');
    });
  });
});
