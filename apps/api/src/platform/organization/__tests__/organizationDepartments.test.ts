import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, eq, and } from 'drizzle-orm';
import { createApp } from '../../../app/server/createApp.js';
import { getDb } from '../../../db/connection.js';
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
} from '../../../db/schema.js';
import { hashPassword } from '../../auth/security.js';
import { signInForTest } from '../../__tests__/support/testSession.js';
import { ValidationError } from '../../../app/errors/AppError.js';
import {
  validateCreateDepartment,
  validateUpdateDepartment,
  validateSetDepartmentStatus,
} from '../validation/department.schema.js';
import { OrganizationRepository } from '../repository/organization.repository.js';

describe('Organization Departments Unit & Integration Tests (V1)', () => {
  const testTenantA = 'tenant_dept_test_a';
  const testTenantB = 'tenant_dept_test_b';
  const testCompanyA = 'comp_dept_test_a';
  const testCompanyB = 'comp_dept_test_b';
  const testUserA = 'user_dept_test_a';
  const testUserB = 'user_dept_test_b';
  const testUserNoPerm = 'user_dept_test_noperm';
  const testEmpA = 'emp_dept_test_a';
  const testDesigA = 'desig_dept_test_a';

  let app: ReturnType<typeof createApp>;
  let tokenA: string;
  let tokenB: string;
  let tokenNoPerm: string;

  let buA1Id: string;
  let buA2Id: string;
  let buBId: string;
  let divA1Id: string;
  let divBId: string;

  beforeAll(async () => {
    app = createApp();
    const db = getDb();

    // Clean up
    await db
      .delete(departments)
      .where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(divisions).where(inArray(divisions.companyId, [testCompanyA, testCompanyB]));
    await db
      .delete(businessUnits)
      .where(inArray(businessUnits.companyId, [testCompanyA, testCompanyB]));
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db
      .delete(designations)
      .where(inArray(designations.companyId, [testCompanyA, testCompanyB]));
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

    // Seed tenants
    await db.insert(tenants).values([
      { id: testTenantA, name: 'Tenant Dept A', status: 'active' },
      { id: testTenantB, name: 'Tenant Dept B', status: 'active' },
    ]);

    // Enable HRMS module
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
        name: 'Alpha Corp',
        code: 'ALPHA',
        displayName: 'Alpha',
        status: 'active',
      },
      {
        id: testCompanyB,
        tenantId: testTenantB,
        name: 'Beta Corp',
        code: 'BETA',
        displayName: 'Beta',
        status: 'active',
      },
    ]);

    // Seed users
    const pwd = hashPassword('password123');

    await db.insert(users).values([
      {
        id: testUserA,
        email: 'admin_a@alpha.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Alice',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserB,
        email: 'admin_b@beta.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Bob',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserNoPerm,
        email: 'user_noperm@alpha.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'No',
        lastName: 'Perm',
        status: 'active',
      },
    ]);

    // Seed memberships
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

    // Seed designation
    await db.insert(designations).values({
      id: testDesigA,
      tenantId: testTenantA,
      companyId: testCompanyA,
      name: 'Senior Director',
      code: 'SRDIR',
      status: 'active',
    });

    // Seed employee for head assignment
    await db.insert(employees).values({
      id: testEmpA,
      tenantId: testTenantA,
      companyId: testCompanyA,
      employeeNumber: 'EMP-DEPT-001',
      firstName: 'Samantha',
      lastName: 'Carter',
      email: 'carter@alpha.test',
      joiningDate: '2025-01-01',
      employmentStatus: 'active',
      designationId: testDesigA,
    });

    // Seed Business Units
    buA1Id = 'bu_test_a1';
    buA2Id = 'bu_test_a2';
    buBId = 'bu_test_b1';

    await db.insert(businessUnits).values([
      {
        id: buA1Id,
        tenantId: testTenantA,
        companyId: testCompanyA,
        name: 'Technology BU',
        code: 'TECH',
        status: 'active',
      },
      {
        id: buA2Id,
        tenantId: testTenantA,
        companyId: testCompanyA,
        name: 'Operations BU',
        code: 'OPS',
        status: 'active',
      },
      {
        id: buBId,
        tenantId: testTenantB,
        companyId: testCompanyB,
        name: 'Beta Finance BU',
        code: 'BFIN',
        status: 'active',
      },
    ]);

    // Seed Divisions
    divA1Id = 'div_test_a1';
    divBId = 'div_test_b1';

    await db.insert(divisions).values([
      {
        id: divA1Id,
        tenantId: testTenantA,
        companyId: testCompanyA,
        businessUnitId: buA1Id,
        name: 'Software Engineering Div',
        code: 'SWE',
        status: 'active',
      },
      {
        id: divBId,
        tenantId: testTenantB,
        companyId: testCompanyB,
        businessUnitId: buBId,
        name: 'Beta Accounting Div',
        code: 'BACC',
        status: 'active',
      },
    ]);

    // Seed roles with organization permissions (role_sys_hr_manager has all organization and settings permissions)
    await db.insert(roleAssignments).values([
      {
        id: `ra_dept_${testUserA}`,
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        roleId: 'role_sys_hr_manager',
      },
      {
        id: `ra_dept_${testUserB}`,
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        roleId: 'role_sys_hr_manager',
      },
    ]);

    // Sign in to get tokens
    const loginA = await signInForTest('admin_a@alpha.test');
    tokenA = loginA.token;
    const loginB = await signInForTest('admin_b@beta.test');
    tokenB = loginB.token;
    const loginNoPerm = await signInForTest('user_noperm@alpha.test');
    tokenNoPerm = loginNoPerm.token;
  });

  afterAll(async () => {
    const db = getDb();
    await db
      .delete(departments)
      .where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(divisions).where(inArray(divisions.companyId, [testCompanyA, testCompanyB]));
    await db
      .delete(businessUnits)
      .where(inArray(businessUnits.companyId, [testCompanyA, testCompanyB]));
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db
      .delete(designations)
      .where(inArray(designations.companyId, [testCompanyA, testCompanyB]));
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

  describe('Validation Unit Tests', () => {
    it('validates required name', () => {
      expect(() => validateCreateDepartment({})).toThrow(ValidationError);
      expect(() => validateCreateDepartment({ name: '   ' })).toThrow(ValidationError);
    });

    it('enforces maximum lengths on name, code and description', () => {
      expect(() => validateCreateDepartment({ name: 'a'.repeat(256) })).toThrow(ValidationError);
      expect(() => validateCreateDepartment({ name: 'Valid', code: 'c'.repeat(51) })).toThrow(
        ValidationError,
      );
      expect(() =>
        validateCreateDepartment({ name: 'Valid', description: 'd'.repeat(1001) }),
      ).toThrow(ValidationError);
    });

    it('normalizes optional fields', () => {
      const result = validateCreateDepartment({
        name: '  Engineering  ',
        code: '  ENG  ',
        description: '  Tech dept  ',
        status: 'active',
      });
      expect(result.name).toBe('Engineering');
      expect(result.code).toBe('ENG');
      expect(result.description).toBe('Tech dept');
      expect(result.status).toBe('active');
    });

    it('validates status enum', () => {
      expect(() => validateSetDepartmentStatus({ status: 'invalid' })).toThrow(ValidationError);
      const res = validateSetDepartmentStatus({ status: 'inactive' });
      expect(res.status).toBe('inactive');
    });
  });

  describe('API & Hierarchy Management', () => {
    let companyDeptId: string;
    let buDeptId: string;
    let divDeptId: string;
    let childDeptId: string;

    it('1. creates a company-level Department (small-company flow)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'General Administration',
          code: 'GENADMIN',
          description: 'Company-level department',
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('General Administration');
      expect(res.body.data.code).toBe('GENADMIN');
      expect(res.body.data.businessUnitId).toBeNull();
      expect(res.body.data.divisionId).toBeNull();
      expect(res.body.data.parentDepartmentId).toBeNull();
      expect(res.body.data.status).toBe('active');

      companyDeptId = res.body.data.id;
    });

    it('2. creates a BU-level Department', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Tech Infrastructure',
          code: 'TECHINFRA',
          businessUnitId: buA1Id,
          description: 'Infrastructure under Tech BU',
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.businessUnitId).toBe(buA1Id);
      expect(res.body.data.businessUnitName).toBe('Technology BU');
      expect(res.body.data.divisionId).toBeNull();

      buDeptId = res.body.data.id;
    });

    it('3. creates a Division-level Department with department head', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Backend Core Engineering',
          code: 'BACKEND',
          businessUnitId: buA1Id,
          divisionId: divA1Id,
          headEmployeeId: testEmpA,
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.businessUnitId).toBe(buA1Id);
      expect(res.body.data.divisionId).toBe(divA1Id);
      expect(res.body.data.headEmployeeId).toBe(testEmpA);
      expect(res.body.data.headEmployeeName).toBe('Samantha Carter');
      expect(res.body.data.headEmployeeNumber).toBe('EMP-DEPT-001');

      divDeptId = res.body.data.id;
    });

    it('4. creates a child Department nested under parent department', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'API & Platform Team',
          code: 'APITEAM',
          parentDepartmentId: divDeptId,
          status: 'active',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.parentDepartmentId).toBe(divDeptId);
      expect(res.body.data.parentDepartmentName).toBe('Backend Core Engineering');
      // Inherits / matches parent BU and Division
      expect(res.body.data.businessUnitId).toBe(buA1Id);

      childDeptId = res.body.data.id;
    });

    it('5. edits department metadata', async () => {
      const res = await request(app)
        .put(`/api/v1/hrms/organization/departments/${companyDeptId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Corporate Administration',
          code: 'CORPADM',
          description: 'Updated description for administration',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Corporate Administration');
      expect(res.body.data.code).toBe('CORPADM');
      expect(res.body.data.description).toBe('Updated description for administration');
    });

    it('6. performs a valid structural move', async () => {
      // Move buDeptId from buA1Id (Tech) to buA2Id (Ops)
      const res = await request(app)
        .put(`/api/v1/hrms/organization/departments/${buDeptId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Tech Infrastructure',
          businessUnitId: buA2Id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(buDeptId); // Stable ID preserved
      expect(res.body.data.businessUnitId).toBe(buA2Id);
      expect(res.body.data.businessUnitName).toBe('Operations BU');
    });

    it('7. rejects invalid BU / Division combination', async () => {
      // divA1Id belongs to buA1Id, but we try to pair it with buA2Id
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Mismatched Department',
          businessUnitId: buA2Id,
          divisionId: divA1Id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain(
        'Division does not belong to the selected business unit',
      );
    });

    it('8. rejects self-parenting', async () => {
      const res = await request(app)
        .put(`/api/v1/hrms/organization/departments/${divDeptId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Backend Core Engineering',
          parentDepartmentId: divDeptId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('cannot be its own parent');
    });

    it('9. rejects circular hierarchy', async () => {
      // divDeptId is parent of childDeptId. Setting divDeptId's parent to childDeptId would create cycle!
      const res = await request(app)
        .put(`/api/v1/hrms/organization/departments/${divDeptId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Backend Core Engineering',
          parentDepartmentId: childDeptId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Circular hierarchy detected');
    });

    it('10. rejects cross-company parent department assignment', async () => {
      // First create a department in Company B
      const deptBRes = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          name: 'Beta Finance',
          code: 'BFIN',
        });
      expect(deptBRes.status).toBe(201);
      const deptBId = deptBRes.body.data.id;

      // Try to use deptBId as parent in Company A
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Illegal Cross-Company Dept',
          parentDepartmentId: deptBId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Parent department does not exist in this company');
    });

    it('11. rejects cross-company BU or Division assignment', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Illegal Cross BU Dept',
          businessUnitId: buBId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Business unit does not exist in this company');
    });

    it('12. rejects duplicate department code within the same company', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Another Admin',
          code: 'CORPADM', // Already used by companyDeptId
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('already in use in this company');
    });

    it('13. blocks deactivation if department has active child departments', async () => {
      // divDeptId has active child childDeptId
      const res = await request(app)
        .post(`/api/v1/hrms/organization/departments/${divDeptId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot deactivate department with');
      expect(res.body.error.message).toContain('active sub-department');
    });

    it('14. deactivates a leaf department successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/organization/departments/${childDeptId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');

      // Now parent divDeptId can be deactivated
      const parentDeactRes = await request(app)
        .post(`/api/v1/hrms/organization/departments/${divDeptId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      expect(parentDeactRes.status).toBe(200);
      expect(parentDeactRes.body.data.status).toBe('inactive');
    });

    it('15. reactivates department successfully', async () => {
      // Cannot reactivate child if parent is inactive
      const childFailRes = await request(app)
        .post(`/api/v1/hrms/organization/departments/${childDeptId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      expect(childFailRes.status).toBe(400);
      expect(childFailRes.body.error.message).toContain('parent department is inactive');

      // Reactivate parent first
      const parentRes = await request(app)
        .post(`/api/v1/hrms/organization/departments/${divDeptId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      expect(parentRes.status).toBe(200);
      expect(parentRes.body.data.status).toBe('active');

      // Now child can be reactivated
      const childRes = await request(app)
        .post(`/api/v1/hrms/organization/departments/${childDeptId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      expect(childRes.status).toBe(200);
      expect(childRes.body.data.status).toBe('active');
    });

    it('16. inactive department is excluded from canonical master lookup (getMasters)', async () => {
      // Deactivate companyDeptId
      await request(app)
        .post(`/api/v1/hrms/organization/departments/${companyDeptId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();

      const orgRepo = new OrganizationRepository();
      const masters = await orgRepo.getMasters(testTenantA, testCompanyA);

      const found = masters.departments.find((d) => d.id === companyDeptId);
      expect(found).toBeUndefined();

      // Active department is included
      const activeFound = masters.departments.find((d) => d.id === divDeptId);
      expect(activeFound).toBeDefined();

      // Reactivate companyDeptId
      await request(app)
        .post(`/api/v1/hrms/organization/departments/${companyDeptId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send();
    });

    it('17. enforces strict Company isolation', async () => {
      // Company B cannot view Company A departments
      const getRes = await request(app)
        .get(`/api/v1/hrms/organization/departments/${companyDeptId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB);

      expect(getRes.status).toBe(404);

      // Company B cannot update Company A department
      const putRes = await request(app)
        .put(`/api/v1/hrms/organization/departments/${companyDeptId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({ name: 'Hacked Department' });

      expect(putRes.status).toBe(404);

      // Company B cannot deactivate Company A department
      const deactRes = await request(app)
        .post(`/api/v1/hrms/organization/departments/${companyDeptId}/deactivate`)
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB);

      expect(deactRes.status).toBe(404);
    });

    it('18. enforces RBAC permissions (rejects unauthorized users)', async () => {
      // userNoPerm does not have organization.departments.manage
      const createRes = await request(app)
        .post('/api/v1/hrms/organization/departments')
        .set('Authorization', `Bearer ${tokenNoPerm}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Unauthorized Dept',
        });

      expect(createRes.status).toBe(403);
    });

    it('19. verifies database persistence across independent query', async () => {
      const db = getDb();
      const [persisted] = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.tenantId, testTenantA),
            eq(departments.companyId, testCompanyA),
            eq(departments.id, divDeptId),
          ),
        );

      expect(persisted).toBeDefined();
      expect(persisted!.name).toBe('Backend Core Engineering');
      expect(persisted!.code).toBe('BACKEND');
      expect(persisted!.businessUnitId).toBe(buA1Id);
      expect(persisted!.divisionId).toBe(divA1Id);
      expect(persisted!.headEmployeeId).toBe(testEmpA);
      expect(persisted!.status).toBe('active');
    });
  });
});
