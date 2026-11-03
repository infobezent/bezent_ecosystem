import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaveService } from '../service/leave.service.js';
import type { LeaveRepository } from '../repository/leave.repository.js';
import type { LeaveGeneralSettingsRepository } from '../repository/leaveGeneralSettings.repository.js';
import { localDateInTimezone } from '../rules/leaveValidation.js';
import { addDays } from '../rules/leaveCalendar.js';
import type { LeaveTypeRecord } from '../../../../db/schema.js';

const TODAY = localDateInTimezone('UTC');

/** Next date on or after `from` that falls on the given weekday (0 = Sunday). */
function nextWeekday(from: string, weekday: number): string {
  let d = from;
  while (new Date(`${d}T00:00:00Z`).getUTCDay() !== weekday) d = addDays(d, 1);
  return d;
}

const MONDAY = nextWeekday(addDays(TODAY, 1), 1);
const TUESDAY = addDays(MONDAY, 1);
const FRIDAY = addDays(MONDAY, 4);
const SATURDAY = addDays(MONDAY, 5);

describe('LeaveService — request pipeline', () => {
  let repo: Record<string, ReturnType<typeof vi.fn>>;
  let typesRepo: {
    findById: ReturnType<typeof vi.fn>;
    findAllForCompany: ReturnType<typeof vi.fn>;
  };
  let holidays: { resolveForEmployee: ReturnType<typeof vi.fn> };
  let approvals: Record<string, ReturnType<typeof vi.fn>>;
  let restrictions: { listActive: ReturnType<typeof vi.fn> };
  let accrual: { computeTarget: ReturnType<typeof vi.fn> };
  let settingsRepo: Record<string, ReturnType<typeof vi.fn>>;
  let policies: { resolvePolicyForEmployee: ReturnType<typeof vi.fn> };
  let service: LeaveService;

  const settingsPayload = {
    leaveYearCycle: 'calendar_year',
    customYearStartDate: null,
    goLiveDate: '2020-01-01',
    dayCountingMethod: 'working_days',
    balancePrecision: 'two_decimals',
    balanceRoundingRule: 'nearest',
    maxBackdatedDays: 7,
    maxAdvanceBookingDays: 180,
  };

  const leaveType = (overrides: Partial<LeaveTypeRecord> = {}) =>
    ({
      id: 'lvt_al',
      name: 'Annual Leave',
      code: 'AL',
      isActive: true,
      visibleToEmployee: true,
      isTracked: true,
      allowHalfDay: true,
      minPerRequest: '0.50',
      maxPerRequest: null,
      maxPerMonth: null,
      maxPerYear: null,
      maxConsecutiveDays: null,
      weeklyOffTreatment: 'inherit',
      holidayTreatment: 'inherit',
      sandwichRuleEnabled: false,
      documentRequirement: 'none',
      documentThresholdDays: null,
      allowedInProbation: true,
      allowedInNoticePeriod: false,
      genderEligibility: 'all',
      negativeBalanceEnabled: false,
      negativeBalanceLimit: null,
      effectiveFrom: '2000-01-01',
      effectiveTo: null,
      ...overrides,
    }) as LeaveTypeRecord;

  const policy = {
    id: 'lvp_std',
    name: 'Standard Leave Policy',
    entitlements: [{ leaveTypeId: 'lvt_al', annualQuota: 18, maxPerYearOverride: null }],
  };

  const employee = {
    id: 'emp_1',
    departmentId: null,
    locationId: null,
    employmentType: 'full_time',
    employmentStatus: 'active',
    joiningDate: '2024-01-01',
    probationEndDate: null,
    lastWorkingDate: null,
    gender: 'female',
  };

  beforeEach(() => {
    repo = {
      getEmployeeProfile: vi.fn().mockResolvedValue(employee),
      getWorkingDays: vi.fn().mockResolvedValue({
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        source: 'company_default',
      }),
      findLockedPeriodOverlapping: vi.fn().mockResolvedValue(null),
      findOverlappingLeave: vi.fn().mockResolvedValue(null),
      findActiveRequestsOfType: vi.fn().mockResolvedValue([]),
      createRequestWithReservation: vi
        .fn()
        .mockImplementation((input) => Promise.resolve({ id: 'lvrq_1', ...input.request })),
    };
    typesRepo = {
      findById: vi.fn().mockResolvedValue(leaveType()),
      findAllForCompany: vi.fn().mockResolvedValue([leaveType()]),
    };
    holidays = {
      resolveForEmployee: vi.fn().mockResolvedValue({
        calendarId: 'hcal_1',
        revision: 2,
        optionalHolidayQuota: 2,
        holidays: [],
      }),
    };
    approvals = {
      resolveWorkflow: vi.fn().mockResolvedValue({ id: 'lvwf_1', levels: [] }),
      planForRequest: vi.fn().mockResolvedValue({
        steps: [
          {
            purpose: 'approval',
            level: 1,
            approverEmployeeId: 'emp_mgr',
            approverRoleId: null,
            action: 'pending',
            slaDueAt: new Date(),
            onSlaBreach: 'notify_only',
          },
        ],
        autoApprove: false,
        notifications: [],
      }),
      planCancellation: vi.fn(),
      resolveActor: vi.fn(),
      getQueue: vi.fn(),
      decide: vi.fn(),
    };
    restrictions = { listActive: vi.fn().mockResolvedValue([]) };
    accrual = { computeTarget: vi.fn().mockResolvedValue(18) };
    settingsRepo = {
      getCompanyProfile: vi
        .fn()
        .mockResolvedValue({ timeZone: 'UTC', createdAt: new Date('2020-01-01T00:00:00Z') }),
      ensureDefaultSettings: vi.fn().mockResolvedValue({}),
      getActiveVersionAtTimestamp: vi
        .fn()
        .mockResolvedValue({ id: 'lvgv_1', versionNumber: 1, settingsPayload }),
    };
    policies = { resolvePolicyForEmployee: vi.fn().mockResolvedValue(policy) };
    service = new LeaveService(
      repo as unknown as LeaveRepository,
      typesRepo,
      settingsRepo as unknown as LeaveGeneralSettingsRepository,
      policies,
      { ensureDefaultLeaveSetup: vi.fn().mockResolvedValue(undefined) },
      holidays,
      approvals as never,
      restrictions,
      accrual as never,
    );
  });

  const apply = (overrides: Record<string, unknown> = {}) =>
    service.applyLeave('t1', 'c1', 'emp_1', 'usr_1', {
      leaveTypeId: 'lvt_al',
      startDate: MONDAY,
      endDate: TUESDAY,
      reason: 'Family function',
      ...overrides,
    } as never);

  it('counts working days, seals a snapshot, and reserves via the repository', async () => {
    await apply({ startDate: FRIDAY, endDate: addDays(FRIDAY, 3) }); // Fri..Mon

    const call = repo.createRequestWithReservation!.mock.calls[0]![0];
    expect(call.request.totalDays).toBe('2.00');
    expect(call.request.leaveTypeId).toBe('lvt_al');
    expect(call.request.policyId).toBe('lvp_std');
    expect(call.request.settingsVersionId).toBe('lvgv_1');
    expect(call.entitlementTarget).toBe(18);
    expect(call.request.workflowId).toBe('lvwf_1');
    expect(call.request.currentLevel).toBe(1);
    expect(call.approvalSteps).toHaveLength(1);
    expect(call.request.calculationSnapshot).toMatchObject({
      rulesEngineVersion: 'leave-core-v2',
      versionNumber: 1,
      calculatedDurationDays: 2,
      scheduleSource: 'company_default',
      holidayCalendarId: 'hcal_1',
      holidayCalendarRevision: 2,
      workflowId: 'lvwf_1',
      documentRequired: false,
    });
    expect(call.request.calculationSnapshot.scheduleBreakdown).toHaveLength(4);
  });

  it('accepts a single-date half day', async () => {
    await apply({ startDate: MONDAY, endDate: MONDAY, session: 'first_half' });
    expect(repo.createRequestWithReservation!.mock.calls[0]![0].request.totalDays).toBe('0.50');
  });

  it.each([
    ['missing reason', { reason: '  ' }, 'LEAVE_INVALID_INPUT'],
    ['impossible date', { startDate: '2026-02-31' }, 'LEAVE_INVALID_INPUT'],
    ['multi-day half day', { session: 'first_half' }, 'LEAVE_HALF_DAY_MULTI_DATE'],
    [
      'half day on a weekly off',
      { startDate: SATURDAY, endDate: SATURDAY, session: 'first_half' },
      'LEAVE_NON_WORKING_HALF_DAY',
    ],
    [
      'weekend only',
      { startDate: SATURDAY, endDate: addDays(SATURDAY, 1) },
      'LEAVE_NO_CHARGEABLE_DAYS',
    ],
    [
      'backdated beyond window',
      { startDate: addDays(TODAY, -8), endDate: addDays(TODAY, -8) },
      'LEAVE_BACKDATE_LIMIT',
    ],
    [
      'too far in advance',
      { startDate: addDays(TODAY, 200), endDate: addDays(TODAY, 200) },
      'LEAVE_ADVANCE_LIMIT',
    ],
  ])('rejects %s', async (_label, overrides, code) => {
    await expect(apply(overrides)).rejects.toMatchObject({ code });
    expect(repo.createRequestWithReservation).not.toHaveBeenCalled();
  });

  it('rejects requests crossing the leave-year boundary', async () => {
    settingsRepo.getActiveVersionAtTimestamp!.mockResolvedValue({
      id: 'lvgv_1',
      versionNumber: 1,
      settingsPayload: { ...settingsPayload, maxAdvanceBookingDays: 365 },
    });
    const year = Number(TODAY.slice(0, 4));
    await expect(
      apply({ startDate: `${year}-12-31`, endDate: `${year + 1}-01-01` }),
    ).rejects.toMatchObject({ code: 'LEAVE_CROSSES_YEAR' });
  });

  it('rejects leave before go-live', async () => {
    settingsRepo.getActiveVersionAtTimestamp!.mockResolvedValue({
      id: 'lvgv_1',
      versionNumber: 1,
      settingsPayload: { ...settingsPayload, goLiveDate: addDays(MONDAY, 7) },
    });
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_BEFORE_GO_LIVE' });
  });

  it('rejects when no policy applies, or the type is not in the policy', async () => {
    policies.resolvePolicyForEmployee.mockResolvedValueOnce(null);
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_NO_POLICY' });

    policies.resolvePolicyForEmployee.mockResolvedValueOnce({ ...policy, entitlements: [] });
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_TYPE_NOT_IN_POLICY' });
  });

  it('rejects inactive or hidden leave types', async () => {
    typesRepo.findById.mockResolvedValueOnce(leaveType({ isActive: false }));
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_TYPE_INACTIVE' });
    typesRepo.findById.mockResolvedValueOnce(leaveType({ visibleToEmployee: false }));
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_TYPE_INACTIVE' });
  });

  it('blocks payroll-locked periods', async () => {
    repo.findLockedPeriodOverlapping!.mockResolvedValue({
      periodCode: '2026-10',
      startDate: '2026-10-01',
    });
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_PAYROLL_LOCKED' });
  });

  it('enforces probation, notice and gender eligibility', async () => {
    typesRepo.findById.mockResolvedValue(leaveType({ allowedInProbation: false }));
    repo.getEmployeeProfile!.mockResolvedValueOnce({ ...employee, employmentStatus: 'probation' });
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_PROBATION_BLOCKED' });

    typesRepo.findById.mockResolvedValue(leaveType());
    repo.getEmployeeProfile!.mockResolvedValueOnce({ ...employee, employmentStatus: 'notice' });
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_NOTICE_BLOCKED' });

    typesRepo.findById.mockResolvedValue(leaveType({ genderEligibility: 'male' }));
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_GENDER_INELIGIBLE' });
  });

  it('enforces type limits: minimum, maximum, consecutive days', async () => {
    typesRepo.findById.mockResolvedValue(leaveType({ minPerRequest: '1.00' }));
    await expect(apply({ endDate: MONDAY, session: 'first_half' })).rejects.toMatchObject({
      code: 'LEAVE_MIN_PER_REQUEST',
    });

    typesRepo.findById.mockResolvedValue(leaveType({ maxPerRequest: '1.00' }));
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_MAX_PER_REQUEST' });

    typesRepo.findById.mockResolvedValue(leaveType({ maxConsecutiveDays: 3 }));
    await expect(apply({ startDate: MONDAY, endDate: addDays(MONDAY, 3) })).rejects.toMatchObject({
      code: 'LEAVE_MAX_CONSECUTIVE',
    });
  });

  it('enforces the yearly ceiling and monthly cap using existing requests', async () => {
    typesRepo.findById.mockResolvedValue(leaveType({ maxPerYear: '5.00' }));
    repo.findActiveRequestsOfType!.mockResolvedValue([{ totalDays: '4.00', startDate: MONDAY }]);
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_MAX_PER_YEAR' });

    typesRepo.findById.mockResolvedValue(leaveType({ maxPerMonth: '2.00' }));
    repo.findActiveRequestsOfType!.mockResolvedValue([
      {
        totalDays: '1.00',
        startDate: MONDAY,
        calculationSnapshot: { scheduleBreakdown: [{ date: MONDAY, chargedDays: 1 }] },
      },
    ]);
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_MAX_PER_MONTH' });
  });

  it('rejects overlaps with 409', async () => {
    repo.findOverlappingLeave!.mockResolvedValue({
      status: 'pending',
      startDate: MONDAY,
      endDate: MONDAY,
    });
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_OVERLAP', statusCode: 409 });
  });

  it('flags required documents instead of blocking (Decision D13)', async () => {
    typesRepo.findById.mockResolvedValue(
      leaveType({ documentRequirement: 'mandatory_after_n_days', documentThresholdDays: 1 }),
    );
    await apply();
    expect(
      repo.createRequestWithReservation!.mock.calls[0]![0].request.calculationSnapshot
        .documentRequired,
    ).toBe(true);
  });

  it('passes the negative balance allowance to the reservation', async () => {
    typesRepo.findById.mockResolvedValue(
      leaveType({ negativeBalanceEnabled: true, negativeBalanceLimit: '2.00' }),
    );
    await apply();
    expect(repo.createRequestWithReservation!.mock.calls[0]![0].negativeAllowance).toBe(2);
  });

  it('excludes mandatory holidays from working days and blocks when no calendar is published', async () => {
    holidays.resolveForEmployee.mockResolvedValue({
      calendarId: 'hcal_1',
      revision: 0,
      optionalHolidayQuota: 0,
      holidays: [{ date: TUESDAY, name: 'Festival', type: 'mandatory' }],
    });
    await apply();
    expect(repo.createRequestWithReservation!.mock.calls[0]![0].request.totalDays).toBe('1.00');

    holidays.resolveForEmployee.mockResolvedValue(null);
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_SCHEDULE_MISSING' });
  });

  it('does not need a calendar when holidays count as leave', async () => {
    holidays.resolveForEmployee.mockResolvedValue(null);
    typesRepo.findById.mockResolvedValue(leaveType({ holidayTreatment: 'count' }));
    await expect(apply()).resolves.toBeDefined();
  });

  it('optional holiday leave only on optional holidays and within the quota', async () => {
    const optionalType = leaveType({ category: 'optional_holiday' });
    typesRepo.findById.mockResolvedValue(optionalType);
    typesRepo.findAllForCompany.mockResolvedValue([optionalType]);
    holidays.resolveForEmployee.mockResolvedValue({
      calendarId: 'hcal_1',
      revision: 0,
      optionalHolidayQuota: 1,
      holidays: [{ date: MONDAY, name: 'Optional Day', type: 'optional' }],
    });
    repo.findActiveRequests = vi.fn().mockResolvedValue([]);

    await expect(apply({ endDate: TUESDAY })).rejects.toMatchObject({
      code: 'LEAVE_NOT_OPTIONAL_HOLIDAY',
    });
    await apply({ endDate: MONDAY });
    // Optional holidays draw on the calendar quota, not a balance.
    expect(repo.createRequestWithReservation!.mock.calls[0]![0].isTracked).toBe(false);

    repo.findActiveRequests = vi.fn().mockResolvedValue([{ totalDays: '1.00' }]);
    await expect(apply({ endDate: MONDAY })).rejects.toMatchObject({
      code: 'LEAVE_OPTIONAL_HOLIDAY_QUOTA',
    });
  });

  it('applies restriction rules (step 8) and records evaluated rule ids', async () => {
    repo.findActiveRequests = vi.fn().mockResolvedValue([]);
    restrictions.listActive.mockResolvedValue([
      {
        id: 'lrr_1',
        name: 'Annual notice',
        ruleType: 'min_notice',
        config: { leaveTypeId: 'lvt_al', days: 400 },
      },
    ]);
    await expect(apply()).rejects.toMatchObject({ code: 'LEAVE_MIN_NOTICE' });

    restrictions.listActive.mockResolvedValue([
      {
        id: 'lrr_2',
        name: 'Lenient notice',
        ruleType: 'min_notice',
        config: { leaveTypeId: 'lvt_al', days: 0 },
      },
    ]);
    await apply();
    expect(
      repo.createRequestWithReservation!.mock.calls[0]![0].request.calculationSnapshot
        .restrictionRuleIds,
    ).toEqual(['lrr_2']);
  });

  it('passes auto-approval through to the reservation', async () => {
    approvals.planForRequest!.mockResolvedValue({
      steps: [],
      autoApprove: true,
      notifications: [],
    });
    await apply();
    const call = repo.createRequestWithReservation!.mock.calls[0]![0];
    expect(call.autoApprove).toBe(true);
    expect(call.request.currentLevel).toBeNull();
  });
});
