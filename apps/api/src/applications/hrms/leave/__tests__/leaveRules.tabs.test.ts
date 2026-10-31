import { describe, it, expect } from 'vitest';
import {
  computeAccruedEntitlement,
  computeCycleClose,
  DEFAULT_ACCRUAL_RULE,
  type AccrualRuleInput,
  type EntitlementInput,
} from '../rules/leaveAccrual.js';
import {
  findRestrictionViolation,
  teamConcurrencyWarning,
  type RestrictionContext,
  type RestrictionRule,
} from '../rules/leaveRestrictions.js';
import { planApprovalSteps } from '../rules/leaveApproval.js';
import { weekdayName } from '../rules/leaveCalendar.js';

const halfUp = (v: number) => Math.round(v * 2) / 2;

describe('Tab 4 — accrual arithmetic', () => {
  const entitlement = (rule: Partial<AccrualRuleInput>, input: Partial<EntitlementInput>) =>
    computeAccruedEntitlement({
      rule: { ...DEFAULT_ACCRUAL_RULE, ...rule },
      annualQuota: 18,
      cycleStart: '2026-01-01',
      asOf: '2026-12-31',
      joiningDate: '2020-01-01',
      lastWorkingDate: null,
      probationEndDate: null,
      round: halfUp,
      ...input,
    });

  it('spec §6.6: monthly 18, joined on the 10th with cut-off 15 → first month credits 1.5', () => {
    expect(
      entitlement({ grantMethod: 'monthly' }, { joiningDate: '2026-03-10', asOf: '2026-03-31' }),
    ).toBe(1.5);
  });

  it('spec §6.6: joined on the 20th → first month credits 0', () => {
    expect(
      entitlement({ grantMethod: 'monthly' }, { joiningDate: '2026-03-20', asOf: '2026-03-31' }),
    ).toBe(0);
  });

  it('upfront grants the full year at cycle start, pro-rated for mid-year joiners', () => {
    expect(entitlement({}, { asOf: '2026-01-01' })).toBe(18);
    // Joined 1 July: 6 of 12 months.
    expect(entitlement({}, { joiningDate: '2026-07-01', asOf: '2026-07-01' })).toBe(9);
    // No pro-rating: the full year regardless of joining month.
    expect(entitlement({ proRataOnJoining: false }, { joiningDate: '2026-07-20' })).toBe(18);
  });

  it('periodic timing decides when a period is credited', () => {
    expect(
      entitlement(
        { grantMethod: 'quarterly', accrualTiming: 'period_start' },
        { asOf: '2026-04-01' },
      ),
    ).toBe(9);
    expect(
      entitlement(
        { grantMethod: 'quarterly', accrualTiming: 'period_end' },
        { asOf: '2026-04-01' },
      ),
    ).toBe(4.5);
    expect(
      entitlement(
        { grantMethod: 'quarterly', accrualTiming: 'cycle_start' },
        { asOf: '2026-01-01' },
      ),
    ).toBe(18);
  });

  it('exit pro-rata, probation hold-back and back-credit, LOP reduction, manual only', () => {
    expect(entitlement({}, { lastWorkingDate: '2026-06-30' })).toBe(9);
    const probation = { accrueDuringProbation: false, grantMethod: 'monthly' as const };
    expect(entitlement(probation, { probationEndDate: '2026-03-31', asOf: '2026-12-31' })).toBe(
      13.5,
    );
    expect(
      entitlement(
        { ...probation, backcreditAfterProbation: true },
        { probationEndDate: '2026-03-31' },
      ),
    ).toBe(18);
    const lop = new Map([['2026-01-01', 31]]);
    expect(entitlement({ accrueDuringLop: false }, { lopDaysByMonth: lop })).toBe(16.5);
    expect(entitlement({ grantMethod: 'manual_only' }, {})).toBe(0);
  });

  it('spec §6.6: closing 12, CF cap 5, encash on, retain 2, max encash 3 → encash 3, CF 5, lapse 2', () => {
    expect(
      computeCycleClose(
        {
          carryForwardEnabled: true,
          maxCarryForwardDays: 5,
          maxAccumulationDays: null,
          lapseRemaining: true,
          encashmentEnabled: true,
          encashOnCycleEnd: true,
          minBalanceToRetain: 2,
          maxEncashableDays: 3,
        },
        12,
        0,
      ),
    ).toEqual({ available: 12, encash: 3, carryForward: 5, lapse: 2 });
  });

  it('caps carry forward by max accumulation against the next grant, and keeps days when lapse is off', () => {
    const rule = {
      carryForwardEnabled: true,
      maxCarryForwardDays: null,
      maxAccumulationDays: 20,
      lapseRemaining: false,
      encashmentEnabled: false,
      encashOnCycleEnd: false,
      minBalanceToRetain: 0,
      maxEncashableDays: null,
    };
    expect(computeCycleClose(rule, 10, 18)).toEqual({
      available: 10,
      encash: 0,
      carryForward: 2,
      lapse: 0,
    });
  });
});

