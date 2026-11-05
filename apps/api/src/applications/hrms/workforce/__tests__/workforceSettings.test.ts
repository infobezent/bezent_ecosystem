import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb, isDatabaseConfigured } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  workforceGeneralSettings,
  workforceEmploymentTypes,
  workforceProbationPolicies,
  workforceLifecyclePolicies,
  workforceOffboardingPolicies,
  workforceClearanceChecklistTemplates,
} from '../../../../db/schema.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { ValidationError } from '../../../../app/errors/AppError.js';
import {
  validateUpdateGeneralSettings,
  validateCreateEmploymentType,
  validateUpdateProbationPolicy,
  validateUpdateLifecyclePolicy,
  validateUpdateOffboardingPolicy,
  validateCreateClearanceTemplate,
} from '../validation/workforceSettings.schema.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Workforce Settings Integration & Unit Tests',
  () => {
    const testTenantA = 'tenant_wf_set_a';
    const testTenantB = 'tenant_wf_set_b';
    const testCompanyA = 'comp_wf_set_a';
    const testCompanyB = 'comp_wf_set_b';
    const testUserA = 'user_wf_set_a';
    const testUserB = 'user_wf_set_b';
    const testUserNoPerm = 'user_wf_set_noperm';

    let app: ReturnType<typeof createApp>;
    let tokenA: string;
    let tokenB: string;
    let tokenNoPerm: string;

    beforeAll(async () => {
      app = createApp();
      const db = getDb();

      // Clean up any stale data from previous runs
      await db
        .delete(workforceClearanceChecklistTemplates)
        .where(
          inArray(workforceClearanceChecklistTemplates.companyId, [testCompanyA, testCompanyB]),
        );
      await db
        .delete(workforceOffboardingPolicies)
        .where(inArray(workforceOffboardingPolicies.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceLifecyclePolicies)
        .where(inArray(workforceLifecyclePolicies.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceProbationPolicies)
        .where(inArray(workforceProbationPolicies.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceEmploymentTypes)
        .where(inArray(workforceEmploymentTypes.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceGeneralSettings)
        .where(inArray(workforceGeneralSettings.companyId, [testCompanyA, testCompanyB]));

      await db
        .delete(roleAssignments)
        .where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(memberships)
        .where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
      await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
      await db
        .delete(tenantModules)
        .where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
      await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
      await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));

      // Seed tenants
      await db.insert(tenants).values([
        { id: testTenantA, name: 'WF Tenant A', status: 'active' },
        { id: testTenantB, name: 'WF Tenant B', status: 'active' },
      ]);

      // Enable HRMS module for both
      await db.insert(tenantModules).values([
        {
          id: `tmod_${testTenantA}_hrms`,
          tenantId: testTenantA,
          moduleCode: 'hrms',
          status: 'enabled',
        },
        {
          id: `tmod_${testTenantB}_hrms`,
          tenantId: testTenantB,
          moduleCode: 'hrms',
          status: 'enabled',
        },
      ]);

      // Seed companies
      await db.insert(companies).values([
        {
          id: testCompanyA,
          tenantId: testTenantA,
          name: 'WF Corp A',
          code: 'WF-A',
          displayName: 'WF-A',
          status: 'active',
        },
        {
          id: testCompanyB,
          tenantId: testTenantB,
          name: 'WF Corp B',
          code: 'WF-B',
          displayName: 'WF-B',
          status: 'active',
        },
      ]);

      const pwd = hashPassword('Secret123!');

      // Seed users
      await db.insert(users).values([
        {
          id: testUserA,
          email: 'admin.a@wf.test',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Admin',
          lastName: 'A',
          status: 'active',
        },
        {
          id: testUserB,
          email: 'admin.b@wf.test',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Admin',
          lastName: 'B',
          status: 'active',
        },
        {
          id: testUserNoPerm,
          email: 'noperm@wf.test',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'No',
          lastName: 'Perm',
          status: 'active',
        },
      ]);

      // Memberships
      await db.insert(memberships).values([
        {
          id: 'm-wf-a',
          userId: testUserA,
          companyId: testCompanyA,
          tenantId: testTenantA,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: 'm-wf-b',
          userId: testUserB,
          companyId: testCompanyB,
          tenantId: testTenantB,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: 'm-wf-noperm',
          userId: testUserNoPerm,
          companyId: testCompanyA,
          tenantId: testTenantA,
          role: 'employee',
          status: 'active',
        },
      ]);

      // Roles: UserA and UserB get role_sys_hr_manager
      await db.insert(roleAssignments).values([
        {
          id: 'ra-wf-a-1',
          tenantId: testTenantA,
          companyId: testCompanyA,
          userId: testUserA,
          roleId: 'role_sys_hr_manager',
        },
        {
          id: 'ra-wf-b-1',
          tenantId: testTenantB,
          companyId: testCompanyB,
          userId: testUserB,
          roleId: 'role_sys_hr_manager',
        },
      ]);

      // Sign in tokens
      const loginA = await signInForTest('admin.a@wf.test');
      tokenA = loginA.token;
      const loginB = await signInForTest('admin.b@wf.test');
      tokenB = loginB.token;
      const loginNoPerm = await signInForTest('noperm@wf.test');
      tokenNoPerm = loginNoPerm.token;
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(workforceClearanceChecklistTemplates)
        .where(
          inArray(workforceClearanceChecklistTemplates.companyId, [testCompanyA, testCompanyB]),
        );
      await db
        .delete(workforceOffboardingPolicies)
        .where(inArray(workforceOffboardingPolicies.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceLifecyclePolicies)
        .where(inArray(workforceLifecyclePolicies.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceProbationPolicies)
        .where(inArray(workforceProbationPolicies.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceEmploymentTypes)
        .where(inArray(workforceEmploymentTypes.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(workforceGeneralSettings)
        .where(inArray(workforceGeneralSettings.companyId, [testCompanyA, testCompanyB]));

      await db
        .delete(roleAssignments)
        .where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(memberships)
        .where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
      await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
      await db
        .delete(tenantModules)
        .where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
      await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
      await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));
    });

    // =========================================================================
    // 1. VALIDATION TESTS
    // =========================================================================
    describe('Workforce Settings Schemas Validation', () => {
      it('validates general settings valid and invalid ranges', () => {
        const valid = validateUpdateGeneralSettings({
          idPrefix: 'BEZ-',
          sequenceLength: 5,
          startingNumber: 100,
          generationMode: 'automatic',
          resetFrequency: 'calendar_year',
        });
        expect(valid.idPrefix).toBe('BEZ-');
        expect(valid.sequenceLength).toBe(5);

        expect(() => {
          validateUpdateGeneralSettings({ sequenceLength: 1 }); // must be 3-10
        }).toThrow(ValidationError);

        expect(() => {
          validateUpdateGeneralSettings({ generationMode: 'invalid_mode' });
        }).toThrow(ValidationError);
      });

      it('validates employment type creation', () => {
        const created = validateCreateEmploymentType({
          code: 'ft',
          name: 'Full Time',
          workHoursPerWeek: 40,
        });
        expect(created.code).toBe('FT');
        expect(created.name).toBe('Full Time');
        expect(created.workHoursPerWeek).toBe(40);

        expect(() => {
          validateCreateEmploymentType({ code: '', name: 'Test' });
        }).toThrow(ValidationError);
      });

      it('validates probation policy inputs', () => {
        const probation = validateUpdateProbationPolicy({
          defaultProbationDays: 60,
          confirmationMode: 'auto_confirm',
        });
        expect(probation.defaultProbationDays).toBe(60);
        expect(probation.confirmationMode).toBe('auto_confirm');

        expect(() => {
          validateUpdateProbationPolicy({ defaultProbationDays: -5 });
        }).toThrow(ValidationError);
      });

      it('validates lifecycle policy inputs', () => {
        const lifecycle = validateUpdateLifecyclePolicy({
          effectiveDateAlignment: 'immediate',
          requireReleasingManagerApproval: false,
        });
        expect(lifecycle.effectiveDateAlignment).toBe('immediate');
        expect(lifecycle.requireReleasingManagerApproval).toBe(false);
      });

      it('validates offboarding policy inputs', () => {
        const offboarding = validateUpdateOffboardingPolicy({
          probationNoticeDays: 30,
          allowNoticeBuyout: false,
        });
        expect(offboarding.probationNoticeDays).toBe(30);
        expect(offboarding.allowNoticeBuyout).toBe(false);
      });

      it('validates clearance template creation', () => {
        const clearance = validateCreateClearanceTemplate({
          department: 'it',
          itemTitle: 'Collect Hardware Token',
        });
        expect(clearance.department).toBe('it');
        expect(clearance.itemTitle).toBe('Collect Hardware Token');

        expect(() => {
          validateCreateClearanceTemplate({ department: 'invalid_dept', itemTitle: 'Something' });
        }).toThrow(ValidationError);
      });
    });

    // =========================================================================
    // 2. ENDPOINT TESTS & REPOSITORY SEEDING
    // =========================================================================
    describe('Workforce Settings API Endpoints', () => {
      it('GET /api/v1/hrms/workforce/settings loads complete bundle and auto-seeds defaults', async () => {
        const res = await request(app)
          .get('/api/v1/hrms/workforce/settings')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA);

        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();

        const { general, employmentTypes, probation, lifecycle, offboarding, clearanceTemplates } =
          res.body.data;

        // General auto-numbering defaults
        expect(general.idPrefix).toBe('EMP-');
        expect(general.sequenceLength).toBe(4);
        expect(general.nextSuggestedId).toBe('EMP-1001');

        // Employment types default seeding
        expect(employmentTypes.length).toBeGreaterThanOrEqual(4);
        expect(employmentTypes.some((et: { code: string }) => et.code === 'FT')).toBe(true);

        // Probation defaults
        expect(probation.defaultProbationDays).toBe(90);
        expect(probation.confirmationMode).toBe('manager_review');

        // Lifecycle defaults
        expect(lifecycle.requireReleasingManagerApproval).toBe(true);

        // Offboarding defaults
        expect(offboarding.probationNoticeDays).toBe(15);
        expect(offboarding.confirmedNoticeDays).toBe(60);

        // Clearance template items
        expect(clearanceTemplates.length).toBeGreaterThanOrEqual(5);
      });

      it('PUT /api/v1/hrms/workforce/settings/general updates settings and recalculates preview ID', async () => {
        const res = await request(app)
          .put('/api/v1/hrms/workforce/settings/general')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            idPrefix: 'BEZ-',
            idSuffix: '-26',
            sequenceLength: 5,
            startingNumber: 5000,
          });

        expect(res.status).toBe(200);
        expect(res.body.data.idPrefix).toBe('BEZ-');
        expect(res.body.data.idSuffix).toBe('-26');
        expect(res.body.data.sequenceLength).toBe(5);
        expect(res.body.data.nextSuggestedId).toBe('BEZ-05000-26');
      });

      it('POST /api/v1/hrms/workforce/settings/general/reserve-id atomically increments counter', async () => {
        // First reservation
        const res1 = await request(app)
          .post('/api/v1/hrms/workforce/settings/general/reserve-id')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA);

        expect(res1.status).toBe(200);
        expect(res1.body.data.nextId).toBe('BEZ-05000-26');
        expect(res1.body.data.sequenceNumber).toBe(5000);

        // Second reservation increments by 1
        const res2 = await request(app)
          .post('/api/v1/hrms/workforce/settings/general/reserve-id')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA);

        expect(res2.status).toBe(200);
        expect(res2.body.data.nextId).toBe('BEZ-05001-26');
        expect(res2.body.data.sequenceNumber).toBe(5001);

        // Preview should show 5002 without incrementing
        const preview = await request(app)
          .get('/api/v1/hrms/workforce/settings/general/preview-id')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA);

        expect(preview.status).toBe(200);
        expect(preview.body.data.nextId).toBe('BEZ-05002-26');
      });

      it('CRUD on Employment Types with unique code validation', async () => {
        // Create new employment type
        const createRes = await request(app)
          .post('/api/v1/hrms/workforce/settings/employment-types')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            code: 'CNS',
            name: 'External Consultant',
            workHoursPerWeek: 30,
            isBenefitsEligible: false,
            defaultNoticeDays: 14,
          });

        expect(createRes.status).toBe(201);
        const createdId = createRes.body.data.id;
        expect(createRes.body.data.code).toBe('CNS');

        // Duplicate code error
        const dupRes = await request(app)
          .post('/api/v1/hrms/workforce/settings/employment-types')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            code: 'CNS',
            name: 'Another Consultant',
          });
        expect(dupRes.status).toBe(409);

        // Update
        const updateRes = await request(app)
          .put(`/api/v1/hrms/workforce/settings/employment-types/${createdId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            name: 'Specialist Consultant',
            defaultNoticeDays: 21,
          });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe('Specialist Consultant');
        expect(updateRes.body.data.defaultNoticeDays).toBe(21);

        // Delete
        const deleteRes = await request(app)
          .delete(`/api/v1/hrms/workforce/settings/employment-types/${createdId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.success).toBe(true);
      });

      it('updates probation, lifecycle, and offboarding policies', async () => {
        // Probation update
        const probRes = await request(app)
          .put('/api/v1/hrms/workforce/settings/probation')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            defaultProbationDays: 120,
            confirmationMode: 'auto_confirm',
          });
        expect(probRes.status).toBe(200);
        expect(probRes.body.data.defaultProbationDays).toBe(120);
        expect(probRes.body.data.confirmationMode).toBe('auto_confirm');

        // Lifecycle update
        const lifeRes = await request(app)
          .put('/api/v1/hrms/workforce/settings/lifecycle')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            effectiveDateAlignment: 'immediate',
            requireReleasingManagerApproval: false,
          });
        expect(lifeRes.status).toBe(200);
        expect(lifeRes.body.data.effectiveDateAlignment).toBe('immediate');
        expect(lifeRes.body.data.requireReleasingManagerApproval).toBe(false);

        // Offboarding update
        const offRes = await request(app)
          .put('/api/v1/hrms/workforce/settings/offboarding')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('X-Company-Id', testCompanyA)
          .send({
            confirmedNoticeDays: 45,
            allowNoticeBuyout: false,
          });
        expect(offRes.status).toBe(200);
        expect(offRes.body.data.confirmedNoticeDays).toBe(45);
        expect(offRes.body.data.allowNoticeBuyout).toBe(false);
      });

      it('enforces multi-tenant company isolation between Company A and Company B', async () => {
        // Company B accesses settings for the first time
        const resB = await request(app)
          .get('/api/v1/hrms/workforce/settings')
          .set('Authorization', `Bearer ${tokenB}`)
          .set('X-Company-Id', testCompanyB);

        expect(resB.status).toBe(200);
        // Company B has default prefix EMP-, NOT Company A's modified BEZ-
        expect(resB.body.data.general.idPrefix).toBe('EMP-');
        expect(resB.body.data.general.nextSuggestedId).toBe('EMP-1001');

        // Company B's probation should be default 90, NOT Company A's 120
        expect(resB.body.data.probation.defaultProbationDays).toBe(90);
      });

      it('rejects unauthenticated or unauthorized users', async () => {
        // No token
        const noAuth = await request(app)
          .get('/api/v1/hrms/workforce/settings')
          .set('X-Company-Id', testCompanyA);
        expect(noAuth.status).toBe(401);

        // User without manage permission attempting update
        const noPerm = await request(app)
          .put('/api/v1/hrms/workforce/settings/general')
          .set('Authorization', `Bearer ${tokenNoPerm}`)
          .set('X-Company-Id', testCompanyA)
          .send({ idPrefix: 'HACK-' });
        expect(noPerm.status).toBe(403);
      });
    });
  },
);
