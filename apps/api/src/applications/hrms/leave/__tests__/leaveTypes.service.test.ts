import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaveTypesService } from '../service/leaveTypes.service.js';
import type { LeaveTypesRepository } from '../repository/leaveTypes.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import type { LeaveTypeRecord } from '../../../../db/schema.js';

describe('LeaveTypesService — Unit Tests', () => {
  let mockRepo: Partial<LeaveTypesRepository>;
  let policiesRepo: {
    findInForcePoliciesLinkingLeaveType: ReturnType<typeof vi.fn>;
    getCompanyTimezone: ReturnType<typeof vi.fn>;
  };
  let audit: { logEvent: ReturnType<typeof vi.fn> };
  let service: LeaveTypesService;

  const sampleLeaveType: LeaveTypeRecord = {
    id: 'lvt_test_1',
    tenantId: 'tenant_1',
    companyId: 'comp_1',
    name: 'Casual Leave',
    code: 'CL',
    shortLabel: 'Casual',
    colorToken: 'warning',
    description: 'Personal urgent leave',
    instructions: 'Apply 24h prior',
    category: 'paid',
    visibleToEmployee: true,
    isTracked: true,
    grantMethod: 'fixed_annual',
    unit: 'days',
    allowHalfDay: true,
    minPerRequest: '0.50',
    maxPerRequest: '3.00',
    maxPerYear: '12.00',
    maxConsecutiveDays: 3,
    countWeeklyOff: false,
    countHolidays: false,
    sandwichRuleEnabled: false,
    documentRequirement: 'none',
    documentThresholdDays: null,
    certificateType: null,
    carryForwardEnabled: false,
    encashmentEnabled: false,
    negativeBalanceEnabled: false,
    negativeBalanceLimit: null,
    countsTowardService: true,
    allowedInProbation: true,
    allowedInNoticePeriod: false,
    genderEligibility: 'all',
    attendanceStatusCode: 'CL',
    countsAsPresent: false,
    payrollImpact: 'paid',
    teamCalendarVisibility: 'generic_leave',
    workflowId: null,
    isActive: true,
    isArchived: false,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    weeklyOffTreatment: 'inherit',
    holidayTreatment: 'inherit',
    maxPerMonth: null,
  };

  const noUsage = { inUse: false, requestCount: 0, balanceCount: 0 };

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn().mockResolvedValue({ items: [sampleLeaveType], total: 1 }),
      getSummary: vi
        .fn()
        .mockResolvedValue({ total: 1, active: 1, inactive: 0, paid: 1, unpaid: 0, partlyPaid: 0 }),
      findById: vi.fn().mockResolvedValue(sampleLeaveType),
      findByCode: vi.fn().mockResolvedValue(null),
      findByName: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation((data) => Promise.resolve({ ...sampleLeaveType, ...data })),
      update: vi
        .fn()
        .mockImplementation((_t, _c, _id, data) =>
          Promise.resolve({ ...sampleLeaveType, ...data }),
        ),
      updateStatus: vi
        .fn()
        .mockImplementation((_t, _c, _id, isActive) =>
          Promise.resolve({ ...sampleLeaveType, isActive }),
        ),
      checkUsage: vi.fn().mockResolvedValue(noUsage),
    };
    policiesRepo = {
      findInForcePoliciesLinkingLeaveType: vi.fn().mockResolvedValue([]),
      getCompanyTimezone: vi.fn().mockResolvedValue('Asia/Kolkata'),
    };
    audit = { logEvent: vi.fn().mockResolvedValue(undefined) };
    service = new LeaveTypesService(mockRepo as LeaveTypesRepository, policiesRepo, audit);
  });

  const create = (dto: Record<string, unknown>) =>
    service.createLeaveType('tenant_1', 'comp_1', 'usr_1', {
      name: 'Annual Leave',
      code: 'AL',
      ...dto,
    } as never);
  const update = (dto: Record<string, unknown>) =>
    service.updateLeaveType('tenant_1', 'comp_1', 'lvt_test_1', 'usr_1', dto as never);

  describe('listing', () => {
    it('returns paginated items with summary including partly paid', async () => {
      const res = await service.listLeaveTypes('tenant_1', 'comp_1', { page: 1, limit: 10 });
      expect(res.items).toHaveLength(1);
      expect(res.summary.partlyPaid).toBe(0);
      expect(res.totalPages).toBe(1);
    });

    it('throws NotFoundError for an unknown id', async () => {
      mockRepo.findById = vi.fn().mockResolvedValue(null);
      await expect(service.getLeaveTypeById('tenant_1', 'comp_1', 'missing')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('creates with a surrogate id, uppercase code, derived payroll impact and audit entry', async () => {
      const created = await create({ code: 'al', category: 'paid', maxPerYear: 18 });

      expect(created.id).toMatch(/^lvt_/);
      expect(created.code).toBe('AL');
      expect(created.payrollImpact).toBe('paid');
      expect(created.maxPerYear).toBe('18.00');
      expect(created.attendanceStatusCode).toBe('AL');
      expect(audit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'leave_type_created', actorUserId: 'usr_1' }),
      );
    });

    it('rejects duplicate code and name with ConflictError', async () => {
      mockRepo.findByCode = vi.fn().mockResolvedValue(sampleLeaveType);
      await expect(create({ code: 'CL' })).rejects.toThrow(ConflictError);

      mockRepo.findByCode = vi.fn().mockResolvedValue(null);
      mockRepo.findByName = vi.fn().mockResolvedValue(sampleLeaveType);
      await expect(create({ name: 'Casual Leave' })).rejects.toThrow(ConflictError);
    });

    it.each([
      ['short name', { name: 'A' }, /name is required/],
      ['invalid code', { code: 'bad code!' }, /code is required/],
      ['unknown category', { category: 'vacation' }, /Category must be one of/],
      ['hour-based unit', { unit: 'hours' }, /Unit must be one of: days/],
      [
        'non half-day minimum',
        { minPerRequest: 0.3 },
        /Minimum per request must be greater than 0/,
      ],
      [
        'half-day minimum when disabled',
        { allowHalfDay: false, minPerRequest: 0.5 },
        /at least 1 day/,
      ],
      [
        'max below min',
        { minPerRequest: 2, maxPerRequest: 1 },
        /Maximum per request must be greater/,
      ],
      [
        'consecutive below min',
        { minPerRequest: 2, maxConsecutiveDays: 1 },
        /Max consecutive days/,
      ],
      ['month above year', { maxPerMonth: 5, maxPerYear: 4 }, /per month cannot exceed/],
      ['NaN year limit', { maxPerYear: 'abc' }, /Maximum per year must be a valid number/],
      [
        'missing document threshold',
        { documentRequirement: 'mandatory_after_n_days' },
        /threshold days/,
      ],
      [
        'negative balance without limit',
        { negativeBalanceEnabled: true },
        /Negative balance limit/,
      ],
      [
        'unpaid category marked paid',
        { category: 'loss_of_pay', paidClassification: 'paid' },
        /must be unpaid/,
      ],
      ['unknown color token', { colorToken: 'rainbow' }, /Color token must be one of/],
      [
        'unknown gender eligibility',
        { genderEligibility: 'other' },
        /Gender eligibility must be one of/,
      ],
      [
        'impossible effective date',
        { effectiveFrom: '2026-02-30' },
        /Effective from must be a valid/,
      ],
      [
        'end before start',
        { effectiveFrom: '2026-05-01', effectiveTo: '2026-04-01' },
        /cannot be earlier/,
      ],
      ['non boolean flag', { carryForwardEnabled: 'yes' }, /must be true or false/],
    ])('rejects %s', async (_label, dto, message) => {
      await expect(create(dto)).rejects.toThrow(message);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('persists allow half day, gender eligibility and the negative balance limit', async () => {
      const created = await create({
        allowHalfDay: false,
        minPerRequest: 1,
        genderEligibility: 'female',
        negativeBalanceEnabled: true,
        negativeBalanceLimit: 2.5,
      });
      expect(created.allowHalfDay).toBe(false);
      expect(created.genderEligibility).toBe('female');
      expect(created.negativeBalanceLimit).toBe('2.50');
    });

    it('defaults loss of pay to unpaid and untracked', async () => {
      const created = await create({ name: 'Loss of Pay', code: 'LOP', category: 'loss_of_pay' });
      expect(created.payrollImpact).toBe('unpaid');
      expect(created.isTracked).toBe(false);
      expect(created.colorToken).toBe('neutral');
    });

    it('maps a racing duplicate insert to ConflictError', async () => {
      mockRepo.create = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }));
      await expect(create({})).rejects.toThrow(ConflictError);
    });
  });

  describe('update', () => {
    it('validates the merged record, so an update cannot break an existing rule', async () => {
      // Existing max per request is 3; lowering min above it must fail.
      await expect(update({ minPerRequest: 4 })).rejects.toThrow(
        /Maximum per request must be greater/,
      );
    });

    it('allows updating max per request and max per year (previously ignored)', async () => {
      const updated = await update({ maxPerRequest: 5, maxPerYear: 15 });
      expect(updated.maxPerRequest).toBe('5.00');
      expect(updated.maxPerYear).toBe('15.00');
    });

    it('locks the code once the type has requests or balances', async () => {
      mockRepo.checkUsage = vi
        .fn()
        .mockResolvedValue({ inUse: true, requestCount: 2, balanceCount: 4 });
      await expect(update({ code: 'CLX' })).rejects.toMatchObject({
        code: 'LEAVE_TYPE_CODE_LOCKED',
      });
    });

    it('allows a code change for an unused type and keeps the status code in step', async () => {
      const updated = await update({ code: 'CAS' });
      expect(updated.code).toBe('CAS');
      expect(updated.attendanceStatusCode).toBe('CAS');
    });

    it('rejects renaming to an existing name', async () => {
      mockRepo.findByName = vi.fn().mockResolvedValue({ ...sampleLeaveType, id: 'other' });
      await expect(update({ name: 'Sick Leave' })).rejects.toThrow(ConflictError);
    });

    it('clears the document threshold when documents are no longer required', async () => {
      mockRepo.findById = vi.fn().mockResolvedValue({
        ...sampleLeaveType,
        documentRequirement: 'mandatory_after_n_days',
        documentThresholdDays: 2,
      });
      const updated = await update({ documentRequirement: 'none' });
      expect(updated.documentThresholdDays).toBeNull();
      expect(updated.certificateType).toBeNull();
    });
  });

  describe('status changes', () => {
    it('warns about usage and linked in-force policies when deactivating', async () => {
      mockRepo.checkUsage = vi
        .fn()
        .mockResolvedValue({ inUse: true, requestCount: 5, balanceCount: 10 });
      policiesRepo.findInForcePoliciesLinkingLeaveType.mockResolvedValue([
        { id: 'lvp_1', name: 'Standard Leave Policy', code: 'STD', status: 'active' },
      ]);

      const res = await service.changeStatus('tenant_1', 'comp_1', 'lvt_test_1', 'usr_1', false);

      expect(res.leaveType.isActive).toBe(false);
      expect(res.linkedPolicies).toHaveLength(1);
      expect(res.warning).toContain('5 historical request(s)');
      expect(res.warning).toContain('Standard Leave Policy');
    });

    it('activates without a warning', async () => {
      const res = await service.changeStatus('tenant_1', 'comp_1', 'lvt_test_1', 'usr_1', true);
      expect(res.warning).toBeUndefined();
    });

    it('rejects a non-boolean isActive', async () => {
      await expect(
        service.changeStatus('tenant_1', 'comp_1', 'lvt_test_1', 'usr_1', 'false'),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
