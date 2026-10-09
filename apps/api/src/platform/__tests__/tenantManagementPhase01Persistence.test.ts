import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  tenantAdmins,
  plans,
  planPrices,
  planEntitlements,
  tenantSubscriptions,
  tenantEntitlementOverrides,
  tenantLifecycleEvents,
  provisioningJobs,
  transactionalOutbox,
} from '../../db/schema.js';
import { tenantManagementBackfillService } from '../tenants/backfill/tenantManagementBackfill.service.js';

import { createUnusableCredential } from '../auth/security.js';

describe('Tenant Management Phase 01 Database Foundation — Persistence & Invariants', () => {
  const testTenantId = 'tent_tm_p1_test';
  const testCompanyId = 'comp_tm_p1_test';
  const testUserAId = 'usr_tm_p1_a';
  const testUserBId = 'usr_tm_p1_b';
  const testUserCId = 'usr_tm_p1_c';

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    const { hash, salt } = createUnusableCredential();

    // Clean up test data if left over
    await db.delete(transactionalOutbox).where(eq(transactionalOutbox.aggregateId, testTenantId));
    await db.delete(provisioningJobs).where(eq(provisioningJobs.tenantId, testTenantId));
    await db.delete(tenantLifecycleEvents).where(eq(tenantLifecycleEvents.tenantId, testTenantId));
    await db.delete(tenantEntitlementOverrides).where(eq(tenantEntitlementOverrides.tenantId, testTenantId));
    await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, testTenantId));
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testCompanyId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await db.delete(users).where(eq(users.id, testUserAId));
    await db.delete(users).where(eq(users.id, testUserBId));
    await db.delete(users).where(eq(users.id, testUserCId));

    // Setup base tenant, company, users
    await db.insert(tenants).values({
      id: testTenantId,
      name: 'Phase 01 Test Corp',
      status: 'active',
    });

    await db.insert(companies).values({
      id: testCompanyId,
      tenantId: testTenantId,
      name: 'Phase 01 Test Company',
      code: 'P1-TEST-CO',
      status: 'active',
    });

    await db.insert(users).values([
      {
        id: testUserAId,
        email: 'admin_a_p1@bezent.test',
        passwordHash: hash,
        salt,
        firstName: 'Alice',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserBId,
        email: 'admin_b_p1@bezent.test',
        passwordHash: hash,
        salt,
        firstName: 'Bob',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserCId,
        email: 'admin_c_p1@bezent.test',
        passwordHash: hash,
        salt,
        firstName: 'Charlie',
        lastName: 'Admin',
        status: 'active',
      },
    ]);
  });

  afterAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    await db.delete(transactionalOutbox).where(eq(transactionalOutbox.aggregateId, testTenantId));
    await db.delete(provisioningJobs).where(eq(provisioningJobs.tenantId, testTenantId));
    await db.delete(tenantLifecycleEvents).where(eq(tenantLifecycleEvents.tenantId, testTenantId));
    await db.delete(tenantEntitlementOverrides).where(eq(tenantEntitlementOverrides.tenantId, testTenantId));
    await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, testTenantId));
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testCompanyId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await db.delete(users).where(eq(users.id, testUserAId));
    await db.delete(users).where(eq(users.id, testUserBId));
    await db.delete(users).where(eq(users.id, testUserCId));
  });

  describe('1. Commercial Plan & Pricing Catalog Invariants', () => {
    it('enforces unique plan code within the same application scope', async () => {
      const db = getDb();
      const planCode = 'p1_test_unique_plan';

      // Clean up previous test run if needed
      await db.delete(plans).where(eq(plans.code, planCode));

      await db.insert(plans).values({
        id: 'plan_test_hrms_uniq',
        applicationCode: 'hrms',
        code: planCode,
        name: 'Test HRMS Plan',
        tier: 'starter',
      });

      // Inserting identical plan code in same application 'hrms' must fail
      await expect(
        db.insert(plans).values({
          id: 'plan_test_hrms_dup',
          applicationCode: 'hrms',
          code: planCode,
          name: 'Duplicate Plan',
          tier: 'growth',
        }),
      ).rejects.toThrow();

      // Same plan code in a DIFFERENT application ('crm') is permitted
      await db.insert(plans).values({
        id: 'plan_test_crm_uniq',
        applicationCode: 'crm',
        code: planCode,
        name: 'Test CRM Plan',
        tier: 'starter',
      });

      const crmPlan = await db.select().from(plans).where(eq(plans.id, 'plan_test_crm_uniq'));
      expect(crmPlan).toHaveLength(1);

      // Clean up
      await db.delete(plans).where(eq(plans.code, planCode));
    });

    it('persists exact integer minor currency units without floating point representation', async () => {
      const db = getDb();
      const testPlanId = 'plan_test_price_check';
      await db.delete(planPrices).where(eq(planPrices.planId, testPlanId));
      await db.delete(plans).where(eq(plans.id, testPlanId));

      await db.insert(plans).values({
        id: testPlanId,
        applicationCode: 'hrms',
        code: 'price_check_plan',
        name: 'Price Check Plan',
        tier: 'starter',
      });

      await db.insert(planPrices).values({
        id: 'pr_test_usd_01',
        planId: testPlanId,
        currency: 'USD',
        billingInterval: 'monthly',
        amountMinorUnits: 4999, // $49.99 exact
        status: 'active',
      });

      const [stored] = await db.select().from(planPrices).where(eq(planPrices.id, 'pr_test_usd_01'));
      expect(stored).toBeDefined();
      expect(stored?.amountMinorUnits).toBe(4999);
      expect(stored?.currency).toBe('USD');

      await db.delete(planPrices).where(eq(planPrices.id, 'pr_test_usd_01'));
      await db.delete(plans).where(eq(plans.id, testPlanId));
    });

    it('persists plan entitlements with structured limit rules', async () => {
      const db = getDb();
      const testPlanId = 'plan_test_ent_check';
      await db.delete(planEntitlements).where(eq(planEntitlements.planId, testPlanId));
      await db.delete(plans).where(eq(plans.id, testPlanId));

      await db.insert(plans).values({
        id: testPlanId,
        applicationCode: 'hrms',
        code: 'ent_check_plan',
        name: 'Entitlement Check Plan',
        tier: 'growth',
      });

      await db.insert(planEntitlements).values({
        id: 'ent_test_01',
        planId: testPlanId,
        applicationCode: 'hrms',
        moduleCode: 'attendance',
        isEnabled: true,
        limits: { geoFencing: true, maxLocations: 5 },
      });

      const [stored] = await db.select().from(planEntitlements).where(eq(planEntitlements.id, 'ent_test_01'));
      expect(stored?.isEnabled).toBe(true);
      expect(stored?.limits).toEqual({ geoFencing: true, maxLocations: 5 });

      // Duplicate (planId, moduleCode) must fail
      await expect(
        db.insert(planEntitlements).values({
          id: 'ent_test_02_dup',
          planId: testPlanId,
          applicationCode: 'hrms',
          moduleCode: 'attendance',
          isEnabled: false,
        }),
      ).rejects.toThrow();

      await db.delete(planEntitlements).where(eq(planEntitlements.planId, testPlanId));
      await db.delete(plans).where(eq(plans.id, testPlanId));
    });
  });

  describe('2. Primary Administrator Invariant (MySQL Virtual Column + Unique Index)', () => {
    it('allows multiple non-primary tenant admins in the same tenant', async () => {
      const db = getDb();
      await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));

      // Admin A (non-primary)
      await db.insert(tenantAdmins).values({
        id: 'ta_test_np_1',
        tenantId: testTenantId,
        userId: testUserAId,
        isPrimary: false,
        status: 'active',
      });

      // Admin B (non-primary) - must succeed without conflict!
      await db.insert(tenantAdmins).values({
        id: 'ta_test_np_2',
        tenantId: testTenantId,
        userId: testUserBId,
        isPrimary: false,
        status: 'active',
      });

      const admins = await db.select().from(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));
      expect(admins).toHaveLength(2);
      expect(admins.every((a) => a.isPrimary === false)).toBe(true);
    });

    it('allows exactly ONE active Primary Admin and rejects a second simultaneous Primary Admin', async () => {
      const db = getDb();
      await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));

      // Admin A is primary
      await db.insert(tenantAdmins).values({
        id: 'ta_test_prim_1',
        tenantId: testTenantId,
        userId: testUserAId,
        isPrimary: true,
        status: 'active',
      });

      // Admin B as non-primary succeeds
      await db.insert(tenantAdmins).values({
        id: 'ta_test_prim_2',
        tenantId: testTenantId,
        userId: testUserBId,
        isPrimary: false,
        status: 'active',
      });

      // Admin C attempting to be second active Primary Admin must be REJECTED by MySQL index
      await expect(
        db.insert(tenantAdmins).values({
          id: 'ta_test_prim_3',
          tenantId: testTenantId,
          userId: testUserCId,
          isPrimary: true,
          status: 'active',
        }),
      ).rejects.toThrow();

      // Updating existing non-primary Admin B to primary without demoting Admin A must also be REJECTED
      await expect(
        db.update(tenantAdmins).set({ isPrimary: true }).where(eq(tenantAdmins.id, 'ta_test_prim_2')),
      ).rejects.toThrow();
    });

    it('supports atomic reassignment of Primary Administrator', async () => {
      const db = getDb();
      // Demote Admin A, then promote Admin B
      await db.update(tenantAdmins).set({ isPrimary: false }).where(eq(tenantAdmins.id, 'ta_test_prim_1'));
      await db.update(tenantAdmins).set({ isPrimary: true }).where(eq(tenantAdmins.id, 'ta_test_prim_2'));

      const [adminB] = await db.select().from(tenantAdmins).where(eq(tenantAdmins.id, 'ta_test_prim_2'));
      const [adminA] = await db.select().from(tenantAdmins).where(eq(tenantAdmins.id, 'ta_test_prim_1'));

      expect(adminB?.isPrimary).toBe(true);
      expect(adminA?.isPrimary).toBe(false);
    });

    it('guarantees engine-level mutual exclusion during concurrent primary admin assignment attempts', async () => {
      const db = getDb();
      await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));

      // Attempt to concurrently promote User A and User B as primary admin in parallel
      const attempts = await Promise.allSettled([
        db.insert(tenantAdmins).values({
          id: 'ta_race_1',
          tenantId: testTenantId,
          userId: testUserAId,
          isPrimary: true,
          status: 'active',
        }),
        db.insert(tenantAdmins).values({
          id: 'ta_race_2',
          tenantId: testTenantId,
          userId: testUserBId,
          isPrimary: true,
          status: 'active',
        }),
      ]);

      // Exactly ONE must succeed and the other must be rejected
      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const activePrimaries = await db
        .select()
        .from(tenantAdmins)
        .where(and(eq(tenantAdmins.tenantId, testTenantId), eq(tenantAdmins.isPrimary, true)));
      expect(activePrimaries).toHaveLength(1);
    });
  });

  describe('3. Tenant Subscription Lifecycle & Historical Invariants', () => {
    it('prevents conflicting simultaneously active subscriptions while preserving cancellation history', async () => {
      const db = getDb();
      const planId = 'plan_hrms_starter';

      await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, testTenantId));

      // 1. Create first active subscription
      await db.insert(tenantSubscriptions).values({
        id: 'sub_test_01',
        tenantId: testTenantId,
        applicationCode: 'hrms',
        planId,
        status: 'active',
        accessMode: 'paid',
        licensedSeats: 15,
      });

      // 2. Inserting a second simultaneously active/trial subscription for same app must be REJECTED
      await expect(
        db.insert(tenantSubscriptions).values({
          id: 'sub_test_02_conflict',
          tenantId: testTenantId,
          applicationCode: 'hrms',
          planId: 'plan_hrms_growth',
          status: 'active',
          accessMode: 'paid',
          licensedSeats: 50,
        }),
      ).rejects.toThrow();

      // 3. Simultaneously active subscription for a DIFFERENT application ('crm') is permitted
      await db.insert(tenantSubscriptions).values({
        id: 'sub_test_crm_01',
        tenantId: testTenantId,
        applicationCode: 'crm',
        planId: 'plan_crm_starter',
        status: 'active',
        accessMode: 'paid',
        licensedSeats: 10,
      });

      // 4. Lifecycle transition: Cancel the first HRMS subscription
      await db
        .update(tenantSubscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Upgraded to enterprise plan',
        })
        .where(eq(tenantSubscriptions.id, 'sub_test_01'));

      // 5. Now that sub_test_01 is cancelled (not active/trial), a new active HRMS subscription CAN be created!
      await db.insert(tenantSubscriptions).values({
        id: 'sub_test_03_upgrade',
        tenantId: testTenantId,
        applicationCode: 'hrms',
        planId: 'plan_hrms_growth',
        status: 'active',
        accessMode: 'paid',
        licensedSeats: 50,
      });

      // 6. Verify historical records: Both old cancelled sub and new active sub exist in database!
      const hrmsSubs = await db
        .select()
        .from(tenantSubscriptions)
        .where(
          and(
            eq(tenantSubscriptions.tenantId, testTenantId),
            eq(tenantSubscriptions.applicationCode, 'hrms'),
          ),
        );

      expect(hrmsSubs).toHaveLength(2);
      expect(hrmsSubs.find((s) => s.status === 'cancelled')?.planId).toBe('plan_hrms_starter');
      expect(hrmsSubs.find((s) => s.status === 'active')?.planId).toBe('plan_hrms_growth');
    });

    it('persists scheduled activation and trial metadata correctly', async () => {
      const db = getDb();
      const scheduledDate = new Date(Date.now() + 7 * 86400000);

      // Create PM subscription with scheduled activation
      await db.insert(tenantSubscriptions).values({
        id: 'sub_test_pm_sched',
        tenantId: testTenantId,
        applicationCode: 'project_management',
        planId: 'plan_pm_starter',
        status: 'pending_activation',
        scheduledActivationAt: scheduledDate,
        accessMode: 'paid',
        licensedSeats: 25,
      });

      const [stored] = await db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.id, 'sub_test_pm_sched'));

      expect(stored?.status).toBe('pending_activation');
      expect(stored?.licensedSeats).toBe(25);
      expect(stored?.scheduledActivationAt).toBeDefined();
    });

    it('allows a scheduled subscription to coexist with an active subscription for the same application', async () => {
      const db = getDb();
      const scheduledDate = new Date(Date.now() + 30 * 86400000);

      // Inserting a future scheduled subscription for 'hrms' must SUCCEED without conflicting with the active one
      await db.insert(tenantSubscriptions).values({
        id: 'sub_test_hrms_scheduled_upgrade',
        tenantId: testTenantId,
        applicationCode: 'hrms',
        planId: 'plan_hrms_enterprise',
        status: 'pending_activation',
        scheduledActivationAt: scheduledDate,
        accessMode: 'paid',
        licensedSeats: 100,
      });

      const hrmsSubs = await db
        .select()
        .from(tenantSubscriptions)
        .where(
          and(
            eq(tenantSubscriptions.tenantId, testTenantId),
            eq(tenantSubscriptions.applicationCode, 'hrms'),
          ),
        );

      const activeSub = hrmsSubs.find((s) => s.status === 'active');
      const scheduledSub = hrmsSubs.find((s) => s.status === 'pending_activation');

      expect(activeSub).toBeDefined();
      expect(scheduledSub).toBeDefined();
      expect(activeSub?.planId).toBe('plan_hrms_growth');
      expect(scheduledSub?.planId).toBe('plan_hrms_enterprise');
    });
  });

  describe('4. Tenant Entitlement Overrides & Auditability', () => {
    it('persists auditable, time-bounded overrides and revocation metadata', async () => {
      const db = getDb();
      await db.delete(tenantEntitlementOverrides).where(eq(tenantEntitlementOverrides.tenantId, testTenantId));

      const overrideId = 'ovr_test_01';
      const validUntil = new Date(Date.now() + 30 * 86400000);

      await db.insert(tenantEntitlementOverrides).values({
        id: overrideId,
        tenantId: testTenantId,
        applicationCode: 'hrms',
        moduleCode: 'payroll',
        overrideType: 'enable',
        reason: 'Beta customer early feature pilot authorization',
        authorizedByUserId: testUserAId,
        validUntil,
      });

      const [stored] = await db
        .select()
        .from(tenantEntitlementOverrides)
        .where(eq(tenantEntitlementOverrides.id, overrideId));

      expect(stored?.overrideType).toBe('enable');
      expect(stored?.authorizedByUserId).toBe(testUserAId);
      expect(stored?.validUntil).toBeDefined();

      // Revoke the override
      await db
        .update(tenantEntitlementOverrides)
        .set({
          revokedAt: new Date(),
          revokedByUserId: testUserAId,
          revocationReason: 'Trial window expired',
        })
        .where(eq(tenantEntitlementOverrides.id, overrideId));

      const [revoked] = await db
        .select()
        .from(tenantEntitlementOverrides)
        .where(eq(tenantEntitlementOverrides.id, overrideId));

      expect(revoked?.revokedAt).toBeDefined();
      expect(revoked?.revokedByUserId).toBe(testUserAId);
      expect(revoked?.revocationReason).toBe('Trial window expired');
    });
  });

  describe('5. Provisioning Jobs & Transactional Outbox Invariants', () => {
    it('enforces idempotency key uniqueness for provisioning jobs', async () => {
      const db = getDb();
      const idempotencyKey = 'job_idem_p1_unique_key';
      await db.delete(provisioningJobs).where(eq(provisioningJobs.idempotencyKey, idempotencyKey));

      await db.insert(provisioningJobs).values({
        id: 'job_test_01',
        tenantId: testTenantId,
        jobType: 'tenant_creation',
        status: 'pending',
        idempotencyKey,
        stepState: { step: 'company_provisioned', progress: 50 },
      });

      // Second insert with duplicate idempotency key must FAIL
      await expect(
        db.insert(provisioningJobs).values({
          id: 'job_test_02_dup',
          tenantId: testTenantId,
          jobType: 'tenant_creation',
          status: 'pending',
          idempotencyKey,
          stepState: { step: 'company_provisioned', progress: 50 },
        }),
      ).rejects.toThrow();

      await db.delete(provisioningJobs).where(eq(provisioningJobs.idempotencyKey, idempotencyKey));
    });

    it('enforces idempotency key uniqueness on transactional outbox events', async () => {
      const db = getDb();
      const idempotencyKey = 'outbox_idem_p1_event_01';
      await db.delete(transactionalOutbox).where(eq(transactionalOutbox.idempotencyKey, idempotencyKey));

      await db.insert(transactionalOutbox).values({
        id: 'evt_test_01',
        aggregateType: 'tenant',
        aggregateId: testTenantId,
        eventType: 'tenant.provisioned',
        payload: { tenantId: testTenantId, status: 'active' },
        idempotencyKey,
        status: 'pending',
      });

      // Duplicate event insertion must FAIL
      await expect(
        db.insert(transactionalOutbox).values({
          id: 'evt_test_02_dup',
          aggregateType: 'tenant',
          aggregateId: testTenantId,
          eventType: 'tenant.provisioned',
          payload: { tenantId: testTenantId, status: 'active' },
          idempotencyKey,
          status: 'pending',
        }),
      ).rejects.toThrow();

      await db.delete(transactionalOutbox).where(eq(transactionalOutbox.idempotencyKey, idempotencyKey));
    });

    it('persists provisioning job retry attempts and step state transitions', async () => {
      const db = getDb();
      const jobId = 'job_test_retry_flow';
      await db.delete(provisioningJobs).where(eq(provisioningJobs.id, jobId));

      await db.insert(provisioningJobs).values({
        id: jobId,
        tenantId: testTenantId,
        jobType: 'subscription_activation',
        status: 'pending',
        attemptCount: 1,
        maxAttempts: 3,
        retryEligible: true,
        stepState: { step: 'license_allocation', progress: 20 },
      });

      // Simulate a transient error and retry bump
      const nextAttempt = new Date(Date.now() + 60000);
      await db
        .update(provisioningJobs)
        .set({
          attemptCount: 2,
          lastError: 'Downstream timeout during license allocation',
          errorCode: 'DOWNSTREAM_TIMEOUT',
          nextAttemptAt: nextAttempt,
        })
        .where(eq(provisioningJobs.id, jobId));

      let [job] = await db.select().from(provisioningJobs).where(eq(provisioningJobs.id, jobId));
      expect(job?.attemptCount).toBe(2);
      expect(job?.errorCode).toBe('DOWNSTREAM_TIMEOUT');
      expect(job?.nextAttemptAt).toBeDefined();

      // Complete the job
      await db
        .update(provisioningJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          stepState: { step: 'license_allocation', progress: 100, completed: true },
        })
        .where(eq(provisioningJobs.id, jobId));

      [job] = await db.select().from(provisioningJobs).where(eq(provisioningJobs.id, jobId));
      expect(job?.status).toBe('completed');
      expect(job?.completedAt).toBeDefined();

      await db.delete(provisioningJobs).where(eq(provisioningJobs.id, jobId));
    });

    it('transitions outbox event from pending to published with published timestamp', async () => {
      const db = getDb();
      const eventId = 'evt_test_publish_flow';
      await db.delete(transactionalOutbox).where(eq(transactionalOutbox.id, eventId));

      await db.insert(transactionalOutbox).values({
        id: eventId,
        aggregateType: 'tenant',
        aggregateId: testTenantId,
        eventType: 'tenant.activated',
        payload: { tenantId: testTenantId },
        status: 'pending',
      });

      const publishedAt = new Date();
      await db
        .update(transactionalOutbox)
        .set({
          status: 'published',
          publishedAt,
          attemptCount: 1,
        })
        .where(eq(transactionalOutbox.id, eventId));

      const [evt] = await db.select().from(transactionalOutbox).where(eq(transactionalOutbox.id, eventId));
      expect(evt?.status).toBe('published');
      expect(evt?.publishedAt).toBeDefined();
      expect(evt?.attemptCount).toBe(1);

      await db.delete(transactionalOutbox).where(eq(transactionalOutbox.id, eventId));
    });
  });

  describe('6. Legacy Compatibility & Identity Protection', () => {
    it('safely reuses existing global user identity across tenants without credential mutation', async () => {
      const db = getDb();
      const secondTenantId = 'tent_tm_p1_second';
      await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, secondTenantId));
      await db.delete(tenants).where(eq(tenants.id, secondTenantId));

      await db.insert(tenants).values({
        id: secondTenantId,
        name: 'Second Isolated Tenant',
        status: 'active',
      });

      // Capture Alice's credentials in primary tenant
      const [aliceBefore] = await db.select().from(users).where(eq(users.id, testUserAId));
      const originalHash = aliceBefore?.passwordHash;
      const originalSalt = aliceBefore?.salt;

      // Assign Alice as non-primary admin in the second tenant
      await db.insert(tenantAdmins).values({
        id: 'ta_sec_alice',
        tenantId: secondTenantId,
        userId: testUserAId,
        isPrimary: false,
        status: 'active',
      });

      // Assert Alice's user credentials remain completely intact and unaltered
      const [aliceAfter] = await db.select().from(users).where(eq(users.id, testUserAId));
      expect(aliceAfter?.passwordHash).toBe(originalHash);
      expect(aliceAfter?.salt).toBe(originalSalt);

      // Clean up
      await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, secondTenantId));
      await db.delete(tenants).where(eq(tenants.id, secondTenantId));
    });

    it('preserves existing tenant_modules entitlement ceiling alongside commercial subscriptions', async () => {
      const db = getDb();
      const { tenantModules } = await import('../../db/schema.js');
      const modId = 'tm_compat_check';
      await db.delete(tenantModules).where(eq(tenantModules.id, modId));

      // Existing tenant_modules record
      await db.insert(tenantModules).values({
        id: modId,
        tenantId: testTenantId,
        moduleCode: 'hrms',
        status: 'enabled',
      });

      const [mod] = await db.select().from(tenantModules).where(eq(tenantModules.id, modId));
      expect(mod?.status).toBe('enabled');
      expect(mod?.moduleCode).toBe('hrms');

      await db.delete(tenantModules).where(eq(tenantModules.id, modId));
    });
  });

  describe('7. Backfill Service Classification & Safety', () => {
    it('executes dry-run without corrupting data and returns complete classification summary', async () => {
      const report = await tenantManagementBackfillService.runBackfill({ dryRun: true });

      expect(report.isDryRun).toBe(true);
      expect(report.totalTenantsProcessed).toBeGreaterThan(0);
      expect(report.preservedDataSummary.totalCompanies).toBeGreaterThan(0);
      expect(report.preservedDataSummary.totalTenantModuleEntitlements).toBeGreaterThan(0);
      expect(Array.isArray(report.safeAutomatic)).toBe(true);
      expect(Array.isArray(report.requiresBusinessConfirmation)).toBe(true);
      expect(Array.isArray(report.requiresManualReconciliation)).toBe(true);
    });
  });
});
