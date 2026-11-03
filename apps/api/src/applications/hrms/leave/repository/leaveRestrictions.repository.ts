import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  leaveRestrictionRules,
  type LeaveRestrictionRuleRecord,
  type NewLeaveRestrictionRuleRecord,
} from '../../../../db/schema.js';

export class LeaveRestrictionsRepository {
  /** Current (non-superseded) rules; optionally only active ones. */
  async listCurrent(
    tenantId: string,
    companyId: string,
    onlyActive = false,
  ): Promise<LeaveRestrictionRuleRecord[]> {
    const conditions = [
      eq(leaveRestrictionRules.tenantId, tenantId),
      eq(leaveRestrictionRules.companyId, companyId),
      isNull(leaveRestrictionRules.supersededAt),
    ];
    if (onlyActive) conditions.push(eq(leaveRestrictionRules.isActive, true));
    return getDb()
      .select()
      .from(leaveRestrictionRules)
      .where(and(...conditions))
      .orderBy(asc(leaveRestrictionRules.ruleType), asc(leaveRestrictionRules.name));
  }

  async findCurrentByKey(
    tenantId: string,
    companyId: string,
    ruleKey: string,
  ): Promise<LeaveRestrictionRuleRecord | null> {
    const [row] = await getDb()
      .select()
      .from(leaveRestrictionRules)
      .where(
        and(
          eq(leaveRestrictionRules.tenantId, tenantId),
          eq(leaveRestrictionRules.companyId, companyId),
          eq(leaveRestrictionRules.ruleKey, ruleKey),
          isNull(leaveRestrictionRules.supersededAt),
        ),
      );
    return row ?? null;
  }

  async getHistory(companyId: string, ruleKey: string): Promise<LeaveRestrictionRuleRecord[]> {
    return getDb()
      .select()
      .from(leaveRestrictionRules)
      .where(
        and(
          eq(leaveRestrictionRules.companyId, companyId),
          eq(leaveRestrictionRules.ruleKey, ruleKey),
        ),
      )
      .orderBy(asc(leaveRestrictionRules.version));
  }

  async insert(record: NewLeaveRestrictionRuleRecord): Promise<void> {
    await getDb().insert(leaveRestrictionRules).values(record);
  }

  /** Supersedes the current version and inserts the next one atomically. */
  async supersede(
    current: LeaveRestrictionRuleRecord,
    next: NewLeaveRestrictionRuleRecord,
  ): Promise<void> {
    await getDb().transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(leaveRestrictionRules)
        .where(eq(leaveRestrictionRules.id, current.id))
        .for('update');
      if (!locked || locked.supersededAt) {
        throw new Error('Restriction rule was changed concurrently.');
      }
      await tx
        .update(leaveRestrictionRules)
        .set({ supersededAt: new Date() })
        .where(eq(leaveRestrictionRules.id, current.id));
      await tx.insert(leaveRestrictionRules).values(next);
    });
  }
}

export const leaveRestrictionsRepository = new LeaveRestrictionsRepository();