describe('Tab 5 — restriction rules', () => {
  const ctx = (overrides: Partial<RestrictionContext> = {}): RestrictionContext => ({
    leaveTypeId: 'CL',
    startDate: '2026-11-16', // Monday
    endDate: '2026-11-16',
    today: '2026-11-01',
    departmentId: 'd1',
    locationId: 'l1',
    cycle: { start: '2026-01-01', end: '2026-12-31' },
    existing: [],
    isNonWorkingDay: (d) => ['saturday', 'sunday'].includes(weekdayName(d)),
    leaveTypeName: (id) => id,
    ...overrides,
  });
  const rule = (
    ruleType: RestrictionRule['ruleType'],
    config: Record<string, unknown>,
  ): RestrictionRule => ({
    id: `r_${ruleType}`,
    name: 'Rule',
    ruleType,
    config,
  });

  it('clubbing blocks CL on Monday right after AL on Friday (only a weekend between)', () => {
    const club = rule('clubbing', { leaveTypeIdA: 'CL', leaveTypeIdB: 'AL' });
    const existing = [{ leaveTypeId: 'AL', startDate: '2026-11-13', endDate: '2026-11-13' }];
    expect(findRestrictionViolation([club], ctx({ existing }))?.code).toBe(
      'LEAVE_CLUBBING_BLOCKED',
    );
    const apart = [{ leaveTypeId: 'AL', startDate: '2026-11-11', endDate: '2026-11-11' }];
    expect(findRestrictionViolation([club], ctx({ existing: apart }))).toBeNull();
  });

  it('blackout applies by scope and leave type', () => {
    const blackout = rule('blackout', {
      startDate: '2026-11-15',
      endDate: '2026-11-30',
      scope: 'department',
      scopeId: 'd1',
      leaveTypeIds: [],
      allowHrOverride: true,
    });
    expect(findRestrictionViolation([blackout], ctx())?.code).toBe('LEAVE_BLACKOUT');
    expect(findRestrictionViolation([blackout], ctx({ departmentId: 'd2' }))).toBeNull();
  });

  it('minimum notice, minimum gap and frequency caps', () => {
    expect(
      findRestrictionViolation([rule('min_notice', { leaveTypeId: 'CL', days: 20 })], ctx())?.code,
    ).toBe('LEAVE_MIN_NOTICE');
    expect(
      findRestrictionViolation([rule('min_notice', { leaveTypeId: 'CL', days: 14 })], ctx()),
    ).toBeNull();

    const gap = rule('min_gap', { leaveTypeId: 'CL', workingDays: 5 });
    const recent = [{ leaveTypeId: 'CL', startDate: '2026-11-11', endDate: '2026-11-11' }];
    expect(findRestrictionViolation([gap], ctx({ existing: recent }))?.code).toBe('LEAVE_MIN_GAP');

    const cap = rule('frequency_cap', { leaveTypeId: 'CL', maxPerMonth: 1, maxPerCycle: null });
    const sameMonth = [{ leaveTypeId: 'CL', startDate: '2026-11-03', endDate: '2026-11-03' }];
    expect(findRestrictionViolation([cap], ctx({ existing: sameMonth }))?.code).toBe(
      'LEAVE_FREQUENCY_CAP',
    );
  });

  it('team concurrency only warns, and only when the limit is exceeded', () => {
    const cfg = { departmentId: null, maxPercent: 10, maxCount: null };
    const others = [{ startDate: '2026-11-16', endDate: '2026-11-16' }];
    expect(teamConcurrencyWarning(cfg, '2026-11-16', '2026-11-16', 10, others)).toMatch(
      /limit \(1 on leave\)/,
    );
    expect(teamConcurrencyWarning(cfg, '2026-11-16', '2026-11-16', 10, [])).toBeNull();
  });
});

