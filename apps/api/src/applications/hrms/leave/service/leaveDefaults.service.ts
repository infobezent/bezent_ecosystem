import { LeaveTypesRepository, leaveTypesRepository } from '../repository/leaveTypes.repository.js';
import {
  LeavePoliciesRepository,
  leavePoliciesRepository,
} from '../repository/leavePolicies.repository.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { isDuplicateKeyError } from '../rules/leaveValidation.js';
import type { NewLeaveTypeRecord } from '../../../../db/schema.js';

/**
 * Default leave setup (spec §2.2): the same four types and "Standard Leave Policy" that migration
 * 0049 creates for companies with existing leave data, preserving the previous fixed quotas.
 */
export const DEFAULT_LEAVE_TYPES: Array<{
  code: string;
  name: string;
  shortLabel: string;
  colorToken: string;
  category: NewLeaveTypeRecord['category'];
  payrollImpact: NewLeaveTypeRecord['payrollImpact'];
  isTracked: boolean;
  maxPerYear: number | null;
  annualQuota: number | null;
}> = [
  {
    code: 'AL',
    name: 'Annual Leave',
    shortLabel: 'Annual',
    colorToken: 'success',
    category: 'paid',
    payrollImpact: 'paid',
    isTracked: true,
    maxPerYear: 18,
    annualQuota: 18,
  },
  {
    code: 'CL',
    name: 'Casual Leave',
    shortLabel: 'Casual',
    colorToken: 'warning',
    category: 'paid',
    payrollImpact: 'paid',
    isTracked: true,
    maxPerYear: 6,
    annualQuota: 6,
  },
  {
    code: 'SL',
    name: 'Sick Leave',
    shortLabel: 'Sick',
    colorToken: 'info',
    category: 'paid',
    payrollImpact: 'paid',
    isTracked: true,
    maxPerYear: 12,
    annualQuota: 12,
  },
  {
    code: 'LOP',
    name: 'Loss of Pay',
    shortLabel: 'LOP',
    colorToken: 'neutral',
    category: 'loss_of_pay',
    payrollImpact: 'unpaid',
    isTracked: false,
    maxPerYear: null,
    annualQuota: null,
  },
];

export const STANDARD_POLICY_CODE = 'STD_LEAVE';

export class LeaveDefaultsService {
  constructor(
    private readonly typesRepo: Pick<
      LeaveTypesRepository,
      'findAllForCompany' | 'create'
    > = leaveTypesRepository,
    private readonly policiesRepo: Pick<
      LeavePoliciesRepository,
      'getStatusCounts' | 'createWithEntitlements'
    > = leavePoliciesRepository,
  ) {}

  /**
   * Idempotent: a company with no leave types gets the four defaults, and a company with no
   * policies gets the Standard Leave Policy over whichever of the default codes it has.
   */
  async ensureDefaultLeaveSetup(tenantId: string, companyId: string): Promise<void> {
    let types = await this.typesRepo.findAllForCompany(tenantId, companyId);

    if (types.length === 0) {
      for (const def of DEFAULT_LEAVE_TYPES) {
        try {
          await this.typesRepo.create({
            id: generateSurrogateId('lvt'),
            tenantId,
            companyId,
            name: def.name,
            code: def.code,
            shortLabel: def.shortLabel,
            colorToken: def.colorToken,
            category: def.category,
            payrollImpact: def.payrollImpact,
            isTracked: def.isTracked,
            allowHalfDay: true,
            minPerRequest: '0.50',
            maxPerYear: def.maxPerYear === null ? null : def.maxPerYear.toFixed(2),
            attendanceStatusCode: def.code,
            effectiveFrom: '2000-01-01',
          });
        } catch (err) {
          if (!isDuplicateKeyError(err)) throw err; // a concurrent request provisioned it
        }
      }
      types = await this.typesRepo.findAllForCompany(tenantId, companyId);
    }

    const counts = await this.policiesRepo.getStatusCounts(tenantId, companyId);
    if (counts.total > 0) return;

    const entitlements = DEFAULT_LEAVE_TYPES.flatMap((def) => {
      const type = types.find((t) => t.code === def.code && !t.isArchived);
      return type ? [{ leaveTypeId: type.id, annualQuota: def.annualQuota }] : [];
    });
    if (entitlements.length === 0) return;

    try {
      await this.policiesRepo.createWithEntitlements(
        {
          id: generateSurrogateId('lvp'),
          tenantId,
          companyId,
          name: 'Standard Leave Policy',
          code: STANDARD_POLICY_CODE,
          description: 'Default company-wide policy preserving the previous fixed leave quotas.',
          status: 'active',
          scope: 'company',
          scopeId: null,
          scopeName: 'Company-wide',
          effectiveFrom: '2000-01-01',
          linkedLeaveTypeIds: entitlements.map((e) => e.leaveTypeId),
          priority: 0,
          isActive: true,
          createdByUserId: 'system',
        },
        entitlements,
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }
}

export const leaveDefaultsService = new LeaveDefaultsService();
