import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, and, inArray } from 'drizzle-orm';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  tenantAdmins,
  plans,
  planPrices,
  planEntitlements,
  tenantSubscriptions,
  tenantEntitlementOverrides,
  tenantLifecycleEvents,
  provisioningJobs,
  transactionalOutbox,
  invitations,
  auditLogs,
  roleAssignments,
} from '../../db/schema.js';
import { signInForTest } from './support/testSession.js';
import { planService } from '../plans/service/plan.service.js';
import { subscriptionService } from '../subscriptions/service/subscription.service.js';
import { effectiveEntitlementService } from '../entitlements/service/effectiveEntitlement.service.js';
import { primaryAdminService } from '../tenants/service/primaryAdmin.service.js';
import { tenantService } from '../tenants/service/tenant.service.js';
import { provisioningJobService } from '../provisioning/service/provisioningJob.service.js';
import { transactionalOutboxService } from '../outbox/service/transactionalOutbox.service.js';
import { hashPassword, generateSurrogateId } from '../auth/security.js';

describe('Tenant Management Phase 02 Backend Business Logic & APIs', () => {
  const app = createApp();

  const testTenantId = 'tent_p2_test';
  const testCompanyId = 'comp_p2_test';
  const testSuperAdminId = 'usr_p2_superadmin';
  const testSuperAdminEmail = 'superadmin_p2@test.bezent.com';
  const testNormalUserId = 'usr_p2_normal';
  const testNormalUserEmail = 'normal_p2@test.bezent.com';

  const testUserAId = 'usr_p2_user_a';
  const testUserBId = 'usr_p2_user_b';

  let superAdminToken: string;
  let normalUserToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    const { hash, salt } = hashPassword('TestP2!Secret123');

    // Clean up any test entities from previous runs
    await db.delete(transactionalOutbox).where(eq(transactionalOutbox.aggregateId, testTenantId));
    await db.delete(provisioningJobs).where(eq(provisioningJobs.tenantId, testTenantId));
    await db.delete(tenantLifecycleEvents).where(eq(tenantLifecycleEvents.tenantId, testTenantId));
    await db.delete(tenantEntitlementOverrides).where(eq(tenantEntitlementOverrides.tenantId, testTenantId));
    await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, testTenantId));
    await db.delete(invitations).where(eq(invitations.tenantId, testTenantId));
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));
    await db.delete(roleAssignments).where(eq(roleAssignments.tenantId, testTenantId));
    await db.delete(memberships).where(eq(memberships.tenantId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testCompanyId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await db.delete(auditLogs).where(eq(auditLogs.tenantId, testTenantId));

    const testPlanIds = ['plan_p2_custom_hrms', 'plan_p2_zero_template', 'plan_p2_crm_starter'];
    await db.delete(planPrices).where(inArray(planPrices.planId, testPlanIds));
    await db.delete(planEntitlements).where(inArray(planEntitlements.planId, testPlanIds));
    await db.delete(plans).where(inArray(plans.id, testPlanIds));

    await db.delete(users).where(eq(users.id, testSuperAdminId));
    await db.delete(users).where(eq(users.id, testNormalUserId));
    await db.delete(users).where(eq(users.id, testUserAId));
    await db.delete(users).where(eq(users.id, testUserBId));

    // Setup Super Admin user
    await db.insert(users).values({
      id: testSuperAdminId,
      email: testSuperAdminEmail,
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: hash,
      salt,
      isSuperAdmin: true,
      status: 'active',
    });

    // Setup Normal user
    await db.insert(users).values({
      id: testNormalUserId,
      email: testNormalUserEmail,
      firstName: 'Normal',
      lastName: 'User',
      passwordHash: hash,
      salt,
      isSuperAdmin: false,
      status: 'active',
    });

    // Setup User A and User B
    await db.insert(users).values({
      id: testUserAId,
      email: 'usera_p2@test.bezent.com',
      firstName: 'Alice',
      lastName: 'Tester',
      passwordHash: hash,
      salt,
      status: 'active',
    });

    await db.insert(users).values({
      id: testUserBId,
      email: 'userb_p2@test.bezent.com',
      firstName: 'Bob',
      lastName: 'Tester',
      passwordHash: hash,
      salt,
      status: 'active',
    });

    // Setup Base Tenant & Company
    await db.insert(tenants).values({
      id: testTenantId,
      name: 'Phase 02 Test Tenant',
      status: 'active',
    });

    await db.insert(companies).values({
      id: testCompanyId,
      tenantId: testTenantId,
      name: 'Phase 02 Test Company',
      code: 'P2-CO',
      status: 'active',
    });

    // Assign memberships for seat count testing
    await db.insert(memberships).values({
      id: 'mem_p2_usera',
      tenantId: testTenantId,
      companyId: testCompanyId,
      userId: testUserAId,
      role: 'employee',
      status: 'active',
    });

    const superAdminLogin = await signInForTest(testSuperAdminEmail);
    superAdminToken = superAdminLogin.token;

    const normalUserLogin = await signInForTest(testNormalUserEmail);
    normalUserToken = normalUserLogin.token;
  });

  afterAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    await db.delete(transactionalOutbox).where(eq(transactionalOutbox.aggregateId, testTenantId));
    await db.delete(provisioningJobs).where(eq(provisioningJobs.tenantId, testTenantId));
    await db.delete(tenantLifecycleEvents).where(eq(tenantLifecycleEvents.tenantId, testTenantId));
    await db.delete(tenantEntitlementOverrides).where(eq(tenantEntitlementOverrides.tenantId, testTenantId));
    await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, testTenantId));
    await db.delete(invitations).where(eq(invitations.tenantId, testTenantId));
    await db.delete(tenantAdmins).where(eq(tenantAdmins.tenantId, testTenantId));
    await db.delete(roleAssignments).where(eq(roleAssignments.tenantId, testTenantId));
    await db.delete(memberships).where(eq(memberships.tenantId, testTenantId));
    await db.delete(companies).where(eq(companies.id, testCompanyId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
    await db.delete(auditLogs).where(eq(auditLogs.tenantId, testTenantId));
    const testPlanIds = ['plan_p2_custom_hrms', 'plan_p2_zero_template', 'plan_p2_crm_starter'];
    await db.delete(planPrices).where(inArray(planPrices.planId, testPlanIds));
    await db.delete(planEntitlements).where(inArray(planEntitlements.planId, testPlanIds));
    await db.delete(plans).where(inArray(plans.id, testPlanIds));
    await db.delete(users).where(eq(users.id, testSuperAdminId));
    await db.delete(users).where(eq(users.id, testNormalUserId));
    await db.delete(users).where(eq(users.id, testUserAId));
    await db.delete(users).where(eq(users.id, testUserBId));
  });

  // =========================================================================
  // 1. Plan Catalog & Pricing Business Logic
  // =========================================================================
  describe('1. Plan Catalog & Commercial Pricing', () => {
    const testPlanId = 'plan_p2_custom_hrms';

    it('creates a custom plan with tier, trial duration, and seat constraints', async () => {
      const created = await planService.createPlan({
        id: testPlanId,
        applicationCode: 'hrms',
        code: 'p2-custom-hrms',
        name: 'Phase 02 Custom HRMS',
        tier: 'growth',
        minSeats: 2,
        maxSeats: 50,
        defaultSeats: 10,
        trialEligible: true,
        trialDurationDays: 14,
        entitlements: [
          { moduleCode: 'core_hr', isEnabled: true },
          { moduleCode: 'payroll', isEnabled: true },
        ],
      });

      expect(created.id).toBe(testPlanId);
      expect(created.applicationCode).toBe('hrms');
      expect(created.tier).toBe('growth');
      expect(created.minSeats).toBe(2);
      expect(created.maxSeats).toBe(50);
      expect(created.entitlements.length).toBe(2);
    });

    it('adds an approved commercial price to the plan', async () => {
      const price = await planService.addPrice(testPlanId, {
        currency: 'USD',
        billingInterval: 'monthly',
        amountMinorUnits: 2900, // $29.00
      });

      expect(price.planId).toBe(testPlanId);
      expect(price.currency).toBe('USD');
      expect(price.amountMinorUnits).toBe(2900);
      expect(price.status).toBe('active');
    });

    it('rejects adding negative prices', async () => {
      await expect(
        planService.addPrice(testPlanId, {
          currency: 'USD',
          billingInterval: 'monthly',
          amountMinorUnits: -500,
        }),
      ).rejects.toThrow();
    });

    it('rejects unapproved template price (amount = 0) for paid activation', async () => {
      const zeroPlanId = 'plan_p2_zero_template';
      await planService.createPlan({
        id: zeroPlanId,
        applicationCode: 'hrms',
        code: 'p2-zero-temp',
        name: 'Zero Template Plan',
        tier: 'starter',
        initialPrices: [
          { currency: 'USD', billingInterval: 'monthly', amountMinorUnits: 0 },
        ],
      });

      const validation = await planService.validatePriceForCommercialActivation(
        zeroPlanId,
        'USD',
        'monthly',
      );
      expect(validation.approved).toBe(false);
      expect(validation.reason).toContain('Unapproved template pricing');
    });
  });

  // =========================================================================
  // 2. Tenant Subscriptions Engine
  // =========================================================================
  describe('2. Tenant Subscriptions Engine', () => {
    it('creates and starts a valid trial subscription', async () => {
      const sub = await subscriptionService.createSubscription({
        tenantId: testTenantId,
        applicationCode: 'hrms',
        planId: 'plan_p2_custom_hrms',
        accessMode: 'trial',
        licensedSeats: 5,
      });

      expect(sub.tenantId).toBe(testTenantId);
      expect(sub.applicationCode).toBe('hrms');
      expect(sub.status).toBe('trial');
      expect(sub.accessMode).toBe('trial');
      expect(sub.licensedSeats).toBe(5);
      expect(sub.trialStartsAt).toBeDefined();
      expect(sub.trialEndsAt).toBeDefined();
    });

    it('prevents overlapping active or trialing subscription for same application', async () => {
      await expect(
        subscriptionService.createSubscription({
          tenantId: testTenantId,
          applicationCode: 'hrms',
          planId: 'plan_p2_custom_hrms',
          accessMode: 'trial',
          licensedSeats: 5,
        }),
      ).rejects.toThrow(/already has an active subscription/);
    });

    it('allows independent subscription to CRM for same tenant without conflict', async () => {
      // Create CRM plan first
      await planService.createPlan({
        id: 'plan_p2_crm_starter',
        applicationCode: 'crm',
        code: 'p2-crm-starter',
        name: 'CRM Starter',
        tier: 'starter',
        trialEligible: true,
      });

      const crmSub = await subscriptionService.createSubscription({
        tenantId: testTenantId,
        applicationCode: 'crm',
        planId: 'plan_p2_crm_starter',
        accessMode: 'trial',
        licensedSeats: 5,
      });

      expect(crmSub.applicationCode).toBe('crm');
      expect(crmSub.status).toBe('trial');
    });

    it('calculates seats from unique users and prevents reducing below active usage', async () => {
      // Current active usage: testUserAId has active membership in tenant = 1 seat
      const activeSeats = await subscriptionService.getSubscriptionById(
        (await subscriptionService.listSubscriptions({ tenantId: testTenantId, applicationCode: 'hrms' }))[0]!.id,
      );
      expect(activeSeats.currentSeatsUsed).toBeGreaterThanOrEqual(1);

      // Attempt to reduce licensed seats below minSeats (2)
      await expect(
        subscriptionService.updateSubscription(activeSeats.id, {
          licensedSeats: 0,
        }),
      ).rejects.toThrow();
    });

    it('renews an active/trial subscription', async () => {
      const sub = (await subscriptionService.listSubscriptions({ tenantId: testTenantId, applicationCode: 'hrms' }))[0]!;
      const renewed = await subscriptionService.renewSubscription(sub.id, {
        periodDays: 30,
      });

      expect(renewed.status).toBe('active');
      expect(renewed.accessMode).toBe('paid');
      expect(renewed.currentPeriodEndsAt).toBeDefined();
    });

    it('schedules a future subscription with pending_activation', async () => {
      const futureDate = new Date(Date.now() + 60 * 86400000); // 60 days in future
      const scheduledSub = await subscriptionService.createSubscription({
        tenantId: testTenantId,
        applicationCode: 'project_management',
        planId: (await planService.listPlans({ applicationCode: 'project_management' }))[0]?.id || 'plan_pm_starter_v1',
        accessMode: 'paid',
        scheduledActivationAt: futureDate,
        commercialAgreementNotes: 'Pre-approved commercial annual contract',
      });

      expect(scheduledSub.status).toBe('pending_activation');
      expect(scheduledSub.scheduledActivationAt).toBeDefined();
    });

    it('cancels a subscription non-destructively preserving tenant data', async () => {
      const subs = await subscriptionService.listSubscriptions({ tenantId: testTenantId, applicationCode: 'crm' });
      const sub = subs[0] || (await subscriptionService.listSubscriptions({ tenantId: testTenantId }))[0]!;
      const cancelled = await subscriptionService.cancelSubscription(sub.id, {
        reason: 'Customer requested cancellation during trial',
      });

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancelledAt).toBeDefined();
      expect(cancelled.cancellationReason).toBe('Customer requested cancellation during trial');

      // Verify tenant and company records still exist
      const tenantCheck = await tenantService.getTenantById(testTenantId);
      expect(tenantCheck).toBeDefined();
      expect(tenantCheck.status).toBe('active');
    });
  });

  // =========================================================================
  // 3. Effective Entitlements & Overrides & Reconciliation
  // =========================================================================
  describe('3. Effective Entitlements Engine', () => {
    it('resolves effective entitlements from active subscription', async () => {
      const result = await effectiveEntitlementService.resolveEffectiveEntitlements(
        testTenantId,
        'hrms',
      );

      expect(result.isEntitled).toBe(true);
      expect(result.source).toBe('commercial_subscription');
      expect(result.modules.length).toBeGreaterThanOrEqual(2);
      expect(result.modules.some((m) => m.moduleCode === 'core_hr')).toBe(true);
    });

    it('creates, applies, and revokes Super Admin entitlement overrides', async () => {
      // 1. Create override enabling recruitment module
      const override = await effectiveEntitlementService.createOverride(
        {
          tenantId: testTenantId,
          applicationCode: 'hrms',
          moduleCode: 'recruitment',
          overrideType: 'enable',
          reason: 'Special executive preview granted by Super Admin',
        },
        { id: testSuperAdminId, email: testSuperAdminEmail },
      );

      expect(override.moduleCode).toBe('recruitment');
      expect(override.overrideType).toBe('enable');

      // 2. Verify effective entitlement includes recruitment
      const effectiveWithOverride = await effectiveEntitlementService.resolveEffectiveEntitlements(
        testTenantId,
        'hrms',
      );
      const recruitmentMod = effectiveWithOverride.modules.find((m) => m.moduleCode === 'recruitment');
      expect(recruitmentMod).toBeDefined();
      expect(recruitmentMod?.isEnabled).toBe(true);
      expect(recruitmentMod?.source).toBe('override');

      // 3. Revoke override
      const revoked = await effectiveEntitlementService.revokeOverride(
        override.id,
        { reason: 'Executive preview ended' },
        { id: testSuperAdminId, email: testSuperAdminEmail },
      );
      expect(revoked.revokedAt).toBeDefined();

      // 4. Verify recruitment is no longer enabled
      const effectiveAfterRevocation = await effectiveEntitlementService.resolveEffectiveEntitlements(
        testTenantId,
        'hrms',
      );
      const recruitmentAfter = effectiveAfterRevocation.modules.find((m) => m.moduleCode === 'recruitment');
      expect(recruitmentAfter).toBeUndefined();
    });

    it('generates a reconciliation report between commercial plan and legacy modules', async () => {
      const report = await effectiveEntitlementService.reconcile(testTenantId, 'hrms');
      expect(report.tenantId).toBe(testTenantId);
      expect(report.hasCommercialSubscription).toBe(true);
      expect(report.commercialModules).toContain('core_hr');
      expect(Array.isArray(report.mismatches)).toBe(true);
    });
  });

  // =========================================================================
  // 4. Primary Administrator & Invitation Workflows
  // =========================================================================
  describe('4. Primary Administrator Workflows', () => {
    let invitationToken: string;
    let invitationId: string;

    it('invites a primary administrator for the tenant', async () => {
      const inv = await primaryAdminService.invitePrimaryAdmin(
        testTenantId,
        'newprimary@test.bezent.com',
        'Chief People Officer',
      );

      expect(inv.tenantId).toBe(testTenantId);
      expect(inv.email).toBe('newprimary@test.bezent.com');
      expect(inv.isPrimaryAdmin).toBe(true);
      expect(inv.status).toBe('pending');
      invitationId = inv.id;

      // Check via getPrimaryAdmin
      const status = await primaryAdminService.getPrimaryAdmin(testTenantId);
      expect(status.primaryAdmin).toBeNull();
      expect(status.pendingInvitation).toBeDefined();
      expect(status.pendingInvitation?.id).toBe(inv.id);
    });

    it('resends primary administrator invitation', async () => {
      const resent = await primaryAdminService.resendInvitation(testTenantId, invitationId);
      expect(resent.id).toBe(invitationId);
      expect(resent.status).toBe('pending');
    });

    it('accepts invitation and establishes atomic primary administrator', async () => {
      const db = getDb();
      const [invRecord] = await db.select().from(invitations).where(eq(invitations.id, invitationId));
      invitationToken = invRecord!.token;

      const result = await primaryAdminService.acceptInvitation(invitationToken);
      expect(result.tenantId).toBe(testTenantId);
      expect(result.userId).toBeDefined();

      const adminStatus = await primaryAdminService.getPrimaryAdmin(testTenantId);
      expect(adminStatus.primaryAdmin).toBeDefined();
      expect(adminStatus.primaryAdmin?.isPrimary).toBe(true);
      expect(adminStatus.primaryAdmin?.email).toBe('newprimary@test.bezent.com');
    });

    it('atomically reassigns primary administrator to another user', async () => {
      // Reassign to testUserBId
      await primaryAdminService.reassignPrimaryAdmin(testTenantId, testUserBId);

      const updatedStatus = await primaryAdminService.getPrimaryAdmin(testTenantId);
      expect(updatedStatus.primaryAdmin?.userId).toBe(testUserBId);
      expect(updatedStatus.primaryAdmin?.isPrimary).toBe(true);

      // Verify previous admin was demoted
      const db = getDb();
      const allAdmins = await db
        .select()
        .from(tenantAdmins)
        .where(eq(tenantAdmins.tenantId, testTenantId));
      const primaryCount = allAdmins.filter((a) => a.isPrimary && a.status === 'active').length;
      expect(primaryCount).toBe(1);
    });

    it('enforces last-admin protection', async () => {
      const db = getDb();
      const [primaryAdminRow] = await db
        .select()
        .from(tenantAdmins)
        .where(and(eq(tenantAdmins.tenantId, testTenantId), eq(tenantAdmins.isPrimary, true)));

      // Cannot remove primary admin directly without reassignment
      await expect(
        primaryAdminService.removeTenantAdmin(testTenantId, primaryAdminRow!.id),
      ).rejects.toThrow(/Cannot remove Primary Admin directly/);
    });
  });

  // =========================================================================
  // 5. Tenant Lifecycle Management
  // =========================================================================
  describe('5. Tenant Lifecycle & History', () => {
    it('suspends tenant with mandatory reason and records lifecycle event', async () => {
      const suspended = await tenantService.suspendTenant(
        testTenantId,
        'Billing compliance hold pending verification',
      );

      expect(suspended.status).toBe('suspended');

      // Verify lifecycle event recorded
      const history = await tenantService.getLifecycleHistory(testTenantId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0]?.eventType).toBe('suspended');
      expect(history[0]?.reason).toContain('Billing compliance hold');

      // Verify effective entitlements block access when tenant is suspended
      const entitlements = await effectiveEntitlementService.resolveEffectiveEntitlements(
        testTenantId,
        'hrms',
      );
      expect(entitlements.isEntitled).toBe(false);
    });

    it('reactivates tenant with reason and restores eligibility', async () => {
      const reactivated = await tenantService.activateTenant(
        testTenantId,
        'Verification documentation approved',
      );

      expect(reactivated.status).toBe('active');

      const history = await tenantService.getLifecycleHistory(testTenantId);
      expect(history[0]?.eventType).toBe('reactivated');
      expect(history[0]?.reason).toContain('Verification documentation approved');
    });

    it('requires exact confirmation ID for protected termination', async () => {
      await expect(
        tenantService.terminateTenant(testTenantId, 'wrong_id', 'Valid reason for test'),
      ).rejects.toThrow(/Confirmation tenant ID must exactly match/);
    });

    it('terminates tenant non-destructively setting archived status', async () => {
      const terminated = await tenantService.terminateTenant(
        testTenantId,
        testTenantId,
        'Customer contract terminated per mutual agreement',
      );

      expect(terminated.status).toBe('archived');

      const history = await tenantService.getLifecycleHistory(testTenantId);
      expect(history[0]?.eventType).toBe('terminated');
      expect(history[0]?.newStatus).toBe('archived');

      // Non-destructive check: tenant row still exists
      const db = getDb();
      const [tRow] = await db.select().from(tenants).where(eq(tenants.id, testTenantId));
      expect(tRow).toBeDefined();
      expect(tRow?.status).toBe('archived');

      // Restore to active for remaining tests
      await tenantService.activateTenant(testTenantId, 'Restoring active for test suite');
    });
  });

  // =========================================================================
  // 6. Provisioning Jobs & Outbox Worker
  // =========================================================================
  describe('6. Provisioning Jobs & Outbox Engine', () => {
    const idempotencyKey = 'pjob_key_test_123';
    let testJobId: string;

    it('creates a provisioning job idempotently', async () => {
      const job1 = await provisioningJobService.createJob({
        tenantId: testTenantId,
        companyId: testCompanyId,
        jobType: 'tenant_creation',
        idempotencyKey,
        stepState: { step1: 'ready' },
      });

      testJobId = job1.id;
      expect(job1.idempotencyKey).toBe(idempotencyKey);
      expect(job1.status).toBe('pending');

      // Duplicate submission returns identical job without duplicate creation
      const job2 = await provisioningJobService.createJob({
        tenantId: testTenantId,
        companyId: testCompanyId,
        jobType: 'tenant_creation',
        idempotencyKey,
        stepState: { step1: 'ready' },
      });

      expect(job2.id).toBe(job1.id);
    });

    it('claims job with worker lease and records step progress', async () => {
      const claimed = await provisioningJobService.claimNextJob('worker_node_01');
      expect(claimed).toBeDefined();
      expect(claimed?.status).toBe('in_progress');
      expect(claimed?.workerId).toBe('worker_node_01');

      const updated = await provisioningJobService.updateStep(claimed!.id, 'company_provisioning', {
        companyId: testCompanyId,
        status: 'done',
      });
      expect(updated.stepState).toHaveProperty('company_provisioning');
    });

    it('handles job failure with retry backoff and authorized manual retry', async () => {
      const failed = await provisioningJobService.failJob(
        testJobId,
        'NETWORK_TIMEOUT',
        'External directory sync timed out',
        true,
      );

      expect(failed.errorCode).toBe('NETWORK_TIMEOUT');
      expect(failed.attemptCount).toBeGreaterThanOrEqual(2);

      // Manual retry
      const retried = await provisioningJobService.retryJob(testJobId);
      expect(retried.status).toBe('pending');
      expect(retried.retryEligible).toBe(true);
    });

    it('publishes and dispatches transactional outbox events', async () => {
      const outboxMsg = await transactionalOutboxService.publishEvent({
        aggregateType: 'tenant',
        aggregateId: testTenantId,
        eventType: 'tenant.provisioned',
        payload: { tenantId: testTenantId, timestamp: new Date().toISOString() },
        idempotencyKey: 'txo_test_key_01',
      });

      expect(outboxMsg.id).toBeDefined();
      expect(outboxMsg.status).toBe('pending');

      // Dispatch batch
      let dispatchedPayload: any = null;
      const result = await transactionalOutboxService.processBatch(async (msg) => {
        dispatchedPayload = msg.payload;
      });

      expect(result.processed).toBeGreaterThanOrEqual(1);
      expect(result.succeeded).toBeGreaterThanOrEqual(1);
      expect(dispatchedPayload).toBeDefined();
      expect(dispatchedPayload.tenantId).toBe(testTenantId);
    });
  });

  // =========================================================================
  // 7. HTTP API Security, Summary Metrics & CSV Sanitization
  // =========================================================================
  describe('7. HTTP API Security & Data Sanitization', () => {
    it('rejects unauthenticated requests to platform endpoints (401)', async () => {
      const res = await request(app).get('/api/v1/platform/tenants');
      expect(res.status).toBe(401);
    });

    it('rejects non-Super Admin requests to platform endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenants')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.status).toBe(403);
    });

    it('allows Super Admin to fetch summary metrics', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenants/summary')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalTenants');
      expect(res.body.data).toHaveProperty('activeTenants');
    });

    it('allows Super Admin to query paginated tenant list', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenants?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total');
    });

    it('exports tenant activity CSV with spreadsheet formula injection defense', async () => {
      const db = getDb();
      // Insert an audit log with formula injection attack payload
      await db.insert(auditLogs).values({
        id: `aud_inj_${generateSurrogateId('aud')}`,
        tenantId: testTenantId,
        action: '=cmd|’ /C calc’!A0', // Excel/CSV formula injection attempt
        targetType: 'test',
        targetId: 'inj_01',
        actorEmail: '+attacker@example.com', // Plus sign injection
        metadata: { field: '-2+5' },
      });

      const res = await request(app)
        .get(`/api/v1/platform/tenants/${testTenantId}/activity/export`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('.csv');

      const csvContent = res.text;
      // Formula injection defense verification: cell starting with '=' must be escaped with single quote "'"
      expect(csvContent).toContain("\"'=cmd|");
      expect(csvContent).toContain("\"'+attacker");
    });
  });
});
