import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  departments,
  designations,
  employees,
} from '../../../../db/schema.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';
import { hashPassword } from '../../../../platform/auth/security.js';
import { ValidationError } from '../../../../app/errors/AppError.js';
import {
  validateCreateDesignation,
  validateUpdateDesignation,
  validateSetDesignationStatus,
} from '../validation/designation.schema.js';

describe('BEZENT HRMS — Organization Designations Integration & Domain Tests', () => {
  const testTenantA = 'tenant_desig_test_a';
  const testTenantB = 'tenant_desig_test_b';
  const testCompanyA = 'comp_desig_test_a';
  const testCompanyB = 'comp_desig_test_b';
  const testUserA = 'user_desig_test_a';
  const testUserB = 'user_desig_test_b';
  const testUserNoPerm = 'user_desig_test_noperm';
  const testEmpA = 'emp_desig_test_a';

  let app: ReturnType<typeof createApp>;
  let tokenA: string;
  let tokenB: string;
  let tokenNoPerm: string;

  let deptA1Id: string;
  let deptA2InactiveId: string;
  let deptBId: string;

  beforeAll(async () => {
    app = createApp();
    const db = getDb();

    // Clean up
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db.delete(designations).where(inArray(designations.companyId, [testCompanyA, testCompanyB]));
    await db.delete(departments).where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));

    // Seed tenants
    await db.insert(tenants).values([
      { id: testTenantA, name: 'Tenant Desig A', status: 'active' },
      { id: testTenantB, name: 'Tenant Desig B', status: 'active' },
    ]);

    // Enable HRMS module
    await db.insert(tenantModules).values([
      { id: `tmod_${testTenantA}_hrms`, tenantId: testTenantA, moduleCode: 'hrms', status: 'enabled' },
      { id: `tmod_${testTenantB}_hrms`, tenantId: testTenantB, moduleCode: 'hrms', status: 'enabled' },
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
        email: 'desig_admin_a@alpha.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Alice',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserB,
        email: 'desig_admin_b@beta.test',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Bob',
        lastName: 'Admin',
        status: 'active',
      },
      {
        id: testUserNoPerm,
        email: 'desig_noperm@alpha.test',
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

    // Seed roles with organization permissions (role_sys_hr_manager has all organization and settings permissions)
    await db.insert(roleAssignments).values([
      {
        id: `ra_desig_${testUserA}`,
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        roleId: 'role_sys_hr_manager',
      },
      {
        id: `ra_desig_${testUserB}`,
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        roleId: 'role_sys_hr_manager',
      },
    ]);

    // Generate auth tokens via signInForTest
    const loginA = await signInForTest('desig_admin_a@alpha.test');
    tokenA = loginA.token;
    const loginB = await signInForTest('desig_admin_b@beta.test');
    tokenB = loginB.token;
    const loginNoPerm = await signInForTest('desig_noperm@alpha.test');
    tokenNoPerm = loginNoPerm.token;

    // Seed departments for mapping
    deptA1Id = 'dept_desig_a1';
    deptA2InactiveId = 'dept_desig_a2_inact';
    deptBId = 'dept_desig_b1';

    await db.insert(departments).values([
      {
        id: deptA1Id,
        tenantId: testTenantA,
        companyId: testCompanyA,
        name: 'Engineering',
        code: 'ENG',
        status: 'active',
      },
      {
        id: deptA2InactiveId,
        tenantId: testTenantA,
        companyId: testCompanyA,
        name: 'Legacy Dept',
        code: 'LEGACY',
        status: 'inactive',
      },
      {
        id: deptBId,
        tenantId: testTenantB,
        companyId: testCompanyB,
        name: 'Beta Engineering',
        code: 'BENG',
        status: 'active',
      },
    ]);
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(employees).where(inArray(employees.companyId, [testCompanyA, testCompanyB]));
    await db.delete(designations).where(inArray(designations.companyId, [testCompanyA, testCompanyB]));
    await db.delete(departments).where(inArray(departments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));
  });

  describe('Validation Unit Tests', () => {
    it('validates required designation name', () => {
      expect(() => validateCreateDesignation({})).toThrow(ValidationError);
      expect(() => validateCreateDesignation({ name: '   ' })).toThrow(ValidationError);
    });

    it('enforces maximum lengths on name, code and description', () => {
      expect(() => validateCreateDesignation({ name: 'a'.repeat(256) })).toThrow(ValidationError);
      expect(() => validateCreateDesignation({ name: 'Valid', code: 'c'.repeat(51) })).toThrow(
        ValidationError,
      );
      expect(() =>
        validateCreateDesignation({ name: 'Valid', description: 'd'.repeat(1001) }),
      ).toThrow(ValidationError);
    });

    it('normalizes optional fields', () => {
      const result = validateCreateDesignation({
        name: '  Senior Developer  ',
        code: '  sr_dev  ',
        description: '  Tech role  ',
        departmentId: 'none',
        status: 'active',
      });
      expect(result.name).toBe('Senior Developer');
      expect(result.code).toBe('SR_DEV');
      expect(result.description).toBe('Tech role');
      expect(result.departmentId).toBeNull();
      expect(result.status).toBe('active');
    });

    it('validates status enum', () => {
      expect(() => validateSetDesignationStatus({ status: 'invalid' })).toThrow(ValidationError);
      const res = validateSetDesignationStatus({ status: 'inactive' });
      expect(res.status).toBe('inactive');
    });
  });

  describe('API & Domain Operations', () => {
    let companyWideDesigId: string;
    let deptSpecificDesigId: string;

    // 1. Create company-wide designation
    it('1. creates a company-wide designation with departmentId = null', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Manager',
          code: 'MGR',
          description: 'Company-wide leadership role',
          departmentId: null,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe('Manager');
      expect(res.body.data.code).toBe('MGR');
      expect(res.body.data.departmentId).toBeNull();
      expect(res.body.data.departmentName).toBeNull();
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.activeEmployeeCount).toBe(0);

      companyWideDesigId = res.body.data.id;
    });

    // 2. Create department-specific designation
    it('2. creates a department-specific designation mapped to active department', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Senior Software Engineer',
          code: 'SSE',
          description: 'Lead technical individual contributor',
          departmentId: deptA1Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Senior Software Engineer');
      expect(res.body.data.code).toBe('SSE');
      expect(res.body.data.departmentId).toBe(deptA1Id);
      expect(res.body.data.departmentName).toBe('Engineering');
      expect(res.body.data.status).toBe('active');

      deptSpecificDesigId = res.body.data.id;
    });

    // 3. Retrieve designation by ID
    it('3. retrieves designation by ID with joined department details and active employee count', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(deptSpecificDesigId);
      expect(res.body.data.departmentName).toBe('Engineering');
      expect(res.body.data.departmentCode).toBe('ENG');
      expect(res.body.data.activeEmployeeCount).toBe(0);
    });

    // 4. Update metadata
    it('4. updates metadata (name, code, description) without changing department', async () => {
      const res = await request(app)
        .put(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Staff Software Engineer',
          code: 'STAFF_SE',
          description: 'Principal technical contributor',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Staff Software Engineer');
      expect(res.body.data.code).toBe('STAFF_SE');
      expect(res.body.data.description).toBe('Principal technical contributor');
      expect(res.body.data.departmentId).toBe(deptA1Id);
    });

    // 5. Valid Department mapping change (no employees attached)
    it('5. changes department mapping cleanly when no employees are attached', async () => {
      // Change to company-wide (null)
      const res = await request(app)
        .put(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          departmentId: null,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.departmentId).toBeNull();
      expect(res.body.data.departmentName).toBeNull();

      // Move back to deptA1Id
      const res2 = await request(app)
        .put(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          departmentId: deptA1Id,
        });
      expect(res2.status).toBe(200);
      expect(res2.body.data.departmentId).toBe(deptA1Id);
    });

    // 6. Reject inactive Department for new mapping
    it('6. rejects assigning designation to an inactive department', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Legacy Role',
          departmentId: deptA2InactiveId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('inactive department');
    });

    // 7. Reject cross-company Department
    it('7. rejects attaching a Department belonging to Company B to Company A designation', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Cross Company Role',
          departmentId: deptBId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not found or does not belong to this company');
    });

    // 8. Duplicate code rejection in same company
    it('8. rejects duplicate designation code in the same company', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Another Manager',
          code: 'MGR', // already used by companyWideDesigId
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('already in use');
    });

    // 9. Same code allowed in different companies
    it('9. allows the same designation code in different companies (multi-tenant isolated)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB)
        .send({
          name: 'Beta Manager',
          code: 'MGR', // same code in company B
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('MGR');
      expect(res.body.data.companyId).toBe(testCompanyB);
    });

    // 10. Duplicate name permitted where department or scope differs
    it('10. allows duplicate designation name across departments or scopes', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'Manager', // same name as company-wide, but specific to Engineering
          code: 'ENG_MGR',
          departmentId: deptA1Id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Manager');
      expect(res.body.data.departmentId).toBe(deptA1Id);
    });

    // 11. Deactivate designation
    it('11. deactivates a designation cleanly', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/organization/designations/${companyWideDesigId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
    });

    // 12. Existing Employee references remain unchanged on deactivate
    it('12. preserves existing employee records and references when designation is deactivated', async () => {
      const db = getDb();
      // Seed an active employee referencing deptSpecificDesigId
      await db.insert(employees).values({
        id: testEmpA,
        tenantId: testTenantA,
        companyId: testCompanyA,
        employeeNumber: 'EMP-DESIG-001',
        firstName: 'Diana',
        lastName: 'Prince',
        email: 'diana@alpha.test',
        joiningDate: '2026-01-01',
        departmentId: deptA1Id,
        designationId: deptSpecificDesigId,
        employmentStatus: 'active',
      });

      // Deactivate deptSpecificDesigId
      const res = await request(app)
        .post(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
      expect(res.body.affectedEmployeeCount).toBe(1);

      // Verify employee record in DB was NOT changed or cleared
      const [emp] = await db.select().from(employees).where(eq(employees.id, testEmpA));
      expect(emp).toBeDefined();
      expect(emp!.designationId).toBe(deptSpecificDesigId);
      expect(emp!.employmentStatus).toBe('active');
    });

    // 13. Inactive designation excluded from new-assignment lookup
    it('13. excludes inactive designations from active lookups', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/designations?status=active')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      const activeIds = res.body.data.map((d: { id: string }) => d.id);
      expect(activeIds).not.toContain(companyWideDesigId);
      expect(activeIds).not.toContain(deptSpecificDesigId);
    });

    // 14. Reactivate designation
    it('14. reactivates designation restoring its active status', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('active');

      // Also reactivate company-wide
      await request(app)
        .post(`/api/v1/hrms/organization/designations/${companyWideDesigId}/reactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);
    });

    // 15. Eligibility lookup: company-wide + matching department
    it('15. resolves eligible designations for department: returns company-wide + department-specific', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/organization/designations?eligibleForDepartmentId=${deptA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((d: { id: string }) => d.id);

      // Should include company-wide designation
      expect(ids).toContain(companyWideDesigId);
      // Should include department-specific designation
      expect(ids).toContain(deptSpecificDesigId);
    });

    // 16. Eligibility lookup excludes other departments
    it('16. excludes designations belonging to other departments during eligibility lookup', async () => {
      // Create a designation in a different department (deptA2InactiveId is inactive, let's create deptA3)
      const db = getDb();
      const deptA3Id = 'dept_desig_a3';
      await db.insert(departments).values({
        id: deptA3Id,
        tenantId: testTenantA,
        companyId: testCompanyA,
        name: 'Human Resources',
        code: 'HR',
        status: 'active',
      });

      const createHrRes = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          name: 'HR Specialist',
          code: 'HRS',
          departmentId: deptA3Id,
        });
      const hrDesigId = createHrRes.body.data.id;

      // Check eligible for Engineering (deptA1Id)
      const res = await request(app)
        .get(`/api/v1/hrms/organization/designations?eligibleForDepartmentId=${deptA1Id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((d: { id: string }) => d.id);
      expect(ids).toContain(deptSpecificDesigId);
      expect(ids).toContain(companyWideDesigId);
      expect(ids).not.toContain(hrDesigId); // HR role excluded for Engineering
    });

    // 17. Company isolation
    it('17. enforces strict company isolation: Company A cannot access Company B designations', async () => {
      // Company B lists designations
      const listB = await request(app)
        .get('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenB}`)
        .set('x-company-id', testCompanyB);

      const desigBId = listB.body.data[0].id;

      // Company A attempts GET
      const getRes = await request(app)
        .get(`/api/v1/hrms/organization/designations/${desigBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);
      expect(getRes.status).toBe(404);

      // Company A attempts PUT
      const putRes = await request(app)
        .put(`/api/v1/hrms/organization/designations/${desigBId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Hacked Name' });
      expect(putRes.status).toBe(404);

      // Company A attempts DEACTIVATE
      const deactRes = await request(app)
        .post(`/api/v1/hrms/organization/designations/${desigBId}/deactivate`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);
      expect(deactRes.status).toBe(404);
    });

    // 18. RBAC read permission
    it('18. blocks read without view permission', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenNoPerm}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(403);
    });

    // 19. RBAC manage permission
    it('19. blocks mutations without manage permission', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/organization/designations')
        .set('Authorization', `Bearer ${tokenNoPerm}`)
        .set('x-company-id', testCompanyA)
        .send({ name: 'Unauthorized Role' });

      expect(res.status).toBe(403);
    });

    // 20. Persistence after reload
    it('20. verifies persisted designations survive repository re-instantiation', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(deptSpecificDesigId);
      expect(res.body.data.name).toBe('Staff Software Engineer');
    });

    // 21. Department mapping change requires confirmation when active employees exist
    it('21. requires explicit confirmation for structural department move when active employees exist', async () => {
      // testEmpA is actively assigned to deptSpecificDesigId
      // Attempting to move without confirmStructuralMove: true
      const res = await request(app)
        .put(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          departmentId: null, // moving to company-wide
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STRUCTURAL_MOVE_CONFIRMATION_REQUIRED');
      expect(res.body.error.message).toContain('active employee(s) currently use this designation');
    });

    // 22. Confirmed structural move succeeds and does NOT mutate employee department
    it('22. confirmed structural move does NOT mutate employee department (no silent mutation)', async () => {
      const db = getDb();

      // Execute move with confirmStructuralMove: true
      const res = await request(app)
        .put(`/api/v1/hrms/organization/designations/${deptSpecificDesigId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .set('x-company-id', testCompanyA)
        .send({
          departmentId: null,
          confirmStructuralMove: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.departmentId).toBeNull();

      // Verify employee's department was NOT changed
      const [emp] = await db.select().from(employees).where(eq(employees.id, testEmpA));
      expect(emp).toBeDefined();
      expect(emp!.departmentId).toBe(deptA1Id);
      expect(emp!.designationId).toBe(deptSpecificDesigId);
    });

    // 23. Confirmed structural move does NOT mutate employee designation
    it('23. confirmed structural move does NOT mutate employee designation ID or unassign them', async () => {
      const db = getDb();
      const [emp] = await db.select().from(employees).where(eq(employees.id, testEmpA));
      expect(emp).toBeDefined();
      expect(emp!.designationId).toBe(deptSpecificDesigId);
      expect(emp!.employmentStatus).toBe('active');
    });
  });
});
