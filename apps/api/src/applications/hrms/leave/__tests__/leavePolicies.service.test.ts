import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeavePoliciesService, selectPolicyForEmployee } from '../service/leavePolicies.service.js';
import type { LeavePoliciesRepository } from '../repository/leavePolicies.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import type { LeavePolicyRecord, LeaveTypeRecord } from '../../../../db/schema.js';
import type { LeavePolicyView } from '../types/leavePolicies.types.js';

describe('LeavePoliciesService — Unit Test Suite', () => {
  let mockRepo: Partial<Record<keyof LeavePoliciesRepository, ReturnType<typeof vi.fn>>>;
  let audit: { logEvent: ReturnType<typeof vi.fn> };
  let service: LeavePoliciesService;

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const userId = 'usr_admin_01';

  const baseRecord: LeavePolicyView = {
    id: 'lvp_test_01',
    tenantId,
    companyId,
    name: 'Standard Corporate Policy',
    code: 'POL_CORP',
    description: 'Corporate leave policy for all employees',
    status: 'active',
    scope: 'company',
    scopeId: null,
    scopeName: 'Company-wide',
    effectiveFrom: '2020-01-01',
    effectiveTo: null,
    linkedLeaveTypeIds: ['lvt_al'],
    priority: 0,
    isActive: true,
    createdByUserId: userId,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    entitlements: [
      {
        leaveTypeId: 'lvt_al',
        leaveTypeName: 'Annual Leave',
        leaveTypeCode: 'AL',
        isTracked: true,
        annualQuota: 18,
        maxPerYearOverride: null,
      },
    ],
  };

  const leaveType = (overrides: Partial<LeaveTypeRecord> = {}) =>
    ({
      id: 'lvt_al',
      name: 'Annual Leave',
      code: 'AL',
      isActive: true,
      isTracked: true,
      category: 'paid',
      maxPerYear: '24.00',
      ...overrides,
    }) as LeaveTypeRecord;

  beforeEach(() => {
    mockRepo = {
      findMany: vi.fn().mockResolvedValue({ items: [baseRecord], total: 1 }),
      getStatusCounts: vi
        .fn()
        .mockResolvedValue({ total: 1, active: 1, draft: 0, scheduled: 0, archived: 0 }),
      findById: vi.fn().mockResolvedValue(baseRecord),
      findByCode: vi.fn().mockResolvedValue(null),
      findByName: vi.fn().mockResolvedValue(null),
      findOverlappingScope: vi.fn().mockResolvedValue(null),
      findLeaveTypesByIds: vi.fn().mockResolvedValue([leaveType()]),
      findDepartmentName: vi.fn().mockResolvedValue('Engineering'),
      findLocationName: vi.fn().mockResolvedValue('Chennai HQ'),
      findPoliciesInForceOn: vi.fn().mockResolvedValue([baseRecord]),
      findEmployeesForResolution: vi.fn().mockResolvedValue([]),
      getCompanyTimezone: vi.fn().mockResolvedValue('UTC'),
      createWithEntitlements: vi
        .fn()
        .mockImplementation((r, ents) =>
          Promise.resolve({ ...baseRecord, ...r, entitlements: ents }),
        ),
      updateWithEntitlements: vi
        .fn()
        .mockImplementation((_t, _c, _id, p) => Promise.resolve({ ...baseRecord, ...p })),
      updateStatus: vi
        .fn()
        .mockImplementation((_t, _c, _id, s) => Promise.resolve({ ...baseRecord, status: s })),
    };
    audit = { logEvent: vi.fn().mockResolvedValue(undefined) };
    service = new LeavePoliciesService(mockRepo as unknown as LeavePoliciesRepository, audit);
  });

  const createDto = (overrides: Record<string, unknown> = {}) => ({
    name: 'Engineering Policy',
    code: 'pol_eng',
    effectiveFrom: '2020-01-01',
    scope: 'department',
    scopeId: 'dept_eng',
    entitlements: [{ leaveTypeId: 'lvt_al', annualQuota: 21 }],
    ...overrides,
  });
  const create = (overrides: Record<string, unknown> = {}) =>
    service.createLeavePolicy(tenantId, companyId, userId, createDto(overrides) as never);

  describe('listing', () => {
    it('includes the number of employees without a policy in the summary', async () => {
      mockRepo.findPoliciesInForceOn!.mockResolvedValue([
        { ...baseRecord, scope: 'department', scopeId: 'dept_eng' },
      ]);
      mockRepo.findEmployeesForResolution!.mockResolvedValue([
        { id: 'e1', departmentId: 'dept_eng', locationId: null, employmentType: 'full_time' },
        { id: 'e2', departmentId: 'dept_sales', locationId: null, employmentType: 'full_time' },
      ]);

      const res = await service.listLeavePolicies(tenantId, companyId, {});

      expect(res.summary.employeesWithoutPolicy).toBe(1);
      expect(res.summary.active).toBe(1);
    });

    it('throws NotFoundError for unknown policy id', async () => {
      mockRepo.findById!.mockResolvedValue(null);
      await expect(service.getLeavePolicyById(tenantId, companyId, 'nope')).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('create', () => {
    it('creates a draft with the derived scope name and validated entitlements', async () => {
      const created = await create();

      expect(created.status).toBe('draft');
      expect(created.code).toBe('POL_ENG');
      expect(created.scopeName).toBe('Engineering');
      expect(created.id).toMatch(/^lvp_/);
      expect(mockRepo.createWithEntitlements).toHaveBeenCalledWith(
        expect.objectContaining({ linkedLeaveTypeIds: ['lvt_al'] }),
        [{ leaveTypeId: 'lvt_al', annualQuota: 21, maxPerYearOverride: null }],
      );
      expect(audit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'leave_policy_created' }),
      );
    });

    it('resolves an active request with a future start into scheduled', async () => {
      const created = await create({ status: 'active', effectiveFrom: '2099-01-01' });
      expect(created.status).toBe('scheduled');
    });

    it.each([
      ['custom scope', { scope: 'custom' }, /Scope must be one of/],
      ['missing scope id', { scopeId: null }, /must be selected/],
      ['impossible date', { effectiveFrom: '2026-02-31' }, /valid YYYY-MM-DD/],
      ['end before start', { effectiveTo: '2019-12-31' }, /cannot be earlier/],
      ['priority out of range', { priority: 101 }, /Priority must be/],
      [
        'duplicate leave type',
        {
          entitlements: [
            { leaveTypeId: 'lvt_al', annualQuota: 1 },
            { leaveTypeId: 'lvt_al', annualQuota: 2 },
          ],
        },
        /only appear once/,
      ],
      [
        'missing quota for tracked type',
        { entitlements: [{ leaveTypeId: 'lvt_al' }] },
        /annual quota is required/,
      ],
      [
        'non half-day quota',
        { entitlements: [{ leaveTypeId: 'lvt_al', annualQuota: 1.3 }] },
        /steps of 0.5/,
      ],
      [
        'quota above type ceiling',
        { entitlements: [{ leaveTypeId: 'lvt_al', annualQuota: 30 }] },
        /exceeds its yearly limit/,
      ],
      [
        'override below quota',
        { entitlements: [{ leaveTypeId: 'lvt_al', annualQuota: 10, maxPerYearOverride: 5 }] },
        /cannot be lower/,
      ],
      ['archived at create', { status: 'archived' }, /cannot be created as archived/],
      [
        'activation without leave types',
        { status: 'active', entitlements: [] },
        /at least one leave type/,
      ],
    ])('rejects %s', async (_label, overrides, message) => {
      await expect(create(overrides)).rejects.toThrow(message);
      expect(mockRepo.createWithEntitlements).not.toHaveBeenCalled();
    });

    it('rejects an unknown department', async () => {
      mockRepo.findDepartmentName!.mockResolvedValue(null);
      await expect(create()).rejects.toThrow(/not found or is inactive/);
    });

    it('rejects leave types from another company, inactive types, and compensatory types', async () => {
      mockRepo.findLeaveTypesByIds!.mockResolvedValue([]);
      await expect(create()).rejects.toThrow(/was not found in this company/);

      mockRepo.findLeaveTypesByIds!.mockResolvedValue([leaveType({ isActive: false })]);
      await expect(create()).rejects.toThrow(/inactive and cannot be linked/);

      mockRepo.findLeaveTypesByIds!.mockResolvedValue([leaveType({ category: 'compensatory' })]);
      await expect(create()).rejects.toThrow(/compensatory leave type/);
    });

    it('allows a null quota for an untracked type such as loss of pay', async () => {
      mockRepo.findLeaveTypesByIds!.mockResolvedValue([
        leaveType({ id: 'lvt_lop', name: 'Loss of Pay', isTracked: false, maxPerYear: null }),
      ]);
      await expect(
        create({ entitlements: [{ leaveTypeId: 'lvt_lop', annualQuota: null }] }),
      ).resolves.toBeDefined();
    });

    it('accepts an employment-type scope and labels it', async () => {
      const created = await create({ scope: 'employment_type', scopeId: 'contract' });
      expect(created.scopeName).toBe('Contract');
    });

    it('rejects an overlapping active or scheduled policy for the same scope', async () => {
      mockRepo.findOverlappingScope!.mockResolvedValue({ ...baseRecord, status: 'scheduled' });
      await expect(create({ status: 'active' })).rejects.toThrow(/A scheduled policy/);
    });

    it('rejects a duplicate code with ConflictError', async () => {
      mockRepo.findByCode!.mockResolvedValue(baseRecord);
      await expect(create()).rejects.toThrow(ConflictError);
    });
  });

  describe('update', () => {
    const update = (dto: Record<string, unknown>) =>
      service.updateLeavePolicy(tenantId, companyId, 'lvp_test_01', userId, dto as never);

    it('re-runs the overlap check when an active policy changes dates (previously skipped)', async () => {
      mockRepo.findOverlappingScope!.mockResolvedValue({ ...baseRecord, id: 'other' });
      await expect(update({ effectiveFrom: '2021-01-01' })).rejects.toThrow(ConflictError);
      expect(mockRepo.findOverlappingScope).toHaveBeenCalledWith(
        tenantId,
        companyId,
        'company',
        null,
        '2021-01-01',
        null,
        'lvp_test_01',
      );
    });

    it('moves an active policy to scheduled when its start date moves into the future', async () => {
      const updated = await update({ effectiveFrom: '2099-01-01' });
      expect(updated.status).toBe('scheduled');
    });

    it('rejects edits to archived policies', async () => {
      mockRepo.findById!.mockResolvedValue({ ...baseRecord, status: 'archived' });
      await expect(update({ name: 'New Name' })).rejects.toThrow(
        /Archived policies cannot be edited/,
      );
    });

    it('replaces entitlements when provided', async () => {
      await update({ entitlements: [{ leaveTypeId: 'lvt_al', annualQuota: 20 }] });
      expect(mockRepo.updateWithEntitlements).toHaveBeenCalledWith(
        tenantId,
        companyId,
        'lvp_test_01',
        expect.any(Object),
        [{ leaveTypeId: 'lvt_al', annualQuota: 20, maxPerYearOverride: null }],
      );
    });

    it('rejects an invalid lifecycle transition', async () => {
      await expect(update({ status: 'draft' })).rejects.toThrow(/cannot be moved to draft/);
    });
  });

  describe('changeStatus', () => {
    it('archives with a warning and logs the transition', async () => {
      const res = await service.changeStatus(
        tenantId,
        companyId,
        'lvp_test_01',
        userId,
        'archived',
      );
      expect(res.policy.status).toBe('archived');
      expect(res.warning).toMatch(/archived/);
      expect(audit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'leave_policy_status_changed',
          metadata: expect.objectContaining({ from: 'active', to: 'archived' }),
        }),
      );
    });

    it('archived is terminal', async () => {
      mockRepo.findById!.mockResolvedValue({ ...baseRecord, status: 'archived' });
      await expect(
        service.changeStatus(tenantId, companyId, 'lvp_test_01', userId, 'active'),
      ).rejects.toThrow(BadRequestError);
    });

    it('activating a draft whose end date has passed is rejected', async () => {
      mockRepo.findById!.mockResolvedValue({
        ...baseRecord,
        status: 'draft',
        effectiveTo: '2020-12-31',
      });
      await expect(
        service.changeStatus(tenantId, companyId, 'lvp_test_01', userId, 'active'),
      ).rejects.toThrow(/already ended/);
    });

    it('rejects an unknown status value', async () => {
      await expect(
        service.changeStatus(tenantId, companyId, 'lvp_test_01', userId, 'paused' as never),
      ).rejects.toThrow(/Status must be one of/);
    });
  });

  describe('selectPolicyForEmployee', () => {
    const policy = (overrides: Partial<LeavePolicyRecord>) =>
      ({ ...baseRecord, ...overrides }) as LeavePolicyRecord;
    const employee = {
      departmentId: 'dept_eng',
      locationId: 'loc_chn',
      employmentType: 'full_time' as const,
    };

    it('prefers employment type > location > department > company', () => {
      const company = policy({ id: 'company', scope: 'company' });
      const dept = policy({ id: 'dept', scope: 'department', scopeId: 'dept_eng' });
      const loc = policy({ id: 'loc', scope: 'location', scopeId: 'loc_chn' });
      const emp = policy({ id: 'emp', scope: 'employment_type', scopeId: 'full_time' });

      expect(selectPolicyForEmployee([company, dept], employee)?.id).toBe('dept');
      expect(selectPolicyForEmployee([company, dept, loc], employee)?.id).toBe('loc');
      expect(selectPolicyForEmployee([company, dept, loc, emp], employee)?.id).toBe('emp');
    });

    it('breaks ties by priority, then by the later effective date', () => {
      const a = policy({ id: 'a', scope: 'company', priority: 1, effectiveFrom: '2026-01-01' });
      const b = policy({ id: 'b', scope: 'company', priority: 5, effectiveFrom: '2025-01-01' });
      const c = policy({ id: 'c', scope: 'company', priority: 5, effectiveFrom: '2026-06-01' });
      expect(selectPolicyForEmployee([a, b, c], employee)?.id).toBe('c');
    });

    it('ignores policies for other departments and returns null when nothing matches', () => {
      const other = policy({ scope: 'department', scopeId: 'dept_sales' });
      expect(selectPolicyForEmployee([other], employee)).toBeNull();
    });
  });
});
