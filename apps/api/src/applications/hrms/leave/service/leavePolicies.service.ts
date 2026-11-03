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
import type { LeavePolicyRecord, NewLeavePolicyRecord } from '../../../../db/schema.js';
import {
  EMPLOYMENT_TYPES,
  POLICY_SCOPES_V1,
  POLICY_STATUSES,
  SCOPE_SPECIFICITY,
  type CreateLeavePolicyDto,
  type UpdateLeavePolicyDto,
  type LeavePoliciesQuery,
  type LeavePoliciesListResponse,
  type LeavePolicyView,
  type PolicyEntitlementInput,
  type PolicyResolutionSubject,
  type PolicyScope,
  type PolicyStatus,
} from '../types/leavePolicies.types.js';

const MAX_QUOTA = 9999.5;

const EMPLOYMENT_TYPE_LABELS: Record<(typeof EMPLOYMENT_TYPES)[number], string> = {
  full_time: 'Full-Time',
  part_time: 'Part-Time',
  contract: 'Contract',
  intern: 'Intern',
};

/** Lifecycle edges. `active` requests resolve to `scheduled` when `effective_from` is in the future. */
const ALLOWED_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  draft: ['active', 'archived'],
  scheduled: ['draft', 'active', 'archived'],
  active: ['archived'],
  archived: [],
};

const isInForce = (s: PolicyStatus) => s === 'active' || s === 'scheduled';

/**
 * Picks the single policy that applies to an employee from candidates already in force on the date:
 * most specific scope wins, then higher priority, then the later effective_from.
 */
export function selectPolicyForEmployee<T extends LeavePolicyRecord>(
  candidates: T[],
  subject: PolicyResolutionSubject,
): T | null {
  const matching = candidates.filter((p) => {
    switch (p.scope) {
      case 'company':
        return true;
      case 'department':
        return Boolean(subject.departmentId) && p.scopeId === subject.departmentId;
      case 'location':
        return Boolean(subject.locationId) && p.scopeId === subject.locationId;
      case 'employment_type':
        return p.scopeId === subject.employmentType;
      default:
        return false;
    }
  });
  matching.sort(
    (a, b) =>
      SCOPE_SPECIFICITY[b.scope] - SCOPE_SPECIFICITY[a.scope] ||
      b.priority - a.priority ||
      b.effectiveFrom.localeCompare(a.effectiveFrom),
  );
  return matching[0] ?? null;
}

export class LeavePoliciesService {
  constructor(
    private readonly repo: LeavePoliciesRepository = leavePoliciesRepository,
    private readonly audit: Pick<AuditService, 'logEvent'> = auditService,
  ) {}

  async listLeavePolicies(
    tenantId: string,
    companyId: string,
    query: LeavePoliciesQuery,
  ): Promise<LeavePoliciesListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const [{ items, total }, counts, employeesWithoutPolicy] = await Promise.all([
      this.repo.findMany(tenantId, companyId, { ...query, page, limit }),
      this.repo.getStatusCounts(tenantId, companyId),
      this.countEmployeesWithoutPolicy(tenantId, companyId),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: { ...counts, employeesWithoutPolicy },
    };
  }

  async getLeavePolicyById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<LeavePolicyView> {
    const record = await this.repo.findById(tenantId, companyId, id);
    if (!record) {
      throw new NotFoundError(`Leave policy with id "${id}" not found.`);
    }
    return record;
  }

  /** The policy in force for an employee on a date (company-local today by default). */
  async resolvePolicyForEmployee(
    tenantId: string,
    companyId: string,
    subject: PolicyResolutionSubject,
    date?: string,
  ): Promise<LeavePolicyView | null> {
    const onDate = date ?? (await this.companyToday(tenantId, companyId));
    const candidates = await this.repo.findPoliciesInForceOn(tenantId, companyId, onDate);
    const picked = selectPolicyForEmployee(candidates, subject);
    return picked ? this.repo.findById(tenantId, companyId, picked.id) : null;
  }

