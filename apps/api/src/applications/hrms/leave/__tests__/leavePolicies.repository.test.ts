import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured, closePool } from '../../../../db/connection.js';
import { companies, leavePolicies } from '../../../../db/schema.js';
import { leavePoliciesRepository } from '../repository/leavePolicies.repository.js';
import { leavePolicyLifecycleService } from '../service/leavePolicyLifecycle.service.js';

describe.skipIf(!isDatabaseConfigured)('LeavePoliciesRepository — Isolated Database Suite', () => {
  const db = getDb();
  const tenantId = 'tenant_demo_01';
  const companyId = `comp_lvp_${Date.now()}`;

  const policy = (id: string, overrides: Partial<typeof leavePolicies.$inferInsert>) => ({
    id,
    tenantId,
    companyId,
    name: `Policy ${id}`,
    code: id.toUpperCase().slice(-20),
    status: 'active' as const,
    scope: 'company' as const,
    effectiveFrom: '2026-01-01',
    linkedLeaveTypeIds: [],
    createdByUserId: 'usr_test',
    ...overrides,
  });

  beforeAll(async () => {
    await db.insert(companies).values({
      id: companyId,
      tenantId,
      name: 'Isolated Leave Policy Test Company',
      code: `LVP_${Date.now().toString().slice(-6)}`,
      status: 'active',
      timeZone: 'Asia/Kolkata',
    });
  });

  afterAll(async () => {
    await db.delete(leavePolicies).where(eq(leavePolicies.companyId, companyId));
    await db.delete(companies).where(eq(companies.id, companyId));
    await closePool();
  });

  it('sweep activates due scheduled policies and archives ended ones, in company-local date', async () => {
    await leavePoliciesRepository.createWithEntitlements(
      policy('lvp_sched', { status: 'scheduled', effectiveFrom: '2030-03-01' }),
      [],
    );
    await leavePoliciesRepository.createWithEntitlements(
      policy('lvp_ended', { scope: 'location', scopeId: 'loc_x', effectiveTo: '2030-02-28' }),
      [],
    );
    await leavePoliciesRepository.createWithEntitlements(
      policy('lvp_future', {
        status: 'scheduled',
        scope: 'department',
        scopeId: 'd1',
        effectiveFrom: '2030-06-01',
      }),
      [],
    );

    // 2030-02-28T20:00Z is already 2030-03-01 in Asia/Kolkata (UTC+05:30).
    const result = await leavePolicyLifecycleService.runSweep({
      companyId,
      now: new Date('2030-02-28T20:00:00Z'),
    });

    expect(result).toEqual({ activated: 1, archived: 1 });
    const statuses = Object.fromEntries(
      (await db.select().from(leavePolicies).where(eq(leavePolicies.companyId, companyId))).map(
        (p) => [p.id, p.status],
      ),
    );
    expect(statuses).toEqual({
      lvp_sched: 'active',
      lvp_ended: 'archived',
      lvp_future: 'scheduled',
    });

    // Idempotent: a second run changes nothing.
    const again = await leavePolicyLifecycleService.runSweep({
      companyId,
      now: new Date('2030-02-28T20:00:00Z'),
    });
    expect(again).toEqual({ activated: 0, archived: 0 });
  });

  it('overlap detection includes scheduled policies but ignores other scope ids', async () => {
    const sameScope = await leavePoliciesRepository.findOverlappingScope(
      tenantId,
      companyId,
      'department',
      'd1',
      '2030-07-01',
      null,
    );
    expect(sameScope?.id).toBe('lvp_future');

    const otherDept = await leavePoliciesRepository.findOverlappingScope(
      tenantId,
      companyId,
      'department',
      'd2',
      '2030-07-01',
      null,
    );
    expect(otherDept).toBeNull();
  });

  it('findPoliciesInForceOn uses dates, so a lagging sweep never changes resolution', async () => {
    const onDate = await leavePoliciesRepository.findPoliciesInForceOn(
      tenantId,
      companyId,
      '2030-06-15',
    );
    expect(onDate.map((p) => p.id).sort()).toEqual(['lvp_future', 'lvp_sched']);
  });
});
