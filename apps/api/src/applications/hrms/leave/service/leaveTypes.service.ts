import { LeaveTypesRepository, leaveTypesRepository } from '../repository/leaveTypes.repository.js';
import {
  LeavePoliciesRepository,
  leavePoliciesRepository,
} from '../repository/leavePolicies.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  assertEnum,
  isDuplicateKeyError,
  isHalfDayMultiple,
  isValidIsoDate,
  localDateInTimezone,
  parseOptionalInteger,
  parseOptionalNumber,
} from '../rules/leaveValidation.js';
import {
  DAY_TREATMENTS,
  DOCUMENT_REQUIREMENTS,
  GENDER_ELIGIBILITIES,
  LEAVE_TYPE_CATEGORIES,
  LEAVE_TYPE_COLOR_TOKENS,
  LEAVE_TYPE_UNITS_V1,
  PAYROLL_IMPACTS,
  TEAM_CALENDAR_VISIBILITIES,
  type CreateLeaveTypeDto,
  type UpdateLeaveTypeDto,
  type LeaveTypesQuery,
  type LeaveTypesListResponse,
  type LeaveTypeStatusChangeResult,
  type PaidClassification,
} from '../types/leaveTypes.types.js';
import type { LeaveTypeRecord, NewLeaveTypeRecord } from '../../../../db/schema.js';

/** decimal(5,2) capacity, kept to half-day steps. */
const MAX_DAYS = 999.5;
const UNPAID_CATEGORIES = new Set(['unpaid', 'loss_of_pay']);

/** Fields a leave type definition owns; everything except identity/lifecycle bookkeeping. */
type LeaveTypeFields = Omit<
  NewLeaveTypeRecord,
  'id' | 'tenantId' | 'companyId' | 'createdAt' | 'updatedAt' | 'isArchived' | 'workflowId'
>;

/** Request value if sent, else the stored value, else the default. Values are validated afterwards. */
const pick = <T>(dtoValue: T | undefined, existing: unknown, fallback: T): T =>
  dtoValue !== undefined ? dtoValue : existing !== undefined ? (existing as T) : fallback;

const bool = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') throw new BadRequestError(`${field} must be true or false.`);
  return value;
};

