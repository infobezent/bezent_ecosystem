import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  users,
  memberships,
  roleAssignments,
  departments,
  locations,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT Platform & HRMS — Organization API Workspace RBAC Regression Suite',
  () => {
    const app = createApp();
    const companyId = 'comp_demo_01';
    const tenantId = 'tenant_demo_01';

    const managerUserId = 'usr_mgr_org_perm_test';
    const managerEmail = 'manager.orgtest@bezent-test.example';

    let hrToken: string;
    let employeeToken: string;
    let companyAdminToken: string;
    let managerToken: string;

    beforeAll(async () => {
      const db = getDb();

      // Ensure test department and work location exist in comp_demo_01
      await db.insert(departments).ignore().values({
        id: 'dept_perm_test_01',
        tenantId,
        companyId,
        name: 'Engineering Test Dept',
        code: 'ENG-TEST',
        status: 'active',
      });

      await db.insert(locations).ignore().values({
        id: 'loc_perm_test_01',
        tenantId,
        companyId,
        name: 'HQ Campus Test',
        code: 'HQ-TEST',
        type: 'office',
        status: 'active',
      });

      // Seed manager user with manager role (role_sys_manager)
      const unused = hashPassword('not-used-by-otp');
      await db.insert(users).ignore().values({
        id: managerUserId,
        email: managerEmail,
        passwordHash: unused.hash,
        salt: unused.salt,
        firstName: 'Manager',
        lastName: 'Test',
        status: 'active',
      });

      await db
        .insert(memberships)
        .values({
          id: `mem_mgr_${companyId}`,
          userId: managerUserId,
          tenantId,
          companyId,
          role: 'employee',
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { role: 'employee', status: 'active' } });

      await db
        .insert(roleAssignments)
        .values({
          id: `ra_mgr_${companyId}`,
          userId: managerUserId,
          roleId: 'role_sys_manager',
          tenantId,
          companyId,
          status: 'active',
        })
        .onDuplicateKeyUpdate({ set: { status: 'active' } });

      // Acquire tokens for the 4 roles
      hrToken = (await signInForTest('hr@bezent.com')).token;
      employeeToken = (await signInForTest('employee@bezent.com')).token;
      companyAdminToken = (await signInForTest('companyadmin@bezent.com')).token;
      managerToken = (await signInForTest(managerEmail)).token;
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(roleAssignments)
        .where(
          and(eq(roleAssignments.userId, managerUserId), eq(roleAssignments.companyId, companyId)),
        );
      await db
        .delete(memberships)
        .where(and(eq(memberships.userId, managerUserId), eq(memberships.companyId, companyId)));
      await db.delete(users).where(eq(users.id, managerUserId));
    });

    // ── 1. HR Manager Role ────────────────────────────────────────────────────────
    it('1. HR Manager: can read /hrms/organization/departments and /work-locations, but DENIED /company-admin/*', async () => {
      // Allowed in HRMS workspace
      const deptRes = await request(app)
        .get('/api/v1/hrms/organization/departments?status=active')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('x-company-id', companyId);
      expect(deptRes.status).toBe(200);
      expect(Array.isArray(deptRes.body.data)).toBe(true);

      const locRes = await request(app)
        .get('/api/v1/hrms/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('x-company-id', companyId);
      expect(locRes.status).toBe(200);
      expect(Array.isArray(locRes.body.data)).toBe(true);

      // FORBIDDEN on Company Admin endpoint (strictly protects Company Admin boundary)
      const caDeptRes = await request(app)
        .get('/api/v1/company-admin/organization/departments?status=active')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('x-company-id', companyId);
      expect(caDeptRes.status).toBe(403);

      const caLocRes = await request(app)
        .get('/api/v1/company-admin/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('x-company-id', companyId);
      expect(caLocRes.status).toBe(403);
    });

    // ── 2. Manager Role ───────────────────────────────────────────────────────────
    it('2. Manager: can read /hrms/organization/departments and /work-locations for attendance filters, but DENIED /company-admin/*', async () => {
      // Allowed in HRMS workspace (holds hrms.attendance.view and hrms.team.view)
      const deptRes = await request(app)
        .get('/api/v1/hrms/organization/departments?status=active')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-company-id', companyId);
      expect(deptRes.status).toBe(200);
      expect(Array.isArray(deptRes.body.data)).toBe(true);

      const locRes = await request(app)
        .get('/api/v1/hrms/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-company-id', companyId);
      expect(locRes.status).toBe(200);
      expect(Array.isArray(locRes.body.data)).toBe(true);

      // FORBIDDEN on Company Admin endpoint
      const caDeptRes = await request(app)
        .get('/api/v1/company-admin/organization/departments?status=active')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-company-id', companyId);
      expect(caDeptRes.status).toBe(403);
    });

    // ── 3. Employee Role ──────────────────────────────────────────────────────────
    it('3. Employee: DENIED both /hrms/organization/* and /company-admin/* (no organization read permissions)', async () => {
      // Employee has ESS scope only, no HRMS admin workspace or organization read permissions
      const deptRes = await request(app)
        .get('/api/v1/hrms/organization/departments?status=active')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);
      expect(deptRes.status).toBe(403);

      const locRes = await request(app)
        .get('/api/v1/hrms/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);
      expect(locRes.status).toBe(403);

      const caDeptRes = await request(app)
        .get('/api/v1/company-admin/organization/departments?status=active')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('x-company-id', companyId);
      expect(caDeptRes.status).toBe(403);
    });

    // ── 4. Company Admin Role ─────────────────────────────────────────────────────
    it('4. Company Admin: has full access to /company-admin/organization/* endpoints', async () => {
      const caDeptRes = await request(app)
        .get('/api/v1/company-admin/organization/departments?status=all')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('x-company-id', companyId);
      expect(caDeptRes.status).toBe(200);
      expect(Array.isArray(caDeptRes.body.data)).toBe(true);

      const caLocRes = await request(app)
        .get('/api/v1/company-admin/organization/work-locations?status=active')
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .set('x-company-id', companyId);
      expect(caLocRes.status).toBe(200);
      expect(Array.isArray(caLocRes.body.data)).toBe(true);
    });
  },
);
