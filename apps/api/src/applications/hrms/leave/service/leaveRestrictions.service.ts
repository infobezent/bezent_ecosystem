import {
  LeaveRestrictionsRepository,
  leaveRestrictionsRepository,
} from '../repository/leaveRestrictions.repository.js';
import { LeaveTypesRepository, leaveTypesRepository } from '../repository/leaveTypes.repository.js';
import {
  LeavePoliciesRepository,
  leavePoliciesRepository,
} from '../repository/leavePolicies.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import { auditService, AuditService } from '../../../../platform/audit/service/audit.service.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { assertEnum, isValidIsoDate, parseOptionalInteger } from '../rules/leaveValidation.js';
import { RESTRICTION_TYPES, type RestrictionType } from '../rules/leaveRestrictions.js';
import type { LeaveRestrictionRuleRecord } from '../../../../db/schema.js';

export interface RestrictionDto {
  ruleType: RestrictionType;
  name: string;
  config: Record<string, unknown>;
  isActive?: boolean;
}

export class LeaveRestrictionsService {
  constructor(
    private readonly repo: LeaveRestrictionsRepository = leaveRestrictionsRepository,
    private readonly typesRepo: Pick<LeaveTypesRepository, 'findById'> = leaveTypesRepository,
    private readonly orgRepo: Pick<
      LeavePoliciesRepository,
      'findDepartmentName' | 'findLocationName'
    > = leavePoliciesRepository,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  list(tenantId: string, companyId: string): Promise<LeaveRestrictionRuleRecord[]> {
    return this.repo.listCurrent(tenantId, companyId);
  }

  /** Active rules evaluated by the request pipeline. */
  listActive(tenantId: string, companyId: string): Promise<LeaveRestrictionRuleRecord[]> {
    return this.repo.listCurrent(tenantId, companyId, true);
  }

  async history(tenantId: string, companyId: string, ruleKey: string) {
    await this.requireCurrent(tenantId, companyId, ruleKey);
    return this.repo.getHistory(companyId, ruleKey);
  }

  async create(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: RestrictionDto,
  ): Promise<LeaveRestrictionRuleRecord> {
    const fields = await this.validate(tenantId, companyId, dto);
    const ruleKey = generateSurrogateId('lrk');
    await this.repo.insert({
      id: generateSurrogateId('lrr'),
      tenantId,
      companyId,
      ruleKey,
      version: 1,
      createdByUserId: userId,
      ...fields,
    });
    await this.logAudit(userId, 'leave_restriction_created', tenantId, companyId, ruleKey, fields);
    return (await this.repo.findCurrentByKey(tenantId, companyId, ruleKey))!;
  }

  /** Edits create a new version; the previous one is kept, superseded (append-only). */
  async update(
    tenantId: string,
    companyId: string,
    ruleKey: string,
    userId: string,
    dto: Partial<RestrictionDto>,
  ): Promise<LeaveRestrictionRuleRecord> {
    const current = await this.requireCurrent(tenantId, companyId, ruleKey);
    if (dto?.ruleType !== undefined && dto.ruleType !== current.ruleType) {
      throw new BadRequestError('The rule type cannot change; create a new rule instead.');
    }
    const fields = await this.validate(tenantId, companyId, {
      ruleType: current.ruleType,
      name: dto?.name ?? current.name,
      config: dto?.config ?? current.config,
      isActive: dto?.isActive ?? current.isActive,
    });
    try {
      await this.repo.supersede(current, {
        id: generateSurrogateId('lrr'),
        tenantId,
        companyId,
        ruleKey,
        version: current.version + 1,
        createdByUserId: userId,
        ...fields,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('concurrently')) {
        throw new ConflictError('This rule was changed by someone else. Please refresh.');
      }
      throw err;
    }
    await this.logAudit(userId, 'leave_restriction_updated', tenantId, companyId, ruleKey, {
      fromVersion: current.version,
      ...fields,
    });
    return (await this.repo.findCurrentByKey(tenantId, companyId, ruleKey))!;
  }

  private async requireCurrent(tenantId: string, companyId: string, ruleKey: string) {
    const current = await this.repo.findCurrentByKey(tenantId, companyId, ruleKey);
    if (!current) throw new NotFoundError(`Restriction rule "${ruleKey}" not found.`);
    return current;
  }

  private async validate(tenantId: string, companyId: string, dto: RestrictionDto) {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');
    const ruleType = assertEnum(dto.ruleType, RESTRICTION_TYPES, 'Rule type');
    const name = typeof dto.name === 'string' ? dto.name.trim() : '';
    if (name.length < 2 || name.length > 100) {
      throw new BadRequestError('Rule name is required and must be between 2 and 100 characters.');
    }
    if (dto.isActive !== undefined && typeof dto.isActive !== 'boolean') {
      throw new BadRequestError('isActive must be true or false.');
    }
    const raw = dto.config && typeof dto.config === 'object' ? dto.config : {};

    const leaveType = async (value: unknown, field: string) => {
      if (typeof value !== 'string' || !value) throw new BadRequestError(`${field} is required.`);
      const type = await this.typesRepo.findById(tenantId, companyId, value);
      if (!type) throw new BadRequestError(`${field} was not found in this company.`);
      return value;
    };
    const intIn = (value: unknown, field: string, min: number, max: number) => {
      const n = parseOptionalInteger(value, field);
      if (n === null || n < min || n > max) {
        throw new BadRequestError(`${field} must be a whole number between ${min} and ${max}.`);
      }
      return n;
    };
    const optionalIntIn = (value: unknown, field: string, min: number, max: number) =>
      value === null || value === undefined || value === '' ? null : intIn(value, field, min, max);

    let config: Record<string, unknown>;
    switch (ruleType) {
      case 'clubbing': {
        const a = await leaveType(raw.leaveTypeIdA, 'First leave type');
        const b = await leaveType(raw.leaveTypeIdB, 'Second leave type');
        if (a === b) throw new BadRequestError('Choose two different leave types.');
        config = { leaveTypeIdA: a, leaveTypeIdB: b };
        break;
      }
      case 'blackout': {
        if (!isValidIsoDate(raw.startDate) || !isValidIsoDate(raw.endDate)) {
          throw new BadRequestError('Blackout start and end must be valid YYYY-MM-DD dates.');
        }
        if (raw.endDate < raw.startDate)
          throw new BadRequestError('Blackout end cannot precede its start.');
        const scope = assertEnum(
          raw.scope ?? 'company',
          ['company', 'department', 'location'] as const,
          'Scope',
        );
        let scopeId: string | null = null;
        if (scope !== 'company') {
          scopeId = typeof raw.scopeId === 'string' ? raw.scopeId : null;
          const found =
            scopeId &&
            (scope === 'department'
              ? await this.orgRepo.findDepartmentName(tenantId, companyId, scopeId)
              : await this.orgRepo.findLocationName(tenantId, companyId, scopeId));
          if (!found) throw new BadRequestError(`Select an active ${scope} for this blackout.`);
        }
        const ids = Array.isArray(raw.leaveTypeIds) ? raw.leaveTypeIds : [];
        for (const id of ids) await leaveType(id, 'Leave type');
        config = {
          startDate: raw.startDate,
          endDate: raw.endDate,
          scope,
          scopeId,
          leaveTypeIds: [...new Set(ids as string[])],
          allowHrOverride: raw.allowHrOverride === true,
        };
        break;
      }
      case 'min_notice':
        config = {
          leaveTypeId: await leaveType(raw.leaveTypeId, 'Leave type'),
          days: intIn(raw.days, 'Notice days', 0, 90),
        };
        break;
      case 'min_gap':
        config = {
          leaveTypeId: await leaveType(raw.leaveTypeId, 'Leave type'),
          workingDays: intIn(raw.workingDays, 'Minimum gap', 1, 60),
        };
        break;
      case 'frequency_cap': {
        const maxPerMonth = optionalIntIn(raw.maxPerMonth, 'Requests per month', 1, 31);
        const maxPerCycle = optionalIntIn(raw.maxPerCycle, 'Requests per leave year', 1, 366);
        if (maxPerMonth === null && maxPerCycle === null) {
          throw new BadRequestError('Set a monthly or a yearly request limit.');
        }
        config = {
          leaveTypeId: await leaveType(raw.leaveTypeId, 'Leave type'),
          maxPerMonth,
          maxPerCycle,
        };
        break;
      }
      case 'team_concurrency': {
        let departmentId: string | null = null;
        if (raw.departmentId) {
          departmentId = String(raw.departmentId);
          if (!(await this.orgRepo.findDepartmentName(tenantId, companyId, departmentId))) {
            throw new BadRequestError('Selected department was not found or is inactive.');
          }
        }
        const maxPercent = optionalIntIn(raw.maxPercent, 'Maximum percent on leave', 1, 100);
        const maxCount = optionalIntIn(raw.maxCount, 'Maximum people on leave', 1, 1000);
        if (maxPercent === null && maxCount === null) {
          throw new BadRequestError('Set a maximum percentage or a maximum headcount.');
        }
        config = { departmentId, maxPercent, maxCount };
        break;
      }
    }
    return { ruleType, name, config: config!, isActive: dto.isActive ?? true };
  }

  private async logAudit(
    userId: string,
    action: string,
    tenantId: string,
    companyId: string,
    ruleKey: string,
    metadata: Record<string, unknown>,
  ) {
    await this.audit.logEvent({
      actorUserId: userId,
      action,
      targetType: 'leave_restriction',
      targetId: ruleKey,
      tenantId,
      companyId,
      metadata,
    });
  }
}

export const leaveRestrictionsService = new LeaveRestrictionsService();
