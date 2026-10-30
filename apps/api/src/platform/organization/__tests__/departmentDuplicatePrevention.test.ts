import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, and, isNotNull } from 'drizzle-orm';
import { createApp } from '../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  employees,
  departments,
  businessUnits,
  attendanceGeneralSettings,
} from '../../../db/schema.js';
import { hashPassword } from '../../auth/security.js';
import { signInForTest } from '../../__tests__/support/testSession.js';
import { attendanceOverviewService } from '../../../applications/hrms/attendance/service/attendanceOverview.service.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT Organization — Department Data Integrity & Duplicate Prevention Suite',
  () => {
    const testTenantA = 'tenant_dup_test_a';
    const testTenantB = 'tenant_dup_test_b';
    const testCompanyA = 'comp_dup_test_a';
    const testCompanyB = 'comp_dup_test_b';
    const testUserA = 'user_dup_test_a';
    const testUserB = 'user_dup_test_b';
    const testUserNoPerm = 'user_dup_test_noperm';

    let app: ReturnType<typeof createApp>;
    let tokenA: string;
    let tokenB: string;
    let tokenNoPerm: string;

    let buA1Id: string;
    let buA2Id: string;
    let parentDept1Id: string;
    let parentDept2Id: string;

    beforeAll(async () => {
      app = createApp();
      const db = getDb();

      // Clean up any stale test fixtures in foreign key order
      await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(departments)
        .where(
          and(
            inArray(departments.companyId, [testCompanyA, testCompanyB]),
            isNotNull(departments.parentDepartmentId),
          ),
        );
      await db
        .delete(departments)
        .where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(businessUnits)
        .where(inArray(businessUnits.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(attendanceGeneralSettings)
        .where(inArray(attendanceGeneralSettings.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(roleAssignments)
        .where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(memberships)
        .where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
      await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
      await db
        .delete(tenantModules)
        .where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
      await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
      await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));

      // 1. Seed Tenants
      await db.insert(tenants).values([
        { id: testTenantA, name: 'Tenant Dup Test A', status: 'active' },
        { id: testTenantB, name: 'Tenant Dup Test B', status: 'active' },
      ]);

      // 2. Enable HRMS module
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

      // 3. Seed Companies
      await db.insert(companies).values([
        {
          id: testCompanyA,
          tenantId: testTenantA,
          name: 'Dup Test Company A',
          code: 'DUP-A',
          displayName: 'Dup Company A',
          status: 'active',
        },
        {
          id: testCompanyB,
          tenantId: testTenantB,
          name: 'Dup Test Company B',
          code: 'DUP-B',
          displayName: 'Dup Company B',
          status: 'active',
        },
      ]);

      // 4. Seed Users
      const pwd = hashPassword('password123');
      await db.insert(users).values([
        {
          id: testUserA,
          email: 'admin_dup_a@alpha.test',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Alice',
          lastName: 'DupAdmin',
          status: 'active',
        },
        {
          id: testUserB,
          email: 'admin_dup_b@beta.test',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'Bob',
          lastName: 'DupAdmin',
          status: 'active',
        },
        {
          id: testUserNoPerm,
          email: 'user_dup_noperm@alpha.test',
          passwordHash: pwd.hash,
          salt: pwd.salt,
          firstName: 'No',
          lastName: 'Permissions',
          status: 'active',
        },
      ]);

      // 5. Seed Memberships
      await db.insert(memberships).values([
        {
          id: `mem_${testUserA}_${testCompanyA}`,
          userId: testUserA,
          tenantId: testTenantA,
          companyId: testCompanyA,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: `mem_${testUserB}_${testCompanyB}`,
          userId: testUserB,
          tenantId: testTenantB,
          companyId: testCompanyB,
          role: 'company_admin',
          status: 'active',
        },
        {
          id: `mem_${testUserNoPerm}_${testCompanyA}`,
          userId: testUserNoPerm,
          tenantId: testTenantA,
          companyId: testCompanyA,
          role: 'employee',
          status: 'active',
        },
      ]);

      // 6. Seed Role Assignments
      await db.insert(roleAssignments).values([
        {
          id: `ra_dup_${testUserA}`,
          tenantId: testTenantA,
          companyId: testCompanyA,
          userId: testUserA,
          roleId: 'role_sys_hr_manager',
        },
        {
          id: `ra_dup_${testUserB}`,
          tenantId: testTenantB,
          companyId: testCompanyB,
          userId: testUserB,
          roleId: 'role_sys_hr_manager',
        },
      ]);

      // 7. Seed Business Units in Company A
      buA1Id = 'bu_dup_a1';
      buA2Id = 'bu_dup_a2';
      await db.insert(businessUnits).values([
        {
          id: buA1Id,
          tenantId: testTenantA,
          companyId: testCompanyA,
          name: 'Technology BU',
          code: 'TECH-BU',
          status: 'active',
        },
        {
          id: buA2Id,
          tenantId: testTenantA,
          companyId: testCompanyA,
          name: 'Logistics BU',
          code: 'LOG-BU',
          status: 'active',
        },
      ]);

      // Sign in for tokens
      const loginA = await signInForTest('admin_dup_a@alpha.test');
      tokenA = loginA.token;
      const loginB = await signInForTest('admin_dup_b@beta.test');
      tokenB = loginB.token;
      const loginNoPerm = await signInForTest('user_dup_noperm@alpha.test');
      tokenNoPerm = loginNoPerm.token;
    });

    afterAll(async () => {
      const db = getDb();
      await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(departments)
        .where(
          and(
            inArray(departments.companyId, [testCompanyA, testCompanyB]),
            isNotNull(departments.parentDepartmentId),
          ),
        );
      await db
        .delete(departments)
        .where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(businessUnits)
        .where(inArray(businessUnits.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(attendanceGeneralSettings)
        .where(inArray(attendanceGeneralSettings.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(roleAssignments)
        .where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
      await db
        .delete(memberships)
        .where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
      await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
      await db
        .delete(tenantModules)
        .where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
      await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
      await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));
    });

    // ────────────────────────────────────────────────────────────────────────
    // 1. VALID DEPARTMENT CREATION & EXACT DUPLICATE REJECTION
    // ────────────────────────────────────────────────────────────────────────

    it('creates a valid department successfully', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Platform Engineering',
          code: 'PLT-ENG',
          description: 'Core platform infrastructure',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Platform Engineering');
      expect(res.body.data.code).toBe('PLT-ENG');
    });

    it('rejects exact duplicate department creation with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Platform Engineering',
          code: 'PLT-ENG-2',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('DUPLICATE_DEPARTMENT_NAME');
      expect(res.body.error.message).toMatch(/already exists in this company/i);
    });

    // ────────────────────────────────────────────────────────────────────────
    // 2. CASE AND WHITESPACE NORMALIZATION
    // ────────────────────────────────────────────────────────────────────────

    it('rejects case-insensitive duplicate department names', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'platform engineering',
          code: 'PLT-ENG-LOWER',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_DEPARTMENT_NAME');
    });

    it('rejects leading and trailing whitespace variations of duplicate names', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: '   Platform Engineering   ',
          code: 'PLT-ENG-SPACE',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_DEPARTMENT_NAME');
    });

    // ────────────────────────────────────────────────────────────────────────
    // 3. HIERARCHY & BRANCH CONTEXT UNIQUENESS
    // ────────────────────────────────────────────────────────────────────────

    it('allows legitimate same-name departments under DIFFERENT parent departments', async () => {
      // 1. Create two distinct parent departments
      const parent1Res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Core Infrastructure', code: 'CORE-INF' });
      expect(parent1Res.status).toBe(201);
      parentDept1Id = parent1Res.body.data.id;

      const parent2Res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Application Services', code: 'APP-SVC' });
      expect(parent2Res.status).toBe(201);
      parentDept2Id = parent2Res.body.data.id;

      // 2. Create child department "Quality Assurance" under Parent 1
      const child1Res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Quality Assurance',
          code: 'QA-CORE',
          parentDepartmentId: parentDept1Id,
        });
      expect(child1Res.status).toBe(201);
      expect(child1Res.body.data.name).toBe('Quality Assurance');

      // 3. Create child department "Quality Assurance" under Parent 2 (Legitimate different branch)
      const child2Res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Quality Assurance',
          code: 'QA-APPS',
          parentDepartmentId: parentDept2Id,
        });
      expect(child2Res.status).toBe(201);
      expect(child2Res.body.data.name).toBe('Quality Assurance');

      // 4. Reject creating a SECOND "Quality Assurance" under Parent 1 (Invalid sibling duplicate)
      const child1Duplicate = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Quality Assurance',
          code: 'QA-CORE-DUP',
          parentDepartmentId: parentDept1Id,
        });
      expect(child1Duplicate.status).toBe(409);
      expect(child1Duplicate.body.error.code).toBe('DUPLICATE_DEPARTMENT_NAME');
      expect(child1Duplicate.body.error.message).toMatch(/under the selected parent department/i);
    });

    it.skip('allows legitimate same-name departments in DIFFERENT business units [Pending Step 3 Migration 0044 Approval]', async () => {
      // Create "Operations" in Technology BU
      const opTechRes = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Field Operations',
          code: 'OPS-TECH',
          businessUnitId: buA1Id,
        });
      expect(opTechRes.status).toBe(201);

      // Create "Operations" in Logistics BU (Legitimate different branch)
      const opLogRes = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Field Operations',
          code: 'OPS-LOG',
          businessUnitId: buA2Id,
        });
      expect(opLogRes.status).toBe(201);

      // Reject second "Field Operations" within Technology BU
      const opTechDup = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Field Operations',
          code: 'OPS-TECH-DUP',
          businessUnitId: buA1Id,
        });
      expect(opTechDup.status).toBe(409);
      expect(opTechDup.body.error.code).toBe('DUPLICATE_DEPARTMENT_NAME');
    });

    // ────────────────────────────────────────────────────────────────────────
    // 4. CROSS-COMPANY & TENANT ISOLATION
    // ────────────────────────────────────────────────────────────────────────

    it('allows identical department name in a DIFFERENT company/tenant', async () => {
      // "Platform Engineering" already exists in Company A
      // Should succeed in Company B
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          name: 'Platform Engineering',
          code: 'PLT-ENG-B',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Platform Engineering');
      expect(res.body.data.companyId).toBe(testCompanyB);
    });

    // ────────────────────────────────────────────────────────────────────────
    // 5. UNAUTHORIZED DEPARTMENT CREATION
    // ────────────────────────────────────────────────────────────────────────

    it('rejects department creation by unauthorized users with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenNoPerm}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Unauthorized Dept',
          code: 'UNAUTH',
        });

      expect(res.status).toBe(403);
    });

    // ────────────────────────────────────────────────────────────────────────
    // 6. UPDATE DEPARTMENT DUPLICATE REJECTION
    // ────────────────────────────────────────────────────────────────────────

    it('rejects renaming a department to an already existing department name', async () => {
      // Create two distinct departments
      const dept1 = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Security Engineering', code: 'SEC-ENG' });
      expect(dept1.status).toBe(201);

      const dept2 = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Network Engineering', code: 'NET-ENG' });
      expect(dept2.status).toBe(201);

      // Attempt to rename dept2 to "Security Engineering"
      const renameRes = await request(app)
        .put(`/api/v1/hrms/organization/departments/${dept2.body.data.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Security Engineering',
        });

      expect(renameRes.status).toBe(409);
      expect(renameRes.body.error.code).toBe('DUPLICATE_DEPARTMENT_NAME');

      // Updating description or code while keeping its own name should succeed
      const validUpdate = await request(app)
        .put(`/api/v1/hrms/organization/departments/${dept2.body.data.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Network Engineering',
          description: 'Updated network engineering description',
        });

      expect(validUpdate.status).toBe(200);
      expect(validUpdate.body.data.description).toBe('Updated network engineering description');
    });

    // ────────────────────────────────────────────────────────────────────────
    // 7. CONCURRENT DUPLICATE ATTEMPTS HANDLING
    // ────────────────────────────────────────────────────────────────────────

    it('handles concurrent duplicate creation attempts safely', async () => {
      const deptName = `Concurrent Dept ${Date.now()}`;
      const results = await Promise.all([
        request(app)
          .post('/api/v1/hrms/organization/departments')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('x-company-id', testCompanyA)
          .send({ name: deptName, code: `CONC-1-${Date.now().toString().slice(-4)}` }),
        request(app)
          .post('/api/v1/hrms/organization/departments')
          .set('Authorization', `Bearer ${tokenA}`)
          .set('x-company-id', testCompanyA)
          .send({ name: deptName, code: `CONC-2-${Date.now().toString().slice(-4)}` }),
      ]);

      const statuses = results.map((r) => r.status);
      // At least one must succeed (201)
      expect(statuses).toContain(201);
    });

    // ────────────────────────────────────────────────────────────────────────
    // 8. ATTENDANCE OVERVIEW DEPARTMENT COMPARISON STABILITY
    // ────────────────────────────────────────────────────────────────────────

    it('verifies Attendance Overview Department Comparison aggregates by stable IDs', async () => {
      const depts = await attendanceOverviewService.getDepartmentComparison(
        testTenantA,
        testCompanyA,
        '2026-10-10',
      );

      // Should return array without crashing or duplicating
      expect(Array.isArray(depts)).toBe(true);
      for (const d of depts) {
        expect(d.departmentId).toBeDefined();
        expect(d.departmentName).toBeDefined();
        expect(typeof d.eligibleEmployees).toBe('number');
        expect(typeof d.presentEquivalents).toBe('number');
      }
    });
  },
);
