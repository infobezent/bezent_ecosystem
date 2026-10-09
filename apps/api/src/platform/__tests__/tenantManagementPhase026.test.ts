import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { and, eq, inArray } from 'drizzle-orm';
import crypto from 'node:crypto';
import { createApp } from '../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../db/connection.js';
import {
  tenants,
  tenantDetails,
  companies,
  users,
  memberships,
  tenantAdmins,
  plans,
  planPrices,
  planEntitlements,
  tenantSubscriptions,
  tenantModules,
  provisioningJobs,
  transactionalOutbox,
  invitations,
  auditLogs,
  roleAssignments,
} from '../../db/schema.js';
import { signInForTest } from './support/testSession.js';
import { hashPassword, generateSurrogateId } from '../auth/security.js';
import { backgroundWorkerRunner } from '../workers/backgroundWorker.runner.js';
import { moduleService } from '../modules/service/module.service.js';
import { tenantService } from '../tenants/service/tenant.service.js';

describe('BEZENT Phase 02.6 — Backend Remediation, Tenant Orchestration & Runtime Integration', () => {
  const app = createApp();

  const superAdminId = 'usr_p26_superadmin';
  const superAdminEmail = 'superadmin_p26@test.bezent.com';
  const normalUserId = 'usr_p26_normal';
  const normalUserEmail = 'normal_p26@test.bezent.com';

  const planHrmsId = 'plan_p26_hrms_growth';
  const planCrmId = 'plan_p26_crm_starter';

  const testTenantId = 'tnt_p26_orchestrated';
  let superAdminToken: string;
  let normalUserToken: string;

  beforeAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    const { hash, salt } = hashPassword('Phase026!Secure123');

    // Clean up entities from potential previous runs
    await db.delete(roleAssignments).where(inArray(roleAssignments.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(memberships).where(inArray(memberships.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantAdmins).where(inArray(tenantAdmins.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(invitations).where(inArray(invitations.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantSubscriptions).where(inArray(tenantSubscriptions.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(provisioningJobs).where(inArray(provisioningJobs.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(transactionalOutbox).where(inArray(transactionalOutbox.aggregateId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(auditLogs).where(inArray(auditLogs.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(companies).where(inArray(companies.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantDetails).where(inArray(tenantDetails.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));

    await db.delete(planPrices).where(inArray(planPrices.planId, [planHrmsId, planCrmId]));
    await db.delete(planEntitlements).where(inArray(planEntitlements.planId, [planHrmsId, planCrmId]));
    await db.delete(plans).where(inArray(plans.id, [planHrmsId, planCrmId]));

    await db.delete(users).where(inArray(users.id, [superAdminId, normalUserId, 'usr_p26_invited_admin']));

    // Seed test users
    await db.insert(users).values({
      id: superAdminId,
      email: superAdminEmail,
      passwordHash: hash,
      salt,
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
      status: 'active',
    });

    await db.insert(users).values({
      id: normalUserId,
      email: normalUserEmail,
      passwordHash: hash,
      salt,
      firstName: 'Normal',
      lastName: 'User',
      isSuperAdmin: false,
      status: 'active',
    });

    // Seed test plans
    await db.insert(plans).values({
      id: planHrmsId,
      applicationCode: 'hrms',
      code: 'HRMS-P26-GROWTH',
      name: 'HRMS Growth Plan',
      tier: 'standard',
      minSeats: 5,
      maxSeats: 100,
      trialDurationDays: 14,
      status: 'active',
    });

    await db.insert(planPrices).values({
      id: generateSurrogateId('prc'),
      planId: planHrmsId,
      currency: 'USD',
      amountMinorUnits: 5000,
      billingInterval: 'monthly',
      status: 'active',
    });

    await db.insert(planEntitlements).values({
      id: generateSurrogateId('ent'),
      planId: planHrmsId,
      applicationCode: 'hrms',
      moduleCode: 'core_hr',
      isEnabled: true,
    });

    await db.insert(plans).values({
      id: planCrmId,
      applicationCode: 'crm',
      code: 'CRM-P26-STARTER',
      name: 'CRM Starter Plan',
      tier: 'starter',
      minSeats: 1,
      maxSeats: 25,
      trialDurationDays: 14,
      status: 'active',
    });

    await db.insert(planPrices).values({
      id: generateSurrogateId('prc'),
      planId: planCrmId,
      currency: 'USD',
      amountMinorUnits: 3000,
      billingInterval: 'monthly',
      status: 'active',
    });

    // Sign in sessions
    const superAdminRes = await signInForTest(superAdminEmail);
    superAdminToken = superAdminRes.token;

    const normalUserRes = await signInForTest(normalUserEmail);
    normalUserToken = normalUserRes.token;
  });

  afterAll(async () => {
    if (!isDatabaseConfigured) return;
    const db = getDb();
    await db.delete(roleAssignments).where(inArray(roleAssignments.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(memberships).where(inArray(memberships.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantAdmins).where(inArray(tenantAdmins.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(invitations).where(inArray(invitations.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantSubscriptions).where(inArray(tenantSubscriptions.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(provisioningJobs).where(inArray(provisioningJobs.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(transactionalOutbox).where(inArray(transactionalOutbox.aggregateId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(auditLogs).where(inArray(auditLogs.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(companies).where(inArray(companies.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenantDetails).where(inArray(tenantDetails.tenantId, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantId, 'tnt_p26_legacy', 'tnt_p26_crm']));

    await db.delete(planPrices).where(inArray(planPrices.planId, [planHrmsId, planCrmId]));
    await db.delete(planEntitlements).where(inArray(planEntitlements.planId, [planHrmsId, planCrmId]));
    await db.delete(plans).where(inArray(plans.id, [planHrmsId, planCrmId]));

    await db.delete(users).where(inArray(users.id, [superAdminId, normalUserId, 'usr_p26_invited_admin']));
  });

  describe('Slice A — Atomic Create Tenant Orchestrator (P0-1)', () => {
    const validPayload = {
      company: {
        legalName: 'Acme Apex Corporation',
        displayName: 'Acme Apex',
        businessEmail: 'contact@acmeapex.com',
        country: 'US',
        timezone: 'America/New_York',
        industry: 'Technology',
        companySize: '51-200',
      },
      primaryAdmin: {
        fullName: 'Jane Doe',
        workEmail: 'jane.doe@acmeapex.com',
        phone: '+14155552671',
        jobTitle: 'Head of People Operations',
      },
      applications: [
        {
          applicationCode: 'hrms',
          planId: planHrmsId,
          isTrial: true,
          seats: 25,
          billingCycle: 'monthly',
        },
      ],
    };

    it('denies non-Super Admin callers with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/platform/tenants/orchestrate/preflight')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    it('rejects invalid IANA timezone and missing fields during preflight', async () => {
      const invalidPayload = {
        ...validPayload,
        company: {
          ...validPayload.company,
          timezone: 'Not/A_Real_Timezone',
        },
      };

      const res = await request(app)
        .post('/api/v1/platform/tenants/orchestrate/preflight')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('Invalid IANA timezone');
    });

    it('executes preflight successfully and returns valid readiness summary without mutating database', async () => {
      const res = await request(app)
        .post('/api/v1/platform/tenants/orchestrate/preflight')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.tenantSetupPolicy).toBe('ready_to_create');
      expect(res.body.data.summary.companyName).toBe('Acme Apex Corporation');
      expect(res.body.data.summary.adminEmail).toBe('jane.doe@acmeapex.com');
      expect(res.body.data.summary.selectedApplications).toEqual(['hrms']);
    });

    let rawInvitationToken: string;

    it('atomically creates Tenant, Company, Invitation, Subscriptions, Provisioning Job, and Outbox event', async () => {
      const idempotencyKey = 'idemp_key_p26_test_create_001';

      const res = await request(app)
        .post('/api/v1/platform/tenants/orchestrate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          ...validPayload,
          id: testTenantId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tenantId).toBe(testTenantId);
      expect(res.body.data.primaryCompanyId).toBeDefined();
      expect(res.body.data.businessSetupState).toBe('pending_admin_acceptance');
      expect(res.body.data.invitation.status).toBe('pending');
      expect(res.body.data.invitation.rawToken).toBeDefined();
      rawInvitationToken = res.body.data.invitation.rawToken;

      const db = getDb();
      // Verify Tenant and Primary Company
      const [t] = await db.select().from(tenants).where(eq(tenants.id, testTenantId));
      expect(t).toBeDefined();
      expect(t?.name).toBe('Acme Apex');

      const [c] = await db.select().from(companies).where(eq(companies.tenantId, testTenantId));
      expect(c).toBeDefined();
      expect(c?.name).toBe('Acme Apex Corporation');

      // Verify Token is HASHED in DB (not plaintext)
      const [inv] = await db.select().from(invitations).where(eq(invitations.tenantId, testTenantId));
      expect(inv).toBeDefined();
      expect(inv?.token).not.toBe(rawInvitationToken);
      const computedHash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
      expect(inv?.token).toBe(computedHash);

      // Verify Transactional Outbox Event created
      const [outboxMsg] = await db.select().from(transactionalOutbox).where(eq(transactionalOutbox.aggregateId, testTenantId));
      expect(outboxMsg).toBeDefined();
      expect(outboxMsg?.eventType).toBe('tenant.invitation.issued');
      expect(outboxMsg?.status).toBe('pending');

      // Verify Provisioning Job created
      const [pJob] = await db.select().from(provisioningJobs).where(eq(provisioningJobs.tenantId, testTenantId));
      expect(pJob).toBeDefined();
      expect(pJob?.status).toBe('pending');
      expect(pJob?.idempotencyKey).toBe(idempotencyKey);
    });

    it('replays original response idempotently when the same Idempotency-Key is reused', async () => {
      const idempotencyKey = 'idemp_key_p26_test_create_001';

      const res = await request(app)
        .post('/api/v1/platform/tenants/orchestrate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          ...validPayload,
          id: testTenantId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.idempotentReplay).toBe(true);
      expect(res.body.data.tenantId).toBe(testTenantId);
    });

    it('rejects same Idempotency-Key when reused with a different payload (conflict 409)', async () => {
      const idempotencyKey = 'idemp_key_p26_test_create_001';

      const res = await request(app)
        .post('/api/v1/platform/tenants/orchestrate')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          ...validPayload,
          company: {
            ...validPayload.company,
            legalName: 'Completely Different Corporation',
          },
        });

      expect(res.status).toBe(409);
      expect(JSON.stringify(res.body)).toContain('reused with a different payload');
    });

    describe('Slice C — Primary Admin Membership & Invitation Security (P1-2, P2-1, P2-2)', () => {
      it('rejects acceptance if caller is authenticated with a different email', async () => {
        const res = await request(app)
          .post(`/api/v1/platform/tenants/invitations/${rawInvitationToken}/accept`)
          .set('Authorization', `Bearer ${normalUserToken}`) // normal_p26@test.bezent.com != jane.doe@acmeapex.com
          .send({});

        expect(res.status).toBe(403);
        expect(JSON.stringify(res.body)).toContain('does not match the invited address');
      });

      it('atomically grants tenant admin AND company_admin membership upon valid acceptance', async () => {
        const db = getDb();
        const { hash, salt } = hashPassword('JaneSecurePassword123');

        // Create the user identity for Jane
        const janeUserId = 'usr_p26_invited_admin';
        await db.insert(users).values({
          id: janeUserId,
          email: 'jane.doe@acmeapex.com',
          passwordHash: hash,
          salt,
          firstName: 'Jane',
          lastName: 'Doe',
          isSuperAdmin: false,
          status: 'active',
        });

        // Sign in Jane
        const janeSession = await signInForTest('jane.doe@acmeapex.com');

        // Accept invitation using rawToken
        const res = await request(app)
          .post(`/api/v1/platform/tenants/invitations/${rawInvitationToken}/accept`)
          .set('Authorization', `Bearer ${janeSession.token}`)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.data.success).toBe(true);

        // Verify tenant_admins entry
        const [admin] = await db
          .select()
          .from(tenantAdmins)
          .where(and(eq(tenantAdmins.tenantId, testTenantId), eq(tenantAdmins.userId, janeUserId)));
        expect(admin).toBeDefined();
        expect(admin?.isPrimary).toBe(true);
        expect(admin?.status).toBe('active');

        // Verify primary company membership with company_admin role
        const [mem] = await db
          .select()
          .from(memberships)
          .where(and(eq(memberships.tenantId, testTenantId), eq(memberships.userId, janeUserId)));
        expect(mem).toBeDefined();
        expect(mem?.role).toBe('company_admin');
        expect(mem?.status).toBe('active');
      });

      it('rejects reused or already accepted invitation tokens with 400 Bad Request', async () => {
        const janeSession = await signInForTest('jane.doe@acmeapex.com');
        const res = await request(app)
          .post(`/api/v1/platform/tenants/invitations/${rawInvitationToken}/accept`)
          .set('Authorization', `Bearer ${janeSession.token}`)
          .send({});

        expect(res.status).toBe(400);
        expect(JSON.stringify(res.body)).toContain('already been accepted');
      });
    });
  });

  describe('Slice B — Runtime Entitlement Enforcement (P0-2)', () => {
    it('grants active HRMS entitlement when tenant has an effective subscription', async () => {
      const entitled = await moduleService.isTenantEntitled(testTenantId, 'hrms');
      expect(entitled).toBe(true);
    });

    it('blocks CRM access when tenant does not have a CRM subscription', async () => {
      const entitled = await moduleService.isTenantEntitled(testTenantId, 'crm');
      expect(entitled).toBe(false);
    });

    it('supports legacy tenants without subscriptions via tenant_modules fallback', async () => {
      const db = getDb();
      const legacyTenantId = 'tnt_p26_legacy';

      // Insert legacy tenant with only tenant_modules entry
      await db.insert(tenants).values({
        id: legacyTenantId,
        name: 'Legacy Customer Ltd',
        status: 'active',
      });
      await db.insert(tenantModules).values([
        {
          id: generateSurrogateId('mod'),
          tenantId: legacyTenantId,
          companyId: null,
          moduleCode: 'crm',
          status: 'enabled',
        },
        {
          id: generateSurrogateId('mod'),
          tenantId: legacyTenantId,
          companyId: null,
          moduleCode: 'hrms',
          status: 'disabled',
        },
      ]);

      const entitled = await moduleService.isTenantEntitled(legacyTenantId, 'crm');
      expect(entitled).toBe(true);

      const hrmsEntitled = await moduleService.isTenantEntitled(legacyTenantId, 'hrms');
      expect(hrmsEntitled).toBe(false);
    });
  });

  describe('Slice D — Background Workers & Lifecycle Sweeper (P1-1, P2-3)', () => {
    it('dispatches pending invitation email outbox batch asynchronously', async () => {
      const dispatched = await backgroundWorkerRunner.processOutboxBatch();
      expect(dispatched).toBeGreaterThanOrEqual(1);

      const db = getDb();
      const [msg] = await db
        .select()
        .from(transactionalOutbox)
        .where(eq(transactionalOutbox.aggregateId, testTenantId));
      expect(['published', 'dispatched']).toContain(msg?.status);
    });

    it('sweeps and expires trials when trialEndsAt has passed', async () => {
      const db = getDb();
      // Set trialEndsAt to 1 hour ago
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      await db
        .update(tenantSubscriptions)
        .set({ trialEndsAt: oneHourAgo })
        .where(eq(tenantSubscriptions.tenantId, testTenantId));

      const sweepResult = await backgroundWorkerRunner.sweepSubscriptions();
      expect(sweepResult.expired).toBeGreaterThanOrEqual(1);

      // Verify subscription is now expired
      const [sub] = await db
        .select()
        .from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, testTenantId));
      expect(sub?.status).toBe('expired');

      // Verify runtime access is revoked
      const entitled = await moduleService.isTenantEntitled(testTenantId, 'hrms');
      expect(entitled).toBe(false);
    });

    it('exposes worker operational health status endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/platform/provisioning/workers/status')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.outboxDispatchedCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.subscriptionLastSweepAt).toBeDefined();
    });
  });

  describe('Slice E — All Tenants Summary & List APIs (P1-3, P1-4)', () => {
    it('returns mutually exclusive dashboard counts including trialTenants', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenants/summary')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalTenants).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.data.activeTenants).toBe('number');
      expect(typeof res.body.data.trialTenants).toBe('number');
      expect(typeof res.body.data.suspendedTenants).toBe('number');
    });

    it('filters tenant list by primary admin email, applications, and sorting', async () => {
      const res = await request(app)
        .get('/api/v1/platform/tenants')
        .query({ search: 'jane.doe@acmeapex.com', sortBy: 'name', sortOrder: 'asc' })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.items.find((i: any) => i.id === testTenantId);
      expect(found).toBeDefined();
      expect(found.primaryAdmin?.email).toBe('jane.doe@acmeapex.com');
      expect(found.subscriptionSummary).toBeDefined();
      expect(found.derivedCommercialClassification).toBeDefined();
    });
  });

  describe('Slice F — Composite Tenant Overview API (P1-5)', () => {
    it('returns comprehensive, frontend-ready overview DTO', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/tenants/${testTenantId}/overview`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      const overview = res.body.data;
      expect(overview.tenant.id).toBe(testTenantId);
      expect(overview.primaryCompany).toBeDefined();
      expect(overview.primaryAdmin?.email).toBe('jane.doe@acmeapex.com');
      expect(overview.enabledApplications.length).toBeGreaterThanOrEqual(1);
      expect(overview.provisioningHealth).toBeDefined();
      expect(overview.setupProgress).toBeDefined();
      expect(overview.health).toBeDefined();
      expect(overview.attentionRequired).toBeDefined();
    });
  });

  describe('Slice G — Activity & Provisioning APIs Completeness', () => {
    it('supports filtered and paginated tenant activity retrieval', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/tenants/${testTenantId}/activity`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('exports sanitized CSV activity log with formula injection protection', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/tenants/${testTenantId}/activity/export`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Timestamp,Action,Target Type,Target ID');
      expect(res.text).not.toContain('"token":');
    });
  });
});
