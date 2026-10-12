import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AttendanceCalculationService,
  DEFAULT_WORK_SCHEDULE,
} from '../service/attendanceCalculation.service.js';
import {
  FALLBACK_ATTENDANCE_POLICY,
  AttendancePolicyService,
} from '../service/attendancePolicy.service.js';
import { AttendanceSettingsService } from '../service/attendanceSettings.service.js';
import { AttendanceOnDutyService } from '../service/attendanceOnDuty.service.js';
import type { AttendanceSettingsRepository } from '../repository/attendanceSettings.repository.js';
import type { AttendanceRepository } from '../repository/attendance.repository.js';
import type {
  AttendancePolicy,
  ShiftSchedule,
  AttendanceOnDutyRequest,
} from '../types/attendance.types.js';

describe('BEZENT HRMS — Missing Punch Classification, Payroll Boundary & On-Duty Workflow', () => {
  const calculationService = new AttendanceCalculationService();

  const basePolicy: AttendancePolicy = {
    ...FALLBACK_ATTENDANCE_POLICY,
    id: 'pol_company_default',
    tenantId: 'tenant_test_01',
    companyId: 'comp_test_01',
    policyName: 'Standard Company Attendance Policy',
    version: 1,
    status: 'published',
    scope: 'company',
    scopeId: null,
    overridesPriority: 0,
    breakDeductionMethod: 'scheduled',
    enableLateTracking: true,
    gracePeriodMinutes: 10,
    enableEarlyExitTracking: true,
    halfDayThresholdHours: '4.00',
    fullDayThresholdHours: '8.00',
    missingPunchPolicy: 'flag_exception',
    effectiveFrom: '2026-01-01',
    penaltyRules: null,
    odRules: null,
    classificationRules: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const schedule: ShiftSchedule = {
    ...DEFAULT_WORK_SCHEDULE,
    startTime: '09:00',
    endTime: '18:00',
    breakMinutes: 60,
  };

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 1: MISSING PUNCH CLASSIFICATION & PROCESSING STATE
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 1: Missing Punch Classification & Processing State', () => {
    it('sets status=incomplete, processingState=pending_review, and workedMinutes=0 for missing check-out on a past date', () => {
      const result = calculationService.calculate({
        date: '2026-10-01', // Past date
        checkInTime: '09:00',
        checkOutTime: null, // Missing punch out
        schedule,
        policy: basePolicy,
      });

      expect(result.isMissingPunch).toBe(true);
      expect(result.status).toBe('incomplete');
      expect(result.processingState).toBe('pending_review');
      expect(result.isPayrollReady).toBe(false);
      expect(result.workedMinutes).toBe(0); // Never invents unverified working duration
    });

    it('sets status=incomplete, processingState=pending_review for missing check-in on a past date', () => {
      const result = calculationService.calculate({
        date: '2026-10-01', // Past date
        checkInTime: null, // Missing punch in
        checkOutTime: '18:00',
        schedule,
        policy: basePolicy,
      });

      expect(result.isMissingPunch).toBe(true);
      expect(result.status).toBe('incomplete');
      expect(result.processingState).toBe('pending_review');
      expect(result.isPayrollReady).toBe(false);
      expect(result.workedMinutes).toBe(0);
    });

    it('never assigns absent or half_day when missingPunchPolicy is flag_exception', () => {
      const resultCheckInOnly = calculationService.calculate({
        date: '2026-09-15',
        checkInTime: '09:00',
        checkOutTime: null,
        schedule,
        policy: { ...basePolicy, missingPunchPolicy: 'flag_exception' },
      });

      expect(resultCheckInOnly.status).not.toBe('absent');
      expect(resultCheckInOnly.status).not.toBe('half_day');
      expect(resultCheckInOnly.status).toBe('incomplete');
      expect(resultCheckInOnly.processingState).toBe('pending_review');

      const resultCheckOutOnly = calculationService.calculate({
        date: '2026-09-15',
        checkInTime: null,
        checkOutTime: '18:00',
        schedule,
        policy: { ...basePolicy, missingPunchPolicy: 'flag_exception' },
      });

      expect(resultCheckOutOnly.status).not.toBe('absent');
      expect(resultCheckOutOnly.status).not.toBe('half_day');
      expect(resultCheckOutOnly.status).toBe('incomplete');
    });

    it('sets status=present, processingState=provisional for single check-in on the current date', () => {
      const today = new Date().toISOString().slice(0, 10);
      const result = calculationService.calculate({
        date: today,
        checkInTime: '09:00',
        checkOutTime: null,
        schedule,
        policy: basePolicy,
        isToday: true,
      });

      expect(result.status).toBe('present');
      expect(result.processingState).toBe('provisional');
      expect(result.isPayrollReady).toBe(false);
    });

    it('sets processingState=finalized and isPayrollReady=true for normal complete punches', () => {
      const result = calculationService.calculate({
        date: '2026-10-01',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        schedule,
        policy: basePolicy,
      });

      expect(result.isMissingPunch).toBe(false);
      expect(result.status).toBe('present');
      expect(result.processingState).toBe('finalized');
      expect(result.isPayrollReady).toBe(true);
      expect(result.workedMinutes).toBe(480);
    });

    it('handles overnight shift missing punch out with processingState=pending_review', () => {
      const overnightSchedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '22:00',
        endTime: '06:00',
        breakMinutes: 60,
      };

      const result = calculationService.calculate({
        date: '2026-09-20',
        checkInTime: '22:00',
        checkOutTime: null,
        schedule: overnightSchedule,
        policy: basePolicy,
      });

      expect(result.isMissingPunch).toBe(true);
      expect(result.status).toBe('incomplete');
      expect(result.processingState).toBe('pending_review');
      expect(result.isPayrollReady).toBe(false);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 2: ATTENDANCE / PAYROLL RESPONSIBILITY BOUNDARY
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 2: Attendance / Payroll Responsibility Boundary', () => {
    it('does NOT subtract penalty days from eligible payable days in payroll handover', async () => {
      const mockSettingsRepo = {
        findPeriodByCode: async () => ({
          id: 'per_2026_09',
          tenantId: 'tenant_test_01',
          companyId: 'comp_test_01',
          periodCode: '2026-09',
          name: 'September 2026',
          startDate: '2026-09-01',
          endDate: '2026-09-30',
          cutoffDate: '2026-09-25',
          status: 'open',
          canLock: true,
          unresolvedMissingPunches: 0,
          pendingRegularizations: 0,
          warnings: null,
          lockedAt: null,
          lockedByUserId: null,
          reopenedAt: null,
          reopenedByUserId: null,
          reopenReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        listPeriods: async () => [
          {
            id: 'per_2026_09',
            tenantId: 'tenant_test_01',
            companyId: 'comp_test_01',
            periodCode: '2026-09',
            name: 'September 2026',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            cutoffDate: '2026-09-25',
            status: 'open',
            canLock: true,
            unresolvedMissingPunches: 0,
            pendingRegularizations: 0,
            warnings: null,
            lockedAt: null,
            lockedByUserId: null,
            reopenedAt: null,
            reopenedByUserId: null,
            reopenReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        getPublishedPolicies: async () => [basePolicy],
        listPolicies: async () => [basePolicy],
        recordAuditLog: async () => {},
        createHandoverBatch: async (
          _t: string,
          _c: string,
          data: {
            totalPayableDays: number;
            totalDeductionUnits: number;
            summarySnapshot: {
              eligibleWorkDays: number;
              penaltyUnits: number;
              penaltyRecommendations: Array<{ dayEquivalentUnits: number }>;
            };
          },
        ) => ({
          id: 'batch_test_01',
          batchNumber: 'ATTN-HANDOVER-2026-09-001',
          ...data,
          tenantId: 'tenant_test_01',
          companyId: 'comp_test_01',
          periodId: 'per_2026_09',
          exportedFormat: 'json',
          summarySnapshot: data.summarySnapshot,
          createdAt: new Date(),
        }),
      } as unknown as AttendanceSettingsRepository;

      const mockAttendanceRepo = {
        getMonthlyMatrix: async () => [
          {
            employeeId: 'emp_01',
            employeeCode: 'EMP001',
            employeeName: 'Jane Doe',
            days: {
              '2026-09-02': { status: 'present', isLate: true, workedMinutes: 480 },
              '2026-09-03': { status: 'present', isLate: true, workedMinutes: 480 },
              '2026-09-04': { status: 'present', isLate: true, workedMinutes: 480 },
            },
            totals: {
              present: 3,
              halfDay: 0,
              absent: 0,
              onLeave: 0,
              holiday: 0,
              totalWorkedMinutes: 1440,
              totalLateMinutes: 45,
            },
          },
        ],
      } as unknown as AttendanceRepository;

      const settingsService = new AttendanceSettingsService(mockSettingsRepo, mockAttendanceRepo);

      const { batch, exportData } = await settingsService.generatePayrollHandover(
        'tenant_test_01',
        'comp_test_01',
        '2026-09',
        'json',
      );

      expect(batch).toBeDefined();
      expect(batch.batchNumber).toContain('PAY-HO-2026-09');

      // The 3 present days remain 3 eligible work days — NOT deducted by attendance engine
      const snapshot = batch.summarySnapshot as {
        totalEligibleWorkDays: number;
        totalRecommendedPenaltyUnits: number;
      };

      expect(snapshot.totalEligibleWorkDays).toBe(3);
      // Total payable days in handover record reports actual attendance facts
      expect(Number(batch.totalPayableDays)).toBe(3);

      const parsedExport = JSON.parse(exportData);
      expect(parsedExport[0].attendanceSummary.presentDays).toBe(3);
      expect(parsedExport[0].penaltyRecommendations).toBeDefined();
      expect(Array.isArray(parsedExport[0].penaltyRecommendations)).toBe(true);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 3: ON-DUTY (OD) WORKFLOW ENGINE & RECONCILIATION
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 3: On-Duty (OD) Operational Workflow & Reconciliation', () => {
    let mockStore: AttendanceOnDutyRequest[] = [];

    const mockAttendanceRepo = {
      createOnDutyRequest: async (
        _t: string,
        _c: string,
        data: Parameters<AttendanceRepository['createOnDutyRequest']>[2],
      ) => {
        const item: AttendanceOnDutyRequest = {
          ...data,
          tenantId: _t,
          companyId: _c,
          requestNumber: `OD-TEST`,
          processingStatus: 'not_applicable',
          odTypeName: data.odTypeName ?? data.odTypeId,
          startTime: data.startTime ?? null,
          endTime: data.endTime ?? null,
          durationType: data.durationType ?? 'full_day',
          halfDaySession: data.halfDaySession ?? null,
          durationHours: data.durationHours != null ? String(data.durationHours) : null,
          locationOrSite: data.locationOrSite ?? null,
          attachmentUrl: data.attachmentUrl ?? null,
          currentStage: data.currentStage ?? 'pending_approval',
          submittedByUserId: data.submittedByUserId ?? 'usr_test',
          submittedAt: new Date(),
          reviewedByUserId: null,
          reviewedAt: null,
          decisionReason: null,
          cancelledAt: null,
          cancelledReason: null,
          withdrawnAt: null,
          withdrawnReason: null,
          effectivePolicyVersion: data.effectivePolicyVersion ?? 1,
          auditMetadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: data.status ?? 'submitted',
          id: data.id || `od_req_${Date.now()}_${Math.random()}`,
        } as AttendanceOnDutyRequest;
        mockStore.push(item);
        return item;
      },
      getOnDutyRequests: async () => mockStore,
      getOnDutyRequestById: async (_t: string, _c: string, id: string) => {
        return mockStore.find((r) => r.id === id) ?? null;
      },
      updateOnDutyRequest: async (
        _t: string,
        _c: string,
        id: string,
        updates: Partial<AttendanceOnDutyRequest>,
      ) => {
        const idx = mockStore.findIndex((r) => r.id === id);
        if (idx !== -1) {
          mockStore[idx] = { ...mockStore[idx]!, ...updates } as AttendanceOnDutyRequest;
          return mockStore[idx];
        }
        return null;
      },
      checkOverlappingOnDuty: async (
        _t: string,
        _c: string,
        employeeId: string,
        startDate: string,
        endDate: string,
        excludeId?: string,
      ) => {
        return mockStore.some(
          (r) =>
            r.employeeId === employeeId &&
            r.id !== excludeId &&
            r.status !== 'rejected' &&
            r.status !== 'withdrawn' &&
            r.status !== 'cancelled' &&
            r.startDate <= endDate &&
            r.endDate >= startDate,
        );
      },
      checkOverlappingLeave: async (
        _t: string,
        _c: string,
        employeeId: string,
        _startDate: string,
        _endDate: string,
      ) => {
        // Return true if employee is emp_on_leave
        return employeeId === 'emp_on_leave';
      },
      checkDateInLockedPeriod: async (_t: string, _c: string, startDate: string) => {
        // Dates before 2026-10-10 are locked
        return startDate < '2026-10-10';
      },
      getTodayAttendance: async () => null,
      upsertDailyAttendance: async () => {},
      updateDailyAttendance: async () => {},
      reconcileOnDutyAttendance: async () => {
        // Successfully reconciles
      },
      rollbackOnDutyAttendance: async () => {
        // Successfully rolls back
      },
    } as unknown as AttendanceRepository;

    const mockPolicyService = {
      getEffectivePolicy: async () => ({
        ...basePolicy,
        odRules: {
          odTypes: ['od_type_client'],
          types: [
            {
              id: 'od_type_client',
              name: 'Client Visit',
              code: 'CLIENT_VISIT',
              creditHours: 8,
              requiresPunch: false,
              requiresEvidence: false,
              isActive: true,
            },
          ],
          requirePreApproval: false,
          maxDaysInPast: 180,
          maxDaysInAdvance: 30,
          enableHalfDayOd: true,
          enableHourlyOd: true,
        },
      }),
    } as unknown as AttendancePolicyService;

    let onDutyService: AttendanceOnDutyService;

    beforeEach(() => {
      mockStore = [];
      onDutyService = new AttendanceOnDutyService(mockAttendanceRepo, mockPolicyService);
    });

    it('creates an On-Duty draft request successfully', async () => {
      const created = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-15',
          endDate: '2026-10-15',
          durationType: 'full_day',
          reason: 'Client meeting at Acme HQ',
          workLocation: 'Acme HQ',
        },
        'user_01',
        true, // draft
      );

      expect(created.status).toBe('draft');
      expect(created.employeeId).toBe('emp_01');
      expect(created.currentStage).toBe('draft');
    });

    it('submits a draft request and transitions status to submitted', async () => {
      const draft = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-15',
          endDate: '2026-10-15',
          durationType: 'full_day',
          reason: 'Client meeting at Acme HQ',
        },
        'user_01',
        true,
      );

      const submitted = await onDutyService.submitDraft(
        'tenant_test_01',
        'comp_test_01',
        draft.id,
        'user_01',
      );

      expect(submitted.status).toBe('submitted');
      expect(submitted.currentStage).toBe('pending_approval');
      expect(submitted.submittedAt).toBeDefined();
    });

    it('rejects OD creation when end date is earlier than start date', async () => {
      await expect(
        onDutyService.createRequest(
          'tenant_test_01',
          'comp_test_01',
          {
            employeeId: 'emp_01',
            odTypeId: 'od_type_client',
            startDate: '2026-10-20',
            endDate: '2026-10-15', // End before start
            durationType: 'multi_day',
            reason: 'Invalid dates',
          },
          'user_01',
        ),
      ).rejects.toThrow(/Start date cannot be after end date/i);
    });

    it('rejects OD creation when date is in a locked payroll period', async () => {
      await expect(
        onDutyService.createRequest(
          'tenant_test_01',
          'comp_test_01',
          {
            employeeId: 'emp_01',
            odTypeId: 'od_type_client',
            startDate: '2026-10-08', // Locked period (< 2026-10-10)
            endDate: '2026-10-08',
            durationType: 'full_day',
            reason: 'Historical travel',
          },
          'user_01',
        ),
      ).rejects.toThrow(/locked payroll period/i);
    });

    it('rejects OD creation when conflicting with approved Leave', async () => {
      await expect(
        onDutyService.createRequest(
          'tenant_test_01',
          'comp_test_01',
          {
            employeeId: 'emp_on_leave', // Overlaps leave
            odTypeId: 'od_type_client',
            startDate: '2026-10-15',
            endDate: '2026-10-15',
            durationType: 'full_day',
            reason: 'Client site',
          },
          'user_01',
        ),
      ).rejects.toThrow(/approved leave overlapping/i);
    });

    it('rejects self-approval of OD requests', async () => {
      const req = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-16',
          endDate: '2026-10-16',
          durationType: 'full_day',
          reason: 'Client meeting',
        },
        'user_01',
        false, // submitted
      );

      await expect(
        onDutyService.reviewRequest(
          'tenant_test_01',
          'comp_test_01',
          req.id,
          { status: 'approved' },
          'user_01',
          'emp_01', // Reviewer is the employee themselves!
        ),
      ).rejects.toThrow(/Self-approval.*prohibited/i);
    });

    it('requires a mandatory decision reason when rejecting an OD request', async () => {
      const req = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-16',
          endDate: '2026-10-16',
          durationType: 'full_day',
          reason: 'Client meeting',
        },
        'user_01',
        false,
      );

      await expect(
        onDutyService.reviewRequest(
          'tenant_test_01',
          'comp_test_01',
          req.id,
          { status: 'rejected' }, // Missing decisionReason
          'manager_user_01',
          'emp_manager_01',
        ),
      ).rejects.toThrow(/rejection reason.*mandatory/i);
    });

    it('successfully approves OD request and triggers attendance reconciliation without fake punches', async () => {
      const upsertSpy = vi.spyOn(mockAttendanceRepo, 'upsertDailyAttendance');

      const req = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-16',
          endDate: '2026-10-16',
          durationType: 'full_day',
          reason: 'Client meeting',
        },
        'user_01',
        false,
      );

      const approved = await onDutyService.reviewRequest(
        'tenant_test_01',
        'comp_test_01',
        req.id,
        { action: 'approve', decisionReason: 'Client meeting verified by HR' },
        'manager_user_01',
        'emp_manager_01',
      );

      expect(approved.status).toBe('approved');
      expect(approved.currentStage).toBe('approved');
      expect(approved.reviewedByUserId).toBe('manager_user_01');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: 'emp_01',
          status: 'present',
          notes: expect.stringContaining('Approved On-Duty'),
        }),
      );
    });

    it('allows withdrawing a submitted request', async () => {
      const req = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-17',
          endDate: '2026-10-17',
          durationType: 'full_day',
          reason: 'Client meeting cancelled',
        },
        'user_01',
        false,
      );

      const withdrawn = await onDutyService.withdrawRequest(
        'tenant_test_01',
        'comp_test_01',
        req.id,
        'user_01',
        'Client meeting rescheduled to next month',
      );

      expect(withdrawn.status).toBe('withdrawn');
      expect(withdrawn.currentStage).toBe('withdrawn');
    });

    it('allows cancelling an approved request and triggers credit rollback', async () => {
      const req = await onDutyService.createRequest(
        'tenant_test_01',
        'comp_test_01',
        {
          employeeId: 'emp_01',
          odTypeId: 'od_type_client',
          startDate: '2026-10-18',
          endDate: '2026-10-18',
          durationType: 'full_day',
          reason: 'Client visit',
        },
        'user_01',
        false,
      );

      // Approve it first
      await onDutyService.reviewRequest(
        'tenant_test_01',
        'comp_test_01',
        req.id,
        { action: 'approve' },
        'manager_user_01',
        'emp_manager_01',
      );

      // Now cancel
      const cancelled = await onDutyService.cancelRequest(
        'tenant_test_01',
        'comp_test_01',
        req.id,
        'user_01',
        'Visit cancelled by client at last minute',
      );

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.currentStage).toBe('cancelled');
    });
  });
});