describe('Tab 7 — approval planning', () => {
  const levels = [
    {
      approverType: 'reporting_manager' as const,
      approverRef: null,
      slaHours: 24,
      onSlaBreach: 'escalate_to_next' as const,
    },
    {
      approverType: 'hr_role' as const,
      approverRef: 'role_hr',
      slaHours: 48,
      onSlaBreach: 'notify_only' as const,
    },
  ];
  const now = new Date('2026-11-01T00:00:00Z');

  it('first level pending with SLA, later levels waiting', () => {
    const plan = planApprovalSteps({
      levels,
      approvers: [
        { employeeId: 'mgr', roleId: null },
        { employeeId: null, roleId: 'role_hr' },
      ],
      applicantEmployeeId: 'emp',
      skipIfApproverIsApplicant: true,
      autoApproveUpToDays: null,
      totalDays: 2,
      now,
    });
    expect(plan.autoApprove).toBe(false);
    expect(plan.steps.map((s) => s.action)).toEqual(['pending', 'waiting']);
    expect(plan.steps[0]!.slaDueAt).toEqual(new Date('2026-11-02T00:00:00Z'));
  });

  it('skips a level whose approver is the applicant', () => {
    const plan = planApprovalSteps({
      levels,
      approvers: [
        { employeeId: 'emp', roleId: null },
        { employeeId: null, roleId: 'role_hr' },
      ],
      applicantEmployeeId: 'emp',
      skipIfApproverIsApplicant: true,
      autoApproveUpToDays: null,
      totalDays: 2,
      now,
    });
    expect(plan.steps.map((s) => s.action)).toEqual(['skipped', 'pending']);
  });

  it('auto-approves within threshold but routes to fallback instead of auto-approving when skipped', () => {
    const base = {
      levels: levels.slice(0, 1),
      approvers: [{ employeeId: 'emp', roleId: null }],
      applicantEmployeeId: 'emp',
      skipIfApproverIsApplicant: true,
      totalDays: 1,
      now,
    };
    // Within threshold: auto-approves
    expect(planApprovalSteps({ ...base, autoApproveUpToDays: 1 })).toEqual({
      steps: [],
      autoApprove: true,
    });
    // Above or without threshold: NEVER auto-approves when level is skipped; routes to fallback
    const resultWithoutFallback = planApprovalSteps({ ...base, autoApproveUpToDays: null });
    expect(resultWithoutFallback.autoApprove).toBe(false);
    expect(resultWithoutFallback.steps).toHaveLength(2);
    expect(resultWithoutFallback.steps[0]?.action).toBe('skipped');
    expect(resultWithoutFallback.steps[1]?.action).toBe('pending');
    expect(resultWithoutFallback.steps[1]?.approverRoleId).toBeNull();

    // With fallback role specified:
    const resultWithFallback = planApprovalSteps({
      ...base,
      autoApproveUpToDays: null,
      fallbackApproverRoleId: 'role_hr_admin',
    });
    expect(resultWithFallback.autoApprove).toBe(false);
    expect(resultWithFallback.steps[1]?.approverRoleId).toBe('role_hr_admin');
    expect(resultWithFallback.steps[1]?.action).toBe('pending');

    // HR self-approval authorized:
    const hrSelfApproved = planApprovalSteps({
      ...base,
      autoApproveUpToDays: null,
      allowSelfApprovalForHr: true,
      isApplicantHr: true,
    });
    expect(hrSelfApproved.autoApprove).toBe(false);
    expect(hrSelfApproved.steps[0]?.action).toBe('pending');
    expect(hrSelfApproved.steps[0]?.approverEmployeeId).toBe('emp');
  });
});
