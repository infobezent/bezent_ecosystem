import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { inArray, eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { getDb } from '../../../../db/connection.js';
import {
  tenants,
  companies,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  jobLevels,
  grades,
} from '../../../../db/schema.js';
import { signInForTest } from '../../../../platform/__tests__/support/testSession.js';
import { hashPassword } from '../../../../platform/auth/security.js';

describe('BEZENT HRMS — Organization Job Levels & Grades Integration & Domain Tests', () => {
  const testTenantA = 'tenant_jlg_test_a';
  const testTenantB = 'tenant_jlg_test_b';
  const testCompanyA = 'comp_jlg_test_a';
  const testCompanyB = 'comp_jlg_test_b';
  const testUserA = 'user_jlg_test_a';
  const testUserB = 'user_jlg_test_b';
  const testUserNoPerm = 'user_jlg_test_noperm';

  let app: ReturnType<typeof createApp>;
  let tokenA: string;
  let tokenB: string;
  let tokenNoPerm: string;

  beforeAll(async () => {
    app = createApp();
    const db = getDb();

    // Clean up any stale test records
    await db.delete(jobLevels).where(inArray(jobLevels.companyId, [testCompanyA, testCompanyB]));
    await db.delete(grades).where(inArray(grades.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));

    // Seed tenants
    await db.insert(tenants).values([
      { id: testTenantA, name: 'Tenant JLG A', status: 'active' },
      { id: testTenantB, name: 'Tenant JLG B', status: 'active' },
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
        name: 'Company JLG Alpha',
        code: 'ALPHA_JLG',
        displayName: 'Alpha JLG',
        status: 'active',
      },
      {
        id: testCompanyB,
        tenantId: testTenantB,
        name: 'Company JLG Beta',
        code: 'BETA_JLG',
        displayName: 'Beta JLG',
        status: 'active',
      },
    ]);

    // Seed users
    const pwd = hashPassword('TestPassword123!');
    await db.insert(users).values([
      {
        id: testUserA,
        email: 'user_a_jlg@example.com',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Alice',
        lastName: 'JLG',
        status: 'active',
      },
      {
        id: testUserB,
        email: 'user_b_jlg@example.com',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Bob',
        lastName: 'JLG',
        status: 'active',
      },
      {
        id: testUserNoPerm,
        email: 'user_noperm_jlg@example.com',
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
        id: 'mem_jlg_a',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        role: 'hr_manager',
        status: 'active',
      },
      {
        id: 'mem_jlg_b',
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        role: 'hr_manager',
        status: 'active',
      },
      {
        id: 'mem_jlg_noperm',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserNoPerm,
        role: 'employee',
        status: 'active',
      },
    ]);

    // Role assignments: User A has HR Manager role, User B has HR Manager role, User NoPerm has employee
    await db.insert(roleAssignments).values([
      {
        id: 'ra_jlg_a',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserA,
        roleId: 'role_sys_hr_manager',
      },
      {
        id: 'ra_jlg_b',
        tenantId: testTenantB,
        companyId: testCompanyB,
        userId: testUserB,
        roleId: 'role_sys_hr_manager',
      },
      {
        id: 'ra_jlg_noperm',
        tenantId: testTenantA,
        companyId: testCompanyA,
        userId: testUserNoPerm,
        roleId: 'role_sys_employee',
      },
    ]);

    // Sign in tokens
    const sessionA = await signInForTest('user_a_jlg@example.com');
    tokenA = sessionA.token;

    const sessionB = await signInForTest('user_b_jlg@example.com');
    tokenB = sessionB.token;

    const sessionNoPerm = await signInForTest('user_noperm_jlg@example.com');
    tokenNoPerm = sessionNoPerm.token;
  });

  afterAll(async () => {
    const db = getDb();
    await db.delete(jobLevels).where(inArray(jobLevels.companyId, [testCompanyA, testCompanyB]));
    await db.delete(grades).where(inArray(grades.companyId, [testCompanyA, testCompanyB]));
    await db.delete(roleAssignments).where(inArray(roleAssignments.companyId, [testCompanyA, testCompanyB]));
    await db.delete(memberships).where(inArray(memberships.companyId, [testCompanyA, testCompanyB]));
    await db.delete(companies).where(inArray(companies.id, [testCompanyA, testCompanyB]));
    await db.delete(tenantModules).where(inArray(tenantModules.tenantId, [testTenantA, testTenantB]));
    await db.delete(users).where(inArray(users.id, [testUserA, testUserB, testUserNoPerm]));
    await db.delete(tenants).where(inArray(tenants.id, [testTenantA, testTenantB]));
  });

  // ==========================================
  // SECTION 1: JOB LEVELS DOMAIN & FUNCTIONAL TESTS
  // ==========================================

  it('1. creates a valid Job Level with required fields', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Entry Level',
        code: 'L1',
        rank: 10,
        description: 'Junior individual contributor',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toMatch(/^jl_/);
    expect(res.body.data.name).toBe('Entry Level');
    expect(res.body.data.code).toBe('L1');
    expect(res.body.data.rank).toBe(10);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.companyId).toBe(testCompanyA);
  });

  it('2. rejects creation when code is missing or empty', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Professional',
        rank: 20,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.details?.code).toContain('Job level code is required');
  });

  it('3. rejects creation when rank is missing', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Professional',
        code: 'L2',
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.details?.rank).toContain('Rank is required');
  });

  it('4. rejects creation when rank is not a positive integer (e.g. 0 or negative or decimal)', async () => {
    const resZero = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Zero Rank Level',
        code: 'L0',
        rank: 0,
      });
    expect(resZero.status).toBe(400);
    expect(resZero.body.error?.details?.rank).toContain('positive integer');

    const resNegative = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Negative Rank Level',
        code: 'L_NEG',
        rank: -5,
      });
    expect(resNegative.status).toBe(400);
    expect(resNegative.body.error?.details?.rank).toContain('positive integer');

    const resDecimal = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Decimal Rank Level',
        code: 'L_DEC',
        rank: 1.5,
      });
    expect(resDecimal.status).toBe(400);
    expect(resDecimal.body.error?.details?.rank).toContain('positive integer');
  });

  it('5. normalizes code by trimming and converting to uppercase', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: '  Senior Level  ',
        code: '  l3  ',
        rank: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Senior Level');
    expect(res.body.data.code).toBe('L3');
  });

  it('6. rejects duplicate code within the same company with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Duplicate L1',
        code: 'l1', // normalized to L1
        rank: 15,
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message).toContain('already in use in this company');
  });

  it('7. allows the same code in a different company', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB)
      .send({
        name: 'Company B Entry Level',
        code: 'L1',
        rank: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('L1');
    expect(res.body.data.companyId).toBe(testCompanyB);
  });

  it('8. rejects duplicate rank within the same company with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Another Rank 10 Level',
        code: 'L_ALT',
        rank: 10, // rank 10 already used by L1
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message).toContain('Job level rank 10 is already in use in this company');
  });

  it('9. allows the same rank in a different company', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB)
      .send({
        name: 'Company B Level 2',
        code: 'L2',
        rank: 20, // allowed in Company B
      });

    expect(res.status).toBe(201);
    expect(res.body.data.rank).toBe(20);
    expect(res.body.data.companyId).toBe(testCompanyB);
  });

  it('10. lists job levels ordered by rank ASC by default', async () => {
    // Add L2 with rank 20 in Company A
    await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Mid Level',
        code: 'L2',
        rank: 20,
      });

    const res = await request(app)
      .get('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);

    const ranks = (res.body.data as Array<{ rank: number }>).map((jl) => jl.rank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
    }
  });

  it('11. supports search filter across name and code', async () => {
    const resCode = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L3')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(resCode.status).toBe(200);
    expect(resCode.body.data.length).toBe(1);
    expect(resCode.body.data[0].code).toBe('L3');

    const resName = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=Senior')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(resName.status).toBe(200);
    expect(resName.body.data.length).toBe(1);
    expect(resName.body.data[0].name).toBe('Senior Level');
  });

  it('12. supports status filtering (active / inactive / all)', async () => {
    const resActive = await request(app)
      .get('/api/v1/hrms/organization/job-levels?status=active')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    expect(resActive.status).toBe(200);
    expect((resActive.body.data as Array<{ status: string }>).every((jl) => jl.status === 'active')).toBe(true);

    const resInactive = await request(app)
      .get('/api/v1/hrms/organization/job-levels?status=inactive')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    expect(resInactive.status).toBe(200);
    expect(resInactive.body.data.length).toBe(0);
  });

  it('13. active lookup excludes inactive job levels', async () => {
    // Create an inactive job level
    const createRes = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Legacy Level',
        code: 'L_LEGACY',
        rank: 99,
        status: 'inactive',
      });
    expect(createRes.status).toBe(201);
    const legacyId = createRes.body.data.id;

    // lookupOnly=true
    const lookupRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?lookupOnly=true')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(lookupRes.status).toBe(200);
    const lookupIds = (lookupRes.body.data as Array<{ id: string }>).map((jl) => jl.id);
    expect(lookupIds).not.toContain(legacyId);
    expect((lookupRes.body.data as Array<{ status: string }>).every((jl) => jl.status === 'active')).toBe(true);
  });

  it('14. edits job level name', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l1Id = listRes.body.data[0].id;

    const editRes = await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l1Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Associate / Entry Level',
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.name).toBe('Associate / Entry Level');
    expect(editRes.body.data.id).toBe(l1Id);
  });

  it('15. edits job level code with normalization', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l1Id = listRes.body.data[0].id;

    const editRes = await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l1Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        code: '  l1-assoc  ',
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.code).toBe('L1-ASSOC');

    // Revert code back to L1
    await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l1Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({ code: 'L1' });
  });

  it('16. edits job level rank', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L3')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l3Id = listRes.body.data[0].id;

    const editRes = await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l3Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        rank: 35,
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.rank).toBe(35);

    // Revert rank back to 30
    await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l3Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({ rank: 30 });
  });

  it('17. rejects code conflict on edit with 409 Conflict', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L2')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l2Id = listRes.body.data[0].id;

    // Try to rename L2 code to L1 (which already exists in Company A)
    const editRes = await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l2Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        code: 'L1',
      });

    expect(editRes.status).toBe(409);
    expect(editRes.body.error?.message).toContain('Job level code "L1" is already in use in this company');
  });

  it('18. rejects rank conflict on edit with 409 Conflict', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L2')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l2Id = listRes.body.data[0].id;

    // Try to change L2 rank to 10 (which belongs to L1)
    const editRes = await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l2Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        rank: 10,
      });

    expect(editRes.status).toBe(409);
    expect(editRes.body.error?.message).toContain('Job level rank 10 is already in use in this company');
  });

  it('19. deactivates job level, preserves records and returns impact message', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L2')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l2Id = listRes.body.data[0].id;

    const deactRes = await request(app)
      .post(`/api/v1/hrms/organization/job-levels/${l2Id}/deactivate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.status).toBe('inactive');
    expect(deactRes.body.message).toContain('no longer be available for new assignments');
    expect(deactRes.body.affectedEmployeeCount).toBe(0);
    expect(deactRes.body.affectedDesignationCount).toBe(0);
  });

  it('20. reactivates job level', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L2')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l2Id = listRes.body.data[0].id;

    const reactRes = await request(app)
      .post(`/api/v1/hrms/organization/job-levels/${l2Id}/reactivate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.status).toBe('active');
    expect(reactRes.body.message).toContain('reactivated and restored');
  });

  it('21. cross-company get rejection (Company B cannot get Company A job level)', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l1Id = listRes.body.data[0].id;

    const crossGet = await request(app)
      .get(`/api/v1/hrms/organization/job-levels/${l1Id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB);

    expect(crossGet.status).toBe(404);
  });

  it('22. cross-company update rejection', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l1Id = listRes.body.data[0].id;

    const crossUpdate = await request(app)
      .patch(`/api/v1/hrms/organization/job-levels/${l1Id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB)
      .send({ name: 'Hacked Name' });

    expect(crossUpdate.status).toBe(404);
  });

  it('23. cross-company lifecycle rejection', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const l1Id = listRes.body.data[0].id;

    const crossDeact = await request(app)
      .post(`/api/v1/hrms/organization/job-levels/${l1Id}/deactivate`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB);

    expect(crossDeact.status).toBe(404);
  });

  it('24. RBAC view: rejects unprivileged user without view permission', async () => {
    const res = await request(app)
      .get('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenNoPerm}`)
      .set('x-company-id', testCompanyA);

    expect(res.status).toBe(403);
  });

  it('25. RBAC manage: rejects unprivileged user without manage permission', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/job-levels')
      .set('Authorization', `Bearer ${tokenNoPerm}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Unauthorized Level',
        code: 'L_UNAUTH',
        rank: 999,
      });

    expect(res.status).toBe(403);
  });

  it('26. persistence after DB reload', async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(jobLevels)
      .where(eq(jobLevels.companyId, testCompanyA));

    expect(rows.length).toBeGreaterThanOrEqual(3);
    const codes = rows.map((r) => r.code);
    expect(codes).toContain('L1');
    expect(codes).toContain('L2');
    expect(codes).toContain('L3');
  });

  // ==========================================
  // SECTION 2: GRADES DOMAIN & FUNCTIONAL TESTS
  // ==========================================

  it('27. creates a valid Grade with required fields', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Grade 1',
        code: 'G1',
        rank: 10,
        description: 'Entry employment grade',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toMatch(/^grd_/);
    expect(res.body.data.name).toBe('Grade 1');
    expect(res.body.data.code).toBe('G1');
    expect(res.body.data.rank).toBe(10);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.companyId).toBe(testCompanyA);
  });

  it('28. rejects grade creation when code or rank is missing', async () => {
    const resNoCode = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Grade 2',
        rank: 20,
      });
    expect(resNoCode.status).toBe(400);
    expect(resNoCode.body.error?.details?.code).toContain('Grade code is required');

    const resNoRank = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Grade 2',
        code: 'G2',
      });
    expect(resNoRank.status).toBe(400);
    expect(resNoRank.body.error?.details?.rank).toContain('Rank is required');
  });

  it('29. rejects grade creation when rank is not a positive integer', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Bad Grade',
        code: 'G_BAD',
        rank: -1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error?.details?.rank).toContain('Rank must be a positive integer');
  });

  it('30. rejects duplicate grade code within the same company with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Duplicate Grade',
        code: 'g1', // normalized to G1
        rank: 15,
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message).toContain('Grade code "G1" is already in use in this company');
  });

  it('31. allows same grade code in a different company', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB)
      .send({
        name: 'Company B Grade 1',
        code: 'G1',
        rank: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('G1');
    expect(res.body.data.companyId).toBe(testCompanyB);
  });

  it('32. rejects duplicate grade rank within the same company with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Duplicate Rank Grade',
        code: 'G_ALT',
        rank: 10, // rank 10 used by G1
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.message).toContain('Grade rank 10 is already in use in this company');
  });

  it('33. allows independent rank sharing between Job Level and Grade in the same company', async () => {
    // Job level has rank 10 (L1). Grade has rank 10 (G1). They are independent masters.
    const resJl = await request(app)
      .get('/api/v1/hrms/organization/job-levels?search=L1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const resGrd = await request(app)
      .get('/api/v1/hrms/organization/grades?search=G1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(resJl.body.data[0].rank).toBe(10);
    expect(resGrd.body.data[0].rank).toBe(10);
  });

  it('34. lists grades ordered by rank ASC', async () => {
    // Create G2 (rank 20) and G3 (rank 30)
    await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Grade 3',
        code: 'G3',
        rank: 30,
      });

    await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Grade 2',
        code: 'G2',
        rank: 20,
      });

    const res = await request(app)
      .get('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);

    const ranks = (res.body.data as Array<{ rank: number }>).map((g) => g.rank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]!).toBeGreaterThanOrEqual(ranks[i - 1]!);
    }
  });

  it('35. updates grade metadata and rejects rank/code conflicts', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/grades?search=G2')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const g2Id = listRes.body.data[0].id;

    // Successful update
    const updateRes = await request(app)
      .patch(`/api/v1/hrms/organization/grades/${g2Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Mid-Level Grade 2',
        description: 'Updated description',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Mid-Level Grade 2');

    // Code conflict
    const codeConflict = await request(app)
      .patch(`/api/v1/hrms/organization/grades/${g2Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({ code: 'G1' });
    expect(codeConflict.status).toBe(409);

    // Rank conflict
    const rankConflict = await request(app)
      .patch(`/api/v1/hrms/organization/grades/${g2Id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA)
      .send({ rank: 10 });
    expect(rankConflict.status).toBe(409);
  });

  it('36. manages grade lifecycle: deactivates and reactivates', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/grades?search=G2')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const g2Id = listRes.body.data[0].id;

    // Deactivate
    const deactRes = await request(app)
      .post(`/api/v1/hrms/organization/grades/${g2Id}/deactivate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.status).toBe('inactive');

    // Active lookup excludes it
    const lookupRes = await request(app)
      .get('/api/v1/hrms/organization/grades?lookupOnly=true')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const lookupIds = (lookupRes.body.data as Array<{ id: string }>).map((g) => g.id);
    expect(lookupIds).not.toContain(g2Id);

    // Reactivate
    const reactRes = await request(app)
      .post(`/api/v1/hrms/organization/grades/${g2Id}/reactivate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.status).toBe('active');
  });

  it('37. cross-company grade isolation (Company B cannot get/modify Company A grade)', async () => {
    const listRes = await request(app)
      .get('/api/v1/hrms/organization/grades?search=G1')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-company-id', testCompanyA);
    const g1Id = listRes.body.data[0].id;

    const crossGet = await request(app)
      .get(`/api/v1/hrms/organization/grades/${g1Id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB);
    expect(crossGet.status).toBe(404);

    const crossPatch = await request(app)
      .patch(`/api/v1/hrms/organization/grades/${g1Id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('x-company-id', testCompanyB)
      .send({ name: 'Hacked Grade' });
    expect(crossPatch.status).toBe(404);
  });

  it('38. RBAC view and manage protection on Grades', async () => {
    const viewRes = await request(app)
      .get('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenNoPerm}`)
      .set('x-company-id', testCompanyA);
    expect(viewRes.status).toBe(403);

    const manageRes = await request(app)
      .post('/api/v1/hrms/organization/grades')
      .set('Authorization', `Bearer ${tokenNoPerm}`)
      .set('x-company-id', testCompanyA)
      .send({
        name: 'Unauthorized Grade',
        code: 'G_UNAUTH',
        rank: 999,
      });
    expect(manageRes.status).toBe(403);
  });
});
