import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  employees,
  designations,
  departments,
  businessUnits,
  divisions,
} from '../../../../db/schema.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';
import { ValidationError } from '../../../../app/errors/AppError.js';
import {
  validateCreateBusinessUnit,
  validateCreateDivision,
  validateSetStatus,
} from '../validation/structure.schema.js';

describe('Organization Structure Unit & Integration Tests', () => {
  const testTenantA = 'tenant_struct_test_a';
  const testTenantB = 'tenant_struct_test_b';
  const testCompanyA = 'comp_struct_test_a';
  const testCompanyB = 'comp_struct_test_b';
  const testUserA = 'user_struct_test_a';
  const testUserB = 'user_struct_test_b';
  const testEmpA = 'emp_struct_test_a';
  const testDesigA = 'desig_struct_test_a';
  const testDeptA = 'dept_struct_test_a';

  let app: ReturnType<typeof createApp>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    app = createApp();
    const db = getDb();

    // Clean up
    await db.delete(divisions).where(inArray(divisions.companyId, [testCompanyA, testCompanyB]));
    await db.delete(businessUnits).where(inArray(businessUnits.companyId, [testCompanyA, testCompanyB]));
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db.delete(designations).where(inArray(designations.companyId, [testCompanyA, testCompanyB]));
    await db.delete(departments).where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));

    // Seed tenants
    await db.insert(tenants).values([
      { id: testTenantA, name: 'Tenant Structure A', status: 'active' },
      { id: testTenantB, name: 'Tenant Structure B', status: 'active' },
    ]);

    // Enable HRMS module for tenants
    await db.insert(tenantModules).values([
      { id: `tmod_${testTenantA}_hrms`, tenantId: testTenantA, moduleCode: 'hrms', status: 'enabled' },
      { id: `tmod_${testTenantB}_hrms`, tenantId: testTenantB, moduleCode: 'hrms', status: 'enabled' },
    ]);

    // Seed companies
    await db.insert(companies).values([
      {
        id: testCompanyA,
        tenantId: testTenantA,
        name: 'APJ3D Design Solution Pvt Ltd',
        code: 'APJ3D',
        displayName: 'APJ3D',
        organizationType: 'Private Limited',
        industry: 'Engineering & Design',
        website: 'https://apj3d.com',
        addressLine1: 'Industrial Estate Phase II',
        city: 'Hosur',
        state: 'Tamil Nadu',
        country: 'India',
        postalCode: '635126',
        status: 'active',
      },
      {
        id: testCompanyB,
        tenantId: testTenantB,
        name: 'Other Company Pvt Ltd',
        code: 'OTHER',
        displayName: 'Other',
        organizationType: 'Private Limited',
        industry: 'Services',
        addressLine1: 'Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        postalCode: '560001',
        status: 'active',
      },
    ]);

    // Seed users
    const pwd = hashPassword('TestPassword123!');
    await db.insert(users).values([
      {
        id: testUserA,
        email: 'admin.struct.a@example.com',
        firstName: 'Admin',
        lastName: 'A',
        status: 'active',
        passwordHash: pwd.hash,
        salt: pwd.salt,
      },
      {
        id: testUserB,
        email: 'admin.struct.b@example.com',
        firstName: 'Admin',
        lastName: 'B',
        status: 'active',
        passwordHash: pwd.hash,
        salt: pwd.salt,
      },
    ]);

    // Seed memberships
    await db.insert(memberships).values([
      {
        id: `mem_struct_${testUserA}`,
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        role: 'employee',
        status: 'active',
      },
      {
        id: `mem_struct_${testUserB}`,
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        role: 'employee',
        status: 'active',
      },
    ]);

    // Seed roles with organization permissions (role_sys_hr_manager has all organization and settings permissions)
    await db.insert(roleAssignments).values([
      {
        id: `ra_struct_${testUserA}`,
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        roleId: 'role_sys_hr_manager',
      },
      {
        id: `ra_struct_${testUserB}`,
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        roleId: 'role_sys_hr_manager',
      },
    ]);

    // Seed Department & Designation & Employee for Head testing
    await db.insert(departments).values({
      id: testDeptA,
      tenantId: testTenantA,
      companyId: testCompanyA,
      name: 'Executive Management',
      code: 'EXEC',
      status: 'active',
    });

    await db.insert(designations).values({
      id: testDesigA,
      tenantId: testTenantA,
      companyId: testCompanyA,
      name: 'Managing Director',
      code: 'MD',
      status: 'active',
    });

    await db.insert(employees).values({
      id: testEmpA,
      tenantId: testTenantA,
      companyId: testCompanyA,
      employeeNumber: 'EMP-001',
      firstName: 'Dr. APJ',
      lastName: 'Kalam',
      email: 'apj@apj3d.com',
      departmentId: testDeptA,
      designationId: testDesigA,
      joiningDate: '2025-01-01',
      employmentStatus: 'active',
    });

    // Authenticate test sessions
    const loginA = await signInForTest('admin.struct.a@example.com');
    tokenA = loginA.token;
    const loginB = await signInForTest('admin.struct.b@example.com');
    tokenB = loginB.token;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(divisions).where(inArray(divisions.companyId, [testCompanyA, testCompanyB]));
    await db.delete(businessUnits).where(inArray(businessUnits.companyId, [testCompanyA, testCompanyB]));
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db.delete(designations).where(inArray(designations.companyId, [testCompanyA, testCompanyB]));
    await db.delete(departments).where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));
  });

  describe('Validation Suite', () => {
    it('validates Business Unit creation payload', () => {
      const valid = validateCreateBusinessUnit({
        name: 'Engineering Services',
        code: 'ENG',
        description: 'Engineering & R&D',
        status: 'active',
      });
      expect(valid.name).toBe('Engineering Services');
      expect(valid.code).toBe('ENG');
      expect(valid.status).toBe('active');
    });

    it('rejects Business Unit without name', () => {
      expect(() => validateCreateBusinessUnit({ name: '' })).toThrow(ValidationError);
    });

    it('validates Division creation requires parent businessUnitId and name', () => {
      expect(() => validateCreateDivision({ name: 'Product Development' })).toThrow(ValidationError);
      const valid = validateCreateDivision({
        businessUnitId: 'bu_123',
        name: 'Product Development',
        code: 'PROD',
      });
      expect(valid.businessUnitId).toBe('bu_123');
      expect(valid.name).toBe('Product Development');
      expect(valid.status).toBe('active');
    });

    it('validates status changes only allow active or inactive', () => {
      expect(() => validateSetStatus({ status: 'archived' })).toThrow(ValidationError);
      expect(validateSetStatus({ status: 'inactive' }).status).toBe('inactive');
      expect(validateSetStatus({ status: 'active' }).status).toBe('active');
    });
  });

  describe('API & Hierarchy Management', () => {
    let createdBuId: string;
    let createdDivId: string;

    it('returns empty structure hierarchy with Company summary when no BUs exist', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/structure')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .expect(200);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.company).toBeDefined();
      expect(res.body.data.company.name).toBe('APJ3D Design Solution Pvt Ltd');
      expect(res.body.data.company.displayName).toBe('APJ3D');
      expect(res.body.data.businessUnits).toEqual([]);
      expect(res.body.data.totalBusinessUnits).toBe(0);
      expect(res.body.data.totalDivisions).toBe(0);
    });

    it('lists eligible heads from authoritative employee database', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/structure/heads')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const head = res.body.data.find(
        (h: { id: string; fullName: string; designationName: string | null }) => h.id === testEmpA,
      );
      expect(head).toBeDefined();
      expect(head.fullName).toBe('Dr. APJ Kalam');
      expect(head.designationName).toBe('Managing Director');
    });

    it('creates a new Business Unit with head and code', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/structure/business-units')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Software Solutions',
          code: 'SW',
          description: 'Software development unit',
          headEmployeeId: testEmpA,
          status: 'active',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Software Solutions');
      expect(res.body.data.code).toBe('SW');
      expect(res.body.data.headEmployeeId).toBe(testEmpA);
      expect(res.body.data.headEmployeeName).toBe('Dr. APJ Kalam');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.divisionCount).toBe(0);

      createdBuId = res.body.data.id;
    });

    it('enforces unique Business Unit code within the company', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/structure/business-units')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Another Software Unit',
          code: 'sw', // Case-insensitive collision check
        })
        .expect(409);

      expect(res.body.error.message).toContain('already in use');
    });

    it('allows same Business Unit code in a different company (tenant/company isolation)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/structure/business-units')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          name: 'Software Solutions in Company B',
          code: 'SW',
        })
        .expect(201);

      expect(res.body.data.code).toBe('SW');
    });

    it('updates an existing Business Unit', async () => {
      const res = await request(app)
        .put(`/api/v1/hrms/organization/structure/business-units/${createdBuId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Software & Digital Solutions',
          code: 'SW-DIGITAL',
          description: 'Updated description',
          headEmployeeId: testEmpA,
        })
        .expect(200);

      expect(res.body.data.name).toBe('Software & Digital Solutions');
      expect(res.body.data.code).toBe('SW-DIGITAL');
      expect(res.body.data.description).toBe('Updated description');
    });

    it('creates a Division under the Business Unit', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/structure/divisions')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          businessUnitId: createdBuId,
          name: 'Product Development',
          code: 'PROD-DEV',
          description: 'Core product team',
          headEmployeeId: testEmpA,
          status: 'active',
        })
        .expect(201);

      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Product Development');
      expect(res.body.data.businessUnitId).toBe(createdBuId);
      expect(res.body.data.businessUnitName).toBe('Software & Digital Solutions');
      expect(res.body.data.status).toBe('active');

      createdDivId = res.body.data.id;
    });

    it('enforces unique Division code within the company', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/structure/divisions')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          businessUnitId: createdBuId,
          name: 'Duplicate Product Dev',
          code: 'prod-dev',
        })
        .expect(409);

      expect(res.body.error.message).toContain('already in use');
    });

    it('updates an existing Division', async () => {
      const res = await request(app)
        .put(`/api/v1/hrms/organization/structure/divisions/${createdDivId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Advanced Product Development',
          code: 'ADV-PROD',
          description: 'R&D and Product delivery',
        })
        .expect(200);

      expect(res.body.data.name).toBe('Advanced Product Development');
      expect(res.body.data.code).toBe('ADV-PROD');
    });

    it('returns complete hierarchy with nested divisions and accurate counts', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/structure')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .expect(200);

      const data = res.body.data;
      expect(data.totalBusinessUnits).toBe(1);
      expect(data.totalDivisions).toBe(1);
      expect(data.businessUnits[0].id).toBe(createdBuId);
      expect(data.businessUnits[0].divisionCount).toBe(1);
      expect(data.businessUnits[0].divisions).toHaveLength(1);
      expect(data.businessUnits[0].divisions[0].id).toBe(createdDivId);
      expect(data.businessUnits[0].divisions[0].name).toBe('Advanced Product Development');
    });

    it('deactivates Business Unit and verifies lifecycle status', async () => {
      const res = await request(app)
        .patch(`/api/v1/hrms/organization/structure/business-units/${createdBuId}/status`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ status: 'inactive' })
        .expect(200);

      expect(res.body.data.status).toBe('inactive');
    });

    it('prevents adding new Division to an inactive Business Unit', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/structure/divisions')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          businessUnitId: createdBuId,
          name: 'Client Solutions',
          code: 'CLIENT-SOL',
        })
        .expect(400);

      expect(res.body.error.message).toContain('inactive business unit');
    });

    it('reactivates Business Unit successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/hrms/organization/structure/business-units/${createdBuId}/status`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ status: 'active' })
        .expect(200);

      expect(res.body.data.status).toBe('active');
    });

    it('deactivates and reactivates a Division', async () => {
      const deact = await request(app)
        .patch(`/api/v1/hrms/organization/structure/divisions/${createdDivId}/status`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ status: 'inactive' })
        .expect(200);
      expect(deact.body.data.status).toBe('inactive');

      const react = await request(app)
        .patch(`/api/v1/hrms/organization/structure/divisions/${createdDivId}/status`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ status: 'active' })
        .expect(200);
      expect(react.body.data.status).toBe('active');
    });

    it('strictly isolates Company B from seeing or modifying Company A structures', async () => {
      // Company B hierarchy should NOT contain Company A's BU or Division
      const resHierarchyB = await request(app)
        .get('/api/v1/hrms/organization/structure')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .expect(200);

      const buIdsInB = resHierarchyB.body.data.businessUnits.map((b: { id: string }) => b.id);
      expect(buIdsInB).not.toContain(createdBuId);

      // Company B cannot update Company A's BU
      await request(app)
        .put(`/api/v1/hrms/organization/structure/business-units/${createdBuId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({ name: 'Hacked BU Name' })
        .expect(404);

      // Company B cannot add a Division targeting Company A's BU
      await request(app)
        .post('/api/v1/hrms/organization/structure/divisions')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          businessUnitId: createdBuId,
          name: 'Cross Company Division',
        })
        .expect(400);
    });

    it('Organization Profile updates immediately reflect in Organization Structure company summary', async () => {
      // 1. Update Profile for Company A
      const updatedProfilePayload = {
        name: 'APJ3D Technologies Pvt Ltd',
        displayName: 'APJ3D Tech',
        organizationType: 'Private Limited',
        industry: 'Software & Technology',
        website: 'https://apj3d.com',
        primaryEmail: 'info@apj3d.com',
        addressLine1: '456 Tech Park',
        country: 'India',
        state: 'Tamil Nadu',
        city: 'Hosur',
        postalCode: '635126',
      };

      await request(app)
        .put('/api/v1/hrms/organization/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send(updatedProfilePayload)
        .expect(200);

      // 2. Fetch Structure for Company A
      const res = await request(app)
        .get('/api/v1/hrms/organization/structure')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .expect(200);

      // 3. Verify Structure company summary reflects updated values
      expect(res.body.data.company.name).toBe('APJ3D Technologies Pvt Ltd');
      expect(res.body.data.company.displayName).toBe('APJ3D Tech');
      expect(res.body.data.company.organizationType).toBe('Private Limited');
      expect(res.body.data.company.industry).toBe('Software & Technology');
      expect(res.body.data.company.website).toBe('https://apj3d.com');
      expect(res.body.data.company.addressLine1).toBe('456 Tech Park');
    });
  });
});
