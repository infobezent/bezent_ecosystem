import { describe, it, expect } from 'vitest';
import {
  AttendanceCalculationService,
  DEFAULT_WORK_SCHEDULE,
} from '../service/attendanceCalculation.service.js';
import { FALLBACK_ATTENDANCE_POLICY } from '../service/attendancePolicy.service.js';
import { AttendanceSettingsService } from '../service/attendanceSettings.service.js';
import type { AttendanceSettingsRepository } from '../repository/attendanceSettings.repository.js';
import type { AttendanceRepository } from '../repository/attendance.repository.js';
import type {
  AttendancePolicy,
  ShiftSchedule,
  PenaltyRulesConfig,
  OnDutyRulesConfig,
} from '../types/attendance.types.js';

describe('BEZENT HRMS — Attendance Policies V1.0 Test Suite', () => {
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

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 2: WORKING HOURS POLICY (Option C — Flexible Working Hours)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 2: Working Hours Policy (Option C — Flexible)', () => {
    it('calculates net worked hours by deducting scheduled break', () => {
      const schedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60, // 1 hour scheduled break
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        schedule,
        policy: {
          ...basePolicy,
          breakDeductionMethod: 'scheduled',
        },
      });

      // 9 hours gross (540m) - 60m break = 480m net (8 hours)
      expect(result.workedMinutes).toBe(480);
      expect(result.status).toBe('present');
    });

    it('calculates gross worked hours when break deduction method is none', () => {
      const schedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        schedule,
        policy: {
          ...basePolicy,
          breakDeductionMethod: 'none',
        },
      });

      // Gross: 9 hours = 540 minutes
      expect(result.workedMinutes).toBe(540);
    });

    it('respects netOrGross: gross in classificationRules.workingHoursConfig', () => {
      const schedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
        breakMinutes: 60,
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        schedule,
        policy: {
          ...basePolicy,
          classificationRules: {
            workingHoursConfig: {
              netOrGross: 'gross',
            },
          },
        },
      });

      expect(result.workedMinutes).toBe(540);
    });

    it('handles overnight / cross-midnight shifts correctly', () => {
      const nightSchedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '22:00',
        endTime: '06:00',
        breakMinutes: 45,
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '22:00',
        checkOutTime: '06:00',
        schedule: nightSchedule,
        policy: {
          ...basePolicy,
          breakDeductionMethod: 'scheduled',
        },
      });

      // 22:00 to 06:00 = 8 hours (480 mins) - 45m break = 435 minutes
      expect(result.workedMinutes).toBe(435);
      expect(result.isLate).toBe(false);
      expect(result.isEarlyExit).toBe(false);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 3: LATE ARRIVAL POLICY (Option B — Flexible Late Arrival)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 3: Late Arrival Policy (Option B — Flexible)', () => {
    it('treats arrival exactly at grace boundary as on-time (9:00 start, 10m grace, 9:10 arrival)', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:10',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          gracePeriodMinutes: 10,
        },
      });

      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it('marks late arrival 1 minute past grace (9:11 arrival with 10m grace)', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:11',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          gracePeriodMinutes: 10,
        },
      });

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(11);
    });

    it('counts late minutes after_grace when configured in classificationRules', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:25',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          gracePeriodMinutes: 10,
          classificationRules: {
            lateArrivalConfig: {
              enabled: true,
              graceMinutes: 10,
              countingMode: 'after_grace',
            },
          },
        },
      });

      expect(result.isLate).toBe(true);
      // 25m - 10m grace = 15m late
      expect(result.lateMinutes).toBe(15);
    });

    it('counts late minutes from_start when configured', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:25',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          gracePeriodMinutes: 10,
          classificationRules: {
            lateArrivalConfig: {
              enabled: true,
              graceMinutes: 10,
              countingMode: 'from_start',
            },
          },
        },
      });

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(25);
    });

    it('applies extended late action (half_day) when threshold exceeded', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '11:30', // 150m late
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          classificationRules: {
            lateArrivalConfig: {
              enabled: true,
              graceMinutes: 15,
              extendedLateThresholdMinutes: 120, // 2 hours
              extendedLateAction: 'half_day',
            },
          },
        },
      });

      expect(result.isLate).toBe(true);
      expect(result.status).toBe('half_day');
    });

    it('does not fabricate late marks for missing punch in', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: null,
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: basePolicy,
      });

      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
      expect(result.isMissingPunch).toBe(true);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 4: EARLY EXIT POLICY (Option B — Flexible Early Exit)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 4: Early Exit Policy (Option B — Flexible)', () => {
    it('allows departure within grace without flagging early exit (18:00 shift end, 10m grace, 17:50 exit)', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '17:50',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          classificationRules: {
            earlyExitConfig: {
              enabled: true,
              graceMinutes: 10,
            },
          },
        },
      });

      expect(result.isEarlyExit).toBe(false);
      expect(result.earlyMinutes).toBe(0);
    });

    it('flags early exit when departing beyond grace (17:49 departure with 10m grace)', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '17:49',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          classificationRules: {
            earlyExitConfig: {
              enabled: true,
              graceMinutes: 10,
            },
          },
        },
      });

      expect(result.isEarlyExit).toBe(true);
      expect(result.earlyMinutes).toBe(11);
    });

    it('applies extended early exit action (mark_absent) when exceeding threshold', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '13:00', // 5 hours early (300 mins)
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          classificationRules: {
            earlyExitConfig: {
              enabled: true,
              graceMinutes: 15,
              extendedEarlyExitThresholdMinutes: 180, // 3 hours
              extendedEarlyExitAction: 'mark_absent',
            },
          },
        },
      });

      expect(result.isEarlyExit).toBe(true);
      expect(result.status).toBe('absent');
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 5: ATTENDANCE CLASSIFICATION (Option B — Flexible Classification)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 5: Attendance Classification (Option B — Flexible)', () => {
    it('classifies present when worked hours meet full-day threshold (fixed_hours)', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          fullDayThresholdHours: '8.00',
          halfDayThresholdHours: '4.00',
        },
      });

      expect(result.status).toBe('present');
    });

    it('classifies half_day when worked hours are between half-day and full-day thresholds', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '15:00', // 6 hours gross - 1h break = 5 hours worked (>= 4h, < 8h)
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          fullDayThresholdHours: '8.00',
          halfDayThresholdHours: '4.00',
        },
      });

      expect(result.status).toBe('half_day');
    });

    it('classifies absent when worked hours fall below half-day threshold', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '12:00', // 3 hours worked (< 4.0h)
        schedule: { ...DEFAULT_WORK_SCHEDULE, breakMinutes: 0 },
        policy: {
          ...basePolicy,
          fullDayThresholdHours: '8.00',
          halfDayThresholdHours: '4.00',
          classificationRules: {
            insufficientHoursAction: 'absent',
          },
        },
      });

      expect(result.status).toBe('absent');
    });

    it('classifies according to percentage_of_shift mode', () => {
      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '17:00', // 8h gross - 1h break = 7 hours worked
        schedule: DEFAULT_WORK_SCHEDULE, // 8h net shift
        policy: {
          ...basePolicy,
          classificationRules: {
            thresholdMode: 'percentage_of_shift',
            fullDayPercentage: 90, // 90% of 8h = 7.2h (432 mins)
            halfDayPercentage: 50, // 50% of 8h = 4.0h (240 mins)
          },
        },
      });

      // 7 hours = 420 mins (< 432 mins, but >= 240 mins) -> half_day
      expect(result.status).toBe('half_day');
    });

    it('handles missing punches according to missingPunchPolicy', () => {
      const resultAbsent = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          missingPunchPolicy: 'mark_absent',
        },
      });

      expect(resultAbsent.status).toBe('absent');
      expect(resultAbsent.isMissingPunch).toBe(true);

      const resultHalf = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: null,
        schedule: DEFAULT_WORK_SCHEDULE,
        policy: {
          ...basePolicy,
          missingPunchPolicy: 'half_day',
        },
      });

      expect(resultHalf.status).toBe('half_day');
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 6: LATE PENALTY RULES (Option B — Advanced Configurable Penalty)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 6: Late Penalty Rules (Option B — Advanced)', () => {
    it('returns zero penalty when late marks are below threshold', () => {
      const rules: PenaltyRulesConfig = {
        enabled: true,
        lateMarksThreshold: 3,
        penaltyUnit: 'half_day',
        period: 'calendar_month',
        isRepeating: false,
      };

      const result = calculationService.calculatePenaltyUnits(2, rules);
      expect(result.penaltyUnits).toBe(0);
      expect(result.explanation).toContain('Below threshold');
    });

    it('applies once_per_period penalty (3 late marks = 0.5; 6 late marks = 0.5)', () => {
      const rules: PenaltyRulesConfig = {
        enabled: true,
        lateMarksThreshold: 3,
        penaltyUnit: 'half_day',
        period: 'calendar_month',
        isRepeating: false,
      };

      const result3 = calculationService.calculatePenaltyUnits(3, rules);
      expect(result3.penaltyUnits).toBe(0.5);

      const result6 = calculationService.calculatePenaltyUnits(6, rules);
      expect(result6.penaltyUnits).toBe(0.5);
    });

    it('applies repeating penalty (3 late marks = 0.5; 6 late marks = 1.0; 9 late marks = 1.5)', () => {
      const rules: PenaltyRulesConfig = {
        enabled: true,
        lateMarksThreshold: 3,
        penaltyUnit: 'half_day',
        period: 'calendar_month',
        isRepeating: true,
      };

      const result3 = calculationService.calculatePenaltyUnits(3, rules);
      expect(result3.penaltyUnits).toBe(0.5);

      const result6 = calculationService.calculatePenaltyUnits(6, rules);
      expect(result6.penaltyUnits).toBe(1.0);

      const result9 = calculationService.calculatePenaltyUnits(9, rules);
      expect(result9.penaltyUnits).toBe(1.5);
    });

    it('enforces maxPenaltyUnits cap', () => {
      const rules: PenaltyRulesConfig = {
        enabled: true,
        lateMarksThreshold: 2,
        penaltyUnit: 'half_day', // 0.5 per 2
        period: 'calendar_month',
        isRepeating: true,
        maxPenaltyUnits: 1.0, // Cap at 1.0 day
      };

      // 8 late marks would normally be 4 * 0.5 = 2.0, capped to 1.0
      const result = calculationService.calculatePenaltyUnits(8, rules);
      expect(result.penaltyUnits).toBe(1.0);
      expect(result.explanation).toContain('capped');
    });

    it('supports warning_only consequence with 0 monetary/day deduction', () => {
      const rules: PenaltyRulesConfig = {
        enabled: true,
        lateMarksThreshold: 3,
        penaltyUnit: 'warning_only',
        period: 'calendar_month',
      };

      const result = calculationService.calculatePenaltyUnits(5, rules);
      expect(result.penaltyUnits).toBe(0);
      expect(result.unitType).toBe('warning_only');
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 7: POLICY RESOLUTION & FIELD-LEVEL INHERITANCE (Option B)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 7: Policy Resolution & Field-Level Inheritance (Option B)', () => {
    it('resolves deterministic inheritance: Employee (20) > Department (10) > Company (0)', async () => {
      const companyPolicy: AttendancePolicy = {
        ...basePolicy,
        id: 'pol_comp',
        scope: 'company',
        scopeId: null,
        overridesPriority: 0,
        gracePeriodMinutes: 10,
        breakDeductionMethod: 'scheduled',
        fullDayThresholdHours: '8.00',
        halfDayThresholdHours: '4.00',
      };

      const deptPolicy: AttendancePolicy = {
        ...basePolicy,
        id: 'pol_dept',
        scope: 'department',
        scopeId: 'dept_engineering',
        overridesPriority: 10,
        gracePeriodMinutes: 15, // Department override
        breakDeductionMethod: null as unknown as 'scheduled', // Not overridden by department
        fullDayThresholdHours: '7.50', // Department override
        halfDayThresholdHours: '4.00',
      };

      const empPolicy: AttendancePolicy = {
        ...basePolicy,
        id: 'pol_emp',
        scope: 'employee',
        scopeId: 'emp_john',
        overridesPriority: 20,
        gracePeriodMinutes: 20, // Employee-specific override
        breakDeductionMethod: null as unknown as 'scheduled', // Inherits from company
        fullDayThresholdHours: null as unknown as string, // Inherits from department
        halfDayThresholdHours: null as unknown as string,
      };

      // Mock repository
      const mockRepo = {
        listPolicies: async () => [companyPolicy, deptPolicy, empPolicy],
        getPolicyById: async (_tid: string, _cid: string, id: string) => {
          if (id === 'pol_comp') return companyPolicy;
          if (id === 'pol_dept') return deptPolicy;
          if (id === 'pol_emp') return empPolicy;
          return null;
        },
      } as unknown as AttendanceSettingsRepository;

      const settingsService = new AttendanceSettingsService(
        mockRepo,
        {} as unknown as AttendanceRepository,
      );
      const resolution = await settingsService.resolveEffectivePolicy(
        'tenant_test_01',
        'comp_test_01',
        'emp_john',
        'dept_engineering',
      );

      // Verify resolved values
      expect(resolution.policy.gracePeriodMinutes).toBe(20); // From employee
      expect(resolution.provenance.gracePeriodMinutes).toBe('employee');

      expect(Number(resolution.policy.fullDayThresholdHours)).toBe(7.5); // From department
      expect(resolution.provenance.fullDayThresholdHours).toBe('department');

      expect(resolution.policy.breakDeductionMethod).toBe('scheduled'); // From company
      expect(resolution.provenance.breakDeductionMethod).toBe('company');

      expect(resolution.activeOverridesCount).toBeGreaterThan(0);
    });

    it('falls back to company default when department has no override for a field', async () => {
      const companyPolicy: AttendancePolicy = {
        ...basePolicy,
        id: 'pol_comp',
        scope: 'company',
        scopeId: null,
        overridesPriority: 0,
        gracePeriodMinutes: 10,
        breakDeductionMethod: 'actual',
      };

      const deptPolicy: AttendancePolicy = {
        ...basePolicy,
        id: 'pol_dept',
        scope: 'department',
        scopeId: 'dept_sales',
        overridesPriority: 10,
        gracePeriodMinutes: 15,
        breakDeductionMethod: null as unknown as 'scheduled',
      };

      const mockRepo = {
        listPolicies: async () => [companyPolicy, deptPolicy],
      } as unknown as AttendanceSettingsRepository;

      const settingsService = new AttendanceSettingsService(
        mockRepo,
        {} as unknown as AttendanceRepository,
      );
      const resolution = await settingsService.resolveEffectivePolicy(
        'tenant_test_01',
        'comp_test_01',
        undefined,
        'dept_sales',
      );

      expect(resolution.policy.gracePeriodMinutes).toBe(15);
      expect(resolution.provenance.gracePeriodMinutes).toBe('department');
      expect(resolution.provenance.breakDeductionMethod).toBe('company');
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 8: ON-DUTY (OD) POLICY (Option B — Advanced Configurable OD)
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 8: On-Duty (OD) Policy (Option B — Advanced)', () => {
    it('credits full-day present status for approved full-day OD with count_as_present', () => {
      const odRules: OnDutyRulesConfig = {
        enabled: true,
        odTypes: ['Client Visit', 'Site Inspection', 'Training'],
        creditTreatment: 'count_as_present',
        punchRule: 'exempt',
      };

      const evaluation = calculationService.evaluateOnDutyAttendance(
        {
          id: 'od_01',
          type: 'Client Visit',
          duration: 'full_day',
          status: 'approved',
        },
        odRules,
      );

      expect(evaluation.creditedStatus).toBe('present');
      expect(evaluation.isPunchExempt).toBe(true);
      expect(evaluation.creditedWorkedMinutes).toBe(480);
    });

    it('credits half-day status for approved half-day OD', () => {
      const odRules: OnDutyRulesConfig = {
        enabled: true,
        odTypes: ['Client Visit'],
        creditTreatment: 'count_as_present',
        punchRule: 'exempt',
      };

      const evaluation = calculationService.evaluateOnDutyAttendance(
        {
          id: 'od_02',
          type: 'Client Visit',
          duration: 'half_day',
          status: 'approved',
        },
        odRules,
      );

      expect(evaluation.creditedStatus).toBe('half_day');
      expect(evaluation.creditedWorkedMinutes).toBe(240);
    });

    it('requires punch at location when punchRule is required_at_location', () => {
      const odRules: OnDutyRulesConfig = {
        enabled: true,
        odTypes: ['Field Work'],
        punchRule: 'required_at_location',
      };

      const evaluation = calculationService.evaluateOnDutyAttendance(
        {
          id: 'od_03',
          type: 'Field Work',
          duration: 'full_day',
          status: 'approved',
        },
        odRules,
      );

      expect(evaluation.isPunchExempt).toBe(false);
    });

    it('does not grant credit for non-approved or pending OD requests', () => {
      const odRules: OnDutyRulesConfig = {
        enabled: true,
        odTypes: ['Client Visit'],
      };

      const pendingEval = calculationService.evaluateOnDutyAttendance(
        {
          id: 'od_04',
          type: 'Client Visit',
          duration: 'full_day',
          status: 'pending',
        },
        odRules,
      );

      expect(pendingEval.creditedStatus).toBeNull();
      expect(pendingEval.creditedWorkedMinutes).toBe(0);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 11: REVIEW & PUBLISH LIFECYCLE & TENANT ISOLATION
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 11: Review & Publish Lifecycle', () => {
    it('requires a change reason when publishing a policy', async () => {
      const mockRepo = {
        getPolicyById: async () => basePolicy,
        publishPolicy: async () => ({ ...basePolicy, status: 'published', version: 2 }),
        recordAuditLog: async () => {},
      } as unknown as AttendanceSettingsRepository;

      const settingsService = new AttendanceSettingsService(
        mockRepo,
        {} as unknown as AttendanceRepository,
      );

      await expect(
        settingsService.publishPolicy('tenant_01', 'comp_01', 'pol_company_default', {
          changeReason: '', // Empty reason should be rejected
        }),
      ).rejects.toThrow(/change reason is required/i);
    });

    it('atomically publishes policy, increments version, and writes audit event', async () => {
      let auditLogged = false;
      let publishedVersion = 1;

      const mockRepo = {
        getPolicyById: async () => ({ ...basePolicy, status: 'draft', version: 1 }),
        publishPolicy: async (_tid: string, _cid: string, _pid: string, effFrom?: string) => {
          publishedVersion = 2;
          return {
            ...basePolicy,
            status: 'published',
            version: publishedVersion,
            effectiveFrom: effFrom || '2026-11-01',
          };
        },
        recordAuditLog: async (
          _tid: string,
          _cid: string,
          entry: { action: string; newValues?: Record<string, unknown> },
        ) => {
          auditLogged = true;
          expect(entry.action).toBe('published');
          expect(entry.newValues?.changeReason).toBe('Q4 Attendance Policy adjustments');
        },
      } as unknown as AttendanceSettingsRepository;

      const settingsService = new AttendanceSettingsService(
        mockRepo,
        {} as unknown as AttendanceRepository,
      );

      const published = await settingsService.publishPolicy(
        'tenant_01',
        'comp_01',
        'pol_company_default',
        {
          changeReason: 'Q4 Attendance Policy adjustments',
          effectiveFrom: '2026-11-01',
        },
        'user_hr_admin',
        '127.0.0.1',
      );

      expect(published.status).toBe('published');
      expect(published.version).toBe(2);
      expect(published.effectiveFrom).toBe('2026-11-01');
      expect(auditLogged).toBe(true);
    });
  });

  /* ══════════════════════════════════════════════════════════════════════
     PHASE 12: CONTROLLED REMEDIATION REGRESSION TESTS
     ══════════════════════════════════════════════════════════════════════ */
  describe('Phase 12: Controlled Remediation Regression Tests', () => {
    it('disables late tracking when enableLateTracking is false', () => {
      const schedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
      };

      const disabledLatePolicy: AttendancePolicy = {
        ...basePolicy,
        enableLateTracking: false,
        gracePeriodMinutes: 15,
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:45',
        checkOutTime: '18:00',
        schedule,
        policy: disabledLatePolicy,
      });

      expect(result.isLate).toBe(false);
      expect(result.lateMinutes).toBe(0);
    });

    it('disables early exit tracking when enableEarlyExitTracking is false', () => {
      const schedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '09:00',
        endTime: '18:00',
      };

      const disabledEarlyPolicy: AttendancePolicy = {
        ...basePolicy,
        enableEarlyExitTracking: false,
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '09:00',
        checkOutTime: '16:00', // 2 hours early
        schedule,
        policy: disabledEarlyPolicy,
      });

      expect(result.isEarlyExit).toBe(false);
      expect(result.earlyMinutes).toBe(0);
    });

    it('correctly calculates late minutes for overnight shift check-in past midnight', () => {
      const overnightSchedule: ShiftSchedule = {
        ...DEFAULT_WORK_SCHEDULE,
        startTime: '22:00',
        endTime: '06:00',
      };

      const result = calculationService.calculate({
        date: '2026-10-09',
        checkInTime: '00:30', // Checked in 2.5 hours after shift start
        checkOutTime: '06:00',
        schedule: overnightSchedule,
        policy: basePolicy, // gracePeriodMinutes = 10
      });

      expect(result.isLate).toBe(true);
      expect(result.lateMinutes).toBe(150); // 150 min from shift start
    });

    it('validates scope ID existence before creating a department policy', async () => {
      const mockRepo = {
        validateScopeId: async () => false, // Scope does not exist
      } as unknown as AttendanceSettingsRepository;

      const settingsService = new AttendanceSettingsService(
        mockRepo,
        {} as unknown as AttendanceRepository,
      );

      await expect(
        settingsService.createPolicy('tenant_01', 'comp_01', {
          policyName: 'Invalid Department Policy',
          scope: 'department',
          scopeId: 'dept_nonexistent',
        }),
      ).rejects.toThrow(/Department dept_nonexistent does not exist/i);
    });
  });
});