  async createLeavePolicy(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: CreateLeavePolicyDto,
  ): Promise<LeavePolicyView> {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');

    const name = this.validateName(dto.name);
    const code = this.validateCode(dto.code);
    await this.assertUniqueNameAndCode(tenantId, companyId, name, code);

    const { effectiveFrom, effectiveTo } = this.validateDates(dto.effectiveFrom, dto.effectiveTo);
    const scope = await this.resolveScope(tenantId, companyId, dto.scope ?? 'company', dto.scopeId);
    const entitlements = await this.validateEntitlements(
      tenantId,
      companyId,
      dto.entitlements ?? [],
    );
    const priority = this.validatePriority(dto.priority);

    const today = await this.companyToday(tenantId, companyId);
    const requested = dto.status
      ? assertEnum(dto.status, POLICY_STATUSES, 'Status')
      : ('draft' as PolicyStatus);
    if (requested === 'archived') {
      throw new BadRequestError('A policy cannot be created as archived.');
    }
    const status = this.resolveInForceStatus(requested, effectiveFrom, effectiveTo, today);

    if (isInForce(status)) {
      this.assertActivatable(entitlements.length);
      await this.assertNoOverlap(
        tenantId,
        companyId,
        scope.scope,
        scope.scopeId,
        effectiveFrom,
        effectiveTo,
      );
    }

    const record: NewLeavePolicyRecord = {
      id: generateSurrogateId('lvp'),
      tenantId,
      companyId,
      name,
      code,
      description: dto.description?.trim() || null,
      status,
      scope: scope.scope,
      scopeId: scope.scopeId,
      scopeName: scope.scopeName,
      effectiveFrom,
      effectiveTo,
      linkedLeaveTypeIds: entitlements.map((e) => e.leaveTypeId),
      priority,
      isActive: isInForce(status),
      createdByUserId: userId || 'system',
    };

    const created = await this.withDuplicateGuard(() =>
      this.repo.createWithEntitlements(record, entitlements),
    );
    await this.logAudit(userId, 'leave_policy_created', created, { status, entitlements });
    return created;
  }

  async updateLeavePolicy(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
    dto: UpdateLeavePolicyDto,
  ): Promise<LeavePolicyView> {
    if (!dto || typeof dto !== 'object') throw new BadRequestError('Request body is required.');
    const existing = await this.getLeavePolicyById(tenantId, companyId, id);
    if (existing.status === 'archived') {
      throw new BadRequestError('Archived policies cannot be edited.');
    }

    const payload: Partial<NewLeavePolicyRecord> = {};

    if (dto.name !== undefined) {
      const name = this.validateName(dto.name);
      if (name.toLowerCase() !== existing.name.toLowerCase()) {
        const dup = await this.repo.findByName(tenantId, companyId, name);
        if (dup && dup.id !== id) {
          throw new ConflictError(`A policy with name "${name}" already exists in this company.`);
        }
      }
      payload.name = name;
    }

    if (dto.code !== undefined) {
      const code = this.validateCode(dto.code);
      if (code !== existing.code) {
        const dup = await this.repo.findByCode(tenantId, companyId, code);
        if (dup && dup.id !== id) {
          throw new ConflictError(`A policy with code "${code}" already exists in this company.`);
        }
      }
      payload.code = code;
    }

    if (dto.description !== undefined) {
      payload.description = dto.description?.trim() || null;
    }

    const { effectiveFrom, effectiveTo } = this.validateDates(
      dto.effectiveFrom !== undefined ? dto.effectiveFrom : existing.effectiveFrom,
      dto.effectiveTo !== undefined ? dto.effectiveTo : existing.effectiveTo,
    );
    payload.effectiveFrom = effectiveFrom;
    payload.effectiveTo = effectiveTo;

    const scopeChanged = dto.scope !== undefined || dto.scopeId !== undefined;
    const scope = scopeChanged
      ? await this.resolveScope(
          tenantId,
          companyId,
          dto.scope ?? existing.scope,
          dto.scopeId !== undefined ? dto.scopeId : existing.scopeId,
        )
      : { scope: existing.scope, scopeId: existing.scopeId, scopeName: existing.scopeName };
    if (scopeChanged) {
      payload.scope = scope.scope;
      payload.scopeId = scope.scopeId;
      payload.scopeName = scope.scopeName;
    }

    if (dto.priority !== undefined) {
      payload.priority = this.validatePriority(dto.priority);
    }

    const entitlements =
      dto.entitlements !== undefined
        ? await this.validateEntitlements(tenantId, companyId, dto.entitlements)
        : undefined;

    // Status: explicit transition if requested, otherwise an in-force policy is re-dated.
    const today = await this.companyToday(tenantId, companyId);
    let status: PolicyStatus = existing.status;
    if (dto.status !== undefined && dto.status !== existing.status) {
      status = this.transition(existing.status, dto.status, effectiveFrom, effectiveTo, today);
    } else if (isInForce(existing.status)) {
      status = this.resolveInForceStatus('active', effectiveFrom, effectiveTo, today);
    }
    payload.status = status;
    payload.isActive = isInForce(status);

    if (isInForce(status)) {
      this.assertActivatable(entitlements ? entitlements.length : existing.entitlements.length);
      await this.assertNoOverlap(
        tenantId,
        companyId,
        scope.scope,
        scope.scopeId,
        effectiveFrom,
        effectiveTo,
        id,
      );
    }

    const updated = await this.withDuplicateGuard(() =>
      this.repo.updateWithEntitlements(tenantId, companyId, id, payload, entitlements),
    );
    await this.logAudit(userId, 'leave_policy_updated', updated, {
      fieldsUpdated: Object.keys(dto),
      previousStatus: existing.status,
    });
    return updated;
  }