const text = (value: unknown, max: number, field: string): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new BadRequestError(`${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max)
    throw new BadRequestError(`${field} must be at most ${max} characters.`);
  return trimmed || null;
};

const decimalOrNull = (n: number | null): string | null => (n === null ? null : n.toFixed(2));
const numberOrNull = (v: string | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

export class LeaveTypesService {
  constructor(
    private readonly repo: LeaveTypesRepository = leaveTypesRepository,
    private readonly policiesRepo: Pick<
      LeavePoliciesRepository,
      'findInForcePoliciesLinkingLeaveType' | 'getCompanyTimezone'
    > = leavePoliciesRepository,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  async listLeaveTypes(
    tenantId: string,
    companyId: string,
    query: LeaveTypesQuery,
  ): Promise<LeaveTypesListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const [{ items, total }, summary] = await Promise.all([
      this.repo.findMany(tenantId, companyId, { ...query, page, limit }),
      this.repo.getSummary(tenantId, companyId),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary,
    };
  }

  async getLeaveTypeById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<LeaveTypeRecord> {
    const record = await this.repo.findById(tenantId, companyId, id);
    if (!record) {
      throw new NotFoundError(`Leave type with id "${id}" not found.`);
    }
    return record;
  }

  async createLeaveType(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: CreateLeaveTypeDto,
  ): Promise<LeaveTypeRecord> {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');

    const today = localDateInTimezone(
      await this.policiesRepo.getCompanyTimezone(tenantId, companyId),
    );
    const fields = this.buildFields(dto, null, today);
    await this.assertUnique(tenantId, companyId, fields.name, fields.code);

    const created = await this.withDuplicateGuard(() =>
      this.repo.create({
        id: generateSurrogateId('lvt'),
        tenantId,
        companyId,
        ...fields,
        isArchived: false,
        workflowId: null,
      }),
    );
    await this.logAudit(userId, 'leave_type_created', created, {});
    return created;
  }

  async updateLeaveType(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateLeaveTypeDto,
  ): Promise<LeaveTypeRecord> {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');
    const existing = await this.getLeaveTypeById(tenantId, companyId, id);

    const fields = this.buildFields(dto, existing, existing.effectiveFrom);

    if (fields.name.toLowerCase() !== existing.name.toLowerCase()) {
      const dup = await this.repo.findByName(tenantId, companyId, fields.name);
      if (dup && dup.id !== id) {
        throw new ConflictError(
          `A leave type with name "${fields.name}" already exists in this company.`,
        );
      }
    }
    if (fields.code !== existing.code) {
      const usage = await this.repo.checkUsage(tenantId, companyId, existing.code);
      if (usage.inUse) {
        throw new BadRequestError(
          `The code of "${existing.name}" cannot change because it is used by ${usage.requestCount} request(s) and ${usage.balanceCount} balance record(s).`,
          'LEAVE_TYPE_CODE_LOCKED',
        );
      }
      const dup = await this.repo.findByCode(tenantId, companyId, fields.code);
      if (dup && dup.id !== id) {
        throw new ConflictError(
          `A leave type with code "${fields.code}" already exists in this company.`,
        );
      }
    }

    const changed = (Object.keys(fields) as Array<keyof LeaveTypeFields>).filter(
      (k) => String(fields[k] ?? '') !== String(existing[k] ?? ''),
    );
    const updated = await this.withDuplicateGuard(() =>
      this.repo.update(tenantId, companyId, id, fields),
    );
    await this.logAudit(userId, 'leave_type_updated', updated, { fieldsUpdated: changed });
    return updated;
  }

  /**
   * Activates or deactivates a leave type. Deactivation blocks new applications only; it warns
   * about historical usage and about active/scheduled policies that still link the type.
   */
  async changeStatus(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
    isActive: unknown,
  ): Promise<LeaveTypeStatusChangeResult> {
    const active = bool(isActive, 'isActive');
    const existing = await this.getLeaveTypeById(tenantId, companyId, id);
    const [usage, linkedPolicies] = await Promise.all([
      this.repo.checkUsage(tenantId, companyId, existing.code),
      this.policiesRepo.findInForcePoliciesLinkingLeaveType(tenantId, companyId, id),
    ]);

    const warnings: string[] = [];
    if (!active && usage.inUse) {
      warnings.push(
        `This leave type has ${usage.requestCount} historical request(s) and ${usage.balanceCount} balance record(s). Deactivating it prevents new leave applications while preserving existing employee records.`,
      );
    }
    if (!active && linkedPolicies.length > 0) {
      warnings.push(
        `It is still linked to ${linkedPolicies.length} active or scheduled polic${linkedPolicies.length === 1 ? 'y' : 'ies'}: ${linkedPolicies.map((p) => p.name).join(', ')}.`,
      );
    }

    const updated = await this.repo.updateStatus(tenantId, companyId, id, active);
    await this.logAudit(userId, 'leave_type_status_changed', updated, {
      from: existing.isActive,
      to: active,
    });

    return {
      leaveType: updated,
      usage,
      linkedPolicies,
      warning: warnings.length > 0 ? warnings.join(' ') : undefined,
    };
  }

  /**
   * Merges the request over the existing record (or defaults) and validates the result as a whole,
   * so create and update enforce exactly the same cross-field rules.
   */
  private buildFields(
    dto: UpdateLeaveTypeDto,
    existing: LeaveTypeRecord | null,
    defaultEffectiveFrom: string,
  ): LeaveTypeFields {
    const e = existing ?? undefined;

    const name = text(pick(dto.name, e?.name, ''), 100, 'Leave type name') ?? '';
    if (name.length < 2) {
      throw new BadRequestError(
        'Leave type name is required and must be between 2 and 100 characters.',
      );
    }
    const code = (text(pick(dto.code, e?.code, ''), 20, 'Leave type code') ?? '').toUpperCase();
    if (!/^[A-Z0-9_]{1,20}$/.test(code)) {
      throw new BadRequestError(
        'Leave type code is required and must be 1-20 alphanumeric uppercase characters.',
      );
    }

    const category = assertEnum(
      dto.category ?? e?.category ?? (dto.paidClassification === 'unpaid' ? 'unpaid' : 'paid'),
      LEAVE_TYPE_CATEGORIES,
      'Category',
    );
    const defaultImpact: PaidClassification = UNPAID_CATEGORIES.has(category) ? 'unpaid' : 'paid';
    const payrollImpact = assertEnum(
      pick(dto.paidClassification, e?.payrollImpact, defaultImpact),
      PAYROLL_IMPACTS,
      'Paid classification',
    );
    if (UNPAID_CATEGORIES.has(category) && payrollImpact !== 'unpaid') {
      throw new BadRequestError(
        `A ${category.replace(/_/g, ' ')} leave type must be unpaid for payroll.`,
      );
    }

    const unit = assertEnum(pick(dto.unit, e?.unit, 'days'), LEAVE_TYPE_UNITS_V1, 'Unit');
    const allowHalfDay = bool(pick(dto.allowHalfDay, e?.allowHalfDay, true), 'Allow half day');

    const minPerRequest =
      parseOptionalNumber(
        pick(
          dto.minPerRequest,
          numberOrNull(e?.minPerRequest) ?? undefined,
          allowHalfDay ? 0.5 : 1,
        ),
        'Minimum per request',
      ) ?? (allowHalfDay ? 0.5 : 1);
    if (minPerRequest <= 0 || minPerRequest > MAX_DAYS || !isHalfDayMultiple(minPerRequest)) {
      throw new BadRequestError(
        'Minimum per request must be greater than 0, in steps of 0.5 days.',
      );
    }
    if (!allowHalfDay && minPerRequest < 1) {
      throw new BadRequestError(
        'When half-day leave is disabled, minimum request duration must be at least 1 day.',
      );
    }

    const limit = (
      dtoValue: unknown,
      existingValue: string | number | null | undefined,
      field: string,
    ) => {
      const value = parseOptionalNumber(
        dtoValue !== undefined ? dtoValue : existingValue === undefined ? null : existingValue,
        field,
      );
      if (value !== null && (value <= 0 || value > MAX_DAYS || !isHalfDayMultiple(value))) {
        throw new BadRequestError(
          `${field} must be greater than 0 and at most ${MAX_DAYS}, in steps of 0.5 days.`,
        );
      }
      return value;
    };
    const maxPerRequest = limit(dto.maxPerRequest, e?.maxPerRequest, 'Maximum per request');
    const maxPerMonth = limit(dto.maxPerMonth, e?.maxPerMonth, 'Maximum per month');
    const maxPerYear = limit(dto.maxPerYear, e?.maxPerYear, 'Maximum per year');
    const maxConsecutiveDays = parseOptionalInteger(
      dto.maxConsecutiveDays !== undefined
        ? dto.maxConsecutiveDays
        : (e?.maxConsecutiveDays ?? null),
      'Max consecutive days',
    );

    if (maxPerRequest !== null && maxPerRequest < minPerRequest) {
      throw new BadRequestError(
        'Maximum per request must be greater than or equal to minimum per request.',
      );
    }
    if (
      maxConsecutiveDays !== null &&
      (maxConsecutiveDays <= 0 || maxConsecutiveDays < minPerRequest)
    ) {
      throw new BadRequestError(
        'Max consecutive days must be greater than or equal to minimum per request.',
      );
    }
    if (maxPerMonth !== null && maxPerYear !== null && maxPerMonth > maxPerYear) {
      throw new BadRequestError('Maximum per month cannot exceed maximum per year.');
    }

    const documentRequirement = assertEnum(
      pick(dto.documentRequirement, e?.documentRequirement, 'none'),
      DOCUMENT_REQUIREMENTS,
      'Document requirement',
    );
    let documentThresholdDays = parseOptionalInteger(
      dto.documentThresholdDays !== undefined
        ? dto.documentThresholdDays
        : (e?.documentThresholdDays ?? null),
      'Document threshold days',
    );
    if (documentRequirement === 'mandatory_after_n_days') {
      if (documentThresholdDays === null || documentThresholdDays < 1) {
        throw new BadRequestError(
          'Document threshold days must be at least 1 when document is mandatory after N days.',
        );
      }
    } else {
      documentThresholdDays = null;
    }
    const certificateType =
      documentRequirement === 'none'
        ? null
        : text(pick(dto.certificateType, e?.certificateType, null), 100, 'Certificate type');

    const negativeBalanceEnabled = bool(
      pick(dto.negativeBalanceEnabled, e?.negativeBalanceEnabled, false),
      'Negative balance',
    );
    let negativeBalanceLimit = parseOptionalNumber(
      dto.negativeBalanceLimit !== undefined
        ? dto.negativeBalanceLimit
        : numberOrNull(e?.negativeBalanceLimit),
      'Negative balance limit',
    );
    if (negativeBalanceEnabled) {
      if (
        negativeBalanceLimit === null ||
        negativeBalanceLimit < 0.5 ||
        negativeBalanceLimit > MAX_DAYS ||
        !isHalfDayMultiple(negativeBalanceLimit)
      ) {
        throw new BadRequestError(
          'Negative balance limit must be at least 0.5 days, in steps of 0.5, when negative balance is enabled.',
        );
      }
    } else {
      negativeBalanceLimit = null;
    }

    const colorToken = assertEnum(
      pick(dto.colorToken, e?.colorToken, payrollImpact === 'unpaid' ? 'neutral' : 'warning'),
      LEAVE_TYPE_COLOR_TOKENS,
      'Color token',
    );

    const attendanceStatusCode = (
      text(
        dto.attendanceStatusCode !== undefined
          ? dto.attendanceStatusCode
          : // The status code follows the leave code unless it was customised.
            e && e.attendanceStatusCode !== e.code
            ? e.attendanceStatusCode
            : code,
        20,
        'Attendance status code',
      ) ?? code
    ).toUpperCase();

    const effectiveFrom = pick(dto.effectiveFrom, e?.effectiveFrom, defaultEffectiveFrom);
    if (!isValidIsoDate(effectiveFrom)) {
      throw new BadRequestError('Effective from must be a valid YYYY-MM-DD date.');
    }
    const effectiveTo = pick(dto.effectiveTo, e?.effectiveTo, null) || null;
    if (effectiveTo !== null) {
      if (!isValidIsoDate(effectiveTo)) {
        throw new BadRequestError('Effective until must be a valid YYYY-MM-DD date.');
      }
      if (effectiveTo < effectiveFrom) {
        throw new BadRequestError('Effective until cannot be earlier than effective from.');
      }
    }

    return {
      name,
      code,
      shortLabel:
        text(pick(dto.shortLabel, e?.shortLabel, name.slice(0, 50)), 50, 'Short label') ??
        name.slice(0, 50),
      colorToken,
      description: text(pick(dto.description, e?.description, null), 2000, 'Description'),
      instructions: text(pick(dto.instructions, e?.instructions, null), 2000, 'Instructions'),
      category,
      payrollImpact,
      isTracked: bool(pick(dto.isTracked, e?.isTracked, category !== 'loss_of_pay'), 'Tracked'),
      visibleToEmployee: bool(
        pick(dto.visibleToEmployee, e?.visibleToEmployee, true),
        'Visible to employee',
      ),
      grantMethod: e?.grantMethod ?? 'fixed_annual',
      unit,
      allowHalfDay,
      minPerRequest: minPerRequest.toFixed(2),
      maxPerRequest: decimalOrNull(maxPerRequest),
      maxPerMonth: decimalOrNull(maxPerMonth),
      maxPerYear: decimalOrNull(maxPerYear),
      maxConsecutiveDays,
      countWeeklyOff: e?.countWeeklyOff ?? false,
      countHolidays: e?.countHolidays ?? false,
      weeklyOffTreatment: assertEnum(
        pick(dto.weeklyOffTreatment, e?.weeklyOffTreatment, 'inherit'),
        DAY_TREATMENTS,
        'Weekly-off treatment',
      ),
      holidayTreatment: assertEnum(
        pick(dto.holidayTreatment, e?.holidayTreatment, 'inherit'),
        DAY_TREATMENTS,
        'Holiday treatment',
      ),
      sandwichRuleEnabled: bool(
        pick(dto.sandwichRuleEnabled, e?.sandwichRuleEnabled, false),
        'Sandwich rule',
      ),
      documentRequirement,
      documentThresholdDays,
      certificateType,
      carryForwardEnabled: bool(
        pick(dto.carryForwardEnabled, e?.carryForwardEnabled, false),
        'Carry forward',
      ),
      encashmentEnabled: bool(
        pick(dto.encashmentEnabled, e?.encashmentEnabled, false),
        'Encashment',
      ),
      negativeBalanceEnabled,
      negativeBalanceLimit: decimalOrNull(negativeBalanceLimit),
      countsTowardService: bool(
        pick(dto.countsTowardService, e?.countsTowardService, true),
        'Counts toward service',
      ),
      allowedInProbation: bool(
        pick(dto.allowedInProbation, e?.allowedInProbation, true),
        'Allowed in probation',
      ),
      allowedInNoticePeriod: bool(
        pick(dto.allowedInNoticePeriod, e?.allowedInNoticePeriod, false),
        'Allowed in notice period',
      ),
      genderEligibility: assertEnum(
        pick(dto.genderEligibility, e?.genderEligibility, 'all'),
        GENDER_ELIGIBILITIES,
        'Gender eligibility',
      ),
      attendanceStatusCode,
      countsAsPresent: bool(
        pick(dto.countsAsPresent, e?.countsAsPresent, false),
        'Counts as present',
      ),
      teamCalendarVisibility: assertEnum(
        pick(dto.teamCalendarVisibility, e?.teamCalendarVisibility, 'generic_leave'),
        TEAM_CALENDAR_VISIBILITIES,
        'Team calendar visibility',
      ),
      isActive: bool(pick(dto.isActive, e?.isActive, true), 'Active'),
      effectiveFrom,
      effectiveTo,
    };
  }

  private async assertUnique(
    tenantId: string,
    companyId: string,
    name: string,
    code: string,
  ): Promise<void> {
    if (await this.repo.findByCode(tenantId, companyId, code)) {
      throw new ConflictError(`A leave type with code "${code}" already exists in this company.`);
    }
    if (await this.repo.findByName(tenantId, companyId, name)) {
      throw new ConflictError(`A leave type with name "${name}" already exists in this company.`);
    }
  }

  private async withDuplicateGuard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictError('A leave type with this code already exists in this company.');
      }
      throw err;
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    type: LeaveTypeRecord,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.logEvent({
      actorUserId: userId,
      action,
      targetType: 'leave_type',
      targetId: type.id,
      tenantId: type.tenantId,
      companyId: type.companyId,
      metadata: { leaveTypeName: type.name, leaveTypeCode: type.code, ...metadata },
    });
  }
}

export const leaveTypesService = new LeaveTypesService();