  async changeStatus(
    tenantId: string,
    companyId: string,
    id: string,
    userId: string,
    targetStatus: PolicyStatus,
  ): Promise<{ policy: LeavePolicyView; warning?: string }> {
    const existing = await this.getLeavePolicyById(tenantId, companyId, id);
    const today = await this.companyToday(tenantId, companyId);
    const status = this.transition(
      existing.status,
      targetStatus,
      existing.effectiveFrom,
      existing.effectiveTo,
      today,
    );

    if (isInForce(status)) {
      this.assertActivatable(existing.entitlements.length);
      await this.assertNoOverlap(
        tenantId,
        companyId,
        existing.scope,
        existing.scopeId,
        existing.effectiveFrom,
        existing.effectiveTo,
        id,
      );
    }

    const policy = await this.repo.updateStatus(tenantId, companyId, id, status);
    await this.logAudit(userId, 'leave_policy_status_changed', policy, {
      from: existing.status,
      to: status,
    });

    return {
      policy,
      warning:
        status === 'archived'
          ? `Policy "${existing.name}" has been retired/archived. Existing historical requests and balance records remain completely preserved.`
          : undefined,
    };
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  private validateName(value: unknown): string {
    const name = typeof value === 'string' ? value.trim() : '';
    if (name.length < 2 || name.length > 100) {
      throw new BadRequestError(
        'Policy name is required and must be between 2 and 100 characters.',
      );
    }
    return name;
  }

  private validateCode(value: unknown): string {
    const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (!/^[A-Z0-9_]{1,20}$/.test(code)) {
      throw new BadRequestError(
        'Policy code is required and must be 1-20 alphanumeric uppercase characters.',
      );
    }
    return code;
  }

  private async assertUniqueNameAndCode(
    tenantId: string,
    companyId: string,
    name: string,
    code: string,
  ): Promise<void> {
    if (await this.repo.findByCode(tenantId, companyId, code)) {
      throw new ConflictError(`A policy with code "${code}" already exists in this company.`);
    }
    if (await this.repo.findByName(tenantId, companyId, name)) {
      throw new ConflictError(`A policy with name "${name}" already exists in this company.`);
    }
  }

  private validateDates(
    from: unknown,
    to: unknown,
  ): { effectiveFrom: string; effectiveTo: string | null } {
    const effectiveFrom = typeof from === 'string' ? from.trim() : '';
    if (!isValidIsoDate(effectiveFrom)) {
      throw new BadRequestError('Effective from date is required as a valid YYYY-MM-DD date.');
    }
    const rawTo = typeof to === 'string' ? to.trim() : to;
    const effectiveTo = rawTo ? rawTo : null;
    if (effectiveTo !== null) {
      if (!isValidIsoDate(effectiveTo)) {
        throw new BadRequestError('Effective until date must be a valid YYYY-MM-DD date.');
      }
      if (effectiveTo < effectiveFrom) {
        throw new BadRequestError(
          'Effective until date cannot be earlier than effective from date.',
        );
      }
    }
    return { effectiveFrom, effectiveTo };
  }

  private validatePriority(value: unknown): number {
    const priority = parseOptionalInteger(value, 'Priority') ?? 0;
    if (priority < 0 || priority > 100) {
      throw new BadRequestError('Priority must be a whole number between 0 and 100.');
    }
    return priority;
  }

  /** Scope ids must reference a real department/location/employment type; the name is derived. */
  private async resolveScope(
    tenantId: string,
    companyId: string,
    rawScope: unknown,
    rawScopeId: unknown,
  ): Promise<{ scope: PolicyScope; scopeId: string | null; scopeName: string }> {
    const scope = assertEnum(rawScope, POLICY_SCOPES_V1, 'Scope');
    const scopeId = typeof rawScopeId === 'string' && rawScopeId.trim() ? rawScopeId.trim() : null;

    if (scope === 'company') {
      return { scope, scopeId: null, scopeName: 'Company-wide' };
    }
    if (!scopeId) {
      throw new BadRequestError(`A ${scope.replace('_', ' ')} must be selected for this scope.`);
    }

    let scopeName: string | null = null;
    if (scope === 'department') {
      scopeName = await this.repo.findDepartmentName(tenantId, companyId, scopeId);
    } else if (scope === 'location') {
      scopeName = await this.repo.findLocationName(tenantId, companyId, scopeId);
    } else if ((EMPLOYMENT_TYPES as readonly string[]).includes(scopeId)) {
      scopeName = EMPLOYMENT_TYPE_LABELS[scopeId as (typeof EMPLOYMENT_TYPES)[number]];
    }
    if (!scopeName) {
      throw new BadRequestError(
        `Selected ${scope.replace('_', ' ')} was not found or is inactive.`,
      );
    }
    return { scope, scopeId, scopeName };
  }

  private async validateEntitlements(
    tenantId: string,
    companyId: string,
    raw: unknown,
  ): Promise<PolicyEntitlementInput[]> {
    if (!Array.isArray(raw)) {
      throw new BadRequestError('Entitlements must be a list.');
    }
    const ids = raw.map((e: { leaveTypeId?: unknown }) => e?.leaveTypeId);
    if (ids.some((id) => typeof id !== 'string' || !id)) {
      throw new BadRequestError('Every entitlement needs a leave type.');
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestError('A leave type can only appear once in a policy.');
    }

    const types = await this.repo.findLeaveTypesByIds(tenantId, companyId, ids as string[]);
    const byId = new Map(types.map((t) => [t.id, t]));

    return raw.map((e: PolicyEntitlementInput) => {
      const type = byId.get(e.leaveTypeId);
      if (!type) {
        throw new BadRequestError(`Leave type "${e.leaveTypeId}" was not found in this company.`);
      }
      if (!type.isActive) {
        throw new BadRequestError(`Leave type "${type.name}" is inactive and cannot be linked.`);
      }
      if (type.category === 'compensatory') {
        throw new BadRequestError(
          `"${type.name}" is a compensatory leave type; its balance comes from earned comp-off, not a policy quota.`,
        );
      }

      const annualQuota = parseOptionalNumber(e.annualQuota, `Annual quota for ${type.name}`);
      const maxPerYearOverride = parseOptionalNumber(
        e.maxPerYearOverride,
        `Yearly limit override for ${type.name}`,
      );

      if (annualQuota === null) {
        if (type.isTracked) {
          throw new BadRequestError(`An annual quota is required for ${type.name}.`);
        }
      } else if (annualQuota < 0 || annualQuota > MAX_QUOTA || !isHalfDayMultiple(annualQuota)) {
        throw new BadRequestError(
          `Annual quota for ${type.name} must be between 0 and ${MAX_QUOTA} in steps of 0.5 days.`,
        );
      }

      if (maxPerYearOverride !== null) {
        if (maxPerYearOverride <= 0 || !isHalfDayMultiple(maxPerYearOverride)) {
          throw new BadRequestError(
            `Yearly limit override for ${type.name} must be positive, in steps of 0.5 days.`,
          );
        }
        if (annualQuota !== null && maxPerYearOverride < annualQuota) {
          throw new BadRequestError(
            `Yearly limit override for ${type.name} cannot be lower than its annual quota.`,
          );
        }
      }

      const ceiling =
        maxPerYearOverride ?? (type.maxPerYear !== null ? Number(type.maxPerYear) : null);
      if (annualQuota !== null && ceiling !== null && annualQuota > ceiling) {
        throw new BadRequestError(
          `Annual quota for ${type.name} (${annualQuota}) exceeds its yearly limit of ${ceiling} days.`,
        );
      }

      return { leaveTypeId: type.id, annualQuota, maxPerYearOverride };
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  private resolveInForceStatus(
    requested: PolicyStatus,
    effectiveFrom: string,
    effectiveTo: string | null,
    today: string,
  ): PolicyStatus {
    if (!isInForce(requested)) return requested;
    if (effectiveTo !== null && effectiveTo < today) {
      throw new BadRequestError(
        'This policy has already ended; its effective until date has passed.',
      );
    }
    return effectiveFrom > today ? 'scheduled' : 'active';
  }

  private transition(
    from: PolicyStatus,
    rawTarget: unknown,
    effectiveFrom: string,
    effectiveTo: string | null,
    today: string,
  ): PolicyStatus {
    const target = assertEnum(rawTarget, POLICY_STATUSES, 'Status');
    // "scheduled" is never chosen directly; it is what "active" becomes for a future start date.
    const requested: PolicyStatus = target === 'scheduled' ? 'active' : target;
    if (from === requested) return from;
    if (!ALLOWED_TRANSITIONS[from].includes(requested)) {
      throw new BadRequestError(`A ${from} policy cannot be moved to ${target}.`);
    }
    return this.resolveInForceStatus(requested, effectiveFrom, effectiveTo, today);
  }

  private assertActivatable(entitlementCount: number): void {
    if (entitlementCount === 0) {
      throw new BadRequestError('Link at least one leave type before activating this policy.');
    }
  }

  private async assertNoOverlap(
    tenantId: string,
    companyId: string,
    scope: PolicyScope,
    scopeId: string | null,
    effectiveFrom: string,
    effectiveTo: string | null,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.repo.findOverlappingScope(
      tenantId,
      companyId,
      scope,
      scopeId,
      effectiveFrom,
      effectiveTo,
      excludeId,
    );
    if (conflict) {
      throw new ConflictError(
        `${conflict.status === 'scheduled' ? 'A scheduled' : 'An active'} policy "${conflict.name}" (${conflict.code}) already covers this organizational scope for overlapping dates.`,
      );
    }
  }

  private async countEmployeesWithoutPolicy(tenantId: string, companyId: string): Promise<number> {
    const today = await this.companyToday(tenantId, companyId);
    const [candidates, staff] = await Promise.all([
      this.repo.findPoliciesInForceOn(tenantId, companyId, today),
      this.repo.findEmployeesForResolution(tenantId, companyId),
    ]);
    return staff.filter((e) => !selectPolicyForEmployee(candidates, e)).length;
  }

  private async companyToday(tenantId: string, companyId: string): Promise<string> {
    return localDateInTimezone(await this.repo.getCompanyTimezone(tenantId, companyId));
  }

  private async withDuplicateGuard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictError('A policy with this code already exists in this company.');
      }
      throw err;
    }
  }

  private async logAudit(
    userId: string,
    action: string,
    policy: LeavePolicyView,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.logEvent({
      actorUserId: userId,
      action,
      targetType: 'leave_policy',
      targetId: policy.id,
      tenantId: policy.tenantId,
      companyId: policy.companyId,
      metadata: { policyName: policy.name, policyCode: policy.code, ...metadata },
    });
  }
}

export const leavePoliciesService = new LeavePoliciesService();
